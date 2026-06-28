const bcrypt = require("bcrypt");
const PDFDocument = require("pdfkit");
const jwt = require("jsonwebtoken");


// Node's built-in crypto module — used to generate a secure random
// string for the refresh token itself (not a JWT, just random bytes)
const crypto = require("crypto");
const pool = require("../db");
const cloudinary = require("../config/cloudinary");

async function registerUser(req, res) {
  try {
    const { full_name, email, phone, password, role, referral_code } = req.body;

    if (!["tenant", "landlord"].includes(role)) {
      return res.status(400).json({ success: false, error: "Role must be either 'tenant' or 'landlord'." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let referredByUserId = null;

    if (referral_code) {
      const referrerResult = await pool.query("SELECT id FROM users WHERE referral_code = $1", [referral_code]);
      if (referrerResult.rows.length > 0) {
        referredByUserId = referrerResult.rows[0].id;
      }
    }

    const myReferralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const result = await pool.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role, referral_code, referred_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, full_name, email, phone, role, is_verified, referral_code, created_at`,
      [full_name, email, phone, passwordHash, role, myReferralCode, referredByUserId]
    );

    res.status(201).json({ success: true, user: result.rows[0] });
  } catch (err) {
    if (err.code === "23505") {
      if (err.constraint === "users_email_key") {
        return res.status(409).json({ success: false, error: "An account with that email already exists." });
      }
      if (err.constraint === "users_phone_key") {
        return res.status(409).json({ success: false, error: "An account with that phone number already exists." });
      }
    }
    res.status(500).json({ success: false, error: err.message });
  }
}

async function loginUser(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required." });
    }

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: "Invalid email or password." });
    }

    const user = result.rows[0];

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ success: false, error: "Invalid email or password." });
    }

    if (user.is_suspended) {
       return res.status(403).json({ success: false, error: "Your account has been suspended. Contact support." });
    }


   // Access token: short-lived (15 minutes), used for every normal API request.
    // Kept short on purpose — if one is ever stolen, it's only useful for a brief window.
    const accessToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    // A fresh family_id marks the start of a brand new login session.
    // Every refresh token generated from this login (through rotation)
    // will share this same family_id, letting us revoke them all together
    // if we ever detect token theft.
    // Built into Node's crypto module — no extra package needed, and avoids
    // a CommonJS/ESM compatibility issue that uuid's package caused with Jest.
    const familyId = crypto.randomUUID();

    // Refresh token: a long, random string (not a JWT) used only to request
    // a new access token later. Stored in the database so we can revoke it.
    const refreshTokenValue = crypto.randomBytes(64).toString("hex");
    const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    await pool.query(
      "INSERT INTO refresh_tokens (user_id, token, family_id, expires_at) VALUES ($1, $2, $3, $4)",
      [user.id, refreshTokenValue, familyId, refreshTokenExpiresAt]
    );

    res.json({
      success: true,
      accessToken,
      refreshToken: refreshTokenValue,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        is_verified: user.is_verified,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// REFRESH ENDPOINT
// Takes a valid refresh token and issues a brand new access token +
// a brand new refresh token (rotation). The old refresh token is
// immediately marked as revoked, so it can never be used again.
async function refreshAccessToken(req, res) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ success: false, error: "Refresh token is required." });
    }

    // Look up the refresh token in the database — this is what makes
    // refresh tokens revocable, unlike stateless JWTs.
    const tokenResult = await pool.query(
      "SELECT * FROM refresh_tokens WHERE token = $1",
      [refreshToken]
    );

    // If the token doesn't exist at all, it was never issued by us — reject outright.
    if (tokenResult.rows.length === 0) {
      return res.status(401).json({ success: false, error: "Invalid refresh token." });
    }

    const storedToken = tokenResult.rows[0];

    // THEFT DETECTION: if this token has already been revoked, it means
    // someone is trying to reuse a refresh token that was already rotated
    // away. This is a strong signal the token was stolen and used by an
    // attacker (or the original device) after the legitimate rotation
    // already happened. We respond by revoking the ENTIRE token family —
    // logging out every session descended from that original login.
    if (storedToken.is_revoked) {
      await pool.query(
        "UPDATE refresh_tokens SET is_revoked = TRUE WHERE family_id = $1",
        [storedToken.family_id]
      );
      return res.status(401).json({
        success: false,
        error: "Refresh token reuse detected. All sessions for this login have been revoked. Please log in again.",
      });
    }

    // If the token has simply expired naturally (not stolen, just old), reject it normally.
    if (new Date() > new Date(storedToken.expires_at)) {
      return res.status(401).json({ success: false, error: "Refresh token has expired. Please log in again." });
    }

    // Confirm the user this token belongs to still exists and isn't suspended —
    // same live check we already do for access tokens.
    const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [storedToken.user_id]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, error: "User no longer exists." });
    }

    const user = userResult.rows[0];

    if (user.is_suspended) {
      return res.status(403).json({ success: false, error: "Your account has been suspended." });
    }

    // ROTATION: mark the old refresh token as revoked immediately,
    // then issue a brand new one in the same family.
    await pool.query("UPDATE refresh_tokens SET is_revoked = TRUE WHERE id = $1", [storedToken.id]);

    const newRefreshTokenValue = crypto.randomBytes(64).toString("hex");
    const newRefreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await pool.query(
      "INSERT INTO refresh_tokens (user_id, token, family_id, expires_at) VALUES ($1, $2, $3, $4)",
      [user.id, newRefreshTokenValue, storedToken.family_id, newRefreshTokenExpiresAt]
    );

    // Issue a brand new short-lived access token too.
    const newAccessToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshTokenValue,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function getProfile(req, res) {
  try {
    const result = await pool.query(
     "SELECT id, full_name, email, phone, role, is_verified, profile_picture_url, created_at FROM users WHERE id = $1",
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function requestOtp(req, res) {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, error: "Phone number is required." });
    }

    const userResult = await pool.query("SELECT * FROM users WHERE phone = $1", [phone]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "No account found with that phone number." });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

    await pool.query(
      "UPDATE users SET otp_code = $1, otp_expires_at = $2 WHERE phone = $3",
      [otpCode, expiresAt, phone]
    );

    // MOCK SMS SEND — replace this with a real SMS gateway later
    console.log(`[MOCK SMS] OTP for ${phone} is: ${otpCode}`);

    res.json({ success: true, message: "OTP sent." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function verifyOtp(req, res) {
  try {
    const { phone, otp_code } = req.body;

    if (!phone || !otp_code) {
      return res.status(400).json({ success: false, error: "Phone and OTP code are required." });
    }

    const userResult = await pool.query("SELECT * FROM users WHERE phone = $1", [phone]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "No account found with that phone number." });
    }

    const user = userResult.rows[0];

    if (user.otp_code !== otp_code) {
      return res.status(400).json({ success: false, error: "Incorrect OTP code." });
    }

    if (new Date() > new Date(user.otp_expires_at)) {
      return res.status(400).json({ success: false, error: "OTP code has expired." });
    }

    await pool.query(
      "UPDATE users SET is_verified = TRUE, otp_code = NULL, otp_expires_at = NULL WHERE phone = $1",
      [phone]
    );

    res.json({ success: true, message: "Phone number verified successfully." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function requestPasswordReset(req, res) {
  try {
    const { identifier } = req.body; // can be email or phone

    if (!identifier) {
      return res.status(400).json({ success: false, error: "Email or phone number is required." });
    }

    const userResult = await pool.query(
      "SELECT * FROM users WHERE email = $1 OR phone = $1",
      [identifier]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "No account found with that email or phone number." });
    }

    const user = userResult.rows[0];
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await pool.query(
      "UPDATE users SET otp_code = $1, otp_expires_at = $2 WHERE id = $3",
      [resetCode, expiresAt, user.id]
    );

    const isEmail = identifier.includes("@");

    if (isEmail) {
      // MOCK EMAIL SEND — replace with a real email provider later
      console.log(`[MOCK EMAIL] Password reset code for ${identifier} is: ${resetCode}`);
    } else {
      // MOCK SMS SEND — replace with a real SMS gateway later
      console.log(`[MOCK SMS] Password reset code for ${identifier} is: ${resetCode}`);
    }

    res.json({ success: true, message: `Reset code sent via ${isEmail ? "email" : "SMS"}.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function resetPassword(req, res) {
  try {
    const { identifier, reset_code, new_password } = req.body;

    if (!identifier || !reset_code || !new_password) {
      return res.status(400).json({ success: false, error: "Identifier, reset code, and new password are required." });
    }

    const userResult = await pool.query(
      "SELECT * FROM users WHERE email = $1 OR phone = $1",
      [identifier]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "No account found." });
    }

    const user = userResult.rows[0];

    if (user.otp_code !== reset_code) {
      return res.status(400).json({ success: false, error: "Incorrect reset code." });
    }

    if (new Date() > new Date(user.otp_expires_at)) {
      return res.status(400).json({ success: false, error: "Reset code has expired." });
    }

    const newPasswordHash = await bcrypt.hash(new_password, 10);

    await pool.query(
      "UPDATE users SET password_hash = $1, otp_code = NULL, otp_expires_at = NULL WHERE id = $2",
      [newPasswordHash, user.id]
    );

    res.json({ success: true, message: "Password reset successfully." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function deleteOwnAccount(req, res) {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, error: "Password is required to confirm account deletion." });
    }

    const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [req.user.id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    const user = userResult.rows[0];

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ success: false, error: "Incorrect password." });
    }

    await pool.query("DELETE FROM users WHERE id = $1", [req.user.id]);

    res.json({ success: true, message: "Your account and all associated data have been permanently deleted." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function getMyData(req, res) {
  try {
    const userResult = await pool.query(
      "SELECT id, full_name, email, phone, role, is_verified, created_at FROM users WHERE id = $1",
      [req.user.id]
    );

    const listingsResult = await pool.query("SELECT * FROM listings WHERE landlord_id = $1", [req.user.id]);

    const sentMessagesResult = await pool.query("SELECT * FROM messages WHERE sender_id = $1", [req.user.id]);
    const receivedMessagesResult = await pool.query("SELECT * FROM messages WHERE receiver_id = $1", [req.user.id]);

    const savedListingsResult = await pool.query(
      "SELECT listing_id, saved_at FROM saved_listings WHERE user_id = $1",
      [req.user.id]
    );

    const reportsResult = await pool.query("SELECT * FROM reports WHERE reported_by = $1", [req.user.id]);

    res.json({
      success: true,
      data: {
        profile: userResult.rows[0],
        listings: listingsResult.rows,
        messagesSent: sentMessagesResult.rows,
        messagesReceived: receivedMessagesResult.rows,
        savedListings: savedListingsResult.rows,
        reportsFiled: reportsResult.rows,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function downloadMyData(req, res) {
  try {
    const userResult = await pool.query(
      "SELECT id, full_name, email, phone, role, is_verified, created_at FROM users WHERE id = $1",
      [req.user.id]
    );

    const listingsResult = await pool.query("SELECT * FROM listings WHERE landlord_id = $1", [req.user.id]);
    const sentMessagesResult = await pool.query("SELECT * FROM messages WHERE sender_id = $1", [req.user.id]);
    const receivedMessagesResult = await pool.query("SELECT * FROM messages WHERE receiver_id = $1", [req.user.id]);
    const savedListingsResult = await pool.query(
      "SELECT listing_id, saved_at FROM saved_listings WHERE user_id = $1",
      [req.user.id]
    );
    const reportsResult = await pool.query("SELECT * FROM reports WHERE reported_by = $1", [req.user.id]);

    const exportData = {
      profile: userResult.rows[0],
      listings: listingsResult.rows,
      messagesSent: sentMessagesResult.rows,
      messagesReceived: receivedMessagesResult.rows,
      savedListings: savedListingsResult.rows,
      reportsFiled: reportsResult.rows,
      exportedAt: new Date().toISOString(),
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="my-data-export.json"`);
    res.send(JSON.stringify(exportData, null, 2));
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function downloadMyDataPdf(req, res) {
  try {
    const userResult = await pool.query(
      "SELECT id, full_name, email, phone, role, is_verified, created_at FROM users WHERE id = $1",
      [req.user.id]
    );

    const listingsResult = await pool.query("SELECT * FROM listings WHERE landlord_id = $1", [req.user.id]);
    const sentMessagesResult = await pool.query("SELECT * FROM messages WHERE sender_id = $1", [req.user.id]);
    const receivedMessagesResult = await pool.query("SELECT * FROM messages WHERE receiver_id = $1", [req.user.id]);
    const savedListingsResult = await pool.query(
      "SELECT listing_id, saved_at FROM saved_listings WHERE user_id = $1",
      [req.user.id]
    );
    const reportsResult = await pool.query("SELECT * FROM reports WHERE reported_by = $1", [req.user.id]);

    const user = userResult.rows[0];
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="my-data-export.pdf"`);
    doc.pipe(res);

    doc.fontSize(18).text("My Rental Connect Data Export", { underline: true });
    doc.moveDown();

    doc.fontSize(14).text("Profile", { underline: true });
    doc.fontSize(11).text(`Name: ${user.full_name}`);
    doc.text(`Email: ${user.email}`);
    doc.text(`Phone: ${user.phone}`);
    doc.text(`Role: ${user.role}`);
    doc.text(`Verified: ${user.is_verified ? "Yes" : "No"}`);
    doc.text(`Account created: ${new Date(user.created_at).toLocaleDateString()}`);
    doc.moveDown();

    doc.fontSize(14).text(`Listings (${listingsResult.rows.length})`, { underline: true });
    if (listingsResult.rows.length === 0) {
      doc.fontSize(11).text("None.");
    } else {
      listingsResult.rows.forEach((listing) => {
        doc.fontSize(11).text(`• ${listing.title} — UGX ${listing.price_per_month}/month, ${listing.district} (${listing.status})`);
      });
    }
    doc.moveDown();

    doc.fontSize(14).text(`Messages sent (${sentMessagesResult.rows.length})`, { underline: true });
    doc.fontSize(14).text(`Messages received (${receivedMessagesResult.rows.length})`, { underline: true });
    doc.moveDown();

    doc.fontSize(14).text(`Saved listings (${savedListingsResult.rows.length})`, { underline: true });
    doc.moveDown();

    doc.fontSize(14).text(`Reports filed (${reportsResult.rows.length})`, { underline: true });

    doc.moveDown();
    doc.fontSize(9).text(`Exported on ${new Date().toLocaleDateString()}`, { align: "center" });

    doc.end();
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function uploadProfilePicture(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No image file provided." });
    }

    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

    const uploadResult = await cloudinary.uploader.upload(base64Image, {
      folder: "rental_connect_profile_pictures",
    });

    const result = await pool.query(
      "UPDATE users SET profile_picture_url = $1 WHERE id = $2 RETURNING id, full_name, profile_picture_url",
      [uploadResult.secure_url, req.user.id]
    );

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function getMyReferrals(req, res) {
  try {
    const userResult = await pool.query("SELECT referral_code FROM users WHERE id = $1", [req.user.id]);

    const referredUsersResult = await pool.query(
      "SELECT id, full_name, role, created_at FROM users WHERE referred_by = $1",
      [req.user.id]
    );

    res.json({
      success: true,
      referralCode: userResult.rows[0].referral_code,
      totalReferred: referredUsersResult.rows.length,
      referredUsers: referredUsersResult.rows,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// LOGOUT
// Revokes the refresh token the client sends, so it can never be used
// again to get new access tokens. The current access token will still
// technically work until it naturally expires (max 15 minutes), but no
// new ones can be issued from this session afterward.
async function logoutUser(req, res) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ success: false, error: "Refresh token is required." });
    }

    await pool.query(
      "UPDATE refresh_tokens SET is_revoked = TRUE WHERE token = $1",
      [refreshToken]
    );

    res.json({ success: true, message: "Logged out successfully." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { registerUser, refreshAccessToken,loginUser, logoutUser, getProfile, requestOtp, verifyOtp , requestPasswordReset, resetPassword, deleteOwnAccount, getMyData, downloadMyData, downloadMyDataPdf, uploadProfilePicture , getMyReferrals };
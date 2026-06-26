const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");

async function registerUser(req, res) {
  try {
    const { full_name, email, phone, password, role } = req.body;

   if (!full_name || !email || !phone || !password || !role) {
  return res.status(400).json({ success: false, error: "All fields are required." });
}

if (!["tenant", "landlord"].includes(role)) {
  return res.status(400).json({ success: false, error: "Role must be either 'tenant' or 'landlord'." });
}

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, full_name, email, phone, role, is_verified, created_at`,
      [full_name, email, phone, passwordHash, role]
    );

    res.status(201).json({ success: true, user: result.rows[0] });
  } catch (err) {
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


    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
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


async function getProfile(req, res) {
  try {
    const result = await pool.query(
     "SELECT id, full_name, email, phone, role, is_verified, created_at FROM users WHERE id = $1",
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

module.exports = { registerUser, loginUser, getProfile, requestOtp, verifyOtp , requestPasswordReset, resetPassword };
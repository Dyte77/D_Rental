const bcrypt = require("bcrypt");
const pool = require("../db");

async function registerUser(req, res) {
  try {
    const { full_name, email, phone, password, role } = req.body;

    // Basic validation — make sure required fields are present
    if (!full_name || !email || !phone || !password || !role) {
      return res.status(400).json({ success: false, error: "All fields are required." });
    }

    // Hash the password before storing it — 10 is the "salt rounds", a standard default
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert the new user into the database
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

module.exports = { registerUser };
const bcrypt = require("bcrypt");
const pool = require("../db");

async function getAllUsers(req, res) {
  try {
    const result = await pool.query(
      "SELECT id, full_name, email, phone, role, is_verified, is_suspended, created_at FROM users ORDER BY created_at DESC"
    );

    res.json({ success: true, count: result.rows.length, users: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function createAdmin(req, res) {
  try {
    const { full_name, email, phone, password } = req.body;

    if (!full_name || !email || !phone || !password) {
      return res.status(400).json({ success: false, error: "All fields are required." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role, is_verified)
       VALUES ($1, $2, $3, $4, 'admin', TRUE)
       RETURNING id, full_name, email, phone, role, is_verified, created_at`,
      [full_name, email, phone, passwordHash]
    );

    res.status(201).json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function suspendUser(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "UPDATE users SET is_suspended = TRUE WHERE id = $1 RETURNING id, full_name, is_suspended",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function unsuspendUser(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "UPDATE users SET is_suspended = FALSE WHERE id = $1 RETURNING id, full_name, is_suspended",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ success: false, error: "You cannot delete your own admin account." });
    }

    const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id, full_name", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    res.json({ success: true, message: `User ${result.rows[0].full_name} permanently deleted.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { getAllUsers, createAdmin, suspendUser, unsuspendUser, deleteUser };
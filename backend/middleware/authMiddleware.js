const jwt = require("jsonwebtoken");
const pool = require("../db");

async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "No token provided." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await pool.query("SELECT is_suspended FROM users WHERE id = $1", [decoded.id]);

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: "User no longer exists." });
    }

    if (result.rows[0].is_suspended) {
      return res.status(403).json({ success: false, error: "Your account has been suspended." });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: "Invalid or expired token." });
  }
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      // Invalid token on an optional route — just proceed without a user, don't block
    }
  }

  next();
}

module.exports = { verifyToken, optionalAuth };
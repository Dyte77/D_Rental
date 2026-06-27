const rateLimit = require("express-rate-limit");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per window for sensitive auth actions
  message: { success: false, error: "Too many attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200, // more generous limit for general API usage
  message: { success: false, error: "Too many requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, generalLimiter };
const rateLimit = require("express-rate-limit");

// In test mode, our own automated test suite makes many rapid requests
// to the same auth endpoints — far more than any real user would in
// normal use. We raise the limit dramatically during tests so the
// rate limiter doesn't interfere with legitimate automated testing,
// while keeping the real, strict limit active in development and production.
const isTestEnv = process.env.NODE_ENV === "test";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTestEnv ? 50000 : 10, // effectively unlimited during tests, strict otherwise
  message: { success: false, error: "Too many attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTestEnv ? 50000 : 200,
  message: { success: false, error: "Too many requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, generalLimiter };
const express = require("express");
const router = express.Router();
const { registerUser, loginUser, getProfile, requestOtp, verifyOtp, requestPasswordReset, resetPassword } = require("../controllers/authController");
const { verifyToken } = require("../middleware/authMiddleware");
const { authLimiter } = require("../middleware/rateLimiter");

router.post("/register", authLimiter, registerUser);
router.post("/login", authLimiter, loginUser);
router.get("/profile", verifyToken, getProfile);
router.post("/request-otp", authLimiter, requestOtp);
router.post("/verify-otp", authLimiter, verifyOtp);
router.post("/forgot-password", authLimiter, requestPasswordReset);
router.post("/reset-password", authLimiter, resetPassword);

module.exports = router;
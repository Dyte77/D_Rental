const express = require("express");
const router = express.Router();
const { registerUser, loginUser, getProfile, requestOtp, verifyOtp, requestPasswordReset, resetPassword, deleteOwnAccount } = require("../controllers/authController");
const { verifyToken } = require("../middleware/authMiddleware");
const { authLimiter } = require("../middleware/rateLimiter");
const validate = require("../middleware/validate");
const {
  registerSchema,
  loginSchema,
  requestOtpSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  deleteAccountSchema,
} = require("../validators/authValidators");

router.post("/register", authLimiter, validate(registerSchema), registerUser);
router.post("/login", authLimiter, validate(loginSchema), loginUser);
router.get("/profile", verifyToken, getProfile);
router.post("/request-otp", authLimiter, validate(requestOtpSchema), requestOtp);
router.post("/verify-otp", authLimiter, validate(verifyOtpSchema), verifyOtp);
router.post("/forgot-password", authLimiter, validate(forgotPasswordSchema), requestPasswordReset);
router.post("/reset-password", authLimiter, validate(resetPasswordSchema), resetPassword);
router.delete("/account", verifyToken, validate(deleteAccountSchema), deleteOwnAccount);

module.exports = router;
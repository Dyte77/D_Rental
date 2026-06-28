const express = require("express");
const upload = require("../middleware/upload");
const router = express.Router();
const { registerUser, loginUser, logoutUser, refreshAccessToken, getProfile, requestOtp, verifyOtp, requestPasswordReset, resetPassword, deleteOwnAccount, getMyData, downloadMyData, downloadMyDataPdf,uploadProfilePicture ,getMyReferrals} = require("../controllers/authController");
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
  refreshTokenSchema,
} = require("../validators/authValidators");

router.post("/register", authLimiter, validate(registerSchema), registerUser);
router.post("/login", authLimiter, validate(loginSchema), loginUser);
router.get("/profile", verifyToken, getProfile);
router.post("/request-otp", authLimiter, validate(requestOtpSchema), requestOtp);
router.post("/verify-otp", authLimiter, validate(verifyOtpSchema), verifyOtp);
router.post("/forgot-password", authLimiter, validate(forgotPasswordSchema), requestPasswordReset);
router.post("/reset-password", authLimiter, validate(resetPasswordSchema), resetPassword);
router.delete("/account", verifyToken, validate(deleteAccountSchema), deleteOwnAccount);
router.get("/my-data", verifyToken, getMyData);
router.get("/my-data/download", verifyToken, downloadMyData);
router.get("/my-data/download-pdf", verifyToken, downloadMyDataPdf);
router.post("/profile-picture", verifyToken, upload.single("profile_picture"), uploadProfilePicture);
router.get("/my-referrals", verifyToken, getMyReferrals);
// Refresh: rate-limited too, since it's a sensitive auth action just like login
router.post("/refresh", authLimiter, validate(refreshTokenSchema), refreshAccessToken);

// Logout doesn't need rate limiting — it's a benign action, not something
// worth brute-forcing, and a user should be able to log out freely
router.post("/logout", validate(refreshTokenSchema), logoutUser);

module.exports = router;
const express = require("express");
const router = express.Router();
const { registerUser, loginUser, getProfile, requestOtp, verifyOtp } = require("../controllers/authController");
const { verifyToken } = require("../middleware/authMiddleware");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/profile", verifyToken, getProfile);
router.post("/request-otp", requestOtp);
router.post("/verify-otp", verifyOtp);

module.exports = router;
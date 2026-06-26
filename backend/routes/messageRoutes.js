const express = require("express");
const router = express.Router();
const { sendMessage, getConversation } = require("../controllers/messageController");
const { verifyToken } = require("../middleware/authMiddleware");

router.post("/", verifyToken, sendMessage);
router.get("/:listingId/:otherUserId", verifyToken, getConversation);

module.exports = router;
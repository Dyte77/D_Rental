const express = require("express");
const router = express.Router();
const { sendMessage, getConversation } = require("../controllers/messageController");
const { verifyToken } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const { sendMessageSchema } = require("../validators/messageValidators");

router.post("/", verifyToken, validate(sendMessageSchema), sendMessage);
router.get("/:listingId/:otherUserId", verifyToken, getConversation);

module.exports = router;
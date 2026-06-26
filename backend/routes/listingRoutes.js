const express = require("express");
const router = express.Router();
const { createListing } = require("../controllers/listingController");
const verifyToken = require("../middleware/authMiddleware");

router.post("/", verifyToken, createListing);

module.exports = router;
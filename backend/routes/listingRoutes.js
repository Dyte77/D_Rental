const express = require("express");
const router = express.Router();
const { createListing, getListings } = require("../controllers/listingController");
const verifyToken = require("../middleware/authMiddleware");

router.post("/", verifyToken, createListing);
router.get("/", getListings);

module.exports = router;
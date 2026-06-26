const express = require("express");
const router = express.Router();
const { createListing, getListings, getListingById } = require("../controllers/listingController");
const { verifyToken, optionalAuth } = require("../middleware/authMiddleware");

router.post("/", verifyToken, createListing);
router.get("/", getListings);
router.get("/:id", optionalAuth, getListingById);

module.exports = router;
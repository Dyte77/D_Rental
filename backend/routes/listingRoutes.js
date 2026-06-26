const express = require("express");
const router = express.Router();
const { createListing, getListings, getListingById, updateListing, deleteListing } = require("../controllers/listingController");
const { verifyToken, optionalAuth } = require("../middleware/authMiddleware");

router.post("/", verifyToken, createListing);
router.get("/", getListings);
router.get("/:id", optionalAuth, getListingById);
router.put("/:id", verifyToken, updateListing);
router.delete("/:id", verifyToken, deleteListing);

module.exports = router;
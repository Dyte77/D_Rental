const express = require("express");
const router = express.Router();
const { saveListing, unsaveListing, getSavedListings } = require("../controllers/savedListingController");
const { verifyToken } = require("../middleware/authMiddleware");

router.post("/", verifyToken, saveListing);
router.delete("/:listingId", verifyToken, unsaveListing);
router.get("/", verifyToken, getSavedListings);

module.exports = router;
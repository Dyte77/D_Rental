const express = require("express");
const router = express.Router();
const {
  createListing,
  getListings,
  getListingById,
  updateListing,
  deleteListing,
  uploadListingImage,
  deleteListingImage,
} = require("../controllers/listingController");
const { verifyToken, optionalAuth } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

router.post("/", verifyToken, createListing);
router.get("/", getListings);
router.get("/:id", optionalAuth, getListingById);
router.put("/:id", verifyToken, updateListing);
router.delete("/:id", verifyToken, deleteListing);
router.post("/:id/images", verifyToken, upload.single("image"), uploadListingImage);
router.delete("/images/:imageId", verifyToken, deleteListingImage);

module.exports = router;
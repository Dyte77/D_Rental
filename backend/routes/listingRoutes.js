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
const validate = require("../middleware/validate");
const { createListingSchema, updateListingSchema } = require("../validators/listingValidators");

router.post("/", verifyToken, validate(createListingSchema), createListing);
router.get("/", getListings);
router.get("/:id", optionalAuth, getListingById);
router.put("/:id", verifyToken, validate(updateListingSchema), updateListing);
router.delete("/:id", verifyToken, deleteListing);
router.post("/:id/images", verifyToken, upload.array("images", 5), uploadListingImage);
router.delete("/images/:imageId", verifyToken, deleteListingImage);

module.exports = router;
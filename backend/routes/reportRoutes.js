const express = require("express");
const router = express.Router();
const { createReport, getAllReports, updateReportStatus } = require("../controllers/reportController");
const { verifyToken } = require("../middleware/authMiddleware");

router.post("/", verifyToken, createReport);
router.get("/", verifyToken, getAllReports);
router.patch("/:id", verifyToken, updateReportStatus);

module.exports = router;
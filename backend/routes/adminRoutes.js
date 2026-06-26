const express = require("express");
const router = express.Router();
const { getAllUsers, createAdmin, suspendUser, unsuspendUser, deleteUser } = require("../controllers/adminController");
const { verifyToken } = require("../middleware/authMiddleware");

function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ success: false, error: "Admin access required." });
  }
  next();
}

router.use(verifyToken, requireAdmin);

router.get("/users", getAllUsers);
router.post("/users", createAdmin);
router.patch("/users/:id/suspend", suspendUser);
router.patch("/users/:id/unsuspend", unsuspendUser);
router.delete("/users/:id", deleteUser);

module.exports = router;
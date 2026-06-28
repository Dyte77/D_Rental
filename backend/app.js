const express = require("express");
const cors = require("cors");
const allowedOrigins = []; // add real frontend domains here once they exist

const corsOptions = {
  origin: function (origin, callback) {
    // No Origin header at all (curl, Postman, native mobile apps) — always allow.
    if (!origin) return callback(null, true);

    // A browser sent an Origin header — only allow it if explicitly listed.
    if (allowedOrigins.includes(origin)) return callback(null, true);

    callback(new Error("Not allowed by CORS"));
  },
};
const pool = require("./db");
const authRoutes = require("./routes/authRoutes");
const listingRoutes = require("./routes/listingRoutes");
const messageRoutes = require("./routes/messageRoutes");
const reportRoutes = require("./routes/reportRoutes");
const adminRoutes = require("./routes/adminRoutes");
const { generalLimiter } = require("./middleware/rateLimiter");
const savedListingRoutes = require("./routes/savedListingRoutes");

const app = express();

app.use(cors(corsOptions));
app.use(express.json());
app.use(generalLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/saved-listings", savedListingRoutes);

app.get("/", (req, res) => {
  res.send("Rental Connect backend is running.");
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: "Route not found." });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, error: "Something went wrong. Please try again later." });
});

module.exports = app;
const express = require("express");
const pool = require("./db");
const authRoutes = require("./routes/authRoutes");
const listingRoutes = require("./routes/listingRoutes");
const messageRoutes = require("./routes/messageRoutes");
const reportRoutes = require("./routes/reportRoutes");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/reports", reportRoutes);

app.get("/", (req, res) => {
  res.send("Rental Connect backend is running.");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
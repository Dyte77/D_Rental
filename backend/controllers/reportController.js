const pool = require("../db");

async function createReport(req, res) {
  try {
    const { listing_id, reason } = req.body;

    if (!listing_id || !reason) {
      return res.status(400).json({ success: false, error: "listing_id and reason are required." });
    }

    const result = await pool.query(
      `INSERT INTO reports (listing_id, reported_by, reason)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [listing_id, req.user.id, reason]
    );

    res.status(201).json({ success: true, report: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function getAllReports(req, res) {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Only admins can view reports." });
    }

    const result = await pool.query(
      `SELECT reports.*, listings.title AS listing_title, users.full_name AS reported_by_name
       FROM reports
       JOIN listings ON reports.listing_id = listings.id
       JOIN users ON reports.reported_by = users.id
       ORDER BY reports.created_at DESC`
    );

    res.json({ success: true, count: result.rows.length, reports: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function updateReportStatus(req, res) {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Only admins can update report status." });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "reviewed", "dismissed"].includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status value." });
    }

    const result = await pool.query(
      "UPDATE reports SET status = $1 WHERE id = $2 RETURNING *",
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Report not found." });
    }

    res.json({ success: true, report: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { createReport, getAllReports, updateReportStatus };
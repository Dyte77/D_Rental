const pool = require("../db");

async function saveListing(req, res) {
  try {
    if (req.user.role !== "tenant") {
      return res.status(403).json({ success: false, error: "Only tenants can save listings." });
    }

    const { listing_id } = req.body;

    const listingResult = await pool.query("SELECT id FROM listings WHERE id = $1", [listing_id]);

    if (listingResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Listing not found." });
    }

    const result = await pool.query(
      "INSERT INTO saved_listings (user_id, listing_id) VALUES ($1, $2) RETURNING *",
      [req.user.id, listing_id]
    );

    res.status(201).json({ success: true, saved: result.rows[0] });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ success: false, error: "You have already saved this listing." });
    }
    res.status(500).json({ success: false, error: err.message });
  }
}

async function unsaveListing(req, res) {
  try {
    const { listingId } = req.params;

    const result = await pool.query(
      "DELETE FROM saved_listings WHERE user_id = $1 AND listing_id = $2 RETURNING *",
      [req.user.id, listingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Saved listing not found." });
    }

    res.json({ success: true, message: "Listing removed from saved listings." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function getSavedListings(req, res) {
  try {
    const result = await pool.query(
      `SELECT listings.*, saved_listings.saved_at
       FROM saved_listings
       JOIN listings ON saved_listings.listing_id = listings.id
       WHERE saved_listings.user_id = $1
       ORDER BY saved_listings.saved_at DESC`,
      [req.user.id]
    );

    res.json({ success: true, count: result.rows.length, savedListings: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { saveListing, unsaveListing, getSavedListings };
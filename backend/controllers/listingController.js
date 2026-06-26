const pool = require("../db");

async function createListing(req, res) {
  try {
    if (req.user.role !== "landlord") {
      return res.status(403).json({ success: false, error: "Only landlords can post listings." });
    }

    const {
      title,
      description,
      price_per_month,
      room_type,
      bedrooms,
      has_kitchen,
      bathroom_type,
      has_water,
      has_electricity,
      is_gated,
      district,
    } = req.body;

    if (!title || !price_per_month || !district) {
      return res.status(400).json({ success: false, error: "Title, price, and district are required." });
    }

    const result = await pool.query(
      `INSERT INTO listings 
        (landlord_id, title, description, price_per_month, room_type, bedrooms, has_kitchen, bathroom_type, has_water, has_electricity, is_gated, district)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        req.user.id,
        title,
        description,
        price_per_month,
        room_type,
        bedrooms || 1,
        has_kitchen || false,
        bathroom_type,
        has_water || false,
        has_electricity || false,
        is_gated || false,
        district,
      ]
    );

    res.status(201).json({ success: true, listing: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function getListings(req, res) {
  try {
    const { district, min_price, max_price, room_type } = req.query;

    let query = "SELECT * FROM listings WHERE status = 'available'";
    const values = [];

    if (district) {
      values.push(district);
      query += ` AND district ILIKE $${values.length}`;
    }

    if (min_price) {
      values.push(min_price);
      query += ` AND price_per_month >= $${values.length}`;
    }

    if (max_price) {
      values.push(max_price);
      query += ` AND price_per_month <= $${values.length}`;
    }

    if (room_type) {
      values.push(room_type);
      query += ` AND room_type = $${values.length}`;
    }

    query += " ORDER BY created_at DESC";

    const result = await pool.query(query, values);

    res.json({ success: true, count: result.rows.length, listings: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function getListingById(req, res) {
  try {
    const { id } = req.params;

    const listingResult = await pool.query("SELECT * FROM listings WHERE id = $1", [id]);

    if (listingResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Listing not found." });
    }

    // Log the view — viewer_id is null if no one is logged in
    const viewerId = req.user ? req.user.id : null;
    await pool.query(
      "INSERT INTO listing_views (listing_id, viewer_id) VALUES ($1, $2)",
      [id, viewerId]
    );

    res.json({ success: true, listing: listingResult.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function updateListing(req, res) {
  try {
    const { id } = req.params;

    const listingResult = await pool.query("SELECT * FROM listings WHERE id = $1", [id]);

    if (listingResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Listing not found." });
    }

    const listing = listingResult.rows[0];

    if (listing.landlord_id !== req.user.id) {
      return res.status(403).json({ success: false, error: "You can only edit your own listings." });
    }

    const {
      title,
      description,
      price_per_month,
      room_type,
      bedrooms,
      has_kitchen,
      bathroom_type,
      has_water,
      has_electricity,
      is_gated,
      district,
      status,
    } = req.body;

    const result = await pool.query(
      `UPDATE listings SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        price_per_month = COALESCE($3, price_per_month),
        room_type = COALESCE($4, room_type),
        bedrooms = COALESCE($5, bedrooms),
        has_kitchen = COALESCE($6, has_kitchen),
        bathroom_type = COALESCE($7, bathroom_type),
        has_water = COALESCE($8, has_water),
        has_electricity = COALESCE($9, has_electricity),
        is_gated = COALESCE($10, is_gated),
        district = COALESCE($11, district),
        status = COALESCE($12, status)
       WHERE id = $13
       RETURNING *`,
      [title, description, price_per_month, room_type, bedrooms, has_kitchen, bathroom_type, has_water, has_electricity, is_gated, district, status, id]
    );

    res.json({ success: true, listing: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function deleteListing(req, res) {
  try {
    const { id } = req.params;

    const listingResult = await pool.query("SELECT * FROM listings WHERE id = $1", [id]);

    if (listingResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Listing not found." });
    }

    if (listingResult.rows[0].landlord_id !== req.user.id) {
      return res.status(403).json({ success: false, error: "You can only delete your own listings." });
    }

    await pool.query("DELETE FROM listings WHERE id = $1", [id]);

    res.json({ success: true, message: "Listing deleted." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
module.exports = { createListing, getListings, getListingById, updateListing, deleteListing };
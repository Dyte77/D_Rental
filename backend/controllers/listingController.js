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

module.exports = { createListing };
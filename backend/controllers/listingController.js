const pool = require("../db");
const cloudinary = require("../config/cloudinary");

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

    const imagesResult = await pool.query(
      "SELECT id, image_url, uploaded_at FROM listing_images WHERE listing_id = $1 AND is_approved = TRUE ORDER BY uploaded_at ASC",
      [id]
    );

    const viewerId = req.user ? req.user.id : null;
    await pool.query(
      "INSERT INTO listing_views (listing_id, viewer_id) VALUES ($1, $2)",
      [id, viewerId]
    );

    res.json({
      success: true,
      listing: { ...listingResult.rows[0], images: imagesResult.rows },
    });
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

async function adminDeleteListing(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query("DELETE FROM listings WHERE id = $1 RETURNING *", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Listing not found." });
    }

    res.json({ success: true, message: "Listing removed by admin.", listing: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function uploadListingImage(req, res) {
  try {
    const { id } = req.params;

    const listingResult = await pool.query("SELECT * FROM listings WHERE id = $1", [id]);

    if (listingResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Listing not found." });
    }

    if (listingResult.rows[0].landlord_id !== req.user.id) {
      return res.status(403).json({ success: false, error: "You can only upload images to your own listings." });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: "No image files provided." });
    }

    const existingCountResult = await pool.query(
      "SELECT COUNT(*) FROM listing_images WHERE listing_id = $1",
      [id]
    );
    const existingCount = parseInt(existingCountResult.rows[0].count);

    if (existingCount + req.files.length > 5) {
      return res.status(400).json({
        success: false,
        error: `This listing already has ${existingCount} image(s). Maximum 5 images per listing.`,
      });
    }

    const uploadedImages = [];

    for (const file of req.files) {
      const base64Image = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

      const uploadResult = await cloudinary.uploader.upload(base64Image, {
        folder: "rental_connect_listings",
      });

      const insertResult = await pool.query(
        "INSERT INTO listing_images (listing_id, image_url) VALUES ($1, $2) RETURNING *",
        [id, uploadResult.secure_url]
      );

      uploadedImages.push(insertResult.rows[0]);
    }

    res.status(201).json({ success: true, images: uploadedImages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
async function deleteListingImage(req, res) {
  try {
    const { imageId } = req.params;

    const imageResult = await pool.query(
      `SELECT listing_images.*, listings.landlord_id
       FROM listing_images
       JOIN listings ON listing_images.listing_id = listings.id
       WHERE listing_images.id = $1`,
      [imageId]
    );

    if (imageResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Image not found." });
    }

    const image = imageResult.rows[0];

    if (image.landlord_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "You can only delete images from your own listings." });
    }

    await pool.query("DELETE FROM listing_images WHERE id = $1", [imageId]);

    res.json({ success: true, message: "Image deleted." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { createListing, getListings, getListingById, updateListing, deleteListing, adminDeleteListing, uploadListingImage, deleteListingImage };
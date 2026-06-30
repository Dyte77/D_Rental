const pool = require("../db");
const PDFDocument = require("pdfkit");
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

    // Fetch images for ALL matching listings in a single query, rather
    // than one extra query per listing (which would be slow and
    // wasteful for a list of, say, 50 listings). We then group them
    // by listing_id in JavaScript afterward.
    const listingIds = result.rows.map((listing) => listing.id);

    let imagesByListingId = {};

    if (listingIds.length > 0) {
      const imagesResult = await pool.query(
        "SELECT listing_id, image_url FROM listing_images WHERE listing_id = ANY($1) AND is_approved = TRUE",
        [listingIds]
      );

      imagesResult.rows.forEach((row) => {
        if (!imagesByListingId[row.listing_id]) {
          imagesByListingId[row.listing_id] = [];
        }
        imagesByListingId[row.listing_id].push({ image_url: row.image_url });
      });
    }

    const listingsWithImages = result.rows.map((listing) => ({
      ...listing,
      images: imagesByListingId[listing.id] || [],
    }));

    res.json({ success: true, count: listingsWithImages.length, listings: listingsWithImages });
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

    const listing = listingResult.rows[0];

    if (!req.user) {
      // Logged-out tenant: show only price and images, hide everything else
      return res.json({
        success: true,
        listing: {
          id: listing.id,
          price_per_month: listing.price_per_month,
          status: listing.status,
          images: imagesResult.rows,
          locked: true,
          message: "Log in or sign up to view full listing details, location, and contact the landlord.",
        },
      });
    }

    res.json({
      success: true,
      listing: { ...listing, images: imagesResult.rows, locked: false },
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

async function downloadListingPdf(req, res) {
  try {
    if (req.user.role !== "tenant") {
      return res.status(403).json({ success: false, error: "Only tenants can download listings." });
    }

    const { id } = req.params;

    const listingResult = await pool.query("SELECT * FROM listings WHERE id = $1", [id]);

    if (listingResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Listing not found." });
    }

    const listing = listingResult.rows[0];

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="listing-${id}.pdf"`);

    doc.pipe(res);

    doc.fontSize(20).text(listing.title, { underline: true });
    doc.moveDown();

    doc.fontSize(14).text(`Price: UGX ${listing.price_per_month} / month`);
    doc.text(`District: ${listing.district}`);
    doc.text(`Room type: ${listing.room_type}`);
    doc.text(`Bedrooms: ${listing.bedrooms}`);
    doc.text(`Bathroom: ${listing.bathroom_type || "Not specified"}`);
    doc.text(`Kitchen: ${listing.has_kitchen ? "Yes" : "No"}`);
    doc.text(`Water available: ${listing.has_water ? "Yes" : "No"}`);
    doc.text(`Electricity available: ${listing.has_electricity ? "Yes" : "No"}`);
    doc.text(`Gated compound: ${listing.is_gated ? "Yes" : "No"}`);
    doc.text(`Status: ${listing.status}`);

    if (listing.description) {
      doc.moveDown();
      doc.fontSize(12).text("Description:", { underline: true });
      doc.text(listing.description);
    }

    doc.moveDown();
    doc.fontSize(10).text(`Generated by Rental Connect on ${new Date().toLocaleDateString()}`, {
      align: "center",
    });

    doc.end();
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function shareListing(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "UPDATE listings SET share_count = share_count + 1 WHERE id = $1 RETURNING id, title, price_per_month, district, share_count",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Listing not found." });
    }

    const listing = result.rows[0];

    const shareText = `Check out this rental on Rental Connect: ${listing.title} — UGX ${listing.price_per_month}/month in ${listing.district}. View it here: https://rentalconnect.app/listings/${listing.id}`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

    res.json({
      success: true,
      shareText,
      whatsappUrl,
      shareCount: listing.share_count,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { createListing, getListings, getListingById, updateListing, deleteListing, adminDeleteListing, uploadListingImage, deleteListingImage, downloadListingPdf, shareListing };
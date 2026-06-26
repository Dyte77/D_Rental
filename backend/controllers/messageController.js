const pool = require("../db");

async function sendMessage(req, res) {
  try {
    const { listing_id, receiver_id, message_text } = req.body;

    if (!listing_id || !receiver_id || !message_text) {
      return res.status(400).json({ success: false, error: "listing_id, receiver_id, and message_text are required." });
    }

    const result = await pool.query(
      `INSERT INTO messages (listing_id, sender_id, receiver_id, message_text)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [listing_id, req.user.id, receiver_id, message_text]
    );

    res.status(201).json({ success: true, message: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function getConversation(req, res) {
  try {
    const { listingId, otherUserId } = req.params;

    const result = await pool.query(
      `SELECT * FROM messages
       WHERE listing_id = $1
         AND ((sender_id = $2 AND receiver_id = $3) OR (sender_id = $3 AND receiver_id = $2))
       ORDER BY sent_at ASC`,
      [listingId, req.user.id, otherUserId]
    );

    res.json({ success: true, count: result.rows.length, messages: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { sendMessage, getConversation };
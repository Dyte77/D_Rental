const Joi = require("joi");

const sendMessageSchema = Joi.object({
  listing_id: Joi.number().integer().positive().required(),
  receiver_id: Joi.number().integer().positive().required(),
  message_text: Joi.string().trim().min(1).max(2000).required(),
});

module.exports = { sendMessageSchema };
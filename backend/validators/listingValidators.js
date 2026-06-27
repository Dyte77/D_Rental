const Joi = require("joi");

const createListingSchema = Joi.object({
  title: Joi.string().trim().min(5).max(150).required(),
  description: Joi.string().trim().max(2000).allow("").optional(),
  price_per_month: Joi.number().positive().required(),
  room_type: Joi.string().valid("single", "double", "self-contained", "apartment").required(),
  bedrooms: Joi.number().integer().min(1).max(20).optional(),
  has_kitchen: Joi.boolean().optional(),
  bathroom_type: Joi.string().valid("indoor", "outdoor").optional(),
  has_water: Joi.boolean().optional(),
  has_electricity: Joi.boolean().optional(),
  is_gated: Joi.boolean().optional(),
  district: Joi.string().trim().min(2).max(100).required(),
});

const updateListingSchema = Joi.object({
  title: Joi.string().trim().min(5).max(150).optional(),
  description: Joi.string().trim().max(2000).allow("").optional(),
  price_per_month: Joi.number().positive().optional(),
  room_type: Joi.string().valid("single", "double", "self-contained", "apartment").optional(),
  bedrooms: Joi.number().integer().min(1).max(20).optional(),
  has_kitchen: Joi.boolean().optional(),
  bathroom_type: Joi.string().valid("indoor", "outdoor").optional(),
  has_water: Joi.boolean().optional(),
  has_electricity: Joi.boolean().optional(),
  is_gated: Joi.boolean().optional(),
  district: Joi.string().trim().min(2).max(100).optional(),
  status: Joi.string().valid("available", "occupied").optional(),
});

module.exports = { createListingSchema, updateListingSchema };
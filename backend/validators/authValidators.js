const Joi = require("joi");

const registerSchema = Joi.object({
  full_name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().trim().email().lowercase().required(),
  phone: Joi.string()
    .trim()
    .pattern(/^[0-9+\s-]{9,15}$/)
    .required()
    .messages({ "string.pattern.base": "Phone number must be 9–15 digits and may include +, spaces, or dashes." }),
  password: Joi.string().min(8).required().messages({ "string.min": "Password must be at least 8 characters." }),
  role: Joi.string().valid("tenant", "landlord").required(),
  referral_code: Joi.string().trim().uppercase().optional().allow(""),
});


const loginSchema = Joi.object({
  email: Joi.string().trim().email().lowercase().required(),
  password: Joi.string().required(),
});

const requestOtpSchema = Joi.object({
  phone: Joi.string()
    .trim()
    .pattern(/^[0-9+\s-]{9,15}$/)
    .required(),
});

const verifyOtpSchema = Joi.object({
  phone: Joi.string()
    .trim()
    .pattern(/^[0-9+\s-]{9,15}$/)
    .required(),
  otp_code: Joi.string().length(6).pattern(/^[0-9]+$/).required(),
});

const forgotPasswordSchema = Joi.object({
  identifier: Joi.string().trim().required(),
});

const resetPasswordSchema = Joi.object({
  identifier: Joi.string().trim().required(),
  reset_code: Joi.string().length(6).pattern(/^[0-9]+$/).required(),
  new_password: Joi.string().min(8).required().messages({ "string.min": "New password must be at least 8 characters." }),
});

const deleteAccountSchema = Joi.object({
  password: Joi.string().required(),
});

// Used by both the refresh and logout endpoints — both just need
// a refresh token string in the request body.
const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

module.exports = {
  registerSchema,
  loginSchema,
  requestOtpSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  deleteAccountSchema,
  refreshTokenSchema
};
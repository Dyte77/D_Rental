const path = require("path");
require("dotenv").config({
  path: process.env.NODE_ENV === "test" ? path.resolve(__dirname, "../.env.test") : path.resolve(__dirname, "../.env"),
});
const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

module.exports = pool;
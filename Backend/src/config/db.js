const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },

  // ── Connection pool tuning ──────────────────
  // Keep pool small for Neon serverless (default is 10 which causes
  // connection storms under rapid concurrent requests).
  max:              5,    // max simultaneous connections
  idleTimeoutMillis: 30000, // close idle connections after 30s
  connectionTimeoutMillis: 5000, // fail fast if pool is exhausted
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL pool error:', err.message);
  // Don't exit — let Express handle per-request errors gracefully
});

module.exports = pool;

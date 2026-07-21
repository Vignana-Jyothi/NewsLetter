const app = require('./src/app');
const pool = require('./src/config/db');
const initDB = require('./src/utils/initDB');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    // Test DB connection
    await pool.query('SELECT NOW()');
    console.log('✅ PostgreSQL connected');

    // Initialize schema & seed data
    await initDB();

    app.listen(PORT, () => {
      console.log(`🚀 NEWSFLOW Backend running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

start();

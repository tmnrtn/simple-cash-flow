const { Pool } = require('pg');

// Fail fast rather than silently falling back to a well-known password.
if (!process.env.DB_PASSWORD) {
  console.error('DB_PASSWORD is not set. Configure it in your environment (see .env.example).');
  process.exit(1);
}

module.exports = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cashflow',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

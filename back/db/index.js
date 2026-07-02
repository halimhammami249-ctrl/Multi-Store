const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

if (!process.env.DATABASE_URL) {
  const envPath = path.join(__dirname, '..', '.env');

  if (fs.existsSync(envPath)) {
    const databaseUrlLine = fs
      .readFileSync(envPath, 'utf8')
      .split(/\r?\n/)
      .find((line) => line.startsWith('DATABASE_URL='));

    if (databaseUrlLine) {
      process.env.DATABASE_URL = databaseUrlLine
        .slice('DATABASE_URL='.length)
        .trim();
    }
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = pool;

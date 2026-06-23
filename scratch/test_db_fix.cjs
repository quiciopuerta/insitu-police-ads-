const postgres = require('postgres');

// The password from .env: u6N3S3u-P0r7-2025!
// Encoded: u6N3S3u-P0r7-2025%21

const DB_URL = "postgresql://postgres.itpbeclogobwewjofatp:u6N3S3u-P0r7-2025%21@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

async function test() {
  console.log("Testing connection with encoded password...");
  const sql = postgres(DB_URL, { ssl: { rejectUnauthorized: false } });
  try {
    const users = await sql`SELECT count(*) FROM users`;
    console.log("Connection successful! User count:", users[0].count);
  } catch (err) {
    console.error("Connection failed:", err.message);
  } finally {
    await sql.end();
  }
}

test();

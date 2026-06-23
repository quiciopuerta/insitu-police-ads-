const postgres = require('postgres');

// Attempting direct connection instead of pooler
const DB_URL = "postgresql://postgres:u6N3S3u-P0r7-2025%21@db.itpbeclogobwewjofatp.supabase.co:5432/postgres";

async function test() {
  console.log("Testing direct connection...");
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

require('dotenv').config();
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL || process.env.VITE_SUPABASE_URL, { ssl: { rejectUnauthorized: false } });

async function main() {
  try {
    const users = await sql`SELECT * FROM users LIMIT 5`;
    console.table(users);
  } catch (err) {
    console.error('Error fetching users:', err.message);
  } finally {
    await sql.end();
  }
}
main();

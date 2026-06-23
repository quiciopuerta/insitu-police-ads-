import postgres from 'postgres';
const sql = postgres("postgresql://postgres:QYlvLdcz0rbazMOj@db.dxehebdwqgpewetxgawg.supabase.co:5432/postgres", { ssl: 'require' });
async function test() {
  try {
    const res = await sql`SELECT NOW()`;
    console.log("Success:", res);
  } catch(e) {
    console.error("Error:", e);
  }
  process.exit(0);
}
test();

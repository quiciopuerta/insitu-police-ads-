import postgres from 'postgres';
const url = "postgresql://insitu_backend.cnpbliiacruacqkchuht:InsituPolice2026!@aws-0-us-west-2.pooler.supabase.com:5432/postgres";
const sql = postgres(url, { ssl: 'require', connect_timeout: 5 });
async function test() {
  try {
    const res = await sql`SELECT 1`;
    console.log("SUCCESS!", res);
  } catch(e) {
    console.error("Error:", e.message);
  } finally {
    sql.end();
  }
}
test();

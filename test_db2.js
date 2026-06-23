import postgres from 'postgres';
const sql = postgres("postgresql://postgres.cnpbliiacruacqkchuht:QYlvLdcz0rbazMOj@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true", { ssl: 'require' });
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

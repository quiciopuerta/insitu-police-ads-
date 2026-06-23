import postgres from 'postgres';

const regions = [
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1',
  'ap-southeast-1', 'ap-northeast-1', 'ap-northeast-2',
  'ap-southeast-2', 'ap-south-1', 'sa-east-1', 'ca-central-1'
];

async function checkRegion(region) {
  const url = `postgresql://postgres.cnpbliiacruacqkchuht:QYlvLdcz0rbazMOj@aws-0-${region}.pooler.supabase.com:6543/postgres?pgbouncer=true`;
  const sql = postgres(url, { ssl: 'require', connect_timeout: 5 });
  try {
    await sql`SELECT 1`;
    console.log(`SUCCESS in region: ${region}`);
    process.exit(0);
  } catch(e) {
    if (e.message && e.message.includes('not found')) {
      // tenant not found, wrong region
    } else {
      console.log(`Region ${region} failed with: ${e.message}`);
    }
  } finally {
    sql.end();
  }
}

async function run() {
  console.log("Starting scan...");
  await Promise.all(regions.map(r => checkRegion(r)));
  console.log("Scan finished.");
}

run();

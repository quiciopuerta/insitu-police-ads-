import { scryptSync, randomBytes } from "crypto";
import postgres from "postgres";

const sql = postgres("postgresql://postgres.dxehebdwqgpewetxgawg:QYlvLdcz0rbazMOj@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true");

function hashPassword(plain) {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(plain, salt, 64).toString("hex");
    return `scrypt:${salt}:${hash}`;
}

async function run() {
    const email = "sociopuerta@gmail.com";
    const password = "Maxi2018@";
    const username = "SocioPuerta";
    const hashed = hashPassword(password);
    
    try {
        await sql`
            INSERT INTO users (id, username, password, email, role, full_name, plan, status, onboarded) 
            VALUES (gen_random_uuid(), ${username}, ${hashed}, ${email}, 'superAdmin', 'Socio Puerta', 'Agency', 'active', true)
        `;
        console.log("User inserted successfully!");
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
run();

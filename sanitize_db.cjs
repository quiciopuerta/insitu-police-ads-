const postgres = require("postgres");

async function run() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error("No DATABASE_URL found");
        process.exit(1);
    }
    const sql = postgres(dbUrl, { ssl: "require" });
    try {
        const rows = await sql`SELECT data FROM settings WHERE id = 1`;
        if (rows.length > 0) {
            let data = rows[0].data;
            if (typeof data === "string") {
                data = JSON.parse(data);
            }
            if (data?.gcpCredentials?.private_key) {
                console.log("Found private key in DB. Removing...");
                data.gcpCredentials.private_key = "REDACTED_SECURITY_HOTFIX";
                const dataStr = JSON.stringify(data);
                await sql`UPDATE settings SET data = ${dataStr} WHERE id = 1`;
                console.log("Database sanitized successfully.");
            } else {
                console.log("No private key found in DB.");
            }
        } else {
            console.log("No settings found.");
        }
    } catch (err) {
        console.error("DB Error:", err);
    } finally {
        await sql.end();
    }
}
run();

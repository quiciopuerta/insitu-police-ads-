import "dotenv/config";
import db, { initDb } from "./db.js";
import { v4 as uuidv4 } from "uuid";

(async () => {
    try {
        await initDb();
        console.log("DB initialized.");

        const qaUsername = "qa_user";
        const qaEmail = "qa@insituai.test";
        const qaPassword = "password123";
        const qaId = uuidv4();
        
        // Plaintext password is fine, auth.js upgrades it transparently.
        await db.run(
            `INSERT INTO users (id, username, password, email, role, approval_status, picture, last_login, subscription, usage_limit)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT (username) DO NOTHING`,
            [
                qaId,
                qaUsername,
                qaPassword,
                qaEmail,
                'admin',
                'approved',
                'https://ui-avatars.com/api/?name=QA+User&background=6366f1&color=fff',
                Date.now(),
                JSON.stringify({ status: 'active', plan: 'Agency', price: 299, expiryDate: Date.now() + 1000 * 60 * 60 * 24 * 365 }),
                100000
            ]
        );
        console.log("✅ QA User has been inserted/verified.");
        console.log(`Email: ${qaEmail}`);
        console.log(`Username: ${qaUsername}`);
        console.log(`Password: ${qaPassword}`);
    } catch (e) {
        console.error("Error setting up QA user:", e);
    }
    process.exit(0);
})();


import db from './db.js';

async function testQuery() {
    try {
        console.log("Testing Scanner Stats queries...");
        
        // Test 1: FILTER
        try {
            const tracksCount = await db.get(`
                SELECT 
                    COUNT(*) as total, 
                    COUNT(*) FILTER (WHERE is_active = true) as active 
                FROM competitor_tracks
            `);
            console.log("Filter query success:", tracksCount);
        } catch (e) {
            console.error("Filter query failed:", e.message);
        }

        // Test 2: TO_CHAR / TO_TIMESTAMP
        try {
            const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
            const historicalSignals = await db.all(`
                SELECT 
                    TO_CHAR(TO_TIMESTAMP(detected_at / 1000), 'YYYY-MM-DD') as date,
                    COUNT(*) as count
                FROM competitor_signals
                WHERE detected_at > ?
                GROUP BY date
                ORDER BY date ASC
            `, [sevenDaysAgo]);
            console.log("Historical signals success:", historicalSignals);
        } catch (e) {
            console.error("Historical signals failed:", e.message);
        }

    } catch (error) {
        console.error("Test failed:", error);
    }
}

testQuery();

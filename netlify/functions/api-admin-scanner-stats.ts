import { Handler } from "@netlify/functions";
import { runQuery } from "./_lib/db";
import { safeError, logError } from "./_lib/errorHandler";

const DB_URL = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || "";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Id",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

  // DB initialization is handled by runQuery

  // Auth: ADMIN_SECRET (scripts) OR admin userId (frontend)
  const authHeader = event.headers["authorization"] || event.headers["Authorization"] || event.headers["x-admin-key"] || "";
  const xUserId = event.headers["x-user-id"] || event.headers["X-User-Id"] || "";

  let isAuthorized = ADMIN_SECRET !== "" && authHeader === `Bearer ${ADMIN_SECRET}`;
  if (!isAuthorized && xUserId) {
    const roleRows = await runQuery(async (sql) => await sql`SELECT role, username FROM users WHERE id = ${xUserId} LIMIT 1`);
    if(roleRows && roleRows.length > 0) {
      isAuthorized = roleRows[0].role === "admin" || roleRows[0].role === "superAdmin";
    }
  }
  if (!isAuthorized) {
    console.warn(`[ADMIN-STATS] 401 Unauthorized for path ${event.path}. UserUID: ${xUserId || 'Missing'}`);
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: "Unauthorized" }) };
  }



  try {
    const stats = await runQuery(async (sql) => {
      // 1. General Stats
      const tracksCount = await sql`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active = true) as active FROM competitor_tracks`;
      const signalsCount = await sql`SELECT COUNT(*) as total FROM competitor_signals`;
      const avgRelevance = await sql`SELECT AVG(relevance_score) as avg FROM competitor_signals`;
      
      // 2. Signals by Type
      const statsByType = await sql`
        SELECT type, COUNT(*) as count 
        FROM competitor_signals 
        GROUP BY type 
        ORDER BY count DESC
      `;

      // 3. Signals by Source
      const statsBySource = await sql`
        SELECT source, COUNT(*) as count 
        FROM competitor_signals 
        GROUP BY source 
        ORDER BY count DESC
      `;

      // 4. Scans over time (last 7 days)
      const historicalSignals = await sql`
        SELECT 
          TO_CHAR(TO_TIMESTAMP(detected_at / 1000), 'YYYY-MM-DD') as date,
          COUNT(*) as count
        FROM competitor_signals
        WHERE detected_at > ${Date.now() - 7 * 24 * 60 * 60 * 1000}
        GROUP BY date
        ORDER BY date ASC
      `;
      return { tracksCount, signalsCount, avgRelevance, statsByType, statsBySource, historicalSignals };
    });

    if (!stats) return { statusCode: 503, headers: CORS, body: JSON.stringify({ error: "Database offline" }) };

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        tracks: stats.tracksCount[0],
        signals: {
          total: stats.signalsCount[0].total,
          avgRelevance: Math.round(stats.avgRelevance[0].avg || 0)
        },
        statsByType: stats.statsByType,
        statsBySource: stats.statsBySource,
        historicalSignals: stats.historicalSignals
      })
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: safeError(err) })
    };
  }
};

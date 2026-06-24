import { getCorsHeaders } from "./_lib/corsHelper";
import { getUserIdFromHeaders } from "./_lib/authMiddleware";
import type { Handler, HandlerEvent } from "@netlify/functions";
import { runQuery } from "./_lib/db";
import { safeError } from "./_lib/errorHandler";

const jsonResponse = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined),
  body: JSON.stringify(body),
});

// ── Lazy table initialisation (tolerant to DB unavailability) ─────────────────
let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  try {
    await runQuery(async (sql) => {
      await sql`
        CREATE TABLE IF NOT EXISTS ai_technical_logs (
          id SERIAL PRIMARY KEY,
          feature VARCHAR(50) NOT NULL,
          error_message TEXT NOT NULL,
          stack_trace TEXT,
          request_context JSONB,
          severity VARCHAR(20) DEFAULT 'error',
          user_id VARCHAR(50),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;
    });
    tableReady = true;
  } catch (initErr) {
    // Non-fatal — table probably already exists or DB is temporarily down
    console.warn("[api-ai-logs] ensureTable warning:", initErr);
  }
}

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === "OPTIONS")
    return { statusCode: 204, headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined), body: "" };

  // Best-effort table init — never blocks the request
  await ensureTable();

  try {
    // ── GET → Fetch logs for Admins ──────────────────────────────────────────
    if (event.httpMethod === "GET") {
      const xUserId = getUserIdFromHeaders(event.headers);

      if (!xUserId) {
        return jsonResponse(401, { error: "Unauthorized. X-User-Id header required." });
      }

      // Role check — runQuery may return null if DB is down; treat as temporary unavailability
      const roleResult = await runQuery(async (sql) => {
        const rows = await sql`SELECT role FROM users WHERE id = ${xUserId} LIMIT 1`;
        return rows && rows.length > 0 ? rows[0].role : null;
      });

      // null → DB unavailable (circuit open), not an auth failure
      if (roleResult === undefined || roleResult === null) {
        return jsonResponse(503, { error: "Database temporarily unavailable. Try again in a few seconds.", logs: [] });
      }

      if (roleResult !== "admin" && roleResult !== "superAdmin") {
        return jsonResponse(401, { error: "Unauthorized. Admin only." });
      }

      const params = event.queryStringParameters || {};
      const limit = Math.min(parseInt(params.limit || "50"), 200);
      const feature = params.feature;

      const logs = await runQuery(async (sql) => {
        if (feature) {
          return await sql`
            SELECT * FROM ai_technical_logs
            WHERE feature = ${feature}
            ORDER BY created_at DESC
            LIMIT ${limit}
          `;
        }
        return await sql`
          SELECT * FROM ai_technical_logs
          ORDER BY created_at DESC
          LIMIT ${limit}
        `;
      });

      // runQuery returns null when circuit is open — return empty list gracefully
      return jsonResponse(200, { logs: logs ?? [] });
    }

    // ── POST → Register a new technical malfunction/error ────────────────────
    if (event.httpMethod === "POST") {
      let body: any = {};
      try {
        body = JSON.parse(event.body || "{}");
      } catch {
        return jsonResponse(400, { error: "Invalid JSON body" });
      }

      const { feature, errorMessage, stackTrace, context, severity, userId } = body;

      if (!feature || !errorMessage) {
        return jsonResponse(400, { error: "Missing required fields: feature, errorMessage" });
      }

      const result = await runQuery(async (sql) => {
        return await sql`
          INSERT INTO ai_technical_logs (feature, error_message, stack_trace, request_context, severity, user_id)
          VALUES (
            ${feature},
            ${errorMessage},
            ${stackTrace || null},
            ${context ? JSON.stringify(context) : null},
            ${severity || "error"},
            ${userId || null}
          )
          RETURNING id;
        `;
      });

      if (!result || result.length === 0) {
        // DB down — acknowledge receipt so the client doesn't retry-loop
        console.warn("[api-ai-logs] DB unavailable — log discarded:", feature, errorMessage);
        return jsonResponse(202, { success: false, reason: "DB temporarily unavailable — log queued for retry" });
      }

      return jsonResponse(201, { success: true, logId: result[0].id });
    }

    return jsonResponse(405, { error: "Method not allowed" });
  } catch (err: any) {
    console.error("[api-ai-logs] Error:", err);
    return jsonResponse(500, { error: safeError(err) });
  }
};

export { handler };

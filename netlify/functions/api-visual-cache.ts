import { getCorsHeaders } from "./_lib/corsHelper";
import { Handler, HandlerEvent } from "@netlify/functions";
import { runQuery } from "./_lib/db";

const DB_URL =
  process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || "";

const jsonResponse = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: getCorsHeaders(event.headers.origin || event.headers.Origin),
  body: JSON.stringify(body),
});

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === "OPTIONS")
    return { statusCode: 204, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: "" };

  // DB initialization is handled by runQuery

  // Initialize table if it doesn't exist
  await runQuery(async (sql) => {
    await sql`
      CREATE TABLE IF NOT EXISTS ai_visual_cache (
        id SERIAL PRIMARY KEY,
        hash VARCHAR(255) UNIQUE NOT NULL,
        result JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    // Create an index on the hash column for faster lookups
    await sql`
      CREATE INDEX IF NOT EXISTS ai_visual_cache_hash_idx ON ai_visual_cache (hash);
    `;
  });

  if (event.httpMethod === "GET") {
    const hash = event.queryStringParameters?.hash;
    if (!hash) return jsonResponse(400, { error: "Hash is required" });

    const records = await runQuery(async (sql) => {
      return await sql`
        SELECT result FROM ai_visual_cache WHERE hash = ${hash} AND created_at > NOW() - INTERVAL '7 days'
      `;
    });

    if (records && records.length > 0) {
      return jsonResponse(200, { cached: true, result: records[0].result });
    }

    return jsonResponse(200, { cached: false, dbOffline: records === null });
  }

  if (event.httpMethod === "POST") {
    const body = JSON.parse(event.body || "{}");
    const { hash, result } = body;

    if (!hash || !result) {
      return jsonResponse(400, { error: "hash and result are required" });
    }

    const inserted = await runQuery(async (sql) => {
      return await sql`
        INSERT INTO ai_visual_cache (hash, result)
        VALUES (${hash}, ${result! /* Ensure result is valid JSON */})
        ON CONFLICT (hash) 
        DO UPDATE SET result = EXCLUDED.result, created_at = CURRENT_TIMESTAMP
        RETURNING hash;
      `;
    });

    if (!inserted) return jsonResponse(503, { error: "Database offline" });

    return jsonResponse(200, { success: true, hash: inserted[0].hash });
  }

  return jsonResponse(405, { error: "Method not allowed" });
};

export { handler };

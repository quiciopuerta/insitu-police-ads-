import { Handler } from "@netlify/functions";
import { runQuery } from "./_lib/db";
import { getCorsHeaders } from "./_lib/corsHelper";

const handler: Handler = async (event, context) => {
  const origin = event.headers.origin;
  const corsHeaders = getCorsHeaders(origin);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
      headers: corsHeaders,
    };
  }

  const { userId, email } = JSON.parse(event.body || "{}");

  if (!userId && !email) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing userId or email" }),
      headers: corsHeaders,
    };
  }

  try {
    // Generate random API key
    const apiKey = `insitu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Lookup user using the correct runQuery pattern
    let rows: any[] | null;
    if (email) {
      rows = await runQuery(
        async (sql) =>
          await sql`SELECT * FROM users WHERE LOWER(email) = LOWER(${email}) AND is_deleted = false LIMIT 1`
      );
    } else {
      rows = await runQuery(
        async (sql) =>
          await sql`SELECT * FROM users WHERE id = ${userId} AND is_deleted = false LIMIT 1`
      );
    }

    if (rows === null) {
      return {
        statusCode: 503,
        body: JSON.stringify({ error: "Database temporarily unavailable" }),
        headers: corsHeaders,
      };
    }

    if (!rows.length) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "User not found" }),
        headers: corsHeaders,
      };
    }

    const user = rows[0];

    // Store API key for extension
    await runQuery(
      async (sql) =>
        await sql`UPDATE users SET extension_api_key = ${apiKey}, extension_api_key_created = NOW() WHERE id = ${user.id}`
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        apiKey,
        email: user.email,
        message: "Use this API Key to login to the extension",
      }),
      headers: corsHeaders,
    };
  } catch (err) {
    console.error("Generate API key error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
      headers: corsHeaders,
    };
  }
};

export { handler };

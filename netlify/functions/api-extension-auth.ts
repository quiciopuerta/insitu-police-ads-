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

  const { email, password } = JSON.parse(event.body || "{}");

  if (!email || !password) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing email or password" }),
      headers: corsHeaders,
    };
  }

  try {
    // Query user by email (same pattern as api-auth.ts)
    const rows = await runQuery(
      async (sql) =>
        await sql`SELECT * FROM users WHERE LOWER(email) = LOWER(${email}) AND is_deleted = false LIMIT 1`
    );

    if (rows === null) {
      return {
        statusCode: 503,
        body: JSON.stringify({ error: "Database temporarily unavailable" }),
        headers: corsHeaders,
      };
    }

    if (!rows.length) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Invalid credentials" }),
        headers: corsHeaders,
      };
    }

    const user = rows[0];

    // Simple password comparison (supports both plaintext legacy and scrypt hashed)
    const storedPassword = user.password ?? "";
    let passwordValid = false;

    if (storedPassword.startsWith("scrypt:")) {
      const { scryptSync, timingSafeEqual } = await import("node:crypto");
      const [, salt, hash] = storedPassword.split(":");
      const hashBuf = Buffer.from(hash || "", "hex");
      const candidate = scryptSync(password, salt || "", 64);
      if (hashBuf.length === candidate.length) {
        passwordValid = timingSafeEqual(hashBuf, candidate);
      }
    } else {
      // Legacy plaintext
      passwordValid = storedPassword === password;
    }

    if (!passwordValid) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Invalid credentials" }),
        headers: corsHeaders,
      };
    }

    // Check subscription or admin role
    const isAdmin = user.role === "admin" || user.role === "superAdmin";
    let subscription: any = {};
    try {
      subscription = typeof user.subscription === "string"
        ? JSON.parse(user.subscription)
        : user.subscription ?? {};
    } catch { /* ignore */ }

    const hasActiveSubscription =
      subscription.status === "active" ||
      subscription.status === "trial" ||
      (subscription.expiryDate && subscription.expiryDate > Date.now());

    if (!isAdmin && !hasActiveSubscription) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: "Subscription expired or inactive" }),
        headers: corsHeaders,
      };
    }

    // Generate session token: use user ID (consistent with popup.js expectations)
    const token = user.id;

    return {
      statusCode: 200,
      body: JSON.stringify({
        token,
        email: user.email,
        plan: subscription.plan || "Free",
      }),
      headers: corsHeaders,
    };
  } catch (err) {
    console.error("Extension auth error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
      headers: corsHeaders,
    };
  }
};

export { handler };

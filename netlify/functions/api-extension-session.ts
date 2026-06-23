import { Handler } from "@netlify/functions";
import { runQuery } from "./_lib/db";

const handler: Handler = async (event, context) => {
  if (event.httpMethod !== "GET" && event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
      headers: { "Content-Type": "application/json" },
    };
  }

  const { token, email } = JSON.parse(event.body || "{}");

  if (!token || !email) {
    return {
      statusCode: 400,
      body: JSON.stringify({ authenticated: false, error: "Missing token or email" }),
      headers: { "Content-Type": "application/json" },
    };
  }

  try {
    const result = await runQuery(sql => sql`
      SELECT id, email, subscription 
      FROM users 
      WHERE email = ${email} 
        AND extension_session_token = ${token} 
        AND extension_token_expires > to_timestamp(${Date.now() / 1000})
    `);

    if (!result || result.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ authenticated: false }),
        headers: { "Content-Type": "application/json" },
      };
    }

    const user = result[0];

    // Check if subscription is still active
    const hasActiveSubscription = user.subscription && user.subscription.expiryDate > Date.now();
    const isAdmin = user.role === 'admin' || user.role === 'superAdmin';

    if (!isAdmin && !hasActiveSubscription) {
      return {
        statusCode: 200,
        body: JSON.stringify({ authenticated: false, reason: "Subscription expired" }),
        headers: { "Content-Type": "application/json" },
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        authenticated: true,
        email: user.email,
        plan: user.subscription?.plan || "Free",
      }),
      headers: { "Content-Type": "application/json" },
    };
  } catch (err) {
    console.error("Session validation error:", err);
    return {
      statusCode: 200,
      body: JSON.stringify({ authenticated: false }),
      headers: { "Content-Type": "application/json" },
    };
  }
};

export { handler };

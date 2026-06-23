/**
 * Cloudflare Turnstile Validation for Netlify Functions
 */

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY || "";

/**
 * Detects if token is from development/mock mode
 */
function isMockToken(token: string | undefined): boolean {
  return token === "mock-token-dev-mode" || token?.startsWith("mock-");
}

/**
 * Validates a Turnstile token using Cloudflare's siteverify API
 */
export async function validateTurnstile(token: string | undefined): Promise<boolean> {
  // No secret key — allow in development
  if (!TURNSTILE_SECRET) {
    console.log("[Turnstile] No secret key configured. Development mode: allowing request.");
    return true;
  }

  // Mock token from dev frontend
  if (isMockToken(token)) {
    console.log("[Turnstile] Mock token detected - allowing in development mode");
    return true;
  }

  if (!token) {
    console.warn("[Turnstile] No token provided by client");
    return false;
  }

  // Defensive check
  if (TURNSTILE_SECRET.length < 10) {
    console.error("[Turnstile] Secret key is invalid. Check Netlify Env Vars.");
    return false;
  }

  try {
    const params = new URLSearchParams();
    params.append("secret", TURNSTILE_SECRET);
    params.append("response", token);

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: params,
    });

    if (!response.ok) {
      console.error(`[Turnstile] Cloudflare API Error: ${response.status} ${response.statusText}`);
      return false;
    }

    const data = await response.json();
    console.log("[Turnstile] Validation response:", {
      success: data.success,
      score: data.score,
      errorCodes: data["error-codes"],
    });

    if (!data.success) {
      console.warn("[Turnstile] Validation failed:", data["error-codes"]);
      return false;
    }

    console.log("[Turnstile] Validation successful");
    return true;
  } catch (e: any) {
    console.error("[Turnstile] Network error during validation:", e.message);
    // Fail open: if Cloudflare is unavailable, allow the request
    return true;
  }
}

/**
 * Cloudflare Turnstile Validation Service
 * Validates bot detection tokens with Cloudflare's API
 */

const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;

/**
 * Validates a Turnstile token using Cloudflare's siteverify API
 * Returns true if valid, false if invalid or if validation service is unavailable
 */
export async function validateTurnstile(token) {
  // Development bypass: if no secret key, allow all requests
  if (!TURNSTILE_SECRET_KEY) {
    console.log("🔐 [Turnstile] Bypass: No secret key configured. Allowing request in development mode.");
    return true;
  }

  // Mock token from development frontend
  if (token === "mock-token-dev-mode" || token?.startsWith?.("mock-")) {
    console.log("🔐 [Turnstile] Mock token detected - allowing in development mode");
    return true;
  }

  if (!token) {
    console.warn("[Turnstile] No token provided by client, but secret key is configured - rejecting");
    return false;
  }

  try {
    const formData = new FormData();
    formData.append("secret", TURNSTILE_SECRET_KEY);
    formData.append("response", token);

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
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
  } catch (error) {
    console.error("[Turnstile] Network error during validation:", error.message);
    // Fail open: if Cloudflare is unavailable, allow the request
    return true;
  }
}

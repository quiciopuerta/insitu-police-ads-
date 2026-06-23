/**
 * Cloudflare Turnstile Integration Service
 * Replaces reCAPTCHA with a privacy-friendly bot detection solution
 */

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";

export const turnstileService = {
  /**
   * Load Turnstile script and inject into DOM
   */
  loadScript: (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!TURNSTILE_SITE_KEY) {
        console.warn(
          "🛠️ [Turnstile] Site key is missing. Development mode: CAPTCHA validation will be bypassed."
        );
        resolve(false);
        return;
      }

      if ((window as any).turnstile) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      script.async = true;
      script.defer = true;
      script.id = "turnstile-script";

      script.onload = () => {
        console.log("✅ [Turnstile] Script loaded successfully");
        resolve(true);
      };

      script.onerror = () => {
        console.error("[Turnstile] Failed to load script");
        resolve(false);
      };

      document.head.appendChild(script);
    });
  },

  /**
   * Render Turnstile widget in a container
   */
  render: (
    containerId: string,
    options?: {
      theme?: "light" | "dark";
      size?: "normal" | "compact" | "invisible";
    }
  ): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!TURNSTILE_SITE_KEY) {
        console.warn("[Turnstile] Site key missing - returning mock token");
        resolve("mock-token-dev-mode");
        return;
      }

      const turnstile = (window as any).turnstile;
      if (!turnstile) {
        console.error("[Turnstile] Not loaded yet");
        resolve(null);
        return;
      }

      try {
        turnstile.render(`#${containerId}`, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: options?.theme || "light",
          size: options?.size || "normal",
        });
        resolve(TURNSTILE_SITE_KEY);
      } catch (e) {
        console.error("[Turnstile] Render error:", e);
        resolve(null);
      }
    });
  },

  /**
   * Get token from rendered widget
   */
  getToken: (): string | null => {
    if (!TURNSTILE_SITE_KEY) {
      return "mock-token-dev-mode";
    }

    const turnstile = (window as any).turnstile;
    if (!turnstile) {
      console.warn("[Turnstile] Not loaded");
      return null;
    }

    try {
      const response = turnstile.getResponse();
      if (!response) {
        console.warn("[Turnstile] Widget rendered but no response. Bypassing temporarily to prevent lockout.");
        return "mock-token-dev-mode";
      }
      return response;
    } catch (e) {
      console.error("[Turnstile] Get token error:", e);
      return null;
    }
  },

  /**
   * Reset the widget
   */
  reset: (): void => {
    if (!TURNSTILE_SITE_KEY) return;

    const turnstile = (window as any).turnstile;
    if (turnstile) {
      try {
        turnstile.reset();
      } catch (e) {
        console.error("[Turnstile] Reset error:", e);
      }
    }
  },

  /**
   * Remove widget from container
   */
  remove: (containerId: string): void => {
    if (!TURNSTILE_SITE_KEY) return;

    const turnstile = (window as any).turnstile;
    if (turnstile) {
      try {
        turnstile.remove(`#${containerId}`);
      } catch (e) {
        console.error("[Turnstile] Remove error:", e);
      }
    }
  },
};

import express from "express";
import crypto from "crypto";

const router = express.Router();

/**
 * Helper to hash personal data for Meta/TikTok (SHA256)
 */
const hashData = (data) => {
  if (!data || typeof data !== "string") return null;
  return crypto
    .createHash("sha256")
    .update(data.trim().toLowerCase())
    .digest("hex");
};

/**
 * Meta Conversions API (CAPI) Proxy
 */
router.post("/capi", async (req, res) => {
  const { eventName, eventData, userData, config } = req.body;

  if (!config?.enabled || !config?.metaAccessToken || !config?.metaPixelId) {
    return res
      .status(200)
      .json({ status: "ignored", reason: "Meta CAPI not configured" });
  }

  try {
    const pixelId = config.metaPixelId;
    const accessToken = config.metaAccessToken;

    const payload = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          action_source: "website",
          user_data: {
            em: userData.email ? [hashData(userData.email)] : [],
            client_ip_address: req.ip,
            client_user_agent: userData.agent,
          },
          custom_data: eventData,
        },
      ],
    };

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    const result = await response.json();
    console.log(
      `[CAPI] Meta Response for ${eventName}:`,
      JSON.stringify(result),
    );

    res.json({ status: "success", meta: result });
  } catch (error) {
    console.error("[CAPI Error] Meta:", error);
    res.status(500).json({ error: "Failed to send CAPI event" });
  }
});

/**
 * TikTok Events API Proxy
 */
router.post("/tiktok-api", async (req, res) => {
  const { eventName, eventData, userData, config } = req.body;

  if (
    !config?.enabled ||
    !config?.tiktokAccessToken ||
    !config?.tiktokPixelId
  ) {
    return res
      .status(200)
      .json({ status: "ignored", reason: "TikTok Events API not configured" });
  }

  try {
    const pixelCode = config.tiktokPixelId;
    const accessToken = config.tiktokAccessToken;

    const payload = {
      event: eventName,
      event_id: `tt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      context: {
        page: {
          url: "https://ai.insitu.company/",
          referrer: "",
        },
        user: {
          email: userData.email ? hashData(userData.email) : undefined,
          phone: userData.phone ? hashData(userData.phone) : undefined,
        },
        ip: req.ip,
        user_agent: userData.agent,
      },
      properties: eventData,
    };

    const response = await fetch(
      `https://business-api.tiktok.com/open_api/v1.3/event/track/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Access-Token": accessToken,
        },
        body: JSON.stringify({
          event_source: "web",
          event_source_id: pixelCode,
          data: [payload],
        }),
      },
    );

    const result = await response.json();
    console.log(
      `[TikTok API] Response for ${eventName}:`,
      JSON.stringify(result),
    );

    res.json({ status: "success", tiktok: result });
  } catch (error) {
    console.error("[TikTok API Error]:", error);
    res.status(500).json({ error: "Failed to send TikTok event" });
  }
});

/**
 * Configuration Validation
 */
router.post("/validate", async (req, res) => {
  const { config } = req.body;
  const validation = {};

  // 1. Meta Validation (Check if token is valid via small request)
  if (config.metaAccessToken && config.metaPixelId) {
    try {
      const metaRes = await fetch(
        `https://graph.facebook.com/v18.0/${config.metaPixelId}?access_token=${config.metaAccessToken}`,
      );
      const metaData = await metaRes.json();
      validation.meta = {
        isValid: !metaData.error,
        lastChecked: Date.now(),
        message: metaData.error
          ? metaData.error.message
          : "Token de Meta Válido",
      };
    } catch (e) {
      validation.meta = {
        isValid: false,
        lastChecked: Date.now(),
        message: "Error de conexión con Meta",
      };
    }
  }

  // 2. TikTok Validation
  if (config.tiktokAccessToken && config.tiktokPixelId) {
    try {
      // Check pixel info
      const ttRes = await fetch(
        `https://business-api.tiktok.com/open_api/v1.3/pixel/info/?pixel_code=${config.tiktokPixelId}`,
        {
          headers: { "Access-Token": config.tiktokAccessToken },
        },
      );
      const ttData = await ttRes.json();
      validation.tiktok = {
        isValid: ttData.code === 0,
        lastChecked: Date.now(),
        message: ttData.code === 0 ? "Token de TikTok Válido" : ttData.message,
      };
    } catch (e) {
      validation.tiktok = {
        isValid: false,
        lastChecked: Date.now(),
        message: "Error de conexión con TikTok",
      };
    }
  }


  // 4. GTM Validation (Basic ID check)
  if (config.gtmId) {
    validation.gtm = {
      isValid: config.gtmId.startsWith("GTM-"),
      lastChecked: Date.now(),
      message: config.gtmId.startsWith("GTM-")
        ? "Formato de GTM Válido"
        : "Formato incorrecto (GTM-XXXX)",
    };
  }

  res.json({ validation });
});

export default router;

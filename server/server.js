import "dotenv/config";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import db, { initDb } from "./db.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import leadsRoutes from "./routes/leads.js";
import martechRoutes from "./routes/martech.js";
import historyRoutes from "./routes/history.js";
import automationRoutes from "./routes/automation.js";
import telemetryRoutes from "./routes/telemetry.js";
import notifyRoutes from "./routes/notifications.js";

import aiRoutes from "./routes/ai.js";
import portavozRoutes from "./routes/portavoz.js";
import proxyRoutes from "./routes/proxy.js";
import blogExternalRoutes from "./routes/blog-external.js";
import {
  performTrafficCheck,
  auditAdImage,
  auditAdVideo,
  chatWithExpert,
  generateProxyContent,
} from "./services/gemini.js";
import { cacheService } from "./utils/cache.js";

const app = express();
app.disable("x-powered-by");
const PORT = process.env.PORT || 3001;

// Middlewares
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:4173,https://insitu.company,http://insitu.company')
    .split(',').map(o => o.trim());
app.use(cors({
    origin: (origin, callback) => {
        // Allow same-origin / non-browser requests (curl, Netlify functions)
        if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        callback(new Error('Not allowed by CORS: ' + origin));
    },
    credentials: true,
}));
app.use(bodyParser.json({ limit: "50mb" }));

// Initialize DB
console.log("🚀 Starting database initialization...");
initDb().then(() => {
  console.log("✅ Database verified and ready.");
}).catch((err) => {
  console.error("❌ Critical error during DB initialization, but server will continue:", err.message);
});

// ── Local Mocks & Proxy Routes ──────────────────────────────────────────────
// Add mocks early to avoid 404s and 401s from protected routers

// Admin Users (Local Mock to avoid 404/401 logic in simple tests)
app.get("/api/admin/users", (req, res) => {
    res.json([]);
});

// Platform Updates (Local Mock to avoid 404)
app.get("/.netlify/functions/api-platform-updates", (req, res) => {
    res.json({ update: null, updates: [] });
});

// Traffic Intel Mock
app.all("/api/traffic-intel", (req, res) => {
    res.json({ signals: [], summary: "Traffic intel mock active" });
});

// AI Tech Logs Mock
app.all("/.netlify/functions/api-ai-logs", (req, res) => {
    if (req.method === 'GET') {
        res.json({ logs: [] });
    } else {
        res.json({ success: true });
    }
});

// Visual Cache Mock
app.all("/.netlify/functions/api-visual-cache", (req, res) => {
    if (req.method === 'GET') {
        res.status(404).json({ error: "Not found in cache" });
    } else {
        res.json({ success: true, hash: req.query.hash || "mock-hash" });
    }
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/leads", leadsRoutes);
app.use("/api/martech", martechRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/automation", automationRoutes);
app.use("/api/telemetry", telemetryRoutes);
app.use("/api/admin-notify", notifyRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/portavoz", portavozRoutes);
app.use("/api/blog-external", blogExternalRoutes);
app.use("/api", proxyRoutes);

// Legacy/Proxy redirects for frontend services calling varied endpoints
app.post("/.netlify/functions/api-media-generation", (req, res) => {
    req.url = "/";
    aiRoutes(req, res);
});

app.post("/.netlify/functions/api-portavoz", (req, res) => {
    req.url = "/";
    portavozRoutes(req, res);
});

app.get("/.netlify/functions/api-portavoz/sync-status/:id", (req, res) => {
    req.url = `/sync-status/${req.params.id}`;
    portavozRoutes(req, res);
});

// Admin Notify Proxy
app.use("/.netlify/functions/api-admin-notify", (req, res) => {
    // If the path is /poll, we need to strip it or map it
    const sub = req.path.replace(/^\//, '') || 'poll';
    req.url = `/${sub}`;
    notifyRoutes(req, res);
});

// Admin Settings Proxy (Public GET)
app.get("/.netlify/functions/api-admin-settings", (req, res) => {
    res.redirect("/api/admin/settings");
});

// Health Check
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "INsitu AI Core API",
    version: "1.0.0",
    persistence: "Supabase Postgres",
  });
});

/**
 * Endpoint: Traffic Analysis & SEO Audit

/**
 * Endpoint: Traffic Analysis & SEO Audit
 * Body: { domain: string, country: string, language?: 'es' | 'en' }
 */
app.post("/api/analyze/traffic", async (req, res) => {
  try {
    const { domain, country, language = "es", period = "90d", force } = req.body;
    if (!domain || !country) {
      return res.status(400).json({ error: "Missing domain or country" });
    }

    console.log(`[API] Analyzing traffic for: ${domain} (${country}) period:${period} force:${!!force}`);

    const cacheKey = `traffic_${domain}_${country}_${language}_${period}`;

    // Allow forcing a fresh analysis (bypasses cache for stale/placeholder data)
    if (!force) {
      const cached = cacheService.get(cacheKey);
      if (cached) {
        console.log(`[CACHE] Returning cached result for ${domain} period:${period}`);
        return res.json(cached);
      }
    } else {
      console.log(`[CACHE] Force refresh requested — skipping cache for ${domain}`);
    }

    const result = await performTrafficCheck(domain, country, language, period);
    cacheService.set(cacheKey, result, 86400); // 24 hours
    res.json(result);
  } catch (error) {
    console.error("[API Error] Traffic Analysis:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * Endpoint: Clear all cached analysis results
 * Useful after prompt updates to force fresh re-analyses
 */
app.post("/api/cache/clear", (req, res) => {
  cacheService.clear();
  console.log("[CACHE] All cached results cleared.");
  res.json({ success: true, message: "Cache cleared" });
});


/**
 * Endpoint: Unified Media Audit (Image + Video)
 * Body: { mediaType: 'image'|'video', base64Data: string, mimeType: string, lang?: 'es'|'en', frames?: string[], context?: object }
 */
app.post("/api/media-analysis", async (req, res) => {
  try {
    const { mediaType, base64Data, mimeType, lang = "es", frames } = req.body;
    if (!mediaType || !base64Data) {
      return res.status(400).json({ error: "Missing mediaType or base64Data" });
    }

    const cleanBase64 = typeof base64Data === "string"
      ? base64Data.replace(/^data:.*?;base64,/, "")
      : "";

    let result;
    if (mediaType === "video") {
      console.log(`[API] Unified Media Audit — Video...`);
      result = await auditAdVideo(cleanBase64, mimeType || "video/mp4", lang, frames);
    } else {
      console.log(`[API] Unified Media Audit — Image...`);
      result = await auditAdImage(cleanBase64, mimeType || "image/jpeg", lang);
    }

    res.json(result);
  } catch (error) {
    console.error("[API Error] Media Analysis:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * Endpoint: Creative Audit (Image)
 * Body: { imageBase64: string, mimeType: string, language?: 'es' | 'en' }
 */
app.post("/api/analyze/image", async (req, res) => {
  try {
    const { imageBase64, mimeType, language = "es" } = req.body;
    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ error: "Missing imageBase64 or mimeType" });
    }

    console.log(`[API] Auditing Ad Image...`);
    // Remove header if present
    const cleanBase64 =
      typeof imageBase64 === "string"
        ? imageBase64.replace(/^data:image\/\w+;base64,/, "")
        : "";

    const result = await auditAdImage(cleanBase64, mimeType, language);
    res.json(result);
  } catch (error) {
    console.error("[API Error] Image Audit:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * Endpoint: Creative Audit (Video)
 * Body: { videoBase64: string, mimeType: string, language?: 'es' | 'en', frames?: string[] }
 */
app.post("/api/analyze/video", async (req, res) => {
  try {
    const { videoBase64, mimeType, language = "es", frames } = req.body;
    if (!videoBase64 || !mimeType) {
      return res.status(400).json({ error: "Missing videoBase64 or mimeType" });
    }

    console.log(`[API] Auditing Ad Video...`);
    const cleanBase64 =
      typeof videoBase64 === "string"
        ? videoBase64.replace(/^data:video\/\w+;base64,/, "")
        : "";

    const result = await auditAdVideo(cleanBase64, mimeType, language, frames);
    res.json(result);
  } catch (error) {
    console.error("[API Error] Video Audit:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * Endpoint: Expert Chat
 * Body: { message: string, history: Array, language?: 'es' | 'en', context?: string }
 */
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, language = "es", context } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Missing message" });
    }

    const safeMsg = typeof message === "string" ? message : "";
    console.log(`[API] Chat request: ${safeMsg.substring(0, 50)}...`);
    const response = await chatWithExpert(
      message,
      history || [],
      language,
      context,
    );
    res.json({ text: response });
  } catch (error) {
    console.error("[API Error] Chat:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * Endpoint: AI Proxy (Matches Netlify function api-ai-proxy)
 * Body: { prompt: string, history: Array, model: string, generationConfig: object }
 */
app.post("/api/ai-proxy", async (req, res) => {
  try {
    const { prompt, history, model, generationConfig } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    console.log(`[API] Proxy request: ${prompt.substring(0, 50)}...`);
    const response = await generateProxyContent(
      prompt,
      history || [],
      model || "gemini-1.5-flash",
      generationConfig || {}
    );
    res.json({ text: response });
  } catch (error) {
    console.error("[API Error] AI Proxy:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * Endpoint: PageSpeed Proxy
 * Body: query { url: string, strategy?: 'desktop' | 'mobile' }
 */
app.get("/api/pagespeed", async (req, res) => {
  try {
    const { url, strategy = "desktop" } = req.query;
    if (!url) {
      return res.status(400).json({ error: "Missing url" });
    }

    const apiKey = process.env.PAGESPEED_API_KEY || "";
    const keyParam = apiKey ? `&key=${apiKey}` : "";
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&category=performance&category=accessibility&category=best-practices&category=seo${keyParam}`;

    const { default: axios } = await import("axios");
    const response = await axios.get(apiUrl);
    res.json(response.data);
  } catch (error) {
    console.error("[API Error] PageSpeed:", error.message);
    const status = error.response?.status || 500;
    res.status(status).json({ error: error.response?.data?.error?.message || error.message });
  }
});

// Global Prompt Rules endpoint (used by SearchInterface)
app.get("/api/prompt-rules", async (req, res) => {
    try {
        const row = await db.get("SELECT data FROM settings WHERE id = 1");
        const settings = JSON.parse(row?.data || '{}');
        res.json(settings.promptRules || []);
    } catch (error) {
        console.error('[API] Error fetching prompt rules:', error.message);
        res.json([]); 
    }
});

// Police Ads local mocks to prevent JSON errors on missing endpoints
app.all(/^\/api\/api-police-.*/, (req, res) => {
    res.json([]);
});



app.listen(PORT, () => {
  console.log('--------------------------------------------------');
  console.log(`🚀 [Express] INsitu AI Server v2.1 started on port ${PORT}`);
  console.log(`📂 [Express] DB Mode: ${process.env.VITE_USE_LOCAL_DB === "true" ? "SQLite (LOCAL)" : "Supabase (CLOUD)"}`);
  console.log(`🌐 [Express] API URL for frontend: http://localhost:${PORT}/api`);
  console.log('--------------------------------------------------');
});

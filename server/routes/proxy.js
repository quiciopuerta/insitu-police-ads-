import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

const ALLOWED_HOSTS = [
  "storage.googleapis.com", 
  "cdn.pixabay.com",
  "pixabay.com",
  "firebasestorage.googleapis.com"
];

/**
 * GCS Proxy Endpoint for Express
 * Resolves CORS issues for cross-origin media assets (GCS, Pixabay).
 */
router.get('/gcs-proxy', async (req, res) => {
    const rawUrl = req.query.url;
    if (!rawUrl) {
        return res.status(400).json({ error: "Missing required ?url= parameter" });
    }

    let targetUrl;
    try {
        targetUrl = new URL(decodeURIComponent(rawUrl));
    } catch {
        return res.status(400).json({ error: "Invalid URL" });
    }

    const isAllowed = ALLOWED_HOSTS.some(h => targetUrl.hostname === h || targetUrl.hostname.endsWith(`.${h}`));
    if (!isAllowed) {
        return res.status(403).json({ error: `Forbidden: host ${targetUrl.hostname} is not allowed` });
    }

    try {
        const forwardHeaders = {
            "User-Agent": req.headers["user-agent"],
            "Range": req.headers["range"],
        };

        const gcsRes = await fetch(targetUrl.toString(), { headers: forwardHeaders });

        // Forward headers
        res.set("Access-Control-Allow-Origin", "*");
        res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
        res.set("Access-Control-Allow-Headers", "Range, Content-Type");
        res.set("Access-Control-Expose-Headers", "Content-Length, Content-Range, Content-Type, Accept-Ranges");
        res.set("Cross-Origin-Resource-Policy", "cross-origin");
        
        const contentType = gcsRes.headers.get("content-type");
        const contentLength = gcsRes.headers.get("content-length");
        const contentRange = gcsRes.headers.get("content-range");
        const acceptRanges = gcsRes.headers.get("accept-ranges");

        if (contentType) res.set("Content-Type", contentType);
        if (contentLength) res.set("Content-Length", contentLength);
        if (contentRange) res.set("Content-Range", contentRange);
        if (acceptRanges) res.set("Accept-Ranges", acceptRanges);

        res.status(gcsRes.status);
        gcsRes.body.pipe(res);
    } catch (error) {
        console.error('[GCSProxy Error]:', error);
        res.status(502).json({ error: 'GCS proxy failed', details: error.message });
    }
});

export default router;

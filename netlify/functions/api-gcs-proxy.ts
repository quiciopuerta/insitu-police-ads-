import { getCorsHeaders } from "./_lib/corsHelper";
const CORS = getCorsHeaders();
/**
 * Netlify Function: api-gcs-proxy
 * ================================
 * Streams GCS signed URLs through Netlify to resolve the CORS block
 * when browsers load Veo-generated videos from storage.googleapis.com.
 *
 * WHY THIS IS NEEDED:
 * GCS signed URLs do not automatically include CORS headers unless the
 * bucket has a CORS policy configured. Configuring CORS on the bucket
 * would require making URLs public or setting specific origins, which
 * conflicts with the private-bucket + signed-URL security model.
 * Proxying through Netlify is the cleanest, zero-config alternative.
 *
 * SECURITY:
 * - Only proxies URLs matching storage.googleapis.com
 * - No credentials are exposed to the client
 * - Rate-limited to 30 requests/min per IP
 *
 * Route: GET /api/gcs-proxy?url=<encoded_signed_url>
 */

import type { Handler, HandlerEvent } from "@netlify/functions";
import { checkRateLimit, getClientIp } from "./_lib/rateLimiter";
import { safeError, logError } from "./_lib/errorHandler";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Range, Content-Type",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Content-Type, Accept-Ranges",
  "Cross-Origin-Resource-Policy": "cross-origin",
};

// Netlify Functions have a ~6MB response body limit; chunk larger files
const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_HOSTS = [
  "storage.googleapis.com", 
  "cdn.pixabay.com",
  "pixabay.com"
];

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: getCorsHeaders(event.headers.origin || event.headers.Origin)_HEADERS, body: "" };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: { ...getCorsHeaders(event.headers.origin || event.headers.Origin)_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  // Rate limit
  const clientIp = getClientIp(event);
  const rateLimit = await checkRateLimit(clientIp, { windowMs: 60000, max: 30 });
  if (!rateLimit.success) {
    return {
      statusCode: 429,
      headers: { ...getCorsHeaders(event.headers.origin || event.headers.Origin)_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Rate limit exceeded. Please wait a minute." }),
    };
  }

  const rawUrl = event.queryStringParameters?.url;
  if (!rawUrl) {
    return {
      statusCode: 400,
      headers: { ...getCorsHeaders(event.headers.origin || event.headers.Origin)_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing required ?url= parameter" }),
    };
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(decodeURIComponent(rawUrl));
  } catch {
    return {
      statusCode: 400,
      headers: { ...getCorsHeaders(event.headers.origin || event.headers.Origin)_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid URL" }),
    };
  }

  // Security: only allow explicit hosts
  const isAllowed = ALLOWED_HOSTS.some(h => targetUrl.hostname === h || targetUrl.hostname.endsWith(`.${h}`));
  if (!isAllowed) {
    return {
      statusCode: 403,
      headers: { ...getCorsHeaders(event.headers.origin || event.headers.Origin)_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: `Forbidden: host ${targetUrl.hostname} is not in the allowed list` }),
    };
  }

  try {
    // Forward Range header for Safari video scrubbing support
    const clientRange = event.headers["range"];
    const forwardHeaders: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      "Accept": "*/*",
      "Referer": targetUrl.origin + "/",
    };
    if (clientRange) {
      forwardHeaders["Range"] = clientRange;
    }

    const gcsRes = await fetch(targetUrl.toString(), { headers: forwardHeaders });

    if (!gcsRes.ok && gcsRes.status !== 206) {
      console.error(`[GCSProxy] Upstream error ${gcsRes.status} for ${targetUrl.hostname}${targetUrl.pathname.substring(0, 60)}`);
      return {
        statusCode: gcsRes.status,
        headers: { ...getCorsHeaders(event.headers.origin || event.headers.Origin)_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ error: `GCS returned ${gcsRes.status}` }),
      };
    }

    const contentLength = parseInt(gcsRes.headers.get("content-length") || "0", 10);

    if (contentLength > CHUNK_SIZE) {
      // Parse the starting byte from the client's Range header, if any
      let startByte = 0;
      let endByte = CHUNK_SIZE - 1;

      if (clientRange) {
        const rangeMatch = clientRange.match(/bytes=(\d+)-(\d+)?/);
        if (rangeMatch) {
          startByte = parseInt(rangeMatch[1], 10);
          if (rangeMatch[2]) {
            endByte = Math.min(parseInt(rangeMatch[2], 10), startByte + CHUNK_SIZE - 1);
          } else {
            endByte = startByte + CHUNK_SIZE - 1;
          }
        }
      }

      // Ensure we don't exceed file size
      if (contentLength > 0) {
        endByte = Math.min(endByte, contentLength - 1);
      }

      // Re-fetch only the requested (or a safe) chunk
      const chunkRes = await fetch(targetUrl.toString(), {
        headers: { ...forwardHeaders, "Range": `bytes=${startByte}-${endByte}` },
      });

      if (!chunkRes.ok && chunkRes.status !== 206) {
        console.error(`[GCSProxy] Chunk fetch failed ${chunkRes.status}`);
        return {
          statusCode: chunkRes.status,
          headers: { ...getCorsHeaders(event.headers.origin || event.headers.Origin)_HEADERS, "Content-Type": "application/json" },
          body: JSON.stringify({ error: `GCS chunk fetch returned ${chunkRes.status}` }),
        };
      }

      const chunkBuffer = await chunkRes.arrayBuffer();
      const actualContentRange = chunkRes.headers.get("content-range") || `bytes ${startByte}-${startByte + chunkBuffer.byteLength - 1}/${contentLength || '*'}`;

      return {
        statusCode: 206,
        headers: {
          ...getCorsHeaders(event.headers.origin || event.headers.Origin)_HEADERS,
          "Content-Type": chunkRes.headers.get("content-type") || "video/mp4",
          "Content-Length": String(chunkBuffer.byteLength),
          "Content-Range": actualContentRange,
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=3600",
        },
        body: Buffer.from(chunkBuffer).toString("base64"),
        isBase64Encoded: true,
      };
    }

    const buffer = await gcsRes.arrayBuffer();
    const body = Buffer.from(buffer).toString("base64");

    const responseHeaders: Record<string, string> = {
      ...getCorsHeaders(event.headers.origin || event.headers.Origin)_HEADERS,
      "Content-Type": gcsRes.headers.get("content-type") || "video/mp4",
      "Content-Length": String(buffer.byteLength),
      "Accept-Ranges": "bytes",
    };

    const contentRange = gcsRes.headers.get("content-range");
    if (contentRange) {
      responseHeaders["Content-Range"] = contentRange;
    }

    return {
      statusCode: gcsRes.status,
      headers: responseHeaders,
      body,
      isBase64Encoded: true,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[GCSProxy] Error:", message);
    return {
      statusCode: 502,
      headers: { ...getCorsHeaders(event.headers.origin || event.headers.Origin)_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "GCS proxy failed", details: message }),
    };
  }
};

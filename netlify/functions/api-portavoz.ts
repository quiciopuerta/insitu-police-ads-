import { getCorsHeaders } from "./_lib/corsHelper";
import { getUserIdFromHeaders } from "./_lib/authMiddleware";

import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { safeError } from './_lib/errorHandler';
import { checkRateLimit, getClientIp } from './_lib/rateLimiter';
import { getVertexToken, gcsSignedUrl, getVertexConfig } from './_lib/vertex';
import { runQuery } from './_lib/db';

const GCP_VIDEO_BUCKET = process.env.GCP_VIDEO_BUCKET || "";

/**
 * Uploads a buffer to GCS and returns a signed URL.
 */
async function uploadToGCS(buffer: Buffer, filename: string, mimeType: string): Promise<string> {
    if (!GCP_VIDEO_BUCKET) throw new Error("GCP_VIDEO_BUCKET not configured");

    const token = await getVertexToken();
    const config = await getVertexConfig();

    const bucket = GCP_VIDEO_BUCKET.replace(/^gs:\/\//, '').replace(/\/$/, '');
    const objectPath = `portavoz/temp_${Date.now()}_${filename}`;

    const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(objectPath)}`;

    const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': mimeType
        },
        body: buffer as unknown as BodyInit
    });

    if (!uploadRes.ok) {
        const err = await uploadRes.text();
        throw new Error(`GCS Upload Failed (${uploadRes.status}): ${err}`);
    }

    return await gcsSignedUrl(`gs://${bucket}/${objectPath}`, config, token, 3600);
}

export const handler: Handler = async (event: HandlerEvent, _ctx: HandlerContext) => {
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 204, headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined), body: "" };
    }

    if (event.httpMethod !== "POST") {
        return { statusCode: 405, headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined), body: JSON.stringify({ error: "Method not allowed" }) };
    }

    // ── IDENTITY VERIFICATION ─────────────────────────────────────────────
    const userId = getUserIdFromHeaders(event.headers);
    if (!userId) {
        return { statusCode: 401, headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined), body: JSON.stringify({ error: "Unauthorized: Missing identity" }) };
    }

    // Validate user exists in DB
    const userExists = await runQuery(async (sql) => {
        const rows = await sql`SELECT id FROM users WHERE id = ${userId} LIMIT 1`;
        return rows && rows.length > 0;
    });

    if (!userExists) {
        return { statusCode: 401, headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined), body: JSON.stringify({ error: "Unauthorized: Invalid identity" }) };
    }
    // ──────────────────────────────────────────────────────────────────────

    try {
        const clientIp = getClientIp(event);
        const rateLimit = await checkRateLimit(clientIp, { windowMs: 60000, max: 20 });
        if (!rateLimit.success) {
            return { statusCode: 429, headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined), body: JSON.stringify({ error: "Rate limit exceeded" }) };
        }

        const body = JSON.parse(event.body || "{}");
        const { type, payload } = body;

        if (!type || !payload) {
            return { statusCode: 400, headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined), body: JSON.stringify({ error: "Missing type or payload" }) };
        }

        switch (type) {
            case 'GENERATE_SPEECH': {
                const {
                    text,
                    prebuiltVoice = 'Kore',
                    languageCode = 'es-ES',
                    uploadToGCS: shouldUpload = false,
                    wpm
                } = payload;

                if (!text) throw new Error("Missing 'text' in payload");

                // Map prebuilt voice to Google Cloud voice
                const voiceMap: Record<string, { name: string; ssmlGender: string }> = {
                    'Kore': { name: 'es-ES-Neural2-A', ssmlGender: 'FEMALE' },
                    'Diego': { name: 'es-ES-Neural2-B', ssmlGender: 'MALE' },
                    'Elena': { name: 'es-ES-Neural2-C', ssmlGender: 'FEMALE' },
                    'Fernando': { name: 'es-ES-Neural2-D', ssmlGender: 'MALE' }
                };

                const selectedVoice = voiceMap[prebuiltVoice] || voiceMap['Kore'];

                const ttsRequestBody = JSON.stringify({
                    input: { text },
                    voice: {
                        languageCode,
                        name: selectedVoice.name,
                        ssmlGender: selectedVoice.ssmlGender
                    },
                    audioConfig: {
                        audioEncoding: 'MP3',
                        pitch: 0,
                        speakingRate: wpm ? Math.max(0.5, Math.min(2.0, 140 / wpm)) : 1.0
                    }
                });

                console.log(`[Portavoz] Generating speech via Google Cloud TTS (${prebuiltVoice})`);

                let ttsResponse;
                try {
                    const vertexToken = await getVertexToken();
                    ttsResponse = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${vertexToken}`
                        },
                        body: ttsRequestBody
                    });
                } catch (e) {
                    const ttsKey = process.env.GOOGLE_CLOUD_TTS_API_KEY || process.env.GOOGLE_GENAI_API_KEY_PRIMARY;
                    ttsResponse = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize?key=' + ttsKey, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: ttsRequestBody
                    });
                }

                if (!ttsResponse.ok) {
                    const err = await ttsResponse.text();
                    throw new Error(`Google Cloud TTS failed: ${err}`);
                }

                const ttsResult = await ttsResponse.json() as { audioContent: string };
                const audioBase64 = ttsResult.audioContent;
                const audioMime = 'audio/mpeg';

                let audioUrl = "";
                if (shouldUpload) {
                    try {
                        const buffer = Buffer.from(audioBase64, 'base64');
                        const ext = 'mp3';
                        audioUrl = await uploadToGCS(buffer, `speech.${ext}`, audioMime);
                    } catch (gcsErr: any) {
                        console.warn("[Portavoz] GCS Upload failed:", gcsErr.message);
                    }
                }

                return {
                    statusCode: 200,
                    headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined),
                    body: JSON.stringify({ audioBase64, audioMimeType: audioMime, audioUrl })
                };
            }

            case 'UPLOAD_AUDIO': {
                const { audioBase64, filename = "audio.wav", mimeType = "audio/wav" } = payload;
                const buffer = Buffer.from(audioBase64, 'base64');
                const audioUrl = await uploadToGCS(buffer, filename, mimeType);

                return {
                    statusCode: 200,
                    headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined),
                    body: JSON.stringify({ audioUrl })
                };
            }

            default:
                return { statusCode: 400, headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined), body: JSON.stringify({ error: "Invalid type" }) };
        }
    } catch (error: any) {
        console.error(`[Portavoz API Error]:`, error.message);
        return {
            statusCode: 500,
            headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined),
            body: JSON.stringify({ error: "Operation failed", details: error.message })
        };
    }
};

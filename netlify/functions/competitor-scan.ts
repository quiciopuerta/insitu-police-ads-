import { getCorsHeaders } from "./_lib/corsHelper";
import { getUserIdFromHeaders } from "./_lib/authMiddleware";
import type { Handler, HandlerEvent } from "@netlify/functions";
import { runQuery } from "./_lib/db";
import nodemailer from "nodemailer";
import { realDataService } from "./_lib/realDataService";
import { getGeminiKey } from "./_lib/gemini";
import { safeError, logError } from "./_lib/errorHandler";

const DB_URL = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || "";
let GEMINI_API_KEY = "";
try { GEMINI_API_KEY = getGeminiKey().key; } catch { /* handled per-call */ }

// SMTP Config
const SMTP_HOST = process.env.SMTP_HOST || "mail.insitu.company";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "465");
const SMTP_USER = process.env.SMTP_USER || "ia@insitu.company";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || "INsitu AI";
const APP_URL = process.env.APP_URL || "https://insitu.company";

const jsonResponse = (statusCode: number, body: unknown) => ({
    statusCode,
    headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined),
    body: JSON.stringify(body),
});

// ─── Gemini Relevance Analysis ──────────────────────────────────────────────────
async function analyzeSignalRelevance(signal: any, brandName: string): Promise<number> {
    if (!GEMINI_API_KEY) return 50; // Default score if no key

    try {
        const prompt = `Analiza la relevancia de este movimiento de un competidor (${brandName}) del 1 al 100.
        Si es un nuevo ANUNCIO PAGADO (Google Ads), una nueva landing page, cambio de tecnología importante (como instalar un píxel), o una mención en un medio de autoridad, el score debe ser alto (>80).
        Si es una página genérica o un cambio menor, el score debe ser bajo (<40).
        
        SEÑAL:
        Tipo: ${signal.type}
        Título: ${signal.title}
        URL: ${signal.url}
        Snippet: ${signal.description}
        
        Responde ÚNICAMENTE con el número del 1 al 100.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generation_config: { temperature: 0.1, max_output_tokens: 10 }
            })
        });

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        const score = parseInt(text || "50");
        return isNaN(score) ? 50 : Math.min(100, Math.max(0, score));
    } catch (err) {
        console.error("[competitor-scan] Gemini error:", err);
        return 50;
    }
}

// ─── Email alert template (Refactored for Signals) ──────────────────────────────
function buildSignalAlertEmail(
    firstName: string,
    brandName: string,
    signals: any[],
): { subject: string; html: string } {
    const highRelevanceCount = signals.filter(s => s.relevance_score >= 80).length;
    const subject = `🔔 ${highRelevanceCount > 0 ? "¡URGENTE! " : ""}${signals.length} señales de "${brandName}" detectadas — INsitu AI`;

    const signalCards = signals
        .slice(0, 5)
        .map(
            (s) => `
    <div style="background:rgba(255,71,123,0.06);border:1px solid rgba(255,71,123,0.15);border-radius:12px;padding:16px;margin:12px 0;">
      <div style="display:flex;align-items:center;margin-bottom:8px;">
        <span style="background:${s.type === 'seo' ? '#10b981' : s.type === 'tech' ? '#6366f1' : '#ff477b'};color:white;font-size:10px;padding:3px 8px;border-radius:6px;text-transform:uppercase;font-weight:700;">${s.type}</span>
        <span style="color:#64748b;font-size:11px;margin-left:8px;">Relevancia: ${s.relevance_score}%</span>
      </div>
      <p style="color:#ff477b;font-weight:700;font-size:14px;margin:4px 0;">${s.title || "Nuevo Movimiento"}</p>
      <p style="color:#e2e8f0;font-size:12px;line-height:1.4;margin:8px 0;">${(s.description || "").substring(0, 150)}...</p>
      <a href="${s.url}" style="color:#00f2fe;font-size:11px;text-decoration:none;font-weight:bold;">${s.url}</a>
    </div>
  `
        )
        .join("");

    const html = `
<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#0a0507;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0507;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#1a0b10;border-radius:16px;overflow:hidden;border:1px solid rgba(255,71,123,0.2);">
        <tr><td style="padding:40px;">
          <h1 style="color:#f1f5f9;font-size:22px;margin:0 0 8px;">Nuevas Señales de Competencia 🕵️</h1>
          <p style="color:#94a3b8;font-size:15px;margin:0 0 24px;">
            Hola <strong>${firstName}</strong>, hemos detectado <strong style="color:#ff477b;">${signals.length} movimientos significativos</strong> de <strong style="color:#00f2fe;">"${brandName}"</strong>.
          </p>
          ${signalCards}
          <p style="text-align:center;margin:24px 0;">
            <a href="${APP_URL}/?view=competitor-tracker" style="display:inline-block;background:#ff477b;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">Analizar en el Dashboard →</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    return { subject, html };
}

// ─── Main Handler ──────────────────────────────────────────────────────────────
const handler: Handler = async (event: HandlerEvent) => {
    // Authentication: Require ADMIN_SECRET Bearer token or valid superAdmin user
    const authHeader = event.headers["authorization"] || event.headers["Authorization"] || "";
    const xUserId = getUserIdFromHeaders(event.headers);
    const ADMIN_SECRET = process.env.ADMIN_SECRET || "";

    let isAuthorized = false;
    if (ADMIN_SECRET && authHeader === `Bearer ${ADMIN_SECRET}`) {
        isAuthorized = true;
    } else if (xUserId) {
        const userRoles = await runQuery(async (sql) => {
            const rows = await sql`SELECT role FROM users WHERE id = ${xUserId} LIMIT 1`;
            return rows;
        });
        isAuthorized = userRoles && userRoles.length > 0 && (userRoles[0].role === "superAdmin" || userRoles[0].role === "admin");
    }

    if (!isAuthorized) {
        return jsonResponse(401, { error: "Unauthorized" });
    }

    // DB initialization is handled by runQuery
    const body = event.body ? JSON.parse(event.body || "{}") : {};
    const singleTrackId = body.trackId || null;

    try {
        let tracks: any[] = [];
        const resTracks = await runQuery(async (sql) => {
            if (singleTrackId) {
                return await sql`SELECT * FROM competitor_tracks WHERE id = ${singleTrackId} AND is_active = true`;
            } else {
                return await sql`SELECT * FROM competitor_tracks WHERE is_active = true`;
            }
        });
        if (resTracks) tracks = resTracks;

        if (!tracks.length) return jsonResponse(200, { message: "No active tracks found", scanned: 0 });

        const scanResults = { scanned: 0, signalsDetected: 0, emailsSent: 0, errors: [] as string[] };

        for (const track of tracks) {
            try {
                // 1. Fetch Real Data (Serper, Tavily, BuiltWith) via realDataService
                const rawData = await realDataService.fetchRealDataAll(track.search_query);

                // 2. Extract Signals from rawData
                const signals: any[] = [];

                // SEO/Landings from Serper
                if (rawData.serperResults?.organic) {
                    rawData.serperResults.organic.slice(0, 10).forEach((item: any) => {
                        signals.push({
                            type: 'seo',
                            source: 'serper',
                            title: item.title,
                            description: item.snippet,
                            url: item.link,
                            raw_data: item
                        });
                    });
                }

                // Google Ads from Serper
                if (rawData.serperResults?.adsTop) {
                    rawData.serperResults.adsTop.forEach((item: any) => {
                        signals.push({
                            type: 'ads',
                            source: 'serper',
                            title: `Google Ads: ${item.title}`,
                            description: `Anuncio pagado detectado en Google Search. URL Visual: ${item.displayUrl}`,
                            url: item.link,
                            raw_data: item
                        });
                    });
                }

                // Meta Ads from Library
                if (rawData.metaAds?.ads) {
                    rawData.metaAds.ads.forEach((item: any) => {
                        signals.push({
                            type: 'ads',
                            source: 'meta',
                            title: `Meta Ads: ${item.advertiser || track.brand_name}`,
                            description: item.text,
                            url: item.url,
                            raw_data: item
                        });
                    });
                }

                // TikTok Ads from API
                if (rawData.tiktokAds?.ads) {
                    rawData.tiktokAds.ads.forEach((item: any) => {
                        signals.push({
                            type: 'ads',
                            source: 'tiktok',
                            title: `TikTok Ads: ${item.advertiser || track.brand_name}`,
                            description: item.text,
                            url: item.url,
                            raw_data: item
                        });
                    });
                }

                // Tech stack changes from BuiltWith (Simplified)
                if (rawData.builtWithData?.technologies) {
                    signals.push({
                        type: 'tech',
                        source: 'builtwith',
                        title: `Tecnología detectada en ${track.brand_name}`,
                        description: `Se detectaron tecnologías activas: ${rawData.builtWithData.technologies.slice(0, 5).join(', ')}.`,
                        url: track.search_query, // Using brand query as reference
                        raw_data: rawData.builtWithData
                    });
                }

                // Mentions from Tavily
                if (rawData.tavilyResearch?.results) {
                    rawData.tavilyResearch.results.forEach((item: any) => {
                        signals.push({
                            type: 'mention',
                            source: 'tavily',
                            title: item.title,
                            description: item.content,
                            url: item.url,
                            raw_data: item
                        });
                    });
                }

                const newSignalsToNotify: any[] = [];

                // 3. Process each signal with Gemini Relevance
                for (const signal of signals) {
                    try {
                        const relevance = await analyzeSignalRelevance(signal, track.brand_name);

                        const id = `sig_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
                        const inserted = await runQuery(async (sql) => {
                            return await sql`
                                INSERT INTO competitor_signals (
                                    id, track_id, type, source, title, description, url, relevance_score, detected_at, raw_data
                                ) VALUES (
                                    ${id}, ${track.id}, ${signal.type}, ${signal.source}, ${signal.title}, ${signal.description}, ${signal.url}, ${relevance}, ${Date.now()}, ${signal.raw_data}
                                )
                                ON CONFLICT (track_id, url, type) DO NOTHING
                                RETURNING id
                            `;
                        });

                        if (inserted && inserted.length > 0) {
                            newSignalsToNotify.push({ ...signal, relevance_score: relevance });
                        }
                    } catch (err) {
                        // Conflict or error, skip
                    }
                }

                // 4. Update track metadata
                await runQuery(async (sql) => {
                    await sql`
                        UPDATE competitor_tracks
                        SET last_checked_at = ${Date.now()},
                            total_signals_found = (SELECT COUNT(*) FROM competitor_signals WHERE track_id = ${track.id})
                        WHERE id = ${track.id}
                    `;
                });

                scanResults.scanned++;
                scanResults.signalsDetected += newSignalsToNotify.length;

                // 5. Send Notification
                if (newSignalsToNotify.length > 0 && track.notify_email) {
                    const users = await runQuery(async (sql) => await sql`SELECT email, "firstName", username FROM users WHERE id = ${track.user_id}`);
                    const user = users && users.length > 0 ? users[0] : null;
                    if (user?.email && SMTP_PASS) {
                        const { subject, html } = buildSignalAlertEmail(user.firstName || user.username || "Usuario", track.brand_name, newSignalsToNotify);
                        const transporter = nodemailer.createTransport({
                            host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_PORT === 465,
                            auth: { user: SMTP_USER, pass: SMTP_PASS }, tls: { rejectUnauthorized: false }
                        });
                        await transporter.sendMail({ from: `"${SMTP_FROM_NAME}" <${SMTP_USER}>`, to: user.email, subject, html });
                        scanResults.emailsSent++;
                    }
                }
            } catch (err: any) {
                scanResults.errors.push(`Track ${track.id}: processing failed`);
            }
        }

        return jsonResponse(200, scanResults);
    } catch (err: any) {
        logError('competitor-scan', err);
        return jsonResponse(500, { error: safeError(err) });
    }
};

export { handler };

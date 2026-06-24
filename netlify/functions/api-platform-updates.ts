import { getCorsHeaders } from "./_lib/corsHelper";
/**
 * api-platform-updates.ts — Netlify Function
 * WOW Notifications & Release Intelligence Hub Logic
 *
 * GET ?action=pending&userId=X -> Check for one-shot spotlight
 * GET ?action=public -> List all active updates (public changelog)
 * GET ?action=list -> Admin: list all updates with stats
 * GET ?action=stats&updateId=X -> Admin: stats for a specific update
 * GET ?action=track-open&upd=X&uid=Y -> Email tracking pixel (1x1 GIF)
 * POST { action: "read", ... } -> Track a read event
 * POST { action: "publish", ... } -> Admin only: Create & Broadcast
 * POST { action: "resend", ... } -> Admin: resend for a specific update
 * POST { action: "deactivate", ... } -> Admin: deactivate an update
 */
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { runQuery } from "./_lib/db";
import { safeError, logError } from "./_lib/errorHandler";
import { runMigrations } from "./_lib/migrations";
import { sendPlatformUpdateEmail } from "./_lib/mailService";
import type { PlatformUpdate, PlatformUpdateRead } from "../../types";

const json = (status: number, body: unknown) => ({
    statusCode: status,
    headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined),
    body: JSON.stringify(body),
});

function safeJson(val: any, fallback: any = {}) {
    try {
        return typeof val === "string" ? JSON.parse(val) : (val ?? fallback);
    } catch { return fallback; }
}

function getUserSegment(user: any): "active" | "trial_active" | "trial_expired" | "free" {
    const sub = safeJson(user.subscription, {});
    const now = Date.now();

    if (sub.status === 'active') return 'active';
    if (sub.status === 'trial' || sub.plan === 'Trial') {
        return (sub.expiryDate > now) ? 'trial_active' : 'trial_expired';
    }
    return 'free';
}

function isAdminAuth(authHeader: string | null | undefined): boolean {
    if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
    const token = authHeader.slice(7);
    const ADMIN_SECRET = process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD;
    return ADMIN_SECRET ? token === ADMIN_SECRET : false;
}

let migrationsRan = false;

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined), body: "" };

    if (!migrationsRan) {
        await runMigrations().catch(err => console.error("[UPDATES] Migrations failed:", err));
        migrationsRan = true;
    }

    const queryParams = new URLSearchParams(event.queryStringParameters || {});
    const action = queryParams.get("action") || "";
    const body = event.body ? safeJson(event.body) : {};
    const authHeader = event.headers.Authorization || event.headers.authorization;

    try {
        // ── GET ?action=pending&userId=X ────────────────────────────────────────
        if (event.httpMethod === "GET" && action === "pending") {
            const userId = queryParams.get("userId");
            if (!userId) return json(400, { error: "userId required" });

            const rows = await runQuery(async (sql) => await sql`
                SELECT u.* FROM platform_updates u
                LEFT JOIN platform_update_reads r ON (r.update_id = u.id AND r.user_id = ${userId} AND r.source = 'modal')
                WHERE u.is_active = true
                  AND r.id IS NULL
                ORDER BY u.published_at DESC
                LIMIT 1
            `);

            return json(200, { update: rows?.[0] || null });
        }

        // ── GET ?action=public -> Public changelog ──────────────────────────────
        if (event.httpMethod === "GET" && action === "public") {
            const rows = await runQuery(async (sql) => await sql`
                SELECT * FROM platform_updates
                WHERE is_active = true
                ORDER BY published_at DESC
                LIMIT 50
            `);
            return json(200, { updates: rows || [] });
        }

        // ── GET ?action=list -> Admin only ─────────────────────────────────────
        if (event.httpMethod === "GET" && action === "list") {
            if (!isAdminAuth(authHeader)) {
                return json(403, { error: "Unauthorized" });
            }

            const rows = await runQuery(async (sql) => await sql`
                SELECT * FROM platform_updates
                ORDER BY published_at DESC
                LIMIT 100
            `);
            return json(200, { updates: rows || [] });
        }

        // ── GET ?action=stats&updateId=X -> Admin stats ─────────────────────────
        if (event.httpMethod === "GET" && action === "stats") {
            if (!isAdminAuth(authHeader)) {
                return json(403, { error: "Unauthorized" });
            }

            const updateId = queryParams.get("updateId");
            if (!updateId) return json(400, { error: "updateId required" });

            const rows = await runQuery(async (sql) => await sql`
                SELECT id, emails_sent, emails_opened, reads_count FROM platform_updates
                WHERE id = ${updateId}
            `);

            const update = rows?.[0];
            if (!update) return json(404, { error: "Update not found" });

            const ctr = update.emails_opened > 0 ? ((update.reads_count || 0) / update.emails_opened * 100).toFixed(2) : 0;
            return json(200, {
                ...update,
                ctr: parseFloat(ctr.toString()),
            });
        }

        // ── GET ?action=track-open&upd=X&uid=Y -> Email tracking pixel ──────────
        if (event.httpMethod === "GET" && action === "track-open") {
            const updateId = queryParams.get("upd");
            const userId = queryParams.get("uid");

            if (updateId && userId) {
                // Fire-and-forget tracking
                runQuery(async (sql) => {
                    await sql`
                        UPDATE platform_updates
                        SET emails_opened = emails_opened + 1
                        WHERE id = ${updateId}
                    `.catch(() => {});
                }).catch(() => {});
            }

            // Always return a 1x1 transparent GIF
            return {
                statusCode: 200,
                headers: { "Content-Type": "image/gif" },
                body: Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64").toString("binary"),
                isBase64Encoded: true,
            };
        }

        // ── POST { action: "read", ... } ───────────────────────────────────────
        if (event.httpMethod === "POST" && body.action === "read") {
            const { userId, updateId, source } = body;
            if (!userId || !updateId) {
                return json(400, { error: "userId and updateId required" });
            }

            const id = `rev_${Math.random().toString(36).substr(2, 9)}`;
            await runQuery(async (sql) => await sql`
                INSERT INTO platform_update_reads (id, user_id, update_id, read_at, source)
                VALUES (${id}, ${userId}, ${updateId}, ${Date.now()}, ${source || 'panel'})
                ON CONFLICT (user_id, update_id) DO NOTHING
            `);

            // Increment reads_count
            await runQuery(async (sql) => await sql`
                UPDATE platform_updates
                SET reads_count = COALESCE(reads_count, 0) + 1
                WHERE id = ${updateId}
            `);

            return json(200, { success: true });
        }

        // ── POST { action: "publish", ... } -> Admin only ─────────────────────
        if (event.httpMethod === "POST" && body.action === "publish") {
            if (!isAdminAuth(authHeader)) {
                return json(403, { error: "Unauthorized" });
            }

            const {
                version,
                type,
                titleEs,
                titleEn,
                descriptionEs,
                descriptionEn,
                previewUrl,
                featureTab,
                ctaUrl,
                emailSubjectActive,
                emailSubjectTrial,
                emailSubjectExpired,
                emailSubjectFree,
                createdBy,
                segments = ["active", "trial_active", "trial_expired", "free"],
                preview = false,
            } = body;

            if (!version || !type || !titleEs || !descriptionEs) {
                return json(400, { error: "Missing required fields" });
            }

            const id = `upd_${Math.random().toString(36).substr(2, 9)}`;
            const now = Date.now();

            // Insert the update
            await runQuery(async (sql) => await sql`
                INSERT INTO platform_updates (
                    id, version, type, title_es, title_en, description_es, description_en,
                    preview_url, feature_tab, cta_url,
                    email_subject_active, email_subject_trial, email_subject_expired, email_subject_free,
                    published_at, is_active, created_by
                ) VALUES (
                    ${id}, ${version}, ${type}, ${titleEs}, ${titleEn || titleEs},
                    ${descriptionEs}, ${descriptionEn || descriptionEs},
                    ${previewUrl || null}, ${featureTab || null}, ${ctaUrl || null},
                    ${emailSubjectActive || null}, ${emailSubjectTrial || null},
                    ${emailSubjectExpired || null}, ${emailSubjectFree || null},
                    ${now}, true, ${createdBy || 'admin'}
                )
            `);

            // Async broadcast (fire-and-forget)
            const broadcastTask = (async () => {
                try {
                    // Fetch users for each segment
                    const users = await runQuery(async (sql) => await sql`
                        SELECT id, email, "firstName", "lastName", username, subscription
                        FROM users
                        WHERE email IS NOT NULL AND is_deleted = false
                    `);

                    if (!users || users.length === 0) {
                        await runQuery(async (sql) => await sql`
                            UPDATE platform_updates SET emails_sent = 0 WHERE id = ${id}
                        `);
                        return;
                    }

                    let sentCount = 0;
                    const updateData = {
                        title: titleEs,
                        description: descriptionEs,
                        ctaUrl: ctaUrl,
                        title_es: titleEs,
                        title_en: titleEn || titleEs,
                        description_es: descriptionEs,
                        description_en: descriptionEn || descriptionEs,
                        preview_url: previewUrl,
                        feature_tab: featureTab,
                        cta_url: ctaUrl,
                        email_subject_active: emailSubjectActive,
                        email_subject_trial: emailSubjectTrial,
                        email_subject_expired: emailSubjectExpired,
                        email_subject_free: emailSubjectFree,
                    };

                    for (const user of users) {
                        const userSegment = getUserSegment(user);

                        // Only send if segment is included
                        if (!segments.includes(userSegment)) continue;

                        const firstName = user.firstName || user.username || 'Usuario';

                        try {
                            await sendPlatformUpdateEmail(
                                { id: user.id, email: user.email, firstName, plan: userSegment },
                                updateData,
                                userSegment,
                                id
                            );
                            sentCount++;

                            // Rate limiting
                            if (sentCount % 20 === 0) {
                                await new Promise(r => setTimeout(r, 500));
                            }
                        } catch (e) {
                            console.error(`[UPDATES] Failed to send email to ${user.email}:`, e);
                        }
                    }

                    // Update sent count
                    await runQuery(async (sql) => await sql`
                        UPDATE platform_updates SET emails_sent = ${sentCount} WHERE id = ${id}
                    `);

                    console.log(`[UPDATES] Broadcast complete for ${id}. Sent to ${sentCount} users.`);
                } catch (e) {
                    console.error("[UPDATES] Broadcast failed:", e);
                }
            })();

            // Netlify background task support (if available)
            if ((event as any).waitUntil) {
                (event as any).waitUntil(broadcastTask);
            }

            return json(200, { ok: true, updateId: id });
        }

        // ── POST { action: "resend", ... } -> Admin only ────────────────────────
        if (event.httpMethod === "POST" && body.action === "resend") {
            if (!isAdminAuth(authHeader)) {
                return json(403, { error: "Unauthorized" });
            }

            const { updateId, segments = ["active", "trial_active", "trial_expired", "free"] } = body;
            if (!updateId) return json(400, { error: "updateId required" });

            // Fetch the update
            const updateRows = await runQuery(async (sql) => await sql`
                SELECT * FROM platform_updates WHERE id = ${updateId}
            `);

            if (!updateRows || updateRows.length === 0) {
                return json(404, { error: "Update not found" });
            }

            const update = updateRows[0];

            // Async resend (fire-and-forget)
            const resendTask = (async () => {
                try {
                    const users = await runQuery(async (sql) => await sql`
                        SELECT id, email, "firstName", "lastName", username, subscription
                        FROM users
                        WHERE email IS NOT NULL AND is_deleted = false
                    `);

                    if (!users) return;

                    let sentCount = 0;
                    const updateData = {
                        title: update.title_es,
                        description: update.description_es,
                        ctaUrl: update.cta_url,
                        title_es: update.title_es,
                        title_en: update.title_en,
                        description_es: update.description_es,
                        description_en: update.description_en,
                        preview_url: update.preview_url,
                        feature_tab: update.feature_tab,
                        cta_url: update.cta_url,
                        email_subject_active: update.email_subject_active,
                        email_subject_trial: update.email_subject_trial,
                        email_subject_expired: update.email_subject_expired,
                        email_subject_free: update.email_subject_free,
                    };

                    for (const user of users) {
                        const userSegment = getUserSegment(user);
                        if (!segments.includes(userSegment)) continue;

                        const firstName = user.firstName || user.username || 'Usuario';

                        try {
                            await sendPlatformUpdateEmail(
                                { id: user.id, email: user.email, firstName, plan: userSegment },
                                updateData,
                                userSegment,
                                updateId
                            );
                            sentCount++;

                            if (sentCount % 20 === 0) {
                                await new Promise(r => setTimeout(r, 500));
                            }
                        } catch (e) {
                            console.error(`[UPDATES] Resend failed for ${user.email}:`, e);
                        }
                    }

                    console.log(`[UPDATES] Resend complete for ${updateId}. Sent to ${sentCount} users.`);
                } catch (e) {
                    console.error("[UPDATES] Resend failed:", e);
                }
            })();

            if ((event as any).waitUntil) {
                (event as any).waitUntil(resendTask);
            }

            return json(200, { ok: true });
        }

        // ── POST { action: "deactivate", ... } -> Admin only ────────────────────
        if (event.httpMethod === "POST" && body.action === "deactivate") {
            if (!isAdminAuth(authHeader)) {
                return json(403, { error: "Unauthorized" });
            }

            const { updateId } = body;
            if (!updateId) return json(400, { error: "updateId required" });

            await runQuery(async (sql) => await sql`
                UPDATE platform_updates SET is_active = false WHERE id = ${updateId}
            `);

            return json(200, { success: true });
        }

        return json(404, { error: "Unknown action" });
    } catch (err: any) {
        console.error("[UPDATES] Error:", err.message);
        return json(500, { error: safeError(err) });
    }
};

export { handler };

import type { Handler } from "@netlify/functions";
import { schedule } from "@netlify/functions";
import { runQuery } from "./_lib/db";
import { sendEmail, trialEndingSoonEmail, trialExpiredEmail, weeklyInsightsEmail } from "./_lib/mailService";

function safeJson(val: unknown, fallback: unknown): any {
    try { return typeof val === "string" ? JSON.parse(val) : (val ?? fallback); }
    catch { return fallback; }
}

// ── Main handler (runs daily at 9am UTC) ──────────────────────────────────────
const automationHandler: Handler = async () => {
    console.log("[scheduled-automation] Running daily checks...");
    const now = Date.now();
    const isMonday = new Date().getUTCDay() === 1;
    const isFirstOfMonth = new Date().getUTCDate() === 1;
    const results = { trialEndingSoon: 0, trialExpired: 0, weeklyInsights: 0, marketPulse: false, errors: 0 };

    // ── Monthly Market Pulse Trigger (1st of month) ──────────────────────────
    if (isFirstOfMonth) {
        try {
            console.log("[scheduled-automation] 1st of month — checking Trend Automation settings...");
            
            // 1. Fetch system settings to check the feature flag
            const settingsRow = await runQuery(async (sql) => 
                await sql`SELECT data FROM settings WHERE id = 1 LIMIT 1`
            );
            
            const systemSettings = safeJson(settingsRow?.[0]?.data, {});
            const isAutoTrendsEnabled = systemSettings?.features?.enableAutoTrends === true;

            if (isAutoTrendsEnabled) {
                console.log("[scheduled-automation] Auto-Trends ENABLED — triggering Market Pulse...");
                const APP_URL = process.env.APP_URL || "https://insitu.company";
                const response = await fetch(`${APP_URL}/.netlify/functions/api-market-pulse`, {
                    method: "POST",
                    headers: { "x-admin-secret": process.env.ADMIN_SECRET || "" }
                });
                if (response.ok) {
                    results.marketPulse = true;
                    console.log("[scheduled-automation] Market Pulse synthesis COMPLETED.");
                } else {
                    console.error("[scheduled-automation] Market Pulse status error:", response.status);
                }
            } else {
                console.log("[scheduled-automation] Auto-Trends DISABLED — skipping automated trigger (SuperAdmin Manual mode active).");
            }
        } catch (e: any) {
            console.error("[scheduled-automation] Market Pulse automation check failed:", e.message);
        }
    }

    try {
        const users = await runQuery(async (sql) =>
            await sql`SELECT id, email, "firstName", username, subscription, "totalTokensUsed", "usageLimit", "usageHistory"
                      FROM users WHERE "approvalStatus" = 'approved' AND email IS NOT NULL`
        );
        if (!users?.length) return { statusCode: 200, body: JSON.stringify({ success: true, results }) };

        const now = Date.now();
        const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
        const day2 = now + 2 * 24 * 60 * 60 * 1000;
        const day3 = now + 3 * 24 * 60 * 60 * 1000;

        for (const u of users) {
            try {
                const name = u.firstName || u.username || 'Usuario';
                const sub = safeJson(u.subscription, {});

                // ── Trial ending soon (expires in 2-3 days) ──────────────
                if (sub.status === 'trial' && sub.expiryDate) {
                    const exp = sub.expiryDate;
                    if (exp > day2 && exp <= day3) {
                        const daysLeft = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
                        await sendEmail(u.email, `⏰ Tu prueba termina en ${daysLeft} día${daysLeft !== 1 ? 's' : ''} — INsitu AI`, trialEndingSoonEmail(name, daysLeft));
                        results.trialEndingSoon++;
                    }
                    // ── Trial expired (expiryDate passed, still on trial) ─
                    if (exp < now) {
                        await sendEmail(u.email, '⏳ Tu prueba gratuita ha terminado — INsitu AI', trialExpiredEmail(name));
                        // Update status to expired so we don't re-send tomorrow
                        await runQuery(async (sql) => {
                            const updated = JSON.stringify({ ...sub, status: 'expired' });
                            await sql`UPDATE users SET subscription = ${updated} WHERE id = ${u.id}`;
                        });
                        results.trialExpired++;
                    }
                }

                // ── Weekly insights (only on Mondays) ────────────────────
                if (isMonday && sub.status !== 'inactive' && sub.status !== 'canceled') {
                    const history: any[] = safeJson(u.usageHistory, []);
                    const weekUsage = history.filter((h: any) => h.timestamp > weekAgo);
                    const weekTokens = weekUsage.reduce((acc: number, h: any) => acc + (h.tokensUsed || 0), 0);
                    await sendEmail(u.email, '📊 Tu resumen semanal — INsitu AI',
                        weeklyInsightsEmail(name, weekTokens, weekUsage.length, u.totalTokensUsed || 0, u.usageLimit || 500));
                    results.weeklyInsights++;
                }
            } catch (e: any) {
                console.error(`[scheduled-automation] Error for user ${u.id}:`, e.message);
                results.errors++;
            }
        }

        console.log(`[scheduled-automation] Done — trialEndingSoon:${results.trialEndingSoon} trialExpired:${results.trialExpired} weekly:${results.weeklyInsights} errors:${results.errors}`);
        return { statusCode: 200, body: JSON.stringify({ success: true, results }) };
    } catch (err: any) {
        console.error("[scheduled-automation] Fatal:", err.message);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};

// Daily at 9am UTC (Mon=weekly insights, every day=trial checks)
export const handler = schedule("0 9 * * *", automationHandler);

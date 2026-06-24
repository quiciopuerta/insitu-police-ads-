import { getCorsHeaders } from "./_lib/corsHelper";
import type { Handler, HandlerEvent } from "@netlify/functions";
import { runQuery } from "./_lib/db";
import { sendEmail, renewalEmail, paymentFailedEmail, canceledEmail } from "./_lib/mailService";
import { safeError, logError } from "./_lib/errorHandler";

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "";
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || "";
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID || "";

function safeJson(val: unknown, fallback: unknown): any {
    try { return typeof val === "string" ? JSON.parse(val) : (val ?? fallback); }
    catch { return fallback; }
}

const json = (status: number, body: unknown) => ({
    statusCode: status,
    headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined),
    body: JSON.stringify(body),
});

const handler: Handler = async (event: HandlerEvent) => {
    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined), body: "" };
    if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
    // DB initialization is handled by runQuery
    const body = event.body ? JSON.parse(event.body) : {};
    const eventType = body.event_type;
    const resource = body.resource;

    console.log(`[PAYPAL-WEBHOOK] Event: ${eventType}`, JSON.stringify(body));

    try {
        // ── Signature Verification (fail-CLOSED) ──────────────────────────────
        // If PAYPAL_WEBHOOK_ID is not configured, reject ALL webhooks.
        if (!PAYPAL_WEBHOOK_ID || !PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
            console.error('[PAYPAL-WEBHOOK] Missing PayPal credentials — rejecting webhook');
            return json(401, { error: 'Webhook verification not configured' });
        }
        try {
            const PAYPAL_API = process.env.PAYPAL_MODE === 'live'
                ? "https://api-m.paypal.com"
                : "https://api-m.sandbox.paypal.com";
            const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
            const tokenRes = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
                method: "POST",
                body: "grant_type=client_credentials",
                headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
            });
            const { access_token } = await tokenRes.json() as any;

            const verifyRes = await fetch(`${PAYPAL_API}/v1/notifications/verify-webhook-signature`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${access_token}` },
                body: JSON.stringify({
                    webhook_id: PAYPAL_WEBHOOK_ID,
                    transmission_id: event.headers['paypal-transmission-id'],
                    transmission_time: event.headers['paypal-transmission-time'],
                    cert_url: event.headers['paypal-cert-url'],
                    auth_algo: event.headers['paypal-auth-algo'],
                    transmission_sig: event.headers['paypal-transmission-sig'],
                    webhook_event: body,
                }),
            });
            const { verification_status } = await verifyRes.json() as any;
            if (verification_status !== 'SUCCESS') {
                console.warn(`[PAYPAL-WEBHOOK] Signature verification failed: ${verification_status}`);
                return json(400, { error: 'Invalid webhook signature' });
            }
        } catch (sigErr: any) {
            // Fail-CLOSED: reject if we cannot verify
            console.error('[PAYPAL-WEBHOOK] Signature check error (fail-closed):', sigErr.message);
            return json(500, { error: 'Signature verification error' });
        }

        // ── Idempotency: reject duplicate event_id processing ─────────────────
        const eventId = body.id;
        if (eventId) {
            const already = await runQuery(async (sql) =>
                await sql`SELECT 1 FROM processed_webhook_events WHERE event_id = ${eventId} LIMIT 1`
            ).catch(() => null);
            if (already && already.length > 0) {
                console.log(`[PAYPAL-WEBHOOK] Duplicate event ignored: ${eventId}`);
                return json(200, { received: true, duplicate: true });
            }
            // Mark as processed before handling to prevent race conditions
            await runQuery(async (sql) =>
                await sql`
                    INSERT INTO processed_webhook_events (event_id, event_type, processed_at)
                    VALUES (${eventId}, ${eventType}, ${Date.now()})
                    ON CONFLICT (event_id) DO NOTHING
                `
            ).catch(err => console.warn('[PAYPAL-WEBHOOK] Could not record event_id:', err.message));
        }
        // ── BILLING.SUBSCRIPTION.ACTIVATED ────────────────────────────
        if (eventType === "BILLING.SUBSCRIPTION.ACTIVATED") {
            const subscriptionId = resource.id;
            const customId = resource.custom_id;

            if (customId) {
                const subUpdate = { status: "active", id: subscriptionId, planId: resource.plan_id, lastUpdate: Date.now() };
                await runQuery(async (sql) => {
                    await sql`
                        UPDATE users
                        SET subscription = subscription::jsonb || ${JSON.stringify(subUpdate)}::jsonb,
                            "approvalStatus" = 'approved'
                        WHERE id = ${customId} OR email = ${resource.subscriber?.email_address}
                    `;
                });
                // Send renewal confirmation email
                const rows = await runQuery(async (sql) =>
                    await sql`SELECT email, "firstName", username, subscription FROM users WHERE id = ${customId}`);
                if (rows?.length) {
                    const u = rows[0];
                    const sub = safeJson(u.subscription, {});
                    const plan = sub.plan || 'Starter';
                    const nextDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES');
                    await sendEmail(u.email, `✅ Suscripción ${plan} renovada — INsitu AI`, renewalEmail(u.firstName || u.username || 'Usuario', plan, nextDate));
                }
                console.log(`[PAYPAL-WEBHOOK] Activated sub for ${customId}`);
            }
        }

        // ── BILLING.SUBSCRIPTION.CANCELLED ────────────────────────────
        if (eventType === "BILLING.SUBSCRIPTION.CANCELLED") {
            const customId = resource.custom_id;
            if (customId) {
                const subUpdate = { status: "cancelled", cancelDate: Date.now() };
                await runQuery(async (sql) => {
                    await sql`
                        UPDATE users
                        SET subscription = subscription::jsonb || ${JSON.stringify(subUpdate)}::jsonb
                        WHERE id = ${customId}
                    `;
                });
                const rows = await runQuery(async (sql) =>
                    await sql`SELECT email, "firstName", username FROM users WHERE id = ${customId}`);
                if (rows?.length) {
                    const u = rows[0];
                    await sendEmail(u.email, 'Tu suscripción INsitu AI ha sido cancelada', canceledEmail(u.firstName || u.username || 'Usuario'));
                }
            }
        }

        // ── BILLING.SUBSCRIPTION.PAYMENT.FAILED ──────────────────────
        if (eventType === "BILLING.SUBSCRIPTION.PAYMENT.FAILED" || eventType === "PAYMENT.SALE.DENIED") {
            const customId = resource.custom_id || resource.billing_agreement_id;
            if (customId) {
                const subUpdate = { status: "past_due", lastUpdate: Date.now() };
                await runQuery(async (sql) => {
                    await sql`
                        UPDATE users
                        SET subscription = subscription::jsonb || ${JSON.stringify(subUpdate)}::jsonb
                        WHERE id = ${customId}
                    `;
                });
                const rows = await runQuery(async (sql) =>
                    await sql`SELECT email, "firstName", username, subscription FROM users WHERE id = ${customId}`);
                if (rows?.length) {
                    const u = rows[0];
                    const sub = safeJson(u.subscription, {});
                    await sendEmail(u.email, `⚠️ Problema con tu pago — INsitu AI`, paymentFailedEmail(u.firstName || u.username || 'Usuario', sub.plan || 'tu plan'));
                }
            }
        }

        // ── PAYMENT.SALE.COMPLETED ──────────────────────────────────
        if (eventType === "PAYMENT.SALE.COMPLETED") {
            // Covered by BILLING.SUBSCRIPTION.ACTIVATED for recurring payments
        }

        return json(200, { received: true });
    } catch (err: any) {
        logError("PAYPAL-WEBHOOK", err);
        return json(500, { error: safeError(err) });
    }
};

export { handler };

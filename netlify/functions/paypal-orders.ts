import type { Handler, HandlerEvent } from "@netlify/functions";
import { runQuery } from "./_lib/db";
import { safeError, logError } from "./_lib/errorHandler";

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "";
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || "";
const PAYPAL_API = process.env.PAYPAL_MODE === 'live'
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
};

const json = (status: number, body: unknown) => ({
    statusCode: status,
    headers: CORS,
    body: JSON.stringify(body),
});

/**
 * Get PayPal Access Token
 */
async function getPayPalAccessToken() {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
    const response = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
        method: "POST",
        body: "grant_type=client_credentials",
        headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
    });
    const data: any = await response.json();
    return data.access_token;
}

const handler: Handler = async (event: HandlerEvent) => {
    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) return json(500, { error: "PayPal credentials missing" });

    const body = event.body ? JSON.parse(event.body) : {};
    const { action, userId, quantity = 1 } = body;

    // Guard: prevent userId spoofing — always enforced
    const headerUserId = event.headers['x-user-id'] || event.headers['X-User-Id'];
    if (!headerUserId || !userId || headerUserId !== userId) {
        return json(403, { error: 'User ID mismatch or missing' });
    }

    // quantity is number of 1,000 token blocks

    try {
        const accessToken = await getPayPalAccessToken();

        // ── action: CREATE ─────────────────────────────────────────────
        if (action === "create") {
            // Get user plan to determine price
            const rows = await runQuery(async (sql) => await sql`SELECT subscription FROM users WHERE id = ${userId}`);
            if (!rows) return json(503, { error: "Database offline" });
            if (!rows.length) return json(404, { error: "User not found" });
            const subRaw = rows[0].subscription;
            const sub = typeof subRaw === 'string' ? JSON.parse(subRaw) : (subRaw || {});

            // Price Calculation: Starter/Growth $3.00, Agency $3.54
            const pricePerBlock = sub.plan === 'Agency' ? 3.54 : 3.00;
            const total = (pricePerBlock * quantity).toFixed(2);

            const orderResponse = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    intent: "CAPTURE",
                    purchase_units: [
                        {
                            amount: {
                                currency_code: "USD",
                                value: total,
                            },
                            description: `Compra de ${quantity * 1000} tokens para INsitu AI`,
                        },
                    ],
                }),
            });

            const order: any = await orderResponse.json();
            return json(200, { id: order.id });
        }

        // ── action: CAPTURE ────────────────────────────────────────────
        if (action === "capture") {
            const { orderID } = body;
            const captureResponse = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderID}/capture`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
            });

            const captureData: any = await captureResponse.json();

            if (captureData.status === "COMPLETED") {
                // Derive token quantity from the ACTUAL captured amount (not client-supplied quantity)
                const purchaseUnit = captureData.purchase_units[0];
                const amount = parseFloat(purchaseUnit.payments.captures[0].amount.value);

                // Price per 1,000 token block: $3.00 (Starter/Growth) or $3.54 (Agency)
                // Use floor to avoid granting more tokens than paid
                const userPlanRows = await runQuery(async (sql) =>
                    await sql`SELECT subscription FROM users WHERE id = ${userId}`);
                const sub = userPlanRows?.length
                    ? (typeof userPlanRows[0].subscription === 'string'
                        ? JSON.parse(userPlanRows[0].subscription)
                        : userPlanRows[0].subscription || {})
                    : {};
                const pricePerBlock = sub.plan === 'Agency' ? 3.54 : 3.00;
                const verifiedQuantity = Math.floor(amount / pricePerBlock);
                if (verifiedQuantity < 1) {
                    return json(400, { error: 'Invalid payment amount' });
                }

                // Get current user limit
                const userRes = await runQuery(async (sql) => {
                    const userRows = await sql`SELECT "usageLimit", "usageHistory" FROM users WHERE id = ${userId}`;
                    if (userRows.length) {
                        const currentLimit = userRows[0].usageLimit || 0;
                        const tokensToAdd = verifiedQuantity * 1000;
                        const newLimit = currentLimit + tokensToAdd;

                        let history = typeof userRows[0].usageHistory === 'string' ? JSON.parse(userRows[0].usageHistory) : (userRows[0].usageHistory || []);
                        history.push({
                            id: `pay_${Date.now()}`,
                            timestamp: Date.now(),
                            tokensUsed: 0,
                            taskName: "Compra de Tokens",
                            details: `Pago de $${amount} por ${tokensToAdd} tokens adicionales via PayPal (${verifiedQuantity} bloques verificados).`
                        });
                        if (history.length > 50) history = history.slice(-50);

                        await sql`
                            UPDATE users 
                            SET "usageLimit" = ${newLimit}, "usageHistory" = ${JSON.stringify(history)} 
                            WHERE id = ${userId}
                        `;
                        return { success: true };
                    }
                    return null;
                });
                if (!userRes) return json(503, { error: "Database offline during update" });

                return json(200, { success: true, captureData });
            } else {
                return json(400, { error: "Capture failed", captureData });
            }
        }

        return json(400, { error: "Invalid action" });
    } catch (err: any) {
        return json(500, { error: safeError(err) });
    }
};

export { handler };

import { getCorsHeaders } from "./_lib/corsHelper";
import { getUserIdFromHeaders } from "./_lib/authMiddleware";
import { Handler, HandlerEvent } from "@netlify/functions";
import { runQuery } from "./_lib/db";
import { sendEmail, APP_URL, welcomeEmail } from "./_lib/mailService";
import { safeError, logError } from "./_lib/errorHandler";

const ADMIN_SECRET = process.env.ADMIN_SECRET || "";
const BRAND = process.env.SMTP_FROM_NAME || "INsitu AI";

const jsonResponse = (status: number, body: unknown) => ({
  statusCode: status,
  headers: getCorsHeaders(event.headers.origin || event.headers.Origin),
  body: JSON.stringify(body),
});

let tablesInitialized = false;

// ── Email Templates ────────────────────────────────────────────────────────────
const baseTemplate = (content: string, ctaUrl?: string, ctaText?: string) => `
<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${BRAND}</title>
  <style>
    @media only screen and (max-width:600px){
      .ew{padding:12px !important;}
      .ec{border-radius:16px !important;}
      .eb{padding:28px 20px !important;}
      .eh{font-size:22px !important;line-height:1.3 !important;}
      .ef{padding:20px !important;}
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#eef2f7;-webkit-text-size-adjust:100%;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef2f7;" class="ew">
    <tr><td align="center" style="padding:32px 16px;">

      <!-- Card -->
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;border-radius:24px;overflow:hidden;background:#ffffff;box-shadow:0 4px 32px rgba(0,0,0,0.10);" class="ec">

        <!-- Top gradient bar -->
        <tr><td height="5" style="background:linear-gradient(90deg,#ff477b 0%,#db2a62 50%,#00bcd4 100%);font-size:0;line-height:0;">&zwnj;</td></tr>

        <!-- Brand header -->
        <tr><td style="background:#1a0b10;padding:22px 40px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="vertical-align:middle;">
                <img src="${APP_URL}/isotype.png" alt="${BRAND}" width="36" height="36"
                  style="display:inline-block;vertical-align:middle;border:0;border-radius:8px;margin-right:10px;" />
                <span style="font-size:19px;font-weight:800;color:#ff477b;vertical-align:middle;letter-spacing:-0.4px;">${BRAND}</span>
              </td>
              <td align="right" style="vertical-align:middle;">
                <span style="font-size:11px;color:#9ca3af;letter-spacing:2px;text-transform:uppercase;font-weight:600;">AI Platform</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:40px 40px 32px;background:#ffffff;" class="eb">
          ${content}
          ${ctaUrl ? `
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;">
            <tr><td align="center">
              <a href="${ctaUrl}" target="_blank"
                style="display:inline-block;background:linear-gradient(135deg,#ff477b,#db2a62);color:#ffffff !important;text-decoration:none;padding:16px 40px;border-radius:100px;font-weight:800;font-size:15px;letter-spacing:0.04em;font-family:'Segoe UI',Roboto,Arial,sans-serif;box-shadow:0 6px 20px rgba(255,71,123,0.30);">
                ${ctaText || 'Ver más &rarr;'}
              </a>
            </td></tr>
          </table>` : ''}
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:22px 40px;background:#f9fafb;border-top:1px solid #f3f4f6;" class="ef">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr><td align="center">
              <p style="margin:0 0 8px;font-size:12px;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
                <a href="${APP_URL}" style="color:#ff477b;text-decoration:none;font-weight:600;">Dashboard</a>
                <span style="color:#d1d5db;">&nbsp;&middot;&nbsp;</span>
                <a href="${APP_URL}/contact" style="color:#9ca3af;text-decoration:none;">Soporte</a>
                <span style="color:#d1d5db;">&nbsp;&middot;&nbsp;</span>
                <a href="${APP_URL}/privacy" style="color:#9ca3af;text-decoration:none;">Privacidad</a>
              </p>
              <p style="margin:0;font-size:11px;color:#d1d5db;font-family:'Segoe UI',Roboto,Arial,sans-serif;">&copy; 2026 INsitu AI &mdash; Kinetic Intelligence for Advertising</p>
            </td></tr>
          </table>
        </td></tr>

      </table>
      <!-- /Card -->

    </td></tr>
  </table>
</body>
</html>`;

const renderMedia = (imageUrl?: string, videoUrl?: string) => {
  if (!imageUrl && !videoUrl) return "";
  const targetUrl = videoUrl || "#";
  const displayImage = imageUrl || "https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=600&h=300";
  return `
    <div style="margin:24px 0;border-radius:12px;overflow:hidden;background:#0f0509;border:1px solid rgba(255,71,123,0.1);">
      <a href="${targetUrl}" target="_blank" style="display:block;position:relative;text-decoration:none;">
        <img src="${displayImage}" alt="Media" style="width:100%;display:block;object-fit:cover;max-height:300px;" />
        ${videoUrl ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:64px;height:64px;background:rgba(255,71,123,0.9);border-radius:50%;display:flex;align-items:center;justify-content:center;"><div style="width:0;height:0;border-top:12px solid transparent;border-bottom:12px solid transparent;border-left:20px solid #fff;margin-left:5px;"></div></div>` : ""}
      </a>
    </div>`;
};

// ── Personalization & Segmentation ──────────────────────────────────────────────
const applyPersonalization = (text: string, user: any): string => {
  if (!text) return "";
  let result = text;
  
  const sub = typeof user.subscription === 'string' ? JSON.parse(user.subscription) : (user.subscription || {});
  let availableDaysStr = "0";
  if (sub.expiryDate) {
    const ms = new Date(sub.expiryDate).getTime() - Date.now();
    const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
    availableDaysStr = String(days > 0 ? days : 0);
  }

  const tags: Record<string, string> = {
    '{{firstName}}': user.firstName || user.username || 'Usuario',
    '{{lastName}}': user.lastName || '',
    '{{email}}': user.email || '',
    '{{plan}}': sub.plan || 'Free',
    '{{tokensUsed}}': String(user.totalTokensUsed || 0),
    '{{usageLimit}}': String(user.usageLimit || 0),
    '{{availableDays}}': availableDaysStr,
  };

  for (const [tag, value] of Object.entries(tags)) {
    result = result.replace(new RegExp(tag, 'g'), value);
  }
  return result;
}

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: "" };

  try {
    const authHeader = event.headers["authorization"] || event.headers["Authorization"] || event.headers["x-admin-key"] || "";
    const xUserId = getUserIdFromHeaders(event.headers);

    let isAuthorized = ADMIN_SECRET !== "" && authHeader === `Bearer ${ADMIN_SECRET}`;

    if (!isAuthorized && xUserId) {
      const roleRows = await runQuery(async (sql) => await sql`SELECT role, username FROM users WHERE id = ${xUserId} LIMIT 1`);
      if (roleRows && roleRows.length > 0) {
        isAuthorized = roleRows[0].role === "admin" || roleRows[0].role === "superAdmin";
        if (!isAuthorized) console.warn(`[ADMIN-NOTIFY] Unauthorized role ${roleRows[0].role} for user ${roleRows[0].username} attempting ${event.path}`);
      } else {
        console.warn(`[ADMIN-NOTIFY] Unknown user ID: ${xUserId}`);
      }
    }

    if (!isAuthorized) {
      console.warn(`[ADMIN-NOTIFY] 401 Unauthorized attempt from ${xUserId || 'MISSING_UID'} for path ${event.path}`);
      return jsonResponse(401, { error: "Unauthorized" });
    }

    const rawPath = event.path || "";
    const sub = rawPath
      .replace(/\/\.netlify\/functions\/api-admin-notify/, "")
      .replace("/api/admin/notify", "")
      .replace("/api/admin-notify", "")
      .replace(/^\//, "");

    const body = event.body ? JSON.parse(event.body) : {};
    // ── Database Schema Migration (Only once per session) ──
    if (!tablesInitialized) {
      await runQuery(async (sql) => {
        await sql`CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          read BOOLEAN DEFAULT FALSE,
          created_at BIGINT NOT NULL,
          cta_url TEXT,
          image_url TEXT,
          video_url TEXT
        )`;
        
        // Ensure indexes exist for performance
        await sql`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id)`.catch(() => {});

        await sql`CREATE TABLE IF NOT EXISTS engagement_events (
          id TEXT PRIMARY KEY,
          notification_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          timestamp BIGINT NOT NULL,
          metadata JSONB
        )`;
        
        await sql`CREATE INDEX IF NOT EXISTS idx_engagement_user_id ON engagement_events (user_id)`.catch(() => {});
      });
      tablesInitialized = true;
    }

    // 0. PUSH (in-app only — stores notification, no email)
    if (sub === "push" && event.httpMethod === "POST") {
      const { userId, segment, subject, content, ctaUrl, imageUrl, videoUrl } = body;
      let targetUsers: any[] = [];

      if (userId) {
        targetUsers = await runQuery(async (sql) => await sql`SELECT id FROM users WHERE id = ${userId}`) || [];
      } else if (segment) {
        targetUsers = await runQuery(async (sql) => {
          if (segment === "ALL") return await sql`SELECT id FROM users WHERE is_deleted = false`;
          if (["STARTER", "GROWTH", "AGENCY"].includes(segment))
            return await sql`SELECT id FROM users WHERE (subscription::jsonb)->>'plan' = ${segment} AND is_deleted = false`;
          return [];
        }) || [];
      }

      if (!targetUsers.length) return jsonResponse(200, { success: true, stored: 0, message: "No targets" });

      const now = Date.now();
      let stored = 0;
      for (let i = 0; i < targetUsers.length; i++) {
        const notifId = `push_${now}_${i}`;
        await runQuery(async (sql) => {
          await sql`INSERT INTO notifications (id, user_id, type, title, message, image_url, video_url, cta_url, created_at)
                    VALUES (${notifId}, ${targetUsers[i].id}, 'push', ${subject || "Notificación"}, ${content || ""}, ${imageUrl || null}, ${videoUrl || null}, ${ctaUrl || null}, ${now})`;
        });
        stored++;
      }
      return jsonResponse(200, { success: true, stored });
    }

    // 1. TRACK EVENT
    if (sub === "track" && event.httpMethod === "POST") {
      const { notificationId, userId, eventType, metadata } = body;
      if (!notificationId || !userId || !eventType) return jsonResponse(400, { error: "Missing tracking data" });
      const eventId = `ev_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      await runQuery(async (sql) => {
        await sql`INSERT INTO engagement_events (id, notification_id, user_id, event_type, timestamp, metadata) 
                  VALUES (${eventId}, ${notificationId}, ${userId}, ${eventType}, ${Date.now()}, ${metadata || {}})`;
      });
      return jsonResponse(200, { success: true });
    }

    // 2. MARK READ
    if (sub === "read" && event.httpMethod === "POST") {
      const { userId, notificationId } = body;
      if (!userId || !notificationId) return jsonResponse(400, { error: "Missing read data" });
      await runQuery(async (sql) => {
        await sql`UPDATE notifications SET read = true WHERE id = ${notificationId} AND user_id = ${userId}`;
      });
      return jsonResponse(200, { success: true });
    }

    // 3. STATS
    if (sub === "stats" && event.httpMethod === "GET") {
      const campaignId = event.queryStringParameters?.campaignId;
      const stats = await runQuery(async (sql) => {
        if (campaignId) {
          return await sql`SELECT metadata->>'variantId' as variant, event_type, COUNT(*) as count 
                           FROM engagement_events WHERE metadata->>'campaignId' = ${campaignId} 
                           GROUP BY variant, event_type`;
        }
        return await sql`SELECT event_type, COUNT(*) as count FROM engagement_events GROUP BY event_type`;
      });

      if (!stats) return jsonResponse(503, { error: "DB unavailable" });
      return jsonResponse(200, { stats });
    }

    // 4. POLL NOTIFICATIONS
    if (sub === "poll" && event.httpMethod === "GET") {
      const pollUserId = event.queryStringParameters?.userId || body.userId;
      if (!pollUserId) return jsonResponse(400, { error: "userId required for polling" });
      const rows = await runQuery(async (sql) => {
        return await sql`SELECT id, user_id as "userId", type, title, message, read, 
                         cta_url as "ctaUrl", image_url as "imageUrl", video_url as "videoUrl", created_at as "createdAt"
                         FROM notifications WHERE user_id = ${pollUserId} AND read = FALSE ORDER BY created_at DESC`;
      });
      return jsonResponse(200, { notifications: rows || [] });
    }

    // 5. TEST EMAIL
    if (sub === "test-email" && event.httpMethod === "POST") {
      const { email, firstName } = body;
      if (!email) return jsonResponse(400, { error: "Email required" });
      const html = welcomeEmail(firstName || "Prueba", 7, 500);
      await sendEmail(email, "System Test - INsitu AI", html);
      return jsonResponse(200, { success: true, message: "Email sent" });
    }

    // 6. ORCHESTRATE BROADCAST / SEND
    const { userId, segment, type: notifType, imageUrl, videoUrl, ctaUrl, variants } = body;
    let targetUsers: any[] = [];
    const now = Date.now();

    if (userId) {
      targetUsers = await runQuery(async (sql) => await sql`SELECT * FROM users WHERE id = ${userId}`) || [];
    } else if (segment) {
      targetUsers = await runQuery(async (sql) => {
        if (segment === "ALL") return await sql`SELECT * FROM users`;
        if (['STARTER', 'GROWTH', 'AGENCY'].includes(segment)) return await sql`SELECT * FROM users WHERE (subscription::jsonb)->>'plan' = ${segment}`;
        return [];
      }) || [];
    }

    if (!targetUsers.length) return jsonResponse(404, { error: "No targets" });

    const results = { emailsSent: 0, stored: 0 };
    const campaignId = `camp_${now}`;

    for (let i = 0; i < targetUsers.length; i++) {
      const user = targetUsers[i];
      let subject = applyPersonalization(body.subject || body.pushTitle || "Aviso", user);
      let message = applyPersonalization(body.content || body.message || "", user);

      if (variants && variants[i % variants.length]) {
        const v = variants[i % variants.length];
        subject = applyPersonalization(v.subject || v.pushTitle || subject, user);
        message = applyPersonalization(v.content || v.pushMessage || message, user);
      }

      const html = baseTemplate(
        `<h2 style="margin:0 0 16px;font-size:26px;font-weight:800;color:#111827;line-height:1.25;letter-spacing:-0.5px;font-family:'Segoe UI',Roboto,Arial,sans-serif;" class="eh">${subject}</h2>
        ${renderMedia(imageUrl, videoUrl)}
        <p style="margin:0;font-size:16px;line-height:1.7;color:#374151;font-family:'Segoe UI',Roboto,Arial,sans-serif;">${message}</p>`,
        ctaUrl
      );
      
      if (user.email) {
        try { await sendEmail(user.email, subject, html); results.emailsSent++; } catch(e) {}
      }

      const notifId = `notif_${now}_${i}`;
      await runQuery(async (sql) => {
        await sql`INSERT INTO notifications (id, user_id, type, title, message, image_url, video_url, cta_url, created_at)
                  VALUES (${notifId}, ${user.id}, ${sub || 'custom'}, ${subject}, ${message}, ${imageUrl || null}, ${videoUrl || null}, ${ctaUrl || null}, ${now})`;
        await sql`INSERT INTO engagement_events (id, notification_id, user_id, event_type, timestamp, metadata)
                  VALUES (${`ev_sent_${now}_${i}`}, ${notifId}, ${user.id}, 'SENT', ${now}, ${{ campaignId }})`;
      });
      results.stored++;
    }

    return jsonResponse(200, { success: true, ...results, campaignId });

  } catch (err: any) {
    logError("api-admin-notify", err);
    return jsonResponse(500, { error: safeError(err) });
  }
};

export { handler };

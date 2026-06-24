import { getCorsHeaders } from "./_lib/corsHelper";
import { getUserIdFromHeaders } from "./_lib/authMiddleware";
import type { Handler, HandlerEvent } from "@netlify/functions";
import { runQuery } from "./_lib/db";
import { safeError, logError } from "./_lib/errorHandler";

const jsonResponse = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined),
  body: JSON.stringify(body),
});

const REASON_TO_RULE: Record<string, string> = {
  "Consejo muy genérico":
    "EVITA consejos genéricos o de manual. Cada recomendación debe ser ESPECÍFICA al nicho, dominio y contexto exacto del usuario. Si dices 'mejora tu SEO', di exactamente CÓMO y CON QUÉ keyword.",
  "Dato incorrecto o alucinado":
    "PRIORIZA datos verificados por APIs reales. Si no tienes un dato concreto, indícalo explícitamente con 'Dato estimado' en vez de inventar cifras. Nunca presentes estimaciones como hechos.",
  "Tono de marca fallido":
    "ADAPTA el tono de comunicación al perfil de marca (Brand Profile) del usuario. Si la marca es corporativa, sé formal. Si es disruptiva, sé audaz. Consulta el brandProfile antes de redactar.",
  "No aplica a mi nicho":
    "INVESTIGA el nicho específico del dominio/marca ANTES de dar recomendaciones. Valida que tus sugerencias son relevantes para la industria y mercado del usuario, no para un mercado genérico.",
};

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === "OPTIONS")
    return { statusCode: 204, headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined), body: "" };

  // ── IDENTITY VERIFICATION ─────────────────────────────────────────────
  const userId = getUserIdFromHeaders(event.headers);
  if (!userId) {
    return jsonResponse(401, { error: "Unauthorized: Missing identity" });
  }

  // Validate user exists in DB and get role
  const userData = await runQuery(async (sql) => {
    const rows = await sql`SELECT id, role FROM users WHERE id = ${userId} LIMIT 1`;
    return rows && rows.length > 0 ? rows[0] : null;
  });

  if (!userData) {
    return jsonResponse(401, { error: "Unauthorized: Invalid identity" });
  }
  // ──────────────────────────────────────────────────────────────────────

  try {
    // 1. Initialize tables if they don't exist
    await runQuery(async (sql) => {
      await sql`
        CREATE TABLE IF NOT EXISTS ai_feedback (
          id SERIAL PRIMARY KEY,
          user_id UUID NOT NULL,
          feature VARCHAR(50) NOT NULL,
          prompt_context TEXT,
          ai_response JSONB,
          feedback_type VARCHAR(20) NOT NULL,
          feedback_reason VARCHAR(100),
          rating INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS ai_prompt_rules (
          id SERIAL PRIMARY KEY,
          rule_type VARCHAR(50) NOT NULL,
          content TEXT NOT NULL,
          feature VARCHAR(100),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT TRUE
        );
      `;
    });

    // ── GET → Admin feedback history ──────────────────────────────────────────
    if (event.httpMethod === "GET") {
      // Admin check
      if (userData.role !== 'admin' && userData.role !== 'superAdmin') {
        return jsonResponse(403, { error: "Forbidden: Admin access required" });
      }

      const params = event.queryStringParameters || {};
      const feature = params.feature;
      const feedbackType = params.feedbackType;
      const limit = Math.min(parseInt(params.limit || "100"), 500);

      const result = await runQuery(async (sql) => {
        let rows;
        if (feature && feedbackType) {
          rows = await sql`
            SELECT id, user_id, feature, feedback_type, feedback_reason, rating, created_at
            FROM ai_feedback
            WHERE feature = ${feature} AND feedback_type = ${feedbackType}
            ORDER BY created_at DESC LIMIT ${limit}
          `;
        } else if (feature) {
          rows = await sql`
            SELECT id, user_id, feature, feedback_type, feedback_reason, rating, created_at
            FROM ai_feedback
            WHERE feature = ${feature}
            ORDER BY created_at DESC LIMIT ${limit}
          `;
        } else {
          rows = await sql`
            SELECT id, user_id, feature, feedback_type, feedback_reason, rating, created_at
            FROM ai_feedback
            ORDER BY created_at DESC LIMIT ${limit}
          `;
        }

        const stats = await sql`
          SELECT feature, feedback_type, COUNT(*) as count
          FROM ai_feedback
          GROUP BY feature, feedback_type
          ORDER BY feature, feedback_type
        `;

        return { feedback: rows, stats };
      });

      if (!result) return jsonResponse(200, { feedback: [], stats: [], error: "Database unavailable" });
      return jsonResponse(200, result);
    }

    // ── POST → Submit feedback + auto-learn from negatives ────────────────────
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const { userId: feedbackUserId, feature, context, aiResponse, feedbackType, feedbackReason, rating } = body;

      if (!feedbackUserId || !feature || !feedbackType) {
        return jsonResponse(400, { error: "Missing required fields" });
      }

      // Ownership guard
      if (feedbackUserId !== userId) {
        return jsonResponse(403, { error: "Forbidden: Cannot submit feedback for another user" });
      }

      const inserted = await runQuery(async (sql) => {
        return await sql`
          INSERT INTO ai_feedback (user_id, feature, prompt_context, ai_response, feedback_type, feedback_reason, rating)
          VALUES (${userId}, ${feature}, ${context || null}, ${aiResponse || null}, ${feedbackType}, ${feedbackReason || null}, ${rating || null})
          RETURNING id;
        `;
      });

      if (!inserted) return jsonResponse(503, { error: "Database unavailable" });

      // ── AUTO-LEARN ──────
      let ruleCreated = false;
      if (feedbackType === "thumbs_down" && feedbackReason && REASON_TO_RULE[feedbackReason]) {
        try {
          const featureTag = feature === "TrafficChecker" ? "TrafficChecker_Audit"
            : feature === "GoogleAds" ? "GoogleAds_Search"
            : feature === "ImageAnalysis" ? "ImageAnalysis"
            : feature === "VideoAnalysis" ? "VideoAnalysis"
            : "global";

          await runQuery(async (sql) => {
            const existing = await sql`
              SELECT id FROM ai_prompt_rules 
              WHERE rule_type = 'negative_example' 
                AND feature = ${featureTag}
                AND content ILIKE ${"%" + feedbackReason.substring(0, 20) + "%"}
                AND is_active = TRUE
              LIMIT 1
            `;

            if (existing.length === 0) {
              await sql`
                INSERT INTO ai_prompt_rules (rule_type, content, feature, is_active)
                VALUES ('negative_example', ${REASON_TO_RULE[feedbackReason]}, ${featureTag}, TRUE)
              `;
              ruleCreated = true;
            }
          });
        } catch (ruleErr) {
          console.error("[api-feedback] Error creating auto-rule:", ruleErr);
        }
      }

      return jsonResponse(200, { success: true, feedbackId: inserted[0].id, ruleCreated });
    }

    return jsonResponse(405, { error: "Method not allowed" });
  } catch (err: any) {
    console.error("[api-feedback] Global Error:", err);
    return jsonResponse(500, { error: safeError(err) });
  }
};

export { handler };

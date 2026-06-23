/**
 * validators.ts — Centralized Zod schema validation for Netlify Functions
 *
 * Security layers:
 *  1. Type enforcement (string, email, url, number…)
 *  2. Length limits (prevent buffer overflows and DB truncation attacks)
 *  3. Pattern matching (block SQL injection payloads, script tags, etc.)
 *  4. Structured error messages (never expose internal schema details)
 *
 * Usage:
 *   import { validateBody, LoginSchema } from "./_lib/validators";
 *   const parsed = validateBody(LoginSchema, body);
 *   if (!parsed.success) return json(400, { error: parsed.error });
 */

import { z, ZodSchema } from "zod";

// ── SQL Injection Pattern Detector ──────────────────────────────────────────
// Detects the most common SQL injection payloads at schema level.
// This is a defence-in-depth layer; the primary protection is parameterized queries.
const SQL_INJECTION_PATTERN =
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE|UNION|CAST|CONVERT|DECLARE|WAITFOR|SLEEP|BENCHMARK|INFORMATION_SCHEMA|SYS\.)\b)|('.*;)|(--)|(\/\*[\s\S]*?\*\/)/gi;

// ── XSS / Script Injection Pattern Detector ────────────────────────────────
const XSS_PATTERN =
  /<\s*(script|iframe|object|embed|link|meta|style|img|on\w+)[^>]*>/gi;

// ── Reusable safe string refinement ────────────────────────────────────────
const safeString = (maxLength: number, fieldName: string) =>
  z
    .string()
    .max(maxLength, `${fieldName} no puede superar ${maxLength} caracteres`)
    .refine(
      (val) => !SQL_INJECTION_PATTERN.test(val),
      `${fieldName} contiene patrones no permitidos (posible inyección SQL)`
    )
    .refine(
      (val) => !XSS_PATTERN.test(val),
      `${fieldName} contiene etiquetas HTML/script no permitidas`
    );

const safeOptionalString = (maxLength: number, fieldName: string) =>
  z
    .string()
    .max(maxLength, `${fieldName} no puede superar ${maxLength} caracteres`)
    .refine(
      (val) => !SQL_INJECTION_PATTERN.test(val),
      `${fieldName} contiene patrones no permitidos`
    )
    .refine(
      (val) => !XSS_PATTERN.test(val),
      `${fieldName} contiene etiquetas HTML/script no permitidas`
    )
    .optional();

// ── Auth: Login ─────────────────────────────────────────────────────────────
export const LoginSchema = z.object({
  username: safeString(150, "username").min(1, "El username es obligatorio"),
  password: z
    .string()
    .min(1, "La contraseña es obligatoria")
    .max(256, "Contraseña demasiado larga"),
  recaptchaToken: z.string().optional(),
});

// ── Auth: Register ──────────────────────────────────────────────────────────
export const RegisterSchema = z.object({
  username: safeString(50, "username")
    .min(3, "El username debe tener al menos 3 caracteres")
    .regex(/^[a-zA-Z0-9_.-]+$/, "Username solo puede tener letras, números, _ . -"),
  password: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .max(256, "Contraseña demasiado larga"),
  email: z
    .string()
    .email("Formato de email inválido")
    .max(255, "Email demasiado largo"),
  firstName: safeString(100, "firstName").optional(),
  lastName: safeString(100, "lastName").optional(),
  phone: z
    .string()
    .max(30, "Teléfono demasiado largo")
    .regex(/^[+\d\s\-().]*$/, "Formato de teléfono inválido")
    .optional(),
  referredBy: safeOptionalString(50, "referredBy"),
  recaptchaToken: z.string().optional(),
});

// ── Auth: Recovery ──────────────────────────────────────────────────────────
export const RecoverySchema = z.object({
  emailOrUsername: safeString(255, "emailOrUsername").min(
    1,
    "Campo obligatorio"
  ),
  recaptchaToken: z.string().optional(),
});

// ── Auth: Reset Password ────────────────────────────────────────────────────
export const ResetPasswordSchema = z.object({
  emailOrUsername: safeString(255, "emailOrUsername").min(1, "Campo obligatorio"),
  code: z
    .string()
    .length(6, "El código de recuperación debe tener 6 dígitos")
    .regex(/^\d+$/, "El código solo debe contener dígitos"),
  newPass: z
    .string()
    .min(6, "La nueva contraseña debe tener al menos 6 caracteres")
    .max(256, "Contraseña demasiado larga"),
  recaptchaToken: z.string().optional(),
});

// ── Contact Form ─────────────────────────────────────────────────────────────
export const ContactSchema = z.object({
  name: safeString(100, "name").min(1, "El nombre es obligatorio"),
  email: z
    .string()
    .email("Formato de email inválido")
    .max(255, "Email demasiado largo"),
  website: z
    .string()
    .url("URL de sitio web inválida")
    .max(500, "URL demasiado larga")
    .optional()
    .or(z.literal("")),
  budget: safeOptionalString(100, "budget"),
  notes: safeOptionalString(2000, "notes"),
  role: safeOptionalString(100, "role"),
  goals: safeOptionalString(500, "goals"),
});

// ── Lead (Admin) ─────────────────────────────────────────────────────────────
export const LeadSchema = z.object({
  name: safeOptionalString(100, "name"),
  email: z
    .string()
    .email("Formato de email inválido")
    .max(255, "Email demasiado largo"),
  role: safeOptionalString(100, "role"),
  budget: safeOptionalString(100, "budget"),
  goals: safeOptionalString(500, "goals"),
  website: z
    .string()
    .url("URL de sitio web inválida")
    .max(500, "URL demasiado larga")
    .optional()
    .or(z.literal(""))
    .optional(),
  notes: safeOptionalString(2000, "notes"),
});

// ── Feedback ──────────────────────────────────────────────────────────────────
export const FeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: safeOptionalString(1000, "comment"),
  auditType: z.enum(["search", "image", "video", "abtest", "traffic", "other"]).optional(),
  sessionId: safeOptionalString(100, "sessionId"),
  userId: safeOptionalString(50, "userId"),
});

// ── AI Proxy ──────────────────────────────────────────────────────────────────
export const AiProxySchema = z.object({
  prompt: safeString(10000, "prompt").min(1, "El prompt es obligatorio"),
  model: z.string().max(100, "Nombre de modelo demasiado largo").optional(),
  userId: safeOptionalString(50, "userId"),
  sessionId: safeOptionalString(100, "sessionId"),
});

// ── Media Generation ──────────────────────────────────────────────────────────
export const MediaGenSchema = z.object({
  type: z.enum([
    "IMAGE_GEN", "VIDEO_GEN", "ANIMATE", "AUDIO_GEN", "RESEARCH", "THINKING", "CHAT",
    "IMAGE_EDIT", "PRODUCT_MASTER", "TRANSCRIPTION",
    "VIDEO_STATUS", "VIDEO_MASTER", "PROMPT_SANITIZE", "PROMPT_EXPAND",
    "BRAND_PDF_ANALYZE", "VOICE_ANALYZE", "AUDIO_SCRIPT_GEN", "VERTEX_DIAG",
    "URL_EXTRACT", "VOICEOVER_SAVE", "PLAN_SEGMENTS", "VOICEOVER_LIST"
  ]),
  payload: z.object({
    prompt: z.string().max(10000).optional(),
    query: z.string().max(10000).optional(),
    aspectRatio: z.string().max(20).optional(),
    model: z.string().max(100).optional(),
    language: z.string().max(10).optional(),
    brandContext: z.object({
      brandName: z.string().max(200).optional(),
      industry: z.string().max(200).optional(),
      valueProposition: z.string().max(1000).optional(),
      targetAudience: z.string().max(1000).optional(),
      toneOfVoice: z.string().max(500).optional(),
    }).optional(),
    sourceImageBase64: z.string().optional(),
    imageUrl: z.string().url("imageUrl debe ser una URL válida").optional(),
    image: z.string().optional(),
    scale: z.union([z.number().min(1).max(4), z.string()]).optional(),
    fidelity: z.union([z.number().min(0).max(1), z.string()]).optional(),
    mask: z.string().optional(),
  }).passthrough(),
});

// ── Generic validator helper ─────────────────────────────────────────────────
/**
 * Validates a body object against a Zod schema.
 * Returns { success: true, data } or { success: false, error: string }.
 */
export function validateBody<T extends ZodSchema>(
  schema: T,
  body: unknown
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  const result = schema.safeParse(body);
  if (!result.success) {
    // Return the first error message, never expose full Zod paths in production
    const firstError = (result.error as any).errors[0];
    return {
      success: false,
      error: firstError?.message ?? "Datos de entrada inválidos",
    };
  }
  return { success: true, data: result.data };
}

import { getCorsHeaders } from "./_lib/corsHelper";
import { getUserIdFromHeaders } from "./_lib/authMiddleware";
/**
 * Netlify Function: api-media-generation
 * ======================================
 * Server-side media generation proxy for Imagen 3.0 Gen 2 and Veo 3.0 / 3.1.
 * Resolves CORS issues and provides a secure Node.js environment for SDK/REST calls.
 * 
 * Route: POST /api/media/generate
 */

import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { checkRateLimit, getClientIp } from "./_lib/rateLimiter";
import { safeError, logError } from "./_lib/errorHandler";
import crypto from 'crypto';
import { getGeminiKey, callGeminiApi, callImagenApi, DEFAULT_MODEL, VISION_MODEL } from './_lib/gemini';
import { runQuery } from './_lib/db';

import { getVertexToken, getVertexConfig, gcsSignedUrl } from './_lib/vertex';
import { validateBody, MediaGenSchema } from './_lib/validators';
import { validateResearchPackage } from './_lib/researchValidator';

/**
 * Mapping of UI format names to API aspect ratios.
 * Veo 3.0 / 3.1 VIDEO_GEN supported ratios: 16:9, 9:16, 1:1, 4:3, 3:4
 * Veo 3.0 / 3.1 ANIMATE (image-to-video) supported ratios: 16:9, 9:16, 1:1
 * Imagen 3.0 supported ratios: 1:1, 9:16, 16:9, 4:3, 3:4
 */
// Veo 3.1 supported ratios: 16:9 and 9:16 only (1:1 and others not currently supported by Vertex AI v1 REST natively)
const VEO_SUPPORTED_RATIOS = new Set(['16:9', '9:16']);
const VEO_ANIMATE_SUPPORTED_RATIOS = new Set(['16:9', '9:16']);
const IMAGEN_SUPPORTED_RATIOS = new Set(['1:1', '9:16', '16:9', '4:3', '3:4']);

const formatToAspectRatio = (format: string, modelType: 'video' | 'animate' | 'image' = 'image'): string => {
    let ratio: string = "16:9"; // Default fallback

    if (typeof format === 'string' && format.includes(':')) {
        ratio = format;
    } else {
        switch (format) {
            case 'Landscape': ratio = "16:9"; break;
            case 'Square':    ratio = "1:1";  break;
            case 'Portrait':  ratio = "9:16"; break;
            case 'Social':    ratio = "9:16"; break; // Veo doesn't support 4:5 — fallback to Portrait
            default:          ratio = "16:9"; break;
        }
    }

    // Strict validation: reject unsupported ratios to prevent API errors
    if (modelType === 'animate') {
        if (!VEO_ANIMATE_SUPPORTED_RATIOS.has(ratio)) {
            console.warn(`[MediaGen] Veo 3.1 ANIMATE does not support ratio "${ratio}" — falling back to 16:9`);
            return '16:9';
        }
    } else if (modelType === 'video') {
        if (!VEO_SUPPORTED_RATIOS.has(ratio)) {
            console.warn(`[MediaGen] Veo 3.1 VIDEO_GEN does not support ratio "${ratio}" (attempted "${format}") — falling back to 16:9`);
            return '16:9';
        }
    } else if (modelType === 'image') {
        if (!IMAGEN_SUPPORTED_RATIOS.has(ratio)) {
            console.warn(`[MediaGen] Imagen 3 does not support ratio "${ratio}" — falling back to 1:1`);
            return '1:1';
        }
    }

    return ratio;
};

/**
 * Converts raw PCM audio (as base64) to a WAV file (base64).
 * Gemini TTS returns raw 16-bit PCM at 24 kHz mono — browsers cannot play it
 * without the RIFF/WAV header. This function prepends the 44-byte header.
 */
function pcmBase64ToWavBase64(pcmBase64: string, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): string {
    const pcm = Buffer.from(pcmBase64, 'base64');
    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const dataSize = pcm.length;
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataSize, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);          // subchunk1 size
    header.writeUInt16LE(1, 20);           // PCM = 1
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);
    return Buffer.concat([header, pcm]).toString('base64');
}

// getGeminiKey imported from _lib/gemini

// ── Brilliant Basics: system instructions per generation type ─────────────────
/**
 * BRILLIANT_BASICS — Creative Director AI System Prompts
 * =======================================================
 * Implements the full creative_generation skill framework.
 * Each key is a media type system instruction for Gemini Flash.
 * Covers: ABCD Framework (Google), Safe Zones, Visual Hierarchy,
 * Hook Timing (0-3s), Objective→Style mapping, Brand-Aware enhancement.
 * Source: .agent/skills/creative_generation/SKILL.md
 */
const BRILLIANT_BASICS: Record<string, string> = {
    IMAGE: `You are an Ad Creative Director. Enhance the user's image prompt:
HIERARCHY: Hero (60%) + Benefit (30%) + CTA (10%).
COMPOSITION: Rule of thirds, 30-40% negative space, single focal point.
COMPLIANCE: Text ≤20%, contrast 4.5:1, no generated text/logos.
LIGHTING: Softbox for products, Rembrandt for people, golden hour for lifestyle, studio for tech.
STYLE: Apply objective tone — Awareness (cinematic/golden hour) | Conversion (clean studio, CTA space) | Retargeting (UGC casual) | App (screen overlay).
TECHNICAL: 4K photorealistic, professional, zero artifacts.
Return ONLY the clean English prompt (one paragraph, 80-150 words). No labels.`,

    VIDEO: `You are an Ad Creative Director for Veo 3.1. Enhance the video prompt:
ABCD FRAMEWORK: Attract hook at 0-3s (face looking at camera = +23% CTR, unexpected motion, or light change) | Brand visible by 5s | Connect emotionally | Direct CTA in last 2s.
RHYTHM: Visual cuts every 2-3s, lighting (lateral window or studio key), bokeh isolation, handheld or slider movement.
STYLE: Awareness (cinematic/golden) | Conversion (clean studio, CTA space) | Retargeting (UGC/casual) | App (screen recording).
SAFE ZONES: TikTok/Reels (bottom 20%, right 10% free) | Shorts (bottom 15%) | YouTube Horizontal (none).
TECHNICAL: Anamorphic, HDR, 8K, ProRes 4444, premium color grade.
Return clean English brief (one paragraph, 80-150 words). No labels.`,

    ANIMATE: `You are an Animation Director for Veo 3.1. Enhance the animation prompt:
MOTION: Direct toward center/product, parallax (background slower), 50-70% speed, ease in/out.
LOOP-FRIENDLY: Start and end frames compatible, prefer gentle oscillatory motion or floating.
STYLE: Floating product (levitation + shadow) | Person (micro-expression + hair) | Lifestyle (bokeh movement) | Tech (screen animation + light).
STATIC: Texts/logos stay static if high background motion; except subtle logo fade (0.5s).
TECHNICAL: Anamorphic flares, motion blur, volumetric depth, soft dynamics.
Return clean English prompt (100 words max). No labels.`,

    AUDIO: `You are an Audio Creative Director. Enhance the voiceover script:
STRUCTURE: Hook (first 5 words: pain, stat, or benefit) → Core benefit (5-15s) → Social proof (15-25s) → Urgent CTA (last 5s).
PACE: 130-150 WPM (145 sweet spot), 0.3s pause before CTA.
DURATION: 15s (skip-proof) | 30s (standard) | 6s (bumper).
TONE: Search (urgent/trust) | Meta (warm/inspiration) | TikTok (casual/fun) | LinkedIn (professional/credible) | YouTube (conversational/engaged).
QUALITY: Hook in 5 words ✓ | Single message ✓ | Action verbs ✓ | Concrete numbers ✓ | Imperative CTA ✓ | Same language as input ✓
Return ONLY the enhanced brief in user's language. Max 100 words.`,

    TRANSLATE_EN: `You are a professional translator and advertising brief writer. 
    Your task is to translate the user's prompt to English and expand it into a high-fidelity technical brief.
    Even if the user writes in Spanish, German, or any other language, you MUST return the result in ENGLISH ONLY.
    Follow the specific cinematic and aesthetic rules provided for the model type.`
};

/**
 * Brilliant Basics — Creative Director AI Auto-Enhancement
 * =========================================================
 * Integrates the full creative_generation skill framework (Modules 1-5).
 * Silently enriches a basic user prompt with professional ad creative principles
 * before sending to Imagen / Veo / Gemini TTS. Returns the original prompt on any failure.
 *
 * Module 5 (Brand-Aware Enhancement): When structured brand fields are present,
 * they are injected as a BRAND CONTEXT block so the model can adapt palette,
 * tone, and audience into the enriched prompt.
 */
async function enhancePrompt(
    userPrompt: string,
    type: 'IMAGE' | 'VIDEO' | 'ANIMATE' | 'AUDIO',
    context: {
        platform?: string;
        objective?: string;
        brand?: string;
        // Module 5: structured brand fields (from BrandIdentity)
        brandColors?: string;
        brandVisualTone?: string;
        brandTargetAudience?: string;
        brandValues?: string;
        brandRestrictions?: string;
    }
): Promise<string> {
    if (!userPrompt || userPrompt.trim().length < 3) return userPrompt;
    // Skip if the prompt is already detailed (> 80 words) — user knows what they want
    if (userPrompt.trim().split(/\s+/).length > 80) return userPrompt;

    try {
        const { key } = getGeminiKey();
        if (!key) return userPrompt;
        
        // Mandate English for Visual Models (IMAGE/VIDEO/ANIMATE)
        const isVisual = ['IMAGE', 'VIDEO', 'ANIMATE'].includes(type);
        const baseSystem = BRILLIANT_BASICS[type] || BRILLIANT_BASICS.IMAGE;
        const systemInstruction = isVisual 
            ? `${BRILLIANT_BASICS.TRANSLATE_EN}\n\n${baseSystem}` 
            : baseSystem;

        // ── Platform Safe Zone & Framework rules (Module 1 & 2) ───────────────
        let frameworkRule = "";
        if (context.platform) {
            const p = context.platform.toLowerCase();
            if (p.includes('tiktok')) {
                frameworkRule = "PLATFORM (TikTok): UGC-authentic feel, lo-fi aesthetic. Safe zones: bottom 20% and right 10% must be free of crucial content (native overlay area).";
            } else if (p.includes('youtube')) {
                frameworkRule = "PLATFORM (YouTube): ABCD Framework — Attract (hook 0-3s), Brand (visible by 5s), Connect (emotion/story), Direct (CTA last 2s). Horizontal: no safe zone restrictions. Shorts: bottom 15% free.";
            } else if (p.includes('google')) {
                frameworkRule = "PLATFORM (Google Ads): ABCD Framework — Attract (high contrast hook), Brand (early logo/color), Connect (problem/aspiration), Direct (negative space for CTA overlay).";
            } else if (p.includes('meta') || p.includes('instagram') || p.includes('facebook')) {
                frameworkRule = "PLATFORM (Meta/Instagram): Performance 5 & Mobile-First — high saturation, single central hero, negative space for text ≤20% area. Reels safe zone: bottom 20% free.";
            } else if (p.includes('linkedin')) {
                frameworkRule = "PLATFORM (LinkedIn): B2B authority aesthetic — professional, minimalist, white space, readable typography. Avoid flashiness; prioritize trust and knowledge symbols.";
            } else if (p.includes('programmatic') || p.includes('display')) {
                frameworkRule = "PLATFORM (Programmatic Display): High-visibility — bold visuals that work at small sizes, high contrast text/background, immediate brand recognition.";
            }
        }

        // ── Objective → Style mapping (Module 1 & 2) ─────────────────────────
        let objectiveRule = "";
        if (context.objective) {
            const obj = context.objective.toLowerCase();
            if (obj.includes('awareness') || obj.includes('branding')) {
                objectiveRule = "OBJECTIVE (Awareness): Cinematic lifestyle style, golden hour lighting, slow motion — emotional impression over hard sell.";
            } else if (obj.includes('conversion') || obj.includes('sales') || obj.includes('purchase')) {
                objectiveRule = "OBJECTIVE (Conversion): Product hero shot, clean studio background, strong CTA visual space — clarity and urgency over beauty.";
            } else if (obj.includes('retarget') || obj.includes('remarketing')) {
                objectiveRule = "OBJECTIVE (Retargeting): UGC-style, testimonial feel, casual handheld aesthetic — relatable, not polished.";
            } else if (obj.includes('app') || obj.includes('install') || obj.includes('download')) {
                objectiveRule = "OBJECTIVE (App Install): Screen recording overlay style, reaction face — show the app UI in real use context.";
            } else if (obj.includes('engagement') || obj.includes('community')) {
                objectiveRule = "OBJECTIVE (Engagement): Warm, conversational, story-driven — prioritize relatability and shareability.";
            }
        }

        // ── Module 5: Brand-Aware Enhancement ────────────────────────────────
        const brandLines: string[] = [];
        if (context.brand) brandLines.push(`Brand description: ${context.brand}.`);
        if (context.brandColors) brandLines.push(`Brand color palette: ${context.brandColors} — incorporate these colors in the visual descriptors.`);
        if (context.brandVisualTone) brandLines.push(`Brand visual tone: ${context.brandVisualTone} — reflect this aesthetic throughout.`);
        if (context.brandTargetAudience) brandLines.push(`Target audience: ${context.brandTargetAudience} — reflect their lifestyle, age, and aspirations in the creative.`);
        if (context.brandValues) brandLines.push(`Brand values: ${context.brandValues} — embed these in the setting and emotion.`);
        if (context.brandRestrictions) brandLines.push(`Brand restrictions (MANDATORY): Avoid ${context.brandRestrictions}.`);
        const brandBlock = brandLines.length > 0
            ? `\nBRAND CONTEXT (Module 5 — Brand-Aware Enhancement):\n${brandLines.join('\n')}`
            : '';

        const contextLines = [
            context.platform  && `Target platform: ${context.platform}.`,
            frameworkRule,
            objectiveRule,
            context.objective && `Campaign objective: ${context.objective}.`,
            brandBlock,
        ].filter(Boolean).join('\n');

        const userContent = `${contextLines ? contextLines + '\n\n' : ''}Original prompt: "${userPrompt}"\n\nEnhanced prompt:`;

        // Safety check: if concatenated context is too large, skip enhancement
        const totalLength = systemInstruction.length + userContent.length;
        if (totalLength > 4000) {
            console.warn(`[MediaGen] enhancePrompt context too large (${totalLength} chars), skipping enrichment`);
            return userPrompt;
        }

        const response = await callGeminiApi({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: userContent }] }],
            systemInstruction,
            generationConfig: { maxOutputTokens: 300, temperature: 0.7 }
        });

        const enhanced = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (enhanced && enhanced.length > 10) {
            console.log(`[MediaGen] Creative Director AI (${type}): "${userPrompt.substring(0, 50)}…" → "${enhanced.substring(0, 80)}…"`);
            return enhanced;
        }
        return userPrompt;
    } catch (e: any) {
        console.warn(`[MediaGen] enhancePrompt silent fallback (${type}): ${e.message}`);
        return userPrompt;
    }
}

const handler: Handler = async (event: HandlerEvent, _ctx: HandlerContext) => {
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 204, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: "" };
    }

    if (event.httpMethod !== "POST") {
        return { statusCode: 405, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: "Method not allowed" }) };
    }

    let type = 'unknown';
    let isSuperAdmin = false;
    const startTime = Date.now();
    
    try {
        const clientIp = getClientIp(event);
        const isLocalDev = !!process.env.NETLIFY_DEV;
        const maxLimit = isLocalDev ? 500 : 300; 
        const rateLimit = await checkRateLimit(clientIp, { windowMs: 60000, max: maxLimit });
        if (!rateLimit.success) {
            return { 
                statusCode: 429, 
                headers: getCorsHeaders(event.headers.origin || event.headers.Origin), 
                body: JSON.stringify({ error: "Rate limit exceeded for media generation. Please wait a minute." }) 
            };
        }

        // Authentication
        const userId = getUserIdFromHeaders(event.headers);
        if (!userId) {
            return { statusCode: 401, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: "Unauthorized: Missing identity" }) };
        }

        // ── Auth: verificar usuario y rol en DB ─────────────────────────────
        const userRecord = await runQuery(async (sql) => {
            const rows = await sql`SELECT id, role, email FROM users WHERE id = ${userId} LIMIT 1`;
            return rows?.[0] || null;
        });

        if (userRecord === false || userRecord === null) {
            if (userRecord === false) {
                return { statusCode: 401, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: "Unauthorized: Invalid identity" }) };
            }
            console.warn(`[MediaGen] Warning: Database unavailable, bypassing strict user verification for "${userId}"`);
        }

        let rawBody = event.body || "{}";
        if (event.isBase64Encoded) {
            rawBody = Buffer.from(rawBody, 'base64').toString('utf-8');
        }
        const bodyRaw = JSON.parse(rawBody);
        const validation = validateBody(MediaGenSchema, bodyRaw) as any;
        if (!validation.success) {
            return { statusCode: 400, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: validation.error }) };
        }

        const body = validation.data;
        type = body.type; // Actualizamos para el logger de error
        const payload = body.payload as any;

        // ── 1. Load AI Prompt Rules from DB (Layer 3) ───────────────────────
        const promptRules = await runQuery(async (sql) => {
            return await sql`
                SELECT rule_type, content FROM ai_prompt_rules 
                WHERE is_active = TRUE AND (feature = ${type} OR feature = 'global')
                ORDER BY created_at DESC
            `;
        }) || [];
        
        const ruleDirectives = promptRules.map((r: any) => `- [${r.rule_type.toUpperCase()}]: ${r.content}`).join('\n');
        
        // ── Super Admin detection (source of truth: DB role column) ──────────
        // isSuperAdmin is set from the real DB role, not from the email payload
        // This prevents spoofing by passing a fake email in the request body.
        isSuperAdmin = userRecord?.role === 'superAdmin';
        console.log(`[MediaGen] User ${userId} | role: ${userRecord?.role || 'unknown'} | isSuperAdmin: ${isSuperAdmin}`);

        // ── Super Admin Gate: tipos de generación de media creativos ─────────
        // IMAGE_GEN, VIDEO_GEN, ANIMATE y similares están restringidos al Super Admin.
        // Los tipos de análisis (RESEARCH, TRANSCRIPTION, etc.) siguen abiertos a todos.
        const SUPERADMIN_ONLY_TYPES = new Set([
            'IMAGE_GEN', 'IMAGE_GEN_FLUX', 'VIDEO_GEN', 'VIDEO_GEN_LTX',
            'ANIMATE', 'VIDEO_MASTER', 'PLAN_SEGMENTS',
            'IMAGE_REMOVE_BG', 'IMAGE_UPSCALE', 'IMAGE_RESTORE_FACE', 'IMAGE_OUTPAINT',
            'AUDIO_GEN', 'VOICE_CLONE'
        ]);

        if (SUPERADMIN_ONLY_TYPES.has(type) && !isSuperAdmin) {
            console.warn(`[MediaGen] BLOCKED: User ${userId} (role: ${userRecord?.role}) attempted ${type} — Super Admin only.`);
            return {
                statusCode: 403,
                headers: getCorsHeaders(event.headers.origin || event.headers.Origin),
                body: JSON.stringify({
                    error: "Acceso restringido. La creación de imágenes, videos, animaciones y audio está disponible exclusivamente para Super Admin.",
                    type: 'SUPERADMIN_REQUIRED'
                })
            };
        }
        
        
        if (!type || !payload) {
            return { statusCode: 400, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: "Missing type or payload" }) };
        }

        const { key: apiKey, source: keySource } = getGeminiKey();
        
        // Standard AI Studio Client (Gemini — for non-Vertex tasks)
        // Using v1beta to support newest modalities like AUDIO output
        // SDK removed - using callGeminiApi/callImagenApi (native fetch)

        // Vertex AI config — no SDK client, pure REST with OAuth2 via getVertexToken()
        // Standardize Vertex AI Configuration (Capa 1/2)
        // Try to resolve credentials early. We use a safe wrapper to avoid crashing if unavailable in non-Vertex routes.
        let vertexCreds: any = null;
        try { vertexCreds = await getVertexConfig(); } catch (e) {}
        
        const vertexProjectId: string | null = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GCP_PROJECT_ID || (vertexCreds?.project_id) || null;
        const vertexLocation: string = process.env.GCP_LOCATION || (vertexCreds?.location) || 'us-central1';
        const vertexAvailable = !!(vertexCreds && vertexProjectId);
        console.log(`[MediaGen] Vertex AI available: ${vertexAvailable} | project: ${vertexProjectId} | location: ${vertexLocation}`);


        console.log(`[MediaGen] Processing ${type} using key from ${keySource} ending in ...${apiKey.slice(-4)}`);

        switch (type) {
            case 'IMAGE_GEN': {
                const {
                    prompt,
                    aspectRatio = "16:9",
                    model = "imagen-4.0-generate-001",
                    sampleCount = 1,
                    includeSafetyAttributes = true,
                    personGeneration = "dont_allow", // Options: allow_all, allow_adult, dont_allow
                    styleReference,
                    subjectReference
                } = payload;

                try {
                    // ── Model Selection (Google I/O 2026, Mayo 19) ─────────────────────
                    // imagen-4.0-ultra-generate-001: máxima calidad, rate limits aumentados (I/O 2026)
                    // imagen-4.0-generate-001: estándar balanceado (GA)
                    const modelId = model === 'Imagen 4 Ultra' ? 'imagen-4.0-ultra-generate-001'
                                  : model === 'Imagen 4' ? 'imagen-4.0-generate-001'
                                  : model;
                    console.log(`[MediaGen] IMAGE_GEN model: ${modelId}`);
                    let vertexSucceeded = false;

                    // Brilliant Basics: enrich prompt before sending to Imagen
                    // If the prompt contains the brand identity header, extract only the user
                    // request portion so the word-count heuristic in enhancePrompt works correctly
                    // (otherwise "Casa" prepended with 200-word brand context counts as >80 words
                    //  and the expander is silently skipped).
                    const rawPrompt = prompt || payload.prompt || '';
                    const USER_REQUEST_SEPARATOR = '--- USER REQUEST (PRIORITY) ---';
                    const separatorIdx = rawPrompt.indexOf(USER_REQUEST_SEPARATOR);
                    const userOnlyPrompt = separatorIdx !== -1
                        ? rawPrompt.slice(separatorIdx + USER_REQUEST_SEPARATOR.length).replace(/^Interpret the following request while respecting the brand context above:\s*/i, '').trim()
                        : rawPrompt;

                    // Parse brandContext if it's a JSON string so we can pass structured fields
                    let parsedBrand: any = null;
                    if (payload.brandContext && typeof payload.brandContext === 'string') {
                        try { parsedBrand = JSON.parse(payload.brandContext); } catch { parsedBrand = null; }
                    } else if (payload.brandContext && typeof payload.brandContext === 'object') {
                        parsedBrand = payload.brandContext;
                    }

                    const enhancedUserPrompt = await enhancePrompt(userOnlyPrompt, 'IMAGE', {
                        platform: payload.platform,
                        objective: payload.objective,
                        brandColors: parsedBrand?.brandColors,
                        brandVisualTone: parsedBrand?.visualGuidelines,
                        brandTargetAudience: parsedBrand?.targetAudience,
                        brandValues: parsedBrand?.valueProposition,
                        brandRestrictions: parsedBrand?.complianceRules,
                    });

                    // Re-attach the brand context header if it was present, using the enhanced user prompt
                    const enhancedImagePrompt = separatorIdx !== -1
                        ? rawPrompt.slice(0, separatorIdx + USER_REQUEST_SEPARATOR.length) +
                          '\nInterpret the following request while respecting the brand context above:\n\n' +
                          enhancedUserPrompt
                        : enhancedUserPrompt;

                    // PATH 1: Vertex AI REST (OAuth2) — preferred when credentials are configured
                    if (vertexAvailable) {
                        try {
                        const finalPrompt = enhancedImagePrompt;
                        const sampleCountParsed = Math.min(Math.max(1, Number(sampleCount) || 1), 4);
                        
                        console.log(`[MediaGen] IMAGE_GEN via Vertex AI REST — model: ${modelId} | samples: ${sampleCountParsed}`);
                        const token = await getVertexToken();
                        const endpoint = `https://${vertexLocation}-aiplatform.googleapis.com/v1/projects/${vertexProjectId}/locations/${vertexLocation}/publishers/google/models/${modelId}:predict`;

                        const requestBody: any = {
                            instances: [{ prompt: finalPrompt }],
                            parameters: {
                                sampleCount: sampleCountParsed,
                                aspectRatio: formatToAspectRatio(aspectRatio),
                                outputOptions: { mimeType: 'image/jpeg' },
                                safetySetting: { personGeneration },
                                includeSafetyAttributes,
                                addWatermark: false
                            }
                        };

                        // ── Style Reference (Imagen 3) ──
                        if (styleReference) {
                            const cleanStyle = styleReference.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
                            const styleMime = styleReference.match(/^data:(image\/[a-zA-Z+]+);base64,/)?.[1] || 'image/jpeg';
                            
                            requestBody.instances[0].styleReference = {
                                referenceType: "style",
                                referenceImage: { bytesBase64Encoded: cleanStyle, mimeType: styleMime },
                                referencePower: (typeof payload.styleReferencePower === 'number' ? payload.styleReferencePower : 0.8)
                            };
                            console.log(`[MediaGen] Added styleReference to IMAGE_GEN`);
                        }

                        // ── Subject Reference (Imagen 3) ──
                        if (subjectReference) {
                            const cleanSubject = subjectReference.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
                            const subjectMime = subjectReference.match(/^data:(image\/[a-zA-Z+]+);base64,/)?.[1] || 'image/jpeg';
                            
                            requestBody.instances[0].subjectReference = {
                                referenceType: "subject",
                                referenceImage: { bytesBase64Encoded: cleanSubject, mimeType: subjectMime }
                            };
                            console.log(`[MediaGen] Added subjectReference to IMAGE_GEN`);
                        }

                        const res = await fetch(endpoint, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify(requestBody)
                        });

                            if (!res.ok) {
                                const errText = await res.text();
                                throw new Error(`Imagen Vertex API ${res.status}: ${errText}`);
                            }

                            const data = await res.json();
                            vertexSucceeded = true;

                            if (sampleCountParsed > 1) {
                                const results = data?.predictions?.map((p: any) => ({
                                    url: `data:image/jpeg;base64,${p.bytesBase64Encoded}`,
                                    mimeType: p.mimeType || 'image/jpeg'
                                })) || [];
                                if (results.length === 0) throw new Error("Imagen Vertex returned no image bytes.");
                                return {
                                    statusCode: 200, headers: getCorsHeaders(event.headers.origin || event.headers.Origin),
                                    body: JSON.stringify({
                                        images: results, url: results[0].url,
                                        meta: { 
                                            modelUsed: `${modelId} (Vertex AI)`, 
                                            timestamp: new Date().toISOString(),
                                            promptSent: finalPrompt,
                                            aspectRatio,
                                            sampleCount: results.length 
                                        }
                                    })
                                };
                            } else {
                                const base64 = data?.predictions?.[0]?.bytesBase64Encoded;
                                if (!base64) throw new Error("Imagen Vertex returned no image bytes.");
                                return {
                                    statusCode: 200, headers: getCorsHeaders(event.headers.origin || event.headers.Origin),
                                    body: JSON.stringify({
                                        url: `data:image/jpeg;base64,${base64}`,
                                        meta: { 
                                            modelUsed: `${modelId} (Vertex AI)`, 
                                            timestamp: new Date().toISOString(),
                                            promptSent: finalPrompt,
                                            aspectRatio
                                        }
                                    })
                                };
                            }
                        } catch (vertexErr: any) {
                            if (vertexSucceeded) throw vertexErr; // re-throw only if Vertex succeeded but post-processing failed
                            console.warn(`[MediaGen] Vertex IMAGE_GEN failed, trying AI Studio SDK: ${vertexErr.message}`);
                        }
                    }

                    // PATH 2: AI Studio SDK — used when no Vertex creds OR Vertex call failed
                    const fallbackModelId = modelId;
                    console.log(`[MediaGen] IMAGE_GEN via AI Studio REST — model: ${fallbackModelId} | samples: ${sampleCount}`);
                    
                    const result = await callImagenApi({
                        model: fallbackModelId,
                        prompt: enhancedImagePrompt,
                        numberOfImages: Math.min(Math.max(1, sampleCount), 4),
                        aspectRatio: formatToAspectRatio(aspectRatio),
                        personGeneration
                    });

                    const images = result?.generatedImages || [];
                    if (images.length === 0) throw new Error("Imagen returned no images via AI Studio REST.");

                    if (sampleCount > 1) {
                        const results = images.map((img: any) => ({
                            url: `data:image/jpeg;base64,${img.image?.imageBytes}`,
                            mimeType: 'image/jpeg'
                        }));
                        return {
                            statusCode: 200, headers: getCorsHeaders(event.headers.origin || event.headers.Origin),
                            body: JSON.stringify({
                                images: results, url: results[0].url,
                                meta: { modelUsed: `${modelId} (AI Studio REST)`, timestamp: new Date().toISOString(), sampleCount: results.length }
                            })
                        };
                    } else {
                        const imageBytes = images[0]?.image?.imageBytes;
                        if (!imageBytes) throw new Error("Imagen returned no image bytes via AI Studio REST.");
                        return {
                            statusCode: 200, headers: getCorsHeaders(event.headers.origin || event.headers.Origin),
                            body: JSON.stringify({
                                url: `data:image/jpeg;base64,${imageBytes}`,
                                meta: { modelUsed: `${modelId} (AI Studio REST)`, timestamp: new Date().toISOString() }
                            })
                        };
                    }
                } catch (e: any) {
                    console.error("[MediaGen] IMAGE_GEN Error:", e.message);
                    return { statusCode: 500, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: "AI Generation Error", details: e.message, type: 'IMAGE_GEN' }) };
                }
            }



            case 'IMAGE_EDIT': {
                const { prompt, sourceImageBase64, aspectRatio = "1:1", styleReference, subjectReference } = payload;
                if (!sourceImageBase64) throw new Error("sourceImageBase64 is required for IMAGE_EDIT");
                const cleanBase64 = sourceImageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

                try {
                    if (!vertexAvailable) throw new Error("Vertex AI credentials not configured (GCP_CLIENT_EMAIL + GCP_PRIVATE_KEY or GOOGLE_CREDENTIALS_JSON).");
                    console.log(`[MediaGen] IMAGE_EDIT via Vertex AI REST — model: imagen-3.0-capability-001`);

                    const token = await getVertexToken();
                    // Imagen 3 edit uses the capability model
                    const endpoint = `https://${vertexLocation}-aiplatform.googleapis.com/v1/projects/${vertexProjectId}/locations/${vertexLocation}/publishers/google/models/imagen-3.0-capability-001:predict`;

                    const instances: any[] = [{
                        prompt,
                        image: { bytesBase64Encoded: cleanBase64, mimeType: 'image/jpeg' }
                    }];

                    // Add references if provided (following the standard Imagen 3 schema)
                    if (styleReference || subjectReference) {
                        const referenceImages: any[] = [];
                        let refId = 1;

                        if (styleReference) {
                            const cleanStr = styleReference.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
                            referenceImages.push({
                                referenceId: refId++,
                                referenceType: "style",
                                referenceImage: { bytesBase64Encoded: cleanStr, mimeType: 'image/jpeg' }
                            });
                        }
                        if (subjectReference) {
                            const cleanStr = subjectReference.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
                            referenceImages.push({
                                referenceId: refId++,
                                referenceType: "subject",
                                referenceImage: { bytesBase64Encoded: cleanStr, mimeType: 'image/jpeg' }
                            });
                        }
                        if (referenceImages.length > 0) {
                            instances[0].referenceImages = referenceImages;
                        }
                    }

                    const res = await fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            instances,
                            parameters: {
                                sampleCount: 1,
                                aspectRatio: formatToAspectRatio(aspectRatio),
                                outputOptions: { mimeType: 'image/jpeg' },
                                editMode: payload.editMode || 'EDIT_MODE_OUTPAINT',
                                mask: payload.mask ? { 
                                  bytesBase64Encoded: payload.mask.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, ""), 
                                  mimeType: 'image/jpeg' 
                                } : undefined,
                                addWatermark: false
                            }
                        })
                    });

                    if (!res.ok) throw new Error(`Imagen Edit API ${res.status}: ${await res.text()}`);
                    const data = await res.json();
                    const base64 = data?.predictions?.[0]?.bytesBase64Encoded;
                    if (!base64) throw new Error("Imagen Edit returned no image bytes.");

                    return {
                        statusCode: 200, headers: { ...getCorsHeaders(event.headers.origin || event.headers.Origin), "Content-Type": "application/json" },
                        body: JSON.stringify({ url: `data:image/jpeg;base64,${base64}`, meta: { modelUsed: 'imagen-3.0-capability-001 (Vertex AI - Edit)', timestamp: new Date().toISOString() } })
                    };
                } catch (e: any) {
                    console.error("[MediaGen] IMAGE_EDIT Error:", e.message);
                    return { statusCode: 500, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: "AI Editing Error", details: e.message, type: 'IMAGE_EDIT' }) };
                }
            }

            case 'PRODUCT_MASTER': {
                const { sourceImageBase64, ecommercePlatform = "generico" } = payload;
                if (!sourceImageBase64) throw new Error("sourceImageBase64 is required for PRODUCT_MASTER");
                const cleanBase64 = sourceImageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

                try {
                    if (!vertexAvailable) throw new Error("Vertex AI credentials not configured.");
                    console.log(`[MediaGen] PRODUCT_MASTER via Vertex AI REST — platform: ${ecommercePlatform}`);

                    const token = await getVertexToken();
                    const endpoint = `https://${vertexLocation}-aiplatform.googleapis.com/v1/projects/${vertexProjectId}/locations/${vertexLocation}/publishers/google/models/imagen-3.0-capability-001:predict`;

                    // Build platform-specific prompt
                    let platformPrompt = "Professional product photography, clean studio background, minimalist lighting.";
                    if (ecommercePlatform === 'amazon') platformPrompt = "Professional Amazon product photography, pure white background, high-end studio lighting, sharp focus, commercial quality.";
                    if (ecommercePlatform === 'shopify') platformPrompt = "Minimalist e-commerce product photography, soft clean aesthetic background, premium retail look, 4k detail.";
                    if (ecommercePlatform === 'instagram') platformPrompt = "Trendy lifestyle product photography, aesthetic natural lighting, stylish minimalist background, professional look.";
                    if (ecommercePlatform === 'google') platformPrompt = "Clean Google Shopping product image, high-quality white studio background, accurate colors, sharp details.";

                    const res = await fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            instances: [{
                                prompt: platformPrompt,
                                image: { bytesBase64Encoded: cleanBase64, mimeType: "image/jpeg" }
                            }],
                            parameters: {
                                editMode: "EDIT_MODE_BGSWAP",
                                sampleCount: 1,
                                outputOptions: { mimeType: "image/jpeg" },
                                addWatermark: false
                            }
                        })
                    });

                    if (!res.ok) {
                        const err = await res.text();
                        console.error("[MediaGen] PRODUCT_MASTER API Error:", err);
                        throw new Error(`Imagen Product Master API ${res.status}: ${err}`);
                    }
                    
                    const data = await res.json();
                    const base64 = data?.predictions?.[0]?.bytesBase64Encoded;
                    if (!base64) throw new Error("Imagen Product Master returned no image bytes.");

                    return {
                        statusCode: 200, headers: getCorsHeaders(event.headers.origin || event.headers.Origin),
                        body: JSON.stringify({ 
                            url: `data:image/jpeg;base64,${base64}`, 
                            meta: { 
                                modelUsed: 'imagen-3.0-capability-001 (Product Master)', 
                                platform: ecommercePlatform,
                                timestamp: new Date().toISOString()
                            } 
                        })
                    };
                } catch (e: any) {
                    console.error("[MediaGen] PRODUCT_MASTER Error:", e.message);
                    return { statusCode: 500, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: "Product Mastering Error", details: e.message, type: 'PRODUCT_MASTER' }) };
                }
            }




            case 'TRANSCRIPTION': {
                const { audioUrl, videoUrl, language = 'auto' } = payload;
                const sourceUrl = audioUrl || videoUrl;
                if (!sourceUrl) throw new Error("audioUrl or videoUrl is required for TRANSCRIPTION");

                try {
                    const sourceType = audioUrl ? 'audio' : 'video';
                    console.log(`[MediaGen] TRANSCRIPTION via Gemini 2.0 Flash — ${sourceType}: ${sourceUrl}`);
                    
                    // Fetch media bytes to send to Gemini
                    const response = await fetch(sourceUrl);
                    if (!response.ok) throw new Error(`Could not fetch ${sourceType}: ${response.status}`);
                    const mediaBuffer = Buffer.from(await response.arrayBuffer());
                    const mediaBase64 = mediaBuffer.toString('base64');
                    
                    // Determine MIME type
                    let mimeType = response.headers.get('content-type') || (audioUrl ? 'audio/wav' : 'video/mp4');
                    // Normalize: GCS signed URLs may strip content-type; infer from URL
                    if (mimeType === 'application/octet-stream' || mimeType === 'binary/octet-stream') {
                        if (sourceUrl.includes('.webm')) mimeType = 'video/webm';
                        else if (sourceUrl.includes('.mp4')) mimeType = 'video/mp4';
                        else if (sourceUrl.includes('.wav')) mimeType = 'audio/wav';
                        else if (sourceUrl.includes('.mp3')) mimeType = 'audio/mp3';
                    }

                    const prompt = `Transcribe este ${sourceType} con alta precisión.
Plataforma: INsitu AI (Publicidad).
Idioma solicitado: ${language === 'auto' ? 'Detectar automáticamente' : language}.

REGLAS CRÍTICAS:
1. Divide el texto en segmentos lógicos de 2-4 segundos.
2. Devuelve ÚNICAMENTE un objeto JSON con la clave "captions".
3. "captions" debe ser un array de objetos con: "text" (el texto), "startMs" (inicio en milisegundos), "endMs" (fin en milisegundos).
4. NO incluyas explicaciones, ni etiquetas de bloque de código \`\`\`json. Solo el objeto crudo o dentro de un bloque si es estrictamente necesario, pero prefiero el objeto puro.
5. El tiempo total no debe exceder la duración del ${sourceType}.
6. Si el ${sourceType} no contiene habla audible, devuelve {"captions": []}.

EJEMPLO DE SALIDA:
{
  "captions": [
    { "text": "¡Descubre la nueva colección!", "startMs": 0, "endMs": 1500 },
    { "text": "Calidad premium en cada detalle.", "startMs": 1600, "endMs": 3500 }
  ]
}`;

                    const result = await callGeminiApi({
                        model: "gemini-2.5-flash",
                        contents: [{
                            role: 'user',
                            parts: [
                                { text: prompt },
                                { inlineData: { data: mediaBase64, mimeType: mimeType } }
                            ]
                        }],
                        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
                    });

                    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
                    // Clean possible markdown JSON wrappers
                    const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                    const parsed = JSON.parse(cleanJson);

                    return {
                        statusCode: 200,
                        headers: getCorsHeaders(event.headers.origin || event.headers.Origin),
                        body: JSON.stringify({ 
                            captions: parsed.captions,
                            meta: { modelUsed: 'gemini-2.5-flash (Multimodal)', sourceType, timestamp: new Date().toISOString() } 
                        })
                    };
                } catch (e: any) {
                    console.error("[MediaGen] TRANSCRIPTION Error:", e.message);
                    return { statusCode: 500, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: "Transcription Error", details: e.message, type: 'TRANSCRIPTION' }) };
                }
            }

            case 'VIDEO_GEN':
            case 'ANIMATE': {
                const isAnimate = type === 'ANIMATE';
                const { 
                    prompt, 
                    format = "Landscape", 
                    sourceImage,
                    cameraMotion,
                    resolution = "720p",
                    fps = 24,
                    styleReference,
                    subjectReference
                } = payload;

                // Brilliant Basics: enrich prompt before sending to Veo 3.1
                const enhancedVideoPrompt = await enhancePrompt(prompt || '', isAnimate ? 'ANIMATE' : 'VIDEO', {
                    platform: payload.platform,
                    objective: payload.objective,
                    brand: payload.brandContext || payload.brandProfile,
                });

                console.log(`[MediaGen] Requesting ${type} with Veo 3.1 via Vertex AI REST (v1)...`);
                
                try {
                    if (!vertexAvailable || !vertexProjectId) {
                        return {
                            statusCode: 400, headers: getCorsHeaders(event.headers.origin || event.headers.Origin),
                            body: JSON.stringify({
                                error: "Video (Veo 3.0 / 3.1) requiere credenciales Vertex AI — no hay fallback posible con API key de AI Studio. " +
                                    "En Netlify > Site configuration > Environment variables, configura: " +
                                    "GCP_PROJECT_ID, GCP_CLIENT_EMAIL, GCP_PRIVATE_KEY (o usa GCP_ENC_KEY con el archivo vertex-creds.enc). " +
                                    "Redespliega tras configurar."
                            })
                        };
                    }

                    // Veo 3.1 REQUIRES OAuth2 — API keys cause UNAUTHENTICATED 401
                    const accessToken = await getVertexToken();

                    // ── Veo Model Selection (Google I/O 2026, Mayo 19) ─────────────
                    // veo-3.0-generate-001: video + audio nativo sincronizado (GA)
                    // veo-3.0-fast-generate-001: menor latencia, sin audio sync
                    // veo-3.1-generate-001: legacy Vertex-only (mantenido como fallback)
                    const useVeo30 = true; // Activado: Veo 3.0 GA desde Google I/O 2026
                    const veoModelId = payload.fast === true
                        ? 'veo-3.0-fast-generate-001'
                        : 'veo-3.0-generate-001';
                    const veoEndpoint = `https://${vertexLocation}-aiplatform.googleapis.com/v1/projects/${vertexProjectId}/locations/${vertexLocation}/publishers/google/models/${veoModelId}:predictLongRunning`;
                    console.log(`[MediaGen] Using Veo model: ${veoModelId} (fast=${payload.fast ?? false})`);

                    // GCS bucket is optional — Veo 3.1 can return videos as inline base64 (confirmed ~1-2 MB).
                    // If GCP_VIDEO_BUCKET is set, videos are stored in GCS and a signed URL is returned.
                    // If not set, videos are returned as data URIs directly from Vertex AI.
                    const videoBucket = process.env.GCP_VIDEO_BUCKET; // e.g. "gs://my-bucket/videos/"

                    const requestBody: any = {
                        instances: [{ 
                            prompt: enhancedVideoPrompt || "Cinematic 8k commercial, professional lighting, photorealistic textures",
                            negativePrompt: payload.negativePrompt || "blurry, low quality, distorted anatomy, text artifacts, watermark, jittery motion"
                        }],
                        parameters: {
                            aspectRatio: formatToAspectRatio(format, isAnimate ? 'animate' : 'video'),
                            sampleCount: 1,
                            durationSeconds: (() => {
                                const d = typeof payload.duration === 'number' ? payload.duration : 
                                         typeof payload.durationSeconds === 'number' ? payload.durationSeconds : 6;
                                if (d <= 5) return 4;
                                if (d >= 7) return 8;
                                return 6;
                            })(),
                            resolution: resolution === "1080p" ? "1080p" : "720p",
                            fps: (fps === 24 || fps === 30 || fps === 60) ? fps : 24,
                            motionIntensity: (typeof payload.motionIntensity === 'number' ? Math.min(5, Math.max(0, payload.motionIntensity)) : 3),
                            addWatermark: false,
                            // Veo 3.1 specific cinematic controls
                            cameraMotionSpeed: payload.cameraMotionSpeed || "Standard",
                            enhancePrompt: true // Keep Vertex-level enhancement active as second layer
                        }
                    };

                    // Only add storageUri if bucket is configured
                    if (videoBucket) {
                        requestBody.parameters.storageUri = videoBucket;
                    }
                    console.log(`[MediaGen] Sending to Veo 3.1: ratio=${requestBody.parameters.aspectRatio}, duration=${requestBody.parameters.durationSeconds}s`);
                    // Full parameters log if super admin
                    if (isSuperAdmin) {
                        console.log(`[MediaGen SuperAdmin] Full Request Parameters:`, JSON.stringify(requestBody.parameters));
                    }

                    // Add Camera Motion if provided
                    if (cameraMotion && ["PAN", "TILT", "ZOOM", "DOLLY"].includes(cameraMotion.toUpperCase())) {
                        requestBody.parameters.cameraMotion = cameraMotion.toUpperCase();
                    }

                    // Add Style Reference if provided
                    if (styleReference) {
                        const styleMimeMatch = styleReference.match(/^data:(image\/[a-zA-Z+]+);base64,/);
                        const styleMimeType = styleMimeMatch ? styleMimeMatch[1] : 'image/jpeg';
                        const cleanStyleImage = styleReference.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
                        const finalStyleMime = (styleMimeType === 'image/webp') ? 'image/jpeg' : styleMimeType;
                        
                        requestBody.parameters.styleReference = {
                            image: { bytesBase64Encoded: cleanStyleImage, mimeType: finalStyleMime },
                            referencePower: (typeof payload.styleReferencePower === 'number' ? payload.styleReferencePower : 0.8)
                        };
                    }

                    // Add Subject Reference (Veo 3.1) if provided
                    if (subjectReference) {
                        const subMimeMatch = subjectReference.match(/^data:(image\/[a-zA-Z+]+);base64,/);
                        const subMimeType = subMimeMatch ? subMimeMatch[1] : 'image/jpeg';
                        const cleanSubImage = subjectReference.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
                        const finalSubMime = (subMimeType === 'image/webp') ? 'image/jpeg' : subMimeType;
                        
                        requestBody.parameters.subjectReference = {
                            image: { bytesBase64Encoded: cleanSubImage, mimeType: finalSubMime }
                        };
                        console.log(`[MediaGen] Added subjectReference to Veo 3.1`);
                    }

                    if (isAnimate && sourceImage) {
                        const mimeMatch = sourceImage.match(/^data:(image\/[a-zA-Z+]+);base64,/);
                        const originalMimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
                        
                        // Defensive block: Veo 3.1 strictly rejects WebP
                        if (originalMimeType === 'image/webp') {
                            console.warn(`[MediaGen] ${type} received WebP — potential failure at Vertex AI level if not converted by frontend.`);
                        }

                        const cleanImage = sourceImage.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
                        // Force mimeType to image/jpeg if it was webp, as Veo requires JPEG/PNG
                        const finalMimeType = (originalMimeType === 'image/webp') ? 'image/jpeg' : originalMimeType;
                        
                        console.log(`[MediaGen] Preparing ${type} request with mimeType: ${finalMimeType} (original: ${originalMimeType})`);
                        requestBody.instances[0].image = { bytesBase64Encoded: cleanImage, mimeType: finalMimeType };
                    }

                    // Veo 3.1 LRO — 22s hard timeout (Netlify max is ~26s)
                    const veoAbort = new AbortController();
                    const veoTimeout = setTimeout(() => veoAbort.abort(), 22000);
                    let veoRes: Response;
                    try {
                        veoRes = await fetch(veoEndpoint, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify(requestBody),
                            signal: veoAbort.signal,
                        });
                    } finally {
                        clearTimeout(veoTimeout);
                    }

                    if (!veoRes.ok) {
                        const errText = await veoRes.text();
                        // If it's a safety filter rejection (400 + usage guidelines), we return a 400
                        const isSafety = errText.toLowerCase().includes('usage guidelines') || errText.toLowerCase().includes('violate');
                        if (isSafety) {
                            return {
                                statusCode: 400,
                                headers: getCorsHeaders(event.headers.origin || event.headers.Origin),
                                body: JSON.stringify({ 
                                    error: "CONTENT_POLICY_VIOLATION", 
                                    details: errText,
                                    type: type 
                                })
                            };
                        }
                        throw new Error(`Veo 3.1 API returned ${veoRes.status}: ${errText}`);
                    }

                    const veoData = await veoRes.json();
                    console.log(`[MediaGen] Veo 3.1 operation started:`, JSON.stringify(veoData).substring(0, 200));

                    return {
                        statusCode: 200, headers: getCorsHeaders(event.headers.origin || event.headers.Origin),
                        body: JSON.stringify({ 
                            operationName: veoData.name, 
                            status: 'processing',
                            meta: { 
                                modelUsed: 'veo-3.1-generate-001 (Vertex AI v1)', 
                                accuracy: 'Cinematic Precision (Veo 3.1)', 
                                resolution: resolution === "1080p" ? "1080p (FHD)" : "720p (HD)",
                                camera: cameraMotion || "Static",
                                duration: `${requestBody.parameters.durationSeconds}s`
                            }
                        })
                    };
                } catch (e: any) {
                    console.error(`[MediaGen] ${type} Error:`, e.message);
                    // Differentiate between safety violations and other errors even in catch
                    if (e.message?.toLowerCase().includes('usage guidelines') || e.message?.toLowerCase().includes('violate')) {
                        return {
                            statusCode: 400,
                            headers: getCorsHeaders(event.headers.origin || event.headers.Origin),
                            body: JSON.stringify({ error: "CONTENT_POLICY_VIOLATION", details: e.message, type })
                        };
                    }
                    throw e;
                }
            }








            case 'VIDEO_STATUS': {
                const { operationName } = payload;
                if (!operationName) throw new Error("operationName is required for VIDEO_STATUS");

                try {
                    if (!vertexAvailable || !vertexProjectId) {
                        throw new Error("Vertex AI credentials not configured. Video status requires GCP_CLIENT_EMAIL + GCP_PRIVATE_KEY (or GOOGLE_CREDENTIALS_JSON).");
                    }

                    const accessToken = await getVertexToken();

                    // Veo 3.1 uses prediction resources, similar to 2.0.
                    // Derive model from operationName to support future veo-3.x models automatically.
                    const modelMatch = operationName.match(/\/publishers\/google\/models\/([^/]+)\//);
                    const veoModel = modelMatch?.[1] ?? 'veo-3.1-generate-001';
                    
                    // Use v1 endpoint for status
                    const statusEndpoint = `https://${vertexLocation}-aiplatform.googleapis.com/v1/projects/${vertexProjectId}/locations/${vertexLocation}/publishers/google/models/${veoModel}:fetchPredictOperation`;

                    // VIDEO_STATUS — 20s timeout per poll (keeps well under Netlify limit)
                    const statusAbort = new AbortController();
                    const statusTimeout = setTimeout(() => statusAbort.abort(), 20000);
                    let statusRes: Response;
                    try {
                        statusRes = await fetch(statusEndpoint, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ operationName }),
                            signal: statusAbort.signal,
                        });
                    } finally {
                        clearTimeout(statusTimeout);
                    }

                    if (!statusRes.ok) {
                        const errText = await statusRes.text();
                        throw new Error(`Vertex Operations API returned ${statusRes.status}: ${errText}`);
                    }

                    const statusData = await statusRes.json();
                    console.log(`[MediaGen] VIDEO_STATUS for ${operationName} resulted in:`, JSON.stringify(statusData).substring(0, 300));

                    if (statusData.done) {
                        if (statusData.error) {
                            // Detect safety rejection in status object
                            const isSafety = statusData.error.code === 3 || 
                                            JSON.stringify(statusData.error).toLowerCase().includes('usage guidelines');
                            if (isSafety) {
                                return {
                                    statusCode: 400,
                                    headers: getCorsHeaders(event.headers.origin || event.headers.Origin),
                                    body: JSON.stringify({ 
                                        error: "CONTENT_POLICY_VIOLATION", 
                                        details: statusData.error.message || "Rejected by Vertex AI safety filters.",
                                        type: 'VIDEO_STATUS'
                                    })
                                };
                            }
                            throw new Error(`Veo 3.1 error: ${JSON.stringify(statusData.error)}`);
                        }

                        // Confirmed production response structure (updated for 3.1):
                        // Note: there is NO wrapper "generateVideoResponse" typically, but it varies by SDK/REST.
                        const gcsUri: string | undefined = 
                            statusData.response?.videos?.[0]?.gcsUri ||
                            statusData.response?.generatedVideos?.[0]?.video?.uri ||
                            statusData.response?.outputs?.[0]?.uri ||
                            statusData.response?.uris?.[0];

                        const bytesBase64: string | undefined = 
                            statusData.response?.videos?.[0]?.bytesBase64Encoded ||
                            statusData.response?.generatedVideos?.[0]?.video?.bytesBase64Encoded;

                        if (!gcsUri && !bytesBase64) {
                            throw new Error(`Veo 3.1 completed but returned no videos in response. Raw response: ${JSON.stringify(statusData.response)}`);
                        }

                        const video = statusData.response?.videos?.[0] || statusData.response?.generatedVideos?.[0]?.video;

                        let videoUrl: string;
                        if (gcsUri) {
                            // Generate a V4 Signed URL (12h expiry) via IAM signBlob — bucket stays private.
                            // accessToken and vertexCreds are already in scope from this case block.
                            videoUrl = vertexCreds
                                ? await gcsSignedUrl(gcsUri, vertexCreds, accessToken, 43200, `video_veo3_${Date.now()}.mp4`)
                                : (gcsUri.startsWith('gs://') ? `https://storage.googleapis.com/${gcsUri.slice(5)}` : gcsUri);
                        } else if (bytesBase64) {
                            // No bucket configured — Vertex AI returned video bytes directly
                            const mimeType = video?.mimeType || 'video/mp4';
                            videoUrl = `data:${mimeType};base64,${bytesBase64}`;
                        } else {
                            throw new Error("Veo 3.1 returned video entry with neither gcsUri nor bytesBase64Encoded.");
                        }

                        return {
                            statusCode: 200, headers: getCorsHeaders(event.headers.origin || event.headers.Origin),
                            body: JSON.stringify({
                                url: videoUrl,
                                status: 'completed',
                                meta: { modelUsed: `${veoModel} (Vertex AI)`, storage: gcsUri ? 'gcs' : 'inline' }
                            })
                        };
                    }

                    return { statusCode: 200, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ status: 'processing' }) };
                } catch (e: any) {
                    console.error("[MediaGen] VIDEO_STATUS Error:", e.message);
                    throw e;
                }
            }


            case 'VIDEO_MASTER': {
                return {
                    statusCode: 200,
                    headers: getCorsHeaders(event.headers.origin || event.headers.Origin),
                    body: JSON.stringify({ 
                        success: true, 
                        message: "Video Mastering (Beta) initialized. This feature is currently in active development for V3.1.",
                        url: payload.videoUrl || null,
                        meta: { status: "WIP", version: "3.1-beta" }
                    })
                };
            }

            case 'PROMPT_SANITIZE': {
                const { prompt } = payload;
                if (!prompt) {
                    return { statusCode: 400, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: "Missing prompt" }) };
                }

                try {
                    const sanitized = await callGeminiApi({
                        model: 'gemini-2.5-flash',
                        contents: [{ role: 'user', parts: [{ text: `You are a creative advertising prompt engineer. The following prompt was rejected by Google Vertex AI's content safety filters. Rewrite it to achieve the same creative advertising objective while fully complying with Google's Responsible AI usage policies. Keep the same visual style, mood, composition, and commercial intent. Remove or rephrase any terms related to violence, weapons, drugs, alcohol, tobacco, sexual content, real people/celebrities, hate speech, or dangerous activities. Output ONLY the rewritten prompt, nothing else.

Rejected prompt:
${prompt}` }] }],
                        generationConfig: { temperature: 0.4 }
                    }).then(res => res.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '');

                    return {
                        statusCode: 200,
                        headers: getCorsHeaders(event.headers.origin || event.headers.Origin),
                        body: JSON.stringify({
                            text: sanitized,
                            isSanitized: true,
                            meta: { modelUsed: 'gemini-2.5-flash (Content Policy Sanitizer)' }
                        })
                    };
                } catch (e: any) {
                    console.error("[MediaGen] PROMPT_SANITIZE Error:", e.message);
                    return { statusCode: 500, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: e.message }) };
                }
            }

            case 'PROMPT_EXPAND': {
                const { prompt, mediaType = 'VIDEO', context = {}, noEnrich = false } = payload;
                if (!prompt) {
                    return { statusCode: 400, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: "Missing prompt" }) };
                }

                try {
                    let expandedText = prompt;
                    
                    if (noEnrich) {
                        expandedText = await callGeminiApi({
                            model: 'gemini-2.5-flash',
                            contents: [{ role: 'user', parts: [{ text: prompt }] }],
                            generationConfig: { temperature: 0.3 }
                        }).then(res => res.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || prompt);
                    } else {
                        // Standard enhancement using the Brilliant Basics system
                        expandedText = await enhancePrompt(prompt, mediaType.toUpperCase(), context);
                    }

                    return {
                        statusCode: 200,
                        headers: getCorsHeaders(event.headers.origin || event.headers.Origin),
                        body: JSON.stringify({ 
                            text: expandedText, 
                            isExpanded: expandedText !== prompt,
                            type: 'prompt_expand', 
                            meta: { modelUsed: 'gemini-2.5-flash (Brilliant Basics Engine)' } 
                        })
                    };
                } catch (e: any) {
                    console.error("[MediaGen] PROMPT_EXPAND Error:", e.message);
                    return { statusCode: 200, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ text: prompt, error: e.message }) };
                }
            }

            case 'AUDIO_GEN': {
                // Pipeline:
                // - Regular TTS: text → gemini-2.5-flash → audio
                // - Voice cloning: audio sample → gemini-2.5-flash (analyzes voice) → description text
                //                  → gemini-2.5-flash (TTS with voice description) → audio
                const {
                    text,
                    audioData,
                    voice = 'Aoede',
                    language = 'es',
                    dialect = 'Neutral',
                    tone = 'Professional',
                    emotion = 'Neutral',
                    pitch = 1.0,
                    speed = 1.0
                } = payload;

                const pitchDesc = pitch < 0.85 ? "lower than normal" : pitch > 1.15 ? "higher than normal" : "natural pitch";
                const speedDesc = speed < 0.8 ? "slow and deliberate" : speed > 1.3 ? "fast-paced" : "natural pace";

                // All 30 Gemini TTS prebuilt voices (same family as Google Cloud Chirp 3 HD)
                const VALID_VOICES = new Set([
                    'Zephyr','Puck','Charon','Kore','Fenrir','Leda','Orus','Aoede',
                    'Callirrhoe','Autonoe','Enceladus','Iapetus','Umbriel','Algieba','Despina',
                    'Algenib','Rasalgethi','Laomedeia','Achernar','Alnilam','Schedar','Gacrux',
                    'Pulcherrima','Achird','Zubenelgenubi','Vindemiatrix','Sadachbia','Sadaltager',
                    'Sulafat','Erinome',
                ]);
                const voiceName = VALID_VOICES.has(voice) ? voice : 'Aoede';

                // ── Step 1 (clone path): deep voice analysis + automatic voice matching ────────
                // Ask gemini-2.5-flash to:
                //   a) Extract detailed acoustic characteristics
                //   b) Pick the closest Gemini prebuilt voice from the 30-voice roster
                // This maximises perceptual similarity without true cloning.
                interface VoiceProfile {
                    closestVoice: string;
                    pitchRange: string;
                    paceWPM: number;
                    quality: string;
                    accent: string;
                    prosody: string;
                    gender: string;
                    age: string;
                    distinctiveTraits: string;
                }
                let profile: VoiceProfile | null = null;
                let matchedVoiceName = voiceName; // fallback to UI-selected voice

                if (audioData) {
                    try {
                        const mimeMatch = audioData.match(/^data:(audio\/[^;]+)/);
                        const sampleMime = mimeMatch ? mimeMatch[1] : 'audio/wav';
                        const cleanSample = audioData.replace(/^data:[^;]+(?:;[^;]+)*;base64,/, "");

                        const VOICE_ROSTER = [
                            'Zephyr','Puck','Charon','Kore','Fenrir','Leda','Orus','Aoede',
                            'Callirrhoe','Autonoe','Enceladus','Iapetus','Umbriel','Algieba','Despina',
                            'Algenib','Rasalgethi','Laomedeia','Achernar','Alnilam','Schedar','Gacrux',
                            'Pulcherrima','Achird','Zubenelgenubi','Vindemiatrix','Sadachbia','Sadaltager',
                            'Sulafat','Erinome',
                        ];

                        console.log(`[MediaGen] Clone step 1: deep voice analysis (${sampleMime})...`);
                        const analyzeResp = await callGeminiApi({
                            model: "gemini-2.5-flash",
                            contents: [{
                                role: 'user',
                                parts: [
                                    { inlineData: { data: cleanSample, mimeType: sampleMime } },
                                    { text: `You are a professional voice casting director and audio engineer.
Analyze the speaking voice in this audio sample with precision.
Return ONLY valid JSON — no markdown, no explanation.

Available Gemini TTS voices to match from (pick the single closest one):
${VOICE_ROSTER.join(', ')}

Voice characteristics reference:
- Zephyr/Autonoe/Laomedeia: Bright, energetic
- Puck/Callirrhoe/Sadachbia: Upbeat, casual
- Charon/Rasalgethi: Informative, authoritative
- Kore/Alnilam/Schedar: Firm, structured
- Fenrir: Excitable, dynamic
- Leda: Youthful, fresh
- Aoede/Umbriel: Breezy, easy-going
- Sulafat/Achird: Warm, friendly
- Achernar/Despina/Vindemiatrix: Soft, gentle
- Gacrux: Mature, experienced
- Enceladus: Breathy, airy
- Iapetus/Erinome: Clear, crisp
- Algieba: Smooth, polished
- Algenib: Gravelly, deep
- Pulcherrima: Forward, assertive
- Zubenelgenubi: Casual, conversational
- Sadaltager: Knowledgeable, expert

JSON schema:
{
  "closestVoice": "<one name from the roster above>",
  "pitchRange": "<e.g. 'low', 'medium-low', 'medium', 'medium-high', 'high'>",
  "paceWPM": <estimated words per minute as integer>,
  "quality": "<e.g. 'warm and resonant', 'slightly breathy', 'crisp and clear'>",
  "accent": "<language/region accent description>",
  "prosody": "<rhythm/intonation patterns>",
  "gender": "<'masculine' | 'feminine' | 'androgynous'>",
  "age": "<estimated age range, e.g. '25-35'>",
  "distinctiveTraits": "<any unique vocal markers>"
}` }
                                ]
                            }],
                            generationConfig: { responseMimeType: "application/json" }
                        });

                        const raw = analyzeResp.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '{}';
                        profile = JSON.parse(raw.replace(/```json\s*/g, '').replace(/```/g, '').trim());

                        // Use the AI-matched voice only if it's valid
                        if (profile?.closestVoice && VALID_VOICES.has(profile.closestVoice)) {
                            matchedVoiceName = profile.closestVoice;
                        }
                        console.log(`[MediaGen] Voice profile: closest=${matchedVoiceName} pitch=${profile?.pitchRange} pace=${profile?.paceWPM}wpm quality=${profile?.quality}`);
                    } catch (analyzeErr: any) {
                        console.warn(`[MediaGen] Voice analysis failed, using UI voice (${voiceName}): ${analyzeErr.message}`);
                    }
                }


                // ── Step 2: Build the 4-part TTS prompt (Google's recommended format) ──────────
                // [Voice Profile] → [Scene] → [Director's Notes] → [Transcript]
                // This structure gives Gemini TTS the most context to match a voice style.
                let audioPrompt: string;

                if (profile) {
                    audioPrompt = [
                        `[Voice Profile] ${profile.gender === 'feminine' ? 'Female' : profile.gender === 'masculine' ? 'Male' : 'Neutral'} voice, ${profile.age} years old. ${profile.quality}. ${profile.accent} accent. Pitch: ${profile.pitchRange}. Natural speaking pace around ${profile.paceWPM} words per minute. ${profile.distinctiveTraits}`,
                        `[Scene] Professional voice-over recording in a quiet, treated studio.`,
                        `[Director's Notes] ${profile.prosody}. Tone: ${tone}. Emotion: ${emotion}. Speaking rate: ${speedDesc}. Pitch adjustment: ${pitchDesc}. Match the described voice characteristics as closely as possible. Language: ${language}, ${dialect} dialect.`,
                        `[Transcript] ${text}`,
                    ].join('\n');
                } else {
                    // Standard TTS (no clone) — still use the 4-part format for best quality
                    audioPrompt = [
                        `[Voice Profile] Professional voice-over artist. ${tone} delivery. Natural, clear articulation.`,
                        `[Scene] Professional recording studio.`,
                        `[Director's Notes] Tone: ${tone}. Emotion: ${emotion}. Speaking rate: ${speedDesc}. Pitch: ${pitchDesc}. Language: ${language}, ${dialect} dialect. Speak with warmth and clarity.`,
                        `[Transcript] ${text}`,
                    ].join('\n');
                }

                const finalVoiceName = audioData ? matchedVoiceName : voiceName;
                console.log(`[MediaGen] Clone step 2: TTS voice=${finalVoiceName} clone=${!!audioData}`);

                const response = await callGeminiApi({
                    model: "gemini-2.5-flash",
                    contents: [{ role: 'user', parts: [{ text: audioPrompt }] }],
                    generationConfig: {
                        response_modalities: ["AUDIO"],
                        speech_config: {
                            voice_config: {
                                prebuilt_voice_config: { voice_name: finalVoiceName }
                            }
                        }
                    } as any
                });

                if (!response?.candidates?.length || !response.candidates[0]?.content?.parts?.length) {
                    console.error("[MediaGen] AUDIO_GEN: invalid TTS response:", JSON.stringify(response).substring(0, 300));
                    throw new Error("Gemini TTS did not return audio content.");
                }

                const audioPart = response.candidates[0].content.parts.find((p: any) => p.inline_data || p.inlineData);
                const inlineData = audioPart?.inline_data || audioPart?.inlineData;
                if (!inlineData?.data) {
                    console.error("[MediaGen] AUDIO_GEN: no audio bytes:", JSON.stringify(response.candidates[0].content.parts).substring(0, 300));
                    throw new Error("Gemini TTS returned no audio bytes. Try a shorter text or different voice.");
                }

                // Gemini TTS returns raw PCM (24kHz, 16-bit, mono) — not a valid WAV file.
                // We must prepend the 44-byte RIFF/WAV header so browsers can play it.
                const rawMime = inlineData.mime_type || inlineData.mimeType || '';
                const isPcm = rawMime.includes('pcm') || rawMime.includes('L16') || !rawMime.includes('wav');
                const wavBase64 = isPcm
                    ? pcmBase64ToWavBase64(inlineData.data)
                    : inlineData.data;

                return {
                    statusCode: 200,
                    headers: getCorsHeaders(event.headers.origin || event.headers.Origin),
                    body: JSON.stringify({
                        url: `data:audio/wav;base64,${wavBase64}`,
                        meta: { 
                            modelUsed: 'gemini-2.5-flash (Multimodal TTS)', 
                            voice: finalVoiceName, 
                            cloned: !!audioData, 
                            voiceProfile: profile 
                        }
                    })
                };
            }

            case 'RESEARCH': {
                const { query = '', language: lang = 'es', brandContext } = payload;
                const queryLower = query.toLowerCase();

                // ── 2. Platform Intelligence Injection ──────────────────────────────────
                let platformIntel = "";
                if (queryLower.includes('meta') || queryLower.includes('facebook') || queryLower.includes('instagram')) {
                    platformIntel = `\n### 📘 META INTELLIGENCE (GROUNDING)
- Performance 5 Framework: CAPI, Broad Targeting, Advantage+, Creative Diversification.
- Best Practices: Mobile-first, sound-on/off, 15s max, "Brand Fast" (first 3s).`;
                } else if (queryLower.includes('google') || queryLower.includes('youtube') || queryLower.includes('pmax')) {
                    platformIntel = `\n### 📗 GOOGLE/YOUTUBE INTELLIGENCE (GROUNDING)
- YouTube ABCD: Attract (Pace/Framing), Brand (Audio/Visual), Connect (Emotion/Persona), Direct (Clear CTA).
- Performance Max (PMax): Asset-heavy approach, audience signals, value-based bidding.`;
                } else if (queryLower.includes('tiktok')) {
                    platformIntel = `\n### 🎵 TIKTOK INTELLIGENCE (GROUNDING)
- "Don't Make Ads, Make TikToks": Authentic, lo-fi aesthetic, native editing.
- Loop Strategy: Hook in 2s, vertical focus, vertical editing.`;
                }

                // ── 3. Brand Context Integration ────────────────────────────────────────
                let brandData = "No hay perfil de marca específico. Realiza un análisis general de la industria.";
                if (brandContext?.brandName) {
                    brandData = `
### 🛡️ BRAND DNA (CONTEXTO DEL CLIENTE)
- Marca: ${brandContext.brandName}
- Industria: ${brandContext.industry || 'N/A'}
- Propuesta de Valor: ${brandContext.valueProposition || 'N/A'}
- Audiencia Objetivo: ${brandContext.targetAudience || 'N/A'}
- Tono de Voz: ${brandContext.toneOfVoice || 'N/A'}
Instrucción: Cruza los hallazgos del mercado con este ADN para dar recomendaciones personalizadas y accionables.`;
                }

                const researchPrompt = `Eres "MarketIntel AI", un Senior Strategy Partner e Investigador de Mercado Científico (estilo McKinsey/Gartner).
Tu misión es producir un reporte de inteligencia estratégica de ALTA FIDELIDAD con razonamiento profundo (Deep Thinking).

QUERY DEL USUARIO: "${query}"
IDIOMA DE RESPUESTA: ${lang === 'es' ? 'Español' : 'English'}
${brandData}
${platformIntel}

### ═══ PROTOCOLO DE RIGOR CIENTÍFICO (VERITAS) ═══
1. **Razonamiento Primero (Deep Thinking)**: Antes de dar el dato, analiza la situación, complicaciones y la lógica de mercado.
2. **SOLO datos verificados en tiempo real**: Usa ÚNICAMENTE datos encontrados por Google Search Grounding en esta sesión. NO inventes ni simules cifras.
3. **Jerarquía de Fuentes**: Prioriza Tiers 1 (Statista, Kantar, Nielsen) y Tiers 2 (Organismos Internacionales). 
4. **Cita inline obligatoria**: Cada cifra o tendencia debe llevar su referencia [1], [2], [3] vinculada a Grounding.
5. **Contexto Geográfico**: Si no hay datos específicos del país, busca benchmarks regionales (LATAM/Global) y acláralo.

### REGLA BILINGÜE CRÍTICA
Responde en ${lang === 'es' ? 'Español' : 'English'}, pero los términos técnicos SIEMPRE en INGLÉS (TAM, SAM, CAGR, AdSpend, CPC, ROAS, Funnel).

### ESTRUCTURA DE REPORTE (XML TAGS)
Devuelve el reporte con estos bloques exactos:

<TITLE>
Título profesional y ejecutivo del reporte.
</TITLE>

<TLDR>
Executive Summary (estilo C-Level). 3 "Key Takeaways" estratégicos y su impacto en el ROI de ${brandContext?.brandName || 'la marca'}.
</TLDR>

<RESEARCH_BODY>
## I. Strategic Situation Analysis
[Contexto de mercado y tendencias dominantes 2025/2026. Razonamiento sobre por qué está ocurriendo esto.]

## II. Market Dynamics & Quantified Benchmarks
[TAM/SAM, CAGR. Benchmarks de Ad Performance (CTR, CPC, ROAS) específicos del sector.]

## III. Competitive Edge & Hypothesis
[Análisis MECE de la competencia. Hipótesis de crecimiento para ${brandContext?.brandName || 'el cliente'}.]

## IV. Roadmap de Implementación (Next Steps)
[Recomendaciones accionables priorizadas por impacto vs esfuerzo.]
</RESEARCH_BODY>

<SCIENTIFIC_VERACITY>
- Strategic Veracity Score: [0-100]
- Source Reliability: [High/Medium/Low]
- Data Grounding: [Yes/No]
- Methodology: [Explicación breve de la búsqueda realizada]
</SCIENTIFIC_VERACITY>`;

                // ── RESEARCH Model ──────────────────────────────────────────
                // gemini-2.5-flash is the primary model for grounding.
                let result: any;
                try {
                    result = await callGeminiApi({
                        model: "gemini-2.5-flash",
                        contents: [{ role: 'user', parts: [{ text: researchPrompt }] }],
                        tools: [{ googleSearch: {} }],
                        generationConfig: {
                            temperature: 0.1,
                            maxOutputTokens: 1500
                        }
                    });
                } catch (err: any) {
                    const timeRemaining1 = 24000 - (Date.now() - startTime);
                    if (timeRemaining1 < 5000) {
                        throw new Error(`Timeout inside Research fallback: ${err.message}`);
                    }
                    console.warn(`[Research] gemini-2.5-flash failed (${err.message}), falling back to 1.5-flash. Time remaining: ${timeRemaining1}ms`);
                    try {
                        result = await callGeminiApi({
                            model: "gemini-1.5-flash",
                            contents: [{ role: 'user', parts: [{ text: researchPrompt }] }],
                            tools: [{ googleSearch: {} }]
                        });
                    } catch (fallbackErr: any) {
                        throw new Error(`Research AI failed on all models: ${fallbackErr.message}`);
                    }
                } // end catch gemini-2.5-flash

                const candidate = result.candidates?.[0];
                const parts = candidate?.content?.parts || [];
                const text = parts.find((p: any) => p.text && !p.thought)?.text || "";
                const thinking = parts.find((p: any) => p.thought)?.text || "";
                const rawChunks: any[] = candidate?.groundingMetadata?.groundingChunks || [];
                const sources = rawChunks
                    .filter((c: any) => c.web?.uri)
                    .map((c: any, idx: number) => ({
                        index: idx + 1,
                        title: c.web?.title || (() => { try { return new URL(c.web.uri).hostname.replace('www.',''); } catch { return 'Source'; } })(),
                        url: c.web.uri,
                    }));

                const rawSupports: any[] = candidate?.groundingMetadata?.groundingSupports || [];
                const citationMap = rawSupports
                    .filter((s: any) => s.groundingChunkIndices?.length > 0)
                    .map((s: any) => ({
                        segment: s.segment?.text || '',
                        sourceIndices: (s.groundingChunkIndices as number[]).map((i: number) => i + 1),
                        confidence: s.confidenceScores?.[0] ?? null,
                    }));

                const seenUrls = new Set<string>();
                const uniqueSources = sources.filter((s: { url: string }) => {
                    if (seenUrls.has(s.url)) return false;
                    seenUrls.add(s.url);
                    return true;
                });

                // ── 4. Run richContent extraction + scientific validation IN PARALLEL ──────
                // Running both concurrently reduces total latency by ~50% and avoids timeout.
                // WE MUST PREVENT 504 TIMEOUT: Check how much time we have left!
                const timePassed = Date.now() - startTime;
                const timeRemaining = 24000 - timePassed;
                
                let richContentResult: any = { status: 'rejected', reason: { message: 'Skipped due to timeout limits' } };
                let scientificValidationResult: any = { status: 'fulfilled', value: null };
                
                if (timeRemaining > 8000) {
                    const structurePrompt = `Extrae datos cuantitativos y tablas del reporte para un dashboard de inteligencia competitiva.
### REGLAS DE INTEGRIDAD (VERITAS):
1. **SOLO extrae datos que tengan una cita [N] explícita** vinculada a Grounding.
2. Formato: Genera al menos 2 gráficos (bar/line/pie) si hay datos temporales o comparativos.
3. Métricas: Extrae KPIs clave (CAGR, TAM, CPC, CTR) como métricas individuales.

Devuelve SOLO JSON:
{ 
  "metrics": [{ "label": string, "value": string, "source": string, "trend": "up"|"down"|"stable" }], 
  "chartData": [{ "title": string, "type": "bar"|"line"|"pie", "unit": string, "series": [{ "label": string, "value": number, "color": string }] }], 
  "tables": [{ "title": string, "headers": string[], "rows": any[][] }] 
}

TEXTO DEL REPORTE:
${text.slice(0, 6000)}`;

                    const results = await Promise.allSettled([
                        // Only extract rich content if we have grounded sources to justify it
                        uniqueSources.length > 0
                            ? callGeminiApi({
                                    model: 'gemini-2.5-flash',
                                    contents: [{ role: 'user', parts: [{ text: structurePrompt }] }],
                                    generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
                                }).then((r: any) => {
                                    const rawText = (r.candidates?.[0]?.content?.parts?.[0]?.text || '{}')
                                        .replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
                                    return JSON.parse(rawText);
                                })
                            : Promise.resolve({ metrics: [], chartData: [], tables: [] }),
                        // Scientific validation (pure local computation, no extra API call)
                        validateResearchPackage({ text, sources: uniqueSources, citationMap })
                    ]);
                    richContentResult = results[0];
                    scientificValidationResult = results[1];
                } else {
                    console.warn(`[Research] Skipping richContent/validation to avoid 504 Timeout. Time remaining: ${timeRemaining}ms`);
                }

                const richContent = richContentResult.status === 'fulfilled'
                    ? richContentResult.value
                    : { metrics: [], chartData: [], tables: [] };

                if (richContentResult.status === 'rejected') {
                    console.warn('[Research] richContent extraction failed:', (richContentResult as any).reason?.message);
                }

                let scientificValidation: any = null;
                if (scientificValidationResult.status === 'fulfilled' && scientificValidationResult.value) {
                    scientificValidation = scientificValidationResult.value;
                    console.log('[Research Validation]', {
                        tier: scientificValidation?.validation?.veracity?.tier,
                        score: scientificValidation?.validation?.veracity?.overall,
                        ready: scientificValidation?.ready,
                    });
                } else {
                    console.warn('[Research] Validation failed:', (scientificValidationResult as any).reason?.message);
                }

                return {
                    statusCode: 200,
                    headers: getCorsHeaders(event.headers.origin || event.headers.Origin),
                    body: JSON.stringify({
                        text,
                        thinking,
                        sources: uniqueSources,
                        citationMap,
                        richContent,
                        veracity: scientificValidation?.validation?.veracity,
                        dataIntegrity: scientificValidation?.validation?.dataIntegrity,
                        sourceTiers: scientificValidation?.sourceTiers,
                        validationReady: scientificValidation?.ready,
                        type: 'research',
                        meta: {
                            modelUsed: 'gemini-2.5-flash (Scientific Hybrid)',
                            sourceCount: uniqueSources.length,
                            hasThinking: !!thinking,
                            verificationEnabled: !!scientificValidation,
                        }
                    })
                };
            }



            case 'THINKING': {
                const { prompt, language: lang = 'es', brandContext } = payload;
                
                let brandData = "No hay perfil de marca específico.";
                if (brandContext?.brandName) {
                    brandData = `\n### BRAND DNA: ${brandContext.brandName} (${brandContext.industry}). VP: ${brandContext.valueProposition}.`;
                }

                const thinkingPrompt = `Eres un Senior Strategy Partner de INsitu AI Ads (estilo McKinsey/BCG).
Analiza este caso con razonamiento profundo (Deep Thinking) orientado a resultados de negocio.

QUERY DEL USUARIO: "${prompt}"
${brandData}

### ESTRUCTURA ESTRATÉGICA REQUERIDA (SCQA + MECE):
1. **SITUATION (Contexto)**: Estado actual, variables macro y micro del mercado.
2. **COMPLICATION (El Reto)**: El cuello de botella o problema central detectado.
3. **QUESTION (La Pregunta Clave)**: ¿Qué debemos resolver para ganar?
4. **THINKING PROCESS (Razonamiento Crítico)**:
   - Aplica el principio MECE (Mutuamente Excluyentes, Colectivamente Exhaustivos).
   - Hypothesis Tree: Explora y descarta opciones mediante lógica inductiva/deductiva.
5. **ANSWER (Recomendación Táctica)**:
   - Strategic Pivot: El camino recomendado.
   - Action Plan: Pasos inmediatos en pauta (CPC, ROAS, Funnel optimization).

REGLA: Responde en ${lang === 'es' ? 'Español' : 'English'}, pero mantén los términos técnicos en INGLÉS.`;

                // gemini-2.5-flash is the 2026 standard for high-veracity deep thinking.
                let result: any;
                try {
                    result = await callGeminiApi({
                        model: "gemini-2.5-flash",
                        contents: [{ role: 'user', parts: [{ text: thinkingPrompt }] }],
                        generationConfig: {
                            temperature: 0.7, // Higher temperature for more creative strategy
                            thinkingConfig: {
                                includeThoughts: true,
                                thinkingBudget: 2048 // Reduced from 16384 to prevent Netlify 26s timeout
                            }
                        }
                    });
                } catch (err: any) {
                    console.warn(`[Thinking] gemini-2.5-flash failed (${err.message}), falling back to 2.0-flash`);
                    result = await callGeminiApi({
                        model: "gemini-2.5-flash",
                        contents: [{ role: 'user', parts: [{ text: thinkingPrompt }] }],
                        generationConfig: {
                            temperature: 0.7
                        }
                    });
                }

                const candidate = result.candidates?.[0];
                const parts = candidate?.content?.parts || [];
                const text = parts.find((p: any) => p.text && !p.thought)?.text || "";
                const thinking = parts.find((p: any) => p.thought)?.text || "";

                return {
                    statusCode: 200,
                    headers: getCorsHeaders(event.headers.origin || event.headers.Origin),
                    body: JSON.stringify({ 
                        text, 
                        thinking, 
                        type: 'thinking',
                        meta: { 
                            modelUsed: 'gemini-2.5-flash (Deep Strategic Reasoning)',
                            hasThinking: !!thinking,
                            budgetUsed: 16384
                        }
                    })
                };
            }

            case 'BRAND_PDF_ANALYZE': {
                const { pdfBase64, language: lang = 'es' } = payload;
                if (!pdfBase64) {
                    return { statusCode: 400, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: "No PDF data provided" }) };
                }

                const cleanPdf = pdfBase64.replace(/^data:application\/pdf;base64,/, "");
                
                const extractPrompt = `Eres un experto en Branding y Estrategia de Marca. Tu tarea es analizar este Brandbook o Manual de Identidad en PDF y extraer su "ADN de Marca" con precisión quirúrgica.

OBJETIVO: Rellenar un perfil de marca para una plataforma de IA publicitaria.

INSTRUCTIONS:
1. Analiza cuidadosamente el texto y los elementos visuales descritos en el PDF.
2. Identifica el nombre, industria, valores, audiencia y tono.
3. Extrae reglas de cumplimiento (Compliance) y directrices visuales.
4. Responde ÚNICAMENTE en formato JSON válido con el esquema exacto proporcionado abajo.
5. El idioma de los valores extraídos debe ser: ${lang === 'es' ? 'Español' : 'Inglés'}.

ESQUEMA JSON REQUERIDO:
{
  "brandName": "Nombre oficial de la marca",
  "industry": "Sector o industria (ej: Moda, SaaS B2B, Fintech)",
  "valueProposition": "Propuesta de valor principal o misión resumida",
  "targetAudience": "Descripción detallada del buyer persona o público objetivo",
  "toneOfVoice": "Descripción del tono (ej: Profesional, Empático, Disruptivo, Luxury)",
  "keyMessages": ["Mensaje clave 1", "Mensaje clave 2", "Mensaje clave 3"],
  "visualGuidelines": "Resumen de reglas visuales, estilo fotográfico y uso de marca",
  "brandColors": "Colores principales en formato HEX (ej: #FF0000, #000000) o nombres descriptivos",
  "typography": "Fuentes primarias y secundarias mencionadas",
  "complianceRules": "Reglas de seguridad de marca, términos prohibidos o restricciones legales"
}

Si un dato no es explícito, infiéretelo inteligentemente basándote en el contexto del documento.`;

                try {
                    const response = await callGeminiApi({
                        model: "gemini-2.5-flash",
                        contents: [{
                            role: 'user',
                            parts: [
                                { inlineData: { data: cleanPdf, mimeType: "application/pdf" } },
                                { text: extractPrompt }
                            ]
                        }],
                        generationConfig: { 
                            responseMimeType: "application/json",
                            temperature: 0.2
                        }
                    });

                    let brandData = {};
                    const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
                    try {
                        const cleanText = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
                        brandData = JSON.parse(cleanText);
                        console.log(`[MediaGen] BRAND_PDF_ANALYZE: Successfully extracted brand data for "${(brandData as any).brandName || 'Unknown'}"`);
                    } catch (parseErr: any) {
                        console.error("[MediaGen] BRAND_PDF_ANALYZE JSON parse error:", parseErr.message, "Raw text:", rawText.substring(0, 200));
                        // Fallback: try to extract JSON using regex if parse failed
                        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            try {
                                brandData = JSON.parse(jsonMatch[0]);
                            } catch { /* nested fallback failed */ }
                        }
                    }
                    
                    return {
                        statusCode: 200,
                        headers: getCorsHeaders(event.headers.origin || event.headers.Origin),
                        body: JSON.stringify({ 
                            brandData, 
                            type: 'brand_pdf',
                            meta: { 
                                modelUsed: 'gemini-2.5-flash',
                                status: Object.keys(brandData).length > 2 ? 'success' : 'partial_extraction'
                            }
                        })
                    };
                } catch (aiErr: any) {
                    console.error("[MediaGen] BRAND_PDF_ANALYZE AI error:", aiErr.message);
                    return { 
                        statusCode: 500, 
                        headers: getCorsHeaders(event.headers.origin || event.headers.Origin), 
                        body: JSON.stringify({ error: `AI extraction failed: ${aiErr.message}` }) 
                    };
                }
            }

            case 'VOICE_ANALYZE': {
                const { audioData } = payload;
                // Extract base MIME type (e.g. "audio/webm" from "data:audio/webm;codecs=opus;base64,...")
                const mimeMatch = audioData.match(/^data:(audio\/[^;]+)/);
                const actualMimeType = mimeMatch ? mimeMatch[1] : 'audio/wav';
                // Strip entire data URL header including any extra params like codecs=opus
                const cleanAudio = audioData.replace(/^data:[^;]+(?:;[^;]+)*;base64,/, "");
                const response = await callGeminiApi({
                    model: "gemini-2.5-flash",
                    contents: [{
                        role: 'user',
                        parts: [
                            { inlineData: { data: cleanAudio, mimeType: actualMimeType } },
                            { text: `You are a professional voice casting director and audio engineer.
Analyze the speaking voice in this audio sample and return ONLY valid JSON — no markdown, no explanation.

Required JSON schema (all fields mandatory):
{
  "gender": "<'Masculina' | 'Femenina' | 'Andrógina'>",
  "age": "<estimated age range, e.g. '25-35'>",
  "tone": "<dominant tone, e.g. 'Professional', 'Casual', 'Authoritative', 'Warm', 'Energetic'>",
  "tempo": <estimated words per minute as integer>,
  "pitchRange": "<'Grave' | 'Medio-grave' | 'Medio' | 'Medio-agudo' | 'Agudo'>",
  "clarity": <clarity score from 0 to 100 as integer>,
  "accent": "<detected language/region accent, e.g. 'Español neutro', 'Inglés americano', 'Español mexicano'>",
  "quality": "<brief description of voice texture, e.g. 'warm and resonant', 'slightly breathy', 'crisp and clear'>",
  "distinctiveTraits": "<any unique vocal markers, e.g. 'soft vibrato', 'authoritative cadence', 'fast pacing'>"
}` }
                        ]
                    }],
                    generationConfig: { responseMimeType: "application/json" }
                });

                let voiceProfile = {};
                try {
                    const cleanText = (response.candidates?.[0]?.content?.parts?.[0]?.text || "{}").replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
                    voiceProfile = JSON.parse(cleanText);
                } catch (e) {
                    console.error("[MediaGen] VOICE_ANALYZE JSON parse error:", e.message);
                }

                return {
                    statusCode: 200,
                    headers: getCorsHeaders(event.headers.origin || event.headers.Origin),
                    body: JSON.stringify({ 
                        voiceProfile, 
                        type: 'voice_analyze',
                        meta: { modelUsed: 'gemini-2.5-flash (AI Studio)' }
                    })
                };
            }

            case 'AUDIO_SCRIPT_GEN': {
                const { prompt: userBrief, brandContext } = payload;
                if (!userBrief) {
                    return { statusCode: 400, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: "Missing prompt" }) };
                }

                const brandSection = brandContext
                    ? `\n${brandContext}\nApply the brand context above strictly when writing the script (tone, values, audience, key messages).\n`
                    : '';

                const scriptPrompt = `You are an expert copywriter and voice director for professional audio ads.
Apply these Brilliant Basics to craft a high-conversion voiceover script:
- HOOK: Lead with a strong verbal hook in the FIRST 5 WORDS (pain point question, striking statistic, or direct benefit)
- STRUCTURE: Hook → Core Benefit → Social Proof or Reason-to-Believe → Single clear CTA
- PACING: Write for 130-150 WPM persuasive delivery; use short punchy sentences; add a natural pause before the CTA
- PLATFORM TONE: Match tone to context — urgent/authoritative (Google Search/B2B), warm/aspirational (Meta/Instagram), casual/authentic (TikTok/YouTube)
- ONE MESSAGE: Focus on a single core benefit — never stack 3 benefits in one script
${brandSection}
User brief: "${userBrief}"

Return ONLY valid JSON (no markdown fences, no extra text) with this exact schema:
{
  "text": "<the voiceover script, natural conversational prose, max 200 words, in the same language the user wrote the brief>",
  "voice": "<one of: Puck, Charon, Kore, Fenrir, Zephyr, Leda, Aoede, Orus, Sulafat, Achird, Achernar, Gacrux, Schedar, Rasalgethi, Iapetus, Erinome, Vindemiatrix>",
  "tone": "<one of: Professional, Warm, Enthusiastic, Calm, Urgent, Authoritative, Casual, Inspirational, Mysterious, Luxury, Youthful, Newscast, Documentary, Corporate>",
  "emotion": "<one of: Neutral, Happy, Serious, Excited, Melancholic, Surprised, Confident, Empathetic, Playful, Tense, Nostalgic, Proud>",
  "language": "<one of: Spanish, English, Portuguese, French, German>",
  "dialect": "<most appropriate regional dialect for the chosen language, e.g. 'Español (España)', 'Español (México)', 'English (US)', 'English (UK)', etc.>"
}`;

                const result = await callGeminiApi({
                    model: "gemini-2.5-flash",
                    contents: [{ role: 'user', parts: [{ text: scriptPrompt }] }],
                    generationConfig: { responseMimeType: "application/json" }
                });

                let script = null;
                try {
                    const rawText = (result.candidates?.[0]?.content?.parts?.[0]?.text || '{}')
                        .replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
                    script = JSON.parse(rawText);
                } catch (e: any) {
                    console.error("[MediaGen] AUDIO_SCRIPT_GEN JSON parse error:", e.message);
                    return { statusCode: 500, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: "Failed to parse AI script response" }) };
                }

                return {
                    statusCode: 200,
                    headers: getCorsHeaders(event.headers.origin || event.headers.Origin),
                    body: JSON.stringify({ script, type: 'audio_script_gen', meta: { modelUsed: 'gemini-2.5-flash' } })
                };
            }

            case 'VERTEX_DIAG': {
                // Use the early-resolved config if available, otherwise try once more
                const creds = vertexCreds || await getVertexConfig().catch(() => null);
                const projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT_ID || (creds?.project_id) || '';
                const location  = process.env.GCP_LOCATION || (creds?.location) || 'us-central1';

                let tokenStatus = 'not_tested';
                let tokenError  = '';
                if (creds) {
                    try {
                        const token = await getVertexToken();
                        tokenStatus = token ? `ok (${token.length} chars)` : 'empty';
                    } catch (e: any) {
                        tokenStatus = 'error';
                        tokenError  = e.message;
                    }
                }

                return {
                    statusCode: 200,
                    headers: getCorsHeaders(event.headers.origin || event.headers.Origin),
                    body: JSON.stringify({
                        status: tokenStatus,
                        diag: {
                            GCP_PROJECT_ID:    projectId ? `✅ set (${projectId})` : '❌ missing',
                            GCP_LOCATION:      location,
                            GCP_CLIENT_EMAIL:  creds?.client_email ? `✅ ${creds.client_email}` : '❌ missing',
                            GCP_PRIVATE_KEY:   creds?.private_key ? `✅ set (${creds.private_key.length} chars)` : '❌ missing',
                            credsSource:       creds ? "Resolved (DB/Env)" : "Not Resolved",
                            tokenTest:         tokenStatus,
                            tokenError:        tokenError || undefined,
                            vertexAvailable:   !!(creds && projectId),
                        }
                    })
                };
            }

            case 'URL_EXTRACT': {
                const { url: targetUrl } = payload;
                if (!targetUrl) {
                    return { statusCode: 400, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: "Missing url" }) };
                }

                // Validate URL
                let parsedUrl: URL;
                try { parsedUrl = new URL(targetUrl); } catch {
                    return { statusCode: 400, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: "URL inválida. Asegúrate de incluir https://" }) };
                }
                if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                    return { statusCode: 400, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: "Solo se permiten URLs http/https" }) };
                }

                // Fetch the page server-side (no CORS issues from Netlify)
                let html = '';
                try {
                    console.log(`[MediaGen] URL_EXTRACT: Fetching ${targetUrl}...`);
                    const pageResp = await fetch(targetUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (compatible; INsituBot/1.0; +https://insitu.ai)',
                            'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
                            'Accept-Language': 'es,en;q=0.9',
                        },
                        signal: AbortSignal.timeout(8000),
                    });
                    
                    if (!pageResp.ok) {
                        console.error(`[MediaGen] URL_EXTRACT: Fetch failed for ${targetUrl} (Status: ${pageResp.status})`);
                        if (pageResp.status === 401 || pageResp.status === 403) {
                            return { 
                                statusCode: 422, 
                                headers: getCorsHeaders(event.headers.origin || event.headers.Origin), 
                                body: JSON.stringify({ error: "Esta URL está protegida, requiere inicio de sesión o tiene acceso restringido." }) 
                            };
                        }
                        if (pageResp.status === 404) {
                            return { 
                                statusCode: 422, 
                                headers: getCorsHeaders(event.headers.origin || event.headers.Origin), 
                                body: JSON.stringify({ error: "La página no fue encontrada (Error 404). Verifica que la URL sea correcta." }) 
                            };
                        }
                        return { 
                            statusCode: 422, 
                            headers: getCorsHeaders(event.headers.origin || event.headers.Origin), 
                            body: JSON.stringify({ error: `No se pudo acceder a la página (Error HTTP ${pageResp.status})` }) 
                        };
                    }
                    html = await pageResp.text();
                } catch (fetchErr: any) {
                    const isTimeout = fetchErr.name === 'TimeoutError' || fetchErr.message?.includes('timeout');
                    console.error(`[MediaGen] URL_EXTRACT: fetch error for ${targetUrl}:`, fetchErr.message);
                    return { 
                        statusCode: 422, 
                        headers: getCorsHeaders(event.headers.origin || event.headers.Origin), 
                        body: JSON.stringify({ 
                            error: isTimeout 
                                ? "La conexión con el sitio web tardó demasiado. Intenta con una URL más rápida o verifica que el sitio esté activo." 
                                : `No pudimos conectarnos al sitio web. Detalle: ${fetchErr.message}` 
                        }) 
                    };
                }

                // ── Extract meta/og tags FIRST (critical for SPAs like React/Next/Vite) ──
                // SPA HTML shells have almost no visible text but do have og: and meta tags.
                const extractMeta = (name: string): string => {
                    const patterns = [
                        new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']{3,})["']`, 'i'),
                        new RegExp(`<meta[^>]+content=["']([^"']{3,})["'][^>]+(?:name|property)=["']${name}["']`, 'i'),
                    ];
                    for (const re of patterns) {
                        const m = html.match(re);
                        if (m?.[1]) return m[1].trim();
                    }
                    return '';
                };

                const ogTitle       = extractMeta('og:title')       || extractMeta('twitter:title');
                const ogDesc        = extractMeta('og:description')  || extractMeta('twitter:description') || extractMeta('description');
                const ogSiteName    = extractMeta('og:site_name');
                const ogKeywords    = extractMeta('keywords');
                const pageTitle     = html.match(/<title[^>]*>([^<]{2,})<\/title>/i)?.[1]?.trim() || '';

                const metaSummary = [
                    pageTitle   ? `Título: ${pageTitle}`    : '',
                    ogSiteName  ? `Sitio: ${ogSiteName}`    : '',
                    ogTitle     ? `OG Título: ${ogTitle}`   : '',
                    ogDesc      ? `Descripción: ${ogDesc}`  : '',
                    ogKeywords  ? `Keywords: ${ogKeywords}` : '',
                ].filter(Boolean).join('\n');

                // Strip remaining HTML tags → body text
                const bodyText = html
                    .replace(/<script[\s\S]*?<\/script>/gi, '')
                    .replace(/<style[\s\S]*?<\/style>/gi, '')
                    .replace(/<!--[\s\S]*?-->/g, '')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .slice(0, 3500);

                // Merge: meta summary takes priority, then body text fills remaining space
                const pageText = (metaSummary + '\n\n' + bodyText).slice(0, 4000).trim();

                if (pageText.length < 30) {
                    console.warn(`[URL_EXTRACT] Insufficient content for: ${targetUrl}`);
                    return { statusCode: 422, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: "La página no devolvió contenido analizable. Es posible que sea una app cerrada, requiera autenticación o bloquee bots." }) };
                }



                const extractPrompt = `Eres un experto en marketing digital y arquitectura de información. Analiza el texto de esta landing page y extrae la información clave del producto o servicio.

TEXTO DE LA PÁGINA:
${pageText}

INSTRUCCIONES CRÍTICAS:
1. Devuelve ÚNICAMENTE JSON válido.
2. Si el contenido es escaso, infiere los beneficios basándote en el título y descripción.
3. El prompt de video debe ser cinemático, en INGLÉS, describiendo una escena publicitaria de lujo.
4. El TTS Script debe ser en el idioma del sitio, persuasivo y corto (max 40 palabras).

ESQUEMA JSON:
{
  "productName": "<nombre del producto o servicio>",
  "category": "<categoría: ecommerce, saas, servicios, restaurante, educación, salud, etc.>",
  "keyBenefits": ["<beneficio 1>", "<beneficio 2>", "<beneficio 3>"],
  "targetAudience": "<descripción en 1 frase de la audiencia objetivo>",
  "tone": "<tono de la marca: profesional, casual, luxury, urgente, inspirador, etc.>",
  "videoPrompt": "<detailed cinematic prompt in ENGLISH for Veo 3.1, 15s scene, high-end lighting, creative action>",
  "ttsScript": "<guión persuasivo, max 40 palabras, mismo idioma del sitio>",
  "suggestedVoice": "<one of: Puck, Charon, Kore, Fenrir, Zephyr, Leda, Aoede, Sulafat, Iapetus>"
}`;

                const result = await callGeminiApi({
                    model: 'gemini-2.5-flash',
                    contents: [{ role: 'user', parts: [{ text: extractPrompt }] }],
                    generationConfig: { 
                        responseMimeType: 'application/json', 
                        temperature: 0.2,
                        maxOutputTokens: 1000
                    }
                });

                let extracted: any = null;
                try {
                    const rawText = (result.candidates?.[0]?.content?.parts?.[0]?.text || '{}')
                        .replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
                    extracted = JSON.parse(rawText);
                } catch (e: any) {
                    console.error("[MediaGen] URL_EXTRACT JSON parse error:", e.message);
                    return { statusCode: 500, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: "Error al interpretar la respuesta de Gemini" }) };
                }

                return {
                    statusCode: 200,
                    headers: getCorsHeaders(event.headers.origin || event.headers.Origin),
                    body: JSON.stringify({ ...extracted, type: 'url_extract', meta: { modelUsed: 'gemini-2.5-flash', sourceUrl: targetUrl } })
                };
            }

            case 'VOICEOVER_SAVE': {
                const { userId, voiceLabel, scriptText, audioUrl, provider } = payload;
                if (!userId || !audioUrl) {
                    return { statusCode: 400, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: "userId and audioUrl are required" }) };
                }

                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 7);

                const result = await runQuery(async (sql) =>
                    sql`INSERT INTO voiceovers (user_id, voice_label, script_text, audio_url, provider, expires_at) 
                        VALUES (${userId}, ${voiceLabel}, ${scriptText}, ${audioUrl}, ${provider || 'google-gemini-tts'}, ${expiresAt})
                        RETURNING id`
                );

                return {
                    statusCode: 200,
                    headers: getCorsHeaders(event.headers.origin || event.headers.Origin),
                    body: JSON.stringify({ success: true, id: result[0].id, expiresAt: expiresAt.toISOString() })
                };
            }

            case 'PLAN_SEGMENTS': {
                const { prompt, totalDuration } = payload;
                if (!prompt) {
                    return { statusCode: 400, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: "prompt is required" }) };
                }

                const targetDuration = totalDuration || 15;


                const planPrompt = `Eres un talentoso Director de Cine y Editor de Video Publicitario.
Tu tarea es tomar un "Brief de Video" y dividirlo en segmentos cinematográficos lógicos para una IA generativa (Veo 3.1).

DURACIÓN TOTAL OBJETIVO: ${targetDuration} segundos.
PROMPT ORIGINAL: "${prompt}"

REGLAS DE SEGMENTACIÓN:
1. Divide el tiempo en segmentos de 4, 5, 6, 7 u 8 segundos.
2. La suma de las duraciones debe ser EXACTAMENTE ${targetDuration} segundos (si es posible) o muy cercana.
3. Cada segmento debe tener un "subPrompt" en INGLÉS que describa la acción específica de esa parte de la historia.
4. El primer segmento debe establecer la escena. Los siguientes deben dar continuidad dinámica (visual continuity).
5. Usa terminología de cámara profesional (Close-up, Pan, Tilt, Tracking shot, cinematic lighting).

FORMATO DE RESPUESTA (JSON ÚNICAMENTE):
{
  "segments": [
    { "subPrompt": "... (descripción en inglés) ...", "durationSeconds": 6 },
    { "subPrompt": "... (descripción en inglés) ...", "durationSeconds": 5 },
    { "subPrompt": "... (descripción en inglés) ...", "durationSeconds": 4 }
  ],
  "reasoningText": "Breve explicación en español de por qué estos cortes mejoran la dinámica del video."
}`;

                const result = await callGeminiApi({
                    model: 'gemini-2.5-flash',
                    contents: [{ role: 'user', parts: [{ text: planPrompt }] }],
                    generationConfig: { 
                        responseMimeType: 'application/json', 
                        temperature: 0.3,
                        maxOutputTokens: 1000
                    }
                });

                let plan: any = null;
                try {
                    const rawText = (result.candidates?.[0]?.content?.parts?.[0]?.text || '{}')
                        .replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
                    plan = JSON.parse(rawText);
                } catch (e: any) {
                    console.error("[MediaGen] PLAN_SEGMENTS JSON parse error:", e.message);
                    return { statusCode: 500, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: "Error al planificar segmentos" }) };
                }

                return {
                    statusCode: 200,
                    headers: getCorsHeaders(event.headers.origin || event.headers.Origin),
                    body: JSON.stringify({ ...plan, type: 'segment_plan' })
                };
            }

            case 'VOICEOVER_LIST': {
                const { userId } = payload;
                if (!userId) {
                    return { statusCode: 400, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: "userId is required" }) };
                }

                const list = await runQuery(async (sql) =>
                    sql`SELECT * FROM voiceovers 
                        WHERE user_id = ${userId} 
                        AND expires_at > NOW() 
                        ORDER BY created_at DESC 
                        LIMIT 20`
                );

                return {
                    statusCode: 200,
                    headers: getCorsHeaders(event.headers.origin || event.headers.Origin),
                    body: JSON.stringify(list)
                };
            }

            default:
                return { statusCode: 400, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: `Unknown type: ${type}` }) };
        }

    } catch (err: any) {
        console.error("[MediaGen Proxy Error]:", err);
        
        let maskedKey = "not_found";
        let keySource = "none";
        try {
            const info = getGeminiKey();
            maskedKey = `${info.key.slice(0, 6)}...${info.key.slice(-4)}`;
            keySource = info.source;
        } catch (e) {}

        // ─── Credential error detection (expired / invalid API key) ───────
        // Return 401 immediately so the frontend can surface a clear message
        // instead of a misleading 500 that causes useless retries.
        const isCredential =
            err?.isCredentialError === true ||
            err.message?.toLowerCase().includes('api key expired') ||
            err.message?.toLowerCase().includes('api key not valid') ||
            err.message?.toLowerCase().includes('invalid api key') ||
            err.message?.toLowerCase().includes('permission_denied');

        if (isCredential) {
            console.error(`[MediaGen] ⚠️ Credential error on type=${type}: ${err.message}`);
            return {
                statusCode: 401,
                headers: getCorsHeaders(event.headers.origin || event.headers.Origin),
                body: JSON.stringify({
                    error: 'CREDENTIAL_ERROR',
                    details: 'Las credenciales de IA están vencidas o son inválidas. Por favor, renueva la API Key de Gemini en Google AI Studio y actualiza la variable de entorno en Netlify.',
                    type: type,
                    meta: { apiKeySource: keySource, timestamp: new Date().toISOString() }
                })
            };
        }

        // Final check to prevent 500 status on content policy errors that bubbled up
        const isSafety = err.message?.toLowerCase().includes('usage guidelines') || 
                        err.message?.toLowerCase().includes('violate') ||
                        err.message?.includes('CONTENT_POLICY_VIOLATION');
        
        return { 
            statusCode: isSafety ? 400 : 500, 
            headers: getCorsHeaders(event.headers.origin || event.headers.Origin), 
            body: JSON.stringify({ 
                error: isSafety ? "CONTENT_POLICY_VIOLATION" : "AI Media Generator Error", 
                details: err.message,
                type: type,
                stack: isSuperAdmin ? err.stack : undefined, // privacy
                meta: {
                    apiKeyMasked: maskedKey,
                    apiKeySource: keySource,
                    timestamp: new Date().toISOString()
                }
            }) 
        };
    }
};

export { handler };

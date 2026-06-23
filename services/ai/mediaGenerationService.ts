/**
 * Media Generation Service (v2.1 - Mar 2026)
 * =========================================
 * Proxies calls to Netlify Functions to avoid CORS and SDK issues in the browser.
 */

import { API_URL, proxiedAssetUrl, buildAbsoluteUrl } from "../../utils/apiConfig";
import { telemetryService } from "../telemetryService";
import { aiTechLogService } from "./aiTechLogService";
import { retryWithBackoff } from "../../utils/retryWithBackoff";
import { logger } from '../../utils/logger';



// Types that require Vertex AI / Replicate and must bypass the local Express server
// Types that require Vertex AI / Replicate and must bypass the local Express server
const VERTEX_ONLY_TYPES = new Set(['VIDEO_GEN', 'VIDEO_STATUS', 'ANIMATE', 'VIDEO_MASTER', 'PLAN_SEGMENTS', 'VIDEO_GEN_LTX', 'LTX_STATUS', 'IMAGE_GEN_FLUX', 'IMAGE_REMOVE_BG', 'IMAGE_UPSCALE', 'IMAGE_RESTORE_FACE', 'IMAGE_OUTPAINT']);

// Helper for calling our media generation proxy (Netlify Function or Express)
const callMediaProxy = async (type: string, payload: any): Promise<any> => {
  try {
    const isLocalExpress = API_URL.includes(':3001') && !VERTEX_ONLY_TYPES.has(type);
    const endpoint = isLocalExpress
      ? `${API_URL}/ai/media/generate`
      : buildAbsoluteUrl('/.netlify/functions/api-media-generation');

    let userId = "";
    try {
      const session = localStorage.getItem("insitu_active_session");
      if (session) {
        const parsed = JSON.parse(session);
        userId = parsed.id || parsed.user?.id || "";
      }
    } catch { /* ignore */ }

    // Wrap fetch with retry logic for rate limiting and transient errors
    const response = await retryWithBackoff(
      async () => {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(userId ? { 'X-User-Id': userId } : {})
          },
          body: new TextEncoder().encode(JSON.stringify({ type, payload }))
        });

        // Throw error immediately for retryable status codes
        // This allows retryWithBackoff to catch and retry
        if (!res.ok) {
          const error: any = new Error(`HTTP ${res.status}`);
          error.status = res.status;
          error.response = res;
          throw error;
        }

        return res;
      },
      {
        maxAttempts: type === 'RESEARCH' ? 5 : 3, // Research gets more retries
        initialDelayMs: type === 'RESEARCH' ? 2000 : 1000,
        maxDelayMs: 60000,
        shouldRetry: (error, attempt) => {
          // Don't retry content policy violations
          if (error?.status === 400) return false;

          // Retry rate limits (429) and server errors (5xx)
          if (error?.status === 429 && attempt < 5) {
            logger.info(`[MediaGen Retry] Rate limited (429), retrying in backoff... (attempt ${attempt}/5)`);
            return true;
          }
          if (error?.status >= 500 && error?.status < 600 && attempt < 4) {
            logger.info(`[MediaGen Retry] Server error (${error.status}), retrying... (attempt ${attempt}/4)`);
            return true;
          }

          // Retry network errors
          if (error instanceof TypeError && attempt < 3) {
            logger.info(`[MediaGen Retry] Network error, retrying... (attempt ${attempt}/3)`);
            return true;
          }

          return false;
        },
      }
    );

    if (!response.ok) {
      let errorMessage = `Proxy error: ${response.status}`;
      let errorData: any = {};
      try {
        errorData = await response.json();
        errorMessage = errorData.details || errorData.error || errorMessage;
      } catch (e) {
        // Fallback if not JSON
      }

      const error = new Error(errorMessage);

      // ── Credential error (expired / invalid API key) ──────────────────
      // Backend returns 401 with error='CREDENTIAL_ERROR' in this case.
      // Tag it so UI components can show a human-readable banner instead of a generic crash.
      if (response.status === 401 || errorData.error === 'CREDENTIAL_ERROR') {
        (error as any).isCredentialError = true;
        logger.error(`[MediaGen] Credential error on type=${type}: ${errorMessage}`);
      }

      // Explicit flag for Vertex AI safety filter rejections
      if (errorData.error === 'CONTENT_POLICY_VIOLATION' || (response.status === 400 && errorMessage.toLowerCase().includes('usage guidelines'))) {
        (error as any).isContentPolicy = true;
      }

      // Attach extra info for Super Admin debugging
      if (errorData.stack) (error as any).serverStack = errorData.stack;
      if (errorData.type) (error as any).taskType = errorData.type;

      throw error;
    }

    const data = await response.json();
    
    // Dispatch meta information for Super Admin debug display
    if (data.meta) {
      window.dispatchEvent(new CustomEvent('media-gen-meta', { 
        detail: { type, meta: data.meta } 
      }));
    }

    return data;
  } catch (error: any) {
    logger.error(`[MediaGen Proxy Error] ${type}:`, error.message);
    throw error;
  }
};

/**
 * Polls for video completion if the initial request returned an operationName.
 * @param onProgress - optional callback called after each poll attempt with (current, max)
 */
const pollVideoStatus = async (
  operationName: string,
  onProgress?: (attempt: number, max: number, stage?: string) => void
): Promise<string | null> => {
  const INITIAL_POLL_INTERVAL_MS = 8000; // Increased to 8s for Veo 3.1 stability
  const maxAttempts = 60; 
  let consecutiveErrors = 0;
  let currentDelay = INITIAL_POLL_INTERVAL_MS;
  const pollStartTime = Date.now();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const stage = attempt <= 5 ? 'Initializing' : attempt <= 20 ? 'Neural Rendering' : attempt <= 35 ? 'Refining Textures' : 'Finalizing Video';
    onProgress?.(attempt, maxAttempts, stage);

    await new Promise(resolve => setTimeout(resolve, currentDelay));

    try {
      const data = await callMediaProxy('VIDEO_STATUS', { operationName });
      consecutiveErrors = 0;
      // Reset delay on success
      currentDelay = INITIAL_POLL_INTERVAL_MS;

      if (data.status === 'completed' && data.url) {
        telemetryService.logLatency({
          taskType: 'VIDEO_STATUS_POLL',
          durationMs: Date.now() - pollStartTime,
          status: 'success',
          metadata: { operationName, attempts: attempt, totalDelay: currentDelay }
        });
        return data.url;
      }
      logger.info(`[MediaGen] Veo 3.1 still processing... (${attempt}/${maxAttempts})`);
    } catch (e: any) {
      if (isContentPolicyError(e)) {
        const policyError = new Error("CONTENT_POLICY_VIOLATION");
        (policyError as any).isContentPolicy = true;
        throw policyError;
      }

      consecutiveErrors++;
      
      // If we hit 429 during polling, slow down significantly
      if (e?.status === 429) {
        logger.warn(`[MediaGen] Polling rate limited (429). Increasing delay.`);
        currentDelay = Math.min(currentDelay * 2, 30000); // Max 30s delay
      }

      logger.error(`[MediaGen] Polling error #${consecutiveErrors}:`, e.message);
      if (consecutiveErrors >= 5) {
        telemetryService.logLatency({
          taskType: 'VIDEO_STATUS_POLL',
          durationMs: Date.now() - pollStartTime,
          status: 'failed',
          metadata: { operationName, error: '5 consecutive errors' }
        });
        throw new Error("Video generation failed: 5 consecutive errors polling Vertex AI. Verifica tu conexión o las cuotas del proyecto GCP.");
      }
    }
  }

  telemetryService.logLatency({
    taskType: 'VIDEO_STATUS_POLL',
    durationMs: Date.now() - pollStartTime,
    status: 'failed',
    metadata: { operationName, error: 'Timeout after 8 minutes' }
  });
  throw new Error("Video generation timed out after 8 minutes. Vertex AI sigue procesando — intenta de nuevo o revisa la cuota del proyecto GCP.");
};

/**
 * Ensures an image is in base64 format for API transmission.
 * If provided a URL, it fetches it and converts it.
 */
const asBase64 = async (image: string): Promise<string> => {
  if (!image) return "";
  if (image.startsWith('data:')) return image;
  if (!image.startsWith('http')) return image; // Assume it's already base64 without prefix if no http

  try {
    const proxyUrl = proxiedAssetUrl(image) || image;
    const response = await fetch(proxyUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    logger.error("[MediaGen] Failed to convert URL to base64:", e);
    return image; // Fallback to original
  }
};

/**
 * Generates a full ad video using Veo via Proxy
 */
export const generateAdVideo = async (
  prompt: string,
  format: string = 'Landscape',
  musicVolume: number = 0.5,
  sceneAspects: string = '',
  onProgress?: (attempt: number, max: number, stage?: string) => void,
  duration: number = 6,
  options?: { 
    platform?: string; 
    objective?: string; 
    brandContext?: string;
    cameraMotion?: 'PAN' | 'TILT' | 'ZOOM' | 'DOLLY';
    resolution?: '720p' | '1080p';
    fps?: 24 | 30 | 60;
    styleReference?: string;
    subjectReference?: string;
    motionIntensity?: number;
    cameraMotionSpeed?: number;
    styleReferencePower?: number;
  }
): Promise<string | null> => {
  const startTime = Date.now();
  try {
    // Auto-expand poor prompts before sending to Veo
    const expandedPrompt = await expandPrompt(
      prompt,
      options?.brandContext ? JSON.parse(options.brandContext) : null,
      options?.platform || 'instagram',
      format === 'Landscape' ? '16:9' : format === 'Portrait' ? '9:16' : '1:1',
      options?.objective || 'engagement',
      'ANIMATE'
    );

    const attemptVideoGen = async (videoPrompt: string): Promise<string | null> => {
      const data = await callMediaProxy('VIDEO_GEN', { prompt: videoPrompt, format, musicVolume, sceneAspects, duration, ...options });
      if (data.url) return data.url;
      if (data.operationName) {
        return await pollVideoStatus(data.operationName, onProgress);
      }
      throw new Error("No URL or Operation returned for Video Gen");
    };

    const videoUrl = await attemptVideoGen(expandedPrompt);
    
    const durationMs = Date.now() - startTime;
    telemetryService.logLatency({
      taskType: 'VIDEO_GEN',
      durationMs,
      status: 'success',
      metadata: { prompt: expandedPrompt, format }
    });

    return videoUrl;
  } catch (e: any) {
    const durationMs = Date.now() - startTime;
    // Auto-sanitize and retry once on content policy rejection
    if ((e as any).isContentPolicy) {
      logger.warn('[MediaGen] Content policy violation — auto-sanitizing prompt...');
      const sanitizedPrompt = await sanitizePrompt(prompt);
      logger.info(`[MediaGen] Retrying with sanitized prompt: ${sanitizedPrompt}`);
      return await generateAdVideo(sanitizedPrompt, format, musicVolume, sceneAspects, onProgress, duration, options);
    }
    telemetryService.logLatency({
      taskType: 'VIDEO_GEN',
      durationMs,
      status: 'failed',
      metadata: { error: e.message }
    });
    logger.error("[MediaGen] Video Gen Error:", e.message);

    aiTechLogService.logError({
      feature: 'Veo 3.1 Video Generation',
      errorMessage: e.message,
      context: { prompt, format, duration, options },
      severity: 'critical'
    });

    throw e;
  }
};

// ============================
// LTX-2.3 Pipeline (Replicate)
// ============================

export interface LtxVideoOptions {
  format?: 'Portrait' | 'Landscape' | 'Square' | 'Social';
  fps?: number;
  resolution?: string;
  generate_audio?: boolean;
  model?: 'pro' | 'standard';
  duration?: number;
  negativePrompt?: string;
  guidance_scale?: number;
  num_inference_steps?: number;
  seed?: number;
  platform?: string;
  objective?: string;
  brandContext?: string;
  brandProfile?: any;
}

/**
 * Generates a short ad video using the LTX-2.3 model via Replicate.
 * Returns the video URL directly if sync, or polls via pollLtxStatus if async.
 */
export const generateLtxVideo = async (
  prompt: string,
  options: LtxVideoOptions = {},
  onProgress?: (attempt: number, max: number, stage?: string) => void
): Promise<string | null> => {
  const startTime = Date.now();
  try {
    logger.info('[LTX-2.3] Starting video generation via Replicate...');

    const data = await callMediaProxy('VIDEO_GEN_LTX', { prompt, ...options });

    // Sync response (Replicate returned immediately)
    if (data.url) {
      logger.info('[LTX-2.3] Sync result received.');
      telemetryService.logLatency({
        taskType: 'VIDEO_GEN_LTX',
        durationMs: Date.now() - startTime,
        status: 'success',
        metadata: { prompt, format: options.format, meta: data.meta }
      });
      return data.url;
    }

    // Async: got a predictionId — start polling
    if (data.operationName) {
      logger.info(`[LTX-2.3] Async job started, polling prediction: ${data.operationName}`);
      const videoUrl = await pollLtxStatus(data.operationName, onProgress);
      telemetryService.logLatency({
        taskType: 'VIDEO_GEN_LTX',
        durationMs: Date.now() - startTime,
        status: 'success',
        metadata: { prompt, format: options.format }
      });
      return videoUrl;
    }

    throw new Error('LTX-2.3: No URL or prediction ID returned.');
  } catch (e: any) {
    telemetryService.logLatency({
      taskType: 'VIDEO_GEN_LTX',
      durationMs: Date.now() - startTime,
      status: 'failed',
      metadata: { error: e.message }
    });
    aiTechLogService.logError({
      feature: 'LTX-2.3 Video Generation (Replicate)',
      errorMessage: e.message,
      context: { prompt, options },
      severity: 'critical'
    });
    logger.error('[LTX-2.3] generateLtxVideo error:', e.message);
    throw e;
  }
};

/**
 * Polls a Replicate prediction until LTX-2.3 video is complete.
 * Uses 5s intervals, max 90 attempts (~7.5 min), matching Veo polling pattern.
 */
export const pollLtxStatus = async (
  predictionId: string,
  onProgress?: (attempt: number, max: number, stage?: string) => void
): Promise<string | null> => {
  const POLL_INTERVAL_MS = 5000; // LTX-2.3 typically completes in 30-120s
  const maxAttempts = 90;
  let consecutiveErrors = 0;
  const pollStartTime = Date.now();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const stage = attempt <= 6 ? 'Initializing' : attempt <= 30 ? 'Neural Synthesis' : attempt <= 60 ? 'Audio Sync' : 'Finalizing';
    onProgress?.(attempt, maxAttempts, stage);

    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));

    try {
      const data = await callMediaProxy('LTX_STATUS', { operationName: predictionId });
      consecutiveErrors = 0;

      if (data.status === 'completed' && data.url) {
        logger.info(`[LTX-2.3] Video ready after ${attempt} polls: ${data.url}`);
        telemetryService.logLatency({
          taskType: 'LTX_STATUS_POLL',
          durationMs: Date.now() - pollStartTime,
          status: 'success',
          metadata: { predictionId, attempts: attempt }
        });
        return data.url;
      }

      logger.info(`[LTX-2.3] Replicate status: ${data.replicateStatus || 'processing'} (${attempt}/${maxAttempts})`);
    } catch (e: any) {
      consecutiveErrors++;
      logger.error(`[LTX-2.3] Polling error #${consecutiveErrors}:`, e.message);
      if (consecutiveErrors >= 5) {
        telemetryService.logLatency({
          taskType: 'LTX_STATUS_POLL',
          durationMs: Date.now() - pollStartTime,
          status: 'failed',
          metadata: { predictionId, error: '5 consecutive errors' }
        });
        throw new Error('LTX-2.3: 5 consecutive polling errors. Verifica el REPLICATE_API_TOKEN y la cuota del workspace.');
      }
    }
  }

  telemetryService.logLatency({
    taskType: 'LTX_STATUS_POLL',
    durationMs: Date.now() - pollStartTime,
    status: 'failed',
    metadata: { predictionId, error: 'Timeout after 7.5 min' }
  });
  throw new Error('LTX-2.3: Video generation timed out after 7.5 min. El job sigue procesando en Replicate — prueba de nuevo.');
};

/**
 * Animates an existing image using Veo via Proxy
 */
export const animateImageWithVeo = async (
  sourceImage: string,
  prompt: string,
  format: string = 'Landscape',
  onProgress?: (attempt: number, max: number, stage?: string) => void,
  duration: number = 6,
  options?: {
    platform?: string;
    objective?: string;
    brandContext?: string;
    cameraMotion?: 'PAN' | 'TILT' | 'ZOOM' | 'DOLLY';
    resolution?: '720p' | '1080p';
    fps?: 24 | 30 | 60;
    styleReference?: string;
    subjectReference?: string;
    motionIntensity?: number;
    cameraMotionSpeed?: number;
    styleReferencePower?: number;
  }
): Promise<string | null> => {
  const startTime = Date.now();
  try {
    const attemptAnimate = async (animPrompt: string): Promise<string | null> => {
      const data = await callMediaProxy('ANIMATE', { prompt: animPrompt, sourceImage, format, duration, ...options });
      if (data.url) return data.url;
      if (data.operationName) {
        return await pollVideoStatus(data.operationName, onProgress);
      }
      throw new Error("No URL or Operation returned for Animation");
    };

    const videoUrl = await attemptAnimate(prompt);
    
    const durationMs = Date.now() - startTime;
    telemetryService.logLatency({
      taskType: 'ANIMATE',
      durationMs,
      status: 'success',
      metadata: { format }
    });

    return videoUrl;
  } catch (e: any) {
    const durationMs = Date.now() - startTime;
    if ((e as any).isContentPolicy) {
      logger.warn('[MediaGen] Content policy violation in animation — auto-sanitizing...');
      const sanitizedPrompt = await sanitizePrompt(prompt);
      return await animateImageWithVeo(sourceImage, sanitizedPrompt, format, onProgress, duration, options);
    }
    telemetryService.logLatency({
      taskType: 'ANIMATE',
      durationMs,
      status: 'failed',
      metadata: { error: e.message }
    });
    logger.error("[MediaGen] Animation Error:", e.message);

    aiTechLogService.logError({
      feature: 'Veo 3.1 Animation (Image-to-Video)',
      errorMessage: e.message,
      context: { prompt, format, duration, options },
      severity: 'critical'
    });

    throw e;
  }
};

// Google Native / Gemini TTS voices (Chirp 3 HD family)
// These go directly to the proxy to leverage Google's native high-fidelity engine.
export const GOOGLE_NATIVE_VOICES = new Set([
  'Zephyr', 'Aoede', 'Charon', 'Puck', 'Kore', 'Fenrir', 'Leda', 'Orus',
  'Callirrhoe', 'Autonoe', 'Enceladus', 'Iapetus', 'Umbriel', 'Algieba', 'Despina',
  'Algenib', 'Rasalgethi', 'Laomedeia', 'Achernar', 'Alnilam', 'Schedar', 'Gacrux',
  'Pulcherrima', 'Achird', 'Zubenelgenubi', 'Vindemiatrix', 'Sadachbia', 'Sadaltager',
  'Sulafat', 'Erinome'
]);

export const VOICE_LIST = [
  // Especial
  { id: 'Clonada',  name: 'VOZ CLONADA', desc: 'Usa tu propia muestra de audio',        type: 'DYNAMIC' },
  
  // Google Native (Chirp 3 HD - Nueva Generación)
  { id: 'Zephyr',   name: 'Zephyr (Google)',   desc: 'Google: Enérgico y vibrante',     type: 'GOOGLE'  },
  { id: 'Aoede',    name: 'Aoede (Google)',    desc: 'Google: Relajado y natural',      type: 'GOOGLE'  },
  { id: 'Charon',   name: 'Charon (Google)',   desc: 'Google: Autoritario e informativo', type: 'GOOGLE'  },
  { id: 'Puck',     name: 'Puck (Google)',     desc: 'Google: Alegre y casual',         type: 'GOOGLE'  },
  { id: 'Kore',     name: 'Kore (Google)',     desc: 'Google: Estructurado y firme',    type: 'GOOGLE'  },
  { id: 'Fenrir',   name: 'Fenrir (Google)',   desc: 'Google: Dinámico y potente',      type: 'GOOGLE'  },
  { id: 'Leda',     name: 'Leda (Google)',     desc: 'Google: Juvenil y fresco',        type: 'GOOGLE'  },
  { id: 'Orus',     name: 'Orus (Google)',     desc: 'Google: Brillante y dinámico',    type: 'GOOGLE'  },
];

export interface AudioGenOptions {
  text: string;
  voice?: string;
  audioData?: string; // If provided, triggers voice cloning
  language?: string;
  dialect?: string;
  tone?: string;
  emotion?: string;
  pitch?: number;
  speed?: number;
}

/**
 * Standardized facade for all Audio/Voice generation across the platform.
 * Handles both Standard TTS and Voice Cloning based on parameters.
 */
export const generateAudio = async (options: AudioGenOptions): Promise<string | null> => {
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
  } = options;

  logger.info(`[MediaGen] Requesting Audio Generation (Voice: ${audioData ? 'Clonada' : voice})...`);
  
  try {
    let validVoice = voice;
    if (!audioData) {
      const isGoogleNative = GOOGLE_NATIVE_VOICES.has(voice);
      validVoice = isGoogleNative ? voice : 'Aoede'; // Fallback for legacy
    } else {
      validVoice = 'Clonada';
    }

    const data = await callMediaProxy('AUDIO_GEN', {
      text,
      audioData,
      voice: validVoice,
      language,
      dialect,
      tone,
      emotion,
      pitch,
      speed
    });
    
    if (!data.url) throw new Error("No voiceover URL returned by the service");
    return data.url;
  } catch (e: any) {
    logger.error(`[MediaGen] Audio Generation Error:`, e.message);
    throw e;
  }
};

/**
 * Options for professional image generation
 */
export interface ImageGenOptions {
  aspectRatio?: string;
  model?: string;
  sampleCount?: number;
  personGeneration?: 'allow_all' | 'allow_adult' | 'dont_allow';
  // Brilliant Basics context — used for auto prompt enhancement
  platform?: string;
  objective?: string;
  brandContext?: string;
  styleReference?: string;
  subjectReference?: string;
  styleReferencePower?: number;
}

// ============================
// Prompt Expander (anti-mediocre)
// ============================

/**
 * Scores prompt richness (0-5 scale).
 * Low score = activate auto-expansion via Gemini.
 */
function scorePromptRichness(prompt: string): number {
  let score = 0;
  if (prompt.split(/\s+/).length > 15) score++;
  if (/estilo|style|moderno|elegante|minimalista|vibrante|classic|industrial/i.test(prompt)) score++;
  if (/luz|light|iluminado|golden hour|natural light|dramatic|soft|cinematic/i.test(prompt)) score++;
  if (/primer plano|close-up|wide shot|ángulo|perspectiva|overhead|macro|landscape/i.test(prompt)) score++;
  if (/emoción|mood|atmósfera|dinámico|tranquilo|serene|energetic|peaceful/i.test(prompt)) score++;
  return score;
}

/**
 * Sanitizes a prompt that was rejected by Vertex AI content policies.
 * Uses Gemini to rephrase while preserving creative intent.
 * Returns the sanitized prompt or throws if sanitization also fails.
 */
export const sanitizePrompt = async (rejectedPrompt: string): Promise<string> => {
  try {
    logger.info('[PromptSanitizer] Reformulating rejected prompt via Gemini...');

    const data = await callMediaProxy('PROMPT_SANITIZE', { prompt: rejectedPrompt });
    const sanitized = data.text?.trim();

    if (!sanitized || sanitized === rejectedPrompt) {
      throw new Error('Sanitization returned empty or unchanged prompt');
    }

    window.dispatchEvent(new CustomEvent('prompt-sanitized', {
      detail: { original: rejectedPrompt, sanitized }
    }));

    logger.info('[PromptSanitizer] Sanitized prompt:', sanitized);
    return sanitized;
  } catch (err) {
    logger.error('[PromptSanitizer] Failed:', err);
    throw new Error('El prompt fue rechazado por las políticas de Google y no se pudo reformular automáticamente. Intenta reescribirlo manualmente.');
  }
};

/** Returns true if the error is a Vertex AI / Imagen content policy rejection */
const isContentPolicyError = (e: any): boolean => {
  const msg = (e.message || '').toLowerCase();
  return msg.includes('usage guidelines') || msg.includes('violate') ||
    msg.includes('safety filter') || msg.includes('blocked by safety') ||
    msg.includes('responsible ai') || msg.includes('content policy') ||
    msg.includes('content_policy_violation') ||
    msg.includes('image generation was blocked') || (e as any).isContentPolicy === true;
};

/**
 * Expands poor prompts into professional creative briefs using Gemini Flash.
 * Returns original prompt if expansion fails or score is high.
 */
export const expandPrompt = async (
  userPrompt: string,
  brand: any = null,
  platform: string = 'instagram',
  aspectRatio: string = '1:1',
  objective: string = 'engagement',
  type: 'IMAGE' | 'VIDEO' | 'ANIMATE' | 'AUDIO' = 'IMAGE'
): Promise<string> => {
  const score = scorePromptRichness(userPrompt);

  // If prompt is already rich, return as-is
  if (score >= 3) {
    logger.info(`[PromptExpander] Score ${score}/5 — prompt is rich enough`);
    return userPrompt;
  }

  try {
    logger.info(`[PromptExpander] Score ${score}/5 — expanding via Media Proxy`);

    const brandDesc = brand
      ? [
          brand.toneOfVoice,
          brand.industry,
          brand.brandColors ? `Color palette: ${brand.brandColors}` : '',
          brand.typography ? `Typography: ${brand.typography}` : '',
          brand.visualGuidelines ? `Visual style: ${brand.visualGuidelines}` : '',
          brand.adherenceLevel === 'Strict' ? 'STRICT brand adherence required — no deviations from brand palette or style' : '',
        ].filter(Boolean).join('. ')
      : undefined;

    const context = {
      platform,
      aspectRatio,
      objective,
      brand: brandDesc,
    };

    const data = await callMediaProxy('PROMPT_EXPAND', { 
      prompt: userPrompt, 
      mediaType: type,
      context 
    });

    const expanded = data.text?.trim() || userPrompt;

    // Dispatch event for UI badge
    window.dispatchEvent(new CustomEvent('prompt-expanded', {
      detail: { original: userPrompt, expanded }
    }));

    logger.info('[PromptExpander] Expanded prompt:', expanded);
    return expanded;
  } catch (err) {
    logger.warn('[PromptExpander] Error during expansion:', err);
    return userPrompt;
  }
};

/**
 * Generates a professional image using Imagen 3.0/4.0 via Proxy
 */
export const generateProImage = async (
  prompt: string,
  options: string | ImageGenOptions = "16:9"
): Promise<any> => {
  const finalOptions = typeof options === 'string' ? { aspectRatio: options } : options;

  // Auto-expand poor prompts before sending to Imagen
  const expandedPrompt = await expandPrompt(
    prompt,
    finalOptions.brandContext ? JSON.parse(finalOptions.brandContext) : null,
    finalOptions.platform || 'instagram',
    finalOptions.aspectRatio || '1:1',
    finalOptions.objective || 'engagement',
    'IMAGE'
  );

  const attemptImageGen = async (imgPrompt: string): Promise<any> => {
    const data = await callMediaProxy('IMAGE_GEN', { prompt: imgPrompt, ...finalOptions });
    if (finalOptions.sampleCount && finalOptions.sampleCount > 1) return data;
    if (!data.url) throw new Error("No image URL returned by the service");
    return data.url;
  };

  logger.info(`[MediaGen] Requesting Image Gen via Proxy: ${expandedPrompt}`, finalOptions);
  try {
    return await attemptImageGen(expandedPrompt);
  } catch (e: any) {
    if (isContentPolicyError(e)) {
      logger.warn('[MediaGen] Content policy violation in image gen — auto-sanitizing...');
      const sanitizedPrompt = await sanitizePrompt(expandedPrompt);
      return await attemptImageGen(sanitizedPrompt);
    }
    logger.error("[MediaGen] Image Gen Error:", e.message);

    aiTechLogService.logError({
      feature: 'Imagen 4.0 Image Gen',
      errorMessage: e.message,
      context: { prompt: expandedPrompt, options },
      severity: 'critical'
    });

    throw e;
  }
};

/**
 * Generates an ultra-high fidelity image using Flux.1 via Replicate
 */
export const generateFluxImage = async (
  prompt: string,
  options: any = {}
): Promise<any> => {
  const finalOptions = typeof options === 'string' ? { aspectRatio: options } : options;
  
  // Auto-expand poor prompts for high-quality results
  const expandedPrompt = await expandPrompt(
    prompt,
    finalOptions.brandContext ? JSON.parse(finalOptions.brandContext) : null,
    finalOptions.platform || 'instagram',
    finalOptions.aspectRatio || '1:1',
    finalOptions.objective || 'engagement',
    'IMAGE'
  );

  logger.info(`[MediaGen] Requesting Flux Image Gen: ${expandedPrompt}`, finalOptions);
  
  try {
    const data = await callMediaProxy('IMAGE_GEN_FLUX', { 
      prompt: expandedPrompt, 
      ...finalOptions 
    });
    
    if (data.url) return data.url;
    throw new Error("No image URL returned by Flux service");
  } catch (e: any) {
    logger.error("[MediaGen] Flux Gen Error:", e.message);
    throw e;
  }
};
/**
 * Bloque 5 — Generates image with reflection loop: Gemini evaluates result against brand guidelines
 * If score < 6, regenerates automatically (max 2 attempts)
 */
export const generateWithReflection = async (
  prompt: string,
  brand: any = null,
  options: string | ImageGenOptions = '16:9',
  maxAttempts: number = 2
): Promise<{ imageUrl: string; attempts: number; score?: number }> => {
  const finalOptions = typeof options === 'string' ? { aspectRatio: options } : options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      logger.info(`[ReflectionLoop] Attempt ${attempt}/${maxAttempts}`);

      // Generate image
      const imageUrl = await generateProImage(prompt, finalOptions);

      // If no brand profile, skip evaluation
      if (!brand) {
        return { imageUrl, attempts: attempt };
      }

      // Evaluate image against brand guidelines using the proxy (PROMPT_EXPAND handler)
      let score = 5; // default score if evaluation fails
      try {
        const evalPrompt = `Eres un evaluador de calidad creativa. Analiza esta imagen generada por IA contra las directrices de marca:

Brand Guidelines:
- Tone: ${brand.toneOfVoice}
- Colors: ${brand.brandColors}
- Industry: ${brand.industry}
- Visual Style: ${brand.visualGuidelines || 'Not specified'}
- Compliance Rules: ${brand.complianceRules || 'None'}

Image URL: ${imageUrl}

Evalúa la imagen en una escala 1-10 donde:
- 1-3: Completamente fuera de marca (colores incorrectos, estilo discordante, violaciones de compliance)
- 4-6: Parcialmente alineada (algunos elementos correctos pero inconsistencias)
- 7-9: Bien alineada (coherente con la marca)
- 10: Excelente (perfecto match con las directrices)

Responde SOLO con el número (1-10) y una breve razón en UNA línea.`;

        const data = await callMediaProxy('PROMPT_EXPAND', { 
          prompt: evalPrompt,
          mediaType: 'IMAGE',
          noEnrich: true // Tell backend not to apply the "expanded" formatting
        });

        const scoreText = data.text?.match(/\d+/)?.[0];
        score = scoreText ? parseInt(scoreText) : 5;
        logger.info(`[ReflectionLoop] Brand alignment score: ${score}/10`);
      } catch (evalErr) {
        logger.warn('[ReflectionLoop] Evaluation failed, continuing with image:', evalErr);
      }

      // If score is acceptable, return
      if (score >= 6) {
        return { imageUrl, attempts: attempt, score };
      }

      // If this is the last attempt, return anyway
      if (attempt >= maxAttempts) {
        logger.warn(`[ReflectionLoop] Max attempts reached. Returning image with score ${score}`);
        return { imageUrl, attempts: attempt, score };
      }

      // Regenerate with refined prompt
      const refinedPrompt = `${prompt}. CRITICAL: Must be 100% aligned with brand style (${brand.toneOfVoice}). Use ONLY colors from this palette: ${brand.brandColors}. Ensure no compliance violations: ${brand.complianceRules}.`;

      prompt = refinedPrompt;
      logger.info('[ReflectionLoop] Regenerating with refined prompt...');
    } catch (err: any) {
      logger.error(`[ReflectionLoop] Error on attempt ${attempt}:`, err.message);
      if (attempt >= maxAttempts) throw err;
    }
  }

  throw new Error('[ReflectionLoop] All attempts failed');
};

/**
 * Bloque 6 — Generates 3 versions of an image for different platforms (parallel)
 * Returns: { tiktok: url, instagram: url, youtube: url }
 */
export const generateMultiChannel = async (
  prompt: string,
  brand: any = null,
  onProgress?: (channel: string) => void
): Promise<{ tiktok: string; instagram: string; youtube: string }> => {
  try {
    logger.info('[MultiChannel] Generating 3 versions in parallel for:', prompt);

    // Expand prompt once
    const expandedPrompt = await expandPrompt(
      prompt,
      brand,
      'social',
      '9:16',
      'multichannel'
    );

    // Generate 3 versions in parallel with different aspect ratios
    const [tiktokUrl, instagramUrl, youtubeUrl] = await Promise.all([
      (async () => {
        onProgress?.('TikTok / Reels');
        logger.info('[MultiChannel] Generating TikTok version (9:16)...');
        return generateProImage(
          `${expandedPrompt} (Format: vertical, 9:16 for TikTok/Instagram Reels)`,
          { aspectRatio: '9:16', sampleCount: 1 }
        );
      })(),
      (async () => {
        onProgress?.('Instagram Feed');
        logger.info('[MultiChannel] Generating Instagram version (1:1)...');
        return generateProImage(
          `${expandedPrompt} (Format: square, 1:1 for Instagram Feed)`,
          { aspectRatio: '1:1', sampleCount: 1 }
        );
      })(),
      (async () => {
        onProgress?.('YouTube / Display');
        logger.info('[MultiChannel] Generating YouTube version (16:9)...');
        return generateProImage(
          `${expandedPrompt} (Format: landscape, 16:9 for YouTube/Display)`,
          { aspectRatio: '16:9', sampleCount: 1 }
        );
      })(),
    ]);

    logger.info('[MultiChannel] All 3 versions generated successfully');
    return { tiktok: tiktokUrl, instagram: instagramUrl, youtube: youtubeUrl };
  } catch (e: any) {
    logger.error('[MultiChannel] Error:', e.message);
    throw e;
  }
};

/**
 * Edits an existing image using Imagen 3.0 via Proxy
 */
export const generateOrEditImage = async (
  prompt: string | any, 
  sourceImageBase64?: string,
  aspectRatio: string = '1:1',
  options?: any
): Promise<any> => {
  try {
    let finalPrompt = "";
    let finalSource = sourceImageBase64;
    let finalAspect = aspectRatio;
    let finalOptions = options || {};
    let isObjectCall = false;

    if (typeof prompt === 'object' && prompt !== null) {
      isObjectCall = true;
      finalPrompt = prompt.prompt;
      finalSource = prompt.sourceImageBase64 || prompt.referenceImage;
      finalAspect = prompt.aspectRatio || '1:1';
      finalOptions = { ...prompt };
      // Normalizar para el proxy
      if (prompt.mask && !finalOptions.maskImageBase64) {
        finalOptions.maskImageBase64 = prompt.mask;
      }
    } else {
      finalPrompt = prompt;
    }

    if (finalSource) {
      logger.info(`[MediaGen] Requesting Image Edit via Proxy...`);
      
      // Ensure source and mask are base64 if needed
      const [sourceB64, maskB64] = await Promise.all([
        asBase64(finalSource),
        finalOptions.mask ? asBase64(finalOptions.mask) : (finalOptions.maskImageBase64 ? asBase64(finalOptions.maskImageBase64) : Promise.resolve(""))
      ]);

      const data = await callMediaProxy('IMAGE_EDIT', { 
        prompt: finalPrompt, 
        sourceImageBase64: sourceB64, 
        aspectRatio: finalAspect,
        mask: maskB64 || undefined,
        ...finalOptions 
      });
      
      if (!data.url) throw new Error("No image URL returned by the service");
      return isObjectCall ? { imageUrl: data.url } : data.url;
    }

    const url = await generateProImage(finalPrompt, { aspectRatio: finalAspect, ...finalOptions });
    return isObjectCall ? { imageUrl: url } : url;
  } catch (e: any) {
    logger.error("[MediaGen] Image Edit/Gen Error:", e.message);
    throw e;
  }
};

// ============================
// Research & Intelligence
// ============================



/**
 * Research trends using Google Search Grounding via Proxy
 */
export interface ResearchResult {
  text: string;
  tldr?: string;
  veracity?: any; // VeracityScore from scientificVerificationService
  veracity_string?: string; // Legacy SCIENTIFIC_VERACITY text block
  sources: any[];
  citationMap?: any[];
  sourceTiers?: Array<{ source: string; tier: number; reason: string }>;
  validationReady?: boolean;
  richContent?: any;
  meta?: any;
}

/**
 * AI-powered market research via Proxy (Search Grounding)
 */
export const researchTrends = async (
  query: string,
  language: string = 'es',
  brandContext?: any
): Promise<ResearchResult | null> => {
  try {
    // Use callMediaProxy which has built-in retry with backoff for rate limits
    const data = await callMediaProxy('RESEARCH', {
      query,
      language,
      brandContext
    });

    const fullText = data.text || "";

    // ── Quality Telemetry & Health Monitoring ──────────────────────────────────
    const sourceCount = data.sources?.length || 0;
    const isGeneric = fullText.includes("Dato no disponible");
    const hasRichContent = !!(data.richContent?.metrics?.length || data.richContent?.chartData?.length);

    telemetryService.logLatency({
      taskType: 'RESEARCH_QUALITY',
      durationMs: 0, 
      status: isGeneric ? 'failed' : (sourceCount > 2 ? 'success' : 'degraded'),
      metadata: { query, sourceCount, isGeneric, hasRichContent }
    });

    if (isGeneric || sourceCount === 0) {
      aiTechLogService.logError({
        feature: 'Research Hub Intelligence',
        errorMessage: `Low quality or missing data for research query: "${query}"`,
        context: { query, sourceCount, hasRichContent, language },
        severity: 'warning'
      });
    }

    // Extract blocks with fallback to full text
    const tldrMatch = fullText.match(/<TLDR>([\s\S]*?)<\/TLDR>/);
    const bodyMatch = fullText.match(/<RESEARCH_BODY>([\s\S]*?)<\/RESEARCH_BODY>/);
    const veracityMatch = fullText.match(/<SCIENTIFIC_VERACITY>([\s\S]*?)<\/SCIENTIFIC_VERACITY>/);

    return {
      text: bodyMatch ? bodyMatch[1].trim() : fullText,
      tldr: tldrMatch ? tldrMatch[1].trim() : undefined,
      veracity: data.veracity, // Scientific verification score from backend
      veracity_string: veracityMatch ? veracityMatch[1].trim() : undefined, // Legacy SCIENTIFIC_VERACITY block
      sources: data.sources || [],
      citationMap: data.citationMap,
      sourceTiers: data.sourceTiers,
      validationReady: data.validationReady,
      richContent: data.richContent,
      meta: data.meta
    };
  } catch (error: any) {
    logger.error('[MediaGen Research Error]:', error);
    
    aiTechLogService.logError({
      feature: 'Research Hub Network',
      errorMessage: error.message,
      context: { query, language },
      severity: 'error'
    });

    return null;
  }
};

export interface ThinkingResult {
  text: string;
  thinking: string;
  meta?: any;
}

/**
 * Deep reasoning content generation via Proxy
 */
export const generateThinkingContent = async (
  prompt: string,
  language: string = 'es',
  brandContext?: any
): Promise<ThinkingResult | null> => {
  try {
    // Use callMediaProxy which has built-in retry with backoff for rate limits
    const data = await callMediaProxy('THINKING', {
      prompt,
      language,
      brandContext
    });

    return {
      text: data.text,
      thinking: data.thinking || '',
      meta: data.meta
    };
  } catch (error: any) {
    logger.error('[MediaGen Thinking Error]:', error);
    return null;
  }
};

// ============================
// Brand PDF Analysis
// ============================

/**
 * Analyze a Brand Book PDF and extract brand profile data
 */
export const analyzeBrandBookPDF = async (pdfBase64: string, language: string = 'es'): Promise<any | null> => {
  try {
    const isLocalExpress = API_URL.includes(':3001');
    const endpoint = isLocalExpress 
      ? `${API_URL}/ai/media/generate` 
      : buildAbsoluteUrl('/.netlify/functions/api-media-generation');

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: new TextEncoder().encode(JSON.stringify({ type: 'BRAND_PDF_ANALYZE', payload: { pdfBase64, language } })),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Brand PDF error: ${response.status}`);
    }

    const data = await response.json();
    return data.brandData || null;
  } catch (error: any) {
    logger.error('[MediaGen Brand PDF Error]:', error);
    return null;
  }
};

// ============================
// Voice Analysis
// ============================

/**
 * Analyze voice characteristics from audio data
 */
export const analyzeVoice = async (audioBase64: string): Promise<any | null> => {
  try {
    const data = await callMediaProxy('VOICE_ANALYZE', { audioData: audioBase64 });
    return data?.voiceProfile || data?.profile || data || null;
  } catch (error: any) {
    logger.error('[MediaGen Voice Analysis Error]:', error);
    return null;
  }
};

/**
 * Masters a video for professional quality
 */
export const masterVideo = async (videoUrl: string, masterType: string = 'cinematic'): Promise<any | null> => {
  try {
    logger.info(`[MediaGen] Requesting Video Mastering via Proxy (${masterType})...`);
    const data = await callMediaProxy('VIDEO_MASTER', { videoUrl, masterType });
    return data || null;
  } catch (e) {
    logger.error('[MediaGen Video Master Error]:', e);
    return null;
  }
};

/**
 * Masters a product image using AI-powered background removal and platform-specific stylization
 */
export const masterProductImage = async (sourceImageBase64: string, ecommercePlatform: string = 'generico'): Promise<any | null> => {
  try {
    logger.info(`[MediaGen] Requesting Product Mastering via Proxy (${ecommercePlatform})...`);
    const data = await callMediaProxy('PRODUCT_MASTER', {
      sourceImageBase64,
      ecommercePlatform
    });
    return data || null;
  } catch (e) {
    logger.error('[MediaGen Product Master Error]:', e);
    return null;
  }
};

// ---------------------------------------------------------------------------
// Multi-Stage Video Generation
// ---------------------------------------------------------------------------

/**
 * Extracts the last frame of a video as a JPEG data URL using Canvas API.
 * Requires crossOrigin-accessible video URLs (GCS public bucket with CORS headers).
 */
export const extractLastFrame = (videoUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';
    video.src = proxiedAssetUrl(videoUrl);

    video.addEventListener('loadedmetadata', () => {
      // Seek slightly before end to avoid blank last frame in some browsers
      video.currentTime = Math.max(0, video.duration - 0.1);
    });

    video.addEventListener('seeked', () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas 2D context unavailable'));
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch (err) {
        reject(err);
      }
    });

    video.addEventListener('error', () =>
      reject(new Error(`Failed to load video for frame extraction: ${videoUrl}`))
    );
  });
};

/**
 * Generates a single video segment via VIDEO_GEN.
 */
export const generateSegmentVideo = async (
  prompt: string,
  format: string,
  segmentIndex: number,
  durationSeconds: number = 6,
  onProgress?: (attempt: number, max: number, stage?: string) => void,
  options?: {
    cameraMotion?: 'PAN'|'TILT'|'ZOOM'|'DOLLY';
    motionIntensity?: number;
    styleReference?: string;
    subjectReference?: string;
  }
): Promise<string | null> => {
  const segmentPrompt = segmentIndex === 0
    ? prompt
    : `${prompt} — continuation, seamless from previous scene, maintain style and lighting`;

  logger.info(`[MultiStage] Generating segment ${segmentIndex} (${durationSeconds}s) via VIDEO_GEN`);
  const data = await callMediaProxy('VIDEO_GEN', {
    prompt: segmentPrompt,
    format,
    musicVolume: 0,
    sceneAspects: '',
    durationSeconds,
    ...(options?.cameraMotion && { cameraMotion: options.cameraMotion }),
    ...(options?.motionIntensity !== undefined && { motionIntensity: options.motionIntensity }),
    ...(options?.styleReference && { styleReference: options.styleReference }),
    ...(options?.subjectReference && { subjectReference: options.subjectReference }),
  });

  if (data.url) return data.url;
  if (data.operationName) return await pollVideoStatus(data.operationName, onProgress);
  throw new Error(`No URL or operation returned for segment ${segmentIndex}`);
};

/**
 * Plans video segments using AI to match the narrative dynamics.
 */
export interface PlannedSegment {
  subPrompt: string;
  durationSeconds: number;
}

export const planVideoSegments = async (
  prompt: string,
  totalDuration: number
): Promise<{ segments: PlannedSegment[]; reasoningText: string }> => {
  logger.info(`[MediaGen] Planning segments for ${totalDuration}s video...`);
  const data = await callMediaProxy('PLAN_SEGMENTS', { prompt, totalDuration });
  return {
    segments: data.segments || [],
    reasoningText: data.reasoningText || ''
  };
};

export interface StageEvent {
  type: 'stage_started' | 'stage_completed' | 'stage_failed' | 'all_done';
  segmentIndex: number;
  videoUrl?: string;
  thumbnailDataUrl?: string;
  errorMessage?: string;
}

interface MultiStageParams {
  prompt: string;
  format: string;
  plannedSegments: PlannedSegment[];
}

/**
 * AsyncGenerator that orchestrates multi-stage video generation using AI-planned segments.
 */
export async function* generateMultiStageVideo(
  params: MultiStageParams,
  onPollingProgress?: (segmentIndex: number, attempt: number, max: number) => void
): AsyncGenerator<StageEvent> {
  let lastFrameDataUrl: string | null = null;

  for (let i = 0; i < params.plannedSegments.length; i++) {
    const segment = params.plannedSegments[i];
    yield { type: 'stage_started', segmentIndex: i };

    try {
      let videoUrl: string | null;

      if (i === 0 || lastFrameDataUrl === null) {
        // First segment (or fallback): text-to-video using subPrompt
        videoUrl = await generateSegmentVideo(
          segment.subPrompt,
          params.format,
          i,
          segment.durationSeconds,
          (attempt, max) => onPollingProgress?.(i, attempt, max)
        );
      } else {
        // Subsequent segments: image-to-video using subPrompt
        const rawBase64 = lastFrameDataUrl.replace(/^data:image\/(jpeg|jpg|png);base64,/, '');
        videoUrl = await animateImageWithVeo(
          rawBase64,
          segment.subPrompt,
          params.format,
          (attempt, max) => onPollingProgress?.(i, attempt, max),
          segment.durationSeconds
        );
      }

      if (!videoUrl) throw new Error('Veo returned no video URL');

      let thumbnailDataUrl: string | null = null;
      try {
        thumbnailDataUrl = await extractLastFrame(videoUrl);
        lastFrameDataUrl = thumbnailDataUrl;
      } catch (frameErr) {
        logger.warn(`[MultiStage] Could not extract last frame for segment ${i}:`, frameErr);
        // Non-fatal: next segment falls back to text-to-video
        lastFrameDataUrl = null;
      }

      yield {
        type: 'stage_completed',
        segmentIndex: i,
        videoUrl,
        thumbnailDataUrl: thumbnailDataUrl ?? undefined,
      };
    } catch (err: any) {
      yield { type: 'stage_failed', segmentIndex: i, errorMessage: err.message };
      return;
    }
  }

  yield { type: 'all_done', segmentIndex: params.plannedSegments.length - 1 };
}

/**
 * Persist a voiceover in the database (stored for 7 days).
 */
export const saveVoiceover = async (payload: {
  userId: string;
  voiceLabel: string;
  scriptText: string;
  audioUrl: string;
  provider?: string;
}) => {
  return await callMediaProxy('VOICEOVER_SAVE', payload);
};

/**
 * Get the list of recent voiceovers for a user.
 */
export const getVoiceoverList = async (userId: string) => {
  if (!userId) return [];
  return await callMediaProxy('VOICEOVER_LIST', { userId });
};

/**
 * Removes background from an image using AI (Replicate lucataco/remove-bg)
 */
export const removeImageBackground = async (imageUrl: string): Promise<string> => {
  try {
    const data = await callMediaProxy('IMAGE_REMOVE_BG', { image: imageUrl });
    if (!data || !data.url) throw new Error('Failed to remove background');
    return data.url;
  } catch (err: any) {
    logger.error('Background removal failed:', err);
    throw err;
  }
};

/**
 * Upscales an image using AI (Replicate nightmareai/real-esrgan)
 */
export const upscaleImage = async (imageUrl: string, scale: number = 2): Promise<string> => {
  try {
    const data = await callMediaProxy('IMAGE_UPSCALE', { image: imageUrl, scale });
    if (!data || !data.url) throw new Error('Failed to upscale image');
    return data.url;
  } catch (err: any) {
    logger.error('Upscale failed:', err);
    throw err;
  }
};

/**
 * Restores faces in an image using AI (CodeFormer)
 */
export const restoreFace = async (imageUrl: string, fidelity: number = 0.5): Promise<string> => {
  try {
    const data = await callMediaProxy('IMAGE_RESTORE_FACE', { image: imageUrl, fidelity });
    if (!data || !data.url) throw new Error('Failed to restore face');
    return data.url;
  } catch (err: any) {
    logger.error('Face restoration failed:', err);
    throw err;
  }
};

/**
 * Outpaints / Uncrops an image using AI (Replicate Outpaint)
 */
export const outpaintImage = async (imageUrl: string, prompt: string = "", scale: number = 1.5): Promise<string> => {
  try {
    const data = await callMediaProxy('IMAGE_OUTPAINT', { image: imageUrl, prompt, scale });
    if (!data || !data.url) throw new Error('Failed to outpaint image');
    return data.url;
  } catch (err: any) {
    logger.error('Outpainting failed:', err);
    throw err;
  }
};

/**
 * Extracts insights and creative assets from a URL (Web Scraping + Gemini)
 */
export const extractFromUrl = async (url: string): Promise<any> => {
  try {
    return await callMediaProxy('URL_EXTRACT', { url });
  } catch (err: any) {
    logger.error('URL extraction failed:', err);
    throw err;
  }
};

/**
 * Generates an audio script from a prompt
 */
export const generateAudioScript = async (prompt: string, brandContext?: string): Promise<any> => {
  try {
    return await callMediaProxy('AUDIO_SCRIPT_GEN', { prompt, brandContext });
  } catch (err: any) {
    logger.error('Audio script generation failed:', err);
    throw err;
  }
};

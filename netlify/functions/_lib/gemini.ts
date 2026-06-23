import { GoogleGenAI } from "@google/genai";

/**
 * Robust API key retrieval for Gemini — server-side (Netlify Functions).
 *
 * Priority order:
 *   1. GEMINI_API_KEY        — preferred server-side var (no VITE_ prefix)
 *   2. GOOGLE_GENAI_API_KEY  — alias accepted by some tooling
 *   3. GK_ENC                — Base64-encoded comma-separated key bundle
 *
 * NOTE: VITE_* vars are build-time injections for the client bundle.
 * They are NOT available at Netlify Function runtime unless explicitly duplicated
 * as server-side env vars — which wastes precious 4KB per-function payload budget.
 * Use GEMINI_API_KEY / GOOGLE_GENAI_API_KEY for all server-side code.
 */
export const getGeminiKey = (): { key: string; source: string } => {
    // SECURITY: NEVER reference VITE_* env vars here. Google Cloud's secret scanner
    // flagged VITE_GOOGLE_GENAI_API_KEY_* as leaked credentials, which caused project
    // suspension. Only use server-side env vars (no VITE_ prefix).
    const candidates = [
        { name: "GEMINI_API_KEY", value: process.env.GEMINI_API_KEY },
        { name: "GOOGLE_GENAI_API_KEY", value: process.env.GOOGLE_GENAI_API_KEY },
        { name: "PRIMARY", value: process.env.GOOGLE_GENAI_API_KEY_PRIMARY },
        { name: "SECONDARY", value: process.env.GOOGLE_GENAI_API_KEY_SECONDARY },
    ].filter(c => {
        if (!c.value) return false;
        const cleanVal = c.value.trim().replace(/^["']|["']$/g, "");
        return cleanVal.length > 20; // Support AIza and newer AQ. keys
    });

    if (candidates.length > 0) {
        // Rotate every minute based on timestamp for distribution
        const picked = candidates[Math.floor(Date.now() / 60000) % candidates.length];
        const cleanKey = picked.value!.trim().replace(/^["']|["']$/g, "");
        return { key: cleanKey, source: picked.name };
    }

    // Fallback: encoded key bundle — GK_ENC (server-side only, NO VITE_ prefix)
    const enc = process.env.GK_ENC || "";
    if (enc) {
        try {
            const decoded = Buffer.from(enc, 'base64').toString('utf-8');
            const keys = decoded.split(',').map((k: string) => k.trim()).filter((k: string) => k.length > 20);
            if (keys.length > 0) {
                const pickedKey = keys[Math.floor(Date.now() / 60000) % keys.length];
                return { key: pickedKey, source: "GK_ENC" };
            }
        } catch (e) {
            console.error("[Gemini Lib] Error decoding GK_ENC:", e);
        }
    }

    throw new Error(
        "No valid Gemini API key configured. " +
        "Set GEMINI_API_KEY (or GOOGLE_GENAI_API_KEY) in Netlify Site Settings > Environment Variables."
    );
};

/**
 * Returns ALL valid API keys as an ordered pool for quota-cycling.
 * On 429 RESOURCE_EXHAUSTED, callers can iterate this pool to try the next key
 * without re-invoking the same exhausted one.
 */
export const getGeminiKeyPool = (): string[] => {
    const named = [
        process.env.GEMINI_API_KEY,
        process.env.GOOGLE_GENAI_API_KEY,
        process.env.GOOGLE_GENAI_API_KEY_PRIMARY,
        process.env.GOOGLE_GENAI_API_KEY_SECONDARY,
    ];

    const pool = named
        .filter(Boolean)
        .map(v => v!.trim().replace(/^["']|["']$/g, ''))
        .filter(k => k.length > 20);

    // Also drain GK_ENC bundle
    const enc = process.env.GK_ENC || "";
    if (enc) {
        try {
            const decoded = Buffer.from(enc, 'base64').toString('utf-8');
            const encKeys = decoded.split(',').map((k: string) => k.trim()).filter((k: string) => k.length > 20);
            pool.push(...encKeys);
        } catch { /* ignore */ }
    }

    // Deduplicate while preserving order
    return [...new Set(pool)];
};

/**
 * Classify whether a Gemini API error is a credential error (expired / invalid key).
 * Credential errors must NEVER be retried — doing so wastes quota and hides the root cause.
 */
function isCredentialError(e: any): boolean {
    if (e?.isCredentialError) return true;
    const msg: string = (e?.message || '').toLowerCase();
    return (
        msg.includes('api key expired') ||
        msg.includes('api key not valid') ||
        msg.includes('invalid api key') ||
        msg.includes('api_key_invalid') ||
        msg.includes('permission_denied') ||
        (e?.status === 400 && (msg.includes('key') || msg.includes('credential')))
    );
}

/**
 * Retry helper with exponential backoff + key rotation on quota errors.
 *
 * KEY ROTATION STRATEGY:
 * - On 429 RESOURCE_EXHAUSTED: immediately cycle to the next key in the pool
 *   (no point waiting 1-8s on the same exhausted key).
 * - On 500+: standard exponential backoff (1s, 2s, 4s).
 * - Max 3 attempts total across all keys.
 * ⚠️  Credential errors (expired / invalid API key) are NEVER retried.
 */
async function retryWithBackoff<T>(
    fn: (key?: string) => Promise<T>,
    maxAttempts: number = 3,
    keyPool?: string[]
): Promise<T> {
    let lastError: any;
    let keyIndex = 0;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        // On quota errors, advance to the next key in the pool
        const currentKey = keyPool && keyPool.length > 0
            ? keyPool[keyIndex % keyPool.length]
            : undefined;

        try {
            return await fn(currentKey);
        } catch (e: any) {
            lastError = e;

            // Credential errors are fatal — stop immediately so the caller gets a
            // meaningful 401/403 and doesn't burn retries (or show a misleading 500).
            if (isCredentialError(e)) {
                console.error(`[Gemini] Credential error — stopping retries: ${e.message}`);
                throw e;
            }

            // Timeout errors are fatal — retrying a 24s timeout inside a 26s Netlify
            // function would just hit the hard limit and produce a cryptic abort.
            if (e.isTimeout || e.status === 504) {
                console.error(`[Gemini] Timeout error — stopping retries: ${e.message}`);
                throw e;
            }

            const isQuotaError = e.status === 429;
            const isServerError = e.status && e.status >= 500;
            const isRetryable = isQuotaError || isServerError;
            const isLastAttempt = attempt === maxAttempts;

            if (!isRetryable || isLastAttempt) throw e;

            if (isQuotaError && keyPool && keyPool.length > 1) {
                // On 429: rotate to the next key immediately — no backoff needed
                keyIndex++;
                const nextKey = keyPool[keyIndex % keyPool.length];
                console.warn(`[Gemini] 429 quota on key ...${currentKey?.slice(-4)} — rotating to next key ...${nextKey.slice(-4)} (attempt ${attempt}/${maxAttempts})`);
            } else {
                // On 5xx: standard exponential backoff
                const backoffMs = Math.pow(2, attempt - 1) * 1000;
                console.log(`[Gemini] Retry ${attempt}/${maxAttempts} after ${backoffMs}ms (${e.message})`);
                await new Promise(resolve => setTimeout(resolve, backoffMs));
            }
        }
    }
    throw lastError;
}

/**
 * Native fetch implementation for Gemini API with retry logic.
 * Bypasses @google/genai SDK to avoid the "config" field bug causing 400 errors.
 */
export async function callGeminiApi(params: {
    model?: string;
    contents: any[];
    systemInstruction?: string | { parts: { text: string }[] };
    generationConfig?: any;
    safetySettings?: any[];
    tools?: any[];
    apiKey?: string;
}) {
    const defaultKeyPool = getGeminiKeyPool();
    const keyPool = params.apiKey ? [params.apiKey, ...defaultKeyPool] : defaultKeyPool;
    const model = params.model || DEFAULT_MODEL;

    // The REST API (v1beta) expects snake_case for top-level fields and parts.
    const mapContents = (items: any[]): any[] => {
        if (!Array.isArray(items)) return items;
        return items.map(item => {
            if (!item || typeof item !== 'object') return item;
            const mappedItem = { ...item };

            if (mappedItem.parts && Array.isArray(mappedItem.parts)) {
                mappedItem.parts = mappedItem.parts.map((part: any) => {
                    const mappedPart = { ...part };
                    if (mappedPart.inlineData) {
                        mappedPart.inline_data = {
                            data: mappedPart.inlineData.data,
                            mime_type: mappedPart.inlineData.mimeType || mappedPart.inlineData.mime_type
                        };
                        delete mappedPart.inlineData;
                    }
                    if (mappedPart.fileData) {
                        mappedPart.file_data = {
                            file_uri: mappedPart.fileData.fileUri || mappedPart.fileData.file_uri,
                            mime_type: mappedPart.fileData.mimeType || mappedPart.fileData.mime_type
                        };
                        delete mappedPart.fileData;
                    }
                    if (mappedPart.videoMetadata) {
                        mappedPart.video_metadata = {
                            start_offset: mappedPart.videoMetadata.startOffset || mappedPart.videoMetadata.start_offset,
                            end_offset: mappedPart.videoMetadata.endOffset || mappedPart.videoMetadata.end_offset
                        };
                        delete mappedPart.videoMetadata;
                    }
                    return mappedPart;
                });
            }
            return mappedItem;
        });
    };

    const buildBody = (): any => {
        const body: any = {
            contents: mapContents(params.contents),
        };

        if (params.systemInstruction) {
            if (typeof params.systemInstruction === 'string') {
                body.system_instruction = { parts: [{ text: params.systemInstruction }] };
            } else {
                body.system_instruction = params.systemInstruction;
            }
        }

        if (params.generationConfig) {
            const config = params.generationConfig;
            body.generation_config = {
                temperature: config.temperature,
                top_p: config.topP,
                top_k: config.topK,
                candidate_count: config.candidateCount,
                max_output_tokens: config.maxOutputTokens,
                stop_sequences: config.stopSequences,
                response_mime_type: config.responseMimeType,
                response_schema: config.responseSchema,
            };

            if (config.thinkingConfig) {
                body.generation_config.thinking_config = {
                    include_thoughts: config.thinkingConfig.includeThoughts,
                    thinking_budget: config.thinkingConfig.thinkingBudget,
                    thinking_level: config.thinkingConfig.thinkingLevel,
                };
                Object.keys(body.generation_config.thinking_config).forEach(k => {
                    if (body.generation_config.thinking_config[k] === undefined) delete body.generation_config.thinking_config[k];
                });
            }

            Object.keys(body.generation_config).forEach(k => {
                if (body.generation_config[k] === undefined) delete body.generation_config[k];
            });
        }

        if (params.safetySettings) {
            body.safety_settings = params.safetySettings;
        }

        if (params.tools) {
            body.tools = params.tools;
        }

        return body;
    };

    return await retryWithBackoff(async (activeKey?: string) => {
        const key = activeKey || (keyPool[0] ?? getGeminiKey().key);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
        const abortController = new AbortController();
        const timeout = setTimeout(() => abortController.abort(), 25500);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(buildBody()),
                signal: abortController.signal
            });

            if (!response.ok) {
                let errorText = '';
                let errorBody: any = {};
                try {
                    errorText = await response.text();
                    errorBody = JSON.parse(errorText);
                } catch { /* ignore parse failure */ }

                const apiMessage: string =
                    errorBody?.error?.message ||
                    errorBody?.error?.status ||
                    errorText ||
                    `HTTP ${response.status}`;

                const err: any = new Error(`Gemini API error (${response.status}): ${apiMessage}`);
                err.status = response.status;
                err.apiMessage = apiMessage;
                err.keyUsed = `${key.slice(0, 8)}...`;

                if (
                    apiMessage.toLowerCase().includes('api key expired') ||
                    apiMessage.toLowerCase().includes('api key not valid') ||
                    apiMessage.toLowerCase().includes('invalid api key') ||
                    errorBody?.error?.status === 'PERMISSION_DENIED'
                ) {
                    err.isCredentialError = true;
                    console.error(`[Gemini] ⚠️ Credential error detected: ${apiMessage}`);
                }

                if (response.status === 429) {
                    err.isQuota = true;
                    console.warn(`[Gemini] 429 RESOURCE_EXHAUSTED on key ...${key.slice(-4)} | keyPool size: ${keyPool.length}`);
                }

                throw err;
            }

            return await response.json();
        } catch (e: any) {
            if (e.name === 'AbortError' || e.code === 20) {
                const timeoutErr: any = new Error(
                    'Gemini API timeout (24s): el modelo tardó demasiado. Intenta con una imagen más pequeña o inténtalo de nuevo.'
                );
                timeoutErr.status = 504;
                timeoutErr.isTimeout = true;
                throw timeoutErr;
            }
            throw e;
        } finally {
            clearTimeout(timeout);
        }
    }, 3, keyPool);
}

/**
 * Native fetch implementation for Imagen 3/4 with retry logic.
 * Bypasses @google/genai SDK to avoid serialization issues.
 *
 * Imagen 3 AI Studio body: flat fields (prompt string, numberOfImages, aspectRatio, personGeneration)
 * Imagen 4 AI Studio body: wrapped prompt object ({ prompt: { text }, number_of_images, aspect_ratio })
 * Reference: https://ai.google.dev/api/generate-images
 */
export async function callImagenApi(params: {
    model?: string;
    prompt: string;
    numberOfImages?: number;
    aspectRatio?: string;
    personGeneration?: string;
    safetySetting?: string;
}) {
    const keyPool = getGeminiKeyPool();
    const model = params.model || "imagen-3.0-generate-001";
    const isImagen4 = model.startsWith('imagen-4');

    const buildBody = (key?: string): any => {
        return isImagen4
            ? {
                prompt: { text: params.prompt },
                number_of_images: params.numberOfImages || 1,
                ...(params.aspectRatio ? { aspect_ratio: params.aspectRatio } : {}),
                person_generation: params.personGeneration === 'DONT_ALLOW'
                    ? 'DONT_ALLOW'
                    : (params.personGeneration || 'DONT_ALLOW'),
                safety_setting: params.safetySetting || 'BLOCK_MEDIUM_AND_ABOVE',
            }
            : {
                prompt: params.prompt,
                numberOfImages: params.numberOfImages || 1,
                aspectRatio: params.aspectRatio || "1:1",
                personGeneration: params.personGeneration || "DONT_ALLOW",
                safetySetting: params.safetySetting || "BLOCK_MEDIUM_AND_ABOVE"
            };
    };

    return await retryWithBackoff(async (activeKey?: string) => {
        const key = activeKey || (keyPool[0] ?? getGeminiKey().key);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateImages?key=${key}`;
        const abortController = new AbortController();
        const timeout = setTimeout(() => abortController.abort(), 22000);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(buildBody(key)),
                signal: abortController.signal
            });

            if (!response.ok) {
                let errorText = await response.text();
                let userMessage = `Imagen API error (${response.status}): ${errorText}`;
                try {
                    const errJson = JSON.parse(errorText);
                    userMessage = `Imagen API error (${response.status}): ` +
                        (errJson?.error?.message || errJson?.error?.status || errorText);
                } catch { /* ignore */ }
                const err: any = new Error(userMessage);
                err.status = response.status;
                if (response.status === 429) {
                    err.isQuota = true;
                    console.warn(`[Imagen] 429 RESOURCE_EXHAUSTED on key ...${key.slice(-4)} | keyPool size: ${keyPool.length}`);
                }
                throw err;
            }

            return await response.json();
        } finally {
            clearTimeout(timeout);
        }
    }, 3, keyPool);
}

/**
 * Standardized GoogleGenAI client initialization.
 * @deprecated Use callGeminiApi instead to avoid SDK serialization bugs.
 */
export const getGenAI = () => {
    const { key } = getGeminiKey();
    return new GoogleGenAI({ apiKey: key });
};

export const DEFAULT_MODEL = "gemini-2.5-flash";
export const VISION_MODEL = "gemini-2.5-flash";

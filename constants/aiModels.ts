/**
 * AI Model Centralized Configuration
 * =================================
 * This file serves as the Single Source of Truth for all AI models used across the platform.
 * Avoid hardcoding model identifiers in service files to prevent 404/NOT_FOUND errors
 * when models are deprecated or renamed in the Gemini API.
 */

export const AI_MODELS = {
  /**
   * Primary model for all analytical tasks (Search, Image, Video Audit).
   * Stable version is preferred over experimental/thinking models to ensure uptime.
   */
  PRIMARY_ANALYSIS: "gemini-2.5-flash",

  /**
   * Model for content generation (Ad Copy, Strategy plans).
   */
  CONTENT_GENERATION: "gemini-2.5-flash",

  /**
   * Specialized model for long-context understanding (if needed).
   */
  LONG_CONTEXT: "gemini-1.5-pro",

  /**
   * Experimental model for reasoning/thinking.
   * WARNING: Use only for non-critical features as availability is not guaranteed.
   */
  EXPERIMENTAL_REASONING: "gemini-2.5-flash-thinking-exp-01-21",

  /**
   * OpenRouter Free Models
   * Specialized for creative copywriting and routine logic.
   */
  OPENROUTER_LLAMA_3_8B: "meta-llama/llama-3-8b-instruct:free",
  OPENROUTER_MISTRAL_7B: "mistralai/mistral-7b-instruct:free",
  OPENROUTER_GEMMA_2_9B: "google/gemma-2-9b-it:free",

  /**
   * DeepSeek Native API
   * Highly optimized for reasoning, code, and text generation at a low cost.
   */
  DEEPSEEK_CHAT: "deepseek-chat",
  DEEPSEEK_REASONER: "deepseek-reasoner",

  /**
   * Zhipu AI (GLM)
   * High performance alternative.
   */
  GLM_5_2: "glm-5.2",
  GLM_4_7: "glm-4.7",

  /**
   * Local Ollama Models (Desktop App)
   * Deprecated: Use OLLAMA_RANKED_MODELS and pickBestLocalModel() instead
   */
  LOCAL_PRIMARY: "gemma4:e4b",
  LOCAL_FALLBACK: "gemma4:latest",
};

export type OllamaModelTier = "premium" | "high" | "balanced" | "fast";

export interface OllamaModelConfig {
  id: string;
  score: number; // 1-10, higher = better for SEM/Ads analysis in Spanish
  tier: OllamaModelTier;
  sizeMB: number;
  label: string;
}

/**
 * Ollama Models Ranked by Capability
 * Ordered from best to worst for SEM/Ads audit tasks in Spanish
 * Includes score (1-10), tier classification, approximate size, and user-friendly label
 */
export const OLLAMA_RANKED_MODELS: OllamaModelConfig[] = [
  { id: "llama3.3:70b",    score: 10, tier: "premium",  sizeMB: 43000, label: "Llama 3.3 70B" },
  { id: "qwen2.5:72b",     score: 9,  tier: "premium",  sizeMB: 47000, label: "Qwen 2.5 72B" },
  { id: "llama3.1:70b",    score: 9,  tier: "premium",  sizeMB: 43000, label: "Llama 3.1 70B" },
  { id: "phi4:14b",        score: 8,  tier: "high",     sizeMB: 9100,  label: "Phi-4 14B" },
  { id: "qwen2.5:32b",     score: 8,  tier: "high",     sizeMB: 20000, label: "Qwen 2.5 32B" },
  { id: "llama3.1:8b",     score: 7,  tier: "balanced", sizeMB: 4900,  label: "Llama 3.1 8B" },
  { id: "qwen2.5:7b",      score: 7,  tier: "balanced", sizeMB: 4700,  label: "Qwen 2.5 7B" },
  { id: "gemma3:12b",      score: 7,  tier: "balanced", sizeMB: 8100,  label: "Gemma 3 12B" },
  { id: "mistral:7b",      score: 6,  tier: "balanced", sizeMB: 4100,  label: "Mistral 7B" },
  { id: "llama3.2:3b",     score: 5,  tier: "fast",     sizeMB: 2000,  label: "Llama 3.2 3B" },
  { id: "gemma3:4b",       score: 5,  tier: "fast",     sizeMB: 3300,  label: "Gemma 3 4B" },
  { id: "gemma4:e4b",      score: 5,  tier: "fast",     sizeMB: 3200,  label: "Gemma 4 E4B" },
  { id: "gemma4:latest",   score: 4,  tier: "fast",     sizeMB: 3200,  label: "Gemma 4" },
];

/**
 * Pick the best available local model from a list of installed models
 * Uses prefix matching: "llama3.1:8b-instruct-q4" matches "llama3.1:8b"
 * Falls back to the first available model if no ranked models found
 */
export function pickBestLocalModel(available: string[]): string | null {
  if (!available || available.length === 0) return null;

  for (const rankedModel of OLLAMA_RANKED_MODELS) {
    const base = rankedModel.id.split(':')[0];
    const match = available.find(m => m === rankedModel.id || m.startsWith(base + ':'));
    if (match) return match;
  }

  // Last resort: return first available model
  return available[0] ?? null;
}

/**
 * Get configuration details for a specific model
 * Supports prefix matching: "llama3.1:8b-instruct-q4" returns config for "llama3.1:8b"
 */
export function getModelConfig(modelId: string): OllamaModelConfig | undefined {
  if (!modelId) return undefined;
  const base = modelId.split(':')[0];
  return OLLAMA_RANKED_MODELS.find(r => modelId === r.id || modelId.startsWith(base + ':'));
}

/**
 * Get all valid local model aliases (derived from ranking)
 * Used for validation and UI filters
 */
export const LOCAL_ALIASES = OLLAMA_RANKED_MODELS.map(m => m.id);


/**
 * Task-to-Model Routing Configuration
 * Ensures each task is handled by the most capable/efficient model.
 * Includes fallback to Gemini if DeepSeek is not configured.
 */
export const MODEL_ROUTING = {
  ADS_AUDIT: { provider: "vertex", model: AI_MODELS.PRIMARY_ANALYSIS },
  PAGESPEED_AUDIT: { provider: "studio", model: AI_MODELS.DEEPSEEK_REASONER, fallback: AI_MODELS.EXPERIMENTAL_REASONING },
  MEDIA_AUDIT: { provider: "studio", model: AI_MODELS.PRIMARY_ANALYSIS },
  ADS_GENERATION: { provider: "studio", model: AI_MODELS.DEEPSEEK_CHAT, fallback: AI_MODELS.CONTENT_GENERATION },
  FUNNEL_GEN: { provider: "studio", model: AI_MODELS.DEEPSEEK_CHAT, fallback: AI_MODELS.CONTENT_GENERATION },
  CHAT_EXPERT: { provider: "studio", model: AI_MODELS.DEEPSEEK_REASONER, fallback: AI_MODELS.EXPERIMENTAL_REASONING },
  TEXT_AUDIT: { provider: "studio", model: AI_MODELS.DEEPSEEK_CHAT, fallback: AI_MODELS.CONTENT_GENERATION },
  BLOG_GEN: { provider: "studio", model: AI_MODELS.DEEPSEEK_CHAT, fallback: AI_MODELS.CONTENT_GENERATION },
  VISION_ANALYSIS: { provider: "studio", model: AI_MODELS.PRIMARY_ANALYSIS },
};

/**
 * Current stable default to be used by the AiUniversalBridge
 */
export const GLOBAL_MODEL_ID = AI_MODELS.PRIMARY_ANALYSIS;

import { buildAbsoluteUrl } from "../../utils/apiConfig";
import { GoogleGenAI } from "@google/genai";
// VertexAI removed from top-level to prevent browser bundling crashes (isTTY error)
import type { VertexAI as VertexAIType, GenerationConfig } from "@google-cloud/vertexai";
import { keyRotationService } from "./keyRotationService";

import { GLOBAL_MODEL_ID, MODEL_ROUTING, AI_MODELS, LOCAL_ALIASES, pickBestLocalModel, getModelConfig } from "../../constants/aiModels";
import { logger } from '../../utils/logger';
import { authService } from "../auth/authService";
import { ExecutionRouter } from "../bridge/ExecutionRouter";


/**
 * Standardized AI request parameters
 */
export interface GenerateParams {
  contents: any[];
  config?: any;
}

/**
 * Common interface for all AI interactions
 */
export interface IAiProvider {
  provider: string;
  generateContent(params: GenerateParams): Promise<any>;
}

/**
 * Google AI Studio Implementation (API Key based)
 */
export class StudioProvider implements IAiProvider {
  provider = "studio" as const;
  private ai: any;
  private modelId: string;
  private apiKey: string;

  constructor(apiKey: string, modelId: string = GLOBAL_MODEL_ID) {
    this.ai = new GoogleGenAI({ apiKey });
    this.modelId = modelId;
    this.apiKey = apiKey;
  }

  async generateContent(params: GenerateParams): Promise<any> {
    // Determine if we should use the proxy or direct SDK
    // 1. If we are running in Desktop mode (Tauri), we can use the direct SDK safely with the user's key
    // 2. If it's a web production environment, we MUST use the proxy to hide the server API key
    // 3. If it's local web development, we use the SDK directly
    const isDesktop = ExecutionRouter.isDesktopMode();
    const isProductionWeb = import.meta.env.PROD && !isDesktop;

    if (isProductionWeb) {
      try {
        const userId = authService.getCurrentUser()?.id || '';

        const requestBody = JSON.stringify({
            contents: params.contents,
            config: params.config,
            modelId: this.modelId
        });
        
        // Use user's local API key if they provided one
        const apiKey = this.apiKey || keyRotationService.getNextKey();
        
        const response = await fetch(buildAbsoluteUrl('/.netlify/functions/api-ai-proxy'), {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(userId ? { 'X-User-Id': userId } : {}),
            ...(apiKey ? { 'X-Gemini-Key': apiKey } : {})
          },
          body: new TextEncoder().encode(requestBody)
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const error: any = new Error(errData.error || `Proxy error: ${response.statusText}`);
          error.status = response.status;
          throw error;
        }

        const data = await response.json();
        // Mimic Google SDK response structure to maintain compatibility
        return {
          response: {
            text: () => data.text,
            candidates: [{ content: { parts: [{ text: data.text }] } }]
          },
          text: data.text
        };
      } catch (error: any) {
        console.error('[StudioProvider] Request failed:', error);
        throw error;
      }
    }

    // Direct SDK execution (Desktop App or Local Web Dev)
    if (!this.ai) {
        throw new Error("No API key available for direct SDK execution.");
    }
    const config = {
      ...params.config,
    };
    return this.ai.models.generateContent({
      model: this.modelId,
      contents: params.contents,
      config: config as any
    });
  }
}

/**
 * OpenRouter Implementation (Multi-model aggregation)
 */
export class OpenRouterProvider implements IAiProvider {
  provider = "openrouter" as const;
  private modelId: string;
  private apiKey: string;

  constructor(apiKey?: string, modelId: string = AI_MODELS.OPENROUTER_LLAMA_3_8B) {
    // SECURITY: Do NOT use import.meta.env.VITE_OPENROUTER_API_KEY here.
    // Vite embeds VITE_* values literally into the production bundle (dist/),
    // which would expose the API key to any browser user.
    // OpenRouter keys must come from user settings (apiKey param) or server-side proxy.
    this.apiKey = apiKey || "";
    this.modelId = modelId;
  }

  /**
   * Translates Gemini content parts to OpenAI/OpenRouter message format
   */
  private translateToMessages(contents: any[]): any[] {
    return contents.map(item => {
      const textPart = item.parts?.find((p: any) => p.text)?.text || "";
      return {
        role: item.role === "model" ? "assistant" : item.role === "user" ? "user" : "system",
        content: textPart
      };
    });
  }

  async generateContent(params: GenerateParams): Promise<any> {
    if (!this.apiKey) {
      throw new Error("OpenRouter API Key not found in environment variables.");
    }

    const messages = this.translateToMessages(params.contents);
    
    // Support system instruction if present in config
    if (params.config?.systemInstruction) {
      messages.unshift({
        role: "system",
        content: typeof params.config.systemInstruction === 'string' 
          ? params.config.systemInstruction 
          : params.config.systemInstruction.parts?.[0]?.text || ""
      });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://insitu.company", // Optional, for OpenRouter rankings
        "X-Title": "INsitu AI Ads"
      },
      body: JSON.stringify({
        model: this.modelId,
        messages,
        temperature: params.config?.temperature || 0.7,
        max_tokens: params.config?.maxOutputTokens || 4000,
      })
    });

    const responseText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(responseText || "{}");
    } catch {
      throw new Error(`OpenRouter Error (${response.status}): ${responseText || response.statusText}`);
    }

    if (!response.ok) {
      const errMsg = errorData?.error?.message || JSON.stringify(errorData?.error || {}) || response.statusText;
      throw new Error(`OpenRouter Error: ${errMsg}`);
    }

    const data = errorData;
    const completionText = data.choices?.[0]?.message?.content || "";

    // Adapt response to match Gemini's structure to minimize refactoring in services
    return {
      text: completionText,
      response: {
        text: () => completionText
      },
      candidates: [{
        content: {
          parts: [{ text: completionText }]
        }
      }]
    };
  }
}

/**
 * Google Cloud Vertex AI Implementation (GCP native)
 */
export class VertexProvider implements IAiProvider {
  provider = "vertex" as const;
  private vertexAi: any;
  private modelId: string;

  constructor(modelId: string = "gemini-1.5-pro") {
    this.modelId = modelId;

    // Check if we are in Node.js environment
    const isNode = typeof process !== "undefined" && process.versions && process.versions.node;
    if (!isNode) {
      logger.warn("[AiBridge] Vertex AI is not supported in the browser. Falling back to API Studio where possible.");
      return;
    }

    const projectId = (import.meta as any).env?.VITE_GCP_PROJECT_ID || process.env.GCP_PROJECT_ID || "insitu-ai-ads-prod";
    const location = (import.meta as any).env?.VITE_GCP_LOCATION || process.env.GCP_LOCATION || "us-central1";

    try {
      if (typeof require === "function") {
        const { VertexAI } = require("@google-cloud/vertexai");
        this.vertexAi = new VertexAI({ project: projectId, location });
      } else {
        logger.error("[AiBridge] require() not available to load Vertex AI.");
      }
    } catch (e) {
      logger.error("[AiBridge] Failed to load Vertex AI (Node-only library mismatch):", e);
    }
  }

  async generateContent(params: GenerateParams): Promise<any> {
    if (!this.vertexAi) {
      throw new Error("Vertex AI Provider not initialized or not supported in this environment.");
    }
    const model = this.vertexAi.getGenerativeModel({ model: this.modelId });
    const config: any = {
      ...params.config,
    };
    return model.generateContent({
      contents: params.contents,
      generationConfig: config
    });
  }
}

/**
 * Zhipu AI (GLM) Implementation
 */
export class ZhipuProvider implements IAiProvider {
  provider = "zhipu" as const;
  private modelId: string;
  private apiKey: string;

  constructor(apiKey: string, modelId: string = AI_MODELS.GLM_5_2) {
    this.apiKey = apiKey;
    this.modelId = modelId;
  }

  private translateToMessages(contents: any[]): any[] {
    return contents.map(item => {
      const textPart = item.parts?.find((p: any) => p.text)?.text || "";
      return {
        role: item.role === "model" ? "assistant" : item.role === "user" ? "user" : "system",
        content: textPart
      };
    });
  }

  async generateContent(params: GenerateParams): Promise<any> {
    if (!this.apiKey) {
      throw new Error("Zhipu API Key not found.");
    }

    const messages = this.translateToMessages(params.contents);
    
    // Support system instruction if present in config
    if (params.config?.systemInstruction) {
      messages.unshift({
        role: "system",
        content: typeof params.config.systemInstruction === 'string' 
          ? params.config.systemInstruction 
          : params.config.systemInstruction.parts?.[0]?.text || ""
      });
    }

    const response = await fetch("https://api.z.ai/api/paas/v4/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.modelId,
        messages,
        temperature: params.config?.temperature || 0.7,
        max_tokens: params.config?.maxOutputTokens || 4000,
        stream: false
      })
    });

    const responseText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(responseText || "{}");
    } catch {
      throw new Error(`Zhipu Error (${response.status}): ${responseText || response.statusText}`);
    }

    if (!response.ok) {
      const errMsg = errorData?.error?.message || JSON.stringify(errorData?.error || {}) || response.statusText;
      throw new Error(`Zhipu Error: ${errMsg}`);
    }

    const data = errorData;
    const completionText = data.choices?.[0]?.message?.content || "";

    // Adapt response to match Gemini's structure to minimize refactoring in services
    return {
      text: completionText,
      response: {
        text: () => completionText
      },
      candidates: [{
        content: {
          parts: [{ text: completionText }]
        }
      }]
    };
  }
}


/**
 * Local Tauri/Ollama Implementation (Privacy-first)
 */
export class LocalProvider implements IAiProvider {
  provider = "local" as const;
  private modelId: string;

  constructor(modelId: string = "llama3") {
    this.modelId = modelId;
  }

  private translateToMessages(contents: any[]): any[] {
    return contents.map(item => {
      const textPart = item.parts?.find((p: any) => p.text)?.text || "";
      return {
        role: item.role === "model" ? "assistant" : item.role === "user" ? "user" : "system",
        content: textPart
      };
    });
  }

  async generateContent(params: GenerateParams): Promise<any> {
    if (!ExecutionRouter.isDesktopMode()) {
      throw new Error("Local Provider is only available in Desktop mode.");
    }

    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error("Unauthenticated for local execution");
    }

    // 1. Check Limits before execution
    // (Assuming text/audit task for now)
    const limitsCheck = authService.checkPlanLimits(user, 'text');
    if (!limitsCheck.allowed) {
      throw new Error(limitsCheck.reason || "Límite de plan alcanzado en modo local.");
    }

    // Translate contents to structured messages
    const messages = this.translateToMessages(params.contents);
    
    // Support system instruction if present in config
    if (params.config?.systemInstruction) {
      messages.unshift({
        role: "system",
        content: typeof params.config.systemInstruction === 'string' 
          ? params.config.systemInstruction 
          : params.config.systemInstruction.parts?.[0]?.text || ""
      });
    }

    try {
      // 2. Execute local model (Ollama via Tauri)
      logger.info(`[LocalProvider] Attempting run_local_audit with model ${this.modelId}`);
      const resultText = await ExecutionRouter.routeTask<any, string>(
        'run_local_audit',
        { messages, modelId: this.modelId },
        // Fallback: Use Gemini cloud if Ollama unavailable or not in Tauri
        async () => {
          logger.warn(`[LocalProvider] Ollama unavailable, falling back to Gemini Cloud`);
          const studioKey = keyRotationService.getNextKey();
          const studioProvider = new StudioProvider(studioKey, GLOBAL_MODEL_ID);
          const geminiResponse = await studioProvider.generateContent({
            contents: [{ role: "user", parts: [{ text: messages.map(m => m.content).join('\n') }] }],
            config: {}
          });
          return geminiResponse.text?.() || geminiResponse.text || "No response";
        }
      );

      // 3. Track tokens after successful execution
      const estimatedTokens = Math.ceil(resultText.length / 4);
      try {
        authService.trackTokenUsage(estimatedTokens, `Local or Cloud Execution (${this.modelId})`, undefined, 'text');
      } catch (err) {
        logger.error("[LocalProvider] Failed to track tokens:", err);
      }

      return {
        text: resultText,
        response: { text: () => resultText },
        candidates: [{ content: { parts: [{ text: resultText }] } }]
      };
    } catch (e: any) {
      logger.error(`[LocalProvider] Error:`, e);
      throw e;
    }
  }
}

/**
 * Track the currently active local model (if any)
 * Updated dynamically when Ollama is detected and used
 */
let _activeLocalModel: string | null = null;

export const getActiveLocalModel = (): string | null => _activeLocalModel;
export const setActiveLocalModel = (modelId: string | null): void => {
  _activeLocalModel = modelId;
};

/**
 * Factory for creating AI Providers
 */
export const ProviderFactory = {
  create: (providerType: string, apiKey: string, modelId: string): IAiProvider | null => {
    const isNode = typeof process !== "undefined" && process.versions && process.versions.node;
    switch (providerType) {
      case "local":
        return new LocalProvider(modelId);
      case "vertex":
        return isNode ? new VertexProvider(modelId) : null;
      case "studio":
        return new StudioProvider(apiKey, modelId);
      case "openrouter":
        return apiKey ? new OpenRouterProvider(apiKey, modelId) : null;
      case "zhipu":
        return new ZhipuProvider(apiKey, modelId);
      default:
        throw new Error(`Unknown provider type: ${providerType}`);
    }
  }
};

/**
 * Global Bridge Factory
 */
export const aiBridge = {
  /**
   * Returns a provider based on task routing (Collaborative AI)
   */
  getSmartProvider: (task: keyof typeof MODEL_ROUTING, apiKey?: string): IAiProvider => {
    // Return a facade that delegates to executeSmartTask
    return {
      provider: "studio", // Placeholder, actual execution provider is determined dynamically
      generateContent: async (params: GenerateParams) => {
        return await aiBridge.executeSmartTask(task, params, apiKey);
      }
    };
  },

  /**
   * Safe execution with failover to OpenRouter
   */
  executeSmartTask: async (task: keyof typeof MODEL_ROUTING, params: GenerateParams, apiKey?: string): Promise<any> => {
    const route = MODEL_ROUTING[task];
    let providersToTry: string[] = [];

    // On Desktop (Tauri), ALWAYS try Ollama first (local first, cloud fallback)
    if (ExecutionRouter.isDesktopMode()) {
      logger.info(`[AiBridge] Running in Desktop mode — prioritizing Ollama (local) first`);
      providersToTry.push("local");

      // Optionally check for best model, but don't block on this check
      try {
        const ollamaStatus = await ExecutionRouter.routeTask<any, any>(
          'check_ollama_status',
          {},
          async () => ({ installed: false, running: false, models: [] })
        );

        if (ollamaStatus && ollamaStatus.models.length > 0) {
          const preferredModel = pickBestLocalModel(ollamaStatus.models);
          if (preferredModel) {
            logger.info(`[AiBridge] Auto-detected Ollama model: ${preferredModel}`);
            setActiveLocalModel(preferredModel);
            (route as any).localModelOverride = preferredModel;
          }
        }
      } catch (e) {
        logger.debug("[AiBridge] Could not detect Ollama status, will attempt connection anyway", e);
      }
    }

    // Append standard providers for failover/fallback
    const standardProviders: string[] = [];
    if (route.provider === "vertex") {
      standardProviders.push("vertex", "studio", "openrouter");
    } else if (route.provider === "studio") {
      standardProviders.push("studio", "vertex", "openrouter");
    } else if (route.provider === "zhipu") {
      standardProviders.push("zhipu", "studio", "openrouter");
    } else {
      standardProviders.push(route.provider, "openrouter", "vertex", "studio");
    }

    for (const p of standardProviders) {
      if (!providersToTry.includes(p)) {
        providersToTry.push(p);
      }
    }

    let lastError: any;
    let firstError: any = null;
    const isNode = typeof process !== "undefined" && process.versions && process.versions.node;

    for (const providerType of providersToTry) {
      let currentProviderKey = "";
      try {
        let provider: IAiProvider | null = null;
        let activeModelId = route.model;

        if (providerType === "local") {
          activeModelId = (route as any).localModelOverride || AI_MODELS.LOCAL_PRIMARY;
        } else if (providerType === "studio" || providerType === "zhipu") {
          // Both Studio and Zhipu can use the key rotation service
          currentProviderKey = apiKey || keyRotationService.getNextKey(providerType);
        } else if (providerType === "openrouter") {
          currentProviderKey = apiKey || keyRotationService.getNextKey(providerType);
        }

        provider = ProviderFactory.create(providerType, currentProviderKey, activeModelId);

        if (!provider) {
          continue; // E.g., vertex in browser, or openrouter with no key
        }

        logger.info(`[AiBridge] Executing ${task} via ${providerType}...`);
        const result = await provider.generateContent(params);
        
        if (currentProviderKey) {
          authService.clearAPIError(currentProviderKey);
        }
        
        return result;
      } catch (error: any) {
        if (!firstError) firstError = error;
        lastError = error;
        const msg = error.message?.toLowerCase() || "";
        const status = error.status || 0;
        
        logger.warn(`[AiBridge] Provider ${providerType} failed for ${task}: ${msg} (Status: ${status})`);
        
        // Hard fail for plan limits
        if (msg.includes("límite de plan") || msg.includes("unauthenticated")) {
          throw error;
        }

        // IMPORTANT: If Studio or Zhipu provider fails, report it to rotation service
        if ((providerType === "studio" || providerType === "zhipu") && currentProviderKey) {
          keyRotationService.reportFailure(currentProviderKey, error);
        }

        // List of errors that trigger a fallback to the next provider
        const isTemporaryError = 
          msg.includes("503") || status === 503 || 
          msg.includes("unavailable") || msg.includes("capacity") ||
          msg.includes("429") || status === 429 ||
          msg.includes("quota") || msg.includes("exhausted") || msg.includes("limit") ||
          msg.includes("overloaded");

        if (isTemporaryError) {
          console.info(`[AiBridge] Attempting fallback due to temporary error on ${providerType}...`);
          continue;
        }
        
        // If it's a fatal logic error, we might still want to try another provider just in case it's provider-specific
        continue;
      }
    }

    throw firstError || lastError;
  },


  /**
   * Legacy provider getter
   */
  getProvider: (apiKey: string, tier: string = 'starter', modelId: string = GLOBAL_MODEL_ID): IAiProvider => {
    const globalDefault = (import.meta as any).env?.VITE_AI_PROVIDER || process.env.VITE_AI_PROVIDER || 'studio';
    
    if (tier === 'agency' || globalDefault === 'vertex') {
       try {
          const isNode = typeof process !== "undefined" && process.versions && process.versions.node;
          if (isNode) {
            return new VertexProvider(modelId);
          }
       } catch (e) {
          logger.error("[AiBridge] Vertex initialization logic failed, using Studio fallback", e);
       }
    }

    return new StudioProvider(apiKey, modelId);
  }
};

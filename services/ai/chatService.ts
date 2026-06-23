import { buildAbsoluteUrl } from "../../utils/apiConfig";
import { ChatMessage, Language } from "../../types";
import { AGENT_EXPERT_INSTRUCTION } from "../../constants";
import { keyRotationService } from "./keyRotationService";
import { aiBridge } from "./AiUniversalBridge";
import { getSystemPromptForPersona } from "./agentRegistry";
import { authService } from "../auth/authService";
import { ExecutionRouter } from "../bridge/ExecutionRouter";

export const chatService = {
  chatWithExpert: async (
    message: string,
    history: ChatMessage[],
    lang: Language = "es",
    context?: string,
    brand?: any,
    personaId: string = 'general'
  ): Promise<string> => {
    const isProduction = import.meta.env.PROD;

    const personaInstruction = personaId !== 'general' 
      ? getSystemPromptForPersona(personaId, lang)
      : AGENT_EXPERT_INSTRUCTION(lang, context, brand);

    if (isProduction && !ExecutionRouter.isDesktopMode()) {
      const userId = authService.getCurrentUser()?.id || '';

      const response = await fetch(buildAbsoluteUrl('/.netlify/functions/api-ai-proxy'), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(userId ? { 'X-User-Id': userId } : {})
        },
        body: JSON.stringify({
          contents: history.concat([{ role: "user", parts: [{ text: message }] }]),
          config: {
            systemInstruction: personaInstruction,
            tools: [{ googleSearch: {} }],
          },
          modelId: "gemini-2.5-flash"
        })
      });

      if (!response.ok) {
        throw new Error(`Expert Chat error: ${response.status}`);
      }
      const data = await response.json();
      return data.text || "";
    }

    return keyRotationService.fetchWithRetry(async (apiKey) => {
      const provider = aiBridge.getSmartProvider('CHAT_EXPERT', apiKey);
      
      const response = await provider.generateContent({
        contents: history.concat([{ role: "user", parts: [{ text: message }] }]),
        config: {
          systemInstruction: personaInstruction,
          tools: [{ googleSearch: {} }],
        },
      });
      
      const text = response.text || "";
      keyRotationService.trackTokens({ text }, "Chat con Experto");
      return text;
    });
  },
};

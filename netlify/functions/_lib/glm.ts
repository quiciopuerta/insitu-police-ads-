import fetch from "node-fetch";

/**
 * Robust API key retrieval for Zhipu AI (GLM) — server-side (Netlify Functions).
 */
export const getGlmKey = (): { key: string; source: string } => {
    const candidates = [
        { name: "GLM_API_KEY", value: process.env.GLM_API_KEY },
        { name: "ZHIPU_API_KEY", value: process.env.ZHIPU_API_KEY },
    ].filter(c => {
        if (!c.value) return false;
        const cleanVal = c.value.trim().replace(/^["']|["']$/g, "");
        return cleanVal.length > 20;
    });

    if (candidates.length > 0) {
        const picked = candidates[0];
        const cleanKey = picked.value!.trim().replace(/^["']|["']$/g, "");
        return { key: cleanKey, source: picked.name };
    }

    throw new Error(
        "No valid Zhipu (GLM) API key configured. " +
        "Set GLM_API_KEY in Netlify Site Settings > Environment Variables."
    );
};

function translateToMessages(contents: any[]): any[] {
    return contents.map(item => {
        const textPart = item.parts?.find((p: any) => p.text)?.text || "";
        return {
            role: item.role === "model" ? "assistant" : item.role === "user" ? "user" : "system",
            content: textPart
        };
    });
}

/**
 * Native fetch implementation for Zhipu API with retry logic.
 */
export async function callGlmApi(params: {
    model?: string;
    contents: any[];
    systemInstruction?: string | { parts: { text: string }[] };
    generationConfig?: any;
    apiKey?: string;
}) {
    const model = params.model || "glm-4";
    const apiKey = params.apiKey || getGlmKey().key;
    const url = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

    const messages = translateToMessages(params.contents);

    // Support system instruction
    if (params.systemInstruction) {
        let sysContent = "";
        if (typeof params.systemInstruction === 'string') {
            sysContent = params.systemInstruction;
        } else if (params.systemInstruction && typeof params.systemInstruction === 'object') {
            sysContent = (params.systemInstruction as any).parts?.[0]?.text || "";
        }
        if (sysContent && sysContent.trim()) {
            messages.unshift({ role: "system", content: sysContent.trim() });
        }
    }

    const config = params.generationConfig || {};
    
    const body = {
        model: model,
        messages: messages,
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxOutputTokens ?? 4000,
        top_p: config.topP ?? 0.9,
    };

    let attempt = 0;
    const maxAttempts = 3;
    let lastError: any;

    while (attempt < maxAttempts) {
        attempt++;
        const abortController = new AbortController();
        const timeout = setTimeout(() => abortController.abort(), 35000);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(body),
                signal: abortController.signal
            });

            clearTimeout(timeout);

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Zhipu API Error (${response.status}): ${errText}`);
            }

            const data = await response.json();
            
            const contentText = data.choices?.[0]?.message?.content || "";
            
            return {
                candidates: [
                    {
                        content: { parts: [{ text: contentText }] },
                        finishReason: data.choices?.[0]?.finish_reason === "stop" ? "STOP" : data.choices?.[0]?.finish_reason
                    }
                ],
                usageMetadata: {
                    promptTokenCount: data.usage?.prompt_tokens || 0,
                    candidatesTokenCount: data.usage?.completion_tokens || 0,
                    totalTokenCount: data.usage?.total_tokens || 0
                }
            };
        } catch (error: any) {
            clearTimeout(timeout);
            lastError = error;
            if (error.name === 'AbortError') {
                lastError = new Error(`Zhipu request timed out after 35s (Attempt ${attempt}/${maxAttempts})`);
            }
            if (attempt < maxAttempts) {
                await new Promise(r => setTimeout(r, 1000 * attempt));
            }
        }
    }

    throw lastError;
}

import fetch from "node-fetch";

/**
 * Robust API key retrieval for DeepSeek — server-side (Netlify Functions).
 */
export const getDeepSeekKey = (): { key: string; source: string } => {
    const candidates = [
        { name: "DEEPSEEK_KEY_1", value: process.env.DEEPSEEK_KEY_1 },
        { name: "DEEPSEEK_API_KEY", value: process.env.DEEPSEEK_API_KEY },
    ].filter(c => {
        if (!c.value) return false;
        const cleanVal = c.value.trim().replace(/^["']|["']$/g, "");
        return cleanVal.length > 20;
    });

    if (candidates.length > 0) {
        const picked = candidates[0]; // Currently just picking the first valid one
        const cleanKey = picked.value!.trim().replace(/^["']|["']$/g, "");
        return { key: cleanKey, source: picked.name };
    }

    throw new Error(
        "No valid DeepSeek API key configured. " +
        "Set DEEPSEEK_KEY_1 in Netlify Site Settings > Environment Variables."
    );
};

/**
 * Translates Gemini contents array into OpenAI/DeepSeek messages array
 */
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
 * Native fetch implementation for DeepSeek API with retry logic.
 */
export async function callDeepSeekApi(params: {
    model?: string;
    contents: any[];
    systemInstruction?: string | { parts: { text: string }[] };
    generationConfig?: any;
    apiKey?: string;
}) {
    const model = params.model || "deepseek-chat";
    const apiKey = params.apiKey || getDeepSeekKey().key;
    const url = "https://api.deepseek.com/chat/completions";

    const messages = translateToMessages(params.contents);

    // Support system instruction (handle both string and Gemini structured format)
    if (params.systemInstruction) {
        let sysContent = "";

        if (typeof params.systemInstruction === 'string') {
            sysContent = params.systemInstruction;
        } else if (params.systemInstruction && typeof params.systemInstruction === 'object') {
            // Handle Gemini structured format: { parts: [{ text: "..." }] }
            sysContent = (params.systemInstruction as any).parts?.[0]?.text || "";
        }

        // Only add system instruction if we extracted content
        if (sysContent && sysContent.trim()) {
            messages.unshift({
                role: "system",
                content: sysContent.trim()
            });
        }
    }

    const config = params.generationConfig || {};
    
    const body = {
        model: model,
        messages: messages,
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxOutputTokens ?? 4000,
        top_p: config.topP ?? 1,
    };

    let attempt = 0;
    const maxAttempts = 3;
    let lastError: any;

    while (attempt < maxAttempts) {
        attempt++;
        const abortController = new AbortController();
        const timeout = setTimeout(() => abortController.abort(), 35000); // DeepSeek can take a while

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(body),
                signal: abortController.signal as any
            });

            if (!response.ok) {
                let errorText = await response.text();
                let apiMessage = `DeepSeek API error (${response.status}): ${errorText}`;
                
                try {
                    const errJson = JSON.parse(errorText);
                    apiMessage = `DeepSeek API error (${response.status}): ` + (errJson?.error?.message || errorText);
                } catch { /* ignore */ }

                const err: any = new Error(apiMessage);
                err.status = response.status;
                
                if (response.status === 401 || response.status === 403) {
                    err.isCredentialError = true;
                    throw err; // Don't retry credential errors
                }

                throw err;
            }

            const data = await response.json() as any;
            
            // Adapt OpenAI/DeepSeek response structure back to Gemini's format 
            // so the caller (api-ai-proxy) doesn't break
            const completionText = data.choices?.[0]?.message?.content || "";
            
            return {
                candidates: [{
                    content: {
                        parts: [{ text: completionText }]
                    }
                }],
                usageMetadata: {
                    promptTokenCount: data.usage?.prompt_tokens || 0,
                    candidatesTokenCount: data.usage?.completion_tokens || 0,
                    totalTokenCount: data.usage?.total_tokens || 0
                }
            };
        } catch (e: any) {
            lastError = e;
            clearTimeout(timeout);
            
            if (e.isCredentialError) throw e;
            if (e.name === 'AbortError') {
                const timeoutErr: any = new Error('DeepSeek API timeout (35s)');
                timeoutErr.status = 504;
                timeoutErr.isTimeout = true;
                throw timeoutErr;
            }

            if (attempt === maxAttempts) throw e;
            
            // Exponential backoff
            const backoffMs = Math.pow(2, attempt) * 1000;
            await new Promise(resolve => setTimeout(resolve, backoffMs));
        } finally {
            clearTimeout(timeout);
        }
    }

    throw lastError;
}

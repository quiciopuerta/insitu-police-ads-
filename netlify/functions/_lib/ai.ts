import { getVertexToken, getVertexConfig } from './vertex';

/**
 * Shared AI Logic for Netlify Functions
 * ====================================
 * Provides simple helpers to call Claude and Gemini via Vertex AI.
 */

export interface AiOptions {
    model?: string;
    temperature?: number;
    max_tokens?: number;
    json?: boolean;
}

/**
 * Calls Anthropic Claude models on Vertex AI
 */
export async function callClaude(messages: any[], system?: string, options: AiOptions = {}) {
    const creds = await getVertexConfig();
    const token = await getVertexToken();
    const model = options.model || "claude-3-5-sonnet-v2";

    const endpoint = `https://${creds.location}-aiplatform.googleapis.com/v1/projects/${creds.project_id}/locations/${creds.location}/publishers/anthropic/models/${model}:rawPredict`;

    const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            anthropic_version: "vertex-2023-10-16",
            messages,
            system,
            max_tokens: options.max_tokens || 4096,
            temperature: options.temperature || 0.5
        })
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Claude API error (${res.status}): ${err}`);
    }

    const data = await res.json();
    return data.content?.[0]?.text || "";
}

/**
 * Calls Google Gemini models on Vertex AI
 */
export async function callGemini(contents: any[], system?: string, options: AiOptions = {}) {
    const creds = await getVertexConfig();
    const token = await getVertexToken();
    const model = options.model || "gemini-1.5-pro-002";

    // Note: using non-streaming predict for simpler handling in backend functions
    const endpoint = `https://${creds.location}-aiplatform.googleapis.com/v1/projects/${creds.project_id}/locations/${creds.location}/publishers/google/models/${model}:streamGenerateContent`;

    const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents,
            system_instruction: system ? { parts: [{ text: system }] } : undefined,
            generation_config: {
                temperature: options.temperature || 0.4,
                max_output_tokens: options.max_tokens || 4092,
                response_mime_type: options.json ? "application/json" : "text/plain"
            }
        })
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini API error (${res.status}): ${err}`);
    }

    const data = await res.json();
    
    // Vertex returns an array for streamGenerateContent even if we don't stream
    // We take the last candidate from the last chunk (or first if single chunk)
    const lastChunk = data[data.length - 1];
    return lastChunk?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}


import { API_URL } from "../../utils/apiConfig";
import { logger } from '../../utils/logger';


export interface SpeechResponse {
  audioBase64: string;
  audioMimeType?: string;
  audioUrl?: string;
}

/**
 * Helper for calling our Portavoz proxy (Netlify Function or Express)
 * Now focused exclusively on Google Cloud / Vertex AI assets.
 */
const callPortavozProxy = async (type: string, payload: any): Promise<any> => {
  try {
    const endpoint = `${API_URL}/portavoz`;

    let userId = "";
    try {
      const session = localStorage.getItem("insitu_active_session");
      if (session) {
        const parsed = JSON.parse(session);
        userId = parsed.id || parsed.user?.id || "";
      }
    } catch { /* ignore */ }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userId ? { 'X-User-Id': userId } : {})
      },
      body: JSON.stringify({ type, payload }),
    });

    if (!response.ok) {
      let errorMessage = `Portavoz Proxy error: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.details || errorData.error || errorMessage;
      } catch (e) { /* ignore */ }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error: any) {
    logger.error(`[Portavoz Proxy Error] ${type}:`, error.message);
    throw error;
  }
};

/**
 * Convert a Blob to base64 string (without data URI prefix)
 */
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const portavozService = {
  /**
   * Generates speech using Gemini TTS.
   * If voiceSampleBase64 is provided, uses voice replication (cloning).
   * Otherwise falls back to a prebuilt Gemini voice.
   */
  async generateSpeech(
    text: string,
    voiceSampleBase64?: string,
    options?: {
      voiceSampleMimeType?: string;
      prebuiltVoice?: string;
      languageCode?: string;
      uploadToGCS?: boolean;
      wpm?: number;
    }
  ): Promise<SpeechResponse> {
    return await callPortavozProxy('GENERATE_SPEECH', {
      text,
      voiceSampleBase64,
      voiceSampleMimeType: options?.voiceSampleMimeType || 'audio/wav',
      prebuiltVoice: options?.prebuiltVoice || 'Kore',
      languageCode: options?.languageCode || 'es-ES',
      uploadToGCS: options?.uploadToGCS ?? false,
      wpm: options?.wpm
    });
  },

  /**
   * Standalone audio upload to GCS
   */
  async uploadAudio(audioBase64: string, filename = "audio.wav"): Promise<string> {
    const data = await callPortavozProxy('UPLOAD_AUDIO', { audioBase64, filename });
    return data.audioUrl;
  }
};

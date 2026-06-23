import { buildAbsoluteUrl } from "./apiConfig";
/**
 * whisperCaptions.ts
 * ------------------
 * AI-powered speech-to-text using backend Gemini 2.0 Flash (Multimodal).
 * Accepts either an audioUrl (WAV/MP3) or a videoUrl (MP4/WebM from Veo 3.1).
 * Returns Caption objects compatible with the platform's video preview engine.
 */

export interface Caption {
  text: string;
  startMs: number;
  endMs: number;
}

export type WhisperModel = 'tiny' | 'base' | 'small' | 'medium' | 'large' | 'gemini';

export interface GenerateCaptionsOptions {
  /** Model hint — 'gemini' is preferred for multichannel/multimodal accuracy */
  model?: WhisperModel;
  /** ISO 639-1 language code or 'auto'. Default: 'auto' */
  language?: string;
  /** If no audioUrl is available, pass a video URL to extract speech from the video directly */
  videoUrl?: string;
  /** Progress callback — called for each stage (processing, transcribing) */
  onProgress?: (stage: string, pct: number) => void;
}

/**
 * Transcribes the audio/video at `audioUrl` (or `options.videoUrl`) and returns timed caption objects.
 * Uses the backend /.netlify/functions/api-media-generation (TRANSCRIPTION task).
 *
 * Priority: audioUrl > options.videoUrl
 */
export const generateCaptions = async (
  audioUrl: string | null,
  options?: GenerateCaptionsOptions,
): Promise<Caption[]> => {
  const { onProgress, videoUrl } = options ?? {};

  const sourceUrl = audioUrl || videoUrl;
  if (!sourceUrl) {
    throw new Error('Se requiere audioUrl o videoUrl para generar subtítulos.');
  }

  const isVideo = !audioUrl && !!videoUrl;

  try {
    onProgress?.(isVideo ? 'Preparando video para transcripción IA...' : 'Preparando audio para transcripción IA...', 10);

    // Map to absolute URL if needed
    let finalUrl = sourceUrl;
    if (sourceUrl.startsWith('/')) {
      finalUrl = window.location.origin + sourceUrl;
    }

    onProgress?.('Transcribiendo con Gemini Flash...', 40);

    const body: Record<string, any> = {
      type: 'TRANSCRIPTION',
      payload: {
        language: options?.language || 'auto',
        model: options?.model || 'gemini',
      }
    };

    if (audioUrl) {
      body.payload.audioUrl = finalUrl;
    } else {
      body.payload.videoUrl = finalUrl;
    }

    let userId = "";
    try {
      const session = localStorage.getItem("insitu_active_session");
      if (session) {
        const parsed = JSON.parse(session);
        userId = parsed.id || parsed.user?.id || "";
      }
    } catch { /* ignore */ }

    const response = await fetch(buildAbsoluteUrl('/.netlify/functions/api-media-generation'), {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(userId ? { 'X-User-Id': userId } : {})
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || `Error de servidor: ${response.status}`);
    }

    onProgress?.('Finalizando subtítulos...', 90);
    const data = await response.json();

    if (!data.captions || !Array.isArray(data.captions)) {
      throw new Error('La IA no devolvió un formato de subtítulos válido.');
    }

    onProgress?.('Completado', 100);
    return data.captions as Caption[];

  } catch (err: any) {
    console.error('[Captions] Flow Error:', err.message);
    throw new Error(`Error en transcripción: ${err.message}`);
  }
};

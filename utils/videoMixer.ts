/**
 * Client-side Video + Audio Mixer
 * =================================
 * Uses Web Audio API + HTMLMediaElement.captureStream() + MediaRecorder
 * to mix a silent video with voiceover and/or background music in real-time.
 *
 * Requires:
 * - Video served with CORS headers (Access-Control-Allow-Origin)
 * - Chrome / Edge 93+ (captureStream is not in Safari)
 */

export interface MixOptions {
  videoUrl: string;
  voiceoverUrl?: string | null;
  musicUrl?: string | null;
  musicVolume?: number;        // 0.0 – 1.0
  voiceoverVolume?: number;    // 0.0 – 1.0
  filename?: string;
  onProgress?: (pct: number) => void;
}

/** Returns true if the browser can mix via captureStream + MediaRecorder */
export const canMixInBrowser = (): boolean => {
  const v = document.createElement('video');
  return typeof (v as any).captureStream === 'function' && typeof MediaRecorder !== 'undefined';
};

/**
 * Converts a GCS signed URL to a Netlify proxy URL.
 * GCS URLs served directly don't include CORS headers, blocking canvas captureStream().
 * The /api/gcs-proxy function re-serves the video with Access-Control-Allow-Origin: *.
 */
const resolveMediaUrl = (url: string): string => {
  if (url && url.startsWith('https://storage.googleapis.com/')) {
    return `/api/gcs-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
};

/**
 * Mixes video + optional voiceover + optional music into a single WebM file
 * and triggers a browser download.
 * Runs in real-time (takes ~video.duration seconds).
 */
export const mixAndDownload = async (opts: MixOptions): Promise<void> => {
  const {
    videoUrl,
    voiceoverUrl,
    musicUrl,
    musicVolume = 0.5,
    voiceoverVolume = 1.0,
    filename = `video_mix_${Date.now()}.webm`,
    onProgress,
  } = opts;

  if (!canMixInBrowser()) {
    throw new Error('Tu navegador no soporta mezcla de audio en el cliente. Usa Chrome o Edge.');
  }

  // ── 1. Load video ────────────────────────────────────────────────────────
  const resolvedVideoUrl = resolveMediaUrl(videoUrl);
  const video = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.muted = true;          // don't play through speakers during recording
  video.playsInline = true;
  video.style.position = 'fixed';
  video.style.left = '-9999px';
  video.style.top = '-9999px';
  video.style.width = '1px';
  video.style.height = '1px';
  document.body.appendChild(video);

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('No se pudo cargar el video para mezcla. Verifique CORS.'));
      video.src = resolvedVideoUrl;
      video.load();
    });

    const duration = video.duration || 10;

    // ── 2. Web Audio graph ──────────────────────────────────────────────────
    const audioCtx = new AudioContext();
    const destination = audioCtx.createMediaStreamDestination();

    const loadAudioEl = (url: string, volume: number) => {
      const el = new Audio();
      el.crossOrigin = 'anonymous';
      el.src = url;
      const gain = audioCtx.createGain();
      gain.gain.value = volume;
      audioCtx.createMediaElementSource(el).connect(gain).connect(destination);
      return el;
    };

    const voEl = voiceoverUrl ? loadAudioEl(resolveMediaUrl(voiceoverUrl), voiceoverVolume) : null;
    const muEl = musicUrl ? loadAudioEl(resolveMediaUrl(musicUrl), musicVolume) : null;

    // Pre-load audio buffers so playback starts without delay
    if (voEl) await new Promise<void>(r => { voEl.oncanplaythrough = () => r(); voEl.load(); });
    if (muEl) await new Promise<void>(r => { muEl.oncanplaythrough = () => r(); muEl.load(); });

    // ── 3. Combine streams ──────────────────────────────────────────────────
    const videoStream: MediaStream = (video as any).captureStream();
    const combinedStream = new MediaStream([
      ...videoStream.getVideoTracks(),
      ...destination.stream.getAudioTracks(),
    ]);

    // ── 4. Record ───────────────────────────────────────────────────────────
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
      ? 'video/webm;codecs=vp8,opus'
      : MediaRecorder.isTypeSupported('video/webm')
      ? 'video/webm'
      : '';

    if (!mimeType) throw new Error('MediaRecorder no soporta WebM en este navegador.');

    const recorder = new MediaRecorder(combinedStream, { mimeType });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);

    const startTime = Date.now();
    const progressTimer = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      onProgress?.(Math.min(95, (elapsed / duration) * 100));
    }, 300);

    // ── 5. Playback + recording ─────────────────────────────────────────────
    recorder.start(250);
    await audioCtx.resume();

    await video.play();
    voEl?.play().catch(() => {});
    if (muEl) {
      muEl.loop = true;
      muEl.play().catch(() => {});
    }

    // Wait for the video to finish (+ 300ms buffer)
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        clearInterval(progressTimer);
        resolve();
      }, (duration + 0.3) * 1000);

      video.onended = () => {
        clearTimeout(timeout);
        clearInterval(progressTimer);
        resolve();
      };
    });

    recorder.stop();
    voEl?.pause();
    muEl?.pause();
    await audioCtx.close();

    await new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });

    // ── 6. Download ─────────────────────────────────────────────────────────
    onProgress?.(100);
    const blob = new Blob(chunks, { type: mimeType });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename.replace(/\.mp4$/i, '.webm');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

  } finally {
    // Always remove the hidden video element
    document.body.removeChild(video);
  }
};

/**
 * Mixes video + audio and converts WebM to MP4 using FFmpeg.wasm
 * Falls back to WebM if FFmpeg conversion fails.
 */
export const mixAndDownloadMP4 = async (opts: MixOptions): Promise<void> => {
  const {
    onProgress,
    filename = `video_mix_${Date.now()}.mp4`,
  } = opts;

  try {
    // First, generate WebM as usual
    const tempFilename = filename.replace(/\.mp4$/i, '_temp.webm');

    // Create a custom version that returns the blob instead of downloading
    const webmBlob = await mixAndDownloadToBlob({ ...opts, filename: tempFilename });

    // Try to convert WebM to MP4 using FFmpeg.wasm
    onProgress?.(95);

    const { FFmpeg } = await import('@ffmpeg/ffmpeg');

    const ffmpeg = new FFmpeg();

    // Check if WASM support is available
    if (!ffmpeg.loaded) {
      await ffmpeg.load({
        coreURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
      });
    }

    // Write WebM file to FFmpeg virtual filesystem
    const webmData = new Uint8Array(await webmBlob.arrayBuffer());
    ffmpeg.writeFile('input.webm', webmData);

    // Remux WebM to MP4 (fast operation, no re-encoding)
    await ffmpeg.exec(['-i', 'input.webm', '-c:v', 'copy', '-c:a', 'aac', 'output.mp4']);

    // Read MP4 from virtual filesystem
    const mp4Data = await ffmpeg.readFile('output.mp4') as any;
    const mp4Blob = new Blob([mp4Data], { type: 'video/mp4' });

    // Clean up virtual filesystem
    ffmpeg.deleteFile('input.webm');
    ffmpeg.deleteFile('output.mp4');

    // Download MP4
    onProgress?.(100);
    const blobUrl = URL.createObjectURL(mp4Blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename.replace(/\.webm$/i, '.mp4');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

  } catch (err: any) {
    // Fallback: download as WebM if FFmpeg conversion fails
    console.warn('[VideoMixer] FFmpeg conversion failed, falling back to WebM:', err.message);

    // Show warning toast
    const event = new CustomEvent('toast', {
      detail: {
        type: 'warning',
        message: 'Conversión a MP4 no disponible. Descargando en WebM.',
      }
    });
    window.dispatchEvent(event);

    // Download as WebM instead
    const webmFilename = opts.filename?.replace(/\.mp4$/i, '.webm') || `video_mix_${Date.now()}.webm`;
    await mixAndDownload({ ...opts, filename: webmFilename });
  }
};

/**
 * Internal helper: mixes and returns Blob instead of auto-downloading
 */
const mixAndDownloadToBlob = async (opts: MixOptions): Promise<Blob> => {
  const {
    videoUrl,
    voiceoverUrl,
    musicUrl,
    musicVolume = 0.5,
    voiceoverVolume = 1.0,
    onProgress,
  } = opts;

  if (!canMixInBrowser()) {
    throw new Error('Tu navegador no soporta mezcla de audio en el cliente. Usa Chrome o Edge.');
  }

  const resolvedVideoUrl = resolveMediaUrl(videoUrl);
  const video = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.muted = true;
  video.playsInline = true;
  video.style.position = 'fixed';
  video.style.left = '-9999px';
  video.style.top = '-9999px';
  video.style.width = '1px';
  video.style.height = '1px';
  document.body.appendChild(video);

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('No se pudo cargar el video para mezcla. Verifique CORS.'));
      video.src = resolvedVideoUrl;
      video.load();
    });

    const duration = video.duration || 10;
    const audioCtx = new AudioContext();
    const destination = audioCtx.createMediaStreamDestination();

    const loadAudioEl = (url: string, volume: number) => {
      const el = new Audio();
      el.crossOrigin = 'anonymous';
      el.src = url;
      const gain = audioCtx.createGain();
      gain.gain.value = volume;
      audioCtx.createMediaElementSource(el).connect(gain).connect(destination);
      return el;
    };

    const voEl = voiceoverUrl ? loadAudioEl(resolveMediaUrl(voiceoverUrl), voiceoverVolume) : null;
    const muEl = musicUrl ? loadAudioEl(resolveMediaUrl(musicUrl), musicVolume) : null;

    if (voEl) await new Promise<void>(r => { voEl.oncanplaythrough = () => r(); voEl.load(); });
    if (muEl) await new Promise<void>(r => { muEl.oncanplaythrough = () => r(); muEl.load(); });

    const videoStream: MediaStream = (video as any).captureStream();
    const combinedStream = new MediaStream([
      ...videoStream.getVideoTracks(),
      ...destination.stream.getAudioTracks(),
    ]);

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
      ? 'video/webm;codecs=vp8,opus'
      : MediaRecorder.isTypeSupported('video/webm')
      ? 'video/webm'
      : '';

    if (!mimeType) throw new Error('MediaRecorder no soporta WebM en este navegador.');

    const recorder = new MediaRecorder(combinedStream, { mimeType });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);

    const startTime = Date.now();
    const progressTimer = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      onProgress?.(Math.min(90, (elapsed / duration) * 100));
    }, 300);

    recorder.start(250);
    await audioCtx.resume();

    await video.play();
    voEl?.play().catch(() => {});
    if (muEl) {
      muEl.loop = true;
      muEl.play().catch(() => {});
    }

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        clearInterval(progressTimer);
        resolve();
      }, (duration + 0.3) * 1000);

      video.onended = () => {
        clearTimeout(timeout);
        clearInterval(progressTimer);
        resolve();
      };
    });

    recorder.stop();
    voEl?.pause();
    muEl?.pause();
    await audioCtx.close();

    await new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });

    return new Blob(chunks, { type: mimeType });

  } finally {
    document.body.removeChild(video);
  }
};

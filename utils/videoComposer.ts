/**
 * videoComposer.ts
 * ================
 * Client-side video composition using Canvas API + MediaRecorder.
 * Joins multiple video segments with optional transitions.
 *
 * Output format: WebM (VP9) — browser MediaRecorder limitation.
 * Download filename should use .webm extension.
 */

import type { VideoTransition, TextLayer, ImageLayer, SegmentEditProps, AudioLayer } from '../types';
import { renderTextOverlays, renderImageOverlays, preloadImageLayers } from './textOverlayEngine';

export interface CompositionOptions {
  segments: string[];                      // Ordered video URLs
  /** Segment IDs matching the ordered URLs (for segmentEditProps lookup) */
  segmentIds?: string[];
  transition: VideoTransition;
  transitionDurationSeconds: number;       // Overlap duration (e.g. 0.5)
  outputFrameRate: number;                 // Frames per second (e.g. 30)
  onProgress?: (progress: number) => void; // 0.0 → 1.0
  textLayers?: TextLayer[];               // Animated text overlays baked into output
  imageLayers?: ImageLayer[];             // Image/logo overlays baked into output
  segmentEditProps?: Record<string, SegmentEditProps>; // Per-segment filters/trim/speed
  audioLayers?: AudioLayer[];             // Music/voiceover tracks mixed into output
  globalFilter?: string;                  // Global CSS filter for mastering (e.g. contrast(1.1) saturate(1.2))
}

/** Builds a CSS filter string from SegmentEditProps */
function buildFilterString(props: SegmentEditProps): string {
  const parts: string[] = [];
  if (props.brightness !== 1) parts.push(`brightness(${props.brightness})`);
  if (props.contrast   !== 1) parts.push(`contrast(${props.contrast})`);
  if (props.saturation !== 1) parts.push(`saturate(${props.saturation})`);
  return parts.length > 0 ? parts.join(' ') : '';
}

/** Routes GCS signed URLs through the CORS proxy to allow captureStream(). */
const resolveMediaUrl = (url: string): string =>
  url.startsWith('https://storage.googleapis.com/')
    ? `/api/gcs-proxy?url=${encodeURIComponent(url)}`
    : url;

// Preloads a <video> element and resolves once it can play
const loadVideo = (url: string): Promise<HTMLVideoElement> =>
  new Promise((resolve, reject) => {
    const v = document.createElement('video');
    v.crossOrigin = 'anonymous';
    v.preload = 'auto';
    v.muted = true;
    v.src = resolveMediaUrl(url);
    v.addEventListener('canplaythrough', () => resolve(v), { once: true });
    v.addEventListener('error', () => reject(new Error(`Failed to load video: ${url}`)), { once: true });
    v.load();
  });

/**
 * Composes multiple video segments into a single WebM blob.
 * Falls back gracefully if CORS prevents canvas access.
 */
const loadAudio = (url: string): Promise<HTMLAudioElement> =>
  new Promise((resolve, reject) => {
    const a = new Audio();
    // Do NOT set crossOrigin for data: URIs as it's redundant and can cause issues
    if (!url.startsWith('data:')) a.crossOrigin = 'anonymous';
    a.src = resolveMediaUrl(url);
    a.addEventListener('canplaythrough', () => resolve(a), { once: true });
    // Timeout-based fallback for audio that fails to load canplaythrough but might still be playable
    const timeout = setTimeout(() => resolve(a), 5000); 
    a.addEventListener('error', () => {
      clearTimeout(timeout);
      reject(new Error(`Failed to load audio: ${url.substring(0, 50)}...`));
    }, { once: true });
    a.load();
  });
export const composeVideos = async (opts: CompositionOptions): Promise<Blob> => {
  const {
    segments,
    segmentIds = [],
    transition,
    transitionDurationSeconds,
    outputFrameRate,
    onProgress,
    textLayers = [],
    imageLayers = [],
    segmentEditProps = {},
    audioLayers = [],
    globalFilter = '',
  } = opts;

  if (segments.length === 0) throw new Error('No segments to compose');
  if (segments.length === 1) {
    // Single segment: just fetch and return as blob
    const res = await fetch(segments[0]);
    return await res.blob();
  }

  // Preload all videos, image layers, and audio layers in parallel
  const [videos, imageCache, audioPreloaded] = await Promise.all([
    Promise.all(segments.map(loadVideo)),
    preloadImageLayers(imageLayers),
    Promise.all(audioLayers.map(l => loadAudio(l.url))),
  ]);

  // Determine canvas dimensions from first video
  const width = videos[0].videoWidth || 1280;
  const height = videos[0].videoHeight || 720;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // Choose supported MIME type
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';

  const stream = canvas.captureStream(outputFrameRate);

  // ── Audio mixing via Web Audio API ──────────────────────────────────────────
  let audioCtx: AudioContext | null = null;
  const audioEls: Array<{ el: HTMLAudioElement; startSecond: number }> = [];
  let recordStream: MediaStream = stream;

  if (audioLayers.length > 0 && typeof AudioContext !== 'undefined') {
    try {
      audioCtx = new AudioContext();
      const audioDest = audioCtx.createMediaStreamDestination();
      for (let i = 0; i < audioLayers.length; i++) {
        const layer = audioLayers[i];
        const el = audioPreloaded[i];
        if (!el) continue;

        if (layer.type === 'music') el.loop = true;
        const gain = audioCtx.createGain();
        gain.gain.value = Math.max(0, Math.min(1, layer.volume));
        
        try {
          audioCtx.createMediaElementSource(el).connect(gain).connect(audioDest);
          audioEls.push({ el, startSecond: layer.startSecond });
        } catch (e) {
          console.warn(`[VideoComposer] Failed to connect audio layer ${layer.id}:`, e);
        }
      }
      recordStream = new MediaStream([
        ...stream.getVideoTracks(),
        ...audioDest.stream.getAudioTracks(),
      ]);
    } catch {
      // Audio mixing unavailable — record video only
      recordStream = stream;
    }
  }

  const recorder = new MediaRecorder(recordStream, { mimeType, videoBitsPerSecond: 4_000_000 });
  const chunks: BlobPart[] = [];
  recorder.addEventListener('dataavailable', (e) => { if (e.data.size > 0) chunks.push(e.data); });

  const compositionDone = new Promise<Blob>((resolve, reject) => {
    recorder.addEventListener('stop', () => resolve(new Blob(chunks, { type: 'video/webm' })));
    recorder.addEventListener('error', reject);
  });

  recorder.start(100); // collect data every 100ms

  // Start audio layers at their scheduled times
  if (audioCtx) {
    await audioCtx.resume();
    for (const { el, startSecond } of audioEls) {
      const delayMs = startSecond * 1000;
      if (delayMs <= 0) {
        el.play().catch(() => {});
      } else {
        setTimeout(() => el.play().catch(() => {}), delayMs);
      }
    }
  }

  // Calculate total composed duration for progress reporting
  const totalDuration = videos.reduce((sum, v) => sum + v.duration, 0)
    - transitionDurationSeconds * (videos.length - 1);

  let elapsed = 0;
  // Tracks the absolute time position in the final composed video
  // (accounts for transition overlaps between segments)
  let segmentStartOffset = 0;

  const renderFrame = (
    videoA: HTMLVideoElement,
    videoB: HTMLVideoElement | null,
    progress: number, // 0→1 transition progress (0 = only A, 1 = only B)
    filterA = '',
    filterB = ''
  ) => {
    ctx.clearRect(0, 0, width, height);

    const finalFilterA = (filterA + ' ' + globalFilter).trim() || 'none';
    const finalFilterB = (filterB + ' ' + globalFilter).trim() || 'none';

    if (!videoB || progress <= 0) {
      ctx.globalAlpha = 1;
      ctx.filter = finalFilterA;
      ctx.drawImage(videoA, 0, 0, width, height);
      ctx.filter = 'none';
      return;
    }

    if (progress >= 1) {
      ctx.globalAlpha = 1;
      ctx.filter = finalFilterB;
      ctx.drawImage(videoB, 0, 0, width, height);
      ctx.filter = 'none';
      return;
    }

    if (transition === 'cut') {
      // Hard cut at 50%
      const vid = progress < 0.5 ? videoA : videoB;
      ctx.filter = progress < 0.5 ? finalFilterA : finalFilterB;
      ctx.globalAlpha = 1;
      ctx.drawImage(vid, 0, 0, width, height);
      ctx.filter = 'none';
      return;
    }

    // crossfade or dissolve: alpha blend
    ctx.filter = finalFilterA;
    ctx.globalAlpha = 1;
    ctx.drawImage(videoA, 0, 0, width, height);
    ctx.filter = finalFilterB;
    ctx.globalAlpha = progress;
    ctx.drawImage(videoB, 0, 0, width, height);
    ctx.filter = 'none';

    if (transition === 'dissolve') {
      // Brightness boost at midpoint (film dissolve effect)
      const boost = Math.sin(progress * Math.PI) * 0.25; // max +25% at 50%
      if (boost > 0.01) {
        ctx.globalAlpha = boost;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
      }
    }

    ctx.globalAlpha = 1;
  };

  // Render each segment sequentially
  for (let i = 0; i < videos.length; i++) {
    const vidA = videos[i];
    const vidB = i + 1 < videos.length ? videos[i + 1] : null;

    // Resolve per-segment editing props
    const segIdA = segmentIds[i] ?? '';
    const segIdB = segmentIds[i + 1] ?? '';
    const editA = segmentEditProps[segIdA];
    const editB = segmentEditProps[segIdB];
    const filterA = editA ? buildFilterString(editA) : '';
    const filterB = editB ? buildFilterString(editB) : '';

    // Apply playback speed
    if (editA?.playbackSpeed && editA.playbackSpeed !== 1) vidA.playbackRate = editA.playbackSpeed;

    const trimStart  = editA?.trimStartSeconds ?? 0;
    const trimEnd    = editA?.trimEndSeconds   ?? 0;
    const segDuration = Math.max(0.1, vidA.duration - trimStart - trimEnd);
    const transStart = segDuration - transitionDurationSeconds;

    vidA.currentTime = trimStart;
    await new Promise<void>((res) => {
      vidA.addEventListener('seeked', () => res(), { once: true });
    });

    if (vidB) {
      const trimStartB = editB?.trimStartSeconds ?? 0;
      vidB.currentTime = trimStartB;
      await new Promise<void>((res) => {
        vidB!.addEventListener('seeked', () => res(), { once: true });
      });
    }

    await vidA.play();

    const frameInterval = 1000 / outputFrameRate;
    const startWall = performance.now();

    await new Promise<void>((resolveSegment) => {
      const tick = setInterval(() => {
        const segElapsed = (performance.now() - startWall) / 1000;

        if (segElapsed >= segDuration || vidA.ended) {
          clearInterval(tick);
          vidA.pause();
          resolveSegment();
          return;
        }

        let transitionProgress = 0;
        if (vidB && segElapsed >= transStart && transitionDurationSeconds > 0) {
          transitionProgress = (segElapsed - transStart) / transitionDurationSeconds;
          // Sync vidB playback during transition
          const trimStartB = editB?.trimStartSeconds ?? 0;
          const vidBTime = trimStartB + (segElapsed - transStart);
          if (Math.abs(vidB.currentTime - vidBTime) > 0.1) {
            vidB.currentTime = vidBTime;
          }
          if (vidB.paused) vidB.play().catch(() => {});
        }

        renderFrame(vidA, vidB, Math.min(1, transitionProgress), filterA, filterB);

        const absoluteTime = segmentStartOffset + segElapsed;

        if (textLayers.length > 0) {
          renderTextOverlays(ctx, textLayers, absoluteTime, width, height, outputFrameRate);
        }

        if (imageLayers.length > 0) {
          renderImageOverlays(ctx, imageLayers, absoluteTime, width, height, outputFrameRate, imageCache);
        }

        elapsed += frameInterval / 1000;
        onProgress?.(Math.min(1, elapsed / totalDuration));
      }, frameInterval);
    });

    // Advance offset for next segment (subtract transition overlap)
    segmentStartOffset += segDuration - (i < videos.length - 1 ? transitionDurationSeconds : 0);
  }

  recorder.stop();
  // Stop and cleanup audio
  for (const { el } of audioEls) { el.pause(); el.src = ''; }
  audioCtx?.close().catch(() => {});

  const blob = await compositionDone;

  // Clean up object URLs
  videos.forEach((v) => { v.src = ''; });

  onProgress?.(1);
  return blob;
};

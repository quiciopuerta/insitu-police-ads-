/**
 * ReelPreviewCanvas.tsx
 * =====================
 * Real-time canvas preview of the reel composition.
 * Driven by requestAnimationFrame — renders video frames + text/image overlays
 * without triggering React re-renders during playback.
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Play, Pause, SkipBack } from 'lucide-react';
import type { TextLayer, ImageLayer, VideoSegment, SegmentEditProps } from '../../types';
import { renderTextOverlays, renderImageOverlays, preloadImageLayers } from '../../utils/textOverlayEngine';
import { proxiedAssetUrl } from '../../utils/apiConfig';

interface ReelPreviewCanvasProps {
  segments: VideoSegment[];
  segmentOrder: string[];
  textLayers: TextLayer[];
  imageLayers: ImageLayer[];
  segmentEditProps: Record<string, SegmentEditProps>;
  totalDuration: number;
  fps?: number;
  /** Called on each rAF tick with current playhead time in seconds */
  onTimeUpdate?: (time: number) => void;
  isTimelineDragging?: boolean;
}

function buildFilterString(props: SegmentEditProps): string {
  const parts: string[] = [];
  if (props.brightness !== 1) parts.push(`brightness(${props.brightness})`);
  if (props.contrast   !== 1) parts.push(`contrast(${props.contrast})`);
  if (props.saturation !== 1) parts.push(`saturate(${props.saturation})`);
  return parts.length > 0 ? parts.join(' ') : '';
}

export const ReelPreviewCanvas: React.FC<ReelPreviewCanvasProps> = ({
  segments,
  segmentOrder,
  textLayers,
  imageLayers,
  segmentEditProps,
  totalDuration,
  fps = 30,
  onTimeUpdate,
  isTimelineDragging = false,
}) => {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const videoMapRef  = useRef<Map<string, HTMLVideoElement>>(new Map());
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const rafRef       = useRef<number>(0);
  const playingRef   = useRef(false);
  const currentTimeRef = useRef(0);
  const lastTimestampRef = useRef(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Build ordered segment list (completed only)
  const orderedSegments = segmentOrder
    .map(id => segments.find(s => s.id === id))
    .filter((s): s is VideoSegment => !!s && s.status === 'completed' && !!s.videoUrl);

  // Pre-load all segment videos
  useEffect(() => {
    const map = videoMapRef.current;
    // Clean up stale entries
    for (const [id] of map) {
      if (!orderedSegments.find(s => s.id === id)) {
        const v = map.get(id);
        if (v) { v.src = ''; map.delete(id); }
      }
    }

    const toLoad = orderedSegments.filter(s => !map.has(s.id));
    if (toLoad.length === 0) { setIsLoaded(true); return; }

    setIsLoaded(false);
    let loaded = 0;
    for (const seg of toLoad) {
      const v = document.createElement('video');
      v.crossOrigin = 'anonymous';
      v.preload = 'auto';
      v.muted = true;
      v.src = proxiedAssetUrl(seg.videoUrl)!;
      v.addEventListener('canplaythrough', () => {
        map.set(seg.id, v);
        loaded++;
        if (loaded === toLoad.length) setIsLoaded(true);
      }, { once: true });
      v.addEventListener('error', () => {
        loaded++;
        if (loaded === toLoad.length) setIsLoaded(true);
      }, { once: true });
      v.load();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderedSegments.map(s => s.id).join(',')]);

  // Pre-load image layers
  useEffect(() => {
    preloadImageLayers(imageLayers).then(cache => {
      imageCacheRef.current = cache;
    });
  }, [imageLayers]);

  // Find which segment is active at a given time and the local time within it
  const resolveSegmentAtTime = useCallback((t: number) => {
    let offset = 0;
    for (const seg of orderedSegments) {
      const dur = seg.durationSeconds;
      if (t < offset + dur) {
        return { seg, localTime: t - offset };
      }
      offset += dur;
    }
    // Past end — return last segment
    const last = orderedSegments[orderedSegments.length - 1];
    return last ? { seg: last, localTime: last.durationSeconds - 0.01 } : null;
  }, [orderedSegments]);

  // Draw a single frame at currentTimeRef
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const t = currentTimeRef.current;
    const resolved = resolveSegmentAtTime(t);
    if (!resolved) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const { seg, localTime } = resolved;
    const vid = videoMapRef.current.get(seg.id);

    if (vid) {
      // Sync video time
      if (Math.abs(vid.currentTime - localTime) > 0.15) {
        vid.currentTime = Math.max(0, localTime);
      }

      // Apply per-segment filter (skip during timeline drag for performance)
      const editProps = segmentEditProps[seg.id];
      const filter = (!isTimelineDragging && editProps) ? buildFilterString(editProps) : '';

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.filter = filter || 'none';
      ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
      ctx.filter = 'none';
    }

    // Render overlays (skip expensive ops during drag)
    if (!isTimelineDragging) {
      if (textLayers.length > 0) {
        renderTextOverlays(ctx, textLayers, t, canvas.width, canvas.height, fps);
      }
      if (imageLayers.length > 0) {
        renderImageOverlays(ctx, imageLayers, t, canvas.width, canvas.height, fps, imageCacheRef.current);
      }
    }
  }, [resolveSegmentAtTime, textLayers, imageLayers, segmentEditProps, fps, isTimelineDragging]);

  // rAF loop
  const tick = useCallback((timestamp: number) => {
    if (!playingRef.current) return;

    const delta = lastTimestampRef.current > 0
      ? (timestamp - lastTimestampRef.current) / 1000
      : 0;
    lastTimestampRef.current = timestamp;

    currentTimeRef.current = Math.min(totalDuration, currentTimeRef.current + delta);

    drawFrame();
    setCurrentTime(currentTimeRef.current);
    onTimeUpdate?.(currentTimeRef.current);

    if (currentTimeRef.current >= totalDuration) {
      playingRef.current = false;
      setIsPlaying(false);
      return;
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [drawFrame, totalDuration, onTimeUpdate]);

  // Keep canvas in sync when paused (e.g. after timeline drag)
  useEffect(() => {
    if (!isPlaying) drawFrame();
  }, [drawFrame, isPlaying, currentTime]);

  const handlePlay = () => {
    if (!isLoaded || orderedSegments.length === 0) return;
    if (currentTimeRef.current >= totalDuration) {
      currentTimeRef.current = 0;
      setCurrentTime(0);
    }
    playingRef.current = true;
    setIsPlaying(true);
    lastTimestampRef.current = 0;
    rafRef.current = requestAnimationFrame(tick);
  };

  const handlePause = () => {
    playingRef.current = false;
    setIsPlaying(false);
    cancelAnimationFrame(rafRef.current);
  };

  const handleRestart = () => {
    handlePause();
    currentTimeRef.current = 0;
    setCurrentTime(0);
    drawFrame();
  };

  // Set canvas size from first video
  useEffect(() => {
    const first = orderedSegments[0];
    if (!first) return;
    const vid = videoMapRef.current.get(first.id);
    if (!vid || !canvasRef.current) return;
    const onLoaded = () => {
      if (!canvasRef.current) return;
      canvasRef.current.width  = vid.videoWidth  || 720;
      canvasRef.current.height = vid.videoHeight || 1280;
      drawFrame();
    };
    if (vid.readyState >= 2) onLoaded();
    else vid.addEventListener('loadeddata', onLoaded, { once: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      for (const [, v] of videoMapRef.current) { v.src = ''; }
    };
  }, []);

  const progress = totalDuration > 0 ? currentTime / totalDuration : 0;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Canvas */}
      <div className="relative rounded-2xl overflow-hidden bg-black shadow-2xl"
           style={{ maxHeight: '360px', aspectRatio: '9/16', width: 'auto' }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
        {!isLoaded && orderedSegments.length > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
        {orderedSegments.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white/50 text-sm">
            Sin segmentos listos
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-none"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleRestart}
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          title="Reiniciar"
        >
          <SkipBack className="w-4 h-4" />
        </button>
        {isPlaying ? (
          <button
            onClick={handlePause}
            className="p-3 rounded-full bg-violet-600 hover:bg-violet-500 text-white transition-colors"
          >
            <Pause className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={handlePlay}
            disabled={!isLoaded || orderedSegments.length === 0}
            className="p-3 rounded-full bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-40"
          >
            <Play className="w-5 h-5" />
          </button>
        )}
        <span className="text-white/50 text-xs font-mono">
          {currentTime.toFixed(1)}s / {totalDuration.toFixed(0)}s
        </span>
      </div>
    </div>
  );
};

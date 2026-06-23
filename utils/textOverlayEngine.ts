/**
 * textOverlayEngine.ts
 * ====================
 * Remotion-inspired text animation engine for Canvas 2D.
 *
 * Core concepts borrowed from Remotion:
 *   - interpolate(): maps a value from one range to another with optional easing
 *   - spring(): damped spring physics for natural motion
 *   - Frame-based timeline: every animation is a function of the current frame
 *
 * Unlike Remotion, this engine runs entirely client-side on Canvas 2D
 * without FFmpeg or a Node.js server — text is baked into the exported WebM.
 */

import type {
  TextLayer,
  TextAnimationType,
  TextExitType,
  TextPosition,
  TextAnimationTemplate,
  ImageLayer,
} from '../types';

export type { TextLayer, TextAnimationType, TextExitType, TextPosition };

// ---------------------------------------------------------------------------
// Easing library
// ---------------------------------------------------------------------------

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeIn  = (t: number) => Math.pow(t, 3);

// ---------------------------------------------------------------------------
// interpolate — core Remotion primitive
// ---------------------------------------------------------------------------

/**
 * Maps `input` from `inputRange` to `outputRange`.
 * Clamps on both ends by default.
 *
 * @example
 * // opacity: 0 at frame 0, 1 at frame 15
 * interpolate(frame, [0, 15], [0, 1])
 */
export function interpolate(
  input: number,
  inputRange: [number, number],
  outputRange: [number, number],
  options?: {
    extrapolateLeft?: 'clamp' | 'extend';
    extrapolateRight?: 'clamp' | 'extend';
    easing?: (t: number) => number;
  }
): number {
  const [iMin, iMax] = inputRange;
  const [oMin, oMax] = outputRange;
  let t = (input - iMin) / (iMax - iMin);
  if (options?.extrapolateLeft !== 'extend') t = Math.max(0, t);
  if (options?.extrapolateRight !== 'extend') t = Math.min(1, t);
  if (options?.easing) t = options.easing(t);
  return oMin + t * (oMax - oMin);
}

// ---------------------------------------------------------------------------
// spring — damped spring physics
// ---------------------------------------------------------------------------

/**
 * Returns a value from 0 → 1 following spring physics.
 * Produces natural overshoot + settle motion.
 *
 * @param frame  - current frame number (0-based)
 * @param fps    - frames per second
 * @param config - spring parameters (damping, stiffness, mass)
 */
export function spring(
  frame: number,
  fps: number,
  config: { damping?: number; stiffness?: number; mass?: number } = {}
): number {
  const { damping = 12, stiffness = 120, mass = 1 } = config;
  if (frame <= 0) return 0;
  const t = frame / fps;
  const omega = Math.sqrt(stiffness / mass);
  const zeta  = damping / (2 * Math.sqrt(stiffness * mass));

  if (zeta < 1) {
    // Underdamped — produces overshoot
    const omegaD = omega * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * omega * t) * (
      Math.cos(omegaD * t) + (zeta * omega / omegaD) * Math.sin(omegaD * t)
    );
  }
  // Critically/overdamped — settles without overshoot
  return 1 - Math.exp(-omega * t) * (1 + omega * t);
}

// ---------------------------------------------------------------------------
// Position mapping
// ---------------------------------------------------------------------------

interface PositionInfo {
  xFactor: number;   // 0 = left edge, 0.5 = center, 1 = right edge
  yFactor: number;   // 0 = top edge, 0.5 = middle, 1 = bottom edge
  align: CanvasTextAlign;
  yDir: number;      // +1 = below edge, 0 = centered, -1 = above edge
}

const POSITION_MAP: Record<TextPosition, PositionInfo> = {
  topLeft:      { xFactor: 0,   yFactor: 0,   align: 'left',   yDir:  1 },
  topCenter:    { xFactor: 0.5, yFactor: 0,   align: 'center', yDir:  1 },
  topRight:     { xFactor: 1,   yFactor: 0,   align: 'right',  yDir:  1 },
  middleLeft:   { xFactor: 0,   yFactor: 0.5, align: 'left',   yDir:  0 },
  center:       { xFactor: 0.5, yFactor: 0.5, align: 'center', yDir:  0 },
  middleRight:  { xFactor: 1,   yFactor: 0.5, align: 'right',  yDir:  0 },
  bottomLeft:   { xFactor: 0,   yFactor: 1,   align: 'left',   yDir: -1 },
  bottomCenter: { xFactor: 0.5, yFactor: 1,   align: 'center', yDir: -1 },
  bottomRight:  { xFactor: 1,   yFactor: 1,   align: 'right',  yDir: -1 },
};

// ---------------------------------------------------------------------------
// renderTextLayer — draws one animated text layer onto a Canvas 2D context
// ---------------------------------------------------------------------------

/**
 * Renders a single TextLayer at the given absolute video time.
 * Call this after drawing video frames so text appears on top.
 */
export function renderTextLayer(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
  absoluteTimeSeconds: number,
  canvasWidth: number,
  canvasHeight: number,
  fps = 30
): void {
  const endSecond = layer.startSecond + layer.durationSeconds;
  if (absoluteTimeSeconds < layer.startSecond || absoluteTimeSeconds >= endSecond) return;

  const localTime  = absoluteTimeSeconds - layer.startSecond;
  const localFrame = localTime * fps;

  // --- Compute animation state ---
  let opacity      = 1;
  let translateX   = 0;
  let translateY   = 0;
  let scale        = 1;
  let visibleChars = layer.text.length;

  const enterFrames = layer.enterDurationSeconds * fps;
  const exitFrames  = layer.exitDurationSeconds * fps;
  const exitStart   = layer.durationSeconds - layer.exitDurationSeconds;

  // --- Keyframe position interpolation ---
  let keyframePosition: TextPosition | undefined;
  if (layer.keyframes && layer.keyframes.length >= 2) {
    const kfs = [...layer.keyframes].sort((a, b) => a.timeSeconds - b.timeSeconds);
    let prev = kfs[0];
    let next = kfs[kfs.length - 1];
    for (let i = 0; i < kfs.length - 1; i++) {
      if (absoluteTimeSeconds >= kfs[i].timeSeconds && absoluteTimeSeconds < kfs[i + 1].timeSeconds) {
        prev = kfs[i];
        next = kfs[i + 1];
        break;
      }
    }
    const t = (absoluteTimeSeconds - prev.timeSeconds) / Math.max(0.001, next.timeSeconds - prev.timeSeconds);
    if (prev.position) keyframePosition = t < 0.5 ? prev.position : next.position ?? prev.position;
    if (prev.opacity !== undefined && next.opacity !== undefined) {
      opacity = prev.opacity + (next.opacity - prev.opacity) * t;
    }
    if (prev.scale !== undefined && next.scale !== undefined) {
      scale = prev.scale + (next.scale - prev.scale) * t;
    }
  }

  // --- Template-driven entrance (overrides enterAnimation when set) ---
  const template = layer.animationTemplate as TextAnimationTemplate | undefined;

  // Entrance
  if (localFrame < enterFrames && enterFrames > 0) {
    const sp = spring(localFrame, fps, template === 'bounce'
      ? { damping: 4, stiffness: 200 }
      : template === 'elastic'
        ? { damping: 2, stiffness: 300, mass: 0.5 }
        : undefined);

    if (template === 'glitch') {
      opacity    = interpolate(localFrame, [0, enterFrames * 0.4], [0, 1], { easing: easeOut });
      translateX = Math.sin(localFrame * 43) * canvasWidth * 0.012 * (1 - localFrame / enterFrames);
    } else if (template === 'bounce' || template === 'elastic') {
      opacity    = interpolate(localFrame, [0, enterFrames * 0.3], [0, 1], { easing: easeOut });
      translateY = (1 - sp) * canvasHeight * 0.10;
    } else if (template === 'typewriterCursor') {
      visibleChars = Math.floor(interpolate(localFrame, [0, enterFrames], [0, layer.text.length]));
    } else if (template === 'wordByWord') {
      const words = layer.text.split(' ');
      const framesPerWord = enterFrames / Math.max(1, words.length);
      const visibleWords = Math.ceil(localFrame / framesPerWord);
      visibleChars = words.slice(0, visibleWords).join(' ').length;
    } else {
    switch (layer.enterAnimation as TextAnimationType) {
      case 'fadeIn':
        opacity = interpolate(localFrame, [0, enterFrames], [0, 1], { easing: easeOut });
        break;
      case 'slideFromBottom':
        opacity    = interpolate(localFrame, [0, enterFrames], [0, 1], { easing: easeOut });
        translateY = (1 - sp) * canvasHeight * 0.08;
        break;
      case 'slideFromTop':
        opacity    = interpolate(localFrame, [0, enterFrames], [0, 1], { easing: easeOut });
        translateY = -(1 - sp) * canvasHeight * 0.08;
        break;
      case 'slideFromLeft':
        opacity    = interpolate(localFrame, [0, enterFrames], [0, 1], { easing: easeOut });
        translateX = -(1 - sp) * canvasWidth * 0.12;
        break;
      case 'slideFromRight':
        opacity    = interpolate(localFrame, [0, enterFrames], [0, 1], { easing: easeOut });
        translateX = (1 - sp) * canvasWidth * 0.12;
        break;
      case 'scaleIn':
        opacity = interpolate(localFrame, [0, enterFrames], [0, 1], { easing: easeOut });
        scale   = 0.5 + sp * 0.5;
        break;
      case 'typewriter':
        visibleChars = Math.floor(
          interpolate(localFrame, [0, enterFrames], [0, layer.text.length])
        );
        break;
    }
    } // end template else
  }

  // Exit
  if (localTime >= exitStart && (layer.exitAnimation as TextExitType) !== 'none' && exitFrames > 0) {
    const ef = (localTime - exitStart) * fps;
    switch (layer.exitAnimation as TextExitType) {
      case 'fadeOut':
        opacity = Math.min(opacity, interpolate(ef, [0, exitFrames], [1, 0], { easing: easeIn }));
        break;
      case 'slideToBottom':
        opacity    = Math.min(opacity, interpolate(ef, [0, exitFrames], [1, 0], { easing: easeIn }));
        translateY += interpolate(ef, [0, exitFrames], [0, canvasHeight * 0.08], { easing: easeIn });
        break;
      case 'slideToTop':
        opacity    = Math.min(opacity, interpolate(ef, [0, exitFrames], [1, 0], { easing: easeIn }));
        translateY -= interpolate(ef, [0, exitFrames], [0, canvasHeight * 0.08], { easing: easeIn });
        break;
    }
  }

  opacity = Math.max(0, Math.min(1, opacity));
  if (opacity <= 0) return;

  // --- Render ---
  const referenceSize = Math.min(canvasWidth, canvasHeight);
  // Scale by 1.3 to maintain relative visual weight
  const fontSize = layer.fontSize * referenceSize * 1.3;
  ctx.save();
  
  // Set font with high-end ad spacing
  ctx.font = `${layer.fontWeight} ${fontSize}px ${layer.fontFamily}`;
  ctx.letterSpacing = `${fontSize * 0.05}px`; // Add premium letter spacing

  const pos = POSITION_MAP[keyframePosition ?? layer.position];
  
  // Platform Native Safe Zones (Instagram Reels / TikTok / Shorts)
  const isVertical = canvasHeight > canvasWidth;
  const safeMarginLeft = isVertical ? canvasWidth * 0.10 : canvasWidth * 0.05;
  const safeMarginRight = isVertical ? canvasWidth * 0.18 : canvasWidth * 0.05;
  const safeMarginTop = isVertical ? canvasHeight * 0.14 : canvasHeight * 0.05;
  const safeMarginBottom = isVertical ? canvasHeight * 0.24 : canvasHeight * 0.05;

  const baseX = pos.xFactor * canvasWidth + (pos.xFactor === 0 ? safeMarginLeft : pos.xFactor === 1 ? -safeMarginRight : 0);
  
  let baseY = pos.yFactor * canvasHeight;
  if (pos.yFactor === 0) baseY += safeMarginTop;
  else if (pos.yFactor === 1) baseY -= safeMarginBottom;
  else baseY += pos.yDir * (fontSize * 0.9); // Middle


  // Translate to final position (base + animation offset)
  const isTypewriterLike = layer.enterAnimation === 'typewriter'
    || template === 'typewriterCursor'
    || template === 'wordByWord';
  const cursorChar = (template === 'typewriterCursor' && visibleChars < layer.text.length)
    ? '█'
    : '';
  
  // Professional Ad Strategy: Headlines are often Uppercase
  const baseText = layer.text.toUpperCase();
  const displayText = isTypewriterLike
    ? baseText.substring(0, visibleChars) + cursorChar
    : baseText;

  // --- Multiline Support & Character Spacing ---
  // Split text by lines or manually wrap based on canvas width (approx 80% coverage)
  const maxLineChars = canvasWidth > canvasHeight ? 45 : 25;
  const rawWords = displayText.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  rawWords.forEach(word => {
    if ((currentLine + word).length > maxLineChars) {
      lines.push(currentLine.trim());
      currentLine = word + ' ';
    } else {
      currentLine += word + ' ';
    }
  });
  lines.push(currentLine.trim());

  // Translate to final base position
  ctx.translate(baseX + translateX, baseY + translateY);
  if (scale !== 1) ctx.scale(scale, scale);

  const lineHeight = fontSize * 1.25;
  const totalHeight = lines.length * lineHeight;
  
  // Vertical adjustment based on position to keep block within safe zones
  let blockOffsetY = 0;
  if (pos.yFactor === 0.5) blockOffsetY = -totalHeight / 2; // Center block
  else if (pos.yFactor === 1) blockOffsetY = -totalHeight;   // Bottom block

  lines.forEach((line, index) => {
    const ly = blockOffsetY + (index * lineHeight) + (lineHeight / 2);
    
    // 1. Double Shadow for Depth
    if (layer.shadow) {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = fontSize * 0.2;
      ctx.shadowOffsetX = fontSize * 0.05;
      ctx.shadowOffsetY = fontSize * 0.05;
      ctx.fillStyle = 'transparent';
      ctx.fillText(line, 0, ly);
      ctx.restore();

      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = fontSize * 0.05;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    // 2. Individual Line Capsule (Premium Ad Style)
    if (layer.background && line.length > 0) {
      const m = ctx.measureText(line);
      const padX = fontSize * 0.45; // Wider padding for luxury feel
      const padY = fontSize * 0.15;
      const tw = m.width;
      const bgX = pos.align === 'center' ? -tw / 2 - padX : pos.align === 'right' ? -tw - padX : -padX;
      const bgY = ly - lineHeight / 2 + (lineHeight - fontSize) / 2 - padY;
      const bgW = tw + padX * 2;
      const bgH = fontSize + padY * 2.5;

      ctx.save();
      ctx.beginPath();
      const radius = bgH / 2.2;
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(bgX, bgY, bgW, bgH, radius);
      } else {
        ctx.rect(bgX, bgY, bgW, bgH);
      }
      
      // Premium Glassmorphism / Subtle gradient
      const grad = ctx.createLinearGradient(bgX, bgY, bgX, bgY + bgH);
      const baseColor = layer.backgroundColor || 'rgba(0,0,0,0.8)';
      grad.addColorStop(0, baseColor);
      grad.addColorStop(1, baseColor.replace(/[\d.]+\)$/g, '0.9)'));
      
      ctx.fillStyle = grad;
      ctx.fill();
      
      // Fine border for luxury definition
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = Math.max(1, fontSize * 0.02);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Stroke (outline)
    if (layer.strokeColor) {
      ctx.save();
      ctx.strokeStyle = layer.strokeColor;
      ctx.lineWidth = Math.max(1, fontSize * 0.06);
      ctx.lineJoin = 'round';
      ctx.strokeText(line, 0, ly);
      ctx.restore();
    }

    // 4. Final Text Fill
    ctx.fillStyle = layer.color;
    ctx.fillText(line, 0, ly);

    if (layer.shadow) ctx.restore(); // Restore after each line's shadow stack
  });

  ctx.restore();
}


// ---------------------------------------------------------------------------
// renderTextOverlays — renders all layers for a given time
// ---------------------------------------------------------------------------

/**
 * Renders all TextLayers visible at `absoluteTimeSeconds`.
 * Call after drawing each video frame in the composition loop.
 */
export function renderTextOverlays(
  ctx: CanvasRenderingContext2D,
  layers: TextLayer[],
  absoluteTimeSeconds: number,
  canvasWidth: number,
  canvasHeight: number,
  fps = 30
): void {
  for (const layer of layers) {
    renderTextLayer(ctx, layer, absoluteTimeSeconds, canvasWidth, canvasHeight, fps);
  }
}

// ---------------------------------------------------------------------------
// Image / Logo overlay rendering
// ---------------------------------------------------------------------------

/**
 * Renders a single ImageLayer onto the canvas.
 * @param imageCache - pre-loaded HTMLImageElements keyed by layer.id
 */
export function renderImageLayer(
  ctx: CanvasRenderingContext2D,
  layer: ImageLayer,
  absoluteTimeSeconds: number,
  canvasWidth: number,
  canvasHeight: number,
  fps = 30,
  imageCache?: Map<string, HTMLImageElement>
): void {
  const endSecond = layer.startSecond + layer.durationSeconds;
  if (absoluteTimeSeconds < layer.startSecond || absoluteTimeSeconds >= endSecond) return;

  const img = imageCache?.get(layer.id);
  if (!img || !img.complete) return;

  const localTime  = absoluteTimeSeconds - layer.startSecond;
  const localFrame = localTime * fps;
  const enterFrames = 0.4 * fps; // 0.4s enter
  const exitFrames  = 0.4 * fps;
  const exitStart   = layer.durationSeconds - 0.4;

  let opacity = layer.opacity;
  let scale   = 1;

  if (layer.enterAnimation !== 'none' && localFrame < enterFrames) {
    const progress = interpolate(localFrame, [0, enterFrames], [0, 1], { easing: easeOut });
    if (layer.enterAnimation === 'fadeIn') opacity = layer.opacity * progress;
    if (layer.enterAnimation === 'scaleIn') { opacity = layer.opacity * progress; scale = 0.6 + progress * 0.4; }
  }
  if (layer.exitAnimation === 'fadeOut' && localTime >= exitStart) {
    const ef = (localTime - exitStart) * fps;
    opacity = Math.min(opacity, layer.opacity * interpolate(ef, [0, exitFrames], [1, 0], { easing: easeIn }));
  }

  opacity = Math.max(0, Math.min(1, opacity));
  if (opacity <= 0) return;

  const referenceSize = Math.min(canvasWidth, canvasHeight);
  // Re-scale width fraction based on reference size to ensure consistent feel across formats
  // Previously: widthFraction * canvasWidth. Now: widthFraction * referenceSize * 1.5
  const drawW = (referenceSize * 1.5) * layer.widthFraction;
  const drawH = drawW * (img.naturalHeight / img.naturalWidth);

  const pos    = POSITION_MAP[layer.position];

  // Platform Native Safe Zones (Instagram Reels / TikTok / Shorts)
  const isVertical = canvasHeight > canvasWidth;
  const safeMarginLeft = isVertical ? canvasWidth * 0.08 : canvasWidth * 0.05;
  const safeMarginRight = isVertical ? canvasWidth * 0.16 : canvasWidth * 0.05;
  const safeMarginTop = isVertical ? canvasHeight * 0.12 : canvasHeight * 0.05;
  const safeMarginBottom = isVertical ? canvasHeight * 0.22 : canvasHeight * 0.05;

  let cx = pos.xFactor * canvasWidth;
  if (pos.xFactor === 0) cx += safeMarginLeft;
  else if (pos.xFactor === 1) cx -= drawW + safeMarginRight;
  else cx -= drawW / 2;

  let cy = pos.yFactor * canvasHeight;
  if (pos.yFactor === 0) cy += safeMarginTop;
  else if (pos.yFactor === 1) cy -= drawH + safeMarginBottom;
  else cy -= drawH / 2;

  ctx.save();
  ctx.globalAlpha = opacity;
  if (scale !== 1) {
    ctx.translate(cx + drawW / 2, cy + drawH / 2);
    ctx.scale(scale, scale);
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  } else {
    ctx.drawImage(img, cx, cy, drawW, drawH);
  }
  ctx.restore();
}

/**
 * Renders all ImageLayers visible at `absoluteTimeSeconds`.
 */
export function renderImageOverlays(
  ctx: CanvasRenderingContext2D,
  layers: ImageLayer[],
  absoluteTimeSeconds: number,
  canvasWidth: number,
  canvasHeight: number,
  fps = 30,
  imageCache?: Map<string, HTMLImageElement>
): void {
  for (const layer of layers) {
    renderImageLayer(ctx, layer, absoluteTimeSeconds, canvasWidth, canvasHeight, fps, imageCache);
  }
}

/**
 * Pre-loads images for all ImageLayers and returns a cache map.
 */
export function preloadImageLayers(layers: ImageLayer[]): Promise<Map<string, HTMLImageElement>> {
  const cache = new Map<string, HTMLImageElement>();
  const promises = layers
    .filter(l => !!l.src)
    .map(l => new Promise<void>(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload  = () => { cache.set(l.id, img); resolve(); };
      img.onerror = () => resolve(); // skip broken images
      img.src = l.src;
    }));
  return Promise.all(promises).then(() => cache);
}

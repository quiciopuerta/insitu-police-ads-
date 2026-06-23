/**
 * staticCompositor.ts
 * ====================
 * Bridges the existing textOverlayEngine (designed for video frames) to produce
 * static composited images with logo + headline overlays.
 *
 * Reuses renderTextLayer, renderImageLayer, and preloadImageLayers directly —
 * no duplication of Canvas logic.
 */

import type { ImageLayer, TextLayer, TextPosition, MassAdOverlaySettings } from '../types';
import { renderTextLayer, renderImageLayer, preloadImageLayers } from './textOverlayEngine';

// ---------------------------------------------------------------------------
// Canvas dimensions per aspect ratio (high-quality output)
// ---------------------------------------------------------------------------

export const CANVAS_DIMENSIONS: Record<string, { w: number; h: number }> = {
  '9:16': { w: 1080, h: 1920 },
  '16:9': { w: 1920, h: 1080 },
  '4:5':  { w: 1080, h: 1350 },
  '3:4':  { w: 1080, h: 1440 },
  '1:1':  { w: 1080, h: 1080 },
};

// ---------------------------------------------------------------------------
// GCS proxy helper (same pattern as CreativeLabView)
// ---------------------------------------------------------------------------

function proxiedUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('/')) return url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'storage.googleapis.com') {
      return `/api/gcs-proxy?url=${encodeURIComponent(url)}`;
    }
  } catch { /* pass through */ }
  return url;
}

// ---------------------------------------------------------------------------
// Build overlay layers from config
// ---------------------------------------------------------------------------

/** Maps a brand typography string to a Canvas-safe font family */
function resolveFontFamily(typography?: string): 'sans-serif' | 'serif' | 'monospace' {
  if (!typography) return 'sans-serif';
  const t = typography.toLowerCase();
  if (/serif|garamond|times|georgia|playfair|merriweather|lora/i.test(t)) return 'serif';
  if (/mono|courier|consolas|fira\s?code|jetbrains/i.test(t)) return 'monospace';
  return 'sans-serif';
}

export interface BuildOverlayOptions {
  settings: MassAdOverlaySettings;
  headline: string;
  logoUrl?: string;
  brandColors?: string;
  brandTypography?: string;
  suggestedColors?: string[];
}

export function buildOverlayLayers(
  opts: BuildOverlayOptions,
): { logoLayer?: ImageLayer; textLayers: TextLayer[] } {
  const { settings, headline, logoUrl, brandColors, brandTypography, suggestedColors } = opts;
  let logoLayer: ImageLayer | undefined;
  const textLayers: TextLayer[] = [];

  if (settings.showLogo && logoUrl) {
    logoLayer = {
      id: 'mass-ad-logo',
      type: 'image',
      src: proxiedUrl(logoUrl),
      startSecond: 0,
      durationSeconds: 9999,
      position: settings.logoPosition,
      widthFraction: settings.logoSize,
      opacity: 1,
      enterAnimation: 'none',
      exitAnimation: 'none',
    };
  }

  if (settings.showHeadline && headline) {
    // Resolve headline color: user override > first brand color > default white
    const headlineColor = settings.headlineColor || extractFirstHex(brandColors) || '#FFFFFF';

    // Resolve pill background: user override > first suggestedColor with alpha > default
    const pillBg = settings.headlineBackgroundColor
      || (suggestedColors?.[0] ? hexToRgba(suggestedColors[0], 0.75) : undefined)
      || 'rgba(0,0,0,0.55)';

    textLayers.push({
      id: 'mass-ad-headline',
      text: headline.toUpperCase(), // Premium ad style: All Caps
      startSecond: 0,
      durationSeconds: 9999,
      enterAnimation: 'none',
      enterDurationSeconds: 0.01,
      exitAnimation: 'none',
      exitDurationSeconds: 0,
      position: settings.headlinePosition,
      fontSize: settings.headlineFontSize,
      color: headlineColor,
      strokeColor: 'rgba(255,255,255,0.1)',
      fontWeight: '900', // Ultra bold for high-impact
      fontFamily: resolveFontFamily(brandTypography),
      shadow: true,
      background: settings.headlineBackground,
      backgroundColor: pillBg,
    });

  }

  return { logoLayer, textLayers };
}

/** Extracts first hex color from a comma/space separated string like "#FF0000, #00FF00" */
function extractFirstHex(colors?: string): string | undefined {
  if (!colors) return undefined;
  const match = colors.match(/#[0-9A-Fa-f]{3,8}/);
  return match ? match[0] : undefined;
}

/** Converts "#RRGGBB" to "rgba(r,g,b,alpha)" */
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(0,0,0,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
}

// ---------------------------------------------------------------------------
// Load an image from URL into an HTMLImageElement
// ---------------------------------------------------------------------------

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = proxiedUrl(url);
  });
}

// ---------------------------------------------------------------------------
// Main compositing function
// ---------------------------------------------------------------------------

export interface CompositeStaticAdOptions {
  imageUrl: string;
  aspectRatio: string;
  logoLayer?: ImageLayer;
  textLayers?: TextLayer[];
}

export async function compositeStaticAd(
  options: CompositeStaticAdOptions,
): Promise<{ blob: Blob; dataUrl: string }> {
  const { imageUrl, aspectRatio, logoLayer, textLayers = [] } = options;
  const dims = CANVAS_DIMENSIONS[aspectRatio] || CANVAS_DIMENSIONS['1:1'];

  const canvas = document.createElement('canvas');
  canvas.width = dims.w;
  canvas.height = dims.h;
  const ctx = canvas.getContext('2d')!;

  // 1. Draw base image
  const baseImg = await loadImage(imageUrl);
  ctx.drawImage(baseImg, 0, 0, dims.w, dims.h);

  // 2. Logo overlay
  if (logoLayer) {
    const cache = await preloadImageLayers([logoLayer]);
    renderImageLayer(ctx, logoLayer, 0.5, dims.w, dims.h, 30, cache);
  }

  // 3. Text overlays (headline)
  for (const layer of textLayers) {
    renderTextLayer(ctx, layer, 0.5, dims.w, dims.h, 30);
  }

  // 4. Export
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
      'image/png',
    );
  });

  const dataUrl = canvas.toDataURL('image/png');
  return { blob, dataUrl };
}

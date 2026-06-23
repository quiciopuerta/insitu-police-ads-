/**
 * massAdGenerationService.ts
 * ===========================
 * Orchestrates batch ad creation by medium (channel):
 *   - For EACH selected medium (Meta, TikTok, Search, etc.), generates
 *     platform-specific copy via adsGenerationService.generateAdContent()
 *   - For EACH format within that medium, generates images via generateProImage()
 *   - Composites logo + headline overlays via compositeStaticAd()
 *   - Scores each variation 0-100 (FPCE Phase 3 Creative Scoring Engine)
 *
 * Flow: N media × V variations → N×V copy + N×V×F images → scoring → ranked results
 * Each medium gets its OWN copy, tailored to that platform's best practices.
 */

import type {
  MassAdConfig,
  MassAdBatchResult,
  MassAdVariation,
  MassAdProgress,
  MassAdMediumSelection,
  GenAdsParams,
  Language,
  CreativeScore,
  AdGenerationResult,
} from '../../types';
import { RESOURCE_CONSUMPTION_RATES } from '../../constants';
import { adsGenerationService } from './adsGenerationService';
import { generateProImage } from './mediaGenerationService';
import { creativeIntelligenceService } from './creativeIntelligenceService';
import { compositeStaticAd, buildOverlayLayers } from '../../utils/staticCompositor';
import { logger } from '../../utils/logger';


// ---------------------------------------------------------------------------
// Scrubbing utility — cleans AI artifacts like "Hook:", "Headline:", etc.
// ---------------------------------------------------------------------------

function scrubCopy(text: string): string {
  if (!text) return '';
  return text
    // Remove prefixes like "Hook:", "Headline 1:", "0-1s Hook:", "Tagline:", etc.
    .replace(/^(Hook|Headline|Title|Body|CTA|Tagline|Description|Intro|Outro|Gancho|Titulo|Cuerpo|Accion)\s*\d*[:\-]\s*/i, '')
    // Remove numbering like "1.", "1 -", etc. at the start
    .replace(/^\d+[\.\-\s]\s*/, '')
    // Remove common meta-tags like (0-3s), [Hook], etc.
    .replace(/\(\d+-\d+s?\)/gi, '')
    .replace(/\[[^\]]+\]/g, '')
    .trim();
}

// ---------------------------------------------------------------------------
// Concurrency limiter (semaphore pattern)
// ---------------------------------------------------------------------------

function pLimit(concurrency: number) {
  let active = 0;
  const queue: Array<() => void> = [];

  return <T>(fn: () => Promise<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const run = () => {
        active++;
        fn()
          .then(resolve)
          .catch(reject)
          .finally(() => {
            active--;
            if (queue.length > 0) queue.shift()!();
          });
      };
      if (active < concurrency) run();
      else queue.push(run);
    });
}

// ---------------------------------------------------------------------------
// Token cost estimation
// ---------------------------------------------------------------------------

export function estimateTokenCost(config: MassAdConfig): {
  copyTokens: number;
  imageTokens: number;
  total: number;
  copyCount: number;
  imageCount: number;
  breakdown: string;
} {
  const totalFormats = config.media.reduce((acc, m) => acc + m.selectedFormats.length, 0);
  const copyCount = config.media.length * config.variations;
  const imageCount = totalFormats * config.variations;
  const copyTokens = copyCount * RESOURCE_CONSUMPTION_RATES.AD_GENERATION;
  const imageTokens = imageCount * RESOURCE_CONSUMPTION_RATES.GEN_IMAGE;
  const total = copyTokens + imageTokens;
  const breakdown = `${copyCount} copies (${copyTokens}) + ${imageCount} images (${imageTokens})`;
  return { copyTokens, imageTokens, total, copyCount, imageCount, breakdown };
}

// ---------------------------------------------------------------------------
// Variation angle prompts
// ---------------------------------------------------------------------------

const VARIATION_ANGLES = [
  'Focus on emotional storytelling and human connection.',
  'Focus on bold, data-driven value proposition with urgency.',
  'Focus on aspirational lifestyle and social proof.',
  'Focus on problem-solution narrative with clear benefits.',
  'Focus on curiosity-driven hook with unexpected perspective.',
];

// ---------------------------------------------------------------------------
// FPCE Phase 3: Creative Scoring Engine
// Heuristic 0-100 score — no extra AI calls, <1ms per variation
// Dimensions: CTA Power (25) + Brand Consistency (20) + Visual Hierarchy (20)
//             + Platform Fit (20) + Copy Effectiveness (15) = 100
// ---------------------------------------------------------------------------

const PLATFORM_FORMAT_MAP: Record<string, string[]> = {
  search:  ['16:9', '1:1'],
  meta:    ['4:5', '9:16', '1:1'],
  tiktok:  ['9:16', '1:1'],
  display: ['16:9', '3:4', '1:1'],
  pmax:    ['16:9', '4:5', '1:1'],
};

function scoreVariation(variation: MassAdVariation, config: MassAdConfig): CreativeScore {
  const content = variation.adContent;

  // ── CTA Power (0-25) ─────────────────────────────────────────────────────
  const headlineCount = content.headlines?.length ?? 0;
  const avgHeadlineLen = headlineCount > 0
    ? content.headlines.reduce((s, h) => s + h.length, 0) / headlineCount
    : 0;
  const hasSocialHook = !!content.socialCopy?.hook?.trim();
  const hasCta        = !!content.socialCopy?.cta?.trim();
  let ctaPower = 0;
  ctaPower += Math.min(10, headlineCount * 2);
  ctaPower += (avgHeadlineLen >= 15 && avgHeadlineLen <= 40) ? 8 : 3;
  ctaPower += hasSocialHook ? 4 : 0;
  ctaPower += hasCta ? 3 : 0;
  ctaPower = Math.min(25, Math.round(ctaPower));

  // ── Brand Consistency (0-20) ──────────────────────────────────────────────
  const brand = config.brief.brandContext;
  let brandConsistency = 0;
  if (brand?.isotypeUrl)       brandConsistency += 6;
  if (brand?.brandColors)      brandConsistency += 5;
  if (brand?.typography)       brandConsistency += 4;
  if (brand?.toneOfVoice)      brandConsistency += 3;
  if (brand?.visualGuidelines) brandConsistency += 2;
  brandConsistency = Math.min(20, Math.round(brandConsistency));

  // ── Visual Hierarchy (0-20) ───────────────────────────────────────────────
  const nqs = content.neuroQualityScore ?? 0;
  const descCount = content.descriptions?.length ?? 0;
  let visualHierarchy = Math.round((nqs / 100) * 14);
  visualHierarchy += Math.min(6, descCount * 2);
  visualHierarchy = Math.min(20, Math.round(visualHierarchy));

  // ── Platform Fit (0-20) ───────────────────────────────────────────────────
  const canonicalFormats = PLATFORM_FORMAT_MAP[variation.mediumId] ?? [];
  const selectedAspectRatios = variation.images.map(img => img.format.aspectRatio);
  const matchingFormats = selectedAspectRatios.filter(ar => canonicalFormats.includes(ar)).length;
  const totalSelected = selectedAspectRatios.length || 1;
  let platformFit = Math.round((matchingFormats / totalSelected) * 16);
  platformFit += (content.platformBestPractices?.length ?? 0) > 0 ? 4 : 0;
  platformFit = Math.min(20, Math.round(platformFit));

  // ── Copy Effectiveness (0-15) ─────────────────────────────────────────────
  const hasCreativePrompts = !!(content.creativePrompts?.insitu || content.creativePrompts?.visualStyle);
  const hasBestPractices   = (content.platformBestPractices?.length ?? 0) >= 2;
  const frameworkBonus     = config.brief.copyFramework !== 'auto' ? 3 : 1;
  let copyEffectiveness = 0;
  copyEffectiveness += hasCreativePrompts ? 5 : 0;
  copyEffectiveness += hasBestPractices   ? 4 : 0;
  copyEffectiveness += frameworkBonus;
  copyEffectiveness += Math.min(3, Math.round((nqs / 100) * 3));
  copyEffectiveness = Math.min(15, Math.round(copyEffectiveness));

  // ── Composite Total ───────────────────────────────────────────────────────
  const total = ctaPower + brandConsistency + visualHierarchy + platformFit + copyEffectiveness;
  const tier: CreativeScore['tier'] = total >= 80 ? 'top' : total >= 50 ? 'mid' : 'low';

  // ── Recommendation ────────────────────────────────────────────────────────
  let recommendation: string;
  if (tier === 'top') {
    recommendation = 'Lanzar en A/B test priority — alto potencial de conversión. Escalar presupuesto +20% si CTR supera benchmark de plataforma.';
  } else if (tier === 'mid') {
    const fixes: string[] = [];
    if (ctaPower < 18)         fixes.push('refuerza el Hook y CTA');
    if (brandConsistency < 14) fixes.push('completa el ADN de marca (logo + colores)');
    if (visualHierarchy < 10)  fixes.push('añade más descripciones con propuesta de valor');
    if (platformFit < 14)      fixes.push('ajusta los formatos al inventario canónico de la plataforma');
    recommendation = fixes.length > 0
      ? `Optimizar antes de lanzar: ${fixes.join(', ')}.`
      : 'Publicar con presupuesto de prueba limitado. Monitorear CTR vs. benchmark.';
  } else {
    recommendation = 'No desplegar. Revisar brief, keywords y ADN de marca. Iterar Fase 1 del FPCE con más contexto.';
  }

  return { total, ctaPower, brandConsistency, visualHierarchy, platformFit, copyEffectiveness, tier, recommendation };
}

// ---------------------------------------------------------------------------
// Main batch generation pipeline
// ---------------------------------------------------------------------------

export async function generateMassAds(
  config: MassAdConfig,
  lang: Language,
  onProgress: (progress: MassAdProgress) => void,
): Promise<MassAdBatchResult> {
  const startTime = Date.now();
  const est = estimateTokenCost(config);
  const totalTasks = est.copyCount + est.imageCount + est.imageCount;
  let completedTasks = 0;

  const update = (phase: MassAdProgress['phase'], label: string, errors: string[] = []) => {
    onProgress({ phase, totalTasks, completedTasks, currentLabel: label, errors });
  };

  const variations: MassAdVariation[] = [];
  const allErrors: string[] = [];
  
  // === PHASE 1: Atomic Copy Stock Generation (Fase 1 2.0) ===
  // Instead of Generating 1 by 1, we generate a high-quality "Creative Stock" (Atoms)
  update('copy', lang === 'es' ? 'Generando Stock Atómico de Copia...' : 'Generating Atomic Copy Stock...');
  
  const atomicJobs: Array<{
    mediumSel: MassAdMediumSelection;
    promise: Promise<AdGenerationResult>;
  }> = [];

  for (const mediumSel of config.media) {
    // We ask for a "Mega Content Block" that contains multiple headline/descriptions candidates
    const params: GenAdsParams = {
      keywords: config.brief.keywords,
      audience: config.brief.audience,
      objective: config.brief.objective,
      platform: mediumSel.medium.id,
      brandContext: config.brief.brandContext,
      tone: config.brief.tone,
      optimizationLevel: config.brief.optimizationLevel,
      copyFramework: config.brief.copyFramework,
      url: config.brief.url,
      videoPrompt: config.brief.videoPrompt,
      ttsScript: config.brief.ttsScript,
      suggestedVoice: config.brief.suggestedVoice,
      customInstructions: `
        INSTRUCCIÓN ATÓMICA DE PERFORMANCE:
        Para el motor de recombinador de INsitu AI, genera lo siguiente:
        1. 10 Titulares (headlines) potentes y diversos (atención, emocional, directo).
        2. 5 Descripciones detalladas.
        3. 3 CTAs persuasivos específicos.
        4. No te limites, sé ultra creativo. El sistema mezclará estos elementos.
        
        ${config.brief.customInstructions || ''}
      `,
    };
    
    atomicJobs.push({
      mediumSel,
      promise: adsGenerationService.generateAdContent(params, lang),
    });
  }

  const atomicResults = await Promise.allSettled(atomicJobs.map(j => j.promise));
  const creativeStocksByMedium: Record<string, AdGenerationResult> = {};

  for (let i = 0; i < atomicResults.length; i++) {
    const job = atomicJobs[i];
    const r = atomicResults[i];
    if (r.status === 'fulfilled') {
      const stock = r.value;
      // SCRUB ALL COPY CANDIDATES
      stock.headlines = stock.headlines.map(h => scrubCopy(h));
      stock.descriptions = stock.descriptions.map(d => scrubCopy(d));
      if (stock.socialCopy) {
        stock.socialCopy.hook = scrubCopy(stock.socialCopy.hook);
        stock.socialCopy.body = scrubCopy(stock.socialCopy.body);
        stock.socialCopy.cta = scrubCopy(stock.socialCopy.cta);
      }
      creativeStocksByMedium[job.mediumSel.medium.id] = stock;
    } else {
      allErrors.push(`Stock ${job.mediumSel.medium.name}: ${r.reason?.message || 'Failed'}`);
    }
  }

  // === PHASE 2: Recombination Engine (Fase 2 2.0) ===
  update('copy', lang === 'es' ? 'Recombinando variantes atómicas...' : 'Recombining atomic variations...');

  for (const mediumSel of config.media) {
    const stock = creativeStocksByMedium[mediumSel.medium.id];
    if (!stock) continue;

    for (let v = 0; v < config.variations; v++) {
      // Recombination logic: select different combinations for each variation
      const headlinesForThisVar = stock.headlines.slice(v % stock.headlines.length, (v % stock.headlines.length) + 5); 
      const descriptionsForThisVar = stock.descriptions.slice(v % stock.descriptions.length, (v % stock.descriptions.length) + 2);
      
      const vId = variations.length;
      variations.push({
        id: `var-${vId}`,
        variationIndex: v,
        mediumId: mediumSel.medium.id,
        mediumName: mediumSel.medium.name,
        adContent: {
          ...stock,
          headlines: headlinesForThisVar,
          descriptions: descriptionsForThisVar,
          // We can also rotate social copy parts if available
        },
        images: mediumSel.selectedFormats.map((fmt, fi) => ({
          id: `var-${vId}-img-${fi}`,
          format: fmt,
          rawImageUrl: null,
          compositedBlob: null,
          compositedDataUrl: null,
          status: 'pending' as const,
        })),
        status: 'generating-images',
      });
      completedTasks = Math.min(totalTasks, completedTasks + (est.copyCount / variations.length));
    }
  }

  update('copy', `Copy Stock & Recombination: DONE`, allErrors);

  // === PHASE 2: Image Generation ===
  update('images', lang === 'es' ? 'Generando imágenes...' : 'Generating images...', allErrors);
  const limit = pLimit(3);

  const imageJobs: Array<{ varIdx: number; imgIdx: number; promise: Promise<string> }> = [];

  for (let vi = 0; vi < variations.length; vi++) {
    const variation = variations[vi];
    if (variation.status === 'error') continue;

    const prompt = variation.adContent.creativePrompts?.insitu || variation.adContent.creativePrompts?.visualStyle || '';
    if (!prompt) continue;

    const brandJson = config.brief.brandContext ? JSON.stringify({
      brandName: config.brief.brandContext.brandName,
      industry: config.brief.brandContext.industry,
      brandColors: config.brief.brandContext.brandColors,
      typography: config.brief.brandContext.typography,
      toneOfVoice: config.brief.brandContext.toneOfVoice,
      visualGuidelines: config.brief.brandContext.visualGuidelines,
      adherenceLevel: config.brief.brandContext.adherenceLevel,
    }) : undefined;

    for (let ii = 0; ii < variation.images.length; ii++) {
      const img = variation.images[ii];
      imageJobs.push({
        varIdx: vi,
        imgIdx: ii,
        promise: limit(() =>
          generateProImage(prompt, {
            aspectRatio: img.format.aspectRatio,
            platform: variation.mediumName,
            objective: config.brief.objective,
            brandContext: brandJson,
          })
        ),
      });
    }
  }

  const imageResults = await Promise.allSettled(imageJobs.map(j => j.promise));

  for (let i = 0; i < imageResults.length; i++) {
    const job = imageJobs[i];
    const r = imageResults[i];
    completedTasks++;
    if (r.status === 'fulfilled') {
      variations[job.varIdx].images[job.imgIdx].rawImageUrl = r.value as string;
      variations[job.varIdx].images[job.imgIdx].status = 'compositing';
    } else {
      variations[job.varIdx].images[job.imgIdx].status = 'error';
      variations[job.varIdx].images[job.imgIdx].error = r.reason?.message || 'Image generation failed';
      allErrors.push(`Img ${variations[job.varIdx].mediumName} v${variations[job.varIdx].variationIndex + 1}: ${r.reason?.message || 'Failed'}`);
    }
    update('images', `${lang === 'es' ? 'Imagen' : 'Image'} ${completedTasks - est.copyCount}/${est.imageCount}...`, allErrors);
  }

  // === PHASE 3: Compositing ===
  update('compositing', lang === 'es' ? 'Aplicando overlays...' : 'Applying overlays...', allErrors);

  const compositeJobs: Array<{ varIdx: number; imgIdx: number; promise: Promise<{ blob: Blob; dataUrl: string }> }> = [];

  for (let vi = 0; vi < variations.length; vi++) {
    const variation = variations[vi];
    if (variation.status === 'error') continue;

    const headline = variation.adContent.headlines?.[0] || '';

    for (let ii = 0; ii < variation.images.length; ii++) {
      const img = variation.images[ii];
      if (!img.rawImageUrl || img.status === 'error') {
        completedTasks++;
        continue;
      }

      const { logoLayer, textLayers } = buildOverlayLayers({
        settings: config.overlaySettings,
        headline,
        logoUrl: config.brief.brandContext?.isotypeUrl,
        brandColors: config.brief.brandContext?.brandColors,
        brandTypography: config.brief.brandContext?.typography,
        suggestedColors: variation.adContent.suggestedColors,
      });

      compositeJobs.push({
        varIdx: vi,
        imgIdx: ii,
        promise: compositeStaticAd({
          imageUrl: img.rawImageUrl,
          aspectRatio: img.format.aspectRatio,
          logoLayer,
          textLayers,
        }),
      });
    }
  }

  const compositeResults = await Promise.allSettled(compositeJobs.map(j => j.promise));

  for (let i = 0; i < compositeResults.length; i++) {
    const job = compositeJobs[i];
    const r = compositeResults[i];
    completedTasks++;
    if (r.status === 'fulfilled') {
      variations[job.varIdx].images[job.imgIdx].compositedBlob = r.value.blob;
      variations[job.varIdx].images[job.imgIdx].compositedDataUrl = r.value.dataUrl;
      variations[job.varIdx].images[job.imgIdx].status = 'done';
    } else {
      variations[job.varIdx].images[job.imgIdx].status = 'error';
      variations[job.varIdx].images[job.imgIdx].error = r.reason?.message || 'Compositing failed';
      allErrors.push(`Overlay ${variations[job.varIdx].mediumName}: ${r.reason?.message || 'Failed'}`);
    }
    update('compositing', `Overlay ${i + 1}/${compositeJobs.length}...`, allErrors);
  }

  // === PHASE 3.5: Vision Intelligence Scoring (Fase 3 2.0) ===
  const visionEnabled = config.brief.optimizationLevel === 'aggressive'; // Only for high-performance runs
  
  if (visionEnabled) {
    update('packaging', lang === 'es' ? 'Analizando composiciones con IA de Visión...' : 'Analyzing compositions with Vision AI...', allErrors);
    
    for (const variation of variations) {
      if (variation.status === 'error') continue;
      
      // We analyze the first completed image as representative of the variation
      const targetImg = variation.images.find(img => img.status === 'done' && img.compositedDataUrl);
      if (targetImg && targetImg.compositedDataUrl) {
        try {
          const visionResults = await creativeIntelligenceService.scoreWithVision(
            targetImg.compositedDataUrl,
            variation.mediumName,
            config.brief.objective
          );

          // Merge vision score into the heuristic score later
          (variation as any).visionResults = visionResults;
        } catch (e) {
          logger.error("Vision scoring failed for variation", variation.id, e);
        }
      }
    }
  }

  // === FPCE PHASE 3: Creative Scoring — hybrid Heuristic + Vision ===
  update('packaging', lang === 'es' ? 'Calculando Creative Scores Híbridos...' : 'Calculating Hybrid Creative Scores...', allErrors);

  for (const variation of variations) {
    if (variation.status === 'done') {
      const baseScore = scoreVariation(variation, config);
      const visionRes = (variation as any).visionResults;
      
      if (visionRes) {
        // Hybrid weighting: 60% Heuristic, 40% Vision
        baseScore.total = Math.round((baseScore.total * 0.6) + (visionRes.total * 0.4));
        if (visionRes.recommendation) {
          baseScore.recommendation = `${visionRes.recommendation} | ${baseScore.recommendation}`;
        }
      }
      
      variation.creativeScore = baseScore;
    }
  }

  // Rank by score descending
  const topVariationIds = [...variations]
    .filter(v => v.creativeScore)
    .sort((a, b) => (b.creativeScore!.total) - (a.creativeScore!.total))
    .map(v => v.id);

  update('done', lang === 'es' ? 'Listo' : 'Done', allErrors);

  return {
    id: `batch-${Date.now()}`,
    timestamp: Date.now(),
    config,
    variations,
    totalTokenCost: est.total,
    generationTimeMs: Date.now() - startTime,
    topVariationIds,
    performanceLogs: [],
  };
}

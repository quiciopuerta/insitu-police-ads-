/**
 * researchValidator.ts — Scientific Verification Logic for Research Hub
 * 
 * Ported from services/ai/scientificVerificationService.ts for serverless usage.
 * Validates research outputs for hallucination, cites sources rigorously,
 * and ensures data integrity.
 * 
 * Updated 2026-05-05: Integrated VERITAS protocol and expanded domain tiers.
 */

export interface CitationValidation {
  text: string;
  citationIndex: number;
  sourceUrl?: string;
  confidence: number; // 0-1
  verified: boolean;
  issue?: string;
}

export interface VeracityScore {
  overall: number; // 0-100
  claimsVerified: number;
  claimsUnverified: number;
  hallucinations: string[];
  recommendations: string[];
  tier: 'VERIFIED' | 'NEEDS_REVIEW' | 'REJECTED';
}

export interface DataIntegrity {
  confidenceScore: number;
  dataSources: Array<{ metric: string; source: string; tier: number }>;
  missingMetrics: string[];
  hallucinationRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  qaNotes: string;
}

export interface ResearchValidation {
  originalText: string;
  veracity: VeracityScore;
  validatedCitations: CitationValidation[];
  sanitizedText: string;
  warnings: string[];
  dataIntegrity: DataIntegrity;
}

/**
 * Regex patterns to detect common hallucination indicators
 */
const HALLUCINATION_PATTERNS = [
  /according to a \(fictional|nonexistent|hypothetical\) /i,
  /allegedly|supposedly|purportedly/i,
  /some sources claim|certain studies suggest/i, 
  /it is believed that|many experts think/i,
  /in a recent interview|in an announcement/i,
  /approximately|roughly|around|about \d+%/i,
  /recent figures from \d{4}/i, // Potentially outdated if current year is much later
  /data from a private study/i,
  /unverified reports indicate/i,
];

/**
 * Detects potential hallucinations in research text
 */
function detectHallucinations(text: string): string[] {
  const issues: string[] = [];

  const vagueClaims = text.match(/(?:some|many|most|several|various) (?:experts|studies|sources|reports|analysts)/gi);
  if (vagueClaims && vagueClaims.length > 2) {
    issues.push(`Found ${vagueClaims.length} vague attributions — require specific sources and years`);
  }

  // Detect percentages without [N] citation
  const orphanNumbers = text.match(/(?<![\w\s])\d+(?:\.\d+)?%(?!\s*\[)/g);
  if (orphanNumbers && orphanNumbers.length > 0) {
    issues.push(`Found ${orphanNumbers.length} percentages without explicit citations [N] — verification required`);
  }

  // Detect currency values without [N] citation
  const orphanCurrency = text.match(/(?:\$|€|£)\s?\d+(?:\.\d+)?\s?(?:M|B|K)?(?!\s*\[)/gi);
  if (orphanCurrency && orphanCurrency.length > 0) {
    issues.push(`Found ${orphanCurrency.length} currency values without explicit citations [N]`);
  }

  for (const pattern of HALLUCINATION_PATTERNS) {
    if (pattern.test(text)) {
      issues.push(`Potential hallucination or low-fidelity indicator found: "${pattern.source}"`);
    }
  }

  return issues;
}

/**
 * Validates citation integrity against grounding metadata
 */
function validateCitations(
  text: string,
  citationMap: any[]
): CitationValidation[] {
  const citations: CitationValidation[] = [];
  const citationRegex = /\[(\d+)\]/g;
  let match;

  while ((match = citationRegex.exec(text)) !== null) {
    const citationIndex = parseInt(match[1]);
    const support = citationMap.find((s) => s.sourceIndices?.includes(citationIndex));

    citations.push({
      text: match[0],
      citationIndex,
      sourceUrl: support?.url,
      confidence: support?.confidence ?? 0.5,
      verified: !!support && (support.confidence ?? 0.5) > 0.6,
      issue: !support ? 'No grounding support found for this citation' : undefined,
    });
  }

  return citations;
}

/**
 * Scores overall research veracity
 */
function scoreVeracity(
  text: string,
  validatedCitations: CitationValidation[],
  hallucinations: string[]
): VeracityScore {
  const totalCitations = validatedCitations.length;
  const verifiedCitations = validatedCitations.filter((c) => c.verified).length;
  const unverifiedCitations = totalCitations - verifiedCitations;

  const wordCount = text.split(/\s+/).length || 1;
  const baseScore = totalCitations > 0 ? (verifiedCitations / totalCitations) * 100 : 50;
  const hallucPenalty = hallucinations.length * 12; // Increased penalty
  const citationDensity = (totalCitations / (wordCount / 100)) * 10; 

  let finalScore = Math.max(0, baseScore - hallucPenalty + Math.min(citationDensity, 10));

  let tier: 'VERIFIED' | 'NEEDS_REVIEW' | 'REJECTED';
  if (finalScore >= 85 && hallucinations.length === 0) {
    tier = 'VERIFIED';
  } else if (finalScore >= 60) {
    tier = 'NEEDS_REVIEW';
  } else {
    tier = 'REJECTED';
  }

  return {
    overall: Math.round(finalScore),
    claimsVerified: verifiedCitations,
    claimsUnverified: unverifiedCitations,
    hallucinations,
    recommendations:
      tier === 'REJECTED'
        ? ['CRITICAL: Request reformulation with explicit sources for all claims', 'Check for hallucinated entities or fictional studies']
        : tier === 'NEEDS_REVIEW'
        ? ['Review unverified citations before publication', 'Add inline sources for vague claims or missing years']
        : ['Research verified and publication ready'],
    tier,
  };
}

/**
 * Calculates a VERITAS Confidence Score based on the Data Verification Skill Protocol
 * 
 * 90-100: Official APIs / Tier 1 (Official Global/Market)
 * 70-89: Aggregators / Tier 2 (Strategic/Iberoamerica)
 * 50-69: Grounding/Cross-referencing (Tier 3/4)
 * <50: Speculative (Low Fidelity)
 */
function calculateVeritasScore(
  veracity: VeracityScore,
  sourceTiers: Array<{ tier: number }>
): number {
  if (sourceTiers.length === 0) return 45; // Below grounding threshold if no sources found

  const avgTier = sourceTiers.reduce((acc, s) => acc + s.tier, 0) / sourceTiers.length;
  
  // Base score from source quality (VERITAS hierarchy)
  let score = 0;
  if (avgTier <= 1.2) score = 98;      // Tier 1 Premium
  else if (avgTier <= 1.8) score = 92; // Tier 1 Standard
  else if (avgTier <= 2.5) score = 85; // Tier 2 Strategic
  else if (avgTier <= 3.5) score = 75; // Tier 3 Official National
  else score = 65;                    // Tier 4 Consultancy/Press

  // Penalize for veracity issues
  const hallucinationPenalty = veracity.hallucinations.length * 15;
  const unverifiedPenalty = veracity.claimsUnverified * 5;
  
  // Adjusted for overall veracity
  const veracityAdjustment = (veracity.overall - 85) / 2;

  return Math.max(0, Math.min(100, Math.round(score + veracityAdjustment - hallucinationPenalty - unverifiedPenalty)));
}

/**
 * Sanitizes text by removing unverified claims or paragraphs with hallucinations
 */
function sanitizeText(text: string, validatedCitations: CitationValidation[]): string {
  let sanitized = text;

  const paragraphs = sanitized.split('\n\n');
  const verifiedParagraphs = paragraphs.filter((p) => {
    const hasCitation = /\[\d+\]/.test(p);
    // Keep headers, lists, and short bridges, or anything with a citation
    return hasCitation || p.match(/^(##|###|-)/) || p.length < 60; 
  });

  sanitized = verifiedParagraphs.join('\n\n');

  const unverifiedCitations = validatedCitations.filter((c) => !c.verified);
  if (unverifiedCitations.length > 0) {
    sanitized += `\n\n---
> [!WARNING]
> **Unverified Citations (Manual Review Required):**
`;
    unverifiedCitations.forEach((c) => {
      sanitized += `- **Citation ${c.citationIndex}**: ${c.issue || 'Grounding confidence < 0.6'}\n`;
    });
  }

  return sanitized;
}

/**
 * Validates entire research output
 */
export async function validateResearch(
  text: string,
  citationMap?: any[],
  sources?: Array<{ title: string; url: string }>
): Promise<ResearchValidation> {
  const hallucinations = detectHallucinations(text);
  const validatedCitations = citationMap ? validateCitations(text, citationMap) : [];
  const veracity = scoreVeracity(text, validatedCitations, hallucinations);
  const sanitizedText = sanitizeText(text, validatedCitations);

  const sourceTiers = (sources || []).map(s => validateSourceTier(s));
  const confidenceScore = calculateVeritasScore(veracity, sourceTiers);

  const dataIntegrity: DataIntegrity = {
    confidenceScore,
    dataSources: (sources || []).map((s, i) => {
      let hostname = 'Search Grounding';
      try {
        if (s.url && s.url.startsWith('http')) {
          hostname = new URL(s.url).hostname;
        }
      } catch (e) {
        console.warn('[ResearchValidator] Invalid URL for source:', s.url);
      }
      return {
        metric: s.title || 'Unknown Metric',
        source: hostname,
        tier: sourceTiers[i]?.tier || 4
      };
    }),
    missingMetrics: [
      ...hallucinations,
      ...(veracity.claimsUnverified > 0 ? [`${veracity.claimsUnverified} claims without confirmed grounding`] : [])
    ],
    hallucinationRisk: veracity.hallucinations.length > 1 ? 'HIGH' : veracity.hallucinations.length > 0 ? 'MEDIUM' : 'LOW',
    qaNotes: (veracity.recommendations || []).join('. ') + (confidenceScore < 60 ? ' | WARNING: Source fidelity is below platform standards.' : '')
  };

  return {
    originalText: text,
    veracity,
    validatedCitations,
    sanitizedText,
    warnings:
      veracity.tier === 'REJECTED'
        ? ['❌ Research REJECTED — High risk of hallucination or unverified data detected.']
        : veracity.tier === 'NEEDS_REVIEW'
        ? ['⚠️ Research NEEDS REVIEW — Some claims lack strong grounding support.']
        : ['✅ Research VERIFIED — All claims grounded in high-fidelity sources.'],
    dataIntegrity
  };
}

/**
 * Validates source tier classification based on domain hierarchy
 */
export function validateSourceTier(
  source: { title: string; url: string }
): { tier: 1 | 2 | 3 | 4; reason: string } {
  try {
    const domain = new URL(source.url).hostname.toLowerCase();

    // Tier 1 — Global Research & Market Intel (Gold Standard)
    const tier1 = [
      'statista.com', 'kantar.com', 'nielseniq.com', 'euromonitor.com', 'gwi.com', 
      'ipsos.com', 'emarketer.com', 'similarweb.com', 'data.ai', 'thinkwithgoogle.com',
      'trends.google.com', 'ads.google.com', 'insiderintelligence.com', 'semrush.com',
      'ahrefs.com', 'spyfu.com', 'kantarmedia.com', 'nielsen.com'
    ];
    
    // Tier 2 — Strategic & International Organizations
    const tier2 = [
      'cepal.org', 'iadb.org', 'caf.com', 'confecamaras.co', 'asobancaria.com',
      'camara.es', 'undp.org', 'unctad.org', 'iso.org', 'fao.org', 'worldbank.org', 'imf.org',
      'eclac.org', 'oecd.org', 'wto.org', 'iab.com', 'iabspain.es', 'iabmexico.com',
      'iablatam.com', 'un.org', 'unesco.org'
    ];

    // Tier 3 — National Statistics & Central Banks (Official Government)
    const tier3Patterns = [
      // Mexico
      /inegi\.org\.mx/, /banxico\.org\.mx/, 
      // Colombia
      /dane\.gov\.co/, /banrep\.gov\.co/, /sic\.gov\.co/,
      // Spain
      /ine\.es/, /bde\.es/, /mineco\.gob\.es/,
      // USA
      /census\.gov/, /bls\.gov/, /federalreserve\.gov/, /bea\.gov/,
      // Ecuador
      /ecuadorencifras\.gob\.ec/, /bce\.ec/, 
      // Peru
      /inei\.gob\.pe/, /bcrp\.gob\.pe/,
      // Chile
      /ine\.cl/, /bc\.cl/, 
      // Argentina
      /indec\.gob\.ar/, /bcra\.gov\.ar/, 
      // Venezuela
      /ine\.gov\.ve/, /bcv\.org\.ve/,
      // Central America
      /ine\.gob\.gt/, /banguat\.gob\.gt/, 
      /inec\.go\.cr/, /bccr\.fi\.cr/,     
      /inec\.gob\.pa/, /bcr\.gob\.sv/,    
      /ine\.gob\.hn/, /bch\.hn/,         
      /inide\.gob\.ni/, /bcn\.gob\.ni/,
      // Other official government statistics
      /\.gov\./, /\.gob\./, /\.statistics\./, /\.census\./
    ];

    // Tier 4 — High-end Consulting & Global Business Press
    const tier4 = [
      'mckinsey.com', 'deloitte.com', 'pwc.com', 'bcg.com', 'bain.com', 
      'forbes.com', 'economist.com', 'ft.com', 'wsj.com', 'bloomberg.com',
      'hbr.org', 'reuters.com', 'apnews.com', 'fortune.com', 'cnbc.com',
      'strategyand.pwc.com', 'accenture.com', 'gartner.com', 'forrester.com'
    ];

    if (tier1.some((t) => domain.includes(t))) return { tier: 1, reason: 'Premium Market Research Institute (Tier 1)' };
    if (tier2.some((t) => domain.includes(t))) return { tier: 2, reason: 'Strategic International Organization (Tier 2)' };
    if (tier3Patterns.some((p) => p.test(domain))) return { tier: 3, reason: 'Official National Statistics/Banking (Tier 3)' };
    if (tier4.some((t) => domain.includes(t))) return { tier: 4, reason: 'Respected Consultancy or Business Press (Tier 4)' };

    if (domain.includes('blog') || domain.includes('medium.com') || domain.includes('linkedin.com/pulse')) {
      return { tier: 4, reason: 'Opinión o Blog — requiere validación experta' };
    }
  } catch (e) {
    return { tier: 4, reason: 'Invalid URL or unknown source' };
  }

  return { tier: 4, reason: 'General web source — verify data independently' };
}

/**
 * Validates entire research package for the Research Hub
 */
export async function validateResearchPackage(
  research: {
    text: string;
    sources?: Array<{ title: string; url: string }>;
    citationMap?: any[];
  }
): Promise<{
  validation: ResearchValidation;
  sourceTiers: Array<{ source: string; tier: number; reason: string }>;
  ready: boolean;
}> {
  const validation = await validateResearch(research.text, research.citationMap, research.sources);
  const sourceTiers = (research.sources || []).map((source) => ({
    source: source.title,
    ...validateSourceTier(source),
  }));

  const ready =
    validation.veracity.tier === 'VERIFIED' &&
    sourceTiers.every((s) => s.tier <= 3) &&
    validation.veracity.claimsUnverified === 0;

  return { validation, sourceTiers, ready };
}

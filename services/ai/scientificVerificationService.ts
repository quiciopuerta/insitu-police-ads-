/**
 * Scientific Verification Service
 * ================================
 * Validates research outputs for hallucination, cites sources rigorously,
 * and ensures data integrity across international markets.
 *
 * Prevents:
 * - Unverified claims
 * - Made-up statistics
 * - Unfounded correlations
 * - Misrepresented sources
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

export interface ResearchValidation {
  originalText: string;
  veracity: VeracityScore;
  validatedCitations: CitationValidation[];
  sanitizedText: string;
  warnings: string[];
}

/**
 * Regex patterns to detect common hallucination indicators
 */
const HALLUCINATION_PATTERNS = [
  /according to a \(fictional|nonexistent|hypothetical\) /i,
  /allegedly|supposedly|purportedly/i,
  /some sources claim|certain studies suggest/i, // Vague attributions
  /it is believed that|many experts think/i, // Unattributed opinions
  /in a recent interview|in an announcement/i, // Unlinked claims
  /approximately|roughly|around|about \d+%/i, // Unverified estimates
];

const BANNED_FICTIONAL_SOURCES = [
  'arXiv (without DOI)',
  'ResearchGate opinion pieces',
  'Personal blogs claiming research',
  'AI-generated papers',
  'Press releases (without official source)',
];

/**
 * Detects potential hallucinations in research text
 */
function detectHallucinations(text: string): string[] {
  const issues: string[] = [];

  // Check for vague attributions
  const vagueClaims = text.match(/(?:some|many|most|several) (?:experts|studies|sources|reports)/gi);
  if (vagueClaims && vagueClaims.length > 2) {
    issues.push(`Found ${vagueClaims.length} vague attributions — require specific sources`);
  }

  // Check for unverified statistics (numbers without context)
  const orphanNumbers = text.match(/(?<![\w\s])\d+(?:\.\d+)?%(?!\s*\[)/g);
  if (orphanNumbers && orphanNumbers.length > 0) {
    issues.push(`Found ${orphanNumbers.length} percentages without citations — verify each`);
  }

  // Check hallucination patterns
  for (const pattern of HALLUCINATION_PATTERNS) {
    if (pattern.test(text)) {
      issues.push(`Potential hallucination indicator: "${pattern.source}"`);
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
      verified: !!support && support.confidence > 0.6,
      issue: !support ? 'No grounding support found' : undefined,
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

  const baseScore = totalCitations > 0 ? (verifiedCitations / totalCitations) * 100 : 50;
  const hallucPenalty = hallucinations.length * 10;
  const citationDensity = (totalCitations / (text.split(/\s+/).length / 100)) * 10; // Citations per 100 words

  let finalScore = Math.max(0, baseScore - hallucPenalty + Math.min(citationDensity, 10));

  // Tier classification
  let tier: 'VERIFIED' | 'NEEDS_REVIEW' | 'REJECTED';
  if (finalScore >= 85) {
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
        ? ['Request reformulation with explicit sources for all claims']
        : tier === 'NEEDS_REVIEW'
        ? ['Review unverified citations before publication', 'Add inline sources for vague claims']
        : ['Publication ready'],
    tier,
  };
}

/**
 * Sanitizes text by removing unverified claims
 */
function sanitizeText(text: string, validatedCitations: CitationValidation[]): string {
  let sanitized = text;

  // Remove paragraphs with no citations
  const paragraphs = sanitized.split('\n\n');
  const verifiedParagraphs = paragraphs.filter((p) => {
    const hasCitation = /\[\d+\]/.test(p);
    return hasCitation || p.match(/^(##|###|-)/) || p.length < 50; // Keep headers/lists/short text
  });

  sanitized = verifiedParagraphs.join('\n\n');

  // Flag unverified citations
  const unverifiedCitations = validatedCitations.filter((c) => !c.verified);
  if (unverifiedCitations.length > 0) {
    sanitized += `\n\n⚠️ **Unverified Citations (Review Required):**\n`;
    unverifiedCitations.forEach((c) => {
      sanitized += `- Citation ${c.citationIndex}: ${c.issue}\n`;
    });
  }

  return sanitized;
}

/**
 * Validates entire research output
 */
export async function validateResearch(
  text: string,
  citationMap?: any[]
): Promise<ResearchValidation> {
  // Step 1: Detect hallucinations
  const hallucinations = detectHallucinations(text);

  // Step 2: Validate citations
  const validatedCitations = citationMap ? validateCitations(text, citationMap) : [];

  // Step 3: Score veracity
  const veracity = scoreVeracity(text, validatedCitations, hallucinations);

  // Step 4: Sanitize text
  const sanitizedText = sanitizeText(text, validatedCitations);

  return {
    originalText: text,
    veracity,
    validatedCitations,
    sanitizedText,
    warnings:
      veracity.tier === 'REJECTED'
        ? ['❌ Research REJECTED — Critical hallucinations detected. Do not publish.']
        : veracity.tier === 'NEEDS_REVIEW'
        ? ['⚠️ Research NEEDS REVIEW — Unverified claims present. Editor approval required.']
        : ['✅ Research VERIFIED — Safe for publication.'],
  };
}

/**
 * Validates source tier classification
 */
export function validateSourceTier(
  source: { title: string; url: string }
): { tier: 1 | 2 | 3 | 4; reason: string } {
  const url = source.url.toLowerCase();
  const domain = new URL(source.url).hostname.toLowerCase();

  // Tier 1: Premium research
  const tier1 = [
    'statista.com',
    'kantar.com',
    'emarketer.com',
    'similarweb.com',
    'euromonitor.com',
    'gwi.com',
    'thinkwithgoogle.com',
    'thinkhub.adobe.com',
  ];

  // Tier 2: Official & NGO
  const tier2 = [
    'cepal.org',
    'iadb.org',
    'undp.org',
    'unctad.org',
    'iso.org',
    'fao.org',
  ];

  // Tier 3: National/Regional (country-specific databases)
  const tier3Patterns = [
    /inegi\.org\.mx/, // Mexico — INEGI
    /banxico\.org\.mx/, // Mexico — Banco de México
    /dane\.gov\.co/, // Colombia
    /ine\.es/, // Spain
    /census\.gov/, // USA
    /bls\.gov/, // USA
    /inei\.gob\.pe/, // Peru
    /ine\.cl/, // Chile
    /indec\.gov\.ar/, // Argentina
    /ibge\.gov\.br/, // Brazil
    /inec\.ec/, // Ecuador — Instituto Nacional de Estadística y Censos
    /bce\.ec/, // Ecuador — Banco Central del Ecuador
    /ine\.gob\.ve/, // Venezuela — Instituto Nacional de Estadística
    /bcv\.org\.ve/, // Venezuela — Banco Central de Venezuela
  ];

  // Tier 4: Consultancies & Publishers
  const tier4 = [
    'mckinsey.com',
    'deloitte.com',
    'pwc.com',
    'bcg.com',
    'bain.com',
    'forbes.com',
    'economist.com',
  ];

  if (tier1.some((t) => domain.includes(t))) {
    return { tier: 1, reason: 'Premium research institute' };
  }
  if (tier2.some((t) => domain.includes(t))) {
    return { tier: 2, reason: 'Official international organization' };
  }
  if (tier3Patterns.some((p) => p.test(domain))) {
    return { tier: 3, reason: 'Official national statistics' };
  }
  if (tier4.some((t) => domain.includes(t))) {
    return { tier: 4, reason: 'Respected consultancy/publisher' };
  }

  // Penalize weak sources
  if (
    domain.includes('blog') ||
    domain.includes('medium.com') ||
    domain.includes('linkedin.com/pulse')
  ) {
    return { tier: 4, reason: 'Opinion piece — requires expert validation' };
  }

  return { tier: 4, reason: 'General source — verify independently' };
}

/**
 * Validates entire research package with all metadata
 */
export async function validateResearchPackage(
  research: {
    text: string;
    tldr?: string;
    sources?: Array<{ title: string; url: string }>;
    citationMap?: any[];
  }
): Promise<{
  validation: ResearchValidation;
  sourceTiers: Array<{ source: string; tier: number; reason: string }>;
  ready: boolean;
}> {
  // Validate main content
  const validation = await validateResearch(research.text, research.citationMap);

  // Validate sources
  const sourceTiers = (research.sources || []).map((source) => ({
    source: source.title,
    ...validateSourceTier(source),
  }));

  // Overall readiness
  const ready =
    validation.veracity.tier === 'VERIFIED' &&
    sourceTiers.every((s) => s.tier <= 3) &&
    validation.veracity.claimsUnverified === 0;

  return {
    validation,
    sourceTiers,
    ready,
  };
}

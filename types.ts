export type UserRole = 'admin' | 'user' | 'superAdmin';
export type SubscriptionStatus = 'active' | 'inactive' | 'expired';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'invited';
export type PlanTier = 'Starter' | 'Growth' | 'Agency';
export type Language = 'es' | 'en';
export type TabType = 'analyzer' | 'search' | 'image-ai' | 'video-ai' | 'image-audit' | 'video-audit' | 'compare-ai' | 'campaigns' | 'brand-guardian' | 'blog' | 'traffic-checker' | 'brand-identity' | 'metrics' | 'gen-ads' | 'creative-lab' | 'research-hub' | 'funnel-architect' | 'mass-ads' | 'automation-rules' | 'portavoz' | 'flow' | 'scripts' | 'police-ads';

export interface AdVideoOptions {
  aspectRatio: '1:1' | '16:9' | '9:16';
  duration?: '4"' | '6"' | '8"'; // Updated to match Veo 3.1
  motionIntensity?: 'low' | 'medium' | 'high' | number;
  cameraMotionSpeed?: number;
  styleReferencePower?: number;
  style?: string;
  fps?: number;
}

export interface AdAnimationOptions {
  motionIntensity: 'low' | 'medium' | 'high' | number;
  cameraMotionSpeed?: number;
  styleReferencePower?: number;
  motionType: 'cinematic' | 'subtle' | 'dynamic';
  focusArea: 'Center' | 'Background' | 'Foreground' | 'Whole Frame';
  format: 'Square' | 'Social' | 'Landscape' | 'Portrait';
  musicVolume: number;
  voiceover: {
    enabled: boolean;
    text: string;
    voice: string;
    language: string;
    tone: string;
    dialect: string;
  };
}

export interface RetailProduct {
  id: string;
  name: string;
  originalImage: string;
  processedImage: string | null;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

export interface RetailLayout {
  id: string;
  name: string;
  image: string;
}

export interface BrandBrief {
  projectName: string;
  targetAudience: string;
  toneOfVoice: string;
  mainObjective: string;
  competitors: string;
  uniqueSellingPoint: string;
}

export interface BrandProfile {
  id: string; // Unique identifier for the profile/tenant
  brandName: string;
  industry: string;
  valueProposition: string;
  targetAudience: string;
  toneOfVoice: string;
  adherenceLevel: 'Strict' | 'Flexible' | 'Creative';
  keyMessages: string[];
  visualGuidelines: string;
  brandColors?: string;
  typography?: string;
  complianceRules: string;
  brandBookPdfName?: string;
  isotypeUrl?: string;
  isotypeVisibility?: 'header' | 'footer' | 'both' | 'none';
  lastUpdated?: number;
  website?: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    linkedin?: string;
    x?: string;
    pinterest?: string;
    youtube?: string;
  };
  clonedVoiceId?: string;
  clonedVoiceSample?: string;
  martechConfig?: {
    gtmId?: string;
    metaPixelId?: string;
    metaAccessToken?: string;
    googleAdsId?: string;
    googleAdsConversionLabel?: string;
    tiktokPixelId?: string;
    tiktokAccessToken?: string;
    ga4Id?: string;
    enabled: boolean;
    validationStatus?: Record<string, { isValid: boolean; lastChecked: number; message?: string }>;
  };
}

export interface BriefAnalysisResult {
  score: number;
  critique: string;
  missingElements: string[];
  optimizationTips: string[];
  suggestedKeywords: string[];
}

export interface AIConfig {
  id?: string;
  name?: string;
  provider: string;
  apiKey: string;
  status: 'active' | 'inactive';
  lastUsed?: number;
  lastError?: string;
  type?: 'text' | 'image' | 'video' | 'analysis';
}

export interface PayPalConfig {
  clientId: string;
  mode: 'sandbox' | 'live';
  enabled: boolean;
  plans: {
    Starter: string;
    Growth: string;
    Agency: string;
  };
}

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure: boolean;
  fromEmail: string;
  fromName: string;
  enabled: boolean;
}

export interface HubSpotConfig {
  accessToken: string;
  portalId?: string;
  enabled: boolean;
}

export interface SystemSettings {
  configVersion?: number;
  aiConfigs: AIConfig[];
  googleAuth: {
    clientId: string;
    enabled: boolean;
  };
  smtp?: SmtpConfig;
  hubspot?: HubSpotConfig;
  paypal: PayPalConfig;
  trialTokens: number;
  trialDays: number;
  pricing: {
    Starter: {
      monthly: number;
      yearly: number;
      lifetime: number;
      features: string[];
    };
    Growth: {
      monthly: number;
      yearly: number;
      lifetime: number;
      features: string[];
    };
    Agency: {
      monthly: number;
      yearly: number;
      lifetime: number;
      features: string[];
    };
  };
  features: {
    imageAnalysis: boolean;
    videoAnalysis: boolean;
    metrics: boolean;
    trafficAnalysis: boolean;
    brandIdentity: boolean;
    campaignsOptimizer: boolean;
    compareCreatives: boolean;
    searchResultAudit: boolean;
    glossary: boolean;
    blog: boolean;
    enableAutoTrends: boolean;
    scriptGenerator: boolean;
  };
  comingSoon?: {
    enabled: boolean;
    message: string;
  };
  maintenanceMode?: boolean;
  martechConfig?: {
    gtmId?: string;
    metaPixelId?: string;
    metaAccessToken?: string;
    googleAdsId?: string;
    googleAdsConversionLabel?: string;
    tiktokPixelId?: string;
    tiktokAccessToken?: string;
    ga4Id?: string;
    enabled: boolean;
    validationStatus?: Record<string, { isValid: boolean; lastChecked: number; message?: string }>;
  };
}

export type BillingCycle = 'Monthly' | 'Yearly';
export type PaymentStatus = 'paid' | 'pending' | 'failed' | 'refunded';

export interface TransactionRecord {
  id: string;
  date: number;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paypalTransactionId?: string;
  invoiceUrl?: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role: UserRole;
  picture?: string;
  lastLogin: number;
  approvalStatus: ApprovalStatus;
  linkedGoogleAds?: {
    name: string;
    email: string;
    picture: string;
    accessToken: string;
    method: 'oauth' | 'manual';
    accountId?: string;
    linkedAt?: number;
  };
  subscription: {
    status: SubscriptionStatus | 'trial' | 'past_due' | 'canceled';
    plan: PlanTier | 'Trial';
    price: number;
    currency: string;
    billingCycle: BillingCycle;
    startDate: number;
    expiryDate: number; // Next Renewal Date
    paymentMethod?: 'PayPal' | 'Stripe' | 'Manual';
    paypalSubscriptionId?: string;
    paypalCustomerId?: string; // Payer ID
    cancelAtPeriodEnd: boolean;
    lastPaymentDate?: number;
    failedPaymentCount?: number;
    transactionHistory?: TransactionRecord[];
  };
  totalTokensUsed?: number;
  textQueriesUsed?: number;
  imageQueriesUsed?: number;
  lastResourceCost?: number; // Total cost in dollars for Agency plan hidden cap
  usageLimit?: number;
  usageHistory?: UsageHistoryItem[];
  freeTrialsUsed?: number;
  privacyConsent?: {
    accepted: boolean;
    timestamp: number;
    version: string;
    gdpr: boolean;
    ccpa: boolean;
    lgpd: boolean;
  };
  brandProfile?: BrandProfile;
  brandProfiles?: BrandProfile[];
  selectedProfileId?: string; // Currently active profile ID
  savedVoices?: SavedVoice[];
  bonus_tokens?: number;
  total_bonus_earned?: number;
  referred_by?: string;
  settings?: {
    theme?: 'light' | 'dark' | 'system';
    language?: Language;
    notifications?: boolean;
    emailFrequency?: 'realtime' | 'daily' | 'weekly';
    expertAiModel?: string;
  };
}

export type User = AuthUser;

export interface SavedVoice {
  id: string;
  name: string;
  voiceType: string;
  url: string;
  timestamp: number;
  tags?: string[];
  text?: string;
  language?: string;
  dialect?: string;
  tone?: string;
  emotion?: string;
  pitch?: number;
  speed?: number;
}

export interface AdminAuditLog {
  id: string;
  adminId: string;
  action: string;
  targetUserId: string;
  timestamp: number;
  details: string;
  ipAddress?: string;
}

export interface PayPalWebhookLog {
  id: string;
  eventId: string;
  eventType: string;
  resourceId: string;
  timestamp: number;
  status: 'processed' | 'failed' | 'ignored';
  payloadSummary: string;
}

export interface BrandAsset {
  id: string;
  name: string;
  type: 'logo' | 'color' | 'font' | 'pdf';
  value: string;
  source: 'upload' | 'drive';
}

export interface KeywordMetric {
  term: string;
  volume: string;
  competition: 'Baja' | 'Media' | 'Alta' | 'Low' | 'Medium' | 'High';
  cpc: string;
  avgImpressions?: number;   // Avg monthly impressions
  ctr?: string;              // Estimated CTR e.g. "3.2%"
  suggestedMatchType?: 'Exact' | 'Phrase' | 'Broad';  // Recommended match type
}

export interface MetricPoint {
  month: string;
  cpc: number;
  conv: number;
  ranking: number;
}

export interface CompetitorMonthlyData {
  month: string;        // "Ene", "Feb", etc.
  impressionShare: number;
  avgSearchVolume: number;
}

export interface Competitor {
  name: string;
  impressionShare: number;
  overlapRate: number;
  positionAboveRate: number;
  topOfPageRate: number;
  absTopOfPageRate: number;
  outrankingShare: number;
  avgPosition?: number;
  nicheDominance?: string;
  trafficVolume?: number;                   // Real monthly traffic from SimilarWeb/SemRush
  monthlySeries?: CompetitorMonthlyData[];  // For line chart
  avgMonthlySearches?: number;              // For summary table
  peakMonth?: string;                       // Month with highest volume
}

export interface TrafficCheckResult {
  domain: string;
  period?: string;  // Audit period: '30d', '90d', '6m', '12m'
  auditedAt?: string; // ISO timestamp of the audit
  dataSource?: string; // Sources used for the audit
  summaryContent?: string; // Premium TL;DR for stakeholders
  language?: Language; // Audit language
  webSourcesUsed?: string[]; // Actual web URLs consulted
  realDataCollected?: string[]; // Real public API sources used
  organicTraffic: number;
  organicKeywords: number;
  domainAuthority: number;
  backlinks: number;
  backlinksList?: Array<{
    url: string;
    authority: number;
    type?: 'dofollow' | 'nofollow' | 'unknown';
    context?: string;
    quality?: 'high' | 'medium' | 'low' | 'toxic' | 'Alta' | 'Media' | 'Baja';
  }>;
  backlinkOpportunities?: Array<{
    domain: string;
    authority: number;
    strategy: string;
  }>;
  keywordsList?: Array<{
    term: string;
    volume: number;
    difficulty: number;
    position?: number;
    intent?: 'informational' | 'transactional' | 'navigational' | 'commercial';
    cpc?: string;
  }>;
  keywordOpportunities?: Array<{
    term: string;
    potential?: string;
    volume?: number;
    difficulty?: number;
    reason?: string;
  }>;
  topPages: { url: string; visits: string; keywords: number }[];
  trafficByCountry: { country: string; percentage: number }[];
  competitors: Array<{
    domain: string;
    position: number;
    trafficVolume: number;
    commonKeywords: number;
    competitionLevel: 'Alta' | 'Media' | 'Baja' | 'Alto' | 'Medio' | 'Bajo';
    domainAuthority?: number;  // DA 0-100
    avgPosition?: number;      // Average Google Search position
    organicKeywords?: number;  // Total organic keyword count for this competitor
    backlinks?: number;        // Total backlinks count
    strategy?: string;         // Main SEO strategy
    gapInsight?: string;       // Key competitive gap vs analyzed domain
    seoStrategy?: string;
    purchasedPositionUrl?: string;
    trafficSource?: string;    // "SimilarWeb (real)" | "SemRush (real)" | "Ahrefs (real)" | "Estimación IA"
  }>;
  competitorGaps?: {
    keywords: string[];
    backlinks: string[];
    content: string[];
  };
  gapAnalysis?: string[];
  seoCritique: string[];
  dataQuality?: {
    confidenceScore: number;
    sourceReliability: string;
    validationMethod: string;
  };
  strategicRecommendations?: string[];
  realDataDetails?: {
    domainAge: number | null;
    domainRegistered: string | null;
    firstSeenYear: number | null;
    hasArchive: boolean | null;
    httpsEnabled: boolean | null;
    httpStatus: number | null;
    commoncrawlBacklinks: number | null;
    sitemapPages: number | null;
    techStack: string[] | null;
  };
  isCached?: boolean;
  cachedAt?: string;
  temporalInsight?: {
    trend: 'improving' | 'declining' | 'stable';
    diff: string;
    metrics: {
      trafficChange: number;
      daChange: number;
      keywordsChange: number;
    };
  };
  marketTrends?: string[];
  previousStats?: {
    organicTraffic: number;
    organicKeywords: number;
    domainAuthority: number;
    backlinks: number;
    auditedAt?: string;
  };
  trends?: {
    traffic: 'up' | 'down' | 'stable';
    keywords: 'up' | 'down' | 'stable';
    da: 'up' | 'down' | 'stable';
    backlinks: 'up' | 'down' | 'stable';
  };
  aeoAudit?: {
    score: number;
    topSources: Array<{ name: string; url?: string; mentions?: number }>;
    citationShare: Array<{ name: string; share: number; color?: string }>;
    agentOptimizations: string[];
  };
}

export interface AdExtension {
  type: 'Sitelink' | 'Callout' | 'Structured Snippet' | 'Call' | 'Lead Form';
  title?: string;
  description?: string;
  url?: string;
  value?: string;
}

export interface BudgetScenario {
  label: string;
  dailyBudget: number;
  monthlyBudget: number;
  estimatedClicks: number;
  estimatedImpressions: number;
  estimatedConversions: number;
  estimatedCPA: number;
  estimatedROAS: number;
  estimatedRevenue: number;
}

export interface ConversionFunnel {
  impressions: number;
  clicks: number;
  visits: number;
  leads: number;
  conversions: number;
  ctr: number;
  conversionRate: number;
  cpa: number;
  roas: number;
  dailyBudget: number;
}

export interface SearchResult {
  text: string;
  sources: Source[];
  extractedKeywords: KeywordMetric[];
  headlines: string[];
  descriptions: string[];
  recommendedLocations: string[];
  specificLocalities?: string[];
  metricsSeries: MetricPoint[];
  competitors: Competitor[];
  themeContext: string;
  targetAudience?: string;
  periodContext?: string;
  isRealDataAudit?: boolean;
  suggestionsForFirstPlace?: string[];
  suggestedSegmentation?: string[];
  platformInterests?: string[];
  suggestedCTAs?: string[];
  psychologicalHooks?: string[];
  landingUrl?: string;
  language?: Language;
  // New Domain Metrics
  domainAuthority?: number;
  estimatedMarketTraffic?: string;
  marketTempScore?: number;
  // New v5 fields
  negativeKeywords?: string[];
  adExtensions?: AdExtension[];
  budgetScenarios?: BudgetScenario[];
  conversionFunnel?: ConversionFunnel;
  industryBenchmark?: {
    avgCpc: number;
    avgCtr: number;
    avgConversionRate: number;
    industry: string;
    userCpcDelta: number; // % difference: positive = user is above benchmark
  };
  platformRecommendations?: string[]; // Recommendations for Google Ads platform
  auditRecommendations?: string[];    // Recommendations for the audit/report format
  geographicInsights?: string[];      // Deep GEO insights (hotspots, trends per region)
  aeoOptimizations?: string[];        // AI Engine Optimization tips for LLM visibility
  searchGroundingSources?: Source[];  // Real-time sources found via Search Grounding
  thinkingProcess?: string;           // Gemini 2.0 Thinking process tokens
  tldr?: string;                      // New: TL;DR content for executives
  forensicCheckpoints?: string[];     // New: 200+ point technical findings
  realPerformanceAudit?: CampaignAudit; // Analysis of the user's real performance data
}

export interface LandingPageSection {
  id: string;
  type: 'hero' | 'features' | 'socialProof' | 'faq' | 'cta' | 'benefits' | 'neuroInsights';
  title: string;
  content: string; // The copy text
  subtitle?: string;
  ctaText?: string;
  visualPrompt?: string; // Guidance for image/video generation in Engagement platform
  items?: Array<{ title: string; description: string; icon?: string }>;
}

export interface LandingPageBrief {
  id: string;
  title: string;
  targetAudience: string;
  toneOfVoice: string;
  sellingStrategy: string; // PAS, AIDA, etc.
  sections: LandingPageSection[];
  suggestedColors: string[];
}

export interface FunnelArchitectResult {
  id: string;
  timestamp: number;
  url: string;
  ads: AdGenerationResult[];
  landingBrief: LandingPageBrief;
  marketingStrategy: string;
}

export interface AdGenerationResult {
  id: string;
  timestamp: number;
  type: 'search' | 'meta' | 'tiktok' | 'display' | 'pmax';
  headlines: string[];
  descriptions: string[];
  socialCopy?: {
    hook: string;
    body: string;
    cta: string;
  };
  creativePrompts: {
    visualStyle: string;
    insitu: string;
    insitu_placeholder?: string;
    midjourney?: string;
    dalle?: string;
    neuroLogic: string; // Explanation of why this follows Antigravity Protocol
  };
  neuroQualityScore: number; // 0-100
  platformBestPractices: string[];
  suggestedColors?: string[];
  suggestedTypography?: string;
}

export interface GenAdsParams {
  url?: string;
  keywords: string;
  audience: string;
  objective: string;
  platform: 'search' | 'meta' | 'tiktok' | 'display' | 'pmax';
  brandContext?: BrandProfile;
  tone?: string;
  customInstructions?: string;
  optimizationLevel: 'standard' | 'aggressive';
  copyFramework?: 'auto' | 'aida' | 'pas' | 'bab' | '4ps';
  videoPrompt?: string;
  ttsScript?: string;
  suggestedVoice?: string;
}

// ---------------------------------------------------------------------------
// Mass Ad Creation Types
// ---------------------------------------------------------------------------

/** A visual format (aspect ratio) for a specific ad placement */
export interface MassAdFormat {
  aspectRatio: string;
  label: string;
  placement: string;
}

/** An advertising medium/channel with its associated visual formats */
export interface MassAdMedium {
  id: 'search' | 'meta' | 'tiktok' | 'display' | 'pmax';
  name: string;
  icon: string;
  formats: MassAdFormat[];
}

export interface MassAdBrief {
  keywords: string;
  audience: string;
  objective: string;
  tone?: string;
  customInstructions?: string;
  copyFramework: 'auto' | 'aida' | 'pas' | 'bab' | '4ps';
  optimizationLevel: 'standard' | 'aggressive';
  brandContext: BrandProfile;
  url?: string;
  videoPrompt?: string;
  ttsScript?: string;
  suggestedVoice?: string;
}

export interface MassAdOverlaySettings {
  showLogo: boolean;
  logoPosition: TextPosition;
  logoSize: number;
  showHeadline: boolean;
  headlinePosition: TextPosition;
  headlineFontSize: number;
  headlineColor: string;
  headlineBackground: boolean;
  headlineBackgroundColor: string;
}

/** Selected medium + which of its formats the user wants */
export interface MassAdMediumSelection {
  medium: MassAdMedium;
  selectedFormats: MassAdFormat[];
}

export interface MassAdConfig {
  brief: MassAdBrief;
  variations: number;
  media: MassAdMediumSelection[];
  overlaySettings: MassAdOverlaySettings;
}

export interface MassAdImage {
  id: string;
  format: MassAdFormat;
  rawImageUrl: string | null;
  compositedBlob: Blob | null;
  compositedDataUrl: string | null;
  status: 'pending' | 'generating' | 'compositing' | 'done' | 'error';
  error?: string;
}

/** Creative Score breakdown for a variation (FPCE Phase 3) */
export interface CreativeScore {
  total: number;            // 0-100 composite score
  ctaPower: number;         // 0-25: Hook + CTA clarity/urgency
  brandConsistency: number; // 0-20: Colors, logo, typography compliance
  visualHierarchy: number;  // 0-20: Message structure & headline quality
  platformFit: number;      // 0-20: Format-to-platform alignment
  copyEffectiveness: number;// 0-15: Neuro quality + framework adherence
  tier: 'top' | 'mid' | 'low'; // top ≥80, mid 50-79, low <50
  recommendation: string;   // Actionable growth insight for this variation
}

/** Real-world performance log — FPCE Phase 4 Feedback Loop */
export interface CreativePerformanceLog {
  variationId: string;
  mediumId: string;
  loggedAt: number;
  ctr?: number;         // Click-through rate (%)
  cpa?: number;         // Cost per acquisition ($)
  roas?: number;        // Return on ad spend (x)
  impressions?: number;
  conversions?: number;
  userNote?: string;
}

/** One variation = one medium with its own copy + images in selected formats */
export interface MassAdVariation {
  id: string;
  variationIndex: number;
  mediumId: string;
  mediumName: string;
  adContent: AdGenerationResult;
  images: MassAdImage[];
  status: 'pending' | 'generating-copy' | 'generating-images' | 'compositing' | 'done' | 'error';
  error?: string;
  creativeScore?: CreativeScore; // FPCE Phase 3: predictive performance score
}

export interface MassAdBatchResult {
  id: string;
  timestamp: number;
  config: MassAdConfig;
  variations: MassAdVariation[];
  totalTokenCost: number;
  generationTimeMs: number;
  topVariationIds?: string[];                 // FPCE Phase 3: sorted by creativeScore.total desc
  performanceLogs?: CreativePerformanceLog[]; // FPCE Phase 4: real KPI tracking
}

export interface MassAdProgress {
  phase: 'idle' | 'copy' | 'images' | 'compositing' | 'packaging' | 'done' | 'error';
  totalTasks: number;
  completedTasks: number;
  currentLabel: string;
  errors: string[];
}

export type ResearchMode = 'search' | 'thinking';

export interface ResearchSource {
  index?: number;
  title: string;
  uri?: string; // Standardize to uri if possible, but ResearchHub used 'url'. I'll keep both or pick one? 
  url: string; 
}

export interface CitationRef {
  segment: string;
  sourceIndices: number[];
  confidence: number | null;
}

export interface ResearchMeta {
  modelUsed?: string;
  sourceCount?: number;
  citationCount?: number;
  searchDate?: string;
}

export interface RichMetric {
  label: string;
  value: string;
  source?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export interface ChartSeries {
  label: string;
  value: number;
  color?: 'primary' | 'secondary' | 'blue' | 'green' | 'orange';
}

export interface ChartData {
  title: string;
  type: 'bar' | 'line';
  unit?: string;
  series: ChartSeries[];
}

export interface ResearchTableData {
  title: string;
  headers: string[];
  rows: string[][];
}

export interface RichContent {
  metrics?: RichMetric[];
  chartData?: ChartData[];
  tables?: ResearchTableData[];
}

export interface VeracityScore {
  overall: number;
  claimsVerified: number;
  claimsUnverified: number;
  hallucinations: string[];
  recommendations: string[];
  tier: 'VERIFIED' | 'NEEDS_REVIEW' | 'REJECTED';
}

export interface ResearchEntry {
  id: string;
  query: string;
  mode: ResearchMode;
  text: string;
  tldr?: string;
  veracity?: VeracityScore; // Scientific verification score
  veracity_string?: string; // Legacy SCIENTIFIC_VERACITY block (fallback)
  sources: ResearchSource[];
  citationMap?: CitationRef[];
  sourceTiers?: Array<{ source: string; tier: number; reason: string }>;
  validationReady?: boolean;
  richContent?: RichContent;
  meta?: ResearchMeta;
  thinking?: string;
  timestamp: number;
}
// ---------------------------------------------------------------------------
// Automation Rules Engine (Agentic Campaign Management)
// ---------------------------------------------------------------------------

export type AutomationMetric = 'cpa' | 'roas' | 'ctr' | 'cpc' | 'frequency' | 'spend';
export type AutomationOperator = '>' | '<' | '>=' | '<=' | '==' | '!=';
export type AutomationActionType = 'pause_ad' | 'scale_budget' | 'decrease_budget' | 'rotate_creative' | 'send_alert' | 'revive_ad';
export type AutomationLogic = 'AND' | 'OR';

export interface AutomationCondition {
  id: string;
  metric: AutomationMetric;
  operator: AutomationOperator;
  value: number;
  timeframeDays: number; // Evaluated over the last X days
}

export interface AutomationAction {
  type: AutomationActionType;
  value?: number; // e.g., scale budget by 20%
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  logic: AutomationLogic;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  lastTriggered?: number;
  createdAt: number;
  templateType?: 'stop_loss' | 'surf' | 'revive' | 'fatigue_guard' | 'custom';
}

export interface AutomationLog {
  id: string;
  ruleId: string;
  ruleName: string;
  timestamp: number;
  campaignId?: string;
  adId?: string;
  actionTaken: AutomationActionType;
  metricsSnapshot: Record<string, number>;
  status: 'executed' | 'recommended' | 'failed'; // Recommended if read-only mode
}

export type HistoryItemType = 'search' | 'traffic' | 'image' | 'video' | 'campaign' | 'comparison' | 'compare' | 'gen-ads' | 'gen-research' | 'avatar' | 'mass-ads' | 'creative-lab';

export type HistoryItem =
  | {
    id: string;
    timestamp: number;
    userId: string;
    type: 'search';
    query: { theme: string; country: string; objective: string; period: string; landingUrl?: string; };
    result: SearchResult;
  }
  | {
    id: string;
    timestamp: number;
    userId: string;
    type: 'traffic';
    query: { domain: string; country: string };
    result: TrafficCheckResult;
  }
  | {
    id: string;
    timestamp: number;
    userId: string;
    type: 'image';
    query: { fileName: string; objective?: string };
    result: ImageAnalysisResult;
  }
  | {
    id: string;
    timestamp: number;
    userId: string;
    type: 'video';
    query: { fileName: string; platform?: string };
    result: VideoAnalysisResult;
  }
  | {
    id: string;
    timestamp: number;
    userId: string;
    type: 'campaign';
    query: { accountName: string; period: string };
    result: CampaignAudit;
  }
  | {
    id: string;
    timestamp: number;
    userId: string;
    type: 'comparison';
    query: { fileA: string; fileB: string; objective?: string };
    result: any; // Using any for now to avoid circular dependency or missing import if CompareResult is not exported here
  }

  | {
    id: string;
    timestamp: number;
    userId: string;
    type: 'gen-ads';
    query: GenAdsParams;
    result: AdGenerationResult;
  }
  | {
    id: string;
    timestamp: number;
    userId: string;
    type: 'gen-research';
    query: { query: string; mode: 'search' | 'thinking' };
    result: ResearchEntry;
  }
  | {
    id: string;
    timestamp: number;
    userId: string;
    type: 'compare';
    query: { fileA: string; fileB: string; objective?: string };
    result: any;
  }
  | {
    id: string;
    timestamp: number;
    userId: string;
    type: 'creative-lab';
    query: { labType: string; prompt: string };
    result: any;
  }
  | {
    id: string;
    timestamp: number;
    userId: string;
    type: 'mass-ads';
    query: MassAdConfig;
    result: MassAdBatchResult;
  }
  | {
    id: string;
    timestamp: number;
    userId: string;
    type: 'avatar';
    query: { script: string; visualType: string };
    result: { videoUrl: string; audioUrl?: string };
  };

export interface Source {
  title: string;
  uri: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface CampaignAudit {
  healthScore: number;
  criticalIssues: string[];
  opportunities: string[];
  suggestedBidding: string;
  analysis: string;
  suggestedSegmentation?: string[];
  language?: Language;
}

// ============================================================================
// NEURO-CREATIVE SCORE (NCS) — TRIBE v2 Inspired Methodology
// Segmenta el análisis en 4 ROIs Cognitivas: Atención, Emoción, Decisión, Carga
// ============================================================================

/** Una región de interés cognitiva (ROI) del creativo */
export interface CognitiveROI {
  /** Score 0-100 para esta ROI */
  score: number;
  /** Nivel de confianza de la predicción */
  confidence: 'high' | 'medium' | 'low';
  /** Elementos visuales/narrativos que dominan esta ROI */
  dominantElements: string[];
  /** Recomendación accionable para optimizar esta ROI */
  recommendation: string;
}

/**
 * Neuro-Creative Score (NCS) — KPI diferenciador de INsitu AI
 * Composite: (Atención×0.30) + (Emoción×0.25) + (Decisión×0.25) + (CargaCognitiva×0.20)
 * Tier: elite ≥80 | strong 60-79 | average 40-59 | weak <40
 */
export interface NeuroCreativeScore {
  /** Score compuesto 0-100 */
  composite: number;
  /** Clasificación cualitativa del creativo */
  tier: 'elite' | 'strong' | 'average' | 'weak';
  /** ROI 1: Atención Visual (peso 30%) — contraste, movimiento, caras, color */
  attentionROI: CognitiveROI;
  /** ROI 2: Carga Emocional (peso 25%) — valencia, intensidad, resonancia */
  emotionROI: CognitiveROI;
  /** ROI 3: Gatillos de Decisión (peso 25%) — CTA, urgencia, prueba social */
  decisionROI: CognitiveROI;
  /** ROI 4: Carga Cognitiva INVERTIDA (peso 20%) — 100 = carga mínima = ideal */
  cognitiveLoadROI: CognitiveROI;
  /** Diferencia vs. benchmark de la industria (puede ser negativo) */
  benchmarkDelta: number;
  /** Recall de marca predicho 0-100 */
  predictedRecall: number;
  /** Estimación de lift en engagement (+X% o -X%) */
  predictedEngagementLift: string;
  /** Insight ejecutivo de 1-2 oraciones para el reporte CxO */
  executiveInsight: string;
  /** Recomendación global de optimización */
  overallRecommendation?: string;
}

export interface ImageAnalysisResult {
  detectedPlatform: string;
  bestPlatformMatch: string;
  designFormat: string;
  scores: {
    google: number;
    meta: number;
    tiktok?: number;
    linkedin?: number;
    pinterest?: number;
    x?: number;
    programmatic: number;
  };
  analysisPoints: { x: number; y: number; relevance: number; label: string; details?: string }[];
  predictiveMetrics?: {
    cognitiveLoad: number;
    cognitiveDemand: number;
    clarityScore: number;
    focusScore: number;
    engagementScore: number;
    recallScore: number;
    contrastScore?: number;
    legibilityScore?: number;
    safeZoneScore?: number;
    benchmarkRanges?: {
      cognitiveLoad: [number, number];
      clarityScore: [number, number];
      focusScore: [number, number];
      engagementScore: [number, number];
      recallScore: [number, number];
      contrastScore?: [number, number];
      legibilityScore?: [number, number];
    };
    scanpath?: { x: number; y: number; label: string; dwellTime: string }[];
  };
  aoiScores?: {
    brand: number;
    cta: number;
    product: number;
  };
  impactScore?: number;
  visualCritique: string;
  complianceIssues: string[];
  creativeSuggestions: string[];
  suggestedSegmentation: string[];
  suggestedCTAs?: string[];
  headlines?: string[];
  captions?: string[];
  descriptions?: string[];
  creativeReferences?: {
    referenceId: string;
    description: string;
    platform: string;
  }[];
  psychologicalHooks?: string[];
  elementAttention?: {
    element: string;
    totalAttention: number;
    timeSpent: number;
    percentageSeen: number;
  }[];
  aiInsights?: {
    title: string;
    description: string;
  };
  justification?: string;
  neuroAnalysis?: string;
  aiRecommendations?: {
    title: string;
    description: string;
  }[];
  marketingObjective?: 'Awareness' | 'Consideration' | 'Conversion' | 'Loyalty';
  improvementPrompt?: string;
  extractedBusinessDna?: {
    brandPersonality: string;
    colorPalette: string[];
    typographyStyle: string;
  };
  overallRating: string;
  growthVerdict?: {
    strengths: string[];
    weaknesses: string[];
    priorityFix: string;
    conversionUpliftPotential: string;
  };
  audienceMatchScore?: number;
  scanpath?: { x: number; y: number; label: string; dwellTime: string }[];
  executiveSummary?: string;
  neuroDiagnosis?: {
    faceBias?: string;
    ruleOfThirds?: string;
    gestaltLaws?: string;
  };
  descriptiveAnalysis?: string;
  croAnalysis?: {
    trafficContext?: {
      source: string;
      deviceMode: string;
    };
    scrollAnalysis?: {
      criticalDropOffPoint: string;
      dropOffReason: string;
      ctaVisibleBeforeDropOff: boolean;
      highAttentionZones: string[];
    };
    interactionFriction?: {
      type: string;
      element: string;
      severity: string;
      uxHypothesis: string;
    }[];
    conversionRoadmap?: {
      priorityFix: string;
      secondaryOptimizations: string[];
      estimatedConversionUplift: string;
    };
  };
  language?: Language;
  dataLakeAlignment?: {
    webScrapeCongruence: string;
    socialScrapeCongruence: string;
    pdfBrandbookAdherence: string;
  };
  brandComplianceStatus?: {
    score: string;
    status: string;
    analysis: string;
    violations: string[];
    recommendations: string[];
  };
  neuroAndFrameworkDiagnosis?: {
    funnelStage: string;
    visualHierarchy: string;
    growthImplication: string;
  };
  hotspots?: {
    type: string;
    element: string;
    impact: string;
  }[];
  safeZoneCompliance?: {
    platform: 'TikTok' | 'Meta' | 'YouTube' | 'Generic';
    isCompliant: boolean;
    violations: string[];
    safeRects?: { x: number; y: number; w: number; h: number; label?: string }[];
  };
  /** Neuro-Creative Score — segmentación cognitiva TRIBE v2-inspired */
  neuroCreativeScore?: NeuroCreativeScore;
}

export interface VideoAnalysisResult {
  platform: string;
  hookStrength: number;
  retentionScore: number;
  narrativeCritique: string;
  visualQualityScore: number;
  audioAnalysis: string;
  conversionTriggers: string[];
  suggestedEdits: string[];
  suggestedSegmentation: string[];
  suggestedCTAs?: string[];
  complianceIssues?: string[];
  overallRating: string;
  scores?: {
    google: number;
    meta: number;
    tiktok?: number;
    linkedin?: number;
    pinterest?: number;
    x?: number;
    programmatic?: number;
  };
  extractedBusinessDna?: {
    brandPersonality: string;
    colorPalette: string[];
    typographyStyle: string;
  };
  language?: Language;
  keyframes?: {
    timestamp: string;
    description: string;
    analysisPoints: { x: number; y: number; label: string; relevance?: number; details?: string }[];
    communicationAnalysis?: string; // Specific communication intel for this frame
    isTopFrame?: boolean; // Identify if it's one of the top 5
    imageUrl?: string; // Base64 of the frame
  }[];
  predictiveMetrics?: {
    avgCognitiveLoad: number;
    avgCognitiveDemand: number;
    clarityScore: number;
    overallFocusScore: number;
    peakAttentionTimestamp: string;
    overallRecallPotential: number;
    scanpath?: { x: number; y: number; label: string; dwellTime: string }[];
  };
  growthVerdict?: {
    strengths: string[];
    weaknesses: string[];
    priorityFix: string;
    conversionUpliftPotential: string;
  };
  audienceMatchScore?: number;
  scanpath?: { x: number; y: number; label: string; dwellTime: string }[];
  executiveSummary?: string;
  descriptiveAnalysis?: string;
  retentionCurve?: {
    second: number;
    retention: number;
    engagementScore?: number;
    clicks?: number;
    conversions?: number;
    abandonRate?: number;
    intentLabel?: string;
  }[];
  dataLakeAlignment?: {
    webScrapeCongruence: string;
    socialScrapeCongruence: string;
    pdfBrandbookAdherence: string;
  };
  brandComplianceStatus?: {
    score: string;
    status: string;
    analysis: string;
    violations: string[];
    recommendations: string[];
  };
  neuroAndFrameworkDiagnosis?: {
    funnelStage: string;
    visualHierarchy: string;
    growthImplication: string;
  };
  hotspots?: {
    type: string;
    element: string;
    impact: string;
    timestamp?: string;
    reason?: string;
  }[];
  neuroDiagnosis?: {
    hookEffectiveness?: string;
    paceAndRhythm?: string;
    emotionalArc?: string;
    gestaltLaws?: string;
    chromaticPsychology?: string;
  };
  /** Neuro-Creative Score — segmentación cognitiva TRIBE v2-inspired */
  neuroCreativeScore?: NeuroCreativeScore;
}

export interface CyberAuditResult {
  vulnerabilityScore: number;
  overallSecurityRating: 'Secure' | 'Warning' | 'Critical';
  detectedThreats: string[];
  remediationPlan: string[];
}

export interface CampaignPerformance {
  campaignName: string;
  clicks: number;
  impressions: number;
  cost: number;
  conversions: number;
  ctr: number;
  cpc: number;
}

export interface AuctionInsight {
  domain: string;
  impressionShare: number;
  avgPosition: number;
  cpc: number;
  outrankingShare?: number;   // % of auctions this competitor outranked you
  overlapRate?: number;       // % of auctions you both appeared in
  topOfPageRate?: number;     // % of times they appeared at top of page
  absTopOfPageRate?: number;  // % of times they held absolute top position
}

/**
 * Representa una cuenta de Google Ads accesible por el usuario.
 */
export interface AdsAccount {
  id: string;
  name: string;
  resourceName: string;
  status: 'active' | 'paused' | 'unknown';
}

/**
 * Datos básicos de sesión de un usuario de Google.
 */
export interface GoogleUser {
  accessToken: string;
  name?: string;
  email?: string;
  picture?: string;
}

export type BlogCategory = 'Marketing' | 'AI' | 'Google Ads' | 'Tutorials' | 'Case Studies';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  authorId: string;
  authorName: string;
  authorPicture?: string;
  publishedAt: number;
  updatedAt: number;
  status: 'draft' | 'published';
  category: BlogCategory;
  tags: string[];
  featuredImage?: string;
  externalLink?: string;
  // SEO & AI Optimization
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  readingTime?: string;
  // Intelligence Metrics
  seoScore?: number; // 0-100
  originalityScore?: number; // 0-100
  intelligenceAudit?: {
    seoCritique: string;
    originalityAnalysis: string;
    lastAuditAt: number;
    topSkillsUsed: string[];
    truthFactor: number; // 0-100
  };
}

export interface UsageHistoryItem {
  id: string;
  timestamp: number;
  taskName: string;
  tokensUsed: number;
  queryType?: 'text' | 'image';
  resourceCost?: number; // Estimated dollar cost
  details?: string;
}


export interface AppNotification {
  id: string;
  userId: string;
  type: string; // 'weekly-insights', 'optimization-tip', 'usage-alert', 'custom'
  title: string;
  message: string;
  imageUrl?: string;
  videoUrl?: string;
  ctaUrl?: string;
  read: boolean;
  createdAt: number;
  campaignId?: string;
}

// Multi-Stage Video Generation
export type VideoSegmentStatus = 'pending' | 'generating' | 'completed' | 'error';
export type VideoTransition = 'cut' | 'crossfade' | 'dissolve';

// Text Overlay Engine
export type TextAnimationType =
  | 'fadeIn'
  | 'slideFromBottom'
  | 'slideFromTop'
  | 'slideFromLeft'
  | 'slideFromRight'
  | 'scaleIn'
  | 'typewriter'
  | 'none';

export type TextExitType = 'fadeOut' | 'slideToBottom' | 'slideToTop' | 'none';

export type TextPosition =
  | 'topLeft' | 'topCenter' | 'topRight'
  | 'middleLeft' | 'center' | 'middleRight'
  | 'bottomLeft' | 'bottomCenter' | 'bottomRight';

// Animation templates for text layers
export type TextAnimationTemplate =
  | 'bounce'
  | 'elastic'
  | 'glitch'
  | 'typewriterCursor'
  | 'wordByWord';

// Keyframe for position/opacity animation over time
export interface TextKeyframe {
  timeSeconds: number;
  position?: TextPosition;
  opacity?: number;
  scale?: number;
  offsetX?: number;
  offsetY?: number;
}

export interface TextLayer {
  id: string;
  text: string;
  /** Absolute seconds from start of composed video */
  startSecond: number;
  durationSeconds: number;
  enterAnimation: TextAnimationType;
  enterDurationSeconds: number;
  exitAnimation: TextExitType;
  exitDurationSeconds: number;
  position: TextPosition;
  /** Fraction of canvas height, e.g. 0.06 = 6% */
  fontSize: number;
  color: string;
  strokeColor?: string;
  fontWeight: 'normal' | 'bold' | '900';
  fontFamily: 'sans-serif' | 'serif' | 'monospace';
  shadow: boolean;
  background: boolean;
  backgroundColor: string;
  // Optional advanced features
  animationTemplate?: TextAnimationTemplate;
  keyframes?: TextKeyframe[];
}

// Image/Logo overlay layer
export interface ImageLayer {
  id: string;
  type: 'image';
  src: string;
  startSecond: number;
  durationSeconds: number;
  position: TextPosition;
  /** Fraction of canvas width, e.g. 0.15 = 15% */
  widthFraction: number;
  opacity: number;
  enterAnimation: 'none' | 'fadeIn' | 'scaleIn';
  exitAnimation: 'none' | 'fadeOut';
}

// Audio/Music layer
export interface AudioLayer {
  id: string;
  type: 'music' | 'voiceover';
  url: string;
  volume: number;
  startSecond: number;
  fadeInSeconds: number;
  fadeOutSeconds: number;
}

// Per-segment editing properties
export interface SegmentEditProps {
  trimStartSeconds: number;
  trimEndSeconds: number;
  playbackSpeed: number;
  brightness: number;
  contrast: number;
  saturation: number;
}

// Transition with configurable duration
export interface SegmentTransition {
  type: VideoTransition;
  durationSeconds: number;
}

export interface VideoSegment {
  id: string;
  index: number;
  prompt: string;
  status: VideoSegmentStatus;
  operationName: string | null;
  videoUrl: string | null;
  thumbnailDataUrl: string | null;
  errorMessage: string | null;
  durationSeconds: number;
  type?: 'video' | 'image';
}

export interface MultiStageVideoState {
  isActive: boolean;
  totalDuration: number;
  segments: VideoSegment[];
  /** Ordered list of segment IDs for composition (supports reordering) */
  segmentOrder: string[];
  currentStageIndex: number;
  isGenerating: boolean;
  isComposing: boolean;
  /** True when Gemini is planning the narrative structure */
  isPlanning?: boolean;
  /** The narrative reasoning behind the segmentation */
  reasoningText?: string;
  composedVideoUrl: string | null;
  storyboardConfirmed: boolean;
  /** True when user is in editing mode after storyboard confirmation */
  isEditing: boolean;
  transition: VideoTransition;
  /** Global transition duration in seconds (default 0.5) */
  transitionDurationSeconds: number;
  error: string | null;
  pollingProgress: { attempt: number; max: number } | null;
  textLayers: TextLayer[];
  imageLayers: ImageLayer[];
  audioLayers: AudioLayer[];
  segmentEditProps: Record<string, SegmentEditProps>;
  aspectRatio: '16:9' | '9:16' | '1:1';
  globalFilter?: string;

  // --- Flow Workspace specific (Pro/Agency) ---
  isFlowActive?: boolean;
  flowPhase?: 'scenario' | 'ingredients' | 'production';
  flowIngredients?: FlowIngredient[];
  /** Global concept or world description that applies to all segments (Google Flow style) */
  globalWorldPrompt?: string;
}

export interface Caption {
  text: string;
  startMs: number;
  endMs: number;
}

// ---------------------------------------------------------------------------
// Creative Flow (Pro/Agency) Types
// ---------------------------------------------------------------------------

export type FlowPhase = 'scenario' | 'ingredients' | 'production';

export interface FlowIngredient {
  id: string;
  url: string;
  type: 'image' | 'video_clip';
  source: 'research_hub' | 'image_lab' | 'generation' | 'upload';
  promptUsed?: string;
  timestamp: number;
  metadata?: any;
}

export interface FlowCameraControl {
  zoom?: number;
  pan?: number;
  tilt?: number;
  motionIntensity: number;
}

// ── WOW Notifications ────────────────────────────────────────────────────────

export type PlatformUpdateType = 'major' | 'feature' | 'fix' | 'ai-upgrade';
export type PlatformUpdateSegment = 'active' | 'trial_active' | 'trial_expired' | 'free';

export interface PlatformUpdate {
  id: string;
  version: string;
  type: PlatformUpdateType;
  title_es: string;
  title_en: string;
  description_es: string;
  description_en: string;
  preview_url?: string;
  feature_tab?: string;
  cta_url?: string;
  published_at: number;
  is_active: boolean;
  created_by: string;
  emails_sent?: number;
  emails_opened?: number;
  reads_count?: number;
}

export interface PlatformUpdateRead {
  id: string;
  user_id: string;
  update_id: string;
  read_at: number;
  source: 'email' | 'modal' | 'panel' | 'toast';
}

export interface ReleaseIntelState {
  updates: PlatformUpdate[];
  unreadCount: number;
  lastViewedUpdateId?: string;
  pendingSpotlight?: PlatformUpdate;
  isLoading: boolean;
}



import { AdsAccount, CampaignPerformance, AuctionInsight } from '../types';
import { logger } from '../utils/logger';
import { adminFetch } from '../utils/apiConfig';


/**
 * Google Ads Service — Client Side
 * ==================================
 * All calls are proxied through the Netlify Function `/api/google-ads`
 * to avoid CORS issues and keep the developer token server-side.
 *
 * For demo mode (accessToken === 'demo_token'), returns simulated data immediately.
 */

const callProxy = async <T>(action: string, payload: Record<string, unknown>): Promise<T> => {
  const response = await adminFetch('/api/google-ads', {
    method: 'POST',
    body: JSON.stringify({ action, ...payload }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` })) as any;
    const error: any = new Error(err?.error || `Proxy error: ${response.status}`);
    error.status = response.status;
    error.details = err?.details || '';
    error.messageExtended = err?.recommendation || err?.message || '';
    error.googleReason = err?.googleReason || '';
    error.type = err?.type || '';
    
    logger.error('[googleAdsService] API Error:', {
      status: error.status,
      error: error.message,
      type: error.type,
      googleReason: error.googleReason,
      details: error.details,
      recommendation: error.messageExtended,
    });
    
    throw error;
  }
  return response.json() as Promise<T>;
};

// ─── Diagnostic ping ───────────────────────────────────────────────────────────
export interface GoogleAdsPingResult {
  httpStatus: number;
  ok: boolean;
  googleStatus: string;
  googleReason: string;
  googleMessage: string | null;
  devTokenConfigured: boolean;
  devTokenLength: number;
  accessTokenPrefix: string;
  apiVersion: string;
  accounts: string[];
}

/**
 * Sends a lightweight diagnostic ping to the Google Ads API.
 * Returns detailed auth metadata to help diagnose 401/403 errors.
 * Does NOT throw — always resolves with a result object.
 */
export const pingGoogleAds = async (accessToken: string): Promise<GoogleAdsPingResult> => {
  try {
    const response = await adminFetch('/api/google-ads', {
      method: 'POST',
      body: JSON.stringify({ action: 'ping', accessToken }),
    });
    const raw = await response.json().catch(() => ({})) as any;
    // Normalize: server may return null for string fields — guard them here
    // so the UI never needs to handle undefined on these fields.
    return {
      httpStatus: raw.httpStatus ?? (response.ok ? 200 : response.status),
      ok: raw.ok ?? response.ok,
      googleStatus: raw.googleStatus ?? '',
      googleReason: raw.googleReason ?? '',
      googleMessage: raw.googleMessage ?? null,
      devTokenConfigured: raw.devTokenConfigured ?? false,
      devTokenLength: raw.devTokenLength ?? 0,
      accessTokenPrefix: raw.accessTokenPrefix ?? '(none)',
      apiVersion: raw.apiVersion ?? '',
      accounts: raw.accounts ?? [],
    } satisfies GoogleAdsPingResult;
  } catch (e: any) {
    return {
      httpStatus: 0,
      ok: false,
      googleStatus: 'NETWORK_ERROR',
      googleReason: e?.message || 'Network request failed',
      googleMessage: null,
      devTokenConfigured: false,
      devTokenLength: 0,
      accessTokenPrefix: '(none)',
      apiVersion: 'unknown',
      accounts: [],
    };
  }
};

const PERIOD_LABEL_MAP: Record<string, string> = {
  'Últimos 30 días': '30d',
  'Last 30 days': '30d',
  'Últimos 90 días': '90d',
  'Last 90 days': '90d',
  'Últimos 12 meses': '12m',
  'Last 12 months': '12m',
  'Año hasta la fecha': '12m',
  'Year to date': '12m',
  'Histórico Completo': '12m',
  'Full History': '12m',
};

const normalizePeriod = (periodLabel: string): string =>
  PERIOD_LABEL_MAP[periodLabel] || '30d';

// ─── List accessible Google Ads accounts ──────────────────────────────────────
export const listAccessibleCustomers = async (accessToken: string): Promise<AdsAccount[]> => {
  if (accessToken === 'demo_token') {
    return [
      { id: '124-556-9901', name: 'Academia Inglés Quito (Simulada)', resourceName: 'customers/1245569901', status: 'active' },
      { id: '908-112-4432', name: 'Global English Guayaquil (Simulada)', resourceName: 'customers/9081124432', status: 'active' },
      { id: '332-901-7785', name: 'Marketing Cuenca Leads', resourceName: 'customers/3329017785', status: 'paused' },
    ];
  }
  try {
    return await callProxy<AdsAccount[]>('listCustomers', { accessToken });
  } catch (error: any) {
    logger.warn('[googleAdsService] listCustomers failed:', error.message);

    // Token expired or revoked → UI must clear session and re-authenticate
    if (error.status === 401 || error.status === 403) {
      const expiredErr: any = new Error(
        'Tu sesión de Google Ads ha expirado. Por favor, vuelve a vincular tu cuenta.'
      );
      expiredErr.type = 'TOKEN_EXPIRED';
      expiredErr.status = error.status;
      throw expiredErr;
    }

    if (error.status === 404 || (error.message ?? '').includes('404')) {
      throw new Error('No se encontraron cuentas o la API de Google Ads está experimentando problemas. Verifica la configuración de tu ID de desarrollador.');
    }

    throw new Error(error.message || 'Error de conexión con Google Ads. Intenta el Modo Demo.');
  }
};

// ─── Get recent campaign performance ──────────────────────────────────────────
export const getRecentCampaignPerformance = async (
  accessToken: string,
  customerId: string,
  periodLabel = 'Últimos 30 días'
): Promise<CampaignPerformance[]> => {
  if (accessToken === 'demo_token' || !customerId) {
    return [
      { campaignName: 'Search - Cursos Inglés Ecuador', clicks: 845, impressions: 12400, cost: 320.50, conversions: 42, ctr: 0.068, cpc: 0.38 },
      { campaignName: 'Performance Max - Global Leads', clicks: 1200, impressions: 45000, cost: 680.00, conversions: 58, ctr: 0.026, cpc: 0.56 },
      { campaignName: 'Remarketing - Quito/GYE', clicks: 120, impressions: 8500, cost: 45.20, conversions: 8, ctr: 0.014, cpc: 0.37 },
    ];
  }
  if (!customerId || customerId.length < 8) {
    throw new Error('Un ID de Cliente de Google Ads válido (ej: 123-456-7890) es requerido.');
  }

  try {
    return await callProxy<CampaignPerformance[]>('getCampaigns', {
      accessToken,
      customerId,
      period: normalizePeriod(periodLabel),
    });
  } catch (error: any) {
    logger.error('[googleAdsService] getRecentCampaignPerformance error:', error.message);
    // Add specific message for common failures
    if ((error.message ?? '').includes('No se encontró la cuenta') || (error.message ?? '').includes('404')) {
      throw new Error(`No se encontró acceso a la cuenta ${customerId}. Verifica tus permisos en Google Ads.`);
    }
    throw error;
  }
};

// ─── Get Auction Insights (competitor domains in Google Ads auctions) ──────────
// FIX: Uses correct `auction_insight` GAQL resource (was `campaign_search_term_insight`)
export const getAuctionInsights = async (
  accessToken: string,
  customerId: string,
  periodLabel = 'Últimos 30 días'
): Promise<AuctionInsight[]> => {
  if (accessToken === 'demo_token' || !customerId) {
    return [
      { domain: 'openenglish.com', impressionShare: 0.52, avgPosition: 1.8, cpc: 0.42, outrankingShare: 0.41, overlapRate: 0.78, topOfPageRate: 0.68, absTopOfPageRate: 0.31 },
      { domain: 'wallstreetenglish.com.ec', impressionShare: 0.38, avgPosition: 2.9, cpc: 0.55, outrankingShare: 0.29, overlapRate: 0.65, topOfPageRate: 0.50, absTopOfPageRate: 0.18 },
      { domain: 'vaughan.ec', impressionShare: 0.22, avgPosition: 3.6, cpc: 0.30, outrankingShare: 0.14, overlapRate: 0.48, topOfPageRate: 0.34, absTopOfPageRate: 0.09 },
      { domain: 'berlitz.com.ec', impressionShare: 0.18, avgPosition: 4.2, cpc: 0.60, outrankingShare: 0.10, overlapRate: 0.37, topOfPageRate: 0.25, absTopOfPageRate: 0.06 },
      { domain: 'angloamerican.edu.ec', impressionShare: 0.12, avgPosition: 5.1, cpc: 0.25, outrankingShare: 0.07, overlapRate: 0.28, topOfPageRate: 0.18, absTopOfPageRate: 0.03 },
    ];
  }
  if (!customerId) return [];

  try {
    return await callProxy<AuctionInsight[]>('getAuctionInsights', {
      accessToken,
      customerId,
      period: normalizePeriod(periodLabel),
    });
  } catch (error: any) {
    logger.error('[googleAdsService] getAuctionInsights error:', error.message);
    return []; // Non-fatal: not all accounts have auction insight data
  }
};

// ─── Get Google Search Console data (own domain only) ─────────────────────────
// Requires the user's accessToken to have `https://www.googleapis.com/auth/webmasters.readonly` scope
export const getSearchConsoleData = async (
  accessToken: string,
  siteUrl: string,
  periodLabel = 'Últimos 90 días'
): Promise<any> => {
  if (accessToken === 'demo_token') {
    return {
      siteUrl: 'https://insitu.company',
      summary: { totalClicks: 1250, totalImpressions: 48000, avgCTR: 2.6, avgPosition: 8.4 },
      topQueries: [
        { query: 'agencia marketing digital ecuador', clicks: 145, impressions: 2800, ctr: 5.2, position: 3.1 },
        { query: 'google ads quito', clicks: 98, impressions: 1950, ctr: 5.0, position: 4.2 },
        { query: 'auditoria google ads', clicks: 72, impressions: 1400, ctr: 5.1, position: 5.8 },
      ],
      topPages: [
        { url: 'https://insitu.company/', clicks: 340, impressions: 8900, ctr: 3.8, position: 6.2 },
        { url: 'https://insitu.company/servicios', clicks: 210, impressions: 5600, ctr: 3.75, position: 7.1 },
      ],
      source: 'Google Search Console API (Demo)',
    };
  }
  try {
    return await callProxy<any>('getSearchConsoleData', {
      accessToken,
      siteUrl,
      period: normalizePeriod(periodLabel),
    });
  } catch (error: any) {
    logger.warn('[googleAdsService] GSC not available:', error.message);
    return null; // Non-fatal: GSC may not be configured
  }
};

// ─── AI Anomaly Detection & Strategic Analysis ───────────────────────────────
export const analyzePerformance = async (
  accessToken: string,
  customerId: string
): Promise<{ analysis: string; timestamp: string }> => {
  if (accessToken === 'demo_token' || !customerId) {
    return {
      analysis: 'En el modo demo, el rendimiento se muestra estable. Sin embargo, en una cuenta real, Claude 3.5 analizaría el impacto de los competidores en tu CPC basándose en el Auction Insight.',
      timestamp: new Date().toISOString()
    };
  }
  
  return await callProxy<{ analysis: string; timestamp: string }>('analyzeAnomalies', {
    accessToken,
    customerId
  });
};

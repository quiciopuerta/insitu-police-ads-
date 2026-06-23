import { fetchWithRetry } from '../utils/fetchWithRetry';
import { logger } from '../utils/logger';


export interface PageSpeedResult {
    url: string;
    performanceScore: number;
    accessibilityScore: number;
    bestPracticesScore: number;
    seoScore: number;
    fcp: string; // First Contentful Paint
    lcp: string; // Largest Contentful Paint
    cls: string; // Cumulative Layout Shift
    speedIndex: string;
    aiRoadmap?: string; // AI-generated technical roadmap
}

// ─── Demo Data ─────────────────────────────────────────────────────────────────
const DEMO_PAGESPEED: Record<string, PageSpeedResult> = {
    desktop: {
        url: 'https://demo-site.com',
        performanceScore: 82,
        accessibilityScore: 91,
        bestPracticesScore: 88,
        seoScore: 95,
        fcp: '1.2 s',
        lcp: '2.4 s',
        cls: '0.08',
        speedIndex: '2.1 s',
    },
    mobile: {
        url: 'https://demo-site.com',
        performanceScore: 64,
        accessibilityScore: 89,
        bestPracticesScore: 85,
        seoScore: 92,
        fcp: '2.8 s',
        lcp: '4.1 s',
        cls: '0.15',
        speedIndex: '3.9 s',
    },
};

export const analyzePageSpeed = async (url: string, strategy: 'desktop' | 'mobile' = 'desktop', isDemo = false): Promise<PageSpeedResult> => {
    // Demo mode — return realistic mock scores
    if (isDemo) {
        return { ...DEMO_PAGESPEED[strategy], url };
    }

    return fetchWithRetry(async () => {
        try {
            // Proxy through the serverless function to protect the VITE_PAGESPEED_API_KEY from leaking into the dist bundle
            const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_API_URL || '';
            const baseUrl = envUrl || ''; // Uses relative path (via netlify.toml redirects) or explicit endpoint
            
            // To be robust, if no explicit API url is set, we assume /api.
            // In Vite, proxy or relative URLs handle /api to point to backend.
            const apiEndpoint = `${baseUrl}/api/pagespeed`;
            
            const apiUrl = `${apiEndpoint}?url=${encodeURIComponent(url)}&strategy=${strategy}`;

            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            if (!data || !data.lighthouseResult) {
                throw new Error('Invalid response from PageSpeed API');
            }

            const lighthouse = data.lighthouseResult;
            const categories = lighthouse.categories;
            const audits = lighthouse.audits;

            return {
                url: url,
                performanceScore: Math.round((categories.performance?.score || 0) * 100),
                accessibilityScore: Math.round((categories.accessibility?.score || 0) * 100),
                bestPracticesScore: Math.round((categories['best-practices']?.score || 0) * 100),
                seoScore: Math.round((categories.seo?.score || 0) * 100),
                fcp: audits['first-contentful-paint']?.displayValue || 'N/A',
                lcp: audits['largest-contentful-paint']?.displayValue || 'N/A',
                cls: audits['cumulative-layout-shift']?.displayValue || 'N/A',
                speedIndex: audits['speed-index']?.displayValue || 'N/A',
                aiRoadmap: data.aiRoadmap,
            };
        } catch (error: any) {
            logger.error('Error fetching PageSpeed Insights:', error);

            const status = error.response?.status;
            let errorMessage = 'Failed to analyze PageSpeed.';

            if (status === 429) {
                errorMessage = 'Google PageSpeed Quota Reached. Using cached data if available, or please try again in a few minutes. (24h cache enabled)';
            } else if (error.response?.data?.error) {
                const apiError = error.response.data.error;
                errorMessage = typeof apiError === 'string' ? apiError : (apiError.message || `API Error: ${status}`);
            } else if (error.message) {
                errorMessage = error.message;
            }

            throw new Error(errorMessage);
        }
    }, { maxRetries: 2, initialDelay: 2000 });
};

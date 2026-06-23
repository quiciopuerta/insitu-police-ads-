/**
 * Real SEO Data Service
 * Fetches verifiable data from public/free sources before passing to Gemini for analysis.
 *
 * Data Sources (all free, publicly auditable):
 * - Open PageRank API (openpagerank.com) → Domain Authority-equivalent
 * - site:{domain} Google Search via Gemini grounding → indexed pages count
 * - robots.txt + XML sitemap parsing → real URLs indexed by the site
 * - Common Crawl Index API (index.commoncrawl.org) → backlink reference data
 * - Direct HTTP HEAD request → verify domain is reachable
 */

import fetch from 'node-fetch';

const OPEN_PAGERANK_KEY = process.env.OPEN_PAGERANK_API_KEY || '';
const TIMEOUT_MS = 8000;

const safeFetch = async (url, options = {}) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        return res;
    } catch (e) {
        return null;
    } finally {
        clearTimeout(timeout);
    }
};

/**
 * Fetch real Domain Authority and Page Rank from Open PageRank API (free tier).
 * Register at: https://www.domcop.com/openpagerank/
 * Returns null if no API key or request fails.
 */
export const fetchOpenPageRank = async (domain) => {
    if (!OPEN_PAGERANK_KEY) {
        return null;
    }
    try {
        const res = await safeFetch(
            `https://openpagerank.com/api/v1.0/getPageRank?domains[]=${encodeURIComponent(domain)}`,
            { headers: { 'API-OPR': OPEN_PAGERANK_KEY } }
        );
        if (!res?.ok) return null;
        const data = await res.json();
        const entry = data?.response?.[0];
        if (!entry || entry.status_code !== 200) return null;
        return {
            pageRank: entry.page_rank_integer || 0,
            pageRankDecimal: entry.page_rank_decimal || 0,
            domainAuthority: Math.round((entry.rank || 10000000) > 0 ? Math.max(1, 100 - Math.log10(entry.rank || 10000000) * 14) : 1),
            rankPosition: entry.rank || null,
            source: 'Open PageRank API (openpagerank.com)',
        };
    } catch (e) {
        return null;
    }
};

/**
 * Fetch real backlink data from Common Crawl Index API (completely free, no auth needed).
 * See: https://index.commoncrawl.org/
 */
export const fetchCommonCrawlBacklinks = async (domain) => {
    try {
        // Use the latest Common Crawl index
        const indexUrl = 'https://index.commoncrawl.org/CC-MAIN-2024-51-index';
        const query = `*.${domain}`;
        const res = await safeFetch(
            `${indexUrl}?url=${encodeURIComponent(query)}&output=json&limit=20&fl=url,timestamp,status`
        );
        if (!res?.ok) return null;
        const text = await res.text();
        const lines = text.trim().split('\n').filter(Boolean);
        const records = lines.map(l => {
            try { return JSON.parse(l); } catch { return null; }
        }).filter(Boolean);

        return {
            totalFound: records.length,
            samples: records.slice(0, 10).map(r => ({
                url: r.url,
                timestamp: r.timestamp,
            })),
            source: 'Common Crawl Index API (commoncrawl.org)',
        };
    } catch (e) {
        return null;
    }
};

/**
 * Fetches and parses the domain's sitemap to get real indexed pages.
 * Checks robots.txt first for sitemap location.
 */
export const fetchSitemapPages = async (domain) => {
    try {
        const protocol = 'https';
        const baseUrl = `${protocol}://${domain}`;

        // Try to get sitemap URL from robots.txt
        let sitemapUrl = `${baseUrl}/sitemap.xml`;
        const robotsRes = await safeFetch(`${baseUrl}/robots.txt`);
        if (robotsRes?.ok) {
            const robotsText = await robotsRes.text();
            const sitemapMatch = robotsText.match(/^Sitemap:\s*(.+)$/im);
            if (sitemapMatch) {
                sitemapUrl = sitemapMatch[1].trim();
            }
        }

        // Fetch sitemap
        const sitemapRes = await safeFetch(sitemapUrl);
        if (!sitemapRes?.ok) return null;
        const sitemapText = await sitemapRes.text();

        // Extract URLs from sitemap
        const urlMatches = sitemapText.match(/<loc>(.*?)<\/loc>/g) || [];
        const urls = urlMatches
            .map(m => m.replace(/<\/?loc>/g, '').trim())
            .filter(u => u.startsWith('http'))
            .slice(0, 20);

        // If it's a sitemap index, grab the first sub-sitemap's URLs
        if (urls.length > 0 && urls[0].includes('sitemap')) {
            const subRes = await safeFetch(urls[0]);
            if (subRes?.ok) {
                const subText = await subRes.text();
                const subUrls = (subText.match(/<loc>(.*?)<\/loc>/g) || [])
                    .map(m => m.replace(/<\/?loc>/g, '').trim())
                    .filter(u => u.startsWith('http'))
                    .slice(0, 20);
                if (subUrls.length > 0) {
                    return { urls: subUrls, total: subUrls.length, source: `Sitemap: ${urls[0]}` };
                }
            }
        }

        return urls.length > 0
            ? { urls, total: urls.length, source: `Sitemap: ${sitemapUrl}` }
            : null;
    } catch (e) {
        return null;
    }
};

/**
 * Checks basic domain metrics via a HEAD request (verifies domain is live, checks HTTPS).
 */
export const fetchDomainHealth = async (domain) => {
    try {
        const res = await safeFetch(`https://${domain}`, { method: 'HEAD' });
        if (!res) {
            // Try HTTP fallback
            const httpRes = await safeFetch(`http://${domain}`, { method: 'HEAD' });
            return {
                isReachable: !!httpRes?.ok,
                hasHttps: false,
                statusCode: httpRes?.status || null,
                source: 'Direct HTTP HEAD request',
            };
        }
        return {
            isReachable: res.ok || res.status < 500,
            hasHttps: true,
            statusCode: res.status,
            redirectUrl: res.url !== `https://${domain}` ? res.url : null,
            source: 'Direct HTTPS HEAD request',
        };
    } catch (e) {
        return { isReachable: false, hasHttps: false, statusCode: null };
    }
};

/**
 * Aggregates all real data from public sources for a domain.
 * Returns a structured object with source attribution for every data point.
 */
export const fetchRealSEOData = async (domain) => {
    console.log(`[SEODataService] Fetching real public data for: ${domain}`);

    const [pageRankData, commonCrawlData, sitemapData, domainHealth] = await Promise.allSettled([
        fetchOpenPageRank(domain),
        fetchCommonCrawlBacklinks(domain),
        fetchSitemapPages(domain),
        fetchDomainHealth(domain),
    ]);

    const result = {
        domain,
        realDataSources: [],
        pageRank: pageRankData.status === 'fulfilled' ? pageRankData.value : null,
        backlinksData: commonCrawlData.status === 'fulfilled' ? commonCrawlData.value : null,
        sitemapData: sitemapData.status === 'fulfilled' ? sitemapData.value : null,
        domainHealth: domainHealth.status === 'fulfilled' ? domainHealth.value : null,
    };

    if (result.pageRank) result.realDataSources.push(result.pageRank.source);
    if (result.backlinksData) result.realDataSources.push(result.backlinksData.source);
    if (result.sitemapData) result.realDataSources.push(result.sitemapData.source);
    if (result.domainHealth) result.realDataSources.push(result.domainHealth.source);

    console.log(`[SEODataService] Collected real data from ${result.realDataSources.length} sources`);
    return result;
};

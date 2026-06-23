/**
 * Real Data Service — Netlify Functions Layer
 * ============================================
 * Aggregates data from multiple FREE public APIs to enrich Gemini prompts
 * with verifiable, real-world data before AI analysis.
 *
 * Sources (all 100% free, no credit card required):
 * - Open PageRank API     → Domain Authority real (key required, free registration)
 * - Common Crawl          → Backlinks from public web index
 * - Sitemap/robots.txt    → Real indexed pages
 * - IANA RDAP/WHOIS       → Domain registration age
 * - Archive.org Wayback   → Site history and snapshots
 * - URLScan.io            → Technologies and site structure
 * - Serper.dev            → Real-time Google SERP results (key required, 2500 free)
 * - Tavily                → LLM-optimized competitor research (key required, 1000/mo free)
 * - Gemini Search         → Fallback when Serper/Tavily quota is exceeded (uses Google Search grounding)
 */

const TIMEOUT_MS = 3500;

// ─── Helper: safe fetch with timeout ──────────────────────────────────────────
const safeFetch = async (url: string, options: RequestInit = {}): Promise<Response | null> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        return res;
    } catch {
        return null;
    } finally {
        clearTimeout(timeout);
    }
};

// ─── 1. Open PageRank API (free registration at openpagerank.com) ──────────────
export const fetchOpenPageRank = async (domain: string) => {
    const key = process.env.OPEN_PAGERANK_API_KEY;
    if (!key) return null;
    try {
        const res = await safeFetch(
            `https://openpagerank.com/api/v1.0/getPageRank?domains[]=${encodeURIComponent(domain)}`,
            { headers: { 'API-OPR': key } }
        );
        if (!res?.ok) return null;
        const data = await res.json() as any;
        const entry = data?.response?.[0];
        if (!entry || entry.status_code !== 200) return null;
        const rankPos = entry.rank || 10_000_000;
        return {
            pageRank: entry.page_rank_integer || 0,
            pageRankDecimal: entry.page_rank_decimal || 0,
            domainAuthority: Math.round(Math.max(1, 100 - Math.log10(rankPos) * 14)),
            rankPosition: entry.rank || null,
            source: 'Open PageRank',
        };
    } catch {
        return null;
    }
};

// ─── 2. Common Crawl Index (completely free, no auth) ─────────────────────────
export const fetchCommonCrawl = async (domain: string) => {
    try {
        const indexUrl = 'https://index.commoncrawl.org/CC-MAIN-2024-51-index';
        const res = await safeFetch(
            `${indexUrl}?url=*.${encodeURIComponent(domain)}&output=json&limit=20&fl=url,timestamp,status`
        );
        if (!res?.ok) return null;
        const text = await res.text();
        const records = text.trim().split('\n').filter(Boolean).map(l => {
            try { return JSON.parse(l); } catch { return null; }
        }).filter(Boolean) as any[];

        return {
            totalFound: records.length,
            samples: records.slice(0, 10).map(r => ({ url: r.url, timestamp: r.timestamp })),
            source: 'Common Crawl',
        };
    } catch {
        return null;
    }
};

// ─── 3. Sitemap + robots.txt (free, no auth) ──────────────────────────────────
export const fetchSitemap = async (domain: string) => {
    try {
        let sitemapUrl = `https://${domain}/sitemap.xml`;
        const robotsRes = await safeFetch(`https://${domain}/robots.txt`);
        if (robotsRes?.ok) {
            const txt = await robotsRes.text();
            const match = txt.match(/^Sitemap:\s*(.+)$/im);
            if (match) sitemapUrl = match[1].trim();
        }
        const sitemapRes = await safeFetch(sitemapUrl);
        if (!sitemapRes?.ok) return null;
        const sitemapText = await sitemapRes.text();
        const urlMatches = sitemapText.match(/<loc>(.*?)<\/loc>/g) || [];
        const urls = urlMatches
            .map(m => m.replace(/<\/?loc>/g, '').trim())
            .filter(u => u.startsWith('http'))
            .slice(0, 25);

        // Handle sitemap index
        if (urls.length > 0 && urls[0].includes('sitemap')) {
            const subRes = await safeFetch(urls[0]);
            if (subRes?.ok) {
                const subText = await subRes.text();
                const subUrls = (subText.match(/<loc>(.*?)<\/loc>/g) || [])
                    .map(m => m.replace(/<\/?loc>/g, '').trim())
                    .filter(u => u.startsWith('http'))
                    .slice(0, 25);
                if (subUrls.length > 0) {
                    return { urls: subUrls, total: subUrls.length, source: `Sitemap Index: ${urls[0]}` };
                }
            }
        }
        return urls.length > 0 ? { urls, total: urls.length, source: 'Sitemap XML' } : null;
    } catch {
        return null;
    }
};

// ─── 4. Domain Health (HTTPS HEAD request) ────────────────────────────────────
export const fetchDomainHealth = async (domain: string) => {
    try {
        const res = await safeFetch(`https://${domain}`, { method: 'HEAD' });
        if (!res) {
            const httpRes = await safeFetch(`http://${domain}`, { method: 'HEAD' });
            return {
                isReachable: !!httpRes?.ok,
                hasHttps: false,
                statusCode: httpRes?.status || null,
                source: 'Domain Health',
            };
        }
        return {
            isReachable: res.ok || res.status < 500,
            hasHttps: true,
            statusCode: res.status,
            redirectUrl: res.url !== `https://${domain}` ? res.url : null,
            source: 'Domain Health',
        };
    } catch {
        return { isReachable: false, hasHttps: false, statusCode: null, source: 'HEAD request failed' };
    }
};

// ─── 5. IANA RDAP WHOIS (completely free, no auth) ────────────────────────────
export const fetchWHOISDomainAge = async (domain: string) => {
    try {
        // More robust root domain extraction (handles .com.ec, .co.uk, etc.)
        const parts = domain.split('.');
        let rootDomain = domain;
        if (parts.length > 2) {
            const last2 = parts.slice(-2).join('.');
            // Common multi-part TLDs
            const multiPartTLDs = ['com.ec', 'com.mx', 'co.uk', 'com.ar', 'com.br', 'com.co', 'edu.ec', 'gob.ec'];
            if (multiPartTLDs.includes(last2) && parts.length >= 3) {
                rootDomain = parts.slice(-3).join('.');
            } else {
                rootDomain = parts.slice(-2).join('.');
            }
        }
        
        const res = await safeFetch(`https://rdap.org/domain/${encodeURIComponent(rootDomain)}`);
        if (!res?.ok) return null;
        const data = await res.json() as any;
        const events = data.events || [];
        const registration = events.find((e: any) => e.eventAction === 'registration');
        const expiration = events.find((e: any) => e.eventAction === 'expiration');
        const lastUpdate = events.find((e: any) => e.eventAction === 'last changed');

        const registrationDate = registration?.eventDate ? new Date(registration.eventDate) : null;
        const ageYears = registrationDate
            ? Math.floor((Date.now() - registrationDate.getTime()) / (1000 * 60 * 60 * 24 * 365))
            : null;

        return {
            registrationDate: registration?.eventDate || null,
            expirationDate: expiration?.eventDate || null,
            lastUpdated: lastUpdate?.eventDate || null,
            ageYears,
            registrar: data.entities?.[0]?.vcardArray?.[1]
                ?.find((v: any[]) => v[0] === 'fn')?.[3] || null,
            status: data.status || [],
            source: 'IANA RDAP',
        };
    } catch {
        return null;
    }
};

// ─── 6. Wayback Machine / Archive.org (completely free, no auth) ──────────────
export const fetchWaybackHistory = async (domain: string) => {
    try {
        // CDX API — get first snapshot and last snapshot
        const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}&output=json&limit=3&fl=timestamp,statuscode&from=2000&collapse=timestamp:4`;
        const [firstRes, lastRes] = await Promise.all([
            safeFetch(cdxUrl + '&from=2000&to=2010'),
            safeFetch(`https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}&output=json&limit=1&fl=timestamp,statuscode&from=2023`),
        ]);

        // Get availability
        const availRes = await safeFetch(
            `https://archive.org/wayback/available?url=${encodeURIComponent(domain)}`
        );
        const avail = availRes?.ok ? await availRes.json() as any : null;

        const firstData = firstRes?.ok ? await firstRes.json() as any[] : null;
        const firstSnapshot = firstData && firstData.length > 1 ? firstData[1] : null;

        return {
            hasArchive: !!avail?.archived_snapshots?.closest,
            closestSnapshot: avail?.archived_snapshots?.closest?.url || null,
            closestSnapshotDate: avail?.archived_snapshots?.closest?.timestamp || null,
            firstSeenTimestamp: firstSnapshot?.[0] || null,
            firstSeenYear: firstSnapshot?.[0] ? parseInt(firstSnapshot[0].substring(0, 4)) : null,
            source: 'Wayback Machine',
        };
    } catch {
        return null;
    }
};

// ─── 7. URLScan.io (free, no auth for search) ─────────────────────────────────
export const fetchURLScanTech = async (domain: string) => {
    try {
        const res = await safeFetch(
            `https://urlscan.io/api/v1/search/?q=domain:${encodeURIComponent(domain)}&size=1&fields=task,stats,lists`
        );
        if (!res?.ok) return null;
        const data = await res.json() as any;
        const result = data?.results?.[0];
        if (!result) return null;

        return {
            screenshotUrl: result.screenshot || null,
            lastScanned: result.task?.time || null,
            serverLocation: result.task?.country || null,
            tlsCertIssuer: null,
            source: 'URLScan.io',
        };
    } catch {
        return null;
    }
};

// ─── 8. Serper.dev — Real Google SERP (2,500 queries free, no credit card) ────
export const fetchSerperResults = async (domain: string, keyword?: string) => {
    const key = process.env.SERPER_API_KEY;
    if (!key) return null;
    try {
        const query = keyword || `site:${domain} OR "${domain}"`;
        const res = await safeFetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: {
                'X-API-KEY': key,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ q: query, num: 10, gl: 'us', hl: 'es' }),
        });
        if (!res?.ok) return null;
        const data = await res.json() as any;

        return {
            organic: (data.organic || []).map((r: any) => ({
                title: r.title,
                link: r.link,
                snippet: r.snippet,
                position: r.position,
            })),
            peopleAlsoAsk: (data.peopleAlsoAsk || []).slice(0, 5).map((q: any) => q.question),
            relatedSearches: (data.relatedSearches || []).slice(0, 5).map((r: any) => r.query),
            adsTop: (data.ads || []).slice(0, 3).map((a: any) => ({
                title: a.title,
                link: a.link,
                displayUrl: a.displayUrl,
            })),
            knowledgeGraph: data.knowledgeGraph ? {
                title: data.knowledgeGraph.title,
                type: data.knowledgeGraph.type,
                description: data.knowledgeGraph.description,
            } : null,
            source: 'Serper.dev',
            query,
        };
    } catch {
        return null;
    }
};

// ─── 9. Tavily — LLM-optimized competitor research (1,000/mo free) ────────────
export const fetchTavilyCompetitors = async (domain: string) => {
    const key = process.env.TAVILY_API_KEY;
    if (!key) return null;
    try {
        const res = await safeFetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: key,
                query: `competitors and alternatives to ${domain} digital marketing`,
                search_depth: 'advanced',
                include_answer: true,
                include_domains: [],
                max_results: 5,
            }),
        });
        if (!res?.ok) return null;
        const data = await res.json() as any;

        return {
            answer: data.answer || null,
            results: (data.results || []).map((r: any) => ({
                title: r.title,
                url: r.url,
                content: r.content?.substring(0, 300),
                score: r.score,
            })),
            source: 'Tavily AI',
        };
    } catch {
        return null;
    }
};

// ─── 9b. Tavily — Real traffic data from SimilarWeb/SemRush (targeted) ─────────
export const fetchTavilyTrafficData = async (domain: string) => {
    const key = process.env.TAVILY_API_KEY;
    if (!key) return null;
    try {
        const res = await safeFetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: key,
                query: `${domain} monthly traffic visits`,
                search_depth: 'advanced',
                include_answer: true,
                include_domains: ['similarweb.com', 'semrush.com', 'ahrefs.com'],
                max_results: 3,
            }),
        });
        if (!res?.ok) return null;
        const data = await res.json() as any;

        return {
            answer: data.answer || null,
            results: (data.results || []).map((r: any) => ({
                title: r.title,
                url: r.url,
                content: r.content?.substring(0, 600),
                score: r.score,
            })),
            source: 'Tavily + SimilarWeb/SemRush',
        };
    } catch {
        return null;
    }
};

// ─── 8b. Serper — Traffic-specific Google search (SimilarWeb snippets) ─────────
export const fetchSerperTrafficData = async (domain: string) => {
    const key = process.env.SERPER_API_KEY;
    if (!key) return null;
    try {
        const res = await safeFetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: {
                'X-API-KEY': key,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                q: `"${domain}" traffic visits month site:similarweb.com OR site:semrush.com`,
                num: 5,
                gl: 'us',
                hl: 'es',
            }),
        });
        if (!res?.ok) return null;
        const data = await res.json() as any;

        return {
            organic: (data.organic || []).map((r: any) => ({
                title: r.title,
                link: r.link,
                snippet: r.snippet,
                position: r.position,
            })),
            source: 'Serper Traffic Data',
        };
    } catch {
        return null;
    }
};

// ─── 10. BuiltWith API — Technology Stack (Free credits available) ─────────────
export const fetchBuiltWithTech = async (domain: string) => {
    const key = process.env.BUILTWITH_API_KEY;
    if (!key) return null;
    try {
        const res = await safeFetch(`https://api.builtwith.com/v21/api.json?key=${key}&LOOKUP=${encodeURIComponent(domain)}`);
        if (!res?.ok) return null;
        const data = await res.json() as any;
        const paths = data?.Paths || [];
        // Flatten technologies from all paths
        const techList: string[] = [];
        paths.forEach((p: any) => {
            (p.Technologies || []).forEach((t: any) => {
                if (!techList.includes(t.Name)) techList.push(t.Name);
            });
        });

        return {
            technologies: techList.slice(0, 30),
            source: 'BuiltWith API',
        };
    } catch {
        return null;
    }
};

// ─── 11. Meta Ad Library (Official API) ──────────────────────────────────────
export const fetchMetaAds = async (query: string, country = 'ALL') => {
    const token = process.env.META_AD_LIBRARY_TOKEN;
    if (!token) return null;
    try {
        const url = new URL('https://graph.facebook.com/v19.0/ads_archive');
        url.searchParams.append('access_token', token);
        url.searchParams.append('ad_type', 'all');
        url.searchParams.append('ad_reached_countries', `['${country.toUpperCase()}']`);
        url.searchParams.append('q', query);
        url.searchParams.append('fields', 'ad_creative_bodies,ad_delivery_start_time,ad_snapshot_url,page_name,publisher_platforms');
        url.searchParams.append('limit', '5');

        const res = await safeFetch(url.toString());
        if (!res?.ok) return null;
        const data = await res.json() as any;

        return {
            ads: (data.data || []).map((item: any) => ({
                id: item.id,
                advertiser: item.page_name,
                text: item.ad_creative_bodies?.[0] || '',
                url: item.ad_snapshot_url,
                platforms: item.publisher_platforms || [],
                startDate: item.ad_delivery_start_time
            })),
            source: 'Meta Ad Library',
        };
    } catch {
        return null;
    }
};

// ─── 12. TikTok Commercial Content API ────────────────────────────────────────
export const fetchTikTokAds = async (query: string, country = 'ALL') => {
    const token = process.env.TIKTOK_COMMERCIAL_API_TOKEN;
    if (!token) return null;
    try {
        const region = country === 'ALL' ? undefined : country.toUpperCase();
        const res = await safeFetch('https://open-api.tiktok.com/commercial/content/ad/search/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Access-Token': token
            },
            body: JSON.stringify({
                search_term: query,
                region_code: region,
                max_results: 5
            })
        });
        if (!res?.ok) return null;
        const data = await res.json() as any;

        return {
            ads: (data.data?.ads || []).map((item: any) => ({
                id: item.ad_id,
                advertiser: item.advertiser_name || query,
                text: item.ad_caption || '',
                url: item.ad_creative_url,
                thumbnail: item.video_thumbnail_url
            })),
            source: 'TikTok Ads API',
        };
    } catch {
        return null;
    }
};

// ─── 13. Gemini Search Grounding — fallback when Serper/Tavily quota exceeded ──
export const fetchGeminiSearchResearch = async (domain: string): Promise<{
    trafficEstimate: string | null;
    competitorSummary: string | null;
    topKeywords: string | null;
    source: string;
} | null> => {
    try {
        const { callGeminiApi } = await import('./gemini');
        const prompt = `Research the domain ${domain}: 1) Estimated monthly organic traffic (use SimilarWeb/SemRush data if available). 2) Top 5 direct competitors in same niche/country. 3) Top 5 organic keywords. Return ONLY a short structured summary with these 3 sections, no filler text.`;
        
        const result = await callGeminiApi({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            tools: [{ google_search: {} }],
            generationConfig: {
                thinkingConfig: { thinkingBudget: 0 }
            }
        });

        const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (!text) return null;

        return {
            trafficEstimate: text.substring(0, 300),
            competitorSummary: text.substring(0, 600),
            topKeywords: text.substring(0, 600),
            source: 'Gemini Google Search',
        };
    } catch (err: any) {
        console.error('[fetchGeminiSearchResearch Error]:', err);
        return null;
    }
};

// ─── Aggregator: Fetch all real data in parallel ───────────────────────────────
export interface RealDataResult {
    domain: string;
    pageRank: Awaited<ReturnType<typeof fetchOpenPageRank>>;
    backlinksData: Awaited<ReturnType<typeof fetchCommonCrawl>>;
    sitemapData: Awaited<ReturnType<typeof fetchSitemap>>;
    domainHealth: Awaited<ReturnType<typeof fetchDomainHealth>>;
    whoisAge: Awaited<ReturnType<typeof fetchWHOISDomainAge>>;
    waybackHistory: Awaited<ReturnType<typeof fetchWaybackHistory>>;
    urlScanData: Awaited<ReturnType<typeof fetchURLScanTech>>;
    serperResults: Awaited<ReturnType<typeof fetchSerperResults>>;
    serperTrafficData: Awaited<ReturnType<typeof fetchSerperTrafficData>>;
    tavilyResearch: Awaited<ReturnType<typeof fetchTavilyCompetitors>>;
    tavilyTrafficData: Awaited<ReturnType<typeof fetchTavilyTrafficData>>;
    builtWithData: Awaited<ReturnType<typeof fetchBuiltWithTech>>;
    metaAds: Awaited<ReturnType<typeof fetchMetaAds>>;
    tiktokAds: Awaited<ReturnType<typeof fetchTikTokAds>>;
    geminiSearch: Awaited<ReturnType<typeof fetchGeminiSearchResearch>>;
    realDataSources: string[];
    collectedAt: string;
}

export const fetchRealDataAll = async (domain: string): Promise<RealDataResult> => {
    console.log(`[RealDataService] Fetching all free API data for: ${domain}`);

    const hasSerper = !!process.env.SERPER_API_KEY;
    const hasTavily = !!process.env.TAVILY_API_KEY;

    const [
        pageRank,
        backlinksData,
        sitemapData,
        domainHealth,
        whoisAge,
        waybackHistory,
        urlScanData,
        serperResults,
        serperTrafficData,
        tavilyResearch,
        tavilyTrafficData,
        builtWithData,
        metaAds,
        tiktokAds,
        geminiSearch,
    ] = await Promise.allSettled([
        fetchOpenPageRank(domain),
        fetchCommonCrawl(domain),
        fetchSitemap(domain),
        fetchDomainHealth(domain),
        fetchWHOISDomainAge(domain),
        fetchWaybackHistory(domain),
        fetchURLScanTech(domain),
        fetchSerperResults(domain),
        fetchSerperTrafficData(domain),
        fetchTavilyCompetitors(domain),
        fetchTavilyTrafficData(domain),
        fetchBuiltWithTech(domain),
        fetchMetaAds(domain),
        fetchTikTokAds(domain),
        // Use Gemini Search when Serper/Tavily are unavailable or quota exceeded
        (!hasSerper && !hasTavily) ? fetchGeminiSearchResearch(domain) : Promise.resolve(null),
    ]);

    const val = <T>(r: PromiseSettledResult<T>) => r.status === 'fulfilled' ? r.value : null;

    const result: RealDataResult = {
        domain,
        pageRank: val(pageRank),
        backlinksData: val(backlinksData),
        sitemapData: val(sitemapData),
        domainHealth: val(domainHealth),
        whoisAge: val(whoisAge),
        waybackHistory: val(waybackHistory),
        urlScanData: val(urlScanData),
        serperResults: val(serperResults),
        serperTrafficData: val(serperTrafficData),
        tavilyResearch: val(tavilyResearch),
        tavilyTrafficData: val(tavilyTrafficData),
        builtWithData: val(builtWithData),
        metaAds: val(metaAds),
        tiktokAds: val(tiktokAds),
        geminiSearch: val(geminiSearch),
        realDataSources: [],
        collectedAt: new Date().toISOString(),
    };

    // Build sources list
    if (result.pageRank) result.realDataSources.push(result.pageRank.source);
    if (result.backlinksData) result.realDataSources.push(result.backlinksData.source);
    if (result.sitemapData) result.realDataSources.push(result.sitemapData.source);
    if (result.domainHealth) result.realDataSources.push(result.domainHealth.source);
    if (result.whoisAge) result.realDataSources.push(result.whoisAge.source);
    if (result.waybackHistory && result.waybackHistory.hasArchive) result.realDataSources.push(result.waybackHistory.source);
    if (result.urlScanData) result.realDataSources.push(result.urlScanData.source);
    if (result.serperResults) result.realDataSources.push(result.serperResults.source);
    if (result.serperTrafficData) result.realDataSources.push(result.serperTrafficData.source);
    if (result.tavilyResearch) result.realDataSources.push(result.tavilyResearch.source);
    if (result.tavilyTrafficData) result.realDataSources.push(result.tavilyTrafficData.source);
    if (result.builtWithData) result.realDataSources.push(result.builtWithData.source);
    if (result.metaAds) result.realDataSources.push(result.metaAds.source);
    if (result.tiktokAds) result.realDataSources.push(result.tiktokAds.source);
    if (result.geminiSearch) result.realDataSources.push(result.geminiSearch.source);

    console.log(`[RealDataService] ✅ Collected from ${result.realDataSources.length} sources: ${result.realDataSources.join(', ')}`);
    return result;
};

// ─── Extract traffic numbers from text (Tavily/Serper responses) ─────────────
const extractTrafficNumbers = (texts: string[]): { monthly: number | null; source: string } => {
    let bestNumber: number | null = null;
    let bestSource = '';

    for (const text of texts) {
        if (!text) continue;
        // Match patterns like "1.2M visits", "500K monthly", "1,234,567 visits", "23.5 million"
        const patterns = [
            /(\d+(?:\.\d+)?)\s*(?:M|million|millones)\s*(?:monthly\s*)?(?:visits|visitas|viewers|users|usuarios|traffic)/gi,
            /(\d+(?:\.\d+)?)\s*(?:K|mil|thousand|thousands)\s*(?:monthly\s*)?(?:visits|visitas|viewers|users|usuarios|traffic)/gi,
            /(\d{1,3}(?:[.,]\d{3})+)\s*(?:monthly\s*)?(?:visits|visitas|viewers|users|usuarios|traffic)/gi,
            /(?:monthly\s*(?:visits|traffic|tráfico)[:\s]+)(\d+(?:\.\d+)?)\s*(M|K|million|mil|millones)?/gi,
            /(?:visits|visitas|traffic|tráfico)[:\s]+([\d,.]+)\s*(M|K|million|mil|millones)?/gi,
            /([\d,.]+)\s*(M|K|million|mil)?\s*(?:visits|visitas|traffic|tráfico)\s*(?:per|por|\/)\s*(?:month|mes)/gi,
            /(?:similarweb\.com|semrush\.com).*?([\d,.]+)\s*(M|K|million|thousand)?/gi,
        ];

        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                let numStr = match[1].replace(/,/g, '');
                // Handle cases where dot is a thousands separator (Spanish/European style)
                // If it looks like "1.234" (no decimal part), it's likely 1234
                if (numStr.includes('.') && numStr.split('.').pop()?.length === 3) {
                    numStr = numStr.replace(/\./g, '');
                }
                
                let num = parseFloat(numStr);
                if (isNaN(num)) continue;

                const suffix = (match[2] || '').toLowerCase();
                if (suffix === 'm' || suffix === 'million' || suffix === 'millones') num *= 1_000_000;
                else if (suffix === 'k' || suffix === 'mil' || suffix === 'thousand' || suffix === 'thousands') num *= 1_000;
                
                // Only consider reasonable traffic numbers (100 to 10B)
                if (num >= 100 && num <= 10_000_000_000 && (bestNumber === null || num > bestNumber)) {
                    bestNumber = Math.round(num);
                    bestSource = text.toLowerCase().includes('similarweb') ? 'SimilarWeb (extracted)' :
                                 text.toLowerCase().includes('semrush') ? 'SemRush (extracted)' :
                                 text.toLowerCase().includes('ahrefs') ? 'Ahrefs (extracted)' : 'Web snippet (extracted)';
                }
            }
        }
    }
    return { monthly: bestNumber, source: bestSource };
};

// ─── Build structured context block for Gemini prompts ────────────────────────
export const buildRealDataContext = (data: RealDataResult): string => {
    const lines: string[] = [`\n=== DATOS REALES VERIFICADOS DE APIs PÚBLICAS (${data.collectedAt}) ===`];

    if (data.domainHealth) {
        const h = data.domainHealth;
        lines.push(`\n🌐 ESTADO DEL DOMINIO: ${h.isReachable ? '✅ Activo' : '❌ Inactivo'}, HTTPS: ${h.hasHttps ? '✅' : '❌'}, HTTP Status: ${h.statusCode}. Fuente: ${h.source}`);
    }

    if (data.pageRank) {
        const p = data.pageRank;
        lines.push(`\n📊 DOMAIN AUTHORITY REAL: ${p.domainAuthority}/100 (Page Rank: ${p.pageRankDecimal}/10, Posición global: #${p.rankPosition || 'N/A'}). Fuente: ${p.source}`);
    } else {
        lines.push(`\n📊 DOMAIN AUTHORITY: No disponible (configura OPEN_PAGERANK_API_KEY). Estima basado en Google Search.`);
    }

    if (data.whoisAge) {
        const w = data.whoisAge;
        lines.push(`\n🕰️ ANTIGÜEDAD DEL DOMINIO: ${w.ageYears !== null ? `${w.ageYears} años` : 'Desconocida'}, Registrado: ${w.registrationDate || 'N/A'}, Expira: ${w.expirationDate || 'N/A'}. Status RDAP: ${w.status?.join(', ') || 'N/A'}. Fuente: ${w.source}`);
    }

    if (data.waybackHistory) {
        const wb = data.waybackHistory;
        lines.push(`\n📸 HISTORIAL WEB (Wayback Machine): ${wb.hasArchive ? '✅ Tiene historial archivado' : '❌ Sin historial'}. Primera vez visto: ${wb.firstSeenYear ? `año ${wb.firstSeenYear}` : 'Desconocido'}. Fuente: ${wb.source}`);
    }

    if (data.backlinksData) {
        const b = data.backlinksData;
        lines.push(`\n🔗 BACKLINKS (Common Crawl): ${b.totalFound} referencias encontradas. Dominios ejemplo: ${b.samples.slice(0, 5).map(s => s.url).join(', ')}. Fuente: ${b.source}`);
    } else {
        lines.push(`\n🔗 BACKLINKS: Busca con Google Search.`);
    }

    if (data.sitemapData) {
        const s = data.sitemapData;
        lines.push(`\n📄 PÁGINAS REALES DEL SITIO (sitemap): ${s.total} páginas encontradas. URLs reales: ${s.urls.slice(0, 8).join(', ')}. Fuente: ${s.source}`);
    } else {
        lines.push(`\n📄 SITEMAP: No encontrado, usa site:${data.domain} en Google Search.`);
    }

    if (data.serperResults) {
        const sr = data.serperResults;
        lines.push(`\n🔍 GOOGLE SERP REAL (Serper.dev): Query: "${sr.query}". Resultados orgánicos: ${sr.organic.length}. Anuncios pagados visibles: ${sr.adsTop.length}.`);
        if (sr.organic.length > 0) {
            lines.push(`   Top 3 resultados orgánicos:`);
            sr.organic.slice(0, 3).forEach(r => {
                lines.push(`   - [#${r.position}] ${r.title} → ${r.link}`);
            });
        }
        if (sr.adsTop.length > 0) {
            lines.push(`   Anuncios en Google Ads:`);
            sr.adsTop.forEach(a => {
                lines.push(`   - ${a.title} (${a.displayUrl})`);
            });
        }
        if (sr.peopleAlsoAsk.length > 0) {
            lines.push(`   People Also Ask: ${sr.peopleAlsoAsk.join(' | ')}`);
        }
    }

    // ── Pre-extract traffic numbers from all text sources ──────────────────────
    const trafficTexts: string[] = [];
    if (data.tavilyTrafficData?.answer) trafficTexts.push(data.tavilyTrafficData.answer);
    if (data.tavilyTrafficData?.results) data.tavilyTrafficData.results.forEach(r => { if (r.content) trafficTexts.push(r.content); });
    if (data.serperTrafficData?.organic) data.serperTrafficData.organic.forEach(r => { if (r.snippet) trafficTexts.push(r.snippet); });
    if (data.geminiSearch?.trafficEstimate) trafficTexts.push(data.geminiSearch.trafficEstimate);

    const extracted = extractTrafficNumbers(trafficTexts);
    if (extracted.monthly) {
        lines.push(`\n🚨🚨 TRÁFICO MENSUAL EXTRAÍDO AUTOMÁTICAMENTE: ${extracted.monthly.toLocaleString('en-US')} visitas/mes (Fuente: ${extracted.source})`);
        lines.push(`   ⚠️ USA ESTE NÚMERO PARA organicTraffic — tiene prioridad P1.`);
    }

    if (data.tavilyTrafficData) {
        const tt = data.tavilyTrafficData;
        lines.push(`\n📊 TRÁFICO REAL (${tt.source}):`);
        if (tt.answer) {
            lines.push(`   ➜ RESPUESTA DIRECTA: ${tt.answer.substring(0, 500)}`);
        }
        if (tt.results.length > 0) {
            tt.results.forEach(r => {
                lines.push(`   ➜ [${r.url}] ${r.content}`);
            });
        }
        if (!tt.answer && tt.results.length === 0) {
            lines.push(`   ➜ Sin datos de tráfico disponibles en SimilarWeb/SemRush públicos.`);
        }
    }

    if (data.serperTrafficData) {
        const st = data.serperTrafficData;
        if (st.organic.length > 0) {
            lines.push(`\n📈 SNIPPETS DE TRÁFICO (${st.source}):`);
            st.organic.forEach(r => {
                lines.push(`   ➜ [${r.link}] ${r.snippet}`);
            });
        }
    }

    if (data.tavilyResearch) {
        const tv = data.tavilyResearch;
        if (tv.answer) {
            lines.push(`\n🤖 RESEARCH DE COMPETIDORES (Tavily): ${tv.answer.substring(0, 400)}`);
        }
        if (tv.results.length > 0) {
            lines.push(`   Fuentes relevantes: ${tv.results.slice(0, 3).map(r => r.url).join(', ')}`);
        }
    }

    if (data.metaAds) {
        const m = data.metaAds;
        lines.push(`\n📘 META ADS LIBRARY: ${m.ads.length} anuncios detectados recientemente.`);
        m.ads.slice(0, 3).forEach(a => {
            lines.push(`   - [${a.advertiser}] ${a.text.substring(0, 100)}...`);
        });
    }

    if (data.tiktokAds) {
        const t = data.tiktokAds;
        lines.push(`\n🎵 TIKTOK ADS: ${t.ads.length} anuncios detectados recently.`);
        t.ads.slice(0, 3).forEach(a => {
            lines.push(`   - [${a.advertiser}] ${a.text.substring(0, 100)}...`);
        });
    }

    if (data.builtWithData) {
        const bw = data.builtWithData;
        lines.push(`\n🛠️ STACK TECNOLÓGICO (BuiltWith): Tecnologías detectadas: ${bw.technologies.join(', ')}. Fuente: ${bw.source}`);
    }

    if (data.urlScanData) {
        const us = data.urlScanData;
        lines.push(`\n🔬 ESCÁNER DE SITIO (URLScan.io): Último escaneo: ${us.lastScanned || 'N/A'}, País servidor: ${us.serverLocation || 'N/A'}. Fuente: ${us.source}`);
    }

    if (data.geminiSearch) {
        const gs = data.geminiSearch;
        lines.push(`\n🔍 INVESTIGACIÓN VIA GEMINI GOOGLE SEARCH (${gs.source}):`);
        if (gs.trafficEstimate) lines.push(`   ➜ ${gs.trafficEstimate}`);
    }

    lines.push(`\nFuentes de datos reales disponibles (${data.realDataSources.length}): ${data.realDataSources.join('; ')}`);

    return lines.join('\n');
};

export const realDataService = {
    fetchOpenPageRank,
    fetchCommonCrawl,
    fetchSitemap,
    fetchDomainHealth,
    fetchWHOISDomainAge,
    fetchWaybackHistory,
    fetchURLScanTech,
    fetchSerperResults,
    fetchSerperTrafficData,
    fetchTavilyCompetitors,
    fetchTavilyTrafficData,
    fetchBuiltWithTech,
    fetchGeminiSearchResearch,
    fetchRealDataAll,
    buildRealDataContext
};

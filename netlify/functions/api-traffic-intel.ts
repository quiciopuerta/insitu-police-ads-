/**
 * Netlify Function: api-traffic-intel
 * =====================================
 * Lightweight endpoint that returns REAL traffic data from SimilarWeb/SemRush
 * via Tavily (include_domains) + Serper (targeted search).
 * No Gemini processing — raw data only. Fast and reusable across all audit modules.
 *
 * POST /api/traffic-intel
 * Body: { domain: string, competitors?: string[] }
 */

import type { Handler, HandlerEvent } from "@netlify/functions";
import { fetchTavilyTrafficData, fetchSerperTrafficData } from "./_lib/realDataService";

const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Id",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
};

export const handler: Handler = async (event: HandlerEvent) => {
    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };
    if (event.httpMethod !== "POST") return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: "Method not allowed" }) };

    let domain = "";
    let competitors: string[] = [];

    try {
        const body = JSON.parse(event.body || "{}");
        domain = body.domain?.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "") || "";
        competitors = (body.competitors || []).map((d: string) =>
            d.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "")
        ).filter(Boolean).slice(0, 5);
    } catch {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Invalid JSON" }) };
    }

    if (!domain) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "domain is required" }) };

    // Fetch main domain + up to 5 competitors in parallel
    const domainsToFetch = [domain, ...competitors];

    const results = await Promise.allSettled(
        domainsToFetch.map(async (d) => {
            const [tavily, serper] = await Promise.allSettled([
                fetchTavilyTrafficData(d),
                fetchSerperTrafficData(d),
            ]);
            return {
                domain: d,
                tavily: tavily.status === "fulfilled" ? tavily.value : null,
                serper: serper.status === "fulfilled" ? serper.value : null,
            };
        })
    );

    const trafficData = results
        .filter(r => r.status === "fulfilled")
        .map(r => (r as PromiseFulfilledResult<any>).value);

    return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({ trafficData }),
    };
};

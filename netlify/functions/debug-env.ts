import { getCorsHeaders } from "./_lib/corsHelper";
const CORS = getCorsHeaders();
import { Handler } from '@netlify/functions';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
};

const envPresence = (val: string | undefined) =>
    val ? `present (${val.substring(0, 4)}...)` : 'missing';

export const handler: Handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined), body: '' };
    }

    const secret = event.headers['x-admin-secret'];
    if (!secret || secret !== process.env.ADMIN_SECRET) {
        return { statusCode: 401, headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined), body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    return {
        statusCode: 200,
        headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined),
        body: JSON.stringify({
            apifyToken: envPresence(process.env.APIFY_API_TOKEN),
            apifyTokens: process.env.APIFY_API_TOKENS
                ? `present (${process.env.APIFY_API_TOKENS.length} chars)`
                : 'missing',
            dbUrl: process.env.DATABASE_URL ? 'present' : 'missing',
            adminSecret: process.env.ADMIN_SECRET ? 'present' : 'missing',
            ts: new Date().toISOString()
        })
    };
};

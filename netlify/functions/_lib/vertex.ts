import { runQuery } from './db';
import crypto from 'crypto';

const gcpProjectId: string = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT_ID || '';
const gcpLocation: string = process.env.GCP_LOCATION || 'us-central1';

export interface VertexConfig {
    client_email: string;
    private_key: string;
    project_id: string;
    location: string;
}

/** Load GCP credentials from Supabase settings table (bypasses Lambda 4KB env var limit). */
export async function getVertexCredsFromDB(): Promise<VertexConfig | null> {
    try {
        const rows = await runQuery(async (sql) =>
            sql`SELECT data FROM settings WHERE id = 1 LIMIT 1`
        );
        if (!rows || rows.length === 0) return null;
        const settings = JSON.parse(rows[0].data || '{}');
        const creds = settings.gcpCredentials;
        if (creds?.client_email && creds?.private_key) {
            console.log("[Vertex Lib] Successfully loaded credentials from Supabase settings.");
            return {
                client_email: creds.client_email,
                private_key: creds.private_key.replace(/\\n/g, '\n'),
                project_id: creds.project_id || gcpProjectId,
                location: creds.location || gcpLocation
            };
        } else {
            console.warn("[Vertex Lib] Settings found but gcpCredentials object is incomplete.");
        }
    } catch { /* ignore */ }
    return null;
}

/**
 * Parsed service-account credentials from env vars — OPTIONAL lightweight fallback.
 */
export function getVertexCredsFromEnv(): VertexConfig | null {
    const email = process.env.GCP_CLIENT_EMAIL;
    const key   = process.env.GCP_PRIVATE_KEY;
    if (email && key) {
        console.log("[Vertex Lib] Found credentials in environment variables.");
        return {
            client_email: email,
            private_key: key.replace(/\\n/g, '\n'),
            project_id: gcpProjectId,
            location: gcpLocation
        };
    }
    console.warn("[Vertex Lib] No credentials found in environment variables (GCP_CLIENT_EMAIL/GCP_PRIVATE_KEY).");
    return null;
}

/**
 * Get the current Vertex config from DB or Env.
 * Centralized entry point for all GCP Vertex AI operations ( Imagen, Veo, Claude).
 */
export async function getVertexConfig(): Promise<VertexConfig> {
    try {
        const dbCreds = await getVertexCredsFromDB().catch(e => {
            console.warn("[Vertex Lib] DB Creds fetch failed, falling back to Env:", e.message);
            return null;
        });
        const creds = dbCreds || getVertexCredsFromEnv();
        
        if (!creds) {
            const err = "Vertex AI credentials context not resolved. GCP_CLIENT_EMAIL / GCP_PRIVATE_KEY missing.";
            console.error("[Vertex Lib] CRITICAL:", err);
            throw new Error(err);
        }
        return creds;
    } catch (e: any) {
        console.error("[Vertex Lib] Configuration Error:", e.message);
        throw e;
    }
}

/**
 * Get a short-lived OAuth2 Bearer token for Vertex AI using a self-signed JWT.
 */
export async function getVertexToken(): Promise<string> {
    const creds = await getVertexConfig();

    const now   = Math.floor(Date.now() / 1000);
    const claim = {
        iss: creds.client_email,
        sub: creds.client_email,
        scope: 'https://www.googleapis.com/auth/cloud-platform',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
    };

    const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify(claim)).toString('base64url');
    const unsigned = `${header}.${payload}`;

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(unsigned);
    const signature = sign.sign(creds.private_key, 'base64url');
    const jwt = `${unsigned}.${signature}`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt,
        }),
    });

    if (!tokenRes.ok) {
        const err = await tokenRes.text();
        throw new Error(`Google OAuth2 token exchange failed (${tokenRes.status}): ${err}`);
    }

    const { access_token } = await tokenRes.json() as { access_token: string };
    if (!access_token) throw new Error("Google OAuth2 returned empty access_token.");
    return access_token;
}

/**
 * Generates a GCS V4 Signed URL.
 */
export async function gcsSignedUrl(
    gcsUri: string,
    creds: VertexConfig,
    accessToken: string,
    expiresInSec = 43200,
    downloadFilename?: string
): Promise<string> {
    const match = gcsUri.match(/^gs:\/\/([^/]+)\/(.+)$/);
    if (!match) return gcsUri.startsWith('gs://') ? `https://storage.googleapis.com/${gcsUri.slice(5)}` : gcsUri;
    const [, bucket, objectPath] = match;

    const now = new Date();
    const datetime = now.toISOString().replace(/[-:]/g, '').replace(/\..+/, '') + 'Z';
    const date = datetime.slice(0, 8);
    const credential = `${creds.client_email}/${date}/auto/storage/goog4_request`;

    const filename = downloadFilename || (objectPath.split('/').pop() ?? 'video.mp4');
    const disposition = `attachment; filename="${filename}"`;
    const queryParams: [string, string][] = [
        ['X-Goog-Algorithm', 'GOOG4-RSA-SHA256'],
        ['X-Goog-Credential', credential],
        ['X-Goog-Date', datetime],
        ['X-Goog-Expires', String(expiresInSec)],
        ['X-Goog-SignedHeaders', 'host'],
        ['response-content-disposition', disposition],
    ];
    queryParams.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

    const gcsEncode = (s: string) =>
        encodeURIComponent(s)
            .replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());

    const canonicalQueryString = queryParams
        .map(([k, v]) => `${gcsEncode(k)}=${gcsEncode(v)}`)
        .join('&');

    const encodedObject = objectPath.split('/').map(p => encodeURIComponent(p)).join('/');
    const canonicalUri = `/${bucket}/${encodedObject}`;

    const canonicalRequest = [
        'GET',
        canonicalUri,
        canonicalQueryString,
        'host:storage.googleapis.com',
        '',
        'host',
        'UNSIGNED-PAYLOAD',
    ].join('\n');

    const stringToSign = [
        'GOOG4-RSA-SHA256',
        datetime,
        `${date}/auto/storage/goog4_request`,
        crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    let signatureHex: string | null = null;
    try {
        const signer = crypto.createSign('RSA-SHA256');
        signer.update(stringToSign);
        signatureHex = signer.sign(creds.private_key, 'hex');
    } catch (e) {
        console.warn(`[Vertex Lib] Local signing failed, falling back to IAM: ${e}`);
    }

    if (!signatureHex) {
        const signRes = await fetch(
            `https://iam.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(creds.client_email)}:signBlob`,
            {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ bytesToSign: Buffer.from(stringToSign).toString('base64') }),
            }
        );
        if (signRes.ok) {
            const { signedBlob } = await signRes.json() as { signedBlob: string };
            signatureHex = Buffer.from(signedBlob, 'base64').toString('hex');
        }
    }

    if (!signatureHex) throw new Error("Could not sign GCS URL (both local and IAM failed).");

    return `https://storage.googleapis.com${canonicalUri}?${canonicalQueryString}&X-Goog-Signature=${signatureHex}`;
}

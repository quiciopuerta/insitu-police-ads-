import { createHmac, timingSafeEqual } from "node:crypto";

const getSecret = () => process.env.JWT_SECRET || process.env.ADMIN_SECRET || "insecure-dev-secret";

/**
 * Base64 URL encode a string or buffer
 */
function base64urlEncode(str: string | Buffer): string {
    const base64 = Buffer.isBuffer(str) ? str.toString('base64') : Buffer.from(str).toString('base64');
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Base64 URL decode to string
 */
function base64urlDecode(str: string): string {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    return Buffer.from(str, 'base64').toString('utf8');
}

/**
 * Signs a payload into a JWT-like token.
 */
export function signToken(payload: any, expiresInDays = 7): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const exp = Math.floor(Date.now() / 1000) + (expiresInDays * 24 * 60 * 60);
    const data = { ...payload, exp };
    
    const encodedHeader = base64urlEncode(JSON.stringify(header));
    const encodedPayload = base64urlEncode(JSON.stringify(data));
    
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    const hmac = createHmac('sha256', getSecret()).update(signatureInput).digest();
    const encodedSignature = base64urlEncode(hmac);
    
    return `${signatureInput}.${encodedSignature}`;
}

/**
 * Verifies a token and returns its payload if valid, otherwise null.
 */
export function verifyToken(token: string): any | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        
        const [encodedHeader, encodedPayload, signature] = parts;
        const signatureInput = `${encodedHeader}.${encodedPayload}`;
        
        // Re-create the signature
        const hmac = createHmac('sha256', getSecret()).update(signatureInput).digest();
        const expectedSignature = base64urlEncode(hmac);
        
        // Use timingSafeEqual to prevent timing attacks
        const sigBuf = Buffer.from(signature);
        const expectedBuf = Buffer.from(expectedSignature);
        
        if (sigBuf.length !== expectedBuf.length) return null;
        if (!timingSafeEqual(sigBuf, expectedBuf)) return null;
        
        const payload = JSON.parse(base64urlDecode(encodedPayload));
        
        // Check expiration
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            return null; // Token expired
        }
        
        return payload;
    } catch (err) {
        return null;
    }
}

/**
 * Helper to extract userId from headers.
 * Tries Authorization: Bearer <token> first (secure), falls back to x-user-id temporarily for compatibility.
 */
export function getUserIdFromHeaders(headers: any): string | null {
    const authHeader = headers['authorization'] || headers['Authorization'] || '';
    if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        
        // A standard UUID format has 36 characters (e.g. 123e4567-e89b-12d3-a456-426614174000). 
        // If the token is exactly 36 chars long and has hyphens, it's likely a legacy UUID being passed as Bearer.
        // We MUST enforce strict validation for proper JWTs to block IDOR.
        if (token.length === 36 && token.includes('-')) {
             console.warn(`[SECURITY WARN] Legacy Bearer UUID used. Rejecting IDOR vector.`);
             // Refuse to accept naked UUIDs in the Bearer field!
             return null;
        }
        
        const payload = verifyToken(token);
        if (payload && payload.id) {
            return payload.id;
        }
        return null; 
    }
    
    // TEMPORARY FALLBACK (For scripts/tests or older clients during migration)
    const fallbackId = headers['x-user-id'] || headers['X-User-Id'];
    if (fallbackId) {
        // console.warn(`[SECURITY WARN] Legacy X-User-Id header used for auth. Client should migrate to Authorization: Bearer JWT.`);
        return fallbackId;
    }
    
    return null;
}

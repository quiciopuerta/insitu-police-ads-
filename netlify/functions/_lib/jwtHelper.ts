import { createHmac } from "node:crypto";

const JWT_SECRET = process.env.VITE_JWT_SECRET || process.env.ADMIN_PASSWORD || "insitu_default_jwt_secret_v1_2026";

function base64UrlEncode(obj: object | string): string {
  const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf8");
}

export function signSessionToken(payload: object): string {
  const header = { alg: "HS256", typ: "JWT" };
  const headStr = base64UrlEncode(header);
  
  // Expiry is handled manually or just rely on cookie expiry, but let's add `exp` to be safe (30 days)
  const extendedPayload = {
      ...payload,
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
  };
  const payloadStr = base64UrlEncode(extendedPayload);
  
  const signature = createHmac("sha256", JWT_SECRET)
    .update(`${headStr}.${payloadStr}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${headStr}.${payloadStr}.${signature}`;
}

export function verifySessionToken(token: string): any | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [headStr, payloadStr, signature] = parts;
  const expectedSignature = createHmac("sha256", JWT_SECRET)
    .update(`${headStr}.${payloadStr}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  if (signature !== expectedSignature) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(payloadStr));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}

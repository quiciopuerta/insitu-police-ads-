const getEnv = (key: string): string | undefined => {
    if (typeof process !== 'undefined' && process.env) {
        if (process.env[key]) return process.env[key];
    }
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
            // @ts-ignore
            return import.meta.env[key];
        }
    } catch { /* ignore */ }
    return undefined;
};

export const getBaseApiUrl = (): string => {
    // 1. Use explicitly defined environment variable if it exists
    const envUrl = getEnv('VITE_API_URL') || getEnv('REACT_APP_API_URL');
    if (envUrl) {
        return envUrl as string;
    }

    if (typeof window === "undefined") {
        return "/api";
    }

    // 2. Tauri Desktop App: cannot use relative /api because origin is tauri://localhost
    // Fall back to the absolute production backend URL if in Tauri.
    if (!!(window as any).__TAURI__ || !!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI_IPC__) {
        return "https://insitu.company/api";
    }

    // 3. Local development: only use localhost:3001 if explicitly on localhost
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        const port = window.location.port;
        if (port === "3000" || port === "3002" || port === "3003" || port === "5173" || port === "5174") {
            return `${window.location.protocol}//${window.location.hostname}:3001/api`;
        }
    }

    // 4. Production web: always use same-origin relative path
    return "/api";
};

export const API_URL = getBaseApiUrl();

export const buildAbsoluteUrl = (path: string): string => {
    if (!path || path.startsWith('http')) return path;
    const isDesktop = typeof window !== "undefined" && (!!(window as any).__TAURI__ || !!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI_IPC__);
    if (isDesktop) {
        // @ts-ignore
        const isDev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV;
        if (isDev) {
            return `http://localhost:8888${path.startsWith('/') ? path : '/' + path}`;
        }
        return `https://insitu.company${path.startsWith('/') ? path : '/' + path}`;
    }
    return path;
};

// ── Admin fetch helper ─────────────────────────────────────────────────────
// Automatically injects X-User-Id so backend can validate admin role via DB.
// Reading from localStorage directly avoids circular dependencies with userService.
export function adminFetch(url: string, options: RequestInit = {}): Promise<Response> {
    let userId = "";
    let authToken = "";
    try {
        const session = localStorage.getItem("insitu_active_session");
        if (session) {
            const parsedSession = JSON.parse(session);
            // Defensively check for nested object or top level id
            userId = parsedSession?.id || parsedSession?.user?.id || "";
        }
        authToken = localStorage.getItem("insitu_auth_token") || "";
    } catch { /* ignore */ }

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
        ...(authToken ? { "Authorization": `Bearer ${authToken}` } : {}),
        ...(userId ? { "X-User-Id": userId } : {}), // Kept for legacy compatibility during migration
    };
    
    // Debug logging for local development or when experiencing auth issues
    // Silence warning for known public admin routes (e.g. GET /admin/settings) to reduce console noise
    const isPublicAdmin = url.includes("/admin/settings") && options.method?.toUpperCase() !== "POST";
    
    if (getEnv('DEV') && !isPublicAdmin && (!userId || !headers["X-User-Id"])) {
        console.warn(`[adminFetch] Warning: Request to ${url} made without a valid X-User-Id. This will likely result in a 401.`);
    }

    const absoluteUrl = buildAbsoluteUrl(url);
    return fetch(absoluteUrl, { ...options, headers });
}

/**
 * proxiedAssetUrl — CORS proxy wrapper for cross-origin assets (GCS, Pixabay).
 *
 * Browsers block cross-origin video from storage.googleapis.com and audio from Pixabay
 * unless the bucket/server has a loose CORS policy. We proxy through /api/gcs-proxy 
 * to resolve this without security compromises on the source side.
 */
export const proxiedAssetUrl = (url: string | null | undefined): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('/')) return url;
  try {
    const parsed = new URL(url);
    const ALLOWED_HOSTS = ['storage.googleapis.com', 'cdn.pixabay.com', 'pixabay.com', 'firebasestorage.googleapis.com'];
    if (ALLOWED_HOSTS.some(h => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`))) {
      return buildAbsoluteUrl(`/api/gcs-proxy?url=${encodeURIComponent(url)}`);
    }
  } catch { /* unparseable — pass through */ }
  return url;
};

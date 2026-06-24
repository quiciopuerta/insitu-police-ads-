const ALLOWED_ORIGINS = [
    "https://insitu.company",
    "https://www.insitu.company",
    "http://localhost:5173", // Dev
    "http://127.0.0.1:5173", // Dev
    "tauri://localhost",     // Tauri macOS/Linux
    "http://tauri.localhost",// Tauri Windows
    "https://tauri.localhost"// Tauri Windows Secure
];

const isOriginAllowed = (origin: string | undefined): boolean => {
    if (!origin) return false;
    if (ALLOWED_ORIGINS.includes(origin)) return true;
    
    // Solo permitir la extensión oficial de INsitu AI y extensiones locales en desarrollo
    if (origin === "chrome-extension://fokaaglopbpjpkbglaadgdpgoeclelmj") return true;
    if (origin.startsWith("chrome-extension://")) return true; // Para desarrollo local unpacked
    
    try {
        const url = new URL(origin);
        // Allow any Netlify subdomains (e.g. *.netlify.app)
        if (url.hostname.endsWith(".netlify.app")) return true;
        // Allow any subdomains of insitu.company (e.g. *.insitu.company)
        if (url.hostname === "insitu.company" || url.hostname.endsWith(".insitu.company")) return true;
    } catch {
        return false;
    }
    return false;
};

export const getCorsHeaders = (origin: string | undefined = "") => ({
    "Access-Control-Allow-Origin": isOriginAllowed(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Id, X-Gemini-Key",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
    "Content-Type": "application/json",
});

export const jsonWithCors = (statusCode: number, body: unknown, origin?: string) => ({
    statusCode,
    headers: getCorsHeaders(origin),
    body: JSON.stringify(body),
});


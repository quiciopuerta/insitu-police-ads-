/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
    readonly VITE_EMAILJS_SERVICE_ID: string
    readonly VITE_EMAILJS_TEMPLATE_ID: string
    readonly VITE_EMAILJS_PUBLIC_KEY: string
    readonly VITE_API_URL: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

declare const __APP_VERSION__: string;
declare const __COMMIT_HASH__: string;


import { SystemSettings, PlanTier } from '../../types';

const SETTINGS_KEY = 'insitu_system_settings';
import { API_URL, adminFetch } from '../../utils/apiConfig';
import { logger } from '../../utils/logger';


export const settingsService = {
    getDefaultSettings: (): SystemSettings => ({
        configVersion: 20260312,
        aiConfigs: [
            { id: '0', name: 'Gemini (Primary)', provider: 'Google Gemini', apiKey: '', status: 'active', type: 'text' },
            { id: '0-2', name: 'Gemini (Secondary)', provider: 'Google Gemini', apiKey: '', status: 'active', type: 'text' },
            { id: '1', name: 'Gemini (System)', provider: 'Google Gemini', apiKey: '', status: 'active', type: 'text' },
        ],
        googleAuth: {
            clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
            enabled: import.meta.env.VITE_GOOGLE_AUTH_ENABLED === 'true' || !!import.meta.env.VITE_GOOGLE_CLIENT_ID
        },
        hubspot: { accessToken: '', enabled: false },
        paypal: {
            clientId: 'sb-default',
            mode: 'sandbox',
            enabled: true,
            plans: {
                Starter: 'P-STARTER-TRIAL',
                Growth: 'P-GROWTH-TRIAL',
                Agency: 'P-AGENCY-TRIAL'
            }
        },
        trialTokens: 500,
        trialDays: 7,
        pricing: {
            Starter: {
                monthly: 29.00,
                yearly: 290.00,
                lifetime: 0,
                features: [
                    '1,750 Tokens Mensuales',
                    'Auditoría SEM & SEO Avanzada',
                    'Análisis de Imágenes Neuro-Visual',
                    'Análisis de Video: NO INCLUIDO',
                    'Soporte por Email'
                ]
            },
            Growth: {
                monthly: 79.00,
                yearly: 790.00,
                lifetime: 0,
                features: [
                    '7,500 Tokens Mensuales',
                    'Todo lo de Starter',
                    'Análisis de Video Pro (TikTok/Meta)',
                    'Análisis de Tráfico & Competencia',
                    'Foco en Performance (Sin Brand Guardian)',
                    'Soporte Prioritario'
                ]
            },
            Agency: {
                monthly: 0,
                yearly: 0,
                lifetime: 0,
                features: [
                    '50,000 Tokens Mensuales',
                    'Contáctanos para una propuesta personalizada',
                    'Todo lo de Growth',
                    'Brand Guardian & Briefing Lab 🛡️',
                    'Feedback Loop Inteligente',
                    'White Label (Marca Blanca)',
                    'API Access',
                    'Soporte 24/7'
                ]
            }
        },
        features: {
            imageAnalysis: true,
            videoAnalysis: true,
            metrics: true,
            trafficAnalysis: true,
            brandIdentity: true,
            campaignsOptimizer: true, // Enabled for Q1 2026 Release
            compareCreatives: true,
            searchResultAudit: true,
            glossary: true,
            blog: true,
            enableAutoTrends: false,
            scriptGenerator: true
        },
        comingSoon: {
            enabled: false,
            message: '¡Próximamente! Estamos preparando nuevos planes increíbles para ti.'
        },
        martechConfig: {
            gtmId: import.meta.env.VITE_GTM_ID || '',
            metaPixelId: import.meta.env.VITE_META_PIXEL_ID || '',
            metaAccessToken: '', // NEVER EXPOSE ON FRONTEND
            googleAdsId: import.meta.env.VITE_GOOGLE_ADS_ID || '',
            googleAdsConversionLabel: import.meta.env.VITE_GOOGLE_ADS_CONVERSION_LABEL || '',
            tiktokPixelId: import.meta.env.VITE_TIKTOK_PIXEL_ID || '',
            tiktokAccessToken: '', // NEVER EXPOSE ON FRONTEND
            ga4Id: import.meta.env.VITE_GA4_ID || '',
            enabled: import.meta.env.VITE_MARTECH_ENABLED === 'true'
        }
    }),

    getSettings: (): SystemSettings => {
        // Fast synchronous read from cache (used for rendering)
        const defaultSettings = settingsService.getDefaultSettings();
        const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');

        let mergedAiConfigs = defaultSettings.aiConfigs;
        if (stored.aiConfigs && Array.isArray(stored.aiConfigs)) {
            const storedKeys = new Set(stored.aiConfigs.map((c: any) => c.apiKey));
            const missingDefaults = defaultSettings.aiConfigs.filter(d => !storedKeys.has(d.apiKey));
            mergedAiConfigs = [...stored.aiConfigs, ...missingDefaults];
        }

        return {
            ...defaultSettings,
            ...stored,
            aiConfigs: mergedAiConfigs,
            pricing: { ...defaultSettings.pricing, ...(stored.pricing || {}) },
            features: { ...defaultSettings.features, ...(stored.features || {}) },
            martechConfig: { ...defaultSettings.martechConfig, ...(stored.martechConfig || {}) },
            googleAuth: { ...defaultSettings.googleAuth }
        };
    },

    // Async backend-first version — always returns the most up-to-date settings
    fetchSettings: async (): Promise<SystemSettings> => {
        try {
            const response = await adminFetch(`${API_URL}/admin/settings`);
            if (response.ok) {
                const serverSettings = await response.json();
                if (serverSettings && serverSettings.aiConfigs) {
                    // Merge with defaults so no env keys are lost
                    const defaultSettings = settingsService.getDefaultSettings();
                    const merged = {
                        ...defaultSettings,
                        ...serverSettings,
                        pricing: { ...defaultSettings.pricing, ...(serverSettings.pricing || {}) },
                        features: { ...defaultSettings.features, ...(serverSettings.features || {}) },
                        martechConfig: { ...defaultSettings.martechConfig, ...(serverSettings.martechConfig || {}) },
                        googleAuth: { ...defaultSettings.googleAuth }
                    };
                    localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
                    return merged;
                }
            }
        } catch (e) {
            logger.warn('[Settings] Backend unavailable, using local cache:', e);
        }
        return settingsService.getSettings();
    },

    saveSettings: async (settings: SystemSettings): Promise<boolean> => {
        // Persist to backend first (global sync)
        try {
            const response = await adminFetch(`${API_URL}/admin/settings`, {
                method: 'POST',
                body: JSON.stringify(settings),
            });
            if (!response.ok) logger.warn('[Settings] Server did not accept settings save.');
        } catch (e) {
            logger.error('[Settings] Failed to save settings to server:', e);
        }
        // Always update local cache
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        return true;
    },

    reportAPIError: (apiKey: string, error: string) => {
        const settings = settingsService.getSettings();
        const configIndex = settings.aiConfigs.findIndex(c => c.apiKey === apiKey);

        if (configIndex !== -1) {
            settings.aiConfigs[configIndex].lastError = error;
            settings.aiConfigs[configIndex].lastUsed = Date.now();
            settingsService.saveSettings(settings);
        }
    },

    clearAPIError: (apiKey: string) => {
        const settings = settingsService.getSettings();
        const configIndex = settings.aiConfigs.findIndex(c => c.apiKey === apiKey);

        if (configIndex !== -1 && settings.aiConfigs[configIndex].lastError) {
            delete (settings.aiConfigs[configIndex] as any).lastError;
            settings.aiConfigs[configIndex].lastUsed = Date.now();
            settingsService.saveSettings(settings);
        }
    },

    initSettings: () => {
        const defaultSettings = settingsService.getDefaultSettings();
        const storedStr = localStorage.getItem(SETTINGS_KEY);
        
        if (!storedStr) {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
        } else {
            try {
                const stored = JSON.parse(storedStr);
                // If version is missing or old, force a pricing update
                if (!stored.configVersion || stored.configVersion < defaultSettings.configVersion!) {
                    const migrated = {
                        ...stored,
                        configVersion: defaultSettings.configVersion,
                        pricing: defaultSettings.pricing,
                        features: defaultSettings.features
                    };
                    localStorage.setItem(SETTINGS_KEY, JSON.stringify(migrated));
                    logger.info('%c[MIGRATION] Settings migrated to version ' + defaultSettings.configVersion, 'color: #3B82F6');
                }
            } catch (e) {
                localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
            }
        }

        // Background sync
        adminFetch(`${API_URL}/admin/settings`)
            .then(r => r.ok ? r.json() : null)
            .then(settings => {
                if (settings && settings.aiConfigs) {
                    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
                    logger.info('%c[SYNC] Settings synchronized with server', 'color: #10B981');
                }
            })
            .catch(e => logger.warn('[SYNC] Could not sync settings:', e));
    }
};

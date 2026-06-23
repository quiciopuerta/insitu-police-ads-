import { authService } from './authService';
import { userService } from './auth/userService';
import { API_URL } from '../utils/apiConfig';
import { logger } from '../utils/logger';


/**
 * MarTech Measurement Service
 * Handles DataLayer events for GTM, Meta Pixel, Google Ads, TikTok
 * and server-side tracking (CAPI)
 */

declare global {
    interface Window {
        dataLayer: any[];
        fbq: any;
        ttq: any;
        gtag: any;
    }
}

export const martechService = {

    /**
     * Push event to DataLayer (GTM) and gtag (GA4/Ads)
     */
    pushEvent: (eventName: string, params: Record<string, any> = {}) => {
        const activeProfile = userService.getCurrentProfile();
        const globalSettings = authService.getSettings();
        
        // Prioritize profile-specific config, fallback to global
        const config = activeProfile?.martechConfig || globalSettings.martechConfig;
        
        if (!config?.enabled) return;

        const user = authService.getCurrentUser();
        const enrichedParams = {
            ...params,
            user_id: user?.id || 'anonymous',
            user_auth_status: user ? 'authenticated' : 'anonymous',
            timestamp: new Date().toISOString()
        };

        // 1. GTM DataLayer (Standard Object Format)
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            event: eventName,
            ...enrichedParams
        });

        // 2. Direct gtag (Argument Format) - Essential for GA4/Google Ads direct integration
        if (typeof window.gtag === 'function') {
            window.gtag('event', eventName, enrichedParams);
        }


        // 4. Meta & TikTok Client-Side (if available)
        if (window.fbq && typeof window.fbq === 'function') {
            const fbEvent = eventName === 'purchase' ? 'Purchase' :
                eventName === 'begin_checkout' ? 'InitiateCheckout' :
                    eventName === 'generate_lead' ? 'Lead' : eventName;
            window.fbq('trackCustom', fbEvent, enrichedParams);
        }

        logger.info(`[MarTech] Event: ${eventName}`, enrichedParams);
    },

    /**
     * Validate MarTech configuration with the server
     */
    validateConfig: async () => {
        const activeProfile = userService.getCurrentProfile();
        const globalSettings = authService.getSettings();
        const config = activeProfile?.martechConfig || globalSettings.martechConfig;
        
        if (!config) return { success: false, message: 'Configuration missing' };

        try {
            const response = await fetch(`${API_URL}/martech/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config })
            });

            const result = await response.json();

            if (activeProfile) {
                // Save validation status back to profile
                const updatedProfile = {
                    ...activeProfile,
                    martechConfig: {
                        ...config,
                        validationStatus: result.validation
                    }
                };
                const user = authService.getCurrentUser();
                if (user) {
                   userService.updateBrandProfile(user.id, updatedProfile);
                }
            } else {
                // Save validation status back to global settings
                const updatedSettings = {
                    ...globalSettings,
                    martechConfig: {
                        ...globalSettings.martechConfig,
                        validationStatus: result.validation
                    }
                };
                authService.saveSettings(updatedSettings);
            }

            return { success: true, validation: result.validation };
        } catch (e) {
            logger.error('[MarTech] Validation Error', e);
            return { success: false, message: 'Validation failed to connect' };
        }
    },

    /**
     * Log Page View (Virtual & Real)
     */
    trackPageView: (pagePath: string, pageTitle?: string) => {
        // Ensure standard GA4 parameters
        const pageLocation = window.location.origin + pagePath;
        martechService.pushEvent('page_view', {
            page_path: pagePath,
            page_location: pageLocation,
            page_title: pageTitle || document.title
        });
    },

    /**
     * Log Authentication Events
     */
    trackAuth: (action: 'login' | 'sign_up' | 'logout', method: string = 'email') => {
        const eventName = action === 'sign_up' ? 'sign_up' : action;
        martechService.pushEvent(eventName, {
            method: method,
            category: 'authentication'
        });

        if (action === 'sign_up') {
            martechService.triggerCAPI('CompleteRegistration', { method });
        }
    },

    /**
     * Log E-commerce / Subscription Events
     */
    trackSubscription: (action: 'view_pricing' | 'begin_checkout' | 'add_payment_info' | 'purchase', data: {
        plan?: string,
        value?: number,
        currency?: string,
        transaction_id?: string
    }) => {
        const ecommerceParams = {
            currency: data.currency || 'USD',
            value: data.value,
            items: data.plan ? [{
                item_name: data.plan,
                price: data.value,
                quantity: 1
            }] : []
        };

        martechService.pushEvent(action, {
            ...ecommerceParams,
            transaction_id: data.transaction_id,
            category: 'subscription'
        });

        // Trigger CAPI for high-value events
        if (action === 'purchase') {
            martechService.triggerCAPI('Purchase', {
                ...data,
                value: data.value,
                currency: data.currency || 'USD'
            });
        } else if (action === 'begin_checkout') {
            martechService.triggerCAPI('InitiateCheckout', data);
        }
    },

    /**
     * Helper for logging successful purchases
     */
    trackPurchase: (transactionId: string, value: number, currency: string = 'USD', plan?: string) => {
        martechService.trackSubscription('purchase', {
            transaction_id: transactionId,
            value: value,
            currency: currency,
            plan: plan
        });
    },

    /**
     * Track AI Analysis Engagement
     */
    trackEngagement: (action: 'run_audit' | 'export_pdf' | 'compare_creatives' | 'add_asset' | 'click_cta', metadata: Record<string, any>) => {
        martechService.pushEvent(action, {
            ...metadata,
            category: 'engagement'
        });
    },

    /**
     * Track Analysis Events (Search/Audit)
     */
    trackAnalysis: (type: string, label: string) => {
        martechService.pushEvent('analysis_performed', {
            type,
            label,
            category: 'analysis'
        });
    },

    /**
     * Log Ad Platform Connections
     */
    trackAdConnection: (platform: string, status: 'connected' | 'disconnected', email?: string) => {
        martechService.pushEvent('ad_platform_connection', {
            platform,
            status,
            account_email: email,
            category: 'integration'
        });
    },

    /**
     * Log User Registration (Lead) - Legacy helper
     */
    trackRegistration: (email: string, method: string = 'email') => {
        martechService.trackAuth('sign_up', method);
    },

    /**
     * Server-Side API Tracking (CAPI)
     * Dispatches to local server which then communicates with Meta/TikTok
     */
    triggerCAPI: async (event: string, data: any) => {
        const activeProfile = userService.getCurrentProfile();
        const globalSettings = authService.getSettings();
        const config = activeProfile?.martechConfig || globalSettings.martechConfig;

        if (!config?.enabled) return;

        try {
            const user = authService.getCurrentUser();
            // 1. Meta CAPI
            if (config.metaAccessToken) {
                fetch(`${API_URL}/martech/capi`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        eventName: event,
                        eventData: data,
                        userData: {
                            email: user?.email,
                            id: user?.id,
                            agent: navigator.userAgent
                        },
                        config: config
                    })
                }).catch(e => logger.error('[MarTech] Meta CAPI Error', e));
            }

            // 2. TikTok API
            if (config.tiktokAccessToken) {
                fetch(`${API_URL}/martech/tiktok-api`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        eventName: event === 'Purchase' ? 'CompletePayment' : event,
                        eventData: data,
                        userData: {
                            email: user?.email,
                            id: user?.id,
                            agent: navigator.userAgent
                        },
                        config: config
                    })
                }).catch(e => logger.error('[MarTech] TikTok API Error', e));
            }

        } catch (e) {
            logger.error('[MarTech] Server Events Error', e);
        }
    }
};

import { useState, useEffect } from 'react';
import { performSearch, getCampaignAudit } from '../services/geminiService';
import { getRecentCampaignPerformance } from '../services/googleAdsService';
import { authService } from '../services/authService';
import { historyService } from '../services/historyService';
import { SearchResult, HistoryItem, AuthUser, Language } from '../types';
import { martechService } from '../services/martechService';

const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

export const useAnalysis = (currentUser: AuthUser | null, language: Language, backendOnline: boolean | null) => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<SearchResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isQuotaError, setIsQuotaError] = useState(false);
    const [history, setHistory] = useState<HistoryItem[]>([]);

    useEffect(() => {
        if (currentUser?.id) {
            historyService.getHistory(currentUser.id).then(setHistory);
        }
    }, [currentUser?.id]);

    const handleSearch = async (theme: string, country: string, objective: string, period: string, landingUrl?: string) => {
        if (!currentUser) return;

        if (backendOnline === false) {
            setError(language === 'es'
                ? "El servidor de IA está desconectado. Por favor, inicia el backend (npm run server)."
                : "AI Server is offline. Please start the backend (npm run server).");
            return;
        }

        const limitsCheck = authService.checkPlanLimits(currentUser, 'text');
        if (!limitsCheck.allowed) {
            setError(limitsCheck.reason || "Límite alcanzado.");
            return;
        }

        setLoading(true);
        setError(null);
        setIsQuotaError(false);
        setResult(null);

        try {
            let realPerformance = undefined;
            if (currentUser.linkedGoogleAds && currentUser.subscription.plan !== 'Starter') {
                try {
                    realPerformance = await getRecentCampaignPerformance(
                        currentUser.linkedGoogleAds.accessToken,
                        currentUser.linkedGoogleAds.accountId || currentUser.linkedGoogleAds.email,
                        period
                    );
                } catch (e) {
                    console.warn("API Ads Fallback.");
                }
            }

            const data = await performSearch(theme, country, objective, period, language, realPerformance, landingUrl, currentUser?.brandProfile);
            
            // Deep audit of real performance if available
            if (realPerformance && realPerformance.length > 0) {
                try {
                    const performanceString = realPerformance
                        .map(p => `Campania: ${p.campaignName} | Clicks: ${p.clicks} | Impr: ${p.impressions} | Cost: ${p.cost} | Conv: ${p.conversions} | CTR: ${p.ctr} | CPC: ${p.cpc}`)
                        .join('\n');
                    
                    const audit = await getCampaignAudit(performanceString, language);
                    data.realPerformanceAudit = audit;
                } catch (auditErr) {
                    console.error('[useAnalysis] Follow-up audit failed:', auditErr);
                }
            }
            
            setResult(data);
            authService.trackTokenUsage(100, `Auditoría Search: ${theme}`, undefined, 'text');
            martechService.trackAnalysis('audit', `${theme} (${country})`);

            if (currentUser.subscription.status === 'trial') {
                authService.incrementFreeTrial(currentUser.id);
            }

            const newItem: HistoryItem = {
                id: generateId(),
                timestamp: Date.now(),
                userId: currentUser.id,
                type: 'search',
                query: { theme, country, objective, period, landingUrl },
                result: data
            };

            setHistory(prev => [newItem, ...prev.filter(item => !(item.userId === currentUser.id && item.type === 'search' && item.query.theme === theme))].slice(0, 50));
            historyService.saveHistoryItem(newItem);

        } catch (err: any) {
            const errorMsg = err.message || 'Error.';
            setError(errorMsg);
            if (errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
                setIsQuotaError(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const addHistoryItem = (item: Omit<HistoryItem, 'id' | 'timestamp' | 'userId'> | HistoryItem) => {
        if (!currentUser) return;
        const newItem: HistoryItem = {
            id: generateId(),
            timestamp: Date.now(),
            userId: currentUser.id,
            ...item, // Allows callers (e.g. MassAdsView) to pre-set id/timestamp/userId
        } as HistoryItem;

        setHistory(prev => [newItem, ...prev].slice(0, 50));
        // Fire-and-forget: storage errors must NEVER crash the React tree
        historyService.saveHistoryItem(newItem).catch(e =>
            console.warn('[useAnalysis] saveHistoryItem failed silently:', e)
        );
    };

    const deleteHistoryItem = async (itemId: string) => {
        setHistory(prev => prev.filter(h => h.id !== itemId));
        await historyService.deleteHistoryItem(itemId);
    };

    return {
        loading, result, setResult, error, setError, isQuotaError, setIsQuotaError,
        history, setHistory, handleSearch, addHistoryItem, deleteHistoryItem
    };
};

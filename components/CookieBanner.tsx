import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CookieConsent {
    necessary: boolean;
    analytics: boolean;
    marketing: boolean;
    timestamp: number;
    version: string;
}

interface CookieBannerProps {
    language?: 'es' | 'en';
}

const CookieBanner: React.FC<CookieBannerProps> = ({ language = 'es' }) => {
    const [showBanner, setShowBanner] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [consent, setConsent] = useState<CookieConsent>({
        necessary: true,
        analytics: false,
        marketing: false,
        timestamp: Date.now(),
        version: '1.0'
    });

    useEffect(() => {
        // Check if user has already given consent
        const savedConsent = localStorage.getItem('insitu_cookie_consent');
        if (!savedConsent) {
            // Show banner after 1 second
            setTimeout(() => setShowBanner(true), 1000);
        } else {
            try {
                const parsed = JSON.parse(savedConsent);
                setConsent(parsed);
            } catch (e) {
                setShowBanner(true);
            }
        }
    }, []);

    const saveConsent = (newConsent: CookieConsent) => {
        localStorage.setItem('insitu_cookie_consent', JSON.stringify(newConsent));
        setConsent(newConsent);
        setShowBanner(false);
        setShowDetails(false);
    };

    const acceptAll = () => {
        saveConsent({
            necessary: true,
            analytics: true,
            marketing: true,
            timestamp: Date.now(),
            version: '1.0'
        });
    };

    const rejectAll = () => {
        saveConsent({
            necessary: true,
            analytics: false,
            marketing: false,
            timestamp: Date.now(),
            version: '1.0'
        });
    };

    const savePreferences = () => {
        saveConsent({
            ...consent,
            timestamp: Date.now(),
            version: '1.0'
        });
    };

    const texts = {
        es: {
            title: '🍪 Uso de Cookies',
            description: 'Utilizamos cookies para mejorar tu experiencia, analizar el tráfico y personalizar el contenido. Cumplimos con GDPR, CCPA, LGPD y LOPDP Ecuador.',
            acceptAll: 'Aceptar Todo',
            rejectAll: 'Rechazar Todo',
            customize: 'Personalizar',
            savePreferences: 'Guardar Preferencias',
            necessary: 'Necesarias',
            necessaryDesc: 'Cookies esenciales para el funcionamiento del sitio (autenticación, sesión).',
            analytics: 'Analíticas',
            analyticsDesc: 'Nos ayudan a entender cómo usas el sitio para mejorarlo.',
            marketing: 'Marketing',
            marketingDesc: 'Permiten personalizar anuncios y medir su efectividad.',
            learnMore: 'Más información',
            detailsTitle: 'Configuración de Cookies'
        },
        en: {
            title: '🍪 Cookie Usage',
            description: 'We use cookies to improve your experience, analyze traffic, and personalize content. We comply with GDPR, CCPA, LGPD, and LOPDP Ecuador.',
            acceptAll: 'Accept All',
            rejectAll: 'Reject All',
            customize: 'Customize',
            savePreferences: 'Save Preferences',
            necessary: 'Necessary',
            necessaryDesc: 'Essential cookies for site functionality (authentication, session).',
            analytics: 'Analytics',
            analyticsDesc: 'Help us understand how you use the site to improve it.',
            marketing: 'Marketing',
            marketingDesc: 'Allow personalized ads and measure their effectiveness.',
            learnMore: 'Learn more',
            detailsTitle: 'Cookie Settings'
        }
    };

    const t = texts[language];

    if (!showBanner) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-0 left-0 right-0 z-[9999] p-4 md:p-6"
            >
                <div className="max-w-6xl mx-auto bg-slate-900 rounded-[2rem] shadow-2xl border border-white/10 overflow-hidden">
                    {!showDetails ? (
                        // Simple Banner
                        <div className="p-6 md:p-8">
                            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                                <div className="flex-1">
                                    <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">
                                        {t.title}
                                    </h3>
                                    <p className="text-sm text-slate-400 leading-relaxed">
                                        {t.description}
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    <button
                                        onClick={acceptAll}
                                        className="px-6 py-3 bg-[#ff477b] text-white rounded-xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#ff477b]/20"
                                    >
                                        {t.acceptAll}
                                    </button>
                                    <button
                                        onClick={rejectAll}
                                        className="px-6 py-3 bg-white/10 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-white/20 transition-all"
                                    >
                                        {t.rejectAll}
                                    </button>
                                    <button
                                        onClick={() => setShowDetails(true)}
                                        className="px-6 py-3 bg-white/5 border border-white/10 text-slate-400 rounded-xl font-black uppercase text-xs tracking-widest hover:border-[#ff477b] hover:text-[#ff477b] transition-all"
                                    >
                                        {t.customize}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Detailed Settings
                        <div className="p-6 md:p-8">
                            <h3 className="text-2xl font-black text-white mb-6 uppercase tracking-tight">
                                {t.detailsTitle}
                            </h3>

                            <div className="space-y-4 mb-6">
                                {/* Necessary Cookies */}
                                <div className="flex items-start justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                                    <div className="flex-1 pr-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="text-sm font-black text-white uppercase">{t.necessary}</h4>
                                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[11px] font-black uppercase">
                                                {language === 'es' ? 'Obligatorias' : 'Required'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400">{t.necessaryDesc}</p>
                                    </div>
                                    <div className="flex-shrink-0">
                                        <div className="w-12 h-6 bg-emerald-500 rounded-full flex items-center justify-end px-1">
                                            <div className="w-4 h-4 bg-white rounded-full"></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Analytics Cookies */}
                                <div className="flex items-start justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                                    <div className="flex-1 pr-4">
                                        <h4 className="text-sm font-black text-white uppercase mb-1">{t.analytics}</h4>
                                        <p className="text-xs text-slate-400">{t.analyticsDesc}</p>
                                    </div>
                                    <button
                                        onClick={() => setConsent({ ...consent, analytics: !consent.analytics })}
                                        className="flex-shrink-0"
                                    >
                                        <div className={`w-12 h-6 rounded-full flex items-center transition-all ${consent.analytics ? 'bg-[#ff477b] justify-end' : 'bg-slate-700 justify-start'
                                            } px-1`}>
                                            <div className="w-4 h-4 bg-white rounded-full"></div>
                                        </div>
                                    </button>
                                </div>

                                {/* Marketing Cookies */}
                                <div className="flex items-start justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                                    <div className="flex-1 pr-4">
                                        <h4 className="text-sm font-black text-white uppercase mb-1">{t.marketing}</h4>
                                        <p className="text-xs text-slate-400">{t.marketingDesc}</p>
                                    </div>
                                    <button
                                        onClick={() => setConsent({ ...consent, marketing: !consent.marketing })}
                                        className="flex-shrink-0"
                                    >
                                        <div className={`w-12 h-6 rounded-full flex items-center transition-all ${consent.marketing ? 'bg-[#ff477b] justify-end' : 'bg-slate-700 justify-start'
                                            } px-1`}>
                                            <div className="w-4 h-4 bg-white rounded-full"></div>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={savePreferences}
                                    className="px-6 py-3 bg-[#ff477b] text-white rounded-xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#ff477b]/20"
                                >
                                    {t.savePreferences}
                                </button>
                                <button
                                    onClick={() => setShowDetails(false)}
                                    className="px-6 py-3 bg-white/10 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-white/20 transition-all"
                                >
                                    {language === 'es' ? 'Volver' : 'Back'}
                                </button>
                            </div>

                            <p className="text-[11px] text-slate-500 mt-4 uppercase tracking-widest">
                                {language === 'es'
                                    ? 'Conforme a GDPR (UE), CCPA (California), LGPD (Brasil), LOPDP (Ecuador)'
                                    : 'Compliant with GDPR (EU), CCPA (California), LGPD (Brazil), LOPDP (Ecuador)'}
                            </p>
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default CookieBanner;

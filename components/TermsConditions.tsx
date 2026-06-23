
import React, { useState } from 'react';

interface TermsConditionsProps {
    onClose: () => void;
    language?: 'es' | 'en';
}

const TermsConditions: React.FC<TermsConditionsProps> = ({ onClose, language = 'es' }) => {
    const content = {
        es: {
            title: 'Términos y Condiciones de Uso',
            version: 'Versión 1.0 - Actualizada: Febrero 2026',
            body: `
**1. ACEPTACIÓN DE LOS TÉRMINOS**
Al acceder y utilizar insitu.company, usted acepta cumplir y estar sujeto a estos Términos y Condiciones. Si no está de acuerdo con alguna parte, no debe utilizar nuestra plataforma.

**2. NUESTROS SERVICIOS**
insitu.company proporciona herramientas de análisis y optimización de campañas publicitarias utilizando inteligencia artificial. Los resultados son recomendaciones basadas en modelos de IA y deben ser validados por profesionales.

**3. USO DE DATOS Y PRIVACIDAD**
Usted acepta que procesemos sus datos para:
- Mejora de campañas en TikTok, Meta y Google Ads.
- Sincronización con plataformas de terceros.
- Envíos de Email y Notificaciones Push según su configuración.
Consulte nuestra Política de Privacidad para más detalles.

**4. PROPIEDAD INTELECTUAL**
Todo el contenido, algoritmos y diseño de la plataforma son propiedad exclusiva de insitu.company o sus licenciantes.

**5. LIMITACIÓN DE RESPONSABILIDAD**
insitu.company no se hace responsable de las decisiones comerciales tomadas basadas en los análisis de la plataforma. El éxito de las campañas depende de múltiples factores externos.

**6. MODIFICACIONES**
Nos reservamos el derecho de modificar estos términos en cualquier momento. El uso continuado de la plataforma constituye la aceptación de los nuevos términos.
            `
        },
        en: {
            title: 'Terms and Conditions of Use',
            version: 'Version 1.0 - Updated: February 2026',
            body: `
**1. ACCEPTANCE OF TERMS**
By accessing and using insitu.company, you agree to comply with and be bound by these Terms and Conditions. If you do not agree with any part, you must not use our platform.

**2. OUR SERVICES**
insitu.company provides advertising campaign analysis and optimization tools using artificial intelligence. Results are AI-model-based recommendations and should be validated by professionals.

**3. DATA USAGE AND PRIVACY**
You agree that we process your data for:
- Campaign improvement on TikTok, Meta, and Google Ads.
- Synchronization with third-party platforms.
- Email and Push Notification delivery based on your settings.
See our Privacy Policy for more details.

**4. INTELLECTUAL PROPERTY**
All content, algorithms, and design of the platform are the exclusive property of insitu.company or its licensors.

**5. LIMITATION OF LIABILITY**
insitu.company is not responsible for business decisions made based on platform analysis. Campaign success depends on multiple external factors.

**6. MODIFICATIONS**
We reserve the right to modify these terms at any time. Continued use of the platform constitutes acceptance of the new terms.
            `
        }
    };

    const t = content[language];

    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="bg-slate-900 p-8 border-b border-white/10">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight mb-2 uppercase">{t.title}</h2>
                            <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">{t.version}</p>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>
                <div className="p-8 overflow-y-auto">
                    <div className="whitespace-pre-line text-slate-700 leading-relaxed text-sm">
                        {t.body}
                    </div>
                </div>
                <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end">
                    <button onClick={onClose} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary hover:text-white hover:border-primary transition-all">
                        {language === 'es' ? 'Entendido' : 'Understood'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TermsConditions;

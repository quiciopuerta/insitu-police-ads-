import React from 'react';
import { AuthUser, Language, PlanTier } from '../../types';
import { motion } from 'framer-motion';

interface FeatureGateProps {
  user: AuthUser | null;
  allowedPlans: PlanTier[];
  featureName: string;
  language?: Language;
  onUpgrade: () => void;
  children: React.ReactNode;
  forceLock?: boolean; // New prop for dynamic limits
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  user,
  allowedPlans,
  featureName,
  language = "es",
  onUpgrade,
  children,
  forceLock = false,
}) => {
  const isSuperAdmin = user?.role === 'superAdmin' || user?.email === 'sanchezfj@me.com' || user?.email === 'sociopuerta@gmail.com';
  const isAdmin = user?.role === 'admin';
  const currentPlan = user?.subscription?.plan || 'Starter';
  
  // Si es admin o superAdmin, siempre tiene acceso
  const hasAccess = isSuperAdmin || isAdmin || allowedPlans.includes(currentPlan as PlanTier);
  
  const isLocked = !hasAccess || forceLock;

  if (!isLocked) {
    return <>{children}</>;
  }

  const title = language === 'es' ? 'Función Premium' : 'Premium Feature';
  let targetPlan = allowedPlans.includes('Growth') ? 'Growth' : 'Agency';

  // If user has the allowed plan but is blocked by limits, suggest the NEXT plan up
  if (forceLock && hasAccess) {
    if (currentPlan === 'Starter') targetPlan = 'Growth';
    else if (currentPlan === 'Growth') targetPlan = 'Agency';
  }

  const isLimitExhausted = forceLock && hasAccess;
  const headerText = isLimitExhausted 
    ? (language === 'es' ? 'Límite Alcanzado' : 'Limit Reached')
    : featureName;

  const PLAN_BENEFITS: Record<string, { es: string[], en: string[] }> = {
    Growth: {
      es: [
        'Escaneo Profundo de Competidores',
        'Auditoría IA de Imagen y Video',
        'Optimizador de Campañas Ads',
        'Laboratorio Creativo y Gen-Ads'
      ],
      en: [
        'Deep Competitor Scanning',
        'AI Image & Video Auditing',
        'Ads Campaign Optimizer',
        'Creative Lab & Gen-Ads'
      ]
    },
    Agency: {
      es: [
        'Todo el poder de Growth',
        'Marca Blanca (White-label)',
        'Arquitecto de Embudos (Funnel)',
        'Sin límites de Tokens/Consultas'
      ],
      en: [
        'All Growth power included',
        'White-label Reporting',
        'Funnel Architect',
        'No Token/Query Limits'
      ]
    }
  };

  const benefits = PLAN_BENEFITS[targetPlan]?.[language === 'es' ? 'es' : 'en'] || [];

  const upgradeText = language === 'es' ? 'Actualizar Plan' : 'Upgrade Plan';

  return (
    <div className="relative w-full">
      {/* Visual background of the feature (slightly blurred but visible) */}
      <div className="opacity-40 pointer-events-none filter blur-[2px] select-none">
        {children}
      </div>

      {/* Overlay Gate - More transparent but blocking */}
      <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/20 backdrop-blur-[1px] rounded-[3rem]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full glass-panel p-10 text-center space-y-6 border-indigo-500/50 shadow-[0_0_80px_rgba(99,102,241,0.3)]"
        >
          <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mx-auto border border-indigo-500/20">
            {isLimitExhausted ? (
              <svg className="w-10 h-10 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">
              {headerText}
            </h2>
            <div className="h-px w-20 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent mx-auto"></div>
            
            <p className="text-slate-300 text-sm font-bold tracking-wide">
              {language === 'es' ? `Sube a ${targetPlan} para continuar:` : `Upgrade to ${targetPlan} to continue:`}
            </p>

            <ul className="text-left space-y-3 mt-4 mx-auto max-w-[280px]">
              {benefits.map((benefit: string, idx: number) => (
                <li key={idx} className="flex items-start text-xs text-slate-300 font-medium">
                  <svg className="w-4 h-4 text-emerald-400 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={onUpgrade}
            className="w-full py-5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-[0_10px_30px_rgba(99,102,241,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            {upgradeText}
          </button>
          
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">
            {language === 'es' ? 'Plan Actual:' : 'Current Plan:'} <span className="text-indigo-400">{currentPlan}</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

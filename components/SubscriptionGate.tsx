import React from 'react';
import { AuthUser, Language } from '../types';

interface SubscriptionGateProps {
  user: AuthUser;
  language: Language;
  onUpgrade: () => void;
}

const SubscriptionGate: React.FC<SubscriptionGateProps> = ({ user, language, onUpgrade }) => {
  const isExpiring = language === 'es' ? 'Suscripción Expirada' : 'Subscription Expired';
  const description = language === 'es' 
    ? 'Para continuar optimizando tus campañas con IA, necesitas renovar tu suscripción.' 
    : 'To continue optimizing your campaigns with AI, you need to renew your subscription.';
  
  const buttonText = language === 'es' ? 'Renovar Ahora' : 'Renew Now';

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-[#0a0f1e]/80 backdrop-blur-xl transition-all duration-500">
      <div className="w-full max-w-xl bg-[#161b2c] border border-rose-500/30 rounded-[3rem] p-12 text-center shadow-[0_0_50px_rgba(255,71,123,0.15)] animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-rose-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-pulse">
          <svg className="w-12 h-12 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </div>
        
        <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">
          {isExpiring}
        </h2>
        <p className="text-slate-400 text-lg mb-10 leading-relaxed font-medium">
          {description}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onUpgrade}
            className="px-10 py-5 bg-gradient-to-r from-[#ff477b] to-[#ff2d55] text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-[0_10px_20px_rgba(255,71,123,0.3)] hover:scale-105 active:scale-95 transition-all"
          >
            {buttonText}
          </button>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800">
          <p className="text-[11px] text-slate-500 uppercase tracking-widest font-black">
            Plan: {user.subscription.plan} • Status: {user.subscription.status}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionGate;

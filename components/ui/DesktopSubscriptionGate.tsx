import React, { useEffect } from 'react';
import { AuthUser, Language } from '../../types';
import { ExecutionRouter } from '../../services/bridge/ExecutionRouter';
import { ExternalLink, Lock } from 'lucide-react';


interface DesktopSubscriptionGateProps {
  currentUser: AuthUser | null;
  language: Language;
}

export const DesktopSubscriptionGate: React.FC<DesktopSubscriptionGateProps> = ({ currentUser, language }) => {
  // If not desktop, or no user, this gate doesn't apply (AuthGate handles no user).
  if (!ExecutionRouter.isDesktopMode() || !currentUser) {
    return null;
  }

  // Determine if the user has a valid subscription
  const isValidSubscription = 
    currentUser.subscription?.status === 'active' || 
    currentUser.subscription?.status === 'trial' ||
    currentUser.role === 'admin' || 
    currentUser.role === 'superAdmin' ||
    ['admin@insitu.ai', 'sanchezfj@me.com', 'sociopuerta@gmail.com', 'admin@insitu.company', 'contacto@fjsanchez.com'].includes(currentUser.email);

  if (isValidSubscription) {
    return null; // Let the user through
  }

  const handleRedirect = () => {
    window.open('https://insitu.company/pricing', '_blank');
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="relative w-full max-w-lg glass-panel rounded-[3rem] p-10 text-center shadow-[0_0_60px_rgba(255,71,123,0.12)] overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-[#ff477b]/10 blur-[60px] pointer-events-none" />

        {/* Character/Mascot representation */}
        <div className="relative mx-auto w-32 h-32 mb-8">
           <div className="absolute inset-0 bg-gradient-to-br from-[#ff477b] to-purple-600 rounded-full blur-2xl opacity-40 animate-pulse"></div>
           <div className="relative w-full h-full bg-slate-900 border-2 border-[#ff477b]/30 rounded-full flex items-center justify-center p-6 shadow-xl">
             <img src="/isotype.png" alt="INsitu AI Bot" className="w-full h-full object-contain" />
             <div className="absolute bottom-1 right-1 w-8 h-8 bg-slate-800 border-2 border-[#161b2c] rounded-full flex items-center justify-center text-rose-500 shadow-md">
               <Lock className="w-4 h-4" />
             </div>
           </div>
        </div>

        <h2 className="font-headline text-3xl font-black text-white tracking-tight mb-4">
          {language === 'es' ? 'Suscripción Requerida' : 'Subscription Required'}
        </h2>
        
        <p className="text-slate-400 text-sm mb-8 leading-relaxed font-medium px-4">
          {language === 'es' 
            ? 'La versión de escritorio de INsitu AI con motor analítico local es exclusiva para usuarios con una suscripción activa. Para continuar utilizando la aplicación, necesitas un paquete válido.' 
            : 'The INsitu AI desktop version with local analytical engine is exclusive to users with an active subscription. To continue using the application, you need a valid package.'}
        </p>

        <button
          onClick={handleRedirect}
          className="flex items-center justify-center gap-3 w-full py-4 bg-gradient-to-r from-magenta to-fuchsia-600 hover:from-magenta hover:to-fuchsia-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-glow-magenta transition-all active:scale-[0.98]"
        >
          <span>{language === 'es' ? 'Ver Planes en la Web' : 'View Plans on Web'}</span>
          <ExternalLink className="w-4 h-4" />
        </button>

        <div className="mt-8 pt-6 border-t border-white/5 flex justify-center">
          <p className="text-[9px] text-slate-600 uppercase tracking-[0.3em] font-black">
            Status: <span className="text-magenta">{currentUser.subscription?.status || 'Inactivo'}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

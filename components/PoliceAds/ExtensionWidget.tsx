import React, { useEffect, useState } from 'react';
import { CheckCircle2, Download, AlertCircle, Loader2, Sparkles, Globe } from 'lucide-react';
import { AuthUser } from '../../types';

interface ExtensionStatus {
  isInstalled: boolean;
  version?: string;
  platform?: string;
  isActive: boolean;
}

export const ExtensionWidget: React.FC<{ currentUser: AuthUser; language?: string }> = ({ currentUser, language = 'es' }) => {
  const [status, setStatus] = useState<ExtensionStatus>({
    isInstalled: false,
    isActive: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if extension is installed by listening for message
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return;

      if (event.data.type === 'INSITU_EXTENSION_READY') {
        setStatus({
          isInstalled: true,
          isActive: true,
          version: event.data.version,
          platform: event.data.platform,
        });
        console.log('[INsitu PoliceAds] Extension detected:', event.data);
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Fallback loading state
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timer);
    };
  }, []);

  const testValidation = async () => {
    if (!status.isInstalled) {
      alert('La extensión no está instalada o activa.');
      return;
    }

    const testName = 'EC_FB_CONV_Test_2026';
    // The extension content script should intercept this
    if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage(
          {
            type: 'VALIDATE_CAMPAIGN',
            campaignName: testName,
          },
          (response) => {
            if (response?.isValid) {
              alert(`✅ La extensión funciona correctamente. Formato validado: ${testName}`);
            } else {
              alert(`❌ Error de formato en la prueba: ${response?.errors?.join(', ') || 'Formato inválido'}`);
            }
          }
        );
    } else {
        alert('Para probar la extensión, abre Meta Ads o Google Ads en otra pestaña y asegúrate de que esté habilitada.');
    }
  };

  if (loading) {
    return (
      <div className="bg-[#0b0e17] rounded-2xl border border-white/5 p-6 flex items-center justify-center min-h-[120px]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#e5007d]" />
          <span className="text-white/40 text-xs uppercase tracking-widest font-black">Buscando Extensión...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border p-6 relative overflow-hidden group transition-all ${
      status.isInstalled 
        ? 'bg-[#2edb8e]/5 border-[#2edb8e]/20 hover:border-[#2edb8e]/40' 
        : 'bg-[#ff477b]/5 border-[#ff477b]/20 hover:border-[#ff477b]/40'
    }`}>
      {/* Glow Effect */}
      <div className={`absolute inset-0 bg-gradient-to-br to-transparent opacity-0 group-hover:opacity-100 transition-opacity ${
        status.isInstalled ? 'from-[#2edb8e]/10' : 'from-[#ff477b]/10'
      }`} />
      
      <div className="flex items-start justify-between relative z-10">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${status.isInstalled ? 'bg-[#2edb8e]/20' : 'bg-[#ff477b]/20'}`}>
            {status.isInstalled ? (
              <CheckCircle2 className="w-6 h-6 text-[#2edb8e]" />
            ) : (
              <Globe className="w-6 h-6 text-[#ff477b]" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Extensión Multi-Plataforma
              <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-black ${
                status.isInstalled ? 'bg-[#2edb8e] text-black' : 'bg-[#ff477b] text-white'
              }`}>
                {status.isInstalled ? 'ACTIVA' : 'DESACTIVADA'}
              </span>
            </h3>
            <p className="text-white/60 text-sm mt-1 max-w-md">
              {status.isInstalled 
                ? `La extensión está validando nomenclaturas directamente en Meta Ads y Google Ads (v${status.version || '1.0.14'}).`
                : 'Instala la extensión en Chrome para validar los nombres de las campañas directamente en el Ads Manager.'}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {status.isInstalled ? (
            <button 
              onClick={testValidation}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Probar Validación
            </button>
          ) : (
            <div className="flex flex-col gap-2 items-end">
              <span className="text-xs text-[#ff477b] bg-[#ff477b]/10 px-3 py-1.5 rounded-lg border border-[#ff477b]/20 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Requiere instalación local
              </span>
              <a 
                href="/insitu-extension.zip" 
                download
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-xs rounded-md border border-white/10 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar Extensión (v1.0.14)
              </a>
              <p className="text-[10px] text-white/40 text-right max-w-[160px]">
                Descomprime e instala en chrome://extensions
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

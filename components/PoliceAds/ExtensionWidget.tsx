import React, { useEffect, useState } from 'react';
import { CheckCircle2, Download, AlertCircle, Loader2, Sparkles, Globe } from 'lucide-react';

declare const chrome: any;
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

  // UTM Generator States
  const [utmBaseUrl, setUtmBaseUrl] = useState('');
  const [utmCampaignName, setUtmCampaignName] = useState('');
  const [utmCopied, setUtmCopied] = useState(false);

  const buildUtmUrl = () => {
    if (!utmBaseUrl || !utmCampaignName) return '';

    // Derivar fuente/canal del nombre de la campaña
    const lowerName = utmCampaignName.toLowerCase();
    let source = 'cpc';
    let medium = 'cpc';

    if (lowerName.includes('_fb_') || lowerName.includes('_facebook_')) {
      source = 'facebook';
      medium = 'social_ad';
    } else if (lowerName.includes('_go_') || lowerName.includes('_google_') || lowerName.includes('_sem_') || lowerName.includes('_sea_')) {
      source = 'google';
      medium = 'cpc';
    } else if (lowerName.includes('_tk_') || lowerName.includes('_tiktok_')) {
      source = 'tiktok';
      medium = 'social_ad';
    } else if (lowerName.includes('_ln_') || lowerName.includes('_linkedin_')) {
      source = 'linkedin';
      medium = 'social_ad';
    } else if (lowerName.includes('_yt_') || lowerName.includes('_youtube_')) {
      source = 'youtube';
      medium = 'video_ad';
    } else {
      // Fallback: tratar de extraer el segundo segmento si tiene guiones bajos
      const segments = utmCampaignName.split('_');
      if (segments.length > 1) {
        source = segments[1].toLowerCase();
      }
    }

    try {
      const url = new URL(utmBaseUrl);
      url.searchParams.set('utm_source', source);
      url.searchParams.set('utm_medium', medium);
      url.searchParams.set('utm_campaign', utmCampaignName);
      return url.toString();
    } catch (e) {
      // Si la URL no es válida de forma absoluta, construirla de forma relativa/sencilla
      const separator = utmBaseUrl.includes('?') ? '&' : '?';
      return `${utmBaseUrl}${separator}utm_source=${source}&utm_medium=${medium}&utm_campaign=${encodeURIComponent(utmCampaignName)}`;
    }
  };

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
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage(
          {
            type: 'VALIDATE_CAMPAIGN',
            campaignName: testName,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.warn('[INsitu PoliceAds] Extension not reachable:', chrome.runtime.lastError.message);
              alert('La extensión no está respondiendo. Verifica que esté habilitada.');
              return;
            }
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
                ? `La extensión está validando nomenclaturas directamente en Meta Ads y Google Ads (v${status.version || '1.0.23'}).`
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
                {language === 'es' ? 'Requiere extensión' : 'Extension required'}
              </span>
              <a
                href="https://chromewebstore.google.com/detail/insitucompany-command-cen/bnbcjlgkhngeenlkjgbocbjpdhbhkdmf"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-magenta to-fuchsia-600 text-white text-xs font-bold rounded-lg transition-all hover:shadow-[0_0_15px_rgba(255,71,123,0.4)]"
              >
                <Download className="w-3.5 h-3.5" />
                {language === 'es' ? 'Instalar desde Chrome Store' : 'Install from Chrome Store'}
              </a>
              <a
                href="/insitu-extension.zip"
                download
                className="text-[10px] text-white/40 hover:text-white/60 transition-colors underline mt-1"
              >
                {language === 'es' ? 'Descargar ZIP alternativo (v1.0.23)' : 'Download alternative ZIP (v1.0.23)'}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* UTM Generator Section */}
      <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-white/60 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#4f6bff]" />
          Generador de URLs con UTMs de Campaña
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-white/40">URL de Destino (Landing Page)</label>
            <input
              type="text"
              placeholder="https://ejemplo.com/landing"
              value={utmBaseUrl}
              onChange={(e) => setUtmBaseUrl(e.target.value)}
              className="w-full bg-[#1a1f36]/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#4f6bff]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-white/40">Nombre de Campaña Validada</label>
            <input
              type="text"
              placeholder="EC_FB_CONV_Seguros_2026"
              value={utmCampaignName}
              onChange={(e) => setUtmCampaignName(e.target.value)}
              className="w-full bg-[#1a1f36]/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#4f6bff]"
            />
          </div>
        </div>

        {utmBaseUrl && utmCampaignName && (
          <div className="bg-black/20 border border-white/5 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-0.5 truncate max-w-xl">
              <span className="text-[9px] uppercase font-black tracking-widest text-[#4f6bff]">URL Final con Parámetros UTM</span>
              <p className="font-mono text-xs text-[#2edb8e] truncate select-all">{buildUtmUrl()}</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(buildUtmUrl());
                setUtmCopied(true);
                setTimeout(() => setUtmCopied(false), 2000);
              }}
              className="px-4 py-2 bg-[#4f6bff]/20 hover:bg-[#4f6bff]/30 text-[#4f6bff] text-xs font-semibold rounded-lg transition-colors whitespace-nowrap self-end md:self-auto"
            >
              {utmCopied ? '¡Copiado!' : 'Copiar URL'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

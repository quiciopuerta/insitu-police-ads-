
import React, { useState, useEffect } from 'react';
import { AuthUser, PlanTier, SystemSettings } from '../types';
import { authService } from '../services/authService';
import { martechService } from '../services/martechService';
import PaymentModal from './PaymentModal';
import TokenPurchaseModal from './TokenPurchaseModal';
import LogoIsotype from './LogoIsotype';
import { ShieldCheck, Globe } from 'lucide-react';

interface ProfileViewProps {
  user: AuthUser;
  onUpdate: (updatedUser: AuthUser) => void;
  onClose: () => void;
  language?: 'en' | 'es';
}

const ProfileView: React.FC<ProfileViewProps> = ({ user, onUpdate, onClose, language = 'es' }) => {
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [checkoutTier, setCheckoutTier] = useState<PlanTier | null>(null);
  const [settings, setSettings] = useState<SystemSettings>(authService.getSettings());
  const [syncMethod, setSyncMethod] = useState<'oauth' | 'manual'>('oauth');
  const [showTokenPurchase, setShowTokenPurchase] = useState(false);

  const t = {
    accountCenter: language === 'es' ? 'Centro de Cuenta' : 'Account Center',
    status: language === 'es' ? 'STATUS' : 'STATUS',
    verified: language === 'es' ? '✓ VERIFICADO' : '✓ VERIFIED',
    pending: language === 'es' ? '⏳ PENDIENTE' : '⏳ PENDING',
    auditorPrefs: language === 'es' ? 'PREFERENCIAS DEL AUDITOR' : 'AUDITOR PREFERENCES',
    publicName: language === 'es' ? 'NOMBRE PÚBLICO' : 'PUBLIC NAME',
    reportEmail: language === 'es' ? 'EMAIL PARA REPORTES' : 'REPORT EMAIL',
    newPass: language === 'es' ? 'NUEVA CONTRASEÑA' : 'NEW PASSWORD',
    confirm: language === 'es' ? 'CONFIRMAR' : 'CONFIRM',
    noChanges: language === 'es' ? 'Sin cambios' : 'No changes',
    saveChanges: language === 'es' ? 'GUARDAR CAMBIOS' : 'SAVE CHANGES',
    saving: language === 'es' ? 'GUARDANDO...' : 'SAVING...',
    passMismatch: language === 'es' ? 'Las contraseñas no coinciden' : 'Passwords do not match',
    profileUpdated: language === 'es' ? 'Perfil y preferencias actualizados' : 'Profile and preferences updated',
    googleSync: language === 'es' ? 'SINCRONIZACIÓN GOOGLE ADS' : 'GOOGLE ADS SYNC',
    googleSyncLocked: language === 'es' ? 'PARA ACTIVAR MEJORE SU SUSCRIPCIÓN' : 'UPGRADE TO ACTIVATE',
    googleSyncLockedDesc: language === 'es' ? 'SINCRONIZACIÓN NO DISPONIBLE EN PLAN STARTER' : 'SYNC NOT AVAILABLE ON STARTER PLAN',
    googleSyncMethod: language === 'es' ? 'Método' : 'Method',
    googleSyncActive: language === 'es' ? '● Sesión Activa' : '● Active Session',
    disconnect: language === 'es' ? 'Desvincular' : 'Disconnect',
    secureLink: language === 'es' ? 'VINCULACIÓN SEGURA' : 'SECURE LINKING',
    officialApi: language === 'es' ? 'ACCESO DIRECTO VÍA API OFICIAL DE GOOGLE' : 'DIRECT ACCESS VIA OFFICIAL GOOGLE API',
    linkGoogle: language === 'es' ? 'VINCULAR CON GOOGLE ADS' : 'LINK GOOGLE ADS',
    connecting: language === 'es' ? 'CONECTANDO...' : 'CONNECTING...',
    googleLibraryError: language === 'es' ? 'Error: Librería de Google no cargada. Por favor, recarga la página.' : 'Error: Google library not loaded. Please reload the page.',
    googleOauthSuccess: language === 'es' ? 'Cuenta de Google Ads vinculada con éxito vía OAuth.' : 'Google Ads account linked successfully via OAuth.',
    googleProfileError: language === 'es' ? 'Error al obtener datos de perfil de Google.' : 'Error getting Google profile data.',
    googleDisconnectSuccess: language === 'es' ? 'Cuenta de Google Ads desvinculada.' : 'Google Ads account disconnected.',
    manualLinkSuccess: language === 'es' ? 'Cuenta vinculada manualmente (Legacy).' : 'Account linked manually (Legacy).',
    agencyWhiteLabel: language === 'es' ? 'CONFIGURACIÓN WHITE LABEL (AGENCIA)' : 'WHITE LABEL CONFIGURATION (AGENCY)',
    agencyName: language === 'es' ? 'NOMBRE DE LA AGENCIA / CONSULTORA' : 'AGENCY / CONSULTANCY NAME',
    agencyPlaceholder: language === 'es' ? 'Ej: Mi Agencia Digital' : 'E.g.: My Digital Agency',
    agencyNote: language === 'es' ? '* Aparecerá en el título y pie de página de los reportes PDF.' : '* Will appear in the title and footer of PDF reports.',
    logoVisibility: language === 'es' ? 'VISIBILIDAD DEL LOGO' : 'LOGO VISIBILITY',
    logoBoth: language === 'es' ? 'Cabecera & Pie' : 'Header & Footer',
    logoNone: language === 'es' ? 'Sin Logo' : 'No Logo',
    whiteLabelLogo: language === 'es' ? 'LOGOTIPO DE MARCA BLANCA' : 'WHITE LABEL LOGO',
    selectLogo: language === 'es' ? 'Seleccionar Logo' : 'Select Logo',
    logoFormats: language === 'es' ? 'Formatos: PNG, SVG o JPG. Recomendado: 400x400px fondo transparente.' : 'Formats: PNG, SVG or JPG. Recommended: 400x400px transparent background.',
    paypalManagement: language === 'es' ? 'GESTIÓN DE SUSCRIPCIÓN PAYPAL' : 'PAYPAL SUBSCRIPTION MANAGEMENT',
    activePlan: language === 'es' ? 'ACTIVO' : 'ACTIVE',
    currentPlan: language === 'es' ? 'PLAN ACTUAL' : 'CURRENT PLAN',
    upgradePlan: language === 'es' ? 'MEJORAR PLAN' : 'UPGRADE PLAN',
    paymentSuccess: language === 'es' ? '¡Pago Exitoso! Suscripción activada.' : 'Payment Successful! Subscription activated.'
  };

  // White Label / Brand Profile state
  const [brandName, setBrandName] = useState(user.brandProfile?.brandName || '');
  const [isotypeUrl, setIsotypeUrl] = useState(user.brandProfile?.isotypeUrl || '');
  const [isotypeVisibility, setIsotypeVisibility] = useState(user.brandProfile?.isotypeVisibility || 'both');

  // Manual credentials state
  const [adsUser, setAdsUser] = useState('');
  const [adsPass, setAdsPass] = useState('');

  const CLIENT_ID = settings.googleAuth?.clientId;

  const plans: { tier: PlanTier; price: number; desc: string; details: string[] }[] = [
    {
      tier: 'Starter',
      price: 19.99,
      desc: language === 'es' ? '7 Auditorías (1,750 Tokens)' : '7 Audits (1,750 Tokens)',
      details: language === 'es' 
        ? ['Auditoría SEM & Textos Avanzada', 'Imágenes 🚀', 'Video: NO', 'Soporte Email']
        : ['Advanced SEM & Text Audit', 'Images 🚀', 'Video: NO', 'Email Support']
    },
    {
      tier: 'Growth',
      price: 39.99,
      desc: language === 'es' ? '30 Auditorías (7,500 Tokens)' : '30 Audits (7,500 Tokens)',
      details: language === 'es'
        ? ['Todo de Starter', 'Video TikTok/Meta Pro', 'Tráfico & Competencia', 'Soporte Prioritario']
        : ['Everything in Starter', 'TikTok/Meta Pro Video', 'Traffic & Competition', 'Priority Support']
    },
    {
      tier: 'Agency',
      price: 65.97,
      desc: language === 'es' ? 'Ilimitado (50,000 Tokens*)' : 'Unlimited (50,000 Tokens*)',
      details: language === 'es'
        ? ['Auditoría ILIMITADA', 'Brand Books 🛡️', 'Marca Blanca', 'API Access']
        : ['UNLIMITED Audit', 'Brand Books 🛡️', 'White-label', 'API Access']
    }
  ];

  const handleSave = async () => {
    if (newPassword && newPassword !== confirmPassword) {
      setMessage(t.passMismatch);
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setLoading(true);
    const updateData: any = {
      username, email,
      brandProfile: { ...user.brandProfile, brandName, isotypeUrl, isotypeVisibility }
    };
    if (newPassword) updateData.password = newPassword;

    const updated = await authService.updateProfile(user.id, updateData);
    if (updated) {
      onUpdate(updated);
      setMessage(t.profileUpdated);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setMessage(''), 3000);
    }
    setLoading(false);
  };

  const handleConnectGoogleAds = () => {
    if (!CLIENT_ID) {
      setMessage(language === 'es' ? 'Error: Google Client ID no configurado en el servidor.' : 'Error: Google Client ID not configured on server.');
      return;
    }

    setLoading(true);
    // @ts-ignore
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
      setMessage(t.googleLibraryError);
      setLoading(false);
      return;
    }

    try {
      // @ts-ignore
      const client = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/adwords https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/tagmanager.readonly',
        ux_mode: 'popup',
        callback: async (response: any) => {
          if (response.error) {
            setMessage(`${language === 'es' ? 'Error de Google' : 'Google Error'}: ${response.error_description || response.error}`);
            setLoading(false);
            return;
          }

          if (response.access_token) {
            try {
              const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${response.access_token}` }
              });
              const userInfo = await userInfoResponse.json();

              const linkedData = {
                name: userInfo.name,
                email: userInfo.email,
                picture: userInfo.picture,
                accessToken: response.access_token,
                method: 'oauth' as const
              };

              const updated = await authService.updateProfile(user.id, { linkedGoogleAds: linkedData });
              if (updated) {
                onUpdate(updated);
                setMessage(t.googleOauthSuccess);
              }
            } catch (err) {
              setMessage(t.googleProfileError);
            }
          }
          setLoading(false);
        },
        error_callback: (err: any) => {
          setMessage(`${language === 'es' ? 'Error al iniciar sesión' : 'Login error'}: ${err.message}`);
          setLoading(false);
        }
      });
      client.requestAccessToken({ prompt: 'select_account' });
    } catch (err: any) {
      setMessage(`${language === 'es' ? 'Error al iniciar OAuth' : 'OAuth init error'}: ${err.message}`);
      setLoading(false);
    }
  };

  const handleManualLink = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!adsUser || !adsPass) return;

    setLoading(true);
    setTimeout(async () => {
      const linkedData = {
        name: adsUser.split('@')[0],
        email: adsUser,
        picture: `https://ui-avatars.com/api/?name=${adsUser}&background=4285F4&color=fff`,
        accessToken: "manual_session_" + Math.random().toString(36).substr(2, 9),
        method: 'manual' as const
      };

      const updated = await authService.updateProfile(user.id, { linkedGoogleAds: linkedData });
      if (updated) {
        onUpdate(updated);
        setMessage(t.manualLinkSuccess);
        setAdsUser('');
        setAdsPass('');
      }
      setLoading(false);
    }, 1500);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const base64 = readerEvent.target?.result as string;
        setIsotypeUrl(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDisconnectGoogleAds = async () => {
    if (confirm(language === 'es' ? '¿Desvincular cuenta de Google Ads?' : 'Unlink Google Ads account?')) {
      const updated = await authService.updateProfile(user.id, { linkedGoogleAds: null as any });
      if (updated) {
        onUpdate(updated);
        setMessage(t.googleDisconnectSuccess);
        martechService.trackAdConnection('google_ads', 'disconnected', user.email);
      }
    }
  };

  const confirmPayPalPayment = () => {
    if (!checkoutTier) return;
    setLoading(true);
    setTimeout(async () => {
      const updated = await authService.setPlan(user.id, checkoutTier);
      if (updated) {
        onUpdate(updated);
        setMessage(`${t.paymentSuccess} ${checkoutTier} ${language === 'es' ? 'activada' : 'activated'}.`);
        setCheckoutTier(null);
        setTimeout(() => setMessage(''), 4000);
      }
      setLoading(false);
    }, 2500);
  };

  const isAdsSyncLocked = false; // Habilitado para todos los usuarios por requerimiento

  const handleDownloadData = async () => {
    try {
      setLoading(true);
      const { historyService } = await import('../services/historyService');
      const history = await historyService.getHistory(user.id);
      const dataExport = {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          subscription: user.subscription,
          brandProfile: user.brandProfile,
        },
        history: history,
        exportedAt: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(dataExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `insitu_data_${user.username}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setMessage(language === 'es' ? 'Datos exportados correctamente' : 'Data exported successfully');
    } catch (e) {
      setMessage(language === 'es' ? 'Error al exportar datos' : 'Error exporting data');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full max-w-5xl bg-slate-900/95 backdrop-blur-md rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative border border-white/10">

        {/* PayPal Checkout Overlay */}
        {checkoutTier && (
          <PaymentModal
            tier={checkoutTier}
            onClose={() => setCheckoutTier(null)}
            onSuccess={() => {
              setCheckoutTier(null);
              const updated = authService.getCurrentUser();
              if (updated) {
                onUpdate(updated);
                setMessage(`${language === 'es' ? '¡Suscripción' : 'Subscription'} ${updated.subscription.plan} ${language === 'es' ? 'activada con éxito!' : 'successfully activated!'}`);
                setTimeout(() => setMessage(''), 4000);
              }
            }}
          />
        )}

        {showTokenPurchase && (
          <TokenPurchaseModal 
            isOpen={showTokenPurchase}
            onClose={() => setShowTokenPurchase(false)}
            user={user}
            onSuccess={(tokens) => {
              // The update is already handled by backend, but we can optimistically update or sync
              const updated = authService.getCurrentUser();
              if (updated) onUpdate(updated);
            }}
          />
        )}

        {/* Modal Header */}
        <div className="p-10 border-b border-white/10 flex justify-between items-start bg-slate-900/50">
          <div className="flex items-center gap-4">
            <LogoIsotype className="w-10 h-10 text-[#ff477b]" />
            <div>
              <h2 className="text-3xl font-black text-white tracking-tighter leading-none">INsitu<span className="text-[#ff477b]">AI</span></h2>
              <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest mt-1">{t.accountCenter} • {t.status}: {user.approvalStatus === 'approved' ? t.verified : t.pending}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 rounded-full hover:bg-primary hover:text-white hover:border-primary transition-all text-slate-400 hover:text-rose-500 shadow-sm border border-white/10">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-10 pt-0 space-y-12 overflow-y-auto">
          {/* Upper Section Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

            {/* Auditor Preferences */}
            <div className="space-y-6">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                <span className="w-2.5 h-2.5 bg-[#ff477b] rounded-full mr-3"></span>
                {t.auditorPrefs}
              </h3>
              <div className="space-y-5">
                <div className="space-y-2">
                  <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">{t.publicName}</p>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:outline-none focus:border-[#ff477b] transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">{t.reportEmail}</p>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:outline-none focus:border-[#ff477b] transition-all"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">{t.newPass}</p>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t.noChanges}
                      className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-[#ff477b] transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">{t.confirm}</p>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t.confirm}
                      className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-[#ff477b] transition-all"
                    />
                  </div>
                </div>
                <button onClick={handleSave} className="w-full bg-[#ff477b] text-white py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-[#ff3366] transition-all shadow-xl shadow-[#ff477b]/20">
                    {loading ? t.saving : t.saveChanges}
                </button>
              </div>
            </div>

            {/* Google Ads Sync */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-black text-blue-500 uppercase tracking-widest flex items-center">
                  <span className="w-2.5 h-2.5 bg-blue-500 rounded-full mr-3"></span>
                  {t.googleSync}
                </h3>
              </div>

              <div className="bg-slate-950/50 border border-white/10 rounded-[2.5rem] p-8 flex flex-col justify-center min-h-[240px] relative overflow-hidden backdrop-blur-sm">

                {/* Blur Lock Overlay for Starter Plan */}
                {isAdsSyncLocked && (
                  <div className="absolute inset-0 z-20 bg-slate-950/60 backdrop-blur-[6px] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
                    <div className="w-16 h-16 bg-slate-900 rounded-full shadow-2xl flex items-center justify-center mb-6 border border-rose-500/20 group">
                      <svg className="w-8 h-8 text-rose-500 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-widest mb-1.5 leading-tight">
                        {t.googleSyncLocked}
                      </h4>
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-tighter">{t.googleSyncLockedDesc}</p>
                    </div>
                  </div>
                )}

                <div className={isAdsSyncLocked ? 'opacity-20 pointer-events-none grayscale' : ''}>
                  {user.linkedGoogleAds ? (
                    <div className="space-y-6">
                      <div className="flex items-center space-x-4">
                        <img src={user.linkedGoogleAds.picture} className="w-14 h-14 rounded-2xl border-2 border-white/10 shadow-md" alt="" />
                        <div>
                          <p className="text-sm font-black text-white">{user.linkedGoogleAds.name}</p>
                          <p className="text-[11px] font-bold text-slate-400">{user.linkedGoogleAds.email}</p>
                          <span className="text-[11px] font-black text-blue-500 uppercase tracking-widest mt-1 block">{t.googleSyncMethod}: {user.linkedGoogleAds.method}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-900/50 border border-white/10 rounded-xl">
                        <span className="text-[11px] font-black text-emerald-500 uppercase tracking-widest">{t.googleSyncActive}</span>
                        <button onClick={handleDisconnectGoogleAds} className="text-[11px] font-black text-rose-500 uppercase hover:underline">{t.disconnect}</button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-6">
                      <div className="w-12 h-12 bg-slate-900/50 rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-white/10">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12.545 11.027L21.114 11.027L21.114 14.129C21.114 20.326 16.92 24.643 11.114 24.643C5.023 24.643 0.114 19.734 0.114 13.643C0.114 7.552 5.023 2.643 11.114 2.643C14.074 2.643 16.557 3.731 18.452 5.511L15.939 7.939C14.654 6.702 13.064 6.045 11.114 6.045C7.261 6.045 4.114 9.278 4.114 13.643C4.114 18.008 7.261 21.241 11.114 21.241C15.602 21.241 17.273 18.023 17.557 16.125L11.114 16.125L11.114 13.023L12.545 11.027Z" /></svg>
                      </div>
                      <h4 className="text-xs font-black text-white uppercase tracking-widest">{t.secureLink}</h4>
                      <p className="text-[11px] text-slate-500 font-bold uppercase tracking-tight">{t.officialApi}</p>
                      <button
                        onClick={handleConnectGoogleAds}
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center space-x-2"
                      >
                        {loading ? t.connecting : t.linkGoogle}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Agency White Label Settings */}
            {user.subscription.plan === 'Agency' && (
              <div className="col-span-1 md:col-span-2 space-y-8 p-10 bg-indigo-500/5 rounded-[3rem] border border-indigo-500/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-black text-indigo-400 uppercase tracking-widest flex items-center">
                    <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full mr-3 animate-pulse"></span>
                    {t.agencyWhiteLabel}
                  </h3>
                  <span className="px-3 py-1 bg-indigo-500 text-white text-[11px] font-black rounded-full uppercase tracking-widest">Plan Agency</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">{t.agencyName}</p>
                      <input
                        type="text"
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                        placeholder={t.agencyPlaceholder}
                        className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:outline-none focus:border-indigo-500 transition-all"
                      />
                      <p className="text-[11px] text-slate-500 font-bold uppercase mt-1 italic">{t.agencyNote}</p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">{t.logoVisibility}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setIsotypeVisibility('both')}
                          className={`py-3 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all ${isotypeVisibility === 'both' ? 'bg-indigo-500 text-white border-indigo-400' : 'bg-slate-900 text-slate-500 border-white/5 hover:border-white/10'}`}
                        >
                          {t.logoBoth}
                        </button>
                        <button
                          onClick={() => setIsotypeVisibility('none')}
                          className={`py-3 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all ${isotypeVisibility === 'none' ? 'bg-indigo-500 text-white border-indigo-400' : 'bg-slate-900 text-slate-500 border-white/5 hover:border-white/10'}`}
                        >
                          {t.logoNone}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">{t.whiteLabelLogo}</p>
                    <div className="flex items-center gap-6">
                      <div className="w-24 h-24 bg-slate-950/80 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden group relative">
                        {isotypeUrl ? (
                          <>
                            <img src={isotypeUrl} className="w-full h-full object-contain p-2" alt="Agency Logo" />
                            <button
                              onClick={() => setIsotypeUrl('')}
                              className="absolute inset-0 bg-rose-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </>
                        ) : (
                          <svg className="w-8 h-8 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <label className="inline-block bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest cursor-pointer transition-all border border-white/5">
                          {t.selectLogo}
                          <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                        </label>
                        <p className="text-[11px] text-slate-500 font-bold uppercase mt-3 leading-relaxed">{t.logoFormats}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Brand Measurement / MarTech Settings */}
          <div className="space-y-8 p-10 bg-emerald-500/5 rounded-[3rem] border border-emerald-500/20 shadow-inner">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-black text-emerald-400 uppercase tracking-widest flex items-center">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full mr-3"></span>
                {language === 'es' ? 'MEDICIÓN Y PIXELES DE MARCA' : 'BRAND MEASUREMENT & PIXELS'}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Meta Pixel */}
              <div className="space-y-2">
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">Meta Pixel ID</p>
                <input
                  type="text"
                  value={user.brandProfile?.martechConfig?.metaPixelId || ''}
                  onChange={(e) => {
                    const up = { ...user.brandProfile, martechConfig: { ...user.brandProfile?.martechConfig, metaPixelId: e.target.value } };
                    onUpdate({ ...user, brandProfile: up as any });
                  }}
                  placeholder="1234567890"
                  className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>

              {/* GTM */}
              <div className="space-y-2">
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">Google Tag Manager ID</p>
                <input
                  type="text"
                  value={user.brandProfile?.martechConfig?.gtmId || ''}
                  onChange={(e) => {
                    const up = { ...user.brandProfile, martechConfig: { ...user.brandProfile?.martechConfig, gtmId: e.target.value } };
                    onUpdate({ ...user, brandProfile: up as any });
                  }}
                  placeholder="GTM-XXXXXXX"
                  className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>

              {/* TikTok */}
              <div className="space-y-2">
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">TikTok Pixel ID</p>
                <input
                  type="text"
                  value={user.brandProfile?.martechConfig?.tiktokPixelId || ''}
                  onChange={(e) => {
                    const up = { ...user.brandProfile, martechConfig: { ...user.brandProfile?.martechConfig, tiktokPixelId: e.target.value } };
                    onUpdate({ ...user, brandProfile: up as any });
                  }}
                  placeholder="C80..."
                  className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>

              {/* Google Ads Customer ID */}
              <div className="space-y-2">
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">Google Ads Customer ID</p>
                <input
                  type="text"
                  value={user.brandProfile?.martechConfig?.googleAdsId || ''}
                  onChange={(e) => {
                    const up = { ...user.brandProfile, martechConfig: { ...user.brandProfile?.martechConfig, googleAdsId: e.target.value } };
                    onUpdate({ ...user, brandProfile: up as any });
                  }}
                  placeholder="123-456-7890"
                  className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>

              {/* Conversion API Tokens (Encrypted UI) */}
              <div className="col-span-1 md:col-span-3 pt-4 border-t border-white/5 space-y-6">
                 <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none">Configuración de Conversion API (CAPI)</p>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">Meta CAPI Data Access Token</p>
                      <input
                        type="password"
                        value={user.brandProfile?.martechConfig?.metaAccessToken || ''}
                        onChange={(e) => {
                          const up = { ...user.brandProfile, martechConfig: { ...user.brandProfile?.martechConfig, metaAccessToken: e.target.value } };
                          onUpdate({ ...user, brandProfile: up as any });
                        }}
                        placeholder="••••••••••••••••"
                        className="w-full bg-slate-950/20 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:outline-none focus:border-indigo-500 transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">TikTok API Access Token</p>
                      <input
                        type="password"
                        value={user.brandProfile?.martechConfig?.tiktokAccessToken || ''}
                        onChange={(e) => {
                          const up = { ...user.brandProfile, martechConfig: { ...user.brandProfile?.martechConfig, tiktokAccessToken: e.target.value } };
                          onUpdate({ ...user, brandProfile: up as any });
                        }}
                        placeholder="••••••••••••••••"
                        className="w-full bg-slate-950/20 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:outline-none focus:border-indigo-500 transition-all"
                      />
                    </div>
                 </div>

                 <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-4">
                    <Globe className="w-5 h-5 text-emerald-500" />
                    <p className="text-[10px] text-emerald-100/60 font-bold uppercase tracking-tight leading-relaxed">
                      {language === 'es' 
                        ? 'Los tokens de CAPI permiten una medición precisa de eventos (Suscripciones, Registros) directamente desde nuestros servidores hacia Meta y TikTok, evitando bloqueos de navegadores.'
                        : 'CAPI tokens allow precise event measurement (Subscriptions, Leads) directly from our servers to Meta and TikTok, bypassing browser blockers.'}
                    </p>
                 </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Regular Tokens Block */}
            <div className="space-y-8 p-10 bg-pink-500/5 rounded-[3rem] border border-pink-500/20 shadow-inner">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-pink-500/20 rounded-2xl flex items-center justify-center border border-pink-500/10">
                    <svg className="w-6 h-6 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-[11px] font-black text-pink-400 uppercase tracking-widest leading-none mb-1.5">Tokens Adicionales</h3>
                    <p className="text-slate-400 text-[11px] font-bold uppercase tracking-tighter">Consumo de plan mensual</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                   <div className="text-right">
                      <p className="text-[11px] font-black text-white leading-none">{(user.usageLimit - user.totalTokensUsed).toLocaleString()} <span className="text-slate-500 text-[11px]">SOLO</span></p>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter mt-1">Disponibles</p>
                   </div>
                   <button 
                    onClick={() => setShowTokenPurchase(true)}
                    className="px-6 py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[11px] font-black rounded-2xl uppercase tracking-widest transition-all shadow-lg shadow-pink-500/25 hover:scale-105 active:scale-95"
                   >
                     Comprar
                   </button>
                </div>
              </div>
              <div className="space-y-3">
                <div className="w-full bg-slate-950/50 h-3 rounded-full overflow-hidden border border-white/5 relative">
                    <div 
                      className="bg-gradient-to-r from-pink-500 via-rose-500 to-violet-500 h-full transition-all duration-1000" 
                      style={{ width: `${Math.min(100, (user.totalTokensUsed / user.usageLimit) * 100)}%` }}
                    />
                </div>
                <div className="flex justify-between items-center px-1">
                  <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                    {user.totalTokensUsed.toLocaleString()} <span className="text-slate-700">Utilizados</span>
                  </p>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    Límite: {user.usageLimit.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Gamification / Bonus Tokens Block */}
            <div className="space-y-8 p-10 bg-amber-500/5 rounded-[3rem] border border-amber-500/20 shadow-inner relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center border border-amber-500/10">
                    <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-[11px] font-black text-amber-400 uppercase tracking-widest leading-none mb-1.5">Tokens de Bonus</h3>
                    <p className="text-slate-400 text-[11px] font-bold uppercase tracking-tighter">Programa de Referidos</p>
                  </div>
                </div>
                <div className="text-right">
                   <p className="text-[20px] font-black text-amber-500 leading-none">{(user.bonus_tokens || 0).toLocaleString()} <span className="text-amber-500/50 text-[11px]">TKNS</span></p>
                   <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter mt-1">Disponibles ahora</p>
                </div>
              </div>

              <div className="space-y-4 relative z-10">
                <div className="p-4 bg-slate-950/40 rounded-2xl border border-white/5">
                  <p className="text-[11px] text-slate-400 font-bold leading-relaxed mb-3">
                    Gana <strong className="text-amber-400">Tokens extra de por vida</strong> refiriendo a tus colegas. Comparte este link exclusivo y gana el 5% de su plan:
                  </p>
                  <div className="flex items-center gap-3">
                    <input 
                      type="text" 
                      readOnly 
                      value={`https://app.insitu.company/?ref=${user.id}`} 
                      className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 px-4 text-xs font-bold text-slate-300 outline-none"
                    />
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`https://app.insitu.company/?ref=${user.id}`);
                        setMessage("¡Link copiado al portapapeles!");
                        setTimeout(() => setMessage(''), 3000);
                      }}
                      className="p-3 bg-amber-500/20 text-amber-400 rounded-xl hover:bg-amber-500 hover:text-white transition-colors whitespace-nowrap border border-amber-500/20"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-between items-center px-1">
                  <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                    Los tokens bonus se <span className="text-amber-500 font-bold">consumen primero</span>.
                  </p>
                  <p className="text-[11px] flex items-center gap-1 font-black text-slate-400 uppercase tracking-widest">
                    Histórico ganado: <span className="text-white">{(user.total_bonus_earned || 0).toLocaleString()}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* PayPal Subscription Section */}
          <div className="space-y-8">
            <h3 className="text-[11px] font-black text-emerald-600 uppercase tracking-widest flex items-center">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full mr-3"></span>
              {t.paypalManagement}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((p) => {
                const isActive = user.subscription.plan === p.tier;
                return (
                  <div
                    key={p.tier}
                    className={`p-10 rounded-[2.5rem] border-2 transition-all flex flex-col relative overflow-hidden backdrop-blur-sm ${isActive ? 'border-[#ff477b] bg-slate-950/50' : 'border-white/10 bg-slate-900/30 hover:border-white/20'
                      }`}
                  >
                    <div className="flex justify-between items-center mb-6">
                      <p className={`text-[11px] font-black uppercase tracking-widest ${isActive ? 'text-[#ff477b]' : 'text-slate-400'}`}>
                        {p.tier}
                      </p>
                      {isActive && (
                        <span className="text-[11px] bg-[#ff477b] text-white px-3 py-1 rounded-full font-black uppercase tracking-widest animate-in zoom-in-95">
                          {t.activePlan}
                        </span>
                      )}
                    </div>
                    <div className="mb-8">
                      <h4 className="text-5xl font-black text-white mb-1">${p.price}</h4>
                      <p className="text-[11px] font-bold text-slate-400 uppercase leading-tight tracking-tight">{p.desc}</p>
                    </div>
                    <button
                      onClick={() => setCheckoutTier(p.tier)}
                      disabled={loading || isActive}
                      className={`w-full py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${isActive
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 cursor-default'
                        : 'bg-[#ff477b] text-white hover:bg-[#ff3366] shadow-lg shadow-[#ff477b]/20'
                        }`}
                    >
                      {isActive ? t.currentPlan : t.upgradePlan}
                    </button>

                    {/* Shadow overlay for Active plan as seen in screenshot */}
                    {isActive && (
                      <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-[#ff477b]/10 to-transparent pointer-events-none"></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Data Export / Privacy Section */}
          <div className="space-y-8 p-10 bg-cyan-500/5 rounded-[3rem] border border-cyan-500/20 shadow-inner mt-8">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-black text-cyan-400 uppercase tracking-widest flex items-center">
                <span className="w-2.5 h-2.5 bg-cyan-500 rounded-full mr-3"></span>
                {language === 'es' ? 'GESTIÓN DE DATOS Y PRIVACIDAD' : 'DATA & PRIVACY MANAGEMENT'}
              </h3>
            </div>
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                  {language === 'es' 
                    ? 'Exporta una copia completa de tu información, incluyendo preferencias, configuración de marca, tokens y el historial completo de auditorías guardadas en la base de datos de INsitu AI.'
                    : 'Export a complete copy of your information, including preferences, brand settings, tokens, and the full history of audits saved in the INsitu AI database.'}
                </p>
              </div>
              <button
                onClick={handleDownloadData}
                disabled={loading}
                className="w-full md:w-auto px-8 py-5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-cyan-500/5 active:scale-95 flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {language === 'es' ? 'Descargar Historial y Datos' : 'Download History & Data'}
              </button>
            </div>
          </div>

          {/* Download Desktop App Section */}
          <div className="space-y-8 p-10 bg-violet-500/5 rounded-[3rem] border border-violet-500/20 shadow-inner mt-8">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-black text-violet-400 uppercase tracking-widest flex items-center">
                <span className="w-2.5 h-2.5 bg-violet-500 rounded-full mr-3"></span>
                {language === 'es' ? 'DESCARGAR APLICACIÓN DE ESCRITORIO' : 'DOWNLOAD DESKTOP APP'}
              </h3>
            </div>
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                  {language === 'es' 
                    ? 'Descarga la versión local para ejecutar modelos de IA directamente en tu equipo (Ollama) garantizando máxima privacidad para tus datos y campañas sensibles.'
                    : 'Download the local version to run AI models directly on your device (Ollama) ensuring maximum privacy for your sensitive data and campaigns.'}
                </p>
              </div>
              <div className="flex gap-4 w-full md:w-auto flex-col md:flex-row">
                <a
                  href="https://github.com/quiciopuerta/INsitu-AI-2/releases/latest"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 md:flex-none px-6 py-5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/20 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-violet-500/5 active:scale-95 flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Mac OS
                </a>
                <a
                  href="https://github.com/quiciopuerta/INsitu-AI-2/releases/latest"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 md:flex-none px-6 py-5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/20 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-violet-500/5 active:scale-95 flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  Windows
                </a>
              </div>
            </div>
          </div>

          {message && (
            <div className={`p-5 mt-8 rounded-2xl text-[11px] font-black uppercase tracking-widest text-center animate-in slide-in-from-top-4 ${message.includes('coinciden') || message.includes('Error') ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 border border-emerald-100 text-emerald-600'}`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileView;

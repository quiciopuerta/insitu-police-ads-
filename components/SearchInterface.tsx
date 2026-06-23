import { useState, useEffect } from "react";
import { sanitizeURL } from "../utils/securityUtils";

import {
  COUNTRIES,
  AD_OBJECTIVES,
  SEARCH_PERIODS,
  TRANSLATIONS,
} from "../constants";
import { Language } from "../types";
import { Globe, Lightbulb, Target, Calendar, Sparkles, Link as LinkIcon, AlertCircle } from "lucide-react";
import { userService } from "../services/auth/userService";
import { FeatureGate } from "./ui/FeatureGate";
import TutorialBubble, { TutorialTrigger } from "./ui/TutorialBubble";
import { useTutorial } from "../hooks/useTutorial";

interface SearchInterfaceProps {
  onSearch: (
    theme: string,
    country: string,
    objective: string,
    period: string,
    landingUrl?: string,
  ) => void;
  isLoading: boolean;
  language: Language;
  initialValues?: {
    theme: string;
    country: string;
    objective: string;
    period: string;
    optimizationLayer?: string;
    landingUrl?: string;
  };
  onNavigateToOptimizer?: () => void;
}

const SearchInterface: React.FC<SearchInterfaceProps> = ({
  onSearch,
  isLoading,
  language,
  initialValues,
  onNavigateToOptimizer,
}) => {
  const t = TRANSLATIONS[language];
  const tutorial = useTutorial('search-interface', language);
  const [theme, setTheme] = useState("");
  const [country, setCountry] = useState("Global");
  const [objective, setObjective] = useState(AD_OBJECTIVES[0].label);
  const [period, setPeriod] = useState(SEARCH_PERIODS[2].label);
  const [landingUrl, setLandingUrl] = useState("");
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [limitReason, setLimitReason] = useState("");

  const currentUser = userService.getCurrentUser();

  useEffect(() => {
    if (currentUser) {
      const check = userService.checkPlanLimits(currentUser, 'text');
      if (!check.allowed) {
        setIsLimitReached(true);
        setLimitReason(check.reason || "");
      }
    }
  }, [currentUser]);

  // Sincronizar con valores iniciales cuando se carga desde el historial
  useEffect(() => {
    if (initialValues) {
      setTheme(initialValues.theme);
      setCountry(initialValues.country);
      setObjective(initialValues.objective);
      setPeriod(initialValues.period);
      if (initialValues.landingUrl) {
        setLandingUrl(initialValues.landingUrl);
      }
    }
  }, [initialValues]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (theme.trim()) {
      if (isLimitReached) {
        // Upgrade already visible via FeatureGate
        return;
      }
      onSearch(theme, country, objective, period, sanitizeURL(landingUrl));
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto no-print">
      {/* Tutorial Bubble */}
      <TutorialBubble
        steps={tutorial.steps}
        currentStep={tutorial.currentStep}
        isVisible={tutorial.isVisible}
        language={language}
        onNext={tutorial.next}
        onPrev={tutorial.prev}
        onGoTo={tutorial.goTo}
        onDismiss={tutorial.dismiss}
      />
      <div className="glass-card rounded-[2.5rem] border border-white/10 p-6 md:p-14 overflow-hidden relative">
        <FeatureGate
          user={currentUser}
          allowedPlans={['Starter', 'Growth', 'Agency']}
          featureName={language === 'es' ? 'Auditoría de Search' : 'Search Audit'}
          language={language}
          onUpgrade={() => (window as any).dispatchGlobalEvent?.('OPEN_PRICING')} 
          forceLock={isLimitReached}
        >
          <form
            onSubmit={handleSubmit}
            className="relative z-10 space-y-10 md:space-y-12"
          >
            {/* Optimizer Helper Banner */}
            {onNavigateToOptimizer && (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-blue-500/5 border border-blue-500/10 rounded-[2rem] group hover:bg-blue-500/10 transition-all duration-500 animate-in fade-in slide-in-from-top-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl ${currentUser?.linkedGoogleAds ? 'bg-green-500' : 'bg-blue-500'} text-white flex items-center justify-center shadow-lg transition-transform group-hover:scale-110`}>
                    <Target className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm">
                      {currentUser?.linkedGoogleAds 
                        ? (language === 'es' ? 'Google Ads Vinculado' : 'Google Ads Linked')
                        : (language === 'es' ? '¿Quieres auditar una cuenta propia?' : 'Want to audit your own account?')}
                    </h4>
                    <p className="text-slate-400 text-xs">
                      {currentUser?.linkedGoogleAds
                        ? (language === 'es' ? 'Audita tus campañas reales directamente desde el Optimizador.' : 'Audit your real campaigns directly from the Optimizer.')
                        : (language === 'es' ? 'Vincula tu cuenta para análisis directos y optimización real.' : 'Link your account for direct analysis and real optimization.')}
                    </p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={onNavigateToOptimizer}
                  className="px-6 py-2.5 bg-white text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-wider hover:bg-[#ff477b] hover:text-white transition-all shadow-xl active:scale-95 whitespace-nowrap"
                >
                  {currentUser?.linkedGoogleAds 
                    ? (language === 'es' ? 'Ir al Optimizador' : 'Go to Optimizer')
                    : (language === 'es' ? 'Vincular Ahora' : 'Link Now')}
                </button>
              </div>
            )}
            {/* Form content omitted for brevity but preserved in replacement */}
            <div className="space-y-4">
              <label className="flex items-center space-x-2 text-[11px] md:text-xs uppercase font-black text-slate-400 tracking-[0.2em]">
                <span className="bg-[#ff477b] text-white w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-[11px] md:text-[11px]">
                  1
                </span>
                {language === "es"
                  ? "Términos Clave y Nicho de Mercado"
                  : "Keywords and Market Niche"}
              </label>
              <input
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder={
                  language === "es"
                    ? "Ej: Cursos de marketing, Venta de repuestos, etc..."
                    : "Ex: Marketing courses, Spare parts sales, etc..."
                }
                disabled={isLoading}
                className="w-full bg-slate-900/50 border-2 border-slate-700/50 rounded-3xl py-6 px-8 md:py-8 md:px-10 focus:outline-none focus:border-[#00f2fe] neon-cyan-glow transition-all text-white text-lg md:text-3xl font-bold placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-4">
              <label className="flex items-center space-x-2 text-[11px] uppercase font-black text-slate-400 tracking-[0.2em]">
                <span className="bg-indigo-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[11px]">
                  !
                </span>
                {language === "es"
                  ? "URL de Aterrizaje (Opcional)"
                  : "Landing URL (Optional)"}
              </label>
              <div className="relative group/url">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/url:text-[#ff477b] transition-colors">
                  <LinkIcon className="w-5 h-5" />
                </div>
                <input
                  type="url"
                  value={landingUrl}
                  onChange={(e) => setLandingUrl(e.target.value)}
                  placeholder="https://su-sitio-web.com/landing"
                  disabled={isLoading}
                  className="w-full bg-slate-900/50 border-2 border-slate-700/50 rounded-2xl py-5 pl-14 pr-6 focus:outline-none focus:border-[#ff477b] transition-all text-white text-sm font-medium placeholder:text-slate-500"
                />
                {landingUrl && !landingUrl.startsWith('http') && (
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2 text-yellow-500/70">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-[11px] font-bold uppercase tracking-widest hidden md:inline">URL Incompleta</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <label className="text-[11px] uppercase font-black text-slate-400 tracking-widest">
                  {t.country}
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full bg-slate-900/50 border-2 border-slate-700/50 rounded-[2rem] py-6 px-8 text-lg font-bold outline-none focus:border-[#ff477b] transition-all appearance-none cursor-pointer hover:border-slate-500 text-white [&>option]:bg-slate-900 [&>optgroup]:bg-slate-900"
                >
                  <option value="Global">🌐 Global (Worldwide)</option>
                  <optgroup label="North America">
                    <option value="United States">🇺🇸 United States</option>
                    <option value="Canada">🇨🇦 Canada</option>
                    <option value="Mexico">🇲🇽 Mexico</option>
                  </optgroup>
                  <optgroup label="Latam & South America">
                    <option value="Argentina">🇦🇷 Argentina</option>
                    <option value="Bolivia">🇧🇴 Bolivia</option>
                    <option value="Brazil">🇧🇷 Brazil</option>
                    <option value="Chile">🇨🇱 Chile</option>
                    <option value="Colombia">🇨🇴 Colombia</option>
                    <option value="Costa Rica">🇨🇷 Costa Rica</option>
                    <option value="Dominican Republic">
                      🇩🇴 Dominican Republic
                    </option>
                    <option value="Ecuador">🇪🇨 Ecuador</option>
                    <option value="El Salvador">🇸🇻 El Salvador</option>
                    <option value="Guatemala">🇬🇹 Guatemala</option>
                    <option value="Honduras">🇭🇳 Honduras</option>
                    <option value="Panama">🇵🇦 Panama</option>
                    <option value="Paraguay">🇵🇾 Paraguay</option>
                    <option value="Peru">🇵🇪 Peru</option>
                    <option value="Uruguay">🇺🇾 Uruguay</option>
                    <option value="Venezuela">🇻🇪 Venezuela</option>
                  </optgroup>
                  <optgroup label="Europe">
                    <option value="Austria">🇦🇹 Austria</option>
                    <option value="Belgium">🇧🇪 Belgium</option>
                    <option value="Bulgaria">🇧🇬 Bulgaria</option>
                    <option value="Croatia">🇭🇷 Croatia</option>
                    <option value="Czech Republic">🇨🇿 Czech Republic</option>
                    <option value="Denmark">🇩🇰 Denmark</option>
                    <option value="Finland">🇫🇮 Finland</option>
                    <option value="France">🇫🇷 France</option>
                    <option value="Germany">🇩🇪 Germany</option>
                    <option value="Greece">🇬🇷 Greece</option>
                    <option value="Hungary">🇭🇺 Hungary</option>
                    <option value="Ireland">🇮🇪 Ireland</option>
                    <option value="Italy">🇮🇹 Italy</option>
                    <option value="Netherlands">🇳🇱 Netherlands</option>
                    <option value="Norway">🇳🇴 Norway</option>
                    <option value="Poland">🇵🇱 Poland</option>
                    <option value="Portugal">🇵🇹 Portugal</option>
                    <option value="Romania">🇷🇴 Romania</option>
                    <option value="Russia">🇷🇺 Russia</option>
                    <option value="Serbia">🇷🇸 Serbia</option>
                    <option value="Slovakia">🇸🇰 Slovakia</option>
                    <option value="Spain">🇪🇸 Spain</option>
                    <option value="Sweden">🇸🇪 Sweden</option>
                    <option value="Switzerland">🇨🇭 Switzerland</option>
                    <option value="Turkey">🇹🇷 Turkey</option>
                    <option value="Ukraine">🇺🇦 Ukraine</option>
                    <option value="United Kingdom">🇬🇧 United Kingdom</option>
                  </optgroup>
                  <optgroup label="Asia Pacific">
                    <option value="Australia">🇦🇺 Australia</option>
                    <option value="China">🇨🇳 China</option>
                    <option value="Hong Kong">🇭🇰 Hong Kong</option>
                    <option value="India">🇮🇳 India</option>
                    <option value="Indonesia">🇮🇩 Indonesia</option>
                    <option value="Japan">🇯🇵 Japan</option>
                    <option value="Malaysia">🇲🇾 Malaysia</option>
                    <option value="New Zealand">🇳🇿 New Zealand</option>
                    <option value="Philippines">🇵🇭 Philippines</option>
                    <option value="Singapore">🇸🇬 Singapore</option>
                    <option value="South Korea">🇰🇷 South Korea</option>
                    <option value="Taiwan">🇹🇼 Taiwan</option>
                    <option value="Thailand">🇹🇭 Thailand</option>
                    <option value="Vietnam">🇻🇳 Vietnam</option>
                  </optgroup>
                  <optgroup label="Middle East & Africa">
                    <option value="Egypt">🇪🇬 Egypt</option>
                    <option value="Israel">🇮🇱 Israel</option>
                    <option value="Morocco">🇲🇦 Morocco</option>
                    <option value="Nigeria">🇳🇬 Nigeria</option>
                    <option value="Saudi Arabia">🇸🇦 Saudi Arabia</option>
                    <option value="South Africa">🇿🇦 South Africa</option>
                    <option value="United Arab Emirates">
                      🇦🇪 United Arab Emirates
                    </option>
                  </optgroup>
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[11px] uppercase font-black text-slate-400 tracking-widest">
                  {t.objective}
                </label>
                <select
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  className="w-full bg-slate-900/50 border-2 border-slate-700/50 rounded-[2rem] py-6 px-8 text-lg font-bold outline-none focus:border-[#ff477b] transition-all appearance-none cursor-pointer hover:border-slate-500 text-white [&>option]:bg-slate-900"
                >
                  {AD_OBJECTIVES.map((obj) => (
                    <option key={obj.id} value={obj.label}>
                      {obj.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[11px] uppercase font-black text-slate-400 tracking-widest">
                  {t.period}
                </label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full bg-slate-900/50 border-2 border-slate-700/50 rounded-[2rem] py-6 px-8 text-lg font-bold outline-none focus:border-[#ff477b] transition-all appearance-none cursor-pointer hover:border-slate-500 text-white [&>option]:bg-slate-900"
                >
                  {SEARCH_PERIODS.map((p) => (
                    <option key={p.id} value={p.label}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <button
                type="submit"
                disabled={isLoading || !theme.trim()}
                className="w-full bg-slate-900 text-white py-3.5 md:py-6 rounded-2xl md:rounded-3xl font-black text-sm md:text-lg hover:bg-primary hover:text-white hover:border-primary transition-all shadow-2xl flex items-center justify-center space-x-2 md:space-x-4 uppercase tracking-[0.1em] md:tracking-widest relative overflow-hidden group"
              >
                {isLoading ? (
                  <>
                    <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>{t.investigating}</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="h-6 w-6 text-[#ff477b] group-hover:text-white transition-colors"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    <span>{t.run_audit}</span>
                  </>
                )}
              </button>
              <div className="flex justify-center flex-col items-center space-y-4">
                <span className="text-[11px] md:text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-800/50 px-3 py-1 rounded-full border border-white/5">
                  {language === 'es' ? 'Consumo estimado: ~50 tokens' : 'Estimated cost: ~50 tokens'}
                </span>
                
                <div className="mt-4 bg-[#ff477b]/10 border border-[#ff477b]/20 rounded-xl p-4 md:p-5 max-w-3xl text-center">
                  <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-medium">
                    {language === 'es' 
                      ? 'insitu.company audita competidores basándose en datos reales de subasta y comportamiento del mercado en tiempo real. A diferencia de Google Keyword Planner, no mostramos estimaciones globales infladas para incentivar clics, analizamos tu estado competitivo actual.'
                      : 'insitu.company audits competitors based on actual auction data and real-time market behavior. Unlike Google Keyword Planner, we do not show inflated global estimates to incentivize clicks, we analyze your true competitive state.'}
                  </p>
                </div>
              </div>
            </div>
          </form>
        </FeatureGate>
      </div>
      {/* Tutorial re-trigger badge */}
      <div className="flex justify-center mt-4">
        <TutorialTrigger
          isDismissed={tutorial.isDismissed}
          isVisible={tutorial.isVisible}
          language={language}
          onShow={() => tutorial.restart()}
          onRestart={tutorial.restart}
        />
      </div>
    </div>
  );
};

export default SearchInterface;

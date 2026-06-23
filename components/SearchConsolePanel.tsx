import { useState } from "react";
import { motion } from "framer-motion";
import { getSearchConsoleData } from "../services/googleAdsService";
import { seoAnalysisService, SearchConsoleAIResult } from "../services/ai/seoAnalysisService";
import { AuthUser, Language } from "../types";
import { authService } from "../services/authService";

interface SearchConsolePanelProps {
  user: AuthUser | null;
  language: Language;
}

export const SearchConsolePanel: React.FC<SearchConsolePanelProps> = ({ user, language }) => {
  const [siteUrl, setSiteUrl] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [gscData, setGscData] = useState<any>(null);
  const [aiResult, setAiResult] = useState<SearchConsoleAIResult | null>(null);
  const [error, setError] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Intentar cargar el token de la sesión automáticamente
  useState(() => {
    const savedAdsUser = sessionStorage.getItem("insitu_ads_user");
    const currentUser = authService.getCurrentUser();
    if (savedAdsUser) {
      const parsedUser = JSON.parse(savedAdsUser);
      setAccessToken(parsedUser.accessToken);
    } else if (currentUser?.linkedGoogleAds?.accessToken) {
      setAccessToken(currentUser.linkedGoogleAds.accessToken);
    } else {
      setAccessToken(""); // empty by default
    }
  });

  const handleFetchData = async (e: React.FormEvent) => {
    e.preventDefault();
    const tokenToUse = accessToken || "demo_token";
    if (!siteUrl) return;
    setLoading(true);
    setError("");
    try {
      // 1. Fetch raw Google Search Console data via API endpoint
      const rawData = await getSearchConsoleData(tokenToUse, siteUrl);
      if (!rawData) throw new Error("No data returned or access denied.");
      setGscData(rawData);

      // 2. Pass data to the AI agent for SEO gap analysis
      const analysis = await seoAnalysisService.analyzeSearchConsoleData(rawData, language);
      setAiResult(analysis);

    } catch (err: any) {
      setError(err.message || "Error al conectar con Google Search Console");
    } finally {
      setLoading(false);
    }
  };

  const isEs = language === "es";

  return (
    <div className="w-full glass-panel rounded-[3rem] p-8 md:p-12 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="relative z-10 space-y-8">
        <div className="text-center md:text-left flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-white/5">
          <div>
            <h2 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter mb-2">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-600">
                Search Console
              </span>{" "}
              {isEs ? "Agente SEO" : "SEO Agent"}
            </h2>
            <p className="text-slate-400 text-sm font-medium">
              {isEs
                ? "Conecta tu GSC y permite que SearchIntel AI descubra Gaps de contenido."
                : "Connect your GSC and let SearchIntel AI precisely audit content gaps."}
            </p>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleFetchData} className="grid md:grid-cols-2 gap-4 items-end">
          <div className="md:col-span-1">
            <label className="text-[10px] font-black tracking-widest text-slate-500 uppercase ml-4 mb-2 block">
              {isEs ? "URL del Sitio" : "Site URL"}
            </label>
            <input
              type="url"
              required
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              placeholder="https://insitu.company/"
              className="w-full bg-white/5 border border-white/10 rounded-full py-4 px-6 text-white focus:border-green-500 outline-none"
            />
          </div>
          <div className="md:col-span-1 flex items-center gap-4">
             <button
               type="submit"
               disabled={loading}
               className="w-full md:w-auto px-8 py-4 bg-green-600 hover:bg-green-500 text-white rounded-full font-black uppercase text-[11px] tracking-widest shadow-lg transition-all"
             >
               {loading ? "..." : (isEs ? "Auditar GSC" : "Audit GSC")}
             </button>
             
             <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-[10px] text-slate-500 hover:text-white uppercase font-bold tracking-widest">
               {isEs ? "Avanzado" : "Advanced"}
             </button>
          </div>
          
          {showAdvanced && (
            <div className="md:col-span-2 mt-4 p-4 bg-white/5 rounded-2xl border border-white/10">
              <label className="text-[10px] font-black tracking-widest text-slate-500 uppercase ml-4 mb-2 block">
                {isEs ? "Access Token (OAuth)" : "Access Token (OAuth)"}
              </label>
              <input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Auto-detected (leave empty for Demo)"
                className="w-full bg-slate-900/50 border border-white/10 rounded-full py-3 px-6 text-slate-400 focus:border-green-500 outline-none text-sm"
              />
              <p className="text-[10px] text-slate-500 mt-2 ml-4">
                * Si dejas esto vacío, usaremos los datos de simulación interactiva ("Demo Mode").
              </p>
            </div>
          )}
        </form>

        {error && (
           <div className="p-4 bg-red-500/10 border border-red-500/50 text-red-400 rounded-2xl text-sm font-bold">
             {error}
           </div>
        )}

        {/* Results */}
        {aiResult && gscData && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 mt-12">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-3xl text-center">
                  <div className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-2">Technical Health</div>
                  <div className="text-3xl font-black text-emerald-400">{aiResult.performanceScore}/100</div>
                </div>
                <div className="p-6 bg-blue-500/10 border border-blue-500/30 rounded-3xl text-center">
                  <div className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-2">E-E-A-T Authority</div>
                  <div className="text-3xl font-black text-blue-400">{aiResult.eeatScore || 0}/100</div>
                </div>
                <div className="p-6 bg-slate-500/10 border border-white/5 rounded-3xl text-center">
                  <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Visibility Index</div>
                  <div className="text-3xl font-black text-white">{(gscData.summary?.totalClicks / (gscData.summary?.totalImpressions || 1) * 100).toFixed(2)}%</div>
                </div>
             </div>

             {/* ─── TL;DR: RESUMEN EJECUTIVO ─── */}
             {aiResult.tldr && (
               <section className="relative p-8 rounded-[2.5rem] bg-gradient-to-br from-green-500/10 via-emerald-600/5 to-transparent border border-green-500/20 overflow-hidden shadow-2xl">
                 <div className="absolute top-0 right-0 p-4 opacity-20">
                   <svg className="w-12 h-12 text-green-400" fill="currentColor" viewBox="0 0 24 24"><path d="M14 17h6v2h-6v-2zm-8-4h14v2H6v-2zm0-4h14v2H6V9zm0-4h14v2H6V5z"/></svg>
                 </div>
                 <h3 className="text-sm font-black uppercase text-green-400 tracking-widest mb-4 flex items-center gap-2">
                   <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                   {isEs ? "TL;DR: RESUMEN EJECUTIVO" : "TL;DR: EXECUTIVE SUMMARY"}
                 </h3>
                 <div className="text-slate-200 text-lg font-medium leading-relaxed whitespace-pre-wrap">
                   {aiResult.tldr}
                 </div>
               </section>
             )}

             {/* ─── CANNIBALIZATION REPORT ─── */}
             {aiResult.cannibalizationReport && (
               <section className="p-8 rounded-[2.5rem] bg-rose-500/5 border border-rose-500/20">
                 <h3 className="text-sm font-black uppercase text-rose-400 tracking-widest mb-4 flex items-center gap-2">
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                   {isEs ? "REPORTE DE CANNIBALIZACIÓN" : "CANNIBALIZATION REPORT"}
                 </h3>
                 <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap italic">
                   {aiResult.cannibalizationReport}
                 </div>
               </section>
             )}

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="p-8 bg-white/5 rounded-3xl border border-white/10">
                 <h4 className="text-sm font-black uppercase text-green-400 mb-6 flex items-center gap-2">
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                   {isEs ? "Plan de Acción AI" : "AI Action Plan"}
                 </h4>
                 <div className="prose prose-invert prose-sm text-slate-300">
                    <p>{aiResult.analysis}</p>
                 </div>
               </div>

               <div className="p-8 bg-white/5 rounded-3xl border border-white/10">
                  <h4 className="text-sm font-black uppercase text-rose-400 mb-6 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    {isEs ? "Gaps de Contenido Críticos" : "Critical Content Gaps"}
                  </h4>
                  <ul className="space-y-3">
                    {aiResult.contentGaps.map((gap: string, i: number) => (
                      <li key={i} className="flex gap-3 text-sm text-slate-300">
                        <span className="text-rose-500 mt-1">•</span> {gap}
                      </li>
                    ))}
                  </ul>
               </div>
             </div>
             
             {aiResult.keywordOpportunities.length > 0 && (
               <div className="mt-8 bg-white/5 rounded-3xl border border-white/10 overflow-hidden">
                 <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <tr>
                        <th className="px-6 py-4">Keyword</th>
                        <th className="px-6 py-4">Action</th>
                        <th className="px-6 py-4">Search Intent</th>
                        <th className="px-6 py-4">AI Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {aiResult.keywordOpportunities.map((op, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-bold text-white">{op.keyword}</td>
                          <td className="px-6 py-4 text-emerald-400 font-bold">{op.action}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              op.intent === 'TRANSACTIONAL' ? 'bg-rose-500/20 text-rose-400' :
                              op.intent === 'COMMERCIAL' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                              {op.intent || 'INFORMATIONAL'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-400">{op.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
               </div>
             )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

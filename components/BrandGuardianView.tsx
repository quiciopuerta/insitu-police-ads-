import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BrandAsset,
  BrandBrief,
  BriefAnalysisResult,
  Language,
} from "../types";
import { TRANSLATIONS } from "../constants";
import { auditBrandBrief } from "../services/geminiService";
import { martechService } from "../services/martechService";

const BrandGuardianView: React.FC<{ language?: Language }> = ({
  language = "es",
}) => {
  const t = TRANSLATIONS[language];
  const [activeSubTab, setActiveSubTab] = useState<"inventory" | "briefing">(
    "inventory",
  );

  // Brand Book State
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [assetName, setAssetName] = useState("");
  const [assetType, setAssetType] = useState<"logo" | "color" | "font" | "pdf">(
    "logo",
  );
  const [assetValue, setAssetValue] = useState("");
  const [assetSource, setAssetSource] = useState<"upload" | "drive">("upload");
  const [isUploading, setIsUploading] = useState(false);

  // Briefing State
  const [brief, setBrief] = useState<BrandBrief>({
    projectName: "",
    targetAudience: "",
    toneOfVoice: "",
    mainObjective: "",
    competitors: "",
    uniqueSellingPoint: "",
  });
  const [isAuditingBrief, setIsAuditingBrief] = useState(false);
  const [briefAnalysis, setBriefAnalysis] =
    useState<BriefAnalysisResult | null>(null);

  useEffect(() => {
    const savedAssets = localStorage.getItem("insitu_brand_assets");
    if (savedAssets) setAssets(JSON.parse(savedAssets));
  }, []);

  useEffect(() => {
    localStorage.setItem("insitu_brand_assets", JSON.stringify(assets));
  }, [assets]);

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName || !assetValue) return;

    setIsUploading(true);
    setTimeout(() => {
      const newAsset: BrandAsset = {
        id: Math.random().toString(36).substr(2, 9),
        name: assetName,
        type: assetType,
        value: assetValue,
        source: assetSource,
      };
      setAssets((prev) => [newAsset, ...prev]);
      martechService.trackEngagement('add_asset', {
        type: 'brand_asset',
        asset_type: assetType
      });
      setAssetName("");
      setAssetValue("");
      setIsUploading(false);
    }, 800);
  };

  const handleAuditBrief = async () => {
    if (!brief.projectName || !brief.mainObjective) return;
    setIsAuditingBrief(true);
    try {
      // Use type assertion to ensure the language prop matches the expected Language type in the service call
      const result = await auditBrandBrief(brief, language as Language);
      setBriefAnalysis(result);
      martechService.trackEngagement('run_audit', {
        type: 'brief_audit',
        project: brief.projectName
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsAuditingBrief(false);
    }
  };

  const deleteAsset = (id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-primary/30 selection:text-white">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] left-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full animate-pulse-slow"></div>
        <div className="absolute bottom-[20%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/5 blur-[120px] rounded-full animate-pulse-slow animation-delay-2000"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-20 space-y-20 relative z-10">
        {/* Title Section */}
        <div className="text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-3 px-6 py-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] mb-4"
          >
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Brand Strategy Center
          </motion.div>

          <h2 className="text-3xl md:text-6xl lg:text-8xl font-black text-white tracking-tight leading-tight uppercase">
            {language === "es" ? "Brand" : "Brand"} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400">
              {language === "es" ? "IDENTIDAD" : "IDENTITY"}
            </span>
          </h2>
          <p className="text-slate-400 font-medium text-lg max-w-2xl mx-auto leading-relaxed italic">
            {language === "es"
              ? "Gestiona tu Brand Book y audita tus briefs estratégicos con inteligencia artificial para asegurar coherencia y escalabilidad."
              : "Manage your Brand Book and audit your strategic briefs with AI to ensure consistency and scalability."}
          </p>
        </div>

        {/* Sub-Navegación Táctica */}
        <div className="flex justify-center">
          <div className="bg-slate-900/40 p-2 rounded-[2.5rem] flex items-center gap-2 border border-white/10 shadow-2xl backdrop-blur-xl">
            <button
              onClick={() => setActiveSubTab("inventory")}
              className={`px-12 py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.2em] transition-all relative overflow-hidden group ${activeSubTab === "inventory" ? "text-white" : "text-slate-500 hover:text-slate-300"}`}
            >
              {activeSubTab === "inventory" && (
                <motion.div
                  layoutId="tab-bg"
                  className="absolute inset-0 bg-primary shadow-[0_10px_30px_rgba(255,73,124,0.3)]"
                />
              )}
              <span className="relative z-10">
                {t.brand_book.split(" ")[0]} Book
              </span>
            </button>
            <button
              onClick={() => setActiveSubTab("briefing")}
              className={`px-12 py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.2em] transition-all relative overflow-hidden group ${activeSubTab === "briefing" ? "text-white" : "text-slate-500 hover:text-slate-300"}`}
            >
              {activeSubTab === "briefing" && (
                <motion.div
                  layoutId="tab-bg"
                  className="absolute inset-0 bg-indigo-500 shadow-[0_10px_30px_rgba(99,102,241,0.3)]"
                />
              )}
              <span className="relative z-10">{t.briefing_lab}</span>
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeSubTab === "inventory" ? (
            <motion.div
              key="inventory"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="grid lg:grid-cols-12 gap-10"
            >
              {/* Panel Izquierdo: Formulario Brand Asset */}
              <div className="lg:col-span-4">
                <div className="bg-slate-900/40 backdrop-blur-xl rounded-[3rem] p-10 border border-white/10 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl group-hover:bg-primary/20 transition-all"></div>
                  <h3 className="text-2xl font-black text-white mb-10 uppercase tracking-tighter italic">
                    CARGAR ACTIVO
                  </h3>
                  <form onSubmit={handleAddAsset} className="space-y-8">
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">
                        Nombre del Activo
                      </label>
                      <input
                        type="text"
                        value={assetName}
                        onChange={(e) => setAssetName(e.target.value)}
                        placeholder="Ej: Logo Principal"
                        className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-5 px-8 text-sm font-bold text-white focus:outline-none focus:border-primary focus:bg-slate-900/80 transition-all placeholder:text-slate-700 shadow-inner"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">
                        Tipo de Recurso
                      </label>
                      <div className="relative">
                        <select
                          value={assetType}
                          onChange={(e) => setAssetType(e.target.value as any)}
                          className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-5 px-8 text-sm font-bold text-white focus:outline-none focus:border-primary appearance-none cursor-pointer shadow-inner"
                        >
                          <option value="logo">Logo</option>
                          <option value="color">Color (Hex)</option>
                          <option value="font">Fuente</option>
                          <option value="pdf">Manual PDF</option>
                        </select>
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">
                        Valor / Referencia URL
                      </label>
                      <input
                        type="text"
                        value={assetValue}
                        onChange={(e) => setAssetValue(e.target.value)}
                        placeholder="primary o URL"
                        className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-5 px-8 text-sm font-bold text-white focus:outline-none focus:border-primary focus:bg-slate-900/80 transition-all placeholder:text-slate-700 shadow-inner"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isUploading}
                      className="w-full bg-primary text-white py-6 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-[0_15px_40px_rgba(255,73,124,0.3)] hover:brightness-110 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 mt-4"
                    >
                      {isUploading ? "PROCESANDO..." : "GUARDAR EN BRAND BOOK"}
                    </button>
                  </form>
                </div>
              </div>

              {/* Panel Derecho: Inventario */}
              <div className="lg:col-span-8">
                <div className="bg-slate-900/40 backdrop-blur-xl rounded-[3.5rem] p-12 border border-white/10 shadow-2xl min-h-[600px] relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-12 opacity-5">
                    <svg
                      className="w-48 h-48 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" />
                    </svg>
                  </div>
                  <h4 className="text-3xl font-black text-white mb-12 border-l-4 border-indigo-500 pl-8 uppercase tracking-tighter italic">
                    INVENTARIO DE MARCA
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-6">
                    {assets.length === 0 ? (
                      <div className="col-span-2 py-40 text-center">
                        <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-white/5">
                          <span className="text-3xl opacity-20">📦</span>
                        </div>
                        <p className="opacity-30 font-black uppercase tracking-[0.3em] text-[11px] text-slate-400">
                          Inventory Empty
                        </p>
                      </div>
                    ) : (
                      assets.map((asset, i) => (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          key={asset.id}
                          className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 flex items-center justify-between group hover:border-primary/40 hover:bg-white/[0.08] transition-all relative overflow-hidden"
                        >
                          <div className="flex items-center gap-6 relative z-10">
                            <div className="w-16 h-16 bg-slate-900/80 rounded-2xl border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl group-hover:scale-110 transition-transform">
                              {asset.type === "color" ? (
                                <div
                                  className="w-10 h-10 rounded-lg shadow-inner"
                                  style={{ backgroundColor: asset.value }}
                                ></div>
                              ) : asset.type === "logo" ? (
                                <span className="text-2xl">✨</span>
                              ) : asset.type === "pdf" ? (
                                <span className="text-2xl">📕</span>
                              ) : (
                                <span className="text-2xl">🔤</span>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-black text-white uppercase tracking-tight group-hover:text-primary transition-colors">
                                {asset.name}
                              </p>
                              <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mt-1 italic">
                                {asset.type}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => deleteAsset(asset.id)}
                            className="opacity-0 group-hover:opacity-100 p-3 text-rose-500/50 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all relative z-10"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            /* LABORATORIO DE BRIEFING */
            <motion.div
              key="briefing"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="grid lg:grid-cols-12 gap-10"
            >
              <div className="lg:col-span-7">
                <div className="bg-slate-900/40 backdrop-blur-xl rounded-[4rem] p-12 border border-white/10 shadow-2xl space-y-12">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-indigo-500/20 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                      <svg
                        className="w-7 h-7 text-indigo-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-4xl font-black text-white uppercase tracking-tighter italic">
                      Brief Estratégico
                    </h3>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">
                        {t.project_name}
                      </label>
                      <input
                        type="text"
                        value={brief.projectName}
                        onChange={(e) =>
                          setBrief({ ...brief, projectName: e.target.value })
                        }
                        placeholder="Ej: Lanzamiento Verano 2024"
                        className="w-full bg-slate-950/50 border border-white/5 rounded-[1.5rem] py-5 px-8 text-sm font-bold text-white focus:border-indigo-500 focus:bg-slate-900/80 outline-none placeholder:text-slate-700 transition-all shadow-inner"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">
                        {t.tone_of_voice}
                      </label>
                      <input
                        type="text"
                        value={brief.toneOfVoice}
                        onChange={(e) =>
                          setBrief({ ...brief, toneOfVoice: e.target.value })
                        }
                        placeholder="Ej: Profesional, Empático"
                        className="w-full bg-slate-950/50 border border-white/5 rounded-[1.5rem] py-5 px-8 text-sm font-bold text-white focus:border-indigo-500 focus:bg-slate-900/80 outline-none placeholder:text-slate-700 transition-all shadow-inner"
                      />
                    </div>
                    <div className="col-span-2 space-y-3">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">
                        {t.target_audience}
                      </label>
                      <textarea
                        value={brief.targetAudience}
                        onChange={(e) =>
                          setBrief({ ...brief, targetAudience: e.target.value })
                        }
                        placeholder="Ej: Emprendedores de 25-45 años interesados en tecnología..."
                        rows={3}
                        className="w-full bg-slate-950/50 border border-white/5 rounded-[2rem] py-6 px-8 text-sm font-bold text-white focus:border-indigo-500 focus:bg-slate-900/80 outline-none resize-none placeholder:text-slate-700 transition-all shadow-inner"
                      />
                    </div>
                    <div className="col-span-2 space-y-3">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">
                        {t.unique_selling_point}
                      </label>
                      <textarea
                        value={brief.uniqueSellingPoint}
                        onChange={(e) =>
                          setBrief({
                            ...brief,
                            uniqueSellingPoint: e.target.value,
                          })
                        }
                        placeholder="¿Por qué comprarte a ti y no a la competencia?"
                        rows={3}
                        className="w-full bg-slate-950/50 border border-white/5 rounded-[2rem] py-6 px-8 text-sm font-bold text-white focus:border-indigo-500 focus:bg-slate-900/80 outline-none resize-none placeholder:text-slate-700 transition-all shadow-inner"
                      />
                    </div>
                    <div className="col-span-2 space-y-3">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">
                        {t.main_objective}
                      </label>
                      <input
                        type="text"
                        value={brief.mainObjective}
                        onChange={(e) =>
                          setBrief({ ...brief, mainObjective: e.target.value })
                        }
                        placeholder="Ej: Captar 500 prospectos en 30 días"
                        className="w-full bg-slate-950/50 border border-white/5 rounded-[1.5rem] py-5 px-8 text-sm font-bold text-white focus:border-indigo-500 focus:bg-slate-900/80 outline-none placeholder:text-slate-700 transition-all shadow-inner"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleAuditBrief}
                    disabled={isAuditingBrief}
                    className="w-full bg-gradient-to-r from-indigo-500 to-indigo-700 text-white py-8 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-[0_20px_50px_rgba(99,102,241,0.3)] hover:brightness-110 hover:scale-[1.01] transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
                  >
                    {isAuditingBrief ? (
                      <div className="flex items-center justify-center gap-4">
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        ANALIZANDO ESTRUCTURA...
                      </div>
                    ) : (
                      t.audit_brief
                    )}
                  </button>
                </div>
              </div>

              {/* Resultados de la Auditoría del Brief */}
              <div className="lg:col-span-5 space-y-10">
                {!briefAnalysis ? (
                  <div className="h-full bg-slate-900/20 border-2 border-white/5 border-dashed rounded-[4rem] flex flex-col items-center justify-center p-16 text-center group">
                    <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center mb-8 border border-white/5 group-hover:scale-110 transition-transform duration-500">
                      <svg
                        className="w-10 h-10 text-slate-700 group-hover:text-indigo-500 transition-colors"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-600 max-w-[200px] leading-relaxed italic">
                      {language === "es"
                        ? "Esperando datos para iniciar el escaneo algorítmico"
                        : "Awaiting data to initiate algorithmic scan"}
                    </p>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-10"
                  >
                    <div className="bg-slate-900/40 backdrop-blur-xl rounded-[3.5rem] p-12 border border-white/10 shadow-2xl text-center relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
                      <p className="text-[11px] font-black text-slate-500 uppercase mb-8 tracking-[0.3em] italic">
                        {t.brief_score}
                      </p>

                      <div className="relative inline-flex items-center justify-center mb-8">
                        <div className="text-8xl font-black text-white tracking-tighter drop-shadow-[0_0_20px_rgba(255,73,124,0.3)]">
                          {briefAnalysis.score}
                        </div>
                        <span className="text-xl font-bold text-slate-600 ml-2 mt-4">
                          /100
                        </span>
                      </div>

                      <div className="w-full h-2.5 bg-slate-800/50 rounded-full overflow-hidden border border-white/5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${briefAnalysis.score}%` }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          className="h-full bg-gradient-to-r from-indigo-500 via-primary to-pink-500"
                        />
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-slate-900/80 via-indigo-950/40 to-slate-950/80 backdrop-blur-3xl rounded-[3.5rem] p-12 text-white shadow-2xl border border-white/10 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-10">
                        <svg
                          className="w-20 h-20 text-indigo-400"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" />
                        </svg>
                      </div>
                      <h4 className="text-[11px] font-black text-indigo-400 uppercase mb-8 tracking-[0.3em] flex items-center gap-3 italic">
                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                        Diagnóstico de la IA
                      </h4>
                      <p className="text-xl font-medium text-slate-200 leading-relaxed italic mb-12 tracking-tight">
                        "{briefAnalysis.critique}"
                      </p>

                      <div className="space-y-10">
                        <div>
                          <p className="text-[11px] font-black text-slate-500 uppercase mb-5 tracking-[0.2em]">
                            {language === "es"
                              ? "Estrategia de Optimización"
                              : "Optimization Strategy"}
                          </p>
                          <ul className="space-y-4">
                            {briefAnalysis.optimizationTips.map((tip, i) => (
                              <motion.li
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 + i * 0.1 }}
                                key={i}
                                className="flex items-start gap-4 text-sm font-bold text-slate-300 group/tip"
                              >
                                <span className="w-2 h-2 bg-primary rounded-full mt-1.5 shrink-0 shadow-[0_0_10px_theme(colors.primary)] group-hover/tip:scale-150 transition-transform"></span>
                                <span className="leading-tight">{tip}</span>
                              </motion.li>
                            ))}
                          </ul>
                        </div>

                        <div className="pt-8 border-t border-white/5">
                          <p className="text-[11px] font-black text-slate-500 uppercase mb-6 tracking-[0.2em]">
                            {language === "es"
                              ? "Semántica de Poder"
                              : "Power Semantics"}
                          </p>
                          <div className="flex flex-wrap gap-3">
                            {briefAnalysis.suggestedKeywords.map((kw, i) => (
                              <motion.span
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.8 + i * 0.05 }}
                                key={i}
                                className="px-5 py-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-[11px] font-black uppercase tracking-widest text-indigo-300 hover:bg-indigo-500 hover:text-white transition-all cursor-default"
                              >
                                {kw}
                              </motion.span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BrandGuardianView;

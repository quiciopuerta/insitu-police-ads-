import React from "react";
import LogoIsotype from "./LogoIsotype";
import { AuthUser } from "../types";

interface TechnologyPageProps {
  onClose: () => void;
  currentUser?: AuthUser | null;
}

const TechnologyPage: React.FC<TechnologyPageProps> = ({
  onClose,
  currentUser,
}) => {
  return (
    <div className="fixed inset-0 z-[200] bg-slate-950 overflow-y-auto selection:bg-primary/30">
      {/* Header Fijo de Navegación */}
      <nav className="sticky top-0 w-full z-50 border-b border-white/5 bg-slate-950/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={onClose}
          >
            {currentUser?.brandProfile?.isotypeUrl &&
            (currentUser.brandProfile.isotypeVisibility === "header" ||
              currentUser.brandProfile.isotypeVisibility === "both") ? (
              <img
                src={currentUser.brandProfile.isotypeUrl}
                alt="Isotype"
                className="w-10 h-10 object-contain"
              />
            ) : (
              <LogoIsotype className="w-8 h-8 text-primary" />
            )}
            <div className="flex flex-col">
              {currentUser?.brandProfile?.brandName ? (
                <span className="text-white font-black text-xl tracking-tighter leading-none">
                  {currentUser.brandProfile.brandName}
                </span>
              ) : (
                <span className="font-black text-xl tracking-tighter text-white">
                  insitu<span className="text-[#ff477b]">.company</span>
                </span>
              )}
            </div>
            <div className="h-4 w-px bg-white/10 hidden sm:block mx-2"></div>
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-primary hidden sm:block">
              TECH
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-[11px] font-black uppercase tracking-widest flex items-center space-x-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10"
          >
            <span>Cerrar</span>
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </nav>

      {/* Hero Section Tech */}
      <section className="relative pt-24 pb-20 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-primary/10 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full"></div>
        </div>

        <div className="max-w-5xl mx-auto px-6 relative z-10 text-center">
          <p className="text-primary text-[11px] font-black uppercase tracking-[0.4em] mb-6">
            Internal Technical Documentation v2.5
          </p>
          <h1 className="text-3xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter mb-8 leading-tight">
            Ingeniería Detrás de la <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-400 to-slate-600">
              Auditoría Neuronal.
            </span>
          </h1>
          <p className="text-slate-400 text-xl md:text-2xl font-medium max-w-3xl mx-auto leading-relaxed">
            No procesamos datos, entendemos intenciones. insitu.company utiliza una
            arquitectura multimodal de baja latencia diseñada para la era del
            rendimiento visual.
          </p>
        </div>
      </section>

      {/* Core Stack: Multi-Model Architecture */}
      <section className="py-24 border-y border-white/5 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center space-x-3 bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-full">
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                <span className="text-indigo-400 text-[11px] font-black uppercase tracking-widest">
                  Multi-Model Architecture
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                Inteligencia de Enjambre: Orquestación de LLMs
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed">
                Nuestra plataforma no depende de un único algoritmo. insitu.company
                opera como una <strong>mente colmena</strong>, coordinando un
                conjunto avanzado de{" "}
                <strong>Modelos de Lenguaje Masivos (LLMs)</strong> y redes
                neuronales de visión. Cada modelo está especializado en una capa
                cognitiva distinta: desde la semiótica visual hasta la
                predicción de comportamiento, trabajando en concierto para
                "entender" la publicidad con profundidad humana y precisión de
                máquina.
              </p>
              <div className="grid grid-cols-2 gap-6 pt-4">
                <div className="p-6 bg-slate-900 rounded-[2rem] border border-white/5">
                  <h4 className="text-white font-black text-lg mb-2">
                    Ventana de Contexto
                  </h4>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Capacidad para cruzar miles de puntos de datos históricos
                    con la pieza actual.
                  </p>
                </div>
                <div className="p-6 bg-slate-900 rounded-[2rem] border border-white/5">
                  <h4 className="text-white font-black text-lg mb-2">
                    Vectores Semánticos
                  </h4>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Traducción de imágenes a conceptos de negocio y KPIs de
                    conversión.
                  </p>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full"></div>
              <div className="relative bg-slate-900 border border-white/10 rounded-[3rem] p-8 shadow-2xl overflow-hidden group">
                <div className="aspect-video bg-slate-950 rounded-2xl flex items-center justify-center border border-white/5 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                  <div className="text-center z-10">
                    <div className="w-16 h-1 bg-primary mx-auto mb-4 animate-[scan_3s_infinite]"></div>
                    <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.3em]">
                      Neural Processing Active
                    </p>
                  </div>
                </div>
                <div className="mt-8 space-y-4">
                  <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest text-slate-500">
                    <span>Latencia de Inferencia</span>
                    <span className="text-emerald-400">~840ms</span>
                  </div>
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[85%]"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vision & Brand Guardian */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h3 className="text-3xl md:text-5xl font-black text-white tracking-tighter mb-4 leading-tight">
              Módulos Especializados
            </h3>
            <p className="text-slate-500 text-lg uppercase font-bold tracking-widest">
              Ciencia aplicada al ROI
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Visual Attention */}
            <div className="bg-slate-900 border border-white/5 p-12 rounded-[3.5rem] group hover:border-primary/30 transition-all duration-500">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-8">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </div>
              <h4 className="text-3xl font-black text-white mb-6">
                Predicción de Atención (Heatmaps)
              </h4>
              <p className="text-slate-400 leading-relaxed mb-8">
                No necesitamos que el usuario mire el anuncio para saber qué
                verá. Nuestros modelos de <strong>Visión Neuronal</strong>{" "}
                analizan la jerarquía visual de los píxeles para predecir los
                puntos de fijación y el recorrido ocular, garantizando que el
                CTA sea el protagonista.
              </p>
              <ul className="space-y-3">
                {[
                  "Análisis de Contraste Cromático",
                  "Densidad de Elementos",
                  "Lectura de Patrones en F",
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-center space-x-3 text-sm font-bold text-slate-500"
                  >
                    <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Brand Guardian */}
            <div className="bg-slate-900 border border-white/5 p-12 rounded-[3.5rem] group hover:border-emerald-500/30 transition-all duration-500">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 mb-8">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h4 className="text-3xl font-black text-white mb-6">
                Brand Guardian: Context Injection
              </h4>
              <p className="text-slate-400 leading-relaxed mb-8">
                A través de <strong>Inyección de Contexto</strong>, alimentamos
                a la IA con los manuales de marca (Brand Books) del cliente. El
                algoritmo valida automáticamente si el uso del logo, los códigos
                HEX y el tono de voz cumplen con la identidad corporativa.
              </p>
              <ul className="space-y-3">
                {[
                  "Validación de Códigos HEX",
                  "Integridad Proporcional de Logo",
                  "Control de Tono Semántico",
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-center space-x-3 text-sm font-bold text-slate-500"
                  >
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Continuous Learning & Signals */}
            <div className="md:col-span-2 bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-white/5 p-12 rounded-[3.5rem] group hover:border-blue-500/30 transition-all duration-500">
              <div className="flex flex-col lg:flex-row gap-12">
                <div className="flex-1">
                  <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 mb-8">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h4 className="text-3xl font-black text-white mb-6">
                    Neural Feedback & Real-time Intelligence
                  </h4>
                  <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-medium">
                    {typeof window !== 'undefined' && localStorage.getItem('language') === 'es' 
                      ? 'insitu.company audita competidores basándose en datos reales de subasta y comportamiento del mercado en tiempo real. A diferencia de Google Keyword Planner, no mostramos estimaciones globales infladas para incentivar clics, analizamos tu estado competitivo actual.'
                      : 'insitu.company audits competitors based on actual auction data and real-time market behavior. Unlike Google Keyword Planner, we do not show inflated global estimates to incentivize clicks, we analyze your true competitive state.'}
                  </p>
                </div>
                <div className="flex-1">
                  <h5 className="text-[#ff477b] text-[11px] font-black uppercase tracking-widest mb-6">Vigilancia Multi-Plataforma</h5>
                  <ul className="space-y-4">
                    {[
                      { title: "Scanner de Señales Ads", desc: "Integración nativa con Google, Meta y TikTok para detección de anuncios live." },
                      { title: "Dynamic Prompt Fine-tuning", desc: "Auto-calibración de la IA basada en el feedback histórico del usuario." },
                      { title: "Alertas de Relevancia", desc: "Filtrado de ruido mediante Gemini 2.0 Flash para priorizar eventos de negocio." }
                    ].map((item, i) => (
                      <li key={i} className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all">
                        <p className="text-white font-bold text-sm mb-1">{item.title}</p>
                        <p className="text-slate-500 text-xs leading-relaxed">{item.desc}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Infrastructure Stack */}
      <section className="py-24 bg-slate-900/50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 rounded-[4rem] p-12 md:p-20 relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-16">
              <div className="flex-1 space-y-6">
                <h3 className="text-2xl md:text-4xl lg:text-5xl font-black text-white tracking-tighter leading-tight">
                  {typeof window !== 'undefined' && localStorage.getItem('language') === 'es' 
                    ? "insitu.company combina modelos de IA de clase mundial con una infraestructura serverless segura. Aquí detallamos cómo protegemos tus datos y la tecnología detrás de cada auditoría."
                    : "insitu.company combines world-class AI models with a secure serverless infrastructure. Here we detail how we protect your data and the technology behind every audit."}
                </h3>
                <p className="text-slate-400 text-lg leading-relaxed">
                  Nuestra arquitectura está diseñada para la escala masiva.
                  Utilizamos un stack <strong>Serverless</strong> que nos
                  permite procesar miles de auditorías simultáneas sin
                  degradación de performance, manteniendo un tiempo de respuesta
                  constante para agencias que operan a alta velocidad.
                </p>
                <div className="flex flex-wrap gap-4">
                  {[
                    "Cloud-Native Hybrid Stack",
                    "Event-Driven Runtime",
                    "Real-time Edge Analysis",
                  ].map((tech, i) => (
                    <span
                      key={i}
                      className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-400"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
              <div className="w-full md:w-64 aspect-square bg-slate-950 rounded-full border border-white/5 flex items-center justify-center relative">
                <div className="absolute inset-0 border-2 border-primary/20 rounded-full animate-ping"></div>
                <div className="text-center">
                  <p className="text-4xl font-black text-white">99.9%</p>
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                    Uptime API
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(-20px); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(120px); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default TechnologyPage;

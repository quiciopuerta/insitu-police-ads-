import React, { useState, useEffect, useRef, useCallback } from "react";
import { AGENT_PERSONAS } from "../services/ai/agentRegistry";
import { AuthUser, Language, ChatMessage } from "../types";
import { chatWithExpert } from "../services/geminiService";
import Toast, { ToastData } from "./Toast";
import { AdminDiagnosticPanel } from "./ui/AdminDiagnosticPanel";

const PERSONAS: Record<string, { role: string; name: string; accent: string }> = {
  general: { role: "Estratega Central", name: "Jules", accent: "#ff477b" },
  'ppc-strategy-expert': { role: "Auditor PPC", name: "PPC Expert", accent: "#3b82f6" },
  'local-seo-expert': { role: "Estratega SEO", name: "SEO Expert", accent: "#10b981" },
  'agentic-search-optimizer': { role: "Especialista AEO", name: "AI Ops", accent: "#f59e0b" },
  'creative-strategist': { role: "Director Creativo", name: "Creative Dir.", accent: "#8b5cf6" },
  'growth-hacker': { role: "Growth Hacker", name: "Growth Expert", accent: "#ec4899" },
  'flow-master': { role: "Flow Master", name: "Flow Expert", accent: "#ff477b" },
};

const ExpertAgent: React.FC<{
  language: Language;
  currentUser: AuthUser | null;
  onUpgrade: () => void;
  currentView?: string;
  campaignContext?: string;
  comingSoon?: { enabled: boolean; message: string };
}> = ({ language, currentUser, onUpgrade, currentView, campaignContext, comingSoon }) => {
  const [persona, setPersona] = useState<string>('general');
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Auto-switch persona based on current view
  useEffect(() => {
    if (currentView === 'analyzer' || currentView === 'traffic-checker') setPersona('local-seo-expert');
    else if (currentView === 'creative-lab') setPersona('flow-master');
    else if (currentView === 'image-ai' || currentView === 'video-ai') setPersona('creative-strategist');
    else if (currentView === 'research') setPersona('growth-hacker');
    else if (currentView === 'performance') setPersona('ppc-strategy-expert');
    else setPersona('general');
  }, [currentView]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copyFramework, setCopyFramework] = useState<string>('auto');
  const [toast, setToast] = useState<ToastData | null>(null);
  const [lastError, setLastError] = useState<any>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  useEffect(() => {
    const handleToggle = (e: any) => {
      setIsOpen(e.detail?.open ?? !isOpen);
      if (e.detail?.persona && AGENT_PERSONAS.find(p => p.id === e.detail.persona)) {
        setPersona(e.detail.persona);
      }
    };
    window.addEventListener('toggle-expert-chat' as any, handleToggle);
    return () => window.removeEventListener('toggle-expert-chat' as any, handleToggle);
  }, [isOpen]);

  const handleSend = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg: ChatMessage = { role: "user", parts: [{ text: input }] };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      import("../services/martechService").then(({ martechService }) => {
        martechService.pushEvent("chat_message_sent", {
          view: currentView,
          persona: persona,
          message_length: input.length,
        });
      });

      const ctxSegments = [];
      if (persona !== 'general') ctxSegments.push(`ROLE:${persona}`);
      if (campaignContext || currentView) ctxSegments.push(`CTX:${campaignContext || currentView}`);
      if (copyFramework !== 'auto') ctxSegments.push(`COPY_FRAMEWORK:${copyFramework} (Aplica obligatoriamente esta estructura matemática de persuasión en la redacción de tu respuesta)`);
      
      const finalContext = ctxSegments.length > 0 ? ctxSegments.join(' | ') : 'General Assistance';

      const response = await chatWithExpert(
        input,
        messages,
        language,
        finalContext,
        currentUser?.brandProfile,
        persona
      );
      const modelMsg: ChatMessage = {
        role: "model",
        parts: [{ text: response }],
      };
      setMessages((prev) => [...prev, modelMsg]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          parts: [{ text: language === "es" ? "Error del sistema." : "System error." }],
        },
      ]);
      setLastError(error);
      setToast({
        title: language === "es" ? "Error en Chat" : "Chat Error",
        message: language === "es" ? "Hubo un problema al conectar con el asistente." : "Could not connect to the assistant.",
        type: "error"
      });
    } finally {
      setIsTyping(false);
    }
  }, [input, isTyping, messages, language, campaignContext, currentView, persona, copyFramework]);

  const handlePlayVoice = async (text: string, index: number) => {
    if (playingId === index) return;
    setPlayingId(index);
    try {
      const { generateAudio } = await import('../services/ai/mediaGenerationService');
      const url = await generateAudio({
        text,
        voice: 'Zephyr', // Or any cool voice
        language,
        tone: 'Professional',
        pitch: 1.0,
        speed: 1.0
      });
      if (url) {
        const audio = new Audio(url);
        audio.onended = () => setPlayingId(null);
        try { await audio.play(); } catch (e) { console.warn("[ExpertAgent] Playback blocked:", e); setPlayingId(null); }
      } else {
        setPlayingId(null);
      }
    } catch (error) {
      console.error("[ExpertAgent] Voice Error:", error);
      setPlayingId(null);
    }
  };

  const isGrowthPlan =
    currentUser &&
    (currentUser.role === "superAdmin" ||
      currentUser.role === "admin" ||
      currentUser.subscription.plan === "Growth" ||
      currentUser.subscription.plan === "Agency");

  return (
    <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[9999] flex flex-col items-end space-y-4 pointer-events-none print:hidden">
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
      {/* Chat Window */}
      {isOpen && (
        <div className="pointer-events-auto bg-[#efeae2] w-[90vw] md:w-[380px] h-[600px] max-h-[80vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300 border border-white/20 origin-bottom-right mb-2">
          {/* Header WhatsApp Style */}
          <div className="bg-[#0f172a] p-4 flex items-center space-x-3 shrink-0 relative overflow-hidden">
            <div className="absolute inset-0 bg-[#ff477b]/10 blur-xl transition-colors duration-500" style={{ backgroundColor: `${AGENT_PERSONAS.find(p => p.id === persona)?.id === 'general' ? '#ff477b' : '#00f5d4'}10` }}></div>
            
            {/* Agent Avatar */}
            <div className="relative z-10 w-11 h-11 rounded-full p-[2.5px] group cursor-pointer" 
                 onClick={() => setShowPersonaMenu(!showPersonaMenu)}
                 style={{ background: `linear-gradient(to tr, #ff477b, #9333ea)` }}>
              <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center overflow-hidden">
                <span className="text-xl">
                    {persona === 'general' ? '🤖' : 
                     persona === 'ppc-strategy-expert' ? '🎯' :
                     persona === 'local-seo-expert' ? '🌐' :
                     persona === 'agentic-search-optimizer' ? '⚡' :
                     persona === 'creative-strategist' ? '🎨' :
                     persona === 'growth-hacker' ? '🚀' : '🤖'}
                </span>
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0f172a] animate-pulse"></div>
              
              {/* Tooltip to change */}
              <div className="absolute -top-1 -right-1 bg-white rounded-full w-4 h-4 flex items-center justify-center shadow-lg border border-slate-200">
                <span className="text-[11px] text-slate-800">↻</span>
              </div>
            </div>

            <div className="relative z-10 flex-1 min-w-0">
              <h4 className="text-white font-black text-sm tracking-wide truncate">
                {AGENT_PERSONAS.find(p => p.id === persona)?.name}
              </h4>
              <p className="text-emerald-400 text-[11px] font-bold uppercase tracking-widest flex items-center truncate">
                {persona === 'general' ? 'Estratega' : 'Especialista'} &bull; Online
              </p>
            </div>

            {/* Persona Switch Menu */}
            {showPersonaMenu && (
              <div className="absolute top-16 left-4 right-4 bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl z-50 p-2 animate-in fade-in zoom-in duration-200">
                <p className="px-3 py-1 text-[11px] font-black uppercase tracking-widest text-white/30 border-b border-white/5 mb-1">
                  Especialistas de Agencia (Powered by Nexus)
                </p>
                <div className="grid grid-cols-1 gap-1">
                  {AGENT_PERSONAS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setPersona(p.id); setShowPersonaMenu(false); }}
                      className={`flex items-center space-x-3 p-2 rounded-xl transition-all ${
                        persona === p.id ? 'bg-white/10' : 'hover:bg-white/5'
                      }`}
                    >
                      <span className="text-lg">
                        {p.id === 'general' ? '🤖' : 
                         p.id === 'ppc-strategy-expert' ? '🎯' :
                         p.id === 'local-seo-expert' ? '🌐' :
                         p.id === 'agentic-search-optimizer' ? '⚡' :
                         p.id === 'creative-strategist' ? '🎨' :
                         p.id === 'growth-hacker' ? '🚀' : '👤'}
                      </span>
                      <div className="text-left">
                        <p className="text-xs font-bold text-white leading-none mb-0.5">{p.name}</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest">{p.category}</p>
                      </div>
                      {persona === p.id && <span className="ml-auto text-[#ff477b] text-xs">●</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setIsOpen(false)}
              className="relative z-10 text-white/50 hover:text-white transition-colors p-1"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Chat Area */}
          <div className="flex-1 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat bg-opacity-10 flex flex-col overflow-hidden relative">
            <div className="absolute inset-0 bg-[#efeae2]/95 backdrop-blur-[2px]"></div>

            {isGrowthPlan ? (
              <>
                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10 scrollbar-thin scrollbar-thumb-slate-300"
                >
                  {/* Welcome Message */}
                  <div className="flex justify-start">
                    <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm max-w-[85%] text-xs text-slate-700 leading-relaxed border border-white/50">
                      <p className="font-bold mb-1" style={{ color: PERSONAS[persona].accent }}>
                        {PERSONAS[persona].name}
                      </p>
                      {language === "es"
                        ? `¡Hola! Soy tu ${PERSONAS[persona].role}. ${
                            persona === 'researcher' ? 'Estoy listo para profundizar en datos científicos.' : 
                            persona === 'seo_sem' ? 'Analicemos keywords y tendencias de búsqueda.' :
                            persona === 'creative' ? 'Optimicemos el impacto visual de tus piezas.' :
                            '¿En qué puedo ayudarte hoy?'
                          }`
                        : `Hello! I'm your ${PERSONAS[persona].role}. ${
                            persona === 'researcher' ? 'Ready to dive into scientific data.' : 
                            persona === 'seo_sem' ? "Let's analyze keywords and search trends." :
                            persona === 'creative' ? "Let's optimize the visual impact of your creative." :
                            'How can I help you today?'
                          }`}
                      <span className="block text-[11px] text-slate-400 text-right mt-1 w-full">
                        {new Date().toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs shadow-sm relative group transition-all ${
                          m.role === "user"
                            ? "bg-[#dcf8c6] text-slate-800 rounded-tr-none hover:brightness-95"
                            : "bg-white text-slate-800 rounded-tl-none hover:bg-slate-50 pr-8"
                        }`}
                      >
                        {/* Copy Button for AI Messages */}
                        {m.role !== "user" && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(m.parts[0].text);
                              setToast({ title: 'Éxito', type: 'success', message: language === 'es' ? 'Texto copiado' : 'Text copied' });
                            }}
                            className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                            title={language === 'es' ? 'Copiar al portapapeles' : 'Copy to clipboard'}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                            </svg>
                          </button>
                        )}
                        <div className="whitespace-pre-wrap break-words">
                          {m.parts[0].text}
                        </div>
                        <span
                          className={`text-[11px] block text-right mt-1 opacity-60 ${m.role === "user" ? "text-slate-600" : "text-slate-400"}`}
                        >
                          {new Date().toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {m.role === "user" && (
                            <span className="ml-1 text-blue-500 inline-block font-bold">
                              ✓✓
                            </span>
                          )}
                        </span>
                        
                        {m.role === "model" && (
                          <button 
                            onClick={() => handlePlayVoice(m.parts[0].text, i)}
                            disabled={playingId === i}
                            className={`absolute -bottom-3 -right-2 bg-white rounded-full p-1.5 shadow-md border border-slate-100 transition-all z-10 ${playingId === i ? 'text-[#ff477b] animate-pulse' : 'text-slate-400 hover:text-emerald-500'}`}
                            title="Escuchar respuesta"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5 10v4a2 2 0 002 2h4l5 5V3l-5 5H7a2 2 0 00-2 2z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 flex items-center space-x-1.5">
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Admin Diagnostics inside Chat */}
                {(currentUser?.role === 'superAdmin' || currentUser?.email === 'sanchezfj@me.com' || currentUser?.email === 'sociopuerta@gmail.com') && lastError && (
                  <div className="px-4 pb-2 relative z-10">
                    <AdminDiagnosticPanel 
                      result={lastError} 
                      language={language as any} 
                      compact={true}
                    />
                  </div>
                )}

                {/* Framework Selector */}
                <div className="px-3 pt-3 bg-[#f0f2f5] border-t border-slate-200 flex items-center gap-2 overflow-x-auto relative z-10">
                   <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest shrink-0">Framework:</span>
                   <div className="flex gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden shrink-0">
                      {['auto', 'AIDA', 'PAS', 'BAB', '4Ps'].map(fw => (
                        <button
                          key={fw}
                          type="button"
                          onClick={() => setCopyFramework(fw)}
                          className={`px-2 py-0.5 rounded border text-[9px] font-bold tracking-wider transition-all whitespace-nowrap ${
                            copyFramework === fw 
                              ? 'bg-slate-800 text-white border-slate-800 shadow-md' 
                              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {fw}
                        </button>
                      ))}
                   </div>
                </div>

                <form
                  onSubmit={handleSend}
                  className="p-3 bg-[#f0f2f5] flex items-center space-x-2 relative z-10"
                >
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 bg-white rounded-full py-3 px-5 text-xs font-medium border-none outline-none shadow-sm placeholder:text-slate-400 focus:ring-2"
                    style={{ '--tw-ring-color': `${PERSONAS[persona].accent}20` } as any}
                    placeholder={
                      language === "es"
                        ? "Escribe un mensaje..."
                        : "Type a message..."
                    }
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isTyping}
                    className="disabled:opacity-50 disabled:cursor-not-allowed text-white w-10 h-10 rounded-full shadow-md transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center shrink-0"
                    style={{ backgroundColor: PERSONAS[persona].accent }}
                  >
                    <svg
                      className="w-5 h-5 ml-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6 relative z-10">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center animate-pulse">
                  <span className="text-4xl">👑</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">
                    {language === "es" ? "Acceso Privado" : "Private Access"}
                  </h3>
                  <p className="text-xs text-slate-500 mb-6 font-medium leading-relaxed max-w-[200px] mx-auto">
                    {language === "es"
                      ? "El Agente Experto 24/7 está reservado para miembros del plan Growth."
                      : "The 24/7 Expert Agent is reserved for Growth plan members."}
                  </p>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onUpgrade();
                    }}
                    className="bg-[#ff477b] text-white px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-[#ff477b]/30 hover:shadow-[#ff477b]/50 hover:-translate-y-1 transition-all"
                  >
                    {language === "es" ? "Desbloquear Ahora" : "Unlock Now"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Toggle Button (WhatsApp Style) */}
      <button
        onClick={() => {
          const nextState = !isOpen;
          setIsOpen(nextState);
          if (nextState) {
            import("../services/martechService").then(({ martechService }) => {
              martechService.trackPageView("/chat", "View: Help Chat");
            });
          }
        }}
        className="pointer-events-auto bg-[#ff477b] hover:bg-[#ff3366] text-white w-14 h-14 md:w-16 md:h-16 rounded-full shadow-[0_4px_20px_rgba(255,73,124,0.4)] hover:shadow-[0_8px_30px_rgba(255,73,124,0.6)] flex items-center justify-center transition-all duration-300 z-[200] group relative"
      >
        <div
          className={`transition-all duration-300 absolute ${isOpen ? "rotate-90 scale-0 opacity-0" : "scale-100 opacity-100"}`}
        >
          <img
            src="/isotype.png"
            alt="AI Expert"
            className="w-8 h-8 object-contain brightness-0 invert"
          />
        </div>
        <div
          className={`transition-all duration-300 absolute ${isOpen ? "scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"}`}
        >
          <svg
            className="w-8 h-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
      </button>
    </div>
  );
};

export default React.memo(ExpertAgent);

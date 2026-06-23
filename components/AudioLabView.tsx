import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  Sparkles,
  RefreshCw,
  Download,
  Play,
  Volume2,
  Trash2,
  Globe,
  Music,
  Library,
  Layers,
  ChevronDown,
  Clock,
  Heart,
  MessageSquare,
  CheckCircle2,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { cn } from '../utils/cn'; // Assuming or defining a helper
import { Language, AuthUser, Caption } from '../types';
import { VOICE_LIST } from '../services/ai/mediaGenerationService';

const ErrorDisplay: React.FC<{ error: string; isAdmin: boolean }> = ({ error, isAdmin }) => {
  let message = error;
  let debugContent = null;

  try {
    const trimmed = error.trim();
    if (trimmed.startsWith('{')) {
      const parsed = JSON.parse(trimmed);
      message = parsed.details || parsed.message || (typeof parsed.error === 'string' ? parsed.error : "AI Error");

      if (isAdmin) {
        debugContent = (
          <div className="mt-2 p-3 bg-black/60 rounded-xl text-[11px] font-mono overflow-auto max-h-60 border border-white/10 select-all">
            <p className="text-rose-300 font-bold mb-1 flex items-center gap-2">
              <ShieldCheck className="w-3 h-3 text-rose-400" /> DEBUG INFO (SUPER ADMIN)
            </p>
            <div className="space-y-1 mb-2 opacity-80 border-b border-white/5 pb-2">
              <p><span className="text-rose-400/70">TASK:</span> {parsed.type || 'UNKNOWN'}</p>
            </div>
            <pre className="whitespace-pre-wrap opacity-60 text-xs text-rose-100">{parsed.details || (typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error, null, 2))}</pre>
          </div>
        );
      }
    }
  } catch (e) {}

  return (
    <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex flex-col gap-1 text-rose-500 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <p className="text-[11px] font-bold uppercase tracking-wider">{message}</p>
      </div>
      {debugContent}
    </div>
  );
};

interface AudioLabViewProps {
  language: Language;
  currentUser: AuthUser | null;
  audioState: any;
  setAudioState: React.Dispatch<React.SetStateAction<any>>;
  handlePreviewVoice: (voice: string) => void;
  handleStartRecording: () => void;
  handleStopRecording: () => void;
  handleAnalyzeVoice: () => void;
  handleGenerateAudioScript: () => void;
  handleAudioGenerate: () => void;
  handleSaveToLibrary: () => void;
  handleRemoveFromLibrary: (id: string) => void;
  handleLoadFromLibrary: (sv: any) => void;
  isSuperAdmin: boolean;
  t: any;
  proxiedAssetUrl: (url: string | null) => string;
}

export const AudioLabView: React.FC<AudioLabViewProps> = ({
  language,
  currentUser,
  audioState,
  setAudioState,
  handlePreviewVoice,
  handleStartRecording,
  handleStopRecording,
  handleAnalyzeVoice,
  handleGenerateAudioScript,
  handleAudioGenerate,
  handleSaveToLibrary,
  handleRemoveFromLibrary,
  handleLoadFromLibrary,
  isSuperAdmin,
  t,
  proxiedAssetUrl
}) => {
  return (
    <motion.div
      key="audio-hub"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col gap-8 bg-white/5 p-8 md:p-12 rounded-[3.5rem] border border-white/10 backdrop-blur-2xl"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-[#ff477b] mb-4 block">{t.creative_lab} / {t.audio_hub}</span>
          <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-none">
            Neural <br /> <span className="text-gradient-magenta">Voice Studio</span>.
          </h1>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10">
          <button
            onClick={() => setAudioState((prev: any) => ({ ...prev, activeTab: 'generator' }))}
            className={cn(
              "px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
              audioState.activeTab === 'generator' ? "bg-[#ff477b] text-white shadow-lg" : "text-white/40 hover:text-white"
            )}
          >
            <Music className="w-3 h-3" /> Generator
          </button>
          <button
            onClick={() => setAudioState((prev: any) => ({ ...prev, activeTab: 'library' }))}
            className={cn(
              "px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
              audioState.activeTab === 'library' ? "bg-[#ff477b] text-white shadow-lg" : "text-white/40 hover:text-white"
            )}
          >
            <Library className="w-3 h-3" /> My Library
          </button>
        </div>
      </div>

      {audioState.activeTab === 'generator' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* SIDEBAR: VOCES DISPONIBLES — Dropdown */}
          <div className="lg:col-span-3 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">Voces Disponibles</h3>
                <span className="px-2 py-0.5 bg-[#ff477b]/10 text-[#ff477b] text-[11px] font-black rounded-full border border-[#ff477b]/20 leading-none">AI MODELS</span>
              </div>

              {/* Dropdown trigger */}
              <div className="relative">
                <div
                  onClick={() => setAudioState((prev: any) => ({ ...prev, voiceListCollapsed: !prev.voiceListCollapsed }))}
                  className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-white/20 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#ff477b]/15 flex items-center justify-center flex-shrink-0">
                      <Mic className="w-3.5 h-3.5 text-[#ff477b]" />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-[11px] font-black tracking-widest text-white truncate">
                        {VOICE_LIST.find(v => v.id === audioState.voice)?.name ?? audioState.voice.toUpperCase()}
                      </p>
                      <p className="text-[11px] text-white/40 uppercase tracking-tighter truncate">
                        {VOICE_LIST.find(v => v.id === audioState.voice)?.desc}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handlePreviewVoice(audioState.voice); }}
                      className="w-7 h-7 rounded-full bg-white/10 hover:bg-[#ff477b] flex items-center justify-center transition-all"
                    >
                      {audioState.isPreviewing
                        ? <RefreshCw className="w-2.5 h-2.5 animate-spin text-white" />
                        : <Play className="w-2.5 h-2.5 fill-current text-white" />
                      }
                    </button>
                    <ChevronDown className={cn(
                      "w-4 h-4 text-white/30 transition-transform duration-200",
                      audioState.voiceListCollapsed && "rotate-180"
                    )} />
                  </div>
                </div>

                {/* Dropdown panel */}
                <AnimatePresence>
                  {audioState.voiceListCollapsed && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scaleY: 0.96 }}
                      animate={{ opacity: 1, y: 0, scaleY: 1 }}
                      exit={{ opacity: 0, y: -6, scaleY: 0.96 }}
                      transition={{ duration: 0.15 }}
                      style={{ transformOrigin: 'top' }}
                      className="absolute top-full left-0 right-0 mt-2 bg-[#090c10] border border-white/20 rounded-2xl overflow-hidden shadow-2xl z-[100] max-h-72 overflow-y-auto"
                    >
                      {VOICE_LIST.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => {
                            if (v.id === 'Clonada' && !audioState.sampleAudio) return;
                            setAudioState((prev: any) => ({ ...prev, voice: v.id as any, voiceListCollapsed: false }));
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/10 transition-all border-b border-white/5 last:border-0",
                            audioState.voice === v.id && "bg-white/15",
                            v.id === 'Clonada' && !audioState.sampleAudio && "opacity-30 cursor-not-allowed"
                          )}
                        >
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full flex-shrink-0 mt-0.5",
                            audioState.voice === v.id ? "bg-[#ff477b]" : "bg-white/15"
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-[11px] font-black tracking-widest truncate",
                              audioState.voice === v.id ? "text-white" : "text-white/70"
                            )}>{v.name}</p>
                            <p className="text-[11px] text-white/30 uppercase tracking-tighter truncate">{v.desc}</p>
                          </div>
                          <span className={cn(
                            "text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full flex-shrink-0",
                            v.type === 'CORE'     ? "bg-[#ff477b]/20 text-[#ff477b]/80" :
                            v.type === 'DYNAMIC'  ? "bg-purple-500/20 text-purple-400/80" :
                            v.type === 'GOOGLE'   ? "bg-cyan-500/20 text-cyan-400/80" :
                            "bg-white/5 text-white/25"
                          )}>{v.type}</span>
                          {v.id !== 'Clonada' && (
                            <div
                              onClick={(e) => { e.stopPropagation(); handlePreviewVoice(v.id); }}
                              className="w-6 h-6 rounded-full bg-white/10 hover:bg-[#ff477b] flex items-center justify-center transition-all flex-shrink-0 cursor-pointer"
                            >
                              <Play className="w-2 h-2 fill-current text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Quick Voice Cloning Mini-Section */}
            <div className={cn(
              "p-6 rounded-3xl border transition-all",
              audioState.isRecording ? "bg-[#ff477b]/10 border-[#ff477b]" : "bg-white/5 border-white/10"
            )}>
               <div className="flex items-center gap-3 mb-4">
                  <Mic className={cn("w-4 h-4", audioState.isRecording ? "text-[#ff477b]" : "text-white/40")} />
                  <span className="text-[11px] font-black uppercase tracking-widest text-white">Voice Lab</span>
               </div>
               
               <div className="space-y-3">
                 {!audioState.sampleAudio ? (
                   <button
                     onClick={audioState.isRecording ? handleStopRecording : handleStartRecording}
                     className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-xl text-[11px] font-black uppercase tracking-widest text-[#ff477b] border border-[#ff477b]/20 transition-all"
                   >
                     {audioState.isRecording ? `DETENER (${audioState.recordingTime}s)` : "GRABAR MUESTRA"}
                   </button>
                 ) : (
                   <div className="space-y-3">
                     <div className="flex items-center justify-between px-1">
                       <span className="text-[11px] font-black uppercase tracking-widest text-green-400">Sample Listo</span>
                       <button onClick={() => setAudioState((prev: any) => ({ ...prev, sampleAudio: null }))} className="text-white/20 hover:text-rose-500">
                         <Trash2 className="w-3 h-3" />
                       </button>
                     </div>
                     <audio src={audioState.sampleAudio} controls className="w-full h-6 rounded-none brightness-75 contrast-125" />
                     <button
                       onClick={handleAnalyzeVoice}
                       disabled={audioState.isAnalyzingVoice}
                       className="w-full py-2 bg-[#ff477b]/10 hover:bg-[#ff477b]/20 rounded-xl text-[11px] font-black uppercase tracking-widest text-[#ff477b] border border-[#ff477b]/20 transition-all flex items-center justify-center gap-2"
                     >
                       {audioState.isAnalyzingVoice ? (
                         <RefreshCw className="w-3 h-3 animate-spin" />
                       ) : (
                         <Sparkles className="w-3 h-3" />
                       )}
                       {audioState.isAnalyzingVoice ? "Analizando..." : "Analizar ADN Vocal"}
                     </button>
                     {audioState.voiceAnalysis && (
                       <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-top-2">
                         <div className="grid grid-cols-2 gap-2">
                           {[
                             { label: 'Género',   value: audioState.voiceAnalysis.gender    || 'Neural'       },
                             { label: 'Tono',     value: audioState.voiceAnalysis.tone      || 'Professional' },
                             { label: 'Tempo',    value: `${audioState.voiceAnalysis.tempo  || 140} WPM`      },
                             { label: 'Claridad', value: `${audioState.voiceAnalysis.clarity || 95}%`         },
                             { label: 'Pitch',    value: audioState.voiceAnalysis.pitchRange || 'Medio'       },
                             { label: 'Edad',     value: audioState.voiceAnalysis.age        || '—'           },
                           ].map((stat, i) => (
                             <div key={i} className="p-2 bg-black/20 rounded-lg border border-white/5">
                               <p className="text-[6px] font-black uppercase tracking-widest text-white/30">{stat.label}</p>
                               <p className="text-[11px] font-black text-[#ff477b]">{stat.value}</p>
                             </div>
                           ))}
                         </div>
                         {audioState.voiceAnalysis.accent && (
                           <div className="p-2 bg-black/20 rounded-lg border border-white/5">
                             <p className="text-[6px] font-black uppercase tracking-widest text-white/30">Acento</p>
                             <p className="text-[11px] font-black text-[#ff477b]">{audioState.voiceAnalysis.accent}</p>
                           </div>
                         )}
                         {audioState.voiceAnalysis.distinctiveTraits && (
                           <div className="p-2 bg-black/20 rounded-lg border border-white/5">
                             <p className="text-[6px] font-black uppercase tracking-widest text-white/30">Rasgos únicos</p>
                             <p className="text-[11px] text-white/60 leading-relaxed">{audioState.voiceAnalysis.distinctiveTraits}</p>
                           </div>
                         )}
                       </div>
                     )}
                   </div>
                 )}
               </div>
            </div>

            {/* AI Script Generator Panel */}
            <div className="p-5 rounded-3xl border border-[#ff477b]/20 bg-gradient-to-b from-[#ff477b]/5 to-transparent space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-[#ff477b]" />
                <span className="text-[11px] font-black uppercase tracking-widest text-[#ff477b]">
                  AI Script Generator
                </span>
              </div>
              <textarea
                value={audioState.aiPrompt}
                onChange={(e) => setAudioState((prev: any) => ({ ...prev, aiPrompt: e.target.value, aiScriptGenerated: false }))}
                placeholder={language === 'es'
                  ? "Describe el audio que quieres crear...\nEj: Un anuncio de 20s para joyas de lujo, voz femenina, elegante"
                  : "Describe the audio you want to create...\nE.g: A 20s luxury jewelry ad, female voice, elegant tone"}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-[11px] text-white placeholder-white/20 focus:outline-none focus:border-[#ff477b]/40 resize-none min-h-[72px] leading-relaxed"
              />
              <button
                onClick={handleGenerateAudioScript}
                disabled={!audioState.aiPrompt.trim() || audioState.isGeneratingScript}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#ff477b] to-[#ff6b35] text-white text-[11px] font-black uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-[#ff477b]/20"
              >
                {audioState.isGeneratingScript ? (
                  <><RefreshCw className="w-3 h-3 animate-spin" /> {language === 'es' ? 'Generando...' : 'Generating...'}</>
                ) : (
                  <><Sparkles className="w-3 h-3" /> {language === 'es' ? 'Generar Script con IA' : 'Generate Script with AI'}</>
                )}
              </button>
              {audioState.aiScriptGenerated && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[11px] text-emerald-400 font-black uppercase tracking-widest flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  {language === 'es' ? 'Script generado — revisa y ajusta arriba' : 'Script generated — review and adjust above'}
                </motion.p>
              )}
            </div>
          </div>

          {/* MAIN PANEL: SÍNTESIS DE VOZ */}
          <div className="lg:col-span-9 space-y-8">
            <div className="bg-white/5 p-10 md:p-12 rounded-[3.5rem] border border-white/10 backdrop-blur-3xl space-y-12 shadow-2xl">
              
              {/* Text Input Area */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#ff477b] flex items-center gap-2">
                     <Sparkles className="w-3 h-3" /> Síntesis de Voz
                  </h2>
                  <span className="text-[11px] font-black uppercase text-white/20">{audioState.text.length} caracteres</span>
                </div>
                <textarea 
                  value={audioState.text}
                  onChange={(e) => setAudioState((prev: any) => ({ ...prev, text: e.target.value }))}
                  placeholder="Escribe el mensaje que la IA debe locutar con perfección humana..."
                  className="w-full bg-transparent border-none p-0 text-3xl md:text-4xl font-light text-white placeholder-white/5 focus:ring-0 resize-none min-h-[120px] leading-[1.1]"
                />
                <div className="h-px bg-gradient-to-r from-[#ff477b] via-[#ff477b]/20 to-transparent" />
              </div>

              {audioState.error && isSuperAdmin && (
                <ErrorDisplay error={audioState.error} isAdmin={true} />
              )}

              {/* Advanced Controls Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* IDIOMA */}
                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
                     <Globe className="w-3 h-3" /> Idioma
                  </label>
                  <select 
                    value={audioState.language}
                    onChange={(e) => setAudioState((prev: any) => ({ ...prev, language: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white focus:ring-2 focus:ring-[#ff477b] appearance-none cursor-pointer hover:bg-white/10 transition-all"
                  >
                    <option value="Spanish">Español</option>
                    <option value="English">English</option>
                    <option value="Portuguese">Português</option>
                    <option value="French">Français</option>
                    <option value="German">Deutsch</option>
                  </select>
                </div>

                {/* DIALECTO */}
                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
                     <Layers className="w-3 h-3" /> Dialecto
                  </label>
                  <select
                    value={audioState.dialect}
                    onChange={(e) => setAudioState((prev: any) => ({ ...prev, dialect: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white focus:ring-2 focus:ring-[#ff477b] appearance-none cursor-pointer hover:bg-white/10 transition-all"
                  >
                    <optgroup label="── Español ──">
                      <option value="Neutral Latin American Spanish">Neutro Latino</option>
                      <option value="Mexican Spanish">México</option>
                      <option value="Castilian Spanish from Spain">España (Castilla)</option>
                      <option value="Colombian Spanish">Colombia</option>
                      <option value="Argentinian Spanish with rioplatense accent">Argentina</option>
                      <option value="Venezuelan Spanish">Venezuela</option>
                      <option value="Chilean Spanish">Chile</option>
                      <option value="Ecuadorian Spanish">Ecuador</option>
                      <option value="Peruvian Spanish">Perú</option>
                      <option value="Cuban Spanish">Cuba</option>
                    </optgroup>
                    <optgroup label="── Inglés ──">
                      <option value="American English, General accent">Inglés Americano</option>
                      <option value="British English, RP accent">Inglés Británico (RP)</option>
                      <option value="Australian English">Inglés Australiano</option>
                      <option value="Southern American English">Inglés Sureño (EE.UU.)</option>
                      <option value="New York English accent">Inglés Nueva York</option>
                    </optgroup>
                    <optgroup label="── Otros ──">
                      <option value="Brazilian Portuguese">Portugués Brasileño</option>
                      <option value="French accent">Francés</option>
                      <option value="Italian accent">Italiano</option>
                    </optgroup>
                  </select>
                </div>

                {/* TONO */}
                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
                     <Volume2 className="w-3 h-3" /> Tono
                  </label>
                  <select
                    value={audioState.tone}
                    onChange={(e) => setAudioState((prev: any) => ({ ...prev, tone: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white focus:ring-2 focus:ring-[#ff477b] appearance-none cursor-pointer hover:bg-white/10 transition-all"
                  >
                    <option value="Professional and polished">Profesional</option>
                    <option value="Warm and friendly">Cálido / Cercano</option>
                    <option value="Enthusiastic and upbeat">Entusiasta</option>
                    <option value="Calm and soothing">Calmo / Tranquilo</option>
                    <option value="Urgent and compelling">Urgente / Impactante</option>
                    <option value="Authoritative and confident">Autoritario / Seguro</option>
                    <option value="Casual and conversational">Casual / Natural</option>
                    <option value="Inspirational and motivating">Inspiracional</option>
                    <option value="Mysterious and intriguing">Misterioso</option>
                    <option value="Luxury and sophisticated">Lujoso / Sofisticado</option>
                    <option value="Youthful and energetic">Juvenil / Dinámico</option>
                    <option value="Newscast, clear and informative">Locutor de Noticias</option>
                    <option value="Documentary narrator, thoughtful">Narrador Documental</option>
                    <option value="Corporate presentation, clear and structured">Presentación Corporativa</option>
                  </select>
                </div>

                {/* EMOCIÓN */}
                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
                     <Sparkles className="w-3 h-3" /> Emoción
                  </label>
                  <select
                    value={audioState.emotion}
                    onChange={(e) => setAudioState((prev: any) => ({ ...prev, emotion: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white focus:ring-2 focus:ring-[#ff477b] appearance-none cursor-pointer hover:bg-white/10 transition-all"
                  >
                    <option value="Neutral">Neutral</option>
                    <option value="Happy and cheerful">Feliz / Alegre</option>
                    <option value="Serious and focused">Serio / Enfocado</option>
                    <option value="Excited and passionate">Emocionado / Apasionado</option>
                    <option value="Melancholic and reflective">Melancólico</option>
                    <option value="Surprised and amazed">Sorprendido</option>
                    <option value="Confident and assertive">Confiado / Asertivo</option>
                    <option value="Empathetic and compassionate">Empático / Compasivo</option>
                    <option value="Playful and humorous">Juguetón / Divertido</option>
                    <option value="Tense and dramatic">Tenso / Dramático</option>
                    <option value="Nostalgic and warm">Nostálgico / Cálido</option>
                    <option value="Proud and triumphant">Orgulloso / Triunfal</option>
                  </select>
                </div>
              </div>

              {/* Sliders Area */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-4">
                <div className="space-y-6">
                   <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black uppercase tracking-widest text-white/40">Pitch (Tonalidad)</label>
                      <span className="text-[11px] font-black text-[#ff477b]">{audioState.pitch.toFixed(1)}x</span>
                   </div>
                   <input 
                      type="range" 
                      min="0.5" 
                      max="1.5" 
                      step="0.1" 
                      value={audioState.pitch}
                      onChange={(e) => setAudioState((prev: any) => ({ ...prev, pitch: parseFloat(e.target.value) }))}
                      className="w-full accent-[#ff477b] h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
                   />
                   <div className="flex justify-between text-[11px] text-white/20 font-black uppercase">
                      <span>Grave</span>
                      <span>Agudo</span>
                   </div>
                </div>

                <div className="space-y-6">
                   <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black uppercase tracking-widest text-white/40">Velocidad</label>
                      <span className="text-[11px] font-black text-[#ff477b]">{audioState.speed.toFixed(1)}x</span>
                   </div>
                   <input 
                      type="range" 
                      min="0.5" 
                      max="2.0" 
                      step="0.1" 
                      value={audioState.speed}
                      onChange={(e) => setAudioState((prev: any) => ({ ...prev, speed: parseFloat(e.target.value) }))}
                      className="w-full accent-[#ff477b] h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
                   />
                   <div className="flex justify-between text-[11px] text-white/20 font-black uppercase">
                      <span>Lento</span>
                      <span>Rápido</span>
                   </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-6">
                <button
                  onClick={handleAudioGenerate}
                  disabled={audioState.isGenerating || !audioState.text}
                  className="w-full bg-white text-[#0a0f1e] py-10 rounded-3xl font-black uppercase tracking-[0.2em] text-xs hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-20 flex items-center justify-center gap-4 group"
                >
                  {audioState.isGenerating ? (
                    <RefreshCw className="w-6 h-6 animate-spin text-[#ff477b]" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#ff477b] flex items-center justify-center group-hover:scale-110 transition-transform">
                       <Volume2 className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <span>Generar Audio Profesional</span>
                </button>
              </div>

              {/* Resulting Audio Player */}
              {audioState.audioUrl && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-8 bg-white rounded-[2.5rem] border border-white/20 flex flex-col md:flex-row items-center gap-8 shadow-2xl"
                >
                  <div className="flex-1 w-full space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#ff477b]/10 flex items-center justify-center">
                          <Mic className="w-6 h-6 text-[#ff477b]" />
                        </div>
                        <div>
                          <span className="text-[11px] font-black uppercase tracking-widest text-[#0a0f1e] block">Masterización Neural Lista</span>
                          <span className="text-[11px] text-black/40 uppercase tracking-widest font-bold">Voz: {audioState.voice} • {audioState.language}</span>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button 
                          onClick={handleSaveToLibrary}
                          className="p-3 bg-black/5 rounded-xl hover:bg-[#ff477b] text-black hover:text-white transition-all flex items-center gap-2 group"
                          title="Guardar en Biblioteca"
                        >
                          <Heart className="w-4 h-4 group-hover:fill-current" />
                        </button>
                        <button 
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = audioState.audioUrl!;
                            a.download = `insitu_mastering_${Date.now()}.wav`;
                            a.click();
                          }}
                          className="p-4 bg-[#0a0f1e] text-white rounded-2xl flex items-center gap-3 hover:bg-[#ff477b] transition-all shadow-xl shadow-[#0a0f1e]/10 group"
                        >
                          <Download className="w-4 h-4" />
                          <span className="text-[11px] font-black uppercase tracking-widest">Descargar Master</span>
                        </button>
                      </div>
                    </div>
                    <audio src={proxiedAssetUrl(audioState.audioUrl)} controls className="w-full h-10" />
                  </div>
                </motion.div>
              )}

              {audioState.error && isSuperAdmin && (
                <ErrorDisplay error={audioState.error} isAdmin={true} />
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-500">
          {(!currentUser?.savedVoices || currentUser.savedVoices.length === 0) ? (
            <div className="py-24 flex flex-col items-center justify-center gap-6 opacity-30">
              <Library className="w-24 h-24" />
              <div className="text-center space-y-2">
                <p className="text-[11px] font-black uppercase tracking-widest text-white">Tu biblioteca está vacía</p>
                <p className="text-[11px] text-white/60">Genera locuciones y guárdalas para que aparezcan aquí.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4">
                <p className="text-[11px] font-black uppercase tracking-widest text-white/40">Tu biblioteca de Voces</p>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full w-fit">
                  <Clock className="w-3 h-3 text-amber-500" />
                  <span className="text-[11px] font-black uppercase tracking-tighter text-amber-500/80">
                    {language === 'es' ? 'Almacenamiento Efímero (7 Días)' : 'Ephemeral Storage (7 Days)'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(Array.isArray(currentUser.savedVoices) ? currentUser.savedVoices : []).map((sv) => (
                  <div key={sv.id} className="p-6 bg-white/5 rounded-3xl border border-white/10 hover:border-[#ff477b]/40 transition-all space-y-4 group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[#ff477b]">
                        <Mic className="w-4 h-4" />
                      </div>
                      <div className="max-w-[150px]">
                        <p className="text-[11px] font-black uppercase tracking-widest text-white truncate">{sv.name}</p>
                        <p className="text-[11px] text-white/40 uppercase tracking-widest">{new Date(sv.timestamp).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = sv.url;
                          a.download = `${sv.name}.wav`;
                          a.click();
                        }}
                        className="p-2 bg-white/10 rounded-lg hover:bg-[#ff477b] text-white transition-all"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => handleRemoveFromLibrary(sv.id)}
                        className="p-2 bg-white/10 rounded-lg hover:bg-rose-500 text-white transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="h-px bg-white/5 w-full" />
                  
                  <p className="text-[11px] text-white/40 line-clamp-2 md:h-8">{sv.text}</p>
                  
                  <div className="flex gap-2">
                     <button 
                       onClick={() => handleLoadFromLibrary(sv)}
                       className="flex-1 py-2 bg-[#ff477b]/10 hover:bg-[#ff477b] text-[#ff477b] hover:text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
                     >
                       Reutilizar Configuración
                     </button>
                     <button 
                       onClick={() => {
                         const audio = new Audio(sv.url);
                         audio.play();
                       }}
                       className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-all"
                     >
                       <Play className="w-3 h-3" />
                     </button>
                  </div>
                  
                  <audio src={sv.url} controls className="w-full h-8 brightness-90 contrast-125 hidden" />
                </div>
              ))}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

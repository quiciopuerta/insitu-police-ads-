import React, { useState } from 'react';
import { 
  FunnelArchitectResult, 
  AdGenerationResult, 
  LandingPageBrief,
  LandingPageSection
} from '../types';
import { 
  ArrowLeft, 
  Copy, 
  CheckCircle, 
  Sparkles, 
  Target as TargetIcon, 
  Search, 
  Megaphone, 
  Layout, 
  PieChart, 
  Users, 
  TrendingUp,
  Brain,
  Globe,
  Palette,
  ExternalLink,
  ClipboardCheck,
  ChevronRight,
  Smartphone,
  Monitor,
  Paintbrush,
  Lightbulb
} from "lucide-react";
import { TRANSLATIONS } from '../constants';

interface FunnelArchitectViewProps {
  result: FunnelArchitectResult | null;
  onBack: () => void;
  language?: 'es' | 'en';
}

const FunnelArchitectView: React.FC<FunnelArchitectViewProps> = ({ 
  result, 
  onBack,
  language = 'es' 
}) => {
  const [activeTab, setActiveTab] = useState<'ads' | 'landing'>('ads');
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Strategy */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack}
          className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-colors group"
        >
          <ArrowLeft className="w-6 h-6 text-slate-400 group-hover:text-white" />
        </button>
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
            Funnel <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff477b] to-indigo-500">Architect</span>
          </h1>
          <p className="text-slate-400 font-medium">Planificación Estratégica de Media & Landing Page</p>
        </div>
      </div>

      <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
          <Sparkles className="w-32 h-32 text-cyan-400" />
        </div>
        
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg">
            <Lightbulb className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            {language === 'es' ? 'Visión Estratégica' : 'Strategic Vision'}
          </h2>
        </div>
        
        <p className="text-slate-300 text-lg leading-relaxed max-w-4xl italic">
          "{result?.marketingStrategy}"
        </p>
        
        <div className="mt-4 flex gap-4">
          <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-slate-400">
            Framework: {result?.landingBrief.sellingStrategy}
          </span>
          <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-slate-400">
            Tono: {result?.landingBrief.toneOfVoice}
          </span>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex p-1 bg-slate-950 border border-white/5 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('ads')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'ads' 
              ? 'bg-white/10 text-white shadow-lg' 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Megaphone className="w-5 h-5" />
          {language === 'es' ? 'Anuncios' : 'Ads'}
        </button>
        <button
          onClick={() => setActiveTab('landing')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'landing' 
              ? 'bg-white/10 text-white shadow-lg' 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          {language === 'es' ? 'Brief Landing (Engagement)' : 'Landing Brief (Engagement)'}
        </button>
      </div>

      {/* Ads Tab content */}
      {activeTab === 'ads' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {result.ads.map((ad, idx) => (
            <div key={idx} className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden hover:border-cyan-500/50 transition-colors">
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                <span className="uppercase text-xs font-bold tracking-widest text-cyan-400">{ad.type}</span>
                <span className="text-xs text-slate-500">NeuroScore: {ad.neuroQualityScore}</span>
              </div>
              
              <div className="p-5 space-y-4">
                {ad.headlines.length > 0 && (
                  <div>
                    <span className="text-[11px] uppercase font-bold text-slate-500 mb-1 block">Headlines</span>
                    <ul className="space-y-2">
                      {ad.headlines.slice(0, 3).map((h, i) => (
                        <li key={i} className="text-sm text-white bg-slate-950 p-2 rounded border border-white/5">{h}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {ad.socialCopy && (
                  <div>
                    <span className="text-[11px] uppercase font-bold text-slate-500 mb-1 block">Social Copy</span>
                    <p className="text-sm text-slate-300 bg-slate-950 p-2 rounded border border-white/5 line-clamp-3">
                      {ad.socialCopy.body}
                    </p>
                  </div>
                )}

                <div className="pt-4 mt-4 border-t border-white/5">
                  <span className="text-[11px] uppercase font-bold text-slate-500 mb-1 block">Creative Prompt</span>
                  <p className="text-[11px] text-cyan-200/50 italic leading-snug">
                    {ad.creativePrompts.insitu}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Landing Brief Tab content */}
      {activeTab === 'landing' && (
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left: Section Navigator */}
          <div className="w-full lg:w-3/4 space-y-6">
             <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-4 mb-6">
                <p className="text-sm text-blue-300 flex items-center gap-2">
                   <Lightbulb className="w-5 h-5" />
                   {language === 'es' 
                     ? 'Usa este contenido para alimentar tu plataforma de Engagement.insitu.company' 
                     : 'Use this content to feed your Engagement.insitu.company platform'}
                </p>
             </div>

             {result.landingBrief.sections.map((section) => (
               <div key={section.id} className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                 <div className="px-6 py-4 bg-white/5 border-b border-white/10 flex justify-between items-center">
                   <div className="flex items-center gap-3">
                     <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[11px] rounded uppercase font-bold border border-white/5">
                       {section.type}
                     </span>
                     <h3 className="font-semibold text-white">{section.title}</h3>
                   </div>
                   <button 
                     onClick={() => handleCopy(`${section.title}\n${section.content}`, section.id)}
                     className="p-2 hover:bg-white/10 rounded-lg transition-colors group relative"
                   >
                     <ClipboardCheck className={`w-5 h-5 ${copied === section.id ? 'text-green-400' : 'text-slate-400'}`} />
                     {copied === section.id && (
                       <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[11px] px-2 py-1 rounded shadow-lg">COPIED</span>
                     )}
                   </button>
                 </div>
                 
                 <div className="p-6 space-y-4">
                   {section.subtitle && (
                     <p className="text-cyan-400 text-sm font-medium uppercase tracking-wider">{section.subtitle}</p>
                   )}
                   <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{section.content}</p>
                   
                   {section.items && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                       {section.items.map((item, i) => (
                         <div key={i} className="p-4 bg-white/5 rounded-xl border border-white/5">
                           <h4 className="text-white font-medium mb-1">{item.title}</h4>
                           <p className="text-xs text-slate-400">{item.description}</p>
                         </div>
                       ))}
                     </div>
                   )}

                   {section.visualPrompt && (
                     <div className="mt-8 p-4 bg-slate-950 rounded-xl border border-dashed border-white/10">
                        <span className="text-[11px] uppercase font-bold text-slate-500 mb-2 block flex items-center gap-1">
                          <Paintbrush className="w-3 h-3 text-cyan-400" />
                          {language === 'es' ? 'Sugerencia Visual (Brief para Engagement)' : 'Visual Suggestion (Engagement Brief)'}
                        </span>
                        <p className="text-xs text-cyan-200/40 italic">{section.visualPrompt}</p>
                     </div>
                   )}
                 </div>
               </div>
             ))}
          </div>

          {/* Right: Sidebar Insights */}
          <div className="w-full lg:w-1/4 space-y-6">
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 sticky top-24">
               <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">{language === 'es' ? 'Paleta de Color' : 'Color Palette'}</h4>
               <div className="flex gap-2 mb-8">
                  {result.landingBrief.suggestedColors.map((color, i) => (
                    <div key={i} className="group relative">
                      <div 
                        className="w-10 h-10 rounded-lg border border-white/20 shadow-lg" 
                        style={{ backgroundColor: color }}
                      />
                      <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[11px] text-slate-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                        {color}
                      </span>
                    </div>
                  ))}
               </div>

               <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">{language === 'es' ? 'Audiencia' : 'Audience'}</h4>
               <p className="text-xs text-slate-400 leading-relaxed mb-8">
                 {result.landingBrief.targetAudience}
               </p>

               <div className="p-4 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl border border-indigo-500/20">
                  <h5 className="text-[11px] font-bold text-indigo-300 mb-2 uppercase tracking-widest">Growth Tip</h5>
                  <p className="text-[11px] text-slate-300 italic">
                    {language === 'es' 
                      ? 'Lleva estos textos a Engagement portal para crear un AB test de esta propuesta estratégica.'
                      : 'Load these copies into Engagement portal to create an AB test of this strategic proposal.'}
                  </p>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FunnelArchitectView;

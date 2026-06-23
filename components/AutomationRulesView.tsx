import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings2, Activity, Square, Plus, Trash2, ArrowRight,
  TrendingDown, TrendingUp, AlertTriangle, Zap, Clock, ShieldAlert, CheckCircle2, RotateCcw,
  Search, Filter, ChevronRight, Share2, Copy
} from 'lucide-react';
import type { AuthUser, Language, AutomationRule, AutomationLog } from '../types';
import { automationService } from '../services/automationService';

interface AutomationRulesViewProps {
  currentUser: AuthUser | null;
  language: Language;
}

const TEMPLATES: Omit<AutomationRule, 'id' | 'createdAt' | 'isActive'>[] = [
  {
    name: 'Stop Loss Guard',
    description: 'Pausa automáticamente anuncios que superan el límite de CPA sin generar conversiones recientes.',
    logic: 'AND',
    templateType: 'stop_loss',
    conditions: [
      { id: '1', metric: 'cpa', operator: '>=', value: 25, timeframeDays: 3 },
      { id: '2', metric: 'roas', operator: '<', value: 1.0, timeframeDays: 3 },
    ],
    actions: [{ type: 'pause_ad' }],
  },
  {
    name: 'Budget Surf',
    description: 'Escala el presupuesto de los anuncios ganadores (Alto ROAS).',
    logic: 'AND',
    templateType: 'surf',
    conditions: [
      { id: '1', metric: 'roas', operator: '>', value: 3.5, timeframeDays: 3 },
      { id: '2', metric: 'spend', operator: '>', value: 10, timeframeDays: 3 },
    ],
    actions: [{ type: 'scale_budget', value: 20 }],
  },
  {
    name: 'Fatigue Guard',
    description: 'Rota automáticamente creativos que muestran signos de fricción por alta frecuencia.',
    logic: 'AND',
    templateType: 'fatigue_guard',
    conditions: [
      { id: '1', metric: 'frequency', operator: '>', value: 3.5, timeframeDays: 7 },
      { id: '2', metric: 'ctr', operator: '<', value: 0.8, timeframeDays: 3 },
    ],
    actions: [{ type: 'rotate_creative' }, { type: 'send_alert' }],
  },
  {
    name: 'Revive Hidden Gems',
    description: 'Reactiva ads pausados que tuvieron conversiones tardías (atribución retrasada).',
    logic: 'AND',
    templateType: 'revive',
    conditions: [
      { id: '1', metric: 'roas', operator: '>', value: 2.5, timeframeDays: 7 },
    ],
    actions: [{ type: 'revive_ad' }],
  }
];

export default function AutomationRulesView({ currentUser, language }: AutomationRulesViewProps) {
  const es = language === 'es';
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'rules' | 'templates' | 'logs'>('rules');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (currentUser?.id) {
      loadData();
    }
  }, [currentUser?.id]);

  const loadData = async () => {
    if (!currentUser?.id) return;
    setIsLoading(true);
    try {
      const [fetchedRules, fetchedLogs] = await Promise.all([
        automationService.fetchRules(currentUser.id),
        automationService.fetchLogs(currentUser.id)
      ]);
      setRules(fetchedRules);
      setLogs(fetchedLogs);
    } catch (error) {
      console.error('[AUTOMATION] Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyTemplate = async (template: typeof TEMPLATES[0]) => {
    if (!currentUser?.id) return;
    
    const newRule: AutomationRule = {
      ...template,
      id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      isActive: true,
      createdAt: Date.now(),
      templateType: template.templateType,
    };

    setRules(prev => [...prev, newRule]);
    setActiveTab('rules');

    // Persist to server
    await automationService.saveRule(newRule, currentUser.id);
  };

  const toggleRule = async (id: string) => {
    const rule = rules.find(r => r.id === id);
    if (!rule || !currentUser?.id) return;

    const updatedRule = { ...rule, isActive: !rule.isActive };
    setRules(prev => prev.map(r => r.id === id ? updatedRule : r));
    
    await automationService.saveRule(updatedRule, currentUser.id);
  };

  const deleteRule = async (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
    await automationService.deleteRule(id);
  };

  const renderMetricLabel = (m: string) => {
    const map: Record<string, string> = {
      cpa: 'CPA', roas: 'ROAS', ctr: 'CTR %', cpc: 'CPC', frequency: 'Frecuencia', spend: 'Inversión'
    };
    return map[m] || m.toUpperCase();
  };

  const filteredRules = rules.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-32">
      
      {/* GLOW BACKGROUND ACCENTS */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-500/5 blur-[100px] pointer-events-none -z-10" />

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-3xl flex items-center justify-center p-[1px] shadow-2xl shadow-emerald-500/20">
                <div className="w-full h-full bg-slate-950 rounded-[inherit] flex items-center justify-center">
                   <Settings2 className="w-7 h-7 text-emerald-400" />
                </div>
             </div>
             <div>
                <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">
                  Rules Lab <span className="text-emerald-500">.</span>
                </h1>
                <div className="flex items-center gap-2 mt-1">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{es ? 'Agente de Media Buying Autónomo' : 'Autonomous Media Buying Agent'}</span>
                </div>
             </div>
          </div>
          <p className="text-slate-400 text-sm max-w-xl font-medium leading-relaxed">
            {es 
              ? 'Potencia tus campañas con lógica de ejecución automática. Protege el ROAS y escala lo que funciona 24/7 sin intervención manual.'
              : 'Power up your campaigns with automatic execution logic. Protect ROAS and scale winners 24/7 without manual intervention.'}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group hidden sm:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
            <input 
              type="text" 
              placeholder={es ? 'Buscar regla...' : 'Search rules...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-slate-900/50 border border-white/5 rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/30 focus:bg-slate-900 transition-all w-64"
            />
          </div>
          <button
            onClick={() => setActiveTab('templates')}
            className="group relative px-6 py-3.5 bg-emerald-500 text-slate-950 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/10 hover:shadow-emerald-500/20 hover:-translate-y-1 transition-all flex items-center gap-2 overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <Plus className="w-4 h-4 relative z-10" />
            <span className="relative z-10">{es ? 'Explorar Tácticas' : 'Explore Tactics'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="px-4">
        <div className="flex gap-2 bg-slate-950/40 p-2 rounded-[1.75rem] border border-white/5 backdrop-blur-md w-fit">
          {[
            { id: 'rules', icon: Activity, label: es ? 'Mis Reglas' : 'My Rules', count: rules.length },
            { id: 'templates', icon: Zap, label: es ? 'Librería' : 'Library' },
            { id: 'logs', icon: Clock, label: es ? 'Historial' : 'History' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`relative flex items-center gap-3 px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
                activeTab === t.id
                  ? 'bg-white/10 text-white shadow-2xl'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              <t.icon className={`w-4 h-4 ${activeTab === t.id ? 'text-emerald-400' : ''}`} />
              {t.label}
              {t.count !== undefined && (
                <span className={`text-[10px] bg-slate-800 px-1.5 py-0.5 rounded-lg ${activeTab === t.id ? 'text-white' : 'text-slate-600'}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="px-4 mt-6 min-h-[500px]">
        
        {/* TAB: RULES */}
        {activeTab === 'rules' && (
          <div className="space-y-6">
            {filteredRules.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-32 bg-slate-900/20 rounded-[3.5rem] border border-white/5 border-dashed flex flex-col items-center"
              >
                <div className="w-20 h-20 bg-slate-950 border border-white/5 rounded-3xl flex items-center justify-center mb-6 text-slate-700">
                  <Activity className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">
                  {es ? 'Agente en Standby' : 'Agent in Standby'}
                </h3>
                <p className="text-slate-500 text-sm mt-3 mb-10 max-w-md font-medium">
                  {es ? 'No hay reglas activas configuradas. Selecciona una táctica de la librería para empezar a automatizar tu cuenta.' : 'No active rules configured. Select a tactic from the library to start automating your account.'}
                </p>
                <button
                  onClick={() => setActiveTab('templates')}
                  className="px-10 py-4 bg-white/5 text-white border border-white/10 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-slate-950 hover:border-emerald-500 transition-all shadow-2xl"
                >
                  {es ? 'Ver Librería de Tácticas' : 'View Tactics Library'}
                </button>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                <AnimatePresence mode="popLayout">
                  {filteredRules.map(rule => (
                    <motion.div 
                      key={rule.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className={`group relative p-8 rounded-[2.5rem] border backdrop-blur-xl transition-all duration-500 ${
                        rule.isActive 
                          ? 'bg-slate-900/60 border-emerald-500/20 shadow-[0_20px_50px_rgba(16,185,129,0.05)]' 
                          : 'bg-slate-900/20 border-white/5 opacity-80'
                      }`}
                    >
                      {rule.isActive && (
                        <div className="absolute top-0 left-0 bottom-0 w-[2px] bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)] h-full rounded-l-full" />
                      )}
                      
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-4 flex-wrap">
                            <h3 className="text-xl font-black text-white italic tracking-tight">{rule.name}</h3>
                            <div className="flex items-center gap-2">
                               <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full border tracking-widest ${
                                 rule.isActive 
                                   ? 'bg-emerald-500/10 text-emerald-400 border-emerald-400/20' 
                                   : 'bg-slate-800 text-slate-500 border-white/10'}`}>
                                 {rule.isActive ? (es ? 'Monitoring 24/7' : 'Monitoring 24/7') : (es ? 'Paused' : 'Paused')}
                               </span>
                               {rule.templateType && (
                                 <span className="text-[9px] bg-white/5 text-slate-500 border border-white/10 px-2.5 py-1 rounded-full uppercase font-black tracking-widest">
                                   {rule.templateType.replace('_', ' ')}
                                 </span>
                               )}
                            </div>
                          </div>
                          <p className="text-sm text-slate-500 font-medium max-w-2xl leading-relaxed">{rule.description}</p>
                        </div>
                        
                        <div className="flex items-center gap-6 self-start lg:self-center">
                          <div className="flex flex-col items-end gap-1">
                             <span className="text-[9px] font-black uppercase text-slate-600 tracking-wider">Status Control</span>
                             <div className="flex items-center gap-3">
                                <button
                                  onClick={() => toggleRule(rule.id)}
                                  className={`w-14 h-7 flex items-center rounded-full px-1 transition-all duration-300 shadow-inner ${rule.isActive ? 'bg-emerald-500 ring-4 ring-emerald-500/20' : 'bg-slate-800'}`}
                                >
                                  <motion.div 
                                    animate={{ x: rule.isActive ? 28 : 0 }}
                                    className="bg-white w-5 h-5 rounded-full shadow-lg"
                                  />
                                </button>
                             </div>
                          </div>
                          
                          <div className="h-10 w-[1px] bg-white/5 mx-2" />
                          
                          <div className="flex items-center gap-2">
                             <button className="w-10 h-10 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all">
                                <Copy className="w-4 h-4" />
                             </button>
                             <button 
                               onClick={() => deleteRule(rule.id)} 
                               className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/10 flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-lg hover:shadow-rose-500/20"
                             >
                                <Trash2 className="w-4 h-4" />
                             </button>
                          </div>
                        </div>
                      </div>

                      {/* Logic Map */}
                      <div className="mt-8 grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] items-center gap-6">
                        {/* Conditions Column */}
                        <div className="space-y-3">
                           <div className="flex items-center gap-2 mb-2">
                              <Filter className="w-3.5 h-3.5 text-slate-500" />
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{es ? 'Condiciones Críticas' : 'Critical Conditions'}</span>
                           </div>
                           <div className="flex flex-wrap gap-2">
                              {rule.conditions.map((c, i) => (
                                <React.Fragment key={c.id}>
                                  <div className="bg-slate-950/60 border border-white/5 rounded-2xl px-5 py-3 flex items-center gap-5 shadow-xl">
                                    <div className="flex flex-col">
                                       <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1.5">{renderMetricLabel(c.metric)}</span>
                                       <div className="flex items-center gap-2">
                                          <span className="text-sm font-black text-amber-500 leading-none">{c.operator}</span>
                                          <span className="text-lg font-black text-white leading-none">{c.value}</span>
                                       </div>
                                    </div>
                                    <div className="w-[1px] h-6 bg-white/5" />
                                    <div className="flex flex-col">
                                       <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1.5">{es ? 'Ventana' : 'Lookback'}</span>
                                       <span className="text-xs font-bold text-slate-400 leading-none">{c.timeframeDays}d</span>
                                    </div>
                                  </div>
                                  {i < rule.conditions.length - 1 && (
                                    <div className="flex items-center justify-center px-2">
                                       <span className="text-[11px] font-black text-emerald-500 uppercase bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 italic">{rule.logic}</span>
                                    </div>
                                  )}
                                </React.Fragment>
                              ))}
                           </div>
                        </div>

                        <div className="flex md:flex-col items-center justify-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-slate-700" />
                           <ArrowRight className="w-6 h-6 text-slate-700 hidden md:block" />
                           <ArrowRight className="w-6 h-6 text-slate-700 md:hidden" />
                           <div className="w-2 h-2 rounded-full bg-slate-700" />
                        </div>

                        {/* Actions Column */}
                        <div className="space-y-3">
                           <div className="flex items-center gap-2 mb-2">
                              <Zap className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{es ? 'Ejecución Automática' : 'Automatic Execution'}</span>
                           </div>
                           <div className="flex flex-wrap gap-2">
                              {rule.actions.map((a, i) => (
                                <div key={i} className="group/btn bg-emerald-500/5 border border-emerald-500/20 hover:border-emerald-500/40 rounded-2xl px-5 py-4 transition-all flex items-center gap-4 relative overflow-hidden">
                                  <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/20" />
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover/btn:scale-110 ${
                                    a.type.includes('pause') ? 'bg-rose-500/20 text-rose-400' : 
                                    a.type.includes('scale') ? 'bg-emerald-500/20 text-emerald-400' :
                                    'bg-indigo-500/20 text-indigo-400'
                                  }`}>
                                    {a.type === 'pause_ad' ? <Square className="w-5 h-5 fill-current" /> :
                                     a.type === 'scale_budget' ? <TrendingUp className="w-5 h-5" /> :
                                     a.type === 'decrease_budget' ? <TrendingDown className="w-5 h-5" /> :
                                     a.type === 'send_alert' ? <AlertTriangle className="w-5 h-5" /> :
                                     <RotateCcw className="w-5 h-5" />}
                                  </div>
                                  <div className="flex flex-col">
                                     <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">{es ? 'Acción IA' : 'AI Action'}</span>
                                     <span className="text-xs font-black text-white uppercase tracking-tight">
                                       {a.type.replace('_', ' ')}
                                       {a.value && <span className="text-emerald-400 ml-1.5">{es ? 'al' : 'by'} {a.value}%</span>}
                                     </span>
                                  </div>
                                </div>
                              ))}
                           </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {/* TAB: TEMPLATES */}
        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {TEMPLATES.map((t, idx) => (
              <motion.div 
                key={t.name}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="group relative bg-slate-900/40 p-8 rounded-[3rem] border border-white/5 hover:border-emerald-500/30 hover:bg-slate-900/60 transition-all duration-500 overflow-hidden"
              >
                {/* Decorative background shape */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex items-start justify-between relative z-10">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-slate-950 border border-white/5 shadow-2xl transition-transform group-hover:scale-110 ${
                      t.templateType === 'stop_loss' ? 'text-rose-400' : 
                      t.templateType === 'surf' ? 'text-emerald-400' : 
                      'text-amber-400'
                    }`}>
                      {t.templateType === 'stop_loss' ? <ShieldAlert className="w-7 h-7" /> : 
                       t.templateType === 'surf' ? <TrendingUp className="w-7 h-7" /> : 
                       <Activity className="w-7 h-7" />}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white tracking-tight leading-none mb-2">{t.name}</h3>
                      <div className="flex items-center gap-2">
                         <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                         <p className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em]">{t.templateType}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-slate-400 mt-6 leading-relaxed font-medium">
                  {t.description}
                </p>

                <div className="mt-8 space-y-4">
                   <div className="flex flex-col gap-2.5">
                      {t.conditions.map((c, i) => (
                        <div key={c.id} className="flex items-center gap-3 text-[11px] font-bold">
                          <span className="text-slate-600 w-8">{i === 0 ? 'IF' : t.logic}</span>
                          <span className="bg-slate-950/80 px-3 py-1.5 rounded-xl border border-white/5 text-slate-300">
                             {renderMetricLabel(c.metric)} <span className="text-amber-500 px-1">{c.operator}</span> {c.value}
                          </span>
                        </div>
                      ))}
                      {t.actions.map((a, i) => (
                        <div key={i} className="flex items-center gap-3 text-[11px] font-bold">
                          <span className="text-emerald-500/50 w-8">THEN</span>
                          <span className="bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 text-emerald-400 uppercase tracking-tight">
                             {a.type.replace('_', ' ')} {a.value && `+${a.value}%`}
                          </span>
                        </div>
                      ))}
                   </div>

                   <button 
                     onClick={() => applyTemplate(t)}
                     className="w-full mt-6 py-4 bg-white/5 hover:bg-emerald-500 hover:text-slate-950 border border-white/10 hover:border-emerald-500 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-2"
                   >
                     <Zap className="w-4 h-4" />
                     {es ? 'Activar Táctica' : 'Activate Tactic'}
                   </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* TAB: LOGS */}
        {activeTab === 'logs' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-slate-900/40 border border-white/5 rounded-[3rem] overflow-hidden backdrop-blur-3xl shadow-3xl"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-black/20 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <th className="px-8 py-6">{es ? 'Fecha y Hora' : 'Timestamp'}</th>
                    <th className="px-8 py-6">{es ? 'Estrategia' : 'Strategy'}</th>
                    <th className="px-8 py-6">{es ? 'Target Asset' : 'Target Asset'}</th>
                    <th className="px-8 py-6 text-center">{es ? 'Contexto (Snapshot)' : 'Context (Snapshot)'}</th>
                    <th className="px-8 py-6 text-right">{es ? 'Acción Ejecutada' : 'Action Executed'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {logs.length === 0 ? (
                    <tr><td colSpan={5} className="p-20 text-center text-slate-600 font-bold uppercase tracking-widest text-xs italic">{es ? 'Sin registros aún' : 'Systems nominal. No logs yet.'}</td></tr>
                  ) : (
                    logs.map(log => (
                      <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-8 py-6">
                           <div className="flex flex-col">
                              <span className="text-xs text-slate-400 font-bold">{new Date(log.timestamp).toLocaleDateString()}</span>
                              <span className="text-[10px] text-slate-600 font-mono italic">{new Date(log.timestamp).toLocaleTimeString()}</span>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                              <span className="text-sm font-black text-white italic tracking-tight">{log.ruleName}</span>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-indigo-300 font-bold flex items-center gap-1">
                               <ChevronRight className="w-3 h-3" /> {log.campaignId}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium ml-4">{log.adId}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center justify-center gap-2">
                            {Object.entries(log.metricsSnapshot).map(([k, v]) => (
                              <div key={k} className="bg-slate-950/80 border border-white/5 rounded-xl px-2.5 py-1 flex flex-col items-center">
                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">{k}</span>
                                <span className="text-[11px] font-black text-white">{v}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-400/20 px-4 py-2 rounded-xl group-hover:scale-105 transition-transform">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {log.actionTaken.replace('_', ' ')}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {logs.length > 0 && (
               <div className="p-6 bg-black/20 border-t border-white/5 text-center">
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                     {es ? 'Muestra de logs limitada a las últimas 100 ejecuciones' : 'Limited to the last 100 execution logs'}
                  </p>
               </div>
            )}
          </motion.div>
        )}

      </div>
    </div>
  );
}

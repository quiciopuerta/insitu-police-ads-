import React, { useState, useEffect } from 'react';
import { ExecutionRouter } from '../../services/bridge/ExecutionRouter';
import { Download, Cpu, CheckCircle2, ShieldCheck, X, Zap, TrendingUp } from 'lucide-react';

import { User } from '../../types';
import { OLLAMA_RANKED_MODELS, OllamaModelConfig, pickBestLocalModel, getModelConfig } from '../../constants/aiModels';

type EngineState = 'checking' | 'no_models' | 'has_models' | 'downloading' | 'ready' | 'error';

interface LocalAIManagerProps {
  currentUser: User | null;
}

export const LocalAIManager: React.FC<LocalAIManagerProps> = ({ currentUser }) => {
  const [engineState, setEngineState] = useState<EngineState>('checking');
  const [isVisible, setIsVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [installedModels, setInstalledModels] = useState<string[]>([]);
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [downloadingModel, setDownloadingModel] = useState<string | null>(null);

  // Check authorization
  const isAuthorized = currentUser && (
    currentUser.subscription?.plan === 'Growth' ||
    currentUser.subscription?.plan === 'Agency' ||
    currentUser.role === 'admin' ||
    currentUser.role === 'superAdmin' ||
    ['admin@insitu.ai', 'sanchezfj@me.com', 'sociopuerta@gmail.com', 'admin@insitu.company', 'contacto@fjsanchez.com'].includes(currentUser.email)
  );

  // Initial check and periodic refresh
  useEffect(() => {
    const checkEngine = async () => {
      if (!ExecutionRouter.isDesktopMode() || !isAuthorized) {
        setIsVisible(false);
        return;
      }

      try {
        const status = await ExecutionRouter.routeTask<any, any>(
          'check_ollama_status',
          {},
          async () => ({ installed: false, running: false, models: [] })
        );

        let currentStatus = status;

        if (!currentStatus.running) {
          try {
            await ExecutionRouter.routeTask('start_ollama_daemon', {}, async () => false);
            // Give it 3 seconds to spin up
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            currentStatus = await ExecutionRouter.routeTask<any, any>(
              'check_ollama_status',
              {},
              async () => ({ installed: false, running: false, models: [] })
            );

            if (!currentStatus.running) {
              setEngineState('error');
              setErrorMessage('No se pudo iniciar el motor local. Asegúrate de reiniciar la app.');
              setIsVisible(true);
              return;
            }
          } catch (err: any) {
            setEngineState('error');
            setErrorMessage('Error al arrancar motor local: ' + (err.message || err));
            setIsVisible(true);
            return;
          }
        }

        setInstalledModels(currentStatus.models);

        // Load preferred model from localStorage
        const saved = localStorage.getItem('insitu_preferred_local_model');
        const preferred = saved && currentStatus.models.includes(saved) ? saved : pickBestLocalModel(currentStatus.models);

        if (preferred) {
          setActiveModel(preferred);
          setEngineState('has_models');
        } else {
          setEngineState('no_models');
          setIsVisible(true);
        }
      } catch (err: any) {
        setEngineState('error');
        setErrorMessage(err.message || 'Error de conexión local');
        setIsVisible(true);
      }
    };

    checkEngine();
    const interval = setInterval(checkEngine, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [currentUser, isAuthorized]);

  const handleSelectModel = async (modelId: string) => {
    setActiveModel(modelId);
    localStorage.setItem('insitu_preferred_local_model', modelId);
  };

  const handleDownloadModel = async (modelId: string) => {
    setDownloadingModel(modelId);
    setEngineState('downloading');

    try {
      await ExecutionRouter.routeTask('pull_model', { modelName: modelId }, async () => {
        throw new Error('El motor local no está accesible o no se pudo iniciar.');
      });

      // Refresh model list
      const status = await ExecutionRouter.routeTask<any, any>(
        'check_ollama_status',
        {},
        async () => ({ installed: false, running: false, models: [] })
      );

      setInstalledModels(status.models);
      setActiveModel(modelId);
      localStorage.setItem('insitu_preferred_local_model', modelId);
      setDownloadingModel(null);
      setEngineState('has_models');
    } catch (err: any) {
      setDownloadingModel(null);
      setEngineState('error');
      setErrorMessage(err.message || 'Error al descargar el modelo');
    }
  };

  // Get models to recommend (best 3 not installed)
  const recommendedForDownload = OLLAMA_RANKED_MODELS
    .filter(m => !installedModels.includes(m.id))
    .slice(0, 3);

  // Get installed model configs
  const installedConfigs = installedModels
    .map(id => ({ id, config: getModelConfig(id) }))
    .filter(m => m.config)
    .sort((a, b) => (b.config?.score ?? 0) - (a.config?.score ?? 0));

  if (!isVisible || !ExecutionRouter.isDesktopMode() || !isAuthorized) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-2xl glass-panel rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto shadow-[0_0_80px_rgba(0,242,254,0.08)]">

        {/* Top glow — cyan theme */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-cyan/10 blur-[60px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-magenta/5 blur-[80px] pointer-events-none rounded-full" />

        <button
          onClick={() => setIsVisible(false)}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative z-10 flex flex-col text-center">

          <div className="flex items-center justify-center w-16 h-16 mb-6 mx-auto rounded-full bg-gradient-to-br from-cyan/20 to-magenta/20 border border-cyan/20">
            {engineState === 'has_models' ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            ) : (
              <Cpu className={`w-8 h-8 text-cyan ${['downloading', 'checking'].includes(engineState) ? 'animate-pulse' : ''}`} />
            )}
          </div>

          <h2 className="font-headline text-2xl font-black text-white tracking-tight mb-2">
            Motor de IA Local
          </h2>

          <p className="text-slate-300 mb-6 leading-relaxed">
            {engineState === 'checking' && "Verificando motor neuronal local..."}
            {engineState === 'no_models' && "Ollama está ejecutándose pero no hay modelos instalados. Elige uno recomendado para comenzar."}
            {engineState === 'has_models' && `${installedModels.length} modelo${installedModels.length > 1 ? 's' : ''} instalado${installedModels.length > 1 ? 's' : ''} y listo para usar.`}
            {engineState === 'downloading' && `Descargando ${downloadingModel}... Esto puede tardar varios minutos.`}
            {engineState === 'error' && `Ocurrió un problema: ${errorMessage}`}
          </p>

          {/* Installed Models Section */}
          {installedConfigs.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4 text-left">
                Modelos Instalados
              </h3>
              <div className="space-y-3">
                {installedConfigs.map(({ id, config }) => (
              <button
                    key={id}
                    onClick={() => handleSelectModel(id)}
                    className={`w-full p-4 rounded-2xl transition-all text-left border ${
                      activeModel === id
                        ? 'glass-card border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                        : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-black text-white flex items-center gap-2 text-sm">
                          {config && (
                            <>
                              <Zap className="w-4 h-4 text-amber-400" />
                              {config.label}
                            </>
                          )}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-widest">
                          Score <span className="text-cyan">{config?.score}/10</span> · {config?.tier}
                        </p>
                      </div>
                      {activeModel === id && (
                        <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Download Section */}
          {recommendedForDownload.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4 text-left">
                Modelos Recomendados
              </h3>
              <div className="space-y-3">
                {recommendedForDownload.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleDownloadModel(model.id)}
                    disabled={downloadingModel !== null}
                    className="w-full p-4 rounded-2xl transition-all text-left border border-white/5 bg-white/[0.03] hover:bg-cyan/5 hover:border-cyan/20 disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-white flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-cyan group-hover:text-cyan transition-colors" />
                          <span className="font-black text-white text-sm">{model.label}</span>
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-widest">
                          {model.tier === 'premium' && <span className="text-amber-400">⭐ Máxima calidad</span>}
                          {model.tier === 'high' && <span className="text-cyan">✨ Alta calidad</span>}
                          {model.tier === 'balanced' && <span className="text-emerald-400">⚙️ Equilibrado</span>}
                          {model.tier === 'fast' && <span className="text-violet-400">⚡ Rápido</span>}
                          {' · '}{(model.sizeMB / 1000).toFixed(1)}GB
                        </p>
                      </div>
                      {downloadingModel === model.id ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : (
                        <Download className="w-5 h-5 text-cyan flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active Model Indicator */}
          {activeModel && (
            <div className="mt-8 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.05)]">
              <p className="text-sm text-slate-300">
                <span className="font-black text-emerald-400">Modelo activo:</span> {activeModel}
              </p>
              <p className="text-[10px] text-slate-500 mt-2 font-bold">
                ✓ Tus datos permanecen locales. Las auditorías serán 100% privadas.
              </p>
            </div>
          )}

          {engineState === 'downloading' && (
            <div className="w-full mt-6">
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan to-magenta w-1/2 animate-[progress_2s_ease-in-out_infinite]" />
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center gap-2 text-[10px] text-slate-600 font-black uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4 text-cyan/50" />
            <span>Encriptación Zeroize Activada</span>
          </div>
        </div>
      </div>
      {/* Scroll padding */}
      <div className="p-8" />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Cloud, Zap, Cpu } from 'lucide-react';
import { ExecutionRouter } from '../../services/bridge/ExecutionRouter';
import { getActiveLocalModel } from '../../services/ai/AiUniversalBridge';
import { getModelConfig } from '../../constants/aiModels';

/**
 * Shows the current AI execution context (local/cloud, model in use)
 * Updates every 30 seconds to reflect changes in Ollama status
 */
export const AIContextBadge: React.FC = () => {
  const [context, setContext] = useState<'web' | 'desktop-local' | 'desktop-cloud'>('web');
  const [model, setModel] = useState<string | null>(null);
  const [modelConfig, setModelConfig] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    const updateContext = async () => {
      if (!ExecutionRouter.isDesktopMode()) {
        if (mounted) {
          setContext('web');
          setModel(null);
          setModelConfig(null);
        }
        return;
      }

      // Desktop mode: Check Ollama status directly instead of relying on lazy global var
      try {
        const status = await ExecutionRouter.routeTask<any, any>(
          'check_ollama_status',
          {},
          async () => ({ running: false, models: [] })
        );

        if (status && status.running && status.models.length > 0) {
          const saved = localStorage.getItem('insitu_preferred_local_model');
          // Inline simple fallback if pickBestLocalModel is missing
          const pickBest = (models: string[]) => {
            const ranked = ['llama3:8b', 'phi3:mini', 'mistral:7b', 'gemma:7b'];
            for (const r of ranked) {
              if (models.includes(r)) return r;
            }
            return models[0] || null;
          };

          const activeLocalModel = (saved && status.models.includes(saved)) 
            ? saved 
            : pickBest(status.models);

          if (activeLocalModel && mounted) {
            setContext('desktop-local');
            setModel(activeLocalModel);
            setModelConfig(getModelConfig(activeLocalModel));
            return; // Success
          }
        }
      } catch (e) {
        // Fallback below
      }

      if (mounted) {
        setContext('desktop-cloud');
        setModel(null);
        setModelConfig(null);
      }
    };

    updateContext();
    // Refresh slightly more often (10s) so it updates promptly when daemon starts
    const interval = setInterval(updateContext, 10000); 
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Web Production: Cloud context
  if (context === 'web') {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-xs font-medium text-blue-300">
        <Cloud className="w-3.5 h-3.5" />
        <span>Gemini Flash</span>
      </div>
    );
  }

  // Desktop with Local Ollama
  if (context === 'desktop-local' && model) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/30 text-xs font-medium text-green-300">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <Zap className="w-3.5 h-3.5" />
        <span className="max-w-[120px] truncate">{model}</span>
        {modelConfig && (
          <span className="text-xs opacity-75">({modelConfig.score}/10)</span>
        )}
      </div>
    );
  }

  // Desktop without Local (fallback to cloud)
  if (context === 'desktop-cloud') {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs font-medium text-amber-300">
        <Cpu className="w-3.5 h-3.5" />
        <span>Cloud</span>
      </div>
    );
  }

  return null;
};

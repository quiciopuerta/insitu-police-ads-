import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, Copy, CheckCircle2 } from 'lucide-react';
import { keyRotationService } from '../../services/ai/keyRotationService';
import { aiBridge } from '../../services/ai/AiUniversalBridge';
import { GLOBAL_MODEL_ID } from '../../constants/aiModels';
import { API_URL } from '../../utils/apiConfig';
import { AuthUser } from '../../types';

interface Suggestion {
  name: string;
  rationale: string;
}

interface AIResponse {
  suggestions: Suggestion[];
  tips: string[];
}

interface CampaignFormProps {
  currentUser: AuthUser;
  onSuccess: () => void;
  onCancel: () => void;
}

export const CampaignForm: React.FC<CampaignFormProps> = ({ currentUser, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    platform: 'meta',
    budget: '',
    maxBudgetAllowed: '',
    country: 'EC',
    channel: 'FB',
    objective: 'CONV',
    product: '',
    year: new Date().getFullYear().toString(),
  });

  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Generador de nomenclaturas via Gemini en el cliente
  const generateNomenclature = async (): Promise<AIResponse> => {
    return keyRotationService.fetchWithRetry(async (apiKey) => {
      const provider = aiBridge.getSmartProvider('ADS_AUDIT', apiKey);
      
      const prompt = `Eres un experto en taxonomía de campañas para Google Ads y Meta Ads.
      Genera 3 sugerencias de nomenclatura usando esta estructura base: PAÍS_CANAL_OBJETIVO_PRODUCTO_AÑO
      
      Parámetros:
      - País: ${formData.country}
      - Canal: ${formData.channel}
      - Objetivo: ${formData.objective}
      - Producto/Tema: ${formData.product || 'General'}
      - Año: ${formData.year}
      
      Devuelve la respuesta estrictamente en JSON (sin markdown, sin backticks) con este formato exacto:
      {
        "suggestions": [
          { "name": "EC_FB_CONV_Zapatos_2026", "rationale": "Explicación breve de por qué funciona" }
        ],
        "tips": ["Tip sobre mejores prácticas de nomenclatura", "Otro tip"]
      }`;

      const response = await provider.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature: 0.7,
        }
      });

      const responseText = response.text || '';
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as AIResponse;
        }
        return JSON.parse(responseText) as AIResponse;
      } catch (e) {
        console.error('Error parsing AI response:', e);
        throw new Error('Error al generar sugerencias');
      }
    });
  };

  const [aiSuggestions, setAiSuggestions] = useState<AIResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (!showAISuggestions) return;
    
    let isMounted = true;
    const fetchSuggestions = async () => {
      setAiLoading(true);
      try {
        const result = await generateNomenclature();
        if (isMounted) setAiSuggestions(result);
      } catch (err) {
        if (isMounted) alert('Error al generar sugerencias');
      } finally {
        if (isMounted) setAiLoading(false);
      }
    };
    fetchSuggestions();
    return () => { isMounted = false; };
  }, [showAISuggestions, formData.country, formData.channel, formData.objective, formData.product, formData.year]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.budget) {
      alert('Completa todos los campos requeridos');
      return;
    }
    
    setIsPending(true);
    try {
      const res = await fetch(`${API_URL}/api-police-campaigns`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id
        },
        body: JSON.stringify({
          name: formData.name,
          platform: formData.platform,
          budget: formData.budget,
          max_budget_allowed: formData.maxBudgetAllowed || formData.budget,
          country: formData.country,
          channel: formData.channel,
          objective: formData.objective
        }),
      });

      if (!res.ok) throw new Error('Failed to create campaign');
      
      alert('✅ Campaña creada exitosamente');
      onSuccess();
    } catch (err) {
      alert('❌ Error al crear campaña');
    } finally {
      setIsPending(false);
    }
  };

  const copySuggestion = (name: string, index: number) => {
    setFormData({ ...formData, name });
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    alert('✅ Nomenclatura copiada');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Información Básica</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">País (ISO)</label>
            <input
              type="text"
              maxLength={2}
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value.toUpperCase() })}
              className="w-full px-4 py-2 bg-[#0b0e17] border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-magenta outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Canal</label>
            <select
              value={formData.channel}
              onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
              className="w-full px-4 py-2 bg-[#0b0e17] border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-magenta outline-none"
            >
              <option value="FB">Meta Ads (FB)</option>
              <option value="GO">Google Ads (GO)</option>
              <option value="TK">TikTok (TK)</option>
              <option value="LI">LinkedIn (LI)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Objetivo</label>
            <select
              value={formData.objective}
              onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
              className="w-full px-4 py-2 bg-[#0b0e17] border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-magenta outline-none"
            >
              <option value="CONV">Conversiones</option>
              <option value="LEAD">Leads</option>
              <option value="TRAF">Tráfico</option>
              <option value="AW">Awareness</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Producto/Campaña</label>
            <input
              type="text"
              value={formData.product}
              onChange={(e) => setFormData({ ...formData, product: e.target.value })}
              placeholder="ej: BlackFriday"
              className="w-full px-4 py-2 bg-[#0b0e17] border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-magenta outline-none"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-white/70">Nombre de Campaña (Nomenclatura)</label>
            <button
              type="button"
              onClick={() => setShowAISuggestions(!showAISuggestions)}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-magenta/10 text-magenta hover:bg-magenta/20 transition-colors border border-magenta/20"
            >
              <Sparkles className="w-3 h-3" />
              {showAISuggestions ? 'Ocultar' : 'Sugerencias IA'}
            </button>
          </div>

          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Formato: PAÍS_CANAL_OBJETIVO_PRODUCTO_AÑO"
            className="w-full px-4 py-2 bg-[#0b0e17] border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-magenta outline-none"
          />

          {showAISuggestions && (
            <div className="mt-4 space-y-3 p-4 bg-gradient-to-br from-magenta/5 to-transparent rounded-lg border border-magenta/20">
              {aiLoading ? (
                <div className="flex items-center gap-2 text-white/60">
                  <Loader2 className="w-4 h-4 animate-spin text-magenta" />
                  <span className="text-sm">Generando nomenclaturas óptimas...</span>
                </div>
              ) : aiSuggestions?.suggestions?.length ? (
                <>
                  {aiSuggestions?.suggestions?.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => copySuggestion(s.name, i)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        copiedIndex === i
                          ? 'border-[#2edb8e] bg-[#2edb8e]/10'
                          : 'border-white/10 hover:border-magenta/50 bg-[#0b0e17]/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-white text-sm">{s.name}</p>
                          <p className="text-xs text-white/50 mt-1">{s.rationale}</p>
                        </div>
                        {copiedIndex === i ? (
                          <CheckCircle2 className="w-5 h-5 text-[#2edb8e]" />
                        ) : (
                          <Copy className="w-4 h-4 text-white/30" />
                        )}
                      </div>
                    </button>
                  ))}
                  {aiSuggestions.tips && aiSuggestions.tips.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-xs font-semibold text-magenta mb-2 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Tips de Arquitectura
                      </p>
                      <ul className="text-xs text-white/60 space-y-1">
                        {aiSuggestions?.tips?.map((tip, i) => (
                          <li key={i}>• {tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-white/50">No se pudieron generar sugerencias.</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Presupuesto</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Presupuesto Actual</label>
            <input
              type="number"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              placeholder="0.00"
              className="w-full px-4 py-2 bg-[#0b0e17] border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-magenta outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Límite Máximo Permitido</label>
            <input
              type="number"
              value={formData.maxBudgetAllowed}
              onChange={(e) => setFormData({ ...formData, maxBudgetAllowed: e.target.value })}
              placeholder="Opcional"
              className="w-full px-4 py-2 bg-[#0b0e17] border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-magenta outline-none"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-white/70 mb-2">Plataforma</label>
        <select
          value={formData.platform}
          onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
          className="w-full px-4 py-2 bg-[#0b0e17] border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-magenta outline-none"
        >
          <option value="meta">Meta Ads</option>
          <option value="google">Google Ads</option>
          <option value="tiktok">TikTok Ads</option>
        </select>
      </div>

      <div className="flex gap-4 pt-6 border-t border-white/10">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 text-white/70 border border-white/10 rounded-lg font-semibold hover:bg-white/5 hover:text-white transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 px-4 py-2 bg-magenta hover:bg-magenta/80 text-white rounded-lg font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creando...
            </>
          ) : (
            'Crear Campaña'
          )}
        </button>
      </div>
    </form>
  );
};

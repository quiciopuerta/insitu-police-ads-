import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, Plus, Trash2, GripVertical } from 'lucide-react';
import { API_URL } from '../../utils/apiConfig';
import { AuthUser } from '../../types';

interface Rule {
  type: string;
  label: string;
  required: boolean;
}

interface Policies {
  organization_id: string;
  campaign_rules: Rule[];
  adset_rules: Rule[];
  ad_rules: Rule[];
}

interface PoliciesViewProps {
  currentUser: AuthUser;
}

const AVAILABLE_SEGMENTS = [
  { type: 'pais', label: 'País (Ej: EC, CO, PE)' },
  { type: 'canal', label: 'Canal (Ej: FB, GO, TK)' },
  { type: 'objetivo', label: 'Objetivo (Ej: CONV, LEAD)' },
  { type: 'producto', label: 'Producto/Servicio' },
  { type: 'publico', label: 'Público/Audiencia' },
  { type: 'formato', label: 'Formato Visual' },
  { type: 'copy', label: 'Variante de Copy' },
  { type: 'anio', label: 'Año/Temporada (Ej: 2026-T1)' },
  { type: 'texto_libre', label: 'Texto Libre' }
];

export const PoliciesView: React.FC<PoliciesViewProps> = ({ currentUser }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  const [policies, setPolicies] = useState<Policies>({
    organization_id: '',
    campaign_rules: [],
    adset_rules: [],
    ad_rules: []
  });

  useEffect(() => {
    // Primero, obtener la organización del usuario
    fetch(`${API_URL}/api-police-organizations`, {
      headers: { 'X-User-Id': currentUser.id }
    })
      .then(res => res.json())
      .then(orgs => {
        if (orgs && orgs.length > 0) {
          const orgId = orgs[0].id;
          setOrganizationId(orgId);
          return fetch(`${API_URL}/api-police-policies?organization_id=${orgId}`, {
            headers: { 'X-User-Id': currentUser.id }
          });
        } else {
          throw new Error('No tienes una organización configurada para usar Police Ads.');
        }
      })
      .then(res => {
        if (!res) return;
        if (!res.ok) throw new Error('Error al cargar políticas');
        return res.json();
      })
      .then(data => {
        if (data) {
          const sanitizeRules = (rules: any) => {
            try {
              let parsed = typeof rules === 'string' ? JSON.parse(rules) : rules;
              if (!Array.isArray(parsed)) return [];
              return parsed.filter((r: any) => r && typeof r === 'object' && r.type && r.label);
            } catch (e) {
              return [];
            }
          };

          setPolicies({
            organization_id: data.organization_id || '',
            campaign_rules: sanitizeRules(data.campaign_rules),
            adset_rules: sanitizeRules(data.adset_rules),
            ad_rules: sanitizeRules(data.ad_rules)
          });
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, [currentUser]);

  const handleSave = async () => {
    if (!organizationId) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_URL}/api-police-policies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id
        },
        body: JSON.stringify({
          organization_id: organizationId,
          ...policies
        })
      });

      if (!response.ok) {
        throw new Error('Error al guardar las políticas');
      }

      setSuccess('Políticas guardadas correctamente. La extensión se actualizará en su próximo escaneo.');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addRule = (level: 'campaign_rules' | 'adset_rules' | 'ad_rules', segmentType: string) => {
    const segmentDef = AVAILABLE_SEGMENTS.find(s => s.type === segmentType);
    if (!segmentDef) return;

    setPolicies(prev => ({
      ...prev,
      [level]: [
        ...prev[level],
        { type: segmentType, label: segmentDef.label, required: true }
      ]
    }));
  };

  const removeRule = (level: 'campaign_rules' | 'adset_rules' | 'ad_rules', index: number) => {
    setPolicies(prev => ({
      ...prev,
      [level]: prev[level].filter((_, i) => i !== index)
    }));
  };

  const renderRuleEditor = (level: 'campaign_rules' | 'adset_rules' | 'ad_rules', title: string) => {
    const rawRules = policies[level];
    const rules = Array.isArray(rawRules) ? rawRules : [];

    return (
      <div className="bg-[#0b0e17] rounded-xl border border-white/5 p-6 mb-6">
        <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
        <p className="text-sm text-white/50 mb-4">
          Define los segmentos obligatorios que debe tener la nomenclatura (separados por guión bajo `_`).
        </p>

        <div className="flex flex-wrap gap-2 mb-6">
          {(Array.isArray(rules) ? rules : []).map((rule, index) => (
            <div key={index} className="flex items-center gap-2 bg-[#1a1f36] px-3 py-2 rounded-lg border border-white/10 group">
              <GripVertical className="w-4 h-4 text-white/30 cursor-move" />
              <span className="text-sm font-semibold text-white">{rule.label}</span>
              <button 
                onClick={() => removeRule(level, index)}
                className="text-white/30 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {!rules?.length && (
            <span className="text-sm text-white/30 italic">No hay reglas definidas. Nomenclatura libre.</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <select 
            id={`select-${level}`}
            className="bg-[#1a1f36] border border-white/10 text-white text-sm rounded-lg focus:ring-[#4f6bff] focus:border-[#4f6bff] block p-2.5"
            defaultValue=""
          >
            <option value="" disabled>Añadir segmento...</option>
            {AVAILABLE_SEGMENTS.map(s => (
              <option key={s.type} value={s.type}>{s.label}</option>
            ))}
          </select>
          <button
            onClick={() => {
              const select = document.getElementById(`select-${level}`) as HTMLSelectElement;
              if (select.value) {
                addRule(level, select.value);
                select.value = '';
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#4f6bff]/20 text-[#4f6bff] rounded-lg hover:bg-[#4f6bff]/30 transition-colors font-semibold text-sm"
          >
            <Plus className="w-4 h-4" />
            Añadir
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="p-8 text-center text-white/50">Cargando políticas...</div>;
  }

  if (error && !organizationId) {
    return (
      <div className="p-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <h3 className="text-red-400 font-bold">Error de Configuración</h3>
          <p className="text-white/60 text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Políticas de Gobernanza</h2>
          <p className="text-white/50 text-sm">Configura las reglas dinámicas de nomenclatura que la extensión validará.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#4f6bff] hover:bg-[#4f6bff]/90 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Guardar Cambios
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
          {success}
        </div>
      )}

      {renderRuleEditor('campaign_rules', 'Reglas para Campañas')}
      {renderRuleEditor('adset_rules', 'Reglas para Grupos de Anuncios (Ad Sets)')}
      {renderRuleEditor('ad_rules', 'Reglas para Anuncios (Ads)')}
    </div>
  );
};

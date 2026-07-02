import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, Plus, Trash2, GripVertical, Building2, UserCircle, Briefcase } from 'lucide-react';
import { API_URL } from '../../utils/apiConfig';
import { AuthUser } from '../../types';

interface Rule {
  type: string;
  label: string;
  required: boolean;
  allowedValues?: string;
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

  const [clients, setClients] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  const [selectedLevel, setSelectedLevel] = useState<'global' | 'client' | 'account'>('global');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  const [policies, setPolicies] = useState<Policies>({
    organization_id: '',
    campaign_rules: [],
    adset_rules: [],
    ad_rules: []
  });

  // Fetch init data
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API_URL}/api-police-organizations`, { headers: { 'X-User-Id': currentUser.id } }).then(r => {
        if (!r.ok) throw new Error('Error fetching organizations');
        return r.json();
      }),
      fetch(`${API_URL}/api-police-clients`, { headers: { 'X-User-Id': currentUser.id } }).then(r => r.ok ? r.json() : []),
      fetch(`${API_URL}/api-police-accounts`, { headers: { 'X-User-Id': currentUser.id } }).then(r => r.ok ? r.json() : [])
    ])
      .then(([orgs, cData, aData]) => {
        if (orgs && orgs.length > 0) {
          setOrganizationId(orgs[0].id);
          setClients(Array.isArray(cData) ? cData : []);
          setAccounts(Array.isArray(aData) ? aData : []);
        } else {
          throw new Error('No tienes una organización configurada para usar Police Ads.');
        }
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, [currentUser]);

  // Fetch policy when selection changes
  useEffect(() => {
    if (!organizationId) return;

    let cId = '';
    let aId = '';

    if (selectedLevel === 'client') {
      if (!selectedClientId) {
        setPolicies({ organization_id: organizationId, campaign_rules: [], adset_rules: [], ad_rules: [] });
        setLoading(false);
        return;
      }
      cId = selectedClientId;
    } else if (selectedLevel === 'account') {
      if (!selectedAccountId) {
        setPolicies({ organization_id: organizationId, campaign_rules: [], adset_rules: [], ad_rules: [] });
        setLoading(false);
        return;
      }
      aId = selectedAccountId;
      const acc = accounts.find(a => a.id === selectedAccountId);
      if (acc) cId = acc.client_id;
    }

    setLoading(true);
    let url = `${API_URL}/api-police-policies?organization_id=${organizationId}`;
    if (cId) url += `&client_id=${cId}`;
    if (aId) url += `&platform_account_id=${aId}`;

    fetch(url, { headers: { 'X-User-Id': currentUser.id } })
      .then(res => {
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
            organization_id: data.organization_id || organizationId,
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

  }, [organizationId, selectedLevel, selectedClientId, selectedAccountId, accounts, currentUser]);

  const handleSave = async () => {
    if (!organizationId) return;
    setSaving(true);
    setError('');
    setSuccess('');

    let cId = '';
    let aId = '';

    if (selectedLevel === 'client') {
      if (!selectedClientId) {
        setError("Selecciona un cliente");
        setSaving(false);
        return;
      }
      cId = selectedClientId;
    } else if (selectedLevel === 'account') {
      if (!selectedAccountId) {
        setError("Selecciona una cuenta");
        setSaving(false);
        return;
      }
      aId = selectedAccountId;
      const acc = accounts.find(a => a.id === selectedAccountId);
      if (acc) cId = acc.client_id;
    }

    try {
      const response = await fetch(`${API_URL}/api-police-policies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id
        },
        body: JSON.stringify({
          organization_id: organizationId,
          client_id: cId || null,
          platform_account_id: aId || null,
          campaign_rules: policies.campaign_rules,
          adset_rules: policies.adset_rules,
          ad_rules: policies.ad_rules
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
    const isTrafficker = (currentUser.role as string) === 'trafficker';

    return (
      <div className="bg-[#0b0e17] rounded-xl border border-white/5 p-6 mb-6">
        <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
        <p className="text-sm text-white/50 mb-4">
          Define los segmentos obligatorios que debe tener la nomenclatura (separados por guión bajo `_`).
        </p>

        <div className="flex flex-wrap gap-3 mb-6">
          {(Array.isArray(rules) ? rules : []).map((rule, index) => (
            <div key={index} className="flex flex-col gap-2 bg-[#1a1f36] p-3 rounded-lg border border-white/10 group min-w-[180px]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {!isTrafficker && <GripVertical className="w-3.5 h-3.5 text-white/30 cursor-move" />}
                  <span className="text-xs font-semibold text-white">{rule.label}</span>
                </div>
                {!isTrafficker && (
                  <button 
                    onClick={() => removeRule(level, index)}
                    className="text-white/30 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {!isTrafficker && (
                <input 
                  type="text"
                  placeholder="Valores permitidos (Ej: EC, CO, PE)"
                  value={rule.allowedValues || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPolicies(prev => ({
                      ...prev,
                      [level]: prev[level].map((r, i) => i === index ? { ...r, allowedValues: val } : r)
                    }));
                  }}
                  className="bg-black/30 border border-white/10 rounded px-2 py-1 text-[10px] text-white outline-none focus:border-[#4f6bff] w-full"
                />
              )}
              {rule.allowedValues && (
                <span className="text-[9px] text-[#4f6bff] truncate max-w-[170px]" title={rule.allowedValues}>
                  Filtro: {rule.allowedValues}
                </span>
              )}
            </div>
          ))}
          {!rules?.length && (
            <span className="text-sm text-white/30 italic">No hay reglas definidas para este nivel.</span>
          )}
        </div>

        {!isTrafficker && (
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
        )}
      </div>
    );
  };

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
          <p className="text-white/50 text-sm">Configura las reglas dinámicas de nomenclatura por jerarquía.</p>
        </div>
        {(currentUser.role as string) !== 'trafficker' && (
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#4f6bff] hover:bg-[#4f6bff]/90 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Guardar Cambios
          </button>
        )}
      </div>

      <div className="bg-[#0b0e17] rounded-xl border border-white/5 p-6 mb-6 flex flex-col md:flex-row gap-4 items-center">
        <div className="flex bg-[#1a1f36] rounded-lg p-1 border border-white/10 w-full md:w-auto">
          <button 
            onClick={() => setSelectedLevel('global')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${selectedLevel === 'global' ? 'bg-[#4f6bff] text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
          >
            <Building2 className="w-4 h-4" /> Agencia Global
          </button>
          <button 
            onClick={() => setSelectedLevel('client')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${selectedLevel === 'client' ? 'bg-[#4f6bff] text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
          >
            <UserCircle className="w-4 h-4" /> Por Cliente
          </button>
          <button 
            onClick={() => setSelectedLevel('account')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${selectedLevel === 'account' ? 'bg-[#4f6bff] text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
          >
            <Briefcase className="w-4 h-4" /> Por Cuenta
          </button>
        </div>

        {selectedLevel === 'client' && (
          <select 
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="flex-1 bg-[#1a1f36] border border-white/10 text-white text-sm rounded-lg focus:ring-[#4f6bff] focus:border-[#4f6bff] block p-2.5"
          >
            <option value="">Selecciona un Cliente...</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}

        {selectedLevel === 'account' && (
          <select 
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="flex-1 bg-[#1a1f36] border border-white/10 text-white text-sm rounded-lg focus:ring-[#4f6bff] focus:border-[#4f6bff] block p-2.5"
          >
            <option value="">Selecciona una Cuenta Publicitaria...</option>
            {accounts.map(a => {
              const client = clients.find(c => c.id === a.client_id);
              return (
                <option key={a.id} value={a.id}>
                  {client ? `${client.name} - ` : ''}{a.account_name || a.account_id} ({a.platform})
                </option>
              );
            })}
          </select>
        )}
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

      {loading ? (
        <div className="p-8 text-center text-white/50">Cargando políticas...</div>
      ) : (
        <>
          {renderRuleEditor('campaign_rules', 'Reglas para Campañas')}
          {renderRuleEditor('adset_rules', 'Reglas para Grupos de Anuncios (Ad Sets)')}
          {renderRuleEditor('ad_rules', 'Reglas para Anuncios (Ads)')}
          <NamingBuilder policies={policies} />
        </>
      )}
    </div>
  );
};

// ─── NAMING BUILDER COMPONENT ──────────────────────────────────────────────────
const NamingBuilder: React.FC<{ policies: Policies }> = ({ policies }) => {
  const [selectedLevel, setSelectedLevel] = useState<'campaign' | 'adset' | 'ad'>('campaign');
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const rulesKey = selectedLevel === 'campaign' ? 'campaign_rules' : selectedLevel === 'adset' ? 'adset_rules' : 'ad_rules';
  const activeRules = policies[rulesKey] || [];

  // Reset inputs when rules or level changes
  useEffect(() => {
    setInputs({});
    setCopied(false);
  }, [selectedLevel, policies]);

  const handleInputChange = (index: number, val: string) => {
    setInputs(prev => ({
      ...prev,
      [index]: val.replace(/\s+/g, '-') // Replace spaces with dashes for clean naming conventions
    }));
    setCopied(false);
  };

  // Build the final naming string
  const buildName = () => {
    if (!activeRules.length) return '';
    return activeRules.map((rule, idx) => {
      const val = inputs[idx] || '';
      return val || `[${rule.label.split(' ')[0]}]`;
    }).join('_');
  };

  const handleCopy = () => {
    const name = buildName();
    if (!name || name.includes('[')) return;
    navigator.clipboard.writeText(name);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const nameString = buildName();
  const isComplete = activeRules.length > 0 && activeRules.every((_, idx) => inputs[idx]);

  return (
    <div className="bg-[#0b0e17] rounded-xl border border-white/5 p-6 mt-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 border-b border-white/5 pb-4 gap-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4f6bff] animate-pulse" />
            Asistente Constructor de Nombres (Naming Builder)
          </h3>
          <p className="text-xs text-white/50 mt-0.5">Genera nomenclaturas estructuradas listas para tus campañas de Google o Meta Ads.</p>
        </div>
        <div className="flex bg-[#1a1f36] rounded-lg p-0.5 border border-white/10 w-fit">
          <button 
            onClick={() => setSelectedLevel('campaign')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${selectedLevel === 'campaign' ? 'bg-[#4f6bff] text-white' : 'text-white/50 hover:text-white'}`}
          >
            Campaña
          </button>
          <button 
            onClick={() => setSelectedLevel('adset')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${selectedLevel === 'adset' ? 'bg-[#4f6bff] text-white' : 'text-white/50 hover:text-white'}`}
          >
            Ad Set
          </button>
          <button 
            onClick={() => setSelectedLevel('ad')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${selectedLevel === 'ad' ? 'bg-[#4f6bff] text-white' : 'text-white/50 hover:text-white'}`}
          >
            Anuncio
          </button>
        </div>
      </div>

      {!activeRules.length ? (
        <div className="py-8 text-center text-white/40 text-sm italic border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
          No hay reglas de nomenclatura configuradas para este nivel. Configura las reglas arriba para habilitar el constructor.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {activeRules.map((rule, idx) => {
              const options = rule.allowedValues 
                ? rule.allowedValues.split(',').map(s => s.trim()).filter(Boolean)
                : [];

              return (
                <div key={idx} className="space-y-1.5">
                  <label className="text-xs font-bold text-white/60 flex items-center gap-1.5">
                    {rule.label}
                    {rule.required && <span className="text-red-400">*</span>}
                  </label>
                  {options.length > 0 ? (
                    <select
                      value={inputs[idx] || ''}
                      onChange={(e) => handleInputChange(idx, e.target.value)}
                      className="w-full bg-[#1a1f36] border border-white/10 rounded-lg p-2.5 text-xs text-white outline-none focus:border-[#4f6bff]"
                    >
                      <option value="">Selecciona...</option>
                      {options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder={`Escribe ${rule.label.toLowerCase()}`}
                      value={inputs[idx] || ''}
                      onChange={(e) => handleInputChange(idx, e.target.value)}
                      className="w-full bg-[#1a1f36] border border-white/10 rounded-lg p-2.5 text-xs text-white outline-none focus:border-[#4f6bff]"
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="bg-black/30 border border-white/5 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-black tracking-widest text-[#4f6bff]">Nombre Estructurado Resultante</span>
              <p className="font-mono text-xs text-white font-bold select-all break-all">{nameString}</p>
            </div>
            <button
              onClick={handleCopy}
              disabled={!isComplete}
              className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
                isComplete 
                  ? 'bg-[#4f6bff] hover:bg-[#4f6bff]/90 text-white cursor-pointer shadow-lg shadow-[#4f6bff]/20' 
                  : 'bg-white/5 text-white/30 cursor-not-allowed border border-white/5'
              }`}
            >
              {copied ? '¡Copiado!' : 'Copiar Nombre'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


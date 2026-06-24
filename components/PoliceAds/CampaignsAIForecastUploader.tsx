import React, { useState, useEffect } from 'react';
import { Upload, X, AlertCircle, CheckCircle2, Loader2, Sparkles, ClipboardPaste } from 'lucide-react';
import { API_URL } from '../../utils/apiConfig';
import { AuthUser } from '../../types';
import { parseForecastAgent, ParsedCampaign } from '../../services/ai/forecastAnalysisService';

interface CampaignsAIForecastUploaderProps {
  currentUser: AuthUser;
  onSuccess: () => void;
  onCancel: () => void;
}

export const CampaignsAIForecastUploader: React.FC<CampaignsAIForecastUploaderProps> = ({ currentUser, onSuccess, onCancel }) => {
  const [clients, setClients] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  
  const [rawInput, setRawInput] = useState('');
  const [preview, setPreview] = useState<ParsedCampaign[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api-police-clients`, {
      headers: { 'X-User-Id': currentUser.id }
    })
      .then(res => res.json())
      .then(data => setClients(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));

    fetch(`${API_URL}/api-police-accounts`, {
      headers: { 'X-User-Id': currentUser.id }
    })
      .then(res => res.json())
      .then(data => setAccounts(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  }, [currentUser]);

  const handleAnalyze = async () => {
    if (!rawInput.trim()) {
      setError('Pega los datos del forecast primero.');
      return;
    }
    if (!selectedClient || !selectedAccount) {
      setError('Selecciona Cliente y Cuenta Destino primero.');
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const result = await parseForecastAgent(rawInput);
      if (!result || result.length === 0) {
        throw new Error('La IA no pudo encontrar ninguna campaña en el texto proporcionado.');
      }
      setPreview(result);
    } catch (err: any) {
      setError(err.message || 'Error analizando con IA.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (preview.length === 0) return;
    if (!selectedClient || !selectedAccount) {
      setError('Debes seleccionar una cuenta destino.');
      return;
    }

    setUploading(true);
    setError(null);

    // Transform to expected API payload
    const payload = preview.map(row => ({
      client_id: selectedClient,
      account_id: selectedAccount,
      name: row.name,
      platform: row.platform,
      budget: Number(row.budget) || 0,
      max_budget_allowed: Number(row.max_budget_allowed) || Number(row.budget) || 0,
      status: row.status || 'active',
      country: row.country || '',
      channel: row.channel || '',
      objective: row.objective || '',
      product: row.product || '',
      year: row.year || ''
    }));

    try {
      const res = await fetch(`${API_URL}/api-police-campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Error al guardar las campañas.');
      
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error desconocido al subir.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-[#0b0e17] rounded-xl border border-white/10 p-6 relative">
      <button 
        onClick={onCancel}
        className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-[#4f6bff]/20 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-[#4f6bff]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Importación Inteligente con IA</h2>
          <p className="text-sm text-white/50">El Agente INsitu analizará tu forecast y extraerá las campañas</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">Cliente Destino</label>
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="w-full bg-[#1a1f36] border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-[#4f6bff]"
          >
            <option value="">Selecciona un cliente...</option>
            {(Array.isArray(clients) ? clients : []).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">Cuenta Publicitaria</label>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="w-full bg-[#1a1f36] border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-[#4f6bff]"
            disabled={!selectedClient}
          >
            <option value="">Selecciona una cuenta...</option>
            {(Array.isArray(accounts) ? accounts : []).filter(a => a.client_id === selectedClient).map(a => (
              <option key={a.id} value={a.id}>{a.name} ({a.platform})</option>
            ))}
          </select>
        </div>
      </div>

      {preview.length === 0 ? (
        <div className="mb-6">
          <label className="block text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
            <ClipboardPaste className="w-4 h-4" /> 
            Pega tu Forecast (Excel, Texto Libre, CSV)
          </label>
          <textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder="Copia las filas desde Excel o pega un texto crudo aquí..."
            className="w-full h-40 bg-[#1a1f36] border border-white/10 rounded-lg p-4 text-sm text-white font-mono placeholder:text-white/20 outline-none focus:border-[#4f6bff]"
          />
          <button
            onClick={handleAnalyze}
            disabled={analyzing || !rawInput.trim()}
            className="mt-4 px-4 py-2 bg-[#4f6bff] hover:bg-[#3d56d6] text-white rounded-lg flex items-center gap-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {analyzing ? 'Analizando...' : 'Analizar con IA'}
          </button>
        </div>
      ) : (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-white/70">Campañas Detectadas ({preview.length})</h3>
            <button
              onClick={() => { setPreview([]); setRawInput(''); }}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Descartar e Iniciar de Nuevo
            </button>
          </div>
          <div className="overflow-x-auto border border-white/10 rounded-lg">
            <table className="w-full text-left text-sm text-white/70">
              <thead className="bg-[#1a1f36] text-xs text-white/50 uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Nombre de Campaña</th>
                  <th className="px-4 py-3 font-medium">Plataforma</th>
                  <th className="px-4 py-3 font-medium">Obj</th>
                  <th className="px-4 py-3 font-medium text-right">Presup.</th>
                  <th className="px-4 py-3 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {preview.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/5">
                    <td className="px-4 py-3 font-mono text-white text-xs">{row.name}</td>
                    <td className="px-4 py-3 uppercase">{row.platform}</td>
                    <td className="px-4 py-3">{row.objective}</td>
                    <td className="px-4 py-3 text-right">${Number(row.budget).toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      {row.status === 'active' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block"></span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-transparent text-white/70 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={uploading}
              className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-2 font-bold transition-all disabled:opacity-50 shadow-lg shadow-green-500/20"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {uploading ? 'Guardando...' : `Confirmar y Subir ${preview.length}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

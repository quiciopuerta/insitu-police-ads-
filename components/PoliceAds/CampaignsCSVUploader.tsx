import React, { useState, useEffect } from 'react';
import { Upload, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { API_URL } from '../../utils/apiConfig';
import { AuthUser } from '../../types';

interface CampaignsCSVUploaderProps {
  currentUser: AuthUser;
  onSuccess: () => void;
  onCancel: () => void;
}

export const CampaignsCSVUploader: React.FC<CampaignsCSVUploaderProps> = ({ currentUser, onSuccess, onCancel }) => {
  const [clients, setClients] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.type !== 'text/csv' && !selected.name.endsWith('.csv')) {
      setError('El archivo debe ser un CSV válido.');
      return;
    }

    setFile(selected);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(selected);
  };

  const parseCSV = (csvText: string) => {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) {
      setError('El archivo CSV está vacío o no tiene encabezados.');
      return;
    }

    const rawHeaders = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Mapeo flexible de columnas
    const headerMapping: Record<string, string> = {};
    rawHeaders.forEach(h => {
      if (h.includes('name') || h.includes('nombre') || h.includes('campaña') || h.includes('campaign')) headerMapping[h] = 'name';
      else if (h.includes('platform') || h.includes('plataforma') || h.includes('canal')) headerMapping[h] = 'platform';
      else if (h.includes('budget') || h.includes('presupuesto')) headerMapping[h] = 'budget';
      else if (h.includes('max') || h.includes('límite')) headerMapping[h] = 'max_budget_allowed';
      else if (h.includes('status') || h.includes('estado')) headerMapping[h] = 'status';
      else if (h.includes('country') || h.includes('país') || h.includes('pais')) headerMapping[h] = 'country';
      else if (h.includes('channel') || h.includes('medio')) headerMapping[h] = 'channel';
      else if (h.includes('objective') || h.includes('objetivo')) headerMapping[h] = 'objective';
      else if (h.includes('product') || h.includes('producto')) headerMapping[h] = 'product';
      else if (h.includes('year') || h.includes('año') || h.includes('ano')) headerMapping[h] = 'year';
      else headerMapping[h] = h; // Fallback
    });

    const mappedHeaders = Object.values(headerMapping);

    if (!mappedHeaders.includes('name') || !mappedHeaders.includes('budget')) {
      setError('El CSV debe incluir al menos una columna para el Nombre de Campaña y otra para el Presupuesto.');
      return;
    }

    const parsedData = [];
    for (let i = 1; i < lines.length; i++) {
      // Ignorar líneas vacías y respetar comas dentro de comillas (simple parser)
      let rowStr = lines[i];
      let values = [];
      let inQuotes = false;
      let currVal = '';
      for (let j = 0; j < rowStr.length; j++) {
        if (rowStr[j] === '"') {
          inQuotes = !inQuotes;
        } else if (rowStr[j] === ',' && !inQuotes) {
          values.push(currVal.trim());
          currVal = '';
        } else {
          currVal += rowStr[j];
        }
      }
      values.push(currVal.trim());

      const row: any = {};
      rawHeaders.forEach((h, index) => {
        const standardKey = headerMapping[h];
        let val = values[index] || '';
        // Si el string viene con comillas dobles al inicio y final, quitarlas
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        }
        row[standardKey] = val;
      });
      parsedData.push(row);
    }

    setPreview(parsedData);
  };

  const handleUpload = async () => {
    if (!selectedClient || !selectedAccount || preview.length === 0) {
      setError('Selecciona un cliente, una cuenta y carga un archivo válido.');
      return;
    }

    setUploading(true);
    setError(null);

    const accountObj = accounts.find(a => a.id === selectedAccount);
    const organizationId = currentUser.organization_id || '00000000-0000-0000-0000-000000000000';

    const payload = preview.map(row => ({
      id: crypto.randomUUID(),
      organization_id: organizationId,
      client_id: selectedClient,
      platform_account_id: selectedAccount,
      name: row.name,
      platform: row.platform || accountObj?.platform || 'meta',
      budget: parseFloat(row.budget),
      max_budget_allowed: parseFloat(row.max_budget_allowed || row.budget),
      status: row.status || 'draft',
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
      setError(err.message || 'Error desconocido.');
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
        <div className="w-10 h-10 rounded-lg bg-magenta/20 flex items-center justify-center">
          <Upload className="w-5 h-5 text-magenta" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Importar CSV</h2>
          <p className="text-sm text-white/50">Carga múltiples campañas desde un archivo</p>
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

      <div className="mb-6">
        <label className="block text-sm font-medium text-white/70 mb-2">Archivo CSV</label>
        <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-magenta/50 transition-colors">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            id="csv-upload"
          />
          <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center">
            <Upload className="w-8 h-8 text-white/40 mb-3" />
            <p className="text-white font-medium mb-1">
              {file ? file.name : "Haz clic para subir un archivo CSV"}
            </p>
            <p className="text-sm text-white/40">Formato: name, platform, budget...</p>
          </label>
        </div>
      </div>

      {preview.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Vista Previa ({preview.length} filas)</h3>
            <span className="text-xs px-2 py-1 bg-[#2edb8e]/20 text-[#2edb8e] rounded-md flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Formato Válido
            </span>
          </div>
          <div className="overflow-x-auto border border-white/10 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-4 py-2 text-white/70 font-semibold">Nombre</th>
                  <th className="px-4 py-2 text-white/70 font-semibold">Plataforma</th>
                  <th className="px-4 py-2 text-white/70 font-semibold">Presupuesto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(Array.isArray(preview) ? preview : []).slice(0, 5).map((row, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 text-white">{row.name}</td>
                    <td className="px-4 py-2 text-white/70">{row.platform}</td>
                    <td className="px-4 py-2 text-white/70">${row.budget}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.length > 5 && (
            <p className="text-center text-xs text-white/40 mt-2">Mostrando 5 de {preview.length} campañas</p>
          )}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-white/70 hover:bg-white/5 transition-colors font-semibold"
        >
          Cancelar
        </button>
        <button
          onClick={handleUpload}
          disabled={uploading || preview.length === 0 || !selectedClient || !selectedAccount}
          className="bg-magenta hover:bg-magenta/80 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Importando...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Importar {preview.length} Campañas
            </>
          )}
        </button>
      </div>
    </div>
  );
};

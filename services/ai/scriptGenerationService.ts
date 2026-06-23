import { authService } from '../auth/authService';
import { buildAbsoluteUrl } from '../../utils/apiConfig';
import { keyRotationService } from './keyRotationService';

export interface GenerateScriptRequest {
  brief: string;
  customerId?: string;
  realAccountData?: any;
  configuration?: {
    excludeBrandCampaigns: boolean;
    executionMode: 'preview' | 'live';
    excludeConvertedKeywords: boolean;
    cpcThreshold?: number;
    budgetThreshold?: number;
  };
}

export interface GenerateScriptResponse {
  id: string;
  script_content: string;
  decisionReport: string;
  safetyAlerts: string;
  instructions: string;
}

export const scriptGenerationService = {
  async generateAdsScript(request: GenerateScriptRequest): Promise<GenerateScriptResponse> {
    const user = await authService.getCurrentUser();
    if (!user || !user.id) {
      console.error('[scriptGenerationService] User not authenticated or missing ID:', user);
      throw new Error('Por favor inicia sesión primero. | Please sign in first.');
    }

    try {
      const apiKey = keyRotationService.getNextKey();
      
      const res = await fetch(buildAbsoluteUrl('/.netlify/functions/api-generate-ads-script'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id,
          ...(apiKey ? { 'X-Gemini-Key': apiKey } : {})
        },
        body: JSON.stringify(request)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('[scriptGenerationService] API error:', res.status, errorData);

        if (res.status === 401) {
          if (errorData.error === "User not authenticated. Please sign in first." || errorData.error === "User account not found.") {
            throw new Error('Sesión expirada. Por favor inicia sesión de nuevo. | Session expired. Please sign in again.');
          } else {
             throw new Error(errorData.error || 'Problema de configuración de la IA. Por favor verifica tus llaves API.');
          }
        }

        throw new Error(errorData.error || 'Error generando el script de Google Ads');
      }

      return await res.json();
    } catch (error: any) {
      console.error('[scriptGenerationService] Request failed:', error);
      throw error;
    }
  }
};

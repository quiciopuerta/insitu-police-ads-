import { StudioProvider } from './AiUniversalBridge';
import { keyRotationService } from './keyRotationService';
import { GLOBAL_MODEL_ID } from '../../constants/aiModels';

export interface ParsedCampaign {
  name: string;
  platform: string;
  budget: number;
  max_budget_allowed: number;
  status: string;
  country: string;
  channel: string;
  objective: string;
  product: string;
  year: string;
}

export const parseForecastAgent = async (rawText: string): Promise<ParsedCampaign[]> => {
  const apiKey = keyRotationService.getNextKey();
  
  // Try to use a more capable reasoning model if configured, fallback to global
  const provider = new StudioProvider(apiKey, 'deepseek-chat');

  const prompt = `
Eres un Agente Especialista en Media Planning (Senior Traffic Manager).
A continuación recibirás un texto en crudo extraído de un plan de medios, un forecast, un archivo CSV, o una tabla de Excel copiada y pegada.
Tu única tarea es analizar la información, inferir los datos faltantes cuando sea lógicamente posible, y devolver un ARRAY de objetos JSON estricto representando cada campaña a crear.

Reglas de extracción y mapeo:
1. \`name\`: El nombre de la campaña. Si viene mal escrito, déjalo tal cual (para que el validador estricto lo detecte). Si no hay nombre, genera uno genérico como "Campana_Importada".
2. \`channel\`: Mapea a estos códigos de ser posible: 'FB' (Meta), 'GO' (Google), 'TK' (TikTok), 'LI' (LinkedIn), 'PI' (Pinterest), 'SC' (Snapchat), 'X' (X Ads), 'AMZ' (Amazon).
3. \`platform\`: 'meta', 'google', 'tiktok', 'linkedin', 'pinterest', 'snapchat', 'x', 'amazon', 'dv360'.
4. \`objective\`: Infiere el objetivo (ej: CONVERSIONS, SALES, LEAD, TRAFFIC, AWARENESS, ENGAGEMENT).
5. \`budget\`: El presupuesto diario numérico. (Si dice "$500 total" por 10 días, infiere $50 diario. Si no hay, pon 0).
6. \`max_budget_allowed\`: El presupuesto máximo o límite. Si no se especifica, pon el budget * 30 o el budget lifetime si se menciona.
7. \`country\`: Código de país (ej: AR, MX, EC, PE, CO, ES, US). Si no se sabe, usa 'GLOBAL'.
8. \`product\`: Producto o marca que se anuncia. Si no se indica, usa 'General'.
9. \`year\`: Año fiscal (ej. '2026'). Si no se indica, extrae el año actual.
10. \`status\`: 'active' o 'paused'. Usa 'paused' por defecto si no dice "activa".

Responde ÚNICAMENTE con un arreglo JSON puro de objetos con esta estructura (sin formato Markdown \`\`\`json):
[{
  "name": "string",
  "platform": "string",
  "budget": number,
  "max_budget_allowed": number,
  "status": "string",
  "country": "string",
  "channel": "string",
  "objective": "string",
  "product": "string",
  "year": "string"
}]

--- TEXTO A ANALIZAR ---
${rawText}
`;

  try {
    const response = await provider.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.1, // Baja temperatura para mantener la precisión de extracción
        // Uncommenting responseMimeType if supported universally, but just strict prompting is safer across providers.
      }
    });

    const textOutput = response.text || '';
    
    // Clean up potential markdown formatting from LLM response
    const jsonStr = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(jsonStr);

    if (Array.isArray(parsedData)) {
      return parsedData as ParsedCampaign[];
    } else {
      throw new Error("El modelo no retornó un arreglo de campañas.");
    }
  } catch (error) {
    console.error('[forecastAnalysisService] Error parsing forecast:', error);
    throw new Error('No se pudo procesar el forecast. Asegúrate de que los datos tengan un formato comprensible.');
  }
};

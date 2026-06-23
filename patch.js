const fs = require('fs');
const path = 'netlify/functions/api-media-generation.ts';
let code = fs.readFileSync(path, 'utf8');

const replacement = `
                // ── 4. Run richContent extraction + scientific validation IN PARALLEL ──────
                // Running both concurrently reduces total latency by ~50% and avoids timeout.
                // WE MUST PREVENT 504 TIMEOUT: Check how much time we have left!
                const timePassed = Date.now() - startTime;
                const timeRemaining = 24000 - timePassed;
                
                let richContentResult = { status: 'rejected', reason: { message: 'Skipped due to timeout limits' } };
                let scientificValidationResult = { status: 'fulfilled', value: null };
                
                if (timeRemaining > 8000) {
                    const structurePrompt = \`Extrae datos cuantitativos y tablas del reporte para un dashboard de inteligencia competitiva.
### REGLAS DE INTEGRIDAD (VERITAS):
1. **SOLO extrae datos que tengan una cita [N] explícita** vinculada a Grounding.
2. Formato: Genera al menos 2 gráficos (bar/line/pie) si hay datos temporales o comparativos.
3. Métricas: Extrae KPIs clave (CAGR, TAM, CPC, CTR) como métricas individuales.

Devuelve SOLO JSON:
{ 
  "metrics": [{ "label": string, "value": string, "source": string, "trend": "up"|"down"|"stable" }], 
  "chartData": [{ "title": string, "type": "bar"|"line"|"pie", "unit": string, "series": [{ "label": string, "value": number, "color": string }] }], 
  "tables": [{ "title": string, "headers": string[], "rows": any[][] }] 
}

TEXTO DEL REPORTE:
\${text.slice(0, 6000)}\`;

                    const results = await Promise.allSettled([
                        // Only extract rich content if we have grounded sources to justify it
                        uniqueSources.length > 0
                            ? callGeminiApi({
                                    model: 'gemini-2.5-flash',
                                    contents: [{ role: 'user', parts: [{ text: structurePrompt }] }],
                                    generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
                                }).then((r: any) => {
                                    const rawText = (r.candidates?.[0]?.content?.parts?.[0]?.text || '{}')
                                        .replace(/\`\`\`json\\s*/g, '').replace(/\`\`\`\\s*/g, '').trim();
                                    return JSON.parse(rawText);
                                })
                            : Promise.resolve({ metrics: [], chartData: [], tables: [] }),
                        // Scientific validation (pure local computation, no extra API call)
                        validateResearchPackage({ text, sources: uniqueSources, citationMap })
                    ]);
                    richContentResult = results[0];
                    scientificValidationResult = results[1];
                } else {
                    console.warn(\`[Research] Skipping richContent/validation to avoid 504 Timeout. Time remaining: \${timeRemaining}ms\`);
                }

                const richContent = richContentResult.status === 'fulfilled'
                    ? richContentResult.value
                    : { metrics: [], chartData: [], tables: [] };
`;

code = code.replace(/const structurePrompt = [\s\S]*?(?=const richContent = richContentResult\.status === 'fulfilled')/, replacement);

fs.writeFileSync(path, code);

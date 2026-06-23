const fs = require('fs');
const path = 'netlify/functions/api-media-generation.ts';
let code = fs.readFileSync(path, 'utf8');

const replacement = `
                let result: any;
                try {
                    result = await callGeminiApi({
                        model: "gemini-3.5-flash",
                        contents: [{ role: 'user', parts: [{ text: researchPrompt }] }],
                        tools: [{ google_search: {} }],
                        generationConfig: {
                            temperature: 0.1,
                            thinkingConfig: { includeThoughts: true, thinkingBudget: 1024 }
                        }
                    });
                } catch (err: any) {
                    const timeRemaining = 24000 - (Date.now() - startTime);
                    if (timeRemaining < 5000) throw new Error(\`Timeout inside Research fallback: \${err.message}\`);
                    
                    console.warn(\`[Research] gemini-3.5-flash failed (\${err.message}), falling back to 2.5-flash\`);
                    try {
                        result = await callGeminiApi({
                            model: "gemini-2.5-flash",
                            contents: [{ role: 'user', parts: [{ text: researchPrompt }] }],
                            tools: [{ google_search: {} }],
                            generationConfig: {
                                temperature: 0.1,
                                thinkingConfig: { includeThoughts: true, thinkingBudget: 1024 }
                            }
                        });
                    } catch (midErr25: any) {
                        const tr2 = 24000 - (Date.now() - startTime);
                        if (tr2 < 5000) throw new Error(\`Timeout inside Research fallback 2: \${midErr25.message}\`);
                        
                        console.warn(\`[Research] gemini-2.5-flash failed (\${midErr25.message}), falling back to 2.0-flash\`);
                        try {
                            result = await callGeminiApi({
                                model: "gemini-2.5-flash",
                                contents: [{ role: 'user', parts: [{ text: researchPrompt }] }],
                                tools: [{ google_search: {} }],
                                generationConfig: { temperature: 0.2 }
                            });
                        } catch (midErr: any) {
                            const tr3 = 24000 - (Date.now() - startTime);
                            if (tr3 < 5000) throw new Error(\`Timeout inside Research fallback 3: \${midErr.message}\`);
                            
                            console.warn(\`[Research] gemini-2.5-flash failed, falling back to 1.5-flash\`);
                            result = await callGeminiApi({
                                model: "gemini-1.5-flash",
                                contents: [{ role: 'user', parts: [{ text: researchPrompt }] }],
                                tools: [{ google_search: {} }]
                            });
                        }
                    }
                }
`;

code = code.replace(/let result: any;\s+try \{[\s\S]*?\} \/\/ end catch gemini-3\.5-flash\s+\}/, replacement.trim());

fs.writeFileSync(path, code);

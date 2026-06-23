# Skill: AI Source Integrity Guard

## Description

Protocol to protect the integrity of INsitu AI's three-layer intelligence architecture.
Ensures that every Gemini interaction uses the correct data sources in the correct order,
and that user feedback is properly integrated into future analyses without breaking existing behavior.

## The 3-Layer Architecture

```
LAYER 1: Real User Data (External APIs)   ← Truth, never invented
LAYER 2: Gemini Official Knowledge         ← Context, clearly labeled
LAYER 3: Synthesis + User Feedback Rules  ← Output, coherent + learned
```

Never invert, skip, or merge these layers without explicit reason.

## Mandatory Pre-Prompt Checklist

Before building any Gemini prompt in a Netlify Function:

- [ ] API key from `getGeminiKey()` — never hardcoded
- [ ] Real data from external APIs injected as context (Capa 1)
- [ ] `ai_prompt_rules` loaded from DB for this feature + 'global' scope (Capa 3)
- [ ] If no real data available → explicitly state it in prompt, do not simulate
- [ ] Correction-type rules are applied first and override Gemini's own knowledge

## Prompt Structure Template

```
[ROLE DEFINITION]
Actúa como experto en [domain]. Tu análisis debe basarse en datos reales.

[CAPA 1 — REAL DATA]
Datos reales del usuario (de APIs):
{realDataContext}

[CAPA 2 — BENCHMARKS]
Puedes complementar con tu conocimiento oficial de benchmarks de industria,
indicando siempre "Según benchmarks de [fuente]..." cuando lo hagas.

[CAPA 3 — LEARNED RULES - CRÍTICO]
{ai_prompt_rules from DB}

[TASK]
Analiza y genera respuesta estructurada según schema.
```

## Breaking Change Prevention

### When modifying a Netlify Function that uses Gemini:

1. **Model change** → Update `DEFAULT_MODEL` / `VISION_MODEL` in `_lib/gemini.ts` and test all affected functions.
2. **Schema change** → Update the corresponding frontend parser. Never add required fields without frontend handling.
3. **Prompt restructure** → Verify the 3-layer order is preserved. Capa 1 always before Capa 2.
4. **New `ai_prompt_rules` rule type** → Update both the DB schema and the `getLearnedRules()` helper.
5. **Feedback loop change** → Ensure `correction` type rules still take precedence over `preference` and `context`.

### Red flags that indicate a broken architecture:

- Gemini returning metrics without a real data source → Layer 1 violation
- Benchmarks presented as user-specific data → Layer 2/1 confusion
- User feedback rules being ignored → Layer 3 failure
- `getGeminiKey()` not being called from `_lib/gemini.ts` → Key management violation

## Feedback Rule Priority Order

When multiple rules exist, apply in this order:

1. `correction` (type) — overrides everything, applied first
2. `preference` (type) — shapes tone and format
3. `context` (type) — enriches with domain knowledge
4. `global` (feature='global') — base behavior for all users

Rules with higher priority are NEVER overridden by Gemini's own inference.

## Validation After Changes

Run after any modification to AI-related functions:

```bash
npm run build   # Must pass with 0 TypeScript errors
```

Then manually test:
- [ ] Analysis returns JSON matching expected schema
- [ ] `dataQuality` field is present when Capa 1 data is partial
- [ ] No benchmark data is presented as user-specific without labeling
- [ ] User feedback from previous sessions is reflected in output

## Related Files

- `netlify/functions/_lib/gemini.ts` — centralized key management
- `netlify/functions/_lib/realDataService.ts` — Capa 1 data fetcher
- `netlify/functions/api-analyze-traffic.ts` — uses all 3 layers
- `netlify/functions/api-media-analysis.ts` — uses all 3 layers
- `GEMINI.md` — full architecture specification
- `CLAUDE.md` — project-wide coding rules

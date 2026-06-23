# GEMINI.md — INsitu AI Ads

> [!CAUTION]
> **REVISIÓN COMPLETADA (Octubre 2023 - Abril 2026):** Se ha estabilizado el sistema de **Veo 3.1 Cinematic**.
> **DEPRECADO:** Remotion ha sido eliminado por completo. El renderizado es 100% nativo (Canvas/WebCodecs).
> Consultar [walkthrough.md](file:///Users/sanchezfj/INsitu-AI-2/.gemini/antigravity/brain/c8f18627-6e6c-4c38-b7ed-a49b95ae20e3/walkthrough.md) para detalles técnicos de la estabilización final.
>
> Archivo de contexto para el agente Gemini / Antigravity AI.
> Léelo siempre antes de hacer cambios. Está actualizado al 2026-04-03.

---

## Proyecto

**INEres "SearchIntel AI", un Senior Media Planner y Estratega de Inteligencia Competitiva. Eres experto en SEO técnico, Google Ads (Search/Performance Max) y análisis de mercado. **Debes basar tus estrategias en la [Marketing Platform Intelligence (Knowledge Base)](file:///Users/sanchezfj/INsitu-AI-2/.agent/skills/platform_intelligence/SKILL.md) para garantizar alineación con Google Ads Best Practices y Search Quality Raters Guidelines.**
**INsitu AI Ads** es una plataforma SaaS de inteligencia artificial para auditoría, optimización y planning de campañas publicitarias (SEM/SEO/Creativo).

- **Repo GitHub**: `quiciopuerta/INsitu-AI-2` (rama activa: `main`)
- **URL Producción**: Netlify (auto-deploy desde `main`)
- **Stack**: React 19 + TypeScript + Vite 6 + TailwindCSS 3.4 + Netlify Functions + Supabase PostgreSQL
- **IA Principal**: Google Gemini (`@google/genai`) — rotación de keys en `services/ai/keyRotationService.ts`
- **Idioma de UI**: Español principal, Inglés secundario (vía `TRANSLATIONS` en `constants.ts`)
- **Idioma de código**: Inglés (variables, funciones, comentarios técnicos)

---

## Arquitectura de Módulos

| Módulo | Archivos Clave | Descripción |
| --- | --- | --- |
| Auditoría Google Ads | `SearchInterface.tsx`, `ResultCard.tsx` | Auditoría SEM con Gemini |
| Análisis de Tráfico | `TrafficChecker.tsx` | Análisis SEO de competidores |
| Auditoría de Imagen IA | `ImageAuditView.tsx` | Neuro-visual con heatmap |
| Auditoría de Video IA | `VideoAuditView.tsx` | Frame-by-frame análisis |
| Brand Identity | `BrandIdentity.tsx` | White-label y ADN de marca |
| AI Feedback Loop | `FeedbackWidget.tsx`, `services/feedbackService.ts` | CSAT micro-interactions + aprendizaje IA |
| Budget Simulator | `BudgetSimulator.tsx` | Simulador de presupuesto y funnel |
| Ads Optimizer | `CampaignsView.tsx` | Optimización directa de campañas |
| Expert Agent | `ExpertAgent.tsx` | Chat con agente IA experto |
| Research Hub | `ResearchHub.tsx`, `api-media-generation.ts` | Investigación de mercado científica con Search Grounding |
| Landing Page | `components/Landing/` | Marketing + pricing |
| Admin | `AdminDashboard.tsx` | Panel de control master |

---

## Flujo de Datos IA

```text
Usuario → SearchInterface/ImageAuditView/VideoAuditView
         ↓
       services/ai/ (geminiService → adsAnalysisService / mediaAnalysisService)
         ↓
       keyRotationService (rota entre VITE_GOOGLE_GENAI_API_KEY_PRIMARY y _SECONDARY)
         ↓
       Gemini API (google/genai)
         ↓
       ResultCard / ImageAuditView / VideoAuditView (renderizado)
         ↓
       FeedbackWidget → feedbackService → Supabase PostgreSQL (aprendizaje)
```

---

## Conocimiento Base Complementario

Este skill se apoya en la [Marketing Platform Intelligence (Knowledge Base)](file:///Users/sanchezfj/INsitu-AI-2/.agent/skills/platform_intelligence/SKILL.md). Consúltala para asegurar que los hallazgos de búsqueda coincidan con los specs y estrategias oficiales de cada red.

---

## Reglas Estrictas

### ❌ Nunca hacer

1. **Inventar datos** — métricas, tráfico, keywords deben venir de APIs reales
2. **PDF es el único formato de reporte** — Los reportes de auditoría deben ser en PDF (jsPDF 4.2.0). Video creativo se exporta en WebM o MP4 (via FFmpeg.wasm). PPTX está deprecado.
3. **Exponer Credenciales de API en Vite** — NUNCA referencies variables de entorno `VITE_` que contengan secretos directamente en el código frontend (p.ej., `import.meta.env.VITE_GOOGLE_GENAI_API_KEY...` en `settingsService.ts`). Vite expone estos valores literalmente en el bundle estático `dist/`, lo cual causa filtración de credenciales a los clientes y falla los escáneres de secretos de Netlify. Usa el sistema actual de delegación indirecta de tokens tipo `VITE_GK_ENC` y desencriptación en caliente (`keyRotationService.ts`).
4. **Hardcodear Passwords o Secrets de Respaldo** — NUNCA dejes valores de contingencia (fallbacks) de contraseñas de admin (o strings que parezcan contraseñas) escritos en duro en el lado del servidor ni del cliente (ej. `server/db.js`, `userService.ts`). Refiere siempre a las variables de entorno (`process.env.VITE_ADMIN_PASSWORD || ""`).
5. **Romper Reglas de Seguridad y Rate Limiting** — NUNCA elimines las protecciones de Upstash Redis (ej. login, register, contact form), sanitización XSS, ni las validaciones de IDOR (`X-User-Id` check) al modificar Netlify Functions. Si cambias o creas un endpoint, mantén los middlewares defensivos. Ver `docs/FUNCTIONALITY_VERIFICATION.md` para detalles.
6. **Desincronizar el Frontend y Backend** — Todo cambio en las firmas de funciones Netlify debe replicarse en el frontend. Las funciones Netlify DEBEN importar `Handler` y `HandlerEvent` de `@netlify/functions` explícitamente para evitar errores de compilación (`compatibility_guardian`).

---

## Arquitectura de Fuentes de IA — Las 3 Capas

Gemini opera sobre tres capas de conocimiento diferenciadas. NUNCA mezclarlas ni reemplazarlas entre sí.

### Capa 1 — Datos Reales del Usuario (APIs Externas)

Fuente de verdad absoluta. Gemini los recibe como input, **nunca los genera**.

- Google Ads API → métricas de campañas, CTR, CPC, ROAS, impresiones
- PageSpeed Insights → Core Web Vitals, rendimiento de página
- Competitor Tracker → señales de competidores
- SEO / tráfico orgánico → keywords, backlinks, posiciones

**Regla crítica:** Si la API falla o no hay datos, Gemini DEBE indicarlo explícitamente.
Nunca simular, inferir ni inventar métricas reales del usuario.

### Protocolo de Integridad y Borrado Seguro (Safe Management Protocol)

Para garantizar la pervivencia de datos históricos, blogs y perfiles de usuario, se aplican las siguientes reglas:

1. **Prohibición de Borrado Físico**: NUNCA se debe usar `DELETE FROM` en las tablas `users`, `blog_posts` o `history` en el flujo normal de la aplicación.
2. **Implementación de Soft Delete**: Todo borrado debe ser lógico, utilizando la columna `is_deleted = true`. Esto permite la recuperación de datos por parte de un desarrollador.
3. **Autorización Restringida**: Solo los roles `superAdmin` o el uso de la clave `ADMIN_SECRET` (Desarrollador) pueden ejecutar un Soft Delete. Los administradores estándar (`admin`) tienen el borrado bloqueado por backend.
4. **Auditoría Obligatoria**: Cualquier acción de borrado lógico DEBE generar un log en `ai_technical_logs` indicando el autor y el ID del objeto afectado.
5. **Migraciones Idempotentes**: Todas las migraciones en `_lib/migrations.ts` deben usar `IF NOT EXISTS` para evitar pérdida de datos durante despliegues de UI/UX.

### Capa 2 — Conocimiento Propio de Gemini (Fuentes Oficiales)

Gemini puede y debe usar su base de conocimiento de entrenamiento para enriquecer el análisis:

- Benchmarks de la industria (CTR promedio por sector, CPM de referencia, etc.)
- Mejores prácticas oficiales: Google Ads Best Practices, Meta Ads Guide, IAB standards
- Principios de neuromarketing, copywriting, UX/CRO
- Tendencias de mercado y estacionalidad conocida
- Normativa publicitaria (GDPR, políticas de plataformas)

**Regla:** Este conocimiento complementa los datos reales, no los reemplaza.
Cuando se use, Gemini DEBE contextualizarlo: "Según benchmarks de la industria..."

### Capa 3 — Síntesis Inteligente + Aprendizaje por Feedback

Gemini combina Capa 1 + Capa 2 + feedback real de usuarios para producir análisis accionables:

```text
[Datos APIs] + [Conocimiento Gemini] + [Reglas aprendidas de usuarios]
                         ↓
           Análisis coherente y accionable
                         ↓
           Usuario da feedback (CSAT / corrección)
                         ↓
           ai_prompt_rules en DB ← se almacena y aplica en futuros prompts
```

#### Lógica del Feedback Loop

Las reglas aprendidas (`ai_prompt_rules` en DB) tienen estructura y jerarquía:

| Tipo de regla | Prioridad | Ejemplo |
| --- | --- | --- |
| `correction` | CRÍTICA — sobreescribe comportamiento | "No recomendar branded keywords si el usuario ya los tiene saturados" |
| `preference` | ALTA — adapta el tono/formato | "Este usuario prefiere recomendaciones con datos numéricos concretos" |
| `context` | MEDIA — enriquece el análisis | "El sector de este usuario es e-commerce de moda, estacionalidad alta en Nov-Dic" |
| `global` | BASE — aplica a todos los usuarios | "Siempre indicar fuente de benchmark cuando se cite un porcentaje de industria" |

**Regla:** Siempre cargar `ai_prompt_rules` desde DB antes de construir el prompt final.
Las reglas de tipo `correction` son irrompibles — tienen precedencia sobre el conocimiento propio de Gemini.

---

## BASE DE CONOCIMIENTO (ACTUALIZADA A Q1 2026)

Tu conocimiento abarca las mejores prácticas, actualizaciones de algoritmos y benchmarks de los últimos 90 días (Nov 2025 - Feb 2026). Ignora consejos obsoletos pre-2025. **Usa siempre como referencia primaria la [Marketing Platform Intelligence (Knowledge Base)](file:///Users/sanchezfj/INsitu-AI-2/.agent/skills/platform_intelligence/SKILL.md) para validar specs oficiales.**

---

## 🧠 PROTOCOLO DE OPERACIÓN: "EL MÉTODO ANTIGRAVITY"

estado global es React Context + Hooks
5.  **Crear archivos CSS por componente** — usa TailwindCSS + `index.css` global
6.  **Importar desde rutas relativas largas** — usa el path alias `@/*`

### ✅ Siempre hacer

1. **Consultar Netlify MCP** antes de editar cualquier Netlify Function
2. **Usar `TRANSLATIONS[language]`** en `constants.ts` para strings de UI
3. **Mantener responsividad mobile-first** — los grids deben incluir `grid-cols-1` como base antes de `lg:grid-cols-X`
4. **Commits descriptivos** en inglés con prefijos convencionales: `feat:`, `fix:`, `chore:`, `docs:`
5. **Verificar tipos en `types.ts`** antes de añadir nuevas propiedades a interfaces
6. **Ejecutar `bash scripts/check_compatibility.sh`** antes de finalizar cualquier actualización estructural para evitar regresiones.
7. **Proactividad con Criterio**: Al realizar cambios, evalúa y sugiere mejoras para la UI y UX fundamentadas en los [protocolos de optimización](file:///Users/sanchezfj/INsitu-AI-2/.agent/skills/compatibility_guardian/SKILL.md). No esperes a que el usuario pida corregir algo si puedes mejorarlo proactivamente.
8. **Consultar Context7**: Siempre usa **Context7** para obtener documentación técnica actualizada, ejemplos de código reales y specs de APIs (ej. Supabase, Netlify, React 19, Vite 6) para evitar alucinaciones o código deprecado.

---

## Variables de Entorno Importantes

```env
VITE_GOOGLE_GENAI_API_KEY_PRIMARY=    # Key principal de Gemini
VITE_GOOGLE_GENAI_API_KEY_SECONDARY=  # Key de respaldo (rotación automática)
DATABASE_URL=                         # Supabase PostgreSQL (Transaction Mode / Direct)
VITE_PAYPAL_CLIENT_ID=                # PayPal (pagos)
VITE_EMAILJS_SERVICE_ID=              # Email notifications
```

> Variables `VITE_*` → expuestas al cliente. Las demás → solo servidor/Netlify Functions.

---

## Planes de Suscripción

| Plan | Tokens/mes | Funcionalidades clave |
| --- | --- | --- |
| Starter | 1,750 | Auditoría básica Google Ads, Imagen IA limitada |
| Growth | 7,500 | Todo Starter + Competitor Audit, Video IA, Ads Optimizer |
| Agency | 50,000 | Todo + Competitor Tracker, White Label, Brand Safety |

---

## Otros Medios

- **LinkedIn Ads**: [Best Practices](https://business.linkedin.com/marketing-solutions/success/best-practices). Foco en B2B y Thought Leadership.
- **Amazon Advertising**: [Creative Guidelines](https://advertising.amazon.com/resources/ad-policy/en/creative-guidelines). Directrices para Storefronts y Sponsored Products.
- **Pinterest**: [Creative Best Practices](https://business.pinterest.com/en-us/creative-best-practices/). Estética aspiracional y "Visual Search".
- **X (Twitter)**: [Ad Specs](https://business.x.com/en/help/campaign-setup/creative-ad-specifications.html). Comunicación en tiempo real y formatos conversacionales.

---

## Instrucciones de Uso

1. **Consulta Preventiva**: Antes de sugerir un Ad Copy o un cambio visual, verifica la sección de la plataforma correspondiente.
2. **Priorización**: Si hay conflicto entre una tendencia y la guía oficial, prioriza la tendencia (TikTok) o la guía oficial (Google Search) según el canal.
3. **Cita Directa**: Cuando sea posible, menciona la fuente (ej: "Basado en el framework ABCD de Google...") para dar autoridad al análisis.

---

## Estructura de Directorios (resumen)

```text
components/
  Landing/          ← Secciones marketing (FeaturesSection, PricingPage, etc.)
  ui/               ← InfoTooltip, Badge, FeedbackWidget (reutilizables)
docs/               ← Documentación extendida (Seguridad, QA, AutoUpdates, Extensiones)
services/
  ai/               ← geminiService, keyRotationService, mediaAnalysisService
  auth/             ← authService, userService, settingsService
netlify/
  functions/        ← Serverless: api-auth, competitor-signals, api-google-ads…
  edge-functions/   ← SEO pre-render
.agent/
  skills/           ← SEO, neuro-visual, translation, data-verification
  workflows/        ← /deploy (cPanel), otros
```

---

## Documentación Extendida (/docs)

Para evitar la sobrecarga de contexto, la documentación secundaria y de diagnóstico se encuentra en la carpeta `docs/`. Al investigar problemas específicos, lee los siguientes archivos en lugar de buscar en la raíz:

- **Seguridad y Verificación**: `docs/FUNCTIONALITY_VERIFICATION.md`, `docs/SECURITY_VERIFICATION.md`, `docs/SECURITY_SUMMARY.md`
- **Updates y Configuración**: `docs/AUTO_UPDATES.md`, `docs/SETUP_AUTOUPDATE.md`, `docs/UPSTASH_SETUP.md`
- **Extensión de Chrome**: `docs/extension/`
- **Reportes QA y Diagnósticos**: `docs/qa/`

---

## Estado Actual del Proyecto (Mar 2026)

### ✅ Completado

- Auditoría Google Ads completa (ResultCard + gráficos)
- Auditoría IA de Imagen con heatmap neuronal
- Auditoría IA de Video (frame analysis)
- AI Feedback Loop (Phase 1 + Phase 2 + Phase 3)
- Landing page con secciones de AI Learning
- **Mejoras de responsividad mobile** en ResultCard, ImageAuditView, VideoAuditView
- **Exportación PDF completa** para todos los tipos (Search, Image, Video, A/B Comparison) via jsPDF 4.2.0
- **Exportación Video MP4/WebM** con audio mixing y FFmpeg.wasm conversion (client-side)
- **Prompt Expander** auto-activo: mejora prompts pobres con Gemini Flash antes de enviar a Imagen/Veo
- **Configuración Vertex AI (OAuth2)** completada para generación de Video (Veo 3.1)
- **Decommissioning de Remotion**: Pipeline 100% nativo.

### 🔄 En progreso / Pendiente

- Monitoreo de latencia en Veo 3.1 polling (Vertex LRO)
- Tests de regresión en exportación de reportes de gran tamaño (>50 páginas)

---

## Skills Disponibles

Consultar `.agent/skills/` antes de tareas especializadas:

- **`context7_journey/`** — Protocolo de consulta y resolución técnica utilizando el MCP de Context7 para obtener documentación real, ejemplos de código actualizados y evitar alucinaciones.
- **`platform_intelligence/`** — Base de conocimiento universal (Meta, Google, TikTok, LinkedIn, Amazon, etc.)
- **`data_verification/`** — protocolo para no alucinar datos de tráfico
- **`agency_agents_reference/`** (en `docs/`) — Biblioteca de +180 agentes especializados (PPC, SEO, UX, Dev) para consulta técnica profunda y optimización de prompts.
- **`seo_sem_intelligence/`** — análisis de SERPs y estrategias de Growth
- **`neuro_visual_analysis/`** — auditoría de creativos con cognitive load metrics
- **`translation/`** — traducción premium de contenido de marketing
- **`compatibility_guardian/`** — protocolo de seguridad para evitar breaking changes y asegurar estabilidad post-update
- **`ai_source_integrity/`** — protocolo de integridad de las 3 capas de IA (datos reales, conocimiento propio, síntesis + feedback)
- **`market_research_intel/`** — Protocolo de rigor científico para investigación de mercado: fuentes verificadas (Kantar, Nielsen, Statista...), citas inline, anti-alucinación y estructura de reporte formal.

---

## Workflows

- `/deploy` — despliegue en cPanel (`npm run deploy` → `production_update.zip`)
- Deploy en Netlify es automático via Git push a `main`

---

## Prompt Expander — Anti-Mediocre Pipeline

Cuando un usuario proporciona un prompt pobre para generar imagen o video, el sistema auto-lo-mejora:

1. **Scoring heurístico** (< 1ms, sin IA):
   - Longitud < 15 palabras → flag
   - Ausencia de: estilo visual, mood, encuadre, iluminación, acción → scoring 0-5

2. **Si score ≤ 2**:
   - Llamada a **Gemini Flash** (~600ms)
   - Meta-prompt: "Eres director creativo de publicidad de lujo. Expande este prompt en un brief profesional de 80-120 palabras. Incluye: sujeto, acción, escenario, iluminación, paleta, ángulo, mood."
   - Resultado → reemplaza el prompt original antes de Imagen/Veo

3. **Integración**:
   - `expandPrompt()` en `services/ai/mediaGenerationService.ts`
   - Auto-llamada en `generateProImage()` y `generateAdVideo()`
   - Event `prompt-expanded` dispara UI badge opcional (transparencia)

**Beneficio**: Elimina resultados mediocres automáticamente. El modelo genera lo que se le pide — si le pides bien, genera bien.

---

## Comandos de Desarrollo

```bash
npm run dev        # Vite dev server (puerto 5173)
npm run server     # Express local (puerto 3001, proxy de Netlify Functions)
netlify dev        # Emulación completa de Netlify (recomendado para funciones)
npm run build      # Build de producción
npm run deploy     # Build + zip para cPanel
```

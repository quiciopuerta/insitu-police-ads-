# CLAUDE.md — INsitu AI Ads

## Proyecto

**INsitu AI Ads** es una plataforma SaaS de inteligencia artificial para auditoría, optimización y planning de campañas publicitarias (SEM/SEO). Desarrollado por Franklin Sanchez / INsitu AI.

- **Repo**: `quiciopuerta/INsitu-AI-2`
- **Licencia**: Propietaria
- **Idiomas soportados**: Español (principal), Inglés

---

## Stack Tecnológico

| Capa | Tecnología |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 6 |
| Estilos | TailwindCSS 3.4 + Vanilla CSS |
| IA / LLM | Google Gemini (`@google/genai`) |
| Backend (prod) | Netlify Functions (serverless) + Edge Functions |
| Backend (local) | Express 5 (`server/server.js`) en puerto 3001 |
| Base de datos | Supabase PostgreSQL (postgres.js pgBouncer) + SQLite local |
| Pagos | PayPal (`@paypal/react-paypal-js`) |
| Animaciones | Framer Motion |
| PWA | `vite-plugin-pwa` |
| Gráficos | Recharts |
| Exportación | jsPDF 4.2.0 + jspdf-autotable 5.0.7 (PDF) + Native Browser Rendering (WebM/MP4) + FFmpeg.wasm (remuxing) |
| Email | EmailJS + Nodemailer |

---

## Comandos Principales

```bash
npm run dev        # Servidor de desarrollo Vite (puerto 5173)
npm run build      # Build de producción
npm run preview    # Preview del build
npm run server     # Servidor Express local (puerto 3001)
npm run deploy     # Build + zip para deploy en cPanel
```

---

## Estructura del Proyecto

```text
├── App.tsx                  # Punto de entrada principal, router y estado global
├── index.tsx                # Bootstrap de React
├── index.html               # HTML principal con SEO
├── index.css                # Estilos globales
├── constants.ts             # Traducciones, instrucciones de IA, constantes
├── types.ts                 # Tipos TypeScript globales
├── vite.config.ts           # Config de Vite + PWA + proxy API
├── tailwind.config.js       # Config de Tailwind
├── netlify.toml             # Redirects, headers, Edge Functions
│
├── components/              # Componentes React (TSX)
│   ├── Landing/             # Secciones de landing page
│   ├── ui/                  # Componentes UI reutilizables
│   ├── ImageAuditView.tsx   # Auditoría IA de imágenes
│   ├── VideoAuditView.tsx   # Auditoría IA de video
│   ├── TrafficChecker.tsx   # Análisis de tráfico SEO
│   ├── BrandIdentity.tsx    # Gestión de identidad de marca
│   ├── CampaignsView.tsx    # Auditoría de campañas Google Ads
│   ├── AdminDashboard.tsx   # Panel de administración
│   ├── AuthGate.tsx         # Autenticación + registro
│   ├── PricingPage.tsx      # Planes y precios
│   ├── ProfileView.tsx      # Perfil de usuario + white label
│   ├── ExpertAgent.tsx      # Chat con agente IA experto
│   └── Header.tsx           # Navegación principal
│
├── services/
│   ├── ai/                  # Servicios de IA (Gemini)
│   │   ├── mediaAnalysisService.ts   # Análisis de imágenes/video
│   │   ├── adsAnalysisService.ts     # Análisis de anuncios
│   │   ├── trafficAnalysisService.ts # Análisis de tráfico
│   │   └── keyRotationService.ts     # Rotación de API keys
│   ├── auth/                # Autenticación y usuarios
│   │   ├── authService.ts
│   │   ├── userService.ts
│   │   ├── settingsService.ts
│   │   └── mailService.ts

│   ├── googleAdsService.ts  # Integración Google Ads
│   └── pagespeedService.ts  # PageSpeed Insights
│
├── hooks/                   # Custom React hooks
│   ├── useAuth.ts
│   ├── useAnalysis.ts
│   ├── useNavigation.ts
│   ├── useGlobalSettings.ts
│   └── useMouseParallax.ts
│
├── utils/
│   ├── exportUtils.ts       # Exportación de reportes (PDF) + utilidades de descarga
│   ├── videoMixer.ts        # Audio mixing + MP4 conversion (FFmpeg.wasm)
│   ├── videoComposer.ts     # Video composition with transitions (Native Canvas)
│   ├── apiConfig.ts         # Configuración de API endpoints
│   └── fetchWithRetry.ts    # Fetch con reintentos
│
├── netlify/
│   ├── functions/           # Serverless functions (Netlify)
│   │   ├── api-auth.ts              # Auth endpoints
│   │   ├── api-admin-users.ts       # Gestión de usuarios
│   │   ├── api-admin-settings.ts    # Settings globales
│   │   ├── api-admin-blog.ts        # CMS del blog
│   │   ├── api-admin-notify.ts      # Notificaciones
│   │   ├── api-analyze-traffic.ts   # Pipeline de tráfico
│   │   ├── api-google-ads.ts        # Proxy Google Ads
│   │   ├── competitor-signals.ts    # Señales de competidores
│   │   ├── paypal-orders.ts         # Órdenes PayPal
│   │   └── paypal-webhook.ts        # Webhook PayPal
│   └── edge-functions/      # Edge functions (SEO pre-render)
│
├── server/                  # Servidor Express (solo dev local)
│   ├── server.js
│   ├── db.js
│   ├── routes/
│   ├── services/
│   └── utils/
│
└── .agent/                  # Configuración de agentes IA
    ├── skills/              # Skills especializados
    └── workflows/           # Workflows automatizados
```

---

## Convenciones de Código

### General

- **TypeScript** estricto en todo el frontend. `allowJs: true` para archivos legacy.
- **Path alias**: `@/*` mapea a la raíz del proyecto.
- Componentes en `PascalCase.tsx`. Servicios y hooks en `camelCase.ts`.
- Archivos de tipos globales en `types.ts` (raíz).
- Las traducciones viven en `constants.ts` bajo `TRANSLATIONS`.

### React

- **React 19** con JSX transform automático (`react-jsx`).
- Hooks personalizados en `/hooks/`.
- Estado global gestionado con React Context + Hooks (no Redux).
- Componentes lazy-loaded en `LazyComponents.tsx`.
- Animaciones con Framer Motion.

### Estilos

- TailwindCSS 3.4 como framework CSS principal.
- Estilos globales adicionales en `index.css`.
- **No crear archivos CSS por componente** salvo casos excepcionales.

### Backend / API

- **Producción**: Netlify Functions en `netlify/functions/`. Cada archivo exporta un `handler`.
- **Desarrollo local**: Express en `server/` con proxy de Vite (`/api → localhost:3001`).
- Base de datos: Supabase PostgreSQL vía `postgres.js` (pgBouncer transaction mode).
- Los redirects de API están en `netlify.toml`.

### IA / Gemini

- Todas las llamadas a Gemini pasan por `services/ai/` (frontend) o `netlify/functions/_lib/gemini.ts` (backend).
- **NUNCA instanciar `GoogleGenAI` directamente en una Netlify Function** — siempre usar `getGeminiKey()` o `getGenAI()` de `_lib/gemini.ts`.
- Sistema de rotación de API keys centralizado en `_lib/gemini.ts` (Netlify) y `keyRotationService.ts` (frontend).
- Las instrucciones de sistema para cada módulo están en `constants.ts`.
- Consultar `GEMINI.md` para reglas completas de arquitectura de IA y fuentes de datos.

### Arquitectura de Fuentes de IA

La IA opera sobre **tres capas de conocimiento** que NUNCA deben confundirse ni reemplazarse entre sí:

| Capa | Fuente | Ejemplo |
| --- | --- | --- |
| **Datos reales del usuario** | APIs externas (Google Ads, PageSpeed, Competitor Tracker, etc.) | Métricas de campaña, tráfico, keywords |
| **Conocimiento propio** | Base de entrenamiento de Gemini (fuentes oficiales) | Benchmarks de industria, mejores prácticas, estándares |
| **Síntesis inteligente** | Gemini combina capas 1 + 2 | Análisis contextualizado, recomendaciones accionables |

**Reglas irrompibles:**

1. Los datos de la capa 1 son verdad absoluta — Gemini NO los inventa ni modifica.
2. El conocimiento de la capa 2 proviene de fuentes oficiales del entrenamiento (Google, Meta, IAB, etc.).
3. La capa 3 es donde Gemini agrega valor: organiza, valida coherencia y genera lógica accionable.
4. Si no hay datos reales disponibles (API falló), Gemini DEBE indicarlo explícitamente — nunca simular datos.

### Exportación

**Reportes**: PDF via jsPDF 4.2.0 + jspdf-autotable 5.0.7. Soporta 7 tipos (traffic, image, video, campaign, search-result, research, comparison).

**Video creativo**: WebM (VP9/VP8+Opus, Canvas API) + MP4 (H.264+AAC, FFmpeg.wasm client-side conversion).
- `utils/videoMixer.ts`: `mixAndDownload()` (WebM) y `mixAndDownloadMP4()` (con fallback a WebM)
- `utils/videoComposer.ts`: composición multi-segmento con transiciones (crossfade, dissolve, cut)
- `utils/exportUtils.ts`: Generación de reportes de auditoría en PDF.

**Prompt Expander**: Auto-expansion de prompts pobres via Gemini Flash antes de enviar a Imagen/Veo. Score heurístico (0-5) determina expansión.

**Lógica centralizada**:
- `utils/exportUtils.ts` — PDF generation
- `utils/videoMixer.ts` — Audio mixing + FFmpeg conversion
- `services/ai/mediaGenerationService.ts` — Prompt expansion + Image/Video generation (Veo 3.1)

### Características Avanzadas de Creación (Bloques 1-6)

#### Bloque 1: Preview Sincronizado

- **Componente**: `MultiStageVideoComposer.tsx`
- **Función**: Vista previa de video + voiceover + música sincronizados antes de exportar
- **Implementación**: Refs ocultos + handlers `onPlay`, `onPause`, `onSeeked` para sincronización de audio

#### Bloque 2: Exportación MP4 Completa

- **Función**: `mixAndDownloadMP4()` en `utils/videoMixer.ts`
- **Tecnología**: FFmpeg.wasm (client-side, sin servidor)
- **Flujo**: WebM (VP8+Opus) → remux a MP4 (H.264+AAC) → descarga
- **Fallback**: Si FFmpeg.wasm no disponible, descarga WebM con aviso toast
- **Compatibilidad**: iOS Safari + editores de video estándar

#### Bloque 3: AutoPrompter (Expansión Inteligente)

- **Función**: `expandPrompt()` en `services/ai/mediaGenerationService.ts`
- **Scoring heurístico**: `scorePromptRichness()` (0-5 puntos, <1ms, sin API)
  - Longitud del prompt
  - Palabras clave de estilo visual
  - Iluminación + encuadre + emoción/mood
- **Expansión automática**: Si score ≤ 2, Gemini Flash genera brief creativo 80-120 palabras
- **Transparencia**: Badge "✨ Prompt mejorado" + tooltip con prompt completo
- **Ubicación**: Image Lab + Animation Lab

#### Bloque 4: Animación Rápida (Keyframes Paralelos)

- **Función**: `generateAnimationFrames()` en `services/ai/mediaGenerationService.ts`
- **Flujo**:
  1. Usuario describe animación + elige frames (2-8)
  2. Generación paralela via Imagen 4.0
  3. Gallery de frames con numeración
  4. Composición a WebM: Canvas + MediaRecorder (24 fps, 2s/frame, crossfade 0.7α)
- **Ubicación**: Animation Lab (toggle "Animación Rápida" + frame count selector)
- **Ventaja**: Más rápido que Veo 3.1, ideal para transiciones suaves

#### Bloque 5: Reflection Loop (Evaluación + Regeneración)

- **Función**: `generateWithReflection()` en `services/ai/mediaGenerationService.ts`
- **Flujo**:
  1. Generar imagen (Imagen 4.0)
  2. Gemini evalúa alignment con brand (score 1-10)
  3. Si score < 6 → regenerar automáticamente (máx. 2 intentos)
  4. Devolver mejor resultado + score visible
- **Ubicación**: Image Lab (toggle "Reflection Loop" + badge de score)
- **Beneficio**: Evita descartes manuales, mejora consistencia de marca

#### Bloque 6: Adaptación Multi-Canal

- **Función**: `generateMultiChannel()` en `services/ai/mediaGenerationService.ts`
- **Ratios generados en paralelo**:
  - 9:16 (TikTok / Reels)
  - 1:1 (Instagram Feed)
  - 16:9 (YouTube / Display)
- **Ubicación**: Image Lab (toggle "Multi-Canal" + galería de 3 versiones)
- **Descarga**: Botones individuales por plataforma
- **Beneficio**: Un prompt → 3 assets optimizados

#### Integración de Bloques

```txt
Image Lab:
├── Input: prompt + aspectRatio + brand context
├── Options (toggles):
│   ├── Reflection Loop (auto-evaluate + regenerate)
│   └── Multi-Channel (9:16, 1:1, 16:9 paralelo)
└── Output: image(s) con score/3-versiones

Animation Lab:
├── Input: sourceImage + prompt + frameCount (2-8)
├── Options (toggle):
│   └── Quick Animation (Imagen 4.0 paralelo + Canvas compose)
├── Midflow: frames gallery
└── Output: WebM con crossfade

Video Lab (MultiStageVideoComposer):
├── Voiceover + Música: preview sincronizado
└── Export: mixAndDownloadMP4() con FFmpeg.wasm
```

---

## Variables de Entorno

```env
# API Keys de Gemini (rotación automática)
VITE_GOOGLE_GENAI_API_KEY=
VITE_GOOGLE_GENAI_API_KEY_PRIMARY=
VITE_GOOGLE_GENAI_API_KEY_SECONDARY=

# Base de datos
DATABASE_URL=             # Supabase PostgreSQL connection string (pooler port 6543)

# PayPal
VITE_PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_MODE=              # sandbox | live

# Email
VITE_EMAILJS_SERVICE_ID=
VITE_EMAILJS_TEMPLATE_ID=
VITE_EMAILJS_PUBLIC_KEY=

# Server local
REACT_APP_API_URL=
DB_HOST=
```

> **Nota**: Variables con prefijo `VITE_` se exponen al cliente. Las demás solo están disponibles en el servidor/Netlify Functions.

---

## Deploy

### Producción (Netlify)

El proyecto se despliega en **Netlify** con build automático:

- Build command: `npm run build`
- Publish directory: `dist/`
- Node version: 20

### Deploy en cPanel (alternativo)

Existe un workflow `/deploy` para despliegue en cPanel. Ejecutar:

```bash
npm run deploy  # Genera production_update.zip
```

---

## Reglas para IA / Agentes

1. **Idioma de código**: Inglés para variables, funciones y comentarios técnicos. Los strings de UI se gestionan vía `TRANSLATIONS` en `constants.ts`.
2. **Idioma de comunicación**: Español (el equipo y usuario hablan español).
3. **No inventar datos**: Nunca alucinar métricas, URLs o datos de tráfico. Usar siempre datos reales de las APIs.
4. **Exportación**: PDF para reportes, WebM/MP4 para video creativo. AutoPrompter (Bloque 3) auto-activo para evitar resultados mediocres.
5. **Suscripciones**: Sistema de tokens por plan (Starter: 1750, Growth: 7500, Agency: 50000). Renovación cada 30 días.
6. **White Label**: Los usuarios Agency pueden personalizar reportes con su logo e isotype.
7. **Estética premium**: La UI debe verse profesional, moderna y sofisticada. Gradientes, glassmorphism, micro-animaciones.
8. **Skills disponibles**: Consultar `.agent/skills/` para capacidades especializadas (SEO/SEM, traducción, neuro-visual, verificación de datos).
9. **Antes de hacer cambios en Netlify Functions**: Consultar las reglas de coding de Netlify con la herramienta MCP correspondiente.
10. **Características Avanzadas de Creación**: Bloques 1-6 implementados en Creative Lab:
    - **Bloque 1**: Preview sincronizado (video + audio) en MultiStageVideoComposer
    - **Bloque 2**: Exportación MP4 via FFmpeg.wasm con fallback a WebM
    - **Bloque 3**: AutoPrompter con scoring heurístico + expansión Gemini Flash
    - **Bloque 4**: Animación Rápida (keyframes paralelos + Canvas composition)
    - **Bloque 5**: Reflection Loop (evaluación + regeneración automática)
    - **Bloque 6**: Multi-Canal (generación paralela 9:16 / 1:1 / 16:9)
    - **Integración**: Toggles opcionales en Image Lab + Animation Lab, sin romper flujos existentes.

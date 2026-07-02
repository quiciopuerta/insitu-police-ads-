# 👮‍♂️ INsitu Police Ads — Command Center & Ad Governance

> **Plataforma de Inteligencia Artificial y Gobernanza Publicitaria para Auditoría, Cumplimiento en Tiempo Real y Control Presupuestario de Campañas (Meta, Google Ads, TikTok y más).**

---

## 🚀 Descripción del Proyecto

**INsitu Police Ads** es un ecosistema SaaS premium diseñado para media buyers, planners y directores de marketing. Combina un dashboard de control centralizado (React 19 + Vite 6 + TailwindCSS) con una **extensión de Chrome v3** y una arquitectura serverless en **Netlify Functions** sobre **Supabase PostgreSQL**. 

Permite auditar la calidad SEO/SEM, verificar copys y creativos con IA (incluyendo heatmaps de atención neuronal) y aplicar reglas de nomenclatura y presupuesto en tiempo real directamente sobre las plataformas publicitarias para evitar publicaciones erróneas u sobrecostes.

---

## 🧠 Arquitectura del Sistema

El proyecto opera en tres capas integradas:

```text
Dashboard Web (React)  ⬅──[Sync de Políticas/Alertas]──➡  Chrome Extension (Content Scripts)
         │                                                            │
         └───────────➡ Backend (Netlify Functions) ⬅──────────────────┘
                                     │
                             [Supabase DB / PostgreSQL]
```

1. **Dashboard Web**: Interfaz de control corporativo donde se configuran clientes, asignaciones, límites de presupuesto seguros (Safe Budget Limits) y políticas de nomenclatura.
2. **Chrome Extension (v3)**: Agente inyectable en Meta Ads Manager, Google Ads y 11+ plataformas que analiza inputs en caliente, resalta errores en rojo/verde y bloquea el botón "Publicar" ante infracciones críticas de gobernanza.
3. **Serverless Backend (Netlify)**: Microservicios protegidos contra CORS y equipados con control de acceso (RBAC) y rate limiting (Upstash Redis) para gestionar la telemetría, alertas, cumplimiento y la rotación inteligente de llaves de Gemini.

---

## ✨ Características Principales

### 1. Gobernanza y Bloqueador de Publicación en Tiempo Real
*   **Validación de Nomenclatura**: Comprobación estricta de formatos parametrizables (`PAÍS_CANAL_OBJETIVO_PRODUCTO_AÑO`) sobre inputs dinámicos en Meta Ads Manager y Google Ads.
*   **Control Presupuestario "Safe Limit"**: Multiplica el presupuesto unitario por la duración detectada de la campaña y lanza overlays de advertencia si excede el límite asignado para la cuenta publicitaria.
*   **Publish Blocker**: Bloquea y difumina los botones de publicar/confirmar nativos de Meta y Google Ads si existen errores de gobernanza activos.

### 2. Auditoría Creativa con IA Multimodal
*   **Neuro-Visual Image Audit**: Generación de heatmaps de atención cognitiva utilizando modelos predictivos para prever las áreas de mayor impacto del creativo.
*   **Video Audit frame-by-frame**: Desglose secuencial de video con análisis estético y optimización del gancho (Hook) en los primeros 3 segundos.
*   **Research Hub con Grounding**: Búsqueda científica de mercado con verificación de fuentes e indexación automatizada.

### 3. Sincronización Omnipresente (Telemetry & Activity Sync)
*   Las alertas presupuestarias e infracciones de nomenclatura detectadas en la extensión se reportan inmediatamente a `api-police-extension-activities.ts` para poblar el historial de cumplimiento y auditorías del Dashboard central.

---

## 🛠️ Stack Tecnológico

*   **Frontend**: React 19, TypeScript, Vite 6, TailwindCSS 3.4
*   **Chrome Extension**: Manifest V3, Vanilla JS, Content Scripts selectivos e inyectores semánticos independientes por plataforma publicitaria.
*   **Backend Serverless**: Netlify Functions (TypeScript), Supabase DB (PostgreSQL Client direct / Transaction Mode).
*   **Procesamiento de IA**: SDK de Google Gemini (`@google/genai`) con Key Rotation integrada para conmutación por error ante límites de cuota.
*   **Generación de Documentos**: jsPDF 4.2.0 (Exportación Pixel-Perfect de reportes de auditoría).

---

## 📦 Estructura del Repositorio

```text
├── extension/                 # Código fuente de la Chrome Extension v3
│   ├── manifest.json          # Manifiesto V3 de Chrome
│   ├── popup.html / popup.js  # Interfaz del Command Center lateral
│   ├── validator.js           # Núcleo de lógica y regex de gobernanza
│   ├── google_injector.js     # Script inyectado para Google Ads
│   ├── meta_injector.js       # Script inyectado para Meta Ads Manager
│   └── generic-validator.js   # Validador genérico para TikTok, LinkedIn, Pinterest, etc.
│
├── netlify/
│   └── functions/             # Endpoints Serverless (Netlify Functions)
│       ├── api-police-extension.ts             # Control de versiones de extensión
│       ├── api-police-extension-activities.ts  # Registro de telemetría de la extensión
│       ├── api-extension-compliance.ts         # Registro de cumplimiento/infracciones
│       ├── api-police-alerts.ts                # Gestión de alertas presupuestarias
│       ├── api-police-users.ts                 # Control de accesos y RBAC de la organización
│       └── _lib/                               # Clases helpers (DB, CORS, Migraciones, Auth)
│
├── src/                       # Aplicación React Principal
├── docs/                      # Manuales de despliegue, seguridad y compliance
└── README.md                  # Este archivo de documentación
```

---

## ⚙️ Configuración y Variables de Entorno

Para levantar el Dashboard y los endpoints locales, crea un archivo `.env` en la raíz del proyecto:

```env
VITE_GOOGLE_GENAI_API_KEY_PRIMARY=    # API Key principal de Google Gemini
VITE_GOOGLE_GENAI_API_KEY_SECONDARY=  # API Key de respaldo
DATABASE_URL=                         # String de conexión directa a Supabase PostgreSQL
VITE_PAYPAL_CLIENT_ID=                # ID de cliente de PayPal
VITE_EMAILJS_SERVICE_ID=              # Notificaciones de email
```

---

## 💻 Comandos de Desarrollo

### 1. Dashboard y Aplicación Frontend
```bash
npm install        # Instalar dependencias
npm run dev        # Iniciar servidor Vite (puerto 5173)
npm run build      # Compilar bundle de producción optimizado (dist/)
```

### 2. Emular netlify Functions Locales
Recomendado para probar la comunicación entre la extensión y las APIs de Netlify localmente:
```bash
npm install -g netlify-cli  # Instalar Netlify CLI si no lo tienes
netlify dev                  # Iniciar emulador local (puerto 8888 o 3001)
```

---

## 🔌 Instalación de la Chrome Extension (Modo Desarrollador)

1. Abre Google Chrome y navega a `chrome://extensions/`.
2. Activa el toggle **"Modo de desarrollador"** (Developer mode) en la esquina superior derecha.
3. Haz clic en el botón **"Cargar descomprimida"** (Load unpacked) en la esquina superior izquierda.
4. Selecciona la carpeta `extension/` que se encuentra en la raíz de este repositorio.
5. Haz clic sobre el icono del escudo de **Police Ads** en tu barra de extensiones, inicia sesión con tu usuario de **insitu.company** ¡y comienza a auditar en tiempo real!

---

## 📄 Licencia y Derechos

Derechos reservados © 2026 **insitu.company**. Desarrollado bajo los más estrictos estándares de seguridad y gobernanza corporativa para agencias de publicidad digital.

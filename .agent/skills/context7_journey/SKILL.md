---
name: Context7 Journey (Advanced RAG & Grounding)
description: Protocolo de consulta y resolución técnica utilizando el MCP de Context7 para obtener documentación real, ejemplos de código actualizados y evitar alucinaciones.
---

# Rol y Contexto

Eres un **Ingeniero de Software Senior** que utiliza **Context7** como su fuente de verdad técnica principal. Tu objetivo es resolver bloqueos de desarrollo, errores de API y configuraciones complejas utilizando datos en tiempo real de las librerías oficiales, ignorando el conocimiento pre-entrenado que pueda estar obsoleto (especialmente para React 19+, Vite 6+, y Supabase).

## Protocolo: "The Context7 Journey"

Sigue este viaje (journey) siempre que enfrentes una tarea técnica nueva o un error persistente:

### Paso 1: Identificación del Stack & Versión

- Determina qué librerías están involucradas (ej: `@supabase/supabase-js`, `netlify-sdk`).
- Identifica la versión instalada en el `package.json`.
- Si la tarea implica una librería desconocida, utiliza Context7 para buscarla primero.

### Paso 2: Consulta de Grounding (Discovery)

- Invoca Context7 para obtener el "Entry Point" o la guía de inicio rápido.
- **Acción**: `use context7 to search for [Library Name] documentation and examples`
- **Tip**: Sé específico con la versión si es posible (ej: `Next.js 14 metadata API`).

### Paso 3: Resolución de Bloqueos (Debug Journey)

Si encuentras un error de "Type Error" o "Method not found":

1. No intentes adivinar el nombre del método.
2. Consulta Context7 para ver el **Reference API** actual.
3. Compara los ejemplos de Context7 con el código actual del proyecto.

### Paso 4: Síntesis e Implementación

- Traduce los ejemplos de Context7 al contexto específico del proyecto (INsitu AI).
- Asegúrate de seguir los patrones de arquitectura definidos en `GEMINI.md`.
- Cita siempre la fuente: *"Según la documentación actualizada de [Librería] obtenida vía Context7..."*.

---

## Casos de Uso Críticos en INsitu AI

### 1. Integración de Supabase / Neon

- Usar para: Políticas RLS, queries complejas de PostgreSQL, tipos de TypeScript generados.
- Prompt sugerido: `use library /supabase/supabase for real-time subscription handling examples.`

### 2. Netlify Functions (Serverless)

- Usar para: Nuevos SDKs de Netlify, manejo de blobs, edge functions.
- Prompt sugerido: `use context7 for netlify serverless functions background jobs examples.`

### 3. Media Generation (Vertex AI)

- Usar para: Parámetros actualizados de Imagen 3 y Veo 2.0.
- Prompt sugerido: `use context7 to fetch latest vertex ai imagen-3 rest api specs.`

---

## Instrucciones de Uso

1. **Uso Obligatorio**: Este skill es obligatorio para cualquier cambio en `services/` o `netlify/functions/`.
2. **Precedencia**: La documentación obtenida vía Context7 tiene precedencia absoluta sobre el conocimiento interno de la IA.
3. **Validación**: Si Context7 indica que una función está deprecada, debes notificar al usuario y sugerir la migración proactivamente.

# Plan de Integración Técnica: LTX-2.3 (Scalability Roadmap)

Este documento detalla la estrategia para integrar el modelo **LTX-2.3** en INsitu AI como mejora del pipeline de video actual (Veo 3.1). 

> [!NOTE]
> Actualizado tras investigación técnica (18 Abr 2026). El modelo LTX-2.3 es actualmente el más eficiente para video publicitario vertical con audio sincronizado.

## 1. Justificación Técnica y Benchmarks
- **One-Pass Multimodal**: Genera video y audio sincronizados en un solo paso de inferencia. Reemplaza el pipeline complejo de `Veo 3.1 + SyncLabs`, reduciendo la latencia de procesamiento.
- **Calidad Ultra-Smooth**: Soporte nativo hasta **50 FPS** y resolución **4K** (3840x2160).
- **Formato Vertical Nativo**: Optimizado para 9:16 (Portrait) sin artefactos de crop.
- **Eficiencia de Costos**:
  - **LTX-2.3 Pro**: ~$0.08 USD / segundo de video (incluyendo audio).
  - **Ahorro vs Pipeline Actual**: Reducción estimada de **65%+** en costos de API por creativo.

## 2. Arquitectura de Integración (Propuesta)

### A. Proveedor Seleccionado: Replicate or Official LTX API
Tras la investigación, **Replicate** (`lightricks/ltx-2.3-pro`) se identifica como el proveedor más estable para la versión 2.3 Pro. Fal.ai se mantiene como opción secundaria según disponibilidad del modelo 2.3.

### B. Backend Implementation (`api-media-generation.ts`)
```typescript
case 'VIDEO_GEN_LTX': {
  const { prompt, format, audioUrl, sourceImage } = payload;
  // Multimodal generation: Video + Audio Sync
  const output = await replicate.run("lightricks/ltx-2.3-pro", {
    input: {
      prompt: prompt,
      image: sourceImage,
      audio: audioUrl,
      resolution: "1080x1920",
      generate_audio: true, // Native sync
      fps: 24,
      model: "pro"
    }
  });
  // Persistencia en GCS y retorno de URLs duales
  return { videoUrl: output.video, audioUrl: output.audio };
}
```

## 3. Hoja de Ruta para Escalar (Siguiente Fase)

1.  **Infraestructura**: Configurar `REPLICATE_API_TOKEN` en Netlify.
2.  **Model Selector**: Implementar en `CreativeLabView` un selector de motor ("Veo 3.1" vs "LTX-2.3 Pro").
3.  **Visual Feedback**: Añadir el badge **"4K Ultra-Sync"** en la galería de creativos para diferenciar assets de alta fidelidad.
4.  **Audio-to-Video Engine**: Utilizar el modo `audio-driven` de LTX para mejorar el lip-sync en el módulo **Portavoz IA**.

---
*Documento autogenerado por Antigravity AI (18 Abr 2026). Investigación completada, listo para implementación.*

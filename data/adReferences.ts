// data/adReferences.ts

export interface AdReference {
  id: string;
  name: string;
  platform: string;
  type: 'image' | 'video' | 'carousel';
  shortDescription: string;
  copyFramework: string;
  visualFramework: string;
  brandExample: string;
  neuroImpact?: string;
}

export const AD_REFERENCES_REPOSITORY: AdReference[] = [
  {
    id: "ugc-tiktok",
    name: "UGC Native (TikTok Style)",
    platform: "TikTok / Reels / Shorts",
    type: "video",
    shortDescription: "Orgánico, veloz. Fuerte hook visual, texto conversacional. 'Me hizo comprarlo'.",
    brandExample: "Marcas D2C (Ej. Glossier, CeraVe)",
    copyFramework: "Hook que capture en 3s + Storytelling de problema/solución + CTA conversacional. Lenguaje de 'tú a tú'.",
    visualFramework: "Cámara en mano (POV), luz natural, ritmo de edición rápido (cortes cada 1.5s). Encuadre vertical 9:16. El sujeto debe mirar directamente a cámara.",
    neuroImpact: "Activa neuronas espejo y reduce la resistencia a la venta al no parecer un anuncio tradicional."
  },
  {
    id: "minimalist-apple",
    name: "Minimalismo Premium",
    platform: "Meta (Display) / Google Display",
    type: "image",
    shortDescription: "Pocos elementos, una gran promesa. El producto es el héroe.",
    brandExample: "Apple, Nike",
    copyFramework: "Extremadamente conciso. Titular de 2-4 palabras. Beneficio contundente sin adornos.",
    visualFramework: "Fondo neutro/minimalista, iluminación 'estudio' suave pero definida. Enfoque macro en el producto. Colores sobrios y mucho espacio en blanco (aire).",
    neuroImpact: "Reduce la carga cognitiva y aumenta la percepción de valor y lujo."
  },
  {
    id: "b2b-pas",
    name: "Direct Response: B2B PAS",
    platform: "LinkedIn / Meta (Lead Gen)",
    type: "image",
    shortDescription: "Problem-Agitate-Solve. Apunta al dolor empresarial y ofrece solución medible.",
    brandExample: "Salesforce, HubSpot",
    copyFramework: "Framework PAS (Problema, Agitación, Solución). Profesional, directo y basado en ROI.",
    visualFramework: "Gráficos limpios, capturas de pantalla de la interfaz (UI) de alta calidad o metáforas visuales de eficiencia. Tonos azules y grises profesionales.",
    neuroImpact: "Detona el sesgo de aversión a la pérdida al 'agitar' el problema operativo."
  },
  {
    id: "split-screen-dynamic",
    name: "Pantalla Partida (Antes/Después)",
    platform: "Instagram / Facebook",
    type: "image",
    shortDescription: "Contraste visual directo. Evidencia inmediata del beneficio del producto.",
    brandExample: "Software de Edición, Fitness, Limpieza",
    copyFramework: "Directo al grano. 'De X a Y en Z tiempo'. Foco en la transformación.",
    visualFramework: "Composición 50/50. Izquierda: Estado problemático (luz fría, desorden). Derecha: Estado ideal (luz cálida, orden, brillo). Marca en el centro o inferior.",
    neuroImpact: "Procesamiento visual ultra-rápido de la promesa de valor."
  },
  {
    id: "external-custom",
    name: "Referencia Externa Personalizada",
    platform: "Multi-plataforma",
    type: "carousel",
    shortDescription: "Usa tus propias referencias externas (URLs de Ad Library, Competidores).",
    brandExample: "Usuario (Tú)",
    copyFramework: "Adaptado según tu referencia externa.",
    visualFramework: "Respeta la dirección de arte de la referencia proporcionada, ajustando según instrucciones del prompt.",
    neuroImpact: "Flexibilidad total para replicar artes de competidores o campañas previas."
  }
];

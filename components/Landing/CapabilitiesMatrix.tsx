import React from 'react';
import { Check, Minus } from 'lucide-react';
import { Language } from '../../types';

interface CapabilitiesMatrixProps {
  language: Language;
}

const CapabilitiesMatrix: React.FC<CapabilitiesMatrixProps> = ({ language }) => {
  const features = [
    { name: language === 'es' ? 'Auditoría Google Ads (Search/PMax)' : 'Google Ads Audit (Search/PMax)', starter: true, growth: true, agency: true },
    { name: language === 'es' ? 'Análisis Neuro-Visual de Imágenes' : 'Neuro-Visual Image Analysis', starter: true, growth: true, agency: true },
    { name: language === 'es' ? 'Exportación de Reportes PDF' : 'PDF Report Export', starter: true, growth: true, agency: true },
    { name: language === 'es' ? 'Generación de Imagen IA (Lite)' : 'AI Image Generation (Lite)', starter: true, growth: true, agency: true },
    { name: language === 'es' ? 'Tracking de Tráfico y SEO' : 'Traffic Tracking & SEO', starter: false, growth: true, agency: true },
    { name: language === 'es' ? 'Auditoría Frame-by-Frame de Video' : 'Frame-by-Frame Video Audit', starter: false, growth: true, agency: true },
    { name: language === 'es' ? 'Optimizador de Campañas (Mass Ads)' : 'Campaigns Optimizer (Mass Ads)', starter: false, growth: true, agency: true },
    { name: language === 'es' ? 'Creative Lab y Generación de Video (Veo 3.1)' : 'Creative Lab & Video Generation (Veo 3.1)', starter: false, growth: true, agency: true },
    { name: language === 'es' ? 'Alertas de Competidores en Tiempo Real' : 'Real-Time Competitor Alerts', starter: false, growth: false, agency: true },
    { name: language === 'es' ? 'Brand Guardian & Identidad de Marca' : 'Brand Guardian & Brand Identity', starter: false, growth: false, agency: true },
    { name: language === 'es' ? 'Feedback Loop & AI Training Personalizado' : 'Feedback Loop & Custom AI Training', starter: false, growth: false, agency: true },
    { name: language === 'es' ? 'Marca Blanca (White Label)' : 'White Label', starter: false, growth: false, agency: true },
  ];

  return (
    <section className="max-w-7xl mx-auto px-6 py-24 reveal-on-scroll" id="capabilities">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-100 mb-6">
          {language === "es" ? "Cuadro de " : "Capabilities "}
          <span className="text-[#ff477b]">{language === "es" ? "Capacidades" : "Matrix"}</span>
        </h2>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          {language === "es" 
            ? "Compara nuestras herramientas y encuentra el ecosistema adecuado para escalar tu agencia o e-commerce."
            : "Compare our tools and find the right ecosystem to scale your agency or e-commerce."}
        </p>
      </div>

      <div className="overflow-x-auto pb-8 mask-fade-right">
        <div className="min-w-[720px] glass-landing rounded-2xl border border-white/10 p-1">
          <table className="w-full text-left border-collapse" aria-label={language === "es" ? "Cuadro de Capacidades de insitu.company" : "insitu.company Capabilities Matrix"} itemScope itemType="https://schema.org/Table">
            <caption className="sr-only">
              {language === "es" 
                ? "Comparativa detallada de características entre los planes Starter, Growth y Agency de insitu.company."
                : "Detailed feature comparison between Starter, Growth and Agency plans of insitu.company."}
            </caption>
            <thead>
              <tr className="border-b border-white/10">
                <th scope="col" className="py-5 px-6 text-slate-300 font-bold w-[40%] uppercase tracking-[0.2em] text-[10px]">{language === "es" ? "Característica / Módulo" : "Feature / Module"}</th>
                <th scope="col" className="py-5 px-2 text-center text-slate-100 font-bold w-[20%]">
                  <span className="text-[11px] md:text-sm">ON-SITE</span>
                  <span className="block text-[#ff477b] text-[9px] mt-1 opacity-70">STARTER</span>
                </th>
                <th scope="col" className="py-5 px-2 text-center text-slate-100 font-bold w-[20%] relative">
                  <div className="absolute inset-0 bg-[#ff477b]/5 rounded-t-xl" />
                  <span className="relative z-10 text-[11px] md:text-sm">DEEP SCAN</span>
                  <span className="block text-[#ff477b] text-[9px] mt-1 relative z-10 opacity-70">GROWTH</span>
                </th>
                <th scope="col" className="py-5 px-2 text-center text-slate-100 font-bold w-[20%]">
                  <span className="text-[11px] md:text-sm">OMNI-CHANNEL</span>
                  <span className="block text-[#ff477b] text-[9px] mt-1 opacity-70">AGENCY</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <th scope="row" className="py-4 px-6 text-slate-300 text-[13px] font-medium">{feature.name}</th>
                  <td className="py-4 px-2 text-center">
                    {feature.starter ? <Check className="w-4 h-4 text-[#ff477b] mx-auto drop-shadow-[0_0_8px_rgba(255,71,123,0.5)]" /> : <Minus className="w-4 h-4 text-slate-700 mx-auto" />}
                  </td>
                  <td className="py-4 px-2 text-center relative bg-[#ff477b]/[0.02]">
                    {feature.growth ? <Check className="w-4 h-4 text-[#ff477b] mx-auto relative z-10 drop-shadow-[0_0_8px_rgba(255,71,123,0.5)]" /> : <Minus className="w-4 h-4 text-slate-700 mx-auto relative z-10" />}
                  </td>
                  <td className="py-4 px-2 text-center">
                    {feature.agency ? <Check className="w-4 h-4 text-[#ff477b] mx-auto drop-shadow-[0_0_8px_rgba(255,71,123,0.5)]" /> : <Minus className="w-4 h-4 text-slate-700 mx-auto" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default CapabilitiesMatrix;

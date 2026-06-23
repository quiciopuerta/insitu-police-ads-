import React from "react";
import { motion } from "framer-motion";
import { Language } from "../../types";

interface UseCasesProps {
  language: Language;
}

const UseCases: React.FC<UseCasesProps> = ({ language }) => {
  return (
    <section className="max-w-7xl mx-auto px-6 py-24 reveal-on-scroll" id="casos-de-uso">
      <div className="text-center mb-16">
        <span className="text-[#ff477b] text-xs font-bold uppercase tracking-widest block mb-4">
          {language === "es" ? "Casos de uso" : "Use Cases"}
        </span>
        <h2 className="text-3xl md:text-4xl font-bold text-slate-100 mb-4">
          {language === "es" ? "¿Para quién es insitu.company?" : "Who is insitu.company for?"}
        </h2>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          {language === "es"
            ? "Desde freelancers hasta agencias con +100 clientes, nuestra IA se adapta a tu escala."
            : "From freelancers to agencies with 100+ clients, our AI scales to your needs."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            emoji: "🚀",
            title: language === "es" ? "Freelancers & Solopreneurs" : "Freelancers & Solopreneurs",
            desc: language === "es"
              ? "Optimiza tu copy SEM, detecta keywords negativas y genera reportes profesionales sin necesidad de un equipo de analistas."
              : "Optimize your SEM copy, detect negative keywords, and generate professional reports without an analyst team.",
          },
          {
            emoji: "📈",
            title: language === "es" ? "Agencias de Marketing" : "Marketing Agencies",
            desc: language === "es"
              ? "Gestiona decenas de cuentas simultáneamente. Reportes white-label, auditorías masivas de creativos y Brand Guardian automático."
              : "Manage dozens of accounts simultaneously. White-label reports, mass creative audits, and automatic Brand Guardian.",
          },
          {
            emoji: "🛒",
            title: "E-commerce & DTC",
            desc: language === "es"
              ? "Maximiza el ROAS de tus campañas de Shopping, analiza la retención de tus videos de producto y optimiza catálogos."
              : "Maximize ROAS on your Shopping campaigns, analyze product video retention, and optimize catalogs.",
          },
          {
            emoji: "🏢",
            title: language === "es" ? "Marcas Corporativas" : "Enterprise Brands",
            desc: language === "es"
              ? "Supervision de compliance de marca a escala, análisis de consistencia cross-channel y dashboards ejecutivos con AI-driven insights."
              : "Brand compliance monitoring at scale, cross-channel consistency analysis, and executive dashboards with AI-driven insights.",
          },
        ].map((useCase, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="glass-landing p-6 rounded-2xl border border-white/5 hover:border-[#ff477b]/20 transition-all group"
          >
            <div className="text-3xl mb-4">{useCase.emoji}</div>
            <h3 className="text-lg font-bold text-slate-100 mb-3 group-hover:text-[#ff477b] transition-colors">{useCase.title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{useCase.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default UseCases;

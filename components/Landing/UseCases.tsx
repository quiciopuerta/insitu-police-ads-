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
            emoji: "🛡️",
            title: language === "es" ? "Agencias & MCCs" : "Agencies & MCCs",
            desc: language === "es"
              ? "Monitorea decenas de cuentas simultáneamente. Detecta violaciones de políticas en tiempo real y evita bloqueos masivos que afecten a tus clientes."
              : "Monitor dozens of accounts simultaneously. Detect policy violations in real-time and prevent massive blockages that affect your clients.",
          },
          {
            emoji: "🏥",
            title: language === "es" ? "Nichos Restringidos" : "Restricted Niches",
            desc: language === "es"
              ? "Para cuentas de Salud, Servicios Financieros y Legal. Escanea el Ad Copy para evitar reclamos médicos no verificados o promesas financieras falsas."
              : "For Healthcare, Financial Services, and Legal accounts. Scan Ad Copy to avoid unverified medical claims or false financial promises.",
          },
          {
            emoji: "🔒",
            title: "E-commerce & Dropshipping",
            desc: language === "es"
              ? "Analiza Landing Pages en busca de malware, redirecciones engañosas y falta de políticas de transparencia antes de enviar tráfico pagado."
              : "Analyze Landing Pages for malware, deceptive redirects, and missing transparency policies before sending paid traffic.",
          },
          {
            emoji: "🚀",
            title: language === "es" ? "Performance Marketers" : "Performance Marketers",
            desc: language === "es"
              ? "No pierdas días de optimización por una suspensión de Circumventing Systems o Unacceptable Business Practices. Escanea todo antes de publicar."
              : "Don't lose optimization days due to a Circumventing Systems or Unacceptable Business Practices suspension. Scan everything before publishing.",
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

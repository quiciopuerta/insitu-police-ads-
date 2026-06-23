import React from "react";
import { motion } from "framer-motion";
import { BarChart3, Users, Globe, Clock } from "lucide-react";
import { Language } from "../../types";

interface LiveCounterProps {
  language: Language;
}

const LiveCounter: React.FC<LiveCounterProps> = ({ language }) => {
  return (
    <section className="max-w-7xl mx-auto px-6 py-16 reveal-on-scroll">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
        {[
          { value: "4,200+", label: language === "es" ? "Auditorías realizadas" : "Audits completed", icon: <BarChart3 className="w-5 h-5" /> },
          { value: "850+", label: language === "es" ? "Agencias activas" : "Active agencies", icon: <Users className="w-5 h-5" /> },
          { value: "12", label: language === "es" ? "Países" : "Countries", icon: <Globe className="w-5 h-5" /> },
          { value: "98.7%", label: "Uptime SLA", icon: <Clock className="w-5 h-5" /> },
        ].map((counter, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="text-center py-6"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-[#ff477b]">{counter.icon}</span>
              <span className="text-3xl md:text-4xl font-black text-slate-100">{counter.value}</span>
            </div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{counter.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default LiveCounter;

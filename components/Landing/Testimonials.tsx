import React from "react";
import { motion } from "framer-motion";
import { Language } from "../../types";

interface TestimonialsProps {
  language: Language;
}

const Testimonials: React.FC<TestimonialsProps> = ({ language }) => {
  return (
    <section className="max-w-7xl mx-auto px-6 py-24 reveal-on-scroll" id="testimonios">
      <div className="text-center mb-16">
        <span className="text-[#ff477b] text-xs font-bold uppercase tracking-widest block mb-4">
          {language === "es" ? "Testimonios" : "Testimonials"}
        </span>
        <h2 className="text-3xl md:text-4xl font-bold text-slate-100">
          {language === "es" ? "Lo que dicen nuestros usuarios" : "What our users say"}
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          {
            quote: language === "es"
              ? "insitu.company redujo nuestro costo por lead en un 42% en solo 3 semanas. La auditoría neuronal detectó keywords negativas que llevábamos meses desperdiciando presupuesto."
              : "insitu.company reduced our cost per lead by 42% in just 3 weeks. The neural audit detected negative keywords we had been wasting budget on for months.",
            name: "María García",
            role: language === "es" ? "Head of Growth, TechStartup MX" : "Head of Growth, TechStartup MX",
            rating: 5,
          },
          {
            quote: language === "es"
              ? "La función de Brand Guardian es un game-changer para agencias. Supervisamos el cumplimiento de marca de +50 clientes automáticamente. Es como tener un equipo de QA 24/7."
              : "The Brand Guardian feature is a game-changer for agencies. We monitor brand compliance for 50+ clients automatically. It's like having a 24/7 QA team.",
            name: "Carlos Mendoza",
            role: language === "es" ? "Director de Operaciones, AdFactory" : "Operations Director, AdFactory",
            rating: 5,
          },
          {
            quote: language === "es"
              ? "El análisis de retención de video nos ayudó a identificar exactamente en qué segundo perdíamos atención. Nuestro CTR en TikTok Ads subió un 87%."
              : "The video retention analysis helped us identify exactly at which second we were losing attention. Our TikTok Ads CTR increased by 87%.",
            name: "Ana Torres",
            role: language === "es" ? "Content Strategist, E-commerce LATAM" : "Content Strategist, E-commerce LATAM",
            rating: 5,
          },
        ].map((testimonial, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="glass-landing p-8 rounded-2xl border border-white/5 flex flex-col"
          >
            <div className="flex gap-1 mb-4">
              {Array.from({ length: testimonial.rating }).map((_, s) => (
                <span key={s} className="text-yellow-400 text-lg">★</span>
              ))}
            </div>
            <blockquote className="text-slate-300 text-sm leading-relaxed mb-6 flex-grow italic">
              "{testimonial.quote}"
            </blockquote>
            <div className="flex items-center gap-3 pt-4 border-t border-white/5">
              <div className="w-10 h-10 rounded-full bg-[#ff477b]/20 flex items-center justify-center text-[#ff477b] font-bold text-sm">
                {testimonial.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <p className="text-slate-100 text-sm font-bold">{testimonial.name}</p>
                <p className="text-slate-500 text-xs">{testimonial.role}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default Testimonials;

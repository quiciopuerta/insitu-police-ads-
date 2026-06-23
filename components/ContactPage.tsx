import React, { useState } from "react";
import { motion } from "framer-motion";
import LogoIsotype from "./LogoIsotype";
import { Send, Copy, Headphones, CheckCircle } from "lucide-react";

interface ContactPageProps {
  onClose: () => void;
  language?: "es" | "en";
}

const ContactPage: React.FC<ContactPageProps> = ({ onClose, language = "es" }) => {
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    budget: "",
    consultType: language === "es" ? "Análisis de Datos" : "Data Analysis",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText("ia@insitu.company");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(
      `[${formData.consultType}] Consulta de ${formData.name} — ${formData.company}`
    );
    const body = encodeURIComponent(
      `Nombre: ${formData.name}\nEmpresa: ${formData.company}\nEmail: ${formData.email}\nPresupuesto: ${formData.budget}\nTipo: ${formData.consultType}\n\nMensaje:\n${formData.message}`
    );
    window.open(`mailto:ia@insitu.company?subject=${subject}&body=${body}`, "_blank");
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
  };

  const t = {
    badge: language === "es" ? "Contacto Premium" : "Premium Contact",
    title1: language === "es" ? "Conecta con la" : "Connect with",
    titleHighlight: language === "es" ? "Inteligencia" : "Intelligence",
    subtitle: language === "es"
      ? "Impulsa tu estrategia digital con análisis predictivo de alto nivel. Estamos listos para escalar tu negocio."
      : "Boost your digital strategy with high-level predictive analysis. We're ready to scale your business.",
    emailLabel: language === "es" ? "Email Oficial" : "Official Email",
    copyBtn: copied
      ? (language === "es" ? "¡Copiado!" : "Copied!")
      : (language === "es" ? "Copiar Email" : "Copy Email"),
    supportBtn: language === "es" ? "Soporte" : "Support",
    nameLabel: language === "es" ? "Nombre Completo" : "Full Name",
    namePlaceholder: language === "es" ? "Ej: Alex Rivera" : "e.g. Alex Rivera",
    companyLabel: language === "es" ? "Compañía" : "Company",
    companyPlaceholder: language === "es" ? "Tu Empresa" : "Your Company",
    emailInputLabel: language === "es" ? "Email Corporativo" : "Corporate Email",
    emailPlaceholder: "alex@empresa.com",
    budgetLabel: language === "es" ? "Presupuesto Mensual Estimado" : "Estimated Monthly Budget",
    budgetDefault: language === "es" ? "Selecciona un rango" : "Select a range",
    consultLabel: language === "es" ? "Tipo de Consulta" : "Query Type",
    messageLabel: language === "es" ? "Mensaje" : "Message",
    messagePlaceholder: language === "es" ? "Cuéntanos sobre tus objetivos..." : "Tell us about your goals...",
    submitBtn: submitted
      ? (language === "es" ? "¡Mensaje enviado!" : "Message sent!")
      : (language === "es" ? "Enviar Mensaje" : "Send Message"),
    close: language === "es" ? "Cerrar" : "Close",
  };

  const budgetOptions = [
    { value: "<5k", label: "< $5k" },
    { value: "5k-20k", label: "$5k - $20k" },
    { value: "20k-50k", label: "$20k - $50k" },
    { value: ">50k", label: "> $50k" },
  ];

  const consultOptions = language === "es"
    ? ["Análisis de Datos", "Optimización de Ads", "Implementación AI", "Auditoría de Campañas", "Otros"]
    : ["Data Analysis", "Ad Optimization", "AI Implementation", "Campaign Audit", "Other"];

  const inputClass = "w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-[#ff477b]/50 focus:ring-1 focus:ring-[#ff477b]/50 transition-all placeholder:text-slate-600";

  return (
    <div className="fixed inset-0 z-[200] bg-[#12080a] overflow-y-auto selection:bg-[#ff477b]/30">
      {/* Header */}
      <nav className="sticky top-0 w-full z-50 border-b border-white/5 bg-[#12080a]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={onClose}>
            <LogoIsotype className="w-8 h-8 text-[#ff477b]" />
            <span className="font-black text-xl tracking-tighter text-white">
              INsitu<span className="text-[#ff477b]">AI</span>
            </span>
            <div className="h-4 w-px bg-white/10 hidden sm:block mx-2" />
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-[#ff477b] hidden sm:block">
              {t.badge}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-[11px] font-black uppercase tracking-widest flex items-center space-x-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10"
          >
            <span>{t.close}</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Main */}
      <main className="relative pt-12 pb-20 px-6 overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#ff477b]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-10 gap-16 relative z-10">
          {/* Left Column — Info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-4 flex flex-col justify-center space-y-8"
          >
            <div>
              <span className="inline-block py-1 px-3 rounded-full bg-[#ff477b]/10 border border-[#ff477b]/20 text-[#ff477b] text-xs font-bold uppercase tracking-widest mb-4">
                {t.badge}
              </span>
              <h1 className="text-4xl lg:text-5xl font-black leading-tight mb-6 tracking-tight">
                {t.title1}{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff477b] to-rose-400">
                  {t.titleHighlight}
                </span>
              </h1>
              <p className="text-slate-400 text-lg leading-relaxed max-w-md">
                {t.subtitle}
              </p>
            </div>

            {/* Email Card */}
            <div className="bg-[rgba(39,27,30,0.4)] backdrop-blur-xl border border-[#ff477b]/10 p-8 rounded-2xl space-y-6 border-l-4 border-l-[#ff477b] shadow-2xl">
              <div className="space-y-1">
                <p className="text-[#ff477b] text-sm font-bold tracking-wide uppercase">{t.emailLabel}</p>
                <p className="text-2xl font-black tracking-tight text-white">ia@insitu.company</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleCopyEmail}
                  className={`flex-1 flex items-center justify-center gap-2 font-bold py-3 px-6 rounded-xl text-sm transition-all ${
                    copied
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                      : "bg-[#ff477b] text-white shadow-lg shadow-[#ff477b]/30 hover:scale-[1.02] active:scale-95"
                  }`}
                >
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {t.copyBtn}
                </button>
                <a
                  href="mailto:ia@insitu.company?subject=Soporte%20INsitu%20AI"
                  className="flex-1 flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-white font-bold py-3 px-6 rounded-xl text-sm hover:bg-primary hover:text-white hover:border-primary transition-all"
                >
                  <Headphones className="w-4 h-4" />
                  {t.supportBtn}
                </a>
              </div>
            </div>

            {/* Partner badges */}
            <div className="flex items-center gap-6 pt-4 opacity-40">
              <div className="flex items-center gap-2">
                <span className="text-blue-400 text-sm">🔷</span>
                <span className="text-xs font-medium text-slate-400">Google Partner</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#ff477b] text-sm">✅</span>
                <span className="text-xs font-medium text-slate-400">Meta Business</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column — Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="lg:col-span-6"
          >
            <div className="bg-[rgba(39,27,30,0.4)] backdrop-blur-xl border border-white/5 p-8 lg:p-12 rounded-2xl shadow-2xl relative">
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#ff477b]/5 rounded-full blur-3xl pointer-events-none" />

              <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 ml-1">{t.nameLabel}</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t.namePlaceholder}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 ml-1">{t.companyLabel}</label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder={t.companyPlaceholder}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 ml-1">{t.emailInputLabel}</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder={t.emailPlaceholder}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 ml-1">{t.budgetLabel}</label>
                    <select
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      className={`${inputClass} appearance-none ${!formData.budget ? "text-slate-600" : ""}`}
                    >
                      <option value="" disabled>{t.budgetDefault}</option>
                      {budgetOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300 ml-1">{t.consultLabel}</label>
                  <select
                    value={formData.consultType}
                    onChange={(e) => setFormData({ ...formData, consultType: e.target.value })}
                    className={inputClass}
                  >
                    {consultOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300 ml-1">{t.messageLabel}</label>
                  <textarea
                    required
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder={t.messagePlaceholder}
                    className={`${inputClass} resize-none`}
                  />
                </div>

                <button
                  type="submit"
                  className={`w-full py-4 text-white text-lg font-black rounded-xl transition-all flex items-center justify-center gap-3 ${
                    submitted
                      ? "bg-emerald-500 shadow-lg shadow-emerald-500/30"
                      : "bg-[#ff477b] shadow-lg shadow-[#ff477b]/30 hover:scale-[1.01] hover:brightness-110 active:scale-95"
                  }`}
                >
                  {submitted ? <CheckCircle className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                  {t.submitBtn}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default ContactPage;

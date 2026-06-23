import React from "react";
import LogoIsotype from "./LogoIsotype";

interface SecurityPageProps {
  onClose: () => void;
  language?: "es" | "en";
}

const SecurityPage: React.FC<SecurityPageProps> = ({ onClose, language = "es" }) => {
  const t = {
    badge: language === "es" ? "SEGURIDAD & TECNOLOGÍA" : "SECURITY & TECHNOLOGY",
    title: language === "es" ? "Tu información está protegida por diseño" : "Your information is protected by design",
    subtitle: language === "es"
      ? "insitu.company combina modelos de IA de clase mundial con una infraestructura serverless segura. Aquí detallamos cómo protegemos tus datos y la tecnología detrás de cada auditoría."
      : "insitu.company combines world-class AI models with a secure serverless infrastructure. Here we detail how we protect your data and the technology behind every audit.",
    encTitle: language === "es" ? "Cifrado End-to-End" : "End-to-End Encryption",
    encDesc: language === "es"
      ? "Toda la comunicación entre tu navegador y nuestros servidores está protegida con TLS 1.3. Los datos en reposo se cifran con AES-256. Nunca almacenamos credenciales de plataformas publicitarias — usamos tokens OAuth2 con alcance limitado."
      : "All communication between your browser and our servers is secured with TLS 1.3. Data at rest is encrypted with AES-256. We never store ad platform credentials — we use limited-scope OAuth2 tokens.",
    noStoreTitle: language === "es" ? "Zero Data Retention" : "Zero Data Retention",
    noStoreDesc: language === "es"
      ? "Los datos de tus campañas se procesan en tiempo real y se descartan después de generar el reporte. No almacenamos creativos, textos publicitarios ni métricas de rendimiento de forma permanente."
      : "Your campaign data is processed in real time and discarded after generating the report. We do not permanently store creatives, ad copy, or performance metrics.",
    complianceTitle: language === "es" ? "Cumplimiento Normativo" : "Regulatory Compliance",
    complianceDesc: language === "es"
      ? "Operamos bajo los estándares de GDPR (Europa), CCPA (California) y la Ley Orgánica de Protección de Datos de Ecuador. Puedes solicitar la eliminación completa de tu cuenta y datos en cualquier momento."
      : "We operate under GDPR (Europe), CCPA (California), and Ecuador's Data Protection Law standards. You can request complete deletion of your account and data at any time.",
    infraTitle: language === "es" ? "Infraestructura Cloud-Native" : "Cloud-Native Infrastructure",
    infraDesc: language === "es"
      ? "Nuestra arquitectura serverless se despliega en edge nodes globales para baja latencia. Event-driven runtime con auto-scaling garantiza rendimiento constante sin importar la carga."
      : "Our serverless architecture deploys on global edge nodes for low latency. Event-driven runtime with auto-scaling guarantees consistent performance regardless of load.",
    aiTitle: language === "es" ? "Orquestación Multi-Modelo" : "Multi-Model Orchestration",
    aiDesc: language === "es"
      ? "Gemini (multimodal), GPT-4o (razonamiento) y Claude (análisis) trabajan en paralelo. Cada modelo está aislado en su propio contexto de ejecución — ningún modelo tiene acceso a los datos procesados por otro."
      : "Gemini (multimodal), GPT-4o (reasoning), and Claude (analysis) work in parallel. Each model is isolated in its own execution context — no model has access to data processed by another.",
    accessTitle: language === "es" ? "Control de Acceso" : "Access Control",
    accessDesc: language === "es"
      ? "Autenticación via Google OAuth2 con tokens de sesión de corta duración. Role-Based Access Control (RBAC) para equipos de agencia. Logs de auditoría inmutables para cada acción crítica."
      : "Authentication via Google OAuth2 with short-lived session tokens. Role-Based Access Control (RBAC) for agency teams. Immutable audit logs for every critical action.",
    close: language === "es" ? "Cerrar" : "Close",
  };

  const sections = [
    { icon: "🔒", title: t.encTitle, desc: t.encDesc, color: "#ff477b" },
    { icon: "🗑️", title: t.noStoreTitle, desc: t.noStoreDesc, color: "#10b981" },
    { icon: "📋", title: t.complianceTitle, desc: t.complianceDesc, color: "#6366f1" },
    { icon: "☁️", title: t.infraTitle, desc: t.infraDesc, color: "#3b82f6" },
    { icon: "🤖", title: t.aiTitle, desc: t.aiDesc, color: "#d97706" },
    { icon: "🛡️", title: t.accessTitle, desc: t.accessDesc, color: "#8b5cf6" },
  ];

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950 overflow-y-auto selection:bg-[#ff477b]/30">
      {/* Header */}
      <nav className="sticky top-0 w-full z-50 border-b border-white/5 bg-slate-950/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={onClose}>
            <LogoIsotype className="w-8 h-8 text-[#ff477b]" />
            <span className="font-black text-xl tracking-tighter text-white">
              insitu<span className="text-[#ff477b]">.company</span>
            </span>
            <div className="h-4 w-px bg-white/10 hidden sm:block mx-2"></div>
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

      {/* Hero */}
      <section className="relative pt-24 pb-20 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#ff477b]/10 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full"></div>
        </div>
        <div className="max-w-5xl mx-auto px-6 relative z-10 text-center">
          <p className="text-[#ff477b] text-[11px] font-black uppercase tracking-[0.4em] mb-6">{t.badge}</p>
          <h1 className="text-3xl md:text-6xl lg:text-7xl font-black text-white tracking-tighter mb-8 leading-tight">
            {t.title}
          </h1>
          <p className="text-slate-400 text-lg md:text-xl font-medium max-w-3xl mx-auto leading-relaxed">
            {t.subtitle}
          </p>
        </div>
      </section>

      {/* Security & Tech Grid */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sections.map((s, i) => (
              <div
                key={i}
                className="bg-slate-900 border border-white/5 p-10 rounded-[2rem] group hover:border-white/20 transition-all duration-500"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-6"
                  style={{ backgroundColor: s.color + "15" }}
                >
                  {s.icon}
                </div>
                <h3 className="text-xl font-black text-white mb-4">{s.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="py-16 border-t border-white/5 bg-white/[0.01]">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            {["TLS 1.3", "AES-256", "OAuth2", "GDPR", "CCPA", "99.9% Uptime"].map((badge, i) => (
              <span
                key={i}
                className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-400"
              >
                {badge}
              </span>
            ))}
          </div>
          <p className="text-slate-600 text-xs mt-8">
            {language === "es"
              ? "¿Preguntas sobre seguridad? Escríbenos a info@insitu.company"
              : "Security questions? Write to us at info@insitu.company"}
          </p>
        </div>
      </section>
    </div>
  );
};

export default SecurityPage;

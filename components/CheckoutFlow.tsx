import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Language } from "../types";
import { authService } from "../services/authService";
import { martechService } from "../services/martechService";
import LogoIsotype from "./LogoIsotype";

interface CheckoutFlowProps {
  selectedPlan: "Starter" | "Growth" | "Agency";
  initialBillingCycle?: "Monthly" | "Yearly" | "Lifetime";
  onClose: () => void;
  onComplete: (
    plan: string,
    billingCycle: "Monthly" | "Yearly" | "Lifetime",
  ) => void;
  language: Language;
}

const CheckoutFlow: React.FC<CheckoutFlowProps> = ({
  selectedPlan,
  initialBillingCycle = "Monthly",
  onClose,
  onComplete,
  language,
}) => {
  const [step, setStep] = useState<"billing" | "details" | "payment">(
    "billing",
  ); // Default to billing step
  const [billingCycle, setBillingCycle] = useState<"Monthly" | "Yearly">(
    (initialBillingCycle === "Lifetime" ? "Monthly" : initialBillingCycle) as
      | "Monthly"
      | "Yearly",
  );
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    phone: "",
  });

  useEffect(() => {
    martechService.pushEvent("begin_checkout", {
      plan: selectedPlan,
      billing_cycle: billingCycle,
    });
  }, []);

  // Get pricing from system settings
  const pricing = authService.getPricing();
  const plans = pricing || {
    Starter: {
      monthly: 0,
      yearly: 0,
      lifetime: 0,
      features: [
        "Prueba Gratis 7 Días (500 Tokens)",
        "Auditoría Limitada",
        "Soporte email",
      ],
    },
    Growth: {
      monthly: 49,
      yearly: 470,
      lifetime: 399,
      features: [
        "50 auditorías/mes",
        "Análisis avanzado",
        "Exportar PDF",
        "Soporte prioritario",
      ],
    },
    Agency: {
      monthly: 149,
      yearly: 1430,
      lifetime: 1299,
      features: [
        "Auditorías ilimitadas",
        "Análisis completo",
        "Exportar PDF + CSV",
        "API Access",
        "Soporte 24/7",
        "White Label",
      ],
    },
  };

  const currentPlan = plans[selectedPlan];
  let price = 0;
  if (billingCycle === "Monthly") price = currentPlan.monthly;
  else if (billingCycle === "Yearly") price = currentPlan.yearly;

  const savings =
    billingCycle === "Yearly"
      ? currentPlan.monthly * 12 - currentPlan.yearly
      : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === "billing") {
      setStep("details");
    } else if (step === "details") {
      if (selectedPlan === "Starter") {
        martechService.pushEvent("trial_start", {
          plan: "Starter",
          email: formData.email,
        });
        onComplete(selectedPlan, billingCycle);
      } else {
        const settings = authService.getSettings();
        if (settings.paypal?.enabled) {
          setStep("payment");
        } else {
          alert(
            language === "es"
              ? "La pasarela de pagos está temporalmente inactiva. Por favor, contacta a soporte."
              : "Payment gateway is temporarily inactive. Please contact support.",
          );
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden relative"
      >
        {/* Close Button - Fixed position relative to modal for consistent access */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-all backdrop-blur-sm"
          aria-label="Close"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Header */}
        <div className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 md:p-8 flex-shrink-0">
          <div className="flex items-center gap-3 mb-6">
            <LogoIsotype className="w-8 h-8 text-[#ff477b]" />
            <span className="text-xl font-black text-white tracking-tighter leading-none">
              INsitu<span className="text-[#ff477b]">AI</span>
            </span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-8 md:mt-0">
            <div>
              <h2 className="text-2xl md:text-4xl font-black text-white tracking-tighter mb-2">
                {language === "es" ? "Finalizar" : "Checkout"}{" "}
                <span className="text-[#ff477b]">{selectedPlan}</span>
              </h2>
              <div className="flex flex-wrap items-center gap-3 md:gap-4">
                <span className="px-3 py-1 bg-white/10 rounded-full text-[11px] font-black text-white uppercase tracking-widest border border-white/20 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  {language === "es" ? "Seguro" : "Secure"}
                </span>
                <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest border-l border-white/10 pl-4">
                  {language === "es" ? "Paso" : "Step"}{" "}
                  {step === "billing" ? "1" : step === "details" ? "2" : "3"} /
                  3
                </p>
              </div>
            </div>
            <div className="hidden md:block bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-3xl p-4 md:p-6 border border-white/20 shadow-2xl relative group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <p className="text-[11px] font-black text-white/50 uppercase tracking-widest mb-1">
                {language === "es" ? "Resumen" : "Summary"}
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl md:text-4xl font-black text-white">
                  ${price}
                </p>
                <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest">
                  {billingCycle === "Monthly"
                    ? language === "es"
                      ? "mes"
                      : "mo"
                    : language === "es"
                      ? "año"
                      : "yr"}
                </p>
              </div>
            </div>
          </div>

          {/* Stepper */}
          <div className="mt-8 grid grid-cols-3 gap-2 md:gap-4 relative max-w-lg mx-auto md:mx-0">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/10 -translate-y-1/2 z-0 hidden md:block"></div>

            {(["Plan", "Datos", "Pago"] as const).map((s, idx) => {
              const stepIdx = idx + 1;
              const isActive =
                (step === "billing" && idx === 0) ||
                (step === "details" && idx === 1) ||
                (step === "payment" && idx === 2);
              const isCompleted =
                (step === "details" && idx === 0) ||
                (step === "payment" && (idx === 0 || idx === 1));

              return (
                <div
                  key={s}
                  className={`relative z-10 flex flex-col items-center gap-2`}
                >
                  <div
                    className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 scale-100 ${
                      isActive
                        ? "bg-[#ff477b] border-[#ff477b] shadow-lg shadow-[#ff477b]/40"
                        : isCompleted
                          ? "bg-emerald-500 border-emerald-500"
                          : "bg-slate-900 border-white/10"
                    }`}
                  >
                    {isCompleted ? (
                      <svg
                        className="w-4 h-4 md:w-5 md:h-5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={4}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <span
                        className={`text-xs font-black ${isActive ? "text-white" : "text-slate-500"}`}
                      >
                        {stepIdx}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[11px] md:text-[11px] font-black uppercase tracking-widest ${isActive ? "text-white" : "text-slate-500"}`}
                  >
                    {s}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="p-6 md:p-8 overflow-y-auto flex-grow bg-white">
          <AnimatePresence mode="wait">
            {/* Step 1: Billing Cycle */}
            {step === "billing" && (
              <motion.div
                key="billing"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-6 md:space-y-8"
              >
                <div>
                  <h3 className="text-xl font-black text-slate-900 mb-1">
                    {language === "es" ? "Elige tu ciclo" : "Choose cycle"}
                  </h3>
                  <p className="text-slate-500 font-medium text-sm">
                    {language === "es" ? "Ahorra 20% anual" : "Save 20% yearly"}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <button
                    onClick={() => setBillingCycle("Monthly")}
                    className={`p-5 md:p-8 rounded-3xl border-2 transition-all text-left ${
                      billingCycle === "Monthly"
                        ? "border-[#ff477b] bg-rose-50 shadow-lg shadow-rose-500/10"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          {language === "es" ? "Mensual" : "Monthly"}
                        </p>
                        <p className="text-2xl md:text-3xl font-black text-slate-900">
                          ${currentPlan.monthly}
                        </p>
                        <p className="text-xs text-slate-500 font-bold mt-0.5">
                          /{language === "es" ? "mes" : "mo"}
                        </p>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          billingCycle === "Monthly"
                            ? "border-[#ff477b]"
                            : "border-slate-300"
                        }`}
                      >
                        {billingCycle === "Monthly" && (
                          <div className="w-3 h-3 rounded-full bg-[#ff477b]" />
                        )}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setBillingCycle("Yearly")}
                    className={`p-5 md:p-8 rounded-3xl border-2 transition-all text-left relative overflow-hidden ${
                      billingCycle === "Yearly"
                        ? "border-[#ff477b] bg-rose-50 shadow-lg shadow-rose-500/10"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="absolute top-4 right-4 bg-emerald-500 text-white text-[11px] font-black uppercase tracking-widest px-2 py-1 rounded-full">
                      -20%
                    </div>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          {language === "es" ? "Anual" : "Yearly"}
                        </p>
                        <p className="text-2xl md:text-3xl font-black text-slate-900">
                          ${currentPlan.yearly}
                        </p>
                        <p className="text-xs text-slate-500 font-bold mt-0.5">
                          /{language === "es" ? "año" : "yr"}
                        </p>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          billingCycle === "Yearly"
                            ? "border-[#ff477b]"
                            : "border-slate-300"
                        }`}
                      >
                        {billingCycle === "Yearly" && (
                          <div className="w-3 h-3 rounded-full bg-[#ff477b]" />
                        )}
                      </div>
                    </div>
                  </button>
                </div>

                <button
                  onClick={() => setStep("details")}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-[#ff477b] transition-all"
                >
                  {language === "es" ? "Continuar" : "Continue"}
                </button>
              </motion.div>
            )}
            {/* Step 2: Contact Details */}
            {step === "details" && (
              <motion.div
                key="details"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
              >
                <div className="mb-6 md:mb-8">
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-2">
                    {language === "es" ? "Datos personales" : "Your details"}
                  </h3>
                  <p className="text-slate-500 font-medium text-sm">
                    {language === "es"
                      ? "Para crear tu cuenta"
                      : "To create your account"}
                  </p>
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="space-y-4 md:space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        {language === "es" ? "Nombre" : "First Name"}
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.firstName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            firstName: e.target.value,
                          })
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-black text-slate-900 outline-none focus:border-[#ff477b] focus:bg-white transition-all shadow-sm"
                        placeholder="Juan"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        {language === "es" ? "Apellido" : "Last Name"}
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.lastName}
                        onChange={(e) =>
                          setFormData({ ...formData, lastName: e.target.value })
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-black text-slate-900 outline-none focus:border-[#ff477b] focus:bg-white transition-all shadow-sm"
                        placeholder="Pérez"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                      {language === "es" ? "Email" : "Email"}
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-black text-slate-900 outline-none focus:border-[#ff477b] focus:bg-white transition-all shadow-sm"
                      placeholder="juan@empresa.com"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        {language === "es" ? "Empresa" : "Company"}
                      </label>
                      <input
                        type="text"
                        value={formData.company}
                        onChange={(e) =>
                          setFormData({ ...formData, company: e.target.value })
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-black text-slate-900 outline-none focus:border-[#ff477b] focus:bg-white transition-all shadow-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        {language === "es" ? "Teléfono" : "Phone"}
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-black text-slate-900 outline-none focus:border-[#ff477b] focus:bg-white transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setStep("billing")}
                      className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                    >
                      {language === "es" ? "Atrás" : "Back"}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-[#ff477b] transition-all"
                    >
                      {selectedPlan === "Starter"
                        ? language === "es"
                          ? "Iniciar Prueba (7 días)"
                          : "Start Trial"
                        : language === "es"
                          ? "Continuar"
                          : "Next"}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Step 3: Payment */}
            {step === "payment" && selectedPlan !== "Starter" && (
              <motion.div
                key="payment"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-8"
              >
                <div className="text-center md:text-left">
                  <h3 className="text-2xl font-black text-slate-900 mb-2">
                    {language === "es" ? "Pago Seguro" : "Secure Payment"}
                  </h3>
                  <p className="text-slate-500 font-medium text-sm">
                    {language === "es"
                      ? "Finaliza tu suscripción vía PayPal"
                      : "Complete via PayPal"}
                  </p>
                </div>

                <div className="bg-slate-50 border-2 border-slate-200 rounded-[2rem] p-6 md:p-8 text-center">
                  <div className="w-20 h-20 bg-white rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg">
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg"
                      className="h-6"
                      alt="PayPal"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const transactionId = `TRX-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
                      martechService.trackPurchase(
                        transactionId,
                        price,
                        "USD",
                        selectedPlan,
                      );
                      onComplete(selectedPlan, billingCycle);
                    }}
                    className="w-full bg-[#0070BA] text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#005ea6] transition-all shadow-xl shadow-blue-500/20 active:scale-95"
                  >
                    {language === "es" ? "Pagar con PayPal" : "Pay with PayPal"}
                  </button>
                </div>

                <button
                  onClick={() => setStep("details")}
                  className="w-full text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600"
                >
                  {language === "es" ? "Volver" : "Go Back"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Features - Scrollable or fixed? Let's keep it fixed at bottom if possible, or part of scroll flow */}
        <div className="bg-slate-50 p-6 border-t border-slate-200 flex-shrink-0">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">
            {language === "es" ? "Incluido" : "Included"}:
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {currentPlan.features.slice(0, 3).map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <svg
                  className="w-3 h-3 text-emerald-500 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={4}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-[11px] font-bold text-slate-600">
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CheckoutFlow;

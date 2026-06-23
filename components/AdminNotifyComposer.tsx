import React, { useState, useRef } from "react";
import { adminFetch, API_URL } from "../utils/apiConfig";

// ── Types ────────────────────────────────────────────────────────────────────

type ChannelType = "email" | "push";
type SegmentType = "ALL" | "STARTER" | "GROWTH" | "AGENCY";

interface Variant {
  id: string;
  label: string;
  subject: string;
  content: string;
}

interface FormState {
  channel: ChannelType;
  segment: SegmentType;
  subject: string;
  content: string;
  imageUrl: string;
  ctaUrl: string;
  ctaText: string;
  enableAbTest: boolean;
  variants: Variant[];
  testEmail: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const SEGMENTS: { value: SegmentType; label: string; icon: string; color: string }[] = [
  { value: "ALL",     label: "Todos los usuarios",   icon: "👥", color: "bg-slate-700 text-slate-300 border-slate-600" },
  { value: "STARTER", label: "Plan Starter",          icon: "⚡", color: "bg-blue-900/50 text-blue-300 border-blue-700" },
  { value: "GROWTH",  label: "Plan Growth",           icon: "🚀", color: "bg-violet-900/50 text-violet-300 border-violet-700" },
  { value: "AGENCY",  label: "Plan Agency",           icon: "🏆", color: "bg-amber-900/50 text-amber-300 border-amber-700" },
];

const PERSONALIZATION_TAGS = [
  { tag: "{{firstName}}",   label: "Nombre" },
  { tag: "{{lastName}}",    label: "Apellido" },
  { tag: "{{email}}",       label: "Email" },
  { tag: "{{plan}}",        label: "Plan" },
  { tag: "{{tokensUsed}}", label: "Tokens usados" },
  { tag: "{{availableDays}}", label: "Días disponibles" },
];

const EMAIL_TEMPLATES = [
  {
    id: "promo",
    label: "🎯 Promo / Oferta",
    subject: "{{firstName}}, oferta especial para ti 🎁",
    content: "Hola {{firstName}},\n\nTenemos algo especial preparado para ti como usuario del plan {{plan}}.\n\nNo te pierdas esta oportunidad exclusiva — es por tiempo limitado.",
  },
  {
    id: "feature",
    label: "✨ Nueva Funcionalidad",
    subject: "¡Novedad en INsitu AI! Descubre lo nuevo 🚀",
    content: "Hola {{firstName}},\n\nAcabamos de lanzar una nueva función que va a transformar cómo manejas tus campañas.\n\nTu plan {{plan}} ya tiene acceso. ¡Pruébalo ahora!",
  },
  {
    id: "retention",
    label: "💙 Retención / Reactivación",
    subject: "{{firstName}}, te echamos de menos",
    content: "Hola {{firstName}},\n\nNotamos que llevas un tiempo sin usar INsitu AI. ¿Todo bien?\n\nYa tienes {{tokensUsed}} tokens usados — y tu cuenta sigue activa. Vuelve cuando quieras.",
  },
  {
    id: "onboarding",
    label: "👋 Onboarding",
    subject: "Bienvenido a INsitu AI, {{firstName}} 👋",
    content: "Hola {{firstName}},\n\nEstamos muy felices de tenerte en el plan {{plan}}.\n\nTu cuenta está lista. Este es el primer paso para optimizar tus campañas con inteligencia artificial.",
  },
  {
    id: "available_days",
    label: "📅 Días Disponibles",
    subject: "{{firstName}}, tienes {{availableDays}} días de prueba restantes",
    content: "Hola {{firstName}},\n\nQueremos recordarte que aún tienes {{availableDays}} días disponibles en tu prueba del plan {{plan}}.\n\n¡Aprovéchalos para optimizar tus campañas al máximo!",
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const previewPersonalize = (text: string, firstName = "María", plan = "Growth", used = "1,240", availableDays = "5") =>
  text
    .replace(/\{\{firstName\}\}/g, firstName)
    .replace(/\{\{plan\}\}/g, plan)
    .replace(/\{\{tokensUsed\}\}/g, used)
    .replace(/\{\{lastName\}\}/g, "García")
    .replace(/\{\{email\}\}/g, "maria@ejemplo.com")
    .replace(/\{\{availableDays\}\}/g, availableDays);

// ── Sub-components ───────────────────────────────────────────────────────────

const RichTextArea: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  onInsertTag: (tag: string) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}> = ({ value, onChange, placeholder, rows = 6, onInsertTag, textareaRef }) => (
  <div className="space-y-2">
    <div className="flex flex-wrap gap-1.5">
      {PERSONALIZATION_TAGS.map((t) => (
        <button
          key={t.tag}
          type="button"
          onClick={() => onInsertTag(t.tag)}
          className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md text-[10px] font-mono hover:bg-indigo-500/20 transition-colors"
        >
          {t.tag}
        </button>
      ))}
    </div>
    <textarea
      ref={textareaRef as React.RefObject<HTMLTextAreaElement>}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500/50 transition-colors resize-none font-mono leading-relaxed"
    />
  </div>
);

// ── Email Preview ─────────────────────────────────────────────────────────────

const EmailPreview: React.FC<{ subject: string; content: string; imageUrl?: string; ctaUrl?: string; ctaText?: string }> = ({
  subject, content, imageUrl, ctaUrl, ctaText,
}) => {
  const firstName = "María";
  const plan = "Growth";
  const used = "1,240";
  const availableDays = "5";

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0a0507] shadow-2xl text-left">
      {/* Email header bar */}
      <div className="bg-black/50 px-4 py-3 flex items-center gap-3 border-b border-white/5">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-rose-500/70" />
          <div className="w-3 h-3 rounded-full bg-amber-500/70" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
        </div>
        <div className="flex-1 bg-black/40 rounded-md px-3 py-1 text-[10px] text-slate-500 truncate">
          {previewPersonalize(subject, firstName, plan, used, availableDays) || "Sin asunto"}
        </div>
      </div>

      {/* Email body */}
      <div className="p-5">
        {/* Brand header */}
        <div
          className="rounded-t-2xl p-5 mb-0"
          style={{ background: "linear-gradient(135deg,#1a0b10,#2d0e1a)", borderBottom: "2px solid #ff477b" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#ff477b] flex items-center justify-center">
                <span className="text-white text-xs font-black">IN</span>
              </div>
              <span className="text-[#ff477b] font-black tracking-tight text-base">INsitu AI</span>
            </div>
            <span className="text-[9px] text-slate-500 uppercase tracking-widest">AI Engagement</span>
          </div>
        </div>

        {/* Body */}
        <div className="bg-[#1a0b10] rounded-b-2xl px-6 py-5 space-y-4">
          {imageUrl && (
            <div className="rounded-xl overflow-hidden border border-white/5">
              <img src={imageUrl} alt="Preview" className="w-full object-cover max-h-36" />
            </div>
          )}
          <div className="text-slate-300 text-[13px] whitespace-pre-line leading-relaxed">
            {previewPersonalize(content, firstName, plan, used, availableDays) || <span className="text-slate-600 italic">El cuerpo del mensaje aparecerá aquí…</span>}
          </div>
          {ctaUrl && (
            <div className="text-center pt-2">
              <span className="inline-block bg-[#ff477b] text-white text-[12px] font-bold px-6 py-2.5 rounded-lg">
                {ctaText || "Ver más →"}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[9px] text-slate-600 mt-4">
          INsitu AI · has recibido este mensaje porque eres usuario · <span className="underline">Cancelar suscripción</span>
        </p>
      </div>
    </div>
  );
};

// ── Push Preview ──────────────────────────────────────────────────────────────

const PushPreview: React.FC<{ subject: string; content: string; imageUrl?: string }> = ({ subject, content, imageUrl }) => {
  const firstName = "María";
  const plan = "Growth";
  const used = "1,240";
  const availableDays = "5";

  return (
    <div className="space-y-4">
      {/* Mobile notification */}
      <div className="bg-[#1a1a2e] rounded-3xl p-4 border border-white/5 shadow-2xl max-w-xs mx-auto">
        <div className="flex items-start gap-3 bg-white/5 rounded-2xl p-3 backdrop-blur-sm">
          <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#ff477b] to-[#c2185b] flex-shrink-0 flex items-center justify-center shadow-lg">
            <span className="text-white text-xs font-black">IN</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] font-bold text-white truncate">INsitu AI</span>
              <span className="text-[9px] text-slate-500">Ahora</span>
            </div>
            <p className="text-[12px] font-semibold text-white leading-tight">
              {previewPersonalize(subject, firstName, plan, used, availableDays) || "Título del push"}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-snug">
              {previewPersonalize(content, firstName, plan, used, availableDays) || "Mensaje del push…"}
            </p>
          </div>
        </div>
        {imageUrl && (
          <div className="mt-3 rounded-xl overflow-hidden">
            <img src={imageUrl} alt="media" className="w-full object-cover max-h-28" />
          </div>
        )}
        <div className="mt-3 flex gap-2">
          <button className="flex-1 bg-white/10 text-white text-[11px] font-bold py-1.5 rounded-xl">Ignorar</button>
          <button className="flex-1 bg-[#ff477b] text-white text-[11px] font-bold py-1.5 rounded-xl">Ver</button>
        </div>
      </div>

      {/* Bell badge */}
      <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
        <span>🔔</span>
        <span>Aparece en el panel de notificaciones del usuario</span>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

interface AdminNotifyComposerProps {
  language: "es" | "en";
}

const AdminNotifyComposer: React.FC<AdminNotifyComposerProps> = ({ language: _lang }) => {
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const variantRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  const [form, setForm] = useState<FormState>({
    channel: "email",
    segment: "ALL",
    subject: "",
    content: "",
    imageUrl: "",
    ctaUrl: "",
    ctaText: "",
    enableAbTest: false,
    variants: [
      { id: "A", label: "Variante A", subject: "", content: "" },
      { id: "B", label: "Variante B", subject: "", content: "" },
    ],
    testEmail: "",
  });

  const [isSending, setIsSending] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [activeVariant, setActiveVariant] = useState(0);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");

  // ── Insert tag at cursor ────────────────────────────────────────────────────

  const insertTagIntoField = (
    tag: string,
    field: "content" | "subject" | { variantIdx: number; key: "subject" | "content" }
  ) => {
    if (typeof field === "string") {
      const ta = field === "content" ? contentRef.current : null;
      if (ta) {
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const newVal = form[field].slice(0, start) + tag + form[field].slice(end);
        ta.setSelectionRange(start + tag.length, start + tag.length);
        setForm({ ...form, [field]: newVal });
      } else {
        setForm({ ...form, [field]: form[field as "content" | "subject"] + tag });
      }
    } else {
      const { variantIdx, key } = field;
      const updated = form.variants.map((v, i) => i === variantIdx ? { ...v, [key]: v[key] + tag } : v);
      setForm({ ...form, variants: updated });
    }
  };

  // ── Apply template ──────────────────────────────────────────────────────────

  const applyTemplate = (tpl: typeof EMAIL_TEMPLATES[0]) => {
    setForm({ ...form, subject: tpl.subject, content: tpl.content });
  };

  // ── Send actions ─────────────────────────────────────────────────────────────

  const sendTestEmail = async () => {
    if (!form.testEmail) { setResult({ ok: false, message: "Ingresa un email de prueba" }); return; }
    setIsTesting(true);
    try {
      const r = await adminFetch(`${API_URL}/admin/notify/test-email`, {
        method: "POST",
        body: JSON.stringify({ email: form.testEmail, firstName: "Prueba", subject: form.subject, content: form.content }),
      });
      const d = await r.json();
      setResult({ ok: r.ok, message: r.ok ? "✅ Email de prueba enviado correctamente" : `❌ ${d.error || "Error"}` });
    } catch {
      setResult({ ok: false, message: "❌ Error de red al enviar prueba" });
    }
    setIsTesting(false);
  };

  const sendBroadcast = async () => {
    if (!form.subject || !form.content) {
      setResult({ ok: false, message: "⚠️ Completa el asunto y el contenido antes de enviar." });
      return;
    }
    if (!window.confirm(`¿Enviar este ${form.channel === "email" ? "email" : "push"} a todos los usuarios del segmento «${SEGMENTS.find(s => s.value === form.segment)?.label}»? Esta acción no se puede deshacer.`)) return;

    setIsSending(true);
    setResult(null);
    try {
      const payload: Record<string, unknown> = {
        segment: form.segment,
        subject: form.subject,
        content: form.content,
        imageUrl: form.imageUrl || undefined,
        ctaUrl: form.ctaUrl || undefined,
        ctaText: form.ctaText || undefined,
      };

      if (form.enableAbTest) {
        payload.variants = form.variants.map(v => ({
          subject: v.subject || form.subject,
          content: v.content || form.content,
        }));
      }

      const endpoint = form.channel === "push" ? `${API_URL}/admin/notify/push` : `${API_URL}/admin/notify/broadcast`;
      const r = await adminFetch(endpoint, { method: "POST", body: JSON.stringify(payload) });
      const d = await r.json();
      setResult({
        ok: r.ok,
        message: r.ok
          ? `✅ Broadcast completado: ${d.emailsSent || d.stored || 0} ${form.channel === "email" ? "emails enviados" : "pushes almacenados"}.`
          : `❌ ${d.error || "Error en el servidor"}`,
      });
    } catch {
      setResult({ ok: false, message: "❌ Error de red. Verifica la conexión." });
    }
    setIsSending(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  const currentSubject = form.enableAbTest ? (form.variants[activeVariant]?.subject || form.subject) : form.subject;
  const currentContent = form.enableAbTest ? (form.variants[activeVariant]?.content || form.content) : form.content;

  return (
    <div className="space-y-6 pb-20">
      {/* ── Top controls ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Channel selector */}
        <div className="flex bg-black/30 border border-white/10 rounded-2xl p-1.5 gap-1">
          {(["email", "push"] as ChannelType[]).map(ch => (
            <button
              key={ch}
              onClick={() => setForm({ ...form, channel: ch })}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                form.channel === ch
                  ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {ch === "email" ? "✉️ Email" : "🔔 Push In-App"}
            </button>
          ))}
        </div>

        {/* Preview toggle */}
        <div className="flex bg-black/30 border border-white/10 rounded-2xl p-1.5 gap-1 ml-auto">
          {(["desktop", "mobile"] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setPreviewMode(mode)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                previewMode === mode ? "bg-white/10 text-white" : "text-slate-500 hover:text-white"
              }`}
            >
              {mode === "desktop" ? "🖥 Desktop" : "📱 Móvil"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">

        {/* ── LEFT: Composer ─────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Templates (email only) */}
          {form.channel === "email" && (
            <div className="bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-5">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3">Plantillas rápidas</p>
              <div className="grid grid-cols-2 gap-2">
                {EMAIL_TEMPLATES.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => applyTemplate(tpl)}
                    className="text-left px-3 py-2.5 bg-white/5 hover:bg-indigo-500/10 border border-white/5 hover:border-indigo-500/30 rounded-xl text-xs text-slate-300 hover:text-white transition-all"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Audience segment */}
          <div className="bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-5 space-y-3">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Audiencia</p>
            <div className="grid grid-cols-2 gap-2">
              {SEGMENTS.map(seg => (
                <button
                  key={seg.value}
                  onClick={() => setForm({ ...form, segment: seg.value })}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    form.segment === seg.value
                      ? seg.color + " ring-1 ring-inset ring-current/20 shadow-lg"
                      : "bg-black/20 border-white/5 text-slate-500 hover:text-slate-300 hover:border-white/10"
                  }`}
                >
                  <span>{seg.icon}</span>
                  <span>{seg.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* A/B Test toggle */}
          <div className="bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-white">Test A/B</p>
                <p className="text-[11px] text-slate-500">Envía variantes alternadas al segmento</p>
              </div>
              <button
                onClick={() => setForm({ ...form, enableAbTest: !form.enableAbTest })}
                className={`relative w-12 h-6 rounded-full transition-colors ${form.enableAbTest ? "bg-indigo-500" : "bg-white/10"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.enableAbTest ? "translate-x-6" : ""}`} />
              </button>
            </div>

            {!form.enableAbTest ? (
              /* Single message */
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                    {form.channel === "email" ? "Asunto" : "Título del Push"}
                  </label>
                  <input
                    value={form.subject}
                    onChange={e => setForm({ ...form, subject: e.target.value })}
                    placeholder={form.channel === "email" ? "Ej: {{firstName}}, novedad importante 🎉" : "Ej: ¡Nueva función disponible!"}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500/50 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                    {form.channel === "email" ? "Cuerpo del email" : "Mensaje del push"}
                  </label>
                  <RichTextArea
                    value={form.content}
                    onChange={v => setForm({ ...form, content: v })}
                    placeholder={form.channel === "email" ? "Escribe el cuerpo del email. Usa {{firstName}} para personalizar…" : "Escribe el mensaje corto del push…"}
                    rows={form.channel === "email" ? 7 : 4}
                    onInsertTag={tag => insertTagIntoField(tag, "content")}
                    textareaRef={contentRef}
                  />
                </div>
              </div>
            ) : (
              /* A/B variants */
              <div className="space-y-4">
                <div className="flex gap-2">
                  {form.variants.map((v, i) => (
                    <button
                      key={v.id}
                      onClick={() => setActiveVariant(i)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                        activeVariant === i
                          ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
                          : "bg-black/20 border-white/5 text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
                {form.variants.map((v, i) => (
                  <div key={v.id} className={i !== activeVariant ? "hidden" : "space-y-3"}>
                    <input
                      value={v.subject}
                      onChange={e => {
                        const updated = form.variants.map((vv, j) => j === i ? { ...vv, subject: e.target.value } : vv);
                        setForm({ ...form, variants: updated });
                      }}
                      placeholder={`Asunto variante ${v.id}`}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500/50 transition-colors"
                    />
                    <RichTextArea
                      value={v.content}
                      onChange={val => {
                        const updated = form.variants.map((vv, j) => j === i ? { ...vv, content: val } : vv);
                        setForm({ ...form, variants: updated });
                      }}
                      placeholder={`Contenido de la variante ${v.id}…`}
                      onInsertTag={tag => insertTagIntoField(tag, { variantIdx: i, key: "content" })}
                      textareaRef={{ current: variantRefs.current[i] } as React.RefObject<HTMLTextAreaElement | null>}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Media & CTA (email only) */}
          {form.channel === "email" && (
            <div className="bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-5 space-y-4">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Media & CTA (opcional)</p>
              <input
                value={form.imageUrl}
                onChange={e => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="URL de la imagen (GCS, Cloudinary…)"
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500/50 transition-colors"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={form.ctaUrl}
                  onChange={e => setForm({ ...form, ctaUrl: e.target.value })}
                  placeholder="URL del botón CTA"
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500/50 transition-colors"
                />
                <input
                  value={form.ctaText}
                  onChange={e => setForm({ ...form, ctaText: e.target.value })}
                  placeholder='Texto CTA (ej: "Ver más")'
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500/50 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Test send */}
          <div className="bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-5">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3">Envío de Prueba</p>
            <div className="flex gap-2">
              <input
                type="email"
                value={form.testEmail}
                onChange={e => setForm({ ...form, testEmail: e.target.value })}
                placeholder="admin@ejemplo.com"
                className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-emerald-500/50 transition-colors"
              />
              <button
                onClick={sendTestEmail}
                disabled={isTesting}
                className="px-5 py-2.5 bg-emerald-600/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 text-sm font-bold rounded-xl transition-all disabled:opacity-50 whitespace-nowrap"
              >
                {isTesting ? "Enviando…" : "📧 Enviar prueba"}
              </button>
            </div>
          </div>

          {/* Result feedback */}
          {result && (
            <div className={`p-4 rounded-2xl border text-sm font-medium ${result.ok ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-rose-500/10 border-rose-500/30 text-rose-300"}`}>
              {result.message}
            </div>
          )}

          {/* Broadcast CTA */}
          <button
            onClick={sendBroadcast}
            disabled={isSending}
            className="w-full h-14 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm rounded-2xl shadow-lg shadow-rose-500/20 flex items-center justify-center gap-3 transition-all"
          >
            {isSending ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Enviando broadcast…
              </>
            ) : (
              <>
                {form.channel === "email" ? "🚀" : "🔔"} ENVIAR{" "}
                {form.channel === "email" ? "EMAIL" : "PUSH"} BROADCAST
                <span className="opacity-70 font-normal text-xs">
                  → {SEGMENTS.find(s => s.value === form.segment)?.label}
                </span>
              </>
            )}
          </button>
        </div>

        {/* ── RIGHT: Preview ─────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-5">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Vista Previa</p>
              <span className="text-[10px] text-slate-600 italic">Datos de ejemplo: María · Growth · 1,240 tokens</span>
            </div>

            {form.channel === "email" ? (
              <EmailPreview
                subject={currentSubject}
                content={currentContent}
                imageUrl={form.imageUrl}
                ctaUrl={form.ctaUrl}
                ctaText={form.ctaText}
              />
            ) : (
              <PushPreview
                subject={currentSubject}
                content={currentContent}
                imageUrl={form.imageUrl}
              />
            )}
          </div>

          {/* Tags reference */}
          <div className="bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-5">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3">Tags de Personalización</p>
            <div className="space-y-2">
              {PERSONALIZATION_TAGS.map(t => (
                <div key={t.tag} className="flex items-center justify-between">
                  <code className="text-[11px] text-indigo-400 font-mono">{t.tag}</code>
                  <span className="text-[11px] text-slate-500">{t.label}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[10px] text-slate-600 leading-relaxed">
              Los tags se reemplazan con los datos reales de cada usuario antes del envío.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminNotifyComposer;

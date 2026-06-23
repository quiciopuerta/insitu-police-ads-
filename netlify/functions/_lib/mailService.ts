/**
 * mailService.ts — Shared email utility for all Netlify Functions
 * Single source of truth for SMTP config, sendEmail(), and all HTML templates.
 * Uses same SMTP infra as engagement.insitu.company (mail.insitu.company).
 */
import nodemailer from "nodemailer";

// ── SMTP Config ──────────────────────────────────────────────────────────────
const SMTP_HOST     = process.env.SMTP_HOST     || "mail.insitu.company";
const SMTP_PORT     = parseInt(process.env.SMTP_PORT || "465");
const SMTP_USER     = process.env.SMTP_USER     || "ia@insitu.company";
const SMTP_PASS     = process.env.SMTP_PASS     || "";
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || "INsitu AI";
export const APP_URL = process.env.APP_URL      || "https://insitu.company";
export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "sanchezfj@me.com,admin@insitu.ai").split(",").map(e => e.trim()).filter(Boolean);

// ── Core Sender ──────────────────────────────────────────────────────────────
export async function sendEmail(to: string, subject: string, html: string, attachments?: any[]): Promise<void> {
    if (!SMTP_PASS) {
        const msg = `[MAIL] SMTP_PASS environment variable is not set. Configure it in Netlify dashboard: Site settings → Environment variables.`;
        console.error(msg);
        throw new Error("SMTP not configured: SMTP_PASS is missing in environment variables.");
    }
    if (!to) {
        throw new Error("sendEmail: recipient email address is empty.");
    }
    const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: true, // Port 465 = SSL
        auth: { user: SMTP_USER, pass: SMTP_PASS },
        tls: { rejectUnauthorized: true },
    });
    
    try {
        await transporter.sendMail({
            from: `"${SMTP_FROM_NAME}" <${SMTP_USER}>`,
            to,
            subject,
            html,
            attachments,
        });
        console.log(`[MAIL] ✓ "${subject}" → ${to}`);
    } catch (err: any) {
        console.error(`[MAIL] ❌ Failed to send email to ${to}:`, err.message);
        throw new Error(`SMTP Error: ${err.message}`);
    }
}

export async function sendToAdmins(subject: string, html: string): Promise<void> {
    for (const email of ADMIN_EMAILS) {
        await sendEmail(email, subject, html);
    }
}

// ── Base Template (Premium High-Tech Design) ──────────────────────────────────
function base(content: string, accentColor = "#ff477b", accentDark = "#db2a62", secondaryColor = "#00f1fd") {
    // We use a high-fidelity HTML/CSS approach adapted for email clients
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap');
    body { margin: 0; padding: 0; background-color: #020617; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #dfe4fe; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; }
    .email-container { max-width: 600px; margin: 40px auto; background-color: #0f172a; border: 1px solid rgba(255, 71, 123, 0.2); border-radius: 32px; overflow: hidden; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5); }
    .header { padding: 48px 40px 32px; text-align: center; background: radial-gradient(circle at top right, rgba(255, 71, 123, 0.1), transparent 70%), radial-gradient(circle at top left, rgba(0, 241, 253, 0.05), transparent 70%); }
    .logo { width: 64px; height: 64px; margin-bottom: 20px; filter: drop-shadow(0 0 10px ${accentColor}4D); }
    .brand-name { font-size: 20px; font-weight: 800; color: #fff; letter-spacing: 0.05em; text-transform: uppercase; margin: 0; }
    .content-body { padding: 40px; }
    .headline { font-size: 32px; font-weight: 800; color: #fff; line-height: 1.2; margin: 0 0 24px; letter-spacing: -0.02em; }
    .headline span { color: ${accentColor}; }
    .paragraph { font-size: 16px; line-height: 1.7; color: #a5aac2; margin-bottom: 24px; }
    .premium-card { background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 20px; padding: 24px; margin: 32px 0; }
    .stat-box { display: flex; align-items: center; margin-bottom: 12px; }
    .stat-label { font-size: 14px; font-weight: 700; color: ${secondaryColor}; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; display: block; }
    .stat-value { font-size: 36px; font-weight: 800; color: #fff; margin: 0; line-height: 1; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, ${accentColor}, ${accentDark}); color: #ffffff !important; text-decoration: none; padding: 18px 40px; border-radius: 100px; font-weight: 800; font-size: 15px; letter-spacing: 0.05em; text-transform: uppercase; box-shadow: 0 10px 20px ${accentColor}33; transition: all 0.3s ease; margin-top: 10px; }
    .footer { padding: 40px; text-align: center; background-color: #070d1f; border-top: 1px solid rgba(255, 255, 255, 0.03); }
    .footer-links { margin-bottom: 20px; }
    .footer-link { color: #6f758b; text-decoration: none; font-size: 13px; margin: 0 10px; font-weight: 600; }
    .footer-link:hover { color: ${accentColor}; }
    .copyright { font-size: 12px; color: #41475b; }
    .kinetic-line { height: 2px; background: linear-gradient(90deg, transparent, ${accentColor}, ${secondaryColor}, transparent); margin: 40px auto; width: 80%; border-radius: 2px; opacity: 0.3; }
    @media only screen and (max-width: 600px) {
      .email-container { margin: 0; border-radius: 0; border: none; }
      .headline { font-size: 28px; }
      .content-body { padding: 30px 20px; }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <a href="${APP_URL}" target="_blank">
        <img src="${APP_URL}/isotype.png" alt="INsitu AI Logo" class="logo">
      </a>
      <h2 class="brand-name">INsitu AI</h2>
    </div>
    <div class="content-body">
      ${content}
    </div>
    <div class="kinetic-line"></div>
    <div class="footer">
      <div class="footer-links">
        <a href="${APP_URL}" class="footer-link">Dashboard</a>
        <a href="${APP_URL}/contact" class="footer-link">Soporte</a>
        <a href="${APP_URL}/privacy" class="footer-link">Privacidad</a>
      </div>
      <p class="copyright">© 2026 INsitu AI. Kinetic Intelligence for Advertising.<br>Optimizamos tus campañas con el poder de la IA Generativa.</p>
    </div>
  </div>
</body>
</html>`;
}

// ── Templates ────────────────────────────────────────────────────────────────

export function welcomeEmail(firstName: string, trialDays: number, trialTokens: number): string {
    return base(`
<h1 class="headline">¡Bienvenido a la <span>Inteligencia Kinética</span>!</h1>
<p class="paragraph">Hola <strong>${firstName}</strong>, tu acceso a INsitu AI ha sido configurado con éxito. Estamos ready para transformar tus datos en performance.</p>
<div class="premium-card">
  <span class="stat-label">Trial Activado</span>
  <div class="stat-box">
    <p class="stat-value" style="color:#fff; margin-right:15px">⏱ ${trialDays} Días</p>
    <p class="stat-value" style="color:#ff477b">🔥 ${trialTokens.toLocaleString()} Tokens</p>
  </div>
  <p class="paragraph" style="margin-bottom:0; font-size:14px">Tu cuenta está en proceso de revisión final. Te notificaremos cuando el acceso total sea habilitado por el equipo.</p>
</div>
<div style="text-align:center">
  <a href="${APP_URL}" class="cta-button">Explorar Dashboard</a>
</div>`);
}

export function recoveryEmail(firstName: string, code: string): string {
    return base(`
<h1 class="headline">Resto de <span>Contraseña</span></h1>
<p class="paragraph">Hola <strong>${firstName || "usuario"}</strong>, hemos recibido una solicitud para recuperar tu acceso. Copia el siguiente código de seguridad:</p>
<div class="premium-card" style="text-align:center; border-color: rgba(124, 58, 237, 0.3)">
  <div style="font-size:48px; font-weight:800; color: #7c3aed; letter-spacing: 0.25em; font-family: monospace;">${code}</div>
  <p class="paragraph" style="margin-top:15px; font-size:12px; text-transform:uppercase; letter-spacing:0.1em; color:#6f758b">⏳ Expira en 15 minutos</p>
</div>
<p class="paragraph" style="font-size:14px">Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura.</p>
`, "#7c3aed", "#5b21b6");
}

export function passwordChangedEmail(firstName: string): string {
    const now = new Date().toLocaleString("es-ES", {
        timeZone: "America/Bogota", dateStyle: "full", timeStyle: "short",
    });
    return base(`
<h1 class="headline">✅ Contraseña <span>Actualizada</span></h1>
<p class="paragraph">Hola <strong>${firstName || "usuario"}</strong>, confirmamos que tu contraseña de INsitu AI fue cambiada con éxito.</p>
<div class="premium-card" style="border-color: rgba(16, 185, 129, 0.3)">
  <p class="paragraph" style="margin-bottom:0; color:#10b981">🔒 Fecha del cambio: <strong>${now}</strong></p>
</div>
<p class="paragraph" style="font-size:14px">Si no fuiste tú, por favor contáctanos de inmediato.</p>
<div style="text-align:center">
  <a href="${APP_URL}" class="cta-button" style="background:linear-gradient(135deg,#10b981,#059669)">Ir a mi Cuenta</a>
</div>`, "#10b981", "#059669");
}

export function adminNewUserEmail(name: string, email: string, userId: string): string {
    const now = new Date().toLocaleString("es-ES", { timeZone: "America/Bogota", dateStyle: "full", timeStyle: "short" });
    return base(`
<h1 class="headline">🔔 Nuevo Usuario <span>Pendiente</span></h1>
<p class="paragraph">Se ha registrado un nuevo usuario que requiere aprobación en el sistema:</p>
<div class="premium-card" style="border-color: rgba(245, 158, 11, 0.3)">
  <p class="paragraph" style="margin-bottom:5px">👤 Nombre: <strong>${name}</strong></p>
  <p class="paragraph" style="margin-bottom:5px">📧 Email: ${email}</p>
  <p class="paragraph" style="margin-bottom:5px; font-size:13px; color:#6f758b">🕐 Registrado: ${now}</p>
  <p class="paragraph" style="margin-bottom:0; font-size:12px; color:#41475b">🆔 ID: ${userId}</p>
</div>
<div style="text-align:center">
  <a href="${APP_URL}/?admin=true" class="cta-button" style="background:linear-gradient(135deg,#f59e0b,#b45309)">Abrir Panel Admin</a>
</div>`, "#f59e0b", "#b45309");
}

export function approvalEmail(firstName: string): string {
    return base(`
<h1 class="headline">Tu Cuenta ha sido <span>Aprobada</span></h1>
<p class="paragraph">Hola <strong>${firstName}</strong>, el equipo de INsitu AI ha validado tu perfil. Ahora puedes acceder a la suite completa de optimización publicitaria:</p>
<div class="premium-card">
  <ul class="paragraph" style="margin:0; padding-left:20px">
    <li>Auditoría de campañas Search/Performance Max</li>
    <li>Análisis Neuro-Visual de creativos</li>
    <li>Generación de contenido en Creative Lab</li>
  </ul>
</div>
<div style="text-align:center">
  <a href="${APP_URL}" class="cta-button">Empezar a Optimizar</a>
</div>`);
}

export function invitationEmail(name: string, email: string, tempPassword: string, plan: string): string {
    return base(`
<h1 class="headline">Únete a la élite del <span>Media Planning</span></h1>
<p class="paragraph">Hola <strong>${name}</strong>, has sido invitado a INsitu AI bajo el plan <strong>${plan}</strong>. Tus credenciales de acceso son:</p>
<div class="premium-card">
  <p class="paragraph" style="margin-bottom:8px">📧 Email: <strong>${email}</strong></p>
  <p class="stat-label" style="margin-bottom:0">Contraseña Temporal:</p>
  <p style="font-size:28px; font-weight:800; color:#ff477b; font-family:monospace; margin:5px 0">${tempPassword}</p>
  <p class="paragraph" style="font-size:12px; color:#f59e0b; margin-top:10px">⚠️ Recuerda cambiar tu contraseña al iniciar sesión.</p>
</div>
<div style="text-align:center">
  <a href="${APP_URL}" class="cta-button">Aceptar Invitación</a>
</div>`);
}

export function usageAlertEmail(name: string, pct: number, used: number, limit: number): string {
    const is100 = pct >= 100;
    const bar = Math.min(Math.round((used / Math.max(limit, 1)) * 100), 100);
    const color = is100 ? "#dc2626" : "#f59e0b";
    const dark  = is100 ? "#991b1b" : "#b45309";
    return base(`
<h1 class="headline">${is100 ? "Límite de Tokens <span>Cero</span>" : "Alerta de <span>Consumo</span> IA"}</h1>
<p class="paragraph">Hola <strong>${name}</strong>, el uso de inteligencia artificial en tu cuenta ha alcanzado un punto crítico.</p>
<div class="premium-card" style="border-color: ${color}4d">
  <span class="stat-label">Capacidad de Procesamiento</span>
  <div style="background:rgba(255,255,255,0.05); border-radius:100px; height:12px; margin: 15px 0; overflow:hidden">
    <div style="background:linear-gradient(90deg, ${color}, ${dark}); height:100%; width:${bar}%"></div>
  </div>
  <p class="stat-value">${bar}%</p>
  <p class="paragraph" style="margin-top:10px; font-size:14px">${used.toLocaleString()} / ${limit.toLocaleString()} Tokens Usados</p>
</div>
<div style="text-align:center">
  <a href="${APP_URL}/?pricing=true" class="cta-button" style="background:linear-gradient(135deg, ${color}, ${dark})">
    ${is100 ? "Upgrade Ahora" : "Revisar Planes"}
  </a>
</div>`, color, dark);
}

export function trialEndingSoonEmail(name: string, daysLeft: number): string {
    return base(`
<h1 class="headline">Tu Prueba <span>Termina Pronto</span></h1>
<p class="paragraph">Hola <strong>${name}</strong>, te quedan solo <strong style="color:#f59e0b">${daysLeft} día${daysLeft !== 1 ? "s" : ""}</strong> de acceso premium gratuito.</p>
<div class="premium-card" style="border-color: rgba(245, 158, 11, 0.3)">
  <span class="stat-label">Planes de Continuidad</span>
  <p class="paragraph" style="margin-bottom:10px; font-size:14px">📦 <strong>Starter</strong> — $19/mes · 1,750 tokens</p>
  <p class="paragraph" style="margin-bottom:10px; font-size:14px">🚀 <strong>Growth</strong> — $49/mes · 7,500 tokens</p>
  <p class="paragraph" style="margin-bottom:0; font-size:14px">🏢 <strong>Agency</strong> — $149/mes · 50,000 tokens</p>
</div>
<div style="text-align:center">
  <a href="${APP_URL}/?pricing=true" class="cta-button" style="background:linear-gradient(135deg,#f59e0b,#b45309)">Activar Plan Premium</a>
</div>`, "#f59e0b", "#b45309");
}

export function trialExpiredEmail(name: string): string {
    return base(`
<h1 class="headline">Período de Prueba <span>Finalizado</span></h1>
<p class="paragraph">Hola <strong>${name}</strong>, tu acceso temporal a INsitu AI ha concluido. Tus datos y auditorías están guardados de forma segura.</p>
<div class="premium-card" style="border-color: rgba(220, 38, 38, 0.3)">
  <p class="paragraph" style="margin-bottom:0; color:#fca5a5">Para reactivar las funciones de IA, activa tu suscripción hoy mismo y mantén el impulso de tu estrategia.</p>
</div>
<div style="text-align:center">
  <a href="${APP_URL}/?pricing=true" class="cta-button" style="background:linear-gradient(135deg,#dc2626,#991b1b)">Elegir mi Plan</a>
</div>`, "#dc2626", "#991b1b");
}

export function weeklyInsightsEmail(name: string, weekTokens: number, audits: number, totalUsed: number, limit: number): string {
    const bar = Math.min(Math.round((totalUsed / Math.max(limit, 1)) * 100), 100);
    return base(`
<h1 class="headline">📊 Performance <span>Semanal</span></h1>
<p class="paragraph">Hola <strong>${name}</strong>, aquí tienes el resumen de tu inteligencia publicitaria esta semana:</p>
<div class="premium-card">
  <div class="stat-box">
    <p class="stat-value" style="margin-right:20px">${weekTokens.toLocaleString()}<br><span style="font-size:12px; color:#6f758b">Tokens</span></p>
    <p class="stat-value">${audits}<br><span style="font-size:12px; color:#6f758b">Auditorías</span></p>
  </div>
  <div style="background:rgba(255,255,255,0.05); border-radius:100px; height:8px; margin: 20px 0; overflow:hidden">
    <div style="background:linear-gradient(90deg, #ff477b, #00f1fd); height:100%; width:${bar}%"></div>
  </div>
  <p class="paragraph" style="margin-bottom:0; font-size:13px">Consumo total del ciclo: ${bar}% (${totalUsed.toLocaleString()} tokens)</p>
</div>
<div style="text-align:center">
  <a href="${APP_URL}" class="cta-button">Ver Reporte Full</a>
</div>`);
}

export function renewalEmail(name: string, plan: string, nextDate: string): string {
    return base(`
<h1 class="headline">✅ Suscripción <span>Renovada</span></h1>
<p class="paragraph">Hola <strong>${name}</strong>, tu plan <strong>${plan}</strong> se ha renovado exitosamente. La inteligencia no se detiene.</p>
<div class="premium-card" style="border-color: rgba(16, 185, 129, 0.3)">
  <p class="paragraph" style="margin-bottom:0">📅 Próximo ciclo: <strong>${nextDate}</strong></p>
</div>
<div style="text-align:center">
  <a href="${APP_URL}" class="cta-button" style="background:linear-gradient(135deg,#10b981,#059669)">Ir a mi Panel</a>
</div>`, "#10b981", "#059669");
}

export function paymentFailedEmail(name: string, plan: string): string {
    return base(`
<h1 class="headline">⚠️ Fallo en el <span>Pago</span></h1>
<p class="paragraph">Hola <strong>${name}</strong>, no hemos podido procesar el cobro de tu suscripción <strong>${plan}</strong>.</p>
<div class="premium-card" style="border-color: rgba(220, 38, 38, 0.3)">
  <p class="paragraph" style="margin-bottom:0; color:#fca5a5">Tu acceso a las auditorías avanzadas se ha pausado. Actualiza tu método de pago para restablecer el servicio de inmediato.</p>
</div>
<div style="text-align:center">
  <a href="${APP_URL}" class="cta-button" style="background:linear-gradient(135deg,#dc2626,#991b1b)">Actualizar Pago</a>
</div>`, "#dc2626", "#991b1b");
}

export function canceledEmail(name: string): string {
    return base(`
<h1 class="headline">Suscripción <span>Cancelada</span></h1>
<p class="paragraph">Hola <strong>${name}</strong>, confirmamos la cancelación de tu suscripción a INsitu AI.</p>
<div class="premium-card">
  <p class="paragraph" style="margin-bottom:0">Tus datos y análisis se conservarán por 30 días. Puedes reactivar tu cuenta en cualquier momento eligiendo un nuevo plan.</p>
</div>
<div style="text-align:center">
  <a href="${APP_URL}/?pricing=true" class="cta-button" style="background:linear-gradient(135deg,#64748b,#475569)">Reactivar Cuenta</a>
</div>
<p class="paragraph" style="text-align:center; font-size:14px; margin-top:20px">Gracias por ser parte de INsitu AI. Estaremos aquí cuando decidas volver.</p>
`, "#64748b", "#475569");
}

// ── WOW Notifications — Platform Update Email ─────────────────────────────────
type UserSegment = "active" | "trial_active" | "trial_expired" | "free";

interface UpdateEmailUser { firstName: string; plan: string; trialEndDate?: number; }
interface UpdateEmailContent { title: string; description: string; previewUrl?: string; ctaUrl: string; }

export function platformUpdateEmail(
    user: UpdateEmailUser,
    update: UpdateEmailContent,
    segment: UserSegment,
    updateId: string
): string {
    const trackingPixel = `<img src="${APP_URL}/.netlify/functions/api-platform-updates?action=track-open&upd=${updateId}&uid={{USER_ID}}" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px;max-width:1px;max-height:1px;overflow:hidden">`;
    const previewBlock = update.previewUrl ? `
<div style="margin: 24px 0; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.07)">
  <img src="${update.previewUrl}" alt="${update.title}" style="width:100%; display:block; border-radius:16px">
</div>` : "";

    const configs: Record<UserSegment, { accent: string; dark: string; secondary: string; badge: string; headline: string; body: string; ctaLabel: string; ctaStyle: string; }> = {
        active: {
            accent: "#ff477b", dark: "#db2a62", secondary: "#00f1fd",
            badge: `<div style="display:inline-block; background:linear-gradient(90deg,#ff477b22,#00f1fd22); border:1px solid rgba(255,71,123,0.3); border-radius:100px; padding:6px 16px; font-size:11px; font-weight:800; letter-spacing:0.1em; color:#00f1fd; text-transform:uppercase; margin-bottom:20px">✦ Acceso Insider — Plan ${user.plan}</div>`,
            headline: `Nueva función disponible: <span>${update.title}</span>`,
            body: `Como cliente <strong>${user.plan}</strong>, eres de los primeros en acceder a esta mejora. Está activa en tu cuenta ahora mismo.`,
            ctaLabel: "Explorar la novedad →",
            ctaStyle: "",
        },
        trial_active: {
            accent: "#7c3aed", dark: "#5b21b6", secondary: "#a78bfa",
            badge: `<div style="display:inline-block; background:linear-gradient(90deg,#7c3aed22,#00f1fd11); border:1px solid rgba(124,58,237,0.3); border-radius:100px; padding:6px 16px; font-size:11px; font-weight:800; letter-spacing:0.1em; color:#a78bfa; text-transform:uppercase; margin-bottom:20px">⏱ Trial Activo · Úsalo ahora</div>`,
            headline: `Prueba <span>${update.title}</span> antes de decidir`,
            body: `Tu período de prueba sigue activo. Esta es la oportunidad perfecta para explorar <strong>${update.title}</strong> y ver cómo transforma tu estrategia.`,
            ctaLabel: "Probar en mi trial →",
            ctaStyle: "background:linear-gradient(135deg,#7c3aed,#5b21b6)",
        },
        trial_expired: {
            accent: "#f59e0b", dark: "#b45309", secondary: "#fcd34d",
            badge: `<div style="display:inline-block; background:linear-gradient(90deg,#f59e0b22,transparent); border:1px solid rgba(245,158,11,0.3); border-radius:100px; padding:6px 16px; font-size:11px; font-weight:800; letter-spacing:0.1em; color:#fcd34d; text-transform:uppercase; margin-bottom:20px">🔒 Requiere Plan Activo</div>`,
            headline: `<span>${update.title}</span> ya está disponible`,
            body: `Tu período de prueba ha concluido, pero esta nueva función está esperándote. Reactiva tu acceso hoy y sigue aprovechando el poder de la inteligencia artificial en tus campañas.`,
            ctaLabel: "Elegir mi plan →",
            ctaStyle: `background:linear-gradient(135deg,#f59e0b,#b45309)`,
        },
        free: {
            accent: "#10b981", dark: "#059669", secondary: "#6ee7b7",
            badge: `<div style="display:inline-block; background:linear-gradient(90deg,#10b98122,transparent); border:1px solid rgba(16,185,129,0.3); border-radius:100px; padding:6px 16px; font-size:11px; font-weight:800; letter-spacing:0.1em; color:#6ee7b7; text-transform:uppercase; margin-bottom:20px">🚀 Exclusivo para Suscriptores</div>`,
            headline: `Nuevo en INsitu AI: <span>${update.title}</span>`,
            body: `Acabamos de lanzar <strong>${update.title}</strong>. Esta función está disponible desde el <strong>plan Starter</strong>. No te quedes sin acceso a la inteligencia que impulsa las mejores campañas.`,
            ctaLabel: "Desbloquear acceso →",
            ctaStyle: `background:linear-gradient(135deg,#10b981,#059669)`,
        },
    };

    const c = configs[segment];
    const content = `
${c.badge}
<h1 class="headline">${c.headline}</h1>
<p class="paragraph">Hola <strong>${user.firstName}</strong>, ${c.body}</p>
<p class="paragraph">${update.description}</p>
${previewBlock}
<div style="text-align:center; margin:32px 0">
  <a href="${update.ctaUrl}" class="cta-button" style="${c.ctaStyle}">${c.ctaLabel}</a>
</div>
${trackingPixel}`;

    return base(content, c.accent, c.dark, c.secondary);
}

export async function sendPlatformUpdateEmail(
    user: UpdateEmailUser & { id: string; email: string },
    update: UpdateEmailContent & {
        email_subject_active?: string;
        email_subject_trial?: string;
        email_subject_expired?: string;
        email_subject_free?: string;
    },
    segment: UserSegment,
    updateId: string
): Promise<void> {
    const html = platformUpdateEmail(user, update, segment, updateId).replace(
        /\{\{USER_ID\}\}/g,
        user.id
    );

    const subjectMap: Record<UserSegment, string | undefined> = {
        active: update.email_subject_active,
        trial_active: update.email_subject_trial,
        trial_expired: update.email_subject_expired,
        free: update.email_subject_free,
    };

    const subject = subjectMap[segment] || update.title || "Novedades de INsitu AI";

    await sendEmail(user.email, subject, html);
}

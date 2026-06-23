/**
 * INsitu AI — Email Service
 * Uses Nodemailer with SMTP (mail.insitu.company)
 * Supports: welcome, recovery, trial-ending, trial-expired, payment-failed, renewal, extended-trial
 */

import nodemailer from 'nodemailer';

const BRAND = process.env.SMTP_FROM_NAME || 'INsitu AI';
const FROM  = `${BRAND} <${process.env.SMTP_USER || 'ia@insitu.company'}>`;

// ── Transporter ───────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'mail.insitu.company',
  port:   Number(process.env.SMTP_PORT) || 465,
  secure: Number(process.env.SMTP_PORT) === 465, // true for 465 (SSL), false for 587 (TLS)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: { rejectUnauthorized: false }, // Accept self-signed certs on cPanel servers
});

// ── Verify connection on startup ──────────────────────────────────────────────
if (process.env.SMTP_HOST) {
  transporter.verify((err) => {
    if (err) {
      console.error('[EMAIL] SMTP connection failed:', err.message);
    } else {
      console.log('[EMAIL] ✅ SMTP ready to send via', process.env.SMTP_HOST);
    }
  });
} else {
  console.warn('[EMAIL] ⚠️ SMTP_HOST not defined. Emails will be logged to console in dev mode or fail in prod.');
}

// ── Base HTML wrapper ─────────────────────────────────────────────────────────
const baseTemplate = (content) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${BRAND}</title>
</head>
<body style="margin:0;padding:0;background:#0a0507;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0507;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#1a0b10;border-radius:16px;overflow:hidden;border:1px solid rgba(255,71,123,0.2);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1a0b10 0%,#2d0e1a 100%);padding:32px 40px;border-bottom:2px solid #ff477b;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td><span style="font-size:24px;font-weight:900;color:#ff477b;letter-spacing:-1px;">${BRAND}</span></td>
              <td align="right"><span style="font-size:11px;color:#64748b;letter-spacing:2px;text-transform:uppercase;">AI Growth Platform</span></td>
            </tr>
          </table>
        </td></tr>
        <!-- Content -->
        <tr><td style="padding:40px;">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:24px 40px;background:#0f0509;border-top:1px solid rgba(255,71,123,0.1);">
          <p style="margin:0;font-size:11px;color:#475569;text-align:center;">
            © ${new Date().getFullYear()} ${BRAND} · insitu.company<br/>
            Este correo fue enviado automáticamente, por favor no responder directamente.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

// ── Button helper ─────────────────────────────────────────────────────────────
const btn = (text, url) =>
  `<a href="${url}" style="display:inline-block;background:#ff477b;color:#fff;font-weight:700;font-size:14px;padding:14px 32px;border-radius:10px;text-decoration:none;letter-spacing:0.5px;margin-top:24px;">${text}</a>`;

// ── Core send function ────────────────────────────────────────────────────────
export const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({ from: FROM, to, subject, html });
    console.log(`[EMAIL] ✅ Sent "${subject}" → ${to} (${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[EMAIL] ❌ Failed "${subject}" → ${to}:`, err.message);
    return { success: false, error: err.message };
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 1. Welcome / Registration
 */
export const sendWelcomeEmail = (to, firstName) =>
  sendEmail({
    to,
    subject: `¡Bienvenido a ${BRAND}! Tu cuenta está lista 🚀`,
    html: baseTemplate(`
      <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#f1f5f9;">
        ¡Hola, ${firstName}! 👋
      </h1>
      <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:16px 0;">
        Tu cuenta en <strong style="color:#ff477b;">${BRAND}</strong> ha sido creada exitosamente.
        Estás a punto de experimentar el poder de la inteligencia artificial para optimizar
        tus campañas de marketing.
      </p>
      <div style="background:rgba(255,71,123,0.08);border:1px solid rgba(255,71,123,0.2);border-radius:12px;padding:20px;margin:24px 0;">
        <p style="margin:0 0 8px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Tu plan de prueba incluye</p>
        <ul style="margin:8px 0 0;padding-left:20px;color:#e2e8f0;font-size:14px;line-height:2;">
          <li>✅ 7 días de acceso completo</li>
          <li>✅ 500 tokens de análisis</li>
          <li>✅ Auditoría SEM & Textos</li>
          <li>✅ Análisis de Imágenes (Básico)</li>
        </ul>
      </div>
      <p style="color:#94a3b8;font-size:14px;">
        Tu cuenta está <strong>pendiente de aprobación</strong> por el administrador.
        Te notificaremos cuando esté activa.
      </p>
      ${btn('Ir a la Plataforma', 'https://insitu.company')}
    `),
  });

/**
 * 2. Account Approved
 */
export const sendApprovalEmail = (to, firstName, plan = 'Trial') =>
  sendEmail({
    to,
    subject: `✅ Tu cuenta ${BRAND} ha sido aprobada`,
    html: baseTemplate(`
      <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#f1f5f9;">
        ¡Tu cuenta está activa! 🎉
      </h1>
      <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:16px 0;">
        Hola <strong style="color:#f1f5f9;">${firstName}</strong>, un administrador ha aprobado tu cuenta.
        Ya puedes acceder a la plataforma con tu plan <strong style="color:#ff477b;">${plan}</strong>.
      </p>
      ${btn('Acceder ahora', 'https://insitu.company')}
    `),
  });

/**
 * 3. Password Recovery Code
 */
export const sendRecoveryEmail = (to, code) =>
  sendEmail({
    to,
    subject: `🔑 Código de recuperación — ${BRAND}`,
    html: baseTemplate(`
      <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#f1f5f9;">
        Recuperar contraseña
      </h1>
      <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:16px 0;">
        Recibimos una solicitud para recuperar el acceso a tu cuenta. 
        Usa el siguiente código para restablecer tu contraseña:
      </p>
      <div style="text-align:center;margin:32px 0;">
        <div style="display:inline-block;background:rgba(255,71,123,0.1);border:2px solid #ff477b;border-radius:16px;padding:20px 48px;">
          <span style="font-size:42px;font-weight:900;color:#ff477b;letter-spacing:8px;">${code}</span>
        </div>
      </div>
      <p style="color:#64748b;font-size:13px;text-align:center;">
        ⚠️ Este código expira en <strong>15 minutos</strong>.<br/>
        Si no solicitaste este cambio, ignora este correo.
      </p>
      ${btn('Restablecer contraseña', 'https://insitu.company')}
    `),
  });

/**
 * 4. Trial Ending Soon (e.g. 2 days left)
 */
export const sendTrialEndingSoonEmail = (to, firstName, daysLeft) =>
  sendEmail({
    to,
    subject: `⏰ Tu prueba gratuita termina en ${daysLeft} día${daysLeft !== 1 ? 's' : ''} — ${BRAND}`,
    html: baseTemplate(`
      <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#f1f5f9;">
        Tu prueba está por terminar ⏰
      </h1>
      <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:16px 0;">
        Hola <strong style="color:#f1f5f9;">${firstName}</strong>, te quedan solo 
        <strong style="color:#ff477b;">${daysLeft} día${daysLeft !== 1 ? 's' : ''}</strong> 
        de prueba gratuita en ${BRAND}.
      </p>
      <p style="color:#94a3b8;font-size:15px;line-height:1.7;">
        Para no perder el acceso, elige el plan que mejor se adapte a tus necesidades:
      </p>
      <div style="background:rgba(255,71,123,0.08);border:1px solid rgba(255,71,123,0.2);border-radius:12px;padding:20px;margin:24px 0;">
        <table width="100%" cellpadding="8">
          <tr style="border-bottom:1px solid rgba(255,71,123,0.2);">
            <td style="color:#e2e8f0;font-weight:700;">ON-SITE Starter</td>
            <td align="right" style="color:#ff477b;font-weight:900;">$19/mes</td>
          </tr>
          <tr style="border-bottom:1px solid rgba(255,71,123,0.1);">
            <td style="color:#e2e8f0;font-weight:700;">IN-SITE Growth</td>
            <td align="right" style="color:#ff477b;font-weight:900;">$49/mes</td>
          </tr>
          <tr>
            <td style="color:#e2e8f0;font-weight:700;">Agency Full</td>
            <td align="right" style="color:#ff477b;font-weight:900;">$149/mes</td>
          </tr>
        </table>
      </div>
      ${btn('Elegir mi plan ahora', 'https://insitu.company/#pricing')}
    `),
  });

/**
 * 5. Trial Expired
 */
export const sendTrialExpiredEmail = (to, firstName) =>
  sendEmail({
    to,
    subject: `Tu período de prueba ha terminado — ${BRAND}`,
    html: baseTemplate(`
      <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#f1f5f9;">
        Tu prueba ha concluido
      </h1>
      <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:16px 0;">
        Hola <strong style="color:#f1f5f9;">${firstName}</strong>, tu período de prueba gratuita 
        en <strong style="color:#ff477b;">${BRAND}</strong> ha terminado.
      </p>
      <p style="color:#94a3b8;font-size:15px;line-height:1.7;">
        Para continuar usando todas las funciones de analítica, auditoría y optimización con IA, 
        activa tu suscripción hoy.
      </p>
      ${btn('Activar mi suscripción', 'https://insitu.company/#pricing')}
      <p style="color:#64748b;font-size:13px;margin-top:24px;">
        ¿Necesitas más tiempo? Contáctanos en <a href="mailto:ia@insitu.company" style="color:#ff477b;">ia@insitu.company</a>
      </p>
    `),
  });

/**
 * 6. Subscription Renewed
 */
export const sendRenewalEmail = (to, firstName, plan, nextDate) =>
  sendEmail({
    to,
    subject: `✅ Suscripción renovada — ${BRAND}`,
    html: baseTemplate(`
      <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#f1f5f9;">
        ¡Suscripción renovada! ✅
      </h1>
      <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:16px 0;">
        Hola <strong style="color:#f1f5f9;">${firstName}</strong>, tu suscripción 
        <strong style="color:#ff477b;">${plan}</strong> ha sido renovada con éxito.
      </p>
      <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.3);border-radius:12px;padding:20px;margin:24px 0;">
        <p style="margin:0 0 8px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Detalles de tu suscripción</p>
        <p style="margin:4px 0;color:#e2e8f0;font-size:14px;">📦 Plan: <strong>${plan}</strong></p>
        <p style="margin:4px 0;color:#e2e8f0;font-size:14px;">📅 Próxima renovación: <strong>${nextDate}</strong></p>
      </div>
      ${btn('Ver mi cuenta', 'https://insitu.company')}
    `),
  });

/**
 * 7. Payment Failed / Subscription Suspended
 */
export const sendPaymentFailedEmail = (to, firstName, plan) =>
  sendEmail({
    to,
    subject: `⚠️ Problema con tu pago — ${BRAND}`,
    html: baseTemplate(`
      <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#f1f5f9;">
        No pudimos procesar tu pago
      </h1>
      <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:16px 0;">
        Hola <strong style="color:#f1f5f9;">${firstName}</strong>, hubo un problema al procesar 
        el pago de tu plan <strong style="color:#ff477b;">${plan}</strong>.
      </p>
      <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.3);border-radius:12px;padding:20px;margin:24px 0;">
        <p style="margin:0;color:#fca5a5;font-size:14px;line-height:1.7;">
          ⚠️ Tu acceso a la plataforma ha sido <strong>suspendido temporalmente</strong> 
          hasta que se regularice el pago. Por favor actualiza tu método de pago 
          o contáctanos para resolverlo.
        </p>
      </div>
      ${btn('Actualizar método de pago', 'https://insitu.company')}
      <p style="color:#64748b;font-size:13px;margin-top:24px;">
        ¿Necesitas ayuda? Escríbenos a <a href="mailto:ia@insitu.company" style="color:#ff477b;">ia@insitu.company</a>
      </p>
    `),
  });

/**
 * 8. Extended Trial Granted
 */
export const sendExtendedTrialEmail = (to, firstName, extraDays) =>
  sendEmail({
    to,
    subject: `🎁 ¡Tu prueba ha sido extendida! — ${BRAND}`,
    html: baseTemplate(`
      <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#f1f5f9;">
        ¡Buenas noticias! 🎁
      </h1>
      <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:16px 0;">
        Hola <strong style="color:#f1f5f9;">${firstName}</strong>, hemos extendido tu período 
        de prueba en <strong style="color:#ff477b;">${extraDays} días adicionales</strong> para 
        que puedas explorar todo el potencial de ${BRAND}.
      </p>
      <div style="background:rgba(255,71,123,0.08);border:1px solid rgba(255,71,123,0.2);border-radius:12px;padding:20px;margin:24px 0;">
        <p style="margin:0;color:#e2e8f0;font-size:15px;text-align:center;">
          🎯 Tienes <strong style="color:#ff477b;font-size:24px;">${extraDays} días</strong> adicionales de acceso completo
        </p>
      </div>
      ${btn('Ir a la Plataforma', 'https://insitu.company')}
    `),
  });

/**
 * 9. Subscription Terminated (non-payment)
 */
export const sendSubscriptionTerminatedEmail = (to, firstName) =>
  sendEmail({
    to,
    subject: `Suscripción cancelada — ${BRAND}`,
    html: baseTemplate(`
      <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#f1f5f9;">
        Tu suscripción ha sido cancelada
      </h1>
      <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:16px 0;">
        Hola <strong style="color:#f1f5f9;">${firstName}</strong>, tu suscripción a 
        <strong style="color:#ff477b;">${BRAND}</strong> ha sido cancelada debido a falta de pago.
      </p>
      <p style="color:#94a3b8;font-size:15px;line-height:1.7;">
        Tus datos se conservarán durante 30 días. Para reactivar tu cuenta, 
        elige un plan y contacta a soporte.
      </p>
      ${btn('Reactivar mi cuenta', 'https://insitu.company/#pricing')}
      <p style="color:#64748b;font-size:13px;margin-top:24px;">
        Soporte: <a href="mailto:ia@insitu.company" style="color:#ff477b;">ia@insitu.company</a>
      </p>
    `),
  });

/**
 * 10. Invitation
 */
export const sendInvitationEmail = (to, role, plan) =>
  sendEmail({
    to,
    subject: `🎯 Has sido invitado a ${BRAND}`,
    html: baseTemplate(`
      <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#f1f5f9;">
        ¡Tienes una invitación! 🎯
      </h1>
      <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:16px 0;">
        Has sido invitado a unirte a <strong style="color:#ff477b;">${BRAND}</strong> 
        con el rol <strong style="color:#f1f5f9;">${role}</strong> y plan 
        <strong style="color:#ff477b;">${plan}</strong>.
      </p>
      ${btn('Aceptar invitación', 'https://insitu.company')}
    `),
  });

// ── Media helper ──────────────────────────────────────────────────────────────
/**
 * Renders an image or a video thumbnail with a play button overlay.
 */
const renderMedia = (imageUrl, videoUrl) => {
  if (!imageUrl && !videoUrl) return '';
  
  const targetUrl = videoUrl || '#';
  const displayImage = imageUrl || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=600&h=300'; // Fallback if video but no thumb
  
  return `
    <div style="margin:24px 0;border-radius:12px;overflow:hidden;background:#0f0509;border:1px solid rgba(255,71,123,0.1);">
      <a href="${targetUrl}" target="_blank" style="display:block;position:relative;text-decoration:none;">
        <img src="${displayImage}" alt="Media" style="width:100%;display:block;object-fit:cover;max-height:300px;" />
        ${videoUrl ? `
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:64px;height:64px;background:rgba(255,71,123,0.9);border-radius:50%;display:flex;align-items:center;justify-center:center;box-shadow:0 0 20px rgba(255,71,123,0.4);">
            <div style="width:0;height:0;border-top:12px solid transparent;border-bottom:12px solid transparent;border-left:20px solid #fff;margin-left:5px;"></div>
          </div>
        ` : ''}
      </a>
    </div>
  `;
};

/**
 * 11. Weekly Insights Summary
 */
export const sendWeeklyInsightsEmail = (to, firstName, stats, imageUrl, videoUrl) =>
  sendEmail({
    to,
    subject: `📊 Tu resumen semanal de impacto — ${BRAND}`,
    html: baseTemplate(`
      <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#f1f5f9;">
        Tu semana en retrospectiva 📊
      </h1>
      <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:16px 0;">
        Hola <strong style="color:#f1f5f9;">${firstName}</strong>, aquí tienes un resumen de lo que lograste con ${BRAND} esta semana:
      </p>
      
      ${renderMedia(imageUrl, videoUrl)}

      <div style="background:rgba(255,71,123,0.08);border:1px solid rgba(255,71,123,0.2);border-radius:12px;padding:20px;margin:24px 0;">
        <table width="100%" cellpadding="10">
          <tr>
            <td align="center" style="border-right:1px solid rgba(255,71,123,0.2);">
              <span style="display:block;font-size:24px;font-weight:900;color:#ff477b;">${stats.audits || 0}</span>
              <span style="font-size:11px;color:#64748b;text-transform:uppercase;">Auditorías</span>
            </td>
            <td align="center" style="border-right:1px solid rgba(255,71,123,0.2);">
              <span style="display:block;font-size:24px;font-weight:900;color:#ff477b;">${stats.score || 0}</span>
              <span style="font-size:11px;color:#64748b;text-transform:uppercase;">Avg Score</span>
            </td>
            <td align="center">
              <span style="display:block;font-size:24px;font-weight:900;color:#ff477b;">${stats.tokens || 0}</span>
              <span style="font-size:11px;color:#64748b;text-transform:uppercase;">Tokens</span>
            </td>
          </tr>
        </table>
      </div>
      <p style="color:#94a3b8;font-size:15px;line-height:1.7;">
        "Tu anuncio más fuerte fue <strong>${stats.bestAd || 'N/A'}</strong>. ¡Sigue optimizando!"
      </p>
      ${btn('Ver Dashboard Completo', 'https://insitu.company')}
    `),
  });

/**
 * 12. Optimization Tip / Success Story
 */
export const sendOptimizationTipEmail = (to, firstName, tip, imageUrl, videoUrl) =>
  sendEmail({
    to,
    subject: `💡 Tip de IA: Cómo mejorar tu ${tip.target || 'campaña'} — ${BRAND}`,
    html: baseTemplate(`
      <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#f1f5f9;">
        Potencia tus resultados 💡
      </h1>
      <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:16px 0;">
        Hola <strong style="color:#f1f5f9;">${firstName}</strong>, hoy queremos compartirte un tip rápido basado en las tendencias actuales de IA:
      </p>
      
      ${renderMedia(imageUrl, videoUrl)}

      <div style="background:rgba(255,71,123,0.12);border-left:4px solid #ff477b;border-radius:4px;padding:24px;margin:24px 0;">
        <h3 style="margin:0 0 12px;color:#f1f5f9;font-size:18px;">${tip.title}</h3>
        <p style="margin:0;color:#cbd5e1;font-size:14px;line-height:1.6;">${tip.content}</p>
      </div>
      <p style="color:#94a3b8;font-size:14px;">
        Aplica este cambio hoy mismo en tu próxima auditoría y compara la diferencia.
      </p>
      ${btn('Probar en INsitu AI', 'https://insitu.company')}
    `),
  });

/**
 * 13. Usage Alert (80% / 100%)
 */
export const sendUsageAlertEmail = (to, firstName, percentage, imageUrl, videoUrl) =>
  sendEmail({
    to,
    subject: `⚠️ Alerta de consumo: Has usado el ${percentage}% de tus tokens — ${BRAND}`,
    html: baseTemplate(`
      <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#f1f5f9;">
        ¡Casi llegas al límite! ⚠️
      </h1>
      <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:16px 0;">
        Hola <strong style="color:#f1f5f9;">${firstName}</strong>, te informamos que has consumido el 
        <strong style="color:#ff477b;">${percentage}%</strong> de tus tokens mensuales permitidos.
      </p>
      
      ${renderMedia(imageUrl, videoUrl)}

      <div style="width:100%;background:#1e293b;border-radius:10px;height:12px;margin:32px 0;">
        <div style="width:${percentage}%;background:#ff477b;height:12px;border-radius:10px;box-shadow:0 0 10px rgba(255,71,123,0.5);"></div>
      </div>
      <p style="color:#94a3b8;font-size:15px;line-height:1.7;">
        ${percentage >= 100 
          ? 'Has alcanzado el límite de tu plan. Tu acceso a las auditorías se ha pausado hasta la próxima renovación o upgrade.' 
          : 'Para evitar interrupciones en tus análisis, considera subir a un plan superior ahora.'}
      </p>
      ${btn(percentage >= 100 ? 'Ampliar mi Plan' : 'Mejorar mi Suscripción', 'https://insitu.company/#pricing')}
    `),
  });


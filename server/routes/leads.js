import express from "express";
import db from "../db.js";
import nodemailer from "nodemailer";

const router = express.Router();

// Get Settings helper
const getSettings = async () => {
  const settings = await db.get("SELECT * FROM settings WHERE id = 1");
  if (!settings) return null;
  return JSON.parse(settings.data);
};

// HubSpot Sync Helper
const syncToHubspot = async (role, budget, goals, email, name, settings) => {
  if (
    !settings.hubspot ||
    !settings.hubspot.enabled ||
    !settings.hubspot.accessToken
  ) {
    return;
  }

  try {
    const response = await fetch(
      "https://api.hubapi.com/crm/v3/objects/contacts",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.hubspot.accessToken}`,
        },
        body: JSON.stringify({
          properties: {
            email: email,
            firstname: typeof name === "string" ? name.split(" ")[0] : name,
            lastname:
              typeof name === "string"
                ? name.split(" ").slice(1).join(" ")
                : "",
            jobtitle: role,
            budget_range: budget, // Custom property might be needed, using placeholder or standard
            message: `Goals: ${Array.isArray(goals) ? goals.join(", ") : goals}`,
            hs_lead_status: "NEW",
          },
        }),
      },
    );

    if (!response.ok) {
      const err = await response.json();
      console.error("HubSpot Sync Error:", err);
    } else {
      console.log("✅ Lead synced to HubSpot CRM");
    }
  } catch (e) {
    console.error("HubSpot Sync Exception:", e);
  }
};

// Send email helper
const sendLeadEmail = async (role, budget, goals, email, name, settings) => {
  const smtp = settings?.smtp;

  // Si tenemos integración con HubSpot, quizás queramos delegar el correo al CRM
  // Por ahora, enviamos notificación interna siempre si SMTP está activo
  if (!smtp || !smtp.enabled) {
    console.log("SMTP notification skipped (disabled)");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });

  const mailOptions = {
    from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
    to: "ai@insitu.company",
    subject: `[Nuevo Lead] Auditoría Solicitada: ${name}`,
    html: `
            <h2>Nuevo Lead Generado</h2>
            <p>Se ha recibido una nueva solicitud de auditoría desde el Landing Page.</p>
            <ul>
                <li><strong>Nombre:</strong> ${name}</li>
                <li><strong>Email:</strong> ${email}</li>
                <li><strong>Rol:</strong> ${role}</li>
                <li><strong>Presupuesto:</strong> ${budget}</li>
                <li><strong>Objetivos:</strong> ${Array.isArray(goals) ? goals.join(", ") : goals}</li>
            </ul>
            <p>Este lead ha sido guardado en el panel de administración.</p>
        `,
  };

  await transporter.sendMail(mailOptions);
};

// POST /api/leads - Create new lead
router.post("/", async (req, res) => {
  const { role, budget, goals, email, name } = req.body;

  if (!email || !name) {
    return res.status(400).json({ error: "Email y nombre son requeridos." });
  }

  try {
    const id = Math.random().toString(36).substr(2, 9);
    const createdAt = Date.now();
    const goalsStr = JSON.stringify(goals || []);

    await db.run(
      `INSERT INTO leads (id, role, budget, goals, email, name, created_at, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, role, budget, goalsStr, email, name, createdAt, "new"],
    );

    // Get fresh settings
    const settings = await getSettings();

    // Send email asynchronously
    sendLeadEmail(role, budget, goals || [], email, name, settings).catch(
      console.error,
    );

    // Sync to HubSpot asynchronously
    syncToHubspot(role, budget, goals || [], email, name, settings).catch(
      console.error,
    );

    res.json({ success: true, message: "Lead guardado exitosamente." });
  } catch (error) {
    console.error("Error saving lead:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// GET /api/leads - List leads (Admin only)
const ADMIN_SECRET = process.env.ADMIN_SECRET || '';
router.get("/", async (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const xUserId = req.headers['x-user-id'] || '';

  let isAdmin = ADMIN_SECRET && authHeader === `Bearer ${ADMIN_SECRET}`;
  if (!isAdmin && xUserId) {
    try {
      const user = await db.get('SELECT role FROM users WHERE id = ?', [xUserId]);
      isAdmin = user && (user.role === 'admin' || user.role === 'superAdmin');
    } catch { /* fall through */ }
  }
  if (!isAdmin) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const leads = await db.all('SELECT * FROM leads WHERE is_deleted = false ORDER BY created_at DESC');
    const parsedLeads = leads.map((l) => ({
      ...l,
      goals: JSON.parse(l.goals || "[]"),
    }));
    res.json(parsedLeads);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

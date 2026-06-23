import React, { useState, useEffect } from "react";
import {
  HistoryItem,
  AuthUser,
  SystemSettings,
  AIConfig,
  BlogPost,
  Language,
} from "../types";
import { authService } from "../services/authService";
import { userService } from "../services/auth/userService";
import { checkAIHealth } from "../services/geminiService";
import BlogManager from "./BlogManager";
import BlogPostEditor from "./BlogPostEditor";
import LogoIsotype from "./LogoIsotype";
import { API_URL, adminFetch } from "../utils/apiConfig";
import { FeedbackManager } from "./FeedbackManager";
import { ScannerMonitoring } from "./ScannerMonitoring";
import { 
  BarChart3, 
  CircleDollarSign, 
  Users, 
  Target, 
  ShieldCheck, 
  Brain, 
  Activity, 
  Newspaper, 
  Settings,
  Terminal,
  Globe,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  Filter,
  Trash2,
  Plus,
  Key,
  RefreshCw,
  Cpu
} from "lucide-react";
import { AIDebugView } from "./AIDebugView";
import AdminReleaseManager from "./AdminReleaseManager";
import AdminNotifyComposer from "./AdminNotifyComposer";
import { useAuth } from "../hooks/useAuth";

interface AdminDashboardProps {
  history: HistoryItem[];
  onClearHistory: () => void;
  onClose: () => void;
  language?: Language;
}

const TabHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
}> = ({ icon, title, description }) => (
  <div className="mb-6 md:mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
    <div className="flex items-center gap-3 md:gap-4 mb-3">
      <div className="p-2.5 md:p-3 bg-slate-900 text-white rounded-xl md:rounded-2xl shadow-xl shadow-slate-900/10">
        {React.isValidElement(icon) 
          ? React.cloneElement(icon as React.ReactElement<any>, { className: "w-5 h-5 md:w-6 md:h-6" })
          : icon
        }
      </div>
      <div>
        <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter uppercase">
          {title}
        </h3>
        <div className="h-1 w-12 bg-primary rounded-full mt-1"></div>
      </div>
    </div>
    <p className="text-slate-500 font-medium text-xs md:text-sm max-w-2xl leading-relaxed">
      {description}
    </p>
  </div>
);

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  history,
  onClearHistory,
  onClose,
  language = "es",
}) => {
  const [tab, setTab] = useState<
    | "stats"
    | "users"
    | "approvals"
    | "settings"
    | "cms"
    | "financials"
    | "leads"
    | "feedback"
    | "monitoring"
    | "aidebug"
    | "releases"
    | "notifications"
  >("stats");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [settings, setSettings] = useState<SystemSettings>(
    authService.getSettings(),
  );
  const [activeProfile, setActiveProfile] = useState<any>(
    userService.getCurrentProfile(),
  );
  const { currentUser } = useAuth(language);
  // Sync active profile when dashboard is open
  useEffect(() => {
    const interval = setInterval(() => {
      const current = userService.getCurrentProfile();
      if (current?.id !== activeProfile?.id) {
        setActiveProfile(current);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeProfile?.id]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedUserHistory, setSelectedUserHistory] =
    useState<AuthUser | null>(null);
  const [editingSubscriptionUser, setEditingSubscriptionUser] =
    useState<AuthUser | null>(null);
  const [editingLimitUser, setEditingLimitUser] = useState<AuthUser | null>(
    null,
  );
  const [newLimit, setNewLimit] = useState<string>("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "user" as const,
    plan: "Starter" as const,
  });
  const [editingCredentialsUser, setEditingCredentialsUser] =
    useState<AuthUser | null>(null);
  const [userForm, setUserForm] = useState<Partial<AuthUser>>({});
  const [credentialForm, setCredentialForm] = useState({
    username: "",
    password: "",
  });
  // Trial period & delete user state
  const [editingTrialUser, setEditingTrialUser] = useState<AuthUser | null>(
    null,
  );
  const [trialDaysInput, setTrialDaysInput] = useState<string>("7");
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<AuthUser | null>(
    null,
  );




  const t: any = {
    es: {
      header: {
        super: "SUPER",
        center: "Centro de Control del Sistema",
      },
      audit: {
        label: "Auditorías",
        reset: "Resetear Historial",
      },
      optimization: {
        title: "Optimizar Cliente",
        confirm: "¿Purgar memoria del sistema y optimizar cliente?\n\nEsto borrará todas las cachés del navegador, sesión y almacenamiento local para liberar memoria. Tendrás que iniciar sesión de nuevo.",
        purguing: "Purgando...",
        success: "Sistema optimizado y caché liberada.",
        error: "Error en la optimización profunda.",
      },
      tabs: {
        stats: "Estadísticas",
        financials: "Finanzas & Recurrencia",
        users: "Usuarios",
        leads: "Prospectos",
        approvals: "Aprobaciones",

        feedback: "🧠 Aprendizaje IA",
        monitoring: "📡 Scanner Health",
        aidebug: "🔧 AI Debug Logs",
        cms: "CMS Blog",
        settings: "Configuración",
        releases: "📣 Release Manager",
      },
      tabExplanations: {
        stats: "Resumen ejecutivo del rendimiento de la plataforma, ingresos y uso de tokens IA.",
        financials: "Métricas de negocio críticas: MRR, ARR, Churn y gestión de suscripciones activas.",
        users: "Administración global de usuarios, perfiles, roles y límites de consumo.",
        leads: "Explorador de prospectos y potenciales clientes registrados en el sistema.",
        approvals: "Gestión de acceso manual para usuarios en lista de espera o verificación.",
        feedback: "Centro de aprendizaje continuo. Analiza el feedback de los usuarios para mejorar la IA.",
        monitoring: "Estado técnico de los scanners de competidores en tiempo real.",
        aidebug: "Seguimiento de fallos técnicos y errores de la IA en producción para depuración rápida.",
        cms: "Gestor de contenidos para el Blog Academy y noticias de la plataforma.",
        settings: "Panel maestro de configuración: pasarelas, IA, mantenimiento y pricing.",
        releases: "Publica y gestiona las actualizaciones de plataforma. Controla el broadcast de emails y el modal WOW.",
      },
      stats: {
        revenueYTD: "Ingresos Totales (YTD)",
        proUsers: "Usuarios Pro",
        audits: "Auditorías",
        totalTokens: "Tokens Totales",
        totalCost: "Costo Total",
        blended: "blended",
      },
      financials: {
        mrr: "MRR (Mensual)",
        arr: "ARR (Tasa Anual)",
        arrDesc: "Proyección basada en mes actual",
        churn: "Tasa de Abandono",
        churnDesc: "Últimos 30 días",
        activations: "Nuevas Activaciones",
        activationsDesc: "Este mes",
        vsLastMonth: "vs el mes pasado",
        activeSubs: "Gestión de Suscripciones Activas",
        export: "Exportar CSV",
        table: {
          user: "Usuario",
          plan: "Plan & Ciclo",
          status: "Estado",
          paypal: "PayPal ID",
          renewal: "Renovación",
          actions: "Acciones",
        }
      },
      users: {
        title: "Administración de Usuarios",
        subtitle: "Control total sobre accesos, planes y límites del sistema.",
        search: "Buscar por nombre o email...",
        invite: "Invitar Usuario",
        table: {
          user: "Usuario / Rol",
          tokens: "Tokens / Límite",
          plan: "Suscripción / Plan",
          status: "Estatus",
          joined: "Fecha Registro",
          actions: "Actions",
        },
        actions: {
          history: "Historial",
          limit: "Límites",
          edit: "Editar",
          delete: "Eliminar",
          subscription: "Suscripción",
          trial: "Trial",
          referrals: "Referidos / Bonus",
        }
      },
      leads: {
        table: {
          name: "Nombre / Email",
          role: "Rol / Presupuesto",
          goals: "Objetivos",
          date: "Fecha",
        },
        empty: "No hay prospectos registrados aún.",
      },
      approvals: {
        approve: "Aprobar",
        empty: "No hay usuarios pendientes de aprobación.",
      },
      settings: {
        save: "Guardar Configuración Maestra",
        success: "✓ Cambios aplicados globalmente",
        netlifyManaged: "Administrado por Netlify",
        email: {
          title: "Correo Transaccional",
          managed: "Administrado por Netlify",
          desc: "La configuración de correo transaccional (RESEND_API_KEY, FROM_EMAIL) se gestiona mediante variables de entorno en el panel de Netlify. No se almacenan credenciales SMTP en la base de datos.",
          open: "Abrir Netlify",
        },
        maintenance: {
          title: "Modo Mantenimiento / Coming Soon",
          activate: "Activar Modo Mantenimiento",
          desc: "Cuando está activo, todos los usuarios no-admin ven la pantalla de Coming Soon. El cambio es inmediato y global para todos los dispositivos.",
          warning: "PLATAFORMA EN MANTENIMIENTO — Los usuarios no-admin verán la pantalla de Coming Soon inmediatamente.",
        },
        payments: {
          title: "Pagos (Stripe)",
          managed: "Administrado por Netlify + Stripe",
          desc: "Las claves de Stripe (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET) se gestionan mediante variables de entorno en Netlify. Los planes de suscripción se configuran directamente en el dashboard de Stripe.",
        },
        features: {
          title: "Control de Funcionalidades (Feature Flags)",
          module: "Módulo del Sistema",
          note: "Desactivar un módulo lo ocultará para todos los usuarios inmediatamente.",
          names: {
            competitorAnalysis: "Auditoría de Competidores (SEO)",
            imageAnalysis: "Auditoría Creativa (Imagen AI)",
            videoAnalysis: "Auditoría Creativa (Video AI)",
            metrics: "Dashboard de Métricas",
            trafficAnalysis: "Análisis de Tráfico & SEO",
            brandIdentity: "Brand Guardian (Identidad)",
            campaignsOptimizer: "Google Ads Optimizer",
            compareCreatives: "Comparación A/B Creatividades",
            searchResultAudit: "Auditoría Search Result",
            glossary: "Glosario de Términos",
            blog: "Blog / CMS",
            enableAutoTrends: "Auto-Sincronización de Tendencias",
          }
        },
        marketIntel: {
          title: "Market Intelligence Protocol",
          desc: "Sincroniza el cerebro de la IA con las tendencias mundiales de Google, Meta y TikTok extraídas de los anuncios de la competencia.",
          trigger: "Sincronizar Tendencias Ahora",
          superOnly: "Control exclusivo de SuperAdmin",
          status: "Última actualización:",
          success: "Tendencias actualizadas correctamente.",
          error: "Error al actualizar tendencias.",
        },
        comingSoon: {
          title: "Modo de Mantenimiento / Coming Soon",
          activate: "Activar Mensaje \"Coming Soon\"",
          desc: "Ocultará el acceso al checkout y mostrará el aviso en los planes.",
          messageLabel: "Mensaje Personalizado",
          placeholder: "Ej: Estamos actualizando nuestros sistemas de pago. Volvemos en unas horas...",
        },
        trial: {
          title: "Configuración de Trial Gratuito",
          tokens: "Tokens de Bienvenida (Trial)",
          days: "Días de Trial",
        },
        pricing: {
          title: "Control de Precios y Planes",
          matrix: "Matriz de Acceso por Plan",
          module: "Funcionalidad / Módulo",
          monthly: "Precio Mensual",
          yearly: "Precio Anual",
          yearlyTotal: "$USD Total",
          suggestion: "Sugerencia (20% off):",
          features: "Características del Plan",
          featuresHint: "Uno por línea",
          checkoutVisible: "Visible en Checkout",
        },
        ai: {
          title: "Configuración de IA (Gemini Keys)",
          desc: "Gestión avanzada de claves para el motor de Inteligencia Artificial. Soporta rotación automática y balanceo de carga.",
          add: "Añadir Nueva API Key",
          test: "Probar Conexión",
          keyLabel: "API Key / Secreto",
          nameLabel: "Etiqueta Interna",
          statusLabel: "Estatus Operativo",
          active: "Activo / En Rotación",
          inactive: "Inactivo / Pausado",
          placeholder: "Pega aquí tu clave de Google Gemini (AI Studio)...",
        }
      },
      modals: {
        invite: {
          title: "Invitar Nuevo Usuario",
          email: "Correo Electrónico",
          role: "Rol",
          plan: "Plan",
          send: "Enviar Invitación",
          success: "Invitación enviada exitosamente",
        },
        subscription: {
          title: "Administrar Suscripción",
          user: "Usuario",
          currentPlan: "Plan Actual",
          status: "Estado",
          close: "Cerrar",
          states: {
            active: "Activo",
            cancelled: "Cancelado",
            expired: "Expirado",
          }
        },
        limit: {
          title: "Editar Límite de Tokens",
          user: "Usuario",
          limit: "Límite de Tokens",
          current: "Límite actual:",
          cancel: "Cancelar",
          save: "Guardar",
          error: "Por favor ingresa un número válido",
        },
        history: {
          title: "Historial de Tokens:",
          total: "Total:",
          limit: "Límite:",
          empty: "No hay historial de uso disponible",
          tokens: "Tokens",
        },
        credentials: {
          title: "Editar Credenciales",
          username: "Usuario (ID)",
          password: "Nueva Contraseña",
          passwordHint: "* Si dejas este campo vacío, la contraseña no cambiará.",
          role: "Rol",
          status: "Estatus",
          plan: "Plan de Suscripción",
          prolongation: "Días adicionales (Prórroga)",
          cancel: "Cancelar",
          save: "Guardar Cambios",
          success: "Datos de usuario actualizados correctamente",
          error: "Error al actualizar datos. Verifica la conexión.",
        },
        trial: {
          title: "Período de Trial",
          shortcuts: "Atajos rápidos",
          customDays: "Días personalizados",
          expiry: "Vencimiento:",
          cancel: "Cancelar",
          apply: "Aplicar Trial",
        },
        delete: {
          title: "Eliminar Usuario",
          warning: "Acción irreversible",
          confirm: "¿Estás seguro de que deseas eliminar a",
          cancel: "Cancelar",
          delete: "Eliminar",
        }
      }
    },
    en: {
      header: {
        super: "SUPER",
        center: "System Control Center",
      },
      audit: {
        label: "Audits",
        reset: "Reset History",
      },
      optimization: {
        title: "Optimize Client",
        confirm: "Purge system memory and optimize client?\n\nThis will clear all browser caches, session, and local storage to free memory. You will need to log in again.",
        purguing: "Purging...",
        success: "System optimized and cache cleared.",
        error: "Error in deep optimization.",
      },
      tabs: {
        stats: "Statistics",
        financials: "Financials & Recurrence",
        users: "Users",
        leads: "Leads",
        approvals: "Approvals",

        feedback: "🧠 AI Learning",
        monitoring: "📡 Scanner Health",
        aidebug: "🔧 AI Debug Logs",
        cms: "CMS Blog",
        settings: "Settings",
        releases: "📣 Release Manager",
      },
      tabExplanations: {
        stats: "Executive summary of platform performance, revenue, and AI token usage.",
        financials: "Critical business metrics: MRR, ARR, Churn, and active subscription management.",
        users: "Global user administration, profiles, roles, and consumption limits.",
        leads: "Explorer for prospects and potential customers registered in the system.",
        approvals: "Manual access management for waitlisted or verification-pending users.",
        feedback: "Continuous learning center. Analyze user feedback to improve AI performance.",
        monitoring: "Real-time technical health status of competitor scanners.",
        aidebug: "Technical tracking of AI failures and malfunctions in production for rapid debugging.",
        cms: "Content manager for the Academy Blog and platform news.",
        settings: "Master configuration panel: gateways, AI, maintenance, and pricing.",
        releases: "Publish and manage platform updates. Control email broadcasts and WOW modal delivery.",
      },
      stats: {
        revenueYTD: "Total Revenue (YTD)",
        proUsers: "Pro Users",
        audits: "Audits",
        totalTokens: "Total Tokens",
        totalCost: "Total Cost",
        blended: "blended",
      },
      financials: {
        mrr: "MRR (Monthly)",
        arr: "ARR (Annual Run Rate)",
        arrDesc: "Projection based on current month",
        churn: "Churn Rate",
        churnDesc: "Last 30 days",
        activations: "New Activations",
        activationsDesc: "This month",
        vsLastMonth: "vs last month",
        activeSubs: "Active Subscription Management",
        export: "Export CSV",
        table: {
          user: "User",
          plan: "Plan & Cycle",
          status: "Status",
          paypal: "PayPal ID",
          renewal: "Renewal",
          actions: "Actions",
        }
      },
      users: {
        title: "User Management",
        subtitle: "Total control over access, plans, and system limits.",
        search: "Search by name or email...",
        invite: "Invite User",
        table: {
          user: "User / Role",
          tokens: "Tokens / Limit",
          plan: "Subscription / Plan",
          status: "Status",
          joined: "Joined Date",
          actions: "Actions",
        },
        actions: {
          history: "History",
          limit: "Limit",
          edit: "Edit",
          delete: "Delete",
          subscription: "Subscription",
          trial: "Trial",
          referrals: "Referrals / Bonus",
        }
      },
      leads: {
        table: {
          name: "Name / Email",
          role: "Role / Budget",
          goals: "Goals",
          date: "Date",
        },
        empty: "No prospects registered yet.",
      },
      approvals: {
        approve: "Approve",
        empty: "No users pending approval.",
      },
      settings: {
        save: "Save Master Configuration",
        success: "✓ Changes applied globally",
        netlifyManaged: "Managed by Netlify",
        email: {
          title: "Transactional Email",
          managed: "Managed by Netlify",
          desc: "Transactional email configuration (RESEND_API_KEY, FROM_EMAIL) is managed via environment variables in the Netlify panel. No SMTP credentials are stored in the database.",
          open: "Open Netlify",
        },
        maintenance: {
          title: "Maintenance Mode / Coming Soon",
          activate: "Activate Maintenance Mode",
          desc: "When active, all non-admin users see the Coming Soon screen. The change is immediate and global for all devices.",
          warning: "PLATFORM IN MAINTENANCE — Non-admin users will see the Coming Soon screen immediately.",
        },
        payments: {
          title: "Payments (Stripe)",
          managed: "Managed by Netlify + Stripe",
          desc: "Stripe keys (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET) are managed via environment variables in Netlify. Subscription plans are configured directly in the Stripe dashboard.",
        },
        features: {
          title: "Feature Flags Control",
          module: "System Module",
          note: "Disabling a module will hide it for all users immediately.",
          names: {
            competitorAnalysis: "Competitor Audit (SEO)",
            imageAnalysis: "Creative Audit (Image AI)",
            videoAnalysis: "Creative Audit (Video AI)",
            metrics: "Metrics Dashboard",
            trafficAnalysis: "Traffic & SEO Analysis",
            brandIdentity: "Brand Guardian (Identity)",
            campaignsOptimizer: "Google Ads Optimizer",
            compareCreatives: "A/B Creative Comparison",
            searchResultAudit: "Search Result Audit",
            glossary: "Terms Glossary",
            blog: "Blog / CMS",
            enableAutoTrends: "Auto-Trend Synchronization",
          }
        },
        marketIntel: {
          title: "Market Intelligence Protocol",
          desc: "Synchronize the AI brain with global Google, Meta, and TikTok trends extracted from competitor ads.",
          trigger: "Sync Trends Now",
          superOnly: "Exclusive SuperAdmin control",
          status: "Last update:",
          success: "Trends updated successfully.",
          error: "Error updating trends.",
        },
        comingSoon: {
          title: "Maintenance Mode / Coming Soon",
          activate: "Activate \"Coming Soon\" Message",
          desc: "Will hide access to checkout and show the notice on plans.",
          messageLabel: "Custom Message",
          placeholder: "Ex: We are updating our payment systems. We'll be back in a few hours...",
        },
        trial: {
          title: "Free Trial Configuration",
          tokens: "Welcome Tokens (Trial)",
          days: "Trial Days",
        },
        pricing: {
          title: "Pricing and Plans Control",
          matrix: "Access Matrix by Plan",
          module: "Feature / Module",
          monthly: "Monthly Price",
          yearly: "Yearly Price",
          yearlyTotal: "$USD Total",
          suggestion: "Suggestion (20% off):",
          features: "Plan Features",
          featuresHint: "One per line",
          checkoutVisible: "Visible in Checkout",
        },
        ai: {
          title: "AI Configuration (Gemini Keys)",
          desc: "Advanced key management for the Artificial Intelligence engine. Supports auto-rotation and load balancing.",
          add: "Add New API Key",
          test: "Test Connection",
          keyLabel: "API Key / Secret",
          nameLabel: "Internal Label",
          statusLabel: "Operational Status",
          active: "Active / In Rotation",
          inactive: "Inactive / Paused",
          placeholder: "Paste your Google Gemini (AI Studio) key here...",
        }
      },
      modals: {
        invite: {
          title: "Invite New User",
          email: "Email Address",
          role: "Role",
          plan: "Plan",
          send: "Send Invitation",
          success: "Invitation sent successfully",
        },
        subscription: {
          title: "Manage Subscription",
          user: "User",
          currentPlan: "Current Plan",
          status: "Status",
          close: "Close",
          states: {
            active: "Active",
            cancelled: "Cancelled",
            expired: "Expired",
          }
        },
        limit: {
          title: "Edit Token Limit",
          user: "User",
          limit: "Token Limit",
          current: "Current limit:",
          cancel: "Cancel",
          save: "Save",
          error: "Please enter a valid number",
        },
        history: {
          title: "Token History:",
          total: "Total:",
          limit: "Limit:",
          empty: "No usage history available",
          tokens: "Tokens",
        },
        credentials: {
          title: "Edit Credentials",
          username: "Username (ID)",
          password: "New Password",
          passwordHint: "* If you leave this field empty, the password will not change.",
          role: "Role",
          status: "Status",
          plan: "Subscription Plan",
          prolongation: "Additional days (Proviso)",
          cancel: "Cancel",
          save: "Save Changes",
          success: "User data updated successfully",
          error: "Error updating data. Check connection.",
        },
        trial: {
          title: "Trial Period",
          shortcuts: "Quick shortcuts",
          customDays: "Custom days",
          expiry: "Expiration:",
          cancel: "Cancel",
          apply: "Apply Trial",
        },
        delete: {
          title: "Delete User",
          warning: "Irreversible action",
          confirm: "Are you sure you want to delete",
          cancel: "Cancel",
          delete: "Delete",
        }
      }
    }
  };

  // ai_control skill — semaphore state per key index
  type SemaphoreStatus = 'idle' | 'testing' | 'online' | 'degraded' | 'offline';
  const [aiHealth, setAiHealth] = useState<
    Record<number, { status: SemaphoreStatus; latency: number }>
  >({});
  const [leads, setLeads] = useState<any[]>([]);
  const [isValidatingMartech, setIsValidatingMartech] = useState(false);
  const [isAIOnline, setIsAIOnline] = useState<boolean | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>(authService.getAllUsers());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ai_control — real latency + semaphore check for a specific key card
  const handleTestKey = async (idx: number, apiKey: string) => {
    setAiHealth(prev => ({ ...prev, [idx]: { status: 'testing', latency: 0 } }));
    try {
      const result = await checkAIHealth(apiKey);
      setAiHealth(prev => ({
        ...prev,
        [idx]: { status: result.status as SemaphoreStatus, latency: result.latency }
      }));
    } catch {
      setAiHealth(prev => ({ ...prev, [idx]: { status: 'offline', latency: -1 } }));
    }
  };

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const result = await checkAIHealth("");
        setIsAIOnline(result.status === "online");
      } catch {
        setIsAIOnline(false);
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Re-check every 30s
    return () => clearInterval(interval);
  }, []);

  const handleValidateMartech = async () => {
    const { martechService } = await import("../services/martechService");
    setIsValidatingMartech(true);
    const result = await martechService.validateConfig();
    setIsValidatingMartech(false);
    if (result.success) {
      setSettings(authService.getSettings()); // Refresh to get status
    }
  };

  useEffect(() => {
    if (tab === "leads") {
      authService.getLeads().then(setLeads);
    }
  }, [tab]);

  // Fetch users from backend on mount / after modifications
  useEffect(() => {
    adminFetch(`${API_URL}/admin/users`)
      .then((r) => r.json())
      .then((serverUsers) => {
        if (Array.isArray(serverUsers)) {
          setAllUsers(serverUsers);
          // Keep local cache in sync
          authService.getAllUsers(); // triggers initUsers sync internally
        }
      })
      .catch(() => {
        // Fallback to localStorage if backend unreachable
        setAllUsers(authService.getAllUsers());
      });
  }, [refreshTrigger]);

  // Role Guard: Only admins can access this dashboard
  const isHardcodedAdmin = currentUser?.email === 'admin@insitu.ai' || 
                           currentUser?.email === 'sanchezfj@me.com' || 
                           currentUser?.email === 'sociopuerta@gmail.com' ||
                           currentUser?.email === 'admin@insitu.company' ||
                           currentUser?.email === 'contacto@fjsanchez.com';
  if (currentUser?.role !== "admin" && currentUser?.role !== "superAdmin" && !isHardcodedAdmin) {
    return null;
  }

  const totalAudits = history.length;
  
  // Multi-tenant Context Filtering
  const isGlobalView = !activeProfile || activeProfile.id === 'global' || tab === 'users' || tab === 'financials' || tab === 'approvals';
  
  const filteredUsers = isGlobalView 
    ? allUsers 
    : allUsers.filter(u => u.brandProfiles?.some(p => (p.id || p.profile_id) === activeProfile.id) || u.brandProfile?.id === activeProfile.id);

  const activeUsers = filteredUsers.filter(
    (u) => u.subscription.status === "active",
  );
  const totalRevenue = activeUsers.reduce(
    (sum, u) => sum + (u.subscription.price || 0),
    0,
  );
  const pendingUsers = filteredUsers.filter((u) => u.approvalStatus === "pending");

  // Sum total tokens for filtered context
  const totalTokensUsed = filteredUsers.reduce((sum, u) => {
    return sum + (u.totalTokensUsed || 0);
  }, 0);

  // Real Gemini 1.5 Flash pricing (as of 2024)
  // Input: $0.075 per 1M tokens (up to 128K context)
  // Output: $0.30 per 1M tokens
  // Using blended average assuming 60% input / 40% output ratio
  const INPUT_COST_PER_MILLION = 0.075;
  const OUTPUT_COST_PER_MILLION = 0.3;
  const BLENDED_COST_PER_MILLION =
    INPUT_COST_PER_MILLION * 0.6 + OUTPUT_COST_PER_MILLION * 0.4;

  const calculateTokenCost = (tokens: number) => {
    const cost = (tokens / 1000000) * BLENDED_COST_PER_MILLION;
    if (cost === 0) return "$0.00";
    if (cost < 0.01) return "< $0.01";
    return `$${cost.toFixed(2)}`;
  };

  // Calculate total cost for all users using blended rate
  const totalTokenCost = (totalTokensUsed / 1000000) * BLENDED_COST_PER_MILLION;

  // Financial Metrics Logic (Moved here to have access to activeUsers)
  const mrr = activeUsers.reduce((sum, u) => {
    const price = u.subscription.price || 0;
    return (
      sum + (u.subscription.billingCycle === "Yearly" ? price / 12 : price)
    );
  }, 0);

  const arr = mrr * 12;
  const newActivations = activeUsers.filter(
    (u) =>
      u.subscription.startDate &&
      u.subscription.startDate > Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).length;
  const churnRate = "2.4%"; // Mock

  const handleApprove = (userId: string) => {
    if (authService.approveUser(userId)) {
      setRefreshTrigger((prev) => prev + 1);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await adminFetch(`${API_URL}/admin/users/${userId}`, { method: "DELETE" });
    } catch (e) {
      console.warn("[ADMIN] Could not delete user on backend:", e);
    }
    authService.deleteUser(userId);
    setConfirmDeleteUser(null);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleSetTrial = async (userId: string, days: number) => {
    const expiryDate = Date.now() + days * 24 * 60 * 60 * 1000;
    try {
      await adminFetch(`${API_URL.replace("/api", "")}/api/auth/subscription/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "trial", expiryDate }),
      });
    } catch (e) {
      console.warn("[ADMIN] Could not update trial on backend:", e);
    }
    authService.updateUserSubscription(userId, { status: "trial", expiryDate });
    setEditingTrialUser(null);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. If we have an active profile, save its specific config
    if (activeProfile) {
      const currentUser = userService.getCurrentUser();
      if (currentUser) {
        await userService.updateBrandProfile(currentUser.id, activeProfile);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    }
    
    // 2. Always save global settings as well (if modified)
    if (authService.saveSettings(settings)) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const updateAIConfig = (
    index: number,
    field: keyof AIConfig,
    value: string,
  ) => {
    const newConfigs = [...settings.aiConfigs];
    newConfigs[index] = { ...newConfigs[index], [field]: value };
    setSettings({ ...settings, aiConfigs: newConfigs });
  };

  const toggleAIStatus = (index: number) => {
    const newConfigs = [...settings.aiConfigs];
    newConfigs[index].status =
      newConfigs[index].status === "active" ? "inactive" : "active";
    setSettings({ ...settings, aiConfigs: newConfigs });
  };

  const handleTestAI = async (index: number, apiKey: string) => {
    setAiHealth((prev) => ({
      ...prev,
      [index]: { status: 'testing' as SemaphoreStatus, latency: 0 },
    }));
    try {
      const result = await checkAIHealth(apiKey);
      setAiHealth((prev) => ({
        ...prev,
        [index]: {
          status: result.status as SemaphoreStatus,
          latency: result.latency,
        },
      }));
    } catch {
      setAiHealth((prev) => ({
        ...prev,
        [index]: { status: 'offline' as SemaphoreStatus, latency: -1 },
      }));
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-300">
      <div className="bg-white w-full max-w-7xl h-full md:h-[90vh] rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 md:top-6 md:right-6 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors z-20"
        >
          <svg
            className="w-5 h-5 md:w-6 md:h-6 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 p-6 md:p-8 md:items-center justify-between bg-white/50 backdrop-blur-xl border-b border-slate-100 z-10 sticky top-0 rounded-t-[2rem] md:rounded-t-[3rem]">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/10">
              <LogoIsotype className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none flex items-center gap-2">
                INsitu<span className="text-primary">AI</span>
                <span className="px-2 py-0.5 bg-rose-100 text-rose-600 text-[11px] rounded-full tracking-widest align-middle">{t[language].header.super}</span>
              </h2>
              <p className="text-slate-400 font-bold text-[11px] uppercase tracking-widest mt-1.5 flex items-center gap-2">
                {t[language].header.center}
                <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                v{__APP_VERSION__}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div
              className={`px-4 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 shadow-sm transition-all ${
                isAIOnline === true
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-100/50"
                  : isAIOnline === false
                    ? "bg-rose-50 text-rose-500 border border-rose-100/50"
                    : "bg-slate-50 text-slate-400 border border-slate-100/50"
              }`}
            >
              <span className="relative flex h-2 w-2">
                {isAIOnline === true && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isAIOnline === true
                      ? "bg-emerald-500"
                      : isAIOnline === false
                        ? "bg-rose-500"
                        : "bg-slate-300"
                  }`}
                ></span>
              </span>
              <span className="whitespace-nowrap mt-0.5">
                {isAIOnline === true
                  ? "A.I. ONLINE"
                  : isAIOnline === false
                    ? "A.I. OFFLINE"
                    : "CHECKING..."}
              </span>
            </div>
            
            <div className="h-8 w-px bg-slate-200 hidden md:block"></div>

            <button
              onClick={onClearHistory}
              className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 hover:text-rose-600 hover:border-rose-200 transition-all whitespace-nowrap shadow-sm group"
            >
              <span className="group-hover:hidden">{t[language].audit.label}</span>
              <span className="hidden group-hover:inline">{t[language].audit.reset}</span>
            </button>

            <button
              onClick={async () => {
                const confirmed = window.confirm(t[language].optimization.confirm);
                if (confirmed) {
                  setIsOptimizing(true);
                  try {
                    // Clear all local storage
                    window.localStorage.clear();
                    window.sessionStorage.clear();
                    
                    // Clear service worker caches if they exist
                    if ("caches" in window) {
                      const cacheNames = await window.caches.keys();
                      await Promise.all(
                        cacheNames.map((name) => window.caches.delete(name))
                      );
                    }
                    alert(t[language].optimization.success);
                    window.location.reload(); 
                  } catch (e) {
                    console.error("Error en optimización profunda:", e);
                    alert(t[language].optimization.error);
                  } finally {
                    setIsOptimizing(false);
                  }
                }
              }}
              disabled={isOptimizing}
              className={`px-4 md:px-5 py-2 md:py-2.5 bg-slate-900 text-white rounded-xl md:rounded-2xl text-[11px] md:text-[11px] font-black uppercase tracking-widest hover:bg-primary transition-all flex items-center gap-2 whitespace-nowrap shadow-xl shadow-slate-900/10 hover:shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0 ${isOptimizing ? 'opacity-50 cursor-wait' : ''}`}
            >
              <svg
                className={`w-3 md:w-3.5 h-3 md:h-3.5 ${isOptimizing ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {isOptimizing ? t[language].optimization.purguing : t[language].optimization.title}
            </button>
          </div>
        </div>
        <div className="flex border-b border-slate-100 bg-white overflow-x-auto no-scrollbar">
          <button
            onClick={() => setTab("stats")}
            className={`px-8 py-5 text-[11px] font-black uppercase tracking-widest border-b-2 whitespace-nowrap ${tab === "stats" ? "border-primary text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            {t[language].tabs.stats}
          </button>
          <button
            onClick={() => setTab("financials")}
            className={`px-8 py-5 text-[11px] font-black uppercase tracking-widest border-b-2 whitespace-nowrap ${tab === "financials" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            {t[language].tabs.financials}
          </button>
          <button
            onClick={() => setTab("users")}
            className={`px-8 py-5 text-[11px] font-black uppercase tracking-widest border-b-2 whitespace-nowrap ${tab === "users" ? "border-primary text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            {t[language].tabs.users} ({allUsers.length})
          </button>
          <button
            onClick={() => setTab("leads")}
            className={`px-8 py-5 text-[11px] font-black uppercase tracking-widest border-b-2 whitespace-nowrap ${tab === "leads" ? "border-primary text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            {t[language].tabs.leads}
          </button>

          <button
            onClick={() => setTab("approvals")}
            className={`px-8 py-5 text-[11px] font-black uppercase tracking-widest border-b-2 whitespace-nowrap relative ${tab === "approvals" ? "border-emerald-500 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            {t[language].tabs.approvals}{" "}
            {pendingUsers.length > 0 && (
              <span className="ml-2 bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">
                {pendingUsers.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("feedback")}
            className={`px-8 py-5 text-[11px] font-black uppercase tracking-widest border-b-2 whitespace-nowrap ${tab === "feedback" ? "border-primary text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            {t[language].tabs.feedback}
          </button>
          <button
            onClick={() => setTab("monitoring")}
            className={`px-8 py-5 text-[11px] font-black uppercase tracking-widest border-b-2 whitespace-nowrap ${tab === "monitoring" ? "border-primary text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            {t[language].tabs.monitoring}
          </button>
          <button
            onClick={() => setTab("aidebug")}
            className={`px-8 py-5 text-[11px] font-black uppercase tracking-widest border-b-2 whitespace-nowrap ${tab === "aidebug" ? "border-indigo-600 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            {t[language].tabs.aidebug}
          </button>
          <button
            onClick={() => setTab("cms")}
            className={`px-8 py-5 text-[11px] font-black uppercase tracking-widest border-b-2 whitespace-nowrap ${tab === "cms" ? "border-primary text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            {t[language].tabs.cms}
          </button>
          <button
            onClick={() => setTab("releases")}
            className={`px-8 py-5 text-[11px] font-black uppercase tracking-widest border-b-2 whitespace-nowrap ${tab === "releases" ? "border-primary text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            {t[language].tabs.releases}
          </button>
          <button
            onClick={() => setTab("notifications")}
            className={`px-8 py-5 text-[11px] font-black uppercase tracking-widest border-b-2 whitespace-nowrap ${tab === "notifications" ? "border-rose-500 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            📨 Comunicaciones
          </button>
          <button
            onClick={() => setTab("settings")}
            className={`px-8 py-5 text-[11px] font-black uppercase tracking-widest border-b-2 whitespace-nowrap ${tab === "settings" ? "border-indigo-500 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            {t[language].tabs.settings}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 md:p-10 bg-[#f8fafc]">
          {tab === "stats" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <TabHeader 
                icon={<BarChart3 className="w-6 h-6" />}
                title={t[language].tabs.stats}
                description={t[language].tabExplanations.stats}
              />

              {/* Context Badge */}
              <div className="mb-6 flex items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl scale-90 ${isGlobalView ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {isGlobalView ? <Globe className="w-5 h-5" /> : <Filter className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900 leading-none mb-1">
                      {isGlobalView 
                        ? (language === 'es' ? 'VISTA GLOBAL DEL SISTEMA' : 'GLOBAL SYSTEM VIEW')
                        : (language === 'es' ? 'VISTA FILTRADA POR PERFIL' : 'PROFILE FILTERED VIEW')}
                    </h4>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                      {isGlobalView 
                        ? (language === 'es' ? 'Mostrando métricas agregadas de todos los inquilinos' : 'Showing aggregated metrics from all tenants')
                        : (language === 'es' ? `Métricas exclusivas para: ${activeProfile.brandName}` : `Exclusive metrics for: ${activeProfile.brandName}`)}
                    </p>
                  </div>
                </div>
                {!isGlobalView && (
                   <div className="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-[9px] font-black rounded-full uppercase tracking-widest animate-pulse">
                      Live Profile Context
                   </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-8">
              {/* ... existing cards ... */}
              <div className="p-6 md:p-8 bg-slate-900 rounded-3xl md:rounded-[2.5rem] text-white text-center">
                <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest mb-3 md:mb-4">
                  {t[language].stats.revenueYTD}
                </p>
                <p className="text-4xl md:text-5xl font-black text-emerald-400">
                  ${totalRevenue.toLocaleString()}
                </p>
              </div>
              <div className="p-6 md:p-8 bg-emerald-50 rounded-3xl md:rounded-[2.5rem] border border-emerald-100 text-center">
                <p className="text-[11px] font-black text-emerald-600 uppercase tracking-widest mb-3 md:mb-4">
                  {t[language].stats.proUsers}
                </p>
                <p className="text-4xl md:text-5xl font-black text-emerald-900">
                  {activeUsers.length}
                </p>
              </div>
              <div className="p-6 md:p-8 bg-amber-50 rounded-3xl md:rounded-[2.5rem] border border-amber-100 text-center">
                <p className="text-[11px] font-black text-amber-600 uppercase tracking-widest mb-3 md:mb-4">
                  {t[language].stats.audits}
                </p>
                <p className="text-4xl md:text-5xl font-black text-amber-900">
                  {totalAudits}
                </p>
              </div>
              <div className="p-6 md:p-8 bg-blue-50 rounded-3xl md:rounded-[2.5rem] border border-blue-100 text-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-100/50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest mb-3 md:mb-4 relative z-10">
                  {t[language].stats.totalTokens}
                </p>
                <p className="text-4xl md:text-5xl font-black text-blue-900 relative z-10">
                  {totalTokensUsed.toLocaleString()}
                </p>
                <div className="mt-3 space-y-1 relative z-10">
                  <div className="inline-flex items-center space-x-1 bg-blue-100 px-3 py-1 rounded-full">
                    <span className="text-[11px] font-black text-blue-500 uppercase tracking-widest">
                      {t[language].stats.totalCost}:
                    </span>
                    <span className="text-sm font-black text-blue-700">
                      ${totalTokenCost.toFixed(4)}
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-400 font-bold uppercase tracking-widest mt-1">
                    ${BLENDED_COST_PER_MILLION.toFixed(3)}/1M tokens ({t[language].stats.blended})
                  </p>
                </div>
              </div>
              <div className="p-6 md:p-8 bg-purple-50 rounded-3xl md:rounded-[2.5rem] border border-purple-100 text-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-20 h-20 bg-purple-100/50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                <p className="text-[11px] font-black text-purple-600 uppercase tracking-widest mb-3 md:mb-4 relative z-10">
                  {language === "es" ? "Bonus de Referidos" : "Referral Bonuses"}
                </p>
                <p className="text-4xl md:text-5xl font-black text-purple-900 relative z-10">
                  {allUsers.reduce((sum, u) => sum + (u.total_bonus_earned || 0), 0).toLocaleString()}
                </p>
                <div className="mt-2 relative z-10">
                  <p className="text-[11px] text-purple-400 font-bold uppercase tracking-widest">
                    {language === "es" ? "Tokens Ganados" : "Tokens Earned"}
                  </p>
                </div>
              </div>
            </div>
          </div>
          )}

          {tab === "financials" && (
            <div className="space-y-10 animate-in fade-in duration-500">
              <TabHeader 
                icon={<CircleDollarSign className="w-6 h-6" />}
                title={t[language].tabs.financials}
                description={t[language].tabExplanations.financials}
              />
              {/* Financial KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
                <div className="relative bg-slate-900 border border-primary/20 rounded-3xl md:rounded-[3rem] p-6 md:p-8 shadow-2xl overflow-hidden group">
                  <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full"></div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                  <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest mb-2">
                    {t[language].financials.mrr}
                  </p>
                  <p className="text-3xl lg:text-5xl font-black text-white tracking-tight">
                    ${mrr.toLocaleString()}
                  </p>
                  <div className="mt-4 flex items-center space-x-2">
                    <span className="bg-emerald-500/10 text-emerald-400 text-[11px] font-bold px-2 py-0.5 rounded-full">
                      +12% {t[language].financials.vsLastMonth}
                    </span>
                  </div>
                </div>
                <div className="bg-slate-800 p-6 md:p-8 rounded-3xl md:rounded-[2rem] border border-slate-700/50 shadow-xl">
                  <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest mb-2">
                    {t[language].financials.arr}
                  </p>
                  <p className="text-3xl lg:text-5xl font-black text-slate-200 tracking-tight">
                    ${arr.toLocaleString()}
                  </p>
                  <p className="text-[11px] md:text-xs text-slate-500 mt-2 font-medium">
                    {t[language].financials.arrDesc}
                  </p>
                </div>
                <div className="bg-white p-6 md:p-8 rounded-3xl md:rounded-[2rem] border border-slate-100 shadow-sm">
                  <p className="text-[11px] font-black text-rose-500 uppercase tracking-widest mb-2">
                    {t[language].financials.churn}
                  </p>
                  <p className="text-3xl lg:text-5xl font-black text-slate-900 tracking-tight">
                    {churnRate}
                  </p>
                  <p className="text-[11px] md:text-xs text-slate-400 mt-2 font-medium">
                    {t[language].financials.churnDesc}
                  </p>
                </div>
                <div className="bg-white p-6 md:p-8 rounded-3xl md:rounded-[2rem] border border-slate-100 shadow-sm">
                  <p className="text-[11px] font-black text-indigo-500 uppercase tracking-widest mb-2">
                    {t[language].financials.activations}
                  </p>
                  <p className="text-3xl lg:text-5xl font-black text-slate-900 tracking-tight">
                    +{newActivations}
                  </p>
                  <p className="text-[11px] md:text-xs text-slate-400 mt-2 font-medium">
                    {t[language].financials.activationsDesc}
                  </p>
                </div>
              </div>

              {/* Subscription Management Table */}
              <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                  <h3 className="text-xl font-black text-slate-900">
                    {t[language].financials.activeSubs}
                  </h3>
                  <div className="flex space-x-3">
                    <button className="px-4 py-2 bg-slate-50 text-slate-600 text-xs font-bold rounded-xl hover:bg-primary hover:text-white hover:border-primary border border-slate-200">
                      {t[language].financials.export}
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50/50">
                      <tr>
                        <th className="px-8 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">
                          {t[language].financials.table.user}
                        </th>
                        <th className="px-8 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">
                          {t[language].financials.table.plan}
                        </th>
                        <th className="px-8 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">
                          {t[language].financials.table.status}
                        </th>
                        <th className="px-8 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">
                          {t[language].financials.table.paypal}
                        </th>
                        <th className="px-8 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">
                          {t[language].financials.table.renewal}
                        </th>
                        <th className="px-8 py-4 text-right text-[11px] font-black text-slate-500 uppercase tracking-widest">
                          {t[language].financials.table.actions}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {activeUsers.map((u) => (
                        <tr
                          key={u.id}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-8 py-6">
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold border border-indigo-200">
                                {u.firstName?.[0] || u.email[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900">
                                  {u.firstName} {u.lastName}
                                </p>
                                <p className="text-xs text-slate-400 font-medium">
                                  {u.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-900">
                                {u.subscription.plan}
                              </span>
                              <span className="text-[11px] text-slate-500 uppercase tracking-wide bg-slate-100 px-2 py-0.5 rounded-full w-fit mt-1">
                                {u.subscription.billingCycle || "Monthly"}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                              <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
                              ACTIVE
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded select-all">
                              {u.subscription.paypalSubscriptionId || "N/A"}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <span className="text-sm font-bold text-slate-700">
                              {u.subscription.expiryDate
                                ? new Date(
                                    u.subscription.expiryDate,
                                  ).toLocaleDateString()
                                : "-"}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <button
                              onClick={() => setEditingSubscriptionUser(u)}
                              className="text-slate-400 hover:text-indigo-600 font-bold text-xs"
                            >
                              Administrar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === "users" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <TabHeader 
                icon={<Users className="w-6 h-6" />}
                title={t[language].tabs.users}
                description={t[language].tabExplanations.users}
              />
              <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[11px] md:text-[11px] font-black uppercase text-slate-500">
                  <tr>
                    <th className="px-4 md:px-8 py-4 md:py-5">{t[language].users.table.user}</th>
                    <th className="px-4 md:px-8 py-4 md:py-5">{t[language].users.table.status}</th>
                    <th className="px-4 md:px-8 py-4 md:py-5">{t[language].users.table.plan}</th>
                    <th className="px-4 md:px-8 py-4 md:py-5">{t[language].users.table.tokens}</th>
                    <th className="px-4 md:px-8 py-4 md:py-5 text-right">
                      <button
                        onClick={() => setShowInviteModal(true)}
                        className="px-4 py-2 bg-primary text-white text-[11px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                      >
                        + {t[language].users.invite}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td className="px-4 md:px-8 py-4 md:py-5 flex items-center space-x-2 md:space-x-3">
                        <img
                          src={u.picture}
                          className="w-6 h-6 md:w-8 md:h-8 rounded-lg"
                          alt=""
                        />
                        <div>
                          <p className="font-black text-slate-900 text-xs md:text-sm">
                            {u.username}
                          </p>
                          <p className="text-[11px] md:text-[11px] text-slate-500 font-bold uppercase overflow-hidden text-ellipsis max-w-[100px] md:max-w-none">
                            {u.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`text-[11px] font-black uppercase px-2 py-0.5 rounded-md w-fit ${u.role === "admin" ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-600"}`}
                          >
                            {u.role}
                          </span>
                          <span
                            className={`text-[11px] font-black uppercase px-2 py-0.5 rounded-md w-fit ${u.approvalStatus === "approved" ? "bg-emerald-100 text-emerald-600" : u.approvalStatus === "pending" || u.approvalStatus === "invited" ? "bg-amber-100 text-amber-600" : "bg-rose-100 text-rose-600"}`}
                          >
                            {u.approvalStatus}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <span
                            className={`text-[11px] font-black uppercase px-3 py-1 rounded-full w-fit ${u.subscription.plan === "Agency" ? "bg-indigo-100 text-indigo-600" : u.subscription.plan === "Growth" ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-900"}`}
                          >
                            {u.subscription.plan}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                            {u.subscription.expiryDate
                              ? `Expira: ${new Date(u.subscription.expiryDate).toLocaleDateString()}`
                              : "Sin exp."}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-lg font-black text-slate-900">
                              {(u.totalTokensUsed || 0).toLocaleString()}
                            </span>
                            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                              tokens
                            </span>
                          </div>
                          {u.total_bonus_earned > 0 && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                                +{(u.total_bonus_earned || 0).toLocaleString()} earned
                              </span>
                              <span className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                                {(u.bonus_tokens || 0).toLocaleString()} bonus left
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              {calculateTokenCost(u.totalTokensUsed || 0)}
                            </span>
                            <span className="text-[11px] text-slate-300 font-bold">
                              •
                            </span>
                            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                              Límite: {(u.usageLimit || 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingLimitUser(u);
                              setNewLimit((u.usageLimit || 0).toString());
                            }}
                            className="px-3 py-1 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 text-[11px] font-black uppercase tracking-widest rounded-lg transition-colors"
                          >
                            Editar Límite
                          </button>
                          <button
                            onClick={() => {
                              setEditingCredentialsUser(u);
                              setCredentialForm({
                                username: u.username,
                                password: "",
                              });
                              setUserForm({
                                role: u.role,
                                approvalStatus: u.approvalStatus,
                                subscription: { ...u.subscription },
                              });
                            }}
                            className="px-3 py-1 bg-slate-100 text-slate-500 hover:bg-slate-200 text-[11px] font-black uppercase tracking-widest rounded-lg transition-colors"
                          >
                            {t[language].users.actions.edit}
                          </button>
                          <button
                            onClick={() => setSelectedUserHistory(u)}
                            className="px-3 py-1 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-[11px] font-black uppercase tracking-widest rounded-lg transition-colors"
                          >
                            {t[language].users.actions.history}
                          </button>
                          {u.approvalStatus === "pending" && (
                            <button
                              onClick={() => handleApprove(u.id)}
                              className="px-3 py-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 text-[11px] font-black uppercase tracking-widest rounded-lg transition-colors"
                            >
                              {t[language].approvals.approve}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingTrialUser(u);
                              setTrialDaysInput("7");
                            }}
                            className="px-3 py-1 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 text-[11px] font-black uppercase tracking-widest rounded-lg transition-colors"
                          >
                            {t[language].users.actions.trial}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteUser(u)}
                            className="px-3 py-1 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-[11px] font-black uppercase tracking-widest rounded-lg transition-colors"
                          >
                            {t[language].users.actions.delete}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {tab === "leads" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <TabHeader 
                icon={<Target className="w-6 h-6" />}
                title={t[language].tabs.leads}
                description={t[language].tabExplanations.leads}
              />
              <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[11px] md:text-[11px] font-black uppercase text-slate-500">
                  <tr>
                    <th className="px-4 md:px-8 py-4 md:py-5">{t[language].leads.table.name}</th>
                    <th className="px-4 md:px-8 py-4 md:py-5">{t[language].leads.table.role}</th>
                    <th className="px-4 md:px-8 py-4 md:py-5">{t[language].leads.table.goals}</th>
                    <th className="px-4 md:px-8 py-4 md:py-5">{t[language].leads.table.date}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leads.map((lead: any) => (
                    <tr
                      key={lead.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-8 py-5">
                        <div>
                          <p className="font-black text-slate-900">
                            {lead.name}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            {lead.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div>
                          <p className="text-xs font-bold text-slate-700">
                            {lead.role}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {lead.budget}
                          </p>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-wrap gap-1">
                          {JSON.parse(JSON.stringify(lead.goals || [])).map(
                            (goal: string, idx: number) => (
                              <span
                                key={idx}
                                className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wide"
                              >
                                {goal}
                              </span>
                            ),
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-[11px] font-bold text-slate-400">
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {leads.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-8 py-10 text-center text-slate-400 text-sm font-medium"
                      >
                        {t[language].leads.empty}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          )}


          {tab === "approvals" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <TabHeader 
                icon={<ShieldCheck className="w-6 h-6" />}
                title={t[language].tabs.approvals}
                description={t[language].tabExplanations.approvals}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pendingUsers.map((u) => (
                <div
                  key={u.id}
                  className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-200 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-4">
                    <img
                      src={u.picture}
                      className="w-12 h-12 rounded-xl"
                      alt=""
                    />
                    <div>
                      <p className="font-black text-slate-900">{u.username}</p>
                      <p className="text-[11px] text-slate-500">{u.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleApprove(u.id)}
                    className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest"
                  >
                    {t[language].approvals.approve}
                  </button>
                </div>
              ))}
            </div>
          </div>
          )}

          {tab === "feedback" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <TabHeader 
                icon={<Brain className="w-6 h-6" />}
                title={t[language].tabs.feedback}
                description={t[language].tabExplanations.feedback}
              />
              
              <div className="grid md:grid-cols-2 gap-8">
                <FeedbackManager language={language} />
                
                {/* Market Intelligence Control - Restricted to SuperAdmin */}
                <div className="p-8 bg-slate-50 rounded-[3rem] border border-slate-200 space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg">
                      <Target className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                      {t[language].settings?.marketIntel?.title}
                    </h3>
                  </div>
                  
                  <p className="text-slate-500 text-sm font-medium leading-relaxed">
                    {t[language].settings?.marketIntel?.desc}
                  </p>

                  <div className="pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        Status Protocol:
                      </span>
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                        Online
                      </span>
                    </div>

                    {currentUser?.role === 'superAdmin' ? (
                      <button
                        onClick={async () => {
                          const triggerBtn = document.activeElement as HTMLButtonElement;
                          if (triggerBtn) triggerBtn.disabled = true;
                          try {
                            const res = await adminFetch(`${API_URL}/market-pulse`, { method: 'POST' });
                            if (res.ok) {
                              alert(t[language].settings?.marketIntel?.success);
                              setRefreshTrigger(prev => prev + 1);
                            } else {
                              throw new Error();
                            }
                          } catch (e) {
                            alert(t[language].settings?.marketIntel?.error);
                          } finally {
                            if (triggerBtn) triggerBtn.disabled = false;
                          }
                        }}
                        className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl hover:bg-primary transition-all active:scale-95 flex items-center justify-center gap-2 group"
                      >
                        <Globe className="w-4 h-4 group-hover:animate-spin" />
                        {t[language].settings?.marketIntel?.trigger}
                      </button>
                    ) : (
                      <div className="p-6 bg-slate-200/50 rounded-3xl border border-slate-300 text-center space-y-2">
                        <AlertCircle className="w-6 h-6 text-slate-400 mx-auto" />
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                          {t[language].marketIntel.superOnly}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "cms" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <TabHeader 
                icon={<Newspaper className="w-6 h-6" />}
                title={t[language].tabs.cms}
                description={t[language].tabExplanations.cms}
              />
              {isCreating || editingPost ? (
                <BlogPostEditor
                  post={editingPost}
                  user={currentUser!}
                  onSave={() => {
                    setIsCreating(false);
                    setEditingPost(null);
                    setRefreshTrigger((prev) => prev + 1);
                  }}
                  onCancel={() => {
                    setIsCreating(false);
                    setEditingPost(null);
                  }}
                />
              ) : (
                <div key={refreshTrigger}>
                  <BlogManager
                    onCreate={() => setIsCreating(true)}
                    onEdit={(post) => setEditingPost(post)}
                    language={language}
                  />
                </div>
              )}
            </div>
          )}

          {tab === "monitoring" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <TabHeader 
                icon={<Activity className="w-6 h-6" />}
                title={t[language].tabs.monitoring}
                description={t[language].tabExplanations.monitoring}
              />
              <ScannerMonitoring language={language} />
            </div>
          )}

          {tab === "aidebug" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <TabHeader 
                icon={<Terminal className="w-6 h-6" />}
                title={t[language].tabs.aidebug}
                description={t[language].tabExplanations.aidebug}
              />
              <AIDebugView language={language} />
            </div>
          )}

          {tab === "releases" && (
            <div className="space-y-8 animate-in fade-in duration-500 pb-20">
              <TabHeader
                icon={<span className="text-2xl">📣</span>}
                title={t[language].tabs.releases}
                description={t[language].tabExplanations.releases}
              />
              <AdminReleaseManager language={language} currentUser={currentUser} />
            </div>
          )}

          {tab === "notifications" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <TabHeader
                icon={<span className="text-2xl">📨</span>}
                title="Comunicaciones"
                description="Redacta y envía emails y push notifications a tus usuarios. Segmenta por plan, personaliza con tags dinámicos, realiza tests A/B y previsualiza en tiempo real antes del broadcast."
              />
              <AdminNotifyComposer language={language} />
            </div>
          )}

          {tab === "settings" && (
            <div className="space-y-10 animate-in fade-in duration-500">
              <TabHeader 
                icon={<Settings className="w-6 h-6" />}
                title={t[language].tabs.settings}
                description={t[language].tabExplanations.settings}
              />
              <form onSubmit={handleSaveSettings} className="space-y-12 pb-20">


                {/* Transactional Email Section */}
                <section className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary border border-primary/20">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{t[language].settings.email.title}</h3>
                  </div>
                  <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-200 flex gap-4 items-start">
                    <svg className="w-6 h-6 text-indigo-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-black text-slate-900 text-sm uppercase tracking-wider mb-1">{t[language].settings.netlifyManaged}</p>
                      <p className="text-slate-500 text-sm leading-relaxed">
                        {language === "es" 
                          ? "La configuración de correo transaccional (RESEND_API_KEY, FROM_EMAIL) se gestiona mediante variables de entorno en el panel de Netlify. No se almacenan credenciales SMTP en la base de datos."
                          : "Transactional email settings (RESEND_API_KEY, FROM_EMAIL) are managed via environment variables in the Netlify panel. No SMTP credentials are stored in the database."}
                      </p>
                      <a href="https://app.netlify.com" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-indigo-500 transition-colors">
                        {language === "es" ? "Abrir Netlify ↗" : "Open Netlify ↗"}
                      </a>
                    </div>
                  </div>
                </section>

              {/* AI Key Configuration Section - RE-ENABLED FOR USER CUSTOM KEYS */}
              {true && <section className="space-y-6">
                <div className="flex items-center space-x-4 mb-8">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white border border-indigo-400/20 shadow-lg shadow-indigo-500/20">
                    <Brain className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                      {t[language].settings.ai.title}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                      {language === "es" ? "Cerebro Central & Rotación" : "Core Brain & Rotation"}
                    </p>
                  </div>
                </div>

                <div className="p-8 md:p-10 bg-slate-50 rounded-[3rem] border border-slate-200 space-y-6">
                  <div className="space-y-4">
                    {(settings.aiConfigs || []).map((config, idx) => (
                      <div 
                        key={idx} 
                        className="group bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-100 transition-all duration-300"
                      >
                        <div className="flex flex-col md:flex-row gap-6">
                          <div className="flex-1 space-y-5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-2.5 h-2.5 rounded-full ring-4 ${config.status === 'active' ? 'bg-emerald-500 ring-emerald-500/10' : 'bg-slate-300 ring-slate-100'}`} />
                                <input
                                  type="text"
                                  value={config.name || ""}
                                  placeholder={t[language].settings.ai.nameLabel}
                                  onChange={(e) => {
                                    const newConfigs = [...(settings.aiConfigs || [])];
                                    newConfigs[idx] = { ...newConfigs[idx], name: e.target.value };
                                    setSettings({ ...settings, aiConfigs: newConfigs });
                                  }}
                                  className="bg-transparent border-none font-black text-slate-900 uppercase tracking-wider text-sm outline-none focus:text-indigo-600 transition-colors"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <select
                                  value={config.provider === "Google Gemini" ? "studio" : (config.provider || "studio")}
                                  onChange={(e) => {
                                    const newConfigs = [...(settings.aiConfigs || [])];
                                    newConfigs[idx] = { ...newConfigs[idx], provider: e.target.value };
                                    setSettings({ ...settings, aiConfigs: newConfigs });
                                  }}
                                  className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-slate-100 text-slate-400 rounded-lg outline-none cursor-pointer hover:bg-slate-200 transition-colors"
                                >
                                  <option value="studio">Google Gemini</option>
                                  <option value="openrouter">OpenRouter</option>
                                  <option value="zhipu">Zhipu AI (GLM)</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6 pt-2">
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                                  <Key className="w-3 h-3" />
                                  {t[language].settings.ai.keyLabel}
                                </label>
                                <div className="relative group/key">
                                  <input
                                    type="password"
                                    value={config.apiKey || ""}
                                    placeholder={t[language].settings.ai.placeholder}
                                    onChange={(e) => {
                                      const newConfigs = [...(settings.aiConfigs || [])];
                                      newConfigs[idx] = { ...newConfigs[idx], apiKey: e.target.value };
                                      setSettings({ ...settings, aiConfigs: newConfigs });
                                    }}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-xs font-mono font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all"
                                  />
                                </div>
                              </div>

                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                                  <Activity className="w-3 h-3" />
                                  {t[language].settings.ai.statusLabel}
                                </label>
                                <select
                                  value={config.status}
                                  onChange={(e) => {
                                    const newConfigs = [...(settings.aiConfigs || [])];
                                    newConfigs[idx] = { ...newConfigs[idx], status: e.target.value as any };
                                    setSettings({ ...settings, aiConfigs: newConfigs });
                                  }}
                                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-xs font-black uppercase tracking-widest outline-none focus:bg-white focus:border-indigo-500 appearance-none cursor-pointer"
                                >
                                  <option value="active">{t[language].settings.ai.active}</option>
                                  <option value="inactive">{t[language].settings.ai.inactive}</option>
                                </select>
                              </div>
                            </div>

                            {config.lastError && (
                              <div className="mt-4 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-left-2 transition-all">
                                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-[10px] font-black text-rose-900 uppercase tracking-widest mb-1">Error de Conexión Detectado</p>
                                  <p className="text-xs text-rose-600 font-medium leading-relaxed italic">"{config.lastError}"</p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* ai_control — Semaphore status pill */}
                          <div className="flex md:flex-col gap-2 pt-2">
                            {(() => {
                              const h = aiHealth[idx];
                              const pill: Record<string, { bg: string; dot: string; label: string }> = {
                                online:   { bg: 'bg-emerald-50 border-emerald-200 text-emerald-700', dot: 'bg-emerald-500 shadow-emerald-500/50 shadow-lg animate-pulse', label: `${h?.latency ?? 0}ms` },
                                degraded: { bg: 'bg-amber-50 border-amber-200 text-amber-700',   dot: 'bg-amber-400 shadow-amber-400/50 shadow-lg animate-pulse', label: `${h?.latency ?? 0}ms` },
                                offline:  { bg: 'bg-rose-50 border-rose-200 text-rose-700',       dot: 'bg-rose-500', label: language === 'es' ? 'Sin respuesta' : 'Offline' },
                                testing:  { bg: 'bg-indigo-50 border-indigo-200 text-indigo-600', dot: 'bg-indigo-400 animate-spin', label: language === 'es' ? 'Probando…' : 'Testing…' },
                                idle:     { bg: 'bg-slate-50 border-slate-100 text-slate-400',    dot: 'bg-slate-300', label: language === 'es' ? 'No probado' : 'Not tested' },
                              };
                              const s = h?.status ?? 'idle';
                              const p = pill[s] ?? pill.idle;
                              return h ? (
                                <div className={`flex items-center gap-2 px-3 py-2 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${p.bg}`}>
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${p.dot}`} />
                                  {p.label}
                                </div>
                              ) : null;
                            })()}
                            <button
                              type="button"
                              onClick={() => handleTestKey(idx, config.apiKey || '')}
                              disabled={aiHealth[idx]?.status === 'testing'}
                              className="p-4 bg-slate-50 text-slate-400 border border-slate-100 rounded-2xl hover:bg-indigo-50 hover:text-indigo-500 hover:border-indigo-200 transition-all group/test disabled:opacity-50 disabled:cursor-not-allowed"
                              title={t[language].settings.ai.test}
                            >
                              <RefreshCw className={`w-5 h-5 transition-transform duration-500 ${aiHealth[idx]?.status === 'testing' ? 'animate-spin' : 'group-hover/test:rotate-180'}`} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const newConfigs = (settings.aiConfigs || []).filter((_, i) => i !== idx);
                                setSettings({ ...settings, aiConfigs: newConfigs });
                              }}
                              className="p-4 bg-slate-50 text-slate-400 border border-slate-100 rounded-2xl hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200 transition-all"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const newConfigs = [...(settings.aiConfigs || [])];
                      newConfigs.push({
                        name: `AI Key ${newConfigs.length + 1}`,
                        provider: "studio",
                        apiKey: "",
                        status: "active",
                        type: "text"
                      });
                      setSettings({ ...settings, aiConfigs: newConfigs });
                    }}
                    className="w-full py-6 md:py-8 border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-400 font-black uppercase tracking-widest hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all duration-300 flex flex-col items-center justify-center gap-3"
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                      <Plus className="w-6 h-6" />
                    </div>
                    <span className="text-xs">{t[language].settings.ai.add}</span>
                  </button>

                  <div className="p-6 bg-slate-900 rounded-[2rem] border border-slate-800 text-slate-400 flex items-start gap-4 shadow-2xl shadow-slate-900/40 translate-y-2">
                    <ShieldCheck className="w-6 h-6 text-indigo-400 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="text-white font-black uppercase tracking-tighter mb-1">
                        Seguridad de Claves (Protocolo Antigravity)
                      </p>
                      <p className="leading-relaxed font-medium">
                        {language === "es" 
                          ? "Las claves se cifran en tránsito. El motor de rotación selecciona automáticamente la clave con menor carga y mayor probabilidad de éxito para cada petición. Evita usar la misma clave en múltiples despliegues para prevenir el Rate Limiting (429)."
                          : "Keys are encrypted in transit. The rotation engine automatically selects the key with the lowest load and highest success probability for each request. Avoid using the same key across multiple deployments to prevent Rate Limiting (429)."}
                      </p>
                    </div>
                  </div>
                </div>
              </section>}

              {/* MarTech Measurement Configuration Section */}
              <section className="space-y-6">
                <div className="flex items-center space-x-4 mb-8">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                    <Globe className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                      {language === "es" ? "Medición & MarTech" : "Measurement & MarTech"}
                    </h3>
                    {activeProfile ? (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-black uppercase tracking-widest border border-emerald-200">
                           {language === "es" ? "Configuración de Perfil" : "Profile Configuration"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                          {activeProfile.name || activeProfile.brandName || "Sin Nombre"}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-black uppercase tracking-widest border border-slate-200 mt-1 inline-block">
                        {language === "es" ? "Configuración Global" : "Global Configuration"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-8 md:p-10 bg-slate-50 rounded-[3rem] border border-slate-200 space-y-10">
                  {/* Master Switch */}
                  <div className="flex items-center justify-between p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
                    <div>
                      <p className="font-black text-slate-900 text-sm uppercase tracking-wider">
                        {language === "es" ? "Activar Medición" : "Enable Measurement"}
                      </p>
                      <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mt-1">
                        {language === "es" ? "Activa GTM, Meta Pixel y TikTok CAPI" : "Enables GTM, Meta Pixel, and TikTok CAPI"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const target = activeProfile || settings;
                        const newConfig = { 
                          ...(target.martechConfig || { enabled: false }), 
                          enabled: !target.martechConfig?.enabled 
                        };
                        
                        if (activeProfile) {
                          setActiveProfile({ ...activeProfile, martechConfig: newConfig });
                        } else {
                          setSettings({ ...settings, martechConfig: newConfig });
                        }
                      }}
                      className={`w-14 h-8 rounded-full relative p-1 transition-all ${(activeProfile?.martechConfig?.enabled ?? settings.martechConfig?.enabled) ? "bg-emerald-500" : "bg-slate-300"}`}
                    >
                      <div className={`w-6 h-6 bg-white rounded-full shadow transition-all ${(activeProfile?.martechConfig?.enabled ?? settings.martechConfig?.enabled) ? "translate-x-6" : "translate-x-0"}`} />
                    </button>
                  </div>

                  <div className={`grid md:grid-cols-2 gap-8 transition-all ${(activeProfile?.martechConfig?.enabled ?? settings.martechConfig?.enabled) ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
                    {/* GTM */}
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        Google Tag Manager ID
                      </label>
                      <input
                        type="text"
                        placeholder="GTM-XXXXXXX"
                        value={(activeProfile?.martechConfig?.gtmId ?? settings.martechConfig?.gtmId) || ""}
                        onChange={(e) => {
                          const target = activeProfile || settings;
                          const newConfig = { ...target.martechConfig, gtmId: e.target.value };
                          if (activeProfile) setActiveProfile({ ...activeProfile, martechConfig: newConfig });
                          else setSettings({ ...settings, martechConfig: newConfig });
                        }}
                        className="w-full bg-white border border-slate-200 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Meta pixel */}
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        Meta Pixel ID
                      </label>
                      <input
                        type="text"
                        placeholder="1234567890"
                        value={(activeProfile?.martechConfig?.metaPixelId ?? settings.martechConfig?.metaPixelId) || ""}
                        onChange={(e) => {
                          const target = activeProfile || settings;
                          const newConfig = { ...target.martechConfig, metaPixelId: e.target.value };
                          if (activeProfile) setActiveProfile({ ...activeProfile, martechConfig: newConfig });
                          else setSettings({ ...settings, martechConfig: newConfig });
                        }}
                        className="w-full bg-white border border-slate-200 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Meta Precision (CAPI Tooling) */}
                    <div className="space-y-3 md:col-span-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        Meta Conversion API Access Token
                      </label>
                      <input
                        type="password"
                        placeholder="EAAB..."
                        value={(activeProfile?.martechConfig?.metaAccessToken ?? settings.martechConfig?.metaAccessToken) || ""}
                        onChange={(e) => {
                          const target = activeProfile || settings;
                          const newConfig = { ...target.martechConfig, metaAccessToken: e.target.value };
                          if (activeProfile) setActiveProfile({ ...activeProfile, martechConfig: newConfig });
                          else setSettings({ ...settings, martechConfig: newConfig });
                        }}
                        className="w-full bg-white border border-slate-200 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-indigo-500"
                      />
                    </div>

                     {/* TikTok */}
                     <div className="space-y-3">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        TikTok Pixel Code
                      </label>
                      <input
                        type="text"
                        placeholder="C80..."
                        value={(activeProfile?.martechConfig?.tiktokPixelId ?? settings.martechConfig?.tiktokPixelId) || ""}
                        onChange={(e) => {
                          const target = activeProfile || settings;
                          const newConfig = { ...target.martechConfig, tiktokPixelId: e.target.value };
                          if (activeProfile) setActiveProfile({ ...activeProfile, martechConfig: newConfig });
                          else setSettings({ ...settings, martechConfig: newConfig });
                        }}
                        className="w-full bg-white border border-slate-200 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        TikTok Events API Access Token
                      </label>
                      <input
                        type="password"
                        placeholder="TTA..."
                        value={(activeProfile?.martechConfig?.tiktokAccessToken ?? settings.martechConfig?.tiktokAccessToken) || ""}
                        onChange={(e) => {
                          const target = activeProfile || settings;
                          const newConfig = { ...target.martechConfig, tiktokAccessToken: e.target.value };
                          if (activeProfile) setActiveProfile({ ...activeProfile, martechConfig: newConfig });
                          else setSettings({ ...settings, martechConfig: newConfig });
                        }}
                        className="w-full bg-white border border-slate-200 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  
                  {activeProfile && (
                    <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-3xl flex items-start gap-4">
                      <AlertCircle className="w-5 h-5 text-indigo-500 mt-0.5" />
                      <div className="text-xs">
                        <p className="text-indigo-900 font-bold uppercase tracking-tight mb-1">
                          {language === "es" ? "Prioridad de Configuración" : "Configuration Priority"}
                        </p>
                        <p className="text-indigo-700/70 leading-relaxed font-medium">
                          {language === "es" 
                            ? "Estás editando la configuración para un perfil específico. Estos valores sobrescribirán los valores globales de la plataforma para este cliente."
                            : "You are editing the configuration for a specific profile. These values will override the global platform values for this client."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Modo Mantenimiento Global */}
              <section className="space-y-6">
                <div className="flex items-center space-x-4 mb-8">
                  <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{t[language].settings.maintenance.title}</h3>
                </div>
                <div className="p-8 bg-amber-50 rounded-[2rem] border border-amber-200 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-slate-900 text-sm uppercase tracking-wider">{t[language].settings.maintenance.activate}</p>
                      <p className="text-slate-500 text-xs mt-1">
                        {language === "es" 
                          ? "Cuando está activo, todos los usuarios no-admin ven la pantalla de Coming Soon. El cambio es inmediato y global para todos los dispositivos."
                          : "When active, all non-admin users will see the Coming Soon screen. The change is immediate and global across all devices."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSettings({
                          ...settings,
                          maintenanceMode: !settings.maintenanceMode,
                        })
                      }
                      className={`w-14 h-8 rounded-full transition-all relative ${settings.maintenanceMode ? "bg-amber-500" : "bg-slate-300"}`}
                    >
                      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
                      <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-all shadow-md ${settings.maintenanceMode ? "translate-x-6" : "translate-x-0"}`} />
                    </button>
                  </div>
                  {settings.maintenanceMode && (
                    <div className="p-4 bg-amber-100 rounded-2xl border border-amber-300 flex gap-3 items-start">
                      <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <p className="text-amber-800 text-xs font-bold">
                        {language === "es" 
                          ? "PLATAFORMA EN MANTENIMIENTO — Los usuarios no-admin verán la pantalla de Coming Soon inmediatamente."
                          : "PLATFORM UNDER MAINTENANCE — Non-admin users will see the Coming Soon screen immediately."}
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {/* Payments — managed via Netlify env vars */}
              <section className="space-y-6">
                <div className="flex items-center space-x-4 mb-8">
                  <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{t[language].settings.payments.title}</h3>
                </div>
                <div className="p-6 md:p-8 bg-slate-50 rounded-3xl md:rounded-[2rem] border border-slate-200 flex flex-col md:flex-row gap-4 items-start">
                  <svg className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-black text-slate-900 text-sm uppercase tracking-wider mb-1">{t[language].settings.payments.managed}</p>
                    <p className="text-slate-500 text-xs md:text-sm leading-relaxed">
                      {language === "es" 
                        ? "Las claves de Stripe (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET) se gestionan mediante variables de entorno en Netlify. Los planes de suscripción se configuran directamente en el dashboard de Stripe."
                        : "Stripe keys (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET) are managed via environment variables in Netlify. Subscription plans are configured directly in the Stripe dashboard."}
                    </p>
                    <div className="flex flex-wrap gap-2 md:gap-3 mt-3">
                      <a href="https://app.netlify.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-[11px] md:text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-500 transition-colors">Netlify ↗</a>
                      <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-[11px] md:text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-700 transition-colors">Stripe ↗</a>
                    </div>
                  </div>
                </div>
              </section>
              {/* Feature Flags Configuration Section */}
              <section className="space-y-6">
                <div className="flex items-center space-x-4 mb-8">
                  <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center text-white">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                    {t[language].settings.features.title}
                  </h3>
                </div>

                <div className="p-10 bg-slate-50 rounded-[3rem] border border-slate-200">
                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Initialize features if undefined to prevent crash */}
                    {Object.entries(
                      settings.features || {
                        competitorAnalysis: true,
                        imageAnalysis: true,
                        videoAnalysis: true,
                        metrics: true,
                        trafficAnalysis: true,
                        brandIdentity: true,
                        campaignsOptimizer: true,
                        compareCreatives: true,
                        searchResultAudit: true,
                        glossary: true,
                        blog: true,
                        enableAutoTrends: false,
                      },
                    ).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between p-6 bg-white rounded-2xl border border-slate-100 shadow-sm"
                      >
                        <div>
                          <p className="font-black text-slate-900 capitalize">
                            {language === "es" ? {
                              competitorAnalysis: "Auditoría de Competidores (SEO)",
                              imageAnalysis: "Auditoría Creativa (Imagen AI)",
                              videoAnalysis: "Auditoría Creativa (Video AI)",
                              metrics: "Dashboard de Métricas",
                              trafficAnalysis: "Análisis de Tráfico & SEO",
                              brandIdentity: "Brand Guardian (Identidad)",
                              campaignsOptimizer: "Google Ads Optimizer",
                              compareCreatives: "Comparación A/B Creatividades",
                              searchResultAudit: "Auditoría Search Result",
                              glossary: "Glosario de Términos",
                              blog: "Blog / CMS",
                              enableAutoTrends: "Auto-Sincronización de Tendencias",
                            }[key] || key.replace(/([A-Z])/g, " $1").trim() : {
                              competitorAnalysis: "Competitor Audit (SEO)",
                              imageAnalysis: "Creative Audit (Image AI)",
                              videoAnalysis: "Creative Audit (Video AI)",
                              metrics: "Metrics Dashboard",
                              trafficAnalysis: "Traffic & SEO Analysis",
                              brandIdentity: "Brand Guardian (Identity)",
                              campaignsOptimizer: "Google Ads Optimizer",
                              compareCreatives: "A/B Creative Comparison",
                              searchResultAudit: "Search Result Audit",
                              glossary: "Glossary of Terms",
                              blog: "Blog / CMS",
                              enableAutoTrends: "Auto-Trend Synchronization",
                            }[key] || key.replace(/([A-Z])/g, " $1").trim()}
                          </p>
                          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                            {language === "es" ? "Módulo del Sistema" : "System Module"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setSettings({
                              ...settings,
                              features: {
                                ...(settings.features || {}),
                                [key]: !value,
                              } as any,
                            })
                          }
                          className={`w-14 h-8 rounded-full relative p-1 transition-all ${value ? "bg-emerald-500" : "bg-slate-300"}`}
                        >
                          <div
                            className={`w-6 h-6 bg-white rounded-full shadow transition-all ${value ? "translate-x-6" : "translate-x-0"}`}
                          ></div>
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-6 text-center font-medium">
                    <span className="text-rose-500 font-bold">* {language === "es" ? "Nota" : "Note"}:</span>{" "}
                    {language === "es" 
                      ? "Desactivar un módulo lo ocultará para todos los usuarios inmediatamente."
                      : "Disabling a module will hide it for all users immediately."}
                  </p>
                </div>
              </section>

              {/* Coming Soon Configuration Section */}
              <section className="space-y-6">
                <div className="flex items-center space-x-4 mb-8">
                  <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                    {t[language].settings.comingSoon.title}
                  </h3>
                </div>

                <div className="p-10 bg-slate-50 rounded-[3rem] border border-slate-200 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-black text-slate-500 uppercase tracking-widest">
                        {t[language].settings.comingSoon.activate}
                      </span>
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        {language === "es" 
                          ? "Ocultará el acceso al checkout y mostrará el aviso en los planes."
                          : "Hides checkout access and displays the notice on plans."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSettings({
                          ...settings,
                          comingSoon: {
                            ...(settings.comingSoon || {
                              enabled: false,
                              message:
                                language === "es" ? "¡Próximamente! Estamos preparando nuevos planes." : "Coming Soon! We are preparing new plans.",
                            }),
                            enabled: !settings.comingSoon?.enabled,
                          },
                        })
                      }
                      className={`w-14 h-8 rounded-full relative p-1 transition-all ${settings.comingSoon?.enabled ? "bg-amber-500" : "bg-slate-300"}`}
                    >
                      <div
                        className={`w-6 h-6 bg-white rounded-full shadow transition-all ${settings.comingSoon?.enabled ? "translate-x-6" : "translate-x-0"}`}
                      ></div>
                    </button>
                  </div>

                  <div
                    className={`space-y-3 transition-all duration-300 ${settings.comingSoon?.enabled ? "opacity-100" : "opacity-40 pointer-events-none"}`}
                  >
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                      {t[language].settings.comingSoon.messageLabel}
                    </label>
                    <textarea
                      value={settings.comingSoon?.message || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          comingSoon: {
                            ...(settings.comingSoon || {
                              enabled: false,
                              message: "",
                            }),
                            message: e.target.value,
                          },
                        })
                      }
                      className="w-full bg-white border border-slate-200 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-amber-500 min-h-[100px]"
                      placeholder={language === "es" ? "Ej: Estamos actualizando nuestros sistemas de pago. Volvemos en unas horas..." : "Ex: We are updating our payment systems. Back in a few hours..."}
                    />
                  </div>
                </div>
              </section>

              {/* Trial Configuration Section */}
              <section className="space-y-6">
                <div className="flex items-center space-x-4 mb-8">
                  <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                    {t[language].settings.trial.title}
                  </h3>
                </div>

                <div className="p-10 bg-slate-50 rounded-[3rem] border border-slate-200">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        {t[language].settings.trial.tokens}
                      </label>
                      <input
                        type="number"
                        value={settings.trialTokens}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            trialTokens: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full bg-white border border-slate-200 rounded-xl py-4 px-6 text-sm font-bold outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        {t[language].settings.trial.days}
                      </label>
                      <input
                        type="number"
                        value={settings.trialDays}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            trialDays: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full bg-white border border-slate-200 rounded-xl py-4 px-6 text-sm font-bold outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Pricing Configuration Section */}
              <section className="space-y-6">
                <div className="flex items-center space-x-4 mb-8">
                  <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                    {t[language].settings.pricing.title}
                  </h3>
                </div>

                {/* Feature Control Matrix */}
                <div className="mb-8 p-8 bg-slate-50 rounded-[3rem] border border-slate-200 overflow-x-auto">
                  <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
                    {t[language].settings.pricing.matrix}
                    <span className="text-[11px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded font-bold uppercase">
                      Beta
                    </span>
                  </h4>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">
                          {t[language].settings.pricing.module}
                        </th>
                        {(["Starter", "Growth", "Agency"] as const).map(
                          (plan) => (
                            <th
                              key={plan}
                              className="py-4 text-center text-[11px] font-black uppercase tracking-widest text-slate-900"
                            >
                              {plan}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Object.keys(settings.features || {}).map(
                        (featureKey) => {
                          const featureNameMap: Record<string, string> = {
                            competitorAnalysis: "Auditoría de Competidores (SEO)",
                            imageAnalysis: "Auditoría Creativa (Imagen AI)",
                            videoAnalysis: "Auditoría Creativa (Video AI)",
                            metrics: "Dashboard de Métricas",
                            trafficAnalysis: "Análisis de Tráfico & SEO",
                            brandIdentity: "Brand Guardian (Identidad)",
                            campaignsOptimizer: "Google Ads Optimizer",
                            compareCreatives: "Comparación A/B Creatividades",
                            searchResultAudit: "Auditoría Search Result",
                            glossary: "Glosario de Términos",
                            blog: "Blog / CMS",
                            default: featureKey
                              .replace(/([A-Z])/g, " $1")
                              .trim(),
                          };

                          const featureString =
                            featureNameMap[featureKey] ||
                            featureNameMap.default;

                          return (
                            <tr
                              key={featureKey}
                              className="hover:bg-white transition-colors"
                            >
                              <td className="py-4 font-bold text-slate-700 capitalize text-xs">
                                {featureString}
                              </td>
                              {(["Starter", "Growth", "Agency"] as const).map(
                                (plan) => {
                                  const featuresList =
                                    settings.pricing[plan].features || [];
                                  const isEnabled = featuresList.some((f) =>
                                    f
                                      .toLowerCase()
                                      .includes(featureString.toLowerCase()),
                                  );

                                  return (
                                    <td key={plan} className="py-4 text-center">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const currentFeatures = [
                                            ...(settings.pricing[plan]
                                              .features || []),
                                          ];
                                          let newFeatures;
                                          if (isEnabled) {
                                            newFeatures =
                                              currentFeatures.filter(
                                                (f) =>
                                                  !f
                                                    .toLowerCase()
                                                    .includes(
                                                      featureString.toLowerCase(),
                                                    ),
                                              );
                                          } else {
                                            newFeatures = [
                                              ...currentFeatures,
                                              featureString,
                                            ];
                                          }

                                          setSettings((prev) => ({
                                            ...prev,
                                            pricing: {
                                              ...prev.pricing,
                                              [plan]: {
                                                ...prev.pricing[plan],
                                                features: newFeatures,
                                              },
                                            },
                                          }));
                                        }}
                                        className={`w-10 h-6 rounded-full relative p-0.5 transition-all ${isEnabled ? "bg-indigo-500" : "bg-slate-200"}`}
                                      >
                                        <div
                                          className={`w-5 h-5 bg-white rounded-full shadow transition-all ${isEnabled ? "translate-x-4" : "translate-x-0"}`}
                                        ></div>
                                      </button>
                                    </td>
                                  );
                                },
                              )}
                            </tr>
                          );
                        },
                      )}
                    </tbody>
                  </table>
                  <p className="text-[11px] text-slate-400 mt-4 italic">
                    * {language === "es" 
                      ? "Al activar/desactivar aquí, se actualiza automáticamente la lista de características visible en el checkout y se controla el acceso (requiere implementación en lógica de bloqueo)."
                      : "Toggling here automatically updates the visible features in the checkout and controls access (requires implementation in locking logic)."}
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                  {(["Starter", "Growth", "Agency"] as const).map((plan) => (
                    <div
                      key={plan}
                      className={`p-6 md:p-10 rounded-3xl md:rounded-[3.5rem] border bg-white shadow-xl hover:shadow-2xl transition-all relative overflow-hidden group flex flex-col ${
                        plan === "Growth"
                          ? "border-primary/30"
                          : "border-slate-100"
                      }`}
                    >
                      {/* Decorative Background for Card Header */}
                      <div
                        className={`absolute top-0 left-0 w-full h-2 ${
                          plan === "Starter"
                            ? "bg-slate-400"
                            : plan === "Growth"
                              ? "bg-gradient-to-r from-primary to-purple-500"
                              : "bg-slate-950"
                        }`}
                      />

                      <div className="flex justify-between items-start mb-8">
                        <h4
                          className={`text-xl font-black uppercase tracking-tighter ${
                            plan === "Growth"
                              ? "text-primary"
                              : "text-slate-900"
                          }`}
                        >
                          Plan {plan}
                        </h4>
                        {plan === "Starter" && (
                          <span className="text-[11px] bg-slate-100 text-slate-500 px-3 py-1 rounded-full font-black uppercase tracking-widest border border-slate-200">
                            Suscripción / Trial
                          </span>
                        )}
                        {plan === "Growth" && (
                          <span className="text-[11px] bg-primary/10 text-primary px-3 py-1 rounded-full font-black uppercase tracking-widest border border-rose-200">
                            Most Popular
                          </span>
                        )}
                      </div>

                      <div className="space-y-6 flex-1">
                        <div className="grid grid-cols-1 gap-6">
                          <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                              <span>{t[language].settings.pricing.monthly}</span>
                              <span className="text-slate-300 font-bold">
                                $USD
                              </span>
                            </label>
                            <div className="relative group/input">
                              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm transition-colors group-focus-within/input:text-primary">
                                $
                              </span>
                              <input
                                type="number"
                                value={settings.pricing?.[plan]?.monthly ?? 0}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setSettings((prev) => ({
                                    ...prev,
                                    pricing: {
                                      ...prev.pricing,
                                      [plan]: {
                                        ...prev.pricing[plan],
                                        monthly: val,
                                      },
                                    },
                                  }));
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-5 pl-10 pr-6 text-sm font-black outline-none focus:border-primary focus:bg-white transition-all shadow-sm"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                              <span>{t[language].settings.pricing.yearly}</span>
                              <span className="text-slate-300 font-bold">
                                $USD Total
                              </span>
                            </label>
                            <div className="relative group/input">
                              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm transition-colors group-focus-within/input:text-primary">
                                $
                              </span>
                              <input
                                type="number"
                                value={settings.pricing?.[plan]?.yearly ?? 0}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setSettings((prev) => ({
                                    ...prev,
                                    pricing: {
                                      ...prev.pricing,
                                      [plan]: {
                                        ...prev.pricing[plan],
                                        yearly: val,
                                      },
                                    },
                                  }));
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-5 pl-10 pr-6 text-sm font-black outline-none focus:border-primary focus:bg-white transition-all shadow-sm"
                              />
                            </div>
                            {settings.pricing?.[plan]?.monthly > 0 && (
                              <p className="text-[11px] text-slate-400 mt-1 italic">
                                {language === "es" ? "Sugerencia (20% off): $" : "Suggestion (20% off): $"}
                                {(
                                  settings.pricing[plan].monthly *
                                  12 *
                                  0.8
                                ).toFixed(0)}{" "}
                                {language === "es" ? "total / año" : "total / year"}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-slate-100">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                            <span>{language === "es" ? "Características del Plan" : "Plan Features"}</span>
                            <span className="text-[11px] bg-indigo-50 text-indigo-400 px-2 py-0.5 rounded uppercase font-black">
                              {language === "es" ? "Uno por línea" : "One per line"}
                            </span>
                          </label>
                          <textarea
                            rows={6}
                            value={
                              settings.pricing?.[plan]?.features.join("\n") ??
                              ""
                            }
                            onChange={(e) => {
                              const features = e.target.value
                                .split("\n")
                                .filter((f) => f.trim() !== "");
                              setSettings((prev) => ({
                                ...prev,
                                pricing: {
                                  ...prev.pricing,
                                  [plan]: {
                                    ...prev.pricing[plan],
                                    features,
                                  },
                                },
                              }));
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-[13px] font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all resize-none shadow-sm leading-relaxed text-slate-600"
                            placeholder={language === "es" ? "Logos ilimitados\\nReportes PDF..." : "Unlimited logos\\nPDF Reports..."}
                          />
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-bold uppercase tracking-tighter">
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            {language === "es" ? "Visible en Checkout" : "Visible at Checkout"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="sticky bottom-0 p-8 bg-white/90 backdrop-blur border-t border-slate-100 flex items-center justify-between">
                {saveSuccess && (
                  <p className="text-emerald-500 font-black text-[11px] uppercase tracking-widest animate-in slide-in-from-left-4">
                    ✓ {t[language].settings.success}
                  </p>
                )}
                <button
                  type="submit"
                  className="ml-auto bg-slate-900 text-white px-12 py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-indigo-600 transition-all active:scale-95"
                >
                  {t[language].settings.save}
                </button>
              </div>
            </form>
          </div>
          )}
        </div>
        {/* Invitation Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-white rounded-3xl md:rounded-[2.5rem] shadow-2xl overflow-hidden">
              <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                  {t[language].modals.invite.title}
                </h3>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="p-3 hover:bg-primary hover:text-white hover:border-primary rounded-2xl transition-all text-slate-400"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await authService.inviteUser(
                    inviteForm.email,
                    inviteForm.role,
                    inviteForm.plan,
                  );
                  if (res.success) {
                    alert(language === "es" ? "Invitación enviada exitosamente" : "Invitation sent successfully");
                    setShowInviteModal(false);
                    setRefreshTrigger((prev) => prev + 1);
                  } else {
                    alert(res.message);
                  }
                }}
                className="p-8 space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    {t[language].modals.invite.email}
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteForm.email}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, email: e.target.value })
                    }
                    placeholder="usuario@dominio.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 text-sm font-bold outline-none focus:border-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                      {t[language].modals.invite.role}
                    </label>
                    <select
                      value={inviteForm.role}
                      onChange={(e) =>
                        setInviteForm({
                          ...inviteForm,
                          role: e.target.value as any,
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 text-sm font-bold outline-none focus:border-primary"
                    >
                      <option value="user">{t[language].users.actions.trial}</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                      {t[language].modals.invite.plan}
                    </label>
                    <select
                      value={inviteForm.plan}
                      onChange={(e) =>
                        setInviteForm({
                          ...inviteForm,
                          plan: e.target.value as any,
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 text-sm font-bold outline-none focus:border-primary"
                    >
                      <option value="Starter">Starter</option>
                      <option value="Growth">Growth</option>
                      <option value="Agency">Agency</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-primary transition-all"
                >
                  {language === "es" ? "Enviar Invitación" : "Send Invitation"}
                </button>
              </form>
            </div>
          </div>
        )}
        {/* Subscription Management Modal */}
        {editingSubscriptionUser && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-white rounded-3xl md:rounded-[2.5rem] shadow-2xl overflow-hidden">
              <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                  {t[language].modals.subscription.title}
                </h3>
                <button
                  onClick={() => setEditingSubscriptionUser(null)}
                  className="p-3 hover:bg-primary hover:text-white hover:border-primary rounded-2xl transition-all text-slate-400"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="p-6 md:p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    {t[language].users.actions.history} {/* Reusing 'History' key contextually or simple 'User' label */}
                    {language === "es" ? " Usuario" : " User"}
                  </label>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 text-sm font-bold text-slate-700">
                    {editingSubscriptionUser.email}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    {language === "es" ? "Plan Actual" : "Current Plan"}
                  </label>
                  <select
                    value={editingSubscriptionUser.subscription.plan}
                    onChange={(e) => {
                      const updatedUser = {
                        ...editingSubscriptionUser,
                        subscription: {
                          ...editingSubscriptionUser.subscription,
                          plan: e.target.value as any,
                        },
                      };
                      authService.updateUserSubscription(
                        editingSubscriptionUser.id,
                        { plan: e.target.value as any },
                      );
                      setEditingSubscriptionUser(updatedUser);
                      setRefreshTrigger((prev) => prev + 1);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 text-sm font-bold outline-none focus:border-primary"
                  >
                    <option value="Starter">Starter</option>
                    <option value="Growth">Growth</option>
                    <option value="Agency">Agency</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    {t[language].modals.subscription.status}
                  </label>
                  <select
                    value={editingSubscriptionUser.subscription.status}
                    onChange={(e) => {
                      const updatedUser = {
                        ...editingSubscriptionUser,
                        subscription: {
                          ...editingSubscriptionUser.subscription,
                          status: e.target.value as any,
                        },
                      };
                      authService.updateUserSubscription(
                        editingSubscriptionUser.id,
                        { status: e.target.value as any },
                      );
                      setEditingSubscriptionUser(updatedUser);
                      setRefreshTrigger((prev) => prev + 1);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 text-sm font-bold outline-none focus:border-primary"
                  >
                    <option value="active">{language === "es" ? "Activo" : "Active"}</option>
                    <option value="cancelled">{language === "es" ? "Cancelado" : "Cancelled"}</option>
                    <option value="expired">{language === "es" ? "Expirado" : "Expired"}</option>
                  </select>
                </div>
                <button
                  onClick={() => setEditingSubscriptionUser(null)}
                  className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-primary transition-all"
                >
                  {language === "es" ? "Cerrar" : "Close"}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Usage Limit Edit Modal */}
        {editingLimitUser && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-white rounded-3xl md:rounded-[2.5rem] shadow-2xl overflow-hidden">
              <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                  {t[language].modals.limit.title}
                </h3>
                <button
                  onClick={() => setEditingLimitUser(null)}
                  className="p-3 hover:bg-primary hover:text-white hover:border-primary rounded-2xl transition-all text-slate-400"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const limitValue = parseInt(newLimit);
                  if (!isNaN(limitValue) && limitValue >= 0) {
                    await authService.updateUsageLimit(
                      editingLimitUser.id,
                      limitValue,
                    );
                    setEditingLimitUser(null);
                    setRefreshTrigger((prev) => prev + 1);
                  } else {
                    alert(language === "es" ? "Por favor ingresa un número válido" : "Please enter a valid number");
                  }
                }}
                className="p-8 space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    {language === "es" ? "Usuario" : "User"}
                  </label>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 text-sm font-bold text-slate-700">
                    {editingLimitUser.email}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    {language === "es" ? "Límite de Tokens" : "Token Limit"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={newLimit}
                    onChange={(e) => setNewLimit(e.target.value)}
                    placeholder="Ej: 1000000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 text-sm font-bold outline-none focus:border-primary"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    {language === "es" ? "Límite actual: " : "Current limit: "}
                    {editingLimitUser.usageLimit?.toLocaleString() || 0} tokens
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingLimitUser(null)}
                    className="flex-1 bg-slate-200 text-slate-700 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-300 transition-all"
                  >
                    {language === "es" ? "Cancelar" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-slate-900 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-primary transition-all"
                  >
                    {language === "es" ? "Guardar" : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* History Modal */}
        {selectedUserHistory && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center space-x-4">
                  <img
                    src={selectedUserHistory.picture}
                    className="w-12 h-12 rounded-xl"
                    alt=""
                  />
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                      {t[language].modals.history.title}: {selectedUserHistory.username}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                      Total:{" "}
                      {(
                        selectedUserHistory.totalTokensUsed || 0
                      ).toLocaleString()}{" "}
                      / {language === "es" ? "Límite: " : "Limit: "}
                      {(selectedUserHistory.usageLimit || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUserHistory(null)}
                  className="p-3 hover:bg-primary hover:text-white hover:border-primary rounded-2xl transition-all text-slate-400 hover:text-rose-500"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8">
                {!selectedUserHistory.usageHistory ||
                selectedUserHistory.usageHistory.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 text-slate-300">
                      <svg
                        className="w-8 h-8"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <p className="text-slate-400 font-bold uppercase text-[11px] tracking-widest">
                      {language === "es" ? "No hay historial de uso disponible" : "No usage history available"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedUserHistory.usageHistory.map((item) => (
                      <div
                        key={item.id}
                        className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between hover:border-indigo-100 transition-all"
                      >
                        <div className="flex items-center space-x-6">
                          <div className="text-center min-w-[80px]">
                            <p className="text-[11px] font-black text-indigo-500 uppercase tracking-widest">
                              {new Date(item.timestamp).toLocaleDateString()}
                            </p>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter">
                              {new Date(item.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900 tracking-tight">
                              {item.taskName}
                            </p>
                            {item.details && (
                              <p className="text-[11px] text-slate-500 font-medium">
                                {item.details}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-rose-500">
                            +{item.tokensUsed.toLocaleString()}
                          </p>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                            Tokens
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Credentials Edit Modal */}
        {editingCredentialsUser && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                  {language === "es" ? "Control Total de Usuario" : "Full User Control"}
                </h3>
                <button
                  onClick={() => setEditingCredentialsUser(null)}
                  className="p-3 hover:bg-primary hover:text-white hover:border-primary rounded-2xl transition-all text-slate-400"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  
                  // Validation: If password is provided, it must be at least 6 characters
                  if (credentialForm.password && credentialForm.password.length < 6) {
                    alert(language === "es" ? "La contraseña debe tener al menos 6 caracteres" : "Password must be at least 6 characters");
                    return;
                  }

                  setIsRefreshing(true);
                  
                  // Only update credentials if username is NOT empty or password is NOT empty
                  let success1 = true;
                  if (credentialForm.username !== editingCredentialsUser.username || credentialForm.password) {
                     // If password is empty, don't send it to backend to avoid overwriting with empty string
                     const updates: any = { username: credentialForm.username };
                     if (credentialForm.password) updates.password = credentialForm.password;
                     
                     success1 = await authService.updateUserCredentials(
                      editingCredentialsUser.id,
                      updates,
                    );
                  }
                  
                  const success2 = await authService.updateUser(
                    editingCredentialsUser.id,
                    userForm,
                  );

                  if (success1 && success2) {
                    alert(language === "es" ? "Datos de usuario actualizados correctamente" : "User data updated correctly");
                    setEditingCredentialsUser(null);
                    setRefreshTrigger((prev) => prev + 1);
                  } else {
                    alert(language === "es" ? "Error al actualizar datos. Verifica la conexión o el backend." : "Error updating data. Check connection or backend.");
                  }
                  setIsRefreshing(false);
                }}
                className="p-8 space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    {language === "es" ? "Usuario (ID)" : "User (ID)"}
                  </label>
                  <input
                    type="text"
                    value={credentialForm.username}
                    onChange={(e) =>
                      setCredentialForm({
                        ...credentialForm,
                        username: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 text-sm font-bold outline-none focus:border-[#ff477b] text-slate-900"
                    placeholder={language === "es" ? "Nombre de usuario" : "Username"}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    {language === "es" ? "Nueva Contraseña" : "New Password"}
                  </label>
                  <input
                    type="text"
                    value={credentialForm.password}
                    onChange={(e) =>
                      setCredentialForm({
                        ...credentialForm,
                        password: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 text-sm font-bold outline-none focus:border-[#ff477b] text-slate-900"
                    placeholder={language === "es" ? "Dejar en blanco para no cambiar" : "Leave blank to keep current"}
                  />
                  <p className="text-[11px] text-slate-400 font-medium">
                    * {language === "es" ? "Si dejas este campo vacío, la contraseña no cambiará." : "If you leave this field empty, password will not change."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                      {t[language].modals.credentials.role}
                    </label>
                    <select
                      value={userForm.role}
                      onChange={(e) =>
                        setUserForm({
                          ...userForm,
                          role: e.target.value as any,
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-4 text-sm font-bold outline-none"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                      Estatus
                    </label>
                    <select
                      value={userForm.approvalStatus}
                      onChange={(e) =>
                        setUserForm({
                          ...userForm,
                          approvalStatus: e.target.value as any,
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-4 text-sm font-bold outline-none text-slate-900 shadow-sm"
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="invited">Invited</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                      {language === "es" ? "Límite de Tokens" : "Token Limit"}
                    </label>
                    <input
                      type="number"
                      value={userForm.usageLimit || 0}
                      onChange={(e) =>
                        setUserForm({
                          ...userForm,
                          usageLimit: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 text-sm font-bold outline-none focus:border-[#ff477b] text-slate-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                      {language === "es" ? "Tokens Usados" : "Tokens Used"}
                    </label>
                    <input
                      type="number"
                      value={userForm.totalTokensUsed || 0}
                      onChange={(e) =>
                        setUserForm({
                          ...userForm,
                          totalTokensUsed: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 text-sm font-bold outline-none focus:border-[#ff477b] text-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    {language === "es" ? "Plan de Suscripción" : "Subscription Plan"}
                  </label>
                  <select
                    value={userForm.subscription?.plan}
                    onChange={(e) =>
                      setUserForm({
                        ...userForm,
                        subscription: {
                          ...userForm.subscription!,
                          plan: e.target.value as any,
                        },
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 text-sm font-bold outline-none"
                  >
                    <option value="Starter">Starter</option>
                    <option value="Growth">Growth</option>
                    <option value="Agency">Agency</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    {language === "es" ? "Fecha de Vencimiento" : "Expiry Date"}
                  </label>
                  <input
                    type="date"
                    value={userForm.subscription?.expiryDate ? new Date(userForm.subscription.expiryDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      const date = new Date(e.target.value);
                      setUserForm({
                        ...userForm,
                        subscription: {
                          ...userForm.subscription!,
                          expiryDate: date.getTime(),
                        },
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 text-sm font-bold outline-none focus:border-[#ff477b] text-slate-900"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    {language === "es" ? "Días adicionales (Prórroga)" : "Additional days (Extension)"}
                  </label>
                  <div className="flex gap-2">
                    {[7, 30, 90, 365].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => {
                          const currentExpiry =
                            userForm.subscription?.expiryDate || Date.now();
                          setUserForm({
                            ...userForm,
                            subscription: {
                              ...userForm.subscription!,
                              expiryDate:
                                currentExpiry + days * 24 * 60 * 60 * 1000,
                            },
                          });
                        }}
                        className="flex-1 bg-white border border-slate-200 py-2 rounded-lg text-[11px] font-black uppercase hover:bg-[#ff477b] hover:text-white transition-all"
                      >
                        +{days}d
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingCredentialsUser(null)}
                    className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    {language === "es" ? "Cancelar" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-slate-900 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-[#ff477b] transition-all"
                  >
                    {language === "es" ? "Guardar Cambios" : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* ── Trial Period Modal ───────────────────────────── */}
        {editingTrialUser && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                  {t[language].modals.trial.title}
                </h3>
                <button
                  onClick={() => setEditingTrialUser(null)}
                  className="p-3 hover:bg-primary hover:text-white hover:border-primary rounded-2xl transition-all text-slate-400"
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
                      strokeWidth={3}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 text-sm font-bold text-slate-700">
                  {editingTrialUser.email}
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-3">
                    {language === "es" ? "Atajos rápidos" : "Quick shortcuts"}
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[3, 7, 14, 30].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setTrialDaysInput(String(days))}
                        className={`py-3 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all ${
                          trialDaysInput === String(days)
                            ? "bg-purple-500 text-white border-purple-400"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:border-purple-300"
                        }`}
                      >
                        {days}d
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    {language === "es" ? "Días personalizados" : "Custom days"}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={trialDaysInput}
                    onChange={(e) => setTrialDaysInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 text-sm font-bold outline-none focus:border-purple-500"
                  />
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">
                    {language === "es" ? "Vencimiento: " : "Expiry: "}
                    {new Date(
                      Date.now() + Number(trialDaysInput || 0) * 86400000,
                    ).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingTrialUser(null)}
                    className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    {language === "es" ? "Cancelar" : "Cancel"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleSetTrial(
                        editingTrialUser.id,
                        Number(trialDaysInput) || 7,
                      )
                    }
                    className="flex-1 bg-purple-600 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-purple-500/20 hover:bg-purple-700 transition-all"
                  >
                    {language === "es" ? "Aplicar Trial" : "Apply Trial"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* ── Delete User Confirmation Modal ────────────────── */}
        {confirmDeleteUser && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden">
              <div className="p-8 border-b border-rose-100 bg-rose-50 flex items-center gap-4">
                <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-6 h-6 text-rose-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-black text-rose-800 uppercase tracking-tighter">
                    {t[language].modals.delete.title}
                  </h3>
                  <p className="text-[11px] text-rose-500 font-bold uppercase tracking-widest">
                    {language === "es" ? "Acción irreversible" : "Irreversible action"}
                  </p>
                </div>
              </div>
              <div className="p-8 space-y-6">
                <p className="text-sm text-slate-700 font-bold text-center">
                  {language === "es" ? "¿Estás seguro de que deseas eliminar a " : "Are you sure you want to delete "}
                  <span className="text-rose-600">
                    {confirmDeleteUser.username}
                  </span>
                  ?
                </p>
                <div className="bg-rose-50 border border-rose-100 rounded-xl py-3 px-5 text-center text-[11px] font-bold text-rose-500 uppercase tracking-wide">
                  {confirmDeleteUser.email}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteUser(null)}
                    className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    {language === "es" ? "Cancelar" : "Cancel"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteUser(confirmDeleteUser.id)}
                    className="flex-1 bg-rose-600 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-rose-500/20 hover:bg-rose-700 transition-all"
                  >
                    {language === "es" ? "Eliminar" : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;

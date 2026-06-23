import React, { useState, useEffect, useCallback } from "react";
import { authService } from "../services/authService";
import { martechService } from "../services/martechService";
import { AuthUser } from "../types";
import PrivacyPolicy from "./PrivacyPolicy";
import TermsOfService from "./TermsOfService";
import LogoIsotype from "./LogoIsotype";
import { Language } from "../types";
import { turnstileService } from "../services/auth/turnstileService";

// Use the Turnstile site key from environment variables
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";


import Toast, { ToastData, ToastType } from "./Toast";

// ─────────────────────────────────────────────
// Mail Sent Hero Card
// ─────────────────────────────────────────────
const MailSentCard: React.FC<{
  email: string;
  countdown: number;
  title: string;
  subtitle: string;
  onNext: () => void;
}> = ({ email, countdown, title, subtitle, onNext }) => {
  const maskedEmail = email
    ? `${email.substring(0, 3)}***@${email.split("@")[1] ?? "..."}`
    : "tu correo";

  return (
    <div className="text-center py-4 animate-in fade-in zoom-in-95 duration-500">
      {/* Animated envelope */}
      <div className="relative inline-flex items-center justify-center w-28 h-28 mb-8">
        <div className="absolute inset-0 bg-violet-500/10 rounded-full animate-ping" style={{ animationDuration: "2s" }} />
        <div className="relative w-20 h-20 bg-gradient-to-br from-violet-500/20 to-indigo-500/10 border border-violet-500/30 rounded-2xl flex items-center justify-center"
          style={{ animation: "mailFloat 3s ease-in-out infinite" }}>
          <svg className="w-10 h-10 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
      </div>

      <h2 className="text-2xl font-black text-white mb-3">{title}</h2>
      <p className="text-white/50 text-sm leading-relaxed mb-2">{subtitle}</p>
      <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2 mb-8">
        <span className="text-violet-400 font-mono text-xs font-bold">✉</span>
        <span className="text-white/70 text-sm font-medium">{maskedEmail}</span>
      </div>

      <div className="w-full bg-white/5 rounded-full h-1 mb-4 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-[#ff477b] rounded-full"
          style={{ animation: `shrink ${countdown * 1000}ms linear forwards` }}
        />
      </div>
      <p className="text-white/30 text-xs font-bold uppercase tracking-widest mb-6">
        Continuando en {countdown}s...
      </p>
      <button
        onClick={onNext}
        className="text-[#ff477b] text-sm font-black uppercase tracking-widest hover:text-[#ff5d8b] transition-colors"
      >
        Continuar ahora →
      </button>
      <style>{`@keyframes mailFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }`}</style>
    </div>
  );
};

// ─────────────────────────────────────────────
// Reset Success Card  
// ─────────────────────────────────────────────
const ResetSuccessCard: React.FC<{ countdown: number; onLogin: () => void }> = ({ countdown, onLogin }) => (
  <div className="text-center py-4 animate-in fade-in zoom-in-95 duration-500">
    <div className="relative inline-flex items-center justify-center w-28 h-28 mb-8">
      <div className="absolute inset-0 bg-emerald-500/10 rounded-full animate-ping" style={{ animationDuration: "2s" }} />
      <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center">
        <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    </div>
    <h2 className="text-2xl font-black text-white mb-3">¡Contraseña Actualizada!</h2>
    <p className="text-white/50 text-sm mb-8 leading-relaxed">
      Te enviamos una confirmación por correo.<br />Ahora puedes iniciar sesión con tu nueva contraseña.
    </p>
    <div className="w-full bg-white/5 rounded-full h-1 mb-4 overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
        style={{ animation: `shrink ${countdown * 1000}ms linear forwards` }}
      />
    </div>
    <p className="text-white/30 text-xs font-bold uppercase tracking-widest mb-6">
      Redirigiendo en {countdown}s...
    </p>
    <button
      onClick={onLogin}
      className="text-emerald-400 text-sm font-black uppercase tracking-widest hover:text-emerald-300 transition-colors"
    >
      Iniciar sesión ahora →
    </button>
  </div>
);

// ─────────────────────────────────────────────
// Main AuthGate Component
// ─────────────────────────────────────────────
interface AuthGateProps {
  onLogin: (user: AuthUser) => void;
  onCancel?: () => void;
  language?: Language;
}

const AuthGate: React.FC<AuthGateProps> = ({ onLogin, onCancel, language = "es" }) => {
  useEffect(() => {
    // Proactive validation for environment variables
    if (!TURNSTILE_SITE_KEY && import.meta.env.PROD) {
      console.error("🚨 [Turnstile] CRITICAL: VITE_TURNSTILE_SITE_KEY is missing in production.");
    }
  }, [TURNSTILE_SITE_KEY]);
  const [mode, setMode] = useState<"login" | "register" | "recovery" | "reset">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shakeCode, setShakeCode] = useState(false);
  const referredBy = new URLSearchParams(window.location.search).get("ref") || undefined;

  // Notification states
  const [toast, setToast] = useState<ToastData | null>(null);
  const [showMailSent, setShowMailSent] = useState(false);
  const [mailSentEmail, setMailSentEmail] = useState("");
  const [mailSentCountdown, setMailSentCountdown] = useState(5);
  const [showResetSuccess, setShowResetSuccess] = useState(false);
  const [resetCountdown, setResetCountdown] = useState(3);

  const showToast = useCallback((data: ToastData) => {
    setToast(data);
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  // Countdown for mail-sent state
  useEffect(() => {
    if (!showMailSent) return;
    let c = 5;
    setMailSentCountdown(c);
    const iv = setInterval(() => {
      c -= 1;
      setMailSentCountdown(c);
      if (c <= 0) {
        clearInterval(iv);
        setShowMailSent(false);
        setMode("reset");
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [showMailSent]);

  // Countdown for reset success state
  useEffect(() => {
    if (!showResetSuccess) return;
    let c = 3;
    setResetCountdown(c);
    const iv = setInterval(() => {
      c -= 1;
      setResetCountdown(c);
      if (c <= 0) {
        clearInterval(iv);
        setShowResetSuccess(false);
        setMode("login");
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [showResetSuccess]);

  // Google Sign-In & Turnstile Initialization
  const googleInitialized = React.useRef(false);

  // Load Turnstile script once and render invisible widget
  useEffect(() => {
    turnstileService.loadScript().then((success) => {
      if (success) {
        turnstileService.render("turnstile-widget", { size: "invisible" });
      }
    });
    return () => {
      turnstileService.remove("turnstile-widget");
    };
  }, []);

  // Initialize Google Sign-In ONCE (idempotent guard via ref)
  useEffect(() => {
    if (googleInitialized.current) return;
    const settings = authService.getSettings();
    const cid = settings.googleAuth?.clientId;
    const isCidValid = cid && cid !== "undefined" && cid !== "null" && cid.length > 10;

    if (settings.googleAuth?.enabled && isCidValid && (window as any).google) {
      try {
        (window as any).google.accounts.id.initialize({
          client_id: cid,
          callback: handleGoogleIDCallback,
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        (window as any).google_token_client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: cid,
          scope: "https://www.googleapis.com/auth/adwords https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/tagmanager.readonly https://www.googleapis.com/auth/webmasters.readonly",
          callback: (tokenRes: any) => handleGoogleTokenCallback(tokenRes, (window as any).pendingCredential),
        });
        googleInitialized.current = true;
      } catch (e) {
        console.error("Google Sign-In Init Error", e);
      }
    } else if (settings.googleAuth?.enabled && !isCidValid) {
        console.warn("[AUTH] Google Auth is enabled but VITE_GOOGLE_CLIENT_ID is missing or invalid.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render button only when mode changes (does NOT call initialize again)
  useEffect(() => {
    const settings = authService.getSettings();
    if (settings.googleAuth?.enabled && settings.googleAuth?.clientId && (window as any).google?.accounts?.id) {
      try {
        const buttonDiv = document.getElementById("google-signin-btn");
        if (buttonDiv) {
          (window as any).google.accounts.id.renderButton(buttonDiv, {
            theme: "outline",
            size: "large",
            width: 320,
            text: mode === "register" ? "signup_with" : "signin_with",
            shape: "pill",
          });
        }
      } catch (e) {
        console.warn("Google renderButton error", e);
      }
    }
  }, [mode]);

  const handleGoogleIDCallback = (response: any) => {
    (window as any).pendingCredential = response.credential;
    if ((window as any).google_token_client) {
      (window as any).google_token_client.requestAccessToken({ prompt: "" });
    } else {
      processGoogleLogin(response.credential);
    }
  };

  const handleGoogleTokenCallback = async (tokenResponse: any, idCredential: any) => {
    if (tokenResponse.error) { processGoogleLogin(idCredential); return; }
    processGoogleLogin(idCredential, tokenResponse.access_token);
  };

  const getTurnstileToken = async (): Promise<string | null> => {
    // For invisible Turnstile, get token from service
    const token = turnstileService.getToken();
    if (token) {
      console.log("[Turnstile] Token obtained:", token.substring(0, 20) + "...");
      return token;
    }
    return null;
  };

  const processGoogleLogin = async (credential: any, accessToken?: string) => {
    setLoading(true);
    try {
      const turnstileToken = await getTurnstileToken();
      // Mantenemos compatibilidad si loginWithGoogle aún no acepta referredBy o lo ignoramos.
      // Si google es registro nuevo, api-auth ya lee body.referredBy si se lo pasamos.
      const { user, error } = await authService.loginWithGoogle(credential, accessToken, turnstileToken || undefined, referredBy);
      if (user) {
        martechService.trackAuth("login", "google");
        showToast({ type: "success", title: "¡Bienvenido!", message: "Sesión iniciada con Google correctamente.", duration: 3000 });
        setTimeout(() => onLogin(user), 800);
      } else {
        showToast({ type: "error", title: "Error de autenticación", message: error || "No se pudo iniciar sesión con Google." });
      }
    } catch {
      showToast({ type: "error", title: "Error de conexión", message: "No se pudo conectar. Reintenta en un momento." });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "register") {
      if (!firstName.trim() || !lastName.trim()) {
        showToast({ type: "warning", title: "Datos incompletos", message: language === "es" ? "Nombre y apellido son obligatorios." : "Name and last name are required." });
        return;
      }
      if (!privacyAccepted) {
        showToast({ type: "warning", title: "Términos requeridos", message: language === "es" ? "Debes aceptar las políticas de privacidad y términos." : "You must accept the privacy policies and terms." });
        return;
      }
    }

    setLoading(true);

    try {
      const turnstileToken = await getTurnstileToken();
      if (!turnstileToken) {
        showToast({ type: "error", title: "Error de seguridad", message: language === "es" ? "Falla en validación. Recarga e intenta de nuevo." : "Validation failed. Reload and try again." });
        setLoading(false);
        return;
      }

      if (mode === "login") {
        const { user, error } = await authService.login(username, password, turnstileToken);
        if (user) {
          martechService.trackAuth("login", "email");
          showToast({ type: "success", title: "¡Bienvenido de vuelta!", message: `Sesión iniciada como ${user.username || username}.`, duration: 2500 });
          setTimeout(() => onLogin(user), 600);
        } else {
          showToast({ type: "error", title: "Acceso denegado", message: error || (language === "es" ? "Credenciales incorrectas. Verifica tu usuario y contraseña." : "Invalid credentials.") });
        }

      } else if (mode === "register") {
        const res = await authService.register(username, password, email, firstName, lastName, phone, privacyAccepted, turnstileToken, referredBy);
        if (res.success) {
          martechService.trackAuth("sign_up", "email");
          // Show mail confirmation and then auto-login with a fresh Turnstile token
          showToast({
            type: "mail",
            title: "¡Cuenta creada!",
            message: `Revisa ${email} — te enviamos los detalles de tu trial.`,
            duration: 6000,
          });
          setTimeout(async () => {
            const freshToken = await getTurnstileToken();
            const { user } = await authService.login(username, password, freshToken || undefined);
            if (user) onLogin(user);
          }, 1200);
        } else {
          showToast({ type: "error", title: "Error en el registro", message: res.message });
        }

      } else if (mode === "recovery") {
        const res = await authService.requestRecovery(username || email, turnstileToken);
        if (res.success) {
          const targetEmail = email || username;
          setMailSentEmail(targetEmail);
          setShowMailSent(true);
        } else {
          showToast({ type: "error", title: "Usuario no encontrado", message: res.message || "No existe una cuenta con ese usuario o email." });
        }

      } else if (mode === "reset") {
        const res = await authService.resetPassword(username || email, recoveryCode, newPassword, turnstileToken);
        if (res.success) {
          setShowResetSuccess(true);
        } else {
          // Shake the code input
          setShakeCode(true);
          setTimeout(() => setShakeCode(false), 600);
          showToast({ type: "error", title: "Código inválido", message: res.message || "El código no es correcto o ya expiró. Solicita uno nuevo." });
        }
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      showToast({ type: "error", title: "Error del servidor", message: err?.message || (language === "es" ? "Algo salió mal. Intenta de nuevo." : "Something went wrong. Please retry.") });
    } finally {
      setLoading(false);
    }
  };

  const t = {
    loginTitle: language === "es" ? "Acceso al Sistema" : "System Access",
    registerTitle: language === "es" ? "Trial Gratuito" : "Free Trial",
    recoveryTitle: language === "es" ? "Recuperar Cuenta" : "Account Recovery",
    resetTitle: language === "es" ? "Nueva Contraseña" : "New Password",
    userPlaceholder: language === "es" ? "Usuario o Email" : "Username or Email",
    passPlaceholder: language === "es" ? "Contraseña" : "Password",
    newPassPlaceholder: language === "es" ? "Nueva Contraseña" : "New Password",
    codePlaceholder: language === "es" ? "Código de 6 dígitos" : "6-digit code",
    ctaLogin: language === "es" ? "INICIAR SESIÓN" : "SIGN IN",
    ctaRegister: language === "es" ? "EMPEZAR TRIAL" : "START TRIAL",
    ctaRecovery: language === "es" ? "ENVIAR CÓDIGO" : "SEND CODE",
    ctaReset: language === "es" ? "ACTUALIZAR" : "UPDATE",
    switchRegister: language === "es" ? "¿No tienes cuenta? Regístrate" : "Don't have an account? Sign up",
    switchLogin: language === "es" ? "Ya tengo cuenta" : "I already have an account",
    forgotPass: language === "es" ? "¿Olvidaste tu contraseña?" : "Forgot password?",
    rememberMe: language === "es" ? "Recordarme" : "Remember me",
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-[#020617] overflow-y-auto font-sans">
      <div id="turnstile-widget" className="hidden"></div>
      {/* Toast notification — outside the card */}
      {toast && <Toast toast={toast} onDismiss={dismissToast} />}

      {/* Background stays deep dark as per Stitch design */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-magenta/10 blur-[150px] rounded-full opacity-60" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-cyan/5 blur-[150px] rounded-full opacity-40" />
      </div>

      <div className="relative w-full max-w-lg my-auto animate-in fade-in zoom-in-95 duration-700">
        <div className="bg-slate-950/80 backdrop-blur-3xl border border-white/10 rounded-[4rem] p-10 md:p-14 shadow-[0_0_80px_-20px_rgba(255,71,123,0.2)]">
          {onCancel && !showMailSent && !showResetSuccess && (
            <button onClick={onCancel} className="absolute top-10 right-10 text-white/20 hover:text-white transition-colors p-2">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Mail Sent State */}
          {showMailSent && (
            <MailSentCard
              email={mailSentEmail}
              countdown={mailSentCountdown}
              title={language === "es" ? "¡Código Enviado!" : "Code Sent!"}
              subtitle={language === "es"
                ? "Revisa tu bandeja de entrada. El código expira en 15 minutos."
                : "Check your inbox. The code expires in 15 minutes."}
              onNext={() => { setShowMailSent(false); setMode("reset"); }}
            />
          )}

          {/* Reset Success State */}
          {showResetSuccess && (
            <ResetSuccessCard
              countdown={resetCountdown}
              onLogin={() => { setShowResetSuccess(false); setMode("login"); }}
            />
          )}

          {/* Normal Form */}
          {!showMailSent && !showResetSuccess && (
            <>
              <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2.5rem] bg-gradient-to-br from-magenta to-magenta/50 p-[1px] mb-8 shadow-[0_0_40px_-5px_rgba(255,71,123,0.4)]">
                  <div className="w-full h-full rounded-[2.4rem] bg-slate-950 flex items-center justify-center overflow-hidden">
                    <img src="/isotype.png" alt="INsitu AI Isotype" className="w-16 h-16 object-contain" />
                  </div>
                </div>
                <h1 className="text-4xl font-black text-white tracking-tighter mb-3 uppercase">
                  {mode === "login" ? t.loginTitle : mode === "register" ? t.registerTitle : mode === "recovery" ? t.recoveryTitle : t.resetTitle}
                </h1>
                <p className="text-white/40 text-[11px] font-black uppercase tracking-[0.3em]">
                  {mode === "register"
                    ? (language === "es" ? "Únete a la élite del ROI" : "Join the ROI elite")
                    : mode === "recovery"
                    ? (language === "es" ? "Te enviamos un código por email" : "We'll send you a code by email")
                    : mode === "reset"
                    ? (language === "es" ? "Crea tu nueva contraseña" : "Create your new password")
                    : (language === "es" ? "Bienvenido de vuelta" : "Welcome back")}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {mode === "register" && (
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder={language === "es" ? "Nombre" : "First Name"}
                      value={firstName} onChange={(e) => setFirstName(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-3xl py-5 px-8 text-white focus:border-cyan outline-none transition-all font-bold placeholder:text-white/20 text-sm" />
                    <input type="text" placeholder={language === "es" ? "Apellido" : "Last Name"}
                      value={lastName} onChange={(e) => setLastName(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-3xl py-5 px-8 text-white focus:border-cyan outline-none transition-all font-bold placeholder:text-white/20 text-sm" />
                  </div>
                )}

                {mode === "register" && (
                  <input type="email" required placeholder="Email Address"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-3xl py-5 px-8 text-white focus:border-cyan outline-none transition-all font-bold placeholder:text-white/20 text-sm" />
                )}

                {mode !== "reset" && (
                  <input type="text" required placeholder={t.userPlaceholder}
                    value={username} onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-3xl py-5 px-8 text-white focus:border-cyan outline-none transition-all font-bold placeholder:text-white/20 text-sm" />
                )}

                {mode === "reset" && (
                  <div className="space-y-4">
                    <input
                      type="text"
                      required
                      placeholder={t.codePlaceholder}
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value)}
                      className={`w-full bg-white/5 border rounded-3xl py-5 px-8 text-white text-center text-3xl tracking-[0.5em] font-black outline-none transition-all
                        ${shakeCode ? "border-rose-500 bg-rose-500/5 animate-[shake_0.4s_ease]" : "border-white/10 focus:border-cyan"}`}
                      style={{
                        animation: shakeCode ? "shake 0.4s ease" : undefined,
                      }}
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder={t.newPassPlaceholder}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-3xl py-5 px-8 text-white focus:border-cyan outline-none transition-all font-bold text-sm" />
                  </div>
                )}

                {(mode === "login" || mode === "register") && (
                  <div className="relative group">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder={t.passPlaceholder}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-3xl py-5 px-8 text-white focus:border-cyan outline-none transition-all font-bold placeholder:text-white/20 pr-16 text-sm" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-8 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors">
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                )}

                {mode === "login" && (
                  <div className="flex items-center justify-between px-4">
                    <label className="flex items-center space-x-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-lg border border-white/10 flex items-center justify-center transition-all ${rememberMe ? "bg-magenta border-magenta" : "bg-white/5 group-hover:border-white/20"}`}>
                        {rememberMe && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="hidden" />
                      <span className="text-[11px] text-white/40 font-black uppercase tracking-widest">{t.rememberMe}</span>
                    </label>
                    <button type="button" onClick={() => setMode("recovery")} className="text-[11px] text-magenta font-black uppercase tracking-widest hover:text-magenta/80 transition-colors">{t.forgotPass}</button>
                  </div>
                )}

                {mode === "register" && (
                  <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input type="checkbox" checked={privacyAccepted} onChange={(e) => setPrivacyAccepted(e.target.checked)} className="mt-1 w-5 h-5 rounded border-white/20 bg-white/5 checked:bg-magenta" />
                      <span className="text-[11px] text-white/40 leading-relaxed font-bold">
                        {language === "es" ? "Acepto las políticas de uso de datos, " : "I accept the data usage policies, "}
                        <button type="button" onClick={() => setShowPrivacyPolicy(true)} className="text-magenta font-black hover:underline">
                          {language === "es" ? "Privacidad" : "Privacy"}
                        </button>
                        {language === "es" ? " y los " : " and "}
                        <button type="button" onClick={() => setShowTerms(true)} className="text-magenta font-black hover:underline">
                          {language === "es" ? "Términos de Servicio" : "Terms of Service"}
                        </button>.
                      </span>
                    </label>
                  </div>
                )}

                {/* Recovery helper tip */}
                {mode === "recovery" && (
                  <div className="flex items-center gap-4 p-6 bg-magenta/5 border border-magenta/20 rounded-3xl">
                    <span className="text-magenta text-2xl">✉</span>
                    <p className="text-[11px] text-magenta/70 leading-relaxed font-bold uppercase tracking-wide">
                      {language === "es"
                        ? "Recibirás un código de 6 dígitos en tu correo registrado. Expira en 15 minutos."
                        : "You'll receive a 6-digit code at your registered email. It expires in 15 minutes."}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-magenta to-[#ff6b95] hover:shadow-[0_0_30px_-5px_rgba(255,71,123,0.5)] text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-[0.98] disabled:opacity-20 flex items-center justify-center gap-4 relative overflow-hidden group/btn"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                      <span className="opacity-60">{language === "es" ? "Un momento..." : "One moment..."}</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                    </>
                  ) : (
                    <>
                      <span>{mode === "login" ? t.ctaLogin : mode === "register" ? t.ctaRegister : mode === "recovery" ? t.ctaRecovery : t.ctaReset}</span>
                      <svg className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>

                {authService.getSettings().googleAuth?.enabled && (mode === "login" || mode === "register") && (
                  <div className="mt-6">
                    <div className="relative flex py-4 items-center">
                      <div className="flex-grow border-t border-white/10" />
                      <span className="flex-shrink-0 mx-6 text-white/20 text-[11px] font-black uppercase tracking-[0.3em]">O continuar con</span>
                      <div className="flex-grow border-t border-white/10" />
                    </div>
                    <div id="google-signin-btn" className="flex justify-center w-full mt-4 min-h-[56px] opacity-80 hover:opacity-100 transition-opacity" />
                  </div>
                )}
              </form>

              {mode !== "recovery" && mode !== "reset" && (
                <button
                  onClick={() => { setMode(mode === "login" ? "register" : "login"); }}
                  className="w-full mt-10 text-white/30 hover:text-white transition-colors text-[11px] font-black uppercase tracking-[0.2em] py-4"
                >
                  {mode === "login" ? t.switchRegister : t.switchLogin}
                </button>
              )}

              {(mode === "recovery" || mode === "reset") && (
                <button
                  onClick={() => { setMode("login"); }}
                  className="w-full mt-10 text-white/20 hover:text-white/60 transition-colors text-[11px] font-black uppercase tracking-[0.2em] py-4 flex items-center justify-center gap-3"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  {language === "es" ? "Volver al inicio de sesión" : "Back to sign in"}
                </button>
              )}

              {/* Explicit Legal Footer for Google Verification */}
              <div className="mt-12 pt-8 border-t border-white/5 flex flex-wrap justify-center gap-6 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                <button onClick={() => setShowPrivacyPolicy(true)} className="hover:text-magenta transition-colors">
                  {language === "es" ? "Privacidad" : "Privacy"}
                </button>
                <button onClick={() => setShowTerms(true)} className="hover:text-magenta transition-colors">
                  {language === "es" ? "Términos" : "Terms"}
                </button>
                <span className="opacity-50">© {new Date().getFullYear()} insitu.company</span>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes shimmer { to { transform: translateX(200%) } }
        @keyframes shake {
          0%,100% { transform: translateX(0) }
          20% { transform: translateX(-8px) }
          40% { transform: translateX(8px) }
          60% { transform: translateX(-6px) }
          80% { transform: translateX(6px) }
        }
      `}</style>

      {showPrivacyPolicy && <PrivacyPolicy onClose={() => setShowPrivacyPolicy(false)} language={language} />}
      {showTerms && <TermsOfService onClose={() => setShowTerms(false)} language={language} />}
    </div>
  );
};

export default AuthGate;

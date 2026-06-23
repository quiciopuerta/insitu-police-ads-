import { AuthUser, UserRole, PlanTier, SubscriptionStatus, SavedVoice } from "../../types";
import { mailService } from "./mailService";
import { settingsService } from "./settingsService";

const USR_DB_STORAGE = "insitu_users_db";
const ACT_SES_STORAGE = "insitu_active_session";
const LIN_ATT_STORAGE = "insitu_login_attempts";
import { API_URL, adminFetch } from "../../utils/apiConfig";
import { logger } from '../../utils/logger';


export const userService = {
  getUsers: (): any[] =>
    JSON.parse(localStorage.getItem(USR_DB_STORAGE) || "[]"),

  saveUsers: (users: any[]) =>
    localStorage.setItem(USR_DB_STORAGE, JSON.stringify(users)),

  getCurrentUser: (): AuthUser | null => {
    const session = localStorage.getItem(ACT_SES_STORAGE);
    if (!session) return null;
    try {
      const parsed = JSON.parse(session) as any; // Cast to any for robust check
      
      // 🛡️ Integrity Check: Ensure structural validity of session
      if (!parsed || typeof parsed !== 'object') return null;
      
      const userId = parsed.id || parsed.user?.id;
      const userEmail = parsed.email || parsed.user?.email;
      const userRole = parsed.role || parsed.user?.user_metadata?.role || parsed.user?.role || 'user';

      if (!userId || !userEmail) {
        logger.error('[AUTH] Invalid session structure detected. Clearing session.');
        userService.setCurrentUser(null);
        return null;
      }

      // Standardize the object to AuthUser structure if needed
      const standardizedUser: AuthUser = {
        ...parsed,
        id: userId,
        email: userEmail,
        role: userRole as UserRole,
        username: parsed.username || userEmail.split('@')[0],
        lastLogin: parsed.lastLogin || Date.now(),
        approvalStatus: parsed.approvalStatus || 'approved',
        subscription: parsed.subscription || { status: 'active', plan: 'Starter' }
      };

      return standardizedUser;
    } catch {
      return null;
    }
  },

  setCurrentUser: (user: AuthUser | null) => {
    if (user) {
      // 🛡️ DATA SANITIZATION: Ensure critical fields are NEVER null/undefined for the UI
      const sanitizedUser: any = {
        ...user,
        savedVoices: Array.isArray(user.savedVoices) ? user.savedVoices : [],
        brandProfiles: Array.isArray((user as any).brand_profiles) 
          ? (user as any).brand_profiles.map((p: any) => ({ ...p, id: p.id || p.profile_id || Math.random().toString(36).substr(2, 9) }))
          : Array.isArray((user as any).brandProfiles)
            ? (user as any).brandProfiles.map((p: any) => ({ ...p, id: p.id || p.profile_id || Math.random().toString(36).substr(2, 9) }))
            : [],
        selectedProfileId: user.selectedProfileId || ((user as any).brandProfiles?.[0]?.id) || null,
        usageHistory: Array.isArray(user.usageHistory) ? user.usageHistory : [],
        totalTokensUsed: user.totalTokensUsed || 0,
        bonus_tokens: (user as any).bonus_tokens || 0,
      };

      // Strip password field before storing in localStorage
      const { password: _pw, ...safeUser } = sanitizedUser;
      localStorage.setItem(ACT_SES_STORAGE, JSON.stringify(safeUser));
    } else {
      // Full cleanup on logout — remove all sensitive cached data
      localStorage.removeItem(ACT_SES_STORAGE);
      localStorage.removeItem(USR_DB_STORAGE);
      localStorage.removeItem(LIN_ATT_STORAGE);
    }
  },

  setSelectedProfile: (profileId: string) => {
    const user = userService.getCurrentUser();
    if (user) {
      user.selectedProfileId = profileId;
      // Also update brandProfile (the active one) for legacy compatibility
      const profile = user.brandProfiles?.find(p => p.id === profileId);
      if (profile) {
        user.brandProfile = profile;
      }
      userService.setCurrentUser(user);
      
      // Notify backend if possible
      adminFetch(`${API_URL}/auth/profile/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ selectedProfileId: profileId })
      }).catch(e => logger.warn('[AUTH] Could not sync selected profileId:', e));
    }
  },

  getCurrentProfile: (): any | null => {
    const user = userService.getCurrentUser();
    if (!user) return null;
    
    if (user.selectedProfileId) {
      return user.brandProfiles?.find(p => p.id === user.selectedProfileId) || user.brandProfile || null;
    }
    return user.brandProfile || user.brandProfiles?.[0] || null;
  },

  initUsers: () => {
    // Only attempt to sync from server if we have an active session (prevents 401 noise for anonymous users)
    if (!localStorage.getItem(ACT_SES_STORAGE)) return;

    // Sync from server — local cache is populated from backend only
    adminFetch(`${API_URL}/admin/users`)
      .then((r) => r.ok ? r.json() : null)
      .then((serverUsers) => {
        if (Array.isArray(serverUsers)) {
          // Strip password field before caching locally
          const safeUsers = serverUsers.map(({ password: _pw, ...u }: any) => u);
          userService.saveUsers(safeUsers);
          logger.info(
            "%c[SYNC] Users synchronized with server",
            "color: #10B981",
          );
        }
      })
      .catch((e) => logger.warn("[SYNC] Could not sync users:", e));
  },

  verifySession: async (): Promise<AuthUser | null> => {
    try {
      // First, try to fetch the session from the backend using the HTTP-Only cookie
      // Removed fetch to /auth/me to prevent console 404 errors as the backend doesn't implement it yet.
      /*
      const response = await fetch(`${API_URL}/auth/me`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Envia las cookies cross-domain
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          userService.setCurrentUser(data.user);
          return data.user;
        }
      }
      */
    } catch (e) {
      logger.warn("[AUTH] Could not verify session with backend:", e);
    }
    
    // Fallback to local storage
    return userService.getCurrentUser();
  },

  register: async (
    username: string,
    password: string,
    email: string,
    firstName: string,
    lastName: string,
    phone: string = "",
    privacyConsent: boolean,
    recaptchaToken: string,
    referredBy?: string
  ): Promise<{ success: boolean; message: string }> => {
    const users = userService.getUsers();

    if (
      users.find(
        (u: any) => u.username === username || (email && u.email === email),
      )
    ) {
      return { success: false, message: "El usuario o correo ya existe" };
    }

    if (!privacyConsent) {
      return {
        success: false,
        message: "Debes aceptar las políticas de privacidad para continuar",
      };
    }

    const settings = settingsService.getSettings();
    const newUser: any = {
      id: Math.random().toString(36).substr(2, 9),
      username,
      password,
      email,
      firstName,
      lastName,
      phone,
      role: "user",
      approvalStatus: "pending",
      picture: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=FF497C&color=fff`,
      lastLogin: Date.now(),
      freeTrialsUsed: 0,
      privacyConsent: {
        accepted: true,
        timestamp: Date.now(),
        version: "1.0",
        gdpr: true,
        ccpa: true,
        lgpd: true,
      },
      subscription: {
        status: "trial",
        plan: "Trial",
        price: 0,
        expiryDate:
          Date.now() + 1000 * 60 * 60 * 24 * (settings.trialDays || 7),
      },
      totalTokensUsed: 0,
      usageLimit: settings.trialTokens || 500,
      usageHistory: [],
    };

    // Sync to backend
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          email,
          firstName,
          lastName,
          phone,
          recaptchaToken,
          referredBy
        }),
      });
      if (response.ok) {
        const data = await response.json();
        return { success: true, message: data.message || "Registro exitoso." };
      } else {
        const data = await response.json();
        return { success: false, message: data.message || "Error en el registro." };
      }
    } catch (e) {
      logger.error("[AUTH] Registration error:", e);
      return { success: false, message: "Servicio de registro no disponible." };
    }
  },

  login: async (
    username: string,
    password: string,
    recaptchaToken?: string,
  ): Promise<{ user: AuthUser | null; error?: string }> => {
    // ── 1. Try backend first for cross-device sync ────────────────────────────
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, recaptchaToken }),
      });

      // Only treat as a real API response if Content-Type is JSON
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        if (response.ok) {
          const data = await response.json();
          const serverUser = data.user;
          if (serverUser) {
            const users = userService.getUsers();
            const idx = users.findIndex((u: any) => u.id === serverUser.id);
            if (idx !== -1) users[idx] = { ...users[idx], ...serverUser };
            else users.push(serverUser);
            userService.saveUsers(users);

            const isExpired = serverUser.subscription?.expiryDate > 0 && Date.now() > serverUser.subscription.expiryDate;
            const authUser: AuthUser = {
              ...serverUser,
              lastLogin: Date.now(),
              subscription: { ...serverUser.subscription, status: isExpired ? 'inactive' : serverUser.subscription?.status },
            };
            userService.setCurrentUser(authUser);
            localStorage.removeItem(LIN_ATT_STORAGE);
            return { user: authUser };
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          // Surface standard auth errors and server-provided error messages (like rate limits or DB circuit breakers)
          if (response.status === 401) return { user: null, error: 'Credenciales inválidas.' };
          if (response.status === 403) return { user: null, error: errorData.error || 'Acceso denegado.' };
          if (response.status === 429) return { user: null, error: errorData.error || 'Demasiados intentos. Intenta más tarde.' };
          if (response.status >= 500 && errorData.error) return { user: null, error: errorData.error };
        }
      }
      // If backend returned HTML (e.g. SPA fallback), fall through to local auth
    } catch (e) {
      logger.warn('[AUTH] Backend unavailable, attempting local auth:', e);
    }

    // ── 2. Local fallback is intentionally disabled ───────────────────────────
    // Passwords must NEVER be stored or compared client-side.
    // If the backend is unavailable, authentication cannot proceed.
    return { user: null, error: 'Servicio de autenticación no disponible. Intenta de nuevo.' };
  },

  canUseTrial: (user: AuthUser): boolean => {
    if (user.role === "admin" || user.role === "superAdmin") return true;
    if (user.subscription.status === "trial") {
      const used = (user as any).freeTrialsUsed || 0;
      return used < 2; // Límite de 2 auditorías en trial
    }
    return user.subscription.status === "active";
  },

  incrementFreeTrial: (userId: string): { trialsRemaining: number } => {
    const users = userService.getUsers();
    const index = users.findIndex((u) => u.id === userId);
    if (index !== -1) {
      users[index].freeTrialsUsed = (users[index].freeTrialsUsed || 0) + 1;
      userService.saveUsers(users);

      const sessionUser = userService.getCurrentUser();
      if (sessionUser && sessionUser.id === userId) {
        sessionUser.totalTokensUsed += 1; // Simplificando tracking de tokens
        userService.setCurrentUser({ ...sessionUser, ...users[index] });
      }
      return { trialsRemaining: 2 - users[index].freeTrialsUsed };
    }
    return { trialsRemaining: 0 };
  },

  setPlan: async (userId: string, tier: PlanTier): Promise<AuthUser | null> => {
    const prices: Record<string, number> = { Starter: 29, Growth: 79, Agency: 0 };
    // Persist to backend
    try {
      await adminFetch(`${API_URL}/admin/users/set-plan`, {
        method: 'POST',
        body: JSON.stringify({ userId, plan: tier }),
      });
    } catch (e) {
      logger.warn('[AUTH] Could not set plan on backend:', e);
    }
    // Local cache
    const users = userService.getUsers();
    const userIndex = users.findIndex((u) => u.id === userId);
    if (userIndex !== -1) {
      users[userIndex].subscription = {
        status: 'active',
        plan: tier,
        price: prices[tier],
        expiryDate: Date.now() + 1000 * 60 * 60 * 24 * 30,
        paymentMethod: 'Manual',
      };
      if (users[userIndex].approvalStatus === 'pending') {
        users[userIndex].approvalStatus = 'approved';
      }
      userService.saveUsers(users);
      const authUser = { ...users[userIndex] };
      delete authUser.password;
      userService.setCurrentUser(authUser);
      return authUser;
    }
    return null;
  },

  updateProfile: async (userId: string, data: Partial<AuthUser>): Promise<AuthUser | null> => {
    // ── Persist to backend for cross-device sync ─────────────────────────────
    try {
      const response = await fetch(`${API_URL}/auth/profile/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        const { user: serverUser } = await response.json();
        // Sync to local cache
        const users = userService.getUsers();
        const idx = users.findIndex((u: any) => u.id === userId);
        if (idx !== -1) users[idx] = { ...users[idx], ...serverUser };
        userService.saveUsers(users);
        userService.setCurrentUser({ ...serverUser });
        return serverUser;
      }
    } catch (e) {
      logger.warn('[AUTH] Could not sync profile to backend:', e);
    }
    // Fallback: local only
    const users = userService.getUsers();
    const userIndex = users.findIndex((u) => u.id === userId);
    if (userIndex !== -1) {
      users[userIndex] = { ...users[userIndex], ...data };
      userService.saveUsers(users);
      const authUser = { ...users[userIndex] };
      delete authUser.password;
      userService.setCurrentUser(authUser);
      return authUser;
    }
    return null;
  },

  trackTokenUsage: (tokens: number, task: string, details?: string, queryType?: 'text' | 'image') => {
    const user = userService.getCurrentUser();
    if (!user) return;

    // Calculate estimated cost ($ per 1k tokens - rough estimate for hidden cap)
    // Imagen/Veo are more expensive, but simplifying to a flat rate for the $350 logic
    const costPerToken = queryType === 'image' ? 0.02 : 0.00002; 
    const estimatedCost = tokens * costPerToken;

    let currentBonus = (user as any).bonus_tokens || 0;
    let tokensToDeductFromPlan = tokens;
    
    if (currentBonus > 0) {
      if (currentBonus >= tokensToDeductFromPlan) {
        currentBonus -= tokensToDeductFromPlan;
        tokensToDeductFromPlan = 0;
      } else {
        tokensToDeductFromPlan -= currentBonus;
        currentBonus = 0;
      }
    }

    user.totalTokensUsed += tokensToDeductFromPlan;
    (user as any).bonus_tokens = currentBonus;
    user.lastResourceCost = (user.lastResourceCost || 0) + estimatedCost;
    
    if (queryType === 'text') {
      user.textQueriesUsed = (user.textQueriesUsed || 0) + 1;
    } else if (queryType === 'image') {
      user.imageQueriesUsed = (user.imageQueriesUsed || 0) + 1;
    }

    user.usageHistory = user.usageHistory || [];
    user.usageHistory.push({
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      tokensUsed: tokens,
      taskName: task,
      queryType,
      resourceCost: estimatedCost,
      details,
    });
    if (user.usageHistory.length > 100) user.usageHistory.shift();
    userService.setCurrentUser(user);

    // Persist to backend for cross-device sync
    fetch(`${API_URL}/auth/track-tokens/${user.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        tokens, 
        task, 
        details, 
        queryType,
        textQueriesUsed: user.textQueriesUsed,
        imageQueriesUsed: user.imageQueriesUsed,
        lastResourceCost: user.lastResourceCost
      }),
    }).catch(e => logger.warn('[AUTH] Could not sync token usage:', e));

    // Local cache
    const users = userService.getUsers();
    const idx = users.findIndex((u: any) => u.id === user.id);
    if (idx !== -1) {
      users[idx].totalTokensUsed = user.totalTokensUsed;
      users[idx].textQueriesUsed = user.textQueriesUsed;
      users[idx].imageQueriesUsed = user.imageQueriesUsed;
      users[idx].lastResourceCost = user.lastResourceCost;
      users[idx].usageHistory = user.usageHistory;
      userService.saveUsers(users);
    }
  },

  checkPlanLimits: (user: AuthUser, type: 'text' | 'image'): { allowed: boolean; reason?: string } => {
    if (user.role === 'superAdmin' || user.role === 'admin') return { allowed: true };
    
    const plan = user.subscription.plan as PlanTier;
    // @ts-ignore - Importing from constants in some environments might be tricky, hardcoding for safety in service
    const limits = {
      Starter: { text: 3, image: 0 },
      Growth: { text: 5, image: 7 },
      Agency: { text: 1000, image: 1000, costCap: 350 }
    };

    const currentLimits = limits[plan] || { text: 0, image: 0 };
    
    if (type === 'text') {
      if ((user.textQueriesUsed || 0) >= currentLimits.text) {
        return { 
          allowed: false, 
          reason: `Has alcanzado tu límite de ${currentLimits.text} consultas de texto para el plan ${plan}.` 
        };
      }
    } else if (type === 'image') {
      if (plan === 'Starter') {
        return { allowed: false, reason: 'El plan Starter no incluye generación de imágenes.' };
      }
      if ((user.imageQueriesUsed || 0) >= currentLimits.image) {
        return { 
          allowed: false, 
          reason: `Has alcanzado tu límite de ${currentLimits.image} imágenes para el plan ${plan}.` 
        };
      }
    }

    // Hidden Agency check
    if (plan === 'Agency' && (user.lastResourceCost || 0) >= limits.Agency.costCap) {
      return { allowed: false, reason: 'Has alcanzado el límite de recursos de IA para este periodo.' };
    }

    return { allowed: true };
  },

  getLeads: async (): Promise<any[]> => {
    try {
      const response = await adminFetch(`${API_URL}/admin/leads`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      logger.warn(
        "[API] Could not fetch leads from server, using local mock.",
        e,
      );
      return []; // O retornar mock si es necesario
    }
  },

  saveLead: async (data: any): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await adminFetch(`${API_URL}/admin/leads`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (response.ok) {
        return { success: true, message: "Lead guardado correctamente." };
      }
      return { success: false, message: "Error al guardar el lead." };
    } catch (e) {
      logger.error("[API] Error saving lead:", e);
      return { success: false, message: "Error de conexión." };
    }
  },

  inviteUser: async (
    email: string,
    role: UserRole,
    plan: PlanTier,
  ): Promise<{ success: boolean; message: string }> => {
    // 1. Check local cache first
    const users = userService.getUsers();
    if (users.find((u) => u.email === email)) {
      return { success: false, message: 'Este correo ya está registrado.' };
    }

    // 2. Persist to backend and wait for response
    try {
      const response = await adminFetch(`${API_URL}/admin/users/invite`, {
        method: 'POST',
        body: JSON.stringify({ email, role, plan }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, message: errorData.error || 'Error al invitar en el servidor.' };
      }

      const data = await response.json();

      // 3. Update local cache only if backend succeeded
      const newUser: any = {
        id: data.userId || Math.random().toString(36).substr(2, 9),
        username: email.split('@')[0],
        email,
        role,
        approvalStatus: 'invited',
        picture: `https://ui-avatars.com/api/?name=${email[0].toUpperCase()}&background=6366f1&color=fff`,
        lastLogin: 0,
        subscription: {
          status: 'inactive',
          plan,
          price: plan === 'Starter' ? 29 : plan === 'Growth' ? 79 : 0,
          expiryDate: 0
        },
        totalTokensUsed: 0,
        usageLimit: plan === 'Starter' ? 1750 : plan === 'Growth' ? 7500 : 50000,
        usageHistory: [],
      };

      userService.saveUsers([...users, newUser]);
      return { success: true, message: 'Invitación enviada correctamente.' };

    } catch (e) {
      logger.error('[AUTH] Invitation failed:', e);
      return { success: false, message: 'No se pudo conectar con el servidor.' };
    }
  },

  updateUserSubscription: async (
    userId: string,
    data: Partial<AuthUser['subscription']>,
  ): Promise<boolean> => {
    // Persist to backend
    try {
      const resp = await fetch(`${API_URL}/auth/subscription/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!resp.ok) return false;
    } catch (e) {
      logger.warn('[AUTH] Could not sync subscription to backend:', e);
      return false; // Stop if backend fails (robustness)
    }
    // Local cache
    const users = userService.getUsers();
    const index = users.findIndex((u) => u.id === userId);
    if (index !== -1) {
      users[index].subscription = { ...users[index].subscription, ...data };
      userService.saveUsers(users);
      const session = userService.getCurrentUser();
      if (session?.id === userId) {
        userService.setCurrentUser({ ...session, subscription: users[index].subscription });
      }
      return true;
    }
    return false;
  },

  updateUsageLimit: async (userId: string, limit: number): Promise<boolean> => {
    // Persist to backend
    try {
      await adminFetch(`${API_URL}/admin/users/update-limit`, {
        method: 'POST',
        body: JSON.stringify({ userId, newLimit: limit }),
      });
    } catch (e) {
      logger.warn('[AUTH] Could not sync usage limit to backend:', e);
    }
    // Local cache
    const users = userService.getUsers();
    const index = users.findIndex((u) => u.id === userId);
    if (index !== -1) {
      users[index].usageLimit = limit;
      userService.saveUsers(users);
      const session = userService.getCurrentUser();
      if (session?.id === userId) {
        userService.setCurrentUser({ ...session, usageLimit: limit });
      }
      return true;
    }
    return false;
  },

  updateUserCredentials: async (
    userId: string,
    data: { username?: string; password?: string },
  ): Promise<boolean> => {
    // Sync to backend first for robustness
    try {
      const resp = await adminFetch(`${API_URL}/admin/users/update`, {
        method: 'POST',
        body: JSON.stringify({ userId, updates: data }),
      });
      if (!resp.ok) return false;
    } catch (e) {
      logger.warn('[ADMIN] Could not sync credentials to backend:', e);
      return false;
    }

    const users = userService.getUsers();
    const index = users.findIndex((u) => u.id === userId);
    if (index !== -1) {
      if (data.username) users[index].username = data.username;
      if (data.password) users[index].password = data.password;
      userService.saveUsers(users);
      return true;
    }
    return false;
  },

  updateUser: async (userId: string, data: Partial<AuthUser>): Promise<boolean> => {
    // Sync to backend first for robustness
    try {
      const resp = await adminFetch(`${API_URL}/admin/users/update`, {
        method: 'POST',
        body: JSON.stringify({ userId, updates: data }),
      });
      if (!resp.ok) return false;
    } catch (e) {
      logger.warn('[ADMIN] Could not sync user data to backend:', e);
      return false;
    }

    const users = userService.getUsers();
    const index = users.findIndex((u) => u.id === userId);
    if (index !== -1) {
      users[index] = { ...users[index], ...data };
      userService.saveUsers(users);
      const session = userService.getCurrentUser();
      if (session?.id === userId) {
        userService.setCurrentUser({ ...session, ...data });
      }
      return true;
    }
    return false;
  },

  updateBrandProfile: async (userId: string, profileOrProfiles: any) => {
    const isArray = Array.isArray(profileOrProfiles);
    const sanitizedData = isArray 
      ? profileOrProfiles.map((p: any) => ({ ...p, id: p.id || Math.random().toString(36).substr(2, 9) }))
      : { ...profileOrProfiles, id: profileOrProfiles.id || Math.random().toString(36).substr(2, 9) };

    const profiles = isArray ? sanitizedData : undefined;
    const active = isArray 
      ? (sanitizedData.find((p: any) => p.id === 'global') || sanitizedData[0] || null)
      : sanitizedData;

    // Persist to backend
    try {
      const currentUser = userService.getCurrentUser();
      const isSelf = currentUser && currentUser.id === userId;
      
      // If updating self, use standard profile endpoint to avoid admin role requirement
      const url = isSelf ? `${API_URL}/auth/profile/${userId}` : `${API_URL}/admin/users/update`;
      const method = isSelf ? 'PATCH' : 'POST';
      const body = isSelf 
        ? JSON.stringify({ brandProfiles: profiles, brandProfile: active })
        : JSON.stringify({ userId, updates: { brandProfiles: profiles, brandProfile: active } });

      const resp = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body
      });
      if (!resp.ok) return false;
    } catch (e) {
      logger.warn('[AUTH] Could not sync brand profile to backend:', e);
      return false;
    }

    // Local cache update
    const users = userService.getUsers();
    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) return false;

    if (isArray) {
      users[index].brandProfiles = sanitizedData;
    } else {
      users[index].brandProfile = sanitizedData;
      // If we are updating a single profile, ensure it's also reflected in the list if it matches
      if (users[index].brandProfiles) {
        const pIdx = users[index].brandProfiles.findIndex((p: any) => p.id === sanitizedData.id);
        if (pIdx !== -1) users[index].brandProfiles[pIdx] = sanitizedData;
      }
    }

    userService.saveUsers(users);
    const session = userService.getCurrentUser();
    if (session?.id === userId) {
      const sessionUpdates: any = isArray ? { brandProfiles: sanitizedData } : { brandProfile: sanitizedData };
      if (!isArray && session.selectedProfileId === sanitizedData.id) {
        sessionUpdates.brandProfile = sanitizedData;
      }
      userService.setCurrentUser({ ...session, ...sessionUpdates });
    }
    return true;
  },

  loginWithGoogle: async (
    credential: any,
    accessToken?: string,
    recaptchaToken?: string,
    referredBy?: string,
  ): Promise<{ user: AuthUser | null; error?: string }> => {
    // 1. Decode Google JWT payload locally (no backend required)
    try {
      const parts = (credential as string).split('.');
      if (parts.length !== 3) throw new Error('Invalid Google JWT');
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      const { sub, email, name, picture } = payload;
      if (!email) return { user: null, error: 'No se pudo obtener el email de Google.' };

      // 2. Try to sync with backend (non-blocking – backend may not be available)
      try {
        const response = await fetch(`${API_URL}/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential, accessToken, recaptchaToken, referredBy }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            userService.setCurrentUser(data.user);
            return { user: data.user };
          }
        }
      } catch (backendErr) {
        logger.warn('[AUTH] Backend sync skipped (offline or unavailable):', backendErr);
      }

      // 3. Fallback: resolve user from localStorage cache or create locally
      const users = userService.getUsers();
      let localUser: any = users.find((u: any) => u.email === email);

      if (!localUser) {
        const settings = settingsService.getSettings();
        const trialExpiry = Date.now() + 1000 * 60 * 60 * 24 * (settings.trialDays || 7);
        localUser = {
          id: `google-${sub || Math.random().toString(36).substr(2, 9)}`,
          username: email,
          email,
          firstName: name?.split(' ')[0] || '',
          lastName: name?.split(' ').slice(1).join(' ') || '',
          role: 'user' as UserRole,
          approvalStatus: 'approved',
          picture: picture || '',
          lastLogin: Date.now(),
          subscription: {
            status: 'trial' as SubscriptionStatus,
            plan: 'Trial' as PlanTier,
            price: 0,
            expiryDate: trialExpiry,
          },
          totalTokensUsed: 0,
          usageLimit: settings.trialTokens || 500,
          usageHistory: [],
          brandProfile: {},
        };
        users.push(localUser);
      } else {
        localUser.lastLogin = Date.now();
        const idx = users.findIndex((u: any) => u.email === email);
        if (idx !== -1) users[idx] = localUser;
      }

      if (accessToken) {
        localUser.linkedGoogleAds = { name, email, picture, accessToken, method: 'oauth' };
      }

      userService.saveUsers(users);
      userService.setCurrentUser(localUser);
      return { user: localUser };

    } catch (e: any) {
      logger.error('[AUTH] Google login failed:', e);
      return { user: null, error: 'Error al procesar la credencial de Google.' };
    }
  },

  requestRecovery: async (
    emailOrUsername: string,
    recaptchaToken?: string,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch(`${API_URL}/auth/recovery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername, recaptchaToken }),
      });
      const data = await response.json();
      return { success: response.ok, message: data.message };
    } catch (e) {
      return { success: false, message: "Error de conexión" };
    }
  },

  resetPassword: async (
    emailOrUsername: string,
    code: string,
    newPass: string,
    recaptchaToken?: string,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername, code, newPass, recaptchaToken }),
      });
      const data = await response.json();
      return { success: response.ok, message: data.message };
    } catch (e) {
      return { success: false, message: "Error de conexión" };
    }
  },
  
  saveVoice: async (userId: string, voice: SavedVoice): Promise<boolean> => {
    // 1. Sync to backend if needed
    try {
      await fetch(`${API_URL}/auth/voice-library`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, voice }),
      });
    } catch (e) {
      logger.warn('[AUTH] Voice saved locally, backend sync failed.');
    }

    // 2. Update local cache
    const users = userService.getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) return false;

    // Ensure savedVoices is always a real array (DB returns it as JSON string)
    if (!Array.isArray(users[idx].savedVoices)) {
      try {
        users[idx].savedVoices = JSON.parse(users[idx].savedVoices || '[]');
      } catch {
        users[idx].savedVoices = [];
      }
    }
    users[idx].savedVoices.push(voice);
    userService.saveUsers(users);

    const session = userService.getCurrentUser();
    if (session?.id === userId) {
      userService.setCurrentUser({ ...session, savedVoices: users[idx].savedVoices });
    }
    return true;
  },

  removeVoice: async (userId: string, voiceId: string): Promise<boolean> => {
    try {
      await fetch(`${API_URL}/auth/voice-library/${voiceId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
    } catch (e) {
      logger.warn('[AUTH] Voice removed locally, backend sync failed.');
    }

    const users = userService.getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) return false;

    users[idx].savedVoices = users[idx].savedVoices?.filter((v: SavedVoice) => v.id !== voiceId) || [];
    userService.saveUsers(users);

    const session = userService.getCurrentUser();
    if (session?.id === userId) {
      userService.setCurrentUser({ ...session, savedVoices: users[idx].savedVoices });
    }
    return true;
  },
};

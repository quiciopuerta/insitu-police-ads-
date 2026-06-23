import { userService } from "./userService";
import { settingsService } from "./settingsService";
import { mailService } from "./mailService";
import { API_URL, adminFetch } from "../../utils/apiConfig";
import { AuthUser, UserRole, PlanTier } from "../../types";
import { logger } from '../../utils/logger';


export const authService = {
  // Initialization
  init: () => {
    userService.initUsers();
    settingsService.initSettings();
  },

  // User Facade
  login: userService.login,
  register: userService.register,
  logout: userService.setCurrentUser.bind(null, null),
  getCurrentUser: userService.getCurrentUser,
  updateProfile: userService.updateProfile,
  setPlan: userService.setPlan,
  canUseTrial: userService.canUseTrial,
  incrementFreeTrial: userService.incrementFreeTrial,
  trackTokenUsage: userService.trackTokenUsage,
  checkPlanLimits: userService.checkPlanLimits,

  // Settings Facade
  getSettings: settingsService.getSettings,
  getPricing: () => settingsService.getSettings().pricing,
  saveSettings: settingsService.saveSettings,
  reportAPIError: settingsService.reportAPIError,
  clearAPIError: settingsService.clearAPIError,

  // Mail Facade
  sendEmailNotification: mailService.sendEmailNotification,

  // Admin Utilities (mapped for compatibility)
  getAllUsers: userService.getUsers,
  getPendingCount: (): number =>
    userService.getUsers().filter((u: any) => u.approvalStatus === "pending")
      .length,
  approveUser: async (userId: string): Promise<boolean> => {
    const users = userService.getUsers();
    const index = users.findIndex((u) => u.id === userId);
    if (index !== -1) {
      users[index].approvalStatus = "approved";
      userService.saveUsers(users);
      // Backend sync
      try {
        const resp = await adminFetch(
          `${API_URL}/admin/users/approve`,
          {
            method: "POST",
            body: JSON.stringify({ userId }),
          },
        );
        if (!resp.ok) return false;
      } catch (e) {
        logger.error("[API] Failed to approve user on server:", e);
        return false;
      }

      return true;
    }
    return false;
  },
  updateUserSubscription: userService.updateUserSubscription,
  updateUsageLimit: userService.updateUsageLimit,
  updateUserCredentials: userService.updateUserCredentials,
  updateUser: userService.updateUser,
  getLeads: userService.getLeads,
  inviteUser: userService.inviteUser,
  deleteUser: async (userId: string): Promise<boolean> => {
    // Sync to backend first
    try {
      const resp = await adminFetch(`${API_URL}/admin/users/${userId}`, {
        method: 'DELETE',
      });
      if (!resp.ok) return false;
    } catch (e) {
      logger.warn('[ADMIN] Could not delete user on backend:', e);
      return false;
    }

    const users = userService.getUsers();
    const filtered = users.filter((u: any) => u.id !== userId);
    if (filtered.length === users.length) return false;
    userService.saveUsers(filtered);
    // Remove from session if it is the deleted user
    const session = userService.getCurrentUser();
    if (session?.id === userId) userService.setCurrentUser(null);
    return true;
  },

  // New methods for UI compatibility
  loginWithGoogle: userService.loginWithGoogle,
  requestRecovery: userService.requestRecovery,
  resetPassword: userService.resetPassword,
  updateBrandProfile: userService.updateBrandProfile,
  saveLead: userService.saveLead,
};

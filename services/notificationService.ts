import { API_URL } from '../utils/apiConfig';
import { AppNotification } from '../types';
import { logger } from '../utils/logger';


export const notificationService = {
  /**
   * Polls for admin notifications (weekly-insights, optimization-tips, etc.)
   */
  async pollAdminNotifications(userId: string, retries = 2): Promise<AppNotification[]> {
    try {
      const res = await fetch(`${API_URL}/admin-notify/poll?userId=${userId}`, {
        headers: { 'X-User-Id': userId },
      });
      if (!res.ok) {
          if (res.status >= 500 && retries > 0) {
              await new Promise(r => setTimeout(r, 1000));
              return this.pollAdminNotifications(userId, retries - 1);
          }
          return [];
      }
      const data = await res.json();
      return data.notifications || [];
    } catch (error: any) {
      if (retries > 0 && (error.message.includes('Failed to fetch') || error.name === 'TypeError')) {
          logger.warn(`[NotificationService] Transient fetch error, retrying... (${retries} left)`);
          await new Promise(r => setTimeout(r, 1500));
          return this.pollAdminNotifications(userId, retries - 1);
      }
      logger.error('Error polling admin notifications:', error);
      return [];
    }
  },

  /**
   * Aggregates all notifications into a single list
   */
  async getAllNotifications(userId: string): Promise<{
    notifications: AppNotification[];
    unreadCount: number;
  }> {
    const adminNotifs = await this.pollAdminNotifications(userId);

    const all = [...adminNotifs].sort((a, b) => b.createdAt - a.createdAt);
    
    // Total unread count
    const adminUnread = adminNotifs.filter(n => !n.read).length;
    
    return {
      notifications: all,
      unreadCount: adminUnread
    };
  },

  /**
   * Mark a notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<boolean> {
    try {
        const res = await fetch(`${API_URL}/admin-notify/read`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-User-Id': userId
          },
          body: JSON.stringify({ userId, notificationId })
        });
        return res.ok;
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      return false;
    }
  },

  /**
   * Track engagement events (OPENED, CLICKED)
   */
  async trackEvent(userId: string, eventType: 'OPENED' | 'CLICKED', campaignId: string, notificationId?: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/admin-notify/track`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': userId
        },
        body: JSON.stringify({ 
          userId, 
          eventType, 
          campaignId, 
          notificationId: notificationId || `notif_${Date.now()}` // Fallback if no specific notif ID
        })
      });
      return res.ok;
    } catch (error) {
      logger.error('Error tracking engagement event:', error);
      return false;
    }
  }
};

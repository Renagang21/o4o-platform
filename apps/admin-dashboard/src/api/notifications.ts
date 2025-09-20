import type { NotificationSettings } from '@/types/notifications';

// Minimal client stub; replace with real API integration when available
export const notificationApi = {
  async getSettings(): Promise<NotificationSettings> {
    return {
      enableNotifications: true,
      enableEmailNotifications: true,
      enablePushNotifications: false,
      notificationTypes: {
        updates: true,
        comments: true,
        system: true,
        security: true,
      },
      emailFrequency: 'daily',
      retentionDays: 30,
      soundEnabled: true,
      desktopNotifications: false,
    };
  },
  async updateSettings(s: NotificationSettings): Promise<NotificationSettings> {
    return s;
  },
};


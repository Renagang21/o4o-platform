export interface NotificationSettings {
  enableNotifications: boolean;
  enableEmailNotifications: boolean;
  enablePushNotifications: boolean;
  notificationTypes: {
    updates: boolean;
    comments: boolean;
    system: boolean;
    security: boolean;
  };
  emailFrequency: 'instant' | 'daily' | 'weekly';
  retentionDays: number;
  soundEnabled: boolean;
  desktopNotifications: boolean;
}


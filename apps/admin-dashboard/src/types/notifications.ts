// Notification Types
export type NotificationType = 'update' | 'comment' | 'system' | 'security';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';
export type NotificationStatus = 'unread' | 'read' | 'archived';

// Update notification sub-types
export type UpdateType = 'plugin' | 'theme' | 'core' | 'security' | 'feature';

// Base notification interface
export interface BaseNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  status: NotificationStatus;
  priority: NotificationPriority;
  link?: string;
  icon?: string;
  metadata?: Record<string, any>;
}

// Update notification
export interface UpdateNotification extends BaseNotification {
  type: 'update';
  updateType: UpdateType;
  version?: string;
  changelog?: string;
  requiresAction?: boolean;
  autoUpdateAvailable?: boolean;
}

// Comment notification
export interface CommentNotification extends BaseNotification {
  type: 'comment';
  postId: string;
  postTitle: string;
  commentId: string;
  authorName: string;
  authorEmail?: string;
  commentExcerpt: string;
  isReply?: boolean;
  parentCommentId?: string;
}

// System notification
export interface SystemNotification extends BaseNotification {
  type: 'system';
  category: 'info' | 'warning' | 'error' | 'success';
  actionRequired?: boolean;
  dismissible?: boolean;
}

// Security notification
export interface SecurityNotification extends BaseNotification {
  type: 'security';
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  affectedArea: string;
  recommendedAction: string;
}

// Union type for all notifications
export type Notification = 
  | UpdateNotification 
  | CommentNotification 
  | SystemNotification 
  | SecurityNotification;

// Notification settings
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
  emailFrequency: 'instant' | 'hourly' | 'daily' | 'weekly' | 'never';
  retentionDays: number;
  soundEnabled: boolean;
  desktopNotifications: boolean;
}

// Notification state
export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  updateCount: number;
  commentCount: number;
  isLoading: boolean;
  error: string | null;
  lastFetchTime: string | null;
  settings: NotificationSettings;
}

// API response types
export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  unread: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface NotificationActionResponse {
  success: boolean;
  message?: string;
  notification?: Notification;
}

// Filter and sort options
export interface NotificationFilters {
  types?: NotificationType[];
  status?: NotificationStatus;
  priority?: NotificationPriority;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface NotificationSortOptions {
  field: 'timestamp' | 'priority' | 'type';
  order: 'asc' | 'desc';
}
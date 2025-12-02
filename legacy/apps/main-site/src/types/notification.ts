/**
 * Notification Type Definitions
 * HP-4: Approval Notice Real API Integration
 *
 * Matches API server Notification entity structure
 */

// Notification channel types
export type NotificationChannel = 'in_app' | 'email';

// Notification event types
export type NotificationType =
  | 'order.new'
  | 'order.status_changed'
  | 'settlement.new_pending'
  | 'settlement.paid'
  | 'price.changed'
  | 'stock.low'
  | 'role.approved'
  | 'role.application_submitted'
  | 'custom';

/**
 * Notification from API
 */
export interface Notification {
  id: string;
  userId: string;
  channel: NotificationChannel;
  type: NotificationType;
  title: string;
  message?: string;
  metadata?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

/**
 * Paginated notification response
 */
export interface NotificationListResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Unread count response
 */
export interface UnreadCountResponse {
  count: number;
}

/**
 * Notification statistics response
 */
export interface NotificationStatsResponse {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  recentActivity: Array<{
    date: string;
    count: number;
  }>;
}

/**
 * Query parameters for fetching notifications
 */
export interface NotificationQueryParams {
  page?: number;
  limit?: number;
  isRead?: boolean;
  type?: NotificationType;
  channel?: NotificationChannel;
}

/**
 * Helper to get UI display info for notification type
 */
export function getNotificationDisplayInfo(type: NotificationType): {
  variant: 'success' | 'warning' | 'error' | 'info';
  defaultTitle: string;
} {
  switch (type) {
    case 'role.approved':
      return { variant: 'success', defaultTitle: '역할 승인 완료' };
    case 'role.application_submitted':
      return { variant: 'info', defaultTitle: '역할 신청 접수' };
    case 'order.new':
      return { variant: 'info', defaultTitle: '새로운 주문' };
    case 'order.status_changed':
      return { variant: 'info', defaultTitle: '주문 상태 변경' };
    case 'settlement.new_pending':
      return { variant: 'warning', defaultTitle: '정산 대기 중' };
    case 'settlement.paid':
      return { variant: 'success', defaultTitle: '정산 완료' };
    case 'price.changed':
      return { variant: 'warning', defaultTitle: '가격 변동' };
    case 'stock.low':
      return { variant: 'error', defaultTitle: '재고 부족' };
    case 'custom':
      return { variant: 'info', defaultTitle: '알림' };
    default:
      return { variant: 'info', defaultTitle: '알림' };
  }
}

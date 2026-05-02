/**
 * Shared notification types — UI layer.
 *
 * WO-O4O-NOTIFICATION-UI-CORE-V1
 *
 * Mirrors the platform notification API response shape (see
 * apps/api-server/src/routes/notifications.routes.ts) but stays
 * intentionally minimal: only the fields the bell UI needs.
 */

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message?: string | null;
  metadata?: Record<string, any> | null;
  isRead: boolean;
  createdAt: string;
  readAt?: string | null;
}

export interface NotificationListResult {
  notifications: NotificationItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface NotificationListParams {
  page?: number;
  limit?: number;
  serviceKey?: string;
  organizationId?: string;
}

/**
 * Adapter contract — each service implements this against its own
 * authenticated HTTP client (kpa-society uses a custom ApiClient,
 * the others use the axios-based authClient). The hook is
 * transport-agnostic.
 *
 * Implementations should swallow 401 by resolving `getUnreadCount` to 0
 * and `list` to an empty result, so an unauthenticated request never
 * surfaces as an error in the UI.
 */
export interface NotificationApiClient {
  getUnreadCount: (params?: { serviceKey?: string; organizationId?: string }) => Promise<number>;
  list: (params?: NotificationListParams) => Promise<NotificationListResult>;
  markAsRead: (notificationIds: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

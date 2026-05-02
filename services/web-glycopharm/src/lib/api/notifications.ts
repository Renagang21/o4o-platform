/**
 * Notifications API adapter — GlycoPharm
 *
 * WO-O4O-NOTIFICATION-UI-CORE-V1
 *
 * Implements the @o4o/account-ui NotificationApiClient contract using
 * the shared axios authClient. Endpoints live under /api/v1/notifications
 * (cross-service namespace).
 *
 * 401 responses are swallowed so the bell silently shows 0/empty when
 * the user is logged out.
 */

import type {
  NotificationApiClient,
  NotificationListParams,
  NotificationListResult,
} from '@o4o/account-ui';
import { api } from '../apiClient';

function isUnauthorized(err: any): boolean {
  return err?.response?.status === 401;
}

const SERVICE_KEY = 'glycopharm';

export const notificationsApi: NotificationApiClient = {
  async getUnreadCount(params) {
    try {
      const res = await api.get('/notifications/unread-count', {
        params: { serviceKey: params?.serviceKey, organizationId: params?.organizationId },
      });
      return res?.data?.data?.count ?? 0;
    } catch (err) {
      if (isUnauthorized(err)) return 0;
      throw err;
    }
  },

  async list(params: NotificationListParams = {}): Promise<NotificationListResult> {
    try {
      const res = await api.get('/notifications', {
        params: {
          page: params.page,
          limit: params.limit,
          serviceKey: params.serviceKey,
          organizationId: params.organizationId,
        },
      });
      const data = res?.data?.data;
      return {
        notifications: data?.notifications ?? [],
        total: data?.total ?? 0,
        page: data?.page ?? 1,
        limit: data?.limit ?? params.limit ?? 10,
        totalPages: data?.totalPages ?? 0,
        hasMore: data?.hasMore ?? false,
      };
    } catch (err) {
      if (isUnauthorized(err)) {
        return { notifications: [], total: 0, page: 1, limit: params.limit ?? 10, totalPages: 0, hasMore: false };
      }
      throw err;
    }
  },

  async markAsRead(notificationIds: string[]) {
    if (!notificationIds?.length) return;
    try {
      await api.post('/notifications/read', { notificationIds });
    } catch (err) {
      if (!isUnauthorized(err)) throw err;
    }
  },

  async markAllAsRead() {
    try {
      await api.post('/notifications/read', { all: true });
    } catch (err) {
      if (!isUnauthorized(err)) throw err;
    }
  },
};

export { SERVICE_KEY as NOTIFICATION_SERVICE_KEY };

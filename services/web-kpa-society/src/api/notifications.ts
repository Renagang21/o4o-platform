/**
 * Notifications API adapter — KPA Society
 *
 * WO-O4O-NOTIFICATION-UI-CORE-V1
 *
 * Implements the @o4o/account-ui NotificationApiClient contract using
 * KPA's `coreApiClient` (baseUrl `/api/v1`, cross-namespace) so the
 * common /api/v1/notifications/* endpoints are reached without going
 * through the kpa-scoped client.
 *
 * 401 responses are swallowed so the bell silently shows 0/empty when
 * the user is logged out.
 */

import type {
  NotificationApiClient,
  NotificationListParams,
  NotificationListResult,
} from '@o4o/account-ui';
import { coreApiClient } from './client';

interface UnreadCountResponse {
  success: boolean;
  data?: { count?: number };
}

interface ListResponse {
  success: boolean;
  data?: {
    notifications?: any[];
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
    hasMore?: boolean;
  };
}

function isUnauthorized(err: any): boolean {
  return err?.status === 401;
}

const SERVICE_KEY = 'kpa';

export const notificationsApi: NotificationApiClient = {
  async getUnreadCount(params) {
    try {
      const res = await coreApiClient.get<UnreadCountResponse>('/notifications/unread-count', {
        serviceKey: params?.serviceKey,
        organizationId: params?.organizationId,
      });
      return res?.data?.count ?? 0;
    } catch (err) {
      if (isUnauthorized(err)) return 0;
      throw err;
    }
  },

  async list(params: NotificationListParams = {}): Promise<NotificationListResult> {
    try {
      const res = await coreApiClient.get<ListResponse>('/notifications', {
        page: params.page,
        limit: params.limit,
        serviceKey: params.serviceKey,
        organizationId: params.organizationId,
      });
      const data = res?.data ?? {};
      return {
        notifications: (data.notifications ?? []) as any[],
        total: data.total ?? 0,
        page: data.page ?? 1,
        limit: data.limit ?? params.limit ?? 10,
        totalPages: data.totalPages ?? 0,
        hasMore: data.hasMore ?? false,
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
      await coreApiClient.post('/notifications/read', { notificationIds });
    } catch (err) {
      if (!isUnauthorized(err)) throw err;
    }
  },

  async markAllAsRead() {
    try {
      await coreApiClient.post('/notifications/read', { all: true });
    } catch (err) {
      if (!isUnauthorized(err)) throw err;
    }
  },
};

export { SERVICE_KEY as NOTIFICATION_SERVICE_KEY };

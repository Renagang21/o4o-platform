/**
 * Notifications API adapter — Pharmacy-Hub
 *
 * WO-PHARMACY-HUB-STORE-INFO-AND-ACCOUNT-V1
 * (계약: WO-O4O-NOTIFICATION-UI-CORE-V1 의 NotificationApiClient)
 *
 * 공통 알림 계약(/api/v1/notifications)을 그대로 쓴다 — PH 전용 알림 API 를 만들지 않는다.
 * K-Cosmetics 어댑터와 동일 구조이며 serviceKey 만 다르다.
 *
 * 401 은 삼켜서 비로그인 시 종이 0/빈 목록으로 조용히 표시되게 한다
 * (알림 실패가 화면을 막지 않는다는 공통 정책).
 */
import type {
  NotificationApiClient,
  NotificationListParams,
  NotificationListResult,
} from '@o4o/account-ui';
import { api } from '../apiClient';
import { SERVICE_KEY } from '../../config/service';

function isUnauthorized(err: any): boolean {
  return err?.response?.status === 401;
}

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
        return {
          notifications: [],
          total: 0,
          page: 1,
          limit: params.limit ?? 10,
          totalPages: 0,
          hasMore: false,
        };
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

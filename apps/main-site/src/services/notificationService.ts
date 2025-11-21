/**
 * Notification Service
 * HP-4: Approval Notice Real API Integration
 *
 * Handles all notification-related API calls using authClient
 */

import { authClient } from '@o4o/auth-client';
import type {
  Notification,
  NotificationListResponse,
  UnreadCountResponse,
  NotificationStatsResponse,
  NotificationQueryParams,
} from '@/types/notification';

/**
 * Get paginated list of notifications with optional filters
 */
export async function getNotifications(
  params?: NotificationQueryParams
): Promise<NotificationListResponse> {
  const queryString = new URLSearchParams();

  if (params?.page) queryString.append('page', params.page.toString());
  if (params?.limit) queryString.append('limit', params.limit.toString());
  if (params?.isRead !== undefined) queryString.append('isRead', params.isRead.toString());
  if (params?.type) queryString.append('type', params.type);
  if (params?.channel) queryString.append('channel', params.channel);

  const response = await authClient.api.get<NotificationListResponse>(
    `/v2/notifications${queryString.toString() ? `?${queryString.toString()}` : ''}`
  );

  return response.data;
}

/**
 * Get recent notifications (for dashboard widgets)
 * Default limit: 5
 */
export async function getRecentNotifications(limit: number = 5): Promise<Notification[]> {
  const response = await authClient.api.get<{ notifications: Notification[] }>(
    `/v2/notifications/recent?limit=${limit}`
  );

  return response.data.notifications;
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(channel?: 'in_app' | 'email'): Promise<number> {
  const queryString = channel ? `?channel=${channel}` : '';
  const response = await authClient.api.get<UnreadCountResponse>(
    `/v2/notifications/unread-count${queryString}`
  );

  return response.data.count;
}

/**
 * Get notification statistics
 */
export async function getNotificationStats(days: number = 30): Promise<NotificationStatsResponse> {
  const response = await authClient.api.get<NotificationStatsResponse>(
    `/v2/notifications/stats?days=${days}`
  );

  return response.data;
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<Notification> {
  const response = await authClient.api.post<{ notification: Notification }>(
    `/v2/notifications/${notificationId}/read`
  );

  return response.data.notification;
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(): Promise<{ count: number }> {
  const response = await authClient.api.post<{ count: number }>(
    '/v2/notifications/read-all'
  );

  return response.data;
}

/**
 * Get role approval notifications specifically
 * Convenience function for ApprovalNotice component
 */
export async function getRoleApprovalNotifications(limit: number = 10): Promise<Notification[]> {
  const response = await authClient.api.get<NotificationListResponse>(
    `/v2/notifications?type=role.approved&limit=${limit}`
  );

  return response.data.notifications;
}

/**
 * Get role-related notifications (both approved and submitted)
 * For comprehensive approval status display
 */
export async function getRoleNotifications(limit: number = 10): Promise<Notification[]> {
  // Get both role.approved and role.application_submitted
  const [approvedRes, submittedRes] = await Promise.all([
    authClient.api.get<NotificationListResponse>(
      `/v2/notifications?type=role.approved&limit=${limit}`
    ),
    authClient.api.get<NotificationListResponse>(
      `/v2/notifications?type=role.application_submitted&limit=${limit}`
    ),
  ]);

  // Merge and sort by createdAt (most recent first)
  const allNotifications = [
    ...approvedRes.data.notifications,
    ...submittedRes.data.notifications,
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return allNotifications.slice(0, limit);
}

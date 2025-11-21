/**
 * useNotifications Hook
 * HP-5: In-App Notification Center v1
 *
 * Centralized hook for notification state management
 * Provides easy access to notification queries and mutations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getNotifications,
  getRecentNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/services/notificationService';
import { useToast } from '@/hooks/useToast';
import type { NotificationQueryParams } from '@/types/notification';

/**
 * Main notifications hook
 * Fetches notification list with optional filters
 */
export function useNotifications(params?: NotificationQueryParams) {
  return useQuery({
    queryKey: ['notifications', 'list', params],
    queryFn: () => getNotifications(params),
    refetchInterval: 60000, // Refetch every minute
    retry: 2,
  });
}

/**
 * Recent notifications hook
 * For dashboard widgets
 */
export function useRecentNotifications(limit: number = 5) {
  return useQuery({
    queryKey: ['notifications', 'recent', limit],
    queryFn: () => getRecentNotifications(limit),
    refetchInterval: 60000,
    retry: 2,
  });
}

/**
 * Unread count hook
 * For notification badge
 */
export function useUnreadCount(channel: 'in_app' | 'email' = 'in_app') {
  return useQuery({
    queryKey: ['notifications', 'unread-count', channel],
    queryFn: () => getUnreadCount(channel),
    refetchInterval: 60000,
    retry: 2,
  });
}

/**
 * Mark as read mutation hook
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useToast();

  return useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      success('알림을 읽음으로 표시했습니다.');
    },
    onError: () => {
      showError('알림 읽음 처리에 실패했습니다.');
    },
  });
}

/**
 * Mark all as read mutation hook
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useToast();

  return useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: ({ count }) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      success(`${count}개의 알림을 모두 읽음으로 표시했습니다.`);
    },
    onError: () => {
      showError('알림 읽음 처리에 실패했습니다.');
    },
  });
}

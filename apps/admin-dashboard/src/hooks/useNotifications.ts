/**
 * useNotifications Hook
 * Phase PD-7: Automation & Notification Foundation
 *
 * Manages real-time notification fetching, unread counts, and marking as read
 */

import { useState, useEffect, useCallback } from 'react';
import { authClient } from '@o4o/auth-client';
import type { Notification, NotificationChannel } from '../types';
import logger from '../utils/logger';

export interface UseNotificationsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
  channel?: NotificationChannel;
}

export interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchMore: () => Promise<void>;
  hasMore: boolean;
}

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds default
    channel,
  } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, any> = {
        page: pageNum,
        limit: 20,
      };

      if (channel) {
        params.channel = channel;
      }

      const response = await authClient.api.get('/api/v2/notifications', { params });

      if (response.data.success) {
        const newNotifications = response.data.data;

        if (append) {
          setNotifications(prev => [...prev, ...newNotifications]);
        } else {
          setNotifications(newNotifications);
        }

        const pagination = response.data.pagination;
        setHasMore(pagination.hasMore || false);
        setPage(pageNum);
      }
    } catch (err: any) {
      logger.error('[PD-7] Error fetching notifications:', err);
      setError(err.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [channel]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const params: Record<string, any> = {};

      if (channel) {
        params.channel = channel;
      }

      const response = await authClient.api.get('/api/v2/notifications/unread-count', { params });

      if (response.data.success) {
        setUnreadCount(response.data.data.count);
      }
    } catch (err: any) {
      logger.error('[PD-7] Error fetching unread count:', err);
    }
  }, [channel]);

  // Refresh both notifications and unread count
  const refresh = useCallback(async () => {
    await Promise.all([
      fetchNotifications(1, false),
      fetchUnreadCount(),
    ]);
  }, [fetchNotifications, fetchUnreadCount]);

  // Mark a single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await authClient.api.post(`/api/v2/notifications/${notificationId}/read`);

      if (response.data.success) {
        // Update local state
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId
              ? { ...n, isRead: true, readAt: new Date().toISOString() }
              : n
          )
        );

        // Decrement unread count
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err: any) {
      logger.error('[PD-7] Error marking notification as read:', err);
      throw err;
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await authClient.api.post('/api/v2/notifications/read-all');

      if (response.data.success) {
        // Update local state - mark all as read
        setNotifications(prev =>
          prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
        );

        // Reset unread count
        setUnreadCount(0);
      }
    } catch (err: any) {
      logger.error('[PD-7] Error marking all notifications as read:', err);
      throw err;
    }
  }, []);

  // Load more notifications (pagination)
  const fetchMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchNotifications(page + 1, true);
  }, [hasMore, loading, page, fetchNotifications]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchUnreadCount();

      // Only refresh list if on first page
      if (page === 1) {
        fetchNotifications(1, false);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, page, fetchNotifications, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
    fetchMore,
    hasMore,
  };
}

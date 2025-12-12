/**
 * useNotifications - Hook for forum notifications
 * Phase 13: Forum Notification System
 * Phase 15-B: SSE Realtime Integration
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ForumNotification } from '@/components/forum/notifications';
import { useRealtimeNotifications, type NotificationEventData } from './useRealtimeNotifications';

// API functions
const API_BASE = '/api/v1/forum/notifications';

interface UseNotificationsOptions {
  pollInterval?: number; // in milliseconds, 0 to disable
  autoFetch?: boolean;
  /** Phase 15-B: Enable SSE realtime updates (default: true) */
  enableRealtime?: boolean;
  /** Phase 15-B: Organization ID for yaksa multi-tenant */
  organizationId?: string;
}

interface UseNotificationsReturn {
  notifications: ForumNotification[];
  unreadCount: number;
  loading: boolean;
  error: Error | null;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<number>;
  markAsRead: (id: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  refetch: () => Promise<void>;
  /** Phase 15-B: SSE connection status */
  isRealtimeConnected: boolean;
}

export function useNotifications(
  options: UseNotificationsOptions = {}
): UseNotificationsReturn {
  const {
    pollInterval = 30000,
    autoFetch = true,
    enableRealtime = true,
    organizationId,
  } = options;

  const [notifications, setNotifications] = useState<ForumNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Phase 15-B: Handle realtime notification
  const handleRealtimeNotification = useCallback((data: NotificationEventData) => {
    // Increment unread count immediately
    setUnreadCount((prev) => prev + 1);

    // Add to notifications list if already loaded
    setNotifications((prev) => {
      // Convert SSE event data to ForumNotification format
      const newNotification: ForumNotification = {
        id: data.id,
        type: data.notificationType as any,
        userId: '', // Not needed for display
        isRead: false,
        createdAt: data.createdAt,
        postId: data.postId,
        commentId: data.commentId,
        organizationId: data.organizationId,
        actorId: data.actorId,
        metadata: {
          ...data.metadata,
          _message: data.message, // Store generated message
        },
      };
      // Add to beginning of list
      return [newNotification, ...prev];
    });
  }, []);

  // Phase 15-B: SSE Realtime connection
  const { isConnected: isRealtimeConnected } = useRealtimeNotifications({
    enabled: enableRealtime,
    organizationId,
    onNotification: handleRealtimeNotification,
  });

  // Fetch unread count
  const fetchUnreadCount = useCallback(async (): Promise<number> => {
    try {
      const response = await fetch(`${API_BASE}/unread-count`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch unread count');
      const data = await response.json();
      const count = data.data?.count || 0;
      setUnreadCount(count);
      return count;
    } catch (err) {
      console.error('Error fetching unread count:', err);
      return unreadCount;
    }
  }, [unreadCount]);

  // Fetch notifications
  const fetchNotifications = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}?limit=50`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch notifications');
      const data = await response.json();
      const items = data.data || [];
      setNotifications(items);
      setUnreadCount(items.filter((n: ForumNotification) => !n.isRead).length);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark single notification as read
  const markAsRead = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/read/${id}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to mark as read');

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      return true;
    } catch (err) {
      console.error('Error marking notification as read:', err);
      return false;
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/read-all`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to mark all as read');

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
      return true;
    } catch (err) {
      console.error('Error marking all as read:', err);
      return false;
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (autoFetch) {
      fetchUnreadCount();
    }
  }, [autoFetch, fetchUnreadCount]);

  // Polling
  useEffect(() => {
    if (pollInterval <= 0) return;

    const interval = setInterval(() => {
      fetchUnreadCount();
    }, pollInterval);

    return () => clearInterval(interval);
  }, [pollInterval, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
    isRealtimeConnected, // Phase 15-B
  };
}

export default useNotifications;

/**
 * useNotifications — shared hook for the platform notification bell.
 *
 * WO-O4O-NOTIFICATION-UI-CORE-V1
 *
 * Fetcher-injected: takes a NotificationApiClient implementation so
 * each service can plug its own authClient without coupling this
 * package to any specific transport.
 *
 * 1st-iteration policy:
 *   - No SSE (follow-up WO).
 *   - Refetch unread count on mount + on `refetchCount()`.
 *   - Refetch list on dropdown open (`refetchList()`).
 *   - Optional polling via `pollIntervalMs` (default off).
 *   - When `enabled = false` (e.g. logged out) the hook is a no-op.
 *   - Errors are swallowed silently — bell UI never blocks the page.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  NotificationApiClient,
  NotificationItem,
  NotificationListParams,
} from './types.js';

export interface UseNotificationsOptions {
  /** When false, the hook does nothing (use for logged-out state). */
  enabled?: boolean;
  /** Optional service-scoped filter applied to count + list. */
  serviceKey?: string;
  /** Optional org-scoped filter applied to count + list. */
  organizationId?: string;
  /** List page size for the dropdown (default: 10). */
  limit?: number;
  /** If > 0, refetches unread count on this interval (ms). Default: 0 (off). */
  pollIntervalMs?: number;
}

export interface UseNotificationsResult {
  unreadCount: number;
  notifications: NotificationItem[];
  loading: boolean;
  refetchCount: () => Promise<void>;
  refetchList: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export function useNotifications(
  api: NotificationApiClient | null | undefined,
  options: UseNotificationsOptions = {}
): UseNotificationsResult {
  const {
    enabled = true,
    serviceKey,
    organizationId,
    limit = 10,
    pollIntervalMs = 0,
  } = options;

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Avoid stale-closure params inside the polling timer.
  const optsRef = useRef({ serviceKey, organizationId, limit });
  optsRef.current = { serviceKey, organizationId, limit };

  const refetchCount = useCallback(async () => {
    if (!enabled || !api) return;
    try {
      const count = await api.getUnreadCount({
        serviceKey: optsRef.current.serviceKey,
        organizationId: optsRef.current.organizationId,
      });
      setUnreadCount(typeof count === 'number' ? count : 0);
    } catch {
      // silent — bell never blocks
    }
  }, [api, enabled]);

  const refetchList = useCallback(async () => {
    if (!enabled || !api) return;
    setLoading(true);
    try {
      const params: NotificationListParams = {
        page: 1,
        limit: optsRef.current.limit,
        serviceKey: optsRef.current.serviceKey,
        organizationId: optsRef.current.organizationId,
      };
      const result = await api.list(params);
      setNotifications(result.notifications ?? []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [api, enabled]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!enabled || !api || !notificationId) return;
      try {
        await api.markAsRead([notificationId]);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
          )
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // silent
      }
    },
    [api, enabled]
  );

  const markAllAsRead = useCallback(async () => {
    if (!enabled || !api) return;
    try {
      await api.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) =>
          n.isRead ? n : { ...n, isRead: true, readAt: new Date().toISOString() }
        )
      );
      setUnreadCount(0);
    } catch {
      // silent
    }
  }, [api, enabled]);

  // Initial fetch + optional polling.
  useEffect(() => {
    if (!enabled || !api) return;
    void refetchCount();
    if (pollIntervalMs > 0) {
      const id = setInterval(() => {
        void refetchCount();
      }, pollIntervalMs);
      return () => clearInterval(id);
    }
    return undefined;
  }, [enabled, api, pollIntervalMs, refetchCount]);

  // When disabled (logout), reset local state.
  useEffect(() => {
    if (!enabled) {
      setUnreadCount(0);
      setNotifications([]);
    }
  }, [enabled]);

  return {
    unreadCount,
    notifications,
    loading,
    refetchCount,
    refetchList,
    markAsRead,
    markAllAsRead,
  };
}

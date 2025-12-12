/**
 * useRealtimeNotifications - SSE Hook for Realtime Notifications
 * Phase 15-B: Forum Notification Realtime Layer
 *
 * Provides Server-Sent Events connection for realtime notification delivery.
 * Designed to work alongside existing polling-based useNotifications hook.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// SSE Event types
export interface NotificationEventData {
  id: string;
  notificationType: string;
  message: string;
  postId?: string;
  commentId?: string;
  organizationId?: string;
  actorId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface SSEEvent {
  type: 'notification' | 'heartbeat';
  data?: NotificationEventData;
  timestamp?: string;
}

// Hook options
export interface UseRealtimeNotificationsOptions {
  /** Whether to enable SSE connection (default: true) */
  enabled?: boolean;
  /** Organization ID for yaksa multi-tenant filtering */
  organizationId?: string;
  /** Callback when new notification arrives */
  onNotification?: (data: NotificationEventData) => void;
  /** Callback when connection status changes */
  onConnectionChange?: (connected: boolean) => void;
  /** Reconnect delay in ms (default: 3000) */
  reconnectDelay?: number;
  /** Max reconnect attempts (default: 5) */
  maxReconnectAttempts?: number;
}

export interface UseRealtimeNotificationsReturn {
  /** Whether SSE is connected */
  isConnected: boolean;
  /** Last received notification */
  lastNotification: NotificationEventData | null;
  /** Connection error if any */
  error: Error | null;
  /** Manually reconnect */
  reconnect: () => void;
  /** Disconnect SSE */
  disconnect: () => void;
}

const SSE_ENDPOINT = '/api/v1/forum/notifications/stream';

/**
 * useRealtimeNotifications
 *
 * Hook for receiving realtime notifications via Server-Sent Events.
 * Automatically handles connection, reconnection, and cleanup.
 *
 * @example
 * ```tsx
 * const { isConnected, lastNotification } = useRealtimeNotifications({
 *   onNotification: (data) => {
 *     // Increment unread count, show toast, etc.
 *     console.log('New notification:', data.message);
 *   },
 * });
 * ```
 */
export function useRealtimeNotifications(
  options: UseRealtimeNotificationsOptions = {}
): UseRealtimeNotificationsReturn {
  const {
    enabled = true,
    organizationId,
    onNotification,
    onConnectionChange,
    reconnectDelay = 3000,
    maxReconnectAttempts = 5,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastNotification, setLastNotification] = useState<NotificationEventData | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Build SSE URL with optional organizationId
  const buildUrl = useCallback(() => {
    const url = new URL(SSE_ENDPOINT, window.location.origin);
    if (organizationId) {
      url.searchParams.set('organizationId', organizationId);
    }
    return url.toString();
  }, [organizationId]);

  // Handle SSE message
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const parsed: SSEEvent = JSON.parse(event.data);

        if (parsed.type === 'notification' && parsed.data) {
          setLastNotification(parsed.data);
          onNotification?.(parsed.data);
        }
        // Heartbeat is just for keeping connection alive
      } catch (err) {
        console.error('[SSE] Failed to parse message:', err);
      }
    },
    [onNotification]
  );

  // Connect to SSE
  const connect = useCallback(() => {
    if (!enabled) return;
    if (eventSourceRef.current) return; // Already connected

    try {
      const url = buildUrl();
      console.log('[SSE] Connecting to:', url);

      const eventSource = new EventSource(url, {
        withCredentials: true, // Include auth cookies
      });

      eventSource.onopen = () => {
        console.log('[SSE] Connected');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        onConnectionChange?.(true);
      };

      eventSource.onmessage = handleMessage;

      eventSource.onerror = (event) => {
        console.error('[SSE] Connection error:', event);
        setIsConnected(false);
        onConnectionChange?.(false);

        // Close and attempt reconnect
        eventSource.close();
        eventSourceRef.current = null;

        // Attempt reconnect if not max attempts
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = reconnectDelay * reconnectAttemptsRef.current;
          console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          setError(new Error('Max reconnection attempts reached'));
        }
      };

      eventSourceRef.current = eventSource;
    } catch (err) {
      console.error('[SSE] Failed to connect:', err);
      setError(err instanceof Error ? err : new Error('Connection failed'));
    }
  }, [
    enabled,
    buildUrl,
    handleMessage,
    onConnectionChange,
    reconnectDelay,
    maxReconnectAttempts,
  ]);

  // Disconnect from SSE
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsConnected(false);
    onConnectionChange?.(false);
  }, [onConnectionChange]);

  // Manual reconnect
  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    connect();
  }, [disconnect, connect]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  // Reconnect when organizationId changes
  useEffect(() => {
    if (enabled && eventSourceRef.current) {
      reconnect();
    }
  }, [organizationId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isConnected,
    lastNotification,
    error,
    reconnect,
    disconnect,
  };
}

export default useRealtimeNotifications;

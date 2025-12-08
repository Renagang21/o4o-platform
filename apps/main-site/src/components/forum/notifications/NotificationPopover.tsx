/**
 * NotificationPopover - Dropdown Notification Panel
 * Phase 13: Forum Notification System
 */

'use client';

import { useState, useEffect, useCallback, RefObject } from 'react';
import { NotificationList } from './NotificationList';
import { type ForumNotification } from './NotificationItem';

// Mock API functions (replace with actual API calls)
const API_BASE = '/api/v1/forum/notifications';

async function fetchNotifications(limit: number = 10): Promise<{
  data: ForumNotification[];
  pagination: { total: number; hasMore: boolean };
}> {
  try {
    const response = await fetch(`${API_BASE}?limit=${limit}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  } catch (error) {
    console.error('Error fetching notifications:', error);
    // Return mock data for development
    return {
      data: [],
      pagination: { total: 0, hasMore: false },
    };
  }
}

async function markNotificationAsRead(id: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/read/${id}`, {
      method: 'POST',
      credentials: 'include',
    });
    return response.ok;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
}

async function markAllAsRead(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/read-all`, {
      method: 'POST',
      credentials: 'include',
    });
    return response.ok;
  } catch (error) {
    console.error('Error marking all as read:', error);
    return false;
  }
}

interface NotificationPopoverProps {
  onClose: () => void;
  anchorRef?: RefObject<HTMLElement | null>;
  onCountChange?: (count: number) => void;
}

export function NotificationPopover({
  onClose,
  anchorRef,
  onCountChange,
}: NotificationPopoverProps) {
  const [notifications, setNotifications] = useState<ForumNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [_hasMore, setHasMore] = useState(false);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchNotifications(10);
      setNotifications(result.data || []);
      setHasMore(result.pagination?.hasMore || false);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const popover = document.getElementById('notification-popover');

      if (
        popover &&
        !popover.contains(target) &&
        anchorRef?.current &&
        !anchorRef.current.contains(target)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, anchorRef]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Handle marking as read
  const handleRead = async (id: string) => {
    const success = await markNotificationAsRead(id);
    if (success) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      // Update unread count
      const unreadCount = notifications.filter((n) => !n.isRead && n.id !== id).length;
      onCountChange?.(unreadCount);
    }
  };

  // Handle mark all as read
  const handleMarkAllRead = async () => {
    const success = await markAllAsRead();
    if (success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      onCountChange?.(0);
    }
  };

  // Handle notification click
  const handleClick = (notification: ForumNotification) => {
    // Navigate to the related content
    if (notification.postId && notification.metadata?.postSlug) {
      window.location.href = `/forum/post/${notification.metadata.postSlug}`;
    } else if (notification.postId) {
      window.location.href = `/forum/post/${notification.postId}`;
    }
    onClose();
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div
      id="notification-popover"
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">알림</h3>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            모두 읽음
          </button>
        )}
      </div>

      {/* Notification List */}
      <div className="max-h-[400px] overflow-y-auto">
        <NotificationList
          notifications={notifications}
          loading={loading}
          onRead={handleRead}
          onClick={handleClick}
          compact
          emptyMessage="새 알림이 없습니다."
        />
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
        <a
          href="/forum/notifications"
          className="block text-center text-sm text-blue-600 hover:text-blue-800"
          onClick={onClose}
        >
          전체 알림 보기 →
        </a>
      </div>
    </div>
  );
}

export default NotificationPopover;

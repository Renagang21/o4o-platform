/**
 * NotificationList Component
 * Phase PD-7: Automation & Notification Foundation
 *
 * Displays list of notifications with mark as read functionality
 */

import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import type { Notification, NotificationType } from '../../types';

// WO-O4O-KPA-STORE-NEW-PRODUCT-REQUEST-AND-ADMIN-APPROVAL-V1 (P3):
//   알림 클릭 시 metadata.targetUrl(내부 경로)로 이동. 외부 URL(`//`, `http`)은 차단.
function internalTargetUrl(notification: Notification): string | null {
  const url = (notification as { metadata?: Record<string, unknown> }).metadata?.targetUrl;
  if (typeof url !== 'string') return null;
  if (!url.startsWith('/') || url.startsWith('//')) return null;
  return url;
}

// Simple time ago function
const timeAgo = (date: string): string => {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);

  const intervals: { [key: string]: number } = {
    년: 31536000,
    개월: 2592000,
    주: 604800,
    일: 86400,
    시간: 3600,
    분: 60,
    초: 1,
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval}${unit} 전`;
    }
  }

  return '방금 전';
};

interface NotificationListProps {
  onClose?: () => void;
}

// Notification type icons
const getNotificationIcon = (type: NotificationType): string => {
  switch (type) {
    case 'order.new':
      return '🛒';
    case 'order.status_changed':
      return '📦';
    case 'settlement.new_pending':
    case 'settlement.paid':
      return '💰';
    case 'price.changed':
      return '💲';
    case 'stock.low':
      return '⚠️';
    case 'role.approved':
    case 'role.application_submitted':
      return '👤';
    default:
      return '🔔';
  }
};

// Notification type colors
const getNotificationColor = (type: NotificationType): string => {
  switch (type) {
    case 'order.new':
      return 'bg-blue-100 text-blue-800';
    case 'order.status_changed':
      return 'bg-purple-100 text-purple-800';
    case 'settlement.new_pending':
    case 'settlement.paid':
      return 'bg-green-100 text-green-800';
    case 'price.changed':
      return 'bg-orange-100 text-orange-800';
    case 'stock.low':
      return 'bg-red-100 text-red-800';
    case 'role.approved':
      return 'bg-teal-100 text-teal-800';
    case 'role.application_submitted':
      return 'bg-indigo-100 text-indigo-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const NotificationItem: React.FC<{
  notification: Notification;
  onMarkAsRead: (id: string) => Promise<void>;
  onNavigate?: (url: string) => void;
}> = ({ notification, onMarkAsRead, onNavigate }) => {
  const handleClick = useCallback(async () => {
    if (!notification.isRead) {
      await onMarkAsRead(notification.id);
    }
    const target = internalTargetUrl(notification);
    if (target && onNavigate) onNavigate(target);
  }, [notification, onMarkAsRead, onNavigate]);

  const timeAgoText = timeAgo(notification.createdAt);

  return (
    <div
      onClick={handleClick}
      className={`
        px-4 py-3 border-b border-gray-100 last:border-b-0
        hover:bg-gray-50 cursor-pointer transition-colors
        ${!notification.isRead ? 'bg-blue-50' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`
            flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg
            ${getNotificationColor(notification.type)}
          `}
        >
          {getNotificationIcon(notification.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={`text-sm font-medium text-gray-900 ${!notification.isRead ? 'font-semibold' : ''}`}>
              {notification.title}
            </h4>
            {!notification.isRead && (
              <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-1.5"></span>
            )}
          </div>

          {notification.message && (
            <p className="mt-1 text-sm text-gray-600 line-clamp-2">{notification.message}</p>
          )}

          <p className="mt-1 text-xs text-gray-500">{timeAgoText}</p>
        </div>
      </div>
    </div>
  );
};

export const NotificationList: React.FC<NotificationListProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const handleNavigate = useCallback((url: string) => {
    onClose?.();
    navigate(url);
  }, [navigate, onClose]);
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    fetchMore,
    hasMore,
  } = useNotifications({ autoRefresh: false });

  const handleMarkAllAsRead = useCallback(async () => {
    await markAllAsRead();
  }, [markAllAsRead]);

  const handleLoadMore = useCallback(() => {
    fetchMore();
  }, [fetchMore]);

  return (
    <div className="flex flex-col max-h-[500px]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            알림
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                {unreadCount}개 읽지 않음
              </span>
            )}
          </h3>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              모두 읽음으로 표시
            </button>
          )}
        </div>
      </div>

      {/* Notification List */}
      <div className="flex-1 overflow-y-auto">
        {loading && notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2">로딩 중...</p>
          </div>
        ) : error ? (
          <div className="px-4 py-8 text-center text-sm text-red-600">
            <p>{error}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            <svg
              className="w-12 h-12 mx-auto text-gray-400 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <p>알림이 없습니다</p>
          </div>
        ) : (
          <>
            {notifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onNavigate={handleNavigate}
              />
            ))}

            {/* Load More Button */}
            {hasMore && (
              <div className="px-4 py-3 border-t border-gray-200">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                >
                  {loading ? '로딩 중...' : '더 보기'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="w-full text-xs text-gray-600 hover:text-gray-900 font-medium"
          >
            닫기
          </button>
        </div>
      )}
    </div>
  );
};

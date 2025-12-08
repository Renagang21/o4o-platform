/**
 * NotificationList - List of Notifications
 * Phase 13: Forum Notification System
 */

'use client';

import { NotificationItem, type ForumNotification } from './NotificationItem';

interface NotificationListProps {
  notifications: ForumNotification[];
  loading?: boolean;
  onRead?: (id: string) => void;
  onClick?: (notification: ForumNotification) => void;
  compact?: boolean;
  emptyMessage?: string;
}

export function NotificationList({
  notifications,
  loading = false,
  onRead,
  onClick,
  compact = false,
  emptyMessage = '알림이 없습니다.',
}: NotificationListProps) {
  if (loading) {
    return <NotificationListLoading compact={compact} />;
  }

  if (notifications.length === 0) {
    return (
      <div className={`text-center ${compact ? 'py-6' : 'py-10'} text-gray-500`}>
        <span className="text-3xl mb-2 block">🔔</span>
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRead={onRead}
          onClick={onClick}
          compact={compact}
        />
      ))}
    </div>
  );
}

// Loading skeleton
function NotificationListLoading({ compact = false }: { compact?: boolean }) {
  return (
    <div className="animate-pulse divide-y divide-gray-100">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={`flex items-start gap-3 ${compact ? 'p-2' : 'p-3'}`}>
          <div className={`
            bg-gray-200 rounded-full flex-shrink-0
            ${compact ? 'w-8 h-8' : 'w-10 h-10'}
          `} />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default NotificationList;

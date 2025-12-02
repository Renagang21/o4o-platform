/**
 * Notification Icon Component
 * HP-5: In-App Notification Center v1
 *
 * Bell icon with unread count badge
 * Displays in header and triggers NotificationCenter dropdown
 */

import { FC } from 'react';
import { Bell, BellDot } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getUnreadCount } from '@/services/notificationService';

interface NotificationIconProps {
  onClick?: () => void;
  isActive?: boolean;
}

export const NotificationIcon: FC<NotificationIconProps> = ({ onClick, isActive = false }) => {
  // Fetch unread count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => getUnreadCount('in_app'),
    refetchInterval: 60000, // Refetch every 60 seconds
    retry: 2,
  });

  const hasUnread = unreadCount > 0;

  return (
    <button
      onClick={onClick}
      className={`relative p-2 rounded-lg transition-colors ${
        isActive
          ? 'bg-blue-50 text-blue-600'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
      aria-label={`알림 ${hasUnread ? `(${unreadCount}개 안 읽음)` : ''}`}
    >
      {hasUnread ? (
        <BellDot className="w-6 h-6" />
      ) : (
        <Bell className="w-6 h-6" />
      )}

      {/* Unread badge */}
      {hasUnread && (
        <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-600 rounded-full">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};

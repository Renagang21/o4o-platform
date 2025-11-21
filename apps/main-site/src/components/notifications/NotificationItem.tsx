/**
 * Notification Item Component
 * HP-5: In-App Notification Center v1
 *
 * Individual notification display with icon, title, message, timestamp
 * Handles click to mark as read
 */

import { FC } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Clock,
  Info,
  AlertCircle,
  ShoppingCart,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Megaphone,
} from 'lucide-react';
import { markNotificationAsRead } from '@/services/notificationService';
import { useToast } from '@/hooks/useToast';
import type { Notification, NotificationType, NotificationListResponse } from '@/types/notification';

interface NotificationItemProps {
  notification: Notification;
  onClose?: () => void;
}

export const NotificationItem: FC<NotificationItemProps> = ({ notification, onClose }) => {
  const { success } = useToast();
  const queryClient = useQueryClient();

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onMutate: async (notificationId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['notifications'] });

      // Snapshot previous value
      const previousNotifications = queryClient.getQueryData<NotificationListResponse>([
        'notifications',
        'list',
      ]);

      // Optimistically update
      queryClient.setQueryData<NotificationListResponse>(['notifications', 'list'], (old) => {
        if (!old) return old;
        return {
          ...old,
          notifications: old.notifications.map((n) =>
            n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
          ),
        };
      });

      return { previousNotifications };
    },
    onSuccess: () => {
      // Invalidate unread count
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
    onError: (err, notificationId, context) => {
      // Rollback on error
      if (context?.previousNotifications) {
        queryClient.setQueryData(['notifications', 'list'], context.previousNotifications);
      }
    },
  });

  // Get icon and styling based on notification type
  const getNotificationStyle = (type: NotificationType) => {
    switch (type) {
      case 'role.approved':
        return {
          icon: <CheckCircle2 className="w-5 h-5" />,
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
        };
      case 'role.application_submitted':
        return {
          icon: <Clock className="w-5 h-5" />,
          iconBg: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
        };
      case 'order.new':
        return {
          icon: <ShoppingCart className="w-5 h-5" />,
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
        };
      case 'order.status_changed':
        return {
          icon: <Package className="w-5 h-5" />,
          iconBg: 'bg-purple-100',
          iconColor: 'text-purple-600',
        };
      case 'settlement.new_pending':
        return {
          icon: <Clock className="w-5 h-5" />,
          iconBg: 'bg-orange-100',
          iconColor: 'text-orange-600',
        };
      case 'settlement.paid':
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
        };
      case 'price.changed':
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          iconBg: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
        };
      case 'stock.low':
        return {
          icon: <XCircle className="w-5 h-5" />,
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
        };
      case 'custom':
        return {
          icon: <Megaphone className="w-5 h-5" />,
          iconBg: 'bg-indigo-100',
          iconColor: 'text-indigo-600',
        };
      default:
        return {
          icon: <Info className="w-5 h-5" />,
          iconBg: 'bg-gray-100',
          iconColor: 'text-gray-600',
        };
    }
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;

    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Handle click
  const handleClick = () => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    // Optional: Navigate based on metadata
    // onClose?.();
  };

  const style = getNotificationStyle(notification.type);

  return (
    <div
      onClick={handleClick}
      className={`px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 ${
        !notification.isRead ? 'bg-blue-50/50' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Unread indicator */}
        {!notification.isRead && (
          <div className="flex-shrink-0 w-2 h-2 mt-2 bg-blue-600 rounded-full" />
        )}

        {/* Icon */}
        <div className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg ${style.iconBg}`}>
          <div className={style.iconColor}>{style.icon}</div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${!notification.isRead ? 'font-semibold' : 'font-medium'} text-gray-900`}>
            {notification.title}
          </p>
          {notification.message && (
            <p className="mt-0.5 text-sm text-gray-600 line-clamp-2">{notification.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-400">{formatRelativeTime(notification.createdAt)}</p>
        </div>
      </div>
    </div>
  );
};

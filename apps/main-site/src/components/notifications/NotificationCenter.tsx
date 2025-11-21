/**
 * Notification Center Component
 * HP-5: In-App Notification Center v1
 *
 * Dropdown panel displaying all notifications
 * Integrates with NotificationIcon in Header
 */

import { FC, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, CheckCheck, Inbox } from 'lucide-react';
import { getNotifications, markAllNotificationsAsRead } from '@/services/notificationService';
import { useToast } from '@/hooks/useToast';
import { NotificationItem } from './NotificationItem';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenter: FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
  const { success, error: showError } = useToast();
  const queryClient = useQueryClient();
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const {
    data: response,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => getNotifications({ limit: 20 }),
    refetchInterval: 60000, // Refetch every minute
    retry: 2,
    enabled: isOpen, // Only fetch when panel is open
  });

  const notifications = response?.notifications ?? [];

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: ({ count }) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      success(`${count}개의 알림을 모두 읽음으로 표시했습니다.`);
    },
    onError: () => {
      showError('알림 읽음 처리에 실패했습니다.');
    },
  });

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Notification panel */}
      <div
        ref={panelRef}
        className="fixed md:absolute top-16 md:top-full right-4 md:right-0 w-full max-w-md md:w-96 bg-white rounded-lg shadow-lg z-50 md:mt-2 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h2 className="text-base font-semibold text-gray-900">알림</h2>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && notifications.some((n) => !n.isRead) && (
              <button
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                title="모두 읽음으로 표시"
              >
                <CheckCheck className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[480px] overflow-y-auto">
          {isLoading ? (
            <div className="px-4 py-12 text-center">
              <div className="animate-pulse text-gray-500">알림을 불러오는 중...</div>
            </div>
          ) : error ? (
            <div className="px-4 py-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-3">
                  <X className="w-6 h-6 text-red-600" />
                </div>
                <p className="text-sm font-medium text-red-900">알림을 불러올 수 없습니다</p>
                <p className="text-sm text-red-700 mt-1">잠시 후 다시 시도해주세요.</p>
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                <Inbox className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900">새 알림이 없습니다</p>
              <p className="text-sm text-gray-500 mt-1">알림이 도착하면 여기에 표시됩니다.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} onClose={onClose} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="w-full text-sm text-center text-blue-600 hover:text-blue-700 font-medium"
            >
              모든 알림 보기
            </button>
          </div>
        )}
      </div>
    </>
  );
};

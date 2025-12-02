/**
 * Approval Notice Component
 * HP-4: Real API Integration
 *
 * Displays role approval/application status notifications
 * Integrated with actual Notification API and React Query
 */

import { FC, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, XCircle, Clock, Eye } from 'lucide-react';
import { getRoleNotifications, markNotificationAsRead } from '@/services/notificationService';
import { useToast } from '@/hooks/useToast';
import type { Notification, NotificationType } from '@/types/notification';

const ApprovalNotice: FC = () => {
  const { success, error: showError } = useToast();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Fetch role-related notifications
  const { data: notifications = [], isLoading, error } = useQuery({
    queryKey: ['role-notifications'],
    queryFn: () => getRoleNotifications(10),
    refetchInterval: 60000, // Refetch every minute
    retry: 2,
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: (updatedNotification) => {
      // Update query cache
      queryClient.setQueryData<Notification[]>(['role-notifications'], (old) => {
        if (!old) return old;
        return old.map((n) =>
          n.id === updatedNotification.id ? updatedNotification : n
        );
      });
      success('알림을 읽음으로 표시했습니다.');
    },
    onError: () => {
      showError('알림 상태 업데이트에 실패했습니다.');
    },
  });

  // Get icon and color based on notification type
  const getNotificationStyle = (type: NotificationType) => {
    switch (type) {
      case 'role.approved':
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
        };
      case 'role.application_submitted':
        return {
          icon: <Clock className="w-5 h-5 text-yellow-600" />,
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
        };
      default:
        return {
          icon: <AlertCircle className="w-5 h-5 text-gray-500" />,
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
        };
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
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
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Handle notification click (expand/collapse + mark as read)
  const handleNotificationClick = (notification: Notification) => {
    setExpandedId(expandedId === notification.id ? null : notification.id);

    // Mark as read if unread
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">승인 현황</h2>
        </div>
        <div className="p-6 text-center text-gray-500">
          <div className="animate-pulse">알림을 불러오는 중...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">승인 현황</h2>
        </div>
        <div className="p-6">
          <div className="flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">
                알림을 불러올 수 없습니다
              </p>
              <p className="text-sm text-red-700 mt-1">
                잠시 후 다시 시도해주세요.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (notifications.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">승인 현황</h2>
        </div>
        <div className="p-6 text-center text-gray-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">승인 관련 알림이 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">승인 현황</h2>
          <span className="text-sm text-gray-500">
            {notifications.filter((n) => !n.isRead).length > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {notifications.filter((n) => !n.isRead).length}개 안 읽음
              </span>
            )}
          </span>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {notifications.map((notification) => {
          const style = getNotificationStyle(notification.type);
          const isExpanded = expandedId === notification.id;

          return (
            <div
              key={notification.id}
              className={`p-6 cursor-pointer transition-colors hover:bg-gray-50 ${
                !notification.isRead ? 'bg-blue-50/30' : ''
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">{style.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {notification.title}
                        {!notification.isRead && (
                          <span className="ml-2 inline-block w-2 h-2 bg-blue-600 rounded-full" />
                        )}
                      </p>
                      {notification.message && (
                        <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                          {notification.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-4">
                    <p className="text-xs text-gray-400">
                      {formatDate(notification.createdAt)}
                    </p>
                    {notification.isRead && (
                      <span className="inline-flex items-center text-xs text-gray-400">
                        <Eye className="w-3 h-3 mr-1" />
                        읽음
                      </span>
                    )}
                  </div>

                  {/* Expanded details */}
                  {isExpanded && notification.metadata && (
                    <div
                      className={`mt-4 p-3 rounded-lg border ${style.bgColor} ${style.borderColor}`}
                    >
                      <div className="space-y-2 text-sm text-gray-700">
                        {notification.metadata.role && (
                          <div>
                            <span className="font-medium">역할:</span>{' '}
                            {notification.metadata.role === 'supplier' && '공급자'}
                            {notification.metadata.role === 'seller' && '판매자'}
                            {notification.metadata.role === 'partner' && '파트너'}
                          </div>
                        )}
                        {notification.metadata.reason && (
                          <div>
                            <span className="font-medium">사유:</span>{' '}
                            {notification.metadata.reason}
                          </div>
                        )}
                        {notification.metadata.applicationId && (
                          <div>
                            <span className="font-medium">신청 ID:</span>{' '}
                            <code className="text-xs bg-white px-1.5 py-0.5 rounded">
                              {notification.metadata.applicationId}
                            </code>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ApprovalNotice;

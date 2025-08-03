/**
 * Notifications Component
 * 4가지 타입의 실시간 알림 시스템
 */

import { useState, FC } from 'react';
import NotificationItem from './NotificationItem';
import NotificationBadge from './NotificationBadge';
import { Bell, Filter, X, CheckCheck, AlertTriangle } from 'lucide-react';

interface NotificationData {
  id: string;
  type: 'urgent' | 'approval' | 'success' | 'info';
  title: string;
  message: string;
  time: string;
  read: boolean;
  actionUrl?: string;
}

interface NotificationsProps {
  notifications: NotificationData[];
  isLoading?: boolean;
}

const Notifications: FC<NotificationsProps> = ({ 
  notifications = [], 
  isLoading = false 
}) => {
  const [filter, setFilter] = useState<'all' | 'urgent' | 'approval' | 'success' | 'info'>('all');
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);

  // 필터링된 알림
  const filteredNotifications = notifications.filter((notification: any) => {
    const typeMatch = filter === 'all' || notification.type === filter;
    const readMatch = !showOnlyUnread || !notification.read;
    return typeMatch && readMatch;
  });

  // 타입별 카운트
  const counts = notifications.reduce((acc: any, notification: any) => {
    acc[notification.type] = (acc[notification.type] || 0) + 1;
    if (!notification.read) {
      acc.unread = (acc.unread || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const filters = [
    { key: 'all', label: '전체', count: notifications.length, color: 'gray' },
    { key: 'urgent', label: '긴급', count: counts.urgent || 0, color: 'red' },
    { key: 'approval', label: '승인', count: counts.approval || 0, color: 'orange' },
    { key: 'success', label: '성과', count: counts.success || 0, color: 'green' },
    { key: 'info', label: '정보', count: counts.info || 0, color: 'blue' }
  ];

  const handleMarkAllRead = () => {
    // 실제 구현에서는 API 호출
    // console.log('Mark all notifications as read');
  };

  const handleClearAll = () => {
    // 실제 구현에서는 API 호출
    // console.log('Clear all notifications');
  };

  if (isLoading) {
    return (
      <div className="wp-card">
        <div className="wp-card-header">
          <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="wp-card-body">
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i: any) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wp-card">
      <div className="wp-card-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Bell className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="wp-card-title">알림</h3>
            {counts.unread > 0 && (
              <NotificationBadge count={counts.unread} className="ml-2" />
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {notifications.length > 0 && (
              <>
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                  title="모두 읽음 처리"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
                <button
                  onClick={handleClearAll}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  title="모든 알림 삭제"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="wp-card-body">
        {/* Filters */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex flex-wrap gap-2">
              {filters.map((filterOption: any) => (
                <button
                  key={filterOption.key}
                  onClick={() => setFilter(filterOption.key as 'all' | 'urgent' | 'approval' | 'success' | 'info')}
                  className={`
                    px-3 py-1 text-xs rounded-full border transition-colors
                    ${filter === filterOption.key 
                      ? `border-${filterOption.color}-300 bg-${filterOption.color}-50 text-${filterOption.color}-700` 
                      : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }
                  `}
                >
                  {filterOption.label}
                  {filterOption.count > 0 && (
                    <span className="ml-1 font-medium">
                      ({filterOption.count})
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="unread-only"
                checked={showOnlyUnread}
                onChange={(e: any) => setShowOnlyUnread(e.target.checked)}
                className="mr-2 text-blue-600"
              />
              <label htmlFor="unread-only" className="text-xs text-gray-600">
                읽지 않음만
              </label>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification: any) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
              />
            ))
          ) : (
            <div className="text-center py-8">
              {filter === 'all' && !showOnlyUnread ? (
                <div>
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">새로운 알림이 없습니다</p>
                  <p className="text-gray-400 text-xs mt-1">
                    모든 작업이 정상적으로 처리되고 있습니다
                  </p>
                </div>
              ) : (
                <div>
                  <Filter className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">
                    {filter === 'all' ? '읽지 않은' : filters.find((f: any) => f.key === filter)?.label} 
                    알림이 없습니다
                  </p>
                  <button
                    onClick={() => {
                      setFilter('all');
                      setShowOnlyUnread(false);
                    }}
                    className="text-blue-600 text-xs mt-2 hover:underline"
                  >
                    모든 알림 보기
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Priority Alerts */}
        {counts.urgent > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
              <span className="text-sm text-red-700">
                <strong>{counts.urgent}개</strong>의 긴급 알림이 있습니다
              </span>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        {notifications.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-500">총 알림</p>
                <p className="text-sm font-semibold text-gray-900">
                  {notifications.length}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">읽지 않음</p>
                <p className="text-sm font-semibold text-orange-600">
                  {counts.unread || 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">긴급</p>
                <p className="text-sm font-semibold text-red-600">
                  {counts.urgent || 0}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
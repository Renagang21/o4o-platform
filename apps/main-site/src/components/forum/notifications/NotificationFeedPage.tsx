/**
 * NotificationFeedPage - Full Notifications Page
 * Phase 13: Forum Notification System
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { NotificationList } from './NotificationList';
import { type ForumNotification } from './NotificationItem';

// Notification type filter options
const TYPE_FILTERS = [
  { value: 'all', label: '전체' },
  { value: 'comment', label: '댓글' },
  { value: 'reply', label: '답글' },
  { value: 'mention', label: '멘션' },
  { value: 'like', label: '좋아요' },
  { value: 'bookmark', label: '북마크' },
  { value: 'approve', label: '승인' },
  { value: 'reject', label: '반려' },
  { value: 'pending_review', label: '검토대기' },
];

// Read status filter options
const READ_FILTERS = [
  { value: 'all', label: '전체' },
  { value: 'unread', label: '읽지 않음' },
  { value: 'read', label: '읽음' },
];

// API functions
const API_BASE = '/api/v1/forum/notifications';

async function fetchNotifications(params: {
  page?: number;
  limit?: number;
  type?: string;
  isRead?: string;
}): Promise<{
  success: boolean;
  data: ForumNotification[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}> {
  try {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.type && params.type !== 'all') searchParams.set('type', params.type);
    if (params.isRead === 'read') searchParams.set('isRead', 'true');
    else if (params.isRead === 'unread') searchParams.set('isRead', 'false');

    const response = await fetch(`${API_BASE}?${searchParams.toString()}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return {
      success: false,
      data: [],
      pagination: { total: 0, page: 1, limit: 20, totalPages: 0, hasMore: false },
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

interface NotificationFeedPageProps {
  themeClass?: string; // 'cosmetics-theme' or 'yaksa-theme'
}

export function NotificationFeedPage({ themeClass = '' }: NotificationFeedPageProps) {
  const [notifications, setNotifications] = useState<ForumNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
    hasMore: false,
  });

  // Filters
  const [typeFilter, setTypeFilter] = useState('all');
  const [readFilter, setReadFilter] = useState('all');

  // Load notifications
  const loadNotifications = useCallback(async (page: number = 1) => {
    setLoading(true);
    try {
      const result = await fetchNotifications({
        page,
        limit: 20,
        type: typeFilter,
        isRead: readFilter,
      });
      setNotifications(result.data || []);
      setPagination(result.pagination);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, readFilter]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Handle marking as read
  const handleRead = async (id: string) => {
    const success = await markNotificationAsRead(id);
    if (success) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    }
  };

  // Handle mark all as read
  const handleMarkAllRead = async () => {
    const success = await markAllAsRead();
    if (success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  };

  // Handle notification click
  const handleClick = (notification: ForumNotification) => {
    if (notification.postId && notification.metadata?.postSlug) {
      window.location.href = `/forum/post/${notification.metadata.postSlug}`;
    } else if (notification.postId) {
      window.location.href = `/forum/post/${notification.postId}`;
    }
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    loadNotifications(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className={`notification-feed-page min-h-screen bg-gray-50 ${themeClass}`}>
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a href="/forum" className="text-gray-500 hover:text-gray-700">
                ← 돌아가기
              </a>
              <h1 className="text-xl font-bold text-gray-900">알림</h1>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                  {unreadCount}개 읽지 않음
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                모두 읽음 처리
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="bg-white rounded-lg border p-4 mb-4">
          <div className="flex flex-wrap gap-4">
            {/* Type Filter */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                알림 유형
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {TYPE_FILTERS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Read Status Filter */}
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                읽음 상태
              </label>
              <select
                value={readFilter}
                onChange={(e) => setReadFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {READ_FILTERS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Notification List */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <NotificationList
            notifications={notifications}
            loading={loading}
            onRead={handleRead}
            onClick={handleClick}
            emptyMessage="조건에 맞는 알림이 없습니다."
          />
        </div>

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              이전
            </button>
            <span className="px-4 py-2 text-sm text-gray-600">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasMore}
              className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              다음
            </button>
          </div>
        )}

        {/* Total count */}
        {!loading && pagination.total > 0 && (
          <p className="text-center text-sm text-gray-500 mt-4">
            총 {pagination.total}개의 알림
          </p>
        )}
      </main>
    </div>
  );
}

export default NotificationFeedPage;

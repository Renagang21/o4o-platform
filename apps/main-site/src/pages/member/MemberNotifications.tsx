/**
 * MemberNotifications - Member Notification Inbox
 *
 * Phase 20-C: 알림함 전용 페이지
 * 회원이 모든 알림을 확인하고 조치할 수 있는 전용 화면
 *
 * Features:
 * - 전체 알림 목록
 * - 읽음/미읽음 필터
 * - 알림 타입별 딥링크 연결
 * - 일괄 읽음 처리
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import { useAuth } from '@/context';
import { PageLoading } from '@/components/common';

// Notification Types
interface MemberNotification {
  id: string;
  type: string;
  title: string;
  message?: string;
  isRead: boolean;
  createdAt: string;
  metadata?: {
    memberId?: string;
    priority?: 'low' | 'normal' | 'high' | 'critical';
    daysUntilExpiry?: number;
    daysUntilDue?: number;
    daysUntilDeadline?: number;
    year?: number;
    amount?: number;
    courseId?: string;
    courseName?: string;
    rejectReason?: string;
    [key: string]: any;
  };
}

type FilterType = 'all' | 'unread' | 'read';

// Deep link mapping for notification types
const NOTIFICATION_DEEP_LINKS: Record<string, string> = {
  'member.license_expiring': '/member/profile',
  'member.license_expired': '/member/profile',
  'member.verification_expired': '/member/profile',
  'member.fee_overdue_warning': '/member/fees',
  'member.fee_overdue': '/member/fees',
  // WO-O4O-YAKSA-REPORTS-NONFUNCTIONAL-UI-AND-DEAD-CONTRACT-REMOVAL-V1: 'member.report_rejected' 제거 (`/member/reports` route 부재)
  'member.education_deadline': '/member/lms/required-courses',
};

// Notification type metadata
const NOTIFICATION_META: Record<string, { icon: string; label: string; color: string }> = {
  'member.license_expiring': { icon: '📜', label: '면허 만료 예정', color: 'yellow' },
  'member.license_expired': { icon: '⚠️', label: '면허 만료', color: 'red' },
  'member.verification_expired': { icon: '🔒', label: '자격 검증 만료', color: 'red' },
  'member.fee_overdue_warning': { icon: '💳', label: '회비 납부 예정', color: 'yellow' },
  'member.fee_overdue': { icon: '🚨', label: '회비 연체', color: 'red' },
  'member.education_deadline': { icon: '📚', label: '교육 마감 임박', color: 'yellow' },
};

export function MemberNotifications() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<MemberNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const LIMIT = 20;

  // Load notifications
  const loadNotifications = useCallback(async (pageNum: number, append = false) => {
    if (!isAuthenticated) return;

    try {
      const offset = (pageNum - 1) * LIMIT;
      const res = await authClient.api.get(
        `/api/v2/notifications?limit=${LIMIT}&offset=${offset}&channel=in_app`
      );

      const data = res.data?.data || [];
      // Filter member notifications only
      const memberNotifs = data.filter((n: MemberNotification) => n.type.startsWith('member.'));

      if (append) {
        setNotifications(prev => [...prev, ...memberNotifs]);
      } else {
        setNotifications(memberNotifs);
      }

      setHasMore(data.length === LIMIT);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Load unread count
  const loadUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const res = await authClient.api.get('/api/v2/notifications/unread-count?channel=in_app');
      setUnreadCount(res.data?.data?.count || 0);
    } catch (err) {
      console.error('Failed to load unread count:', err);
    }
  }, [isAuthenticated]);

  // Mark single notification as read
  const markAsRead = useCallback(async (notification: MemberNotification) => {
    if (notification.isRead) return;

    try {
      await authClient.api.post(`/api/v2/notifications/${notification.id}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await authClient.api.post('/api/v2/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  }, []);

  // Handle notification click - mark as read and navigate
  const handleNotificationClick = useCallback(async (notification: MemberNotification) => {
    // Mark as read first
    await markAsRead(notification);

    // Get deep link
    let targetPath = NOTIFICATION_DEEP_LINKS[notification.type] || '/member';

    // Special handling for education_deadline with courseId
    if (notification.type === 'member.education_deadline' && notification.metadata?.courseId) {
      targetPath = `/member/lms/course/${notification.metadata.courseId}`;
    }

    navigate(targetPath);
  }, [markAsRead, navigate]);

  // Load more
  const loadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadNotifications(nextPage, true);
  }, [page, loadNotifications]);

  // Initial load
  useEffect(() => {
    loadNotifications(1);
    loadUnreadCount();
  }, [loadNotifications, loadUnreadCount]);

  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'read') return n.isRead;
    return true;
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <span className="text-6xl mb-4 block">🔒</span>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">로그인이 필요합니다</h1>
          <p className="text-gray-600 mb-6">알림을 확인하려면 로그인해 주세요.</p>
          <Link
            to="/login"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            로그인
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <PageLoading message="알림을 불러오는 중..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/member"
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="뒤로"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">알림함</h1>
                <p className="text-gray-600 mt-1">
                  {unreadCount > 0 ? `${unreadCount}개의 미확인 알림` : '모든 알림을 확인했습니다'}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                모두 읽음 처리
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4">
          <nav className="flex gap-1" aria-label="Filters">
            {([
              { id: 'all', label: '전체', count: notifications.length },
              { id: 'unread', label: '미확인', count: notifications.filter(n => !n.isRead).length },
              { id: 'read', label: '확인함', count: notifications.filter(n => n.isRead).length },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                  filter === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs ${
                    filter === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Notification List */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {filteredNotifications.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onClick={() => handleNotificationClick(notification)}
              />
            ))}

            {/* Load More */}
            {hasMore && filter === 'all' && (
              <div className="text-center pt-4">
                <button
                  type="button"
                  onClick={loadMore}
                  className="px-6 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  더 보기
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Notification Card =====
function NotificationCard({
  notification,
  onClick,
}: {
  notification: MemberNotification;
  onClick: () => void;
}) {
  const meta = NOTIFICATION_META[notification.type] || { icon: '🔔', label: '알림', color: 'gray' };
  const priority = notification.metadata?.priority || 'normal';

  const colorClasses = {
    red: 'border-l-red-500 bg-red-50',
    yellow: 'border-l-yellow-500 bg-yellow-50',
    blue: 'border-l-blue-500 bg-blue-50',
    gray: 'border-l-gray-400 bg-gray-50',
  };

  const priorityBadge = priority === 'high' || priority === 'critical' ? (
    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
      긴급
    </span>
  ) : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left bg-white rounded-lg border border-gray-200 overflow-hidden
        hover:shadow-md transition-all cursor-pointer ${notification.isRead ? 'opacity-70' : ''}`}
    >
      <div className={`p-4 border-l-4 ${colorClasses[meta.color as keyof typeof colorClasses]}`}>
        <div className="flex items-start gap-3">
          {/* Icon */}
          <span className="text-2xl flex-shrink-0">{meta.icon}</span>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-gray-500 uppercase tracking-wide">{meta.label}</span>
              {priorityBadge}
              {!notification.isRead && (
                <span className="w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </div>

            {/* Title */}
            <h3 className={`font-medium ${notification.isRead ? 'text-gray-600' : 'text-gray-900'}`}>
              {notification.title}
            </h3>

            {/* Message */}
            {notification.message && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                {notification.message}
              </p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-gray-400">
                {formatRelativeTime(notification.createdAt)}
              </span>
              <span className="text-xs text-blue-600 flex items-center gap-1">
                조치하기
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

// ===== Empty State =====
function EmptyState({ filter }: { filter: FilterType }) {
  const messages = {
    all: {
      icon: '🔔',
      title: '알림이 없습니다',
      description: '새로운 알림이 도착하면 여기에 표시됩니다.',
    },
    unread: {
      icon: '✅',
      title: '모든 알림을 확인했습니다',
      description: '미확인 알림이 없습니다.',
    },
    read: {
      icon: '📭',
      title: '확인한 알림이 없습니다',
      description: '알림을 확인하면 여기에 표시됩니다.',
    },
  };

  const msg = messages[filter];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
      <span className="text-5xl block mb-4">{msg.icon}</span>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{msg.title}</h3>
      <p className="text-gray-500 mb-6">{msg.description}</p>
      <Link
        to="/member"
        className="inline-flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        회원 포털로 돌아가기
      </Link>
    </div>
  );
}

// ===== Helper Functions =====
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;

  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default MemberNotifications;

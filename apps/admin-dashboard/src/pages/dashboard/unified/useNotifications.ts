/**
 * Unified Notification v1 - useNotifications Hook
 * 사용자 기준 알림 집계 및 중복 제거 로직
 *
 * 원칙:
 * - 사용자 기준 단일 알림 집계
 * - 컨텍스트(역할)별 그룹화
 * - 중복 알림 제거 (referenceType + referenceId 기준)
 * - AI 요약용 데이터 제공
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@o4o/auth-context';
import type {
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationContextTag,
  NotificationGroup,
  UserNotificationSummary,
  NotificationAIContext,
  UserContextType,
} from './types';

// 우선순위 가중치 (정렬용)
const PRIORITY_WEIGHT: Record<NotificationPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

// 타입 라벨
const TYPE_LABELS: Record<NotificationType, string> = {
  system: '시스템',
  business: '비즈니스',
  organization: '조직',
  information: '정보',
};

export interface UseNotificationsOptions {
  // 자동 갱신 간격 (ms), 0이면 비활성화
  refreshInterval?: number;
  // 표시할 최대 알림 수
  maxNotifications?: number;
  // 필터링할 컨텍스트 (null이면 전체)
  contextFilter?: NotificationContextTag | null;
}

export interface UseNotificationsReturn {
  // 전체 알림 목록 (중복 제거 후)
  notifications: Notification[];
  // 사용자 알림 요약
  summary: UserNotificationSummary | null;
  // AI 요약용 컨텍스트
  aiContext: NotificationAIContext | null;
  // 컨텍스트별 알림 그룹
  getNotificationsByContext: (context: NotificationContextTag) => NotificationGroup | null;
  // 읽음 처리
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: (context?: NotificationContextTag) => Promise<void>;
  // 상태
  isLoading: boolean;
  error: Error | null;
  // 수동 갱신
  refresh: () => Promise<void>;
}

/**
 * Mock 알림 데이터 생성
 * 실제 구현 시 API 호출로 대체
 */
function generateMockNotifications(userId: string): Notification[] {
  const now = new Date();
  const mockNotifications: Notification[] = [];

  // 시스템 알림
  mockNotifications.push({
    id: 'notif-1',
    userId,
    type: 'system',
    priority: 'critical',
    contextTag: 'global',
    title: '시스템 점검 안내',
    message: '1월 15일 새벽 2시-4시 시스템 점검 예정입니다.',
    referenceType: 'notice',
    referenceId: 'notice-001',
    timestamp: new Date(now.getTime() - 1000 * 60 * 30),
    isRead: false,
  });

  // 비즈니스 알림 - 판매자
  mockNotifications.push({
    id: 'notif-2',
    userId,
    type: 'business',
    priority: 'high',
    contextTag: 'seller',
    title: '새 주문 3건',
    message: '처리 대기 중인 주문이 있습니다.',
    referenceType: 'order',
    referenceId: 'order-batch-001',
    timestamp: new Date(now.getTime() - 1000 * 60 * 5),
    isRead: false,
    actionUrl: '/orders',
    actionLabel: '주문 확인',
  });

  // 비즈니스 알림 - 정산
  mockNotifications.push({
    id: 'notif-3',
    userId,
    type: 'business',
    priority: 'medium',
    contextTag: 'seller',
    title: '정산 완료',
    message: '12월 정산금 1,250,000원이 입금되었습니다.',
    referenceType: 'settlement',
    referenceId: 'settlement-202412',
    timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 2),
    isRead: true,
    readAt: new Date(now.getTime() - 1000 * 60 * 60),
  });

  // 조직 알림
  mockNotifications.push({
    id: 'notif-4',
    userId,
    type: 'organization',
    priority: 'high',
    contextTag: 'executive',
    title: '지부 회의 안건 등록',
    message: '2건의 새 안건이 등록되었습니다.',
    referenceType: 'agenda',
    referenceId: 'agenda-batch-001',
    timestamp: new Date(now.getTime() - 1000 * 60 * 15),
    isRead: false,
    actionUrl: '/organization/agendas',
    actionLabel: '안건 확인',
  });

  // 정보성 알림
  mockNotifications.push({
    id: 'notif-5',
    userId,
    type: 'information',
    priority: 'low',
    contextTag: 'global',
    title: '새로운 기능 안내',
    message: '통합 대시보드가 업데이트되었습니다.',
    referenceType: 'feature',
    referenceId: 'feature-unified-dashboard',
    timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 24),
    isRead: false,
  });

  // 운영자 알림
  mockNotifications.push({
    id: 'notif-6',
    userId,
    type: 'business',
    priority: 'high',
    contextTag: 'operator',
    title: '신규 회원 가입 승인 대기',
    message: '5건의 회원 가입 승인이 필요합니다.',
    referenceType: 'membership',
    referenceId: 'membership-batch-001',
    timestamp: new Date(now.getTime() - 1000 * 60 * 10),
    isRead: false,
    actionUrl: '/membership/pending',
    actionLabel: '승인 처리',
  });

  return mockNotifications;
}

/**
 * 중복 알림 제거
 * referenceType + referenceId 기준으로 최신 알림만 유지
 */
function deduplicateNotifications(notifications: Notification[]): Notification[] {
  const seen = new Map<string, Notification>();

  // 최신순 정렬 후 처리
  const sorted = [...notifications].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  for (const notification of sorted) {
    // referenceType과 referenceId가 모두 있는 경우에만 중복 체크
    if (notification.referenceType && notification.referenceId) {
      const key = `${notification.referenceType}:${notification.referenceId}`;
      if (!seen.has(key)) {
        seen.set(key, notification);
      }
      // 이미 있으면 최신 것이 먼저 들어갔으므로 무시
    } else {
      // reference 정보가 없으면 고유 알림으로 처리
      seen.set(notification.id, notification);
    }
  }

  return Array.from(seen.values());
}

/**
 * 알림을 컨텍스트별로 그룹화
 */
function groupByContext(
  notifications: Notification[]
): Record<NotificationContextTag, NotificationGroup> {
  const groups: Partial<Record<NotificationContextTag, NotificationGroup>> = {};

  for (const notification of notifications) {
    const ctx = notification.contextTag;

    if (!groups[ctx]) {
      groups[ctx] = {
        contextTag: ctx,
        type: notification.type,
        count: 0,
        unreadCount: 0,
        highestPriority: 'low',
        latestTimestamp: notification.timestamp,
        notifications: [],
      };
    }

    const group = groups[ctx]!;
    group.count++;
    if (!notification.isRead) {
      group.unreadCount++;
    }

    // 가장 높은 우선순위 갱신
    if (PRIORITY_WEIGHT[notification.priority] < PRIORITY_WEIGHT[group.highestPriority]) {
      group.highestPriority = notification.priority;
    }

    // 최신 타임스탬프 갱신
    if (new Date(notification.timestamp) > new Date(group.latestTimestamp)) {
      group.latestTimestamp = notification.timestamp;
    }

    group.notifications.push(notification);
  }

  // 각 그룹 내 알림을 우선순위 + 시간순 정렬
  for (const group of Object.values(groups)) {
    if (group) {
      group.notifications.sort((a, b) => {
        const priorityDiff = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
    }
  }

  return groups as Record<NotificationContextTag, NotificationGroup>;
}

/**
 * 사용자 알림 요약 생성
 */
function createSummary(
  userId: string,
  notifications: Notification[],
  byContext: Record<NotificationContextTag, NotificationGroup>
): UserNotificationSummary {
  const byType: Record<NotificationType, number> = {
    system: 0,
    business: 0,
    organization: 0,
    information: 0,
  };

  const byPriority: Record<NotificationPriority, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  let unreadCount = 0;
  const criticalNotifications: Notification[] = [];

  for (const notification of notifications) {
    byType[notification.type]++;
    byPriority[notification.priority]++;

    if (!notification.isRead) {
      unreadCount++;
    }

    if (notification.priority === 'critical') {
      criticalNotifications.push(notification);
    }
  }

  return {
    userId,
    totalCount: notifications.length,
    unreadCount,
    byType,
    byContext,
    byPriority,
    criticalNotifications,
    lastUpdated: new Date(),
  };
}

/**
 * AI 요약용 컨텍스트 생성
 */
function createAIContext(
  summary: UserNotificationSummary,
  notifications: Notification[]
): NotificationAIContext {
  // 최근 high 이상 우선순위 알림
  const recentHighPriority = notifications
    .filter((n) => n.priority === 'critical' || n.priority === 'high')
    .slice(0, 5);

  // 액션이 필요한 알림 (actionUrl이 있고 읽지 않은 것)
  const actionRequired = notifications.filter((n) => n.actionUrl && !n.isRead).slice(0, 5);

  return {
    summary,
    recentHighPriority,
    actionRequired,
  };
}

/**
 * 사용자 알림 관리 훅
 */
export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const { refreshInterval = 60000, maxNotifications = 50, contextFilter = null } = options;

  const { user } = useAuth();
  const [rawNotifications, setRawNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 알림 로드
  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      // Mock: 실제 구현 시 API 호출로 대체
      await new Promise((r) => setTimeout(r, 200));
      const notifications = generateMockNotifications(String(user.id));
      setRawNotifications(notifications);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('알림 로드 실패'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // 초기 로드 및 자동 갱신
  useEffect(() => {
    loadNotifications();

    if (refreshInterval > 0) {
      const interval = setInterval(loadNotifications, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [loadNotifications, refreshInterval]);

  // 중복 제거된 알림
  const notifications = useMemo(() => {
    let filtered = deduplicateNotifications(rawNotifications);

    // 컨텍스트 필터 적용
    if (contextFilter) {
      filtered = filtered.filter((n) => n.contextTag === contextFilter);
    }

    // 우선순위 + 시간순 정렬
    filtered.sort((a, b) => {
      const priorityDiff = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    // 최대 개수 제한
    return filtered.slice(0, maxNotifications);
  }, [rawNotifications, contextFilter, maxNotifications]);

  // 컨텍스트별 그룹
  const byContext = useMemo(() => groupByContext(notifications), [notifications]);

  // 요약 데이터
  const summary = useMemo(() => {
    if (!user?.id) return null;
    return createSummary(String(user.id), notifications, byContext);
  }, [user?.id, notifications, byContext]);

  // AI 컨텍스트
  const aiContext = useMemo(() => {
    if (!summary) return null;
    return createAIContext(summary, notifications);
  }, [summary, notifications]);

  // 컨텍스트별 알림 조회
  const getNotificationsByContext = useCallback(
    (context: NotificationContextTag): NotificationGroup | null => {
      return byContext[context] || null;
    },
    [byContext]
  );

  // 읽음 처리
  const markAsRead = useCallback(async (notificationId: string) => {
    // Mock: 실제 구현 시 API 호출로 대체
    setRawNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId
          ? { ...n, isRead: true, readAt: new Date() }
          : n
      )
    );
  }, []);

  // 전체/컨텍스트별 읽음 처리
  const markAllAsRead = useCallback(async (context?: NotificationContextTag) => {
    // Mock: 실제 구현 시 API 호출로 대체
    setRawNotifications((prev) =>
      prev.map((n) => {
        if (context && n.contextTag !== context) return n;
        return n.isRead ? n : { ...n, isRead: true, readAt: new Date() };
      })
    );
  }, []);

  return {
    notifications,
    summary,
    aiContext,
    getNotificationsByContext,
    markAsRead,
    markAllAsRead,
    isLoading,
    error,
    refresh: loadNotifications,
  };
}

export default useNotifications;

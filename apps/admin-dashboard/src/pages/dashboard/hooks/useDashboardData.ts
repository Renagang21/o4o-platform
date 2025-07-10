/**
 * Dashboard Data Management Hook
 * 대시보드 데이터 관리 훅 - 수동 새로고침 방식
 */

import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../../api/dashboard';

// Types
interface DashboardStats {
  users: {
    total: number;
    pending: number;
    today: number;
    activeRate: number;
    change: number;
    trend: 'up' | 'down';
  };
  sales: {
    today: number;
    changePercent: number;
    monthlyTotal: number;
    monthlyTarget: number;
    trend: 'up' | 'down';
  };
  products: {
    active: number;
    lowStock: number;
    newThisWeek: number;
    bestsellers: Array<{
      id: string;
      name: string;
      sales: number;
    }>;
    change: number;
    trend: 'up' | 'down';
  };
  content: {
    publishedPages: number;
    draftContent: number;
    totalMedia: number;
    todayViews: number;
    change: number;
    trend: 'up' | 'down';
  };
  partners: {
    active: number;
    pending: number;
    totalCommission: number;
    topPartners: Array<{
      id: string;
      name: string;
      commission: number;
    }>;
    change: number;
    trend: 'up' | 'down';
  };
}

interface ChartData {
  sales: Array<{
    date: string;
    amount: number;
    orders: number;
  }>;
  orders: Array<{
    status: string;
    count: number;
    color: string;
  }>;
  users: Array<{
    date: string;
    newUsers: number;
    activeUsers: number;
  }>;
}

interface NotificationItem {
  id: string;
  type: 'urgent' | 'approval' | 'success' | 'info';
  title: string;
  message: string;
  time: string;
  read: boolean;
  actionUrl?: string;
}

interface ActivityItem {
  id: string;
  type: 'user' | 'order' | 'product' | 'content';
  message: string;
  time: string;
  user?: string;
  icon: string;
}

interface SystemHealth {
  api: {
    status: 'healthy' | 'warning' | 'error';
    responseTime: number;
    lastCheck: string;
  };
  database: {
    status: 'healthy' | 'warning' | 'error';
    connections: number;
    lastCheck: string;
  };
  storage: {
    status: 'healthy' | 'warning' | 'error';
    usage: number;
    total: number;
  };
  memory: {
    status: 'healthy' | 'warning' | 'error';
    usage: number;
    total: number;
  };
}

export const useDashboardData = () => {
  const [manualRefreshTrigger, setManualRefreshTrigger] = useState(0);

  // Stats data query
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats
  } = useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats', manualRefreshTrigger],
    queryFn: () => dashboardApi.getStats(),
    enabled: false, // 수동 새로고침만 허용
    staleTime: 5 * 60 * 1000, // 5분간 fresh
    gcTime: 10 * 60 * 1000, // 10분간 캐시 유지
    retry: 2
  });

  // Chart data query
  const {
    data: chartData,
    isLoading: chartLoading,
    error: chartError,
    refetch: refetchCharts
  } = useQuery<ChartData>({
    queryKey: ['dashboard', 'charts', manualRefreshTrigger],
    queryFn: () => dashboardApi.getChartData(),
    enabled: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2
  });

  // Notifications query
  const {
    data: notificationsData,
    isLoading: notificationsLoading,
    refetch: refetchNotifications
  } = useQuery<{
    items: NotificationItem[];
    total: number;
    urgent: number;
    approval: number;
  }>({
    queryKey: ['dashboard', 'notifications', manualRefreshTrigger],
    queryFn: () => dashboardApi.getNotifications(),
    enabled: false,
    staleTime: 2 * 60 * 1000, // 알림은 2분간만 fresh
    retry: 2
  });

  // Activities query
  const {
    data: activities,
    isLoading: activitiesLoading,
    refetch: refetchActivities
  } = useQuery<ActivityItem[]>({
    queryKey: ['dashboard', 'activities', manualRefreshTrigger],
    queryFn: () => dashboardApi.getRecentActivities(),
    enabled: false,
    staleTime: 3 * 60 * 1000, // 3분간 fresh
    retry: 2
  });

  // System health query
  const {
    data: systemHealth,
    isLoading: healthLoading,
    refetch: refetchHealth
  } = useQuery<SystemHealth>({
    queryKey: ['dashboard', 'health', manualRefreshTrigger],
    queryFn: () => dashboardApi.getSystemHealth(),
    enabled: false,
    staleTime: 30 * 1000, // 30초간만 fresh (시스템 상태는 자주 확인)
    retry: 1
  });

  // 전체 로딩 상태
  const isLoading = statsLoading || chartLoading || notificationsLoading || 
                   activitiesLoading || healthLoading;

  // 전체 에러 상태
  const error = statsError || chartError;

  // 수동 새로고침 함수
  const refreshAllData = useCallback(async () => {
    const timestamp = Date.now();
    setManualRefreshTrigger(timestamp);

    // 모든 쿼리를 병렬로 실행
    const refreshPromises = [
      refetchStats(),
      refetchCharts(),
      refetchNotifications(),
      refetchActivities(),
      refetchHealth()
    ];

    try {
      await Promise.allSettled(refreshPromises);
    } catch (error) {
      console.error('Error refreshing dashboard data:', error);
      throw error;
    }
  }, [refetchStats, refetchCharts, refetchNotifications, refetchActivities, refetchHealth]);

  // 초기 데이터 로드
  useEffect(() => {
    refreshAllData();
  }, []);

  // 개별 섹션 새로고침 함수들
  const refreshStats = useCallback(() => refetchStats(), [refetchStats]);
  const refreshCharts = useCallback(() => refetchCharts(), [refetchCharts]);
  const refreshNotifications = useCallback(() => refetchNotifications(), [refetchNotifications]);

  return {
    // Data
    stats,
    chartData,
    notifications: notificationsData,
    activities,
    systemHealth,

    // Loading states
    isLoading,
    error,

    // Refresh functions
    refreshAllData,
    refreshStats,
    refreshCharts,
    refreshNotifications,

    // Individual loading states (for granular control)
    loadingStates: {
      stats: statsLoading,
      charts: chartLoading,
      notifications: notificationsLoading,
      activities: activitiesLoading,
      health: healthLoading
    }
  };
};
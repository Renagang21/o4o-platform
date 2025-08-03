/**
 * Main Dashboard - Enhanced WordPress-style Admin Dashboard
 * 강화된 WordPress 스타일 관리자 대시보드
 */

import { useState, useCallback, FC } from 'react';
import { 
  RefreshCw,
  Clock,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Bell
} from 'lucide-react';

// Components
import StatsCards from './components/StatsCards';
// import Charts from './components/Charts';
import QuickActions from './components/QuickActions';
import Notifications from './components/Notifications';
import ActivityFeed from './components/ActivityFeed';
import SystemHealth from './components/SystemHealth';
import RefreshButton from './components/common/RefreshButton';
import ErrorBoundary from './components/common/ErrorBoundary';

// Hooks
import { useDashboardData } from './hooks/useDashboardData';
import { useRefresh } from './hooks/useRefresh';

// Transform stats to match StatsCards expected format
const transformStats = (stats: any) => {
  if (!stats) return undefined;
  
  return {
    users: typeof stats.users === 'object' ? stats.users : {
      total: stats.users || 0,
      pending: 0,
      today: 0,
      activeRate: 0,
      change: 0,
      trend: 'up' as const
    },
    sales: stats.sales || {
      today: 0,
      changePercent: 0,
      monthlyTotal: 0,
      monthlyTarget: 0,
      trend: 'up' as const
    },
    products: typeof stats.products === 'object' ? stats.products : {
      active: stats.products || 0,
      lowStock: 0,
      newThisWeek: 0,
      bestsellers: [],
      change: 0,
      trend: 'up' as const
    },
    content: stats.content || {
      publishedPages: 0,
      draftContent: 0,
      totalMedia: 0,
      todayViews: 0,
      change: 0,
      trend: 'up' as const
    },
    partners: stats.partners || {
      active: 0,
      pending: 0,
      totalCommission: 0,
      topPartners: [],
      change: 0,
      trend: 'up' as const
    }
  };
};

const MainDashboard: FC = () => {
  const [lastRefresh, setLastRefresh] = useState(new Date());
  
  // Dashboard data management
  const { 
    stats, 
    notifications, 
    activities,
    isLoading,
    error,
    refreshAllData
  } = useDashboardData();

  // Refresh control
  const { 
    isRefreshing, 
    refreshWithDelay 
  } = useRefresh();

  // Manual refresh handler
  const handleRefresh = useCallback(async () => {
    await refreshWithDelay(async () => {
      await refreshAllData();
      setLastRefresh(new Date());
    });
  }, [refreshAllData, refreshWithDelay]);

  // Welcome message based on time
  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '좋은 아침입니다!';
    if (hour < 18) return '좋은 오후입니다!';
    return '좋은 저녁입니다!';
  };

  const formatLastUpdate = (date: Date) => {
    return new Intl.DateTimeFormat('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="wp-card max-w-md w-full">
          <div className="wp-card-body text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              대시보드 로딩 오류
            </h3>
            <p className="text-gray-600 mb-4">
              데이터를 불러오는 중 문제가 발생했습니다.
            </p>
            <button 
              onClick={handleRefresh}
              className="wp-button-primary"
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  다시 시도 중...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  다시 시도
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
      {/* Enhanced Header with Refresh Control */}
      <div className="bg-white border-b border-gray-200 -mx-6 -mt-6 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {getWelcomeMessage()} 관리자님
            </h1>
            <p className="text-gray-600 mt-1">
              O4O 플랫폼의 실시간 현황을 확인하고 관리하세요
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Last Update Time */}
            <div className="flex items-center text-sm text-gray-500">
              <Clock className="w-4 h-4 mr-1" />
              마지막 업데이트: {formatLastUpdate(lastRefresh)}
            </div>
            
            {/* Refresh Button */}
            <RefreshButton 
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
              className="wp-button-secondary"
            />
            
            {/* Quick Settings */}
            <button className="wp-button-secondary">
              <Settings className="w-4 h-4 mr-2" />
              정책 설정
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-8">
        {/* Statistics Cards Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              주요 지표
            </h2>
            {notifications?.urgent && notifications.urgent > 0 && (
              <div className="flex items-center text-red-600">
                <AlertTriangle className="w-4 h-4 mr-1" />
                <span className="text-sm font-medium">
                  {notifications?.urgent}개의 긴급 알림
                </span>
              </div>
            )}
          </div>
          
          <StatsCards 
            stats={transformStats(stats)}
            isLoading={isLoading}
          />
        </section>

        {/* Charts and Analytics Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              분석 및 트렌드
            </h2>
            <div className="text-sm text-gray-500">
              차트 데이터는 수동 새로고침으로 업데이트됩니다
            </div>
          </div>
          
          {/* <Charts 
            data={chartData}
            isLoading={isLoading}
          /> */}
          <div className="text-center py-8 text-gray-500">
            차트는 준비 중입니다.
          </div>
        </section>

        {/* Quick Actions and Notifications */}
        <section>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Quick Actions */}
            <div className="lg:col-span-1">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                빠른 작업
              </h2>
              <QuickActions />
            </div>

            {/* Notifications */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  실시간 알림
                </h2>
                <div className="flex items-center">
                  <Bell className="w-4 h-4 mr-1 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    총 {notifications?.total || 0}개
                  </span>
                </div>
              </div>
              <Notifications 
                notifications={notifications?.items || []}
                isLoading={isLoading}
              />
            </div>
          </div>
        </section>

        {/* Activity Feed and System Health */}
        <section>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Activity Feed */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                최근 활동
              </h2>
              <ActivityFeed 
                activities={activities || []}
                isLoading={isLoading}
              />
            </div>

            {/* System Health */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                시스템 상태
              </h2>
              <SystemHealth />
            </div>
          </div>
        </section>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center">
              <RefreshCw className="w-5 h-5 mr-3 animate-spin text-blue-600" />
              <span className="text-gray-900">데이터를 업데이트하는 중...</span>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {!isLoading && !error && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-lg">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              <span className="text-sm">대시보드가 성공적으로 업데이트되었습니다</span>
            </div>
          </div>
        </div>
      )}
      </div>
    </ErrorBoundary>
  );
};

export default MainDashboard;
/**
 * Realtime Statistics Widget (MVP)
 * 실시간 통계 위젯 - 실시간 데이터와 Socket.io 연동
 */

import { useState, useEffect, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Activity,
  Users,
  ShoppingBag,
  MessageCircle,
  TrendingUp,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { 
  RealtimeOverviewResponse, 
  DASHBOARD_API_ENDPOINTS,
  DashboardApiUtils
} from '../../../../types/dashboard-api';
import apiClient from '../../../../api/base';

interface RealtimeStatsProps {
  className?: string;
}

// Socket.io 연결 상태 시뮬레이션 (실제 구현 시 Socket.io 클라이언트 사용)
const useRealtimeConnection = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  useEffect(() => {
    // 실시간 연결 시뮬레이션
    const connectTimeout = setTimeout(() => {
      setIsConnected(true);
      setLastUpdate(new Date().toISOString());
    }, 1000);

    // 주기적 업데이트 시뮬레이션 (실제로는 Socket.io 이벤트)
    const updateInterval = setInterval(() => {
      if (isConnected) {
        setLastUpdate(new Date().toISOString());
      }
    }, 10000); // 10초마다 업데이트

    return () => {
      clearTimeout(connectTimeout);
      clearInterval(updateInterval);
    };
  }, [isConnected]);

  return { isConnected, lastUpdate };
};

const RealtimeStats = memo<RealtimeStatsProps>(({ className = '' }) => {
  const { isConnected, lastUpdate } = useRealtimeConnection();
  
  // 실시간 개요 데이터 조회
  const { 
    data: realtimeData, 
    isLoading, 
    error,
    refetch
  } = useQuery<RealtimeOverviewResponse>({
    queryKey: ['dashboard', 'realtime-overview'],
    queryFn: async () => {
      const response = await apiClient.get(DASHBOARD_API_ENDPOINTS.REALTIME_OVERVIEW);
      return response.data;
    },
    staleTime: 0, // 항상 fresh data로 취급
    refetchInterval: isConnected ? 15 * 1000 : false, // 연결시 15초마다 새로고침
  });

  if (error) {
    return (
      <div className={`wp-card ${className}`}>
        <div className="wp-card-body">
          <div className="text-center py-8">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">실시간 데이터 로드 실패</h3>
            <p className="text-sm text-gray-600 mb-4">실시간 통계를 불러오는 중 오류가 발생했습니다.</p>
            <button 
              onClick={() => refetch()} 
              className="wp-button wp-button-primary wp-button-sm"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 위젯 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-blue-600" />
          실시간 현황
        </h2>
        <div className="flex items-center space-x-3">
          {/* 연결 상태 */}
          <div className="flex items-center text-xs">
            {isConnected ? (
              <div className="flex items-center text-green-600">
                <Wifi className="w-4 h-4 mr-1" />
                <span>실시간 연결</span>
              </div>
            ) : (
              <div className="flex items-center text-red-500">
                <WifiOff className="w-4 h-4 mr-1" />
                <span>연결 끊김</span>
              </div>
            )}
          </div>
          
          {/* 로딩 상태 */}
          {isLoading && (
            <div className="flex items-center text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              업데이트 중...
            </div>
          )}
          
          {/* 마지막 업데이트 시간 */}
          {lastUpdate && (
            <span className="text-xs text-gray-400">
              {DashboardApiUtils.getRelativeTime(lastUpdate)}
            </span>
          )}
        </div>
      </div>

      {/* 실시간 통계 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 실시간 방문자 */}
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">실시간 방문자</p>
                <p className="text-2xl font-bold text-blue-600">
                  {isLoading ? (
                    <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                  ) : (
                    DashboardApiUtils.formatNumber(realtimeData?.data.currentUsers.online || 0)
                  )}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            {!isLoading && realtimeData && (
              <div className="mt-2 flex items-center text-xs text-gray-500">
                <TrendingUp className="w-3 h-3 mr-1" />
                채팅 중 {DashboardApiUtils.formatNumber(realtimeData.data.currentUsers.chatting)}명, 구매 중 {DashboardApiUtils.formatNumber(realtimeData.data.currentUsers.purchasing)}명
              </div>
            )}
          </div>
        </div>

        {/* 실시간 주문 */}
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">실시간 주문</p>
                <p className="text-2xl font-bold text-green-600">
                  {isLoading ? (
                    <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                  ) : (
                    DashboardApiUtils.formatNumber(realtimeData?.data.realtimeActivities.newOrders || 0)
                  )}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-green-600" />
              </div>
            </div>
            {!isLoading && realtimeData && (
              <div className="mt-2 flex items-center text-xs text-gray-500">
                <span>지난 5분간 신규 주문</span>
              </div>
            )}
          </div>
        </div>

        {/* 실시간 활동 */}
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">실시간 활동</p>
                <p className="text-2xl font-bold text-purple-600">
                  {isLoading ? (
                    <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                  ) : (
                    DashboardApiUtils.formatNumber(realtimeData?.data.realtimeActivities.newPosts || 0)
                  )}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            {!isLoading && realtimeData && (
              <div className="mt-2 flex items-center text-xs text-gray-500">
                <span>신규 게시글: {DashboardApiUtils.formatNumber(realtimeData.data.realtimeActivities.newPosts)}개, 가입: {DashboardApiUtils.formatNumber(realtimeData.data.realtimeActivities.newRegistrations)}개</span>
              </div>
            )}
          </div>
        </div>

        {/* 서버 응답시간 */}
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">응답시간</p>
                <p className="text-2xl font-bold text-orange-600">
                  {isLoading ? (
                    <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                  ) : (
                    `${realtimeData?.data.liveMetrics.averageResponseTime || 0}ms`
                  )}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            {!isLoading && realtimeData && (
              <div className="mt-2 flex items-center text-xs text-gray-500">
                <span>서버 부하: {realtimeData.data.liveMetrics.serverLoad}%, 에러율: {realtimeData.data.liveMetrics.errorRate}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 실시간 트렌드 차트 영역 (placeholder) */}
      <div className="wp-card">
        <div className="wp-card-body">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-900">실시간 트렌드</h3>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>방문자</span>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>주문</span>
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>활동</span>
            </div>
          </div>
          
          {/* 차트 영역 (실제 구현시 Chart.js나 다른 차트 라이브러리 사용) */}
          <div className="h-40 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">실시간 차트 영역</p>
              <p className="text-xs">Chart.js 또는 다른 차트 라이브러리로 구현 예정</p>
            </div>
          </div>
        </div>
      </div>

      {/* 실시간 지리적 분포 */}
      {realtimeData && realtimeData.data.geographicDistribution && realtimeData.data.geographicDistribution.length > 0 && (
        <div className="wp-card">
          <div className="wp-card-body">
            <h3 className="text-sm font-medium text-gray-900 mb-3">실시간 지역별 사용자</h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {realtimeData.data.geographicDistribution.slice(0, 5).map((location, index) => (
                <div key={index} className="flex items-center justify-between text-xs text-gray-600 py-1">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                    <span>{location.country} - {location.region}</span>
                  </div>
                  <span className="font-medium">
                    {DashboardApiUtils.formatNumber(location.userCount)}명
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

RealtimeStats.displayName = 'RealtimeStats';

export default RealtimeStats;
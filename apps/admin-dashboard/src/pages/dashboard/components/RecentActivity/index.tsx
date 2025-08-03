/**
 * Recent Activity Widget (MVP)
 * 최근 활동 위젯 - 시스템 전체 활동 모니터링
 */

import { useState, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Clock,
  Filter,
  User,
  ShoppingCart,
  MessageSquare,
  FileText,
  Settings,
  AlertTriangle,
  ChevronDown,
  MoreHorizontal,
  RefreshCw
} from 'lucide-react';
import { 
  RecentActivitiesResponse, 
  ActivityItem,
  // ActivityFilters,  // Unused - commented out
  DASHBOARD_API_ENDPOINTS,
  DashboardApiUtils
} from '../../../../types/dashboard-api';
import apiClient from '../../../../api/base';

interface RecentActivityProps {
  className?: string;
}

// 활동 타입에 따른 아이콘 매핑
const getActivityIcon = (type: ActivityItem['type']) => {
  switch (type) {
    case 'user':
      return <User className="w-4 h-4" />;
    case 'order':
      return <ShoppingCart className="w-4 h-4" />;
    case 'forum':
      return <MessageSquare className="w-4 h-4" />;
    case 'content':
      return <FileText className="w-4 h-4" />;
    case 'system':
      return <Settings className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
};

// 활동 타입에 따른 색상 매핑
const getActivityColor = (type: ActivityItem['type']) => {
  switch (type) {
    case 'user':
      return 'text-blue-600 bg-blue-50';
    case 'order':
      return 'text-green-600 bg-green-50';
    case 'forum':
      return 'text-purple-600 bg-purple-50';
    case 'content':
      return 'text-orange-600 bg-orange-50';
    case 'system':
      return 'text-wp-text-secondary bg-gray-50';
    default:
      return 'text-wp-text-secondary bg-gray-50';
  }
};

// 우선순위에 따른 색상
const getPriorityColor = (priority: ActivityItem['priority']) => {
  switch (priority) {
    case 'high':
      return 'text-red-500';
    case 'medium':
      return 'text-yellow-500';
    case 'low':
      return 'text-green-500';
    default:
      return 'text-wp-text-secondary';
  }
};

const RecentActivity = memo<RecentActivityProps>(({ className = '' }) => {
  const [filters, setFilters] = useState<{
    types?: string[];
    priorities?: string[];
    actorRoles?: string[];
    dateRange: { from: string; to: string };
  }>({
    types: undefined,
    priorities: undefined,
    actorRoles: undefined,
    dateRange: { from: '', to: '' }
  });
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 10;

  // 최근 활동 데이터 조회
  const { 
    data: activityData, 
    isLoading, 
    error,
    refetch
  } = useQuery<RecentActivitiesResponse>({
    queryKey: ['dashboard', 'recent-activities', page, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString() as any,
        limit: limit.toString() as any,
      });
      
      if (filters.types && filters.types.length > 0) params.append('type', filters.types[0]);
      if (filters.priorities && filters.priorities.length > 0) params.append('priority', filters.priorities[0]);
      
      const response = await apiClient.get(`${DASHBOARD_API_ENDPOINTS.RECENT_ACTIVITIES}?${params}`);
      return response.data;
    },
    staleTime: 30 * 1000, // 30초
    refetchInterval: 60 * 1000, // 1분마다 자동 새로고침
  });

  if (error) {
    return (
      <div className={`wp-card ${className}`}>
        <div className="wp-card-body">
          <div className="text-center py-8">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <h3 className="text-lg font-medium text-wp-text-primary mb-2">활동 로드 실패</h3>
            <p className="text-sm text-wp-text-secondary mb-4">최근 활동을 불러오는 중 오류가 발생했습니다.</p>
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
        <h2 className="text-lg font-semibold text-wp-text-primary flex items-center">
          <Clock className="w-5 h-5 mr-2 text-blue-600" />
          최근 활동
        </h2>
        <div className="flex items-center space-x-2">
          {/* 필터 버튼 */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="wp-button wp-button-secondary wp-button-sm"
          >
            <Filter className="w-4 h-4 mr-1" />
            필터
            <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          
          {/* 새로고침 버튼 */}
          <button
            onClick={() => refetch()}
            className="wp-button wp-button-secondary wp-button-sm"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 필터 패널 */}
      {showFilters && (
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* 활동 타입 필터 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">활동 타입</label>
                <select
                  value={filters.types?.[0] || ''}
                  onChange={(e: any) => setFilters({ ...filters, types: e.target.value ? [e.target.value as ActivityItem['type']] : undefined })}
                  className="wp-input-field wp-input-sm"
                >
                  <option value="">전체</option>
                  <option value="user">사용자</option>
                  <option value="order">주문</option>
                  <option value="forum">포럼</option>
                  <option value="content">콘텐츠</option>
                  <option value="system">시스템</option>
                  <option value="product">상품</option>
                  <option value="security">보안</option>
                  <option value="payment">결제</option>
                </select>
              </div>

              {/* 우선순위 필터 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">우선순위</label>
                <select
                  value={filters.priorities?.[0] || ''}
                  onChange={(e: any) => setFilters({ ...filters, priorities: e.target.value ? [e.target.value as ActivityItem['priority']] : undefined })}
                  className="wp-input-field wp-input-sm"
                >
                  <option value="">전체</option>
                  <option value="critical">심각</option>
                  <option value="high">높음</option>
                  <option value="medium">중간</option>
                  <option value="low">낮음</option>
                </select>
              </div>

              {/* 사용자 역할 필터 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">사용자 역할</label>
                <select
                  value={filters.actorRoles?.[0] || ''}
                  onChange={(e: any) => setFilters({ 
                    ...filters, 
                    actorRoles: e.target.value ? [e.target.value as any] : undefined 
                  })}
                  className="wp-input-field wp-input-sm"
                >
                  <option value="">전체</option>
                  <option value="admin">관리자</option>
                  <option value="business">비즈니스</option>
                  <option value="affiliate">파트너</option>
                  <option value="customer">고객</option>
                  <option value="system">시스템</option>
                </select>
              </div>

              {/* 필터 리셋 */}
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFilters({
                      types: undefined,
                      priorities: undefined,
                      actorRoles: undefined,
                      dateRange: { from: '', to: '' }
                    });
                    setPage(1);
                  }}
                  className="wp-button wp-button-secondary wp-button-sm w-full"
                >
                  필터 리셋
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 활동 요약 */}
      {activityData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="wp-card">
            <div className="wp-card-body text-center">
              <div className="text-2xl font-bold text-blue-600">
                {DashboardApiUtils.formatNumber(activityData.data.summary.totalActivitiesToday)}
              </div>
              <div className="text-sm text-wp-text-secondary">오늘 총 활동</div>
            </div>
          </div>
          <div className="wp-card">
            <div className="wp-card-body text-center">
              <div className="text-2xl font-bold text-green-600">
                {DashboardApiUtils.formatNumber(activityData.data.summary.criticalActivities)}
              </div>
              <div className="text-sm text-wp-text-secondary">높은 우선순위</div>
            </div>
          </div>
          <div className="wp-card">
            <div className="wp-card-body text-center">
              <div className="text-2xl font-bold text-purple-600">
                {DashboardApiUtils.formatNumber(activityData.data.summary.pendingActions)}
              </div>
              <div className="text-sm text-wp-text-secondary">활성 사용자</div>
            </div>
          </div>
          <div className="wp-card">
            <div className="wp-card-body text-center">
              <div className="text-2xl font-bold text-orange-600">
                {DashboardApiUtils.formatNumber(Math.round(activityData.data.summary.totalActivitiesToday / 24))}
              </div>
              <div className="text-sm text-wp-text-secondary">시간당 평균</div>
            </div>
          </div>
        </div>
      )}

      {/* 활동 목록 */}
      <div className="wp-card">
        <div className="wp-card-body">
          <div className="space-y-4">
            {isLoading ? (
              // 로딩 스켈레톤
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-start space-x-3 animate-pulse">
                  <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
              ))
            ) : activityData && activityData.data.activities.length > 0 ? (
              activityData.data.activities.map((activity: any) => (
                <div key={activity.id} className="flex items-start space-x-3 group hover:bg-gray-50 -mx-4 px-4 py-2 rounded-lg transition-colors">
                  {/* 활동 아이콘 */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  
                  {/* 활동 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-wp-text-primary truncate">
                        {activity.description}
                      </p>
                      <div className={`w-2 h-2 rounded-full ${getPriorityColor(activity.priority)}`}></div>
                    </div>
                    <div className="flex items-center space-x-3 mt-1 text-xs text-wp-text-secondary">
                      <span>{activity.actor?.name || '알 수 없음'} ({activity.actor?.role || 'unknown'})</span>
                      {activity.metadata?.amount && (
                        <span>금액: {activity.metadata.amount}</span>
                      )}
                      {activity.metadata?.location && (
                        <span className="text-blue-600">
                          위치: {activity.metadata.location}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* 시간 및 액션 */}
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-wp-text-secondary">
                      {DashboardApiUtils.getRelativeTime(activity.timestamp)}
                    </span>
                    <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-all">
                      <MoreHorizontal className="w-4 h-4 text-wp-text-secondary" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-wp-text-secondary">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>최근 활동이 없습니다.</p>
              </div>
            )}
          </div>

          {/* 페이지네이션 */}
          {activityData && activityData.data.pagination.total > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
              <div className="text-sm text-wp-text-secondary">
                총 {activityData.data.pagination.totalItems}개 중 {activityData.data.pagination.count}개 표시
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="wp-button wp-button-secondary wp-button-sm"
                >
                  이전
                </button>
                <span className="text-sm text-gray-700">
                  {page} / {activityData.data.pagination.total}
                </span>
                <button
                  onClick={() => setPage(Math.min(activityData.data.pagination.total, page + 1))}
                  disabled={page === activityData.data.pagination.total}
                  className="wp-button wp-button-secondary wp-button-sm"
                >
                  다음
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

RecentActivity.displayName = 'RecentActivity';

export default RecentActivity;
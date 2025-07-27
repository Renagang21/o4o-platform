/**
 * Activity Feed Component
 * 통합 활동 피드 (최신 15개 활동)
 */

import { useState, FC } from 'react';
import ActivityItem from './ActivityItem';
import { Activity, Filter, RefreshCw } from 'lucide-react';

interface ActivityData {
  id: string;
  type: 'user' | 'order' | 'product' | 'content';
  message: string;
  time: string;
  user?: string;
  icon: string;
}

interface ActivityFeedProps {
  activities: ActivityData[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

const ActivityFeed: FC<ActivityFeedProps> = ({ 
  activities = [], 
  isLoading = false,
  onRefresh
}) => {
  const [filter, setFilter] = useState<'all' | 'user' | 'order' | 'product' | 'content'>('all');

  // 필터링된 활동
  const filteredActivities = activities.filter(activity => 
    filter === 'all' || activity?.type === filter
  );

  // 타입별 카운트
  const counts = activities.reduce((acc: any, activity: any) => {
    acc[activity?.type || ""] = (acc[activity?.type || ""] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filters = [
    { key: 'all', label: '전체', count: activities.length, color: 'gray' },
    { key: 'user', label: '사용자', count: counts.user || 0, color: 'blue' },
    { key: 'order', label: '주문', count: counts.order || 0, color: 'green' },
    { key: 'product', label: '상품', count: counts.product || 0, color: 'purple' },
    { key: 'content', label: '콘텐츠', count: counts.content || 0, color: 'orange' }
  ];

  const getTypeColor = (type: string) => {
    const colors = {
      user: 'text-blue-600',
      order: 'text-green-600',
      product: 'text-purple-600',
      content: 'text-orange-600'
    };
    return colors[type as keyof typeof colors] || 'text-gray-600';
  };

  if (isLoading) {
    return (
      <div className="wp-card">
        <div className="wp-card-header">
          <div className="h-6 bg-gray-200 rounded w-24 animate-pulse"></div>
        </div>
        <div className="wp-card-body">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                </div>
              </div>
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
            <Activity className="w-5 h-5 text-green-600 mr-2" />
            <h3 className="wp-card-title">최근 활동</h3>
            <span className="ml-2 text-xs text-gray-500">
              ({activities.length}개)
            </span>
          </div>
          
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="활동 새로고침"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="wp-card-body">
        {/* Filters */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {filters.map(filterOption => (
              <button
                key={filterOption.key}
                onClick={() => setFilter(filterOption.key as 'all' | 'user' | 'order' | 'product' | 'content')}
                className={`
                  px-3 py-1 text-xs rounded-full border transition-colors
                  ${filter === filterOption.key 
                    ? 'border-blue-300 bg-blue-50 text-blue-700' 
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
        </div>

        {/* Activity List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredActivities.length > 0 ? (
            filteredActivities.map(activity => (
              <ActivityItem
                key={activity?.id || ""}
                activity={activity}
                typeColor={getTypeColor(activity?.type || "")}
              />
            ))
          ) : (
            <div className="text-center py-8">
              {filter === 'all' ? (
                <div>
                  <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">최근 활동이 없습니다</p>
                  <p className="text-gray-400 text-xs mt-1">
                    시스템이 조용히 운영되고 있습니다
                  </p>
                </div>
              ) : (
                <div>
                  <Filter className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">
                    {filters.find(f => f.key === filter)?.label} 관련 활동이 없습니다
                  </p>
                  <button
                    onClick={() => setFilter('all')}
                    className="text-blue-600 text-xs mt-2 hover:underline"
                  >
                    모든 활동 보기
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Activity Summary */}
        {activities.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-500">사용자</p>
                <p className={`text-sm font-semibold ${getTypeColor('user')}`}>
                  {counts.user || 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">주문</p>
                <p className={`text-sm font-semibold ${getTypeColor('order')}`}>
                  {counts.order || 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">상품</p>
                <p className={`text-sm font-semibold ${getTypeColor('product')}`}>
                  {counts.product || 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">콘텐츠</p>
                <p className={`text-sm font-semibold ${getTypeColor('content')}`}>
                  {counts.content || 0}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Real-time indicator */}
        <div className="mt-4 flex items-center justify-center text-xs text-gray-500">
          <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
          <span>실시간 활동 모니터링</span>
        </div>
      </div>
    </div>
  );
};

export default ActivityFeed;
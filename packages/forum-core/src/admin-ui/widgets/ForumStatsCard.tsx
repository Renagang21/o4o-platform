/**
 * Forum Statistics Card
 * 포럼/커뮤니티 통계 카드 컴포넌트
 */

import { memo } from 'react';
import { 
  MessageSquare, 
  Heart, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  ArrowUpRight,
  TrendingDown,
  Clock
} from 'lucide-react';
import { ForumStatsResponse, DashboardApiUtils } from '../../../../types/dashboard-api';

interface ForumStatsCardProps {
  data?: ForumStatsResponse['data'];
  isLoading?: boolean;
  error?: Error;
}

const ForumStatsCard = memo<ForumStatsCardProps>(({ 
  data, 
  isLoading = false, 
  error 
}) => {
  if (error) {
    return (
      <div className="wp-card">
        <div className="wp-card-body">
          <div className="text-center py-4">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-wp-text-secondary">포럼 데이터 로드 실패</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="wp-card animate-pulse">
        <div className="wp-card-body">
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 bg-wp-bg-tertiary rounded w-20"></div>
            <div className="w-8 h-8 bg-wp-bg-tertiary rounded"></div>
          </div>
          <div className="space-y-3">
            <div className="h-6 bg-wp-bg-tertiary rounded w-24"></div>
            <div className="h-4 bg-wp-bg-tertiary rounded w-32"></div>
            <div className="h-4 bg-wp-bg-tertiary rounded w-28"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="wp-card">
        <div className="wp-card-body">
          <div className="text-center py-4 text-wp-text-secondary">
            데이터 없음
          </div>
        </div>
      </div>
    );
  }

  const {
    posts,
    engagement,
    users: activeUsers,
    moderation
  } = data;

  const postChangeIcon = posts.postChangeType === 'increase' 
    ? <ArrowUpRight className="w-4 h-4 text-green-500" />
    : posts.postChangeType === 'decrease'
    ? <TrendingDown className="w-4 h-4 text-red-500" />
    : <TrendingUp className="w-4 h-4 text-wp-text-secondary" />;

  return (
    <div className="wp-card hover:shadow-md transition-shadow duration-200">
      <div className="wp-card-body">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-wp-text-secondary">포럼 & 커뮤니티</h3>
          <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-purple-600" />
          </div>
        </div>

        {/* Main Stats */}
        <div className="space-y-4">
          {/* Posts */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-wp-text-secondary" />
              <span className="text-sm text-wp-text-secondary">오늘 게시글</span>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-wp-text-primary">
                {DashboardApiUtils.formatNumber(posts.todayPosts)}
              </div>
              <div className="flex items-center text-xs">
                {postChangeIcon}
                <span className={`ml-1 ${
                  posts.postChangeType === 'increase' ? 'text-green-600' :
                  posts.postChangeType === 'decrease' ? 'text-red-600' :
                  'text-wp-text-secondary'
                }`}>
                  {Math.abs(posts.postChange).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Engagement */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Heart className="w-4 h-4 text-wp-text-secondary" />
              <span className="text-sm text-wp-text-secondary">오늘 댓글</span>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-wp-text-primary">
                {DashboardApiUtils.formatNumber(engagement.todayComments)}
              </div>
              <div className="text-xs text-wp-text-secondary">
                참여율 {engagement.averageEngagementRate.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Active Users */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-wp-text-secondary" />
              <span className="text-sm text-wp-text-secondary">활성 사용자</span>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-wp-text-primary">
                {DashboardApiUtils.formatNumber(activeUsers.activeForumUsers)}
              </div>
              <div className="text-xs text-wp-text-secondary">
                신규 {DashboardApiUtils.formatNumber(activeUsers.newForumMembersToday)}명
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="mt-4 pt-4 border-t border-gray-300">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="text-center">
              <div className="text-wp-text-secondary">대기 승인</div>
              <div className="font-medium text-orange-600">
                {DashboardApiUtils.formatNumber(moderation.reportedContent)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-wp-text-secondary">총 좋아요</div>
              <div className="font-medium text-pink-600">
                {DashboardApiUtils.formatNumber(engagement.totalLikes)}
              </div>
            </div>
          </div>
        </div>

        {/* Top Contributors */}
        {activeUsers.topContributors > 0 && (
          <div className="mt-3 p-2 bg-purple-50 border border-purple-200 rounded-md">
            <div className="flex items-center text-xs text-purple-700">
              <TrendingUp className="w-3 h-3 mr-1" />
              <span className="font-medium">상위 기여자:</span>
              <span className="ml-1 truncate">
                {activeUsers.topContributors}명
              </span>
            </div>
          </div>
        )}

        {/* Moderation Alert */}
        {moderation.reportedContent > 5 && (
          <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded-md">
            <div className="flex items-center text-xs text-orange-700">
              <Clock className="w-3 h-3 mr-1" />
              <span>신고된 콘텐츠 {moderation.reportedContent}개</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

ForumStatsCard.displayName = 'ForumStatsCard';

export default ForumStatsCard;
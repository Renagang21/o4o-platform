/**
 * User Statistics Card
 * 사용자 통계 카드 컴포넌트
 */

import { memo } from 'react';
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  Shield,
  TrendingUp, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Crown
} from 'lucide-react';
import { UserStatsResponse, DashboardApiUtils } from '../../../../types/dashboard-api';

interface UserStatsCardProps {
  data?: UserStatsResponse['data'];
  isLoading?: boolean;
  error?: Error;
}

const UserStatsCard = memo<UserStatsCardProps>(({ 
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
            <p className="text-sm text-wp-text-secondary">사용자 데이터 로드 실패</p>
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
    overview,
    byRole,
    byStatus,
    engagement
  } = data;

  const registrationChangeIcon = overview.userGrowthType === 'increase' 
    ? <ArrowUpRight className="w-4 h-4 text-green-500" />
    : overview.userGrowthType === 'decrease'
    ? <ArrowDownRight className="w-4 h-4 text-red-500" />
    : <TrendingUp className="w-4 h-4 text-wp-text-secondary" />;

  return (
    <div className="wp-card hover:shadow-md transition-shadow duration-200">
      <div className="wp-card-body">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-wp-text-secondary">사용자 관리</h3>
          <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-green-600" />
          </div>
        </div>

        {/* Main Stats */}
        <div className="space-y-4">
          {/* New Registrations */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <UserPlus className="w-4 h-4 text-wp-text-secondary" />
              <span className="text-sm text-wp-text-secondary">신규 가입</span>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-wp-text-primary">
                {DashboardApiUtils.formatNumber(overview.newUsersToday)}
              </div>
              <div className="flex items-center text-xs">
                {registrationChangeIcon}
                <span className={`ml-1 ${
                  overview.userGrowthType === 'increase' ? 'text-green-600' :
                  overview.userGrowthType === 'decrease' ? 'text-red-600' :
                  'text-wp-text-secondary'
                }`}>
                  {Math.abs(overview.userGrowthRate).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Active Users */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-4 h-4 text-wp-text-secondary" />
              <span className="text-sm text-wp-text-secondary">활성 사용자</span>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-wp-text-primary">
                {DashboardApiUtils.formatNumber(overview.activeUsers)}
              </div>
              <div className="text-xs text-wp-text-secondary">
                총 {DashboardApiUtils.formatNumber(overview.totalUsers)}명
              </div>
            </div>
          </div>

          {/* Role Distribution */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-wp-text-secondary" />
              <span className="text-sm text-wp-text-secondary">비즈니스</span>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-wp-text-primary">
                {DashboardApiUtils.formatNumber(byRole.business)}
              </div>
              <div className="text-xs text-wp-text-secondary">
                파트너 {DashboardApiUtils.formatNumber(byRole.affiliates)}명
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="mt-4 pt-4 border-t border-wp-border-secondary">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="text-center">
              <div className="text-wp-text-secondary">승인 대기</div>
              <div className="font-medium text-orange-600">
                {DashboardApiUtils.formatNumber(byStatus.pending)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-wp-text-secondary">활성 사용자</div>
              <div className="font-medium text-green-600">
                {DashboardApiUtils.formatNumber(byStatus.active)}
              </div>
            </div>
          </div>
        </div>

        {/* Role Distribution Breakdown */}
        <div className="mt-3 space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-wp-text-secondary">일반 고객</span>
            </div>
            <span className="font-medium">
              {DashboardApiUtils.formatNumber(byRole.customers)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
              <span className="text-wp-text-secondary">관리자</span>
            </div>
            <span className="font-medium flex items-center">
              <Crown className="w-3 h-3 mr-1 text-purple-500" />
              {DashboardApiUtils.formatNumber(byRole.admins)}
            </span>
          </div>
        </div>

        {/* Pending Approval Alert */}
        {byStatus.pending > 0 && (
          <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded-md">
            <div className="flex items-center text-xs text-orange-700">
              <Clock className="w-3 h-3 mr-1" />
              <span>승인 대기 중인 사용자 {byStatus.pending}명</span>
            </div>
          </div>
        )}

        {/* High Activity Alert */}
        {engagement.dailyActiveUsers > 100 && (
          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center text-xs text-green-700">
              <TrendingUp className="w-3 h-3 mr-1" />
              <span>높은 사용자 활동량 감지! 🚀</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

UserStatsCard.displayName = 'UserStatsCard';

export default UserStatsCard;
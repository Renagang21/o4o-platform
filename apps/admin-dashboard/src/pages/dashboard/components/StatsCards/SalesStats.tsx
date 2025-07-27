/**
 * Sales Statistics Card
 * 매출 현황 통계 카드
 */


import { TrendingUp, Target, ArrowUpRight, ArrowDownRight, Calendar } from 'lucide-react';

interface SalesStatsProps {
  data?: {
    today: number;
    changePercent: number;
    monthlyTotal: number;
    monthlyTarget: number;
    trend: 'up' | 'down';
  };
  isLoading?: boolean;
}

const SalesStats: FC<SalesStatsProps> = ({ data, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="wp-card animate-pulse">
        <div className="wp-card-body">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-24"></div>
            </div>
            <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="mt-4">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
      </div>
    );
  }

  const {
    today = 0,
    changePercent = 0,
    monthlyTotal = 0,
    monthlyTarget = 1000000,
    trend = 'up'
  } = data || {};

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount);
  };

  const formatCurrencyFull = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  const achievementRate = (monthlyTotal / monthlyTarget) * 100;
  const isTargetAchieved = achievementRate >= 100;

  return (
    <div className="wp-card hover:shadow-md transition-shadow duration-200">
      <div className="wp-card-body">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-600">오늘 매출</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1" title={formatCurrencyFull(today)}>
              {formatCurrency(today)}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            trend === 'up' ? 'bg-green-50' : 'bg-red-50'
          }`}>
            <TrendingUp className={`w-6 h-6 ${
              trend === 'up' ? 'text-green-600' : 'text-red-600'
            }`} />
          </div>
        </div>

        {/* Monthly Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>이번 달 매출</span>
            <span>{formatCurrency(monthlyTotal)} / {formatCurrency(monthlyTarget)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                isTargetAchieved ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(achievementRate, 100)}%` }}
            ></div>
          </div>
          <div className="flex items-center mt-1 text-xs">
            <Target className="w-3 h-3 text-gray-400 mr-1" />
            <span className={`font-medium ${
              isTargetAchieved ? 'text-green-600' : 'text-gray-600'
            }`}>
              목표 대비 {achievementRate.toFixed(1)}%
            </span>
            {isTargetAchieved && (
              <span className="ml-1 text-green-600">달성!</span>
            )}
          </div>
        </div>

        {/* Daily Trend */}
        <div className="flex items-center text-sm">
          {trend === 'up' ? (
            <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
          ) : (
            <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />
          )}
          <span className={`font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {Math.abs(changePercent).toFixed(1)}%
          </span>
          <span className="text-gray-500 ml-1">전일 대비</span>
        </div>

        {/* Achievement Alert */}
        {isTargetAchieved && (
          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center text-xs text-green-700">
              <Target className="w-3 h-3 mr-1" />
              <span>이번 달 매출 목표를 달성했습니다! 🎉</span>
            </div>
          </div>
        )}

        {/* Low Performance Warning */}
        {achievementRate < 50 && new Date().getDate() > 15 && (
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center text-xs text-yellow-700">
              <Calendar className="w-3 h-3 mr-1" />
              <span>목표 달성을 위해 매출 증대가 필요합니다</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesStats;
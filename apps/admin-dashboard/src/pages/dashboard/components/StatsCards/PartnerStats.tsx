/**
 * Partner Statistics Card (Placeholder)
 * 파트너스 현황 통계 카드 (플레이스홀더)
 */


import { Users2, Clock, DollarSign, Star, ArrowUpRight, Construction } from 'lucide-react';

interface PartnerStatsProps {
  data?: {
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
  isLoading?: boolean;
}

const PartnerStats: React.FC<PartnerStatsProps> = ({ data, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="wp-card animate-pulse">
        <div className="wp-card-body">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
            </div>
            <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-24"></div>
            <div className="h-3 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
      </div>
    );
  }

  const {
    active = 0,
    pending = 0,
    totalCommission = 0,
    topPartners = [],
    change = 0,
    trend: _trend = 'up'
  } = data || {};

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ko-KR').format(num);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount);
  };

  // 파트너스 시스템이 구현되지 않았을 때 플레이스홀더 표시
  const isPlaceholder = active === 0 && pending === 0 && totalCommission === 0;

  if (isPlaceholder) {
    return (
      <div className="wp-card border-dashed border-2 border-gray-300 hover:border-gray-400 transition-colors duration-200">
        <div className="wp-card-body text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Construction className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">
            파트너스 시스템
          </h3>
          <p className="text-xs text-gray-400 mb-3">
            곧 출시 예정입니다
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>활성 파트너</span>
              <span>-</span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>승인 대기</span>
              <span>-</span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>커미션 총액</span>
              <span>-</span>
            </div>
          </div>
          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center justify-center text-xs text-blue-700">
              <Clock className="w-3 h-3 mr-1" />
              <span>개발 진행 중</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasPending = pending > 0;
  const topPartner = topPartners[0];

  return (
    <div className="wp-card hover:shadow-md transition-shadow duration-200">
      <div className="wp-card-body">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center">
              <h3 className="text-sm font-medium text-gray-600">활성 파트너</h3>
              {hasPending && (
                <div className="ml-2 flex items-center">
                  <Clock className="w-3 h-3 text-orange-500" />
                  <span className="text-xs text-orange-600 ml-1">
                    {pending}명 대기
                  </span>
                </div>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatNumber(active)}
            </p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center">
            <Users2 className="w-6 h-6 text-indigo-600" />
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className={`rounded p-2 ${hasPending ? 'bg-orange-50' : 'bg-gray-50'}`}>
            <div className="flex items-center">
              <Clock className={`w-3 h-3 mr-1 ${hasPending ? 'text-orange-600' : 'text-gray-600'}`} />
              <span className={`text-xs ${hasPending ? 'text-orange-600' : 'text-gray-600'}`}>승인 대기</span>
            </div>
            <p className={`text-sm font-semibold ${hasPending ? 'text-orange-900' : 'text-gray-900'}`}>
              {formatNumber(pending)}명
            </p>
          </div>
          <div className="bg-gray-50 rounded p-2">
            <div className="flex items-center">
              <DollarSign className="w-3 h-3 text-green-600 mr-1" />
              <span className="text-xs text-gray-600">총 커미션</span>
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {formatCurrency(totalCommission)}
            </p>
          </div>
        </div>

        {/* Top Partner */}
        {topPartner && (
          <div className="mb-4 p-2 bg-indigo-50 border border-indigo-200 rounded-md">
            <div className="flex items-center text-xs text-indigo-700">
              <Star className="w-3 h-3 mr-1" />
              <span className="font-medium">상위 파트너</span>
            </div>
            <p className="text-xs text-indigo-800 mt-1 truncate">
              {topPartner.name}
            </p>
            <p className="text-xs text-indigo-600">
              {formatCurrency(topPartner.commission)} 수익
            </p>
          </div>
        )}

        {/* Trend */}
        <div className="flex items-center text-sm">
          <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
          <span className="font-medium text-green-600">
            {Math.abs(change).toFixed(1)}%
          </span>
          <span className="text-gray-500 ml-1">지난 달 대비</span>
        </div>

        {/* Pending Partners Alert */}
        {hasPending && (
          <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded-md">
            <div className="flex items-center text-xs text-orange-700">
              <Clock className="w-3 h-3 mr-1" />
              <span>
                <strong>{pending}명</strong>의 파트너가 승인을 기다리고 있습니다
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PartnerStats;
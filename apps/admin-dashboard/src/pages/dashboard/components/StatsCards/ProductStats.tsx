/**
 * Product Statistics Card
 * 상품 현황 통계 카드
 */


import { Package, AlertTriangle, Plus, Award, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface ProductStatsProps {
  data?: {
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
  isLoading?: boolean;
}

const ProductStats: FC<ProductStatsProps> = ({ data, isLoading = false }) => {
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
    lowStock = 0,
    newThisWeek = 0,
    bestsellers = [],
    change = 0,
    trend = 'up'
  } = data || {};

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ko-KR').format(num);
  };

  const hasLowStock = lowStock > 0;
  const topBestseller = bestsellers[0];

  return (
    <div className="wp-card hover:shadow-md transition-shadow duration-200">
      <div className="wp-card-body">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center">
              <h3 className="text-sm font-medium text-gray-600">활성 상품</h3>
              {hasLowStock && (
                <div className="ml-2 flex items-center">
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                  <span className="text-xs text-red-600 ml-1">
                    {lowStock}개 부족
                  </span>
                </div>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatNumber(active)}
            </p>
          </div>
          <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
            <Package className="w-6 h-6 text-purple-600" />
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 rounded p-2">
            <div className="flex items-center">
              <Plus className="w-3 h-3 text-green-600 mr-1" />
              <span className="text-xs text-gray-600">이번 주</span>
            </div>
            <p className="text-sm font-semibold text-gray-900">
              +{formatNumber(newThisWeek)}개
            </p>
          </div>
          <div className={`rounded p-2 ${hasLowStock ? 'bg-red-50' : 'bg-gray-50'}`}>
            <div className="flex items-center">
              <AlertTriangle className={`w-3 h-3 mr-1 ${hasLowStock ? 'text-red-600' : 'text-gray-400'}`} />
              <span className={`text-xs ${hasLowStock ? 'text-red-600' : 'text-gray-600'}`}>재고 부족</span>
            </div>
            <p className={`text-sm font-semibold ${hasLowStock ? 'text-red-900' : 'text-gray-900'}`}>
              {formatNumber(lowStock)}개
            </p>
          </div>
        </div>

        {/* Bestseller */}
        {topBestseller && (
          <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center text-xs text-yellow-700">
              <Award className="w-3 h-3 mr-1" />
              <span className="font-medium">베스트셀러</span>
            </div>
            <p className="text-xs text-yellow-800 mt-1 truncate">
              {topBestseller.name}
            </p>
            <p className="text-xs text-yellow-600">
              {formatNumber(topBestseller.sales)}개 판매
            </p>
          </div>
        )}

        {/* Trend */}
        <div className="flex items-center text-sm">
          {trend === 'up' ? (
            <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
          ) : (
            <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />
          )}
          <span className={`font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {Math.abs(change).toFixed(1)}%
          </span>
          <span className="text-gray-500 ml-1">지난 주 대비</span>
        </div>

        {/* Low Stock Alert */}
        {hasLowStock && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center text-xs text-red-700">
              <AlertTriangle className="w-3 h-3 mr-1" />
              <span>
                <strong>{lowStock}개</strong> 상품의 재고가 부족합니다
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductStats;
/**
 * E-commerce Statistics Dashboard Component
 * WordPress Admin style statistics cards
 */

import { FC } from 'react';
import { 
  ShoppingCart, 
  TrendingUp, 
  Package, 
  Users, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Clock
} from 'lucide-react';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { formatCurrency } from '@/lib/utils';

const EcommerceStats: FC = () => {
  const { data, isLoading, error } = useDashboardStats();

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
          <p className="text-red-800">통계 데이터를 불러올 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const stats = data?.ecommerce;

  const statCards = [
    {
      title: '오늘 매출',
      value: formatCurrency(stats?.todaySales || 0),
      change: '+12.5%',
      trend: 'up' as const,
      icon: DollarSign,
      color: 'blue',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      changeColor: 'text-green-600'
    },
    {
      title: '오늘 주문',
      value: (stats?.todayOrders || 0).toString() + '건',
      change: '+8.3%',
      trend: 'up' as const,
      icon: ShoppingCart,
      color: 'green',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      changeColor: 'text-green-600'
    },
    {
      title: '전체 상품',
      value: (stats?.totalProducts || 0).toString() + '개',
      subtitle: `재고부족: ${stats?.lowStockProducts || 0}개`,
      icon: Package,
      color: 'purple',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      warning: (stats?.lowStockProducts || 0) > 10
    },
    {
      title: '전체 고객',
      value: (stats?.totalCustomers || 0).toLocaleString() + '명',
      change: '+5.2%',
      trend: 'up' as const,
      icon: Users,
      color: 'orange',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
      changeColor: 'text-green-600'
    },
    {
      title: '대기 주문',
      value: (stats?.pendingOrders || 0).toString() + '건',
      icon: Clock,
      color: 'yellow',
      bgColor: 'bg-yellow-50',
      iconColor: 'text-yellow-600',
      urgent: (stats?.pendingOrders || 0) > 20
    },
    {
      title: '월 매출',
      value: formatCurrency(stats?.monthlyRevenue || 0),
      subtitle: '목표: ' + formatCurrency(50000000),
      progress: ((stats?.monthlyRevenue || 0) / 50000000) * 100,
      icon: TrendingUp,
      color: 'indigo',
      bgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-600'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">E-commerce 통계</h2>
        <span className="text-sm text-gray-500">
          실시간 업데이트
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className={`bg-white rounded-lg shadow-sm border p-6 relative overflow-hidden ${
              stat.urgent ? 'border-red-300' : ''
            }`}
          >
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-5">
              <stat.icon className="w-32 h-32" />
            </div>

            <div className="relative">
              {/* Icon and Title */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  {stat.subtitle && (
                    <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
                  )}
                </div>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
              </div>

              {/* Value and Change */}
              <div className="space-y-2">
                <p className={`text-2xl font-bold text-gray-900 ${
                  isLoading ? 'animate-pulse bg-gray-200 h-8 w-24 rounded' : ''
                }`}>
                  {!isLoading && stat.value}
                </p>

                {stat.change && !isLoading && (
                  <div className="flex items-center">
                    {stat.trend === 'up' ? (
                      <ArrowUpRight className={`w-4 h-4 ${stat.changeColor} mr-1`} />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-600 mr-1" />
                    )}
                    <span className={`text-sm font-medium ${stat.changeColor}`}>
                      {stat.change}
                    </span>
                    <span className="text-xs text-gray-500 ml-1">vs 어제</span>
                  </div>
                )}

                {stat.progress !== undefined && !isLoading && (
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, stat.progress)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      목표 달성률: {stat.progress.toFixed(1)}%
                    </p>
                  </div>
                )}

                {stat.warning && !isLoading && (
                  <div className="flex items-center mt-2 text-xs text-orange-600">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    재고 관리가 필요합니다
                  </div>
                )}

                {stat.urgent && !isLoading && (
                  <div className="flex items-center mt-2 text-xs text-red-600">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    즉시 처리가 필요합니다
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats Bar */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500">평균 주문 금액</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatCurrency(stats?.averageOrderValue || 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">오늘 방문자</p>
            <p className="text-lg font-semibold text-gray-900">1,247명</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">전환율</p>
            <p className="text-lg font-semibold text-gray-900">3.8%</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">장바구니 포기율</p>
            <p className="text-lg font-semibold text-gray-900">68.2%</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EcommerceStats;
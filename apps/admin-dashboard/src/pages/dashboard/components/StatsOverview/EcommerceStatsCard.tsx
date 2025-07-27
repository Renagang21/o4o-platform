/**
 * E-commerce Statistics Card
 * E-commerce 통계 카드 컴포넌트
 */

import { memo } from 'react';
import { 
  ShoppingCart, 
  DollarSign, 
  Package, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { EcommerceStatsResponse, DashboardApiUtils } from '../../../../types/dashboard-api';

interface EcommerceStatsCardProps {
  data?: EcommerceStatsResponse['data'];
  isLoading?: boolean;
  error?: Error;
}

const EcommerceStatsCard = memo<EcommerceStatsCardProps>(({ 
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
            <p className="text-sm text-wp-text-secondary">E-commerce 데이터 로드 실패</p>
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
    sales,
    orders,
    products,
    customers
  } = data;

  const revenueChangeIcon = sales.revenueChangeType === 'increase' 
    ? <ArrowUpRight className="w-4 h-4 text-green-500" />
    : sales.revenueChangeType === 'decrease'
    ? <ArrowDownRight className="w-4 h-4 text-red-500" />
    : <TrendingUp className="w-4 h-4 text-wp-text-secondary" />;

  const orderChangeIcon = orders.orderChangeType === 'increase'
    ? <ArrowUpRight className="w-4 h-4 text-green-500" />
    : orders.orderChangeType === 'decrease'
    ? <ArrowDownRight className="w-4 h-4 text-red-500" />
    : <TrendingUp className="w-4 h-4 text-wp-text-secondary" />;

  return (
    <div className="wp-card hover:shadow-md transition-shadow duration-200">
      <div className="wp-card-body">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-wp-text-secondary">E-commerce</h3>
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
          </div>
        </div>

        {/* Main Stats */}
        <div className="space-y-4">
          {/* Revenue */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-wp-text-secondary" />
              <span className="text-sm text-wp-text-secondary">오늘 매출</span>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-wp-text-primary">
                {DashboardApiUtils.formatCurrency(sales.todayRevenue)}
              </div>
              <div className="flex items-center text-xs">
                {revenueChangeIcon}
                <span className={`ml-1 ${
                  sales.revenueChangeType === 'increase' ? 'text-green-600' :
                  sales.revenueChangeType === 'decrease' ? 'text-red-600' :
                  'text-wp-text-secondary'
                }`}>
                  {Math.abs(sales.revenueChange).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Orders */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Package className="w-4 h-4 text-wp-text-secondary" />
              <span className="text-sm text-wp-text-secondary">오늘 주문</span>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-wp-text-primary">
                {DashboardApiUtils.formatNumber(orders.todayOrders)}
              </div>
              <div className="flex items-center text-xs">
                {orderChangeIcon}
                <span className={`ml-1 ${
                  orders.orderChangeType === 'increase' ? 'text-green-600' :
                  orders.orderChangeType === 'decrease' ? 'text-red-600' :
                  'text-wp-text-secondary'
                }`}>
                  {Math.abs(orders.orderChange).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Customers */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-wp-text-secondary" />
              <span className="text-sm text-wp-text-secondary">신규 고객</span>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-wp-text-primary">
                {DashboardApiUtils.formatNumber(customers.newCustomersToday)}
              </div>
              <div className="text-xs text-wp-text-secondary">
                총 {DashboardApiUtils.formatNumber(customers.totalCustomers)}명
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="mt-4 pt-4 border-t border-neutral-300">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="text-center">
              <div className="text-wp-text-secondary">대기 주문</div>
              <div className="font-medium text-orange-600">
                {DashboardApiUtils.formatNumber(orders.pendingOrders)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-wp-text-secondary">재고 부족</div>
              <div className="font-medium text-red-600">
                {DashboardApiUtils.formatNumber(products.lowStockProducts)}
              </div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {(orders.pendingOrders > 10 || products.lowStockProducts > 5) && (
          <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded-md">
            <div className="flex items-center text-xs text-orange-700">
              <AlertTriangle className="w-3 h-3 mr-1" />
              <span>
                {orders.pendingOrders > 10 && `대기 주문 ${orders.pendingOrders}건`}
                {orders.pendingOrders > 10 && products.lowStockProducts > 5 && ', '}
                {products.lowStockProducts > 5 && `재고 부족 ${products.lowStockProducts}개`}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

EcommerceStatsCard.displayName = 'EcommerceStatsCard';

export default EcommerceStatsCard;
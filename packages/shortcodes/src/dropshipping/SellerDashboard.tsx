/**
 * Seller Dashboard Shortcode Component
 * [seller_dashboard] - 판매자 전용 대시보드
 */

import React, { useEffect, useState, useCallback } from 'react';

interface CardProps {
  className?: string;
  children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ className = '', children }) => (
  <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
    {children}
  </div>
);

// Mock auth hook for now
const useAuth = () => ({ user: { id: 'seller-1', role: 'seller' } });

// Mock API
const api = {
  get: async (url: string): Promise<{ data: any }> => {
    console.log('API call:', url);
    return { data: { orders: [], products: [] } };
  }
};
import { 
  Package, 
  TrendingUp, 
  ShoppingCart, 
  AlertCircle,
  DollarSign,
  Users,
  Clock,
  BarChart3
} from 'lucide-react';

interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  pendingOrders: number;
  lowStockItems: number;
  totalRevenue: number;
  totalCustomers: number;
  avgOrderValue: number;
  conversionRate: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  customer: string;
  amount: number;
  status: string;
  createdAt: string;
}

interface LowStockProduct {
  id: string;
  name: string;
  sku: string;
  stock: number;
  threshold: number;
}

export const SellerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    todayOrders: 0,
    pendingOrders: 0,
    lowStockItems: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    avgOrderValue: 0,
    conversionRate: 0
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Fetch dashboard stats
      const [statsRes, ordersRes, stockRes] = await Promise.all([
        api.get(`/api/seller/dashboard/stats/${user.id}`),
        api.get(`/api/seller/orders/recent/${user.id}?limit=5`),
        api.get(`/api/seller/inventory/low-stock/${user.id}`)
      ]);

      setStats(statsRes.data || {
        todaySales: 0,
        todayOrders: 0,
        pendingOrders: 0,
        lowStockItems: 0,
        totalRevenue: 0,
        totalCustomers: 0,
        avgOrderValue: 0,
        conversionRate: 0
      });
      
      setRecentOrders(ordersRes.data?.orders || []);
      setLowStockProducts(stockRes.data?.products || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      case 'shipped': return 'text-purple-600 bg-purple-100';
      case 'delivered': return 'text-green-600 bg-green-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="seller-dashboard space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">판매자 대시보드</h1>
        <p className="text-gray-600">오늘의 판매 현황과 주요 지표를 확인하세요</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">오늘 매출</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.todaySales)}
              </p>
              <p className="text-xs text-green-600 mt-1">+12% 전일 대비</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">오늘 주문</p>
              <p className="text-2xl font-bold text-gray-900">{stats.todayOrders}건</p>
              <p className="text-xs text-green-600 mt-1">+5건 전일 대비</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">처리 대기</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingOrders}건</p>
              <p className="text-xs text-yellow-600 mt-1">즉시 처리 필요</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">재고 부족</p>
              <p className="text-2xl font-bold text-gray-900">{stats.lowStockItems}개</p>
              <p className="text-xs text-red-600 mt-1">재고 보충 필요</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Second Row Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">총 매출</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(stats.totalRevenue)}
              </p>
              <p className="text-xs text-gray-500 mt-1">이번 달 누적</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">평균 주문 금액</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(stats.avgOrderValue)}
              </p>
              <p className="text-xs text-gray-500 mt-1">최근 30일</p>
            </div>
            <BarChart3 className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">전환율</p>
              <p className="text-xl font-bold text-gray-900">{stats.conversionRate}%</p>
              <p className="text-xs text-gray-500 mt-1">방문자 대비 구매</p>
            </div>
            <Users className="h-8 w-8 text-purple-600" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">최근 주문</h2>
            <a href="/seller/orders" className="text-sm text-blue-600 hover:text-blue-700">
              전체 보기 →
            </a>
          </div>
          
          <div className="space-y-3">
            {recentOrders.length > 0 ? (
              recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">#{order.orderNumber}</p>
                    <p className="text-sm text-gray-600">{order.customer}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{formatCurrency(order.amount)}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">주문 내역이 없습니다</p>
            )}
          </div>
        </Card>

        {/* Low Stock Alert */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">재고 부족 알림</h2>
            <a href="/seller/inventory" className="text-sm text-blue-600 hover:text-blue-700">
              재고 관리 →
            </a>
          </div>
          
          <div className="space-y-3">
            {lowStockProducts.length > 0 ? (
              lowStockProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Package className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-red-600">{product.stock}개 남음</p>
                    <p className="text-xs text-gray-500">임계값: {product.threshold}개</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">재고 부족 상품이 없습니다</p>
            )}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">빠른 작업</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
            <Package className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">상품 등록</p>
          </button>
          <button className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
            <ShoppingCart className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">주문 관리</p>
          </button>
          <button className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
            <BarChart3 className="h-6 w-6 text-purple-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">매출 분석</p>
          </button>
          <button className="p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
            <AlertCircle className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">재고 확인</p>
          </button>
        </div>
      </Card>
    </div>
  );
};
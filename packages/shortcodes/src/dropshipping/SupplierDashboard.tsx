/**
 * Supplier Dashboard Shortcode Component
 * [supplier_dashboard] - 공급자 전용 대시보드
 */

import React, { useEffect, useState } from 'react';

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
const useAuth = () => ({ user: { id: 'supplier-1', role: 'supplier' } });

// Mock API
const api = {
  get: async (url: string): Promise<{ data: any }> => {
    console.log('API call:', url);
    return { data: { orders: [], products: [] } };
  }
};
import { 
  Package, 
  Truck, 
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  Boxes
} from 'lucide-react';

interface SupplierStats {
  pendingOrders: number;
  processingOrders: number;
  shippedToday: number;
  totalProducts: number;
  lowStockProducts: number;
  totalRevenue: number;
  monthlyOrders: number;
  fulfillmentRate: number;
}

interface PendingOrder {
  id: string;
  orderId: string;
  customerName: string;
  items: number;
  totalAmount: number;
  orderDate: string;
  requiredBy: string;
  status: string;
}

interface ProductInventory {
  id: string;
  sku: string;
  name: string;
  available: number;
  reserved: number;
  incoming: number;
  lastRestocked: string;
}

export const SupplierDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<SupplierStats>({
    pendingOrders: 0,
    processingOrders: 0,
    shippedToday: 0,
    totalProducts: 0,
    lowStockProducts: 0,
    totalRevenue: 0,
    monthlyOrders: 0,
    fulfillmentRate: 0
  });
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [inventory, setInventory] = useState<ProductInventory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSupplierData();
  }, [user]);

  const fetchSupplierData = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Fetch supplier dashboard data
      const [statsRes, ordersRes, inventoryRes] = await Promise.all([
        api.get(`/api/supplier/dashboard/stats/${user.id}`),
        api.get(`/api/supplier/orders/pending/${user.id}?limit=5`),
        api.get(`/api/supplier/inventory/status/${user.id}?limit=10`)
      ]);

      setStats(statsRes.data || {
        pendingOrders: 0,
        processingOrders: 0,
        shippedToday: 0,
        totalProducts: 0,
        lowStockProducts: 0,
        totalRevenue: 0,
        monthlyOrders: 0,
        fulfillmentRate: 0
      });
      
      setPendingOrders(ordersRes.data?.orders || []);
      setInventory(inventoryRes.data?.products || []);
    } catch (error) {
      console.error('Failed to fetch supplier data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  const getUrgencyColor = (requiredBy: string) => {
    const hoursLeft = (new Date(requiredBy).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursLeft < 24) return 'text-red-600 bg-red-100';
    if (hoursLeft < 48) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getStockStatus = (available: number, reserved: number) => {
    const total = available - reserved;
    if (total <= 0) return { color: 'text-red-600', text: '재고 없음' };
    if (total < 10) return { color: 'text-yellow-600', text: '재고 부족' };
    return { color: 'text-green-600', text: '재고 충분' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="supplier-dashboard space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">공급자 대시보드</h1>
        <p className="text-gray-600">주문 처리 현황과 재고 상태를 관리하세요</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">대기 주문</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pendingOrders}건</p>
              <p className="text-xs text-gray-500 mt-1">즉시 처리 필요</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">처리 중</p>
              <p className="text-2xl font-bold text-blue-600">{stats.processingOrders}건</p>
              <p className="text-xs text-gray-500 mt-1">포장/준비 중</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">오늘 발송</p>
              <p className="text-2xl font-bold text-green-600">{stats.shippedToday}건</p>
              <p className="text-xs text-gray-500 mt-1">발송 완료</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Truck className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">이행률</p>
              <p className="text-2xl font-bold text-purple-600">{stats.fulfillmentRate}%</p>
              <p className="text-xs text-gray-500 mt-1">정시 배송률</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Pending Orders */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">처리 대기 주문</h2>
          <a href="/supplier/orders" className="text-sm text-blue-600 hover:text-blue-700">
            전체 주문 보기 →
          </a>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">주문번호</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">고객명</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">상품수</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">금액</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">요청 기한</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">작업</th>
              </tr>
            </thead>
            <tbody>
              {pendingOrders.length > 0 ? (
                pendingOrders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-900">#{order.orderId}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{order.customerName}</td>
                    <td className="py-3 px-4 text-gray-600">{order.items}개</td>
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${getUrgencyColor(order.requiredBy)}`}>
                        {new Date(order.requiredBy).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        처리하기
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    대기 중인 주문이 없습니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory Status */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">재고 현황</h2>
            <a href="/supplier/inventory" className="text-sm text-blue-600 hover:text-blue-700">
              재고 관리 →
            </a>
          </div>
          
          <div className="space-y-3">
            {inventory.length > 0 ? (
              inventory.slice(0, 5).map((product) => {
                const stockStatus = getStockStatus(product.available, product.reserved);
                return (
                  <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${stockStatus.color}`}>
                        {product.available - product.reserved}개
                      </p>
                      <p className="text-xs text-gray-500">
                        예약: {product.reserved}개
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 text-center py-4">재고 정보가 없습니다</p>
            )}
          </div>
        </Card>

        {/* Performance Metrics */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">이번 달 실적</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <span className="text-gray-700">총 매출</span>
              </div>
              <span className="font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span className="text-gray-700">처리 주문</span>
              </div>
              <span className="font-bold text-gray-900">{stats.monthlyOrders}건</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Boxes className="h-5 w-5 text-purple-600" />
                <span className="text-gray-700">등록 상품</span>
              </div>
              <span className="font-bold text-gray-900">{stats.totalProducts}개</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <span className="text-gray-700">재고 부족</span>
              </div>
              <span className="font-bold text-red-600">{stats.lowStockProducts}개</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
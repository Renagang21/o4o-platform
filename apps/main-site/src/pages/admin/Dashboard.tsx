import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProductStore } from '../../stores/productStore';
import { useOrderStore } from '../../stores/orderStore';
import { useAuthStore } from '../../stores/authStore';
import { mockProducts } from '../../mocks/products';
import { mockOrders } from '../../mocks/orders';
import { mockUsers } from '../../mocks/users';

interface Activity {
  type: string;
  title: string;
  description: string;
  timestamp: string;
  id: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { products, fetchProducts } = useProductStore();
  const { orders, fetchOrders } = useOrderStore();

  const [stats, setStats] = useState({
    totalProducts: 0,
    pendingProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalUsers: 0,
    totalSuppliers: 0,
    totalRetailers: 0,
    totalCustomers: 0,
  });

  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  useEffect(() => {
    if (!user || user.userType !== 'admin') {
      navigate('/login');
      return;
    }

    // 기본 데이터 로드
    fetchProducts();
    fetchOrders();
    
    // 통계 계산
    calculateStats();
    loadRecentActivities();
  }, [user]);

  const calculateStats = () => {
    // 상품 통계
    const totalProducts = mockProducts.length;
    const pendingProducts = mockProducts.filter((p: any) => p.approvalStatus === 'pending').length;

    // 주문 통계
    const totalOrders = mockOrders.length;
    const totalRevenue = mockOrders
      .filter((o: any) => o.paymentStatus === 'completed')
      .reduce((sum: any, order: any) => sum + order.totalAmount, 0);

    // 사용자 통계
    const totalUsers = mockUsers.length;
    const totalSuppliers = mockUsers.filter((u: any) => u.userType === 'supplier').length;
    const totalRetailers = mockUsers.filter((u: any) => u.userType === 'retailer').length;
    const totalCustomers = mockUsers.filter((u: any) => u.userType === 'customer').length;

    setStats({
      totalProducts,
      pendingProducts,
      totalOrders,
      totalRevenue,
      totalUsers,
      totalSuppliers,
      totalRetailers,
      totalCustomers,
    });
  };

  const loadRecentActivities = () => {
    // 최근 활동들을 시간순으로 정렬
    const activities = [
      ...mockProducts
        .filter((p: any) => p.approvalStatus === 'pending')
        .slice(0, 5)
        .map((p: any) => ({
          type: 'product_pending',
          title: '상품 승인 대기',
          description: `${p.name} - ${p.supplierId}`,
          timestamp: p.createdAt,
          id: p.id,
        })),
      ...mockOrders
        .slice(0, 5)
        .map((o: any) => ({
          type: 'new_order',
          title: '새 주문',
          description: `주문번호: ${o.orderNumber} - ₩${o.totalAmount.toLocaleString()}`,
          timestamp: o.orderDate,
          id: o.id,
        })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

    setRecentActivities(activities);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'product_pending':
        return '📦';
      case 'new_order':
        return '🛒';
      default:
        return '📋';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">관리자 대시보드</h1>
              <p className="mt-2 text-sm text-gray-600">O4O 플랫폼 전체 현황을 관리하세요</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">관리자: {user?.name}</span>
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 font-semibold">A</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 통계 카드 */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {/* 상품 통계 */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                    <span className="text-lg">📦</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">총 상품</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalProducts}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="text-orange-600 font-medium">{stats.pendingProducts}개</span>
                <span className="text-gray-500"> 승인 대기</span>
              </div>
            </div>
          </div>

          {/* 주문 통계 */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                    <span className="text-lg">🛒</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">총 주문</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalOrders}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="text-green-600 font-medium">₩{formatPrice(stats.totalRevenue)}</span>
                <span className="text-gray-500"> 총 매출</span>
              </div>
            </div>
          </div>

          {/* 사용자 통계 */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                    <span className="text-lg">👥</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">총 사용자</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalUsers}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm text-gray-500">
                공급자 {stats.totalSuppliers} | 리테일러 {stats.totalRetailers} | 고객 {stats.totalCustomers}
              </div>
            </div>
          </div>

          {/* 승인 대기 */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-orange-100 rounded-md flex items-center justify-center">
                    <span className="text-lg">⏰</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">승인 대기</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.pendingProducts}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <button
                onClick={() => navigate('/admin/products/pending')}
                className="text-sm text-orange-600 hover:text-orange-500 font-medium"
              >
                승인 관리 →
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 최근 활동 */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">최근 활동</h3>
            </div>
            <div className="p-6">
              <div className="flow-root">
                <ul className="-mb-8">
                  {recentActivities.map((activity, index) => (
                    <li key={`${activity.type}-${activity.id}`}>
                      <div className="relative pb-8">
                        {index !== recentActivities.length - 1 && (
                          <span
                            className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                            aria-hidden="true"
                          />
                        )}
                        <div className="relative flex space-x-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                            <span className="text-sm">{getActivityIcon(activity.type)}</span>
                          </div>
                          <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                              <p className="text-sm text-gray-500">{activity.description}</p>
                            </div>
                            <div className="whitespace-nowrap text-right text-sm text-gray-500">
                              {formatDate(activity.timestamp)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* 빠른 액션 */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">관리 메뉴</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={() => navigate('/admin/products/pending')}
                  className="flex items-center p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <span className="text-2xl">📦</span>
                  </div>
                  <div className="ml-4 text-left">
                    <p className="text-sm font-medium text-orange-900">상품 승인 관리</p>
                    <p className="text-sm text-orange-700">{stats.pendingProducts}개 승인 대기 중</p>
                  </div>
                  <div className="ml-auto">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/admin/orders')}
                  className="flex items-center p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <span className="text-2xl">📋</span>
                  </div>
                  <div className="ml-4 text-left">
                    <p className="text-sm font-medium text-blue-900">주문 관리</p>
                    <p className="text-sm text-blue-700">전체 주문 현황 관리</p>
                  </div>
                  <div className="ml-auto">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/admin/users')}
                  className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <span className="text-2xl">👥</span>
                  </div>
                  <div className="ml-4 text-left">
                    <p className="text-sm font-medium text-green-900">사용자 관리</p>
                    <p className="text-sm text-green-700">회원 정보 및 권한 관리</p>
                  </div>
                  <div className="ml-auto">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/admin/categories')}
                  className="flex items-center p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <span className="text-2xl">🏷️</span>
                  </div>
                  <div className="ml-4 text-left">
                    <p className="text-sm font-medium text-purple-900">카테고리 관리</p>
                    <p className="text-sm text-purple-700">상품 카테고리 설정 관리</p>
                  </div>
                  <div className="ml-auto">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/admin/reviews')}
                  className="flex items-center p-4 bg-pink-50 border border-pink-200 rounded-lg hover:bg-pink-100 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <span className="text-2xl">⭐</span>
                  </div>
                  <div className="ml-4 text-left">
                    <p className="text-sm font-medium text-pink-900">리뷰 관리</p>
                    <p className="text-sm text-pink-700">고객 리뷰 승인 및 관리</p>
                  </div>
                  <div className="ml-auto">
                    <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 시스템 현황 */}
        <div className="mt-8 bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">시스템 현황</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">99.9%</div>
                <div className="text-sm text-gray-500">시스템 가동률</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">127ms</div>
                <div className="text-sm text-gray-500">평균 응답시간</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">1.2GB</div>
                <div className="text-sm text-gray-500">일일 데이터 처리량</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
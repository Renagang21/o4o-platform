import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShoppingBag, Package, TrendingUp, Users, Star,
  DollarSign, BarChart3, Plus, Eye, Edit3,
  Calendar, Clock, AlertCircle, CheckCircle
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface SellerMyPageProps {
  user: User;
}

interface SellerStats {
  totalProducts: number;
  activeProducts: number;
  totalSales: number;
  monthlySales: number;
  totalRevenue: number;
  monthlyRevenue: number;
  averageRating: number;
  totalReviews: number;
  orderCount: number;
  monthlyOrders: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  sales: number;
  rating: number;
  status: 'active' | 'inactive' | 'pending';
  image: string;
  createdDate: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  productName: string;
  quantity: number;
  amount: number;
  status: 'pending' | 'confirmed' | 'shipping' | 'delivered';
  orderDate: string;
}

const SellerMyPage: React.FC<SellerMyPageProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [sellerStats, setSellerStats] = useState<SellerStats>({
    totalProducts: 24,
    activeProducts: 18,
    totalSales: 1247,
    monthlySales: 89,
    totalRevenue: 15680000,
    monthlyRevenue: 1850000,
    averageRating: 4.7,
    totalReviews: 342,
    orderCount: 1247,
    monthlyOrders: 89
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    // 모의 상품 데이터
    const mockProducts: Product[] = [
      {
        id: '1',
        name: '프리미엄 오메가3 1000mg 90캡슐',
        price: 29900,
        stock: 150,
        sales: 347,
        rating: 4.8,
        status: 'active',
        image: '/products/omega3.jpg',
        createdDate: '2024.11.15'
      },
      {
        id: '2',
        name: '종합비타민 멀티비타민 60정',
        price: 19900,
        stock: 89,
        sales: 234,
        rating: 4.6,
        status: 'active',
        image: '/products/multivitamin.jpg',
        createdDate: '2024.12.01'
      },
      {
        id: '3',
        name: '프로바이오틱스 유산균 30포',
        price: 39900,
        stock: 0,
        sales: 189,
        rating: 4.9,
        status: 'inactive',
        image: '/products/probiotics.jpg',
        createdDate: '2024.10.20'
      }
    ];

    // 모의 주문 데이터
    const mockOrders: Order[] = [
      {
        id: '1',
        orderNumber: 'ORD-20250121-001',
        customerName: '김고객',
        productName: '프리미엄 오메가3 1000mg',
        quantity: 2,
        amount: 59800,
        status: 'confirmed',
        orderDate: '2025.01.21'
      },
      {
        id: '2',
        orderNumber: 'ORD-20250120-045',
        customerName: '이구매',
        productName: '종합비타민 멀티비타민',
        quantity: 1,
        amount: 19900,
        status: 'shipping',
        orderDate: '2025.01.20'
      },
      {
        id: '3',
        orderNumber: 'ORD-20250120-032',
        customerName: '박건강',
        productName: '프로바이오틱스 유산균',
        quantity: 3,
        amount: 119700,
        status: 'delivered',
        orderDate: '2025.01.20'
      }
    ];

    setProducts(mockProducts);
    setOrders(mockOrders);
  }, []);

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '판매중';
      case 'inactive': return '판매중지';
      case 'pending': return '심사중';
      case 'confirmed': return '주문확인';
      case 'shipping': return '배송중';
      case 'delivered': return '배송완료';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'inactive': return 'text-red-600 bg-red-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'confirmed': return 'text-blue-600 bg-blue-50';
      case 'shipping': return 'text-orange-600 bg-orange-50';
      case 'delivered': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const menuItems = [
    { id: 'overview', name: '대시보드', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'products', name: '상품 관리', icon: <Package className="w-5 h-5" /> },
    { id: 'orders', name: '주문 관리', icon: <ShoppingBag className="w-5 h-5" /> },
    { id: 'sales', name: '매출 분석', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'reviews', name: '리뷰 관리', icon: <Star className="w-5 h-5" /> },
    { id: 'customers', name: '고객 관리', icon: <Users className="w-5 h-5" /> },
    { id: 'promotion', name: '프로모션', icon: <DollarSign className="w-5 h-5" /> },
    { id: 'analytics', name: '상세 분석', icon: <BarChart3 className="w-5 h-5" /> }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* 왼쪽: 메뉴 */}
        <div className="lg:col-span-1">
          {/* 판매자 정보 카드 */}
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-xl p-6 mb-6">
            <div className="text-center">
              <div className="text-3xl mb-2">🛍️</div>
              <div className="text-xl font-bold mb-2">판매자</div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-lg font-bold">{sellerStats.averageRating}</span>
                <span className="text-sm opacity-90">({sellerStats.totalReviews})</span>
              </div>
              <div className="text-sm opacity-90">
                총 {sellerStats.totalProducts}개 상품 판매중
              </div>
            </div>
          </div>

          {/* 빠른 액션 */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 mb-6">
            <h3 className="font-semibold mb-3">빠른 액션</h3>
            <div className="space-y-2">
              <Link 
                to="/dropshipping/products/new"
                className="w-full flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm hover:bg-blue-100"
              >
                <Plus className="w-4 h-4" />
                새 상품 등록
              </Link>
              <button 
                onClick={() => setActiveTab('orders')}
                className="w-full text-left bg-green-50 text-green-700 px-3 py-2 rounded-lg text-sm hover:bg-green-100"
              >
                📦 주문 처리하기
              </button>
              <button 
                onClick={() => setActiveTab('sales')}
                className="w-full text-left bg-purple-50 text-purple-700 px-3 py-2 rounded-lg text-sm hover:bg-purple-100"
              >
                📊 매출 확인하기
              </button>
            </div>
          </div>

          {/* 메뉴 */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {menuItems.map((item, index) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors ${
                  index !== menuItems.length - 1 ? 'border-b border-gray-100' : ''
                } ${activeTab === item.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span className="font-medium">{item.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 오른쪽: 콘텐츠 */}
        <div className="lg:col-span-3">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* 매출 통계 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <DollarSign className="w-8 h-8 text-green-500" />
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">+15.2%</span>
                  </div>
                  <p className="text-sm text-gray-600">이번 달 매출</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(sellerStats.monthlyRevenue / 10000).toFixed(0)}만원
                  </p>
                </div>
                
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <ShoppingBag className="w-8 h-8 text-blue-500" />
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">+8.3%</span>
                  </div>
                  <p className="text-sm text-gray-600">이번 달 주문</p>
                  <p className="text-2xl font-bold text-gray-900">{sellerStats.monthlyOrders}</p>
                </div>
                
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <Package className="w-8 h-8 text-purple-500" />
                    <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">{sellerStats.activeProducts}/{sellerStats.totalProducts}</span>
                  </div>
                  <p className="text-sm text-gray-600">판매중 상품</p>
                  <p className="text-2xl font-bold text-gray-900">{sellerStats.activeProducts}</p>
                </div>
                
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <Star className="w-8 h-8 text-yellow-500" />
                    <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">평균</span>
                  </div>
                  <p className="text-sm text-gray-600">상품 평점</p>
                  <p className="text-2xl font-bold text-gray-900">{sellerStats.averageRating}</p>
                </div>
              </div>

              {/* 최근 주문 */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">최근 주문</h3>
                  <button onClick={() => setActiveTab('orders')} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    전체보기 →
                  </button>
                </div>
                
                <div className="space-y-4">
                  {orders.slice(0, 5).map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="font-medium text-gray-900">{order.orderNumber}</div>
                          <div className="text-sm text-gray-500">{order.orderDate}</div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{order.productName}</div>
                          <div className="text-sm text-gray-600">
                            {order.customerName} • 수량: {order.quantity}개
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">
                          {order.amount.toLocaleString()}원
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 상품 현황 */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">상품 현황</h3>
                  <button onClick={() => setActiveTab('products')} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    전체보기 →
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((product) => (
                    <div key={product.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded-lg"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/api/placeholder/64/64';
                          }}
                        />
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(product.status)}`}>
                          {getStatusText(product.status)}
                        </span>
                      </div>
                      
                      <div className="mb-3">
                        <div className="font-medium text-gray-900 line-clamp-2 mb-1">
                          {product.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          재고: {product.stock}개 • 판매: {product.sales}개
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-lg font-bold text-gray-900">
                          {product.price.toLocaleString()}원
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-sm font-medium">{product.rating}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-3">
                        <button className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700">
                          <Eye className="w-4 h-4 inline mr-1" />
                          보기
                        </button>
                        <button className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-200">
                          <Edit3 className="w-4 h-4 inline mr-1" />
                          편집
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 알림 및 할 일 */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-xl font-bold mb-6">알림 및 할 일</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    <div className="flex-1">
                      <div className="font-medium text-yellow-800">재고 부족 상품 있음</div>
                      <div className="text-sm text-yellow-600">3개 상품의 재고가 10개 이하입니다.</div>
                    </div>
                    <button 
                      onClick={() => setActiveTab('products')}
                      className="text-yellow-600 hover:text-yellow-700 text-sm font-medium"
                    >
                      확인하기
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <div className="flex-1">
                      <div className="font-medium text-blue-800">처리 대기 주문 있음</div>
                      <div className="text-sm text-blue-600">5개의 주문이 확인을 기다리고 있습니다.</div>
                    </div>
                    <button 
                      onClick={() => setActiveTab('orders')}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      처리하기
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div className="flex-1">
                      <div className="font-medium text-green-800">새로운 리뷰 도착</div>
                      <div className="text-sm text-green-600">고객들이 8개의 새로운 리뷰를 남겼습니다.</div>
                    </div>
                    <button 
                      onClick={() => setActiveTab('reviews')}
                      className="text-green-600 hover:text-green-700 text-sm font-medium"
                    >
                      확인하기
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 다른 탭들 */}
          {activeTab !== 'overview' && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold">
                  {menuItems.find(item => item.id === activeTab)?.name}
                </h3>
              </div>
              
              <div className="p-6">
                <div className="text-center py-12 text-gray-500">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p>해당 기능은 개발 중입니다.</p>
                  <p className="text-sm mt-2">곧 강력한 판매자 도구를 제공할 예정입니다.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SellerMyPage;
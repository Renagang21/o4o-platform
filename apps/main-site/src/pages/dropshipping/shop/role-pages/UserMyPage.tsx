import { useState, useEffect, FC } from 'react';
import { Link } from 'react-router-dom';
import { 
  Package, Heart, Star, Clock, Truck, Gift, 
  CreditCard, MapPin, Bell, Settings, HelpCircle,
  ShoppingCart, TrendingUp, Award, MessageCircle
} from 'lucide-react';

// 공통 타입 import
import { User, RolePageProps } from '../../../../types/user';

interface Order {
  id: string;
  orderNumber: string;
  status: 'pending' | 'confirmed' | 'shipping' | 'delivered' | 'cancelled';
  orderDate: string;
  deliveryDate?: string;
  totalAmount: number;
  itemCount: number;
  firstItemName: string;
}

interface WishlistItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  image: string;
  isRocket: boolean;
}

const UserMyPage: FC<RolePageProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [orders, setOrders] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [userStats, setUserStats] = useState({
    points: 15840,
    coupons: 3,
    grade: 'VIP',
    totalOrders: 12,
    totalSpent: 486000
  });

  useEffect(() => {
    // 모의 주문 데이터
    const mockOrders: Order[] = [
      {
        id: '1',
        orderNumber: '20250121001',
        status: 'shipping',
        orderDate: '2025.01.20',
        deliveryDate: '2025.01.22',
        totalAmount: 148800,
        itemCount: 3,
        firstItemName: '프리미엄 오메가3 1000mg 90캡슐'
      },
      {
        id: '2',
        orderNumber: '20250115001',
        status: 'delivered',
        orderDate: '2025.01.15',
        deliveryDate: '2025.01.16',
        totalAmount: 19900,
        itemCount: 1,
        firstItemName: '종합비타민 멀티비타민 60정'
      }
    ];

    const mockWishlist: WishlistItem[] = [
      {
        id: '1',
        name: '프로바이오틱스 유산균 30포',
        price: 39900,
        image: '/products/probiotics.jpg',
        isRocket: true
      },
      {
        id: '2',
        name: '마그네슘 + 비타민D 60정',
        price: 25900,
        originalPrice: 32000,
        discount: 19,
        image: '/products/magnesium.jpg',
        isRocket: false
      }
    ];

    setOrders(mockOrders);
    setWishlist(mockWishlist);
  }, []);

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '주문접수';
      case 'confirmed': return '주문확인';
      case 'shipping': return '배송중';
      case 'delivered': return '배송완료';
      case 'cancelled': return '주문취소';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'confirmed': return 'text-blue-600 bg-blue-50';
      case 'shipping': return 'text-orange-600 bg-orange-50';
      case 'delivered': return 'text-green-600 bg-green-50';
      case 'cancelled': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const menuItems = [
    { id: 'overview', name: '대시보드', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'orders', name: '주문내역', icon: <Package className="w-5 h-5" /> },
    { id: 'wishlist', name: '찜한상품', icon: <Heart className="w-5 h-5" /> },
    { id: 'points', name: '적립금', icon: <Gift className="w-5 h-5" /> },
    { id: 'coupons', name: '쿠폰', icon: <CreditCard className="w-5 h-5" /> },
    { id: 'addresses', name: '배송지', icon: <MapPin className="w-5 h-5" /> },
    { id: 'reviews', name: '리뷰관리', icon: <Star className="w-5 h-5" /> },
    { id: 'notifications', name: '알림설정', icon: <Bell className="w-5 h-5" /> },
    { id: 'settings', name: '계정설정', icon: <Settings className="w-5 h-5" /> }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* 왼쪽: 메뉴 */}
        <div className="lg:col-span-1">
          {/* 사용자 등급 카드 */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Award className="w-6 h-6 text-yellow-500" />
                <span className="text-lg font-bold text-yellow-600">{userStats.grade}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-blue-600">
                    {userStats.points.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600">적립금</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-600">{userStats.coupons}</div>
                  <div className="text-xs text-gray-600">쿠폰</div>
                </div>
              </div>
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
              {/* 통계 카드들 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">총 주문</p>
                      <p className="text-2xl font-bold text-gray-900">{userStats.totalOrders}</p>
                    </div>
                    <Package className="w-8 h-8 text-blue-500" />
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">총 구매금액</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {(userStats.totalSpent / 10000).toFixed(0)}만원
                      </p>
                    </div>
                    <ShoppingCart className="w-8 h-8 text-green-500" />
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">적립금</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {userStats.points.toLocaleString()}
                      </p>
                    </div>
                    <Gift className="w-8 h-8 text-yellow-500" />
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">쿠폰</p>
                      <p className="text-2xl font-bold text-gray-900">{userStats.coupons}</p>
                    </div>
                    <CreditCard className="w-8 h-8 text-purple-500" />
                  </div>
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
                  {orders.slice(0, 3).map((order: any) => (
                    <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">주문번호: {order.orderNumber}</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(order.status)}`}>
                            {getStatusText(order.status)}
                          </span>
                        </div>
                        <span className="text-sm text-gray-600">{order.orderDate}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{order.firstItemName}</div>
                          {order.itemCount > 1 && (
                            <div className="text-sm text-gray-600">
                              외 {order.itemCount - 1}개 상품
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900">
                            {order.totalAmount.toLocaleString()}원
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 찜한 상품 */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">찜한 상품</h3>
                  <button onClick={() => setActiveTab('wishlist')} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    전체보기 →
                  </button>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {wishlist.slice(0, 4).map((item: any) => (
                    <Link
                      key={item.id}
                      to={`/dropshipping/product/${item.id}`}
                      className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-24 object-cover rounded mb-2"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/api/placeholder/150/150';
                        }}
                      />
                      <div className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                        {item.name}
                      </div>
                      <div className="text-sm font-bold text-blue-600">
                        {item.price.toLocaleString()}원
                      </div>
                      {item.discount && (
                        <div className="text-xs text-red-500">
                          {item.discount}% 할인
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 다른 탭들 */}
          {activeTab !== 'overview' && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold">
                  {menuItems.find((item: any) => item.id === activeTab)?.name}
                </h3>
              </div>
              
              <div className="p-6">
                <div className="text-center py-12 text-gray-500">
                  <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p>해당 기능은 개발 중입니다.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserMyPage;

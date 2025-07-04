import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Package, Factory, Truck, Users, BarChart3,
  DollarSign, TrendingUp, AlertTriangle, CheckCircle,
  Clock, FileText, Shield, Award, Eye, Plus
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface SupplierMyPageProps {
  user: User;
}

interface SupplierStats {
  totalProducts: number;
  activePartners: number;
  totalOrders: number;
  monthlyOrders: number;
  totalRevenue: number;
  monthlyRevenue: number;
  averageRating: number;
  fulfillmentRate: number;
  onTimeDelivery: number;
  qualityScore: number;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  wholesalePrice: number;
  stock: number;
  minimumOrder: number;
  partners: number;
  totalSales: number;
  status: 'active' | 'inactive' | 'pending';
  image: string;
}

interface PartnerOrder {
  id: string;
  orderNumber: string;
  partnerName: string;
  partnerType: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered';
  orderDate: string;
  requestedDelivery: string;
}

const SupplierMyPage: React.FC<SupplierMyPageProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [supplierStats, setSupplierStats] = useState<SupplierStats>({
    totalProducts: 147,
    activePartners: 23,
    totalOrders: 892,
    monthlyOrders: 67,
    totalRevenue: 45680000,
    monthlyRevenue: 3420000,
    averageRating: 4.8,
    fulfillmentRate: 98.5,
    onTimeDelivery: 96.2,
    qualityScore: 94.8
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [partnerOrders, setPartnerOrders] = useState<PartnerOrder[]>([]);

  useEffect(() => {
    // 모의 상품 데이터
    const mockProducts: Product[] = [
      {
        id: '1',
        name: '프리미엄 오메가3 1000mg 90캡슐',
        sku: 'SUP-OMG-001',
        category: '건강식품',
        price: 29900,
        wholesalePrice: 18000,
        stock: 2500,
        minimumOrder: 50,
        partners: 8,
        totalSales: 1247,
        status: 'active',
        image: '/products/omega3.jpg'
      },
      {
        id: '2',
        name: '종합비타민 멀티비타민 60정',
        sku: 'SUP-VIT-002',
        category: '건강식품',
        price: 19900,
        wholesalePrice: 12000,
        stock: 1800,
        minimumOrder: 100,
        partners: 12,
        totalSales: 892,
        status: 'active',
        image: '/products/multivitamin.jpg'
      },
      {
        id: '3',
        name: '혈압측정기 자동 전자 혈압계',
        sku: 'SUP-MED-003',
        category: '의료기기',
        price: 89000,
        wholesalePrice: 55000,
        stock: 450,
        minimumOrder: 10,
        partners: 5,
        totalSales: 234,
        status: 'active',
        image: '/products/blood-pressure.jpg'
      }
    ];

    // 모의 파트너 주문 데이터
    const mockPartnerOrders: PartnerOrder[] = [
      {
        id: '1',
        orderNumber: 'PO-20250121-001',
        partnerName: '헬스마켓',
        partnerType: '판매자',
        productName: '프리미엄 오메가3 1000mg',
        quantity: 200,
        unitPrice: 18000,
        totalAmount: 3600000,
        status: 'confirmed',
        orderDate: '2025.01.21',
        requestedDelivery: '2025.01.25'
      },
      {
        id: '2',
        orderNumber: 'PO-20250120-045',
        partnerName: '비타민스토어',
        partnerType: '리셀러',
        productName: '종합비타민 멀티비타민',
        quantity: 500,
        unitPrice: 12000,
        totalAmount: 6000000,
        status: 'processing',
        orderDate: '2025.01.20',
        requestedDelivery: '2025.01.24'
      },
      {
        id: '3',
        orderNumber: 'PO-20250119-032',
        partnerName: '메디케어샵',
        partnerType: '판매자',
        productName: '혈압측정기 자동 전자',
        quantity: 50,
        unitPrice: 55000,
        totalAmount: 2750000,
        status: 'shipped',
        orderDate: '2025.01.19',
        requestedDelivery: '2025.01.22'
      }
    ];

    setProducts(mockProducts);
    setPartnerOrders(mockPartnerOrders);
  }, []);

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '공급중';
      case 'inactive': return '중단';
      case 'pending': return '승인대기';
      case 'confirmed': return '주문확인';
      case 'processing': return '제조중';
      case 'shipped': return '출고완료';
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
      case 'processing': return 'text-purple-600 bg-purple-50';
      case 'shipped': return 'text-orange-600 bg-orange-50';
      case 'delivered': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const menuItems = [
    { id: 'overview', name: '대시보드', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'products', name: '상품 관리', icon: <Package className="w-5 h-5" /> },
    { id: 'orders', name: '주문 관리', icon: <FileText className="w-5 h-5" /> },
    { id: 'partners', name: '파트너 관리', icon: <Users className="w-5 h-5" /> },
    { id: 'inventory', name: '재고 관리', icon: <Factory className="w-5 h-5" /> },
    { id: 'logistics', name: '배송 관리', icon: <Truck className="w-5 h-5" /> },
    { id: 'analytics', name: '공급 분석', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'quality', name: '품질 관리', icon: <Shield className="w-5 h-5" /> }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* 왼쪽: 메뉴 */}
        <div className="lg:col-span-1">
          {/* 공급자 정보 카드 */}
          <div className="bg-gradient-to-br from-green-500 to-teal-600 text-white rounded-xl p-6 mb-6">
            <div className="text-center">
              <div className="text-3xl mb-2">📦</div>
              <div className="text-xl font-bold mb-2">신뢰 공급자</div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Shield className="w-4 h-4" />
                <span className="text-lg font-bold">{supplierStats.qualityScore}%</span>
                <span className="text-sm opacity-90">품질점수</span>
              </div>
              <div className="text-sm opacity-90">
                {supplierStats.activePartners}개 파트너와 협력
              </div>
            </div>
          </div>

          {/* 빠른 액션 */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 mb-6">
            <h3 className="font-semibold mb-3">빠른 액션</h3>
            <div className="space-y-2">
              <Link 
                to="/dropshipping/products/new"
                className="w-full flex items-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-lg text-sm hover:bg-green-100"
              >
                <Plus className="w-4 h-4" />
                새 상품 등록
              </Link>
              <button 
                onClick={() => setActiveTab('orders')}
                className="w-full text-left bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm hover:bg-blue-100"
              >
                📋 주문 확인하기
              </button>
              <button 
                onClick={() => setActiveTab('inventory')}
                className="w-full text-left bg-orange-50 text-orange-700 px-3 py-2 rounded-lg text-sm hover:bg-orange-100"
              >
                📦 재고 관리하기
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
                } ${activeTab === item.id ? 'bg-green-50 text-green-600' : 'text-gray-700'}`}
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
              {/* 공급 성과 지표 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <DollarSign className="w-8 h-8 text-green-500" />
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">+18.5%</span>
                  </div>
                  <p className="text-sm text-gray-600">이번 달 매출</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(supplierStats.monthlyRevenue / 10000).toFixed(0)}만원
                  </p>
                </div>
                
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <FileText className="w-8 h-8 text-blue-500" />
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">+12.3%</span>
                  </div>
                  <p className="text-sm text-gray-600">이번 달 주문</p>
                  <p className="text-2xl font-bold text-gray-900">{supplierStats.monthlyOrders}</p>
                </div>
                
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <Truck className="w-8 h-8 text-orange-500" />
                    <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">{supplierStats.onTimeDelivery}%</span>
                  </div>
                  <p className="text-sm text-gray-600">정시 배송률</p>
                  <p className="text-2xl font-bold text-gray-900">{supplierStats.onTimeDelivery}%</p>
                </div>
                
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <Shield className="w-8 h-8 text-purple-500" />
                    <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">A+</span>
                  </div>
                  <p className="text-sm text-gray-600">품질 점수</p>
                  <p className="text-2xl font-bold text-gray-900">{supplierStats.qualityScore}%</p>
                </div>
              </div>

              {/* 최근 파트너 주문 */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">최근 파트너 주문</h3>
                  <button onClick={() => setActiveTab('orders')} className="text-green-600 hover:text-green-700 text-sm font-medium">
                    전체보기 →
                  </button>
                </div>
                
                <div className="space-y-4">
                  {partnerOrders.slice(0, 5).map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="font-medium text-gray-900">{order.orderNumber}</div>
                          <div className="text-sm text-gray-500">{order.orderDate}</div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{order.productName}</div>
                          <div className="text-sm text-gray-600">
                            {order.partnerName} ({order.partnerType}) • 수량: {order.quantity.toLocaleString()}개
                          </div>
                          <div className="text-xs text-gray-500">
                            납기요청: {order.requestedDelivery}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">
                          {order.totalAmount.toLocaleString()}원
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 공급 상품 현황 */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">공급 상품 현황</h3>
                  <button onClick={() => setActiveTab('products')} className="text-green-600 hover:text-green-700 text-sm font-medium">
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
                        <div className="text-xs text-gray-500 mb-1">SKU: {product.sku}</div>
                        <div className="text-sm text-gray-600">
                          재고: {product.stock.toLocaleString()}개 • 파트너: {product.partners}개
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">소비자가:</span>
                          <span className="font-medium">{product.price.toLocaleString()}원</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">도매가:</span>
                          <span className="font-bold text-green-600">{product.wholesalePrice.toLocaleString()}원</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">최소주문:</span>
                          <span className="text-gray-900">{product.minimumOrder}개</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-3">
                        <button className="flex-1 bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700">
                          <Eye className="w-4 h-4 inline mr-1" />
                          상세
                        </button>
                        <button className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-200">
                          재고관리
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 공급자 알림 및 품질 관리 */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-xl font-bold mb-6">알림 및 품질 관리</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    <div className="flex-1">
                      <div className="font-medium text-orange-800">재고 부족 알림</div>
                      <div className="text-sm text-orange-600">5개 상품의 재고가 안전재고 이하입니다.</div>
                    </div>
                    <button 
                      onClick={() => setActiveTab('inventory')}
                      className="text-orange-600 hover:text-orange-700 text-sm font-medium"
                    >
                      재고보충
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <div className="flex-1">
                      <div className="font-medium text-blue-800">긴급 주문 처리 요청</div>
                      <div className="text-sm text-blue-600">3개의 주문이 긴급 처리를 요청하고 있습니다.</div>
                    </div>
                    <button 
                      onClick={() => setActiveTab('orders')}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      즉시처리
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div className="flex-1">
                      <div className="font-medium text-green-800">품질 인증 갱신 완료</div>
                      <div className="text-sm text-green-600">ISO 인증이 성공적으로 갱신되었습니다.</div>
                    </div>
                    <button 
                      onClick={() => setActiveTab('quality')}
                      className="text-green-600 hover:text-green-700 text-sm font-medium"
                    >
                      인증서보기
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                    <Award className="w-5 h-5 text-purple-600" />
                    <div className="flex-1">
                      <div className="font-medium text-purple-800">우수 공급자 선정</div>
                      <div className="text-sm text-purple-600">이번 분기 최우수 공급자로 선정되었습니다!</div>
                    </div>
                    <span className="text-purple-600 text-sm font-medium">🏆</span>
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
                  <Factory className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p>해당 기능은 개발 중입니다.</p>
                  <p className="text-sm mt-2">곧 전문적인 공급자 관리 도구를 제공할 예정입니다.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupplierMyPage;
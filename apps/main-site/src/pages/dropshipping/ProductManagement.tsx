import { useState, FC } from 'react';
import ProductInfoHub from '../../components/dropshipping/ProductInfoHub';
import TrustIndicator from '../../components/common/TrustIndicator';

type UserRole = 'supplier' | 'reseller' | 'partner' | 'customer';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  supplierPrice: number;
  status: 'active' | 'draft' | 'review' | 'inactive';
  trustScore: number;
  partnersCount: number;
  salesCount: number;
  lastUpdated: string;
}

const ProductManagement: React.FC = () => {
  const [currentRole, setCurrentRole] = useState<UserRole>('supplier');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductInfoHub, setShowProductInfoHub] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // 샘플 제품 데이터
  const [products] = useState<Product[]>([
    {
      id: 'prod_001',
      name: '프리미엄 비타민 D3 1000IU',
      category: 'health',
      price: 45000,
      supplierPrice: 15000,
      status: 'active',
      trustScore: 94,
      partnersCount: 12,
      salesCount: 247,
      lastUpdated: '2024-06-14'
    },
    {
      id: 'prod_002',
      name: '콜라겐 펩타이드 젤리',
      category: 'beauty',
      price: 35000,
      supplierPrice: 12000,
      status: 'active',
      trustScore: 87,
      partnersCount: 8,
      salesCount: 156,
      lastUpdated: '2024-06-13'
    },
    {
      id: 'prod_003',
      name: '프로바이오틱스 플러스',
      category: 'health',
      price: 52000,
      supplierPrice: 18000,
      status: 'review',
      trustScore: 0, // 아직 검토 중
      partnersCount: 0,
      salesCount: 0,
      lastUpdated: '2024-06-12'
    },
    {
      id: 'prod_004',
      name: '오메가3 EPA+DHA',
      category: 'health',
      price: 38000,
      supplierPrice: 13000,
      status: 'draft',
      trustScore: 0,
      partnersCount: 0,
      salesCount: 0,
      lastUpdated: '2024-06-10'
    }
  ]);

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'health':
        return '건강기능식품';
      case 'beauty':
        return '화장품/뷰티';
      case 'medical':
        return '의료기기';
      case 'supplement':
        return '영양제';
      default:
        return category;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-trust-verified bg-opacity-10 text-trust-verified';
      case 'draft':
        return 'bg-gray-100 text-gray-700';
      case 'review':
        return 'bg-trust-pending bg-opacity-10 text-trust-pending';
      case 'inactive':
        return 'bg-trust-warning bg-opacity-10 text-trust-warning';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return '활성';
      case 'draft':
        return '임시저장';
      case 'review':
        return '검토 중';
      case 'inactive':
        return '비활성';
      default:
        return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ko-KR').format(num);
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || product.status === filterStatus;
    return matchesCategory && matchesStatus;
  });

  const handleProductEdit = (product: Product) => {
    setSelectedProduct(product);
    setShowProductInfoHub(true);
  };

  const handleProductSave = (data: any) => {
    console.log('제품 데이터 저장:', data);
    setShowProductInfoHub(false);
    setSelectedProduct(null);
    // 실제로는 API 호출하여 저장
  };

  const renderProductCard = (product: Product) => (
    <div key={product.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="font-medium text-gray-900">{product.name}</h3>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(product.status)}`}>
              {getStatusLabel(product.status)}
            </span>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
            <span>{getCategoryLabel(product.category)}</span>
            <span>•</span>
            <span>업데이트: {product.lastUpdated}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <span className="text-xs text-gray-600">공급가</span>
              <p className="font-medium">{formatCurrency(product.supplierPrice)}</p>
            </div>
            <div>
              <span className="text-xs text-gray-600">권장판매가</span>
              <p className="font-medium text-o4o-primary-600">{formatCurrency(product.price)}</p>
            </div>
            <div>
              <span className="text-xs text-gray-600">참여 파트너</span>
              <p className="font-medium">{formatNumber(product.partnersCount)}명</p>
            </div>
            <div>
              <span className="text-xs text-gray-600">총 판매</span>
              <p className="font-medium">{formatNumber(product.salesCount)}건</p>
            </div>
          </div>

          {product.trustScore > 0 && (
            <div className="mb-3">
              <TrustIndicator
                score={product.trustScore}
                type="product"
                details={{
                  verified: product.trustScore >= 90,
                  expertReviewed: product.trustScore >= 85,
                  userRating: product.trustScore / 20, // 0-5 스케일로 변환
                  certifications: product.trustScore >= 90 ? ['GMP', 'ISO'] : ['GMP']
                }}
                size="small"
                showDetails={false}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center space-x-2">
          {currentRole === 'supplier' && (
            <>
              <button
                onClick={() => handleProductEdit(product)}
                className="text-sm text-o4o-primary-600 hover:text-o4o-primary-700 font-medium"
              >
                상세 편집
              </button>
              <span className="text-gray-300">|</span>
              <button className="text-sm text-gray-600 hover:text-gray-700">
                복제
              </button>
            </>
          )}
          
          {currentRole === 'reseller' && (
            <>
              <button className="text-sm text-o4o-primary-600 hover:text-o4o-primary-700 font-medium">
                커스터마이징
              </button>
              <span className="text-gray-300">|</span>
              <button className="text-sm text-gray-600 hover:text-gray-700">
                상세 보기
              </button>
            </>
          )}
        </div>

        <div className="text-xs text-gray-500">
          마진: {Math.round(((product.price - product.supplierPrice) / product.price) * 100)}%
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">제품 관리</h1>
              <span className="text-sm text-gray-500">
                {currentRole === 'supplier' ? '등록된 제품을 관리하세요' : '판매할 제품을 선택하세요'}
              </span>
            </div>
            
            {currentRole === 'supplier' && (
              <button
                onClick={() => {
                  setSelectedProduct(null);
                  setShowProductInfoHub(true);
                }}
                className="inline-flex items-center px-4 py-2 bg-o4o-primary-500 text-white text-sm font-medium rounded-md hover:bg-o4o-primary-600"
              >
                <span className="mr-2">+</span>
                새 제품 등록
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 필터 */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-o4o-primary-500"
              >
                <option value="all">모든 카테고리</option>
                <option value="health">건강기능식품</option>
                <option value="beauty">화장품/뷰티</option>
                <option value="medical">의료기기</option>
                <option value="supplement">영양제</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-o4o-primary-500"
              >
                <option value="all">모든 상태</option>
                <option value="active">활성</option>
                <option value="draft">임시저장</option>
                <option value="review">검토 중</option>
                <option value="inactive">비활성</option>
              </select>
            </div>

            <div className="text-sm text-gray-600">
              총 {filteredProducts.length}개 제품
            </div>
          </div>
        </div>

        {/* 제품 목록 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map(renderProductCard)}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">제품이 없습니다</h3>
            <p className="text-gray-600 mb-4">
              {currentRole === 'supplier' 
                ? '첫 번째 제품을 등록해보세요' 
                : '판매할 제품을 선택해보세요'
              }
            </p>
            {currentRole === 'supplier' && (
              <button
                onClick={() => {
                  setSelectedProduct(null);
                  setShowProductInfoHub(true);
                }}
                className="inline-flex items-center px-4 py-2 bg-o4o-primary-500 text-white text-sm font-medium rounded-md hover:bg-o4o-primary-600"
              >
                새 제품 등록
              </button>
            )}
          </div>
        )}
      </div>

      {/* 제품 정보 허브 모달 */}
      {showProductInfoHub && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-screen overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedProduct ? '제품 정보 수정' : '새 제품 등록'}
              </h2>
              <button
                onClick={() => {
                  setShowProductInfoHub(false);
                  setSelectedProduct(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
              <ProductInfoHub
                productId={selectedProduct?.id || 'new'}
                userRole={currentRole}
                onSave={handleProductSave}
                readonly={currentRole !== 'supplier'}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManagement;
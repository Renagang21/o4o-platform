import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  RotateCcw,
  Download,
  Package,
  DollarSign,
  TrendingUp,
  Eye,
  ShoppingCart,
  Star,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { Product, productCategories } from '../types/product';
import { ProductProvider, useProducts, useProductFilters } from '../context/ProductContext';
import { StatusBadge } from '../ui/StatusBadge';
import { Modal, ModalHeader, ModalBody, ModalFooter, ModalButton } from '../ui/Modal';
import { ToastProvider, useSuccessToast, useWarningToast, useInfoToast } from '../ui/ToastNotification';

interface SellerCatalogPageProps {
  currentRole: string;
  activeMenu: string;
  onMenuChange: (menuId: string) => void;
}

interface ProductSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

// Product Selection Modal Component
const ProductSelectionModal: React.FC<ProductSelectionModalProps> = ({
  isOpen,
  onClose,
  product
}) => {
  const [sellerPrice, setSellerPrice] = useState(0);
  const [commissionRate, setCommissionRate] = useState(5);
  const showSuccess = useSuccessToast();

  useEffect(() => {
    if (product) {
      // Set default seller price with 30% markup
      setSellerPrice(Math.round(product.supplierPrice * 1.3));
    }
  }, [product]);

  if (!product) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const margin = sellerPrice - product.supplierPrice;
  const marginRate = product.supplierPrice > 0 ? (margin / sellerPrice) * 100 : 0;

  const handleAddToStore = () => {
    // Add product to seller's catalog with custom pricing
    showSuccess(
      '상품 추가 완료', 
      `${product.name}이(가) 내 몰에 추가되었습니다. 판매가: ${formatCurrency(sellerPrice)}`
    );
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="내 몰에 상품 추가"
    >
      <ModalHeader>
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="w-16 h-16 object-cover rounded-lg"
              />
            ) : (
              <Package className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-gray-900">{product.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{product.description}</p>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="text-gray-500">공급가: <span className="font-semibold text-gray-900">{formatCurrency(product.supplierPrice)}</span></span>
              <span className="text-gray-500">권장가: <span className="font-semibold text-gray-900">{formatCurrency(product.recommendedPrice)}</span></span>
            </div>
          </div>
        </div>
      </ModalHeader>

      <ModalBody>
        <div className="space-y-6">
          {/* Pricing Configuration */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h4 className="text-sm font-semibold text-blue-900 mb-4">가격 설정</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  내 판매가 (₩)
                </label>
                <input
                  type="number"
                  value={sellerPrice}
                  onChange={(e) => setSellerPrice(Number(e.target.value))}
                  min={product.supplierPrice}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  최소 판매가: {formatCurrency(product.supplierPrice)}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  파트너 커미션율 (%)
                </label>
                <input
                  type="number"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(Number(e.target.value))}
                  min={0}
                  max={20}
                  step={0.1}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  권장 커미션율: 3-7%
                </p>
              </div>
            </div>
          </div>

          {/* Profit Analysis */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <h4 className="text-sm font-semibold text-green-900 mb-4">수익 분석</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(margin)}
                </div>
                <div className="text-sm text-green-700">예상 마진</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {marginRate.toFixed(1)}%
                </div>
                <div className="text-sm text-green-700">마진율</div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-green-200 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">판매가</span>
                <span className="font-medium text-gray-900">{formatCurrency(sellerPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">공급가</span>
                <span className="font-medium text-gray-900">{formatCurrency(product.supplierPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">파트너 커미션 ({commissionRate}%)</span>
                <span className="font-medium text-orange-600">-{formatCurrency(sellerPrice * (commissionRate / 100))}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-green-300">
                <span className="font-semibold text-green-900">순 마진</span>
                <span className="font-bold text-green-600">
                  {formatCurrency(margin - (sellerPrice * (commissionRate / 100)))}
                </span>
              </div>
            </div>
          </div>

          {/* Product Performance Indicators */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">상품 성과 지표</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-blue-600">4.8</div>
                <div className="text-xs text-gray-600">평점</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-600">156</div>
                <div className="text-xs text-gray-600">월 판매</div>
              </div>
              <div>
                <div className="text-lg font-bold text-purple-600">₩3.2M</div>
                <div className="text-xs text-gray-600">월 매출</div>
              </div>
              <div>
                <div className="text-lg font-bold text-yellow-600">94%</div>
                <div className="text-xs text-gray-600">재구매율</div>
              </div>
            </div>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <ModalButton variant="secondary" onClick={onClose}>
          취소
        </ModalButton>
        <ModalButton 
          variant="primary" 
          onClick={handleAddToStore}
          disabled={sellerPrice < product.supplierPrice}
        >
          <Plus className="w-4 h-4 mr-2" />
          내 몰에 추가
        </ModalButton>
      </ModalFooter>
    </Modal>
  );
};

// Main content component (wrapped by providers)
const SellerCatalogContent: React.FC<SellerCatalogPageProps> = ({
  currentRole,
  activeMenu,
  onMenuChange
}) => {
  const { state } = useProducts();
  const { filters, hasActiveFilters, clearFilters } = useProductFilters();
  const showSuccess = useSuccessToast();
  const showWarning = useWarningToast();
  const showInfo = useInfoToast();

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);

  // Filter products based on search and filters
  const filteredProducts = useMemo(() => {
    let filtered = [...state.products];
    
    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(search) ||
        product.description.toLowerCase().includes(search) ||
        product.brand?.toLowerCase().includes(search)
      );
    }

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    // Apply price range filter
    if (priceRange.min) {
      filtered = filtered.filter(product => product.supplierPrice >= Number(priceRange.min));
    }
    if (priceRange.max) {
      filtered = filtered.filter(product => product.supplierPrice <= Number(priceRange.max));
    }

    return filtered;
  }, [state.products, searchTerm, selectedCategory, priceRange]);

  // Statistics
  const stats = useMemo(() => {
    return {
      totalProducts: filteredProducts.length,
      averagePrice: filteredProducts.length > 0 
        ? filteredProducts.reduce((sum, p) => sum + p.supplierPrice, 0) / filteredProducts.length
        : 0,
      categories: [...new Set(filteredProducts.map(p => p.category))].length,
      popularProducts: filteredProducts.filter(p => p.currentStock > 100).length
    };
  }, [filteredProducts]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getCategoryInfo = (categoryId: string) => {
    return productCategories.find(cat => cat.id === categoryId) || 
           { name: categoryId, color: 'gray' as const };
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setIsSelectionModalOpen(true);
  };

  const handleQuickAdd = (product: Product) => {
    // Quick add with default 30% markup
    const sellerPrice = Math.round(product.supplierPrice * 1.3);
    showSuccess(
      '빠른 추가 완료',
      `${product.name}이(가) 내 몰에 추가되었습니다. 판매가: ${formatCurrency(sellerPrice)}`
    );
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setPriceRange({ min: '', max: '' });
    clearFilters();
    showSuccess('필터 초기화', '모든 필터가 해제되었습니다.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">상품 카탈로그</h1>
          <p className="text-sm text-gray-500 mt-1">
            공급자 상품을 선택하여 내 몰에 추가하세요. 총 {stats.totalProducts}개의 상품이 있습니다.
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg flex-shrink-0">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm text-gray-600 truncate">총 상품</div>
              <div className="text-lg sm:text-xl font-bold text-gray-900">{stats.totalProducts}</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg flex-shrink-0">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm text-gray-600 truncate">평균 공급가</div>
              <div className="text-sm sm:text-lg font-bold text-green-600">
                {formatCurrency(stats.averagePrice)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg flex-shrink-0">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm text-gray-600 truncate">카테고리</div>
              <div className="text-lg sm:text-xl font-bold text-purple-600">{stats.categories}</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-yellow-100 rounded-lg flex-shrink-0">
              <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm text-gray-600 truncate">인기 상품</div>
              <div className="text-lg sm:text-xl font-bold text-yellow-600">{stats.popularProducts}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="상품명, 브랜드로 검색..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">모든 카테고리</option>
              {productCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <input
              type="number"
              value={priceRange.min}
              onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
              placeholder="최소 가격"
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <input
              type="number"
              value={priceRange.max}
              onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
              placeholder="최대 가격"
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <button
              onClick={handleClearFilters}
              className="flex items-center justify-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              초기화
            </button>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {filteredProducts.map((product) => {
          const categoryInfo = getCategoryInfo(product.category);
          const isLowStock = product.currentStock <= product.minStockAlert;
          const recommendedMargin = ((product.recommendedPrice - product.supplierPrice) / product.recommendedPrice) * 100;

          return (
            <div
              key={product.id}
              className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 group"
            >
              {/* Product Image */}
              <div className="relative">
                <div className="w-full h-48 bg-gray-100 rounded-t-lg flex items-center justify-center">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                  ) : (
                    <Package className="w-12 h-12 text-gray-400" />
                  )}
                </div>
                
                {/* Stock Status Badge */}
                <div className="absolute top-2 right-2">
                  {product.currentStock === 0 ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      품절
                    </span>
                  ) : isLowStock ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      재고부족
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      재고충분
                    </span>
                  )}
                </div>

                {/* Category Badge */}
                <div className="absolute top-2 left-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${categoryInfo.color}-100 text-${categoryInfo.color}-800`}>
                    {categoryInfo.name}
                  </span>
                </div>
              </div>

              {/* Product Info */}
              <div className="p-4">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">
                    {product.name}
                  </h3>
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {product.description}
                  </p>
                  {product.brand && (
                    <p className="text-xs text-gray-400 mt-1">
                      {product.brand} {product.model && `• ${product.model}`}
                    </p>
                  )}
                </div>

                {/* Pricing Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">공급가</span>
                    <span className="text-sm font-bold text-gray-900">
                      {formatCurrency(product.supplierPrice)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">권장가</span>
                    <span className="text-sm font-bold text-blue-600">
                      {formatCurrency(product.recommendedPrice)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">예상 마진</span>
                    <span className="text-sm font-bold text-green-600">
                      {recommendedMargin.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">재고</span>
                    <span className={`text-sm font-medium ${
                      product.currentStock === 0 ? 'text-red-600' :
                      isLowStock ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {product.currentStock.toLocaleString()}개
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <button
                    onClick={() => handleProductSelect(product)}
                    disabled={product.currentStock === 0}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    내 몰에 추가
                  </button>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleQuickAdd(product)}
                      disabled={product.currentStock === 0}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:text-gray-400 disabled:border-gray-200"
                    >
                      <ShoppingCart className="w-3 h-3" />
                      빠른 추가
                    </button>
                    
                    <button
                      onClick={() => showInfo('상품 상세', `${product.name}의 상세 정보를 확인하세요.`)}
                      className="flex items-center justify-center px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            조건에 맞는 상품이 없습니다
          </h3>
          <p className="text-gray-500 mb-4">
            검색 조건을 변경하거나 필터를 초기화해보세요.
          </p>
          <button
            onClick={handleClearFilters}
            className="inline-flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-800"
          >
            <RotateCcw className="w-4 h-4" />
            필터 초기화
          </button>
        </div>
      )}

      {/* Product Selection Modal */}
      <ProductSelectionModal
        isOpen={isSelectionModalOpen}
        onClose={() => setIsSelectionModalOpen(false)}
        product={selectedProduct}
      />
    </div>
  );
};

// Main component with providers
export const SellerCatalogPage: React.FC<SellerCatalogPageProps> = (props) => {
  return (
    <ToastProvider position="top-right" maxToasts={3}>
      <ProductProvider>
        <SellerCatalogContent {...props} />
      </ProductProvider>
    </ToastProvider>
  );
};
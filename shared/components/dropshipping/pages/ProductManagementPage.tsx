import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  RotateCcw,
  Download,
  Package,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { Product } from '../types/product';
import { ProductProvider, useProducts, useProductFilters } from '../context/ProductContext';
import { ProductListTable } from '../components/ProductListTable';
import { ProductFilterPanel } from '../components/ProductFilterPanel';
import { ProductFormModal } from '../components/ProductFormModal';
import { ProductDetailModal } from '../components/ProductDetailModal';
import { ToastProvider, useSuccessToast, useWarningToast } from '../ui/ToastNotification';

interface ProductManagementPageProps {
  currentRole: string;
  activeMenu: string;
  onMenuChange: (menuId: string) => void;
}

// Main content component (wrapped by providers)
const ProductManagementContent: React.FC<ProductManagementPageProps> = ({
  currentRole,
  activeMenu,
  onMenuChange
}) => {
  const { state, applyFilters, loadProducts } = useProducts();
  const { filters, hasActiveFilters, clearFilters } = useProductFilters();
  const showSuccess = useSuccessToast();
  const showWarning = useWarningToast();

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalState, setModalState] = useState<{
    type: 'none' | 'create' | 'edit' | 'detail';
    product?: Product | null;
  }>({ type: 'none' });

  // Search debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      applyFilters({ search: searchTerm });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, applyFilters]);

  // Computed statistics
  const stats = useMemo(() => {
    const products = state.products;
    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.status === 'active').length;
    const outOfStock = products.filter(p => p.status === 'out_of_stock').length;
    const lowStock = products.filter(p => 
      p.currentStock > 0 && p.currentStock <= p.minStockAlert
    ).length;
    const totalValue = products.reduce((sum, p) => sum + (p.currentStock * p.supplierPrice), 0);

    return {
      totalProducts,
      activeProducts,
      outOfStock,
      lowStock,
      totalValue
    };
  }, [state.products]);

  // Event handlers
  const handleCreateProduct = () => {
    setModalState({ type: 'create' });
  };

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setModalState({ type: 'detail', product });
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setModalState({ type: 'edit', product });
  };

  const handleDeleteProduct = (product: Product) => {
    showWarning('상품 삭제', `${product.name}을(를) 삭제하시겠습니까?`, {
      action: {
        label: '삭제',
        onClick: async () => {
          try {
            // Delete logic would go here
            showSuccess('삭제 완료', '상품이 성공적으로 삭제되었습니다.');
          } catch (error) {
            showWarning('삭제 실패', '상품 삭제 중 오류가 발생했습니다.');
          }
        }
      }
    });
  };

  const handleRefresh = async () => {
    await loadProducts();
    showSuccess('새로고침 완료', '상품 목록이 업데이트되었습니다.');
  };

  const handleExport = () => {
    showSuccess('내보내기 완료', '상품 목록이 CSV 파일로 다운로드되었습니다.');
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    clearFilters();
    showSuccess('필터 초기화', '모든 필터가 해제되었습니다.');
  };

  const closeModal = () => {
    setModalState({ type: 'none' });
    setSelectedProduct(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">상품 관리</h1>
          <p className="text-sm text-gray-500 mt-1">
            상품을 등록하고 관리하세요. 총 {stats.totalProducts}개의 상품이 있습니다.
          </p>
        </div>
        <button
          onClick={handleCreateProduct}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          상품 등록
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg flex-shrink-0">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm text-gray-600 truncate">전체 상품</div>
              <div className="text-lg sm:text-xl font-bold text-gray-900">{stats.totalProducts}</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg flex-shrink-0">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm text-gray-600 truncate">판매 중</div>
              <div className="text-lg sm:text-xl font-bold text-green-600">{stats.activeProducts}</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-red-100 rounded-lg flex-shrink-0">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm text-gray-600 truncate">품절</div>
              <div className="text-lg sm:text-xl font-bold text-red-600">{stats.outOfStock}</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-yellow-100 rounded-lg flex-shrink-0">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm text-gray-600 truncate">재고 부족</div>
              <div className="text-lg sm:text-xl font-bold text-yellow-600">{stats.lowStock}</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm lg:col-span-1 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg flex-shrink-0">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm text-gray-600 truncate">재고 가치</div>
              <div className="text-sm sm:text-lg font-bold text-purple-600">
                {formatCurrency(stats.totalValue)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="space-y-3 md:space-y-0 md:flex md:items-center md:gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="상품명, 카테고리로 검색..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 md:flex md:items-center gap-2">
            <button
              onClick={() => setIsFilterPanelOpen(true)}
              className={`flex items-center justify-center gap-2 px-3 py-2 border rounded-md transition-colors text-sm ${
                hasActiveFilters
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">필터</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              )}
            </button>

            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="flex items-center justify-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">초기화</span>
              </button>
            )}

            <button
              onClick={handleRefresh}
              className="flex items-center justify-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">새로고침</span>
            </button>

            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">내보내기</span>
            </button>
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">활성 필터:</span>
              <div className="flex items-center gap-2 flex-wrap">
                {filters.search && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                    검색: "{filters.search}"
                  </span>
                )}
                {filters.category.length > 0 && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                    카테고리: {filters.category.length}개
                  </span>
                )}
                {filters.status.length > 0 && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                    상태: {filters.status.length}개
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Product Table */}
      <ProductListTable
        onViewProduct={handleViewProduct}
        onEditProduct={handleEditProduct}
        onDeleteProduct={handleDeleteProduct}
      />

      {/* Modals */}
      <ProductFilterPanel
        isOpen={isFilterPanelOpen}
        onClose={() => setIsFilterPanelOpen(false)}
      />

      <ProductFormModal
        isOpen={modalState.type === 'create' || modalState.type === 'edit'}
        onClose={closeModal}
        mode={modalState.type === 'edit' ? 'edit' : 'create'}
        product={modalState.product}
      />

      <ProductDetailModal
        isOpen={modalState.type === 'detail'}
        onClose={closeModal}
        product={selectedProduct}
        onEdit={handleEditProduct}
        onDelete={handleDeleteProduct}
      />
    </div>
  );
};

// Main component with providers
export const ProductManagementPage: React.FC<ProductManagementPageProps> = (props) => {
  return (
    <ToastProvider position="top-right" maxToasts={3}>
      <ProductProvider>
        <ProductManagementContent {...props} />
      </ProductProvider>
    </ToastProvider>
  );
};
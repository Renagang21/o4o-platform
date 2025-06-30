import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  DollarSign, 
  Users, 
  TrendingUp,
  Search, 
  Filter, 
  RotateCcw,
  Download,
  Edit,
  Eye,
  Trash2,
  Toggle,
  Settings
} from 'lucide-react';
import { SellerProduct } from '../types/seller';
import { productCategories } from '../types/product';
import { StatusBadge } from '../ui/StatusBadge';
import { Modal, ModalHeader, ModalBody, ModalFooter, ModalButton } from '../ui/Modal';
import { ToastProvider, useSuccessToast, useWarningToast, useInfoToast } from '../ui/ToastNotification';

interface SellerProductManagementPageProps {
  currentRole: string;
  activeMenu: string;
  onMenuChange: (menuId: string) => void;
}

interface ProductEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: SellerProduct | null;
  onSave: (productId: number, updates: Partial<SellerProduct>) => void;
}

// Sample seller products (products that seller has added to their catalog)
const generateSellerProducts = (): SellerProduct[] => {
  return [
    {
      id: 1,
      name: '무선 블루투스 이어폰 프리미엄',
      category: 'electronics',
      description: '고품질 무선 블루투스 이어폰으로 뛰어난 음질과 편안한 착용감을 제공합니다.',
      brand: 'SoundPro',
      model: 'SP-BT100',
      supplierPrice: 65000,
      recommendedPrice: 89000,
      marginRate: 26.97,
      currentStock: 150,
      minStockAlert: 20,
      stockManagement: 'auto',
      minOrderQuantity: 1,
      image: 'https://via.placeholder.com/400x400/3B82F6/FFFFFF?text=이어폰',
      images: [],
      shippingCost: 0,
      shippingDays: 2,
      shippingAreas: 'all',
      status: 'active',
      createdAt: '2024-06-25T10:00:00Z',
      updatedAt: '2024-06-29T10:00:00Z',
      // Seller-specific fields
      sellerPrice: 89000,
      isActive: true,
      partnerCommissionRate: 5.0,
      salesCount: 89,
      dateAdded: '2024-06-25T10:00:00Z'
    },
    {
      id: 2,
      name: '스마트 워치 밴드 실리콘',
      category: 'accessories',
      description: '부드럽고 내구성이 뛰어난 실리콘 소재의 스마트 워치 밴드입니다.',
      brand: 'WatchStyle',
      model: 'WS-SB200',
      supplierPrice: 18000,
      recommendedPrice: 25000,
      marginRate: 28.0,
      currentStock: 200,
      minStockAlert: 30,
      stockManagement: 'auto',
      minOrderQuantity: 1,
      image: 'https://via.placeholder.com/400x400/10B981/FFFFFF?text=워치밴드',
      images: [],
      shippingCost: 2500,
      shippingDays: 1,
      shippingAreas: 'all',
      status: 'active',
      createdAt: '2024-06-20T10:00:00Z',
      updatedAt: '2024-06-29T10:00:00Z',
      // Seller-specific fields
      sellerPrice: 27000,
      isActive: true,
      partnerCommissionRate: 7.0,
      salesCount: 67,
      dateAdded: '2024-06-20T10:00:00Z'
    },
    {
      id: 3,
      name: 'USB-C 고속 충전 케이블 3m',
      category: 'electronics',
      description: '고속 충전과 데이터 전송을 지원하는 고품질 USB-C 케이블입니다.',
      brand: 'PowerLink',
      model: 'PL-USC300',
      supplierPrice: 8000,
      recommendedPrice: 15000,
      marginRate: 46.67,
      currentStock: 300,
      minStockAlert: 50,
      stockManagement: 'manual',
      minOrderQuantity: 1,
      image: 'https://via.placeholder.com/400x400/F59E0B/FFFFFF?text=케이블',
      images: [],
      shippingCost: 0,
      shippingDays: 1,
      shippingAreas: 'all',
      status: 'active',
      createdAt: '2024-06-15T10:00:00Z',
      updatedAt: '2024-06-29T10:00:00Z',
      // Seller-specific fields
      sellerPrice: 16500,
      isActive: true,
      partnerCommissionRate: 4.0,
      salesCount: 124,
      dateAdded: '2024-06-15T10:00:00Z'
    },
    {
      id: 4,
      name: '무선 마우스 게이밍용',
      category: 'electronics',
      description: '정밀한 센서와 빠른 반응속도를 자랑하는 게이밍 전용 무선 마우스입니다.',
      brand: 'GameTech',
      model: 'GT-WM500',
      supplierPrice: 45000,
      recommendedPrice: 65000,
      marginRate: 30.77,
      currentStock: 5,
      minStockAlert: 10,
      stockManagement: 'auto',
      minOrderQuantity: 1,
      image: 'https://via.placeholder.com/400x400/8B5CF6/FFFFFF?text=마우스',
      images: [],
      shippingCost: 0,
      shippingDays: 2,
      shippingAreas: 'all',
      status: 'active',
      createdAt: '2024-06-10T10:00:00Z',
      updatedAt: '2024-06-29T10:00:00Z',
      // Seller-specific fields
      sellerPrice: 69000,
      isActive: false, // Temporarily disabled
      partnerCommissionRate: 6.0,
      salesCount: 43,
      dateAdded: '2024-06-10T10:00:00Z'
    }
  ];
};

// Product Edit Modal Component
const ProductEditModal: React.FC<ProductEditModalProps> = ({
  isOpen,
  onClose,
  product,
  onSave
}) => {
  const [editData, setEditData] = useState({
    sellerPrice: 0,
    partnerCommissionRate: 0,
    isActive: true
  });

  useEffect(() => {
    if (product) {
      setEditData({
        sellerPrice: product.sellerPrice,
        partnerCommissionRate: product.partnerCommissionRate,
        isActive: product.isActive
      });
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

  const margin = editData.sellerPrice - product.supplierPrice;
  const marginRate = editData.sellerPrice > 0 ? (margin / editData.sellerPrice) * 100 : 0;
  const partnerCommission = editData.sellerPrice * (editData.partnerCommissionRate / 100);
  const netMargin = margin - partnerCommission;

  const handleSave = () => {
    onSave(product.id, editData);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="상품 설정 변경"
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
            <div className="text-sm text-gray-500 mt-2">
              공급가: {formatCurrency(product.supplierPrice)} • 현재 판매가: {formatCurrency(product.sellerPrice)}
            </div>
          </div>
        </div>
      </ModalHeader>

      <ModalBody>
        <div className="space-y-6">
          {/* Active Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm font-semibold text-gray-900">판매 상태</div>
              <div className="text-xs text-gray-500 mt-1">
                비활성화 시 고객이 구매할 수 없습니다
              </div>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={editData.isActive}
                onChange={(e) => setEditData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="sr-only"
              />
              <div className={`w-11 h-6 rounded-full transition-colors ${
                editData.isActive ? 'bg-blue-600' : 'bg-gray-300'
              }`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  editData.isActive ? 'translate-x-5' : 'translate-x-0'
                } mt-0.5 ml-0.5`}></div>
              </div>
            </label>
          </div>

          {/* Pricing Configuration */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                판매가 (₩)
              </label>
              <input
                type="number"
                value={editData.sellerPrice}
                onChange={(e) => setEditData(prev => ({ ...prev, sellerPrice: Number(e.target.value) }))}
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
                value={editData.partnerCommissionRate}
                onChange={(e) => setEditData(prev => ({ ...prev, partnerCommissionRate: Number(e.target.value) }))}
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

          {/* Profit Analysis */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <h4 className="text-sm font-semibold text-green-900 mb-4">수익 분석</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">판매가</span>
                <span className="font-medium text-gray-900">{formatCurrency(editData.sellerPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">공급가</span>
                <span className="font-medium text-gray-900">{formatCurrency(product.supplierPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">파트너 커미션</span>
                <span className="font-medium text-orange-600">-{formatCurrency(partnerCommission)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-green-300">
                <span className="font-semibold text-green-900">순 마진</span>
                <span className="font-bold text-green-600">{formatCurrency(netMargin)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-green-900">마진율</span>
                <span className="font-bold text-green-600">{marginRate.toFixed(1)}%</span>
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
          onClick={handleSave}
          disabled={editData.sellerPrice < product.supplierPrice}
        >
          저장
        </ModalButton>
      </ModalFooter>
    </Modal>
  );
};

// Main content component
const SellerProductManagementContent: React.FC<SellerProductManagementPageProps> = ({
  currentRole,
  activeMenu,
  onMenuChange
}) => {
  const [products, setProducts] = useState<SellerProduct[]>(generateSellerProducts());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedProduct, setSelectedProduct] = useState<SellerProduct | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const showSuccess = useSuccessToast();
  const showWarning = useWarningToast();
  const showInfo = useInfoToast();

  // Filter products
  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(search) ||
        product.brand?.toLowerCase().includes(search)
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(product => 
        statusFilter === 'active' ? product.isActive : !product.isActive
      );
    }

    return filtered;
  }, [products, searchTerm, selectedCategory, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.isActive).length;
    const totalSales = products.reduce((sum, p) => sum + p.salesCount, 0);
    const totalRevenue = products.reduce((sum, p) => sum + (p.salesCount * p.sellerPrice), 0);
    const averageMargin = products.length > 0 
      ? products.reduce((sum, p) => sum + ((p.sellerPrice - p.supplierPrice) / p.sellerPrice) * 100, 0) / products.length
      : 0;

    return {
      totalProducts,
      activeProducts,
      totalSales,
      totalRevenue,
      averageMargin
    };
  }, [products]);

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

  const handleEdit = (product: SellerProduct) => {
    setSelectedProduct(product);
    setIsEditModalOpen(true);
  };

  const handleSave = (productId: number, updates: Partial<SellerProduct>) => {
    setProducts(prev => prev.map(p => 
      p.id === productId 
        ? { ...p, ...updates, updatedAt: new Date().toISOString() }
        : p
    ));
    showSuccess('상품 업데이트', '상품 설정이 성공적으로 변경되었습니다.');
  };

  const handleToggleStatus = (product: SellerProduct) => {
    const newStatus = !product.isActive;
    setProducts(prev => prev.map(p => 
      p.id === product.id 
        ? { ...p, isActive: newStatus, updatedAt: new Date().toISOString() }
        : p
    ));
    showSuccess(
      newStatus ? '판매 활성화' : '판매 비활성화',
      `${product.name}의 판매가 ${newStatus ? '활성화' : '비활성화'}되었습니다.`
    );
  };

  const handleRemove = (product: SellerProduct) => {
    if (window.confirm(`정말로 "${product.name}"을(를) 내 몰에서 제거하시겠습니까?`)) {
      setProducts(prev => prev.filter(p => p.id !== product.id));
      showWarning('상품 제거', '상품이 내 몰에서 제거되었습니다.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">내 상품 관리</h1>
          <p className="text-sm text-gray-500 mt-1">
            내 몰에 추가한 상품들을 관리하고 설정을 변경하세요.
          </p>
        </div>
        <button
          onClick={() => onMenuChange('catalog')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Package className="w-4 h-4" />
          상품 추가
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
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
            <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg flex-shrink-0">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm text-gray-600 truncate">총 판매</div>
              <div className="text-lg sm:text-xl font-bold text-purple-600">{stats.totalSales}</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-yellow-100 rounded-lg flex-shrink-0">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm text-gray-600 truncate">총 매출</div>
              <div className="text-sm sm:text-lg font-bold text-yellow-600">
                {formatCurrency(stats.totalRevenue)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-red-100 rounded-lg flex-shrink-0">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm text-gray-600 truncate">평균 마진</div>
              <div className="text-lg sm:text-xl font-bold text-red-600">
                {stats.averageMargin.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="space-y-4">
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">모든 상태</option>
              <option value="active">판매 중</option>
              <option value="inactive">판매 중단</option>
            </select>

            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('');
                setStatusFilter('all');
              }}
              className="flex items-center justify-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              초기화
            </button>
          </div>
        </div>
      </div>

      {/* Product List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="divide-y divide-gray-200">
          {filteredProducts.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                등록된 상품이 없습니다
              </h3>
              <p className="text-gray-500 mb-4">
                상품 카탈로그에서 상품을 선택하여 내 몰에 추가해보세요.
              </p>
              <button
                onClick={() => onMenuChange('catalog')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Package className="w-4 h-4" />
                상품 추가하기
              </button>
            </div>
          ) : (
            filteredProducts.map((product) => {
              const categoryInfo = getCategoryInfo(product.category);
              const isLowStock = product.currentStock <= product.minStockAlert;
              const margin = product.sellerPrice - product.supplierPrice;
              const marginRate = (margin / product.sellerPrice) * 100;

              return (
                <div key={product.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Product Image */}
                    <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                      ) : (
                        <Package className="w-8 h-8 text-gray-400" />
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {product.name}
                          </h3>
                          <div className="flex items-center gap-3 mt-1">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${categoryInfo.color}-100 text-${categoryInfo.color}-800`}>
                              {categoryInfo.name}
                            </span>
                            <StatusBadge 
                              status={product.isActive ? '판매중' : '판매중단'} 
                              size="sm" 
                            />
                            {isLowStock && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                재고부족
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleToggleStatus(product)}
                            className={`p-2 rounded-md transition-colors ${
                              product.isActive 
                                ? 'text-green-600 hover:bg-green-50' 
                                : 'text-gray-400 hover:bg-gray-50'
                            }`}
                            title={product.isActive ? '판매 비활성화' : '판매 활성화'}
                          >
                            <Toggle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(product)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="설정 변경"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => showInfo('상품 상세', `${product.name}의 상세 정보를 확인합니다.`)}
                            className="p-2 text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                            title="상세 보기"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRemove(product)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="제거"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Product Details Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-3">
                        <div>
                          <div className="text-xs text-gray-500">판매가</div>
                          <div className="text-sm font-bold text-gray-900">
                            {formatCurrency(product.sellerPrice)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">마진</div>
                          <div className="text-sm font-bold text-green-600">
                            {formatCurrency(margin)} ({marginRate.toFixed(1)}%)
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">판매 수량</div>
                          <div className="text-sm font-bold text-purple-600">
                            {product.salesCount.toLocaleString()}개
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">파트너 커미션</div>
                          <div className="text-sm font-bold text-orange-600">
                            {product.partnerCommissionRate}%
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">재고</div>
                          <div className={`text-sm font-bold ${
                            product.currentStock === 0 ? 'text-red-600' :
                            isLowStock ? 'text-yellow-600' : 'text-gray-900'
                          }`}>
                            {product.currentStock.toLocaleString()}개
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Product Edit Modal */}
      <ProductEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        product={selectedProduct}
        onSave={handleSave}
      />
    </div>
  );
};

// Main component with providers
export const SellerProductManagementPage: React.FC<SellerProductManagementPageProps> = (props) => {
  return (
    <ToastProvider position="top-right" maxToasts={3}>
      <SellerProductManagementContent {...props} />
    </ToastProvider>
  );
};
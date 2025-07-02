import React, { useState } from 'react';
import { 
  Edit, 
  Trash2, 
  Package, 
  DollarSign, 
  Truck, 
  AlertTriangle,
  Calendar,
  Tag,
  BarChart3,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Product, productCategories } from '../types/product';
import { Modal, ModalHeader, ModalBody, ModalFooter, ModalButton } from '../ui/Modal';
import { StatusBadge } from '../ui/StatusBadge';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  onClose,
  product,
  onEdit,
  onDelete
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  if (!product) return null;

  const getCategoryInfo = (categoryId: string) => {
    return productCategories.find(cat => cat.id === categoryId) || 
           { name: categoryId, color: 'gray' as const };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusText = (status: Product['status']) => {
    switch (status) {
      case 'active': return '판매중';
      case 'out_of_stock': return '품절';
      case 'inactive': return '판매중단';
      default: return '알 수 없음';
    }
  };

  const categoryInfo = getCategoryInfo(product.category);
  const isLowStock = product.currentStock <= product.minStockAlert;
  const images = product.images && product.images.length > 0 ? product.images : [product.image].filter(Boolean);

  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === images.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? images.length - 1 : prev - 1
    );
  };

  const handleDelete = () => {
    if (window.confirm('정말로 이 상품을 삭제하시겠습니까?')) {
      onDelete(product);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="상품 상세 정보"
    >
      <ModalHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h3>
            <div className="flex items-center gap-3 mb-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${categoryInfo.color}-100 text-${categoryInfo.color}-800`}>
                {categoryInfo.name}
              </span>
              <StatusBadge status={getStatusText(product.status)} size="sm" />
              {isLowStock && product.currentStock > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  재고 부족
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">{product.description}</p>
          </div>
        </div>
      </ModalHeader>

      <ModalBody>
        <div className="space-y-6">
          {/* Image Gallery */}
          {images.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">상품 이미지</h4>
              <div className="relative">
                {!imageError && images[currentImageIndex] ? (
                  <img
                    src={images[currentImageIndex]}
                    alt={`${product.name} - 이미지 ${currentImageIndex + 1}`}
                    className="w-full h-64 object-cover rounded-lg"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                
                {images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
              
              {images.length > 1 && (
                <div className="flex items-center justify-center gap-2 mt-3">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentImageIndex ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Product Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-5 h-5 text-blue-500" />
                  <h4 className="text-sm font-semibold text-gray-900">기본 정보</h4>
                </div>
                <div className="space-y-3">
                  {product.brand && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">브랜드</span>
                      <span className="text-sm font-medium text-gray-900">{product.brand}</span>
                    </div>
                  )}
                  {product.model && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">모델</span>
                      <span className="text-sm font-medium text-gray-900">{product.model}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">등록일</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatDate(product.createdAt)}
                    </span>
                  </div>
                  {product.updatedAt && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">수정일</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatDate(product.updatedAt)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Inventory Information */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-5 h-5 text-green-500" />
                  <h4 className="text-sm font-semibold text-gray-900">재고 정보</h4>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">현재 재고</span>
                    <span className={`text-sm font-bold ${
                      product.currentStock === 0 ? 'text-red-600' :
                      isLowStock ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {product.currentStock.toLocaleString()}개
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">최소 재고 알림</span>
                    <span className="text-sm font-medium text-gray-900">
                      {product.minStockAlert.toLocaleString()}개
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">재고 관리</span>
                    <span className="text-sm font-medium text-gray-900">
                      {product.stockManagement === 'auto' ? '자동' : '수동'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">최소 주문 수량</span>
                    <span className="text-sm font-medium text-gray-900">
                      {product.minOrderQuantity.toLocaleString()}개
                    </span>
                  </div>
                </div>

                {/* Stock Level Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>재고 수준</span>
                    <span>{((product.currentStock / (product.currentStock + 100)) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        product.currentStock === 0 ? 'bg-red-500' :
                        isLowStock ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ 
                        width: `${Math.min((product.currentStock / (product.currentStock + 100)) * 100, 100)}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing & Shipping */}
            <div className="space-y-4">
              {/* Price Information */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-5 h-5 text-yellow-500" />
                  <h4 className="text-sm font-semibold text-gray-900">가격 정보</h4>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">공급가</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(product.supplierPrice)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">권장 판매가</span>
                    <span className="text-sm font-bold text-gray-900">
                      {formatCurrency(product.recommendedPrice)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">마진율</span>
                    <span className="text-sm font-bold text-green-600">
                      {product.marginRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">예상 마진</span>
                    <span className="text-sm font-medium text-green-600">
                      {formatCurrency(product.recommendedPrice - product.supplierPrice)}
                    </span>
                  </div>
                </div>

                {/* Margin Visualization */}
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                  <div className="text-xs text-green-700 mb-1">마진율 분석</div>
                  <div className="w-full bg-green-200 rounded-full h-2">
                    <div 
                      className="h-2 bg-green-500 rounded-full"
                      style={{ width: `${Math.min(product.marginRate, 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    {product.marginRate < 20 ? '낮은 마진' : 
                     product.marginRate < 40 ? '적정 마진' : '높은 마진'}
                  </div>
                </div>
              </div>

              {/* Shipping Information */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="w-5 h-5 text-purple-500" />
                  <h4 className="text-sm font-semibold text-gray-900">배송 정보</h4>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">배송비</span>
                    <span className="text-sm font-medium text-gray-900">
                      {product.shippingCost === 0 ? '무료' : formatCurrency(product.shippingCost)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">배송 소요일</span>
                    <span className="text-sm font-medium text-gray-900">
                      {product.shippingDays}일
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">배송 지역</span>
                    <span className="text-sm font-medium text-gray-900">
                      {product.shippingAreas === 'all' ? '전국' : '선택 지역'}
                    </span>
                  </div>
                  {product.specialInstructions && (
                    <div>
                      <span className="text-sm text-gray-600">특별 안내</span>
                      <p className="text-sm text-gray-900 mt-1 p-2 bg-gray-50 rounded">
                        {product.specialInstructions}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Performance Metrics (Mock Data) */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              <h4 className="text-sm font-semibold text-blue-900">성과 지표 (최근 30일)</h4>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-900">156</div>
                <div className="text-xs text-blue-700">총 주문</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-900">₩3.2M</div>
                <div className="text-xs text-blue-700">총 매출</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-900">4.8</div>
                <div className="text-xs text-blue-700">평점</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-900">92%</div>
                <div className="text-xs text-blue-700">고객 만족도</div>
              </div>
            </div>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>등록: {formatDate(product.createdAt)}</span>
          </div>
          
          <div className="flex gap-2">
            <ModalButton variant="secondary" onClick={onClose}>
              닫기
            </ModalButton>
            <ModalButton 
              variant="primary" 
              onClick={() => {
                onEdit(product);
                onClose();
              }}
            >
              <Edit className="w-4 h-4 mr-2" />
              수정
            </ModalButton>
            <ModalButton 
              variant="danger" 
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              삭제
            </ModalButton>
          </div>
        </div>
      </ModalFooter>
    </Modal>
  );
};
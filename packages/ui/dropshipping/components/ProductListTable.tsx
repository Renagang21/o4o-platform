import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  Edit, 
  Trash2, 
  Package, 
  ChevronUp, 
  ChevronDown, 
  ChevronsUpDown,
  AlertTriangle,
  Image as ImageIcon,
  Calendar,
  BarChart3,
  DollarSign,
  Grid3X3,
  List
} from 'lucide-react';
import { Product, productCategories } from '../types/product';
import { StatusBadge } from '../ui/StatusBadge';
import { useProducts, useProductPagination } from '../context/ProductContext';

interface ProductListTableProps {
  onViewProduct: (product: Product) => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
  className?: string;
}

export const ProductListTable: React.FC<ProductListTableProps> = ({
  onViewProduct,
  onEditProduct,
  onDeleteProduct,
  className = ''
}) => {
  const { state, setSorting } = useProducts();
  const { products, pagination, totalPages, totalItems, setPage, setPageSize } = useProductPagination();
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Check screen size for responsive behavior
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768; // md breakpoint
      setIsMobile(mobile);
      if (mobile && viewMode === 'table') {
        setViewMode('cards');
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [viewMode]);

  const handleSort = (column: string) => {
    const newOrder = state.sortBy === column && state.sortOrder === 'asc' ? 'desc' : 'asc';
    setSorting(column, newOrder);
  };

  const getSortIcon = (column: string) => {
    if (state.sortBy !== column) {
      return <ChevronsUpDown className="w-4 h-4 text-gray-400" />;
    }
    return state.sortOrder === 'asc' 
      ? <ChevronUp className="w-4 h-4 text-blue-600" />
      : <ChevronDown className="w-4 h-4 text-blue-600" />;
  };

  const getStatusText = (status: Product['status']) => {
    switch (status) {
      case 'active': return '판매중';
      case 'out_of_stock': return '품절';
      case 'inactive': return '판매중단';
      default: return '알 수 없음';
    }
  };

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
      month: 'short',
      day: 'numeric'
    });
  };

  const handleImageError = (productId: number) => {
    setImageErrors(prev => new Set(prev).add(productId));
  };

  const renderProductImage = (product: Product, size: 'sm' | 'md' = 'sm') => {
    const hasError = imageErrors.has(product.id);
    const dimensions = size === 'sm' ? 'w-10 h-10' : 'w-16 h-16';
    const iconSize = size === 'sm' ? 'w-5 h-5' : 'w-8 h-8';
    
    if (!product.image || hasError) {
      return (
        <div className={`${dimensions} bg-gray-100 rounded-lg flex items-center justify-center`}>
          <ImageIcon className={`${iconSize} text-gray-400`} />
        </div>
      );
    }

    return (
      <img
        src={product.image}
        alt={product.name}
        className={`${dimensions} object-cover rounded-lg`}
        onError={() => handleImageError(product.id)}
      />
    );
  };

  // Mobile Card Component
  const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
    const categoryInfo = getCategoryInfo(product.category);
    const isLowStock = product.currentStock <= product.minStockAlert;

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-3">
          {/* Product Image */}
          <div className="flex-shrink-0">
            {renderProductImage(product, 'md')}
          </div>

          {/* Product Info */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => onViewProduct(product)}
                  className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors text-left"
                >
                  {product.name}
                </button>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {product.description}
                </p>
              </div>
              
              {/* Status Badge */}
              <div className="flex-shrink-0 ml-2">
                <StatusBadge status={getStatusText(product.status)} size="sm" />
              </div>
            </div>

            {/* Category and Brand */}
            <div className="flex items-center gap-2 mb-3">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${categoryInfo.color}-100 text-${categoryInfo.color}-800`}>
                {categoryInfo.name}
              </span>
              {product.brand && (
                <span className="text-xs text-gray-500">
                  {product.brand} {product.model && `• ${product.model}`}
                </span>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              {/* Stock */}
              <div className="flex items-center gap-1">
                <BarChart3 className="w-4 h-4 text-gray-400" />
                <div className="text-xs">
                  <div className="text-gray-500">재고</div>
                  <div className={`font-medium ${
                    product.currentStock === 0 ? 'text-red-600' :
                    isLowStock ? 'text-yellow-600' : 'text-gray-900'
                  }`}>
                    {product.currentStock.toLocaleString()}개
                    {isLowStock && product.currentStock > 0 && (
                      <AlertTriangle className="w-3 h-3 text-yellow-500 inline ml-1" />
                    )}
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <div className="text-xs">
                  <div className="text-gray-500">판매가</div>
                  <div className="font-medium text-gray-900">
                    {formatCurrency(product.recommendedPrice)}
                  </div>
                </div>
              </div>
            </div>

            {/* Price Details */}
            <div className="bg-gray-50 rounded-lg p-2 mb-3">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-gray-500">공급가</div>
                  <div className="font-medium text-gray-900">
                    {formatCurrency(product.supplierPrice)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">마진율</div>
                  <div className="font-medium text-green-600">
                    {product.marginRate.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">마진</div>
                  <div className="font-medium text-green-600">
                    {formatCurrency(product.recommendedPrice - product.supplierPrice)}
                  </div>
                </div>
              </div>
            </div>

            {/* Date and Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(product.createdAt)}</span>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onViewProduct(product)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  title="상세 보기"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onEditProduct(product)}
                  className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                  title="수정"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteProduct(product)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (state.loading) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {/* Table header skeleton */}
            <div className="grid grid-cols-7 gap-4">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
            {/* Table rows skeleton */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-7 gap-4">
                {Array.from({ length: 7 }).map((_, j) => (
                  <div key={j} className="h-10 bg-gray-200 rounded"></div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
      {/* View Mode Toggle (Desktop Only) */}
      {!isMobile && (
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            총 {totalItems}개 상품
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                viewMode === 'table'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <List className="w-4 h-4" />
              테이블
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                viewMode === 'cards'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              카드
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {viewMode === 'table' ? (
        /* Table View */
        <div className="overflow-x-auto">
        <table className="w-full">
          {/* Header */}
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('name')}
                style={{ width: '250px' }}
              >
                <div className="flex items-center gap-2">
                  상품명
                  {getSortIcon('name')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('category')}
                style={{ width: '120px' }}
              >
                <div className="flex items-center gap-2">
                  카테고리
                  {getSortIcon('category')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('currentStock')}
                style={{ width: '100px' }}
              >
                <div className="flex items-center justify-center gap-2">
                  재고
                  {getSortIcon('currentStock')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('supplierPrice')}
                style={{ width: '120px' }}
              >
                <div className="flex items-center justify-end gap-2">
                  공급가
                  {getSortIcon('supplierPrice')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('recommendedPrice')}
                style={{ width: '140px' }}
              >
                <div className="flex items-center justify-end gap-2">
                  권장판매가
                  {getSortIcon('recommendedPrice')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('status')}
                style={{ width: '100px' }}
              >
                <div className="flex items-center justify-center gap-2">
                  상태
                  {getSortIcon('status')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                style={{ width: '120px' }}
              >
                관리
              </th>
            </tr>
          </thead>

          {/* Body */}
          <tbody className="bg-white divide-y divide-gray-200">
            {products.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Package className="w-12 h-12 text-gray-400" />
                    <div>
                      <p className="text-gray-500 text-lg font-medium">상품이 없습니다</p>
                      <p className="text-gray-400 text-sm mt-1">첫 번째 상품을 등록해보세요!</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const categoryInfo = getCategoryInfo(product.category);
                const isLowStock = product.currentStock <= product.minStockAlert;
                
                return (
                  <tr 
                    key={product.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {/* Product Name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {renderProductImage(product)}
                        <div className="min-w-0 flex-1">
                          <button
                            onClick={() => onViewProduct(product)}
                            className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors text-left"
                          >
                            {product.name}
                          </button>
                          <p className="text-xs text-gray-500 truncate mt-1">
                            {product.description}
                          </p>
                          {product.brand && (
                            <p className="text-xs text-gray-400 mt-1">
                              {product.brand} {product.model && `• ${product.model}`}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${categoryInfo.color}-100 text-${categoryInfo.color}-800`}>
                        {categoryInfo.name}
                      </span>
                    </td>

                    {/* Stock */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {isLowStock && product.currentStock > 0 && (
                          <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        )}
                        <span className={`text-sm font-medium ${
                          product.currentStock === 0 ? 'text-red-600' :
                          isLowStock ? 'text-yellow-600' : 'text-gray-900'
                        }`}>
                          {product.currentStock.toLocaleString()}
                        </span>
                      </div>
                    </td>

                    {/* Supplier Price */}
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(product.supplierPrice)}
                      </span>
                    </td>

                    {/* Recommended Price */}
                    <td className="px-6 py-4 text-right">
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(product.recommendedPrice)}
                        </div>
                        <div className="text-xs text-gray-500">
                          마진 {product.marginRate.toFixed(1)}%
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 text-center">
                      <StatusBadge status={getStatusText(product.status)} size="sm" />
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onViewProduct(product)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="상세 보기"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEditProduct(product)}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                          title="수정"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteProduct(product)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      ) : (
        /* Card View */
        <div className="p-4">
          {products.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <Package className="w-12 h-12 text-gray-400" />
              <div className="text-center">
                <p className="text-gray-500 text-lg font-medium">상품이 없습니다</p>
                <p className="text-gray-400 text-sm mt-1">첫 번째 상품을 등록해보세요!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalItems > 0 && (
        <div className="border-t border-gray-200 bg-gray-50">
          {/* Desktop Pagination */}
          <div className="hidden md:flex items-center justify-between px-6 py-4">
            {/* Results Info */}
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-700">
                총 <span className="font-medium">{totalItems}</span>개 중{' '}
                <span className="font-medium">
                  {(pagination.page - 1) * pagination.pageSize + 1}
                </span>
                -{' '}
                <span className="font-medium">
                  {Math.min(pagination.page * pagination.pageSize, totalItems)}
                </span>
                개 표시
              </div>

              {/* Page Size Selector */}
              <select
                value={pagination.pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10개씩</option>
                <option value={20}>20개씩</option>
                <option value={50}>50개씩</option>
                <option value={100}>100개씩</option>
              </select>
            </div>

            {/* Page Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                이전
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        pagination.page === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPage(pagination.page + 1)}
                disabled={pagination.page === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                다음
              </button>
            </div>
          </div>

          {/* Mobile Pagination */}
          <div className="md:hidden px-4 py-3 space-y-3">
            <div className="flex items-center justify-between text-sm text-gray-700">
              <span>
                {pagination.page} / {totalPages} 페이지
              </span>
              <span>
                총 {totalItems}개
              </span>
            </div>
            
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setPage(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-center"
              >
                이전
              </button>
              
              <div className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-md bg-white min-w-[80px] text-center">
                {pagination.page} / {totalPages}
              </div>
              
              <button
                onClick={() => setPage(pagination.page + 1)}
                disabled={pagination.page === totalPages}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-center"
              >
                다음
              </button>
            </div>

            <div className="flex justify-center">
              <select
                value={pagination.pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10개씩 보기</option>
                <option value={20}>20개씩 보기</option>
                <option value={50}>50개씩 보기</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
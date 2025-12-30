/**
 * Glycopharm Product List Page
 *
 * 상품 목록 페이지 (Admin)
 * - 상품 카드 그리드/리스트
 * - 카테고리/상태 필터
 * - 검색/정렬
 *
 * Phase B-3: Glycopharm Admin Integration
 * API Endpoint: /api/v1/glycopharm/admin/products
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import {
  AGPageHeader,
  AGSection,
  AGCard,
  AGButton,
  AGInput,
  AGSelect,
  AGTag,
  AGTablePagination,
} from '@o4o/ui';
import {
  Package,
  Search,
  RefreshCw,
  Grid,
  List,
  ChevronRight,
  AlertCircle,
  Star,
  Building2,
} from 'lucide-react';

/**
 * API Response Types (Phase B-1 Glycopharm API)
 */
type ProductStatus = 'draft' | 'active' | 'inactive' | 'discontinued';
type ProductCategory = 'cgm_device' | 'test_strip' | 'lancet' | 'meter' | 'accessory' | 'other';

interface ProductListItem {
  id: string;
  pharmacy_id?: string;
  pharmacy_name?: string;
  name: string;
  sku: string;
  category: ProductCategory;
  price: number;
  sale_price?: number;
  stock_quantity: number;
  status: ProductStatus;
  is_featured: boolean;
  created_by_user_name?: string;
  created_at: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ProductListResponse {
  data: ProductListItem[];
  meta: PaginationMeta;
}

const statusLabels: Record<ProductStatus, string> = {
  draft: '초안',
  active: '판매중',
  inactive: '비활성',
  discontinued: '단종',
};

const statusColors: Record<ProductStatus, 'gray' | 'green' | 'yellow' | 'red'> = {
  draft: 'gray',
  active: 'green',
  inactive: 'yellow',
  discontinued: 'red',
};

const categoryLabels: Record<ProductCategory, string> = {
  cgm_device: 'CGM 기기',
  test_strip: '시험지',
  lancet: '란셋',
  meter: '측정기',
  accessory: '액세서리',
  other: '기타',
};

const ProductListPage: React.FC = () => {
  const api = authClient.api;
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'price' | 'name'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(itemsPerPage));
      params.set('sort', sortBy);
      params.set('order', sortOrder);

      if (categoryFilter !== 'all') {
        params.set('category', categoryFilter);
      }
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      if (searchTerm.length >= 2) {
        params.set('q', searchTerm);
      }

      const response = await api.get<ProductListResponse>(
        `/api/v1/glycopharm/admin/products?${params.toString()}`
      );

      if (response.data) {
        setProducts(response.data.data);
        setTotalItems(response.data.meta.total);
        setTotalPages(response.data.meta.totalPages);
      }
    } catch (err: any) {
      console.error('Failed to fetch products:', err);
      setError(err.message || '상품 목록을 불러오는데 실패했습니다.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [api, currentPage, categoryFilter, statusFilter, sortBy, sortOrder, searchTerm]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, statusFilter, sortBy, sortOrder, searchTerm]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <AGPageHeader
        title="상품 관리"
        description="Glycopharm 혈당 관련 상품"
        icon={<Package className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <AGButton
              variant="ghost"
              size="sm"
              onClick={fetchProducts}
              iconLeft={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
            >
              새로고침
            </AGButton>
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Filters */}
        <AGSection>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <AGInput
                type="text"
                placeholder="상품 검색 (2자 이상)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <AGSelect
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as ProductCategory | 'all')}
                className="w-32"
              >
                <option value="all">전체 카테고리</option>
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </AGSelect>
              <AGSelect
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ProductStatus | 'all')}
                className="w-32"
              >
                <option value="all">전체 상태</option>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </AGSelect>
              <AGSelect
                value={`${sortBy}_${sortOrder}`}
                onChange={(e) => {
                  const [sort, order] = e.target.value.split('_') as [typeof sortBy, typeof sortOrder];
                  setSortBy(sort);
                  setSortOrder(order);
                }}
                className="w-36"
              >
                <option value="created_at_desc">최신순</option>
                <option value="created_at_asc">오래된순</option>
                <option value="price_desc">가격 높은순</option>
                <option value="price_asc">가격 낮은순</option>
                <option value="name_asc">이름순</option>
              </AGSelect>
            </div>
          </div>
        </AGSection>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            총 <span className="font-medium">{totalItems}</span>개 상품
          </p>
        </div>

        {/* Product Grid/List */}
        <AGSection>
          {products.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>상품이 없습니다</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <Link key={product.id} to={`/glycopharm/products/${product.id}`}>
                  <AGCard hoverable padding="md" className="h-full">
                    <div className="flex flex-col h-full">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-2">
                        {product.is_featured && (
                          <AGTag color="yellow" size="sm">
                            <Star className="w-3 h-3 inline mr-1" />추천
                          </AGTag>
                        )}
                        <AGTag color={statusColors[product.status]} size="sm">
                          {statusLabels[product.status]}
                        </AGTag>
                        <span className="text-xs text-gray-500">
                          {categoryLabels[product.category]}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="font-medium text-gray-900 line-clamp-2 mb-1">
                        {product.name}
                      </h3>
                      <p className="text-xs text-gray-400 mb-2">SKU: {product.sku}</p>

                      {/* Price */}
                      <div className="mb-2">
                        {product.sale_price ? (
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-red-600">
                              {formatPrice(product.sale_price)}
                            </span>
                            <span className="text-sm text-gray-400 line-through">
                              {formatPrice(product.price)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-lg font-bold text-gray-900">
                            {formatPrice(product.price)}
                          </span>
                        )}
                      </div>

                      {/* Meta */}
                      <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t mt-auto">
                        <span>재고: {product.stock_quantity}</span>
                        <span>{formatDate(product.created_at)}</span>
                      </div>
                    </div>
                  </AGCard>
                </Link>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {products.map((product) => (
                <Link key={product.id} to={`/glycopharm/products/${product.id}`}>
                  <AGCard hoverable padding="md">
                    <div className="flex items-center gap-4">
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {product.is_featured && (
                            <AGTag color="yellow" size="sm">
                              <Star className="w-3 h-3 inline mr-1" />추천
                            </AGTag>
                          )}
                          <AGTag color={statusColors[product.status]} size="sm">
                            {statusLabels[product.status]}
                          </AGTag>
                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                            {categoryLabels[product.category]}
                          </span>
                        </div>
                        <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          <span>SKU: {product.sku}</span>
                          {product.pharmacy_name && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {product.pharmacy_name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Price & Stock */}
                      <div className="text-right flex-shrink-0">
                        {product.sale_price ? (
                          <>
                            <p className="font-bold text-red-600">{formatPrice(product.sale_price)}</p>
                            <p className="text-xs text-gray-400 line-through">{formatPrice(product.price)}</p>
                          </>
                        ) : (
                          <p className="font-bold text-gray-900">{formatPrice(product.price)}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">재고: {product.stock_quantity}</p>
                      </div>

                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </AGCard>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6">
              <AGTablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </AGSection>
      </div>
    </div>
  );
};

export default ProductListPage;

/**
 * Cosmetics Product List Page
 *
 * 화장품 제품 목록 페이지
 * - 제품 카드 그리드
 * - 필터/검색/정렬
 * - 반응형 레이아웃
 *
 * Phase 7-A-2: Cosmetics API Integration
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
} from 'lucide-react';

/**
 * API Response Types (OpenAPI 계약 기반)
 */
interface BrandSummary {
  id: string;
  name: string;
  slug: string;
}

interface LineSummary {
  id: string;
  name: string;
  product_count?: number;
}

interface Price {
  base: number;
  sale?: number | null;
  currency: string;
}

interface ProductImage {
  url: string;
  alt?: string;
  is_primary: boolean;
  order?: number;
}

type ProductStatus = 'draft' | 'visible' | 'hidden' | 'sold_out';

interface ProductSummary {
  id: string;
  name: string;
  brand: BrandSummary;
  line?: LineSummary;
  description?: string;
  status: ProductStatus;
  price: Price;
  images?: ProductImage[];
  created_at: string;
  updated_at: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next?: boolean;
  has_prev?: boolean;
}

interface ProductListResponse {
  data: ProductSummary[];
  meta: PaginationMeta;
}

interface BrandDetail {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  is_active: boolean;
  lines?: LineSummary[];
  product_count?: number;
}

interface BrandListResponse {
  data: BrandDetail[];
}

const statusLabels: Record<ProductStatus, string> = {
  draft: '초안',
  visible: '공개',
  hidden: '숨김',
  sold_out: '품절',
};

const statusColors: Record<ProductStatus, 'gray' | 'green' | 'yellow' | 'red'> = {
  draft: 'gray',
  visible: 'green',
  hidden: 'yellow',
  sold_out: 'red',
};

const ProductListPage: React.FC = () => {
  const api = authClient.api;
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [brands, setBrands] = useState<BrandDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'price' | 'name'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 12;

  // Fetch brands for filter dropdown
  const fetchBrands = useCallback(async () => {
    try {
      const response = await api.get<BrandListResponse>('/api/v1/cosmetics/brands');
      if (response.data) {
        setBrands(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch brands:', err);
    }
  }, [api]);

  // Fetch products with filters
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(itemsPerPage));
      params.set('sort', sortBy);
      params.set('order', sortOrder);

      if (brandFilter !== 'all') {
        params.set('brand_id', brandFilter);
      }
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      // Use search endpoint if search term provided
      let response: { data: ProductListResponse };
      if (searchTerm.length >= 2) {
        params.set('q', searchTerm);
        response = await api.get<ProductListResponse>(`/api/v1/cosmetics/products/search?${params.toString()}`);
      } else {
        response = await api.get<ProductListResponse>(`/api/v1/cosmetics/products?${params.toString()}`);
      }

      if (response.data) {
        setProducts(response.data.data);
        setTotalItems(response.data.meta.total);
        setTotalPages(response.data.meta.total_pages);
      }
    } catch (err: any) {
      console.error('Failed to fetch products:', err);
      setError(err.message || '상품 목록을 불러오는데 실패했습니다.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [api, currentPage, brandFilter, statusFilter, sortBy, sortOrder, searchTerm]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [brandFilter, statusFilter, sortBy, sortOrder, searchTerm]);

  const formatPrice = (price: Price) => {
    const displayPrice = price.sale ?? price.base;
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: price.currency || 'KRW' }).format(displayPrice);
  };

  const getPrimaryImage = (images?: ProductImage[]) => {
    if (!images || images.length === 0) return null;
    const primary = images.find(img => img.is_primary);
    return primary || images[0];
  };

  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
              <div className="h-40 bg-gray-200 rounded-lg mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
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
        title="Products"
        description="화장품 제품 목록"
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
                placeholder="제품명 검색 (2자 이상)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <AGSelect
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="w-40"
              >
                <option value="all">전체 브랜드</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
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
                  const [sort, order] = e.target.value.split('_') as ['created_at' | 'price' | 'name', 'asc' | 'desc'];
                  setSortBy(sort);
                  setSortOrder(order);
                }}
                className="w-36"
              >
                <option value="created_at_desc">최신순</option>
                <option value="created_at_asc">오래된순</option>
                <option value="name_asc">이름순</option>
                <option value="name_desc">이름역순</option>
                <option value="price_asc">가격 낮은순</option>
                <option value="price_desc">가격 높은순</option>
              </AGSelect>
            </div>
          </div>
        </AGSection>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            총 <span className="font-medium">{totalItems}</span>개 제품
          </p>
        </div>

        {/* Product Grid/List */}
        <AGSection>
          {products.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>검색 결과가 없습니다</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product) => {
                const primaryImage = getPrimaryImage(product.images);
                return (
                  <Link key={product.id} to={`/cosmetics-products/${product.id}`}>
                    <AGCard hoverable padding="none" className="overflow-hidden group">
                      {/* Image */}
                      <div className="relative h-48 bg-gray-100">
                        {primaryImage ? (
                          <img
                            src={primaryImage.url}
                            alt={primaryImage.alt || product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-12 h-12 text-gray-300" />
                          </div>
                        )}
                        {/* Status Badge */}
                        <div className="absolute top-2 left-2">
                          <AGTag color={statusColors[product.status]} size="sm">
                            {statusLabels[product.status]}
                          </AGTag>
                        </div>
                        {/* Sale Badge */}
                        {product.price.sale && (
                          <div className="absolute top-2 right-2">
                            <AGTag color="red" size="sm">SALE</AGTag>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-4">
                        <p className="text-xs text-gray-500 mb-1">{product.brand.name}</p>
                        <h3 className="font-medium text-gray-900 line-clamp-2 mb-2 min-h-[40px]">
                          {product.name}
                        </h3>

                        {/* Line */}
                        {product.line && (
                          <div className="mb-3">
                            <span className="px-1.5 py-0.5 text-xs bg-blue-50 text-blue-600 rounded">
                              {product.line.name}
                            </span>
                          </div>
                        )}

                        {/* Price */}
                        <div className="flex items-center justify-end">
                          {product.price.sale ? (
                            <div className="text-right">
                              <span className="text-xs text-gray-400 line-through mr-2">
                                {new Intl.NumberFormat('ko-KR').format(product.price.base)}원
                              </span>
                              <span className="font-bold text-red-600">{formatPrice(product.price)}</span>
                            </div>
                          ) : (
                            <span className="font-bold text-gray-900">{formatPrice(product.price)}</span>
                          )}
                        </div>
                      </div>
                    </AGCard>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((product) => {
                const primaryImage = getPrimaryImage(product.images);
                return (
                  <Link key={product.id} to={`/cosmetics-products/${product.id}`}>
                    <AGCard hoverable padding="md">
                      <div className="flex items-center gap-4">
                        <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {primaryImage ? (
                            <img
                              src={primaryImage.url}
                              alt={primaryImage.alt || product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-8 h-8 text-gray-300" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-gray-500">{product.brand.name}</span>
                            <AGTag color={statusColors[product.status]} size="sm">
                              {statusLabels[product.status]}
                            </AGTag>
                            {product.price.sale && (
                              <AGTag color="red" size="sm">SALE</AGTag>
                            )}
                          </div>
                          <h3 className="font-medium text-gray-900 mb-2">{product.name}</h3>
                          {product.line && (
                            <span className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded">
                              {product.line.name}
                            </span>
                          )}
                        </div>

                        <div className="text-right flex-shrink-0">
                          {product.price.sale ? (
                            <>
                              <div className="text-xs text-gray-400 line-through">
                                {new Intl.NumberFormat('ko-KR').format(product.price.base)}원
                              </div>
                              <span className="font-bold text-lg text-red-600">{formatPrice(product.price)}</span>
                            </>
                          ) : (
                            <span className="font-bold text-lg text-gray-900">{formatPrice(product.price)}</span>
                          )}
                        </div>

                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </AGCard>
                  </Link>
                );
              })}
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

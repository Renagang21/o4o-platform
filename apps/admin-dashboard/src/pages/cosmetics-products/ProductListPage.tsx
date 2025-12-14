/**
 * Cosmetics Product List Page
 *
 * 화장품 제품 목록 페이지
 * - 제품 카드 그리드
 * - 필터/검색/정렬
 * - 반응형 레이아웃
 *
 * Phase 7-H: Cosmetics Products/Brands/Routines UI Redesign (AG Design System)
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
  Filter,
  Grid,
  List,
  Star,
  ChevronRight,
  Heart,
  Droplet,
  Sun,
  Sparkles,
} from 'lucide-react';

interface CosmeticsProduct {
  id: string;
  name: string;
  brandId: string;
  brandName: string;
  category: string;
  price: number;
  imageUrl?: string;
  skinTypes: string[];
  concerns: string[];
  certifications: string[];
  rating: number;
  reviewCount: number;
  isNew: boolean;
  isBestSeller: boolean;
}

const skinTypeLabels: Record<string, string> = {
  dry: '건성',
  oily: '지성',
  combination: '복합성',
  sensitive: '민감성',
  normal: '중성',
};

const concernLabels: Record<string, string> = {
  wrinkle: '주름',
  pigmentation: '색소침착',
  pore: '모공',
  acne: '여드름',
  dryness: '건조',
  oiliness: '유수분',
};

const ProductListPage: React.FC = () => {
  const api = authClient.api;
  const [products, setProducts] = useState<CosmeticsProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState('all');
  const [skinTypeFilter, setSkinTypeFilter] = useState('all');
  const [concernFilter, setConcernFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      // Demo data
      setProducts([
        {
          id: 'prod-1',
          name: '하이드로 부스팅 세럼 30ml',
          brandId: 'brand-1',
          brandName: '네이처리퍼블릭',
          category: '세럼',
          price: 45000,
          imageUrl: 'https://placehold.co/200x200/e0f2fe/0891b2?text=Serum',
          skinTypes: ['dry', 'sensitive'],
          concerns: ['dryness', 'wrinkle'],
          certifications: ['KFDA'],
          rating: 4.8,
          reviewCount: 1245,
          isNew: true,
          isBestSeller: true,
        },
        {
          id: 'prod-2',
          name: '비타민C 브라이트닝 앰플 15ml',
          brandId: 'brand-2',
          brandName: '이니스프리',
          category: '앰플',
          price: 52000,
          imageUrl: 'https://placehold.co/200x200/fef3c7/d97706?text=Ampoule',
          skinTypes: ['oily', 'combination'],
          concerns: ['pigmentation', 'acne'],
          certifications: ['EWG'],
          rating: 4.6,
          reviewCount: 892,
          isNew: false,
          isBestSeller: true,
        },
        {
          id: 'prod-3',
          name: '수분 크림 50ml',
          brandId: 'brand-1',
          brandName: '네이처리퍼블릭',
          category: '크림',
          price: 38000,
          imageUrl: 'https://placehold.co/200x200/dcfce7/16a34a?text=Cream',
          skinTypes: ['dry', 'normal'],
          concerns: ['dryness'],
          certifications: [],
          rating: 4.5,
          reviewCount: 567,
          isNew: false,
          isBestSeller: false,
        },
        {
          id: 'prod-4',
          name: '선스크린 SPF50+ PA++++ 50ml',
          brandId: 'brand-3',
          brandName: '라로슈포제',
          category: '선케어',
          price: 28000,
          imageUrl: 'https://placehold.co/200x200/fef9c3/ca8a04?text=Sunscreen',
          skinTypes: ['oily', 'sensitive'],
          concerns: ['pigmentation'],
          certifications: ['KFDA', 'Dermatologist Tested'],
          rating: 4.9,
          reviewCount: 2341,
          isNew: false,
          isBestSeller: true,
        },
        {
          id: 'prod-5',
          name: '클렌징 폼 150ml',
          brandId: 'brand-2',
          brandName: '이니스프리',
          category: '클렌저',
          price: 22000,
          imageUrl: 'https://placehold.co/200x200/f0fdf4/22c55e?text=Cleanser',
          skinTypes: ['combination', 'normal'],
          concerns: ['pore', 'oiliness'],
          certifications: [],
          rating: 4.3,
          reviewCount: 456,
          isNew: true,
          isBestSeller: false,
        },
        {
          id: 'prod-6',
          name: '레티놀 안티에이징 크림 30ml',
          brandId: 'brand-3',
          brandName: '라로슈포제',
          category: '크림',
          price: 68000,
          imageUrl: 'https://placehold.co/200x200/fce7f3/ec4899?text=Retinol',
          skinTypes: ['normal', 'dry'],
          concerns: ['wrinkle'],
          certifications: ['Dermatologist Tested'],
          rating: 4.7,
          reviewCount: 789,
          isNew: false,
          isBestSeller: false,
        },
      ]);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Filtering
  const filteredProducts = products.filter((product) => {
    if (searchTerm && !product.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (brandFilter !== 'all' && product.brandId !== brandFilter) return false;
    if (skinTypeFilter !== 'all' && !product.skinTypes.includes(skinTypeFilter)) return false;
    if (concernFilter !== 'all' && !product.concerns.includes(concernFilter)) return false;
    return true;
  });

  // Sorting
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price_asc':
        return a.price - b.price;
      case 'price_desc':
        return b.price - a.price;
      case 'rating':
        return b.rating - a.rating;
      case 'reviews':
        return b.reviewCount - a.reviewCount;
      default:
        return a.name.localeCompare(b.name);
    }
  });

  // Pagination
  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
  const paginatedProducts = sortedProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Unique brands for filter
  const brands = [...new Set(products.map((p) => ({ id: p.brandId, name: p.brandName })))];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(price);
  };

  const getConcernIcon = (concern: string) => {
    switch (concern) {
      case 'dryness':
        return <Droplet className="w-3 h-3" />;
      case 'pigmentation':
        return <Sun className="w-3 h-3" />;
      default:
        return <Sparkles className="w-3 h-3" />;
    }
  };

  if (loading) {
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
              iconLeft={<RefreshCw className="w-4 h-4" />}
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
        {/* Filters */}
        <AGSection>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <AGInput
                type="text"
                placeholder="제품명 검색..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <AGSelect
                value={brandFilter}
                onChange={(e) => {
                  setBrandFilter(e.target.value);
                  setCurrentPage(1);
                }}
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
                value={skinTypeFilter}
                onChange={(e) => {
                  setSkinTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-32"
              >
                <option value="all">피부 타입</option>
                {Object.entries(skinTypeLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </AGSelect>
              <AGSelect
                value={concernFilter}
                onChange={(e) => {
                  setConcernFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-32"
              >
                <option value="all">피부 고민</option>
                {Object.entries(concernLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </AGSelect>
              <AGSelect
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-36"
              >
                <option value="name">이름순</option>
                <option value="price_asc">가격 낮은순</option>
                <option value="price_desc">가격 높은순</option>
                <option value="rating">평점순</option>
                <option value="reviews">리뷰순</option>
              </AGSelect>
            </div>
          </div>
        </AGSection>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            총 <span className="font-medium">{filteredProducts.length}</span>개 제품
          </p>
        </div>

        {/* Product Grid/List */}
        <AGSection>
          {paginatedProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>검색 결과가 없습니다</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {paginatedProducts.map((product) => (
                <Link key={product.id} to={`/cosmetics-products/${product.id}`}>
                  <AGCard hoverable padding="none" className="overflow-hidden group">
                    {/* Image */}
                    <div className="relative h-48 bg-gray-100">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-12 h-12 text-gray-300" />
                        </div>
                      )}
                      {/* Badges */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        {product.isNew && (
                          <AGTag color="blue" size="sm">NEW</AGTag>
                        )}
                        {product.isBestSeller && (
                          <AGTag color="red" size="sm">BEST</AGTag>
                        )}
                      </div>
                      {/* Wishlist */}
                      <button className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                        <Heart className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <p className="text-xs text-gray-500 mb-1">{product.brandName}</p>
                      <h3 className="font-medium text-gray-900 line-clamp-2 mb-2 min-h-[40px]">
                        {product.name}
                      </h3>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {product.skinTypes.slice(0, 2).map((type) => (
                          <span
                            key={type}
                            className="px-1.5 py-0.5 text-xs bg-blue-50 text-blue-600 rounded"
                          >
                            {skinTypeLabels[type]}
                          </span>
                        ))}
                        {product.concerns.slice(0, 1).map((concern) => (
                          <span
                            key={concern}
                            className="px-1.5 py-0.5 text-xs bg-green-50 text-green-600 rounded flex items-center gap-0.5"
                          >
                            {getConcernIcon(concern)}
                            {concernLabels[concern]}
                          </span>
                        ))}
                      </div>

                      {/* Rating & Price */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="font-medium">{product.rating}</span>
                          <span className="text-gray-400">({product.reviewCount})</span>
                        </div>
                        <span className="font-bold text-gray-900">{formatPrice(product.price)}</span>
                      </div>
                    </div>
                  </AGCard>
                </Link>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedProducts.map((product) => (
                <Link key={product.id} to={`/cosmetics-products/${product.id}`}>
                  <AGCard hoverable padding="md">
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
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
                          <span className="text-xs text-gray-500">{product.brandName}</span>
                          {product.isNew && <AGTag color="blue" size="sm">NEW</AGTag>}
                          {product.isBestSeller && <AGTag color="red" size="sm">BEST</AGTag>}
                        </div>
                        <h3 className="font-medium text-gray-900 mb-2">{product.name}</h3>
                        <div className="flex flex-wrap gap-1">
                          {product.skinTypes.map((type) => (
                            <span
                              key={type}
                              className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded"
                            >
                              {skinTypeLabels[type]}
                            </span>
                          ))}
                          {product.concerns.map((concern) => (
                            <span
                              key={concern}
                              className="px-2 py-0.5 text-xs bg-green-50 text-green-600 rounded"
                            >
                              {concernLabels[concern]}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="flex items-center gap-1 text-sm mb-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="font-medium">{product.rating}</span>
                          <span className="text-gray-400">({product.reviewCount})</span>
                        </div>
                        <span className="font-bold text-lg text-gray-900">{formatPrice(product.price)}</span>
                      </div>

                      <ChevronRight className="w-5 h-5 text-gray-400" />
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
                totalItems={filteredProducts.length}
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

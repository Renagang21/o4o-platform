/**
 * StoreProducts - 약국 몰 상품 목록 페이지
 * Mock 데이터 제거, API 연동 구조
 */

import { useEffect, useState, useCallback } from 'react';
import { NavLink, useParams, useSearchParams } from 'react-router-dom';
import { Search, Package, Star, Loader2, AlertCircle } from 'lucide-react';
import { storeApi } from '@/api/store';
import type { StoreProduct, StoreCategory } from '@/types/store';

const SORT_OPTIONS = [
  { value: 'popular', label: '인기순' },
  { value: 'newest', label: '최신순' },
  { value: 'price_low', label: '가격 낮은순' },
  { value: 'price_high', label: '가격 높은순' },
  { value: 'rating', label: '평점순' },
] as const;

type SortOption = typeof SORT_OPTIONS[number]['value'];

export default function StoreProducts() {
  const { pharmacyId: storeSlug } = useParams<{ pharmacyId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const categoryId = searchParams.get('category') || '';
  const sortBy = (searchParams.get('sort') as SortOption) || 'popular';
  const page = parseInt(searchParams.get('page') || '1', 10);

  // 검색어 디바운스
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 카테고리 로드
  useEffect(() => {
    if (!storeSlug) return;

    const loadCategories = async () => {
      try {
        const res = await storeApi.getStoreCategories(storeSlug);
        if (res.success && res.data) {
          setCategories(res.data);
        }
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };

    loadCategories();
  }, [storeSlug]);

  // 상품 로드
  const loadProducts = useCallback(async () => {
    if (!storeSlug) return;

    setLoading(true);
    setError(null);

    try {
      const res = await storeApi.getStoreProducts(storeSlug, {
        categoryId: categoryId || undefined,
        search: debouncedSearch || undefined,
        sort: sortBy,
        page,
        pageSize: 12,
      });

      if (res.success && res.data) {
        setProducts(res.data.items);
        setTotalCount(res.data.total);
      } else {
        throw new Error('상품을 불러올 수 없습니다.');
      }
    } catch (err: any) {
      console.error('Products load error:', err);
      setError(err.message || '상품을 불러오는데 실패했습니다.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [storeSlug, categoryId, debouncedSearch, sortBy, page]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleCategoryChange = (newCategoryId: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (newCategoryId) {
      newParams.set('category', newCategoryId);
    } else {
      newParams.delete('category');
    }
    newParams.delete('page'); // 카테고리 변경 시 페이지 초기화
    setSearchParams(newParams);
  };

  const handleSortChange = (newSort: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('sort', newSort);
    newParams.delete('page');
    setSearchParams(newParams);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">전체 상품</h1>
        <p className="text-slate-500 text-sm">
          {loading ? '불러오는 중...' : `${totalCount}개의 상품`}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="상품 검색..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Category & Sort */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
            <button
              onClick={() => handleCategoryChange('')}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                !categoryId
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              전체
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryChange(category.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  categoryId === category.id
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="text-center py-12 bg-white rounded-2xl">
          <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">오류가 발생했습니다</h3>
          <p className="text-slate-500 mb-4">{error}</p>
          <button
            onClick={loadProducts}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Products Grid */}
      {!loading && !error && products.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <NavLink
              key={product.id}
              to={`/store/${storeSlug}/products/${product.id}`}
              className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all group"
            >
              <div className="relative aspect-square bg-slate-100 flex items-center justify-center">
                {product.thumbnailUrl ? (
                  <img src={product.thumbnailUrl} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-12 h-12 text-slate-300" />
                )}
                {product.salePrice && (
                  <span className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-lg">
                    {Math.round((1 - product.salePrice / product.price) * 100)}% OFF
                  </span>
                )}
                {!product.isActive && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-bold">품절</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <span className="text-xs text-slate-400">{product.categoryName}</span>
                <h3 className="font-medium text-slate-800 text-sm line-clamp-2 mt-1 group-hover:text-primary-600 transition-colors">
                  {product.name}
                </h3>
                <div className="flex items-center gap-1 mt-2">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm text-slate-600">{product.rating.toFixed(1)}</span>
                  <span className="text-xs text-slate-400">({product.reviewCount})</span>
                </div>
                <div className="mt-2">
                  {product.salePrice ? (
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-red-600">
                        {product.salePrice.toLocaleString()}원
                      </span>
                      <span className="text-sm text-slate-400 line-through">
                        {product.price.toLocaleString()}원
                      </span>
                    </div>
                  ) : (
                    <span className="text-lg font-bold text-primary-600">
                      {product.price.toLocaleString()}원
                    </span>
                  )}
                </div>
                {product.isDropshipping && (
                  <p className="text-xs text-slate-400 mt-1">공급자 직배송</p>
                )}
              </div>
            </NavLink>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && products.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl">
          <Package className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">상품이 없습니다</h3>
          <p className="text-slate-500">
            {debouncedSearch
              ? '검색 조건에 맞는 상품이 없습니다.'
              : '등록된 상품이 없습니다.'}
          </p>
        </div>
      )}
    </div>
  );
}

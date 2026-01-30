/**
 * Featured Products Tab
 *
 * WO-FEATURED-CURATION-API-V1:
 * 운영자 Featured 상품 관리 (API 연동)
 *
 * - 전체 상품 검색
 * - Featured 지정 / 해제
 * - 현재 Featured 목록 확인
 * - 순서 조정
 *
 * 운영자 지정 상품은 Market Trial 및 자동 추천보다 우선 노출됨
 */

import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  ChevronUp,
  ChevronDown,
  X,
  Package,
  Star,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { glycopharmApi } from '@/api/glycopharm';

const SERVICE = 'glycopharm';
const CONTEXT = 'store-home';

interface FeaturedProduct {
  id: string;
  service: string;
  context: string;
  product_id: string;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    category: string;
    price: number;
    sale_price?: number;
    stock_quantity: number;
    images?: any[];
    status: string;
  };
}

export function FeaturedProductsTab() {
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load featured products
  useEffect(() => {
    loadFeaturedProducts();
    loadAllProducts();
  }, []);

  const loadFeaturedProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await glycopharmApi.getFeaturedProducts({
        service: SERVICE,
        context: CONTEXT,
      });

      if (response.success) {
        setFeaturedProducts(response.data || []);
      }
    } catch (err: any) {
      console.error('Failed to load featured products:', err);
      setError(err.message || 'Featured 상품을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const loadAllProducts = async () => {
    try {
      const response = await glycopharmApi.getOperatorProducts({
        page: 1,
        limit: 100,
      });

      if (response.success) {
        setAllProducts(response.data.products || []);
      }
    } catch (err: any) {
      console.error('Failed to load products:', err);
    }
  };

  // 검색 결과
  const featuredProductIds = new Set(featuredProducts.map((fp) => fp.product_id));
  const searchResults = searchQuery.trim()
    ? allProducts.filter(
        (p) =>
          !featuredProductIds.has(p.id) &&
          (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : allProducts.filter((p) => !featuredProductIds.has(p.id));

  // Featured 지정
  const addToFeatured = async (productId: string) => {
    try {
      await glycopharmApi.addFeaturedProduct({
        service: SERVICE,
        context: CONTEXT,
        productId,
      });

      setSearchQuery('');
      setIsSearchModalOpen(false);
      await loadFeaturedProducts();
    } catch (err: any) {
      console.error('Failed to add featured product:', err);
      alert(err.message || 'Featured 추가에 실패했습니다');
    }
  };

  // Featured 해제
  const removeFromFeatured = async (featuredId: string) => {
    try {
      await glycopharmApi.removeFeaturedProduct(featuredId);
      await loadFeaturedProducts();
    } catch (err: any) {
      console.error('Failed to remove featured product:', err);
      alert(err.message || 'Featured 제거에 실패했습니다');
    }
  };

  // 순서 변경
  const moveUp = async (index: number) => {
    if (index === 0) return;

    const newOrder = [...featuredProducts];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];

    const ids = newOrder.map((fp) => fp.id);
    try {
      await glycopharmApi.reorderFeaturedProducts(ids);
      await loadFeaturedProducts();
    } catch (err: any) {
      console.error('Failed to reorder:', err);
      alert('순서 변경에 실패했습니다');
    }
  };

  const moveDown = async (index: number) => {
    if (index === featuredProducts.length - 1) return;

    const newOrder = [...featuredProducts];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];

    const ids = newOrder.map((fp) => fp.id);
    try {
      await glycopharmApi.reorderFeaturedProducts(ids);
      await loadFeaturedProducts();
    } catch (err: any) {
      console.error('Failed to reorder:', err);
      alert('순서 변경에 실패했습니다');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          <p className="text-slate-500 text-sm">불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <AlertCircle className="w-8 h-8 text-red-300" />
          <p className="text-slate-500 text-sm">{error}</p>
          <button
            onClick={loadFeaturedProducts}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 상단 액션 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          운영자 지정 Featured 상품 <strong>{featuredProducts.length}</strong>개
        </p>
        <button
          onClick={() => setIsSearchModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          상품 추가
        </button>
      </div>

      {/* Featured 상품 목록 */}
      <div className="space-y-3">
        {featuredProducts.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">운영자 지정 Featured 상품이 없습니다.</p>
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="mt-4 text-primary-600 hover:underline text-sm"
            >
              상품 추가하기
            </button>
          </div>
        ) : (
          featuredProducts.map((featured, index) => {
            const product = featured.product;
            if (!product) return null;

            return (
              <div
                key={featured.id}
                className="flex items-center gap-4 p-4 bg-white rounded-lg border border-slate-200"
              >
                {/* 순서 */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="p-1 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveDown(index)}
                    disabled={index === featuredProducts.length - 1}
                    className="p-1 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                {/* 썸네일 */}
                <div className="w-16 h-16 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={product.images[0].url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-6 h-6 text-slate-300" />
                    </div>
                  )}
                </div>

                {/* 상품 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full">
                      #{index + 1}
                    </span>
                    <span className="text-xs text-slate-400">{product.category}</span>
                  </div>
                  <h3 className="font-medium text-slate-800 truncate mt-1">{product.name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm font-semibold text-primary-600">
                      {(product.sale_price || product.price).toLocaleString()}원
                    </span>
                    {product.sale_price && (
                      <span className="text-xs text-slate-400 line-through">
                        {product.price.toLocaleString()}원
                      </span>
                    )}
                  </div>
                </div>

                {/* 액션 */}
                <button
                  onClick={() => removeFromFeatured(featured.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Featured 해제"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* 상품 검색/추가 모달 */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-semibold text-slate-800">Featured 상품 추가</h2>
              <button
                onClick={() => {
                  setIsSearchModalOpen(false);
                  setSearchQuery('');
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 검색 */}
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="상품명, 카테고리, SKU 검색..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  autoFocus
                />
              </div>
            </div>

            {/* 검색 결과 */}
            <div className="flex-1 overflow-y-auto p-4">
              {searchResults.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500">검색 결과가 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      {/* 썸네일 */}
                      <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={product.images[0].url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-5 h-5 text-slate-300" />
                          </div>
                        )}
                      </div>

                      {/* 상품 정보 */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-400">{product.category}</p>
                        <h4 className="font-medium text-slate-800 truncate">{product.name}</h4>
                        <p className="text-sm text-primary-600">
                          {(product.sale_price || product.price).toLocaleString()}원
                        </p>
                      </div>

                      {/* 추가 버튼 */}
                      <button
                        onClick={() => addToFeatured(product.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        추가
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

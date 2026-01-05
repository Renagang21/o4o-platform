/**
 * PharmacyProducts - 약국 상품 관리
 * Mock 데이터 제거, API 연동 구조
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Package,
  Edit2,
  Trash2,
  Eye,
  MoreVertical,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { pharmacyApi, type PharmacyProduct } from '@/api/pharmacy';

export default function PharmacyProducts() {
  const [products, setProducts] = useState<PharmacyProduct[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // 검색어 디바운스
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 카테고리 로드
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await pharmacyApi.getCategories();
        if (res.success && res.data) {
          setCategories(res.data);
        }
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    loadCategories();
  }, []);

  // 상품 로드
  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await pharmacyApi.getProducts({
        categoryId: selectedCategory || undefined,
        search: debouncedSearch || undefined,
        pageSize: 20,
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
  }, [selectedCategory, debouncedSearch]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('정말 이 상품을 삭제하시겠습니까?')) return;

    try {
      await pharmacyApi.deleteProduct(productId);
      loadProducts();
    } catch (err: any) {
      alert(err.message || '상품 삭제에 실패했습니다.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">상품 관리</h1>
          <p className="text-slate-500 text-sm">
            {loading ? '불러오는 중...' : `총 ${totalCount}개의 상품`}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/25"
        >
          <Plus className="w-5 h-5" />
          상품 등록
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="상품명으로 검색..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                !selectedCategory
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              전체
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Product Image */}
              <div className="aspect-video bg-slate-100 flex items-center justify-center">
                {product.thumbnailUrl ? (
                  <img
                    src={product.thumbnailUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package className="w-12 h-12 text-slate-300" />
                )}
              </div>

              {/* Product Info */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs text-slate-400">{product.categoryName}</span>
                    <h3 className="font-semibold text-slate-800 mt-1">{product.name}</h3>
                    {product.isDropshipping && (
                      <p className="text-xs text-primary-600 mt-1">공급자 직배송</p>
                    )}
                  </div>
                  <button className="p-1 hover:bg-slate-100 rounded-lg">
                    <MoreVertical className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div>
                    {product.salePrice ? (
                      <div>
                        <p className="text-lg font-bold text-red-600">
                          {product.salePrice.toLocaleString()}원
                        </p>
                        <p className="text-sm text-slate-400 line-through">
                          {product.price.toLocaleString()}원
                        </p>
                      </div>
                    ) : (
                      <p className="text-lg font-bold text-primary-600">
                        {product.price.toLocaleString()}원
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {product.status === 'out_of_stock' ? (
                      <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-lg">
                        품절
                      </span>
                    ) : product.status === 'inactive' ? (
                      <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg">
                        비활성
                      </span>
                    ) : (
                      <span className="text-sm text-slate-500">재고 {product.stock}개</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                  <button className="flex-1 flex items-center justify-center gap-1 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
                    <Eye className="w-4 h-4" />
                    보기
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-1 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors">
                    <Edit2 className="w-4 h-4" />
                    수정
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(product.id)}
                    className="p-2 text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && products.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl">
          <Package className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">상품이 없습니다</h3>
          <p className="text-slate-500 mb-4">
            {debouncedSearch
              ? '검색 조건에 맞는 상품이 없습니다.'
              : '등록된 상품이 없습니다. 상품을 등록해주세요.'}
          </p>
          {debouncedSearch && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('');
              }}
              className="text-primary-600 font-medium hover:text-primary-700"
            >
              필터 초기화
            </button>
          )}
        </div>
      )}

      {/* Add Product Modal - Placeholder */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">상품 등록</h2>
            <p className="text-slate-500 mb-6">
              공급자 상품 목록에서 상품을 선택하여 등록할 수 있습니다.
            </p>
            <button
              onClick={() => setShowAddModal(false)}
              className="w-full py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Featured Products Tab
 *
 * 운영자 Featured 상품 관리
 * - 전체 상품 검색
 * - Featured 지정 / 해제
 * - 현재 Featured 목록 확인
 * - 순서 조정
 *
 * 운영자 지정 상품은 Market Trial 및 자동 추천보다 우선 노출됨
 */

import { useState } from 'react';
import {
  Search,
  Plus,
  ChevronUp,
  ChevronDown,
  X,
  Package,
  Star,
  Check,
} from 'lucide-react';
import type { StoreProduct } from '@/types/store';

// Mock 상품 데이터 (실제로는 API에서 가져옴)
const MOCK_ALL_PRODUCTS: StoreProduct[] = [
  {
    id: 'prod-1',
    productId: 'prod-1',
    name: '덱스콤 G7 스타터 키트',
    description: '최신 연속혈당측정기',
    categoryId: 'cgm',
    categoryName: 'CGM',
    price: 350000,
    salePrice: 299000,
    supplierId: 'sup-1',
    supplierName: '덱스콤코리아',
    images: [],
    thumbnailUrl: '/images/product-cgm.jpg',
    rating: 4.8,
    reviewCount: 156,
    isDropshipping: true,
    isActive: true,
    isFeatured: true,
    isFeaturedByOperator: true,
    createdAt: '2024-01-01',
    serviceContext: 'glycopharm',
  },
  {
    id: 'prod-2',
    productId: 'prod-2',
    name: '아큐첵 가이드 혈당측정기',
    description: '정확한 혈당 측정',
    categoryId: 'meter',
    categoryName: '혈당측정기',
    price: 45000,
    supplierId: 'sup-2',
    supplierName: '로슈진단',
    images: [],
    thumbnailUrl: '/images/product-meter.jpg',
    rating: 4.6,
    reviewCount: 89,
    isDropshipping: true,
    isActive: true,
    isFeatured: true,
    isFeaturedByOperator: true,
    createdAt: '2024-01-02',
    serviceContext: 'glycopharm',
  },
  {
    id: 'prod-3',
    productId: 'prod-3',
    name: '란셋펜 + 란셋침 세트',
    description: '편리한 채혈 도구',
    categoryId: 'lancet',
    categoryName: '채혈침',
    price: 15000,
    supplierId: 'sup-3',
    supplierName: '메디서플라이',
    images: [],
    rating: 4.5,
    reviewCount: 45,
    isDropshipping: true,
    isActive: true,
    isFeatured: false,
    isFeaturedByOperator: false,
    createdAt: '2024-01-03',
    serviceContext: 'glycopharm',
  },
  {
    id: 'prod-4',
    productId: 'prod-4',
    name: '혈당 시험지 50매',
    description: '정확한 측정을 위한 시험지',
    categoryId: 'strip',
    categoryName: '시험지',
    price: 25000,
    supplierId: 'sup-2',
    supplierName: '로슈진단',
    images: [],
    rating: 4.7,
    reviewCount: 120,
    isDropshipping: true,
    isActive: true,
    isFeatured: false,
    isFeaturedByOperator: false,
    createdAt: '2024-01-04',
    serviceContext: 'glycopharm',
  },
  {
    id: 'prod-5',
    productId: 'prod-5',
    name: '당뇨 영양제 세트',
    description: '혈당 관리에 도움되는 영양제',
    categoryId: 'supplement',
    categoryName: '영양제',
    price: 89000,
    salePrice: 79000,
    supplierId: 'sup-4',
    supplierName: '헬스케어플러스',
    images: [],
    rating: 4.4,
    reviewCount: 67,
    isDropshipping: true,
    isActive: true,
    isFeatured: false,
    isFeaturedByOperator: false,
    createdAt: '2024-01-05',
    serviceContext: 'glycopharm',
  },
];

export function FeaturedProductsTab() {
  const [products, setProducts] = useState<StoreProduct[]>(MOCK_ALL_PRODUCTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Featured 상품만 필터링 (운영자 지정)
  const featuredProducts = products
    .filter((p) => p.isFeaturedByOperator)
    .sort((a, b) => {
      // 등록 순서대로 (실제로는 별도 순서 필드 사용)
      const aIndex = products.findIndex((p) => p.id === a.id);
      const bIndex = products.findIndex((p) => p.id === b.id);
      return aIndex - bIndex;
    });

  // 검색 결과
  const searchResults = searchQuery.trim()
    ? products.filter(
        (p) =>
          !p.isFeaturedByOperator &&
          (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.supplierName.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : products.filter((p) => !p.isFeaturedByOperator);

  // Featured 지정
  const addToFeatured = (productId: string) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, isFeaturedByOperator: true, isFeatured: true } : p
      )
    );
    setSearchQuery('');
    setIsSearchModalOpen(false);
  };

  // Featured 해제
  const removeFromFeatured = (productId: string) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, isFeaturedByOperator: false } : p
      )
    );
  };

  // 순서 변경
  const moveUp = (productId: string) => {
    const currentIndex = featuredProducts.findIndex((p) => p.id === productId);
    if (currentIndex === 0) return;

    const newProducts = [...products];
    const featuredIds = featuredProducts.map((p) => p.id);

    // 순서 교환
    const prevId = featuredIds[currentIndex - 1];
    const prevIndex = newProducts.findIndex((p) => p.id === prevId);
    const currIndex = newProducts.findIndex((p) => p.id === productId);

    [newProducts[prevIndex], newProducts[currIndex]] = [
      newProducts[currIndex],
      newProducts[prevIndex],
    ];

    setProducts(newProducts);
  };

  const moveDown = (productId: string) => {
    const currentIndex = featuredProducts.findIndex((p) => p.id === productId);
    if (currentIndex === featuredProducts.length - 1) return;

    const newProducts = [...products];
    const featuredIds = featuredProducts.map((p) => p.id);

    // 순서 교환
    const nextId = featuredIds[currentIndex + 1];
    const nextIndex = newProducts.findIndex((p) => p.id === nextId);
    const currIndex = newProducts.findIndex((p) => p.id === productId);

    [newProducts[currIndex], newProducts[nextIndex]] = [
      newProducts[nextIndex],
      newProducts[currIndex],
    ];

    setProducts(newProducts);
  };

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
          featuredProducts.map((product, index) => (
            <div
              key={product.id}
              className="flex items-center gap-4 p-4 bg-white rounded-lg border border-slate-200"
            >
              {/* 순서 */}
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => moveUp(product.id)}
                  disabled={index === 0}
                  className="p-1 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => moveDown(product.id)}
                  disabled={index === featuredProducts.length - 1}
                  className="p-1 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {/* 썸네일 */}
              <div className="w-16 h-16 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                {product.thumbnailUrl ? (
                  <img
                    src={product.thumbnailUrl}
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
                  <span className="text-xs text-slate-400">{product.categoryName}</span>
                </div>
                <h3 className="font-medium text-slate-800 truncate mt-1">{product.name}</h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm font-semibold text-primary-600">
                    {(product.salePrice || product.price).toLocaleString()}원
                  </span>
                  {product.salePrice && (
                    <span className="text-xs text-slate-400 line-through">
                      {product.price.toLocaleString()}원
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    {product.rating.toFixed(1)}
                  </span>
                </div>
              </div>

              {/* 액션 */}
              <button
                onClick={() => removeFromFeatured(product.id)}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Featured 해제"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ))
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
                  placeholder="상품명, 카테고리, 공급자 검색..."
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
                        {product.thumbnailUrl ? (
                          <img
                            src={product.thumbnailUrl}
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
                        <p className="text-xs text-slate-400">{product.categoryName}</p>
                        <h4 className="font-medium text-slate-800 truncate">{product.name}</h4>
                        <p className="text-sm text-primary-600">
                          {(product.salePrice || product.price).toLocaleString()}원
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

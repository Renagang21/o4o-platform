/**
 * Neture Product List Page
 *
 * Phase D-2: Neture Web Server (B2C) 구축
 * 상품 카탈로그 페이지
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { netureApi } from '@/api/neture.api';
import type { Product, ProductCategory } from '@/types';

const CATEGORIES: { value: ProductCategory | ''; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'healthcare', label: '건강관리' },
  { value: 'beauty', label: '뷰티' },
  { value: 'food', label: '푸드' },
  { value: 'lifestyle', label: '라이프스타일' },
  { value: 'other', label: '기타' },
];

const SORT_OPTIONS = [
  { value: 'created_at:desc', label: '최신순' },
  { value: 'price:asc', label: '가격 낮은순' },
  { value: 'price:desc', label: '가격 높은순' },
  { value: 'view_count:desc', label: '인기순' },
  { value: 'name:asc', label: '이름순' },
];

function ProductCard({ product }: { product: Product }) {
  const displayPrice = product.sale_price || product.base_price;
  const hasDiscount = product.sale_price && product.sale_price < product.base_price;
  const discountRate = hasDiscount
    ? Math.round((1 - product.sale_price! / product.base_price) * 100)
    : 0;

  const primaryImage = product.images?.find((img) => img.is_primary)?.url || product.images?.[0]?.url;

  return (
    <Link
      to={`/products/${product.id}`}
      className="group block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
    >
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No Image
          </div>
        )}
        {hasDiscount && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
            {discountRate}% OFF
          </span>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="text-white font-bold">품절</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
          {product.name}
        </h3>
        {product.subtitle && (
          <p className="text-sm text-gray-500 mt-1 line-clamp-1">{product.subtitle}</p>
        )}
        <div className="mt-2">
          {hasDiscount && (
            <span className="text-sm text-gray-400 line-through mr-2">
              {product.base_price.toLocaleString()}원
            </span>
          )}
          <span className="font-bold text-lg text-gray-900">
            {displayPrice.toLocaleString()}원
          </span>
        </div>
        {product.tags && product.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {product.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

export default function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');

  const category = searchParams.get('category') || '';
  const sort = searchParams.get('sort') || 'created_at:desc';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const q = searchParams.get('q') || '';

  const [sortField, sortOrder] = sort.split(':') as [string, 'asc' | 'desc'];

  const { data: productsResponse, isLoading } = useQuery({
    queryKey: ['neture', 'products', { category, sort, page, q }],
    queryFn: () =>
      q
        ? netureApi.products.search({ q, page, limit: 12 })
        : netureApi.products.list({
            category: category || undefined,
            sort: sortField as any,
            order: sortOrder,
            page,
            limit: 12,
            status: 'visible',
          }),
  });

  const handleCategoryChange = (newCategory: string) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (newCategory) {
        params.set('category', newCategory);
      } else {
        params.delete('category');
      }
      params.delete('page');
      return params;
    });
  };

  const handleSortChange = (newSort: string) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set('sort', newSort);
      params.delete('page');
      return params;
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (searchQuery.trim()) {
        params.set('q', searchQuery.trim());
      } else {
        params.delete('q');
      }
      params.delete('page');
      return params;
    });
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set('page', newPage.toString());
      return params;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-xl font-bold text-blue-600">
              Neture
            </Link>
            <form onSubmit={handleSearch} className="flex-1 max-w-md mx-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="상품 검색..."
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {q ? `"${q}" 검색 결과` : '상품 목록'}
        </h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => handleCategoryChange(value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  category === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => handleSortChange(e.target.value)}
            className="px-4 py-2 border rounded-lg bg-white text-sm"
          >
            {SORT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-4 animate-pulse">
                <div className="aspect-square bg-gray-200 rounded mb-4" />
                <div className="h-4 bg-gray-200 rounded mb-2" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : productsResponse?.data && productsResponse.data.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {productsResponse.data.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Pagination */}
            {productsResponse.meta.totalPages > 1 && (
              <div className="mt-8 flex justify-center gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  이전
                </button>
                <span className="px-4 py-2">
                  {page} / {productsResponse.meta.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === productsResponse.meta.totalPages}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  다음
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">
            {q ? '검색 결과가 없습니다.' : '등록된 상품이 없습니다.'}
          </div>
        )}
      </main>
    </div>
  );
}

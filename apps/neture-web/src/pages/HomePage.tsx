/**
 * Neture Home Page
 *
 * Phase G-2: B2C 핵심 기능 확장
 * 서비스 정체성 + 진입 페이지
 */

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { netureApi } from '@/api/neture.api';
import type { Product } from '@/types';

function FeaturedProductCard({ product }: { product: Product }) {
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
      </div>
    </Link>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const labels: Record<string, string> = {
    healthcare: '건강관리',
    beauty: '뷰티',
    food: '푸드',
    lifestyle: '라이프스타일',
    other: '기타',
  };

  return (
    <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
      {labels[category] || category}
    </span>
  );
}

export default function HomePage() {
  const { data: featuredProducts, isLoading } = useQuery({
    queryKey: ['neture', 'products', 'featured'],
    queryFn: () =>
      netureApi.products.list({
        is_featured: true,
        status: 'visible',
        limit: 6,
      }),
  });

  return (
    <div className="bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Neture
            </h1>
            <p className="text-xl sm:text-2xl text-blue-100 mb-8">
              O4O Platform의 대표 B2C 서비스
            </p>
            <p className="text-lg text-blue-200 max-w-2xl mx-auto mb-8">
              건강, 뷰티, 푸드, 라이프스타일 분야의 엄선된 상품을 만나보세요.
              신뢰할 수 있는 파트너들과 함께 최고의 품질을 제공합니다.
            </p>
            <Link
              to="/products"
              className="inline-block bg-white text-blue-600 font-semibold px-8 py-3 rounded-lg hover:bg-blue-50 transition-colors"
            >
              상품 둘러보기
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">추천 상품</h2>
            <Link
              to="/products"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              모두 보기 →
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm p-4 animate-pulse">
                  <div className="aspect-square bg-gray-200 rounded mb-4" />
                  <div className="h-4 bg-gray-200 rounded mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : featuredProducts?.data && featuredProducts.data.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProducts.data.map((product) => (
                <FeaturedProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              추천 상품이 없습니다.
            </div>
          )}
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            카테고리
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            {['healthcare', 'beauty', 'food', 'lifestyle'].map((category) => (
              <Link
                key={category}
                to={`/products?category=${category}`}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full font-medium transition-colors"
              >
                <CategoryBadge category={category} />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

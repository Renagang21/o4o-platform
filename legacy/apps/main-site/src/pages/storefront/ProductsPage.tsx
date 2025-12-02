/**
 * Products Page
 * Phase 5-1: Storefront Products List
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { ShoppingCart } from 'lucide-react';
import type { StorefrontProduct } from '../../types/storefront';
import { storefrontAPI } from '../../services/storefrontApi';
import { useCartStore } from '../../stores/cartStore';

export const ProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const { sellerId } = useParams<{ sellerId?: string }>();
  const cartStore = useCartStore();

  const [products, setProducts] = useState<StorefrontProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 12;

  // 필터
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // 상품 목록 조회
  const fetchProducts = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await storefrontAPI.fetchProducts({
        page: currentPage,
        limit,
        seller_id: sellerId,
        search: searchQuery || undefined,
        category: categoryFilter || undefined,
      });

      if (response.success) {
        setProducts(response.data.products);
        setTotal(response.data.pagination.total);
        setTotalPages(response.data.pagination.total_pages);
      }
    } catch (err: any) {
      console.error('상품 목록 조회 실패:', err);
      setError(err.message || '상품 목록을 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [currentPage, sellerId, searchQuery, categoryFilter]);

  // 금액 포맷
  const formatCurrency = (amount: number, currency: string = 'KRW') => {
    if (currency === 'KRW') {
      return `₩ ${amount.toLocaleString()}`;
    }
    return `${amount.toLocaleString()} ${currency}`;
  };

  // 할인율 계산
  const calculateDiscountRate = (price: number, originalPrice?: number): number => {
    if (!originalPrice || originalPrice <= price) return 0;
    return Math.round(((originalPrice - price) / originalPrice) * 100);
  };

  // 장바구니 담기
  const handleAddToCart = (product: StorefrontProduct, e: React.MouseEvent) => {
    e.stopPropagation();

    cartStore.addItem({
      product_id: product.id,
      product_name: product.name,
      seller_id: product.seller_id,
      seller_name: product.seller_name,
      price: product.price,
      currency: product.currency,
      main_image: product.main_image,
      available_stock: product.stock_quantity,
    });

    alert(`${product.name}이(가) 장바구니에 담겼습니다.`);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 헤더 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {sellerId ? '판매자 상품' : '전체 상품'}
            </h1>
            <p className="text-gray-600">
              신선하고 건강한 상품을 만나보세요
            </p>
          </div>

          {/* 장바구니 버튼 */}
          <div className="mb-6 flex justify-end">
            <button
              onClick={() => navigate('/checkout')}
              className="relative flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              장바구니
              {cartStore.total_items > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  {cartStore.total_items}
                </span>
              )}
            </button>
          </div>

          {/* 필터 영역 */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex flex-wrap gap-4">
              {/* 검색 */}
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="상품 검색..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* 카테고리 필터 */}
              <div>
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">전체 카테고리</option>
                  <option value="쌀/곡물">쌀/곡물</option>
                  <option value="채소/과일">채소/과일</option>
                  <option value="간식/스낵">간식/스낵</option>
                  <option value="축산/계란">축산/계란</option>
                </select>
              </div>
            </div>
          </div>

          {/* 상품 목록 */}
          {loading ? (
            <div className="p-8 text-center text-gray-500">로딩 중...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">{error}</div>
          ) : products.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              상품이 없습니다.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => {
                  const discountRate = calculateDiscountRate(
                    product.price,
                    product.original_price
                  );

                  return (
                    <div
                      key={product.id}
                      onClick={() => navigate(`/product/${product.id}`)}
                      className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                    >
                      {/* 상품 이미지 */}
                      <div className="relative aspect-square bg-gray-100">
                        {product.main_image ? (
                          <img
                            src={product.main_image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            No Image
                          </div>
                        )}
                        {discountRate > 0 && (
                          <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-sm font-bold">
                            {discountRate}%
                          </div>
                        )}
                      </div>

                      {/* 상품 정보 */}
                      <div className="p-4">
                        <div className="text-sm text-gray-500 mb-1">
                          {product.seller_name}
                        </div>
                        <h3 className="text-base font-semibold text-gray-900 mb-2 line-clamp-2">
                          {product.name}
                        </h3>

                        {/* 가격 */}
                        <div className="mb-3">
                          {product.original_price && product.original_price > product.price && (
                            <div className="text-sm text-gray-400 line-through">
                              {formatCurrency(product.original_price, product.currency)}
                            </div>
                          )}
                          <div className="text-xl font-bold text-gray-900">
                            {formatCurrency(product.price, product.currency)}
                          </div>
                        </div>

                        {/* 배송 정보 */}
                        {product.shipping_fee !== undefined && (
                          <div className="text-sm text-gray-600 mb-3">
                            배송비: {product.shipping_fee === 0 ? '무료' : formatCurrency(product.shipping_fee)}
                          </div>
                        )}

                        {/* 장바구니 담기 버튼 */}
                        <button
                          onClick={(e) => handleAddToCart(product, e)}
                          className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          장바구니 담기
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    이전
                  </button>
                  <span className="px-4 py-2 text-gray-700">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    다음
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ProductsPage;

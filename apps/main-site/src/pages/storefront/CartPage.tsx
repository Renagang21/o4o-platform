/**
 * Cart Page
 * Phase 2-B: Shopping Cart Display
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { useCartStore } from '../../stores/cartStore';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const cartStore = useCartStore();

  // 금액 포맷
  const formatCurrency = (amount: number, currency: string = 'KRW') => {
    if (currency === 'KRW') {
      return `₩ ${amount.toLocaleString()}`;
    }
    return `${amount.toLocaleString()} ${currency}`;
  };

  // Empty cart view
  if (cartStore.items.length === 0) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-16">
              <ShoppingCart className="w-24 h-24 mx-auto text-gray-300 mb-6" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                장바구니가 비어있습니다
              </h2>
              <p className="text-gray-500 mb-8">
                상품을 장바구니에 담아보세요!
              </p>
              <button
                onClick={() => navigate('/cpt/ds_product')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                상품 둘러보기
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
            <ShoppingCart className="w-8 h-8" />
            장바구니
            <span className="text-lg font-normal text-gray-500">
              ({cartStore.total_items}개)
            </span>
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 좌측: 장바구니 아이템 */}
            <div className="lg:col-span-2 space-y-4">
              {cartStore.items.map((item) => (
                <div
                  key={item.product_id}
                  className="bg-white rounded-lg shadow p-4"
                >
                  <div className="flex gap-4">
                    {/* 상품 이미지 */}
                    <div className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded">
                      {item.main_image ? (
                        <img
                          src={item.main_image}
                          alt={item.product_name}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                          No Image
                        </div>
                      )}
                    </div>

                    {/* 상품 정보 */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
                        {item.product_name}
                      </h3>
                      <p className="text-sm text-gray-500 mb-2">
                        판매자: {item.seller_name}
                      </p>
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(item.price, item.currency)}
                      </p>
                    </div>

                    {/* 수량 조절 */}
                    <div className="flex flex-col items-end gap-3">
                      <button
                        onClick={() => cartStore.removeItem(item.product_id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>

                      <div className="flex items-center border border-gray-300 rounded-lg">
                        <button
                          onClick={() =>
                            cartStore.updateQuantity(
                              item.product_id,
                              item.quantity - 1
                            )
                          }
                          disabled={item.quantity <= 1}
                          className="px-3 py-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="px-4 text-lg font-medium min-w-[3rem] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            cartStore.updateQuantity(
                              item.product_id,
                              item.quantity + 1
                            )
                          }
                          disabled={item.quantity >= item.available_stock}
                          className="px-3 py-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="text-sm text-gray-500">
                        재고: {item.available_stock}개
                      </p>
                    </div>
                  </div>

                  {/* 소계 */}
                  <div className="mt-3 pt-3 border-t border-gray-200 text-right">
                    <span className="text-sm text-gray-600">소계: </span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(item.price * item.quantity, item.currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* 우측: 주문 요약 */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-6 sticky top-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  주문 요약
                </h2>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-gray-600">
                    <span>상품 금액</span>
                    <span>{formatCurrency(cartStore.total_amount)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>배송비</span>
                    <span>₩ 3,000</span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 mb-6">
                  <div className="flex justify-between text-lg font-bold text-gray-900">
                    <span>총 결제 금액</span>
                    <span>{formatCurrency(cartStore.total_amount + 3000)}</span>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/store/checkout')}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  주문하기
                </button>

                <button
                  onClick={() => navigate('/cpt/ds_product')}
                  className="w-full mt-2 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  계속 쇼핑하기
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CartPage;

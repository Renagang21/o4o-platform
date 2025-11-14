/**
 * Checkout Page
 * Phase 5-1: Storefront Checkout & Order Creation
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { ArrowLeft, X, Trash2 } from 'lucide-react';
import type { CustomerInfo } from '../../types/storefront';
import { storefrontAPI } from '../../services/storefrontApi';
import { useCartStore } from '../../stores/cartStore';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const cartStore = useCartStore();

  // 고객 정보
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    email: '',
    phone: '',
    shipping_address: {
      postcode: '',
      address: '',
      address_detail: '',
    },
    order_note: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 금액 포맷
  const formatCurrency = (amount: number, currency: string = 'KRW') => {
    if (currency === 'KRW') {
      return `₩ ${amount.toLocaleString()}`;
    }
    return `${amount.toLocaleString()} ${currency}`;
  };

  // 배송비 계산 (임시: 최대 배송비 적용)
  const calculateShippingFee = (): number => {
    // 실제로는 seller별로 다를 수 있지만, 임시로 3000원 고정
    return cartStore.items.length > 0 ? 3000 : 0;
  };

  const shippingFee = calculateShippingFee();
  const totalAmount = cartStore.total_amount + shippingFee;

  // 주문 생성
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 유효성 검사
    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      setError('고객 정보를 모두 입력해주세요.');
      return;
    }

    if (
      !customerInfo.shipping_address.postcode ||
      !customerInfo.shipping_address.address
    ) {
      setError('배송 주소를 입력해주세요.');
      return;
    }

    if (cartStore.items.length === 0) {
      setError('장바구니가 비어있습니다.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await storefrontAPI.createOrder({
        customer: customerInfo,
        items: cartStore.items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
        })),
        payment_method: 'CARD',
      });

      if (response.success) {
        // 장바구니 비우기
        cartStore.clearCart();

        // 주문 완료 페이지로 이동
        navigate(`/order/success/${response.data.id}`);
      }
    } catch (err: any) {
      console.error('주문 생성 실패:', err);
      setError(err.message || '주문 생성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (cartStore.items.length === 0) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-600 mb-4">장바구니가 비어있습니다.</div>
            <button
              onClick={() => navigate('/store/products')}
              className="text-blue-600 hover:underline"
            >
              상품 목록으로 이동
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 뒤로가기 */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            돌아가기
          </button>

          <h1 className="text-3xl font-bold text-gray-900 mb-8">주문하기</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 좌측: 고객 정보 입력 */}
              <div className="lg:col-span-2 space-y-6">
                {/* 고객 정보 */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    주문자 정보
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        이름 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={customerInfo.name}
                        onChange={(e) =>
                          setCustomerInfo({ ...customerInfo, name: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        이메일 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={customerInfo.email}
                        onChange={(e) =>
                          setCustomerInfo({ ...customerInfo, email: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        전화번호 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={customerInfo.phone}
                        onChange={(e) =>
                          setCustomerInfo({ ...customerInfo, phone: e.target.value })
                        }
                        placeholder="010-0000-0000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* 배송 주소 */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    배송 주소
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        우편번호 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={customerInfo.shipping_address.postcode}
                        onChange={(e) =>
                          setCustomerInfo({
                            ...customerInfo,
                            shipping_address: {
                              ...customerInfo.shipping_address,
                              postcode: e.target.value,
                            },
                          })
                        }
                        placeholder="12345"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        주소 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={customerInfo.shipping_address.address}
                        onChange={(e) =>
                          setCustomerInfo({
                            ...customerInfo,
                            shipping_address: {
                              ...customerInfo.shipping_address,
                              address: e.target.value,
                            },
                          })
                        }
                        placeholder="서울시 강남구 테헤란로"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        상세 주소
                      </label>
                      <input
                        type="text"
                        value={customerInfo.shipping_address.address_detail || ''}
                        onChange={(e) =>
                          setCustomerInfo({
                            ...customerInfo,
                            shipping_address: {
                              ...customerInfo.shipping_address,
                              address_detail: e.target.value,
                            },
                          })
                        }
                        placeholder="101동 202호"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* 배송 요청사항 */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    배송 요청사항
                  </h2>
                  <textarea
                    value={customerInfo.order_note || ''}
                    onChange={(e) =>
                      setCustomerInfo({ ...customerInfo, order_note: e.target.value })
                    }
                    rows={3}
                    placeholder="배송 시 요청사항을 입력해주세요."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>

              {/* 우측: 주문 요약 */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow p-6 sticky top-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    주문 요약
                  </h2>

                  {/* 장바구니 아이템 */}
                  <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                    {cartStore.items.map((item) => (
                      <div key={item.product_id} className="flex gap-3">
                        <div className="w-16 h-16 bg-gray-100 rounded flex-shrink-0">
                          {item.main_image ? (
                            <img
                              src={item.main_image}
                              alt={item.product_name}
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                              No Img
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {item.product_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {item.quantity}개 × {formatCurrency(item.price, item.currency)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => cartStore.removeItem(item.product_id)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* 금액 요약 */}
                  <div className="border-t border-gray-200 pt-4 space-y-2">
                    <div className="flex justify-between text-gray-600">
                      <span>상품 금액</span>
                      <span>{formatCurrency(cartStore.total_amount)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>배송비</span>
                      <span>{formatCurrency(shippingFee)}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 flex justify-between text-lg font-bold text-gray-900">
                      <span>총 결제 금액</span>
                      <span>{formatCurrency(totalAmount)}</span>
                    </div>
                  </div>

                  {/* 에러 메시지 */}
                  {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  {/* 주문하기 버튼 */}
                  <button
                    type="submit"
                    disabled={submitting || cartStore.items.length === 0}
                    className="w-full mt-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? '주문 처리 중...' : `${formatCurrency(totalAmount)} 결제하기`}
                  </button>

                  <div className="mt-3 text-xs text-gray-500 text-center">
                    주문 완료 시 개인정보 수집 및 이용에 동의한 것으로 간주됩니다.
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default CheckoutPage;

/**
 * Checkout Shortcode
 * HP-3: Checkout & Order Creation via Shortcode
 *
 * Usage: [checkout]
 *
 * Displays checkout form with:
 * - Customer information input (name, email, phone)
 * - Shipping address input
 * - Order notes/requests
 * - Order summary with item list
 * - Total amount calculation
 * - Toss Payments integration
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import type { CustomerInfo } from '@/types/storefront';
import { storefrontAPI } from '@/services/storefrontApi';
import { useCartStore } from '@/stores/cartStore';
import { loadTossPaymentsSDK, requestTossPayment, generateOrderName } from '@/utils/tossPayments';
import { ShortcodeDefinition } from '@o4o/shortcodes';

interface CheckoutShortcodeProps {
  attributes?: Record<string, any>;
  content?: string;
  context?: any;
}

const CheckoutShortcode: React.FC<CheckoutShortcodeProps> = () => {
  const navigate = useNavigate();
  const cartStore = useCartStore();

  // Customer information
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
  const [tossSDKLoaded, setTossSDKLoaded] = useState(false);

  // Load Toss Payments SDK on mount
  useEffect(() => {
    loadTossPaymentsSDK()
      .then(() => setTossSDKLoaded(true))
      .catch((err) => {
        console.error('Failed to load Toss SDK:', err);
        setError('결제 시스템을 불러오는데 실패했습니다.');
      });
  }, []);

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'KRW') => {
    if (currency === 'KRW') {
      return `₩ ${amount.toLocaleString()}`;
    }
    return `${amount.toLocaleString()} ${currency}`;
  };

  // Calculate shipping fee
  const calculateShippingFee = (): number => {
    return cartStore.items.length > 0 ? 3000 : 0;
  };

  const shippingFee = calculateShippingFee();
  const totalAmount = cartStore.total_amount + shippingFee;

  // Handle order submission and Toss Payments redirect
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
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

    if (!tossSDKLoaded) {
      setError('결제 시스템이 준비되지 않았습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Create order (status: PENDING, paymentStatus: PENDING)
      const response = await storefrontAPI.createOrder({
        customer: customerInfo,
        items: cartStore.items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          seller_id: item.seller_id,
        })),
        payment_method: 'CARD',
      });

      if (response.success) {
        const order = response.data;

        // 2. Launch Toss Payments widget
        const orderName = generateOrderName(cartStore.items);
        const baseUrl = window.location.origin;

        await requestTossPayment({
          orderId: order.orderNumber,
          orderName,
          amount: totalAmount,
          customerName: customerInfo.name,
          customerEmail: customerInfo.email,
          successUrl: `${baseUrl}/payment/success`,
          failUrl: `${baseUrl}/payment/fail`,
        });

        // requestTossPayment will redirect to Toss checkout page
        // User will be redirected back to successUrl or failUrl
      }
    } catch (err: any) {
      console.error('결제 시작 실패:', err);
      setError(err.message || '결제를 시작할 수 없습니다.');
      setSubmitting(false);
    }
  };

  if (cartStore.items.length === 0) {
    return (
      <div className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-16">
            <div className="text-gray-600 mb-4">장바구니가 비어있습니다.</div>
            <button
              onClick={() => navigate('/cpt/ds_product')}
              className="text-blue-600 hover:underline"
            >
              상품 목록으로 이동
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back button */}
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
            {/* Left: Customer information form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer info */}
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

              {/* Shipping address */}
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

              {/* Order notes */}
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

            {/* Right: Order summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-6 sticky top-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  주문 요약
                </h2>

                {/* Cart items */}
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

                {/* Amount summary */}
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

                {/* Error message */}
                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {error}
                  </div>
                )}

                {/* Submit button */}
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
  );
};

/**
 * Checkout Shortcode Definition
 */
export const checkoutShortcodes: ShortcodeDefinition[] = [
  {
    name: 'checkout',
    component: CheckoutShortcode,
    description: 'Checkout form with customer info, shipping address, and Toss Payments integration',
    attributes: [],
  },
];

export default CheckoutShortcode;

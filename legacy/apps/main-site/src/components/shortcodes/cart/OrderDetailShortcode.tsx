/**
 * Order Detail Shortcode
 * HP-3: Order Confirmation Display via Shortcode
 *
 * Usage: [order_detail order_id="ORD-123456"]
 *
 * Displays order confirmation with:
 * - Order information (number, date)
 * - Customer information
 * - Shipping address
 * - Order items with images
 * - Payment summary
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import type { Order } from '@/types/storefront';
import { storefrontAPI } from '@/services/storefrontApi';
import { ShortcodeDefinition } from '@o4o/shortcodes';

interface OrderDetailShortcodeProps {
  attributes?: {
    order_id?: string;
  };
  content?: string;
  context?: any;
}

const OrderDetailShortcode: React.FC<OrderDetailShortcodeProps> = ({ attributes }) => {
  const navigate = useNavigate();
  const orderId = attributes?.order_id;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch order data
  const fetchOrder = async () => {
    if (!orderId) {
      setError('주문 번호가 제공되지 않았습니다.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await storefrontAPI.fetchOrder(orderId);
      if (response.success) {
        setOrder(response.data);
      }
    } catch (err: any) {
      console.error('주문 조회 실패:', err);
      setError(err.message || '주문을 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'KRW') => {
    if (currency === 'KRW') {
      return `₩ ${amount.toLocaleString()}`;
    }
    return `${amount.toLocaleString()} ${currency}`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-500">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="text-red-600 mb-4">{error || '주문을 찾을 수 없습니다.'}</div>
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
    <div className="py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success message */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            주문이 완료되었습니다!
          </h1>
          <p className="text-gray-600">
            주문해주셔서 감사합니다. 주문 내역은 이메일로 전송되었습니다.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Order information */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">주문 정보</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">주문 번호</div>
                <div className="text-base font-mono text-gray-900">
                  {order.order_number}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">주문 일시</div>
                <div className="text-base text-gray-900">
                  {formatDate(order.created_at)}
                </div>
              </div>
            </div>
          </div>

          {/* Customer information */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">주문자 정보</h2>
            <div className="space-y-2">
              <div className="flex">
                <span className="text-sm text-gray-600 w-24">이름</span>
                <span className="text-sm text-gray-900">{order.customer.name}</span>
              </div>
              <div className="flex">
                <span className="text-sm text-gray-600 w-24">이메일</span>
                <span className="text-sm text-gray-900">{order.customer.email}</span>
              </div>
              <div className="flex">
                <span className="text-sm text-gray-600 w-24">전화번호</span>
                <span className="text-sm text-gray-900">{order.customer.phone}</span>
              </div>
            </div>
          </div>

          {/* Shipping information */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">배송 정보</h2>
            <div className="space-y-2">
              <div className="flex">
                <span className="text-sm text-gray-600 w-24">우편번호</span>
                <span className="text-sm text-gray-900">
                  {order.customer.shipping_address.postcode}
                </span>
              </div>
              <div className="flex">
                <span className="text-sm text-gray-600 w-24">주소</span>
                <span className="text-sm text-gray-900">
                  {order.customer.shipping_address.address}
                </span>
              </div>
              {order.customer.shipping_address.address_detail && (
                <div className="flex">
                  <span className="text-sm text-gray-600 w-24">상세 주소</span>
                  <span className="text-sm text-gray-900">
                    {order.customer.shipping_address.address_detail}
                  </span>
                </div>
              )}
              {order.customer.order_note && (
                <div className="flex">
                  <span className="text-sm text-gray-600 w-24">요청사항</span>
                  <span className="text-sm text-gray-900">
                    {order.customer.order_note}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Order items */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">주문 상품</h2>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.product_id} className="flex gap-4">
                  <div className="w-20 h-20 bg-gray-100 rounded flex-shrink-0">
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
                  <div className="flex-1">
                    <div className="text-sm text-gray-600 mb-1">
                      {item.seller_name}
                    </div>
                    <div className="text-base font-medium text-gray-900 mb-1">
                      {item.product_name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {item.quantity}개 × {formatCurrency(item.unit_price, order.currency)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-medium text-gray-900">
                      {formatCurrency(item.total_price, order.currency)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment information */}
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">결제 정보</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>상품 금액</span>
                <span>{formatCurrency(order.subtotal, order.currency)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>배송비</span>
                <span>{formatCurrency(order.shipping_fee, order.currency)}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between text-lg font-bold text-gray-900">
                <span>총 결제 금액</span>
                <span>{formatCurrency(order.total_amount, order.currency)}</span>
              </div>
              {order.payment_method && (
                <div className="pt-2 flex justify-between text-sm text-gray-600">
                  <span>결제 수단</span>
                  <span>
                    {order.payment_method === 'CARD' ? '신용카드' : order.payment_method}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-8 flex gap-4 justify-center">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            홈으로
          </button>
          <button
            onClick={() => navigate('/cpt/ds_product')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            쇼핑 계속하기
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Order Detail Shortcode Definition
 */
export const orderDetailShortcodes: ShortcodeDefinition[] = [
  {
    name: 'order_detail',
    component: OrderDetailShortcode,
    description: 'Order confirmation display with customer info, items, and payment summary',
    attributes: [
      {
        name: 'order_id',
        type: 'string',
        description: 'Order ID or order number to display',
        required: true,
      },
    ],
  },
];

export default OrderDetailShortcode;

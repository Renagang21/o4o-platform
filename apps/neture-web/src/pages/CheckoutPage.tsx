/**
 * Checkout Page
 *
 * Phase G-3: 주문/결제 플로우 구현
 * 배송 정보 입력 및 결제 진행
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr/api/v1';

interface ShippingForm {
  recipient_name: string;
  phone: string;
  postal_code: string;
  address: string;
  address_detail: string;
  delivery_note: string;
}

interface OrdererForm {
  name: string;
  phone: string;
  email: string;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart } = useCart();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 주문자 정보
  const [orderer, setOrderer] = useState<OrdererForm>({
    name: '',
    phone: '',
    email: '',
  });

  // 배송지 정보
  const [shipping, setShipping] = useState<ShippingForm>({
    recipient_name: '',
    phone: '',
    postal_code: '',
    address: '',
    address_detail: '',
    delivery_note: '',
  });

  // 주문자 정보와 동일
  const [sameAsOrderer, setSameAsOrderer] = useState(true);

  // 사용자 정보로 초기화
  useEffect(() => {
    if (user) {
      setOrderer({
        name: user.name || '',
        phone: '',
        email: user.email || '',
      });
    }
  }, [user]);

  // 주문자 정보와 동일 체크
  useEffect(() => {
    if (sameAsOrderer) {
      setShipping((prev) => ({
        ...prev,
        recipient_name: orderer.name,
        phone: orderer.phone,
      }));
    }
  }, [sameAsOrderer, orderer]);

  // 인증 확인
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { state: { from: '/checkout' } });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // 장바구니 비어있으면 리다이렉트
  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
    }
  }, [items, navigate]);

  // 배송비 계산 (5만원 이상 무료)
  const shippingFee = totalPrice >= 50000 ? 0 : 3000;
  const finalAmount = totalPrice + shippingFee;

  const handleOrdererChange = (field: keyof OrdererForm, value: string) => {
    setOrderer((prev) => ({ ...prev, [field]: value }));
  };

  const handleShippingChange = (field: keyof ShippingForm, value: string) => {
    setShipping((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!orderer.name || !orderer.phone) {
      setError('주문자 정보를 입력해주세요.');
      return false;
    }
    if (!shipping.recipient_name || !shipping.phone || !shipping.postal_code || !shipping.address) {
      setError('배송지 정보를 입력해주세요.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');

      // 주문 생성 API 호출
      const response = await axios.post<{ data: { id: string } }>(
        `${API_BASE_URL}/neture/orders`,
        {
          items: items.map((item) => ({
            product_id: item.product.id,
            quantity: item.quantity,
          })),
          shipping: {
            recipient_name: shipping.recipient_name,
            phone: shipping.phone,
            postal_code: shipping.postal_code,
            address: shipping.address,
            address_detail: shipping.address_detail || undefined,
            delivery_note: shipping.delivery_note || undefined,
          },
          orderer_name: orderer.name,
          orderer_phone: orderer.phone,
          orderer_email: orderer.email || undefined,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const order = response.data.data;

      // 장바구니 비우기
      clearCart();

      // 결제 페이지로 이동
      navigate(`/checkout/payment/${order.id}`, {
        state: { order },
      });
    } catch (err: any) {
      console.error('Order creation failed:', err);
      setError(err.response?.data?.error?.message || '주문 생성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link to="/cart" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
            &larr; 장바구니로 돌아가기
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">주문/결제</h1>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Orderer Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">주문자 정보</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    이름 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={orderer.name}
                    onChange={(e) => handleOrdererChange('name', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="홍길동"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    휴대폰 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={orderer.phone}
                    onChange={(e) => handleOrdererChange('phone', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="010-1234-5678"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    이메일
                  </label>
                  <input
                    type="email"
                    value={orderer.email}
                    onChange={(e) => handleOrdererChange('email', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="email@example.com"
                  />
                </div>
              </div>
            </div>

            {/* Shipping Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">배송지 정보</h2>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={sameAsOrderer}
                    onChange={(e) => setSameAsOrderer(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">주문자 정보와 동일</span>
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    받는 분 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={shipping.recipient_name}
                    onChange={(e) => handleShippingChange('recipient_name', e.target.value)}
                    disabled={sameAsOrderer}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    placeholder="홍길동"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    휴대폰 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={shipping.phone}
                    onChange={(e) => handleShippingChange('phone', e.target.value)}
                    disabled={sameAsOrderer}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    placeholder="010-1234-5678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    우편번호 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={shipping.postal_code}
                    onChange={(e) => handleShippingChange('postal_code', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="12345"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    주소 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={shipping.address}
                    onChange={(e) => handleShippingChange('address', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="서울시 강남구 테헤란로 123"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    상세주소
                  </label>
                  <input
                    type="text"
                    value={shipping.address_detail}
                    onChange={(e) => handleShippingChange('address_detail', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="아파트/빌라/오피스텔명, 동/호수"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    배송 요청사항
                  </label>
                  <select
                    value={shipping.delivery_note}
                    onChange={(e) => handleShippingChange('delivery_note', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">배송 요청사항을 선택해주세요</option>
                    <option value="문 앞에 놓아주세요">문 앞에 놓아주세요</option>
                    <option value="경비실에 맡겨주세요">경비실에 맡겨주세요</option>
                    <option value="부재 시 연락 부탁드립니다">부재 시 연락 부탁드립니다</option>
                    <option value="배송 전 연락 부탁드립니다">배송 전 연락 부탁드립니다</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                주문 상품 ({items.length}개)
              </h2>
              <div className="space-y-4">
                {items.map((item) => {
                  const displayPrice = item.product.sale_price || item.product.base_price;
                  const primaryImage = item.product.images?.find((img) => img.is_primary)?.url || item.product.images?.[0]?.url;

                  return (
                    <div key={item.product.id} className="flex items-center gap-4 py-3 border-b last:border-b-0">
                      <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                        {primaryImage ? (
                          <img
                            src={primaryImage}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                            No Image
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 line-clamp-1">{item.product.name}</p>
                        <p className="text-sm text-gray-500">
                          {displayPrice.toLocaleString()}원 x {item.quantity}개
                        </p>
                      </div>
                      <p className="font-bold text-gray-900">
                        {(displayPrice * item.quantity).toLocaleString()}원
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
              <h2 className="text-lg font-bold text-gray-900 mb-4">결제 금액</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>상품 금액</span>
                  <span>{totalPrice.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>배송비</span>
                  <span className={shippingFee === 0 ? 'text-green-600' : ''}>
                    {shippingFee === 0 ? '무료' : `${shippingFee.toLocaleString()}원`}
                  </span>
                </div>
                {totalPrice < 50000 && (
                  <p className="text-xs text-gray-500">
                    {(50000 - totalPrice).toLocaleString()}원 더 담으면 무료배송!
                  </p>
                )}
                <hr className="border-gray-200" />
                <div className="flex justify-between text-lg font-bold text-gray-900">
                  <span>총 결제 금액</span>
                  <span className="text-blue-600">{finalAmount.toLocaleString()}원</span>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '주문 생성 중...' : `${finalAmount.toLocaleString()}원 결제하기`}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                주문 내용을 확인하였으며, 결제에 동의합니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

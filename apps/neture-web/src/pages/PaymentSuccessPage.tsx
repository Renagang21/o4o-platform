/**
 * Payment Success Page
 *
 * Phase G-3: 주문/결제 플로우 구현
 * 토스페이먼츠 결제 성공 후 콜백 처리
 */

import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr/api/v1';

interface OrderData {
  id: string;
  order_number: string;
}

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  useEffect(() => {
    const confirmPayment = async () => {
      const paymentKey = searchParams.get('paymentKey');
      const orderId = searchParams.get('orderId');
      const amount = searchParams.get('amount');

      if (!paymentKey || !orderId || !amount) {
        setError('결제 정보가 올바르지 않습니다.');
        setIsLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem('accessToken');

        // 주문 ID 조회 (order_number로 orderId 찾기)
        // 먼저 주문을 조회해서 실제 order_id를 가져옴
        const ordersResponse = await axios.get<{ data: OrderData[] }>(
          `${API_BASE_URL}/neture/orders`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const order = ordersResponse.data.data.find(
          (o) => o.order_number === orderId
        );

        if (!order) {
          setError('주문을 찾을 수 없습니다.');
          setIsLoading(false);
          return;
        }

        // 결제 승인 API 호출
        await axios.post(
          `${API_BASE_URL}/neture/payments/confirm`,
          {
            payment_key: paymentKey,
            order_id: order.id,
            amount: parseInt(amount, 10),
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setOrderNumber(orderId);
      } catch (err: any) {
        console.error('Payment confirmation failed:', err);
        setError(
          err.response?.data?.error?.message || '결제 승인에 실패했습니다.'
        );
      } finally {
        setIsLoading(false);
      }
    };

    confirmPayment();
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">결제를 확인하고 있습니다...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">결제 실패</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <Link
              to="/orders"
              className="block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
            >
              주문 내역 확인
            </Link>
            <Link
              to="/"
              className="block text-gray-600 hover:text-gray-900"
            >
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-lg shadow-sm p-8 max-w-md text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">결제가 완료되었습니다!</h1>
        <p className="text-gray-600 mb-2">주문번호: {orderNumber}</p>
        <p className="text-gray-500 text-sm mb-8">
          주문하신 상품은 확인 후 빠르게 배송해 드리겠습니다.
        </p>

        <div className="space-y-3">
          <Link
            to="/orders"
            className="block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
          >
            주문 내역 확인
          </Link>
          <Link
            to="/"
            className="block text-gray-600 hover:text-gray-900"
          >
            쇼핑 계속하기
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Payment Page
 *
 * Phase G-3: 주문/결제 플로우 구현
 * 토스페이먼츠 결제 위젯 연동
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr/api/v1';

// 토스페이먼츠 타입 정의
declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      requestPayment: (
        method: string,
        options: {
          amount: number;
          orderId: string;
          orderName: string;
          customerName?: string;
          customerEmail?: string;
          customerMobilePhone?: string;
          successUrl: string;
          failUrl: string;
        }
      ) => Promise<void>;
    };
  }
}

interface PaymentInfo {
  order_id: string;
  order_number: string;
  order_name: string;
  amount: number;
  customer_name: string | null;
  customer_email: string | null;
  customer_mobile: string | null;
  client_key: string;
}

export default function PaymentPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>('카드');
  const [isProcessing, setIsProcessing] = useState(false);

  const tossLoaded = useRef(false);

  // 토스페이먼츠 SDK 로드
  useEffect(() => {
    if (tossLoaded.current) return;

    const script = document.createElement('script');
    script.src = 'https://js.tosspayments.com/v1/payment';
    script.async = true;
    script.onload = () => {
      tossLoaded.current = true;
    };
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // 인증 확인
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { state: { from: location.pathname } });
    }
  }, [authLoading, isAuthenticated, navigate, location]);

  // 결제 정보 조회
  useEffect(() => {
    if (!orderId || !isAuthenticated) return;

    const fetchPaymentInfo = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await axios.get<{ data: PaymentInfo }>(
          `${API_BASE_URL}/neture/payments/order/${orderId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setPaymentInfo(response.data.data);
      } catch (err: any) {
        console.error('Failed to fetch payment info:', err);
        setError(err.response?.data?.error?.message || '결제 정보를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPaymentInfo();
  }, [orderId, isAuthenticated]);

  const handlePayment = async () => {
    if (!paymentInfo || !window.TossPayments) {
      setError('결제를 진행할 수 없습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const tossPayments = window.TossPayments(paymentInfo.client_key);

      const successUrl = `${window.location.origin}/checkout/success?orderId=${paymentInfo.order_id}`;
      const failUrl = `${window.location.origin}/checkout/fail?orderId=${paymentInfo.order_id}`;

      await tossPayments.requestPayment(selectedMethod, {
        amount: paymentInfo.amount,
        orderId: paymentInfo.order_number,
        orderName: paymentInfo.order_name,
        customerName: paymentInfo.customer_name || undefined,
        customerEmail: paymentInfo.customer_email || undefined,
        customerMobilePhone: paymentInfo.customer_mobile?.replace(/-/g, '') || undefined,
        successUrl,
        failUrl,
      });
    } catch (err: any) {
      console.error('Payment request failed:', err);
      if (err.code === 'USER_CANCEL') {
        setError('결제가 취소되었습니다.');
      } else {
        setError(err.message || '결제 요청에 실패했습니다.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">결제 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error && !paymentInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">오류 발생</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/orders')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
          >
            주문 내역으로 이동
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-lg mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">결제</h1>
          <p className="text-gray-600 mt-2">결제 수단을 선택하고 결제를 진행해주세요.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {paymentInfo && (
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">주문 정보</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">주문번호</span>
                  <span className="font-medium">{paymentInfo.order_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">상품명</span>
                  <span className="font-medium">{paymentInfo.order_name}</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between text-lg font-bold">
                  <span>결제 금액</span>
                  <span className="text-blue-600">{paymentInfo.amount.toLocaleString()}원</span>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">결제 수단</h2>
              <div className="grid grid-cols-2 gap-3">
                {['카드', '가상계좌', '계좌이체', '휴대폰'].map((method) => (
                  <button
                    key={method}
                    onClick={() => setSelectedMethod(method)}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      selectedMethod === method
                        ? 'border-blue-600 bg-blue-50 text-blue-600'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="font-medium">{method}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Button */}
            <button
              onClick={handlePayment}
              disabled={isProcessing}
              className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isProcessing
                ? '결제 진행 중...'
                : `${paymentInfo.amount.toLocaleString()}원 결제하기`}
            </button>

            <p className="text-xs text-gray-500 text-center">
              결제 시 토스페이먼츠의 결제창으로 이동합니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

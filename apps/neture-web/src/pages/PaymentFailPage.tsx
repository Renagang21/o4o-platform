/**
 * Payment Fail Page
 *
 * Phase G-3: 주문/결제 플로우 구현
 * 토스페이먼츠 결제 실패 콜백 처리
 */

import { useSearchParams, Link } from 'react-router-dom';

export default function PaymentFailPage() {
  const [searchParams] = useSearchParams();

  const errorCode = searchParams.get('code');
  const errorMessage = searchParams.get('message');
  const orderId = searchParams.get('orderId');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-lg shadow-sm p-8 max-w-md text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">결제에 실패했습니다</h1>
        <p className="text-gray-600 mb-6">
          {errorMessage || '결제 처리 중 문제가 발생했습니다.'}
        </p>

        {errorCode && (
          <p className="text-sm text-gray-500 mb-6">
            오류 코드: {errorCode}
          </p>
        )}

        <div className="space-y-3">
          {orderId && (
            <Link
              to={`/checkout/payment/${orderId}`}
              className="block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
            >
              다시 결제하기
            </Link>
          )}
          <Link
            to="/orders"
            className="block bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200"
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

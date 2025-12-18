/**
 * Checkout Result Page
 *
 * Phase N-1: 실거래 MVP
 *
 * Toss 결제 완료/실패 후 리다이렉트되는 페이지
 * - 성공: 서버에 결제 승인 요청 후 결과 표시
 * - 실패: 에러 메시지 표시 및 재시도 안내
 */

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Button, Card } from '@o4o/ui';
import { CheckCircle, XCircle, Loader2, ShoppingBag, Home } from 'lucide-react';
import { formatCurrency } from '@o4o/utils';
import { confirmPayment, ConfirmPaymentResponse } from '@/lib/api/checkout';

type ResultStatus = 'loading' | 'success' | 'fail';

export function CheckoutResultPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<ResultStatus>('loading');
  const [orderInfo, setOrderInfo] = useState<ConfirmPaymentResponse | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string>('');

  // URL 파라미터
  const paymentKey = searchParams.get('paymentKey');
  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount');
  const code = searchParams.get('code'); // 실패 시
  const message = searchParams.get('message'); // 실패 시

  // 결제 승인 mutation
  const confirmMutation = useMutation({
    mutationFn: confirmPayment,
    onSuccess: (data) => {
      setOrderInfo(data);
      setStatus('success');
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
      setStatus('fail');
    },
  });

  useEffect(() => {
    // 실패 파라미터가 있으면 실패 처리
    if (code || message) {
      setErrorMessage(message || '결제가 취소되었거나 실패했습니다.');
      setStatus('fail');
      return;
    }

    // 성공 파라미터가 있으면 결제 승인 요청
    if (paymentKey && orderId && amount) {
      confirmMutation.mutate({
        paymentKey,
        orderId,
        amount: Number(amount),
      });
    } else {
      // 파라미터가 없으면 에러
      setErrorMessage('잘못된 접근입니다.');
      setStatus('fail');
    }
  }, [paymentKey, orderId, amount, code, message]);

  // 로딩 상태
  if (status === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="p-8 text-center max-w-md w-full">
          <Loader2 className="h-16 w-16 mx-auto mb-4 animate-spin text-primary" />
          <h2 className="text-xl font-semibold mb-2">결제 처리 중...</h2>
          <p className="text-muted-foreground">
            잠시만 기다려주세요. 결제를 확인하고 있습니다.
          </p>
        </Card>
      </div>
    );
  }

  // 성공 상태
  if (status === 'success' && orderInfo) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="p-8 text-center max-w-md w-full">
          <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
          <h2 className="text-2xl font-bold mb-2">결제가 완료되었습니다</h2>
          <p className="text-muted-foreground mb-6">
            주문이 성공적으로 접수되었습니다.
          </p>

          <div className="bg-muted rounded-lg p-4 mb-6 text-left">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">주문번호</span>
              <span className="font-medium">{orderInfo.orderNumber}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">결제금액</span>
              <span className="font-semibold text-primary">
                {formatCurrency(orderInfo.totalAmount)}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">결제상태</span>
              <span className="font-medium text-green-600">결제완료</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate('/')}
            >
              <Home className="h-4 w-4 mr-2" />
              홈으로
            </Button>
            <Button
              className="flex-1"
              onClick={() => navigate(`/orders/${orderInfo.orderId}`)}
            >
              <ShoppingBag className="h-4 w-4 mr-2" />
              주문 상세
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // 실패 상태
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Card className="p-8 text-center max-w-md w-full">
        <XCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
        <h2 className="text-2xl font-bold mb-2">결제에 실패했습니다</h2>
        <p className="text-muted-foreground mb-2">
          {errorMessage || '결제 처리 중 문제가 발생했습니다.'}
        </p>
        {code && (
          <p className="text-sm text-muted-foreground mb-6">
            오류 코드: {code}
          </p>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
          <p className="text-sm text-amber-800">
            <strong>결제 재시도 안내</strong>
            <br />
            카드 한도, 잔액 부족, 또는 일시적인 오류일 수 있습니다.
            <br />
            다른 결제 수단으로 다시 시도해주세요.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate('/')}
          >
            <Home className="h-4 w-4 mr-2" />
            홈으로
          </Button>
          <Button className="flex-1" onClick={() => navigate('/cart')}>
            <ShoppingBag className="h-4 w-4 mr-2" />
            장바구니
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mt-6">
          문제가 지속되면{' '}
          <Link to="/support" className="text-primary underline">
            고객센터
          </Link>
          로 문의해주세요.
        </p>
      </Card>
    </div>
  );
}

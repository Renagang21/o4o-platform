/**
 * Checkout Page
 *
 * Phase N-1: 실거래 MVP
 *
 * 실제 Toss Payments 연동 결제 페이지
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Button, Input, Card, Textarea } from '@o4o/ui';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  CreditCard,
  AlertCircle,
  Loader2,
  ShoppingCart,
} from 'lucide-react';
import { useAuth } from '@o4o/auth-context';
import { formatCurrency } from '@o4o/utils';
import { useCartStore } from '@/stores/useCartStore';
import {
  initiateCheckout,
  openTossPayment,
  CheckoutItem,
} from '@/lib/api/checkout';
import { getPartnerIdFromCookie } from '@/lib/partner-attribution';

interface CheckoutForm {
  // Shipping Info
  recipientName: string;
  recipientPhone: string;
  postalCode: string;
  address: string;
  addressDetail: string;

  // Additional
  deliveryRequest: string;
  agreeToTerms: boolean;
}

const deliveryRequests = [
  '부재시 문앞에 놓아주세요',
  '부재시 경비실에 맡겨주세요',
  '배송 전 연락주세요',
  '파손 주의 제품입니다',
  '직접 작성',
];

export function CheckoutPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const cart = useCartStore((state) => state.cart);
  const [customRequest, setCustomRequest] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CheckoutForm>({
    defaultValues: {
      recipientName: user?.name || '',
      recipientPhone: '',
      deliveryRequest: deliveryRequests[0],
      agreeToTerms: false,
    },
  });

  const selectedDeliveryRequest = watch('deliveryRequest');
  const agreeToTerms = watch('agreeToTerms');

  // 로그인 확인
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout');
    }
  }, [isAuthenticated, navigate]);

  // 장바구니 확인
  useEffect(() => {
    if (!cart || cart.items.length === 0) {
      navigate('/cart');
    }
  }, [cart, navigate]);

  // 결제 시작 mutation
  const checkoutMutation = useMutation({
    mutationFn: initiateCheckout,
    onSuccess: async (data) => {
      // Toss 결제창 열기
      try {
        await openTossPayment({
          clientKey: data.payment.clientKey,
          amount: data.payment.amount,
          orderId: data.payment.orderId,
          orderName: data.payment.orderName,
          successUrl: data.payment.successUrl,
          failUrl: data.payment.failUrl,
          customerName: user?.name || undefined,
          customerEmail: user?.email || undefined,
        });
      } catch (err: any) {
        // 사용자가 결제창을 닫은 경우
        setError('결제가 취소되었습니다.');
        setIsProcessing(false);
      }
    },
    onError: (error: Error) => {
      setError(error.message);
      setIsProcessing(false);
    },
  });

  const onSubmit = async (data: CheckoutForm) => {
    if (!cart || cart.items.length === 0) {
      setError('장바구니가 비어있습니다.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    // 장바구니 아이템을 CheckoutItem으로 변환
    const items: CheckoutItem[] = cart.items.map((item: any) => ({
      productId: item.productId || item.product?.id || '',
      productName: item.product?.name || item.productName || '상품',
      quantity: item.quantity,
      unitPrice: item.unitPrice || item.product?.pricing?.customer || 0,
    }));

    // Partner Attribution
    const partnerId = getPartnerIdFromCookie();

    checkoutMutation.mutate({
      items,
      shippingAddress: {
        recipientName: data.recipientName,
        phone: data.recipientPhone,
        zipCode: data.postalCode,
        address1: data.address,
        address2: data.addressDetail,
        memo: data.deliveryRequest,
      },
      partnerId: partnerId || undefined,
    });
  };

  const handleDeliveryRequestChange = (value: string) => {
    if (value === '직접 작성') {
      setCustomRequest(true);
      setValue('deliveryRequest', '');
    } else {
      setCustomRequest(false);
      setValue('deliveryRequest', value);
    }
  };

  const searchAddress = () => {
    // TODO: Daum Postcode API 연동
    alert('주소 검색 기능은 추후 구현 예정입니다.');
  };

  // 장바구니 요약
  const orderSummary = cart
    ? {
        itemCount: cart.items.length,
        subtotal: cart.summary?.subtotal || 0,
        discount: cart.summary?.discount || 0,
        shipping: cart.summary?.shipping || 0,
        total: cart.summary?.total || 0,
      }
    : {
        itemCount: 0,
        subtotal: 0,
        discount: 0,
        shipping: 0,
        total: 0,
      };

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold mb-2">장바구니가 비어있습니다</h2>
        <p className="text-muted-foreground mb-4">
          결제할 상품을 먼저 장바구니에 담아주세요.
        </p>
        <Button onClick={() => navigate('/products')}>쇼핑 계속하기</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">주문/결제</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid md:grid-cols-3 gap-6"
      >
        {/* Left Column - Shipping */}
        <div className="md:col-span-2 space-y-6">
          {/* Order Items Summary */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">주문 상품</h2>
            <div className="space-y-3">
              {cart.items.map((item: any) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center py-2 border-b last:border-0"
                >
                  <div>
                    <span className="font-medium">
                      {item.product?.name || item.productName || '상품'}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      x {item.quantity}
                    </span>
                  </div>
                  <span className="font-medium">
                    {formatCurrency(
                      (item.unitPrice || item.product?.pricing?.customer || 0) *
                        item.quantity
                    )}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Shipping Information */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">배송 정보</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="recipientName">수령인 *</Label>
                  <Input
                    id="recipientName"
                    {...register('recipientName', {
                      required: '수령인을 입력해주세요',
                    })}
                  />
                  {errors.recipientName && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.recipientName.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="recipientPhone">연락처 *</Label>
                  <Input
                    id="recipientPhone"
                    type="tel"
                    placeholder="010-0000-0000"
                    {...register('recipientPhone', {
                      required: '연락처를 입력해주세요',
                      pattern: {
                        value: /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/,
                        message: '올바른 휴대폰 번호를 입력해주세요',
                      },
                    })}
                  />
                  {errors.recipientPhone && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.recipientPhone.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="postalCode">주소 *</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    id="postalCode"
                    placeholder="우편번호"
                    {...register('postalCode', {
                      required: '주소를 검색해주세요',
                    })}
                  />
                  <Button type="button" onClick={searchAddress}>
                    주소 검색
                  </Button>
                </div>
                <Input
                  placeholder="기본 주소"
                  {...register('address', { required: '주소를 입력해주세요' })}
                  className="mb-2"
                />
                <Input
                  placeholder="상세 주소"
                  {...register('addressDetail')}
                />
                {errors.postalCode && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.postalCode.message}
                  </p>
                )}
              </div>

              <div>
                <Label>배송 요청사항</Label>
                <RadioGroup
                  value={customRequest ? '직접 작성' : selectedDeliveryRequest}
                  onValueChange={handleDeliveryRequestChange}
                >
                  {deliveryRequests.map((request: any) => (
                    <div key={request} className="flex items-center space-x-2">
                      <RadioGroupItem value={request} id={request} />
                      <Label
                        htmlFor={request}
                        className="font-normal cursor-pointer"
                      >
                        {request}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                {customRequest && (
                  <Textarea
                    {...register('deliveryRequest')}
                    placeholder="배송 요청사항을 입력해주세요"
                    className="mt-2"
                    rows={3}
                  />
                )}
              </div>
            </div>
          </Card>

          {/* Payment Method - Phase N-1: 카드만 지원 */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">결제 방법</h2>
            <div className="flex items-center gap-3 p-4 border rounded-lg bg-primary/5 border-primary">
              <CreditCard className="h-5 w-5" />
              <span>신용/체크카드</span>
              <span className="text-sm text-muted-foreground ml-auto">
                토스페이먼츠
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              * Phase N-1: 카드 결제만 지원됩니다.
            </p>
          </Card>
        </div>

        {/* Right Column - Order Summary */}
        <div className="md:col-span-1">
          <Card className="p-6 sticky top-4">
            <h2 className="text-lg font-semibold mb-4">결제 금액</h2>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span>상품 ({orderSummary.itemCount}개)</span>
                <span>{formatCurrency(orderSummary.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>배송비</span>
                <span>
                  {orderSummary.shipping === 0
                    ? '무료'
                    : formatCurrency(orderSummary.shipping)}
                </span>
              </div>
              {orderSummary.discount > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>할인</span>
                  <span>-{formatCurrency(orderSummary.discount)}</span>
                </div>
              )}
            </div>

            <div className="border-t pt-4 mb-6">
              <div className="flex justify-between font-semibold text-lg">
                <span>총 결제금액</span>
                <span className="text-primary">
                  {formatCurrency(orderSummary.total)}
                </span>
              </div>
            </div>

            {/* Terms Agreement */}
            <div className="space-y-3 mb-6">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="agreeToTerms"
                  checked={agreeToTerms}
                  onCheckedChange={(checked) =>
                    setValue('agreeToTerms', checked === true)
                  }
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="agreeToTerms"
                    className="text-sm font-normal cursor-pointer"
                  >
                    결제 진행 동의
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    주문 내용을 확인하였으며, 정보 제공 등에 동의합니다.
                  </p>
                </div>
              </div>
              {errors.agreeToTerms && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.agreeToTerms.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={!agreeToTerms || isProcessing}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  처리 중...
                </>
              ) : (
                `${formatCurrency(orderSummary.total)} 결제하기`
              )}
            </Button>

            {/* Test Mode Notice */}
            <p className="text-xs text-muted-foreground text-center mt-4">
              * 테스트 모드에서는 실제 결제가 진행되지 않습니다.
            </p>
          </Card>
        </div>
      </form>
    </div>
  );
}

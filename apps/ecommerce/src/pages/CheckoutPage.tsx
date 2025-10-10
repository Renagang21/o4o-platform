import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Button, Input, Card, Textarea } from '@o4o/ui';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { CreditCard, Smartphone, Building, DollarSign, AlertCircle } from 'lucide-react';
import { useAuth } from '@o4o/auth-context';
import { formatCurrency } from '@o4o/utils';

interface CheckoutForm {
  // Shipping Info
  recipientName: string;
  recipientPhone: string;
  postalCode: string;
  address: string;
  addressDetail: string;
  
  // Payment
  paymentMethod: 'card' | 'kakao_pay' | 'naver_pay' | 'virtual_account' | 'bank_transfer';
  
  // Additional
  deliveryRequest: string;
  agreeToTerms: boolean;
}

const paymentMethods = [
  { value: 'card', label: '신용/체크카드', icon: CreditCard },
  { value: 'kakao_pay', label: '카카오페이', icon: Smartphone },
  { value: 'naver_pay', label: '네이버페이', icon: Smartphone },
  { value: 'virtual_account', label: '가상계좌', icon: Building },
  { value: 'bank_transfer', label: '무통장입금', icon: DollarSign }
];

const deliveryRequests = [
  '부재시 문앞에 놓아주세요',
  '부재시 경비실에 맡겨주세요',
  '배송 전 연락주세요',
  '파손 주의 제품입니다',
  '직접 작성'
];

// Mock order summary - should come from cart or previous page
const mockOrderSummary = {
  itemCount: 3,
  subtotal: 437000,
  discount: 0,
  shipping: 0,
  tax: 43700,
  total: 480700
};

export function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [customRequest, setCustomRequest] = useState(false);
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<CheckoutForm>({
    defaultValues: {
      recipientName: user?.name || '',
      recipientPhone: '',
      paymentMethod: 'card',
      deliveryRequest: deliveryRequests[0],
      agreeToTerms: false
    }
  });

  const selectedDeliveryRequest = watch('deliveryRequest');
  const agreeToTerms = watch('agreeToTerms');

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (_data: CheckoutForm) => {
      // TODO: Replace with actual API call
      // const response = await authClient.api.post('/api/v1/orders', {
      //   ...data,
      //   items: selectedCartItems,
      //   summary: orderSummary
      // });
      // return response.data;
      // TODO: Log order creation for debugging
      return { id: '12345' }; // Mock order ID
    },
    onSuccess: (data) => {
      // Clear cart and navigate to order confirmation
      navigate(`/orders/${data.id}`);
    }
  });

  const onSubmit = (data: CheckoutForm) => {
    createOrderMutation.mutate(data);
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
    // TODO: Implement Korean address search (Daum Postcode API)
    alert('주소 검색 기능은 추후 구현 예정입니다.');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">주문/결제</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="grid md:grid-cols-3 gap-6">
        {/* Left Column - Shipping & Payment */}
        <div className="md:col-span-2 space-y-6">
          {/* Shipping Information */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">배송 정보</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="recipientName">수령인 *</Label>
                  <Input
                    id="recipientName"
                    {...register('recipientName', { required: '수령인을 입력해주세요' })}
                  />
                  {errors.recipientName && (
                    <p className="text-sm text-red-600 mt-1">{errors.recipientName.message}</p>
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
                        message: '올바른 휴대폰 번호를 입력해주세요'
                      }
                    })}
                  />
                  {errors.recipientPhone && (
                    <p className="text-sm text-red-600 mt-1">{errors.recipientPhone.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="postalCode">주소 *</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    id="postalCode"
                    placeholder="우편번호"
                    {...register('postalCode', { required: '주소를 검색해주세요' })}
                    readOnly
                  />
                  <Button type="button" onClick={searchAddress}>
                    주소 검색
                  </Button>
                </div>
                <Input
                  placeholder="기본 주소"
                  {...register('address', { required: '주소를 입력해주세요' })}
                  className="mb-2"
                  readOnly
                />
                <Input
                  placeholder="상세 주소"
                  {...register('addressDetail')}
                />
                {errors.postalCode && (
                  <p className="text-sm text-destructive mt-1">{errors.postalCode.message}</p>
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
                      <Label htmlFor={request} className="font-normal cursor-pointer">
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

          {/* Payment Method */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">결제 방법</h2>
            
            <RadioGroup
              value={watch('paymentMethod')}
              onValueChange={(value) => setValue('paymentMethod', value as CheckoutForm['paymentMethod'])}
            >
              <div className="grid grid-cols-2 gap-4">
                {paymentMethods.map((method: any) => {
                  const Icon = method.icon;
                  return (
                    <div key={method.value}>
                      <RadioGroupItem
                        value={method.value}
                        id={method.value}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={method.value}
                        className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted peer-checked:border-primary peer-checked:bg-primary/5"
                      >
                        <Icon className="h-5 w-5" />
                        <span>{method.label}</span>
                      </Label>
                    </div>
                  );
                })}
              </div>
            </RadioGroup>
          </Card>
        </div>

        {/* Right Column - Order Summary */}
        <div className="md:col-span-1">
          <Card className="p-6 sticky top-4">
            <h2 className="text-lg font-semibold mb-4">주문 요약</h2>
            
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span>상품 ({mockOrderSummary.itemCount}개)</span>
                <span>{formatCurrency(mockOrderSummary.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>배송비</span>
                <span>
                  {mockOrderSummary.shipping === 0 
                    ? '무료' 
                    : formatCurrency(mockOrderSummary.shipping)
                  }
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>부가세</span>
                <span>{formatCurrency(mockOrderSummary.tax)}</span>
              </div>
            </div>
            
            <div className="border-t pt-4 mb-6">
              <div className="flex justify-between font-semibold text-lg">
                <span>총 결제금액</span>
                <span className="text-primary">
                  {formatCurrency(mockOrderSummary.total)}
                </span>
              </div>
            </div>

            {/* Terms Agreement */}
            <div className="space-y-3 mb-6">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="agreeToTerms"
                  {...register('agreeToTerms', {
                    required: '결제 진행에 동의해주세요'
                  })}
                />
                <div className="space-y-1">
                  <Label htmlFor="agreeToTerms" className="text-sm font-normal cursor-pointer">
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
              disabled={!agreeToTerms || isSubmitting}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? '처리 중...' : `${formatCurrency(mockOrderSummary.total)} 결제하기`}
            </Button>
          </Card>
        </div>
      </form>
    </div>
  );
}
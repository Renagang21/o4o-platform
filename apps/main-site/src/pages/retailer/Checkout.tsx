import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { useOrderStore } from '../../stores/orderStore';
import { useAuthStore } from '../../stores/authStore';
import { CreateOrderRequest, PaymentMethod, Address } from '../../types/order';
import { CartItem } from '../../types/order';
import { Retailer } from '../../types/user';

interface CheckoutForm {
  recipientName: string;
  phone: string;
  zipCode: string;
  address: string;
  detailAddress: string;
  deliveryRequest?: string;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { createOrder, calculateOrderSummary, isLoading } = useOrderStore();

  const [selectedItems, setSelectedItems] = useState<CartItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<CheckoutForm>();

  useEffect(() => {
    // 장바구니에서 전달받은 선택된 아이템들
    const items = location.state?.selectedItems as CartItem[];
    if (!items || items.length === 0) {
      toast.error('주문할 상품이 없습니다.');
      navigate('/retailer/cart');
      return;
    }
    setSelectedItems(items);

    // 사용자 정보로 폼 초기값 설정
    if (user) {
      setValue('recipientName', user.name);
      setValue('phone', user.phone || '');
    }
  }, [location.state, user, navigate, setValue]);

  const summary = calculateOrderSummary(selectedItems);

  const onSubmit = async (data: CheckoutForm) => {
    setIsProcessing(true);
    
    try {
      const orderRequest: CreateOrderRequest = {
        items: selectedItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        shippingAddress: {
          recipientName: data.recipientName,
          phone: data.phone,
          zipCode: data.zipCode,
          address: data.address,
          detailAddress: data.detailAddress,
          deliveryRequest: data.deliveryRequest,
        },
        paymentMethod: data.paymentMethod,
        notes: data.notes,
      };

      const order = await createOrder(orderRequest);
      
      toast.success('주문이 완료되었습니다!');
      navigate(`/retailer/orders/${order.id}`, {
        state: { newOrder: true }
      });
    } catch (error) {
      toast.error('주문 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  const getUserGrade = () => {
    if (user?.userType === 'retailer') {
      return (user as Retailer).grade || 'gold';
    }
    return 'gold';
  };

  const getGradeBadge = () => {
    const grade = getUserGrade();
    const badges = {
      gold: 'bg-yellow-100 text-yellow-800',
      premium: 'bg-purple-100 text-purple-800',
      vip: 'bg-red-100 text-red-800',
    };
    
    const labels = {
      gold: 'GOLD',
      premium: 'PREMIUM',
      vip: 'VIP',
    };

    return (
      <span className={`px-2 py-1 text-xs font-bold rounded ${badges[grade as keyof typeof badges]}`}>
        {labels[grade as keyof typeof labels]} 회원
      </span>
    );
  };

  if (selectedItems.length === 0) {
    return null; // useEffect에서 리다이렉트 처리됨
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">주문하기</h1>
              <div className="mt-2 flex items-center space-x-2">
                {getGradeBadge()}
                <span className="text-sm text-gray-600">안전한 결제를 진행해주세요</span>
              </div>
            </div>
            <button
              onClick={() => navigate('/retailer/cart')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← 장바구니로 돌아가기
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="lg:grid lg:grid-cols-12 lg:gap-x-8">
            {/* 주문 정보 입력 */}
            <div className="lg:col-span-8">
              <div className="space-y-6">
                {/* 배송 정보 */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">배송 정보</h2>
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        받는 분 이름 *
                      </label>
                      <input
                        type="text"
                        {...register('recipientName', { required: '받는 분 이름을 입력해주세요' })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      {errors.recipientName && (
                        <p className="mt-1 text-sm text-red-600">{errors.recipientName.message}</p>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        휴대폰 번호 *
                      </label>
                      <input
                        type="tel"
                        {...register('phone', { 
                          required: '휴대폰 번호를 입력해주세요',
                          pattern: {
                            value: /^01[0-9]-?[0-9]{4}-?[0-9]{4}$/,
                            message: '올바른 휴대폰 번호를 입력해주세요'
                          }
                        })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="010-1234-5678"
                      />
                      {errors.phone && (
                        <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        우편번호 *
                      </label>
                      <div className="mt-1 flex">
                        <input
                          type="text"
                          {...register('zipCode', { required: '우편번호를 입력해주세요' })}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          placeholder="12345"
                        />
                        <button
                          type="button"
                          className="ml-3 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          우편번호 찾기
                        </button>
                      </div>
                      {errors.zipCode && (
                        <p className="mt-1 text-sm text-red-600">{errors.zipCode.message}</p>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        주소 *
                      </label>
                      <input
                        type="text"
                        {...register('address', { required: '주소를 입력해주세요' })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="기본 주소"
                      />
                      {errors.address && (
                        <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        상세 주소 *
                      </label>
                      <input
                        type="text"
                        {...register('detailAddress', { required: '상세 주소를 입력해주세요' })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="상세 주소 (동, 호수 등)"
                      />
                      {errors.detailAddress && (
                        <p className="mt-1 text-sm text-red-600">{errors.detailAddress.message}</p>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        배송 요청사항
                      </label>
                      <select
                        {...register('deliveryRequest')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="">선택해주세요</option>
                        <option value="부재시 경비실에 보관">부재시 경비실에 보관</option>
                        <option value="부재시 문 앞에 배치">부재시 문 앞에 배치</option>
                        <option value="배송 전 연락바랍니다">배송 전 연락바랍니다</option>
                        <option value="평일 오전 배송 희망">평일 오전 배송 희망</option>
                        <option value="평일 오후 배송 희망">평일 오후 배송 희망</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 결제 방법 */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">결제 방법</h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        id="card"
                        type="radio"
                        value="card"
                        {...register('paymentMethod', { required: '결제 방법을 선택해주세요' })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <label htmlFor="card" className="ml-3 block text-sm font-medium text-gray-700">
                        신용카드
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        id="transfer"
                        type="radio"
                        value="transfer"
                        {...register('paymentMethod')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <label htmlFor="transfer" className="ml-3 block text-sm font-medium text-gray-700">
                        계좌이체
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        id="virtual_account"
                        type="radio"
                        value="virtual_account"
                        {...register('paymentMethod')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <label htmlFor="virtual_account" className="ml-3 block text-sm font-medium text-gray-700">
                        가상계좌
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        id="kakao_pay"
                        type="radio"
                        value="kakao_pay"
                        {...register('paymentMethod')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <label htmlFor="kakao_pay" className="ml-3 block text-sm font-medium text-gray-700">
                        카카오페이
                      </label>
                    </div>
                  </div>
                  
                  {errors.paymentMethod && (
                    <p className="mt-1 text-sm text-red-600">{errors.paymentMethod.message}</p>
                  )}
                </div>

                {/* 주문 메모 */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">주문 메모</h2>
                  
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="주문에 대한 특별한 요청사항이 있으시면 적어주세요."
                  />
                </div>
              </div>
            </div>

            {/* 주문 요약 */}
            <div className="lg:col-span-4 mt-8 lg:mt-0">
              <div className="bg-white shadow rounded-lg p-6 sticky top-4">
                <h2 className="text-lg font-medium text-gray-900 mb-4">주문 요약</h2>
                
                {/* 주문 상품 목록 */}
                <div className="space-y-4 mb-6">
                  {selectedItems.map((item) => (
                    <div key={item.id} className="flex">
                      <img
                        src={item.productImage}
                        alt={item.productName}
                        className="h-16 w-16 rounded object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/images/placeholder.jpg';
                        }}
                      />
                      <div className="ml-4 flex-1">
                        <h4 className="text-sm font-medium text-gray-900">{item.productName}</h4>
                        <p className="text-sm text-gray-500">수량: {item.quantity}개</p>
                        <p className="text-sm font-medium text-gray-900">
                          ₩{formatPrice(item.unitPrice * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* 금액 계산 */}
                <div className="space-y-3 border-t border-gray-200 pt-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">상품 금액</span>
                    <span className="text-sm font-medium">₩{formatPrice(summary.subtotal)}</span>
                  </div>
                  
                  {summary.discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">회원 할인</span>
                      <span className="text-sm font-medium text-red-600">-₩{formatPrice(summary.discount)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">배송비</span>
                    <span className="text-sm font-medium">
                      {summary.shipping === 0 ? '무료' : `₩${formatPrice(summary.shipping)}`}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">부가세</span>
                    <span className="text-sm font-medium">₩{formatPrice(summary.tax)}</span>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between">
                      <span className="text-base font-medium text-gray-900">총 결제 금액</span>
                      <span className="text-xl font-bold text-gray-900">₩{formatPrice(summary.total)}</span>
                    </div>
                  </div>
                </div>

                {/* 결제 동의 */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">결제 동의</h3>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        required
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-xs text-gray-600">구매조건 확인 및 결제진행 동의</span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || isProcessing}
                  className={`w-full mt-6 px-6 py-3 border border-transparent text-base font-medium rounded-md text-white ${
                    isLoading || isProcessing
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                  }`}
                >
                  {isLoading || isProcessing ? '처리중...' : `₩${formatPrice(summary.total)} 결제하기`}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
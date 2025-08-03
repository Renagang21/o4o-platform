import { useEffect, Fragment } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useOrderStore } from '../../stores/orderStore';
import { useAuthStore } from '../../stores/authStore';

export default function CustomerOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const {
    currentOrder,
    fetchOrder,
    cancelOrder,
    isLoading,
    error,
  } = useOrderStore();

  const isNewOrder = location.state?.newOrder;

  useEffect(() => {
    if (!user) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    if (id) {
      fetchOrder(id);
    }
  }, [id, user]);

  const handleCancelOrder = async () => {
    if (!currentOrder) return;
    
    const reason = prompt('취소 사유를 입력해주세요:');
    if (!reason) return;

    try {
      await cancelOrder(currentOrder.id, reason);
      toast.success('주문이 취소되었습니다.');
      fetchOrder(currentOrder.id); // 주문 정보 새로고침
    } catch (error) {
      toast.error('주문 취소에 실패했습니다.');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-purple-100 text-purple-800',
      shipped: 'bg-green-100 text-green-800',
      delivered: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
      returned: 'bg-orange-100 text-orange-800',
    };

    const labels = {
      pending: '주문 대기',
      confirmed: '주문 확인',
      processing: '처리 중',
      shipped: '배송 중',
      delivered: '배송 완료',
      cancelled: '주문 취소',
      returned: '반품',
    };

    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800',
    };

    const labels = {
      pending: '결제 대기',
      completed: '결제 완료',
      failed: '결제 실패',
      refunded: '환불 완료',
    };

    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const canCancelOrder = () => {
    if (!currentOrder) return false;
    return ['pending', 'confirmed'].includes(currentOrder.status) && currentOrder.paymentStatus !== 'refunded';
  };

  const getOrderProgress = () => {
    if (!currentOrder) return [];
    
    const progress = [
      { step: 'pending', label: '주문 접수', completed: true },
      { step: 'confirmed', label: '주문 확인', completed: ['confirmed', 'processing', 'shipped', 'delivered'].includes(currentOrder.status) },
      { step: 'processing', label: '상품 준비', completed: ['processing', 'shipped', 'delivered'].includes(currentOrder.status) },
      { step: 'shipped', label: '배송 시작', completed: ['shipped', 'delivered'].includes(currentOrder.status) },
      { step: 'delivered', label: '배송 완료', completed: currentOrder.status === 'delivered' },
    ];

    if (currentOrder.status === 'cancelled') {
      return [
        { step: 'pending', label: '주문 접수', completed: true },
        { step: 'cancelled', label: '주문 취소', completed: true, cancelled: true },
      ];
    }

    return progress;
  };

  if (!user) {
    return null; // useEffect에서 리다이렉트 처리됨
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-2 text-gray-600">주문 정보를 불러오는 중...</p>
      </div>
    );
  }

  if (error || !currentOrder) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">주문을 찾을 수 없습니다</h3>
          <p className="mt-1 text-sm text-gray-500">{error || '요청하신 주문이 존재하지 않습니다.'}</p>
          <button
            onClick={() => navigate('/customer/orders')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            주문 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <button
                onClick={() => navigate('/customer/orders')}
                className="flex items-center text-gray-600 hover:text-gray-900 mb-2"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                주문 목록으로 돌아가기
              </button>
              <h1 className="text-3xl font-bold text-gray-900">
                주문번호: {currentOrder.orderNumber}
              </h1>
              {isNewOrder && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800">🎉 주문이 성공적으로 완료되었습니다!</p>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {getStatusBadge(currentOrder.status)}
              {getPaymentStatusBadge(currentOrder.paymentStatus)}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-8">
          {/* 주문 정보 */}
          <div className="lg:col-span-8">
            <div className="space-y-6">
              {/* 주문 진행 상황 */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-6">주문 진행 상황</h2>
                
                <div className="flex items-center">
                  {getOrderProgress().map((step, index) => (
                    <Fragment key={step.step}>
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          step.cancelled 
                            ? 'bg-red-500' 
                            : step.completed 
                              ? 'bg-blue-500' 
                              : 'bg-gray-300'
                        }`}>
                          {step.completed && (
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <span className={`mt-2 text-xs font-medium ${
                          step.cancelled 
                            ? 'text-red-600' 
                            : step.completed 
                              ? 'text-blue-600' 
                              : 'text-gray-500'
                        }`}>
                          {step.label}
                        </span>
                      </div>
                      {index < getOrderProgress().length - 1 && (
                        <div className={`flex-1 h-1 mx-4 ${
                          getOrderProgress()[index + 1]?.completed ? 'bg-blue-500' : 'bg-gray-300'
                        }`} />
                      )}
                    </Fragment>
                  ))}
                </div>

                {/* 상태별 안내 메시지 */}
                {currentOrder.status === 'shipped' && (
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                        <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1V8a1 1 0 00-1-1h-3z"/>
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-green-800">상품이 배송 중입니다</p>
                        <p className="text-sm text-green-700">곧 안전하게 도착할 예정입니다.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 주문 상품 */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">주문 상품</h2>
                
                <div className="space-y-4">
                  {currentOrder.items.map((item: any) => (
                    <div key={item.id} className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <img
                        src={item.productImage}
                        alt={item.productName}
                        className="h-16 w-16 rounded object-cover cursor-pointer"
                        onClick={() => navigate(`/customer/products/${item.productId}`)}
                        onError={(e) => {
                          e.currentTarget.src = '/images/placeholder.jpg';
                        }}
                      />
                      <div className="ml-4 flex-1">
                        <h3 className="text-sm font-medium text-gray-900">
                          <button
                            onClick={() => navigate(`/customer/products/${item.productId}`)}
                            className="hover:text-blue-600"
                          >
                            {item.productName}
                          </button>
                        </h3>
                        {item.productBrand && (
                          <p className="text-sm text-gray-500">{item.productBrand}</p>
                        )}
                        <p className="text-sm text-gray-500">공급업체: {item.supplierName}</p>
                        
                        {currentOrder.status === 'delivered' && (
                          <div className="mt-2">
                            <button
                              onClick={() => {
                                toast.success('리뷰 작성 기능을 준비 중입니다.');
                              }}
                              className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200"
                            >
                              리뷰 작성
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-900">수량: {item.quantity}개</p>
                        <p className="text-sm text-gray-500">개당 ₩{formatPrice(item.unitPrice)}</p>
                        <p className="text-lg font-medium text-gray-900">₩{formatPrice(item.totalPrice)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 배송 정보 */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">배송 정보</h2>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">배송 주소</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p className="font-medium">{currentOrder.shippingAddress.recipientName}</p>
                      <p>{currentOrder.shippingAddress.phone}</p>
                      <p>({currentOrder.shippingAddress.zipCode}) {currentOrder.shippingAddress.address}</p>
                      <p>{currentOrder.shippingAddress.detailAddress}</p>
                      {currentOrder.shippingAddress.deliveryRequest && (
                        <p className="text-blue-600 mt-2">
                          📝 요청사항: {currentOrder.shippingAddress.deliveryRequest}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">배송 현황</h3>
                    <div className="text-sm text-gray-600 space-y-2">
                      {currentOrder.trackingNumber && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                          <p className="font-medium text-blue-800">운송장 번호</p>
                          <p className="text-blue-700">{currentOrder.trackingNumber}</p>
                          <button
                            onClick={() => {
                              toast.success('배송 추적 기능을 준비 중입니다.');
                            }}
                            className="mt-1 text-xs text-blue-600 hover:text-blue-500 underline"
                          >
                            배송 추적하기
                          </button>
                        </div>
                      )}
                      {currentOrder.shippingDate && (
                        <p>📦 배송 시작: {formatDate(currentOrder.shippingDate)}</p>
                      )}
                      {currentOrder.deliveryDate && (
                        <p>✅ 배송 완료: {formatDate(currentOrder.deliveryDate)}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 주문 메모 */}
              {currentOrder.notes && (
                <div className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">주문 메모</h2>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">{currentOrder.notes}</p>
                  </div>
                </div>
              )}

              {/* 취소 사유 */}
              {currentOrder.cancellationReason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <h2 className="text-lg font-medium text-red-900 mb-4">취소 사유</h2>
                  <p className="text-sm text-red-700">{currentOrder.cancellationReason}</p>
                </div>
              )}
            </div>
          </div>

          {/* 결제 정보 및 액션 */}
          <div className="lg:col-span-4 mt-8 lg:mt-0">
            <div className="space-y-6">
              {/* 결제 요약 */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">결제 정보</h2>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">상품 금액</span>
                    <span className="text-sm font-medium">₩{formatPrice(currentOrder.subtotalAmount)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">배송비</span>
                    <span className="text-sm font-medium">
                      {currentOrder.shippingAmount === 0 ? '무료' : `₩${formatPrice(currentOrder.shippingAmount)}`}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">부가세</span>
                    <span className="text-sm font-medium">₩{formatPrice(currentOrder.taxAmount)}</span>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between">
                      <span className="text-base font-medium text-gray-900">총 결제 금액</span>
                      <span className="text-xl font-bold text-gray-900">₩{formatPrice(currentOrder.totalAmount)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">결제 방법</span>
                      <span className="font-medium">
                        {currentOrder.paymentMethod && {
                          card: '신용카드',
                          transfer: '무통장입금',
                          virtual_account: '가상계좌',
                          kakao_pay: '카카오페이',
                          naver_pay: '네이버페이'
                        }[currentOrder.paymentMethod]}
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">주문 일시</span>
                      <span className="font-medium">{formatDate(currentOrder.orderDate)}</span>
                    </div>
                    
                    {currentOrder.paymentDate && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">결제 일시</span>
                        <span className="font-medium">{formatDate(currentOrder.paymentDate)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 액션 버튼들 */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">주문 관리</h2>
                
                <div className="space-y-3">
                  {currentOrder.trackingNumber && (
                    <button
                      onClick={() => {
                        toast.success('배송 추적 기능을 준비 중입니다.');
                      }}
                      className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                    >
                      📦 배송 추적
                    </button>
                  )}
                  
                  {canCancelOrder() && (
                    <button
                      onClick={handleCancelOrder}
                      className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                    >
                      ❌ 주문 취소
                    </button>
                  )}
                  
                  {currentOrder.status === 'delivered' && (
                    <>
                      <button
                        onClick={() => {
                          toast.success('리뷰 작성 기능을 준비 중입니다.');
                        }}
                        className="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
                      >
                        ⭐ 리뷰 작성
                      </button>
                      
                      <button
                        onClick={() => {
                          toast.success('재주문 기능을 준비 중입니다.');
                        }}
                        className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                      >
                        🔄 재주문하기
                      </button>
                    </>
                  )}
                  
                  <button
                    onClick={() => navigate('/customer/products')}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    🛍️ 쇼핑 계속하기
                  </button>
                </div>
              </div>

              {/* 고객 지원 */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-sm font-medium text-gray-900 mb-2">고객 지원</h3>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>📞 고객센터: 1588-1234</p>
                  <p>⏰ 운영시간: 평일 09:00-18:00</p>
                  <p>💬 채팅상담: 24시간 이용 가능</p>
                </div>
                <button className="mt-3 w-full bg-gray-600 text-white text-sm px-3 py-2 rounded hover:bg-gray-700">
                  💬 1:1 문의하기
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
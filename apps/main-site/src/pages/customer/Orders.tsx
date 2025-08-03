import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useOrderStore } from '../../stores/orderStore';
import { useAuthStore } from '../../stores/authStore';
import { Order, OrderStatus } from '../../types/order';

export default function CustomerOrders() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    orders,
    fetchOrdersByUser,
    cancelOrder,
    isLoading,
    error,
    clearError,
  } = useOrderStore();

  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [dateRange, setDateRange] = useState({
    from: '',
    to: ''
  });

  useEffect(() => {
    if (!user) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    if (user.id) {
      fetchOrdersByUser(user.id);
    }
  }, [user]);

  const filteredOrders = orders.filter((order: any) => {
    const matchesStatus = !statusFilter || order.status === statusFilter;
    const matchesDateFrom = !dateRange.from || order.orderDate >= dateRange.from;
    const matchesDateTo = !dateRange.to || order.orderDate <= dateRange.to + 'T23:59:59.999Z';
    
    return matchesStatus && matchesDateFrom && matchesDateTo;
  });

  const handleCancelOrder = async (orderId: string) => {
    const reason = prompt('취소 사유를 입력해주세요:');
    if (!reason) return;

    try {
      await cancelOrder(orderId, reason);
      toast.success('주문이 취소되었습니다.');
      if (user?.id) {
        fetchOrdersByUser(user.id);
      }
    } catch (error: any) {
      toast.error('주문 취소에 실패했습니다.');
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
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
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badges[status]}`}>
        {labels[status]}
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
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badges[status as keyof typeof badges]}`}>
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

  const canCancelOrder = (order: Order) => {
    return ['pending', 'confirmed'].includes(order.status) && order.paymentStatus !== 'refunded';
  };

  if (!user) {
    return null; // useEffect에서 리다이렉트 처리됨
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">주문 내역</h1>
              <p className="mt-2 text-sm text-gray-600">지금까지의 주문 내역을 확인하실 수 있습니다.</p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => navigate('/customer/products')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                쇼핑 계속하기
              </button>
              <button
                onClick={() => navigate('/customer/cart')}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                장바구니
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 필터 */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                주문 상태
              </label>
              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value as OrderStatus | '')}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">전체 상태</option>
                <option value="pending">주문 대기</option>
                <option value="confirmed">주문 확인</option>
                <option value="processing">처리 중</option>
                <option value="shipped">배송 중</option>
                <option value="delivered">배송 완료</option>
                <option value="cancelled">주문 취소</option>
                <option value="returned">반품</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                시작 날짜
              </label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e: any) => setDateRange((prev: any) => ({ ...prev, from: e.target.value }))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                종료 날짜
              </label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e: any) => setDateRange((prev: any) => ({ ...prev, to: e.target.value }))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setStatusFilter('');
                  setDateRange({ from: '', to: '' });
                }}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                필터 초기화
              </button>
            </div>
          </div>
        </div>

        {/* 주문 목록 */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">주문 내역을 불러오는 중...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">주문 내역이 없습니다</h3>
              <p className="mt-1 text-sm text-gray-500">첫 번째 주문을 해보세요.</p>
              <div className="mt-6">
                <button
                  onClick={() => navigate('/customer/products')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  상품 둘러보기
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredOrders.map((order: any) => (
                <div key={order.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        주문번호: {order.orderNumber}
                      </h3>
                      {getStatusBadge(order.status)}
                      {getPaymentStatusBadge(order.paymentStatus)}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        ₩{formatPrice(order.totalAmount)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(order.orderDate)}
                      </p>
                    </div>
                  </div>

                  {/* 주문 상품 목록 */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-4">
                    {order.items.slice(0, 3).map((item: any) => (
                      <div key={item.id} className="flex items-center space-x-3">
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="h-12 w-12 rounded object-cover cursor-pointer"
                          onClick={() => navigate(`/customer/products/${item.productId}`)}
                          onError={(e) => {
                            e.currentTarget.src = '/images/placeholder.jpg';
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p 
                            className="text-sm font-medium text-gray-900 truncate cursor-pointer hover:text-blue-600"
                            onClick={() => navigate(`/customer/products/${item.productId}`)}
                          >
                            {item.productName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {item.quantity}개 × ₩{formatPrice(item.unitPrice)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <div className="flex items-center justify-center">
                        <span className="text-sm text-gray-500">
                          외 {order.items.length - 3}개 상품
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 배송 정보 */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-4 text-sm">
                    <div>
                      <p className="text-gray-600">
                        <span className="font-medium">배송지:</span> {order.shippingAddress.address} {order.shippingAddress.detailAddress}
                      </p>
                      <p className="text-gray-600">
                        <span className="font-medium">받는 분:</span> {order.shippingAddress.recipientName}
                      </p>
                    </div>
                    <div>
                      {order.trackingNumber && (
                        <p className="text-gray-600">
                          <span className="font-medium">운송장 번호:</span> {order.trackingNumber}
                        </p>
                      )}
                      {order.paymentMethod && (
                        <p className="text-gray-600">
                          <span className="font-medium">결제 방법:</span> {
                            {
                              card: '신용카드',
                              transfer: '무통장입금',
                              virtual_account: '가상계좌',
                              kakao_pay: '카카오페이',
                              naver_pay: '네이버페이'
                            }[order.paymentMethod]
                          }
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 배송 진행 상황 */}
                  {order.status === 'shipped' && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                          <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1V8a1 1 0 00-1-1h-3z"/>
                        </svg>
                        <span className="text-sm font-medium text-green-800">
                          배송 중 - {order.shippingDate && `${formatDate(order.shippingDate)} 발송`}
                        </span>
                      </div>
                    </div>
                  )}

                  {order.status === 'delivered' && (
                    <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-gray-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                        </svg>
                        <span className="text-sm font-medium text-gray-800">
                          배송 완료 - {order.deliveryDate && formatDate(order.deliveryDate)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 액션 버튼들 */}
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => navigate(`/customer/orders/${order.id}`)}
                      className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                    >
                      상세보기
                    </button>
                    
                    {order.trackingNumber && (
                      <button
                        onClick={() => {
                          toast.success('배송 추적 기능을 준비 중입니다.');
                        }}
                        className="text-green-600 hover:text-green-500 text-sm font-medium"
                      >
                        배송 추적
                      </button>
                    )}
                    
                    {canCancelOrder(order) && (
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        className="text-red-600 hover:text-red-500 text-sm font-medium"
                      >
                        주문 취소
                      </button>
                    )}
                    
                    {order.status === 'delivered' && (
                      <button
                        onClick={() => {
                          toast.success('리뷰 작성 기능을 준비 중입니다.');
                        }}
                        className="text-purple-600 hover:text-purple-500 text-sm font-medium"
                      >
                        리뷰 작성
                      </button>
                    )}

                    {order.status === 'delivered' && (
                      <button
                        onClick={() => {
                          // 재주문 기능 (장바구니에 동일 상품 추가)
                          toast.success('재주문 기능을 준비 중입니다.');
                        }}
                        className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                      >
                        재주문
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
                <button
                  onClick={clearError}
                  className="mt-2 text-sm text-red-600 hover:text-red-500"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
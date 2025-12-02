/**
 * Order Detail Page
 * R-6-9: Detailed view of a single order
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  MapPin,
  CreditCard,
  Truck,
  AlertCircle,
  XCircle,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToastContext } from '../../../contexts/ToastProvider';
import { orderService, type OrderDetail as OrderDetailType } from '../../../services/orderService';
import { OrderTimeline } from './OrderTimeline';
import { OrderDetailSkeleton } from './OrderDetailSkeleton';

export const OrderDetail: React.FC = () => {
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const toast = useToastContext();

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderDetailType | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'KRW') => {
    if (currency === 'KRW') {
      return `₩${amount.toLocaleString()}`;
    }
    return `${amount.toLocaleString()} ${currency}`;
  };

  // Fetch order detail
  useEffect(() => {
    const fetchOrder = async () => {
      if (!user || !orderId) return;

      setLoading(true);
      setNotFound(false);

      try {
        const response = await orderService.getOrderDetail(orderId);

        if (response.success) {
          setOrder(response.data);
        }
      } catch (error: any) {
        console.error('Failed to fetch order:', error);

        if (error.response?.status === 404) {
          setNotFound(true);
        } else {
          toast.error(error.response?.data?.message || '주문 정보를 불러오는데 실패했습니다.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchOrder();
    }
  }, [user, orderId, authLoading, toast]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      toast.warning('로그인이 필요합니다.');
      navigate('/login?redirect=/my-account/orders');
    }
  }, [authLoading, user, navigate, toast]);

  // Handle cancel order (UI only - backend implementation in R-7)
  const handleCancelOrder = () => {
    toast.info('주문 취소 기능은 곧 제공 예정입니다.');
  };

  // Handle return order (UI only - backend implementation in R-7)
  const handleReturnOrder = () => {
    toast.info('반품 신청 기능은 곧 제공 예정입니다.');
  };

  // Loading or not authenticated
  if (authLoading || !user) {
    return null;
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate('/my-account/orders')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            주문 목록으로
          </button>
          <OrderDetailSkeleton />
        </div>
      </div>
    );
  }

  // Not found
  if (notFound || !order) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate('/my-account/orders')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            주문 목록으로
          </button>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">주문을 찾을 수 없습니다</h3>
            <p className="text-gray-600 mb-6">
              해당 주문 정보를 찾을 수 없거나 접근 권한이 없습니다.
            </p>
            <button
              onClick={() => navigate('/my-account/orders')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              주문 목록으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  const orderDate = new Date(order.createdAt);
  const formattedDate = orderDate.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/my-account/orders')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          주문 목록으로
        </button>

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">주문 상세</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>주문번호: {order.orderNumber}</span>
                <span>•</span>
                <span>{formattedDate}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {order.isCancellable && (
                <button
                  onClick={handleCancelOrder}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                >
                  <XCircle className="w-4 h-4" />
                  주문 취소
                </button>
              )}
              {order.isReturnable && (
                <button
                  onClick={handleReturnOrder}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  <RotateCcw className="w-4 h-4" />
                  반품 신청
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <OrderTimeline events={order.statusTimeline} currentStatus={order.status} />

        {/* Main Content */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5" />
                주문 상품
              </h2>

              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-4 pb-4 border-b border-gray-100 last:border-0">
                    {/* Product Image */}
                    <div className="w-20 h-20 bg-gray-100 rounded flex-shrink-0">
                      {item.productImage ? (
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                          No Image
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-1">{item.productName}</h3>
                      {item.productBrand && (
                        <p className="text-xs text-gray-500 mb-1">{item.productBrand}</p>
                      )}
                      {item.variationName && (
                        <p className="text-xs text-gray-600 mb-1">옵션: {item.variationName}</p>
                      )}
                      <p className="text-sm text-gray-600">수량: {item.quantity}개</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        {formatCurrency(item.totalPrice, order.currency)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                배송지 정보
              </h2>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-900">{order.shippingAddress.recipientName}</span>
                </div>
                <div className="text-gray-600">{order.shippingAddress.phone}</div>
                {order.shippingAddress.email && (
                  <div className="text-gray-600">{order.shippingAddress.email}</div>
                )}
                <div className="text-gray-700 mt-3">
                  <div>({order.shippingAddress.zipCode})</div>
                  <div>{order.shippingAddress.address}</div>
                  <div>{order.shippingAddress.detailAddress}</div>
                </div>
                {order.shippingAddress.deliveryRequest && (
                  <div className="mt-3 p-3 bg-gray-50 rounded text-gray-600">
                    <span className="font-medium text-gray-700">배송 메모:</span>{' '}
                    {order.shippingAddress.deliveryRequest}
                  </div>
                )}
              </div>
            </div>

            {/* Shipping Tracking */}
            {(order.shippingCarrier || order.trackingNumber) && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  배송 추적
                </h2>

                <div className="space-y-2 text-sm">
                  {order.shippingCarrier && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">택배사</span>
                      <span className="font-medium text-gray-900">{order.shippingCarrier}</span>
                    </div>
                  )}
                  {order.trackingNumber && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">운송장번호</span>
                      <span className="font-medium text-gray-900">{order.trackingNumber}</span>
                    </div>
                  )}
                  {order.trackingUrl && (
                    <div className="mt-3">
                      <a
                        href={order.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-center px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                      >
                        배송 조회하기
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">결제 정보</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">상품 금액</span>
                  <span className="text-gray-900">
                    {formatCurrency(order.summary.subtotal, order.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">배송비</span>
                  <span className="text-gray-900">
                    {order.summary.shipping === 0
                      ? '무료'
                      : formatCurrency(order.summary.shipping, order.currency)}
                  </span>
                </div>
                {order.summary.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>할인</span>
                    <span>-{formatCurrency(order.summary.discount, order.currency)}</span>
                  </div>
                )}
                {order.summary.tax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">세금</span>
                    <span className="text-gray-900">
                      {formatCurrency(order.summary.tax, order.currency)}
                    </span>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-3 flex justify-between text-lg font-bold">
                  <span className="text-gray-900">총 결제 금액</span>
                  <span className="text-blue-600">
                    {formatCurrency(order.summary.total, order.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                결제 수단
              </h2>

              <div className="space-y-2 text-sm">
                {order.paymentMethod && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">결제 방법</span>
                    <span className="font-medium text-gray-900">
                      {order.paymentMethod === 'card' ? '카드' : order.paymentMethod}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">결제 상태</span>
                  <span
                    className={`font-medium ${
                      order.paymentStatus === 'completed'
                        ? 'text-green-600'
                        : order.paymentStatus === 'failed'
                        ? 'text-red-600'
                        : 'text-yellow-600'
                    }`}
                  >
                    {order.paymentStatus === 'completed'
                      ? '결제 완료'
                      : order.paymentStatus === 'failed'
                      ? '결제 실패'
                      : order.paymentStatus === 'refunded'
                      ? '환불됨'
                      : '결제 대기'}
                  </span>
                </div>
                {order.paymentProvider && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">결제 대행사</span>
                    <span className="text-gray-700">{order.paymentProvider}</span>
                  </div>
                )}
                {order.paidAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">결제 일시</span>
                    <span className="text-gray-700">
                      {new Date(order.paidAt).toLocaleString('ko-KR')}
                    </span>
                  </div>
                )}
              </div>

              {/* Refund Info */}
              {order.refundAmount && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">환불 금액</span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(order.refundAmount, order.currency)}
                    </span>
                  </div>
                  {order.refundDate && (
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-gray-600">환불 일시</span>
                      <span className="text-gray-700">
                        {new Date(order.refundDate).toLocaleString('ko-KR')}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Customer Notes */}
            {order.customerNotes && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">주문 메모</h2>
                <p className="text-sm text-gray-700">{order.customerNotes}</p>
              </div>
            )}

            {/* Cancellation/Return Reason */}
            {(order.cancellationReason || order.returnReason) && (
              <div className="bg-red-50 rounded-lg border border-red-200 p-6">
                <h2 className="text-xl font-semibold text-red-900 mb-2">
                  {order.cancellationReason ? '취소 사유' : '반품 사유'}
                </h2>
                <p className="text-sm text-red-700">
                  {order.cancellationReason || order.returnReason}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;

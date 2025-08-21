import { useState, FC } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Package,
  User,
  CreditCard,
  Truck,
  MessageSquare,
  Download,
  Printer,
  DollarSign,
  MapPin,
  Phone,
  Mail,
  FileText,
  AlertCircle
} from 'lucide-react';
import { useOrder, useUpdateOrderStatus, useRefundOrder } from '@/hooks/useOrders';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale/ko';

const OrderDetail: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [orderNote, setOrderNote] = useState('');

  // API Hooks
  const { data: orderData, isLoading } = useOrder(id || '');
  const updateOrderStatus = useUpdateOrderStatus();
  const refundOrder = useRefundOrder();

  const order = orderData?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">주문을 찾을 수 없습니다</h3>
        <button
          onClick={() => navigate('/orders')}
          className="text-blue-600 hover:text-blue-800"
        >
          주문 목록으로 돌아가기
        </button>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    shipped: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-800',
    refunded: 'bg-red-100 text-red-800'
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: '대기중',
      processing: '처리중',
      shipped: '배송중',
      completed: '완료',
      cancelled: '취소됨',
      refunded: '환불됨'
    };
    return labels[status] || status;
  };

  const handleStatusChange = async (newStatus: string) => {
    await updateOrderStatus.mutateAsync({
      orderId: order.id,
      status: newStatus,
      note: orderNote || undefined
    });
    setOrderNote('');
  };

  const handleRefund = async () => {
    if (!refundAmount || parseFloat(refundAmount) <= 0) return;

    await refundOrder.mutateAsync({
      orderId: order.id,
      amount: parseFloat(refundAmount),
      reason: refundReason || undefined
    });

    setShowRefundModal(false);
    setRefundAmount('');
    setRefundReason('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/orders')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              주문 #{order.orderNumber}
            </h1>
            <p className="text-gray-600 mt-1">
              {format(new Date(order.createdAt), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center px-4 py-2 border rounded-lg hover:bg-gray-50">
            <Printer className="w-4 h-4 mr-2" />
            인쇄
          </button>
          <button className="flex items-center px-4 py-2 border rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4 mr-2" />
            다운로드
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Package className="w-5 h-5" />
                주문 상품
              </h2>
            </div>
            <div className="p-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left pb-3 text-sm font-medium text-gray-500">상품</th>
                    <th className="text-center pb-3 text-sm font-medium text-gray-500">수량</th>
                    <th className="text-right pb-3 text-sm font-medium text-gray-500">단가</th>
                    <th className="text-right pb-3 text-sm font-medium text-gray-500">합계</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items?.map((item: any) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center">
                            <Package className="w-6 h-6 text-gray-400" />
                          </div>
                          <div>
                            <p className="font-medium">{item.productName || '상품명 없음'}</p>
                            <p className="text-sm text-gray-500">SKU: {item.productSku || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-4">{item.quantity}</td>
                      <td className="text-right py-4">{formatCurrency(item.price)}</td>
                      <td className="text-right py-4 font-medium">
                        {formatCurrency(item.price * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="text-right pt-4 pb-2">소계:</td>
                    <td className="text-right pt-4 pb-2 font-medium">
                      {formatCurrency(order.subtotal)}
                    </td>
                  </tr>
                  {order.shipping > 0 && (
                    <tr>
                      <td colSpan={3} className="text-right pb-2">배송비:</td>
                      <td className="text-right pb-2">
                        {formatCurrency(order.shipping)}
                      </td>
                    </tr>
                  )}
                  {order.discount > 0 && (
                    <tr>
                      <td colSpan={3} className="text-right pb-2">할인:</td>
                      <td className="text-right pb-2 text-red-600">
                        -{formatCurrency(order.discount)}
                      </td>
                    </tr>
                  )}
                  <tr className="border-t">
                    <td colSpan={3} className="text-right pt-4 text-lg font-semibold">
                      총액:
                    </td>
                    <td className="text-right pt-4 text-lg font-semibold">
                      {formatCurrency(order.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Customer Information */}
          <div className="grid grid-cols-2 gap-6">
            {/* Billing Address */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  청구지 정보
                </h2>
              </div>
              <div className="p-6 space-y-3">
                <div>
                  <p className="font-medium">{order.customerName}</p>
                  <p className="text-sm text-gray-600">{order.billingAddress?.company}</p>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {order.billingAddress?.address1}
                  </p>
                  {order.billingAddress?.address2 && (
                    <p className="ml-6">{order.billingAddress.address2}</p>
                  )}
                  <p className="ml-6">
                    {order.billingAddress?.city} {order.billingAddress?.state} {order.billingAddress?.postalCode}
                  </p>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {order.billingAddress?.phone}
                  </p>
                  <p className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {order.billingAddress?.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  배송지 정보
                </h2>
              </div>
              <div className="p-6 space-y-3">
                <div>
                  <p className="font-medium">{order.customerName}</p>
                  <p className="text-sm text-gray-600">{order.shippingAddress?.company}</p>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {order.shippingAddress?.address1}
                  </p>
                  {order.shippingAddress?.address2 && (
                    <p className="ml-6">{order.shippingAddress.address2}</p>
                  )}
                  <p className="ml-6">
                    {order.shippingAddress?.city} {order.shippingAddress?.state} {order.shippingAddress?.postalCode}
                  </p>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {order.shippingAddress?.phone}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Timeline */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                주문 활동
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="text-center text-gray-500 py-4">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">주문 활동이 없습니다</p>
                </div>
              </div>

              {/* Add Note */}
              <div className="mt-6 pt-6 border-t">
                <div className="flex gap-3">
                  <textarea
                    value={orderNote}
                    onChange={(e: any) => setOrderNote(e.target.value)}
                    placeholder="주문 메모 추가..."
                    className="flex-1 px-3 py-2 border rounded-lg resize-none"
                    rows={2}
                  />
                  <button
                    onClick={() => {
                      if (orderNote.trim()) {
                        handleStatusChange(order.status);
                      }
                    }}
                    disabled={!orderNote.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    추가
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Status */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">주문 상태</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  현재 상태
                </label>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.status]}`}>
                  {getStatusLabel(order.status)}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  상태 변경
                </label>
                <select
                  value={order.status}
                  onChange={(e: any) => handleStatusChange(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="pending">대기중</option>
                  <option value="processing">처리중</option>
                  <option value="shipped">배송중</option>
                  <option value="completed">완료</option>
                  <option value="cancelled">취소</option>
                  <option value="refunded">환불</option>
                </select>
              </div>
              {(order.status === 'completed' || order.status === 'cancelled') && (
                <button
                  onClick={() => setShowRefundModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <DollarSign className="w-4 h-4" />
                  환불 처리
                </button>
              )}
            </div>
          </div>

          {/* Payment Information */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                결제 정보
              </h2>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">결제 방법</span>
                <span className="font-medium">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">결제 상태</span>
                <span className={`font-medium ${order.paymentStatus === 'completed' ? 'text-green-600' : 'text-red-600'}`}>
                  {order.paymentStatus === 'completed' ? '결제완료' : '미결제'}
                </span>
              </div>
              {order.transactionId && (
                <div className="flex justify-between">
                  <span className="text-gray-600">거래 ID</span>
                  <span className="font-mono text-sm">{order.transactionId}</span>
                </div>
              )}
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <User className="w-5 h-5" />
                고객 정보
              </h2>
            </div>
            <div className="p-6 space-y-3">
              {order.customerId ? (
                <>
                  <div>
                    <p className="font-medium">{order.customerName}</p>
                    <p className="text-sm text-gray-600">{order.customerEmail}</p>
                  </div>
                  <div className="pt-3 border-t">
                    <a
                      href={`#/users/${order.customerId}`}
                      onClick={(e: any) => {
                        e.preventDefault();
                        navigate(`/users/${order.customerId}`);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      고객 프로필 보기 →
                    </a>
                  </div>
                </>
              ) : (
                <p className="text-gray-500">게스트 주문</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">환불 처리</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  환불 금액
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2">₩</span>
                  <input
                    type="number"
                    value={refundAmount}
                    onChange={(e: any) => setRefundAmount(e.target.value)}
                    placeholder={order.total.toString() as any}
                    max={order.total}
                    className="w-full pl-8 pr-3 py-2 border rounded-lg"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  최대 환불 가능 금액: {formatCurrency(order.total)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  환불 사유
                </label>
                <textarea
                  value={refundReason}
                  onChange={(e: any) => setRefundReason(e.target.value)}
                  placeholder="환불 사유를 입력하세요..."
                  className="w-full px-3 py-2 border rounded-lg resize-none"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowRefundModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleRefund}
                disabled={!refundAmount || parseFloat(refundAmount) <= 0}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                환불 처리
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetail;
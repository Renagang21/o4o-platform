import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Package, User, MapPin, CreditCard, Calendar, FileText, Truck, Edit2, Check, X } from 'lucide-react';

/**
 * Admin Order Detail Page (Phase 5)
 *
 * Administrator/Operator page for viewing and managing order details
 * - View order details
 * - Change order status
 * - Update shipping information
 * - View order timeline/events
 */

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  productImage: string;
  productBrand: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  supplierId: string;
  supplierName: string;
  sellerId: string;
  sellerName: string;
  // Phase PD-2: Commission info
  commissionType?: 'rate' | 'fixed';
  commissionRate?: number;
  commissionAmount?: number;
}

interface Address {
  recipientName: string;
  phone: string;
  email: string;
  zipCode: string;
  address: string;
  detailAddress: string;
  city: string;
  country: string;
}

interface OrderEvent {
  id: string;
  type: string;
  prevStatus?: string;
  newStatus?: string;
  message: string;
  actorName?: string;
  actorRole?: string;
  createdAt: string;
}

interface Order {
  id: string;
  orderNumber: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  items: OrderItem[];
  billingAddress: Address;
  shippingAddress: Address;
  summary: {
    subtotal: number;
    shipping: number;
    tax: number;
    discount: number;
    total: number;
  };
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  paymentMethod: 'card' | 'bank_transfer' | 'virtual_account' | 'cash';
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  shippingCarrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  paymentDate: string | null;
  customerNotes: string;
  adminNotes: string;
  createdAt: string;
  updatedAt: string;
  events?: OrderEvent[];
}

interface OrderResponse {
  success: boolean;
  data: Order;
}

const ORDER_STATUSES = [
  { value: 'pending', label: '대기' },
  { value: 'confirmed', label: '확인' },
  { value: 'processing', label: '처리중' },
  { value: 'shipped', label: '배송중' },
  { value: 'delivered', label: '배송완료' },
  { value: 'cancelled', label: '취소' },
  { value: 'returned', label: '반품' }
];

const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // Status change state
  const [showStatusChange, setShowStatusChange] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusChanging, setStatusChanging] = useState(false);

  // Shipping edit state
  const [editingShipping, setEditingShipping] = useState(false);
  const [shippingData, setShippingData] = useState({
    shippingCarrier: '',
    trackingNumber: '',
    trackingUrl: ''
  });
  const [shippingUpdating, setShippingUpdating] = useState(false);

  useEffect(() => {
    if (id) {
      fetchOrder();
    }
  }, [id]);

  useEffect(() => {
    if (order) {
      setShippingData({
        shippingCarrier: order.shippingCarrier || '',
        trackingNumber: order.trackingNumber || '',
        trackingUrl: order.trackingUrl || ''
      });
    }
  }, [order]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await authClient.api.get<OrderResponse>(
        `/admin/orders/${id}`
      );

      if (response.data.success) {
        setOrder(response.data.data);
      } else {
        toast.error('주문 정보를 불러올 수 없습니다');
        navigate('/admin/orders');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('주문 조회 중 오류가 발생했습니다');
      navigate('/admin/orders');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async () => {
    if (!newStatus || !order) return;

    try {
      setStatusChanging(true);
      const response = await authClient.api.patch(
        `/admin/orders/${order.id}/status`,
        {
          status: newStatus,
          message: statusMessage || undefined
        }
      );

      if (response.data.success) {
        toast.success('주문 상태가 변경되었습니다');
        setShowStatusChange(false);
        setNewStatus('');
        setStatusMessage('');
        await fetchOrder(); // Refresh order data
      }
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error(error.response?.data?.message || '상태 변경 중 오류가 발생했습니다');
    } finally {
      setStatusChanging(false);
    }
  };

  const handleShippingUpdate = async () => {
    if (!order) return;

    try {
      setShippingUpdating(true);
      const response = await authClient.api.patch(
        `/admin/orders/${order.id}/shipping`,
        shippingData
      );

      if (response.data.success) {
        toast.success('배송 정보가 업데이트되었습니다');
        setEditingShipping(false);
        await fetchOrder(); // Refresh order data
      }
    } catch (error: any) {
      console.error('Error updating shipping:', error);
      toast.error(error.response?.data?.message || '배송 정보 업데이트 중 오류가 발생했습니다');
    } finally {
      setShippingUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-purple-100 text-purple-800',
      shipped: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      returned: 'bg-orange-100 text-orange-800'
    };

    const statusLabels: Record<string, string> = {
      pending: '대기',
      confirmed: '확인',
      processing: '처리중',
      shipped: '배송중',
      delivered: '배송완료',
      cancelled: '취소',
      returned: '반품'
    };

    return (
      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {statusLabels[status] || status}
      </span>
    );
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      card: '카드',
      bank_transfer: '계좌이체',
      virtual_account: '가상계좌',
      cash: '현금'
    };
    return labels[method] || method;
  };

  const getPaymentStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800'
    };

    const labels: Record<string, string> = {
      pending: '대기',
      completed: '완료',
      failed: '실패',
      refunded: '환불'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-gray-500">주문을 찾을 수 없습니다</p>
          <button
            onClick={() => navigate('/admin/orders')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/orders')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          주문 목록으로 돌아가기
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">주문 상세</h1>
            <p className="mt-1 text-sm text-gray-600">주문번호: {order.orderNumber}</p>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(order.status)}
            {getPaymentStatusBadge(order.paymentStatus)}
            <button
              onClick={() => setShowStatusChange(!showStatusChange)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              상태 변경
            </button>
          </div>
        </div>
      </div>

      {/* Status Change Section */}
      {showStatusChange && (
        <div className="mb-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">주문 상태 변경</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                새 상태
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">상태 선택...</option>
                {ORDER_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                메모 (선택사항)
              </label>
              <input
                type="text"
                value={statusMessage}
                onChange={(e) => setStatusMessage(e.target.value)}
                placeholder="상태 변경 사유..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleStatusChange}
              disabled={!newStatus || statusChanging}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {statusChanging ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  처리중...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  변경 적용
                </>
              )}
            </button>
            <button
              onClick={() => {
                setShowStatusChange(false);
                setNewStatus('');
                setStatusMessage('');
              }}
              disabled={statusChanging}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
            >
              <X className="w-4 h-4 inline mr-1" />
              취소
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Package className="w-5 h-5 mr-2" />
                주문 상품
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상품</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">공급자</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">판매자</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">수량</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">단가</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">합계</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">커미션 (PD-2)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {item.productImage && (
                            <img
                              src={item.productImage}
                              alt={item.productName}
                              className="w-12 h-12 object-cover rounded mr-3"
                            />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                            {item.productBrand && (
                              <div className="text-xs text-gray-500">{item.productBrand}</div>
                            )}
                            {item.productSku && (
                              <div className="text-xs text-gray-400">SKU: {item.productSku}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.supplierName}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.sellerName}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">{item.quantity}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">{formatCurrency(item.totalPrice)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        {item.commissionAmount != null ? (
                          <div>
                            <div className="font-medium text-green-700">{formatCurrency(item.commissionAmount)}</div>
                            <div className="text-xs text-gray-500">
                              {item.commissionType === 'rate'
                                ? `${((item.commissionRate || 0) * 100).toFixed(1)}%`
                                : '고정금액'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Order Summary */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="max-w-sm ml-auto space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">상품 금액</span>
                  <span className="font-medium">{formatCurrency(order.summary.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">배송비</span>
                  <span className="font-medium">{formatCurrency(order.summary.shipping)}</span>
                </div>
                {order.summary.tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">세금</span>
                    <span className="font-medium">{formatCurrency(order.summary.tax)}</span>
                  </div>
                )}
                {order.summary.discount > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>할인</span>
                    <span className="font-medium">-{formatCurrency(order.summary.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300">
                  <span>총 주문금액</span>
                  <span className="text-blue-600">{formatCurrency(order.summary.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {(order.customerNotes || order.adminNotes) && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                메모
              </h2>
              {order.customerNotes && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-1">고객 메모</h3>
                  <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded">{order.customerNotes}</p>
                </div>
              )}
              {order.adminNotes && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-1">내부 메모</h3>
                  <p className="text-sm text-gray-600 p-3 bg-yellow-50 rounded">{order.adminNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              고객 정보
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-600">이름:</span>
                <span className="ml-2 font-medium">{order.buyerName}</span>
              </div>
              <div>
                <span className="text-gray-600">이메일:</span>
                <span className="ml-2 font-medium">{order.buyerEmail}</span>
              </div>
              <div>
                <span className="text-gray-600">연락처:</span>
                <span className="ml-2 font-medium">{order.shippingAddress.phone}</span>
              </div>
            </div>
          </div>

          {/* Shipping Info - Phase 5 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Truck className="w-5 h-5 mr-2" />
                배송 정보
              </h2>
              {!editingShipping && (
                <button
                  onClick={() => setEditingShipping(true)}
                  className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                >
                  <Edit2 className="w-4 h-4" />
                  수정
                </button>
              )}
            </div>

            {editingShipping ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    택배사
                  </label>
                  <input
                    type="text"
                    value={shippingData.shippingCarrier}
                    onChange={(e) => setShippingData({ ...shippingData, shippingCarrier: e.target.value })}
                    placeholder="CJ대한통운, 로젠택배 등"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    운송장 번호
                  </label>
                  <input
                    type="text"
                    value={shippingData.trackingNumber}
                    onChange={(e) => setShippingData({ ...shippingData, trackingNumber: e.target.value })}
                    placeholder="운송장 번호"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    추적 URL (선택)
                  </label>
                  <input
                    type="url"
                    value={shippingData.trackingUrl}
                    onChange={(e) => setShippingData({ ...shippingData, trackingUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleShippingUpdate}
                    disabled={shippingUpdating}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {shippingUpdating ? '저장중...' : '저장'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingShipping(false);
                      setShippingData({
                        shippingCarrier: order.shippingCarrier || '',
                        trackingNumber: order.trackingNumber || '',
                        trackingUrl: order.trackingUrl || ''
                      });
                    }}
                    disabled={shippingUpdating}
                    className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                {order.shippingCarrier ? (
                  <>
                    <div>
                      <span className="text-gray-600">택배사:</span>
                      <span className="ml-2 font-medium">{order.shippingCarrier}</span>
                    </div>
                    {order.trackingNumber && (
                      <div>
                        <span className="text-gray-600">운송장:</span>
                        <span className="ml-2 font-medium">{order.trackingNumber}</span>
                      </div>
                    )}
                    {order.trackingUrl && (
                      <div>
                        <a
                          href={order.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          배송 추적 →
                        </a>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-gray-500 text-sm">배송 정보 없음</p>
                )}
              </div>
            )}
          </div>

          {/* Shipping Address */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              배송지 정보
            </h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">{order.shippingAddress.recipientName}</span>
              </div>
              <div className="text-gray-600">{order.shippingAddress.phone}</div>
              <div className="text-gray-600">
                [{order.shippingAddress.zipCode}]
              </div>
              <div className="text-gray-600">
                {order.shippingAddress.address}
              </div>
              <div className="text-gray-600">
                {order.shippingAddress.detailAddress}
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              결제 정보
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-600">결제 방법:</span>
                <span className="ml-2 font-medium">{getPaymentMethodLabel(order.paymentMethod)}</span>
              </div>
              <div>
                <span className="text-gray-600">결제 상태:</span>
                <span className="ml-2">{getPaymentStatusBadge(order.paymentStatus)}</span>
              </div>
              {order.paymentDate && (
                <div>
                  <span className="text-gray-600">결제 일시:</span>
                  <span className="ml-2 font-medium">{formatDate(order.paymentDate)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Order Timeline - Phase 5 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              주문 이력
            </h2>
            <div className="space-y-4">
              {order.events && order.events.length > 0 ? (
                <div className="space-y-3">
                  {order.events.map((event) => (
                    <div key={event.id} className="border-l-2 border-blue-500 pl-3 pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{event.message}</p>
                          {event.actorName && (
                            <p className="text-xs text-gray-500">
                              {event.actorName} {event.actorRole && `(${event.actorRole})`}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(event.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-600">주문 일시:</span>
                    <div className="font-medium mt-1">{formatDate(order.createdAt)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">최종 수정:</span>
                    <div className="font-medium mt-1">{formatDate(order.updatedAt)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;

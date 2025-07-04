import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft,
  Printer,
  Mail,
  Package,
  Truck,
  CreditCard,
  MapPin,
  Phone,
  Calendar,
  DollarSign,
  Edit,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react'
import { Order, OrderStatus } from '@/types/ecommerce'
import { EcommerceApi } from '@/api/ecommerceApi'
import toast from 'react-hot-toast'

const OrderDetail: React.FC = () => {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [refundData, setRefundData] = useState({
    amount: 0,
    reason: '',
    items: [] as Array<{ orderItemId: string; quantity: number; amount: number }>
  })

  useEffect(() => {
    if (orderId) {
      loadOrder(orderId)
    }
  }, [orderId])

  const loadOrder = async (id: string) => {
    try {
      setLoading(true)
      const response = await EcommerceApi.getOrder(id)
      setOrder(response.data)
    } catch (error) {
      console.error('Failed to load order:', error)
      toast.error('주문 정보를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (status: OrderStatus, note?: string) => {
    if (!order) return

    try {
      setUpdating(true)
      await EcommerceApi.updateOrderStatus(order.id, status, note)
      setOrder(prev => prev ? { ...prev, status } : null)
      toast.success('주문 상태가 변경되었습니다.')
    } catch (error) {
      console.error('Failed to update order status:', error)
      toast.error('주문 상태 변경에 실패했습니다.')
    } finally {
      setUpdating(false)
    }
  }

  const handleRefund = async () => {
    if (!order) return

    try {
      await EcommerceApi.refundOrder(
        order.id,
        refundData.amount,
        refundData.reason,
        refundData.items.length > 0 ? refundData.items : undefined
      )
      toast.success('환불이 처리되었습니다.')
      loadOrder(order.id)
      setShowRefundModal(false)
    } catch (error) {
      console.error('Failed to process refund:', error)
      toast.error('환불 처리에 실패했습니다.')
    }
  }

  const getStatusBadge = (status: OrderStatus) => {
    const configs = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: '대기중' },
      processing: { color: 'bg-blue-100 text-blue-800', icon: Package, label: '처리중' },
      'on-hold': { color: 'bg-orange-100 text-orange-800', icon: AlertTriangle, label: '보류' },
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: '완료' },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle, label: '취소' },
      refunded: { color: 'bg-purple-100 text-purple-800', icon: RefreshCw, label: '환불' },
      failed: { color: 'bg-red-100 text-red-800', icon: XCircle, label: '실패' }
    }

    const config = configs[status] || { color: 'bg-gray-100 text-gray-800', icon: AlertTriangle, label: status }
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-full ${config.color}`}>
        <Icon className="w-4 h-4" />
        {config.label}
      </span>
    )
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="loading-spinner" />
        <span className="ml-2 text-gray-600">로딩 중...</span>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-gray-900 mb-2">주문을 찾을 수 없습니다</h2>
        <p className="text-gray-500">요청하신 주문이 존재하지 않거나 삭제되었습니다.</p>
        <button
          onClick={() => navigate('/woocommerce/orders')}
          className="wp-button-primary mt-4"
        >
          주문 목록으로 돌아가기
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/woocommerce/orders')}
            className="wp-button-secondary"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              주문 #{order.orderNumber}
            </h1>
            <p className="text-gray-600 mt-1">
              {formatDate(order.createdAt)}에 주문됨
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="wp-button-secondary"
          >
            <Printer className="w-4 h-4 mr-2" />
            인쇄
          </button>
          
          <button
            onClick={() => setShowRefundModal(true)}
            className="wp-button-secondary"
            disabled={order.status === 'refunded' || order.status === 'cancelled'}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            환불
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Main content */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Order Status */}
          <div className="wp-card">
            <div className="wp-card-header">
              <h3 className="wp-card-title">주문 상태</h3>
            </div>
            <div className="wp-card-body">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {getStatusBadge(order.status)}
                  
                  <div className="text-sm text-gray-600">
                    결제상태: 
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                      order.paymentStatus === 'completed' ? 'bg-green-100 text-green-800' :
                      order.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {order.paymentStatus}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
                    disabled={updating}
                    className="wp-select"
                  >
                    <option value="pending">대기중</option>
                    <option value="processing">처리중</option>
                    <option value="on-hold">보류</option>
                    <option value="completed">완료</option>
                    <option value="cancelled">취소</option>
                    <option value="refunded">환불</option>
                    <option value="failed">실패</option>
                  </select>
                  
                  {updating && <div className="loading-spinner w-4 h-4" />}
                </div>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="wp-card">
            <div className="wp-card-header">
              <h3 className="wp-card-title">주문 상품</h3>
            </div>
            <div className="wp-card-body p-0">
              <div className="overflow-x-auto">
                <table className="wp-table">
                  <thead>
                    <tr>
                      <th>상품</th>
                      <th>가격</th>
                      <th>수량</th>
                      <th>합계</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div>
                            <div className="font-medium text-gray-900">{item.productName}</div>
                            {item.productSku && (
                              <div className="text-sm text-gray-500">SKU: {item.productSku}</div>
                            )}
                            {item.meta && item.meta.length > 0 && (
                              <div className="text-sm text-gray-500">
                                {item.meta.map(meta => (
                                  <div key={meta.key}>
                                    {meta.displayKey || meta.key}: {meta.displayValue || meta.value}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>{formatPrice(item.price)}</td>
                        <td>{item.quantity}</td>
                        <td className="font-medium">{formatPrice(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Order Totals */}
          <div className="wp-card">
            <div className="wp-card-header">
              <h3 className="wp-card-title">주문 합계</h3>
            </div>
            <div className="wp-card-body">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>소계:</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                
                {order.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>할인:</span>
                    <span>-{formatPrice(order.discount)}</span>
                  </div>
                )}
                
                {order.shipping > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>배송비:</span>
                    <span>{formatPrice(order.shipping)}</span>
                  </div>
                )}
                
                {order.tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>세금:</span>
                    <span>{formatPrice(order.tax)}</span>
                  </div>
                )}
                
                <hr className="my-2" />
                
                <div className="flex justify-between text-lg font-bold">
                  <span>총합계:</span>
                  <span>{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Refunds */}
          {order.refunds && order.refunds.length > 0 && (
            <div className="wp-card">
              <div className="wp-card-header">
                <h3 className="wp-card-title">환불 내역</h3>
              </div>
              <div className="wp-card-body">
                <div className="space-y-4">
                  {order.refunds.map((refund) => (
                    <div key={refund.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium">{formatPrice(refund.amount)} 환불</div>
                        <div className="text-sm text-gray-500">{formatDate(refund.refundedAt)}</div>
                      </div>
                      {refund.reason && (
                        <div className="text-sm text-gray-600 mb-2">사유: {refund.reason}</div>
                      )}
                      <div className="text-sm text-gray-500">처리자: {refund.refundedBy}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Customer Info */}
          <div className="wp-card">
            <div className="wp-card-header">
              <h3 className="wp-card-title">고객 정보</h3>
            </div>
            <div className="wp-card-body space-y-3">
              <div>
                <div className="font-medium text-gray-900">{order.customerName}</div>
                <div className="text-sm text-gray-600">{order.customerEmail}</div>
              </div>
              
              {order.customerNote && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">고객 메모:</div>
                  <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    {order.customerNote}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Billing Address */}
          <div className="wp-card">
            <div className="wp-card-header">
              <h3 className="wp-card-title flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                청구지 주소
              </h3>
            </div>
            <div className="wp-card-body">
              <div className="text-sm space-y-1">
                <div className="font-medium">{order.billingAddress.firstName} {order.billingAddress.lastName}</div>
                {order.billingAddress.company && (
                  <div>{order.billingAddress.company}</div>
                )}
                <div>{order.billingAddress.address1}</div>
                {order.billingAddress.address2 && (
                  <div>{order.billingAddress.address2}</div>
                )}
                <div>
                  {order.billingAddress.city}, {order.billingAddress.state} {order.billingAddress.postalCode}
                </div>
                <div>{order.billingAddress.country}</div>
                {order.billingAddress.phone && (
                  <div className="flex items-center gap-1 mt-2">
                    <Phone className="w-3 h-3" />
                    {order.billingAddress.phone}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="wp-card">
            <div className="wp-card-header">
              <h3 className="wp-card-title flex items-center gap-2">
                <Truck className="w-4 h-4" />
                배송지 주소
              </h3>
            </div>
            <div className="wp-card-body">
              <div className="text-sm space-y-1">
                <div className="font-medium">{order.shippingAddress.firstName} {order.shippingAddress.lastName}</div>
                {order.shippingAddress.company && (
                  <div>{order.shippingAddress.company}</div>
                )}
                <div>{order.shippingAddress.address1}</div>
                {order.shippingAddress.address2 && (
                  <div>{order.shippingAddress.address2}</div>
                )}
                <div>
                  {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                </div>
                <div>{order.shippingAddress.country}</div>
              </div>
              
              {order.trackingNumber && (
                <div className="mt-3 p-2 bg-blue-50 rounded">
                  <div className="text-sm font-medium text-blue-800">추적번호:</div>
                  <div className="text-sm text-blue-600">{order.trackingNumber}</div>
                </div>
              )}
            </div>
          </div>

          {/* Payment Info */}
          <div className="wp-card">
            <div className="wp-card-header">
              <h3 className="wp-card-title flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                결제 정보
              </h3>
            </div>
            <div className="wp-card-body space-y-3">
              <div>
                <div className="text-sm text-gray-600">결제 방법:</div>
                <div className="font-medium">{order.paymentMethod}</div>
              </div>
              
              {order.transactionId && (
                <div>
                  <div className="text-sm text-gray-600">거래 ID:</div>
                  <div className="font-mono text-sm">{order.transactionId}</div>
                </div>
              )}
            </div>
          </div>

          {/* Order Timeline */}
          <div className="wp-card">
            <div className="wp-card-header">
              <h3 className="wp-card-title flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                주문 타임라인
              </h3>
            </div>
            <div className="wp-card-body">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>주문 생성:</span>
                  <span>{formatDate(order.createdAt)}</span>
                </div>
                
                {order.updatedAt !== order.createdAt && (
                  <div className="flex justify-between">
                    <span>마지막 수정:</span>
                    <span>{formatDate(order.updatedAt)}</span>
                  </div>
                )}
                
                {order.completedAt && (
                  <div className="flex justify-between">
                    <span>주문 완료:</span>
                    <span>{formatDate(order.completedAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">환불 처리</h3>
              <button
                onClick={() => setShowRefundModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="wp-label">환불 금액</label>
                <input
                  type="number"
                  step="0.01"
                  max={order.total}
                  value={refundData.amount}
                  onChange={(e) => setRefundData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  className="wp-input"
                  placeholder="환불할 금액을 입력하세요"
                />
                <p className="text-xs text-gray-500 mt-1">
                  최대 환불 가능 금액: {formatPrice(order.total)}
                </p>
              </div>

              <div>
                <label className="wp-label">환불 사유</label>
                <textarea
                  value={refundData.reason}
                  onChange={(e) => setRefundData(prev => ({ ...prev, reason: e.target.value }))}
                  className="wp-textarea"
                  rows={3}
                  placeholder="환불 사유를 입력하세요"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowRefundModal(false)}
                  className="wp-button-secondary flex-1"
                >
                  취소
                </button>
                <button
                  onClick={handleRefund}
                  className="wp-button-primary flex-1"
                  disabled={refundData.amount <= 0}
                >
                  환불 처리
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderDetail
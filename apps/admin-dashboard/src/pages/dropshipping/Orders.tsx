/**
 * Dropshipping Orders Page
 *
 * Refactored: PageHeader pattern applied (Master-Detail layout - DataTable not applicable)
 */

import React, { useState, useEffect } from 'react';
import { Package, Truck, CheckCircle, Clock, DollarSign, ShoppingCart, RefreshCw, Settings } from 'lucide-react';
import { dropshippingAPI } from '../../api/dropshipping-cpt';
import { toast } from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader';

interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  seller_id: string;
  seller_name: string;
}

interface Order {
  id: string;
  title: string;
  content: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  meta_data: {
    customer_id: string;
    customer_name: string;
    customer_email: string;
    items: OrderItem[];
    subtotal: number;
    shipping_fee: number;
    total: number;
    status: 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled';
    payment_method: string;
    payment_status?: 'paid' | 'unpaid';
    payment_date?: string;
    payment_amount?: number;
    transaction_id?: string;
    card_last_four?: string;
    card_type?: string;
    cash_receipt_number?: string;
    shipping_address?: {
      street: string;
      city: string;
      state: string;
      zip: string;
      country: string;
    };
    tracking_number?: string;
  };
}

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [filterStatus]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await dropshippingAPI.getOrders(filterStatus);
      if (response.success) {
        setOrders(response.data);
      }
    } catch (error) {
      toast.error('주문 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await dropshippingAPI.updateOrderStatus(orderId, newStatus);
      if (response.success) {
        toast.success('주문 상태가 업데이트되었습니다');
        fetchOrders();
      }
    } catch (error) {
      toast.error('주문 상태 업데이트에 실패했습니다');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  const getPaymentBadge = (status: string) => {
    if (status === 'paid') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          결제완료
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <Clock className="w-3 h-3 mr-1" />
        미결제
      </span>
    );
  };

  const getPaymentMethodBadge = (method: string) => {
    const methodConfig = {
      card: { color: 'bg-blue-100 text-blue-800', text: '카드' },
      cash: { color: 'bg-gray-100 text-gray-800', text: '현금' },
      bank_transfer: { color: 'bg-purple-100 text-purple-800', text: '계좌이체' },
      mobile_payment: { color: 'bg-yellow-100 text-yellow-800', text: '간편결제' },
      credit_card: { color: 'bg-indigo-100 text-indigo-800', text: '신용카드' }
    };
    const config = methodConfig[method as keyof typeof methodConfig] || { color: 'bg-gray-100 text-gray-800', text: method };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: '대기중' },
      processing: { color: 'bg-blue-100 text-blue-800', icon: Package, text: '처리중' },
      shipped: { color: 'bg-purple-100 text-purple-800', icon: Truck, text: '배송중' },
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: '완료' },
      cancelled: { color: 'bg-red-100 text-red-800', icon: Clock, text: '취소됨' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </span>
    );
  };

  const viewOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowDetails(true);
  };

  if (showDetails && selectedOrder) {
    return (
      <div className="p-6">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-normal text-gray-900">주문 상세 #{selectedOrder.id}</h1>
          <button
            onClick={() => {
              setShowDetails(false);
              setSelectedOrder(null);
            }}
            className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
          >
            목록으로
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {/* Order Items */}
            <div className="bg-white border border-gray-300 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-medium mb-4">주문 상품</h2>
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <th className="text-left pb-2">상품명</th>
                    <th className="text-center pb-2">판매자</th>
                    <th className="text-center pb-2">수량</th>
                    <th className="text-right pb-2">가격</th>
                    <th className="text-right pb-2">소계</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.meta_data.items?.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-3">{item.product_name}</td>
                      <td className="text-center py-3 text-sm text-gray-600">{item.seller_name}</td>
                      <td className="text-center py-3">{item.quantity}</td>
                      <td className="text-right py-3">{formatCurrency(item.price)}</td>
                      <td className="text-right py-3 font-medium">
                        {formatCurrency(item.price * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} className="text-right py-2">상품 합계:</td>
                    <td className="text-right py-2 font-medium">
                      {formatCurrency(selectedOrder.meta_data.subtotal)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="text-right py-2">배송비:</td>
                    <td className="text-right py-2">
                      {formatCurrency(selectedOrder.meta_data.shipping_fee)}
                    </td>
                  </tr>
                  <tr className="text-lg font-bold">
                    <td colSpan={4} className="text-right py-2">총 금액:</td>
                    <td className="text-right py-2 text-blue-600">
                      {formatCurrency(selectedOrder.meta_data.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Shipping Address */}
            {selectedOrder.meta_data.shipping_address && (
              <div className="bg-white border border-gray-300 rounded-lg p-6">
                <h2 className="text-lg font-medium mb-4">배송 정보</h2>
                <div className="space-y-2 text-sm">
                  <p>{selectedOrder.meta_data.shipping_address.street}</p>
                  <p>{selectedOrder.meta_data.shipping_address.city}, {selectedOrder.meta_data.shipping_address.state}</p>
                  <p>{selectedOrder.meta_data.shipping_address.zip}, {selectedOrder.meta_data.shipping_address.country}</p>
                  {selectedOrder.meta_data.tracking_number && (
                    <div className="mt-4 p-3 bg-blue-50 rounded">
                      <p className="font-medium">운송장 번호: {selectedOrder.meta_data.tracking_number}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            {/* Order Info */}
            <div className="bg-white border border-gray-300 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-medium mb-4">주문 정보</h2>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-gray-600">주문 상태</dt>
                  <dd className="mt-1">{getStatusBadge(selectedOrder.meta_data.status)}</dd>
                </div>
                <div>
                  <dt className="text-gray-600">결제 상태</dt>
                  <dd className="mt-1">{getPaymentBadge(selectedOrder.meta_data.payment_status || 'unpaid')}</dd>
                </div>
                <div>
                  <dt className="text-gray-600">주문일</dt>
                  <dd>{new Date(selectedOrder.createdAt).toLocaleString('ko-KR')}</dd>
                </div>
                {selectedOrder.meta_data.payment_date && (
                  <div>
                    <dt className="text-gray-600">결제일</dt>
                    <dd>{new Date(selectedOrder.meta_data.payment_date).toLocaleString('ko-KR')}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Payment Info */}
            <div className="bg-white border border-gray-300 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-medium mb-4">결제 정보</h2>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-gray-600">결제 방법</dt>
                  <dd className="mt-1">{getPaymentMethodBadge(selectedOrder.meta_data.payment_method)}</dd>
                </div>
                {selectedOrder.meta_data.transaction_id && (
                  <div>
                    <dt className="text-gray-600">거래번호</dt>
                    <dd className="font-mono text-xs">{selectedOrder.meta_data.transaction_id}</dd>
                  </div>
                )}
                {selectedOrder.meta_data.card_last_four && (
                  <div>
                    <dt className="text-gray-600">카드정보</dt>
                    <dd>{selectedOrder.meta_data.card_type} ****{selectedOrder.meta_data.card_last_four}</dd>
                  </div>
                )}
                {selectedOrder.meta_data.cash_receipt_number && (
                  <div>
                    <dt className="text-gray-600">현금영수증</dt>
                    <dd className="font-mono text-xs">{selectedOrder.meta_data.cash_receipt_number}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Customer Info */}
            <div className="bg-white border border-gray-300 rounded-lg p-6">
              <h2 className="text-lg font-medium mb-4">고객 정보</h2>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-gray-600">이름</dt>
                  <dd className="font-medium">{selectedOrder.meta_data.customer_name}</dd>
                </div>
                <div>
                  <dt className="text-gray-600">이메일</dt>
                  <dd>{selectedOrder.meta_data.customer_email}</dd>
                </div>
              </dl>
            </div>

            {/* Status Actions */}
            <div className="bg-white border border-gray-300 rounded-lg p-6 mt-6">
              <h2 className="text-lg font-medium mb-4">상태 변경</h2>
              <select
                value={selectedOrder.meta_data.status}
                onChange={(e) => updateOrderStatus(selectedOrder.id, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              >
                <option value="pending">대기중</option>
                <option value="processing">처리중</option>
                <option value="shipped">배송중</option>
                <option value="completed">완료</option>
                <option value="cancelled">취소됨</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PageHeader actions
  const headerActions = [
    {
      id: 'screen-options',
      label: 'Screen Options',
      icon: <Settings className="w-4 h-4" />,
      onClick: () => {
        // TODO: Implement screen options
      },
      variant: 'secondary' as const,
    },
    {
      id: 'refresh',
      label: '새로고침',
      icon: <RefreshCw className="w-4 h-4" />,
      onClick: fetchOrders,
      variant: 'secondary' as const,
    },
  ];

  return (
    <div className="p-6">
      {/* PageHeader */}
      <PageHeader
        title="주문 관리"
        subtitle="드롭쉬핑 주문 목록 및 상세"
        actions={headerActions}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">전체 주문</p>
              <p className="text-2xl font-bold">{orders.length}</p>
            </div>
            <ShoppingCart className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">결제완료</p>
              <p className="text-2xl font-bold text-green-600">
                {orders.filter(o => o.meta_data.payment_status === 'paid').length}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">미결제</p>
              <p className="text-2xl font-bold text-red-600">
                {orders.filter(o => o.meta_data.payment_status !== 'paid').length}
              </p>
            </div>
            <Clock className="h-8 w-8 text-red-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">배송중</p>
              <p className="text-2xl font-bold">
                {orders.filter(o => o.meta_data.status === 'shipped').length}
              </p>
            </div>
            <Truck className="h-8 w-8 text-purple-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">완료됨</p>
              <p className="text-2xl font-bold">
                {orders.filter(o => o.meta_data.status === 'completed').length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-gray-300 rounded-t-lg p-3 flex justify-between items-center">
        <div className="flex gap-2">
          <select
            className="px-3 py-1 border border-gray-300 rounded text-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">모든 상태</option>
            <option value="pending">대기중</option>
            <option value="processing">처리중</option>
            <option value="shipped">배송중</option>
            <option value="completed">완료</option>
            <option value="cancelled">취소됨</option>
          </select>
        </div>
        
        <div className="text-sm text-gray-600">
          총 {orders.length}개 주문
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border-x border-b border-gray-300 rounded-b-lg">
        <table className="w-full o4o-list-table widefat fixed striped">
          <thead>
            <tr>
              <th className="manage-column column-title column-primary">주문번호</th>
              <th className="manage-column">고객</th>
              <th className="manage-column">상품수</th>
              <th className="manage-column">금액</th>
              <th className="manage-column">결제상태</th>
              <th className="manage-column">결제방법</th>
              <th className="manage-column">배송상태</th>
              <th className="manage-column">주문일</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-4">
                  로딩중...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-4">
                  주문이 없습니다
                </td>
              </tr>
            ) : (
              orders?.map((order) => (
                <tr key={order.id}>
                  <td className="title column-title column-primary page-title">
                    <strong>
                      <a 
                        href="#" 
                        onClick={(e) => { e.preventDefault(); viewOrderDetails(order); }}
                        className="row-title"
                      >
                        #{order.id}
                      </a>
                    </strong>
                    <div className="row-actions">
                      <span className="view">
                        <a href="#" onClick={(e) => { e.preventDefault(); viewOrderDetails(order); }}>
                          상세보기
                        </a>
                      </span>
                    </div>
                  </td>
                  <td>{order.meta_data.customer_name}</td>
                  <td className="text-center">{order.meta_data.items.length}</td>
                  <td>{formatCurrency(order.meta_data.total)}</td>
                  <td>{getPaymentBadge(order.meta_data.payment_status || 'unpaid')}</td>
                  <td>{getPaymentMethodBadge(order.meta_data.payment_method)}</td>
                  <td>{getStatusBadge(order.meta_data.status)}</td>
                  <td className="date column-date">
                    <abbr title={new Date(order.createdAt).toLocaleString('ko-KR')}>
                      {new Date(order.createdAt).toLocaleDateString('ko-KR')}
                    </abbr>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Orders;
import { useState } from 'react';
import { Package, Clock, CheckCircle, Truck, AlertCircle, RefreshCw, Eye, Edit, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import toast from 'react-hot-toast';

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'completed' | 'cancelled' | 'refunded';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: OrderStatus;
  totalAmount: number;
  items: OrderItem[];
  shippingInfo: ShippingInfo;
  paymentInfo: PaymentInfo;
  statusHistory: StatusHistoryItem[];
  createdAt: string;
  updatedAt: string;
  notes?: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  refundInfo?: RefundInfo;
}

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  variantOptions?: Record<string, string>;
}

interface ShippingInfo {
  recipientName: string;
  phone: string;
  address: string;
  postalCode: string;
  deliveryRequest?: string;
}

interface PaymentInfo {
  method: string;
  provider: string;
  transactionId: string;
  paidAt: string;
  amount: number;
}

interface StatusHistoryItem {
  id: string;
  status: OrderStatus;
  changedAt: string;
  changedBy: string;
  reason?: string;
  notes?: string;
}

interface RefundInfo {
  requestedAt: string;
  processedAt?: string;
  amount: number;
  reason: string;
  status: 'requested' | 'processing' | 'completed' | 'rejected';
}

interface StatusChangeData {
  orderId: string;
  newStatus: OrderStatus;
  reason?: string;
  notes?: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
}

const OrderStatusManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);
  const [statusChangeForm, setStatusChangeForm] = useState<StatusChangeData>({
    orderId: '',
    newStatus: 'pending',
    reason: '',
    notes: '',
    trackingNumber: '',
    estimatedDelivery: ''
  });

  // Fetch orders data
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['orders', searchTerm, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await authClient.api.get(`/v1/ecommerce/orders?${params.toString()}`);
      return response.data;
    }
  });
  const orders = ordersData?.data || [];

  // Fetch order statistics
  const { data: statsData } = useQuery({
    queryKey: ['order-stats'],
    queryFn: async () => {
      const response = await authClient.api.get('/v1/ecommerce/orders/stats');
      return response.data;
    }
  });
  const stats = statsData?.data || {};

  // Status change mutation
  const changeStatusMutation = useMutation({
    mutationFn: async (data: StatusChangeData) => {
      const response = await authClient.api.put(`/v1/ecommerce/orders/${data.orderId}/status`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('주문 상태가 변경되었습니다');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-stats'] });
      setIsStatusDialogOpen(false);
      setStatusChangeForm({
        orderId: '',
        newStatus: 'pending',
        reason: '',
        notes: '',
        trackingNumber: '',
        estimatedDelivery: ''
      });
    }
  });

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">대기중</Badge>;
      case 'confirmed':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">확인됨</Badge>;
      case 'processing':
        return <Badge variant="outline" className="text-purple-600 border-purple-600">처리중</Badge>;
      case 'shipped':
        return <Badge variant="outline" className="text-indigo-600 border-indigo-600">배송중</Badge>;
      case 'delivered':
        return <Badge variant="outline" className="text-green-600 border-green-600">배송완료</Badge>;
      case 'completed':
        return <Badge>완료</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">취소</Badge>;
      case 'refunded':
        return <Badge variant="destructive">환불</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case 'processing':
        return <RefreshCw className="w-4 h-4 text-purple-600" />;
      case 'shipped':
        return <Truck className="w-4 h-4 text-indigo-600" />;
      case 'delivered':
        return <Package className="w-4 h-4 text-green-600" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'cancelled':
        return <X className="w-4 h-4 text-gray-600" />;
      case 'refunded':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const getNextStatuses = (currentStatus: OrderStatus): OrderStatus[] => {
    switch (currentStatus) {
      case 'pending':
        return ['confirmed', 'cancelled'];
      case 'confirmed':
        return ['processing', 'cancelled'];
      case 'processing':
        return ['shipped', 'cancelled'];
      case 'shipped':
        return ['delivered', 'cancelled'];
      case 'delivered':
        return ['completed', 'refunded'];
      case 'completed':
        return ['refunded'];
      case 'cancelled':
        return ['refunded'];
      case 'refunded':
        return [];
      default:
        return [];
    }
  };

  const handleOpenStatusChange = (order: Order) => {
    setSelectedOrder(order);
    setStatusChangeForm({
      orderId: order.id,
      newStatus: order.status,
      reason: '',
      notes: '',
      trackingNumber: order.trackingNumber || '',
      estimatedDelivery: order.estimatedDelivery || ''
    });
    setIsStatusDialogOpen(true);
  };

  const handleOpenOrderDetail = (order: Order) => {
    setSelectedOrder(order);
    setIsOrderDetailOpen(true);
  };

  const handleStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusChangeForm.newStatus) {
      toast.error('새로운 상태를 선택하세요');
      return;
    }
    changeStatusMutation.mutate(statusChangeForm);
  };

  const getStatusName = (status: OrderStatus) => {
    const statusNames = {
      pending: '대기중',
      confirmed: '확인됨',
      processing: '처리중',
      shipped: '배송중',
      delivered: '배송완료',
      completed: '완료',
      cancelled: '취소',
      refunded: '환불'
    };
    return statusNames[status] || status;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-modern-text-primary">주문 상태 관리</h1>
          <p className="text-modern-text-secondary mt-1">주문 워크플로우 추적 및 관리</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {[
          { status: 'pending', label: '대기중', count: stats.pending || 0, color: 'text-yellow-600' },
          { status: 'confirmed', label: '확인됨', count: stats.confirmed || 0, color: 'text-blue-600' },
          { status: 'processing', label: '처리중', count: stats.processing || 0, color: 'text-purple-600' },
          { status: 'shipped', label: '배송중', count: stats.shipped || 0, color: 'text-indigo-600' },
          { status: 'delivered', label: '배송완료', count: stats.delivered || 0, color: 'text-green-600' },
          { status: 'completed', label: '완료', count: stats.completed || 0, color: 'text-green-700' },
          { status: 'cancelled', label: '취소', count: stats.cancelled || 0, color: 'text-gray-600' },
          { status: 'refunded', label: '환불', count: stats.refunded || 0, color: 'text-red-600' }
        ].map(({ status, label, count, color }) => (
          <Card key={status} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter(status)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                {getStatusIcon(status as OrderStatus)}
                <div>
                  <div className={`text-2xl font-bold ${color}`}>{count}</div>
                  <div className="text-xs text-modern-text-secondary">{label}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="주문번호, 고객명으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-modern-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-modern-primary"
          >
            <option value="all">모든 상태</option>
            <option value="pending">대기중</option>
            <option value="confirmed">확인됨</option>
            <option value="processing">처리중</option>
            <option value="shipped">배송중</option>
            <option value="delivered">배송완료</option>
            <option value="completed">완료</option>
            <option value="cancelled">취소</option>
            <option value="refunded">환불</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-modern-bg-tertiary border-b border-modern-border-primary">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    주문 정보
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    고객
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    금액
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    주문일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-modern-border-primary">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-modern-primary"></div>
                      </div>
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-modern-text-secondary">
                      주문 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  orders.map((order: Order) => (
                    <tr key={order.id} className="hover:bg-modern-bg-hover">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-modern-text-primary">
                            {order.orderNumber}
                          </div>
                          <div className="text-sm text-modern-text-secondary">
                            {order.items.length}개 상품
                          </div>
                          {order.trackingNumber && (
                            <div className="text-xs text-modern-text-tertiary">
                              배송: {order.trackingNumber}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-modern-text-primary">
                            {order.customerName}
                          </div>
                          <div className="text-sm text-modern-text-secondary">
                            {order.customerEmail}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-modern-text-primary">
                          ₩{order.totalAmount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-modern-text-secondary">
                          {new Date(order.createdAt).toLocaleDateString('ko-KR')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenOrderDetail(order)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenStatusChange(order)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Status Change Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleStatusSubmit}>
            <DialogHeader>
              <DialogTitle>주문 상태 변경</DialogTitle>
              <DialogDescription>
                {selectedOrder?.orderNumber} - {selectedOrder?.customerName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label>현재 상태: {getStatusName(selectedOrder?.status || 'pending')}</Label>
              </div>

              <div>
                <Label htmlFor="newStatus">새 상태 *</Label>
                <select
                  id="newStatus"
                  value={statusChangeForm.newStatus}
                  onChange={(e) => setStatusChangeForm(prev => ({ ...prev, newStatus: e.target.value as OrderStatus }))}
                  className="w-full px-3 py-2 border border-modern-border-primary rounded-lg mt-1"
                  required
                >
                  <option value="">상태를 선택하세요</option>
                  {getNextStatuses(selectedOrder?.status || 'pending').map(status => (
                    <option key={status} value={status}>
                      {getStatusName(status)}
                    </option>
                  ))}
                </select>
              </div>

              {(statusChangeForm.newStatus === 'shipped' || statusChangeForm.newStatus === 'delivered') && (
                <>
                  <div>
                    <Label htmlFor="trackingNumber">운송장 번호</Label>
                    <Input
                      id="trackingNumber"
                      value={statusChangeForm.trackingNumber}
                      onChange={(e) => setStatusChangeForm(prev => ({ ...prev, trackingNumber: e.target.value }))}
                      placeholder="운송장 번호를 입력하세요"
                    />
                  </div>
                  <div>
                    <Label htmlFor="estimatedDelivery">예상 배송일</Label>
                    <Input
                      id="estimatedDelivery"
                      type="date"
                      value={statusChangeForm.estimatedDelivery}
                      onChange={(e) => setStatusChangeForm(prev => ({ ...prev, estimatedDelivery: e.target.value }))}
                    />
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="reason">변경 사유</Label>
                <Input
                  id="reason"
                  value={statusChangeForm.reason}
                  onChange={(e) => setStatusChangeForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="상태 변경 이유를 입력하세요"
                />
              </div>

              <div>
                <Label htmlFor="notes">메모</Label>
                <Textarea
                  id="notes"
                  value={statusChangeForm.notes}
                  onChange={(e) => setStatusChangeForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="추가 메모를 입력하세요"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
                취소
              </Button>
              <Button type="submit" disabled={changeStatusMutation.isPending}>
                상태 변경
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Order Detail Dialog */}
      <Dialog open={isOrderDetailOpen} onOpenChange={setIsOrderDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>주문 상세</DialogTitle>
            <DialogDescription>
              {selectedOrder?.orderNumber} - {selectedOrder?.customerName}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6 py-4">
              {/* Order Items */}
              <div>
                <h3 className="text-lg font-medium mb-3">주문 상품</h3>
                <div className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex justify-between p-3 bg-modern-bg-secondary rounded-lg">
                      <div>
                        <div className="font-medium">{item.productName}</div>
                        <div className="text-sm text-modern-text-secondary">
                          SKU: {item.sku} | 수량: {item.quantity}
                        </div>
                        {item.variantOptions && (
                          <div className="text-xs text-modern-text-tertiary">
                            {Object.entries(item.variantOptions).map(([key, value]) => `${key}: ${value}`).join(', ')}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-medium">₩{item.totalPrice.toLocaleString()}</div>
                        <div className="text-sm text-modern-text-secondary">
                          단가: ₩{item.unitPrice.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status History */}
              <div>
                <h3 className="text-lg font-medium mb-3">상태 이력</h3>
                <div className="space-y-2">
                  {selectedOrder.statusHistory?.map((history) => (
                    <div key={history.id} className="flex items-center gap-3 p-3 bg-modern-bg-secondary rounded-lg">
                      {getStatusIcon(history.status)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{getStatusName(history.status)}</span>
                          <span className="text-sm text-modern-text-secondary">
                            {new Date(history.changedAt).toLocaleString('ko-KR')}
                          </span>
                        </div>
                        {history.reason && (
                          <div className="text-sm text-modern-text-secondary">
                            사유: {history.reason}
                          </div>
                        )}
                        {history.notes && (
                          <div className="text-sm text-modern-text-tertiary">
                            메모: {history.notes}
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-modern-text-secondary">
                        {history.changedBy}
                      </div>
                    </div>
                  )) || (
                    <div className="text-center text-modern-text-secondary py-4">
                      상태 이력이 없습니다.
                    </div>
                  )}
                </div>
              </div>

              {/* Shipping Info */}
              <div>
                <h3 className="text-lg font-medium mb-3">배송 정보</h3>
                <div className="p-3 bg-modern-bg-secondary rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-modern-text-secondary">받는 분</div>
                      <div className="font-medium">{selectedOrder.shippingInfo.recipientName}</div>
                    </div>
                    <div>
                      <div className="text-sm text-modern-text-secondary">연락처</div>
                      <div className="font-medium">{selectedOrder.shippingInfo.phone}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-sm text-modern-text-secondary">주소</div>
                      <div className="font-medium">
                        ({selectedOrder.shippingInfo.postalCode}) {selectedOrder.shippingInfo.address}
                      </div>
                    </div>
                    {selectedOrder.shippingInfo.deliveryRequest && (
                      <div className="col-span-2">
                        <div className="text-sm text-modern-text-secondary">배송 요청사항</div>
                        <div className="font-medium">{selectedOrder.shippingInfo.deliveryRequest}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div>
                <h3 className="text-lg font-medium mb-3">결제 정보</h3>
                <div className="p-3 bg-modern-bg-secondary rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-modern-text-secondary">결제 방법</div>
                      <div className="font-medium">{selectedOrder.paymentInfo.method}</div>
                    </div>
                    <div>
                      <div className="text-sm text-modern-text-secondary">결제 금액</div>
                      <div className="font-medium">₩{selectedOrder.paymentInfo.amount.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-sm text-modern-text-secondary">거래 ID</div>
                      <div className="font-medium">{selectedOrder.paymentInfo.transactionId}</div>
                    </div>
                    <div>
                      <div className="text-sm text-modern-text-secondary">결제일시</div>
                      <div className="font-medium">
                        {new Date(selectedOrder.paymentInfo.paidAt).toLocaleString('ko-KR')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setIsOrderDetailOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderStatusManagement;
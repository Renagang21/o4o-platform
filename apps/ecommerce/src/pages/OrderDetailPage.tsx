import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Badge } from '@o4o/ui';
import { ArrowLeft, Package, Truck, MapPin, CreditCard, Download, Printer } from 'lucide-react';
import { Order } from '@o4o/types/ecommerce';
import { formatCurrency, formatDate } from '@o4o/utils/format';
import { useAuth } from '@o4o/auth-context';
import { authClient } from '@o4o/auth-client';

// Mock order - replace with actual API
const mockOrder: Order = {
  id: '1',
  orderNumber: 'ORD-2025-0001',
  userId: '1',
  status: 'delivered',
  items: [
    {
      id: '1',
      orderId: '1',
      productId: '1',
      quantity: 2,
      price: 89000,
      product: {
        id: '1',
        name: '프리미엄 무선 헤드폰',
        slug: 'premium-wireless-headphones',
        price: 89000,
        images: [{ id: '1', url: 'https://via.placeholder.com/100x100', alt: '헤드폰' }],
        status: 'published',
        manageStock: true,
        stockQuantity: 15
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '2',
      orderId: '1',
      productId: '2',
      quantity: 1,
      price: 259000,
      product: {
        id: '2',
        name: '스마트 워치 프로',
        slug: 'smart-watch-pro',
        price: 259000,
        images: [{ id: '2', url: 'https://via.placeholder.com/100x100', alt: '스마트워치' }],
        status: 'published',
        manageStock: true,
        stockQuantity: 8
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  summary: {
    itemCount: 3,
    subtotal: 437000,
    discount: 0,
    shipping: 0,
    tax: 43700,
    total: 480700
  },
  shippingAddress: {
    recipientName: '홍길동',
    recipientPhone: '010-1234-5678',
    postalCode: '12345',
    address: '서울시 강남구 테헤란로 123',
    addressDetail: '10층'
  },
  paymentMethod: 'card',
  trackingNumber: '1234567890',
  deliveryRequest: '부재시 문앞에 놓아주세요',
  createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
};

const orderStatusSteps = [
  { key: 'pending', label: '주문 접수' },
  { key: 'confirmed', label: '주문 확인' },
  { key: 'processing', label: '상품 준비' },
  { key: 'shipped', label: '배송 시작' },
  { key: 'delivered', label: '배송 완료' }
];

const paymentMethodLabels = {
  card: '신용/체크카드',
  kakao_pay: '카카오페이',
  naver_pay: '네이버페이',
  virtual_account: '가상계좌',
  bank_transfer: '무통장입금'
};

export function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch order details
  const { data: order = mockOrder, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      // TODO: Replace with actual API call
      // const response = await authClient.get(`/api/v1/orders/${id}`);
      // return response.data;
      return mockOrder;
    }
  });

  // Cancel order mutation
  const cancelOrderMutation = useMutation({
    mutationFn: async () => {
      // TODO: Replace with actual API call
      // const response = await authClient.post(`/api/v1/orders/${id}/cancel`);
      // return response.data;
      // TODO: Log order cancellation for debugging
      // console.log('Cancel order:', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      navigate('/orders');
    }
  });

  const getStatusIndex = (status: string) => {
    const index = orderStatusSteps.findIndex(step => step.key === status);
    return index >= 0 ? index : 0;
  };

  const currentStatusIndex = getStatusIndex(order.status);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadInvoice = () => {
    // TODO: Implement invoice download
    alert('세금계산서 다운로드 기능은 추후 구현 예정입니다.');
  };

  const handleTrackShipping = () => {
    if (order.trackingNumber) {
      // TODO: Open tracking URL
      alert(`배송 추적 번호: ${order.trackingNumber}`);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">주문 정보를 불러오는 중...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">주문을 찾을 수 없습니다.</p>
        <Button onClick={() => navigate('/orders')} className="mt-4">
          주문 목록으로
        </Button>
      </div>
    );
  }

  const canCancel = ['pending', 'confirmed'].includes(order.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/orders')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">주문 상세</h1>
            <p className="text-muted-foreground">주문번호: {order.orderNumber}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" />
            인쇄
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadInvoice}>
            <Download className="h-4 w-4 mr-1" />
            세금계산서
          </Button>
        </div>
      </div>

      {/* Order Status Timeline */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">주문 상태</h2>
        <div className="relative">
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted">
            <div 
              className="absolute top-0 left-0 h-full bg-primary transition-all duration-500"
              style={{ width: `${(currentStatusIndex / (orderStatusSteps.length - 1)) * 100}%` }}
            />
          </div>
          <div className="relative flex justify-between">
            {orderStatusSteps.map((step, index) => {
              const isCompleted = index <= currentStatusIndex;
              const isCurrent = index === currentStatusIndex;
              
              return (
                <div key={step.key} className="flex flex-col items-center">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    ${isCompleted ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
                    ${isCurrent ? 'ring-4 ring-primary/20' : ''}
                  `}>
                    {isCompleted ? '✓' : index + 1}
                  </div>
                  <span className={`text-xs mt-2 ${isCompleted ? 'font-medium' : 'text-muted-foreground'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        
        {order.trackingNumber && ['shipped', 'delivered'].includes(order.status) && (
          <div className="mt-4 p-4 bg-muted rounded-lg flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">운송장 번호</p>
              <p className="text-sm text-muted-foreground">{order.trackingNumber}</p>
            </div>
            <Button size="sm" onClick={handleTrackShipping}>
              배송 추적
            </Button>
          </div>
        )}
      </Card>

      {/* Order Items */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">주문 상품</h2>
        <div className="space-y-4">
          {order.items.map(item => (
            <div key={item.id} className="flex gap-4 pb-4 border-b last:border-0 last:pb-0">
              <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden">
                {item.product.images && item.product.images[0] ? (
                  <img
                    src={item.product.images[0].url}
                    alt={item.product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <h3 className="font-medium">{item.product.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(item.price)} x {item.quantity}개
                </p>
              </div>
              
              <div className="text-right">
                <p className="font-medium">{formatCurrency(item.price * item.quantity)}</p>
              </div>
            </div>
          ))}
        </div>
        
        {/* Order Summary */}
        <div className="mt-6 pt-6 border-t space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">상품 금액</span>
            <span>{formatCurrency(order.summary.subtotal)}</span>
          </div>
          {order.summary.discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>할인</span>
              <span>-{formatCurrency(order.summary.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">배송비</span>
            <span>
              {order.summary.shipping === 0 ? '무료' : formatCurrency(order.summary.shipping)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">부가세</span>
            <span>{formatCurrency(order.summary.tax)}</span>
          </div>
          <div className="flex justify-between font-semibold text-lg pt-2 border-t">
            <span>총 결제금액</span>
            <span className="text-primary">{formatCurrency(order.summary.total)}</span>
          </div>
        </div>
      </Card>

      {/* Shipping & Payment Info */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Shipping Info */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            배송 정보
          </h2>
          <div className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">수령인</p>
              <p className="font-medium">{order.shippingAddress.recipientName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">연락처</p>
              <p className="font-medium">{order.shippingAddress.recipientPhone}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">배송지</p>
              <p className="font-medium">
                [{order.shippingAddress.postalCode}] {order.shippingAddress.address}
                {order.shippingAddress.addressDetail && ` ${order.shippingAddress.addressDetail}`}
              </p>
            </div>
            {order.deliveryRequest && (
              <div>
                <p className="text-sm text-muted-foreground">배송 요청사항</p>
                <p className="font-medium">{order.deliveryRequest}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Payment Info */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            결제 정보
          </h2>
          <div className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">결제 방법</p>
              <p className="font-medium">
                {paymentMethodLabels[order.paymentMethod] || order.paymentMethod}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">결제 일시</p>
              <p className="font-medium">
                {formatDate(order.createdAt, { format: 'long', includeTime: true })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">결제 금액</p>
              <p className="font-medium">{formatCurrency(order.summary.total)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Actions */}
      {canCancel && (
        <div className="flex justify-end">
          <Button
            variant="destructive"
            onClick={() => cancelOrderMutation.mutate()}
            disabled={cancelOrderMutation.isPending}
          >
            {cancelOrderMutation.isPending ? '처리 중...' : '주문 취소'}
          </Button>
        </div>
      )}
    </div>
  );
}
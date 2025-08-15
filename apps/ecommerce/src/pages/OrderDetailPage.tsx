import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Badge } from '@o4o/ui';
import { ArrowLeft, MapPin, CreditCard, Download, Printer } from 'lucide-react';
import { Order } from '@o4o/types';
import { formatCurrency, formatDate } from '@o4o/utils';
import { useAuth } from '@o4o/auth-context';

// Mock order - replace with actual API
const mockOrder: Order = {
  id: '1',
  orderNumber: 'ORD-2025-0001',
  buyerId: '1',
  buyerType: 'customer',
  buyerName: '홍길동',
  buyerEmail: 'user@example.com',
  items: [
    {
      id: '1',
      productId: '1',
      productName: '프리미엄 무선 헤드폰',
      productSku: 'WH-001',
      productImage: 'https://via.placeholder.com/100x100',
      quantity: 2,
      unitPrice: 89000,
      totalPrice: 178000,
      supplierId: '1',
      supplierName: '테크 서플라이'
    },
    {
      id: '2',
      productId: '2',
      productName: '스마트 워치 프로',
      productSku: 'SW-PRO-001',
      productImage: 'https://via.placeholder.com/100x100',
      quantity: 1,
      unitPrice: 259000,
      totalPrice: 259000,
      supplierId: '1',
      supplierName: '테크 서플라이'
    }
  ],
  summary: {
    subtotal: 437000,
    discount: 0,
    shipping: 0,
    tax: 43700,
    total: 480700
  },
  shippingAddress: {
    recipientName: '홍길동',
    phone: '010-1234-5678',
    zipCode: '12345',
    address: '서울시 강남구 테헤란로 123',
    detailAddress: '10층',
    city: '서울',
    country: 'KR',
    deliveryRequest: '부재시 문앞에 놓아주세요'
  },
  billingAddress: {
    recipientName: '홍길동',
    phone: '010-1234-5678',
    zipCode: '12345',
    address: '서울시 강남구 테헤란로 123',
    detailAddress: '10층',
    city: '서울',
    country: 'KR'
  },
  status: 'delivered' as const,
  paymentStatus: 'completed' as const,
  paymentMethod: 'card' as const,
  currency: 'KRW',
  trackingNumber: '1234567890',
  trackingUrl: 'https://tracker.example.com/1234567890',
  shippingMethod: 'standard',
  orderDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  paymentDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  shippingDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  deliveryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
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

const paymentMethodLabels: Record<string, string> = {
  card: '신용/체크카드',
  kakao_pay: '카카오페이',
  naver_pay: '네이버페이',
  virtual_account: '가상계좌',
  bank_transfer: '무통장입금',
  transfer: '계좌이체',
  paypal: '페이팔',
  cash_on_delivery: '착불'
};

export function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  useAuth(); // for authentication check
  const queryClient = useQueryClient();

  // Fetch order details
  const { data: order = mockOrder, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      // TODO: Replace with actual API call
      // const response = await authClient.api.get(`/api/v1/orders/${id}`);
      // return response.data;
      return mockOrder;
    },
    enabled: !!id
  });

  // Cancel order mutation
  const cancelOrderMutation = useMutation({
    mutationFn: async () => {
      // TODO: Replace with actual API call
      // const response = await authClient.api.patch(`/api/v1/orders/${id}/cancel`);
      // return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    }
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadInvoice = () => {
    // TODO: Implement invoice download
  };

  const getStatusIndex = (status: string) => {
    return orderStatusSteps.findIndex(step => step.key === status);
  };

  const currentStatusIndex = getStatusIndex(order.status);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">주문 정보를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/orders')}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            주문 목록
          </Button>
          <div>
            <h1 className="text-2xl font-bold">주문번호: {order.orderNumber}</h1>
            <p className="text-sm text-muted-foreground">
              주문일시: {formatDate(order.createdAt, 'long')}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" />
            인쇄
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadInvoice}>
            <Download className="h-4 w-4 mr-1" />
            명세서 다운로드
          </Button>
        </div>
      </div>

      {/* Order Status */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">주문 상태</h2>
        
        {/* Status Steps */}
        <div className="relative">
          <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200">
            <div 
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${(currentStatusIndex / (orderStatusSteps.length - 1)) * 100}%` }}
            />
          </div>
          
          <div className="relative flex justify-between">
            {orderStatusSteps.map((step, index) => {
              const isCompleted = index <= currentStatusIndex;
              const isCurrent = index === currentStatusIndex;
              
              return (
                <div key={step.key} className="flex flex-col items-center">
                  <div
                    className={`
                      w-12 h-12 rounded-full flex items-center justify-center
                      ${isCompleted ? 'bg-primary text-primary-foreground' : 'bg-gray-200 text-gray-400'}
                      ${isCurrent ? 'ring-4 ring-primary/20' : ''}
                    `}
                  >
                    {index + 1}
                  </div>
                  <span className={`text-sm mt-2 ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {step.label}
                  </span>
                  {isCurrent && (
                    <span className="text-xs text-primary mt-1">
                      {formatDate(order.updatedAt, 'short')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tracking Info */}
        {order.trackingNumber && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm">
              <span className="font-medium">배송사:</span> CJ대한통운
            </p>
            <p className="text-sm">
              <span className="font-medium">송장번호:</span> {order.trackingNumber}
            </p>
            {order.status === 'delivered' && order.deliveryDate && (
              <p className="text-sm">
                <span className="font-medium">배송완료일:</span> {formatDate(order.deliveryDate, 'long')}
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Order Items */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">주문 상품</h2>
        
        <div className="space-y-4">
          {order.items.map((item: any) => (
            <div key={item.id} className="flex gap-4 pb-4 border-b last:border-0">
              <img
                src={item.productImage}
                alt={item.productName}
                className="w-20 h-20 object-cover rounded"
              />
              
              <div className="flex-1">
                <h3 className="font-medium">{item.productName}</h3>
                <p className="text-sm text-muted-foreground">
                  상품코드: {item.productSku}
                </p>
                <p className="text-sm text-muted-foreground">
                  판매자: {item.supplierName}
                </p>
              </div>
              
              <div className="text-right">
                <p className="font-medium">
                  {formatCurrency(item.unitPrice)} x {item.quantity}개
                </p>
                <p className="text-lg font-semibold">
                  {formatCurrency(item.totalPrice)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="mt-6 pt-6 border-t space-y-2">
          <div className="flex justify-between">
            <span>상품금액</span>
            <span>{formatCurrency(order.summary.subtotal)}</span>
          </div>
          {order.summary.discount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>할인금액</span>
              <span>-{formatCurrency(order.summary.discount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>배송비</span>
            <span>{order.summary.shipping === 0 ? '무료' : formatCurrency(order.summary.shipping)}</span>
          </div>
          <div className="flex justify-between">
            <span>부가세</span>
            <span>{formatCurrency(order.summary.tax)}</span>
          </div>
          <div className="flex justify-between text-lg font-semibold pt-2 border-t">
            <span>총 결제금액</span>
            <span>{formatCurrency(order.summary.total)}</span>
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Shipping Address */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            배송지 정보
          </h2>
          
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">받는 분:</span> {order.shippingAddress.recipientName}
            </p>
            <p>
              <span className="font-medium">연락처:</span> {order.shippingAddress.phone}
            </p>
            <p>
              <span className="font-medium">주소:</span>
            </p>
            <p className="pl-4">
              [{order.shippingAddress.zipCode}] {order.shippingAddress.address}
              {order.shippingAddress.detailAddress && `, ${order.shippingAddress.detailAddress}`}
            </p>
            {order.shippingAddress.deliveryRequest && (
              <p>
                <span className="font-medium">배송 요청사항:</span>
                <span className="block pl-4 mt-1">{order.shippingAddress.deliveryRequest}</span>
              </p>
            )}
          </div>
        </Card>

        {/* Payment Info */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            결제 정보
          </h2>
          
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">결제수단:</span> {order.paymentMethod ? paymentMethodLabels[order.paymentMethod] : '-'}
            </p>
            <p>
              <span className="font-medium">결제상태:</span> 
              <Badge className="ml-2" variant={order.paymentStatus === 'completed' ? 'default' : 'secondary'}>
                {order.paymentStatus === 'completed' ? '결제완료' : '결제대기'}
              </Badge>
            </p>
            {order.paymentDate && (
              <p>
                <span className="font-medium">결제일시:</span> {formatDate(order.paymentDate, 'long')}
              </p>
            )}
            <p>
              <span className="font-medium">결제금액:</span> {formatCurrency(order.summary.total)}
            </p>
          </div>
        </Card>
      </div>

      {/* Actions */}
      {order.status === 'pending' || order.status === 'confirmed' ? (
        <div className="flex justify-end">
          <Button
            variant="destructive"
            onClick={() => cancelOrderMutation.mutate()}
            disabled={cancelOrderMutation.isPending}
          >
            주문 취소
          </Button>
        </div>
      ) : null}
    </div>
  );
}
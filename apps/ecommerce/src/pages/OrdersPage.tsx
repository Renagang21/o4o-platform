import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Tabs, TabsContent, TabsList, TabsTrigger } from '@o4o/ui';
import { Search, Calendar, Package } from 'lucide-react';
import { Order } from '@o4o/types';
import { OrderItem } from '@/components/order';
import { useAuth } from '@o4o/auth-context';

// Mock orders data
const mockOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'ORD-2025-0001',
    buyerId: '1',
    buyerType: 'customer',
    buyerName: '홍길동',
    buyerEmail: 'user@example.com',
    status: 'delivered' as const,
    paymentStatus: 'completed' as const,
    paymentMethod: 'card' as const,
    currency: 'KRW',
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
      country: 'KR'
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
    orderDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    orderNumber: 'ORD-2025-0002',
    buyerId: '1',
    buyerType: 'customer',
    buyerName: '홍길동',
    buyerEmail: 'user@example.com',
    status: 'shipped' as const,
    paymentStatus: 'completed' as const,
    paymentMethod: 'kakao_pay' as const,
    currency: 'KRW',
    items: [
      {
        id: '3',
        productId: '3',
        productName: '블루투스 키보드',
        productSku: 'KB-BT-001',
        productImage: 'https://via.placeholder.com/100x100',
        quantity: 1,
        unitPrice: 59000,
        totalPrice: 59000,
        supplierId: '1',
        supplierName: '테크 서플라이'
      }
    ],
    summary: {
      subtotal: 59000,
      discount: 0,
      shipping: 0,
      tax: 5900,
      total: 64900
    },
    shippingAddress: {
      recipientName: '홍길동',
      phone: '010-1234-5678',
      zipCode: '12345',
      address: '서울시 강남구 테헤란로 123',
      detailAddress: '10층',
      city: '서울',
      country: 'KR'
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
    orderDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const orderTabs = [
  { value: 'all', label: '전체' },
  { value: 'pending', label: '주문 대기' },
  { value: 'processing', label: '처리 중' },
  { value: 'shipped', label: '배송 중' },
  { value: 'delivered', label: '배송 완료' },
  { value: 'cancelled', label: '취소/환불' }
];

export function OrdersPage() {
  const { } = useAuth();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [dateRange] = useState<{ start?: string; end?: string }>({});

  // Fetch orders
  const { data: orders = mockOrders, isLoading } = useQuery({
    queryKey: ['orders', { status: activeTab, search: searchTerm, dateRange }],
    queryFn: async () => {
      // TODO: Replace with actual API call
      // const response = await authClient.api.get('/api/v1/orders', {
      //   params: { status: activeTab !== 'all' ? activeTab : undefined, search: searchTerm, ...dateRange }
      // });
      // return response.data;
      
      // Mock filtering
      let filtered = [...mockOrders];
      
      if (activeTab !== 'all') {
        filtered = filtered.filter(order => {
          if (activeTab === 'cancelled') {
            return ['cancelled', 'refunded'].includes(order.status);
          }
          return order.status === activeTab;
        });
      }
      
      if (searchTerm) {
        filtered = filtered.filter(order =>
          order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.items.some(item => 
            item.productName.toLowerCase().includes(searchTerm.toLowerCase())
          )
        );
      }
      
      return filtered;
    }
  });

  // Cancel order mutation
  const cancelOrderMutation = useMutation({
    mutationFn: async () => {
      // TODO: Replace with actual API call
      // const response = await authClient.api.post(`/api/v1/orders/${orderId}/cancel`);
      // return response.data;
      // TODO: Log order cancellation for debugging
      // console.log('Cancel order:', orderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });

  const handleTrackOrder = () => {
    // TODO: Implement tracking
    alert('배송 추적');
  };

  const handleReorder = () => {
    // TODO: Implement reorder
    alert('재주문');
  };

  const handleReview = () => {
    // TODO: Navigate to review page
    alert('리뷰 작성');
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">주문 내역을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">주문 내역</h1>
        <p className="text-muted-foreground">
          주문하신 상품의 배송 상태를 확인하실 수 있습니다.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="주문번호 또는 상품명 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            기간 설정
          </Button>
        </div>
      </div>

      {/* Order Tabs */}
      <Tabs defaultValue={activeTab}>
        <TabsList className="w-full justify-start">
          {orderTabs.map(tab => {
            const count = tab.value === 'all' 
              ? orders.length 
              : orders.filter(o => {
                  if (tab.value === 'cancelled') {
                    return ['cancelled', 'refunded'].includes(o.status);
                  }
                  return o.status === tab.value;
                }).length;
            
            return (
              <TabsTrigger key={tab.value} value={tab.value} onClick={() => setActiveTab(tab.value)}>
                {tab.label} {count > 0 && `(${count})`}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">주문 내역이 없습니다</h2>
              <p className="text-muted-foreground mb-4">
                {activeTab === 'all' 
                  ? '아직 주문하신 상품이 없습니다.'
                  : `${orderTabs.find(t => t.value === activeTab)?.label} 상태의 주문이 없습니다.`
                }
              </p>
              <Button onClick={() => window.location.href = '/products'}>
                쇼핑하러 가기
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map(order => (
                <OrderItem
                  key={order.id}
                  order={order}
                  onCancel={() => cancelOrderMutation.mutate()}
                  onTrack={handleTrackOrder}
                  onReorder={handleReorder}
                  onReview={handleReview}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
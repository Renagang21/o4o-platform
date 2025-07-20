import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Tabs, TabsContent, TabsList, TabsTrigger } from '@o4o/ui';
import { Search, Calendar, Package } from 'lucide-react';
import { Order } from '@o4o/types/ecommerce';
import { OrderItem } from '@/components/order';
import { useAuth } from '@o4o/auth-context';
import { authClient } from '@o4o/auth-client';

// Mock orders data
const mockOrders: Order[] = [
  {
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
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    orderNumber: 'ORD-2025-0002',
    userId: '1',
    status: 'shipped',
    items: [
      {
        id: '3',
        orderId: '2',
        productId: '3',
        quantity: 1,
        price: 59000,
        product: {
          id: '3',
          name: '블루투스 키보드',
          slug: 'bluetooth-keyboard',
          price: 59000,
          images: [{ id: '3', url: 'https://via.placeholder.com/100x100', alt: '키보드' }],
          status: 'published',
          manageStock: true,
          stockQuantity: 25
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ],
    summary: {
      itemCount: 1,
      subtotal: 59000,
      discount: 0,
      shipping: 0,
      tax: 5900,
      total: 64900
    },
    shippingAddress: {
      recipientName: '홍길동',
      recipientPhone: '010-1234-5678',
      postalCode: '12345',
      address: '서울시 강남구 테헤란로 123',
      addressDetail: '10층'
    },
    paymentMethod: 'kakao_pay',
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({});

  // Fetch orders
  const { data: orders = mockOrders, isLoading } = useQuery({
    queryKey: ['orders', { status: activeTab, search: searchTerm, dateRange }],
    queryFn: async () => {
      // TODO: Replace with actual API call
      // const response = await authClient.get('/api/v1/orders', {
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
            item.product.name.toLowerCase().includes(searchTerm.toLowerCase())
          )
        );
      }
      
      return filtered;
    }
  });

  // Cancel order mutation
  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      // TODO: Replace with actual API call
      // const response = await authClient.post(`/api/v1/orders/${orderId}/cancel`);
      // return response.data;
      // TODO: Log order cancellation for debugging
      // console.log('Cancel order:', orderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });

  const handleTrackOrder = (orderId: string) => {
    // TODO: Implement tracking
    alert(`배송 추적: ${orderId}`);
  };

  const handleReorder = (orderId: string) => {
    // TODO: Implement reorder
    alert(`재주문: ${orderId}`);
  };

  const handleReview = (orderId: string) => {
    // TODO: Navigate to review page
    alert(`리뷰 작성: ${orderId}`);
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
      <Tabs value={activeTab} onValueChange={setActiveTab}>
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
              <TabsTrigger key={tab.value} value={tab.value}>
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
                  onCancel={(orderId) => cancelOrderMutation.mutate(orderId)}
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
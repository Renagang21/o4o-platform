import { Order, OrderStatus, OrderItem } from '@/types/ecommerce';

// MedusaOrder 모킹 팩토리 (향후 Medusa 타입으로 변경)
export const createMockOrder = (overrides?: Partial<Order>): Order => {
  const baseOrder: Order = {
    id: 'order_' + Math.random().toString(36).substr(2, 9),
    orderNumber: 'ORD-' + Date.now(),
    status: 'pending' as OrderStatus,
    
    // Customer info
    buyerId: 'buyer_' + Math.random().toString(36).substr(2, 9),
    buyerName: 'Test Customer',
    buyerType: 'customer' as const,
    buyerEmail: 'test@example.com',
    customerId: 'cust_' + Math.random().toString(36).substr(2, 9),
    customerName: 'Test Customer',
    customerEmail: 'test@example.com',
    
    // Order date
    orderDate: new Date().toISOString(),
    
    // Order summary
    summary: {
      subtotal: 20000,
      discount: 0,
      shipping: 3000,
      tax: 2000,
      total: 25000
    },
    currency: 'KRW',
    
    // Pricing
    subtotal: 20000,
    tax: 2000,
    shipping: 3000,
    discount: 0,
    total: 25000,
    
    // Items
    items: [
      createMockOrderItem(),
    ],
    
    // Addresses
    billingAddress: {
      firstName: 'Test',
      lastName: 'Customer',
      recipientName: 'Test Customer',
      address1: '123 Test Street',
      address: '123 Test Street',
      detailAddress: 'Apt 101',
      city: 'Seoul',
      state: 'Seoul',
      postalCode: '12345',
      zipCode: '12345',
      country: 'KR',
      phone: '010-1234-5678',
      email: 'test@example.com',
    },
    shippingAddress: {
      firstName: 'Test',
      lastName: 'Customer',
      recipientName: 'Test Customer',
      address1: '123 Test Street',
      address: '123 Test Street',
      detailAddress: 'Apt 101',
      city: 'Seoul',
      state: 'Seoul',
      postalCode: '12345',
      zipCode: '12345',
      country: 'KR',
      phone: '010-1234-5678',
      email: 'test@example.com',
    },
    
    // Payment
    paymentMethod: 'card',
    paymentStatus: 'pending',
    
    // Shipping
    shippingMethod: 'standard',
    
    // Timestamps
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    
    // Refunds
    refunds: [],
  };

  return { ...baseOrder, ...overrides };
};

// OrderItem 생성 헬퍼
export const createMockOrderItem = (overrides?: Partial<OrderItem>): OrderItem => {
  const baseItem: OrderItem = {
    id: 'item_' + Math.random().toString(36).substr(2, 9),
    productId: 'prod_' + Math.random().toString(36).substr(2, 9),
    productName: 'Test Product',
    productSku: 'TEST-SKU-001',
    productImage: '/images/test-product.jpg',
    quantity: 2,
    unitPrice: 10000,
    totalPrice: 20000,
    price: 10000,
    total: 20000,
    tax: 2000,
    supplierId: 'supplier_' + Math.random().toString(36).substr(2, 9),
    supplierName: 'Test Supplier',
  };

  return { ...baseItem, ...overrides };
};

// 다양한 상태의 주문 생성 헬퍼
export const createMockOrders = {
  // 처리 중인 주문
  processing: () => createMockOrder({
    status: 'processing' as OrderStatus,
    paymentStatus: 'completed',
  }),
  
  // 완료된 주문
  completed: () => createMockOrder({
    status: 'completed' as OrderStatus,
    paymentStatus: 'completed',
    completedAt: new Date().toISOString(),
  }),
  
  // 취소된 주문
  cancelled: () => createMockOrder({
    status: 'cancelled' as OrderStatus,
    paymentStatus: 'failed',
  }),
  
  // 환불된 주문
  refunded: () => createMockOrder({
    status: 'refunded' as OrderStatus,
    paymentStatus: 'refunded',
    refunds: [{
      id: 'refund_1',
      amount: 25000,
      reason: 'Customer request',
      refundedBy: 'admin',
      refundedAt: new Date().toISOString(),
      items: [],
    }],
  }),
  
  // 대량 주문
  bulk: () => createMockOrder({
    items: [
      createMockOrderItem({ quantity: 10, total: 100000 }),
      createMockOrderItem({ quantity: 5, total: 50000 }),
      createMockOrderItem({ quantity: 3, total: 30000 }),
    ],
    subtotal: 180000,
    total: 205000,
  }),
};
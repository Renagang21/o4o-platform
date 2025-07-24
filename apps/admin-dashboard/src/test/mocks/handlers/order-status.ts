import { http, HttpResponse } from 'msw';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Mock order data with detailed status information
let mockOrders = [
  {
    id: 'order-1',
    orderNumber: 'ORD-2025-0001',
    customerName: '김고객',
    customerEmail: 'customer@example.com',
    status: 'pending',
    totalAmount: 89000,
    items: [
      {
        id: 'item-1',
        productId: 'prod-1',
        productName: '프리미엄 오메가3',
        sku: 'OMEGA3-001',
        quantity: 2,
        unitPrice: 39000,
        totalPrice: 78000,
        variantOptions: { size: '60캡슐', type: '소프트젤' }
      },
      {
        id: 'item-2',
        productId: 'prod-2',
        productName: '비타민D',
        sku: 'VITD-001',
        quantity: 1,
        unitPrice: 11000,
        totalPrice: 11000
      }
    ],
    shippingInfo: {
      recipientName: '김고객',
      phone: '010-1234-5678',
      address: '서울시 강남구 테헤란로 123, 456호',
      postalCode: '12345',
      deliveryRequest: '문 앞에 놓아주세요'
    },
    paymentInfo: {
      method: '토스페이',
      provider: 'tosspayments',
      transactionId: 'toss_20250124001',
      paidAt: '2025-01-24T09:00:00Z',
      amount: 89000
    },
    statusHistory: [
      {
        id: 'hist-1',
        status: 'pending',
        changedAt: '2025-01-24T09:00:00Z',
        changedBy: 'system',
        reason: '주문 접수',
        notes: '고객의 새 주문이 접수되었습니다'
      }
    ],
    createdAt: '2025-01-24T09:00:00Z',
    updatedAt: '2025-01-24T09:00:00Z',
    notes: '첫 주문 고객'
  },
  {
    id: 'order-2',
    orderNumber: 'ORD-2025-0002',
    customerName: '이사업',
    customerEmail: 'business@example.com',
    status: 'confirmed',
    totalAmount: 156000,
    items: [
      {
        id: 'item-3',
        productId: 'prod-3',
        productName: '종합비타민 프리미엄',
        sku: 'MULTI-PREM-001',
        quantity: 3,
        unitPrice: 52000,
        totalPrice: 156000,
        variantOptions: { size: '90정', type: '타블렛' }
      }
    ],
    shippingInfo: {
      recipientName: '이사업',
      phone: '010-2345-6789',
      address: '부산시 해운대구 센텀로 789, 101호',
      postalCode: '54321',
      deliveryRequest: '경비실에 맡겨주세요'
    },
    paymentInfo: {
      method: '카카오페이',
      provider: 'kakaopay',
      transactionId: 'kakao_20250124002',
      paidAt: '2025-01-24T10:30:00Z',
      amount: 156000
    },
    statusHistory: [
      {
        id: 'hist-2',
        status: 'pending',
        changedAt: '2025-01-24T10:30:00Z',
        changedBy: 'system',
        reason: '주문 접수'
      },
      {
        id: 'hist-3',
        status: 'confirmed',
        changedAt: '2025-01-24T11:00:00Z',
        changedBy: 'admin',
        reason: '재고 확인 완료',
        notes: '모든 상품 재고 충분함'
      }
    ],
    createdAt: '2025-01-24T10:30:00Z',
    updatedAt: '2025-01-24T11:00:00Z'
  },
  {
    id: 'order-3',
    orderNumber: 'ORD-2025-0003',
    customerName: '박배송',
    customerEmail: 'shipping@example.com',
    status: 'shipped',
    totalAmount: 67000,
    items: [
      {
        id: 'item-4',
        productId: 'prod-4',
        productName: '프로바이오틱스',
        sku: 'PROBIO-001',
        quantity: 1,
        unitPrice: 67000,
        totalPrice: 67000,
        variantOptions: { count: '100억 CFU', capsules: '30캡슐' }
      }
    ],
    shippingInfo: {
      recipientName: '박배송',
      phone: '010-3456-7890',
      address: '대구시 중구 국채보상로 456, 789호',
      postalCode: '67890'
    },
    paymentInfo: {
      method: '신용카드',
      provider: 'tosspayments',
      transactionId: 'toss_20250123001',
      paidAt: '2025-01-23T14:00:00Z',
      amount: 67000
    },
    statusHistory: [
      {
        id: 'hist-4',
        status: 'pending',
        changedAt: '2025-01-23T14:00:00Z',
        changedBy: 'system',
        reason: '주문 접수'
      },
      {
        id: 'hist-5',
        status: 'confirmed',
        changedAt: '2025-01-23T15:00:00Z',
        changedBy: 'admin',
        reason: '주문 확인'
      },
      {
        id: 'hist-6',
        status: 'processing',
        changedAt: '2025-01-23T16:00:00Z',
        changedBy: 'admin',
        reason: '포장 작업 시작'
      },
      {
        id: 'hist-7',
        status: 'shipped',
        changedAt: '2025-01-24T09:00:00Z',
        changedBy: 'admin',
        reason: '배송 출발',
        notes: '택배사: CJ대한통운'
      }
    ],
    trackingNumber: '1234567890123',
    estimatedDelivery: '2025-01-25',
    createdAt: '2025-01-23T14:00:00Z',
    updatedAt: '2025-01-24T09:00:00Z'
  },
  {
    id: 'order-4',
    orderNumber: 'ORD-2025-0004',
    customerName: '최완료',
    customerEmail: 'completed@example.com',
    status: 'completed',
    totalAmount: 234000,
    items: [
      {
        id: 'item-5',
        productId: 'prod-5',
        productName: '콜라겐 플러스',
        sku: 'COLLAGEN-001',
        quantity: 2,
        unitPrice: 89000,
        totalPrice: 178000,
        variantOptions: { flavor: '베리믹스', powder: '분말형' }
      },
      {
        id: 'item-6',
        productId: 'prod-6',
        productName: '루테인',
        sku: 'LUTEIN-001',
        quantity: 1,
        unitPrice: 56000,
        totalPrice: 56000
      }
    ],
    shippingInfo: {
      recipientName: '최완료',
      phone: '010-4567-8901',
      address: '인천시 연수구 컨벤시아대로 123, 456호',
      postalCode: '13579'
    },
    paymentInfo: {
      method: '네이버페이',
      provider: 'naverpay',
      transactionId: 'naver_20250122001',
      paidAt: '2025-01-22T11:00:00Z',
      amount: 234000
    },
    statusHistory: [
      {
        id: 'hist-8',
        status: 'pending',
        changedAt: '2025-01-22T11:00:00Z',
        changedBy: 'system',
        reason: '주문 접수'
      },
      {
        id: 'hist-9',
        status: 'confirmed',
        changedAt: '2025-01-22T12:00:00Z',
        changedBy: 'admin',
        reason: '주문 확인'
      },
      {
        id: 'hist-10',
        status: 'processing',
        changedAt: '2025-01-22T14:00:00Z',
        changedBy: 'admin',
        reason: '포장 준비'
      },
      {
        id: 'hist-11',
        status: 'shipped',
        changedAt: '2025-01-22T16:00:00Z',
        changedBy: 'admin',
        reason: '배송 시작'
      },
      {
        id: 'hist-12',
        status: 'delivered',
        changedAt: '2025-01-23T10:00:00Z',
        changedBy: 'system',
        reason: '배송 완료',
        notes: '고객 직접 수령 확인'
      },
      {
        id: 'hist-13',
        status: 'completed',
        changedAt: '2025-01-24T10:00:00Z',
        changedBy: 'system',
        reason: '주문 완료',
        notes: '구매 확정 완료'
      }
    ],
    trackingNumber: '9876543210987',
    createdAt: '2025-01-22T11:00:00Z',
    updatedAt: '2025-01-24T10:00:00Z'
  },
  {
    id: 'order-5',
    orderNumber: 'ORD-2025-0005',
    customerName: '한취소',
    customerEmail: 'cancelled@example.com',
    status: 'cancelled',
    totalAmount: 45000,
    items: [
      {
        id: 'item-7',
        productId: 'prod-7',
        productName: '마그네슘',
        sku: 'MAG-001',
        quantity: 1,
        unitPrice: 45000,
        totalPrice: 45000
      }
    ],
    shippingInfo: {
      recipientName: '한취소',
      phone: '010-5678-9012',
      address: '광주시 서구 치평로 789, 123호',
      postalCode: '24680'
    },
    paymentInfo: {
      method: '토스페이',
      provider: 'tosspayments',
      transactionId: 'toss_20250121001',
      paidAt: '2025-01-21T13:00:00Z',
      amount: 45000
    },
    statusHistory: [
      {
        id: 'hist-14',
        status: 'pending',
        changedAt: '2025-01-21T13:00:00Z',
        changedBy: 'system',
        reason: '주문 접수'
      },
      {
        id: 'hist-15',
        status: 'cancelled',
        changedAt: '2025-01-21T14:30:00Z',
        changedBy: 'customer',
        reason: '고객 취소 요청',
        notes: '단순 변심으로 인한 취소'
      }
    ],
    createdAt: '2025-01-21T13:00:00Z',
    updatedAt: '2025-01-21T14:30:00Z'
  }
];

export const orderStatusHandlers = [
  // Get orders with filtering
  http.get(`${API_BASE}/v1/ecommerce/orders`, ({ request }: any) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    const status = url.searchParams.get('status');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    let filteredOrders = [...mockOrders];

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filteredOrders = filteredOrders.filter(order =>
        order.orderNumber.toLowerCase().includes(searchLower) ||
        order.customerName.toLowerCase().includes(searchLower) ||
        order.customerEmail.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (status && status !== 'all') {
      filteredOrders = filteredOrders.filter(order => order.status === status);
    }

    // Sort by creation date (newest first)
    filteredOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

    return HttpResponse.json({
      success: true,
      data: paginatedOrders,
      pagination: {
        current: page,
        total: Math.ceil(filteredOrders.length / limit),
        count: paginatedOrders.length,
        totalItems: filteredOrders.length
      }
    });
  }),

  // Get order statistics
  http.get(`${API_BASE}/v1/ecommerce/orders/stats`, () => {
    const stats = mockOrders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return HttpResponse.json({
      success: true,
      data: {
        pending: stats.pending || 0,
        confirmed: stats.confirmed || 0,
        processing: stats.processing || 0,
        shipped: stats.shipped || 0,
        delivered: stats.delivered || 0,
        completed: stats.completed || 0,
        cancelled: stats.cancelled || 0,
        refunded: stats.refunded || 0,
        total: mockOrders.length
      }
    });
  }),

  // Get single order
  http.get(`${API_BASE}/v1/ecommerce/orders/:id`, ({ params }: any) => {
    const order = mockOrders.find(o => o.id === params.id);
    
    if (!order) {
      return HttpResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: order
    });
  }),

  // Update order status
  http.put(`${API_BASE}/v1/ecommerce/orders/:id/status`, async ({ params, request }: any) => {
    const { id } = params;
    const data = await request.json();
    
    const orderIndex = mockOrders.findIndex(o => o.id === id);
    if (orderIndex === -1) {
      return HttpResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = mockOrders[orderIndex];
    const now = new Date().toISOString();
    
    // Add status history entry
    const newHistoryEntry = {
      id: `hist-${Date.now()}`,
      status: data.newStatus,
      changedAt: now,
      changedBy: 'admin',
      reason: data.reason || '관리자 상태 변경',
      notes: data.notes
    };

    // Update order
    mockOrders[orderIndex] = {
      ...order,
      status: data.newStatus,
      updatedAt: now,
      trackingNumber: data.trackingNumber || order.trackingNumber,
      estimatedDelivery: data.estimatedDelivery || order.estimatedDelivery,
      statusHistory: [...(order.statusHistory || []), newHistoryEntry]
    };

    return HttpResponse.json({
      success: true,
      data: mockOrders[orderIndex],
      message: `주문 상태가 변경되었습니다: ${data.newStatus}`
    });
  }),

  // Process refund
  http.post(`${API_BASE}/v1/ecommerce/orders/:id/refund`, async ({ params, request }: any) => {
    const { id } = params;
    const data = await request.json();
    
    const orderIndex = mockOrders.findIndex(o => o.id === id);
    if (orderIndex === -1) {
      return HttpResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = mockOrders[orderIndex];
    const now = new Date().toISOString();
    
    // Add refund info
    const refundInfo = {
      requestedAt: now,
      processedAt: now,
      amount: data.amount || order.totalAmount,
      reason: data.reason || '관리자 환불 처리',
      status: 'completed' as const
    };

    // Add status history entry
    const newHistoryEntry = {
      id: `hist-${Date.now()}`,
      status: 'refunded' as const,
      changedAt: now,
      changedBy: 'admin',
      reason: data.reason || '환불 처리',
      notes: `환불 금액: ₩${refundInfo.amount.toLocaleString()}`
    };

    // Update order
    mockOrders[orderIndex] = {
      ...order,
      status: 'refunded',
      updatedAt: now,
      refundInfo,
      statusHistory: [...(order.statusHistory || []), newHistoryEntry]
    };

    return HttpResponse.json({
      success: true,
      data: {
        order: mockOrders[orderIndex],
        refund: refundInfo
      },
      message: '환불이 처리되었습니다'
    });
  }),

  // Get order status workflow
  http.get(`${API_BASE}/v1/ecommerce/orders/workflow`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        statuses: [
          { key: 'pending', label: '대기중', description: '주문이 접수되어 확인 대기 중입니다', color: '#f59e0b' },
          { key: 'confirmed', label: '확인됨', description: '주문이 확인되어 처리 준비 중입니다', color: '#3b82f6' },
          { key: 'processing', label: '처리중', description: '상품을 포장하고 배송 준비 중입니다', color: '#8b5cf6' },
          { key: 'shipped', label: '배송중', description: '상품이 배송 중입니다', color: '#6366f1' },
          { key: 'delivered', label: '배송완료', description: '상품이 배송 완료되었습니다', color: '#10b981' },
          { key: 'completed', label: '완료', description: '주문이 완전히 완료되었습니다', color: '#059669' },
          { key: 'cancelled', label: '취소', description: '주문이 취소되었습니다', color: '#6b7280' },
          { key: 'refunded', label: '환불', description: '주문이 환불 처리되었습니다', color: '#ef4444' }
        ],
        transitions: {
          pending: ['confirmed', 'cancelled'],
          confirmed: ['processing', 'cancelled'],
          processing: ['shipped', 'cancelled'],
          shipped: ['delivered', 'cancelled'],
          delivered: ['completed', 'refunded'],
          completed: ['refunded'],
          cancelled: ['refunded'],
          refunded: []
        }
      }
    });
  })
];
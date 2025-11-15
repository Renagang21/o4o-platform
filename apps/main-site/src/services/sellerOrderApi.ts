/**
 * Seller Order API Service
 * Phase 3-7: 판매자 주문 관리 API 클라이언트
 * Phase 6-1: Mock/Real API integration
 */

import { authClient } from '@o4o/auth-client';
import { API_ENDPOINTS } from '../config/apiEndpoints';
import { MOCK_FLAGS } from '../config/mockFlags';
import {
  SellerOrderStatus,
  SellerOrderListItem,
  SellerOrderDetail,
  SellerOrderItem,
  GetSellerOrdersQuery,
  GetSellerOrdersResponse,
  GetSellerOrderDetailResponse,
  UpdateSellerOrderStatusRequest,
  UpdateSellerOrderStatusResponse,
  UpdateSellerOrderMemoRequest,
  UpdateSellerOrderMemoResponse,
} from '../types/seller-order';
import type { Order } from '../types/storefront';

// Mock data for development
const MOCK_ORDERS: SellerOrderDetail[] = [
  {
    id: 'order-001',
    order_number: 'ORD-20251114-001',
    created_at: new Date().toISOString(), // 오늘
    status: 'NEW',
    channel: '스토어',
    memo_from_buyer: '문 앞에 놓아주세요.',
    memo_internal: '',
    buyer: {
      name: '김철수',
      phone: '010-1234-5678',
      email: 'chulsoo@example.com',
    },
    shipping_address: {
      receiver_name: '김철수',
      postal_code: '06234',
      address1: '서울특별시 강남구 테헤란로 123',
      address2: '101동 505호',
      phone: '010-1234-5678',
    },
    items: [
      {
        id: 'item-001-1',
        product_name: '프리미엄 유기농 쌀 10kg',
        sku: 'SELLER-001',
        quantity: 2,
        unit_price: 35000,
        line_total: 70000,
        supplier_name: '네이처 팜',
      },
    ],
    totals: {
      subtotal: 70000,
      shipping_fee: 3000,
      discount: 0,
      total: 73000,
      currency: 'KRW',
    },
  },
  {
    id: 'order-002',
    order_number: 'ORD-20251111-002',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3일 전
    status: 'CONFIRMED',
    channel: 'Naver',
    memo_from_buyer: '',
    memo_internal: '공급자에 전달 완료',
    buyer: {
      name: '이영희',
      phone: '010-9876-5432',
      email: 'younghee@example.com',
    },
    shipping_address: {
      receiver_name: '이영희',
      postal_code: '13517',
      address1: '경기도 성남시 분당구 판교로 289',
      address2: '',
      phone: '010-9876-5432',
    },
    items: [
      {
        id: 'item-002-1',
        product_name: '신선한 방울토마토 1kg',
        sku: 'SELLER-002',
        quantity: 3,
        unit_price: 12000,
        line_total: 36000,
        supplier_name: '그린 농장',
      },
      {
        id: 'item-002-2',
        product_name: '제주 감귤 5kg',
        sku: 'SELLER-004',
        quantity: 1,
        unit_price: 25000,
        line_total: 25000,
      },
    ],
    totals: {
      subtotal: 61000,
      shipping_fee: 3000,
      discount: 5000,
      total: 59000,
      currency: 'KRW',
    },
  },
  {
    id: 'order-003',
    order_number: 'ORD-20251104-003',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10일 전
    status: 'SHIPPED',
    channel: '쿠팡',
    memo_from_buyer: '배송 전 연락 주세요.',
    memo_internal: '',
    buyer: {
      name: '박민수',
      phone: '010-5555-6666',
      email: 'minsoo@example.com',
    },
    shipping_address: {
      receiver_name: '박민수',
      postal_code: '48058',
      address1: '부산광역시 해운대구 센텀중앙로 78',
      address2: '센텀아파트 205동 1001호',
      phone: '010-5555-6666',
    },
    items: [
      {
        id: 'item-003-1',
        product_name: '국내산 한우 등심 500g',
        sku: 'SELLER-003',
        quantity: 1,
        unit_price: 55000,
        line_total: 55000,
        supplier_name: '프리미엄 미트',
      },
    ],
    totals: {
      subtotal: 55000,
      shipping_fee: 5000,
      discount: 0,
      total: 60000,
      currency: 'KRW',
    },
    shipping_info: {
      courier: 'CJ대한통운',
      tracking_number: '123456789012',
      shipped_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    },
  },
  {
    id: 'order-004',
    order_number: 'ORD-20251015-004',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30일 전
    status: 'COMPLETED',
    channel: '스토어',
    memo_from_buyer: '',
    memo_internal: '정상 완료',
    buyer: {
      name: '정수연',
      phone: '010-7777-8888',
      email: 'sooyeon@example.com',
    },
    shipping_address: {
      receiver_name: '정수연',
      postal_code: '04524',
      address1: '서울특별시 중구 을지로 100',
      address2: '',
      phone: '010-7777-8888',
    },
    items: [
      {
        id: 'item-004-1',
        product_name: '프리미엄 유기농 쌀 10kg',
        sku: 'SELLER-001',
        quantity: 1,
        unit_price: 35000,
        line_total: 35000,
      },
      {
        id: 'item-004-2',
        product_name: '신선한 방울토마토 1kg',
        sku: 'SELLER-002',
        quantity: 2,
        unit_price: 12000,
        line_total: 24000,
      },
    ],
    totals: {
      subtotal: 59000,
      shipping_fee: 3000,
      discount: 0,
      total: 62000,
      currency: 'KRW',
    },
    shipping_info: {
      courier: '한진택배',
      tracking_number: '987654321098',
      shipped_at: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
    },
  },
  {
    id: 'order-005',
    order_number: 'ORD-20251112-005',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2일 전
    status: 'CANCELLED',
    channel: 'Naver',
    memo_from_buyer: '취소 요청합니다.',
    memo_internal: '고객 요청으로 취소 처리',
    buyer: {
      name: '최지훈',
      phone: '010-3333-4444',
      email: 'jihoon@example.com',
    },
    shipping_address: {
      receiver_name: '최지훈',
      postal_code: '34141',
      address1: '대전광역시 유성구 대덕대로 512',
      address2: '',
      phone: '010-3333-4444',
    },
    items: [
      {
        id: 'item-005-1',
        product_name: '제주 감귤 5kg',
        sku: 'SELLER-004',
        quantity: 2,
        unit_price: 25000,
        line_total: 50000,
      },
    ],
    totals: {
      subtotal: 50000,
      shipping_fee: 3000,
      discount: 0,
      total: 53000,
      currency: 'KRW',
    },
  },
  {
    id: 'order-006',
    order_number: 'ORD-20251113-006',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1일 전
    status: 'IN_PROGRESS',
    channel: '스토어',
    memo_from_buyer: '빠른 배송 부탁드립니다.',
    memo_internal: '긴급 주문 처리 중',
    buyer: {
      name: '홍길동',
      phone: '010-2222-3333',
      email: 'gildong@example.com',
    },
    shipping_address: {
      receiver_name: '홍길동',
      postal_code: '61186',
      address1: '광주광역시 북구 첨단과기로 208',
      address2: '테크노파크 B동 301호',
      phone: '010-2222-3333',
    },
    items: [
      {
        id: 'item-006-1',
        product_name: '유기농 계란 30개입',
        sku: 'SELLER-005',
        quantity: 3,
        unit_price: 18000,
        line_total: 54000,
        supplier_name: '해피 팜',
      },
    ],
    totals: {
      subtotal: 54000,
      shipping_fee: 3000,
      discount: 2000,
      total: 55000,
      currency: 'KRW',
    },
  },
];

// Phase 6-1: Use centralized mock flag
const USE_MOCK_SELLER_ORDERS = MOCK_FLAGS.SELLER_ORDERS;

/**
 * Mock API delay
 */
const mockDelay = (ms: number = 500): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Convert detail to list item
 */
const toListItem = (order: SellerOrderDetail): SellerOrderListItem => {
  const itemCount = order.items.length;
  const firstItem = order.items[0]?.product_name || '';
  const item_summary =
    itemCount > 1 ? `${firstItem} 외 ${itemCount - 1}개` : firstItem;

  return {
    id: order.id,
    order_number: order.order_number,
    created_at: order.created_at,
    status: order.status,
    buyer_name: order.buyer.name,
    buyer_email: order.buyer.email,
    buyer_phone: order.buyer.phone,
    total_amount: order.totals.total,
    currency: order.totals.currency,
    channel: order.channel,
    item_summary,
  };
};

/**
 * Filter and sort mock orders
 */
const filterAndSortMockOrders = (
  orders: SellerOrderDetail[],
  query: GetSellerOrdersQuery
): SellerOrderDetail[] => {
  let result = [...orders];

  // Search filter
  if (query.search) {
    const search = query.search.toLowerCase();
    result = result.filter(
      (order) =>
        order.order_number.toLowerCase().includes(search) ||
        order.buyer.name.toLowerCase().includes(search) ||
        order.items.some((item) =>
          item.product_name.toLowerCase().includes(search)
        )
    );
  }

  // Status filter
  if (query.status && query.status !== 'ALL') {
    result = result.filter((order) => order.status === query.status);
  }

  // Date range filter
  if (query.date_from) {
    const fromDate = new Date(query.date_from);
    result = result.filter(
      (order) => new Date(order.created_at) >= fromDate
    );
  }
  if (query.date_to) {
    const toDate = new Date(query.date_to);
    toDate.setHours(23, 59, 59, 999);
    result = result.filter(
      (order) => new Date(order.created_at) <= toDate
    );
  }

  // Sort
  const sortBy = query.sort_by || 'created_at';
  const sortOrder = query.sort_order || 'desc';

  result.sort((a, b) => {
    let aVal: any, bVal: any;

    if (sortBy === 'created_at') {
      aVal = new Date(a.created_at).getTime();
      bVal = new Date(b.created_at).getTime();
    } else if (sortBy === 'total_amount') {
      aVal = a.totals.total;
      bVal = b.totals.total;
    }

    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  return result;
};

/**
 * Paginate data
 */
const paginateData = <T>(
  data: T[],
  page: number,
  limit: number
): { data: T[]; total: number; total_pages: number } => {
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedData = data.slice(start, end);
  const total = data.length;
  const total_pages = Math.ceil(total / limit);

  return {
    data: paginatedData,
    total,
    total_pages,
  };
};

// Make MOCK_ORDERS mutable for testing
let mockOrdersStore = [...MOCK_ORDERS];
let mockOrderCounter = MOCK_ORDERS.length + 1;

/**
 * Seller Order API
 */
export const sellerOrderAPI = {
  /**
   * Create seller order from customer order
   * Phase 5-1 Step 2: Customer → Seller order integration
   */
  async createFromCustomerOrder(customerOrder: Order, sellerId: string): Promise<SellerOrderDetail> {
    if (USE_MOCK_SELLER_ORDERS) {
      await mockDelay();

      // Filter items for this seller
      const sellerItems = customerOrder.items.filter(
        (item) => item.seller_id === sellerId
      );

      if (sellerItems.length === 0) {
        throw new Error(`판매자 ${sellerId}의 주문 아이템이 없습니다.`);
      }

      // Convert to SellerOrderItem format
      const orderItems: SellerOrderItem[] = sellerItems.map((item, index) => ({
        id: `item-${customerOrder.id}-${index + 1}`,
        product_name: item.product_name,
        sku: item.product_id, // Use product_id as SKU for now
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.total_price,
        seller_product_id: item.product_id,
      }));

      // Calculate totals for this seller
      const subtotal = orderItems.reduce((sum, item) => sum + item.line_total, 0);
      const shipping_fee = customerOrder.shipping_fee; // Simplified: use full shipping fee
      const total = subtotal + shipping_fee;

      // Create seller order
      const newOrder: SellerOrderDetail = {
        id: `seller-order-${String(mockOrderCounter++).padStart(3, '0')}`,
        order_number: `${customerOrder.order_number}-S${sellerId.slice(-3)}`,
        created_at: customerOrder.created_at,
        status: 'NEW',
        channel: '스토어',
        memo_from_buyer: customerOrder.customer.order_note,
        memo_internal: `고객 주문 ${customerOrder.order_number}에서 생성`,
        buyer: {
          name: customerOrder.customer.name,
          phone: customerOrder.customer.phone,
          email: customerOrder.customer.email,
        },
        shipping_address: {
          receiver_name: customerOrder.customer.name,
          postal_code: customerOrder.customer.shipping_address.postcode,
          address1: customerOrder.customer.shipping_address.address,
          address2: customerOrder.customer.shipping_address.address_detail,
          phone: customerOrder.customer.phone,
        },
        items: orderItems,
        totals: {
          subtotal,
          shipping_fee,
          discount: 0,
          total,
          currency: customerOrder.currency,
        },
      };

      // Add to mock store
      mockOrdersStore.unshift(newOrder);

      return newOrder;
    }

    // Real API call
    const response = await authClient.api.post(API_ENDPOINTS.SELLER_ORDERS.CREATE_FROM_CUSTOMER, {
      customer_order_id: customerOrder.id,
      seller_id: sellerId,
    });
    return response.data;
  },
  /**
   * Fetch seller orders list
   */
  async fetchSellerOrders(
    query: GetSellerOrdersQuery = {}
  ): Promise<GetSellerOrdersResponse> {
    if (USE_MOCK_SELLER_ORDERS) {
      await mockDelay();

      const page = query.page || 1;
      const limit = query.limit || 20;

      // Filter and sort (use mockOrdersStore instead of MOCK_ORDERS)
      const filtered = filterAndSortMockOrders(mockOrdersStore, query);

      // Paginate
      const { data, total, total_pages } = paginateData(filtered, page, limit);

      return {
        success: true,
        data: {
          orders: data.map(toListItem),
          pagination: {
            total,
            page,
            limit,
            total_pages,
          },
        },
      };
    }

    // Real API call
    const response = await authClient.api.get(API_ENDPOINTS.SELLER_ORDERS.LIST, {
      params: query,
    });
    return response.data;
  },

  /**
   * Fetch seller order detail
   */
  async fetchSellerOrderDetail(
    id: string
  ): Promise<GetSellerOrderDetailResponse> {
    if (USE_MOCK_SELLER_ORDERS) {
      await mockDelay();

      const order = mockOrdersStore.find((o) => o.id === id);
      if (!order) {
        throw new Error('주문을 찾을 수 없습니다.');
      }

      return {
        success: true,
        data: order,
      };
    }

    // Real API call
    const response = await authClient.api.get(API_ENDPOINTS.SELLER_ORDERS.DETAIL(id));
    return response.data;
  },

  /**
   * Update seller order status
   */
  async updateSellerOrderStatus(
    id: string,
    payload: UpdateSellerOrderStatusRequest
  ): Promise<UpdateSellerOrderStatusResponse> {
    if (USE_MOCK_SELLER_ORDERS) {
      await mockDelay();

      const orderIndex = mockOrdersStore.findIndex((o) => o.id === id);
      if (orderIndex === -1) {
        throw new Error('주문을 찾을 수 없습니다.');
      }

      const order = mockOrdersStore[orderIndex];
      const previousStatus = order.status;

      // Update order
      mockOrdersStore[orderIndex] = {
        ...mockOrdersStore[orderIndex],
        status: payload.status,
      };

      // Update shipping info if provided
      if (payload.shipping_info) {
        mockOrdersStore[orderIndex].shipping_info = {
          ...mockOrdersStore[orderIndex].shipping_info,
          ...payload.shipping_info,
          shipped_at:
            payload.status === 'SHIPPED'
              ? new Date().toISOString()
              : mockOrdersStore[orderIndex].shipping_info?.shipped_at,
        };
      }

      // Phase 5-1 Step 2: State synchronization
      // When seller confirms order → trigger supplier order to PROCESSING
      if (payload.status === 'CONFIRMED' && previousStatus !== 'CONFIRMED') {
        try {
          // Import here to avoid circular dependency issues
          const { supplierOrderAPI } = await import('./supplierOrderApi');
          const { SupplierOrderStatus } = await import('../types/supplier-order');

          // Extract customer order number from seller order number
          // Format: ORD-2025-00001-S001 → ORD-2025-00001
          const baseOrderNumber = order.order_number.replace(/-S\d+$/, '');

          // Sync supplier orders to PROCESSING status
          await supplierOrderAPI.syncSupplierOrdersByCustomerOrderNumber(
            baseOrderNumber,
            SupplierOrderStatus.PROCESSING
          );
        } catch (err) {
          console.error('[State Sync] Error syncing to supplier orders:', err);
        }
      }

      return {
        success: true,
        data: mockOrdersStore[orderIndex],
        message: '주문 상태가 업데이트되었습니다.',
      };
    }

    // Real API call
    const response = await authClient.api.patch(
      API_ENDPOINTS.SELLER_ORDERS.UPDATE_STATUS(id),
      payload
    );
    return response.data;
  },

  /**
   * Update seller order internal memo
   */
  async updateSellerOrderMemo(
    id: string,
    payload: UpdateSellerOrderMemoRequest
  ): Promise<UpdateSellerOrderMemoResponse> {
    if (USE_MOCK_SELLER_ORDERS) {
      await mockDelay();

      const orderIndex = mockOrdersStore.findIndex((o) => o.id === id);
      if (orderIndex === -1) {
        throw new Error('주문을 찾을 수 없습니다.');
      }

      mockOrdersStore[orderIndex] = {
        ...mockOrdersStore[orderIndex],
        memo_internal: payload.memo_internal,
      };

      return {
        success: true,
        data: mockOrdersStore[orderIndex],
        message: '메모가 저장되었습니다.',
      };
    }

    // Real API call
    const response = await authClient.api.patch(
      API_ENDPOINTS.SELLER_ORDERS.UPDATE_MEMO(id),
      payload
    );
    return response.data;
  },

  /**
   * Sync seller order status based on customer order number (Phase 5-1 Step 2)
   * Used for state synchronization when supplier ships order
   */
  async syncSellerOrdersByCustomerOrderNumber(
    customerOrderNumber: string,
    newStatus: SellerOrderStatus,
    shippingInfo?: { courier?: string; tracking_number?: string }
  ): Promise<void> {
    if (USE_MOCK_SELLER_ORDERS) {
      // Find seller orders that match the customer order number
      const matchingOrders = mockOrdersStore.filter((order) =>
        order.order_number.startsWith(customerOrderNumber)
      );

      for (const order of matchingOrders) {
        const orderIndex = mockOrdersStore.findIndex((o) => o.id === order.id);
        if (orderIndex !== -1) {
          mockOrdersStore[orderIndex].status = newStatus;

          // Update shipping info if provided
          if (shippingInfo && newStatus === 'SHIPPED') {
            mockOrdersStore[orderIndex].shipping_info = {
              ...mockOrdersStore[orderIndex].shipping_info,
              ...shippingInfo,
              shipped_at: new Date().toISOString(),
            };
          }
        }
      }

      return;
    }

    // Real API call
    await authClient.api.post(API_ENDPOINTS.SELLER_ORDERS.SYNC_STATUS, {
      customer_order_number: customerOrderNumber,
      new_status: newStatus,
      shipping_info: shippingInfo,
    });
  },
};

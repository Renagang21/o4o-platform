/**
 * Supplier Order API Service
 * Phase 3-2: Order management API client
 */

import { authClient } from '@o4o/auth-client';
import {
  GetSupplierOrdersQuery,
  GetSupplierOrdersResponse,
  GetSupplierOrderDetailResponse,
  UpdateOrderStatusRequest,
  UpdateOrderStatusResponse,
  SupplierOrderDetail,
  SupplierOrderStatus,
  SupplierOrderListItem,
} from '../types/supplier-order';

// Mock data for development
const MOCK_ORDERS: SupplierOrderDetail[] = [
  {
    id: '1',
    order_number: 'ORD-2025-00001',
    supplier_id: 'supplier-1',
    buyer_name: '홍길동',
    buyer_phone: '010-1234-5678',
    buyer_email: 'hong@example.com',
    shipping_address: {
      postal_code: '06234',
      address1: '서울시 강남구 테헤란로 123',
      address2: '456호',
      city: '서울',
    },
    order_status: SupplierOrderStatus.NEW,
    order_date: '2025-11-14T10:23:00Z',
    total_amount: 59000,
    channel: '온라인몰',
    note: '배송 전 연락 부탁드립니다.',
    items: [
      {
        id: 'item-1',
        product_id: '1',
        product_name: '프리미엄 유기농 쌀',
        sku: 'PROD-001',
        option_name: '10kg',
        quantity: 2,
        supply_price: 25000,
        line_total: 50000,
        thumbnail_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=100',
      },
      {
        id: 'item-2',
        product_id: '2',
        product_name: '신선한 방울토마토',
        sku: 'PROD-002',
        option_name: '1kg',
        quantity: 1,
        supply_price: 9000,
        line_total: 9000,
        thumbnail_url: 'https://images.unsplash.com/photo-1592921870789-04563d55041c?w=100',
      },
    ],
    created_at: '2025-11-14T10:23:00Z',
    updated_at: '2025-11-14T10:23:00Z',
  },
  {
    id: '2',
    order_number: 'ORD-2025-00002',
    supplier_id: 'supplier-1',
    buyer_name: '김영희',
    buyer_phone: '010-2345-6789',
    buyer_email: 'kim@example.com',
    shipping_address: {
      postal_code: '13494',
      address1: '경기도 성남시 분당구 판교로 234',
      address2: '101동 502호',
      city: '성남',
    },
    order_status: SupplierOrderStatus.PROCESSING,
    order_date: '2025-11-14T09:15:00Z',
    total_amount: 15000,
    channel: '제휴몰A',
    items: [
      {
        id: 'item-3',
        product_id: '4',
        product_name: '제주 감귤',
        sku: 'PROD-004',
        option_name: '5kg',
        quantity: 1,
        supply_price: 15000,
        line_total: 15000,
        thumbnail_url: 'https://images.unsplash.com/photo-1580918-5a40c4e94?w=100',
      },
    ],
    created_at: '2025-11-14T09:15:00Z',
    updated_at: '2025-11-14T11:30:00Z',
  },
  {
    id: '3',
    order_number: 'ORD-2025-00003',
    supplier_id: 'supplier-1',
    buyer_name: '이민수',
    buyer_phone: '010-3456-7890',
    buyer_email: 'lee@example.com',
    shipping_address: {
      postal_code: '48058',
      address1: '부산시 해운대구 마린시티 345',
      address2: '2001호',
      city: '부산',
    },
    order_status: SupplierOrderStatus.SHIPPED,
    order_date: '2025-11-13T14:20:00Z',
    total_amount: 89000,
    channel: '온라인몰',
    courier: 'CJ대한통운',
    tracking_number: '123456789012',
    shipped_at: '2025-11-14T08:00:00Z',
    items: [
      {
        id: 'item-4',
        product_id: '1',
        product_name: '프리미엄 유기농 쌀',
        sku: 'PROD-001',
        option_name: '10kg',
        quantity: 3,
        supply_price: 25000,
        line_total: 75000,
        thumbnail_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=100',
      },
      {
        id: 'item-5',
        product_id: '5',
        product_name: '유기농 계란',
        sku: 'PROD-005',
        option_name: '30개입',
        quantity: 1,
        supply_price: 14000,
        line_total: 14000,
        thumbnail_url: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=100',
      },
    ],
    created_at: '2025-11-13T14:20:00Z',
    updated_at: '2025-11-14T08:00:00Z',
  },
  {
    id: '4',
    order_number: 'ORD-2025-00004',
    supplier_id: 'supplier-1',
    buyer_name: '박지성',
    buyer_phone: '010-4567-8901',
    buyer_email: 'park@example.com',
    shipping_address: {
      postal_code: '34126',
      address1: '대전시 유성구 대학로 456',
      address2: '상가 1층',
      city: '대전',
    },
    order_status: SupplierOrderStatus.CANCELLED,
    order_date: '2025-11-13T11:45:00Z',
    total_amount: 45000,
    channel: '온라인몰',
    note: '고객 요청으로 취소됨',
    items: [
      {
        id: 'item-6',
        product_id: '3',
        product_name: '국내산 한우 등심',
        sku: 'PROD-003',
        option_name: '1kg',
        quantity: 1,
        supply_price: 45000,
        line_total: 45000,
        thumbnail_url: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=100',
      },
    ],
    created_at: '2025-11-13T11:45:00Z',
    updated_at: '2025-11-13T15:20:00Z',
  },
  {
    id: '5',
    order_number: 'ORD-2025-00005',
    supplier_id: 'supplier-1',
    buyer_name: '정수진',
    buyer_phone: '010-5678-9012',
    buyer_email: 'jung@example.com',
    shipping_address: {
      postal_code: '63309',
      address1: '제주시 첨단로 567',
      address2: '빌라 201호',
      city: '제주',
    },
    order_status: SupplierOrderStatus.COMPLETED,
    order_date: '2025-11-12T16:30:00Z',
    total_amount: 32000,
    channel: '제휴몰B',
    courier: '우체국택배',
    tracking_number: '987654321098',
    shipped_at: '2025-11-13T09:00:00Z',
    items: [
      {
        id: 'item-7',
        product_id: '2',
        product_name: '신선한 방울토마토',
        sku: 'PROD-002',
        option_name: '1kg',
        quantity: 2,
        supply_price: 9000,
        line_total: 18000,
        thumbnail_url: 'https://images.unsplash.com/photo-1592921870789-04563d55041c?w=100',
      },
      {
        id: 'item-8',
        product_id: '5',
        product_name: '유기농 계란',
        sku: 'PROD-005',
        option_name: '30개입',
        quantity: 1,
        supply_price: 14000,
        line_total: 14000,
        thumbnail_url: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=100',
      },
    ],
    created_at: '2025-11-12T16:30:00Z',
    updated_at: '2025-11-14T10:00:00Z',
  },
];

// Enable/disable mock mode
const USE_MOCK_DATA = true;

/**
 * Mock API delay
 */
const mockDelay = (ms: number = 500): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Filter and sort mock orders
 */
const filterAndSortMockOrders = (
  orders: SupplierOrderDetail[],
  query: GetSupplierOrdersQuery
): SupplierOrderDetail[] => {
  let result = [...orders];

  // Search filter
  if (query.search) {
    const search = query.search.toLowerCase();
    result = result.filter(
      (order) =>
        order.order_number.toLowerCase().includes(search) ||
        order.buyer_name.toLowerCase().includes(search) ||
        order.items.some((item) => item.product_name.toLowerCase().includes(search))
    );
  }

  // Status filter
  if (query.status && query.status !== 'all') {
    result = result.filter((order) => order.order_status === query.status);
  }

  // Date range filter
  if (query.date_from) {
    const fromDate = new Date(query.date_from);
    result = result.filter((order) => new Date(order.order_date) >= fromDate);
  }
  if (query.date_to) {
    const toDate = new Date(query.date_to);
    toDate.setHours(23, 59, 59, 999); // End of day
    result = result.filter((order) => new Date(order.order_date) <= toDate);
  }

  // Sort
  const sortBy = query.sort_by || 'order_date';
  const sortOrder = query.sort_order || 'desc';

  result.sort((a, b) => {
    let aVal: any = sortBy === 'order_date' ? new Date(a.order_date).getTime() : a.total_amount;
    let bVal: any = sortBy === 'order_date' ? new Date(b.order_date).getTime() : b.total_amount;

    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  return result;
};

/**
 * Paginate orders
 */
const paginateOrders = (
  orders: SupplierOrderDetail[],
  page: number,
  limit: number
) => {
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedOrders = orders.slice(start, end);
  const total = orders.length;
  const totalPages = Math.ceil(total / limit);

  return {
    orders: paginatedOrders,
    total,
    totalPages,
  };
};

/**
 * Convert detail to list item
 */
const toListItem = (order: SupplierOrderDetail): SupplierOrderListItem => {
  return {
    id: order.id,
    order_number: order.order_number,
    buyer_name: order.buyer_name,
    order_date: order.order_date,
    total_amount: order.total_amount,
    order_status: order.order_status,
  };
};

/**
 * Supplier Order API client
 */
export const supplierOrderAPI = {
  /**
   * Fetch orders with filters, sorting, and pagination
   */
  async fetchOrders(
    query: GetSupplierOrdersQuery = {}
  ): Promise<GetSupplierOrdersResponse> {
    if (USE_MOCK_DATA) {
      await mockDelay();

      const page = query.page || 1;
      const limit = query.limit || 20;

      // Filter and sort
      const filtered = filterAndSortMockOrders(MOCK_ORDERS, query);

      // Paginate
      const { orders, total, totalPages } = paginateOrders(filtered, page, limit);

      return {
        success: true,
        data: {
          orders: orders.map(toListItem),
          pagination: {
            total,
            page,
            limit,
            total_pages: totalPages,
          },
        },
      };
    }

    // Real API call
    const response = await authClient.api.get('/api/v1/dropshipping/supplier/orders', {
      params: query,
    });
    return response.data;
  },

  /**
   * Fetch order detail by ID
   */
  async fetchOrderDetail(id: string): Promise<GetSupplierOrderDetailResponse> {
    if (USE_MOCK_DATA) {
      await mockDelay();

      const order = MOCK_ORDERS.find((o) => o.id === id);
      if (!order) {
        throw new Error('Order not found');
      }

      return {
        success: true,
        data: order,
      };
    }

    // Real API call
    const response = await authClient.api.get(
      `/api/v1/dropshipping/supplier/orders/${id}`
    );
    return response.data;
  },

  /**
   * Update order status
   */
  async updateOrderStatus(
    id: string,
    payload: UpdateOrderStatusRequest
  ): Promise<UpdateOrderStatusResponse> {
    if (USE_MOCK_DATA) {
      await mockDelay();

      const orderIndex = MOCK_ORDERS.findIndex((o) => o.id === id);
      if (orderIndex === -1) {
        throw new Error('Order not found');
      }

      const order = MOCK_ORDERS[orderIndex];

      // Update order status
      order.order_status = payload.order_status;
      order.updated_at = new Date().toISOString();

      // If shipping, update courier and tracking
      if (payload.order_status === SupplierOrderStatus.SHIPPED) {
        order.courier = payload.courier;
        order.tracking_number = payload.tracking_number;
        order.shipped_at = new Date().toISOString();
      }

      return {
        success: true,
        data: {
          id: order.id,
          order_status: order.order_status,
          courier: order.courier,
          tracking_number: order.tracking_number,
          shipped_at: order.shipped_at,
        },
        message: '주문 상태가 변경되었습니다.',
      };
    }

    // Real API call
    const response = await authClient.api.patch(
      `/api/v1/dropshipping/supplier/orders/${id}/status`,
      payload
    );
    return response.data;
  },
};

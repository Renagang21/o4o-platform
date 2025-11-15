/**
 * Storefront API Service
 * Phase 5-1: Customer-facing Storefront API
 */

import { authClient } from '@o4o/auth-client';
import type {
  StorefrontProduct,
  GetProductsQuery,
  GetProductsResponse,
  GetProductDetailResponse,
  CreateOrderRequest,
  CreateOrderResponse,
  GetOrderResponse,
  Order,
  OrderItem,
} from '../types/storefront';
import { sellerOrderAPI } from './sellerOrderApi';
import { supplierOrderAPI } from './supplierOrderApi';

// Mock/Real API 전환 플래그
const USE_MOCK_STOREFRONT =
  import.meta.env.VITE_USE_MOCK_STOREFRONT === 'true' ||
  import.meta.env.DEV;

// Mock 지연 시간
const mockDelay = () => new Promise((resolve) => setTimeout(resolve, 300));

/**
 * Mock 데이터: 상품 목록
 */
const MOCK_PRODUCTS: StorefrontProduct[] = [
  {
    id: 'product-001',
    seller_id: 'seller-001',
    seller_name: '네이처마켓',
    name: '프리미엄 유기농 쌀 10kg',
    description: '100% 국내산 유기농 쌀입니다. 친환경 농법으로 재배하여 안심하고 드실 수 있습니다.',
    category: '쌀/곡물',
    price: 55000,
    original_price: 65000,
    currency: 'KRW',
    stock_quantity: 150,
    is_available: true,
    main_image: 'https://via.placeholder.com/400x400?text=Premium+Rice',
    images: [
      'https://via.placeholder.com/400x400?text=Premium+Rice+1',
      'https://via.placeholder.com/400x400?text=Premium+Rice+2',
    ],
    shipping_fee: 3000,
    estimated_delivery_days: 2,
    created_at: '2025-10-01T09:00:00Z',
    updated_at: '2025-11-01T10:00:00Z',
  },
  {
    id: 'product-002',
    seller_id: 'seller-001',
    seller_name: '네이처마켓',
    name: '신선한 토마토 5kg',
    description: '매일 아침 수확한 싱싱한 토마토입니다. 당도가 높고 영양가가 풍부합니다.',
    category: '채소/과일',
    price: 32000,
    currency: 'KRW',
    stock_quantity: 80,
    is_available: true,
    main_image: 'https://via.placeholder.com/400x400?text=Fresh+Tomato',
    images: [
      'https://via.placeholder.com/400x400?text=Fresh+Tomato+1',
    ],
    shipping_fee: 3000,
    estimated_delivery_days: 1,
    created_at: '2025-10-05T09:00:00Z',
    updated_at: '2025-11-01T10:00:00Z',
  },
  {
    id: 'product-003',
    seller_id: 'seller-001',
    seller_name: '네이처마켓',
    name: '제주 감귤 3kg',
    description: '제주도에서 직송하는 당도 높은 감귤입니다. 비타민C가 풍부합니다.',
    category: '채소/과일',
    price: 28000,
    original_price: 35000,
    currency: 'KRW',
    stock_quantity: 120,
    is_available: true,
    main_image: 'https://via.placeholder.com/400x400?text=Jeju+Tangerine',
    images: [
      'https://via.placeholder.com/400x400?text=Jeju+Tangerine+1',
      'https://via.placeholder.com/400x400?text=Jeju+Tangerine+2',
      'https://via.placeholder.com/400x400?text=Jeju+Tangerine+3',
    ],
    shipping_fee: 3500,
    estimated_delivery_days: 2,
    created_at: '2025-10-10T09:00:00Z',
    updated_at: '2025-11-01T10:00:00Z',
  },
  {
    id: 'product-004',
    seller_id: 'seller-002',
    seller_name: '건강샵',
    name: '건강 간식 세트',
    description: '견과류, 드라이 과일 등이 포함된 건강 간식 세트입니다.',
    category: '간식/스낵',
    price: 22000,
    currency: 'KRW',
    stock_quantity: 200,
    is_available: true,
    main_image: 'https://via.placeholder.com/400x400?text=Healthy+Snack',
    images: [
      'https://via.placeholder.com/400x400?text=Healthy+Snack+1',
    ],
    shipping_fee: 2500,
    estimated_delivery_days: 2,
    created_at: '2025-10-12T09:00:00Z',
    updated_at: '2025-11-01T10:00:00Z',
  },
  {
    id: 'product-005',
    seller_id: 'seller-002',
    seller_name: '건강샵',
    name: '견과류 믹스 500g',
    description: '아몬드, 호두, 캐슈넛 등 프리미엄 견과류를 믹스한 제품입니다.',
    category: '간식/스낵',
    price: 18000,
    currency: 'KRW',
    stock_quantity: 150,
    is_available: true,
    main_image: 'https://via.placeholder.com/400x400?text=Nuts+Mix',
    images: [],
    shipping_fee: 2500,
    estimated_delivery_days: 1,
    created_at: '2025-10-15T09:00:00Z',
    updated_at: '2025-11-01T10:00:00Z',
  },
  {
    id: 'product-006',
    seller_id: 'seller-001',
    seller_name: '네이처마켓',
    name: '무항생제 계란 30구',
    description: '무항생제 인증을 받은 건강한 계란입니다. 신선도를 보장합니다.',
    category: '축산/계란',
    price: 12000,
    currency: 'KRW',
    stock_quantity: 100,
    is_available: true,
    main_image: 'https://via.placeholder.com/400x400?text=Organic+Eggs',
    images: [],
    shipping_fee: 3000,
    estimated_delivery_days: 1,
    created_at: '2025-10-20T09:00:00Z',
    updated_at: '2025-11-01T10:00:00Z',
  },
];

// Mock 저장소
let mockProductsStore = [...MOCK_PRODUCTS];
let mockOrdersStore: Order[] = [];
let orderCounter = 1000;

// Product-to-Supplier mapping (Phase 5-1 Step 2)
// In real implementation, this would come from product authorization data
const PRODUCT_SUPPLIER_MAP: Record<string, { supplier_id: string; supplier_name: string }> = {
  'product-001': { supplier_id: 'supplier-1', supplier_name: '농산물 공급업체 A' },
  'product-002': { supplier_id: 'supplier-1', supplier_name: '농산물 공급업체 A' },
  'product-003': { supplier_id: 'supplier-1', supplier_name: '농산물 공급업체 A' },
  'product-004': { supplier_id: 'supplier-2', supplier_name: '식품 공급업체 B' },
  'product-005': { supplier_id: 'supplier-2', supplier_name: '식품 공급업체 B' },
  'product-006': { supplier_id: 'supplier-1', supplier_name: '농산물 공급업체 A' },
};

/**
 * Mock 헬퍼: 필터링 및 정렬
 */
function filterAndSortProducts(query: GetProductsQuery): StorefrontProduct[] {
  let filtered = [...mockProductsStore];

  // 판매자 필터
  if (query.seller_id) {
    filtered = filtered.filter((p) => p.seller_id === query.seller_id);
  }

  // 카테고리 필터
  if (query.category) {
    filtered = filtered.filter((p) => p.category === query.category);
  }

  // 검색어 필터
  if (query.search) {
    const searchLower = query.search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower)
    );
  }

  // 가격 필터
  if (query.min_price !== undefined) {
    filtered = filtered.filter((p) => p.price >= query.min_price!);
  }
  if (query.max_price !== undefined) {
    filtered = filtered.filter((p) => p.price <= query.max_price!);
  }

  // 재고 있는 것만
  filtered = filtered.filter((p) => p.is_available && p.stock_quantity > 0);

  // 최신순 정렬
  filtered.sort((a, b) => {
    if (a.created_at > b.created_at) return -1;
    if (a.created_at < b.created_at) return 1;
    return 0;
  });

  return filtered;
}

/**
 * Mock 헬퍼: 페이지네이션
 */
function paginateData<T>(
  data: T[],
  page: number,
  limit: number
): { data: T[]; total: number; total_pages: number } {
  const total = data.length;
  const total_pages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedData = data.slice(start, end);

  return { data: paginatedData, total, total_pages };
}

/**
 * 상품 목록 조회
 */
export async function fetchProducts(
  query: GetProductsQuery = {}
): Promise<GetProductsResponse> {
  if (USE_MOCK_STOREFRONT) {
    await mockDelay();

    const page = query.page || 1;
    const limit = query.limit || 12;

    const filtered = filterAndSortProducts(query);
    const { data, total, total_pages } = paginateData(filtered, page, limit);

    return {
      success: true,
      data: {
        products: data,
        pagination: {
          total,
          page,
          limit,
          total_pages,
        },
      },
    };
  }

  // Real API
  const response = await authClient.api.get('/api/v1/storefront/products', {
    params: query,
  });
  return response.data;
}

/**
 * 상품 상세 조회
 */
export async function fetchProductDetail(
  id: string
): Promise<GetProductDetailResponse> {
  if (USE_MOCK_STOREFRONT) {
    await mockDelay();

    const product = mockProductsStore.find((p) => p.id === id);
    if (!product) {
      throw new Error(`상품 ID ${id}를 찾을 수 없습니다.`);
    }

    return {
      success: true,
      data: product,
    };
  }

  // Real API
  const response = await authClient.api.get(`/api/v1/storefront/products/${id}`);
  return response.data;
}

/**
 * 주문 생성
 */
export async function createOrder(
  payload: CreateOrderRequest
): Promise<CreateOrderResponse> {
  if (USE_MOCK_STOREFRONT) {
    await mockDelay();

    // 주문 아이템 구성
    const orderItems: OrderItem[] = [];
    let subtotal = 0;
    let shipping_fee = 0;

    for (const item of payload.items) {
      const product = mockProductsStore.find((p) => p.id === item.product_id);
      if (!product) {
        throw new Error(`상품 ID ${item.product_id}를 찾을 수 없습니다.`);
      }

      if (product.stock_quantity < item.quantity) {
        throw new Error(`${product.name} 재고가 부족합니다.`);
      }

      const total_price = product.price * item.quantity;
      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        seller_id: product.seller_id,
        seller_name: product.seller_name,
        quantity: item.quantity,
        unit_price: product.price,
        total_price,
        main_image: product.main_image,
      });

      subtotal += total_price;
      shipping_fee = Math.max(shipping_fee, product.shipping_fee || 0);

      // 재고 차감 (Mock)
      product.stock_quantity -= item.quantity;
    }

    const total_amount = subtotal + shipping_fee;

    // 주문 생성
    const orderId = `order-${String(orderCounter++).padStart(5, '0')}`;
    const orderNumber = `ORD-${new Date().getFullYear()}-${String(orderCounter).padStart(5, '0')}`;
    const now = new Date().toISOString();

    const newOrder: Order = {
      id: orderId,
      order_number: orderNumber,
      customer: payload.customer,
      items: orderItems,
      currency: 'KRW',
      subtotal,
      shipping_fee,
      total_amount,
      status: 'PENDING',
      created_at: now,
      updated_at: now,
      payment_method: payload.payment_method || 'CARD',
      payment_status: 'PENDING',
    };

    mockOrdersStore.push(newOrder);

    // Phase 5-1 Step 2: Create corresponding seller and supplier orders
    try {
      // Group items by seller
      const sellerGroups = new Map<string, typeof orderItems>();
      for (const item of orderItems) {
        if (!sellerGroups.has(item.seller_id)) {
          sellerGroups.set(item.seller_id, []);
        }
        sellerGroups.get(item.seller_id)!.push(item);
      }

      // Create seller orders
      for (const [sellerId, items] of sellerGroups.entries()) {
        const sellerName = items[0].seller_name;
        await sellerOrderAPI.createFromCustomerOrder(newOrder, sellerId);
        console.log(`[Order Pipeline] Created seller order for ${sellerName} (${sellerId})`);
      }

      // Group items by supplier
      const supplierGroups = new Map<string, { supplier_id: string; supplier_name: string; seller_id: string; seller_name: string }>();
      for (const item of orderItems) {
        const productSupplier = PRODUCT_SUPPLIER_MAP[item.product_id];
        if (productSupplier) {
          const key = `${productSupplier.supplier_id}|${item.seller_id}`;
          if (!supplierGroups.has(key)) {
            supplierGroups.set(key, {
              supplier_id: productSupplier.supplier_id,
              supplier_name: productSupplier.supplier_name,
              seller_id: item.seller_id,
              seller_name: item.seller_name,
            });
          }
        }
      }

      // Create supplier orders
      for (const [key, info] of supplierGroups.entries()) {
        await supplierOrderAPI.createFromCustomerOrder(
          newOrder,
          info.supplier_id,
          { seller_id: info.seller_id, seller_name: info.seller_name }
        );
        console.log(`[Order Pipeline] Created supplier order for ${info.supplier_name} (${info.supplier_id}) via ${info.seller_name}`);
      }
    } catch (err) {
      console.error('[Order Pipeline] Error creating seller/supplier orders:', err);
      // Don't fail customer order if seller/supplier order creation fails
      // In production, this should be handled with retry logic or queues
    }

    return {
      success: true,
      data: newOrder,
      message: '주문이 성공적으로 생성되었습니다.',
    };
  }

  // Real API
  const response = await authClient.api.post('/api/v1/storefront/orders', payload);
  return response.data;
}

/**
 * 주문 조회
 */
export async function fetchOrder(id: string): Promise<GetOrderResponse> {
  if (USE_MOCK_STOREFRONT) {
    await mockDelay();

    const order = mockOrdersStore.find((o) => o.id === id);
    if (!order) {
      throw new Error(`주문 ID ${id}를 찾을 수 없습니다.`);
    }

    return {
      success: true,
      data: order,
    };
  }

  // Real API
  const response = await authClient.api.get(`/api/v1/storefront/orders/${id}`);
  return response.data;
}

// Export API 객체
export const storefrontAPI = {
  fetchProducts,
  fetchProductDetail,
  createOrder,
  fetchOrder,
};

export default storefrontAPI;

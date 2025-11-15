/**
 * Seller Settlement API Service
 * Phase 4-1 Step 2: Seller Settlement
 */

import { authClient } from '@o4o/auth-client';
import { API_ENDPOINTS } from '../config/apiEndpoints';
import { MOCK_FLAGS } from '../config/mockFlags';
import type {
  SellerSettlementDetail,
  SettlementSummary,
  SellerSettlementLineItem,
  GetSellerSettlementsQuery,
  GetSellerSettlementsResponse,
  GetSellerSettlementDetailResponse,
  CreateSellerSettlementRequest,
  CreateSellerSettlementResponse,
  UpdateSellerSettlementStatusRequest,
  UpdateSellerSettlementStatusResponse,
  UpdateSellerSettlementMemoRequest,
  UpdateSellerSettlementMemoResponse,
} from '../types/settlement';

// Phase 6-2: Use centralized mock flag
const USE_MOCK_SELLER_SETTLEMENTS = MOCK_FLAGS.SELLER_SETTLEMENTS;

// Mock 지연 시간
const mockDelay = () => new Promise((resolve) => setTimeout(resolve, 300));

/**
 * Mock 데이터: 판매자 정산 레코드
 */
const MOCK_SETTLEMENTS: SellerSettlementDetail[] = [
  {
    id: 'stl-slr-001',
    role: 'seller',
    seller_id: 'seller-001',
    period_start: '2025-10-01',
    period_end: '2025-10-31',
    status: 'PAID',
    currency: 'KRW',
    gross_commission_amount: 620000,
    adjustment_amount: 0,
    net_payout_amount: 620000,
    created_at: '2025-11-01T09:00:00Z',
    updated_at: '2025-11-05T16:00:00Z',
    memo_internal: '10월 정산 - 정상 지급 완료',
    lines: [
      {
        order_id: 'order-201',
        order_number: 'ORD-20251005-101',
        order_date: '2025-10-05',
        customer_name: '김철수',
        customer_email: 'chulsoo@example.com',
        product_id: 'prod-rice-001',
        product_name: '프리미엄 유기농 쌀 10kg',
        sku: 'RICE-ORG-10K',
        quantity: 8,
        sale_price: 65000,
        supply_price: 45000,
        line_revenue: 520000,
        line_cost: 360000,
        line_margin_amount: 160000,
        line_margin_rate: 0.3077,
      },
      {
        order_id: 'order-202',
        order_number: 'ORD-20251012-102',
        order_date: '2025-10-12',
        customer_name: '이영희',
        customer_email: 'younghee@example.com',
        product_id: 'prod-tomato-001',
        product_name: '찰토마토 5kg',
        sku: 'TOMATO-5K',
        quantity: 12,
        sale_price: 42000,
        supply_price: 28000,
        line_revenue: 504000,
        line_cost: 336000,
        line_margin_amount: 168000,
        line_margin_rate: 0.3333,
      },
      {
        order_id: 'order-203',
        order_number: 'ORD-20251018-103',
        order_date: '2025-10-18',
        customer_name: '박민수',
        customer_email: 'minsoo@example.com',
        product_id: 'prod-egg-001',
        product_name: '무항생제 계란 30구',
        sku: 'EGG-30',
        quantity: 15,
        sale_price: 14000,
        supply_price: 9500,
        line_revenue: 210000,
        line_cost: 142500,
        line_margin_amount: 67500,
        line_margin_rate: 0.3214,
      },
      {
        order_id: 'order-204',
        order_number: 'ORD-20251025-104',
        order_date: '2025-10-25',
        customer_name: '최지은',
        customer_email: 'jieun@example.com',
        product_id: 'prod-tangerine-001',
        product_name: '제주 감귤 3kg',
        sku: 'TANG-3K',
        quantity: 18,
        sale_price: 24000,
        supply_price: 16000,
        line_revenue: 432000,
        line_cost: 288000,
        line_margin_amount: 144000,
        line_margin_rate: 0.3333,
      },
    ],
    total_revenue: 1666000,
    total_cost: 1126500,
    total_margin_amount: 539500,
    average_margin_rate: 0.3239,
    total_orders: 4,
    total_items: 53,
  },
  {
    id: 'stl-slr-002',
    role: 'seller',
    seller_id: 'seller-001',
    period_start: '2025-09-01',
    period_end: '2025-09-30',
    status: 'PENDING_PAYOUT',
    currency: 'KRW',
    gross_commission_amount: 745000,
    adjustment_amount: -15000,
    net_payout_amount: 730000,
    created_at: '2025-10-01T10:00:00Z',
    updated_at: '2025-10-15T15:30:00Z',
    memo_internal: '9월 정산 - 일부 반품 처리로 조정',
    lines: [
      {
        order_id: 'order-191',
        order_number: 'ORD-20250903-101',
        order_date: '2025-09-03',
        customer_name: '정수민',
        customer_email: 'sumin@example.com',
        product_id: 'prod-rice-001',
        product_name: '프리미엄 유기농 쌀 10kg',
        sku: 'RICE-ORG-10K',
        quantity: 10,
        sale_price: 65000,
        supply_price: 45000,
        line_revenue: 650000,
        line_cost: 450000,
        line_margin_amount: 200000,
        line_margin_rate: 0.3077,
      },
      {
        order_id: 'order-192',
        order_number: 'ORD-20250910-102',
        order_date: '2025-09-10',
        customer_name: '강하늘',
        customer_email: 'haneul@example.com',
        product_id: 'prod-tomato-001',
        product_name: '찰토마토 5kg',
        sku: 'TOMATO-5K',
        quantity: 15,
        sale_price: 42000,
        supply_price: 28000,
        line_revenue: 630000,
        line_cost: 420000,
        line_margin_amount: 210000,
        line_margin_rate: 0.3333,
      },
      {
        order_id: 'order-193',
        order_number: 'ORD-20250920-103',
        order_date: '2025-09-20',
        customer_name: '윤서연',
        customer_email: 'seoyeon@example.com',
        product_id: 'prod-tangerine-001',
        product_name: '제주 감귤 3kg',
        sku: 'TANG-3K',
        quantity: 20,
        sale_price: 24000,
        supply_price: 16000,
        line_revenue: 480000,
        line_cost: 320000,
        line_margin_amount: 160000,
        line_margin_rate: 0.3333,
      },
    ],
    total_revenue: 1760000,
    total_cost: 1190000,
    total_margin_amount: 570000,
    average_margin_rate: 0.3239,
    total_orders: 3,
    total_items: 45,
  },
  {
    id: 'stl-slr-003',
    role: 'seller',
    seller_id: 'seller-001',
    period_start: '2025-08-01',
    period_end: '2025-08-31',
    status: 'OPEN',
    currency: 'KRW',
    gross_commission_amount: 485000,
    adjustment_amount: 0,
    net_payout_amount: 485000,
    created_at: '2025-09-01T09:00:00Z',
    updated_at: '2025-09-01T09:00:00Z',
    memo_internal: '',
    lines: [
      {
        order_id: 'order-181',
        order_number: 'ORD-20250805-101',
        order_date: '2025-08-05',
        customer_name: '조은우',
        customer_email: 'eunwoo@example.com',
        product_id: 'prod-egg-001',
        product_name: '무항생제 계란 30구',
        sku: 'EGG-30',
        quantity: 18,
        sale_price: 14000,
        supply_price: 9500,
        line_revenue: 252000,
        line_cost: 171000,
        line_margin_amount: 81000,
        line_margin_rate: 0.3214,
      },
      {
        order_id: 'order-182',
        order_number: 'ORD-20250815-102',
        order_date: '2025-08-15',
        customer_name: '한지민',
        customer_email: 'jimin@example.com',
        product_id: 'prod-rice-001',
        product_name: '프리미엄 유기농 쌀 10kg',
        sku: 'RICE-ORG-10K',
        quantity: 6,
        sale_price: 65000,
        supply_price: 45000,
        line_revenue: 390000,
        line_cost: 270000,
        line_margin_amount: 120000,
        line_margin_rate: 0.3077,
      },
      {
        order_id: 'order-183',
        order_number: 'ORD-20250825-103',
        order_date: '2025-08-25',
        customer_name: '서준호',
        customer_email: 'junho@example.com',
        product_id: 'prod-tomato-001',
        product_name: '찰토마토 5kg',
        sku: 'TOMATO-5K',
        quantity: 10,
        sale_price: 42000,
        supply_price: 28000,
        line_revenue: 420000,
        line_cost: 280000,
        line_margin_amount: 140000,
        line_margin_rate: 0.3333,
      },
    ],
    total_revenue: 1062000,
    total_cost: 721000,
    total_margin_amount: 341000,
    average_margin_rate: 0.3211,
    total_orders: 3,
    total_items: 34,
  },
  {
    id: 'stl-slr-004',
    role: 'seller',
    seller_id: 'seller-001',
    period_start: '2025-07-01',
    period_end: '2025-07-31',
    status: 'PAID',
    currency: 'KRW',
    gross_commission_amount: 825000,
    adjustment_amount: 0,
    net_payout_amount: 825000,
    created_at: '2025-08-01T09:00:00Z',
    updated_at: '2025-08-10T12:00:00Z',
    memo_internal: '7월 정산 - 지급 완료',
    lines: [
      {
        order_id: 'order-171',
        order_number: 'ORD-20250705-101',
        order_date: '2025-07-05',
        customer_name: '임소연',
        customer_email: 'soyeon@example.com',
        product_id: 'prod-rice-001',
        product_name: '프리미엄 유기농 쌀 10kg',
        sku: 'RICE-ORG-10K',
        quantity: 12,
        sale_price: 65000,
        supply_price: 45000,
        line_revenue: 780000,
        line_cost: 540000,
        line_margin_amount: 240000,
        line_margin_rate: 0.3077,
      },
      {
        order_id: 'order-172',
        order_number: 'ORD-20250718-102',
        order_date: '2025-07-18',
        customer_name: '장민재',
        customer_email: 'minjae@example.com',
        product_id: 'prod-tangerine-001',
        product_name: '제주 감귤 3kg',
        sku: 'TANG-3K',
        quantity: 25,
        sale_price: 24000,
        supply_price: 16000,
        line_revenue: 600000,
        line_cost: 400000,
        line_margin_amount: 200000,
        line_margin_rate: 0.3333,
      },
      {
        order_id: 'order-173',
        order_number: 'ORD-20250725-103',
        order_date: '2025-07-25',
        customer_name: '오세훈',
        customer_email: 'sehoon@example.com',
        product_id: 'prod-tomato-001',
        product_name: '찰토마토 5kg',
        sku: 'TOMATO-5K',
        quantity: 14,
        sale_price: 42000,
        supply_price: 28000,
        line_revenue: 588000,
        line_cost: 392000,
        line_margin_amount: 196000,
        line_margin_rate: 0.3333,
      },
    ],
    total_revenue: 1968000,
    total_cost: 1332000,
    total_margin_amount: 636000,
    average_margin_rate: 0.3232,
    total_orders: 3,
    total_items: 51,
  },
];

// Mock 저장소
let mockSettlementsStore = [...MOCK_SETTLEMENTS];

/**
 * Mock 헬퍼: 필터링 및 정렬
 */
function filterAndSortMockSettlements(
  query: GetSellerSettlementsQuery
): SettlementSummary[] {
  let filtered = [...mockSettlementsStore];

  // 상태 필터
  if (query.status && query.status !== 'ALL') {
    filtered = filtered.filter((s) => s.status === query.status);
  }

  // 날짜 필터
  if (query.date_from) {
    filtered = filtered.filter((s) => s.period_start >= query.date_from!);
  }
  if (query.date_to) {
    filtered = filtered.filter((s) => s.period_start <= query.date_to!);
  }

  // 최신순 정렬
  filtered.sort((a, b) => {
    if (a.period_start > b.period_start) return -1;
    if (a.period_start < b.period_start) return 1;
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
 * 판매자 정산 목록 조회
 */
export async function fetchSellerSettlements(
  query: GetSellerSettlementsQuery = {}
): Promise<GetSellerSettlementsResponse> {
  if (USE_MOCK_SELLER_SETTLEMENTS) {
    await mockDelay();

    const page = query.page || 1;
    const limit = query.limit || 20;

    const filtered = filterAndSortMockSettlements(query);
    const { data, total, total_pages } = paginateData(filtered, page, limit);

    return {
      success: true,
      data: {
        settlements: data,
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
  const response = await authClient.api.get(API_ENDPOINTS.SELLER_SETTLEMENTS.LIST, {
    params: query,
  });
  return response.data;
}

/**
 * 판매자 정산 상세 조회
 */
export async function fetchSellerSettlementDetail(
  id: string
): Promise<GetSellerSettlementDetailResponse> {
  if (USE_MOCK_SELLER_SETTLEMENTS) {
    await mockDelay();

    const settlement = mockSettlementsStore.find((s) => s.id === id);
    if (!settlement) {
      throw new Error(`Settlement with id ${id} not found`);
    }

    return {
      success: true,
      data: settlement,
    };
  }

  // Real API
  const response = await authClient.api.get(API_ENDPOINTS.SELLER_SETTLEMENTS.DETAIL(id));
  return response.data;
}

/**
 * 판매자 정산 생성
 */
export async function createSellerSettlement(
  payload: CreateSellerSettlementRequest
): Promise<CreateSellerSettlementResponse> {
  if (USE_MOCK_SELLER_SETTLEMENTS) {
    await mockDelay();

    const newId = `stl-slr-${String(mockSettlementsStore.length + 1).padStart(3, '0')}`;
    const now = new Date().toISOString();

    // Mock 라인 아이템 생성
    const mockLines: SellerSettlementLineItem[] = [
      {
        order_id: 'order-new-201',
        order_number: 'ORD-20251101-201',
        order_date: payload.period_start,
        customer_name: '신규고객',
        customer_email: 'new@example.com',
        product_id: 'prod-rice-001',
        product_name: '프리미엄 유기농 쌀 10kg',
        sku: 'RICE-ORG-10K',
        quantity: 5,
        sale_price: 65000,
        supply_price: 45000,
        line_revenue: 325000,
        line_cost: 225000,
        line_margin_amount: 100000,
        line_margin_rate: 0.3077,
      },
      {
        order_id: 'order-new-202',
        order_number: 'ORD-20251105-202',
        order_date: payload.period_start,
        customer_name: '신규고객2',
        customer_email: 'new2@example.com',
        product_id: 'prod-tomato-001',
        product_name: '찰토마토 5kg',
        sku: 'TOMATO-5K',
        quantity: 8,
        sale_price: 42000,
        supply_price: 28000,
        line_revenue: 336000,
        line_cost: 224000,
        line_margin_amount: 112000,
        line_margin_rate: 0.3333,
      },
    ];

    const total_items = mockLines.reduce((sum, l) => sum + l.quantity, 0);
    const total_revenue = mockLines.reduce((sum, l) => sum + l.line_revenue, 0);
    const total_cost = mockLines.reduce((sum, l) => sum + (l.line_cost || 0), 0);
    const total_margin_amount = mockLines.reduce(
      (sum, l) => sum + (l.line_margin_amount || 0),
      0
    );
    const average_margin_rate = total_revenue > 0 ? total_margin_amount / total_revenue : 0;

    const newSettlement: SellerSettlementDetail = {
      id: newId,
      role: 'seller',
      seller_id: 'seller-001',
      period_start: payload.period_start,
      period_end: payload.period_end,
      status: 'OPEN',
      currency: 'KRW',
      gross_commission_amount: total_margin_amount,
      adjustment_amount: 0,
      net_payout_amount: total_margin_amount,
      created_at: now,
      updated_at: now,
      memo_internal: payload.memo_internal || '',
      lines: mockLines,
      total_revenue,
      total_cost,
      total_margin_amount,
      average_margin_rate,
      total_orders: mockLines.length,
      total_items,
    };

    mockSettlementsStore.unshift(newSettlement);

    return {
      success: true,
      data: newSettlement,
      message: '정산이 성공적으로 생성되었습니다.',
    };
  }

  // Real API
  const response = await authClient.api.post(
    API_ENDPOINTS.SELLER_SETTLEMENTS.LIST,
    payload
  );
  return response.data;
}

/**
 * 판매자 정산 상태 변경
 */
export async function updateSellerSettlementStatus(
  id: string,
  payload: UpdateSellerSettlementStatusRequest
): Promise<UpdateSellerSettlementStatusResponse> {
  if (USE_MOCK_SELLER_SETTLEMENTS) {
    await mockDelay();

    const settlement = mockSettlementsStore.find((s) => s.id === id);
    if (!settlement) {
      throw new Error(`Settlement with id ${id} not found`);
    }

    settlement.status = payload.status;
    settlement.updated_at = new Date().toISOString();

    if (payload.memo_internal !== undefined) {
      settlement.memo_internal = payload.memo_internal;
    }

    if (payload.status === 'CANCELLED') {
      settlement.net_payout_amount = 0;
    }

    return {
      success: true,
      data: settlement,
      message: '정산 상태가 업데이트되었습니다.',
    };
  }

  // Real API
  const response = await authClient.api.patch(
    API_ENDPOINTS.SELLER_SETTLEMENTS.UPDATE_STATUS(id),
    payload
  );
  return response.data;
}

/**
 * 판매자 정산 메모 업데이트
 */
export async function updateSellerSettlementMemo(
  id: string,
  payload: UpdateSellerSettlementMemoRequest
): Promise<UpdateSellerSettlementMemoResponse> {
  if (USE_MOCK_SELLER_SETTLEMENTS) {
    await mockDelay();

    const settlement = mockSettlementsStore.find((s) => s.id === id);
    if (!settlement) {
      throw new Error(`Settlement with id ${id} not found`);
    }

    settlement.memo_internal = payload.memo_internal;
    settlement.updated_at = new Date().toISOString();

    return {
      success: true,
      data: settlement,
      message: '메모가 저장되었습니다.',
    };
  }

  // Real API
  const response = await authClient.api.patch(
    API_ENDPOINTS.SELLER_SETTLEMENTS.UPDATE_MEMO(id),
    payload
  );
  return response.data;
}

// Export API 객체
export const sellerSettlementAPI = {
  fetchSellerSettlements,
  fetchSellerSettlementDetail,
  createSellerSettlement,
  updateSellerSettlementStatus,
  updateSellerSettlementMemo,
};

export default sellerSettlementAPI;

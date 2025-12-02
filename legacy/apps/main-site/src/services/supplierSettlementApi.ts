/**
 * Supplier Settlement API Service
 * Phase 4-1 Step 2: Supplier Settlement
 */

import { authClient } from '@o4o/auth-client';
import { API_ENDPOINTS } from '../config/apiEndpoints';
import { MOCK_FLAGS } from '../config/mockFlags';
import type {
  SupplierSettlementDetail,
  SettlementSummary,
  SupplierSettlementLineItem,
  GetSupplierSettlementsQuery,
  GetSupplierSettlementsResponse,
  GetSupplierSettlementDetailResponse,
  CreateSupplierSettlementRequest,
  CreateSupplierSettlementResponse,
  UpdateSupplierSettlementStatusRequest,
  UpdateSupplierSettlementStatusResponse,
  UpdateSupplierSettlementMemoRequest,
  UpdateSupplierSettlementMemoResponse,
} from '../types/settlement';

// Phase 6-2: Use centralized mock flag
const USE_MOCK_SUPPLIER_SETTLEMENTS = MOCK_FLAGS.SUPPLIER_SETTLEMENTS;

// Mock 지연 시간
const mockDelay = () => new Promise((resolve) => setTimeout(resolve, 300));

/**
 * Mock 데이터: 공급자 정산 레코드
 */
const MOCK_SETTLEMENTS: SupplierSettlementDetail[] = [
  {
    id: 'stl-sup-001',
    role: 'supplier',
    supplier_id: 'supplier-001',
    period_start: '2025-10-01',
    period_end: '2025-10-31',
    status: 'PAID',
    currency: 'KRW',
    gross_commission_amount: 1850000,
    adjustment_amount: 0,
    net_payout_amount: 1850000,
    created_at: '2025-11-01T09:00:00Z',
    updated_at: '2025-11-05T15:30:00Z',
    memo_internal: '10월 정산 - 정상 지급 완료',
    lines: [
      {
        order_id: 'order-101',
        order_number: 'ORD-20251005-001',
        order_date: '2025-10-05',
        seller_id: 'seller-001',
        seller_name: '네이처마켓',
        product_id: 'prod-rice-001',
        product_name: '프리미엄 유기농 쌀 10kg',
        sku: 'RICE-ORG-10K',
        quantity: 15,
        supply_price: 45000,
        line_total: 675000,
      },
      {
        order_id: 'order-102',
        order_number: 'ORD-20251012-002',
        order_date: '2025-10-12',
        seller_id: 'seller-001',
        seller_name: '네이처마켓',
        product_id: 'prod-tomato-001',
        product_name: '찰토마토 5kg',
        sku: 'TOMATO-5K',
        quantity: 25,
        supply_price: 28000,
        line_total: 700000,
      },
      {
        order_id: 'order-103',
        order_number: 'ORD-20251018-003',
        order_date: '2025-10-18',
        seller_id: 'seller-002',
        seller_name: '신선푸드',
        product_id: 'prod-egg-001',
        product_name: '무항생제 계란 30구',
        sku: 'EGG-30',
        quantity: 20,
        supply_price: 9500,
        line_total: 190000,
      },
      {
        order_id: 'order-104',
        order_number: 'ORD-20251025-004',
        order_date: '2025-10-25',
        seller_id: 'seller-001',
        seller_name: '네이처마켓',
        product_id: 'prod-tangerine-001',
        product_name: '제주 감귤 3kg',
        sku: 'TANG-3K',
        quantity: 30,
        supply_price: 16000,
        line_total: 480000,
      },
    ],
    total_supply_amount: 2045000,
    total_orders: 4,
    total_items: 90,
  },
  {
    id: 'stl-sup-002',
    role: 'supplier',
    supplier_id: 'supplier-001',
    period_start: '2025-09-01',
    period_end: '2025-09-30',
    status: 'PENDING_PAYOUT',
    currency: 'KRW',
    gross_commission_amount: 2100000,
    adjustment_amount: -50000,
    net_payout_amount: 2050000,
    created_at: '2025-10-01T10:00:00Z',
    updated_at: '2025-10-15T14:20:00Z',
    memo_internal: '9월 정산 - 일부 반품 처리로 조정',
    lines: [
      {
        order_id: 'order-091',
        order_number: 'ORD-20250903-001',
        order_date: '2025-09-03',
        seller_id: 'seller-001',
        seller_name: '네이처마켓',
        product_id: 'prod-rice-001',
        product_name: '프리미엄 유기농 쌀 10kg',
        sku: 'RICE-ORG-10K',
        quantity: 20,
        supply_price: 45000,
        line_total: 900000,
      },
      {
        order_id: 'order-092',
        order_number: 'ORD-20250910-002',
        order_date: '2025-09-10',
        seller_id: 'seller-002',
        seller_name: '신선푸드',
        product_id: 'prod-tomato-001',
        product_name: '찰토마토 5kg',
        sku: 'TOMATO-5K',
        quantity: 30,
        supply_price: 28000,
        line_total: 840000,
      },
      {
        order_id: 'order-093',
        order_number: 'ORD-20250920-003',
        order_date: '2025-09-20',
        seller_id: 'seller-001',
        seller_name: '네이처마켓',
        product_id: 'prod-tangerine-001',
        product_name: '제주 감귤 3kg',
        sku: 'TANG-3K',
        quantity: 25,
        supply_price: 16000,
        line_total: 400000,
      },
    ],
    total_supply_amount: 2140000,
    total_orders: 3,
    total_items: 75,
  },
  {
    id: 'stl-sup-003',
    role: 'supplier',
    supplier_id: 'supplier-001',
    period_start: '2025-08-01',
    period_end: '2025-08-31',
    status: 'OPEN',
    currency: 'KRW',
    gross_commission_amount: 1450000,
    adjustment_amount: 0,
    net_payout_amount: 1450000,
    created_at: '2025-09-01T09:00:00Z',
    updated_at: '2025-09-01T09:00:00Z',
    memo_internal: '',
    lines: [
      {
        order_id: 'order-081',
        order_number: 'ORD-20250805-001',
        order_date: '2025-08-05',
        seller_id: 'seller-001',
        seller_name: '네이처마켓',
        product_id: 'prod-egg-001',
        product_name: '무항생제 계란 30구',
        sku: 'EGG-30',
        quantity: 30,
        supply_price: 9500,
        line_total: 285000,
      },
      {
        order_id: 'order-082',
        order_number: 'ORD-20250815-002',
        order_date: '2025-08-15',
        seller_id: 'seller-002',
        seller_name: '신선푸드',
        product_id: 'prod-rice-001',
        product_name: '프리미엄 유기농 쌀 10kg',
        sku: 'RICE-ORG-10K',
        quantity: 12,
        supply_price: 45000,
        line_total: 540000,
      },
      {
        order_id: 'order-083',
        order_number: 'ORD-20250825-003',
        order_date: '2025-08-25',
        seller_id: 'seller-001',
        seller_name: '네이처마켓',
        product_id: 'prod-tomato-001',
        product_name: '찰토마토 5kg',
        sku: 'TOMATO-5K',
        quantity: 22,
        supply_price: 28000,
        line_total: 616000,
      },
    ],
    total_supply_amount: 1441000,
    total_orders: 3,
    total_items: 64,
  },
  {
    id: 'stl-sup-004',
    role: 'supplier',
    supplier_id: 'supplier-001',
    period_start: '2025-07-01',
    period_end: '2025-07-31',
    status: 'PAID',
    currency: 'KRW',
    gross_commission_amount: 2350000,
    adjustment_amount: 0,
    net_payout_amount: 2350000,
    created_at: '2025-08-01T09:00:00Z',
    updated_at: '2025-08-10T11:00:00Z',
    memo_internal: '7월 정산 - 지급 완료',
    lines: [
      {
        order_id: 'order-071',
        order_number: 'ORD-20250705-001',
        order_date: '2025-07-05',
        seller_id: 'seller-001',
        seller_name: '네이처마켓',
        product_id: 'prod-rice-001',
        product_name: '프리미엄 유기농 쌀 10kg',
        sku: 'RICE-ORG-10K',
        quantity: 25,
        supply_price: 45000,
        line_total: 1125000,
      },
      {
        order_id: 'order-072',
        order_number: 'ORD-20250718-002',
        order_date: '2025-07-18',
        seller_id: 'seller-001',
        seller_name: '네이처마켓',
        product_id: 'prod-tangerine-001',
        product_name: '제주 감귤 3kg',
        sku: 'TANG-3K',
        quantity: 40,
        supply_price: 16000,
        line_total: 640000,
      },
      {
        order_id: 'order-073',
        order_number: 'ORD-20250725-003',
        order_date: '2025-07-25',
        seller_id: 'seller-002',
        seller_name: '신선푸드',
        product_id: 'prod-tomato-001',
        product_name: '찰토마토 5kg',
        sku: 'TOMATO-5K',
        quantity: 22,
        supply_price: 28000,
        line_total: 616000,
      },
    ],
    total_supply_amount: 2381000,
    total_orders: 3,
    total_items: 87,
  },
];

// Mock 저장소 (상태 변경을 위한 가변 복사본)
let mockSettlementsStore = [...MOCK_SETTLEMENTS];

/**
 * Mock 헬퍼: 필터링 및 정렬
 */
function filterAndSortMockSettlements(
  query: GetSupplierSettlementsQuery
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
 * 공급자 정산 목록 조회
 */
export async function fetchSupplierSettlements(
  query: GetSupplierSettlementsQuery = {}
): Promise<GetSupplierSettlementsResponse> {
  if (USE_MOCK_SUPPLIER_SETTLEMENTS) {
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
  const response = await authClient.api.get(API_ENDPOINTS.SUPPLIER_SETTLEMENTS.LIST, {
    params: query,
  });
  return response.data;
}

/**
 * 공급자 정산 상세 조회
 */
export async function fetchSupplierSettlementDetail(
  id: string
): Promise<GetSupplierSettlementDetailResponse> {
  if (USE_MOCK_SUPPLIER_SETTLEMENTS) {
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
  const response = await authClient.api.get(API_ENDPOINTS.SUPPLIER_SETTLEMENTS.DETAIL(id));
  return response.data;
}

/**
 * 공급자 정산 생성
 */
export async function createSupplierSettlement(
  payload: CreateSupplierSettlementRequest
): Promise<CreateSupplierSettlementResponse> {
  if (USE_MOCK_SUPPLIER_SETTLEMENTS) {
    await mockDelay();

    const newId = `stl-sup-${String(mockSettlementsStore.length + 1).padStart(3, '0')}`;
    const now = new Date().toISOString();

    // Mock 라인 아이템 생성
    const mockLines: SupplierSettlementLineItem[] = [
      {
        order_id: 'order-new-001',
        order_number: 'ORD-20251101-001',
        order_date: payload.period_start,
        seller_id: 'seller-001',
        seller_name: '네이처마켓',
        product_id: 'prod-rice-001',
        product_name: '프리미엄 유기농 쌀 10kg',
        sku: 'RICE-ORG-10K',
        quantity: 10,
        supply_price: 45000,
        line_total: 450000,
      },
      {
        order_id: 'order-new-002',
        order_number: 'ORD-20251105-002',
        order_date: payload.period_start,
        seller_id: 'seller-002',
        seller_name: '신선푸드',
        product_id: 'prod-tomato-001',
        product_name: '찰토마토 5kg',
        sku: 'TOMATO-5K',
        quantity: 15,
        supply_price: 28000,
        line_total: 420000,
      },
    ];

    const total_items = mockLines.reduce((sum, l) => sum + l.quantity, 0);
    const total_supply_amount = mockLines.reduce((sum, l) => sum + l.line_total, 0);

    const newSettlement: SupplierSettlementDetail = {
      id: newId,
      role: 'supplier',
      supplier_id: 'supplier-001',
      period_start: payload.period_start,
      period_end: payload.period_end,
      status: 'OPEN',
      currency: 'KRW',
      gross_commission_amount: total_supply_amount,
      adjustment_amount: 0,
      net_payout_amount: total_supply_amount,
      created_at: now,
      updated_at: now,
      memo_internal: payload.memo_internal || '',
      lines: mockLines,
      total_supply_amount,
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
    API_ENDPOINTS.SUPPLIER_SETTLEMENTS.LIST,
    payload
  );
  return response.data;
}

/**
 * 공급자 정산 상태 변경
 */
export async function updateSupplierSettlementStatus(
  id: string,
  payload: UpdateSupplierSettlementStatusRequest
): Promise<UpdateSupplierSettlementStatusResponse> {
  if (USE_MOCK_SUPPLIER_SETTLEMENTS) {
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
    API_ENDPOINTS.SUPPLIER_SETTLEMENTS.UPDATE_STATUS(id),
    payload
  );
  return response.data;
}

/**
 * 공급자 정산 메모 업데이트
 */
export async function updateSupplierSettlementMemo(
  id: string,
  payload: UpdateSupplierSettlementMemoRequest
): Promise<UpdateSupplierSettlementMemoResponse> {
  if (USE_MOCK_SUPPLIER_SETTLEMENTS) {
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
    API_ENDPOINTS.SUPPLIER_SETTLEMENTS.UPDATE_MEMO(id),
    payload
  );
  return response.data;
}

// Export API 객체
export const supplierSettlementAPI = {
  fetchSupplierSettlements,
  fetchSupplierSettlementDetail,
  createSupplierSettlement,
  updateSupplierSettlementStatus,
  updateSupplierSettlementMemo,
};

export default supplierSettlementAPI;

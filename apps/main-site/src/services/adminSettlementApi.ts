/**
 * Admin Settlement API Service
 * Phase 4-2: Admin Settlement Management
 *
 * Partner/Supplier/Seller 정산을 통합 관리하는 Admin 전용 API
 */

import { authClient } from '@o4o/auth-client';
import { API_ENDPOINTS } from '../config/apiEndpoints';
import { MOCK_FLAGS } from '../config/mockFlags';
import type {
  AdminSettlementView,
  AdminSettlementDetail,
  GetAdminSettlementsQuery,
  GetAdminSettlementsResponse,
  GetAdminSettlementDetailResponse,
  CreateAdminSettlementRequest,
  CreateAdminSettlementResponse,
  UpdateAdminSettlementStatusRequest,
  UpdateAdminSettlementStatusResponse,
  UpdateAdminSettlementPayoutRequest,
  UpdateAdminSettlementPayoutResponse,
  UpdateAdminSettlementMemoRequest,
  UpdateAdminSettlementMemoResponse,
  PartnerSettlementDetail,
  SupplierSettlementDetail,
  SellerSettlementDetail,
  SettlementRole,
} from '../types/settlement';

// Phase 6-2: Use centralized mock flag
const USE_MOCK_ADMIN_SETTLEMENTS = MOCK_FLAGS.ADMIN_SETTLEMENTS;

// Mock 지연 시간
const mockDelay = () => new Promise((resolve) => setTimeout(resolve, 300));

/**
 * Mock 데이터: 통합 정산 목록 (Partner, Supplier, Seller)
 */
const MOCK_ADMIN_SETTLEMENTS: AdminSettlementDetail[] = [
  // Partner Settlements (2개)
  {
    id: 'stl-001',
    role: 'partner',
    partner_id: 'partner-001',
    period_start: '2025-10-01',
    period_end: '2025-10-31',
    status: 'PAID',
    currency: 'KRW',
    gross_commission_amount: 245000,
    adjustment_amount: 0,
    net_payout_amount: 245000,
    created_at: '2025-11-01T09:00:00Z',
    updated_at: '2025-11-05T14:30:00Z',
    memo_internal: '10월 파트너 정산 - 정상 지급 완료',
    payout_date: '2025-11-05',
    payout_method: 'BANK_TRANSFER',
    payout_note: '국민은행 ***-***-****** 계좌 입금',
    lines: [
      {
        link_id: 'link-001',
        link_name: '프리미엄 유기농 쌀 프로모션',
        landing_url: 'https://neture.co.kr/products/premium-rice',
        tracking_code: 'RICE2025',
        clicks: 1250,
        conversions: 45,
        revenue: 3375000,
        commission_rate: 0.05,
        commission_amount: 168750,
      },
      {
        link_id: 'link-002',
        link_name: '신선한 토마토 특가',
        landing_url: 'https://neture.co.kr/products/fresh-tomato',
        tracking_code: 'TOMATO2025',
        clicks: 980,
        conversions: 28,
        revenue: 1520000,
        commission_rate: 0.05,
        commission_amount: 76250,
      },
    ],
    total_clicks: 2230,
    total_conversions: 73,
    total_revenue: 4895000,
  } as PartnerSettlementDetail & { payout_date?: string; payout_method?: 'BANK_TRANSFER' | 'POINT' | 'OTHER'; payout_note?: string },
  {
    id: 'stl-002',
    role: 'partner',
    partner_id: 'partner-002',
    period_start: '2025-10-01',
    period_end: '2025-10-31',
    status: 'PENDING_PAYOUT',
    currency: 'KRW',
    gross_commission_amount: 180000,
    adjustment_amount: -5000,
    net_payout_amount: 175000,
    created_at: '2025-11-01T10:00:00Z',
    updated_at: '2025-11-10T09:15:00Z',
    memo_internal: '10월 파트너 정산 - 조정 후 지급 대기',
    lines: [
      {
        link_id: 'link-005',
        link_name: '건강 간식 세트',
        landing_url: 'https://neture.co.kr/products/healthy-snack',
        tracking_code: 'SNACK2025',
        clicks: 850,
        conversions: 30,
        revenue: 1800000,
        commission_rate: 0.10,
        commission_amount: 180000,
      },
    ],
    total_clicks: 850,
    total_conversions: 30,
    total_revenue: 1800000,
  } as PartnerSettlementDetail & { payout_date?: string; payout_method?: 'BANK_TRANSFER' | 'POINT' | 'OTHER'; payout_note?: string },

  // Supplier Settlements (3개)
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
    memo_internal: '10월 공급자 정산 - 정상 지급 완료',
    payout_date: '2025-11-05',
    payout_method: 'BANK_TRANSFER',
    payout_note: '신한은행 ***-***-****** 계좌 입금',
    lines: [
      {
        order_id: 'order-101',
        order_number: 'ORD-2025-1001',
        order_date: '2025-10-05',
        seller_id: 'seller-001',
        seller_name: '네이처마켓',
        product_id: 'prod-001',
        product_name: '프리미엄 유기농 쌀 10kg',
        sku: 'RICE-ORG-10',
        quantity: 25,
        supply_price: 45000,
        line_total: 1125000,
      },
      {
        order_id: 'order-102',
        order_number: 'ORD-2025-1002',
        order_date: '2025-10-12',
        seller_id: 'seller-001',
        seller_name: '네이처마켓',
        product_id: 'prod-002',
        product_name: '신선한 토마토 5kg',
        sku: 'TOMATO-FRS-5',
        quantity: 30,
        supply_price: 24000,
        line_total: 720000,
      },
    ],
    total_supply_amount: 1845000,
    total_orders: 2,
    total_items: 55,
  } as SupplierSettlementDetail & { payout_date?: string; payout_method?: 'BANK_TRANSFER' | 'POINT' | 'OTHER'; payout_note?: string },
  {
    id: 'stl-sup-002',
    role: 'supplier',
    supplier_id: 'supplier-002',
    period_start: '2025-10-01',
    period_end: '2025-10-31',
    status: 'OPEN',
    currency: 'KRW',
    gross_commission_amount: 980000,
    adjustment_amount: 0,
    net_payout_amount: 980000,
    created_at: '2025-11-01T09:30:00Z',
    updated_at: '2025-11-01T09:30:00Z',
    memo_internal: '',
    lines: [
      {
        order_id: 'order-201',
        order_number: 'ORD-2025-2001',
        order_date: '2025-10-08',
        seller_id: 'seller-002',
        seller_name: '건강샵',
        product_id: 'prod-010',
        product_name: '건강 간식 세트',
        sku: 'SNACK-SET-A',
        quantity: 40,
        supply_price: 15000,
        line_total: 600000,
      },
      {
        order_id: 'order-202',
        order_number: 'ORD-2025-2002',
        order_date: '2025-10-15',
        seller_id: 'seller-002',
        seller_name: '건강샵',
        product_id: 'prod-011',
        product_name: '견과류 믹스',
        sku: 'NUT-MIX-B',
        quantity: 25,
        supply_price: 18000,
        line_total: 450000,
      },
    ],
    total_supply_amount: 1050000,
    total_orders: 2,
    total_items: 65,
  } as SupplierSettlementDetail & { payout_date?: string; payout_method?: 'BANK_TRANSFER' | 'POINT' | 'OTHER'; payout_note?: string },
  {
    id: 'stl-sup-003',
    role: 'supplier',
    supplier_id: 'supplier-001',
    period_start: '2025-09-01',
    period_end: '2025-09-30',
    status: 'PENDING_PAYOUT',
    currency: 'KRW',
    gross_commission_amount: 2100000,
    adjustment_amount: -50000,
    net_payout_amount: 2050000,
    created_at: '2025-10-01T09:00:00Z',
    updated_at: '2025-10-15T16:20:00Z',
    memo_internal: '9월 공급자 정산 - 반품 조정 후 지급 대기',
    lines: [
      {
        order_id: 'order-103',
        order_number: 'ORD-2025-0901',
        order_date: '2025-09-10',
        seller_id: 'seller-001',
        seller_name: '네이처마켓',
        product_id: 'prod-001',
        product_name: '프리미엄 유기농 쌀 10kg',
        sku: 'RICE-ORG-10',
        quantity: 30,
        supply_price: 45000,
        line_total: 1350000,
      },
    ],
    total_supply_amount: 1350000,
    total_orders: 1,
    total_items: 30,
  } as SupplierSettlementDetail & { payout_date?: string; payout_method?: 'BANK_TRANSFER' | 'POINT' | 'OTHER'; payout_note?: string },

  // Seller Settlements (2개)
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
    memo_internal: '10월 판매자 정산 - 정상 지급 완료',
    payout_date: '2025-11-05',
    payout_method: 'BANK_TRANSFER',
    payout_note: '우리은행 ***-***-****** 계좌 입금',
    lines: [
      {
        order_id: 'order-101',
        order_number: 'ORD-2025-1001',
        order_date: '2025-10-05',
        customer_name: '김철수',
        customer_email: 'kim@example.com',
        product_id: 'prod-001',
        product_name: '프리미엄 유기농 쌀 10kg',
        sku: 'RICE-ORG-10',
        quantity: 1,
        sale_price: 55000,
        supply_price: 45000,
        line_revenue: 55000,
        line_cost: 45000,
        line_margin_amount: 10000,
        line_margin_rate: 0.18,
      },
      {
        order_id: 'order-102',
        order_number: 'ORD-2025-1002',
        order_date: '2025-10-12',
        customer_name: '이영희',
        customer_email: 'lee@example.com',
        product_id: 'prod-002',
        product_name: '신선한 토마토 5kg',
        sku: 'TOMATO-FRS-5',
        quantity: 2,
        sale_price: 32000,
        supply_price: 24000,
        line_revenue: 64000,
        line_cost: 48000,
        line_margin_amount: 16000,
        line_margin_rate: 0.25,
      },
    ],
    total_revenue: 119000,
    total_cost: 93000,
    total_margin_amount: 26000,
    average_margin_rate: 0.22,
    total_orders: 2,
    total_items: 3,
  } as SellerSettlementDetail & { payout_date?: string; payout_method?: 'BANK_TRANSFER' | 'POINT' | 'OTHER'; payout_note?: string },
  {
    id: 'stl-slr-002',
    role: 'seller',
    seller_id: 'seller-002',
    period_start: '2025-10-01',
    period_end: '2025-10-31',
    status: 'OPEN',
    currency: 'KRW',
    gross_commission_amount: 350000,
    adjustment_amount: 0,
    net_payout_amount: 350000,
    created_at: '2025-11-01T10:00:00Z',
    updated_at: '2025-11-01T10:00:00Z',
    memo_internal: '',
    lines: [
      {
        order_id: 'order-201',
        order_number: 'ORD-2025-2001',
        order_date: '2025-10-08',
        customer_name: '박민수',
        customer_email: 'park@example.com',
        product_id: 'prod-010',
        product_name: '건강 간식 세트',
        sku: 'SNACK-SET-A',
        quantity: 3,
        sale_price: 22000,
        supply_price: 15000,
        line_revenue: 66000,
        line_cost: 45000,
        line_margin_amount: 21000,
        line_margin_rate: 0.32,
      },
    ],
    total_revenue: 66000,
    total_cost: 45000,
    total_margin_amount: 21000,
    average_margin_rate: 0.32,
    total_orders: 1,
    total_items: 3,
  } as SellerSettlementDetail & { payout_date?: string; payout_method?: 'BANK_TRANSFER' | 'POINT' | 'OTHER'; payout_note?: string },
];

// Mock 저장소 (상태 변경을 위한 가변 복사본)
let mockSettlementsStore: AdminSettlementDetail[] = JSON.parse(JSON.stringify(MOCK_ADMIN_SETTLEMENTS));

/**
 * 정산 상세를 AdminSettlementView로 변환
 */
function convertToAdminSettlementView(detail: AdminSettlementDetail): AdminSettlementView {
  let target_id = '';
  let target_name = '';

  if (detail.role === 'partner') {
    target_id = detail.partner_id!;
    target_name = `파트너 #${detail.partner_id}`;
  } else if (detail.role === 'supplier') {
    target_id = detail.supplier_id!;
    target_name = `공급자 #${detail.supplier_id}`;
  } else if (detail.role === 'seller') {
    target_id = detail.seller_id!;
    target_name = `판매자 #${detail.seller_id}`;
  }

  return {
    id: detail.id,
    role: detail.role,
    target_id,
    target_name,
    period_start: detail.period_start,
    period_end: detail.period_end,
    status: detail.status,
    currency: detail.currency,
    gross_commission_amount: detail.gross_commission_amount,
    adjustment_amount: detail.adjustment_amount,
    net_payout_amount: detail.net_payout_amount,
    created_at: detail.created_at,
    updated_at: detail.updated_at,
    memo_internal: detail.memo_internal,
    payout_date: detail.payout_date,
    payout_method: detail.payout_method,
    payout_note: detail.payout_note,
  };
}

/**
 * Mock 헬퍼: 필터링 및 정렬
 */
function filterAndSortMockSettlements(query: GetAdminSettlementsQuery): AdminSettlementView[] {
  let filtered = [...mockSettlementsStore];

  // 역할 필터
  if (query.role && query.role !== 'ALL') {
    filtered = filtered.filter((s) => s.role === query.role);
  }

  // 상태 필터
  if (query.status && query.status !== 'ALL') {
    filtered = filtered.filter((s) => s.status === query.status);
  }

  // 날짜 필터 (정산 기간 시작일 기준)
  if (query.date_from) {
    filtered = filtered.filter((s) => s.period_start >= query.date_from!);
  }
  if (query.date_to) {
    filtered = filtered.filter((s) => s.period_start <= query.date_to!);
  }

  // 최신순 정렬 (created_at 기준 내림차순)
  filtered.sort((a, b) => {
    if (a.created_at > b.created_at) return -1;
    if (a.created_at < b.created_at) return 1;
    return 0;
  });

  // AdminSettlementView로 변환
  return filtered.map(convertToAdminSettlementView);
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
 * 정산 목록 조회 (통합)
 */
export async function fetchAdminSettlements(
  query: GetAdminSettlementsQuery = {}
): Promise<GetAdminSettlementsResponse> {
  if (USE_MOCK_ADMIN_SETTLEMENTS) {
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
  const response = await authClient.api.get(API_ENDPOINTS.ADMIN_SETTLEMENTS.LIST, {
    params: query,
  });
  return response.data;
}

/**
 * 정산 상세 조회
 */
export async function fetchAdminSettlementDetail(
  id: string
): Promise<GetAdminSettlementDetailResponse> {
  if (USE_MOCK_ADMIN_SETTLEMENTS) {
    await mockDelay();

    const settlement = mockSettlementsStore.find((s) => s.id === id);
    if (!settlement) {
      throw new Error(`정산 ID ${id}를 찾을 수 없습니다.`);
    }

    return {
      success: true,
      data: settlement,
    };
  }

  // Real API
  const response = await authClient.api.get(API_ENDPOINTS.ADMIN_SETTLEMENTS.DETAIL(id));
  return response.data;
}

/**
 * 정산 생성 (역할 지정)
 */
export async function createAdminSettlement(
  payload: CreateAdminSettlementRequest
): Promise<CreateAdminSettlementResponse> {
  if (USE_MOCK_ADMIN_SETTLEMENTS) {
    await mockDelay();

    // Mock: 새 정산 생성
    const newId = `stl-${payload.role.substring(0, 3)}-${String(mockSettlementsStore.length + 1).padStart(3, '0')}`;
    const now = new Date().toISOString();

    // 역할별 Mock 데이터 생성
    let newSettlement: AdminSettlementDetail;

    if (payload.role === 'partner') {
      newSettlement = {
        id: newId,
        role: 'partner',
        partner_id: 'partner-001',
        period_start: payload.period_start,
        period_end: payload.period_end,
        status: 'OPEN',
        currency: 'KRW',
        gross_commission_amount: 150000,
        adjustment_amount: 0,
        net_payout_amount: 150000,
        created_at: now,
        updated_at: now,
        memo_internal: payload.memo_internal || '',
        lines: [
          {
            link_id: 'link-new',
            link_name: '신규 프로모션',
            landing_url: 'https://neture.co.kr/products/new',
            tracking_code: 'NEW2025',
            clicks: 500,
            conversions: 15,
            revenue: 1500000,
            commission_rate: 0.10,
            commission_amount: 150000,
          },
        ],
        total_clicks: 500,
        total_conversions: 15,
        total_revenue: 1500000,
      } as PartnerSettlementDetail & { payout_date?: string; payout_method?: 'BANK_TRANSFER' | 'POINT' | 'OTHER'; payout_note?: string };
    } else if (payload.role === 'supplier') {
      newSettlement = {
        id: newId,
        role: 'supplier',
        supplier_id: 'supplier-001',
        period_start: payload.period_start,
        period_end: payload.period_end,
        status: 'OPEN',
        currency: 'KRW',
        gross_commission_amount: 800000,
        adjustment_amount: 0,
        net_payout_amount: 800000,
        created_at: now,
        updated_at: now,
        memo_internal: payload.memo_internal || '',
        lines: [
          {
            order_id: 'order-new',
            order_number: 'ORD-NEW-001',
            order_date: payload.period_start,
            seller_id: 'seller-001',
            seller_name: '네이처마켓',
            product_id: 'prod-new',
            product_name: '신규 상품',
            sku: 'NEW-001',
            quantity: 20,
            supply_price: 40000,
            line_total: 800000,
          },
        ],
        total_supply_amount: 800000,
        total_orders: 1,
        total_items: 20,
      } as SupplierSettlementDetail & { payout_date?: string; payout_method?: 'BANK_TRANSFER' | 'POINT' | 'OTHER'; payout_note?: string };
    } else {
      // seller
      newSettlement = {
        id: newId,
        role: 'seller',
        seller_id: 'seller-001',
        period_start: payload.period_start,
        period_end: payload.period_end,
        status: 'OPEN',
        currency: 'KRW',
        gross_commission_amount: 100000,
        adjustment_amount: 0,
        net_payout_amount: 100000,
        created_at: now,
        updated_at: now,
        memo_internal: payload.memo_internal || '',
        lines: [
          {
            order_id: 'order-new',
            order_number: 'ORD-NEW-001',
            order_date: payload.period_start,
            customer_name: '홍길동',
            customer_email: 'hong@example.com',
            product_id: 'prod-new',
            product_name: '신규 상품',
            sku: 'NEW-001',
            quantity: 2,
            sale_price: 60000,
            supply_price: 40000,
            line_revenue: 120000,
            line_cost: 80000,
            line_margin_amount: 40000,
            line_margin_rate: 0.33,
          },
        ],
        total_revenue: 120000,
        total_cost: 80000,
        total_margin_amount: 40000,
        average_margin_rate: 0.33,
        total_orders: 1,
        total_items: 2,
      } as SellerSettlementDetail & { payout_date?: string; payout_method?: 'BANK_TRANSFER' | 'POINT' | 'OTHER'; payout_note?: string };
    }

    mockSettlementsStore.unshift(newSettlement);

    return {
      success: true,
      data: newSettlement,
      message: '정산이 성공적으로 생성되었습니다.',
    };
  }

  // Real API
  const response = await authClient.api.post(API_ENDPOINTS.ADMIN_SETTLEMENTS.LIST, payload);
  return response.data;
}

/**
 * 정산 상태 변경
 */
export async function updateAdminSettlementStatus(
  id: string,
  payload: UpdateAdminSettlementStatusRequest
): Promise<UpdateAdminSettlementStatusResponse> {
  if (USE_MOCK_ADMIN_SETTLEMENTS) {
    await mockDelay();

    const settlement = mockSettlementsStore.find((s) => s.id === id);
    if (!settlement) {
      throw new Error(`정산 ID ${id}를 찾을 수 없습니다.`);
    }

    // 상태 업데이트
    settlement.status = payload.status;
    settlement.updated_at = new Date().toISOString();

    if (payload.memo_internal !== undefined) {
      settlement.memo_internal = payload.memo_internal;
    }

    // CANCELLED 상태일 경우 net_payout_amount를 0으로 설정
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
    API_ENDPOINTS.ADMIN_SETTLEMENTS.UPDATE_STATUS(id),
    payload
  );
  return response.data;
}

/**
 * 정산 지급 정보 업데이트
 */
export async function updateAdminSettlementPayout(
  id: string,
  payload: UpdateAdminSettlementPayoutRequest
): Promise<UpdateAdminSettlementPayoutResponse> {
  if (USE_MOCK_ADMIN_SETTLEMENTS) {
    await mockDelay();

    const settlement = mockSettlementsStore.find((s) => s.id === id);
    if (!settlement) {
      throw new Error(`정산 ID ${id}를 찾을 수 없습니다.`);
    }

    // 지급 정보 업데이트
    if (payload.payout_date !== undefined) {
      settlement.payout_date = payload.payout_date;
    }
    if (payload.payout_method !== undefined) {
      settlement.payout_method = payload.payout_method;
    }
    if (payload.payout_note !== undefined) {
      settlement.payout_note = payload.payout_note;
    }

    settlement.updated_at = new Date().toISOString();

    return {
      success: true,
      data: settlement,
      message: '지급 정보가 저장되었습니다.',
    };
  }

  // Real API
  const response = await authClient.api.patch(
    `/api/v1/admin/settlements/${id}/payout`,
    payload
  );
  return response.data;
}

/**
 * 정산 메모 업데이트
 */
export async function updateAdminSettlementMemo(
  id: string,
  payload: UpdateAdminSettlementMemoRequest
): Promise<UpdateAdminSettlementMemoResponse> {
  if (USE_MOCK_ADMIN_SETTLEMENTS) {
    await mockDelay();

    const settlement = mockSettlementsStore.find((s) => s.id === id);
    if (!settlement) {
      throw new Error(`정산 ID ${id}를 찾을 수 없습니다.`);
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
    API_ENDPOINTS.ADMIN_SETTLEMENTS.UPDATE_MEMO(id),
    payload
  );
  return response.data;
}

// Export 기본 API 객체
export const adminSettlementAPI = {
  fetchAdminSettlements,
  fetchAdminSettlementDetail,
  createAdminSettlement,
  updateAdminSettlementStatus,
  updateAdminSettlementPayout,
  updateAdminSettlementMemo,
};

export default adminSettlementAPI;

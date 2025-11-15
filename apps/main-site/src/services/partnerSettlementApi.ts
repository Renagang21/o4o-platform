/**
 * Partner Settlement API Service
 * Phase 4-1: Partner Commission Settlement
 * Phase 6-2: Mock/Real API integration
 */

import { authClient } from '@o4o/auth-client';
import { API_ENDPOINTS } from '../config/apiEndpoints';
import { MOCK_FLAGS } from '../config/mockFlags';
import type {
  PartnerSettlementDetail,
  SettlementSummary,
  PartnerSettlementLineItem,
  GetPartnerSettlementsQuery,
  GetPartnerSettlementsResponse,
  GetPartnerSettlementDetailResponse,
  CreatePartnerSettlementRequest,
  CreatePartnerSettlementResponse,
  UpdatePartnerSettlementStatusRequest,
  UpdatePartnerSettlementStatusResponse,
  UpdatePartnerSettlementMemoRequest,
  UpdatePartnerSettlementMemoResponse,
  SettlementStatus,
} from '../types/settlement';

// Phase 6-2: Use centralized mock flag
const USE_MOCK_PARTNER_SETTLEMENTS = MOCK_FLAGS.PARTNER_SETTLEMENTS;

// Mock 지연 시간
const mockDelay = () => new Promise((resolve) => setTimeout(resolve, 300));

/**
 * Mock 데이터: 정산 레코드
 */
const MOCK_SETTLEMENTS: PartnerSettlementDetail[] = [
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
    memo_internal: '10월 정산 - 정상 지급 완료',
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
        commission_amount: 76000,
      },
    ],
    total_clicks: 2230,
    total_conversions: 73,
    total_revenue: 4895000,
  },
  {
    id: 'stl-002',
    role: 'partner',
    partner_id: 'partner-001',
    period_start: '2025-09-01',
    period_end: '2025-09-30',
    status: 'PENDING_PAYOUT',
    currency: 'KRW',
    gross_commission_amount: 312000,
    adjustment_amount: -12000,
    net_payout_amount: 300000,
    created_at: '2025-10-01T10:00:00Z',
    updated_at: '2025-10-15T16:20:00Z',
    memo_internal: '9월 정산 - 지급 대기 중 (일부 조정 반영)',
    lines: [
      {
        link_id: 'link-001',
        link_name: '프리미엄 유기농 쌀 프로모션',
        landing_url: 'https://neture.co.kr/products/premium-rice',
        tracking_code: 'RICE2025',
        clicks: 1420,
        conversions: 52,
        revenue: 3900000,
        commission_rate: 0.05,
        commission_amount: 195000,
      },
      {
        link_id: 'link-003',
        link_name: '제주 감귤 직송',
        landing_url: 'https://neture.co.kr/products/jeju-tangerine',
        tracking_code: 'JEJU2025',
        clicks: 1100,
        conversions: 35,
        revenue: 2340000,
        commission_rate: 0.05,
        commission_amount: 117000,
      },
    ],
    total_clicks: 2520,
    total_conversions: 87,
    total_revenue: 6240000,
  },
  {
    id: 'stl-003',
    role: 'partner',
    partner_id: 'partner-001',
    period_start: '2025-08-01',
    period_end: '2025-08-31',
    status: 'OPEN',
    currency: 'KRW',
    gross_commission_amount: 178500,
    adjustment_amount: 0,
    net_payout_amount: 178500,
    created_at: '2025-09-01T09:00:00Z',
    updated_at: '2025-09-01T09:00:00Z',
    memo_internal: '',
    lines: [
      {
        link_id: 'link-002',
        link_name: '신선한 토마토 특가',
        landing_url: 'https://neture.co.kr/products/fresh-tomato',
        tracking_code: 'TOMATO2025',
        clicks: 890,
        conversions: 31,
        revenue: 1674000,
        commission_rate: 0.05,
        commission_amount: 83700,
      },
      {
        link_id: 'link-004',
        link_name: '무항생제 계란',
        landing_url: 'https://neture.co.kr/products/organic-eggs',
        tracking_code: 'EGGS2025',
        clicks: 760,
        conversions: 27,
        revenue: 1896000,
        commission_rate: 0.05,
        commission_amount: 94800,
      },
    ],
    total_clicks: 1650,
    total_conversions: 58,
    total_revenue: 3570000,
  },
  {
    id: 'stl-004',
    role: 'partner',
    partner_id: 'partner-001',
    period_start: '2025-07-01',
    period_end: '2025-07-31',
    status: 'PAID',
    currency: 'KRW',
    gross_commission_amount: 423000,
    adjustment_amount: 0,
    net_payout_amount: 423000,
    created_at: '2025-08-01T09:00:00Z',
    updated_at: '2025-08-10T11:45:00Z',
    memo_internal: '7월 정산 - 지급 완료',
    lines: [
      {
        link_id: 'link-001',
        link_name: '프리미엄 유기농 쌀 프로모션',
        landing_url: 'https://neture.co.kr/products/premium-rice',
        tracking_code: 'RICE2025',
        clicks: 1890,
        conversions: 68,
        revenue: 5100000,
        commission_rate: 0.05,
        commission_amount: 255000,
      },
      {
        link_id: 'link-003',
        link_name: '제주 감귤 직송',
        landing_url: 'https://neture.co.kr/products/jeju-tangerine',
        tracking_code: 'JEJU2025',
        clicks: 1540,
        conversions: 56,
        revenue: 3360000,
        commission_rate: 0.05,
        commission_amount: 168000,
      },
    ],
    total_clicks: 3430,
    total_conversions: 124,
    total_revenue: 8460000,
  },
  {
    id: 'stl-005',
    role: 'partner',
    partner_id: 'partner-001',
    period_start: '2025-06-01',
    period_end: '2025-06-30',
    status: 'CANCELLED',
    currency: 'KRW',
    gross_commission_amount: 156000,
    adjustment_amount: 0,
    net_payout_amount: 0,
    created_at: '2025-07-01T09:00:00Z',
    updated_at: '2025-07-02T15:20:00Z',
    memo_internal: '데이터 오류로 인한 정산 취소 - 재생성 필요',
    lines: [
      {
        link_id: 'link-002',
        link_name: '신선한 토마토 특가',
        landing_url: 'https://neture.co.kr/products/fresh-tomato',
        tracking_code: 'TOMATO2025',
        clicks: 720,
        conversions: 26,
        revenue: 1404000,
        commission_rate: 0.05,
        commission_amount: 70200,
      },
      {
        link_id: 'link-004',
        link_name: '무항생제 계란',
        landing_url: 'https://neture.co.kr/products/organic-eggs',
        tracking_code: 'EGGS2025',
        clicks: 650,
        conversions: 23,
        revenue: 1716000,
        commission_rate: 0.05,
        commission_amount: 85800,
      },
    ],
    total_clicks: 1370,
    total_conversions: 49,
    total_revenue: 3120000,
  },
];

// Mock 저장소 (상태 변경을 위한 가변 복사본)
let mockSettlementsStore = [...MOCK_SETTLEMENTS];

/**
 * Mock 헬퍼: 필터링 및 정렬
 */
function filterAndSortMockSettlements(
  query: GetPartnerSettlementsQuery
): SettlementSummary[] {
  let filtered = [...mockSettlementsStore];

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

  // 최신순 정렬 (period_start 기준 내림차순)
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
 * 정산 목록 조회
 */
export async function fetchPartnerSettlements(
  query: GetPartnerSettlementsQuery = {}
): Promise<GetPartnerSettlementsResponse> {
  if (USE_MOCK_PARTNER_SETTLEMENTS) {
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
  const response = await authClient.api.get(API_ENDPOINTS.PARTNER_SETTLEMENTS.LIST, {
    params: query,
  });
  return response.data;
}

/**
 * 정산 상세 조회
 */
export async function fetchPartnerSettlementDetail(
  id: string
): Promise<GetPartnerSettlementDetailResponse> {
  if (USE_MOCK_PARTNER_SETTLEMENTS) {
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
  const response = await authClient.api.get(API_ENDPOINTS.PARTNER_SETTLEMENTS.DETAIL(id));
  return response.data;
}

/**
 * 정산 생성
 */
export async function createPartnerSettlement(
  payload: CreatePartnerSettlementRequest
): Promise<CreatePartnerSettlementResponse> {
  if (USE_MOCK_PARTNER_SETTLEMENTS) {
    await mockDelay();

    // Mock: 새 정산 생성
    const newId = `stl-${String(mockSettlementsStore.length + 1).padStart(3, '0')}`;
    const now = new Date().toISOString();

    // Analytics 데이터 기반 자동 계산 시뮬레이션
    const mockLines: PartnerSettlementLineItem[] = [
      {
        link_id: 'link-001',
        link_name: '프리미엄 유기농 쌀 프로모션',
        landing_url: 'https://neture.co.kr/products/premium-rice',
        tracking_code: 'RICE2025',
        clicks: 1000,
        conversions: 35,
        revenue: 2625000,
        commission_rate: 0.05,
        commission_amount: 131250,
      },
      {
        link_id: 'link-002',
        link_name: '신선한 토마토 특가',
        landing_url: 'https://neture.co.kr/products/fresh-tomato',
        tracking_code: 'TOMATO2025',
        clicks: 800,
        conversions: 25,
        revenue: 1350000,
        commission_rate: 0.05,
        commission_amount: 67500,
      },
    ];

    const total_clicks = mockLines.reduce((sum, l) => sum + l.clicks, 0);
    const total_conversions = mockLines.reduce((sum, l) => sum + l.conversions, 0);
    const total_revenue = mockLines.reduce((sum, l) => sum + l.revenue, 0);
    const gross_commission = mockLines.reduce(
      (sum, l) => sum + l.commission_amount,
      0
    );

    const newSettlement: PartnerSettlementDetail = {
      id: newId,
      role: 'partner',
      partner_id: 'partner-001',
      period_start: payload.period_start,
      period_end: payload.period_end,
      status: 'OPEN',
      currency: 'KRW',
      gross_commission_amount: gross_commission,
      adjustment_amount: 0,
      net_payout_amount: gross_commission,
      created_at: now,
      updated_at: now,
      memo_internal: payload.memo_internal || '',
      lines: mockLines,
      total_clicks,
      total_conversions,
      total_revenue,
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
    API_ENDPOINTS.PARTNER_SETTLEMENTS.CREATE,
    payload
  );
  return response.data;
}

/**
 * 정산 상태 변경
 */
export async function updatePartnerSettlementStatus(
  id: string,
  payload: UpdatePartnerSettlementStatusRequest
): Promise<UpdatePartnerSettlementStatusResponse> {
  if (USE_MOCK_PARTNER_SETTLEMENTS) {
    await mockDelay();

    const settlement = mockSettlementsStore.find((s) => s.id === id);
    if (!settlement) {
      throw new Error(`Settlement with id ${id} not found`);
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
    API_ENDPOINTS.PARTNER_SETTLEMENTS.UPDATE_STATUS(id),
    payload
  );
  return response.data;
}

/**
 * 정산 메모 업데이트
 */
export async function updatePartnerSettlementMemo(
  id: string,
  payload: UpdatePartnerSettlementMemoRequest
): Promise<UpdatePartnerSettlementMemoResponse> {
  if (USE_MOCK_PARTNER_SETTLEMENTS) {
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
    API_ENDPOINTS.PARTNER_SETTLEMENTS.UPDATE_MEMO(id),
    payload
  );
  return response.data;
}

// Export 기본 API 객체
export const partnerSettlementAPI = {
  fetchPartnerSettlements,
  fetchPartnerSettlementDetail,
  createPartnerSettlement,
  updatePartnerSettlementStatus,
  updatePartnerSettlementMemo,
};

export default partnerSettlementAPI;

/**
 * Supplier Stats API - 공급자 통계 연계 API
 *
 * WO-KPA-GROUPBUY-SUPPLIER-STATS-DRYRUN-V1
 *
 * 목적:
 * - 공급자 시스템으로부터 공동구매 집계 통계 수신
 * - 개별 주문/약국/금액 정보 제외 (집계만)
 *
 * 캐시 정책:
 * - 10~30분 캐시 유효시간
 * - 실패 시 이전 캐시 사용
 */

import { apiClient } from './client';

// ============================================
// Types: 공급자 API 요청/응답
// ============================================

/** 공급자 통계 요청 파라미터 */
export interface SupplierStatsRequest {
  /** 공동구매 ID */
  groupbuyId?: string;
  /** 조회 시작일 (YYYY-MM-DD) */
  fromDate?: string;
  /** 조회 종료일 (YYYY-MM-DD) */
  toDate?: string;
  /** 집계 단위 */
  granularity?: 'daily' | 'total';
}

/** 공급자 통계 응답 (집계 데이터만) */
export interface SupplierStatsResponse {
  /** 총 주문 건수 */
  totalOrders: number;
  /** 참여 약국 수 */
  totalPharmacies: number;
  /** 일별 집계 (granularity=daily 시) */
  daily?: {
    date: string;
    orderCount: number;
    pharmacyCount: number;
  }[];
  /** 상품별 집계 */
  byProduct?: {
    productId: string;
    productName: string;
    orderCount: number;
  }[];
  /** 데이터 기준 시각 */
  dataAsOf: string;
}

/** 공급자 API 에러 */
export interface SupplierApiError {
  code: string;
  message: string;
}

// ============================================
// Supplier Stats 연계 상태
// ============================================

export type SupplierConnectionStatus =
  | 'connected'      // 정상 연결
  | 'disconnected'   // 연결 불가
  | 'degraded'       // 연결되나 지연/부분 오류
  | 'mock';          // Mock 모드

export interface SupplierStatsResult {
  status: SupplierConnectionStatus;
  data: SupplierStatsResponse | null;
  error: SupplierApiError | null;
  /** 캐시 데이터 사용 여부 */
  fromCache: boolean;
  /** 캐시 시각 */
  cachedAt?: string;
  /** 응답 시간 (ms) */
  responseTime?: number;
}

// ============================================
// 검증용 체크 함수
// ============================================

/**
 * 응답이 집계 데이터만 포함하는지 검증
 * 개별 주문 ID, 약국 식별자, 금액 정보가 있으면 실패
 */
export function validateAggregateOnly(response: any): {
  valid: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  // 금지 필드 체크
  const forbiddenFields = [
    'orderId', 'order_id', 'orderIds',
    'pharmacyId', 'pharmacy_id', 'pharmacyIds',
    'amount', 'price', 'totalAmount', 'orderAmount',
    'memberName', 'pharmacyName', 'address',
  ];

  const checkObject = (obj: any, path: string) => {
    if (!obj || typeof obj !== 'object') return;

    for (const key of Object.keys(obj)) {
      const lowerKey = key.toLowerCase();
      for (const forbidden of forbiddenFields) {
        if (lowerKey.includes(forbidden.toLowerCase())) {
          violations.push(`${path}.${key}: 집계 범위 초과 필드`);
        }
      }

      // 배열 내부도 검사
      if (Array.isArray(obj[key])) {
        obj[key].forEach((item: any, idx: number) => {
          checkObject(item, `${path}.${key}[${idx}]`);
        });
      } else if (typeof obj[key] === 'object') {
        checkObject(obj[key], `${path}.${key}`);
      }
    }
  };

  checkObject(response, 'response');

  return {
    valid: violations.length === 0,
    violations,
  };
}

// ============================================
// Mock 데이터 (드라이런용)
// ============================================

const MOCK_DELAY_MS = 500;

function createMockResponse(): SupplierStatsResponse {
  const now = new Date();
  return {
    totalOrders: 0,
    totalPharmacies: 0,
    daily: [],
    byProduct: [],
    dataAsOf: now.toISOString(),
  };
}

// ============================================
// Supplier Stats API Client
// ============================================

/**
 * 공급자 통계 API 클라이언트
 *
 * 현재 상태: Mock 모드 (드라이런)
 * 실제 연계 시 baseUrl과 인증 방식 설정 필요
 */
export const supplierStatsApi = {
  /**
   * 현재 연계 모드
   * TODO: 환경변수로 제어
   */
  mode: 'mock' as SupplierConnectionStatus,

  /**
   * 공급자 통계 조회
   */
  getStats: async (
    _params: SupplierStatsRequest = {}
  ): Promise<SupplierStatsResult> => {
    const startTime = Date.now();

    // Mock 모드
    if (supplierStatsApi.mode === 'mock') {
      await new Promise(resolve => setTimeout(resolve, MOCK_DELAY_MS));

      const mockData = createMockResponse();
      // 검증 (로깅용)
      validateAggregateOnly(mockData);

      return {
        status: 'mock',
        data: mockData,
        error: null,
        fromCache: false,
        cachedAt: new Date().toISOString(),
        responseTime: Date.now() - startTime,
      };
    }

    // 실제 API 호출 (추후 구현)
    try {
      // TODO: 실제 공급자 API 엔드포인트로 교체
      // const response = await supplierClient.get('/groupbuy/stats', { params });

      // 현재는 내부 API fallback
      const response = await apiClient.get<{ data: SupplierStatsResponse }>(
        '/groupbuy-admin/stats'
      );

      const responseTime = Date.now() - startTime;

      if (response?.data) {
        const validation = validateAggregateOnly(response.data);
        if (!validation.valid) {
          console.warn('Supplier stats validation failed:', validation.violations);
        }

        return {
          status: 'connected',
          data: response.data,
          error: null,
          fromCache: false,
          cachedAt: new Date().toISOString(),
          responseTime,
        };
      }

      return {
        status: 'disconnected',
        data: null,
        error: { code: 'NO_DATA', message: '데이터 없음' },
        fromCache: false,
        responseTime,
      };
    } catch (err: any) {
      const responseTime = Date.now() - startTime;

      return {
        status: 'disconnected',
        data: null,
        error: {
          code: err?.response?.status?.toString() || 'NETWORK_ERROR',
          message: err?.message || '네트워크 오류',
        },
        fromCache: false,
        responseTime,
      };
    }
  },

  /**
   * 연결 상태 확인 (헬스체크)
   */
  checkConnection: async (): Promise<{
    status: SupplierConnectionStatus;
    latency?: number;
    error?: string;
  }> => {
    if (supplierStatsApi.mode === 'mock') {
      return { status: 'mock' };
    }

    const startTime = Date.now();

    try {
      // TODO: 실제 헬스체크 엔드포인트
      await apiClient.get('/health');
      return {
        status: 'connected',
        latency: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        status: 'disconnected',
        error: err?.message,
      };
    }
  },
};

export default supplierStatsApi;

/**
 * Supplier Stats Service - 공급자 통계 연계 서비스
 *
 * WO-KPA-GROUPBUY-SUPPLIER-STATS-DRYRUN-V1
 *
 * 책임:
 * - 공급자 API로부터 집계 통계 수신
 * - 캐시 관리 (10~30분)
 * - 실패 시 폴백 처리
 *
 * 현재 상태: 드라이런 (Mock 모드)
 */

// ============================================
// Types
// ============================================

export interface SupplierStatsRequest {
  groupbuyId?: string;
  fromDate?: string;
  toDate?: string;
  granularity?: 'daily' | 'total';
}

export interface SupplierStatsResponse {
  totalOrders: number;
  totalPharmacies: number;
  daily?: {
    date: string;
    orderCount: number;
    pharmacyCount: number;
  }[];
  byProduct?: {
    productId: string;
    productName: string;
    orderCount: number;
  }[];
  dataAsOf: string;
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'degraded' | 'mock';

export interface SupplierStatsResult {
  status: ConnectionStatus;
  data: SupplierStatsResponse | null;
  error: { code: string; message: string } | null;
  fromCache: boolean;
  cachedAt?: string;
  responseTime?: number;
}

// ============================================
// In-Memory Cache
// ============================================

interface CacheEntry {
  data: SupplierStatsResponse;
  cachedAt: Date;
  validUntil: Date;
}

const statsCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30분

function getCacheKey(params: SupplierStatsRequest): string {
  return JSON.stringify(params);
}

function getFromCache(params: SupplierStatsRequest): CacheEntry | null {
  const key = getCacheKey(params);
  const entry = statsCache.get(key);

  if (!entry) return null;

  // 캐시 만료 체크 (만료되어도 폴백용으로 반환)
  return entry;
}

function setCache(params: SupplierStatsRequest, data: SupplierStatsResponse): void {
  const key = getCacheKey(params);
  const now = new Date();

  statsCache.set(key, {
    data,
    cachedAt: now,
    validUntil: new Date(now.getTime() + CACHE_TTL_MS),
  });
}

function isCacheValid(entry: CacheEntry): boolean {
  return new Date() < entry.validUntil;
}

// ============================================
// Validation
// ============================================

const FORBIDDEN_FIELDS = [
  'orderid', 'order_id', 'orderids',
  'pharmacyid', 'pharmacy_id', 'pharmacyids',
  'amount', 'price', 'totalamount', 'orderamount',
  'membername', 'pharmacyname', 'address',
];

function validateAggregateOnly(response: any): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  const checkObject = (obj: any, path: string) => {
    if (!obj || typeof obj !== 'object') return;

    for (const key of Object.keys(obj)) {
      const lowerKey = key.toLowerCase();
      for (const forbidden of FORBIDDEN_FIELDS) {
        if (lowerKey.includes(forbidden)) {
          violations.push(`${path}.${key}`);
        }
      }

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
  return { valid: violations.length === 0, violations };
}

// ============================================
// Mock Data
// ============================================

function createMockResponse(): SupplierStatsResponse {
  return {
    totalOrders: 0,
    totalPharmacies: 0,
    daily: [],
    byProduct: [],
    dataAsOf: new Date().toISOString(),
  };
}

// ============================================
// Service
// ============================================

export class SupplierStatsService {
  private mode: ConnectionStatus = 'mock';
  private supplierBaseUrl: string | null = null;

  constructor() {
    // TODO: 환경변수에서 설정 로드
    // this.supplierBaseUrl = process.env.SUPPLIER_STATS_API_URL || null;
    // this.mode = this.supplierBaseUrl ? 'connected' : 'mock';
  }

  /**
   * 현재 연계 모드 반환
   */
  getMode(): ConnectionStatus {
    return this.mode;
  }

  /**
   * 공급자 통계 조회
   */
  async getStats(params: SupplierStatsRequest = {}): Promise<SupplierStatsResult> {
    const startTime = Date.now();
    const cachedEntry = getFromCache(params);

    // Mock 모드
    if (this.mode === 'mock') {
      const mockData = createMockResponse();

      // 캐시에 저장
      setCache(params, mockData);

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
      // TODO: 실제 공급자 API 호출
      // const response = await fetch(`${this.supplierBaseUrl}/groupbuy/stats`, {
      //   method: 'GET',
      //   headers: { 'Authorization': `Bearer ${token}` },
      // });

      // 현재는 Mock 데이터 반환
      const data = createMockResponse();

      // 검증
      const validation = validateAggregateOnly(data);
      if (!validation.valid) {
        console.warn('[SupplierStats] Validation failed:', validation.violations);
        // 검증 실패해도 데이터는 반환 (로깅만)
      }

      // 캐시 저장
      setCache(params, data);

      return {
        status: 'connected',
        data,
        error: null,
        fromCache: false,
        cachedAt: new Date().toISOString(),
        responseTime: Date.now() - startTime,
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      // 실패 시 캐시에서 폴백
      if (cachedEntry) {
        console.warn('[SupplierStats] API failed, using cached data');
        return {
          status: 'degraded',
          data: cachedEntry.data,
          error: {
            code: 'API_ERROR',
            message: error?.message || '공급자 API 오류',
          },
          fromCache: true,
          cachedAt: cachedEntry.cachedAt.toISOString(),
          responseTime,
        };
      }

      return {
        status: 'disconnected',
        data: null,
        error: {
          code: error?.response?.status?.toString() || 'NETWORK_ERROR',
          message: error?.message || '네트워크 오류',
        },
        fromCache: false,
        responseTime,
      };
    }
  }

  /**
   * 연결 상태 확인
   */
  async checkConnection(): Promise<{
    status: ConnectionStatus;
    latency?: number;
    error?: string;
  }> {
    if (this.mode === 'mock') {
      return { status: 'mock' };
    }

    const startTime = Date.now();

    try {
      // TODO: 실제 헬스체크
      return {
        status: 'connected',
        latency: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        status: 'disconnected',
        error: error?.message,
      };
    }
  }

  /**
   * 캐시 클리어 (테스트/디버그용)
   */
  clearCache(): void {
    statsCache.clear();
  }
}

// 싱글톤 인스턴스
export const supplierStatsService = new SupplierStatsService();

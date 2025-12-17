/**
 * Seller Dashboard API Module
 *
 * WO-03 API As-Is 점검 보고서 기준
 * 모든 API 호출은 이 파일을 통해서만 수행
 */

import type {
  ConsultationStats,
  DisplayStats,
  InventoryStats,
  SampleInventoryStats,
  DailyUsageData,
  DisplaySummary,
  RecentConsultation,
} from './sellerDashboard.types';

// API Base URLs
const SELLER_API_BASE = '/api/v1/cosmetics-seller';
const SAMPLE_API_BASE = '/api/v1/cosmetics-sample';

// API Response 래퍼
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * 상담 통계 조회
 * GET /api/v1/cosmetics-seller/consultation/seller/{sellerId}/stats
 */
export async function getConsultationStats(
  sellerId: string
): Promise<ConsultationStats | null> {
  try {
    const res = await fetch(
      `${SELLER_API_BASE}/consultation/seller/${sellerId}/stats`
    );
    if (!res.ok) return null;

    const data: ApiResponse<ConsultationStats> = await res.json();
    return data.success ? data.data : null;
  } catch {
    return null;
  }
}

/**
 * 진열 통계 조회 (seller-extension)
 * GET /api/v1/cosmetics-seller/display/seller/{sellerId}/stats
 */
export async function getDisplayStats(
  sellerId: string
): Promise<DisplayStats | null> {
  try {
    const res = await fetch(
      `${SELLER_API_BASE}/display/seller/${sellerId}/stats`
    );
    if (!res.ok) return null;

    const data: ApiResponse<DisplayStats> = await res.json();
    return data.success ? data.data : null;
  } catch {
    return null;
  }
}

/**
 * 재고 통계 조회
 * GET /api/v1/cosmetics-seller/inventory/seller/{sellerId}/stats
 */
export async function getInventoryStats(
  sellerId: string
): Promise<InventoryStats | null> {
  try {
    const res = await fetch(
      `${SELLER_API_BASE}/inventory/seller/${sellerId}/stats`
    );
    if (!res.ok) return null;

    const data: ApiResponse<InventoryStats> = await res.json();
    return data.success ? data.data : null;
  } catch {
    return null;
  }
}

/**
 * 최근 상담 목록 조회
 * GET /api/v1/cosmetics-seller/consultation/seller/{sellerId}?limit=5
 */
export async function getRecentConsultations(
  sellerId: string,
  limit: number = 5
): Promise<RecentConsultation[]> {
  try {
    const res = await fetch(
      `${SELLER_API_BASE}/consultation/seller/${sellerId}?limit=${limit}`
    );
    if (!res.ok) return [];

    const data: ApiResponse<RecentConsultation[]> = await res.json();
    return data.success ? data.data : [];
  } catch {
    return [];
  }
}

/**
 * 샘플 재고 통계 조회
 * GET /api/v1/cosmetics-sample/inventory/{storeId}/stats
 */
export async function getSampleInventoryStats(
  storeId: string
): Promise<SampleInventoryStats | null> {
  try {
    const res = await fetch(`${SAMPLE_API_BASE}/inventory/${storeId}/stats`);
    if (!res.ok) return null;

    const data = await res.json();
    return data;
  } catch {
    return null;
  }
}

/**
 * 샘플 사용 일별 데이터 조회
 * GET /api/v1/cosmetics-sample/usage/{storeId}/daily?days={N}
 */
export async function getSampleUsage(
  storeId: string,
  days: number
): Promise<DailyUsageData[]> {
  try {
    const res = await fetch(
      `${SAMPLE_API_BASE}/usage/${storeId}/daily?days=${days}`
    );
    if (!res.ok) return [];

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * 진열 요약 조회 (sample-display-extension)
 * GET /api/v1/cosmetics-sample/display/{storeId}/summary
 */
export async function getDisplaySummary(
  storeId: string
): Promise<DisplaySummary | null> {
  try {
    const res = await fetch(`${SAMPLE_API_BASE}/display/${storeId}/summary`);
    if (!res.ok) return null;

    const data = await res.json();
    return data;
  } catch {
    return null;
  }
}

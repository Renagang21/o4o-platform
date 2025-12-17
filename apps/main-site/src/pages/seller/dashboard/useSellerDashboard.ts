/**
 * useSellerDashboard Hook
 *
 * 데이터 로딩, KPI 계산, colorMode 판정
 * WO-02 Design Core 규칙 준수
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  PeriodType,
  KPIColorMode,
  SellerDashboardState,
  ConsultationStats,
  DisplayStats,
  InventoryStats,
  SampleInventoryStats,
  DailyUsageData,
  DisplaySummary,
  RecentConsultation,
} from './sellerDashboard.types';
import {
  getConsultationStats,
  getDisplayStats,
  getInventoryStats,
  getRecentConsultations,
  getSampleInventoryStats,
  getSampleUsage,
  getDisplaySummary,
} from './sellerDashboard.api';

// 기간별 days 매핑
const PERIOD_DAYS: Record<PeriodType, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
};

// ========================================
// colorMode 판정 함수 (WO-02 기준 - 변경 금지)
// ========================================

/**
 * 전환율 색상 판정
 * >= 15%: positive (정상)
 * 10~15%: neutral (주의)
 * < 10%: negative (위험)
 */
export function getConversionRateColorMode(rate: number): KPIColorMode {
  if (rate >= 15) return 'positive';
  if (rate >= 10) return 'neutral';
  return 'negative';
}

/**
 * 건강 점수 색상 판정
 * >= 80%: positive (정상)
 * 50~80%: neutral (주의)
 * < 50%: negative (위험)
 */
export function getHealthScoreColorMode(score: number): KPIColorMode {
  if (score >= 80) return 'positive';
  if (score >= 50) return 'neutral';
  return 'negative';
}

/**
 * 재고 부족 색상 판정
 * 0개: neutral (정상)
 * 1~2개: neutral (주의/관찰)
 * >= 3개: negative (위험)
 */
export function getLowStockColorMode(count: number): KPIColorMode {
  if (count === 0) return 'neutral';
  if (count <= 2) return 'neutral';
  return 'negative';
}

/**
 * 미인증 진열 색상 판정
 * 0개: neutral (정상)
 * 1~2개: neutral (주의/관찰)
 * >= 3개: negative (위험)
 */
export function getUnverifiedDisplayColorMode(count: number): KPIColorMode {
  if (count === 0) return 'neutral';
  if (count <= 2) return 'neutral';
  return 'negative';
}

// ========================================
// Hook 구현
// ========================================

interface UseSellerDashboardOptions {
  sellerId: string;
  storeId?: string;
}

interface UseSellerDashboardReturn extends SellerDashboardState {
  period: PeriodType;
  setPeriod: (period: PeriodType) => void;
  refresh: () => void;
}

export function useSellerDashboard({
  sellerId,
  storeId,
}: UseSellerDashboardOptions): UseSellerDashboardReturn {
  // 실제 storeId (없으면 sellerId 사용)
  const effectiveStoreId = storeId || sellerId;

  // 기간 상태
  const [period, setPeriod] = useState<PeriodType>('daily');

  // 기본 데이터 상태
  const [consultationStats, setConsultationStats] =
    useState<ConsultationStats | null>(null);
  const [displayStats, setDisplayStats] = useState<DisplayStats | null>(null);
  const [inventoryStats, setInventoryStats] = useState<InventoryStats | null>(
    null
  );
  const [recentConsultations, setRecentConsultations] = useState<
    RecentConsultation[]
  >([]);

  // 확장 KPI 데이터 상태
  const [sampleInventoryStats, setSampleInventoryStats] =
    useState<SampleInventoryStats | null>(null);
  const [dailyUsageData, setDailyUsageData] = useState<DailyUsageData[]>([]);
  const [displaySummary, setDisplaySummary] = useState<DisplaySummary | null>(
    null
  );

  // 로딩/에러 상태
  const [loading, setLoading] = useState(true);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 기본 데이터 로드
  const fetchBaseData = useCallback(async () => {
    if (!sellerId) return;

    try {
      setLoading(true);
      setError(null);

      // 병렬 호출 (실패 허용)
      const [consultation, display, inventory, consultations] =
        await Promise.all([
          getConsultationStats(sellerId),
          getDisplayStats(sellerId),
          getInventoryStats(sellerId),
          getRecentConsultations(sellerId, 5),
        ]);

      setConsultationStats(consultation);
      setDisplayStats(display);
      setInventoryStats(inventory);
      setRecentConsultations(consultations);
    } catch (err) {
      console.warn('Base data fetch error:', err);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  // 확장 KPI 데이터 로드 (기간 필터 연동)
  const fetchExtendedKPIData = useCallback(async () => {
    if (!effectiveStoreId) return;

    try {
      setKpiLoading(true);

      const days = PERIOD_DAYS[period];

      // 병렬 호출 (각각 실패 허용)
      const [sampleInventory, usage, summary] = await Promise.all([
        getSampleInventoryStats(effectiveStoreId).catch(() => null),
        getSampleUsage(effectiveStoreId, days).catch(() => []),
        getDisplaySummary(effectiveStoreId).catch(() => null),
      ]);

      setSampleInventoryStats(sampleInventory);
      setDailyUsageData(usage);
      setDisplaySummary(summary);
    } catch (err) {
      console.warn('Extended KPI fetch error:', err);
      // 확장 KPI 오류는 전체 UI를 차단하지 않음
    } finally {
      setKpiLoading(false);
    }
  }, [effectiveStoreId, period]);

  // 초기 로드
  useEffect(() => {
    fetchBaseData();
  }, [fetchBaseData]);

  // 기간 변경 시 확장 KPI 다시 로드
  useEffect(() => {
    fetchExtendedKPIData();
  }, [fetchExtendedKPIData]);

  // 새로고침
  const refresh = useCallback(() => {
    fetchBaseData();
    fetchExtendedKPIData();
  }, [fetchBaseData, fetchExtendedKPIData]);

  // 계산된 값 (프론트엔드 계산 - WO-03 기준)
  const computed = useMemo(() => {
    // 건강 점수: verifiedDisplays / totalDisplays * 100
    const healthScore =
      displaySummary && displaySummary.totalDisplays > 0
        ? Math.round(
            (displaySummary.verifiedDisplays / displaySummary.totalDisplays) *
              100
          )
        : 0;

    // 미인증 진열: totalDisplays - verifiedDisplays
    const unverifiedDisplays = displaySummary
      ? displaySummary.totalDisplays - displaySummary.verifiedDisplays
      : 0;

    // 일별 사용량 합계
    const totalUsage = dailyUsageData.reduce(
      (sum, d) => sum + (d.usage || 0),
      0
    );
    const totalPurchases = dailyUsageData.reduce(
      (sum, d) => sum + (d.purchases || 0),
      0
    );

    // 샘플 전환율
    const sampleConversionRate =
      totalUsage > 0 ? (totalPurchases / totalUsage) * 100 : 0;

    // 총 재고 수량 (totalProducts를 사용, 실제 quantity는 API에서 미제공)
    const totalQuantity = sampleInventoryStats?.totalProducts || 0;

    return {
      healthScore,
      unverifiedDisplays,
      totalUsage,
      totalPurchases,
      sampleConversionRate,
      totalQuantity,
    };
  }, [displaySummary, dailyUsageData, sampleInventoryStats]);

  return {
    // 기본 데이터
    consultationStats,
    displayStats,
    inventoryStats,
    recentConsultations,

    // 확장 KPI 데이터
    sampleInventoryStats,
    dailyUsageData,
    displaySummary,

    // 계산된 값
    computed,

    // 로딩/에러 상태
    loading,
    kpiLoading,
    error,

    // 기간 상태
    period,
    setPeriod,

    // 액션
    refresh,
  };
}

export default useSellerDashboard;

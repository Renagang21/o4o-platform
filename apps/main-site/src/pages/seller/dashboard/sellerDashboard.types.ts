/**
 * Seller Dashboard Types
 *
 * Design Core v1.0 규칙 준수
 * WO-02 기준 타입 정의
 */

// 기간 타입 (확장 금지)
export type PeriodType = 'daily' | 'weekly' | 'monthly';

// KPI 색상 모드 (확장 금지)
export type KPIColorMode = 'positive' | 'neutral' | 'negative' | 'info';

// 기간 옵션 (고정)
export const PERIOD_OPTIONS = [
  { value: 'daily' as const, label: '오늘', days: 1 },
  { value: 'weekly' as const, label: '이번 주', days: 7 },
  { value: 'monthly' as const, label: '이번 달', days: 30 },
] as const;

// 상담 통계
export interface ConsultationStats {
  totalConsultations: number;
  completedConsultations: number;
  conversionRate: number;
  averageDuration: number;
  totalRecommendations: number;
  totalPurchases: number;
}

// 진열 통계 (seller-extension)
export interface DisplayStats {
  totalDisplays: number;
  byLocation: Record<string, number>;
  totalFaceCount: number;
  averageQuality: string | null;
}

// 재고 통계
export interface InventoryStats {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
}

// 샘플 재고 통계
export interface SampleInventoryStats {
  totalProducts: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  totalValue: number;
}

// 샘플 사용 일별 데이터
export interface DailyUsageData {
  date: string;
  usage: number;
  purchases: number;
}

// 진열 요약 (sample-display-extension)
export interface DisplaySummary {
  totalDisplays: number;
  activeDisplays: number;
  verifiedDisplays: number;
  needsRefill: number;
  byPosition: Record<string, number>;
}

// 최근 상담
export interface RecentConsultation {
  id: string;
  createdAt: string;
  resultStatus: string;
  recommendedProducts: unknown[];
  purchasedProducts: unknown[];
}

// Dashboard 전체 상태
export interface SellerDashboardState {
  // 기본 데이터
  consultationStats: ConsultationStats | null;
  displayStats: DisplayStats | null;
  inventoryStats: InventoryStats | null;
  recentConsultations: RecentConsultation[];

  // 확장 KPI 데이터
  sampleInventoryStats: SampleInventoryStats | null;
  dailyUsageData: DailyUsageData[];
  displaySummary: DisplaySummary | null;

  // 계산된 값
  computed: {
    healthScore: number;
    unverifiedDisplays: number;
    totalUsage: number;
    totalPurchases: number;
    sampleConversionRate: number;
    totalQuantity: number;
  };

  // 로딩 상태
  loading: boolean;
  kpiLoading: boolean;
  error: string | null;
}

// KPI 카드 Props
export interface KPICardData {
  title: string;
  value: string | number;
  colorMode: KPIColorMode;
  subtitle?: string;
  loading?: boolean;
}

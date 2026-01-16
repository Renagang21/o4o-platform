/**
 * AI Cost Configuration
 * WO-AI-COST-TOOLING-V1
 *
 * AI 비용 가시화를 위한 설정 및 유틸리티
 * - 엔진별 단가 테이블 (내부 기준, 실제 과금 아님)
 * - 비용 집계 함수
 * - 비용 레벨 판정 함수
 */

// ===== 엔진 단가 테이블 =====

export interface EnginePricing {
  engineId: string;
  engineName: string;
  unitCost: number; // 내부 기준 단가 (실제 달러 아님)
  description: string;
}

/**
 * 엔진별 단가 테이블
 * - 실제 과금액이 아닌 상대적 비용 비교용
 * - 관리자가 설정 가능 (향후 DB 저장)
 */
export const ENGINE_PRICING_TABLE: EnginePricing[] = [
  {
    engineId: 'gemini-2.5-flash',
    engineName: 'Gemini 2.5 Flash',
    unitCost: 1.0,
    description: '최신 플래시 모델 (기준)',
  },
  {
    engineId: 'gemini-2.0-flash',
    engineName: 'Gemini 2.0 Flash',
    unitCost: 0.7,
    description: '이전 세대 플래시 모델',
  },
  {
    engineId: 'gemini-1.5-flash',
    engineName: 'Gemini 1.5 Flash',
    unitCost: 0.5,
    description: '구세대 플래시 모델',
  },
  {
    engineId: 'gemini-2.5-pro',
    engineName: 'Gemini 2.5 Pro',
    unitCost: 3.0,
    description: '고성능 Pro 모델',
  },
  {
    engineId: 'gpt-4o',
    engineName: 'GPT-4o',
    unitCost: 2.5,
    description: 'OpenAI GPT-4o 모델',
  },
  {
    engineId: 'gpt-4o-mini',
    engineName: 'GPT-4o Mini',
    unitCost: 0.8,
    description: 'OpenAI GPT-4o Mini 모델',
  },
  {
    engineId: 'claude-3-sonnet',
    engineName: 'Claude 3 Sonnet',
    unitCost: 2.0,
    description: 'Anthropic Claude 3 Sonnet',
  },
];

/**
 * 엔진 ID로 단가 조회
 */
export function getEnginePricing(engineId: string): EnginePricing | undefined {
  return ENGINE_PRICING_TABLE.find((e) => e.engineId === engineId);
}

/**
 * 엔진 단가 조회 (기본값 1.0)
 */
export function getEngineUnitCost(engineId: string): number {
  return getEnginePricing(engineId)?.unitCost ?? 1.0;
}

// ===== 비용 집계 타입 =====

export interface CostSummary {
  totalRequests: number;
  totalCost: number;
  avgCostPerRequest: number;
}

export interface ServiceCostData {
  serviceId: string;
  serviceName: string;
  requests: number;
  cost: number;
  avgCost: number;
  packageCompliance: number; // 패키지 준수율 (%)
}

export interface EngineCostData {
  engineId: string;
  engineName: string;
  requests: number;
  cost: number;
  percentage: number; // 전체 대비 비율 (%)
}

export interface DailyCostData {
  date: string;
  requests: number;
  cost: number;
}

export interface CostDashboardData {
  summary: CostSummary;
  byService: ServiceCostData[];
  byEngine: EngineCostData[];
  dailyTrend: DailyCostData[];
  period: {
    start: string;
    end: string;
  };
}

// ===== 비용 레벨 판정 =====

export type CostLevel = 'low' | 'medium' | 'high';

export interface CostLevelThresholds {
  lowMax: number;
  highMin: number;
}

/**
 * 기본 비용 레벨 임계값
 * - 평균 비용 기준
 */
export const DEFAULT_COST_THRESHOLDS: CostLevelThresholds = {
  lowMax: 0.8,
  highMin: 1.5,
};

/**
 * 비용 레벨 판정
 */
export function getCostLevel(
  avgCost: number,
  thresholds: CostLevelThresholds = DEFAULT_COST_THRESHOLDS
): CostLevel {
  if (avgCost <= thresholds.lowMax) return 'low';
  if (avgCost >= thresholds.highMin) return 'high';
  return 'medium';
}

/**
 * 비용 레벨 정보
 */
export function getCostLevelInfo(level: CostLevel): {
  label: string;
  color: string;
  bgColor: string;
} {
  const info: Record<CostLevel, { label: string; color: string; bgColor: string }> = {
    low: { label: '낮음', color: 'text-green-700', bgColor: 'bg-green-100' },
    medium: { label: '보통', color: 'text-amber-700', bgColor: 'bg-amber-100' },
    high: { label: '높음', color: 'text-red-700', bgColor: 'bg-red-100' },
  };
  return info[level];
}

// ===== 비용 계산 유틸리티 =====

export interface QueryLogEntry {
  id: string;
  engineId: string;
  serviceId: string;
  timestamp: string;
  // 기타 필드는 생략
}

/**
 * 쿼리 로그에서 비용 계산
 */
export function calculateCostFromLogs(logs: QueryLogEntry[]): number {
  return logs.reduce((total, log) => {
    const unitCost = getEngineUnitCost(log.engineId);
    return total + unitCost;
  }, 0);
}

/**
 * 서비스별 비용 집계
 */
export function aggregateCostByService(
  logs: QueryLogEntry[],
  serviceNames: Record<string, string>,
  packageComplianceMap: Record<string, number>
): ServiceCostData[] {
  const serviceMap = new Map<string, { requests: number; cost: number }>();

  logs.forEach((log) => {
    const current = serviceMap.get(log.serviceId) || { requests: 0, cost: 0 };
    const unitCost = getEngineUnitCost(log.engineId);
    serviceMap.set(log.serviceId, {
      requests: current.requests + 1,
      cost: current.cost + unitCost,
    });
  });

  return Array.from(serviceMap.entries()).map(([serviceId, data]) => ({
    serviceId,
    serviceName: serviceNames[serviceId] || serviceId,
    requests: data.requests,
    cost: data.cost,
    avgCost: data.requests > 0 ? data.cost / data.requests : 0,
    packageCompliance: packageComplianceMap[serviceId] || 0,
  }));
}

/**
 * 엔진별 비용 집계
 */
export function aggregateCostByEngine(logs: QueryLogEntry[]): EngineCostData[] {
  const engineMap = new Map<string, { requests: number; cost: number }>();
  let totalCost = 0;

  logs.forEach((log) => {
    const current = engineMap.get(log.engineId) || { requests: 0, cost: 0 };
    const unitCost = getEngineUnitCost(log.engineId);
    const newCost = current.cost + unitCost;
    engineMap.set(log.engineId, {
      requests: current.requests + 1,
      cost: newCost,
    });
    totalCost += unitCost;
  });

  return Array.from(engineMap.entries()).map(([engineId, data]) => {
    const pricing = getEnginePricing(engineId);
    return {
      engineId,
      engineName: pricing?.engineName || engineId,
      requests: data.requests,
      cost: data.cost,
      percentage: totalCost > 0 ? (data.cost / totalCost) * 100 : 0,
    };
  });
}

/**
 * 일별 비용 집계
 */
export function aggregateCostByDate(logs: QueryLogEntry[]): DailyCostData[] {
  const dateMap = new Map<string, { requests: number; cost: number }>();

  logs.forEach((log) => {
    const date = log.timestamp.split('T')[0];
    const current = dateMap.get(date) || { requests: 0, cost: 0 };
    const unitCost = getEngineUnitCost(log.engineId);
    dateMap.set(date, {
      requests: current.requests + 1,
      cost: current.cost + unitCost,
    });
  });

  return Array.from(dateMap.entries())
    .map(([date, data]) => ({
      date,
      requests: data.requests,
      cost: data.cost,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 숫자 포맷팅 (소수점 2자리)
 */
export function formatCost(cost: number): string {
  return cost.toFixed(2);
}

/**
 * 퍼센트 포맷팅
 */
export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

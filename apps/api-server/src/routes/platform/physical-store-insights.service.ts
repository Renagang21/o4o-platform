/**
 * Physical Store Insight Engine
 *
 * WO-O4O-PHYSICAL-STORE-AI-HYBRID-V1
 *
 * Pure computation — no DB access.
 * Takes current/last-month per-service KPI for a single physical store,
 * produces scored insights.
 *
 * Rules:
 *  1. Physical Store 성장률 (revenue growth)
 *  2. 겸업 시너지 분석 (multi-service synergy)
 *  3. 서비스 의존도 (service concentration)
 *  4. 서비스 믹스 변화율 (share delta)
 */

type InsightLevel = 'positive' | 'warning' | 'info';

export interface StoreInsight {
  level: InsightLevel;
  message: string;
}

export interface StoreInsightsResult {
  level: InsightLevel;
  messages: string[];
  insights: StoreInsight[];
  metrics: {
    growthRate: number | null;
    serviceConcentration: number | null;
    synergyScore: number | null;
  };
}

export interface ServicePeriodKPI {
  serviceType: string;
  revenue: number;
  orders: number;
}

export interface StoreInsightContext {
  current: {
    totalRevenue: number;
    totalOrders: number;
    services: ServicePeriodKPI[];
  };
  lastMonth: {
    totalRevenue: number;
    totalOrders: number;
    services: ServicePeriodKPI[];
  };
}

const MAX_INSIGHTS = 5;

export function generatePhysicalStoreInsights(ctx: StoreInsightContext): StoreInsightsResult {
  const insights: StoreInsight[] = [];

  // ---- Rule 1: Physical Store 성장률 ----
  const growthRate = safeGrowthRate(ctx.current.totalRevenue, ctx.lastMonth.totalRevenue);
  if (growthRate !== null) {
    if (growthRate > 0.15) {
      insights.push({
        level: 'positive',
        message: `이번 달 매출이 ${pct(growthRate)} 증가했습니다.`,
      });
    } else if (growthRate < -0.10) {
      insights.push({
        level: 'warning',
        message: `이번 달 매출이 ${pct(Math.abs(growthRate))} 감소했습니다.`,
      });
    } else {
      insights.push({
        level: 'info',
        message: `이번 달 매출 변동률: ${growthRate >= 0 ? '+' : ''}${pct(growthRate)}.`,
      });
    }
  }

  // ---- Rule 2: 겸업 시너지 분석 ----
  //   WO-O4O-GLYCOPHARM-COMPLETE-ERASURE-V1: 서비스명을 문구에 고정하지 않는다
  //   (기존에는 K-Cosmetics × GlycoPharm 쌍을 전제했다). 시너지 판정은 서비스 수 기준 generic 이다.
  const synergyScore = computeSynergyScore(ctx);
  if (synergyScore !== null) {
    const growths = ctx.current.services
      .map((svc) => ({ serviceType: svc.serviceType, growth: getServiceGrowth(ctx, svc.serviceType) }))
      .filter((g): g is { serviceType: string; growth: number } => g.growth !== null);

    if (growths.length >= 2) {
      const growing = growths.filter((g) => g.growth > 0);
      if (growing.length === growths.length) {
        insights.push({
          level: 'positive',
          message: `겸업 서비스가 모두 성장 중입니다. 겸업 시너지가 나타나고 있습니다.`,
        });
      } else if (growing.length === 0) {
        insights.push({
          level: 'warning',
          message: `겸업 서비스 매출이 모두 감소하고 있습니다.`,
        });
      } else {
        const label = growing.map((g) => serviceLabel(g.serviceType)).join(", ");
        insights.push({
          level: 'info',
          message: `${label} 매출이 증가하는 반면 다른 서비스는 감소 추세입니다.`,
        });
      }
    }
  }

  // ---- Rule 3: 서비스 의존도 (concentration) ----
  const serviceConcentration = computeServiceConcentration(ctx.current);
  if (serviceConcentration !== null) {
    if (serviceConcentration > 0.70) {
      const dominant = getDominantService(ctx.current);
      insights.push({
        level: 'warning',
        message: `${serviceLabel(dominant)} 매출 비중이 ${pct(serviceConcentration)}로 편중되어 있습니다.`,
      });
    } else if (serviceConcentration < 0.50) {
      insights.push({
        level: 'positive',
        message: `서비스 간 매출이 균형 잡혀 있습니다 (최대 비중: ${pct(serviceConcentration)}).`,
      });
    }
  }

  // ---- Rule 4: 서비스 믹스 변화율 ----
  if (ctx.current.services.length >= 2 && ctx.lastMonth.totalRevenue > 0 && ctx.current.totalRevenue > 0) {
    for (const svc of ctx.current.services) {
      const currentShare = ctx.current.totalRevenue > 0
        ? svc.revenue / ctx.current.totalRevenue
        : 0;
      const lastSvc = ctx.lastMonth.services.find((s) => s.serviceType === svc.serviceType);
      const lastShare = lastSvc && ctx.lastMonth.totalRevenue > 0
        ? lastSvc.revenue / ctx.lastMonth.totalRevenue
        : 0;
      const shareDelta = Math.abs(currentShare - lastShare);

      if (shareDelta > 0.15) {
        const direction = currentShare > lastShare ? '증가' : '감소';
        insights.push({
          level: 'info',
          message: `${serviceLabel(svc.serviceType)} 비중이 전월 대비 ${pct(shareDelta)} ${direction}했습니다.`,
        });
      }
    }
  }

  // ---- Assemble result ----
  const trimmed = insights.slice(0, MAX_INSIGHTS);
  const overallLevel = determineOverallLevel(trimmed);

  return {
    level: overallLevel,
    messages: trimmed.map((i) => i.message),
    insights: trimmed,
    metrics: {
      growthRate,
      serviceConcentration,
      synergyScore,
    },
  };
}

// ---- Helpers ----

function safeGrowthRate(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / previous;
}

function pct(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

function serviceLabel(type: string): string {
  const labels: Record<string, string> = {
    cosmetics: 'K-Cosmetics',
  };
  return labels[type] || type;
}

function getServiceGrowth(ctx: StoreInsightContext, serviceType: string): number | null {
  const current = ctx.current.services.find((s) => s.serviceType === serviceType);
  const last = ctx.lastMonth.services.find((s) => s.serviceType === serviceType);
  if (!current || !last) return null;
  return safeGrowthRate(current.revenue, last.revenue);
}

/**
 * Synergy score: only meaningful for multi-service stores.
 * Returns null for single-service stores.
 * Score = number of growing services / total services (0..1).
 */
function computeSynergyScore(ctx: StoreInsightContext): number | null {
  if (ctx.current.services.length < 2) return null;

  let growingCount = 0;
  let measurableCount = 0;

  for (const svc of ctx.current.services) {
    const growth = getServiceGrowth(ctx, svc.serviceType);
    if (growth !== null) {
      measurableCount++;
      if (growth > 0) growingCount++;
    }
  }

  if (measurableCount === 0) return null;
  return growingCount / measurableCount;
}

/**
 * Max service revenue / total revenue.
 * Only meaningful for multi-service stores.
 */
function computeServiceConcentration(
  current: StoreInsightContext['current'],
): number | null {
  if (current.totalRevenue <= 0 || current.services.length < 2) return null;
  const maxRevenue = Math.max(...current.services.map((s) => s.revenue));
  return maxRevenue / current.totalRevenue;
}

function getDominantService(current: StoreInsightContext['current']): string {
  let max = 0;
  let dominant = '';
  for (const svc of current.services) {
    if (svc.revenue > max) {
      max = svc.revenue;
      dominant = svc.serviceType;
    }
  }
  return dominant;
}

function determineOverallLevel(insights: StoreInsight[]): InsightLevel {
  if (insights.some((i) => i.level === 'warning')) return 'warning';
  if (insights.some((i) => i.level === 'positive')) return 'positive';
  return 'info';
}

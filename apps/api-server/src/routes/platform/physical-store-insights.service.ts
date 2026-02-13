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
  const synergyScore = computeSynergyScore(ctx);
  if (synergyScore !== null) {
    const cosGrowth = getServiceGrowth(ctx, 'cosmetics');
    const glyGrowth = getServiceGrowth(ctx, 'glycopharm');
    const bothGrowing = cosGrowth !== null && cosGrowth > 0 && glyGrowth !== null && glyGrowth > 0;
    const bothDeclining = cosGrowth !== null && cosGrowth < 0 && glyGrowth !== null && glyGrowth < 0;

    if (bothGrowing) {
      insights.push({
        level: 'positive',
        message: `K-Cosmetics와 GlycoPharm 모두 성장 중입니다. 겸업 시너지가 나타나고 있습니다.`,
      });
    } else if (bothDeclining) {
      insights.push({
        level: 'warning',
        message: `K-Cosmetics와 GlycoPharm 모두 매출이 감소하고 있습니다.`,
      });
    } else {
      // One up, one down
      const growing = cosGrowth !== null && cosGrowth > 0 ? 'K-Cosmetics' : 'GlycoPharm';
      insights.push({
        level: 'info',
        message: `${growing} 매출이 증가하는 반면 다른 서비스는 감소 추세입니다.`,
      });
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
    glycopharm: 'GlycoPharm',
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

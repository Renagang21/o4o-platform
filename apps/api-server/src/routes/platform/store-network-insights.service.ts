/**
 * Store Network Insight Engine
 *
 * WO-O4O-STORE-NETWORK-AI-HYBRID-V1
 *
 * Pure computation — no DB access.
 * Takes current/last-month stats + top stores, produces scored insights.
 *
 * Rules:
 *  1. Monthly growth rate (revenue)
 *  2. Service-level growth comparison
 *  3. Revenue concentration index (top 3 stores)
 *  4. Order volume change
 */

import type { NetworkSummary, NetworkPeriodStats, TopStore } from './store-network.service.js';

type InsightLevel = 'positive' | 'warning' | 'info';

export interface NetworkInsight {
  level: InsightLevel;
  message: string;
}

export interface NetworkInsightsResult {
  level: InsightLevel;
  messages: string[];
  insights: NetworkInsight[];
  metrics: {
    growthRate: number | null;
    orderGrowthRate: number | null;
    concentrationIndex: number | null;
  };
}

interface InsightContext {
  current: NetworkSummary;
  lastMonth: NetworkPeriodStats;
  topStores: TopStore[];
}

const MAX_INSIGHTS = 5;

export function generateNetworkInsights(ctx: InsightContext): NetworkInsightsResult {
  const insights: NetworkInsight[] = [];

  // ---- 1. Revenue growth rate ----
  const growthRate = safeGrowthRate(ctx.current.monthlyRevenue, ctx.lastMonth.totalRevenue);
  if (growthRate !== null) {
    if (growthRate > 0.15) {
      insights.push({
        level: 'positive',
        message: `이번 달 네트워크 매출이 ${pct(growthRate)} 증가했습니다.`,
      });
    } else if (growthRate < -0.10) {
      insights.push({
        level: 'warning',
        message: `이번 달 네트워크 매출이 ${pct(Math.abs(growthRate))} 감소했습니다.`,
      });
    } else {
      insights.push({
        level: 'info',
        message: `이번 달 네트워크 매출 변동률: ${growthRate >= 0 ? '+' : ''}${pct(growthRate)}.`,
      });
    }
  }

  // ---- 2. Order volume change ----
  const orderGrowthRate = safeGrowthRate(ctx.current.monthlyOrders, ctx.lastMonth.totalOrders);
  if (orderGrowthRate !== null && Math.abs(orderGrowthRate) > 0.1) {
    if (orderGrowthRate > 0) {
      insights.push({
        level: 'positive',
        message: `주문 건수가 전월 대비 ${pct(orderGrowthRate)} 증가했습니다.`,
      });
    } else {
      insights.push({
        level: 'warning',
        message: `주문 건수가 전월 대비 ${pct(Math.abs(orderGrowthRate))} 감소했습니다.`,
      });
    }
  }

  // ---- 3. Service-level growth comparison ----
  const serviceGrowths = ctx.current.serviceBreakdown.map((svc) => {
    const lastSvc = ctx.lastMonth.serviceBreakdown.find((s) => s.serviceType === svc.serviceType);
    return {
      serviceType: svc.serviceType,
      growth: safeGrowthRate(svc.monthlyRevenue, lastSvc?.revenue ?? 0),
    };
  });

  const activeGrowths = serviceGrowths.filter((s) => s.growth !== null);
  if (activeGrowths.length >= 2) {
    const best = activeGrowths.reduce((a, b) => ((a.growth ?? 0) > (b.growth ?? 0) ? a : b));
    if (best.growth !== null && best.growth > 0) {
      const label = serviceLabel(best.serviceType);
      insights.push({
        level: 'info',
        message: `${label} 서비스의 성장률(${best.growth >= 0 ? '+' : ''}${pct(best.growth)})이 가장 높습니다.`,
      });
    }
  }

  // ---- 4. Revenue concentration index (top 3) ----
  const concentrationIndex = computeConcentrationIndex(ctx.topStores, ctx.current.monthlyRevenue);
  if (concentrationIndex !== null) {
    if (concentrationIndex > 0.6) {
      insights.push({
        level: 'warning',
        message: `상위 3개 매장이 전체 매출의 ${pct(concentrationIndex)}를 차지합니다. 매출 집중도가 높습니다.`,
      });
    } else if (concentrationIndex < 0.4) {
      insights.push({
        level: 'positive',
        message: `매출이 매장별로 고르게 분산되어 있습니다 (상위 3개 매장 비중: ${pct(concentrationIndex)}).`,
      });
    } else {
      insights.push({
        level: 'info',
        message: `상위 3개 매장의 매출 비중: ${pct(concentrationIndex)}.`,
      });
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
      orderGrowthRate,
      concentrationIndex,
    },
  };
}

// ---- Helpers ----

function safeGrowthRate(current: number, previous: number): number | null {
  if (previous === 0) {
    return current > 0 ? null : null; // Can't compute rate from zero base
  }
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

function computeConcentrationIndex(topStores: TopStore[], totalRevenue: number): number | null {
  if (totalRevenue <= 0 || topStores.length === 0) return null;
  const top3Revenue = topStores
    .slice(0, 3)
    .reduce((sum, s) => sum + s.monthlyRevenue, 0);
  return top3Revenue / totalRevenue;
}

function determineOverallLevel(insights: NetworkInsight[]): InsightLevel {
  if (insights.some((i) => i.level === 'warning')) return 'warning';
  if (insights.some((i) => i.level === 'positive')) return 'positive';
  return 'info';
}

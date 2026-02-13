/**
 * O4O Store Core - Insights Engine
 *
 * WO-O4O-STORE-TEMPLATE-V1_1-EXTRACTION
 *
 * Rule-based insights framework with pluggable rules.
 * Provides DEFAULT_INSIGHT_RULES extracted from K-Cosmetics Phase 5.
 *
 * Services can use default rules as-is or compose custom rule sets:
 *   new StoreInsightsEngine([...DEFAULT_INSIGHT_RULES, myCustomRule])
 */

import type {
  InsightRule,
  InsightRuleContext,
  StoreInsight,
  StoreInsightsResult,
  InsightLevel,
} from './types.js';

// ============================================================================
// Engine
// ============================================================================

export class StoreInsightsEngine {
  constructor(private rules: InsightRule[]) {}

  /**
   * Apply all rules to the given context and return aggregated results.
   */
  generate(ctx: InsightRuleContext): StoreInsightsResult {
    const insights: StoreInsight[] = [];

    for (const rule of this.rules) {
      insights.push(...rule.apply(ctx));
    }

    const level = this.determineOverallLevel(insights);

    return {
      level,
      messages: insights.map((i) => i.message),
      insights,
    };
  }

  private determineOverallLevel(insights: StoreInsight[]): InsightLevel {
    if (insights.some((i) => i.level === 'warning')) return 'warning';
    if (insights.some((i) => i.level === 'positive')) return 'positive';
    return 'info';
  }
}

// ============================================================================
// Default Rules (extracted from CosmeticsStoreInsightsService)
// ============================================================================

/**
 * Revenue rule: zero-revenue warning + month-over-month ±20% threshold.
 */
export const revenueRule: InsightRule = {
  name: 'revenue',
  apply(ctx) {
    const insights: StoreInsight[] = [];
    const { monthlyRevenue } = ctx.summary.stats;

    if (monthlyRevenue === 0) {
      insights.push({
        level: 'warning',
        message: '이번 달 매출이 아직 발생하지 않았습니다.',
      });
      return insights;
    }

    if (ctx.lastMonthRevenue > 0) {
      const growthRate = (monthlyRevenue - ctx.lastMonthRevenue) / ctx.lastMonthRevenue;

      if (growthRate >= 0.2) {
        insights.push({
          level: 'positive',
          message: `이번 달 매출이 전월 대비 ${Math.round(growthRate * 100)}% 증가했습니다.`,
        });
      } else if (growthRate <= -0.2) {
        insights.push({
          level: 'warning',
          message: `이번 달 매출이 전월 대비 ${Math.round(Math.abs(growthRate) * 100)}% 감소했습니다.`,
        });
      }
    }

    return insights;
  },
};

/**
 * Channel rule: travel >60% or local >80% notifications.
 */
export const channelRule: InsightRule = {
  name: 'channel',
  apply(ctx) {
    const insights: StoreInsight[] = [];
    const { channelBreakdown } = ctx.summary;
    if (channelBreakdown.length === 0) return insights;

    const totalRevenue = channelBreakdown.reduce((sum, ch) => sum + ch.revenue, 0);
    if (totalRevenue === 0) return insights;

    const travelChannel = channelBreakdown.find((ch) => ch.channel === 'travel');
    const localChannel = channelBreakdown.find((ch) => ch.channel === 'local');

    if (travelChannel && travelChannel.revenue / totalRevenue > 0.6) {
      insights.push({
        level: 'info',
        message: '관광객 매출 비중이 높습니다. 관광 시즌 프로모션을 활용해보세요.',
      });
    }

    if (localChannel && localChannel.revenue / totalRevenue > 0.8) {
      insights.push({
        level: 'info',
        message: '지역 고객 중심 매출 구조입니다. 단골 프로그램을 고려해보세요.',
      });
    }

    return insights;
  },
};

/**
 * Product rule: concentration >50%, diversity <3, best seller callout.
 */
export const productRule: InsightRule = {
  name: 'product',
  apply(ctx) {
    const insights: StoreInsight[] = [];
    const { topProducts } = ctx.summary;
    if (topProducts.length === 0) return insights;

    const totalRevenue = topProducts.reduce((sum, p) => sum + p.revenue, 0);
    if (totalRevenue === 0) return insights;

    const topProduct = topProducts[0];

    // Concentration check
    if (topProduct.revenue / totalRevenue > 0.5) {
      insights.push({
        level: 'warning',
        message: `"${topProduct.productName}" 상품에 매출이 집중되고 있습니다. 상품 다양화를 고려해보세요.`,
      });
    }

    // Low diversity
    if (topProducts.length < 3 && ctx.summary.stats.monthlyOrders > 0) {
      insights.push({
        level: 'info',
        message: '판매 상품 수가 적습니다. 추가 상품 등록을 고려해보세요.',
      });
    }

    // Best seller callout
    if (topProducts.length > 0 && topProduct.quantity > 0) {
      insights.push({
        level: 'positive',
        message: `이번 달 베스트셀러: "${topProduct.productName}" (${topProduct.quantity}개 판매)`,
      });
    }

    return insights;
  },
};

/**
 * Activity rule: no orders today (with monthly revenue) / today order count.
 */
export const activityRule: InsightRule = {
  name: 'activity',
  apply(ctx) {
    const insights: StoreInsight[] = [];
    const { todayOrders, monthlyRevenue } = ctx.summary.stats;

    if (todayOrders === 0 && monthlyRevenue > 0) {
      insights.push({
        level: 'info',
        message: '오늘 아직 주문이 없습니다. 프로모션을 고려해보세요.',
      });
    }

    if (todayOrders > 0) {
      insights.push({
        level: 'positive',
        message: `오늘 ${todayOrders}건의 주문이 접수되었습니다.`,
      });
    }

    return insights;
  },
};

/**
 * Default rule set — use as-is or extend with service-specific rules.
 */
export const DEFAULT_INSIGHT_RULES: InsightRule[] = [
  revenueRule,
  channelRule,
  productRule,
  activityRule,
];

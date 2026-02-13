/**
 * Cosmetics Store Insights Service
 *
 * WO-KCOS-STORES-PHASE5-AI-INSIGHTS-V1
 * Rule-based insights engine for store cockpit
 *
 * Analyzes KPI data and generates actionable messages.
 * Designed for future LLM extension (Phase 6+).
 */

import { DataSource } from 'typeorm';
import {
  CosmeticsStoreSummaryService,
  type StoreSummary,
} from './cosmetics-store-summary.service.js';

export interface StoreInsight {
  level: 'info' | 'warning' | 'positive';
  message: string;
}

export interface StoreInsightsResult {
  level: 'info' | 'warning' | 'positive';
  messages: string[];
  insights: StoreInsight[];
}

export class CosmeticsStoreInsightsService {
  private summaryService: CosmeticsStoreSummaryService;

  constructor(private dataSource: DataSource) {
    this.summaryService = new CosmeticsStoreSummaryService(dataSource);
  }

  async generateInsights(storeId: string): Promise<StoreInsightsResult> {
    const summary = await this.summaryService.getStoreSummary(storeId);
    const lastMonthRevenue = await this.getLastMonthRevenue(storeId);

    const insights: StoreInsight[] = [];

    // Apply rules
    this.applyRevenueRules(summary, lastMonthRevenue, insights);
    this.applyChannelRules(summary, insights);
    this.applyProductRules(summary, insights);
    this.applyActivityRules(summary, insights);

    // Determine overall level
    const level = this.determineOverallLevel(insights);

    return {
      level,
      messages: insights.map(i => i.message),
      insights,
    };
  }

  // ===========================================================================
  // Revenue Rules
  // ===========================================================================

  private applyRevenueRules(
    summary: StoreSummary,
    lastMonthRevenue: number,
    insights: StoreInsight[],
  ): void {
    const { monthlyRevenue } = summary.stats;

    if (monthlyRevenue === 0) {
      insights.push({
        level: 'warning',
        message: '이번 달 매출이 아직 발생하지 않았습니다.',
      });
      return;
    }

    // Month-over-month comparison
    if (lastMonthRevenue > 0) {
      const growthRate = (monthlyRevenue - lastMonthRevenue) / lastMonthRevenue;

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
  }

  // ===========================================================================
  // Channel Rules
  // ===========================================================================

  private applyChannelRules(summary: StoreSummary, insights: StoreInsight[]): void {
    const { channelBreakdown } = summary;
    if (channelBreakdown.length === 0) return;

    const totalRevenue = channelBreakdown.reduce((sum, ch) => sum + ch.revenue, 0);
    if (totalRevenue === 0) return;

    const travelChannel = channelBreakdown.find(ch => ch.channel === 'travel');
    const localChannel = channelBreakdown.find(ch => ch.channel === 'local');

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
  }

  // ===========================================================================
  // Product Rules
  // ===========================================================================

  private applyProductRules(summary: StoreSummary, insights: StoreInsight[]): void {
    const { topProducts } = summary;
    if (topProducts.length === 0) return;

    const totalRevenue = topProducts.reduce((sum, p) => sum + p.revenue, 0);
    if (totalRevenue === 0) return;

    // Concentration check: top product > 50% of revenue
    const topProduct = topProducts[0];
    if (topProduct.revenue / totalRevenue > 0.5) {
      insights.push({
        level: 'warning',
        message: `"${topProduct.productName}" 상품에 매출이 집중되고 있습니다. 상품 다양화를 고려해보세요.`,
      });
    }

    // Low diversity
    if (topProducts.length < 3 && summary.stats.monthlyOrders > 0) {
      insights.push({
        level: 'info',
        message: '판매 상품 수가 적습니다. 추가 상품 등록을 고려해보세요.',
      });
    }

    // Best seller callout (positive)
    if (topProducts.length > 0 && topProduct.quantity > 0) {
      insights.push({
        level: 'positive',
        message: `이번 달 베스트셀러: "${topProduct.productName}" (${topProduct.quantity}개 판매)`,
      });
    }
  }

  // ===========================================================================
  // Activity Rules
  // ===========================================================================

  private applyActivityRules(summary: StoreSummary, insights: StoreInsight[]): void {
    const { todayOrders, monthlyRevenue } = summary.stats;

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
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  private determineOverallLevel(insights: StoreInsight[]): 'info' | 'warning' | 'positive' {
    if (insights.some(i => i.level === 'warning')) return 'warning';
    if (insights.some(i => i.level === 'positive')) return 'positive';
    return 'info';
  }

  private async getLastMonthRevenue(storeId: string): Promise<number> {
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const result = await this.dataSource.query(
      `SELECT COALESCE(SUM("totalAmount"), 0)::numeric as revenue
       FROM ecommerce_orders
       WHERE store_id = $1
         AND "createdAt" >= $2
         AND "createdAt" < $3
         AND status != 'cancelled'`,
      [storeId, lastMonthStart.toISOString(), thisMonthStart.toISOString()],
    );

    return Number(result[0]?.revenue || 0);
  }
}

/**
 * O4O Store Core - Common Types
 *
 * WO-O4O-STORE-TEMPLATE-V1_1-EXTRACTION
 *
 * Shared type definitions for all O4O store services.
 * Extracted from K-Cosmetics Phase 3~5 implementation.
 */

// ============================================================================
// KPI Summary Types
// ============================================================================

export interface StoreSummaryStats {
  todayOrders: number;
  todayRevenue: number;
  monthlyRevenue: number;
  monthlyOrders: number;
  totalOrders: number;
}

export interface ChannelBreakdown {
  channel: string;
  orderCount: number;
  revenue: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  quantity: number;
  revenue: number;
}

export interface RecentOrder {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  channel: string | null;
  createdAt: string;
}

export interface StoreSummary {
  stats: StoreSummaryStats;
  channelBreakdown: ChannelBreakdown[];
  topProducts: TopProduct[];
  recentOrders: RecentOrder[];
}

// ============================================================================
// Insight Types
// ============================================================================

export type InsightLevel = 'info' | 'warning' | 'positive';

export interface StoreInsight {
  level: InsightLevel;
  message: string;
}

export interface StoreInsightsResult {
  level: InsightLevel;
  messages: string[];
  insights: StoreInsight[];
}

export interface InsightRuleContext {
  summary: StoreSummary;
  lastMonthRevenue: number;
}

export interface InsightRule {
  name: string;
  apply(ctx: InsightRuleContext): StoreInsight[];
}

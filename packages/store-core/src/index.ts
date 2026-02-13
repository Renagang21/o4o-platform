/**
 * @o4o/store-core
 *
 * O4O Store Template Core — KPI Summary & Insights engines.
 * WO-O4O-STORE-TEMPLATE-V1_1-EXTRACTION
 *
 * Pure TypeScript package (no DB, no entities).
 * Services implement StoreDataAdapter to provide data to shared engines.
 */

// Types
export type {
  StoreSummaryStats,
  ChannelBreakdown,
  TopProduct,
  RecentOrder,
  StoreSummary,
  InsightLevel,
  StoreInsight,
  StoreInsightsResult,
  InsightRule,
  InsightRuleContext,
} from './types.js';

// Adapter
export type { StoreDataAdapter } from './store-data.adapter.js';

// Engines
export { StoreSummaryEngine } from './summary.engine.js';
export {
  StoreInsightsEngine,
  DEFAULT_INSIGHT_RULES,
  revenueRule,
  channelRule,
  productRule,
  activityRule,
} from './insights.engine.js';

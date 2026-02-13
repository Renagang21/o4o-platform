/**
 * Cosmetics Store Insights Service
 *
 * WO-KCOS-STORES-PHASE5-AI-INSIGHTS-V1
 * WO-O4O-STORE-TEMPLATE-V1_1-EXTRACTION (refactored to use store-core)
 *
 * Uses StoreInsightsEngine from @o4o/store-core with DEFAULT_INSIGHT_RULES.
 * Extend with custom rules: [...DEFAULT_INSIGHT_RULES, myCustomRule]
 */

import { DataSource } from 'typeorm';
import {
  StoreInsightsEngine,
  StoreSummaryEngine,
  DEFAULT_INSIGHT_RULES,
  type StoreInsightsResult,
} from '@o4o/store-core';
import { CosmeticsStoreDataAdapter } from './cosmetics-store-summary.service.js';

// Re-export types for backward compatibility
export type { StoreInsight, StoreInsightsResult } from '@o4o/store-core';

export class CosmeticsStoreInsightsService {
  private adapter: CosmeticsStoreDataAdapter;
  private summaryEngine: StoreSummaryEngine;
  private insightsEngine: StoreInsightsEngine;

  constructor(dataSource: DataSource) {
    this.adapter = new CosmeticsStoreDataAdapter(dataSource);
    this.summaryEngine = new StoreSummaryEngine(this.adapter);
    this.insightsEngine = new StoreInsightsEngine(DEFAULT_INSIGHT_RULES);
  }

  async generateInsights(storeId: string): Promise<StoreInsightsResult> {
    const [summary, lastMonthRevenue] = await Promise.all([
      this.summaryEngine.getSummary(storeId),
      this.summaryEngine.getLastMonthRevenue(storeId),
    ]);

    return this.insightsEngine.generate({ summary, lastMonthRevenue });
  }
}

/**
 * K-Cosmetics Operator Dashboard Config Builder
 *
 * WO-O4O-OPERATOR-DASHBOARD-DATA-NORMALIZATION-V1:
 *   API returns OperatorDashboardConfig (5-block) shape directly from the backend.
 *   This file provides a pass-through with empty-state fallback,
 *   following the Neture operatorConfig.ts pattern.
 */

import type { OperatorDashboardConfig } from '@o4o/operator-ux-core';

/**
 * Build dashboard config from API response.
 * API returns the 5-block shape directly, so this is a pass-through
 * with defaults for any missing fields.
 */
export function buildKCosmeticsOperatorConfig(
  data: OperatorDashboardConfig | null,
): OperatorDashboardConfig {
  if (!data) {
    return {
      kpis: [],
      aiSummary: [],
      actionQueue: [],
      activityLog: [],
      quickActions: [],
    };
  }

  return {
    kpis: data.kpis ?? [],
    aiSummary: data.aiSummary ?? [],
    actionQueue: data.actionQueue ?? [],
    activityLog: data.activityLog ?? [],
    quickActions: data.quickActions ?? [],
  };
}

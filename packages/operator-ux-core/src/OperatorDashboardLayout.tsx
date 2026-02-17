/**
 * OperatorDashboardLayout — 5-Block 통합 Operator 대시보드 골격
 *
 * WO-O4O-OPERATOR-UX-CORE-SCAFFOLD-V1
 *
 * 서비스는 OperatorDashboardConfig만 주입하면 동일한 구조의 대시보드를 렌더링한다.
 * Block 순서는 고정: KPI → AI → Action → Activity → Quick Actions
 */

import type { OperatorDashboardConfig } from './types';
import { KpiGrid } from './blocks/KpiGrid';
import { AiSummaryBlock } from './blocks/AiSummaryBlock';
import { ActionQueueBlock } from './blocks/ActionQueueBlock';
import { ActivityLogBlock } from './blocks/ActivityLogBlock';
import { QuickActionBlock } from './blocks/QuickActionBlock';

export function OperatorDashboardLayout({
  config,
}: {
  config: OperatorDashboardConfig;
}) {
  return (
    <div className="space-y-6">
      <KpiGrid items={config.kpis} />
      <AiSummaryBlock items={config.aiSummary ?? []} />
      <ActionQueueBlock items={config.actionQueue} />
      <ActivityLogBlock items={config.activityLog} />
      <QuickActionBlock items={config.quickActions} />
    </div>
  );
}

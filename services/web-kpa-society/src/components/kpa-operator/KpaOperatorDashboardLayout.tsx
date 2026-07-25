/**
 * KpaOperatorDashboardLayout — KPA 전용 5-Block composer
 *
 * 공통 block component와 OperatorDashboardConfig 계약은 그대로 재사용하고,
 * KPA 운영 우선순위에 맞춰 순서와 빈 상태 노출만 조정한다.
 */

import type { ReactNode } from 'react';
import {
  ActionQueueBlock,
  ActivityLogBlock,
  AiSummaryBlock,
  KpiGrid,
  QuickActionBlock,
  type OperatorDashboardConfig,
} from '@o4o/operator-ux-core';

interface KpaOperatorDashboardLayoutProps {
  config: OperatorDashboardConfig;
  auxiliary?: ReactNode;
}

export default function KpaOperatorDashboardLayout({
  config,
  auxiliary,
}: KpaOperatorDashboardLayoutProps) {
  const hasActions = config.actionQueue.length > 0;
  const hasAiSummary = (config.aiSummary?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      {hasActions && <ActionQueueBlock items={config.actionQueue} />}
      <KpiGrid items={config.kpis} />
      <QuickActionBlock items={config.quickActions} />
      {hasAiSummary && <AiSummaryBlock items={config.aiSummary ?? []} />}
      <ActivityLogBlock items={config.activityLog} />
      {auxiliary}
    </div>
  );
}

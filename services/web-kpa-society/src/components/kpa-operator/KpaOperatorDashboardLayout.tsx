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
  /**
   * WO-O4O-CROSSSERVICE-OPERATOR-DASHBOARD-UI-PARITY-FINALIZE-V1:
   *   부가 섹션을 5-Block **위**에 배치하는 slot. GlycoPharm·K-Cosmetics 가 사용하는
   *   공통 layout 의 `aboveBlocks` 와 같은 위치·같은 순서 컨벤션([안내 카드] → [Axis] → [5-Block]).
   *   기존 `auxiliary`(5-Block 아래) 는 세 서비스 배치 parity 를 깨뜨려 대체했다.
   */
  aboveBlocks?: ReactNode;
}

export default function KpaOperatorDashboardLayout({
  config,
  aboveBlocks,
}: KpaOperatorDashboardLayoutProps) {
  const hasActions = config.actionQueue.length > 0;
  const hasAiSummary = (config.aiSummary?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      {aboveBlocks}
      {hasActions && <ActionQueueBlock items={config.actionQueue} />}
      <KpiGrid items={config.kpis} />
      <QuickActionBlock items={config.quickActions} />
      {hasAiSummary && <AiSummaryBlock items={config.aiSummary ?? []} />}
      <ActivityLogBlock items={config.activityLog} />
    </div>
  );
}

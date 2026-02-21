/**
 * AdminDashboardLayout — 4-Block 통합 Admin 대시보드 골격
 *
 * WO-O4O-ADMIN-UX-CORE-DESIGN-V1
 *
 * 서비스는 AdminDashboardConfig만 주입하면 동일한 구조의 대시보드를 렌더링한다.
 * Block 순서는 고정: Structure Snapshot → Policy Overview → Governance Alerts → Structure Actions
 *
 * Admin 철학: "구조 정의자" — Operator의 상태 관리와 완전 분리.
 */

import type { AdminDashboardConfig } from './types';
import { StructureSnapshotBlock } from './blocks/StructureSnapshotBlock';
import { PolicyOverviewBlock } from './blocks/PolicyOverviewBlock';
import { GovernanceAlertBlock } from './blocks/GovernanceAlertBlock';
import { StructureActionBlock } from './blocks/StructureActionBlock';

export function AdminDashboardLayout({
  config,
}: {
  config: AdminDashboardConfig;
}) {
  return (
    <div className="space-y-6">
      <StructureSnapshotBlock items={config.structureMetrics} />
      <PolicyOverviewBlock items={config.policies} />
      <GovernanceAlertBlock items={config.governanceAlerts} />
      <StructureActionBlock items={config.structureActions} />
    </div>
  );
}

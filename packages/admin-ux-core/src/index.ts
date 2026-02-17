/**
 * @o4o/admin-ux-core
 *
 * 4-Block Unified Admin Dashboard
 * WO-O4O-ADMIN-UX-CORE-DESIGN-V1
 *
 * Admin = 구조 정의자. Operator UX와 완전 분리.
 * Block A: Structure Snapshot → Block B: Policy Overview →
 * Block C: Governance Alerts → Block D: Structure Actions
 */

// Types
export type {
  StructureMetric,
  PolicyItem,
  GovernanceAlert,
  StructureAction,
  AdminDashboardConfig,
} from './types';

// Layout
export { AdminDashboardLayout } from './AdminDashboardLayout';

// Blocks (개별 사용 가능)
export { StructureSnapshotBlock } from './blocks/StructureSnapshotBlock';
export { PolicyOverviewBlock } from './blocks/PolicyOverviewBlock';
export { GovernanceAlertBlock } from './blocks/GovernanceAlertBlock';
export { StructureActionBlock } from './blocks/StructureActionBlock';

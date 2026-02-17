/**
 * @o4o/operator-ux-core
 *
 * 5-Block Unified Operator Dashboard
 * WO-O4O-OPERATOR-UX-CORE-SCAFFOLD-V1
 */

// Types
export type {
  KpiItem,
  AiSummaryItem,
  ActionItem,
  ActivityItem,
  QuickActionItem,
  OperatorDashboardConfig,
} from './types';

// Layout
export { OperatorDashboardLayout } from './OperatorDashboardLayout';

// Blocks (개별 사용 가능)
export { KpiGrid } from './blocks/KpiGrid';
export { AiSummaryBlock } from './blocks/AiSummaryBlock';
export { ActionQueueBlock } from './blocks/ActionQueueBlock';
export { ActivityLogBlock } from './blocks/ActivityLogBlock';
export { QuickActionBlock } from './blocks/QuickActionBlock';

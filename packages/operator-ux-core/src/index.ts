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
  ActionQueueItem,
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

// List Module (WO-O4O-LIST-BASE-MODULE-V1)
export * from './list/index';

// Member List Module (WO-O4O-MEMBER-LIST-STANDARDIZATION-V1)
export * from './member-list/index';

// Form Module (WO-O4O-FORM-PRIMITIVES-EXTRACTION-V1)
export * from './form/index';

// Service Config (WO-O4O-SERVICE-CONFIG-INTRODUCTION-V1)
export type { ServiceKey, ServiceConfig, ServiceTemplateKey } from './config/index.js';
export { kpaConfig, glycopharmConfig, kcosmeticsConfig, serviceConfigMap } from './config/index.js';
export { useServiceConfig } from './hooks/useServiceConfig.js';

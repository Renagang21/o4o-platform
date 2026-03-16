/**
 * Operator Dashboard 5-Block Types
 *
 * WO-O4O-OPERATOR-DASHBOARD-TYPE-CONSOLIDATION-V1
 *
 * Single source of truth for backend operator dashboard response types.
 * Mirrors @o4o/operator-ux-core OperatorDashboardConfig (frontend).
 */

export interface KpiItem {
  key: string;
  label: string;
  value: number | string;
  delta?: number;
  status?: 'neutral' | 'warning' | 'critical';
  link?: string;
}

export interface AiSummaryItem {
  id: string;
  message: string;
  level: 'info' | 'warning' | 'critical';
  link?: string;
}

export interface ActionItem {
  id: string;
  label: string;
  count: number;
  link: string;
}

export interface ActivityItem {
  id: string;
  message: string;
  timestamp: string;
}

export interface QuickActionItem {
  id: string;
  label: string;
  link: string;
  icon?: string;
}

export interface OperatorDashboardConfig {
  kpis: KpiItem[];
  aiSummary?: AiSummaryItem[];
  actionQueue: ActionItem[];
  activityLog: ActivityItem[];
  quickActions: QuickActionItem[];
}

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

/** Enhanced Action Queue Item (WO-O4O-OPERATOR-ACTION-LAYER-V1) */
export interface ActionQueueItem extends ActionItem {
  source?: 'SYSTEM' | 'AI';
  type?: string;
  title?: string;
  description?: string;
  priority?: 'high' | 'medium' | 'low';
  oldestAt?: string | null;
  confidence?: number;
  actionType?: 'EXECUTE' | 'NAVIGATE';
  actionApi?: string;
  actionMethod?: string;
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

export interface OperatorAlertItem {
  id: string;
  type: 'network' | 'commerce' | 'care' | 'system';
  level: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
}

export interface OperatorDashboardConfig {
  kpis: KpiItem[];
  aiSummary?: AiSummaryItem[];
  operatorAlerts?: OperatorAlertItem[];
  actionQueue: ActionItem[];
  activityLog: ActivityItem[];
  quickActions: QuickActionItem[];
}

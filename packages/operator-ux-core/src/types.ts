/**
 * Operator UX Core — 5-Block Unified Dashboard Types
 *
 * WO-O4O-OPERATOR-UX-CORE-SCAFFOLD-V1
 *
 * 서비스는 이 인터페이스만 구현하면 통합 대시보드를 렌더링할 수 있다.
 * 각 Block은 서비스 중립적이며, 데이터만 주입하면 동작한다.
 */

// ─── Block 1: KPI Grid ───

export interface KpiItem {
  key: string;
  label: string;
  value: number | string;
  /** 전월 대비 변동 (양수=증가, 음수=감소) */
  delta?: number;
  status?: 'neutral' | 'warning' | 'critical';
}

// ─── Block 2: AI Summary ───

export interface AiSummaryItem {
  id: string;
  message: string;
  level: 'info' | 'warning' | 'critical';
  /** 상세 화면 링크 */
  link?: string;
}

// ─── Block 3: Action Queue ───

export interface ActionItem {
  id: string;
  label: string;
  count: number;
  /** 해당 리스트로 이동하는 링크 */
  link: string;
}

// ─── Block 4: Activity Log ───

export interface ActivityItem {
  id: string;
  message: string;
  /** ISO 8601 timestamp */
  timestamp: string;
}

// ─── Block 5: Quick Actions ───

export interface QuickActionItem {
  id: string;
  label: string;
  link: string;
  icon?: string;
}

// ─── Dashboard Config (서비스가 제공하는 단일 인터페이스) ───

export interface OperatorDashboardConfig {
  kpis: KpiItem[];
  aiSummary?: AiSummaryItem[];
  actionQueue: ActionItem[];
  activityLog: ActivityItem[];
  quickActions: QuickActionItem[];
}

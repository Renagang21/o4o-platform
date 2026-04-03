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
  /** 클릭 시 이동할 링크 (없으면 클릭 불가) */
  link?: string;
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

/** Enhanced Action Queue Item (WO-O4O-OPERATOR-ACTION-LAYER-V1) — 기존 ActionItem 하위호환 */
export interface ActionQueueItem extends ActionItem {
  source?: 'SYSTEM' | 'AI';
  type?: string;
  title?: string;
  description?: string;
  priority?: 'high' | 'medium' | 'low';
  oldestAt?: string | null;
  confidence?: number;
  actionType?: 'EXECUTE' | 'NAVIGATE';
  actionUrl?: string;
  actionLabel?: string;
  actionApi?: string;
  actionMethod?: string;
  /** handler 등록 여부 — EXECUTE 버튼 활성화 판단 (WO-O4O-ACTION-EXECUTION-LAYER-V1) */
  canExecute?: boolean;
}

// ─── Block 4: Activity Log ───

export interface ActivityItem {
  id: string;
  message: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** 클릭 시 상세 페이지 이동 (없으면 텍스트만 표시) */
  link?: string;
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

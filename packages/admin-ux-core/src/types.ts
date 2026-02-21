/**
 * @o4o/admin-ux-core — Admin Dashboard Types
 *
 * Admin 4-Block 구조 타입 정의.
 * Operator UX와 완전 분리된 Admin 전용 인터페이스.
 *
 * Block A: Structure Snapshot — 구조 상태 지표
 * Block B: Policy Overview — 정책 현황
 * Block C: Governance Alerts — 거버넌스 경고
 * Block D: Quick Structure Actions — 구조 변경 진입점
 */

// ─── Block A: Structure Snapshot ───

export interface StructureMetric {
  /** Unique key for this metric */
  key: string;
  /** Display label */
  label: string;
  /** Current value */
  value: number | string;
  /** Optional previous value for delta display */
  previousValue?: number;
  /** Semantic status */
  status?: 'stable' | 'attention' | 'critical';
}

// ─── Block B: Policy Overview ───

export interface PolicyItem {
  /** Unique key */
  key: string;
  /** Policy name */
  label: string;
  /** Current status: configured / not_configured / partial */
  status: 'configured' | 'not_configured' | 'partial';
  /** Optional version string */
  version?: string;
  /** Link to policy management page */
  link?: string;
}

// ─── Block C: Governance Alerts ───

export interface GovernanceAlert {
  /** Unique ID */
  id: string;
  /** Alert message */
  message: string;
  /** Severity level */
  level: 'info' | 'warning' | 'critical';
  /** Link to resolve */
  link?: string;
}

// ─── Block D: Quick Structure Actions ───

export interface StructureAction {
  /** Unique ID */
  id: string;
  /** Action label */
  label: string;
  /** Route link */
  link: string;
  /** Optional icon (emoji or string) */
  icon?: string;
  /** Optional description */
  description?: string;
}

// ─── Dashboard Config ───

export interface AdminDashboardConfig {
  /** Block A: Structure Snapshot metrics */
  structureMetrics: StructureMetric[];
  /** Block B: Policy overview items */
  policies: PolicyItem[];
  /** Block C: Governance alerts */
  governanceAlerts: GovernanceAlert[];
  /** Block D: Quick structure actions */
  structureActions: StructureAction[];
}

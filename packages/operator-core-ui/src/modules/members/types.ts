/**
 * Operator Members Console — Types
 *
 * WO-O4O-OPERATOR-MEMBERS-LIST-COMMONIZATION-V1
 *
 * Neture / GP / K-Cos 3 service 의 Operator Members list-side 공통 wrapper 의 타입.
 * IR: docs/investigations/IR-O4O-OPERATOR-MEMBERS-LIST-COMMONIZATION-DESIGN-V1.md (Option C).
 *
 * KPA 는 KpaMember entity 기반으로 별도 페이지 유지 — 본 wrapper 범위 외.
 */

import type { ReactNode } from 'react';
import type { ListColumnDef } from '@o4o/operator-ux-core';

// ─── Entity ──────────────────────────────────────────────────

export interface MembershipData {
  id: string;
  serviceKey: string;
  status: string;
  role: string;
  createdAt: string;
}

export interface UserData {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  nickname?: string;
  phone?: string;
  company?: string;
  status: string;
  roles?: string[];
  role?: string;
  memberships?: MembershipData[];
  createdAt: string;
  updatedAt?: string;
}

export interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Client (Service-side API adapter) ───────────────────────

export interface MembersConsoleListParams {
  page: number;
  limit: number;
  status?: string;
  search?: string;
}

export interface MembersConsoleListResponse {
  users: UserData[];
  pagination: PaginationData;
}

export interface MembersConsoleStatsResponse {
  statistics?: {
    total?: number;
    byStatus?: Array<{ status: string; count: number }>;
  };
}

/**
 * Service-side API client adapter. Each service (Neture / GP / K-Cos) provides
 * its own client conforming to this interface. Wrapper calls these methods.
 *
 * Neture 의 registration approve/reject flow 는 `updateStatus` 와 `batchUpdateStatus`
 * 내부에서 endpoint 라우팅으로 흡수 (wrapper 는 currentStatus 만 전달).
 */
export interface MembersConsoleClient {
  list(params: MembersConsoleListParams): Promise<MembersConsoleListResponse>;
  /** Used for client-side role tab count calculation (limit=1000). */
  listAll(): Promise<{ users: UserData[] }>;
  stats(): Promise<MembersConsoleStatsResponse>;
  /**
   * Update user status. Pass currentStatus when calling from drawer so adapter
   * can detect pending→approved (registration endpoint vs membership endpoint).
   * `user` 는 Neture 처럼 status 변경 endpoint 에서 membership.id 가 필요한 경우
   * adapter 가 사용할 수 있도록 wrapper 가 전달 (User 외 service 는 무시 가능).
   */
  updateStatus(userId: string, status: string, currentStatus?: string, user?: UserData): Promise<void>;
  /** Batch approve/reject. */
  batchUpdateStatus(ids: string[], status: 'approved' | 'rejected'): Promise<any>;
  /** Update password (operator-as-user). */
  updatePassword(userId: string, password: string): Promise<void>;
}

// ─── Tabs ────────────────────────────────────────────────────

/**
 * Service-specific role tab.
 * 'all' 과 'pending' 탭은 wrapper 가 자동 추가 — 본 배열에는 role-type 탭만.
 */
export interface MembersRoleTab {
  key: string;
  label: string;
  /** Role values to match against getPrimaryRole. */
  roleFilter: string[];
}

/**
 * Optional status tab. Passes `status` param to client.list().
 * Used by Neture UsersManagementPage to add active/suspended/rejected/withdrawn tabs.
 */
export interface MembersStatusTab {
  key: string;
  label: string;
  /** Status value passed to client.list({ status }) */
  status: string;
}

// ─── Slots / Renderers ────────────────────────────────────────

export interface EditModalRenderProps {
  user: UserData;
  onClose: () => void;
  onSuccess: () => void;
}

export interface DeleteFlowRenderProps {
  user: UserData;
  onClose: () => void;
  onDeleted: () => void;
}

// ─── Wrapper Props ───────────────────────────────────────────

export interface OperatorMembersConsolePageProps {
  /** Canonical service key (neture / glycopharm / k-cosmetics). */
  serviceKey: string;
  /** Service-side API client. */
  client: MembersConsoleClient;

  /** Header config. */
  title?: string;
  description?: string;

  /** Type tabs (excluding 'all' and 'pending' — wrapper auto-adds those). */
  roleTabs: MembersRoleTab[];

  /**
   * Optional status tabs. If provided, inserted between role tabs and 'pending' tab.
   * Each tab passes its `status` value to client.list().
   */
  statusTabs?: MembersStatusTab[];

  /**
   * Extract primary role for filtering & RoleBadge.
   * Default: memberships.find(m => m.serviceKey === serviceKey)?.role ?? roles[0] ?? role ?? 'user'.
   */
  getPrimaryRole?: (user: UserData) => string;

  /**
   * Role display mapping for RoleBadge.
   * Neture: { customer: 'consumer' }.
   */
  roleDisplayMap?: Record<string, string>;

  /**
   * Service-specific extra column. Inserted between role and createdAt.
   * Neture: dashboardAccess column.
   * @deprecated Prefer extraColumns[] for multi-column extension.
   */
  extraColumn?: ListColumnDef<UserData>;

  /**
   * Service-specific extra columns (plural). Merged with extraColumn when both provided.
   * Inserted between role and createdAt.
   */
  extraColumns?: ListColumnDef<UserData>[];

  /** Render service-specific drawer content sections (above footer link). */
  drawerExtraSections?: (user: UserData) => ReactNode;

  /**
   * Render the EditUserModal. Service brings its own modal until P3 commonization WO.
   * Required because every service has an edit flow.
   */
  renderEditModal: (props: EditModalRenderProps) => ReactNode;

  /**
   * Optional delete UX. If undefined, delete action is hidden.
   * Each service provides its own delete confirmation modal:
   *   - Neture: soft + hard choice modal
   *   - GP: DeleteRiskModal with risk check
   *   - K-Cos: simple confirm
   */
  renderDeleteFlow?: (props: DeleteFlowRenderProps) => ReactNode;

  /** DataTable tableId (for column persistence). Default: `{serviceKey}-operator-members`. */
  tableId?: string;
}

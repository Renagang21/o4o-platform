/**
 * Operator Members Console — Types
 *
 * WO-O4O-OPERATOR-MEMBERS-LIST-COMMONIZATION-V1
 *
 * Neture / GP / K-Cos 3 service 의 Operator Members list-side 공통 wrapper 의 타입.
 * IR: docs/investigations/IR-O4O-OPERATOR-MEMBERS-LIST-COMMONIZATION-DESIGN-V1.md (Option C).
 *
 * KPA 는 KpaMember entity 기반으로 별도 페이지 유지 — 본 wrapper 범위 외.
 *
 * WO-O4O-PHARMACY-HUB-OPERATOR-MEMBERSHIP-CONSOLE-COMMON-CORE-ADOPTION-V1:
 *   Pharmacy-Hub 는 **가입 승인 전용 콘솔**(service_memberships 승인/반려만, 회원 수정·
 *   비밀번호·삭제·정지·일괄처리 endpoint 자체가 없음 — 백엔드가 의도적으로 공통
 *   /api/v1/operator/members 라우터에 포함되지 않음)이다. 이를 흡수하기 위해
 *   `consoleMode: 'approval'` 과 client 선택 메서드를 추가한다.
 *   기본값은 모두 기존 동작이며 Neture/GP/K-Cos/KPA 는 무변경이다.
 */

import type { ReactNode } from 'react';
import type { ListColumnDef, ActionConfirmConfig } from '@o4o/operator-ux-core';

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
  // WO-O4O-OPERATOR-MEMBERS-STANDARD-LIST-ADOPTION-V1: 서버 정렬(opt-in). adapter 가 forward.
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
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
  /** Used for client-side role tab count calculation (limit=1000).
   *  선택 — 미제공 시 role tab count 를 계산하지 않는다(탭은 count 없이 표시). */
  listAll?(): Promise<{ users: UserData[] }>;
  /** 선택 — 미제공 시 통계 카드/탭 count 를 생략한다. */
  stats?(): Promise<MembersConsoleStatsResponse>;
  /**
   * Update user status. Pass currentStatus when calling from drawer so adapter
   * can detect pending→approved (registration endpoint vs membership endpoint).
   * `user` 는 Neture 처럼 status 변경 endpoint 에서 membership.id 가 필요한 경우
   * adapter 가 사용할 수 있도록 wrapper 가 전달 (User 외 service 는 무시 가능).
   */
  updateStatus(
    userId: string,
    status: string,
    currentStatus?: string,
    user?: UserData,
    /** `rejectReason` prop 이 설정된 경우 drawer 에서 입력된 사유가 전달된다.
     *  (Pharmacy-Hub 반려는 사유가 백엔드 필수값이다.) */
    options?: { reason?: string },
  ): Promise<void>;
  /** Batch status change. Backend supports approved/rejected/suspended.
   *  선택 — 미제공 시 행 선택/일괄 액션 UI 를 노출하지 않는다. */
  batchUpdateStatus?(ids: string[], status: 'approved' | 'rejected' | 'suspended'): Promise<any>;
  /** Update password (operator-as-user). */
  /**
   * 회원 비밀번호 변경.
   *
   * WO-O4O-SERVICE-PASSWORD-CHANGE-UI-SCOPE-AND-INTEGRATION-V2:
   *   비밀번호는 **서비스별로 독립**하다(Identity V2 `service_credentials`).
   *   따라서 어느 서비스의 비밀번호인지 반드시 함께 보낸다 — `serviceKey` 는 필수다.
   *   서버는 이 값으로 정확히 한 건의 credential 만 갱신하며,
   *   미지정·모호한 요청은 400(`SERVICE_KEY_REQUIRED`)으로 거절한다.
   */
  /** 선택 — 미제공 시 '비밀번호 변경' 행 액션을 노출하지 않는다. */
  updatePassword?(userId: string, password: string, serviceKey: string): Promise<void>;
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

// ─── Configurable Action Types ───────────────────────────────

/** Extra row-level action appended after core edit/password/delete. */
export interface MembersRowActionConfig {
  key: string;
  label: string;
  variant?: 'default' | 'danger' | 'warning';
  icon?: ReactNode;
  divider?: boolean;
  /** Return false to hide this action for the given user. */
  visible?: (user: UserData) => boolean;
  /** Optional inline confirm dialog before execution. */
  confirm?: ActionConfirmConfig;
  /** Called when the action is triggered. Wrap errors with toast inside; do not re-throw. */
  onClick: (user: UserData) => void | Promise<void>;
}

/** Batch result shape expected by useBatchAction.executeBatch. */
export interface MembersBatchResult {
  data: { results: Array<{ id: string; status: 'success' | 'failed'; error?: string }> };
}

/** Extra bulk action shown in ActionBar when rows are selected. */
export interface MembersBulkActionConfig {
  key: string;
  /** Static string or function receiving target count. */
  label: string | ((count: number) => string);
  variant?: 'primary' | 'danger' | 'default';
  icon?: ReactNode;
  /** Filter which selected users qualify; returns the ids to act on. */
  getTargetIds: (selectedUsers: UserData[]) => string[];
  /** Execute the batch operation. Fan-out or batch endpoint — service decides. */
  executeBatch: (ids: string[]) => Promise<MembersBatchResult>;
  /** Return false to hide the action button entirely. */
  visible?: (selectedUsers: UserData[]) => boolean;
  /** Confirm dialog shown before execution. */
  confirm?: ActionConfirmConfig;
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
   * Optional header label for the role column. Default: '유형'.
   * Neture(WO-O4O-NETURE-MEMBER-LIST-MODAL-PERMISSION-DISPLAY-CORRECTION-V1):
   *   '회원 유형' — 참여 유형(공급자/파트너/셀러/일반 회원)만 표시하고
   *   운영 권한은 별도 컬럼으로 분리하므로 컬럼명을 명확히 한다.
   */
  roleColumnHeader?: string;

  /**
   * Search input placeholder. Default: '이름, 이메일로 검색' (MemberListLayout default).
   * Backend searches: firstName, lastName, email, name — customise per service if needed.
   * WO-O4O-MEMBER-MANAGEMENT-WRAPPER-SEARCH-PLACEHOLDER-PROP-V1
   */
  searchPlaceholder?: string;

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
   * 회원 수정 flow 가 있는 서비스는 반드시 제공한다.
   * 미제공 시 '정보 수정' 행 액션을 노출하지 않는다(가입 승인 전용 콘솔).
   */
  renderEditModal?: (props: EditModalRenderProps) => ReactNode;

  /**
   * Optional delete UX. If undefined, delete action is hidden.
   * Each service provides its own delete confirmation modal:
   *   - Neture: soft + hard choice modal
   *   - GP: DeleteRiskModal with risk check
   *   - K-Cos: simple confirm
   */
  renderDeleteFlow?: (props: DeleteFlowRenderProps) => ReactNode;

  /**
   * Extra row-level actions appended after core edit/password/delete in RowActionMenu.
   * Use for status-change shortcuts (suspend, restore) that are service-specific.
   */
  extraRowActions?: MembersRowActionConfig[];

  /**
   * Extra bulk actions appended after the built-in approve/reject in ActionBar.
   * Use for bulk suspend, restore, withdraw, etc.
   */
  extraBulkActions?: MembersBulkActionConfig[];

  /** DataTable tableId (for column persistence). Default: `{serviceKey}-operator-members`. */
  tableId?: string;

  // WO-O4O-OPERATOR-MEMBERS-STANDARD-LIST-ADOPTION-V1 (Targeted, opt-in — admin 화면 무변경)
  /** true 면 컬럼 클릭이 서버 정렬(email/createdAt)로 연결되고 sortBy/sortOrder 를 client.list 에 전달. 기본 false=기존 클라이언트 정렬. */
  serverSort?: boolean;
  /** true 면 tab/search/page/sort 를 URL query(`members_*`)와 동기화하고 새로고침 시 복원. 기본 false. */
  syncUrl?: boolean;

  // ── WO-O4O-PHARMACY-HUB-OPERATOR-MEMBERSHIP-CONSOLE-COMMON-CORE-ADOPTION-V1 ──

  /**
   * 콘솔 모드. 기본 'members' = 기존 동작(회원 일반 관리).
   *
   * 'approval' = **가입 승인 전용**. 목록·검색·상태 필터·상세·승인·반려만 제공하고
   * 회원 일반 관리 affordance(통계 카드 · 행 선택/일괄 처리 · 정지/활성화)를 제거한다.
   * 승인 대상이 아닌 행에는 처리 버튼을 노출하지 않는다.
   *
   * 승인 전용 서비스에서 회원 조작 UI 를 노출하면 백엔드에 없는 기능을 화면이 약속하게 된다.
   */
  consoleMode?: 'members' | 'approval';

  /**
   * 반려 사유 정책. 설정 시 drawer 반려 버튼이 사유 입력을 요구하고
   * `client.updateStatus(..., { reason })` 로 전달한다.
   * 미설정 시 기존 동작(사유 없이 즉시 반려).
   */
  rejectReason?: {
    /** true 면 사유가 비어 있는 동안 반려 버튼을 비활성화한다. */
    required?: boolean;
    label?: string;
    placeholder?: string;
  };

  /**
   * drawer 하단 '전체 상세 페이지 →' 링크 주소.
   * 기본 `/operator/users/{id}`. null 반환 시 링크를 노출하지 않는다
   * (해당 route 가 없는 서비스에서 데드링크가 되는 것을 막는다 — CLAUDE.md §1).
   */
  fullDetailHref?: (user: UserData) => string | null;
}

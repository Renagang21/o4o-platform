# IR-O4O-OPERATOR-USERS-CORE-DESIGN-V1

> **상위 문서**: [CLAUDE.md](../../CLAUDE.md) · [OPERATOR-CORE-DESIGN-V1.md](../architecture/OPERATOR-CORE-DESIGN-V1.md) · [OPERATOR-INTEGRATION-STATE-V1.md](../architecture/OPERATOR-INTEGRATION-STATE-V1.md) · [OPERATOR-DATATABLE-POLICY-V1.md](../architecture/OPERATOR-DATATABLE-POLICY-V1.md)
> **선례 (Reference)**: Stores 모듈 — [packages/operator-core-ui/src/modules/stores/](../../packages/operator-core-ui/src/modules/stores/)
> **버전**: V1
> **작성일**: 2026-05-04
> **상태**: Design IR — 다음 WO (`WO-O4O-OPERATOR-OPERATORS-CORE-EXTRACTION-V1`) 입력
> **범위**: 설계만 수행 — 코드 수정 없음
>
> 본 IR은 `@o4o/operator-core-ui` 신규 모듈 `users` 의 설계를 확정한다. Stores 모듈의 패턴(Adapter / Config / Slot)을 그대로 적용하되 Users 도메인의 차이(membership role, admin role, batch, AI summary, delete risk)를 흡수하는 인터페이스를 정의한다.

---

## 1. 개요

### 1.1 목적

3 서비스(KPA / GlycoPharm / K-Cosmetics)의 Operator Users / Members 페이지를 `@o4o/operator-core-ui` 의 페이지 수준 모듈로 추출한다.

### 1.2 현재 상태 (조사 결과)

| 항목 | KPA `UsersPage` | Glyco `UsersPage` | K-Cos `UsersPage` |
|---|---|---|---|
| 파일 | [services/web-kpa-society/src/pages/operator/UsersPage.tsx](../../services/web-kpa-society/src/pages/operator/UsersPage.tsx) | [services/web-glycopharm/src/pages/operator/UsersPage.tsx](../../services/web-glycopharm/src/pages/operator/UsersPage.tsx) | [services/web-k-cosmetics/src/pages/operator/UsersPage.tsx](../../services/web-k-cosmetics/src/pages/operator/UsersPage.tsx) |
| Backend Endpoint | `/api/v1/operator/members` | `/api/v1/operator/members` | `/api/v1/operator/members` |
| HTTP Client | `authClient.api` (axios wrapper) | `api` (axios) | `api` (axios) |
| DataTable | `@o4o/operator-ux-core` ✅ 표준 | `@o4o/ui` ❌ 비표준 | `@o4o/ui` ❌ 비표준 |
| Column 타입 | `ListColumnDef<T>` ✅ | `Column<T>` ❌ | `Column<T>` ❌ |
| Layout | 인라인 (탭/검색 직접) | `MemberListLayout` (ux-core) | `MemberListLayout` (ux-core) |
| Pagination | 수동 버튼 | DataTable built-in | DataTable built-in |
| Tabs | `all` / `pending` (2개) | `all` / `pharmacy` / `customer` / `pending` (4개) | `all` / `seller` / `consumer` / `pending` (4개) |
| Tab 필터링 | server-side (`status`) | client-side `ROLE_TAB_FILTER` | client-side `ROLE_TAB_FILTER` |
| Selection | `Set<string>` | `string[]` | (없음) |
| Batch Actions | approve / reject / suspend + AI Summary | approve / reject | (없음) |
| Action Policy | `defineActionPolicy('kpa:users')` | `defineActionPolicy('glycopharm:users')` | `defineActionPolicy('k-cosmetics:users')` |
| Action Set (rules) | approve, reject, suspend, activate, edit, password, delete | (동일) | (동일) |
| AI Summary | ✅ Sparkles (KPA 전용) | ❌ | ❌ |
| Delete Risk Modal | ❌ (단순 confirm) | ✅ DeleteRiskModal (Glyco 전용) | ❌ (단순 confirm) |
| Stats 카드 | 4개 (전체/활성/대기/거부) | 4개 (동일) | 4개 (동일) |

추가 사항:
- KPA에는 별도로 `MemberManagementPage.tsx` (KPA-a 분회 가입 관리, organization_id 기반) 존재 — **본 IR 범위 외**. 본 IR은 `UsersPage.tsx` (operator/members 콘솔)만 다룸.

### 1.3 EditUserModal 현황 (4 서비스)

| 항목 | KPA | Glyco | K-Cos | Neture |
|---|---|---|---|---|
| 파일 | [services/web-kpa-society/src/pages/operator/EditUserModal.tsx](../../services/web-kpa-society/src/pages/operator/EditUserModal.tsx) | [services/web-glycopharm/src/pages/operator/EditUserModal.tsx](../../services/web-glycopharm/src/pages/operator/EditUserModal.tsx) | [services/web-k-cosmetics/src/pages/operator/EditUserModal.tsx](../../services/web-k-cosmetics/src/pages/operator/EditUserModal.tsx) | [services/web-neture/src/pages/operator/EditUserModal.tsx](../../services/web-neture/src/pages/operator/EditUserModal.tsx) |
| 기본 정보 필드 | lastName, firstName, nickname, phone | (동일) | (동일) | (동일) |
| 사업자 정보 | 약국 정보 (businessName 등 9 필드) | (동일) | 사업자 정보 (동일) | (동일) |
| AddressSearch | ✅ (`@o4o/ui`) | ✅ | ✅ | ✅ |
| Membership Role | **읽기 전용** (pharmacist/student) | **편집 가능** (pharmacy/customer/supplier) | **편집 가능** (seller/consumer/pharmacist/supplier/partner) | **편집 가능** (supplier/partner/seller/customer) |
| Admin Role 옵션 | kpa:operator / kpa:admin | glycopharm:operator / glycopharm:admin | cosmetics:operator / cosmetics:admin | neture:operator / neture:admin |
| 저장 흐름 | PUT `/operator/members/{id}` → role DELETE/POST | (동일) | (동일) | (동일) |
| color | primary | primary | primary | primary |

→ 4 서비스 모두 거의 동일. **차이점은 (a) membership role 옵션 list, (b) admin role 옵션 list, (c) membership role 편집 가능 여부**의 3가지뿐. → config 주입으로 100% 흡수 가능.

> ⚠️ 기존 [`packages/ui/src/operator-user-detail/EditUserModal.tsx`](../../packages/ui/src/operator-user-detail/EditUserModal.tsx) 는 이전 부분 공통화 시도(WO-O4O-USER-DETAIL-PAGE-COMMONIZATION-V1)이지만 **role 편집 / AddressSearch / 한글 toast 등 누락**. 본 모듈에서 fresh 구축하여 operator-core-ui 로 옮기고, 기존 `@o4o/ui/operator-user-detail/` 은 후속 정리 (별도 WO).

---

## 2. Core vs Extension 분류

`OPERATOR-CORE-DESIGN-V1` §3.1 정책에 따라 분류:

| 영역 | 카테고리 | 처리 |
|---|---|---|
| Stats 카드 (전체/활성/대기/거부) | 🟢 Core | core-ui 모듈 기본 제공 |
| 검색 / Tabs / Pagination | 🟢 Core | `MemberListLayout` 재사용 + Operator DataTable |
| 컬럼 (이름/이메일/역할/서비스/가입일/상태/액션) | 🟢 Core | core-ui 모듈 기본 컬럼 |
| 행 액션 (approve/reject/suspend/activate/edit/password/delete) | 🟢 Core | `defineActionPolicy` + 표준 rule set |
| Batch Actions (approve/reject/suspend) | 🟡 Core UI | core-ui 모듈 기본, 서비스가 enable 결정 (config) |
| EditUserModal | 🟡 Core UI + Service Logic | core-ui 모듈 + role config 주입 |
| Password Modal | 🟢 Core | core-ui 모듈 기본 (4 서비스 동일) |
| Membership Role 편집/읽기 모드 | 🟡 Core UI | config (`membershipRole.editable`) |
| Membership / Admin Role 옵션 list | 🟡 Service Logic | config 주입 |
| Stats 라벨 / Tab 정의 | 🟡 Service Logic | config 주입 |
| **AI Summary (Sparkles)** | 🔴 Extension (KPA only) | **slot only** — `bulkActionsExtra` |
| **DeleteRiskModal** | 🔴 Extension (Glyco only) | **slot only** — `onDeleteOverride` 또는 `rowActionsExtra` |
| **KPA-a MemberManagementPage** (organization 기반) | 🔴 Extension | core-ui 흡수 금지 — KPA-a 자체 유지 |

→ Core 가 Extension(AI Summary, DeleteRiskModal, KPA-a)을 흡수하지 않는다.

---

## 3. 모듈 구성

### 3.1 디렉토리 트리

```
packages/operator-core-ui/src/modules/users/    ← 신규
├── types.ts                       (UsersApi, OperatorUserBase, UsersConfig, OperatorUsersListProps, EditUserModalProps)
├── OperatorUsersList.tsx          (메인 — 회원 목록 페이지)
├── useUsersQuery.ts               (data fetching hook)
├── EditUserModal.tsx              (회원정보 수정 모달)
├── PasswordModal.tsx              (비밀번호 변경 모달)
└── index.ts                       (barrel re-export)
```

Stores 모듈과 동일한 디렉토리 책임 구조 (`OPERATOR-CORE-DESIGN-V1` §2.2).

### 3.2 신규 export

```ts
// packages/operator-core-ui/src/index.ts
export * from './modules/stores';
export * from './modules/users';   // ← 신규
```

---

## 4. 핵심 인터페이스

### 4.1 Base Type — `OperatorUserBase`

```ts
// modules/users/types.ts

/** 3 서비스 공통 user 기본 필드 */
export interface OperatorMembership {
  id: string;
  serviceKey: string;
  status: string;
  role: string;
  createdAt: string;
}

export interface OperatorUserBase {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  nickname?: string;
  phone?: string;
  company?: string;
  status: string;                    // active / pending / approved / rejected / suspended / inactive
  roles?: string[];                  // role_assignments
  role?: string;                     // legacy single role (read-only)
  memberships?: OperatorMembership[];
  createdAt: string;
  updatedAt?: string;
}

export interface OperatorUserStats {
  total: number;
  active: number;
  pending: number;
  rejected: number;
  /** 서비스별 추가 카운트 (key 자유) — 예: pharmacyCount, sellerCount */
  extra?: Record<string, number>;
}
```

`OperatorStoreBase` 와 동일한 generic 확장 패턴 — 서비스가 추가 필드를 가질 수 있다.

### 4.2 Adapter — `UsersApi`

```ts
export interface UsersListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  serviceKey?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface UsersListResponse<T extends OperatorUserBase = OperatorUserBase> {
  success: boolean;
  users: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface UserDetailResponse<T extends OperatorUserBase = OperatorUserBase> {
  user: T;
  memberships?: OperatorMembership[];
  roles?: Array<{ role: string; isActive: boolean }>;
}

/** 서비스가 자체 http 클라이언트(KPA: authClient.api / Glyco·K-Cos: api)를 어댑터로 주입 */
export interface UsersApi<T extends OperatorUserBase = OperatorUserBase> {
  // List + Stats
  listUsers(params: UsersListParams): Promise<UsersListResponse<T>>;
  getStats(): Promise<{ statistics: { total: number; byStatus: Array<{ status: string; count: number }> } }>;

  // Detail / Update / Delete
  getUser(id: string): Promise<UserDetailResponse<T>>;
  updateUser(id: string, payload: Record<string, unknown>): Promise<void>;
  deleteUser(id: string, options?: { mode?: 'soft' | 'hard' }): Promise<void>;

  // Status transition
  setStatus(id: string, status: string): Promise<void>;

  // Role management (role_assignments)
  addRole(id: string, role: string): Promise<void>;
  removeRole(id: string, role: string): Promise<void>;

  // Batch (선택 — 서비스가 구현 여부 결정)
  batchSetStatus?(ids: string[], status: string): Promise<{ success: boolean; results: any[] }>;

  // Password
  setPassword(id: string, password: string): Promise<void>;

  // Delete risk (선택 — Glyco-only Extension)
  getDeleteRisk?(id: string): Promise<{
    user: { id: string; email: string; name: string; status: string };
    risks: Record<string, number>;
    totalImpact: number;
    canHardDelete: boolean;
  }>;

  // AI Summary (선택 — KPA-only Extension; 본 어댑터 신호용. 실제 호출은 slot에서)
}
```

**참고 — Backend Endpoint 매핑 (3 서비스 동일):**

| Method | Endpoint | 용도 |
|---|---|---|
| GET | `/api/v1/operator/members` | listUsers |
| GET | `/api/v1/operator/members/stats` | getStats |
| GET | `/api/v1/operator/members/{id}` | getUser |
| PUT | `/api/v1/operator/members/{id}` | updateUser, setPassword |
| DELETE | `/api/v1/operator/members/{id}?mode=` | deleteUser |
| PATCH | `/api/v1/operator/members/{id}/status` | setStatus |
| POST | `/api/v1/operator/members/{id}/roles` | addRole |
| DELETE | `/api/v1/operator/members/{id}/roles/{role}` | removeRole |
| POST | `/api/v1/operator/members/batch-status` | batchSetStatus |
| GET | `/api/v1/operator/members/{id}/delete-risk` | getDeleteRisk (Glyco only) |

→ **모든 어댑터는 같은 endpoint 호출.** 차이는 단지 baseURL 구성 (KPA `authClient.api` 는 prefix `/`, Glyco/K-Cos `api` 는 axios baseURL 처리).

### 4.3 Config — `UsersConfig`

```ts
export interface UserRoleOption {
  value: string;
  label: string;
}

export interface UsersConfig {
  serviceKey: 'kpa-society' | 'glycopharm' | 'k-cosmetics' | 'neture';

  /** 표현 라벨 */
  terminology: {
    pageTitle: string;            // "회원 관리"
    pageSubtitle?: string;        // "회원 승인, 상태 변경, 서비스 멤버십 관리"
    memberLabel: string;          // "회원" / "약사" 등
  };

  /** color scheme — Stores 와 동일 token */
  colorScheme?: 'slate' | 'primary' | 'pink';

  /** 서비스별 Tab 정의 — 미지정 시 기본 [전체, 가입신청] */
  tabs?: Array<{
    key: string;                  // 'all' | 'pending' | service-specific
    label: string;
    /** roles 배열로 client-side filter (생략 시 server-side) */
    roleFilter?: string[];
    /** server-side status filter (예: pending) */
    statusFilter?: string;
    /** stats 카드와 연결되는 카운트 key (extra.<key>) */
    statsKey?: string;
  }>;

  /** Stats 카드 표시 항목 (기본 [total, active, pending, rejected]) */
  statsCards?: Array<{
    key: 'total' | 'active' | 'pending' | 'rejected' | string;
    label: string;
    color: 'slate' | 'green' | 'amber' | 'red' | 'blue';
  }>;

  /** EditUserModal 설정 */
  editUserModal: {
    /** Membership role 편집 가능 여부 (KPA: false / Glyco·K-Cos·Neture: true) */
    membershipRoleEditable: boolean;
    /** Membership role 옵션 (라벨 매핑) */
    membershipRoleOptions: UserRoleOption[];
    /** Admin role 옵션 (운영 권한) */
    adminRoleOptions: UserRoleOption[];
    /** membership.serviceKey (예: 'glycopharm', 'kpa-society') */
    membershipServiceKey: string;
    /** Admin role 패턴 (해당 서비스의 *:admin / *:operator 인식용) */
    adminRolePattern: RegExp;
  };

  /** Action policy override (선택) — 기본 set은 core 제공 */
  actionPolicies?: Record<string, unknown>;

  /** 서비스별 추가 카운트 fetcher — 예: Glyco의 pharmacy/customer count */
  fetchExtraStats?: (api: UsersApi) => Promise<Record<string, number>>;
}
```

### 4.4 Slot Patterns — Extension 진입

```ts
export interface UsersBulkAction<T> {
  key: string;
  label: string;
  onClick: (selected: T[]) => void | Promise<void>;
  variant?: 'default' | 'primary' | 'warning' | 'danger';
  icon?: ReactNode;
  visible?: (selected: T[]) => boolean;
  loading?: boolean;
}

export interface OperatorUsersListProps<T extends OperatorUserBase = OperatorUserBase> {
  /** 필수 — 서비스 어댑터 */
  api: UsersApi<T>;

  /** 필수 — 서비스 표현 config */
  config: UsersConfig;

  /** 컬럼 override (선택) — 기본 set 제공 */
  columns?: ListColumnDef<T>[];

  /** 페이지당 행 수 (default 20) */
  pageSize?: number;

  /** 행 클릭 핸들러 (선택 — default: navigate to /operator/users/{id} 호출자가 처리) */
  onRowClick?: (user: T) => void;

  /**
   * 서비스별 추가 batch 액션 (예: KPA AI Summary).
   * 표준 batch (approve/reject/suspend) 외 추가 진입점.
   */
  bulkActionsExtra?: UsersBulkAction<T>[];

  /**
   * 서비스별 추가 행 액션 (예: 서비스 전용 진입점).
   */
  rowActionsExtra?: (user: T) => Array<{
    label: string;
    onClick: () => void;
    variant?: 'default' | 'warning' | 'danger';
  }>;

  /**
   * 삭제 동작 override (Glyco DeleteRiskModal 같은 custom flow).
   * 미지정 시 core 가 표준 confirm + api.deleteUser(id) 처리.
   */
  onDeleteOverride?: (user: T, refresh: () => void) => void;

  /** Header 영역 추가 UI (서비스 전용 버튼) */
  headerExtras?: ReactNode;

  /** Stats 카드 표시 여부 (default true) */
  showStats?: boolean;

  /** 표준 batch 활성화 여부 (default true; K-Cos 는 false 가능) */
  enableBatch?: boolean;

  /** 선택 가능 여부 (default = enableBatch) */
  selectable?: boolean;

  /** DataTable tableId */
  tableId?: string;
}

export interface EditUserModalProps {
  userId: string;
  api: UsersApi;
  config: UsersConfig;            // editUserModal config 만 사용
  onClose: () => void;
  onSuccess: () => void;
}

export interface PasswordModalProps {
  userId: string;
  userName: string;
  userEmail: string;
  api: UsersApi;
  onClose: () => void;
  onSuccess: () => void;
}
```

### 4.5 표준 Action Policy (core 제공)

```ts
// modules/users/OperatorUsersList.tsx 내부

const buildUserActionPolicy = <T extends OperatorUserBase>(serviceKey: string) =>
  defineActionPolicy<T>(`${serviceKey}:users`, {
    inlineMax: 2,
    rules: [
      { key: 'approve',  label: '승인',     variant: 'primary',
        visible: (u) => u.status === 'pending' || u.status === 'rejected' },
      { key: 'reject',   label: '거부',     variant: 'danger',
        visible: (u) => u.status === 'pending',
        confirm: { title: '회원 거부', message: '이 사용자를 거부 처리하시겠습니까?', variant: 'danger', confirmText: '거부' } },
      { key: 'suspend',  label: '정지',     variant: 'warning',
        visible: (u) => u.status === 'active' || u.status === 'approved',
        confirm: { title: '회원 정지', message: '이 사용자를 정지 처리하시겠습니까?', variant: 'warning', confirmText: '정지' } },
      { key: 'activate', label: '활성화',   variant: 'primary',
        visible: (u) => u.status === 'suspended' },
      { key: 'edit',     label: '정보 수정' },
      { key: 'password', label: '비밀번호 변경' },
      { key: 'delete',   label: '삭제',     variant: 'danger', divider: true,
        confirm: (u) => ({ title: '회원 삭제 확인', message: `이 사용자를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`, variant: 'danger', confirmText: '삭제' }) },
    ],
  });
```

→ 3 서비스 모두 거의 동일한 rule set. core 에서 단일 정의, `serviceKey` 만 주입.

---

## 5. Service Logic 주입 패턴 (예시)

### 5.1 KPA Adapter

```ts
// services/web-kpa-society/src/api/users-adapter.ts (예시)
import { authClient } from '../contexts/AuthContext';
import type { UsersApi, OperatorUserBase } from '@o4o/operator-core-ui';

const fetch = (method: string, url: string, data?: unknown) =>
  authClient.api.request({ method, url: url.replace(/^\/api\/v1/, ''), data }).then(r => r.data);

export const kpaUsersApi: UsersApi = {
  listUsers: (params) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return fetch('GET', `/operator/members?${qs}`);
  },
  getStats:    ()       => fetch('GET',   '/operator/members/stats'),
  getUser:     (id)     => fetch('GET',   `/operator/members/${id}`),
  updateUser:  (id, p)  => fetch('PUT',   `/operator/members/${id}`, p),
  deleteUser:  (id, o)  => fetch('DELETE', `/operator/members/${id}${o?.mode ? `?mode=${o.mode}` : ''}`),
  setStatus:   (id, s)  => fetch('PATCH', `/operator/members/${id}/status`, { status: s }),
  addRole:     (id, r)  => fetch('POST',  `/operator/members/${id}/roles`, { role: r }),
  removeRole:  (id, r)  => fetch('DELETE', `/operator/members/${id}/roles/${encodeURIComponent(r)}`),
  setPassword: (id, p)  => fetch('PUT',   `/operator/members/${id}`, { password: p }),
  batchSetStatus: (ids, status) => fetch('POST', `/operator/members/batch-status`, { ids, status }),
};
```

### 5.2 KPA Config

```ts
// services/web-kpa-society/src/config/users.ts (예시)
import type { UsersConfig } from '@o4o/operator-core-ui';

export const kpaUsersConfig: UsersConfig = {
  serviceKey: 'kpa-society',
  terminology: {
    pageTitle: '회원 관리',
    pageSubtitle: '회원 승인, 상태 변경, 서비스 멤버십 관리',
    memberLabel: '회원',
  },
  colorScheme: 'slate',
  tabs: [
    { key: 'all',     label: '회원 목록' },
    { key: 'pending', label: '가입 신청', statusFilter: 'pending', statsKey: 'pending' },
  ],
  editUserModal: {
    membershipRoleEditable: false,
    membershipRoleOptions: [
      { value: 'pharmacist', label: '약사' },
      { value: 'student',    label: '약대생' },
    ],
    adminRoleOptions: [
      { value: '',              label: '일반 회원' },
      { value: 'kpa:operator',  label: '운영자' },
      { value: 'kpa:admin',     label: '관리자' },
    ],
    membershipServiceKey: 'kpa-society',
    adminRolePattern: /^kpa:(admin|operator)$/,
  },
};
```

### 5.3 KPA Page (thin wrapper)

```tsx
// services/web-kpa-society/src/pages/operator/UsersPage.tsx (예시 — 추출 후)
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { OperatorUsersList } from '@o4o/operator-core-ui';
import { kpaUsersApi } from '../../api/users-adapter';
import { kpaUsersConfig } from '../../config/users';
import { useState } from 'react';

export default function UsersPage() {
  const navigate = useNavigate();
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  return (
    <>
      <OperatorUsersList
        api={kpaUsersApi}
        config={kpaUsersConfig}
        onRowClick={(u) => navigate(`/operator/users/${u.id}`)}
        bulkActionsExtra={[
          {
            key: 'ai-summary',
            label: 'AI 요약',
            icon: <Sparkles size={14} />,
            loading: aiLoading,
            visible: (selected) => selected.length >= 2,
            onClick: async (selected) => { /* KPA AI summarize call */ },
          },
        ]}
        headerExtras={aiSummary && <AiSummaryPanel data={aiSummary} onClose={() => setAiSummary(null)} />}
      />
    </>
  );
}
```

→ 페이지 코드 약 ~80% 감소 (현재 847 lines → 예상 ~150 lines).

### 5.4 Glyco DeleteRiskModal 흡수 (Slot)

```tsx
// services/web-glycopharm/src/pages/operator/UsersPage.tsx (예시 — 추출 후)
const [deleteTarget, setDeleteTarget] = useState(null);

<OperatorUsersList
  api={glycoUsersApi}
  config={glycoUsersConfig}
  onDeleteOverride={(user, refresh) => setDeleteTarget({ user, refresh })}
/>
{deleteTarget && (
  <DeleteRiskModal
    userId={deleteTarget.user.id}
    onDeleted={() => { deleteTarget.refresh(); setDeleteTarget(null); }}
    onClose={() => setDeleteTarget(null)}
  />
)}
```

DeleteRiskModal 컴포넌트는 web-glycopharm 내부에 유지 (Extension).

---

## 6. 마이그레이션 전략

### 6.1 단계 (3 step + 2 soak — Stores 와 동일 패턴)

| Step | 대상 | 작업 규모 | 회귀 위험 | 예상 변경 라인 |
|---|---|---|---|---|
| **Step 0** | `modules/users/` 신설 — types + 메인 컴포넌트 + EditUserModal + PasswordModal + useUsersQuery | 0 (신규) | +~700 |
| **Step 1** | KPA `UsersPage` thin wrapper 변환 + adapter + config + AI Summary slot | KPA 는 이미 `ListColumnDef` + `useBatchAction` + `defineActionPolicy` 사용 — Stores Step 1 처럼 가장 가까움 | 낮음 | -650 / +150 |
| **(soak 1주)** | KPA 안정성 검증 | smoke + log + AI Summary 동작 확인 | — | — |
| **Step 2** | Glyco `UsersPage` — `@o4o/ui Column` → `ListColumnDef` 변환 + adapter + config + DeleteRiskModal slot 보존 | 중간 (Stores Step 2 와 유사) | 낮음 | -700 / +160 |
| **(soak 1주)** | Glyco 안정성 검증 | smoke + log + DeleteRiskModal 동작 | — | — |
| **Step 3** | K-Cos `UsersPage` — `@o4o/ui Column` → `ListColumnDef` 변환 + adapter + config | K-Cos 는 batch 없음 — `enableBatch: false` 또는 표준 batch 도입 결정 | 낮음~중 | -500 / +130 |

### 6.2 마이그레이션 순서 근거 (Stores 와 동일: KPA → Glyco → K-Cos)

- **KPA**: 이미 Operator 표준 (`ListColumnDef` + ux-core DataTable + useBatchAction + defineActionPolicy) 사용 — 가장 가까운 형태. AI Summary 만 slot 으로 분리하면 됨.
- **Glyco**: 비표준 DataTable 사용. Column 변환 + DeleteRiskModal slot 분리.
- **K-Cos**: 비표준 DataTable + batch 없음. 가장 단순하지만 패턴 정합성 마지막에 검증.

### 6.3 Soak 전략 (Stores 와 동일)

각 Step 사이 1주 안정성 검증:
- Cloud Run 로그 ERROR 0
- 페이지 진입 / 탭 전환 / 검색 / 페이지네이션 / 행 클릭 / 액션 정상
- 회귀 흔적 없음
- AI Summary (KPA) / DeleteRiskModal (Glyco) 정상

### 6.4 Neture 처리

본 IR 범위는 KPA / Glyco / K-Cos 3 서비스. **Neture 는 Phase 4 별도 검토** — Neture EditUserModal 만 별도로 다루거나, Phase 4 에 일괄 추가.

---

## 7. 의존성 및 영향

### 7.1 `package.json`

3 서비스 모두 이미 `@o4o/operator-core-ui` dependency 보유 (Stores 추출 시 추가됨). **변경 불필요.**

### 7.2 Dockerfile

이미 Stores 추출 시 `packages/operator-core-ui/` COPY 라인 추가됨. **변경 불필요.**

### 7.3 외부 dependency 추가

`AddressSearch` 는 `@o4o/ui` 에 이미 존재 → operator-core-ui 가 `@o4o/ui` 를 peer dep 으로 사용 중 → 그대로 import 가능.

### 7.4 기존 `packages/ui/src/operator-user-detail/EditUserModal.tsx` 처리

본 추출 완료 후 사용처 점검:
- 만약 사용처 없음 → 별도 cleanup WO 에서 제거
- 만약 사용처 있음 → core-ui EditUserModal 로 대체 후 제거

→ **본 WO 범위 외**. cleanup 은 별도 처리.

---

## 8. 리스크 및 제약

| 리스크 | 심각도 | 완화 |
|---|---|---|
| **AI Summary 동작 회귀 (KPA)** | 중 | Step 1 진입 후 smoke. AI Summary 는 slot 으로 보존되므로 핵심 흐름은 영향 없음 |
| **DeleteRiskModal 회귀 (Glyco)** | 중 | Step 2 진입 후 smoke. `onDeleteOverride` slot 으로 위임 — Glyco 측 DeleteRiskModal 컴포넌트는 이전 그대로 유지 |
| **Glyco/K-Cos DataTable 변환 시 시각/기능 차이** | 중 | Step 2/3 전 컬럼 정의 사전 매핑 검증. Stores Step 2/3 의 변환 경험 적용 |
| **K-Cos batch 도입 vs 생략 결정** | 낮음 | `enableBatch: false` 로 K-Cos 는 batch 없이 진행 가능. 표준 batch 도입은 별도 WO |
| **Membership Role 편집 권한 차이** | 낮음 | `membershipRoleEditable` config 로 흡수 — KPA 만 `false` |
| **KPA-a `MemberManagementPage` 가 Core 범위 침범** | 낮음 | 명시적 분리 — KPA-a 는 organization-based, 본 모듈 범위 아님 |
| **Glyco stats fetch 의 1000건 client-side 집계** | 중 | 본 WO 범위 외. config 의 `fetchExtraStats` 슬롯으로 보존하되, 백엔드 집계 endpoint 추가는 별도 WO |
| **기존 `@o4o/ui/operator-user-detail/EditUserModal` 와 중복** | 낮음 | 본 WO 후 cleanup WO 에서 제거 |
| **role assignment API 의 일부 endpoint 누락** | 낮음 | Step 1 진입 전 KPA 의 PUT/POST/DELETE 동작 spot check 필요 |
| **batch endpoint 의 응답 shape 차이** | 낮음 | KPA 와 Glyco 가 같은 endpoint(`/batch-status`) 사용 — 응답 shape 동일 가정. Step 1 에서 검증 |

---

## 9. 다음 단계 (WO 초안)

본 IR 발행 직후 진입 가능한 WO:

### `WO-O4O-OPERATOR-USERS-CORE-EXTRACTION-V1`

```text
목표:
@o4o/operator-core-ui 에 users 모듈 추가 + 3 서비스 UsersPage 마이그레이션.

전제:
- Stores 모듈 soak 안정 (이미 완료된 상태에서 진입)
- IR-O4O-OPERATOR-USERS-CORE-DESIGN-V1 의 인터페이스 그대로 채택

범위:
1. packages/operator-core-ui/src/modules/users/ 신규 생성
   - types.ts (OperatorUserBase, UsersApi, UsersConfig, OperatorUsersListProps, EditUserModalProps, PasswordModalProps)
   - OperatorUsersList.tsx (메인)
   - useUsersQuery.ts (data hook)
   - EditUserModal.tsx (회원정보 수정)
   - PasswordModal.tsx (비밀번호 변경)
   - index.ts
2. packages/operator-core-ui/src/index.ts barrel 추가
3. KPA UsersPage thin wrapper 변환 + adapter + config + AI Summary slot (Step 1)
4. (1주 soak)
5. Glyco UsersPage thin wrapper 변환 + adapter + config + DeleteRiskModal slot (Step 2)
6. (1주 soak)
7. K-Cos UsersPage thin wrapper 변환 + adapter + config (Step 3)

제외:
- KPA-a MemberManagementPage (organization-based — Extension)
- Neture EditUserModal (Phase 4)
- 기존 @o4o/ui/operator-user-detail 정리 (별도 cleanup WO)
- 백엔드 집계 endpoint 추가 (별도 WO)
- UserDetailPage 통합 (별도 WO — 본 IR 범위 외)

검증:
- @o4o/operator-core-ui 빌드
- 3 서비스 typecheck (tsc -b --noEmit)
- 3 서비스 컬럼 렌더링 / 페이지네이션 / 검색 / 행 클릭 / 선택 / batch / EditUserModal / PasswordModal / 삭제 동일성
- KPA AI Summary 동작
- Glyco DeleteRiskModal 동작
- Cloud Run 로그 ERROR 0
- 각 Step 후 1주 soak smoke

완료 기준:
- 3 서비스 모두 OperatorUsersList 사용
- 페이지 레벨 코드 ~70~80% 감소 (KPA 847→~150, Glyco 785→~160, K-Cos 555→~130)
- 회귀 0
- 본 문서 §6.1 의 단계별 라인 추정 ±25% 이내
```

---

## 10. 금지 사항

본 IR 발행 이후 명시적 IR/WO 없이 다음 금지:

- ❌ 본 문서의 인터페이스 (UsersApi, UsersConfig, OperatorUsersListProps, EditUserModalProps 등) 즉흥 변경
- ❌ Step 순서 변경 (KPA → Glyco → K-Cos 외 다른 순서)
- ❌ Step 사이 soak 생략
- ❌ Extension 영역(`AI Summary`, `DeleteRiskModal`, `KPA-a MemberManagementPage`) 을 core-ui 모듈로 흡수 시도
- ❌ Operator 페이지에서 `@o4o/ui` `DataTable` 직접 사용 (`OPERATOR-DATATABLE-POLICY-V1` 위반)
- ❌ KPA-a `MemberManagementPage` (organization-based) 본 모듈에 흡수 시도
- ❌ Stores soak 중 본 WO 동시 진입 (직렬 진행)

---

## 11. 결론

> **`@o4o/operator-core-ui/modules/users` 는 Stores 모듈과 동일한 패턴(Adapter / Config / Slot)으로 추출하며, KPA → Glyco → K-Cos 순으로 점진적 마이그레이션한다. AI Summary(KPA) / DeleteRiskModal(Glyco) 등 서비스 전용 영역은 slot 으로만 노출하고 core 가 흡수하지 않는다. EditUserModal 의 차이(membership role 편집 가능 여부, role 옵션 list)는 config 로 100% 흡수 가능하다.**

본 IR 은 `WO-O4O-OPERATOR-USERS-CORE-EXTRACTION-V1` 의 직접 입력이다. 코드 수정은 본 IR 발행 후 별도 WO 진입 시점에 수행한다.

---

## 12. 참고 자료

- 상위 설계: [OPERATOR-CORE-DESIGN-V1.md](../architecture/OPERATOR-CORE-DESIGN-V1.md)
- 통합 상태: [OPERATOR-INTEGRATION-STATE-V1.md](../architecture/OPERATOR-INTEGRATION-STATE-V1.md)
- DataTable 정책: [OPERATOR-DATATABLE-POLICY-V1.md](../architecture/OPERATOR-DATATABLE-POLICY-V1.md)
- 5-Block 표준: [docs/platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md](../platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md)
- Stores 추출 (precedent):
  - [packages/operator-core-ui/src/modules/stores/types.ts](../../packages/operator-core-ui/src/modules/stores/types.ts)
  - [packages/operator-core-ui/src/modules/stores/OperatorStoresList.tsx](../../packages/operator-core-ui/src/modules/stores/OperatorStoresList.tsx)
- 서비스별 UsersPage (마이그레이션 대상):
  - [services/web-kpa-society/src/pages/operator/UsersPage.tsx](../../services/web-kpa-society/src/pages/operator/UsersPage.tsx)
  - [services/web-glycopharm/src/pages/operator/UsersPage.tsx](../../services/web-glycopharm/src/pages/operator/UsersPage.tsx)
  - [services/web-k-cosmetics/src/pages/operator/UsersPage.tsx](../../services/web-k-cosmetics/src/pages/operator/UsersPage.tsx)
- 서비스별 EditUserModal:
  - [services/web-kpa-society/src/pages/operator/EditUserModal.tsx](../../services/web-kpa-society/src/pages/operator/EditUserModal.tsx)
  - [services/web-glycopharm/src/pages/operator/EditUserModal.tsx](../../services/web-glycopharm/src/pages/operator/EditUserModal.tsx)
  - [services/web-k-cosmetics/src/pages/operator/EditUserModal.tsx](../../services/web-k-cosmetics/src/pages/operator/EditUserModal.tsx)
- 기존 부분 공통화 (cleanup 대상):
  - [packages/ui/src/operator-user-detail/EditUserModal.tsx](../../packages/ui/src/operator-user-detail/EditUserModal.tsx)
- 다음 단계: `WO-O4O-OPERATOR-USERS-CORE-EXTRACTION-V1`

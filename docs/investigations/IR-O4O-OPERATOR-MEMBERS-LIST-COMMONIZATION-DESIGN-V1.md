# IR-O4O-OPERATOR-MEMBERS-LIST-COMMONIZATION-DESIGN-V1

> **조사 보고서 (Investigation Report) — 조사·설계 전용 / 코드·DB·UI·migration 변경 없음.**
>
> 4 service (KPA / Neture / GP / K-Cos) 의 Operator Members list-side 구조 비교 → **공통 wrapper 가능 여부 + 설계안 + 후속 WO 순서** 확정.

- **작성일:** 2026-05-24
- **분류:** Investigation (read-only)
- **선행 산출물:**
  - [IR-O4O-OPERATOR-MEMBERS-DETAIL-SURFACE-DECISION-V1](IR-O4O-OPERATOR-MEMBERS-DETAIL-SURFACE-DECISION-V1.md) (Rev.1)
  - `WO-O4O-OPERATOR-MEMBERS-DETAIL-SURFACE-CANONICALIZATION-V1` (직전 commit `5af55ce5a`)
  - `WO-O4O-USER-DETAIL-PAGE-COMMONIZATION-V1` (CommonUserDetailPage 이미 4 service 정합)
- **사전 동기화:** origin/main 와 0 commits 차이.
- **수정 행위:** **없음** — 본 IR 은 설계 결정 전용.

---

## 0. 한 줄 권고

> **Option C — KPA 별도 유지 + Neture/GP/K-Cos 만 단일 wrapper 통합.**
> KPA 는 entity (KpaMember) / 컬럼 (activity_type, capabilities) / 탭 (status-based 5종) / Edit UX (Drawer inline) 가 본질적으로 다르므로 **adapter 강행보다 별도 유지가 clean and simple 원칙에 부합**.
> Neture/GP/K-Cos 의 List 구조는 공통도 ≥ 75% → `OperatorMembersConsolePage` wrapper 1 개 + 3 service thin wrapper. K-Cos bulk action 부재는 wrapper 도입과 함께 자동 해소.
> EditUserModal 통합 / KPA dead code 제거 / API Client 통일은 **별도 WO** 로 분리.

---

## 1. 조사 환경

| 항목 | 값 |
|---|---|
| 조사일 | 2026-05-24 |
| Repo 시점 | origin/main 와 일치 (HEAD `5af55ce5a`) |
| 조사 범위 | 4 service `pages/operator/MemberManagementPage|UsersManagementPage|UsersPage|EditUserModal` + `pages/operator/index.ts` (barrel) + `OperatorRoutes.tsx`/`App.tsx` (라우팅) + dead code 검증 |

---

## 2. 현재 구조 비교 (Entity / Lines / 정책 위치)

### 2.1 4 service Members 페이지 라인 + entity + live page

| Service | 파일 | 라인 | Entity | Live? |
|---|---|---:|---|:---:|
| **KPA** | `MemberManagementPage.tsx` | ~2030 | **KpaMember** (dual-ID, profile metadata) | ✅ live |
| **KPA** | `UsersPage.tsx` | 956 | UserData | ❌ **DEAD CODE** (§7 참조) |
| **Neture** | `UsersManagementPage.tsx` | 917 | UserData | ✅ live |
| **GP** | `UsersPage.tsx` | 957 | UserData | ✅ live |
| **K-Cos** | `UsersPage.tsx` | 768 | UserData | ✅ live |
| **KPA** | `EditUserModal.tsx` | 397 | KpaMember-aware | ❌ DEAD (UsersPage 만 사용) |
| **Neture** | `EditUserModal.tsx` | 336 | UserData | ✅ live |
| **GP** | `EditUserModal.tsx` | 355 | UserData | ✅ live |
| **K-Cos** | `EditUserModal.tsx` | 357 | UserData | ✅ live |

→ **Live wrappers:** KPA 1 + Neture/GP/K-Cos 각 1 = 총 4 페이지 (`UsersPage` 명명 통일 안 됨).
→ **Live EditUserModal:** 3 service (KPA 는 Drawer 내 inline edit 사용 — 별도 modal 없음).

---

## 3. Entity Shape 비교 (List Data Source)

### 3.1 KPA `KpaMember` (KPA-specific, User 아님)

```typescript
interface KpaMember {
  id: string;            // kpa_members.id | service_memberships.id (fallback)
  sm_id: string;         // service_memberships.id (always)
  has_kpa_member: boolean;
  user_id: string;       // User.id (CommonUserDetailPage 진입 키, §5 detail surface IR Rev.1 검증됨)
  organization_id: string | null;
  role: 'member' | 'operator' | 'admin' | null;
  status: 'pending' | 'active' | 'suspended' | 'rejected' | 'withdrawn';
  membership_type: string | null;   // 약사 / 약대생 / 미분류
  license_number: string | null;
  pharmacy_name: string | null;
  pharmacy_address?: string | null;
  activity_type?: string | null;    // 약사 / 약학생 / pharmacy_owner 등 (KPA-only)
  capabilities?: string[];           // role_assignments 활성 캐퍼빌리티 (KPA-only)
  business_info?: { businessName, businessNumber, ceoName, ... };
  user?: { name, email, nickname };
}
```

### 3.2 Neture/GP/K-Cos `UserData` (공통 User entity)

```typescript
interface UserData {
  id: string;            // user.id 단일
  email: string;
  firstName?: string; lastName?: string; name?: string; nickname?: string;
  phone?: string; company?: string;
  status: string;        // pending | active | approved | suspended | rejected
  roles?: string[]; role?: string;
  memberships?: Array<{ id, serviceKey, status, role, createdAt }>;
  createdAt: string;
}
```

### 3.3 Entity 비교 매트릭스

| 차원 | KPA | Neture | GP | K-Cos |
|---|---|---|---|---|
| Base entity | KpaMember (custom) | User | User | User |
| Identity 키 | id + sm_id (dual) | id | id | id |
| Profile metadata | 약사·약학생·약국·활동유형 | (없음) | (없음) | (없음) |
| Capability source | `capabilities[]` (role_assignments live) | `roles[]` + memberships.role | 동일 | 동일 |
| Memberships array | 없음 (단일 KPA service) | 있음 (multi-service) | 있음 | 있음 |
| `user_id` reference | ✅ user.id 분리 | 자기 자신이 user | 자기 자신이 user | 자기 자신이 user |

→ **KPA 는 User 의 superset 이 아닌 별개 도메인** (의약사 회원 도메인). adapter 로 강제 매핑하면 KPA 의 profile metadata 가 손실되거나 wrapper 가 복잡해짐.

---

## 4. Column / Filter / Bulk / Action 비교 (Live 4 페이지)

### 4.1 List Columns (실제 렌더 순서)

| Column | KPA | Neture | GP | K-Cos | 공통도 |
|---|:---:|:---:|:---:|:---:|:---:|
| name (avatar + nickname) | ✅ | ✅ | ✅ | ✅ | 4/4 |
| email (sortable) | ✅ | ✅ | ✅ | ✅ | 4/4 |
| status (StatusBadge) | ✅ | ✅ | ✅ | ✅ | 4/4 |
| createdAt / joined_at (sortable) | ✅ | ✅ | ✅ | ✅ | 4/4 |
| row actions (RowActionMenu) | ✅ | ✅ | ✅ | ✅ | 4/4 |
| role / membership_type (badge) | KPA: membership_type 인라인 | Neture: RoleBadge | GP: RoleBadge | K-Cos: RoleBadge | 4/4 (라벨/소스 다름) |
| services (ServiceBadge) | ❌ | ✅ | ✅ | ✅ | 3/4 |
| activity_type | ✅ | ❌ | ❌ | ❌ | 1/4 (KPA-only) |
| capabilities chips | ✅ | ❌ | ❌ | ❌ | 1/4 (KPA-only) |
| dashboardAccess chips | ❌ | ✅ | ❌ | ❌ | 1/4 (Neture-only) |

**공통 columns:** name / email / status / createdAt / actions = **5/10 (50%)**
**Neture+GP+K-Cos 만 비교 시:** name / email / status / createdAt / actions / role / services = **7/9 (78%)**

### 4.2 Filter (Tabs)

| Tab | KPA | Neture | GP | K-Cos |
|---|---|---|---|---|
| 전체 (all) | ✅ | ✅ | ✅ | ✅ |
| 역할별 type tab | 약사 / 약학생 (2) | supplier / partner / seller (3) | 약국 / 당뇨인 (2) | 판매자 / 소비자 (2) |
| status-based tab (5종) | ✅ pending / active / rejected / suspended / withdrawn | ❌ | ❌ | ❌ |
| 가입신청 (applications/pending) | ✅ applications | ✅ pending | ✅ pending | ✅ pending |
| ROLE_TAB_FILTER (client-side) | ✅ | ✅ | ✅ | ✅ |

→ **공통 패턴:** 전체 + 역할별 type tab + 가입신청 = 3 service 일치
→ **KPA 차이:** status-based 5 tab 추가 (별도 UX 패턴)

### 4.3 Search

| 항목 | KPA | Neture | GP | K-Cos |
|---|---|---|---|---|
| 모드 | Server-side + debounce | 동일 | 동일 | 동일 |
| 파라미터 | `search` | `search` | `search` | `search` |
| Placeholder | "이름, 이메일, 닉네임, 약국명, 사업자번호" (KPA-specific) | (기본) | (기본) | (기본) |

→ 4/4 service 동일 패턴 (placeholder 만 KPA 가 비즈 필드 명시).

### 4.4 Row Actions

| Action | KPA | Neture | GP | K-Cos |
|---|:---:|:---:|:---:|:---:|
| approve | ✅ | ✅ | ✅ | ✅ |
| reject | ✅ | ✅ | ✅ | ✅ |
| suspend | ✅ | ✅ | ✅ | ✅ |
| activate/restore | ✅ | ✅ | ✅ | ✅ |
| edit | Drawer inline | EditUserModal | EditUserModal | EditUserModal |
| password | ❌ | ✅ PasswordModal | ✅ PasswordModal | ✅ PasswordModal |
| delete (soft) | ❌ (bulk only) | ✅ | (risk modal) | ✅ inline |
| hard-delete | ❌ → /admin/members | ✅ | (risk modal) | ❌ |
| inlineMax | 2 | 0 (drawer footer 전용) | 2 | 2 |

### 4.5 Bulk Action (ActionBar)

| 항목 | KPA | Neture | GP | K-Cos |
|---|:---:|:---:|:---:|:---:|
| ActionBar | ✅ | ✅ | ✅ | ❌ **부재** |
| useBatchAction | ✅ | ✅ | ✅ | ❌ |
| Batch approve/reject | ✅ + suspend/restore/withdraw | ✅ | ✅ | ❌ |
| BulkResultModal | ✅ | ✅ | ✅ | ❌ |
| Selection state | Set<string> | Set<string> | Set<string> | ❌ |

→ **K-Cos drift 확정:** ActionBar / useBatchAction / BulkResultModal / selection UI **모두 부재**.

### 4.6 handleStatusChange 시그니처

| Service | 시그니처 |
|---|---|
| KPA | `handleStatusChange(memberId: string, newStatus: string)` |
| Neture | `handleStatusChange(userId: string, status: string, currentStatus?: string)` |
| GP | `handleStatusChange(userId: string, status: string)` |
| K-Cos | `handleStatusChange(userId: string, status: string)` |

→ Neture 만 currentStatus 옵셔널 파라미터 (registration 별도 endpoint 분기 목적). canonical 시그니처: `(id, status)` + Neture adapter 에서 currentStatus 추론.

### 4.7 Stats Card

| 항목 | KPA | Neture | GP | K-Cos |
|---|---|---|---|---|
| 개수 | 3 | 4 | 4 | 4 |
| 라벨 | 총회원수 / 승인대기 / 승인완료 | 전체 / 활성 / 대기 / 거부 | 동일 | 동일 |
| Layout | 1→3 col | 2→4 col | 2→4 col | 2→4 col |

→ **공통 패턴:** Neture/GP/K-Cos 3 service 가 4 카드 / 동일 라벨·아이콘·컬러로 100% 일치. **KPA 만 3 카드 (커스텀 라벨)**.

---

## 5. Wrapper 설계 후보 (3 안)

### Option A — 단일 `OperatorMembersConsolePage` (4 service 통합)

**구조:**
```typescript
<OperatorMembersConsolePage
  serviceKey="..."
  client={...}
  adapter={...}           // KpaMember↔User 변환
  columns={...}           // 4 service 의 합집합 columns config
  filters={...}           // status tab on/off, role tabs
  actions={...}           // approve/reject/suspend 등
  drawerRenderer={...}    // service-specific drawer content
/>
```

**장점:**
- 100% 통합 — 4 service 완전 일관
- 신규 service 추가 시 zero 코드 작성

**단점:**
- KPA adapter 가 KpaMember 의 dual-ID / activity_type / capabilities / 5 status tab 모두 추상화 필요 → wrapper 가 비대해짐
- wrapper props 가 ~20+ 개로 늘어남 (config / renderer / adapter)
- KPA Drawer inline edit 패턴을 wrapper 가 강제 통일 시 KPA 의 17 fields 비즈 정보 입력 UX 손실
- "clean and simple" 원칙 위반 (모든 옵션 판단 잣대 — [[principle_clean_and_simple]])

**판정:** ❌ **비추천** — KPA 의 entity·UX 가 본질적으로 다른데 wrapper 강행은 복잡도만 증가.

### Option B — Common Core + Service Adapter (4 service 통합, adapter 분리)

**구조:**
```typescript
OperatorMembersConsolePage        // 공통 core
  + KpaMemberAdapter              // KpaMember → CommonMember mapping
  + UserMemberAdapter             // UserData → CommonMember mapping
```

**장점:**
- adapter 분리로 wrapper 자체는 깔끔
- entity 차이 추상화

**단점:**
- KPA 의 17-field inline edit / 5 status tab / activity_type column 은 adapter 만으로 추상화 불가 → renderer slot 추가 필요 → 결국 Option A 와 같아짐
- adapter 자체가 KPA 의 모든 metadata 손실 없이 round-trip 가능해야 함 — 사실상 KPA wrapper = adapter + KPA renderer slot 묶음

**판정:** ⚪ 가능하나 Option C 대비 이득 작음. adapter 유지 비용이 KPA 별도 유지 비용보다 큼.

### Option C — KPA 별도 유지 + Neture/GP/K-Cos 만 단일 wrapper ✅ **권장**

**구조:**
```
KPA:
  pages/operator/MemberManagementPage.tsx (live, 그대로 유지)
  pages/operator/UsersPage.tsx (DEAD, §7 별도 WO 로 제거)

operator-core-ui:
  packages/operator-core-ui/src/modules/members/
    OperatorMembersConsolePage.tsx     // 공통 wrapper (Neture/GP/K-Cos 용)
    types.ts                            // MembersConsoleClient / MemberData
    index.ts

Neture: pages/operator/UsersManagementPage.tsx (~50 lines thin wrapper)
GP:     pages/operator/UsersPage.tsx (~50 lines thin wrapper)
K-Cos:  pages/operator/UsersPage.tsx (~50 lines thin wrapper)
```

**Wrapper props (Neture/GP/K-Cos 공통):**
```typescript
interface OperatorMembersConsoleProps {
  serviceKey: 'neture' | 'glycopharm' | 'k-cosmetics';
  client: MembersConsoleClient;       // list/stats/status/batch endpoints
  roleTabs: Array<{ key, label, roleFilter: string[] }>;  // service-specific role tabs
  serviceSpecificColumns?: ListColumnDef<UserData>[];     // dashboardAccess (Neture) 같은 추가 컬럼
  drawerExtraSections?: (user) => ReactNode;             // service-specific drawer content
  editModalRenderer?: (user, onClose, onSuccess) => ReactNode;  // EditUserModal slot (별도 WO 로 통합 가능)
}
```

**장점:**
- Neture/GP/K-Cos 의 공통 7/9 columns + 4 stats card + ActionBar/batch + Drawer (직전 WO 정합) 모두 한 곳에서 처리
- **K-Cos bulk action 부재가 wrapper 채택으로 자동 해소** (canonical 에 batch action 내장)
- KPA 는 도메인 특성 유지 (KpaMember + activity_type + status tab + Drawer inline edit + 17 fields)
- adapter / config 복잡도 최소
- "기능이 같으면 UI 도 같아야 한다" 원칙: User entity 기반 3 service 는 동일, KPA 는 본질적으로 별도 도메인이므로 별도 유지가 정합

**단점:**
- 4 service 완전 일관 아님 (KPA 만 별도) — 단 이는 entity·도메인 차이의 자연스러운 결과
- 신규 service 추가 시 (User entity 기반이면) wrapper 채택 / (KPA 같은 도메인이면) 별도 페이지

**판정:** ✅ **권장.** 가장 큰 ROI + 최소 복잡도 + KPA 도메인 특성 존중.

### 후보 비교 요약

| 차원 | A (단일) | B (adapter) | C (KPA 분리) |
|---|:---:|:---:|:---:|
| 통합 service 수 | 4 | 4 | 3 |
| wrapper 라인 (추정) | ~1500+ (모든 service 합집합) | ~1200 (core) + 200 (adapter × 2) | ~700 (core) |
| KPA 도메인 손실 | 큼 (entity 강제 통일) | 중간 (renderer slot 보존) | 없음 |
| K-Cos bulk action 해소 | ✅ (wrapper 내장) | ✅ | ✅ |
| 복잡도 (props 수) | 20+ | 15+ | 6-8 |
| 신규 service 비용 (User 기반) | 0 (config only) | 0 | thin wrapper ~50 lines |
| 신규 service 비용 (KPA 같은 도메인) | adapter 신설 | adapter 신설 | 별도 페이지 |
| **clean and simple** | ❌ | △ | ✅ |
| **권장도** | ❌ | △ | ✅ |

---

## 6. Canonical 설계안 (Option C 기준)

### 6.1 Package 구조

```
packages/operator-core-ui/
  src/modules/members/
    OperatorMembersConsolePage.tsx       # 공통 wrapper (Neture/GP/K-Cos)
    components/
      MembersDataTable.tsx               # 공통 컬럼 정의
      MembersStatsCards.tsx              # 4-card stats
      MembersDrawer.tsx                  # BaseDetailDrawer + drawerExtraSections slot
      MembersBulkActionBar.tsx           # ActionBar + useBatchAction 통합
    types.ts                              # MembersConsoleClient / MemberData
    index.ts
  package.json exports 추가:
    "./modules/members": "./src/modules/members/index.ts"
```

### 6.2 `MembersConsoleClient` (capability-first 인터페이스)

```typescript
interface MembersConsoleClient {
  list(params: ListParams): Promise<{ users: UserData[]; pagination: PaginationData }>;
  stats(): Promise<MembersStats>;
  updateStatus(id: string, status: string): Promise<void>;
  batchStatus(ids: string[], status: string): Promise<BatchResult>;
  delete(id: string, mode?: 'soft' | 'hard'): Promise<void>;
  password(id: string, password: string): Promise<void>;
  deleteRisk?(id: string): Promise<DeleteRiskData>;   // optional (GP-only)
}

interface ListParams {
  page: number; limit: number; status?: string; search?: string;
}
```

### 6.3 Wrapper Props

```typescript
interface OperatorMembersConsoleProps {
  serviceKey: 'neture' | 'glycopharm' | 'k-cosmetics';
  client: MembersConsoleClient;

  // 역할 탭 (service-specific)
  roleTabs: Array<{ key: string; label: string; roleFilter: string[] }>;

  // 컬럼 확장 (선택)
  serviceSpecificColumns?: ListColumnDef<UserData>[];   // Neture: dashboardAccess

  // Drawer 확장 (선택)
  drawerExtraSections?: (user: UserData) => ReactNode;  // Neture registration 안내 등

  // EditUserModal slot (별건 통합 전까지 service 측에서 주입)
  editModalRenderer: (user: UserData, onClose: () => void, onSuccess: () => void) => ReactNode;

  // delete 모드 (선택)
  deleteMode?: 'simple' | 'risk' | 'soft-and-hard';     // K-Cos: simple, GP: risk, Neture: soft-and-hard

  // approval 시그니처 어댑터 (선택, Neture currentStatus)
  approvalSigAdapter?: (id: string, status: string, currentStatus?: string) => Promise<void>;
}
```

### 6.4 Migration 매트릭스

| Service | 작업량 |
|---|---|
| Neture UsersManagementPage.tsx | ~917 → ~80 lines (thin wrapper + editModalRenderer slot + drawerExtraSections + custom delete logic) |
| GP UsersPage.tsx | ~957 → ~80 lines (thin wrapper + risk delete modal slot) |
| K-Cos UsersPage.tsx | ~768 → ~50 lines (thin wrapper, batch action 자동 활성화) |
| KPA MemberManagementPage.tsx | 변경 없음 (KPA 별도 유지) |
| KPA UsersPage.tsx | 변경 없음 (별건 dead code WO) |
| EditUserModal | 변경 없음 (별건 통합 WO) |

→ **3 service 라인 합계:** 2642 → ~210 lines (≈92% 감소).
→ **공통 wrapper 라인:** ~700 lines 신설.
→ **순 감소:** ~1700 lines + 3 service drift 정합.

---

## 7. K-Cos Bulk Action 처리 결정

| 안 | 내용 | 판정 |
|---|---|---|
| 단독 WO 선행 | K-Cos UsersPage 에 ActionBar/useBatchAction/BulkResultModal 추가 → 이후 wrapper 통합 시 다시 추출 | ❌ 중복 작업 |
| **wrapper 와 함께 해소** | wrapper 내 ActionBar 내장 → K-Cos thin wrapper 채택 시 자동 활성화 | ✅ **권장** |

→ **결정:** Option C wrapper 도입 WO 에 포함. 별도 K-Cos bulk action WO 불필요.

---

## 8. KPA UsersPage / EditUserModal Dead Code 처리 결정

### 8.1 Dead Code 최종 확정 (Agent 3 검증 결과)

| 파일 | 라인 | 상태 | 근거 |
|---|---:|---|---|
| `web-kpa-society/src/pages/operator/UsersPage.tsx` | 956 | ❌ DEAD | import 0건, barrel 미포함, OperatorRoutes/App.tsx 미참조, lazy import 없음 |
| `web-kpa-society/src/pages/operator/EditUserModal.tsx` | 397 | ❌ DEAD | UsersPage 만이 import (1건) → UsersPage 가 dead 이므로 자동 dead |
| 내부 의존성 | — | 완전 격리 | PasswordModal 등 내부 component, 외부 노출 없음 |
| 외부 의존성 | — | 없음 | 다른 파일 수정 불필요 |

### 8.2 처리 결정

| 안 | 내용 | 판정 |
|---|---|---|
| 본 WO (list commonization) 와 묶음 | 한 commit 에 wrapper + KPA cleanup | ❌ scope 혼재, 회귀 시 원인 파악 어려움 |
| **별도 WO 분리** | `WO-O4O-KPA-USERS-PAGE-DEAD-CODE-REMOVAL-V1` 신설, 단독 2 파일 (~1353 lines) 제거 | ✅ **권장** |

→ **결정:** 별도 WO. 단순 삭제이므로 본 wrapper WO 와 병렬·후행 모두 안전.

---

## 9. EditUserModal 통합 가능성 결정

### 9.1 통합 가능 영역 매트릭스

| 영역 | 공통도 | 비고 |
|---|:---:|---|
| Props 시그니처 | 100% | userId / onClose / onSuccess 4 service 동일 |
| 기본 정보 폼 (lastName, firstName, nickname, phone) | 100% | 4 service 완전 동일 |
| 운영 권한 (DELETE-then-POST) | 100% | role_assignments 패턴 |
| UI 레이아웃 + 스타일 | 95% | 모달 / 에러 / 로딩 동일 |
| AddressSearch | 100% | 동일 컴포넌트 |
| **소계 (공통)** | **~70%** | wrapper 가능 |
| 회원유형 UI | KPA R/O vs 나머지 editable | adapter (`membershipRoleReadOnly`) |
| Business Info 필드 수 | KPA 12개 vs 나머지 8개 | config (`businessInfoFields[]`) |
| Business Info 라벨 | KPA "약국 정보" vs 나머지 "사업자 정보" | config (`businessInfoLabel`) |
| activityType 로직 | KPA 만 보유 | optional (`enableActivityType`) |
| API client | 3 패턴 (authClient / api / apiFetch) | adapter (`apiCall`) |
| **소계 (service-specific)** | **~30%** | adapter / config |

### 9.2 처리 결정

| 안 | 내용 | 판정 |
|---|---|---|
| 본 WO 와 함께 통합 | 같은 commit | ❌ scope 비대 (list wrapper + edit modal 통합 = 2 큰 변경) |
| **별도 WO 분리** | `WO-O4O-OPERATOR-EDITUSER-MODAL-COMMONIZATION-V1` 신설 | ✅ **권장** |
| 본 WO 의 wrapper 에 `editModalRenderer` slot 으로 받음 | 통합 전까지는 service 측에서 기존 modal 주입 | ✅ 본 WO 의 default 접근 |

→ **결정:** EditUserModal 은 별도 WO. 단 본 wrapper 의 `editModalRenderer` slot 으로 받아 통합 전후 모두 호환.

---

## 10. API Client 통일

| Service | Client | 노트 |
|---|---|---|
| KPA | `authClient.api.request()` | KPA 내부 wrapper |
| Neture | `api.get/put/delete/post()` | @/lib/apiClient 직접 |
| GP | `apiFetch<T>()` wrapper | path replace `^/api/v1` |
| K-Cos | `apiFetch<T>()` wrapper | 동일 |

→ **결정:** 본 IR 범위 외. wrapper 의 `MembersConsoleClient` 인터페이스가 자동 통일 효과 — 각 service 의 thin wrapper 에서 `client` 인스턴스를 주입할 때 service 내부 client 사용. API client 자체 통일은 별도 IR/WO.

---

## 11. 후속 WO 제안 (Priority 순)

### Priority 1 (즉시 후속)

```
WO-O4O-OPERATOR-MEMBERS-LIST-COMMONIZATION-V1
- 범위: Option C — Neture/GP/K-Cos 3 service 만 통합
- packages/operator-core-ui/src/modules/members/ 신설
- OperatorMembersConsolePage + 컴포넌트 4 종 (DataTable, Stats, Drawer, BulkActionBar)
- 3 service thin wrapper 전환 (각 ~50-80 lines)
- KPA MemberManagementPage 변경 없음
- EditUserModal 변경 없음 (slot 으로 주입)
- K-Cos bulk action 자동 해소
- 회귀 검증: 4 service 모두 /operator/users 동작 보존 (KPA 는 /operator/members)
```

### Priority 2 (병렬·후행 가능)

```
WO-O4O-KPA-USERS-PAGE-DEAD-CODE-REMOVAL-V1
- 범위: services/web-kpa-society/src/pages/operator/UsersPage.tsx + EditUserModal.tsx 제거
- 영향: 1353 lines 제거, 외부 의존성 0
- OperatorRoutes.tsx 의 /operator/users/:id route 는 UserDetailPage 별도 import 이므로 유지
- 회귀 검증: KPA 의 /operator/members + /operator/users/:id 동작 보존
```

### Priority 3 (Priority 1 완료 후)

```
WO-O4O-OPERATOR-EDITUSER-MODAL-COMMONIZATION-V1
- 범위: 4 service EditUserModal 통합 (KPA 포함)
- adapter pattern: membershipRoleReadOnly / businessInfoFields / businessInfoLabel / enableActivityType / apiCall
- KPA 의 Drawer inline edit 와의 관계: KPA 는 inline 유지하되 동일 adapter 기반으로 form fields 만 공유 (별도 검토)
- 본 WO 완료 후 Priority 1 wrapper 의 editModalRenderer slot 을 default 로 전환
```

### Priority 4 (장기)

```
WO-O4O-OPERATOR-MEMBERS-API-CLIENT-NORMALIZATION-V1
- 4 service API client 통일 (authClient / api / apiFetch → 단일 패턴)
- 본 IR 범위 외 — 별도 IR 선행 권장
```

---

## 12. O4O 철학 정합 체크

| 차원 | Option C 채택 시 | 충돌 |
|---|:---:|:---:|
| 공통 Core (operator-core-ui) | ✅ modules/members 신설로 인프라 충실 | 없음 |
| 같은 Capability → 같은 UI/UX | ✅ Neture/GP/K-Cos (User entity 기반) 완전 정렬 | 없음 |
| 서비스별 독립 도메인 | ✅ KPA (KpaMember 도메인) 별도 유지 | 없음 |
| 기능이 같으면 UI 도 같아야 한다 | ✅ 3 service 일치, KPA 는 기능 자체가 다름 | 없음 |
| Capability 먼저, Wrapper 는 그 다음 | ✅ MembersConsoleClient 인터페이스로 capability 명세 → wrapper 가 소비 | 없음 |
| Clean and Simple ([[principle_clean_and_simple]]) | ✅ Option A/B 대비 wrapper props 절반, KPA 도메인 손실 0 | 없음 |
| KPA-Society = Community Canonical baseline | ✅ KPA 는 도메인 reference implementation 으로 별도 유지가 정합 | 없음 |

→ **충돌 0 건.**

---

## 13. 본 IR 이 결정하지 않는 것

- 실제 wrapper 코드 / migration / commit (Priority 1 WO 에서 실행)
- EditUserModal 의 정확한 adapter shape (Priority 3 IR 에서 결정)
- API client 통일 패턴 (Priority 4 IR 선행)
- KPA MemberManagementPage 자체의 list-side 정리 (분리 도메인이므로 별건)
- CommonUserDetailPage 수정 (Detail Surface 이미 완료, 본 IR 범위 외)

---

## 14. 본 IR 의 의의

| 차원 | 결과 |
|---|---|
| 즉시 코드 변경 | 0 |
| 큰 결정 | **Option C — KPA 별도 유지 + Neture/GP/K-Cos 통합** 확정 |
| 후속 WO 제안 | 4 건 (Priority 1-4) |
| K-Cos bulk action 처리 | wrapper 와 함께 자동 해소 — 별도 WO 불요 |
| KPA dead code 처리 | 별도 WO 분리 (Priority 2) |
| EditUserModal 통합 처리 | 별도 WO 분리 (Priority 3), wrapper 의 slot 으로 통합 전까지 호환 |
| 사이클 정리 | Members 영역 list-side commonization 설계 완료, 구현은 Priority 1 WO 에서 |

---

## 부록 — 조사 명령 (재현 가능)

```bash
# 1. Live page 라인 수 + entity 확인
wc -l services/web-{kpa-society,neture,glycopharm,k-cosmetics}/src/pages/operator/{MemberManagementPage,UsersManagementPage,UsersPage}.tsx 2>/dev/null

# 2. EditUserModal 라인 수
wc -l services/web-*/src/pages/operator/EditUserModal.tsx

# 3. K-Cos bulk action 부재 검증
grep -E "ActionBar|useBatchAction|BulkResultModal" services/web-k-cosmetics/src/pages/operator/UsersPage.tsx | head -5

# 4. KPA UsersPage dead code 검증
grep -rn "from.*['\"]./UsersPage['\"]" services/web-kpa-society/src/
grep -rn "import.*UsersPage" services/web-kpa-society/src/
grep -rn "import.*EditUserModal" services/web-kpa-society/src/

# 5. KPA OperatorRoutes 확인 (/operator/users/:id → UserDetailPage)
grep -nE "UsersPage|users/:id|UserDetailPage" services/web-kpa-society/src/routes/OperatorRoutes.tsx
```

---

*Created: 2026-05-24*
*Type: Investigation Report (read-only) — Design Decision*
*Status: ✅ 결정 — Option C (KPA 별도 유지 + Neture/GP/K-Cos 단일 wrapper). Priority 1-4 후속 WO 4건 제안.*
*Decision Required: Priority 1 — `WO-O4O-OPERATOR-MEMBERS-LIST-COMMONIZATION-V1` 진입 여부.*

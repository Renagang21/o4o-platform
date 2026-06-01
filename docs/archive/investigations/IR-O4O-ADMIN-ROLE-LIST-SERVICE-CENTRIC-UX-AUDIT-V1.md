# IR-O4O-ADMIN-ROLE-LIST-SERVICE-CENTRIC-UX-AUDIT-V1

> admin.neture.co.kr 의 운영자/관리자 관리 UI 가 user-centric(legacy RBAC/debug 중심) 구조인지 조사하고,
> 현재 O4O 운영 규모/구조(서비스별 운영자 소수 + multi-role 사용자 존재)에 맞는
> **service-centric 운영 조직 리스트**로 전환 가능한지 평가한 IR.
>
> 수정 없음. 조사 + 구조 비교 + canonical 방향 + 후속 WO 우선순위.
>
> 본 IR 의 핵심 질문은 *"운영자 리스트를 service / role / user 어느 축으로 보여야 하는가"* 이며,
> "탭으로 서비스를 분리하자 / 통합 리스트로 가자" 사이의 의사결정 입력으로 사용된다.

- 작성일: 2026-05-15
- 기준 브랜치: `main` (`f1ad939a8` 시점)
- 자매 SSOT
  - [RBAC-CANONICAL-STATE-V1](../rbac/RBAC-CANONICAL-STATE-V1.md) — `role_assignments` SSOT
  - [USER-OPERATOR-FREEZE-V1](../architecture/USER-OPERATOR-FREEZE-V1.md) — users / service_memberships / role_assignments 3테이블 고정
  - [RBAC-ROLE-CATALOG-V1](../rbac/RBAC-ROLE-CATALOG-V1.md) — 서비스/역할 catalog
- 조사 대상
  - [apps/admin-dashboard/src/pages/users/UsersListClean.tsx](../../apps/admin-dashboard/src/pages/users/UsersListClean.tsx)
  - [apps/admin-dashboard/src/pages/operators/OperatorsPage.tsx](../../apps/admin-dashboard/src/pages/operators/OperatorsPage.tsx)
  - [apps/admin-dashboard/src/pages/users/RoleManagement.tsx](../../apps/admin-dashboard/src/pages/users/RoleManagement.tsx)
  - [apps/admin-dashboard/src/routes/users.routes.tsx](../../apps/admin-dashboard/src/routes/users.routes.tsx)
  - [apps/admin-dashboard/src/admin/menu/admin-menu.static.tsx](../../apps/admin-dashboard/src/admin/menu/admin-menu.static.tsx)
  - [apps/api-server/src/routes/admin/users.routes.ts](../../apps/api-server/src/routes/admin/users.routes.ts)
  - [apps/api-server/src/controllers/admin/AdminUserController.ts](../../apps/api-server/src/controllers/admin/AdminUserController.ts)
  - [apps/api-server/src/modules/auth/entities/RoleAssignment.ts](../../apps/api-server/src/modules/auth/entities/RoleAssignment.ts)
  - [apps/api-server/src/modules/auth/entities/ServiceMembership.ts](../../apps/api-server/src/modules/auth/entities/ServiceMembership.ts)
- 범위 제약
  - 코드 수정 / UI 변경 / API 변경 / 마이그레이션 **모두 본 IR 범위 외**.
  - 본 IR 의 결과물은 *구조 분석 + canonical 방향 제안 + 후속 WO 우선순위 분할*.

---

## 0. 결론 요약 (TL;DR)

> **현재 admin-dashboard 의 운영자/관리자 리스트는 user-centric(레거시 RBAC/debug 잔재) 구조이며,
> O4O 현 규모와 RBAC SSOT(`role_assignments`) 모델에 fit 하지 않는다.**
> **service-centric (assignment 기반 1 row = 1 user×service×role) 으로 전환하는 것이 정합적이다.**
> 단, 서비스별 "탭 분리"는 불필요하며, **단일 통합 리스트 + facet 필터/검색** 방향이 현 규모에 맞다.

**핵심 사실 7가지:**

1. **운영자 관련 화면이 3곳에 분산**되어 있음:
   - `/users` (UsersListClean) — 전체 사용자 + 단일 `role` 컬럼(레거시 6종)
   - `/operators` (OperatorsPage) — 운영자 keyword 필터된 사용자 + multi-role badge
   - `/users/roles` (RoleManagement) — Role 자체 메타(이름/색/permissions) CRUD
   - 셋 다 같은 `GET /admin/users` API 를 다른 방식으로 reshape 한다.

2. **`UsersListClean` 은 RBAC SSOT 와 정합하지 않음**:
   - 하드코딩된 `ROLE_MAP = { super_admin, admin, seller, partner, supplier, customer }` 만 인식.
   - `kpa:admin`, `neture:operator` 같은 service-prefixed role 은 fallback 색상(gray)으로 떨어짐.
   - 탭 7개(All + 6 role)는 multi-role 사용자를 *첫 번째 role* 로만 분류한다 — **multi-role 가시성이 사실상 없음**.

3. **`OperatorsPage` 는 user-centric 이면서 service-tab + multi-role badge 형태**:
   - keyword whitelist(`admin/operator/super_admin/district/branch/supplier/partner`)로 client-side 필터.
   - 사용자 1명 = 1 row, role 은 chip 으로 펼쳐 표시.
   - 서비스 탭(7개: all + 6서비스)도 client-side `roles.startsWith(prefix)` 필터.
   - 같은 사람이 KPA Admin + Neture Operator 면 *어느 탭에서 봐도 같은 row* 가 나타남 → 탭 의미가 약함.

4. **백엔드 `GET /admin/users` 는 이미 `role_assignments` JOIN 완료**:
   - 응답에 `roles: string[]` 배열을 포함 (e.g. `['kpa:admin', 'neture:operator']`).
   - 즉 **데이터 모양은 이미 service-centric 으로 reshape 가능**. 추가 API 없이 frontend flatMap 만으로 assignment-row 리스트 생성 가능.

5. **현 규모에서 "서비스별 탭" 은 비용 대비 효용이 낮음**:
   - 서비스당 운영자가 소수(통상 1~5명, 6서비스 × 평균 ~3 → 합쳐도 20명 내외 추정).
   - 탭을 오가는 비용 > 한 화면에서 facet 필터 비용.
   - multi-role 사용자가 늘어날수록 탭 분리는 *같은 사람을 여러 탭에서 보게 만드는* 안티패턴이 됨.

6. **확장 축은 "운영자 외 역할"로 빠르게 확장됨**:
   - 이미 RoleCatalog 는 store_owner / instructor / pharmacist / supplier / partner / member 등 다수 보유.
   - OperatorsPage 의 keyword whitelist 방식은 **새 역할 추가마다 코드 수정 필요** → 확장성 낮음.
   - service-centric 통합 리스트는 **`role_assignments` 가 자라는 만큼 자동으로 확장**됨.

7. **권장 후속 WO 는 3개로 분할** (영향도 / 의존성 기준):
   - **W1 (UX)**: OperatorsPage → UsersListClean 흡수, "운영 역할" 페이지를 **assignment-row 통합 리스트**로 재구성. API/스키마 무변경.
   - **W2 (Catalog)**: 하드코딩된 SERVICE_ROLES / ROLE_MAP / keyword whitelist 를 `RBAC-ROLE-CATALOG-V1` 기반 single source 로 통일. (frontend 정적 매핑 → API/JSON catalog)
   - **W3 (Scale-out, 보류)**: 운영자가 수십 명 이상으로 늘어나면 server-side pagination + facet aggregation 으로 전환. **현 규모에서는 불필요.**

---

## 1. 현재 구조 분석

### 1.1 화면 3분할 — 무엇이 어디 있나

| 화면 | 경로 | 데이터 소스 | 행(Row)의 의미 | Tab 축 |
|------|------|------------|---------------|--------|
| Users | `/users` ([UsersListClean.tsx](../../apps/admin-dashboard/src/pages/users/UsersListClean.tsx)) | `GET /admin/users?limit=1000` | 1 user | role 7탭 (`all`, `super_admin`, `admin`, `seller`, `partner`, `supplier`, `customer`) |
| Operators | `/operators` ([OperatorsPage.tsx](../../apps/admin-dashboard/src/pages/operators/OperatorsPage.tsx)) | `GET /admin/users?limit=1000` (client-side keyword filter) | 1 user (roles chip 펼침) | service 7탭 (`all` + 6 service) |
| Role Management | `/users/roles` ([RoleManagement.tsx](../../apps/admin-dashboard/src/pages/users/RoleManagement.tsx)) | `GET /users/roles`, `GET /users/permissions` | 1 role definition | - |

**같은 API 를 3가지 방식으로 사용한다:**

```
GET /admin/users  ──┬── UsersListClean: u.role || 'customer' 단일 role 컬럼
                   ├── OperatorsPage: u.roles 배열 + keyword filter + service tab
                   └── (Role Management 는 별도 API)
```

### 1.2 백엔드 데이터 모양 (이미 multi-role)

[AdminUserController.ts:96-122](../../apps/api-server/src/controllers/admin/AdminUserController.ts) 가 응답하는 user 객체:

```jsonc
{
  "id": "uuid",
  "email": "ops@example.com",
  "firstName": "...", "lastName": "...",
  "roles": ["kpa:admin", "neture:operator"],   // role_assignments JOIN 결과
  "role": "kpa:admin",                         // roles[0] (legacy fallback)
  "isActive": true,
  "createdAt": "..."
}
```

- **`role_assignments` 가 SSOT** (`isActive = true` 인 모든 역할을 ARRAY_AGG).
- legacy `role` 필드는 `roles[0]` 호환용 — `UsersListClean` 만 사용.
- multi-role 사용자: API 가 *이미 모든 role 을 반환* 하고 있으므로 frontend reshape 만 필요.

### 1.3 RBAC SSOT 와 화면 매핑 차이

[RBAC-CANONICAL-STATE-V1](../rbac/RBAC-CANONICAL-STATE-V1.md) 기준 canonical 테이블:

```
users               → Identity ONLY (권한 속성 없음)
role_assignments    → RBAC SSOT (1 row = 1 user × 1 role)
service_memberships → 서비스 가입 + 서비스 역할
```

| 축 | DB SSOT | UsersListClean | OperatorsPage |
|-----|---------|----------------|----------------|
| user | `users` | ✅ 1 user = 1 row | ✅ 1 user = 1 row |
| role | `role_assignments` (multi-row per user) | ❌ 1 컬럼 단일값 (`role`) | ⚠️ 1 컬럼 multi-chip |
| service | role prefix 파싱 + `service_memberships` | ❌ 없음 | ⚠️ tab + role prefix 추출 |

**문제:** SSOT 는 *assignment 단위* 인데, 두 화면 모두 *user 단위* 로 행을 잡고 role 을 컬럼/탭으로 접는다. multi-role 사용자가 늘수록 "행 = user, 컬럼 = role 묶음" 구조의 가독성이 빠르게 나빠진다.

### 1.4 Role badge / 색상 rendering 구조

`OperatorsPage`:
- `getRoleColor()` — service prefix(`platform:`, `kpa:`, ...) 별 색상 + fallback keyword(`super_admin`, `admin`, `operator`)
- `getRoleDisplay()` — `SERVICE_ROLES` lookup, 없으면 `'{Service}: {role}'` 형식
- `SERVICE_DISPLAY_NAMES` — 서비스 코드 → 표시명 매핑 (`kpa → KPA`, `cosmetics → K-Cosmetics`)
- `SERVICE_ROLES` 6 서비스 × ~2 역할 = ~13 역할 하드코딩

`UsersListClean`:
- `ROLE_MAP` 6개만 하드코딩 (`super_admin`, `admin`, `seller`, `partner`, `supplier`, `customer`)
- service-prefixed role 은 라벨/색 fallback → **`kpa:admin` 이 그냥 `'kpa:admin'` 회색 chip** 으로 표시됨.

**중복 및 표현 불일치:** 두 화면이 같은 role 문자열을 서로 다른 라벨/색으로 표시할 수 있다.

### 1.5 Sidebar / Navigation 진입점

[admin-menu.static.tsx:80-91](../../apps/admin-dashboard/src/admin/menu/admin-menu.static.tsx):

```
core-users      → /users        "Users & Roles"
core-operators  → /operators    "Service Operators"
```

→ 사이드바도 *user / operator 분리 멘탈모델* 을 강요한다. 그러나 RBAC SSOT 관점에서 "운영자" 는 **사용자에게 특정 role 이 active 인 상태** 이지, 별도 엔티티가 아니다.

---

## 2. 문제점 정리

### 2.1 구조적 문제

| # | 문제 | 영향 |
|---|------|------|
| P1 | 같은 `GET /admin/users` 응답을 3개 페이지가 다르게 reshape | 표현 불일치, 중복 코드, role 라벨/색이 페이지마다 다름 |
| P2 | `UsersListClean.role` 단일 컬럼은 multi-role 을 못 보여줌 | KPA Admin + Neture Operator 사용자는 KPA 탭에서만 나타남 (또는 첫 role 기준) |
| P3 | `OperatorsPage` 의 service 탭은 *client-side prefix filter*. 같은 row 가 여러 탭에 등장 | 탭 의미 약함, 같은 사람을 여러 번 확인하게 됨 |
| P4 | role / service catalog 가 frontend 하드코딩 (`SERVICE_ROLES`, `ROLE_MAP`, keyword whitelist) | 새 역할/서비스 추가 시 코드 수정 → 확장성 낮음 |
| P5 | `service_memberships` 정보 미표시 | "KPA 가입자이며 KPA Admin" vs "KPA 미가입자에게 KPA Admin role 만 부여" 구분 불가능 |
| P6 | org-scoped role 미표시 | 분회 운영자(`kpa-society:district_admin` 등 scope_id 가 있는 role) 은 같은 라벨로 묶임 |
| P7 | "운영자" 정의가 keyword whitelist (`OperatorsPage` line 89) 에 박혀 있음 | RBAC catalog 변경 시 silently drift |

### 2.2 Multi-role 가독성 시나리오

현재 구조에서 한 사용자가 다음 역할을 가질 때:

```
user X: [platform:admin, kpa:operator, neture:admin, glycopharm:operator]
```

| 화면 | 보이는 모습 |
|------|-------------|
| `/users` (All 탭) | 1 row, `role` 컬럼에 `platform:admin` chip 1개 (fallback gray, 나머지 3개는 안 보임) |
| `/users` (Admin 탭) | role[0] === 'admin' 이 아니므로 *행이 안 나타남* (필터: `u.role !== activeTab`) |
| `/operators` (All 탭) | 1 row, 4개 chip 펼침 (정상) |
| `/operators` (KPA 탭) | 같은 1 row (chip 4개 모두 보임) |
| `/operators` (Neture 탭) | 같은 1 row (chip 4개 모두 보임) |

→ **`/operators` 의 서비스 탭은 "이 서비스에 권한 있는 사용자" 라는 필터일 뿐, "이 서비스 내에서의 역할" 을 보여주지 않는다.** 분류 효과가 거의 없음.

### 2.3 확장 시 한계 (1년 후 시나리오)

| 추가 | 현재 구조 영향 |
|------|----------------|
| 새 서비스 추가 (e.g. `siteguide:admin`) | `SERVICE_ROLES`, `SERVICE_DISPLAY_NAMES`, `SERVICE_TABS`, `getServiceName`, `getRoleColor` 5곳 동시 수정 |
| 새 role 종류 추가 (e.g. `kpa:instructor`) | `SERVICE_ROLES` 추가 + 만약 keyword whitelist 에 안 잡히면 `OperatorsPage` 에서도 누락 |
| store_owner / instructor / supplier 운영자 화면에서 함께 보기 | keyword whitelist 확장 필요. 단순 운영자/비운영자 이분법이 깨짐 |
| scope_id 기반 분회 운영자 표시 | scope_type/scope_id 필드 미사용 → 현재 응답에 없음, 컨트롤러 응답 + UI 모두 수정 |
| 서비스가 8~10개로 늘면 탭 8~10개 가로 스크롤 | 탭 모델 자체가 깨짐 |

---

## 3. Service-centric Canonical 방향 (제안)

### 3.1 핵심 원칙

> **"행의 단위 = `role_assignments` 한 줄"** (= 1 user × 1 service × 1 role).
> SSOT 와 UI 모델이 일치한다. multi-role 사용자는 *여러 행* 으로 자연스럽게 펼쳐진다.

### 3.2 권장 컬럼 (canonical 리스트)

| 컬럼 | 출처 | 비고 |
|------|------|------|
| Service | role prefix (`kpa:` → KPA) | catalog 매핑. `platform:` 은 "Platform (전역)" |
| Role | role suffix (`admin`, `operator`) | catalog 매핑. KR 라벨 |
| User (Name/Email) | `users` | 동일 user 가 여러 행에 반복됨 (정상) |
| Status | `role_assignments.is_active` + `users.isActive` | "Role active / User inactive" 등 분리 표기 |
| Scope | `scope_type` / `scope_id` | global / organization, 분회명 등 (있으면) |
| Assigned At | `assigned_at` | |
| Assigned By | `assigned_by` → user lookup | |
| Membership | `service_memberships.status` 같은 service | "가입자/비가입자/정지" |

### 3.3 검색 / 필터 (탭 대신 facet)

```
[search box: "KPA Operator sohae" 같은 자유 검색]

[facet — multi-select chips]
Service:  [Platform] [KPA] [Neture] [GlycoPharm] [K-Cosmetics] [GlucoseView]
Role:     [admin] [operator] [super_admin] [...]
Status:   [active] [inactive]
Scope:    [global] [organization]
```

- 탭 1개 = 필터 1개 라는 단순 규칙.
- multi-select 가능 → "KPA + Neture 의 Admin" 같은 cross-service 조회.
- 검색은 user.name / user.email / role / service 라벨 통합 매칭.

### 3.4 표현 방식 (badge / chip / grouped row)

- **Badge 방식 유지 가능**: assignment-row 라면 service/role chip 은 row 당 1쌍이면 충분 → 색상 코드만 catalog 단일 출처화.
- **Grouped row 옵션 (선택)**: 같은 user 의 행을 1 row 로 collapse 하고 expand 시 service/role 펼침. *기본은 ungrouped (flat) 권장* — 작은 규모에서는 flat 이 훨씬 직관적.
- **Role chips 다중 표시** (현 OperatorsPage 방식) 은 user-centric 잔재이므로 제거.

### 3.5 사용자 요구와의 매핑

사용자가 원했다고 명시한 표:

| 서비스 | 역할 | 사용자 |
|--------|------|--------|
| KPA | Admin | A |
| KPA | Operator | B |
| Neture | Supplier | C |
| GlycoPharm | Operator | D |

→ 정확히 §3.2 의 assignment-row 모델과 1:1 매칭. canonical 방향이 사용자 요구와 일치한다.

---

## 4. 불필요한 구조 (제거 후보)

| 항목 | 사유 |
|------|------|
| `/operators` 의 service tab 7개 | facet 필터로 대체 가능. multi-select 가 더 유연. |
| `/users` 의 role tab 7개 | 마찬가지로 facet 필터로 대체. 단일 role 가정이 RBAC SSOT 와 불일치. |
| `OperatorsPage` 의 keyword whitelist (`KEYWORDS = ['admin', 'operator', ...]`) | "운영자 여부" 를 코드 상수로 정의 → catalog 가 있으므로 제거. 운영자 = "특정 role 이 활성인 user" 로 facet 필터 |
| `UsersListClean.ROLE_MAP` (legacy 6 role) | RBAC SSOT 미반영. catalog 기반 단일 매핑으로 통일 |
| `OperatorsPage` 와 `UsersListClean` 분리 자체 | 같은 API, 같은 데이터. **page 분리는 사용자 멘탈모델만 분열시킴** |

---

## 5. 추천 리스트 구조 (요약)

```
[/users (canonical)]
┌────────────────────────────────────────────────────────────────────┐
│ Search: [_______________________]                                  │
│ Service: [Platform] [KPA] [Neture] [GlycoPharm] [Cosmetics] [...]  │
│ Role:    [admin] [operator] [super_admin] [supplier] [...]         │
│ Status:  [active] [inactive]                                       │
├────────────────────────────────────────────────────────────────────┤
│ Service     Role        User          Email             Scope  ⋯   │
│ ──────────  ──────────  ────────────  ───────────────   ─────      │
│ Platform    Super Admin sohae         sohae@…           global     │
│ KPA         Admin       A             …                 global     │
│ KPA         Operator    B             …                 global     │
│ Neture      Supplier    C             …                 global     │
│ GlycoPharm  Operator    D             …                 global     │
└────────────────────────────────────────────────────────────────────┘
```

- 1 row = 1 active `role_assignment`.
- 같은 user 가 여러 service / role 에 동시에 있으면 *자연스럽게 여러 행* 으로 나옴.
- 사용자/서비스/역할 어느 축으로든 정렬/필터 가능.
- "이 서비스에 운영자 누구 있나" → Service facet 선택.
- "이 사람이 어디 어디 권한 있나" → 이름 검색.

---

## 6. API / Data Source 영향 평가

### 6.1 API 무변경 가능 여부

**가능.** 백엔드 `GET /admin/users` 가 이미 `roles: string[]` 을 반환하므로:

```ts
// frontend pseudo
const rows = users.flatMap(u =>
  (u.roles ?? []).map(role => ({
    userId: u.id, name: u.name, email: u.email,
    role,                                  // 'kpa:admin'
    service: parseService(role),           // 'kpa'
    isUserActive: u.isActive,
    createdAt: u.createdAt,
  }))
);
```

- 현재 규모(~수십 명 × 평균 2 role = 100 행 미만)에서 client-side flatMap + filter 충분.
- 단, `role_assignments.is_active`, `scope_type`, `scope_id`, `assigned_at`, `assigned_by` 를 노출하려면 **응답 reshape 가 필요** → 옵션 W2/W3 에서 처리.

### 6.2 추가/변경이 필요해지는 시점

| 트리거 | 필요 API 변경 |
|--------|---------------|
| `assigned_at`, `scope_type` 표시 | `getUsers` 가 `roles: string[]` 대신 `assignments: [{role, isActive, scopeType, scopeId, assignedAt, assignedBy}]` 반환 |
| 운영자가 100+ 로 늘어남 | server-side pagination + facet aggregation (`GET /admin/role-assignments?service=kpa&role=admin&page=...`) |
| `service_memberships` 정보까지 표시 | response 에 memberships JOIN 추가 |

→ **W1 (UI 통합) 은 API 무변경으로 가능.** API 변경은 W2/W3 단계에서 점진적으로.

### 6.3 `GET /admin/users` 자체의 Core Freeze

[apps/api-server/src/routes/admin/users.routes.ts:1-6](../../apps/api-server/src/routes/admin/users.routes.ts) 는 `@core O4O_PLATFORM_CORE — Approval` 로 동결 표시되어 있음 (F10, F11). **응답 추가(non-breaking)는 가능**하나, 응답 모양 변경은 CORE_CHANGE 승인 필요.

→ §6.2 의 API 변경은 *추가 필드* 형태로 비파괴적으로 가능. 기존 `roles: string[]` 유지하면서 `assignments` 추가하는 식이 안전.

---

## 7. 후속 WO 우선순위 분할

> **W1 → W2 → W3 순서. W1 만으로도 "service-centric 통합 리스트" 완성. W2/W3 는 catalog 정리와 scale-out.**

### W1 — UI 정렬 (assignment-row 통합 리스트) — **P0**

- 범위:
  - `OperatorsPage` 와 `UsersListClean` 을 단일 페이지로 통합 (`/users` 유지, `/operators` 는 redirect 또는 제거).
  - 행 단위를 user → assignment 로 변경 (frontend flatMap).
  - 서비스/역할 facet 필터 도입 (탭 제거).
  - role/service 라벨·색상 catalog 를 단일 매핑 모듈로 추출 (`@o4o/rbac-catalog` 후보).
- 영향:
  - API 무변경.
  - Sidebar `core-users` / `core-operators` 항목 통합.
- 의존성: 없음.
- 리스크: 낮음 (UI only).

### W2 — Catalog 단일 출처화 — **P1**

- 범위:
  - `SERVICE_ROLES`, `ROLE_MAP`, `SERVICE_DISPLAY_NAMES`, `KEYWORDS` 4곳 하드코딩을 `RBAC-ROLE-CATALOG-V1` 기반 단일 catalog 로 통일.
  - frontend 정적 import 또는 API (`GET /api/v1/rbac/catalog`) 중 택1. (정적 import 권장 — 빌드 시 보장)
- 영향:
  - 새 서비스/역할 추가 시 catalog 1곳만 수정.
- 의존성: W1 완료 후 수행 시 충돌 적음.

### W3 — Scale-out (API/server-side facet) — **P2 (보류)**

- 범위:
  - assignment-row 응답으로 새 endpoint `GET /api/v1/admin/role-assignments` 추가 (`is_active`, `scope_type`, `scope_id`, `assigned_at`, `assigned_by` 포함).
  - server-side pagination / facet count.
  - `service_memberships` 정보 JOIN 노출.
- **현 규모(<100 active assignments)에서는 불필요.** 운영자가 50명 이상으로 늘거나, scope-aware UI(분회 운영자 등) 가 실제 필요해질 때 착수.
- 의존성: W1 완료 후 응답 reshape 시점.

---

## 8. 권장 의사결정

| 결정 | 권장 |
|------|------|
| 서비스별 탭 분리 도입할 것인가? | ❌ **No.** 현 규모에 과한 분리. facet 필터로 대체. |
| user-centric 행 유지 vs assignment-row | ✅ **assignment-row 로 전환.** RBAC SSOT 와 일치, multi-role 가시성 확보. |
| 운영자/사용자 페이지 분리 유지 | ❌ **No.** 같은 데이터 → 같은 페이지. 운영자 = "운영 role facet 필터 적용" 으로 의미 보존. |
| API 즉시 변경 | ❌ **No.** W1 은 무변경으로 가능. W2/W3 단계에서 점진적. |
| 후속 WO 1개로 묶을 것인가 | ⚠️ **분리 권장.** W1 (UI) / W2 (catalog) / W3 (API) 의존성·리스크가 달라 묶으면 PR 검토 비용 증가. |

---

## 9. 본 IR 의 범위 외

- 코드 수정 / 마이그레이션 / API 변경 → 본 IR 에서 수행하지 않음.
- 운영자 페이지의 다른 기능 (Add Operator 모달, Revoke Role 다이얼로그) UX 평가 → 별도 IR 필요 시 분리.
- KPA-Society 의 service-내부 운영자 화면 (`services/web-kpa-society/src/pages/operator/**`) → [IR-O4O-OPERATOR-LIST-COMMONIZATION-AUDIT-V1](IR-O4O-OPERATOR-LIST-COMMONIZATION-AUDIT-V1.md) 참고. 본 IR 은 *플랫폼 admin-dashboard* 만 다룸.

---

*작성: 2026-05-15*
*Status: Investigation Only — no code change*

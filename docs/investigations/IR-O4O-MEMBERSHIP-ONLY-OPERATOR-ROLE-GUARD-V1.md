# IR-O4O-MEMBERSHIP-ONLY-OPERATOR-ROLE-GUARD-V1

> **조사 요청서 (Investigation Report)**
>
> 코드 수정 없음 / 데이터 수정 없음 / 정책 변경 없음
>
> `roles=[]` 이지만 `service_memberships` 에 `neture:operator` 가 존재하는 계정이 일부 operator endpoint 에서 `requireRole` 미들웨어에 막혀 403 이 발생하는 문제의 구조적 원인을 조사한 보고서.

- **작성일:** 2026-05-23
- **분류:** Investigation Report (Read Only)
- **선행 CHECK:** [CHECK-O4O-BOUNDARY-POLICY-OPERATIONAL-SMOKE-V1](CHECK-O4O-BOUNDARY-POLICY-OPERATIONAL-SMOKE-V1.md) §3 — 본 문제의 직접 관찰
- **참조 SSOT:**
  - `docs/rbac/RBAC-FREEZE-DECLARATION-V1.md` (F9)
  - `docs/architecture/USER-OPERATOR-FREEZE-V1.md` (F11)
  - `docs/architecture/O4O-BOUNDARY-POLICY-V1.md` (F6)
  - CLAUDE.md §11, §F11
- **버전:** V1

---

## 0. 조사 목적

`CHECK-O4O-BOUNDARY-POLICY-OPERATIONAL-SMOKE-V1` 에서 `neture-operator@o4o.com` 가 다음 상태로 관찰:

```text
roles = []
memberships = [{ serviceKey: 'neture', role: 'operator', status: 'active' }]
```

호출 결과:

```text
/operator/stores             → 200
/operator/members            → 403
/operator/members/stats      → 403
/operator/products           → 403
/operator/analytics/summary  → 403
```

본 IR 은:

1. 4 endpoint 의 403 과 1 endpoint 의 200 의 **구조적 차이** 확정
2. `roles[]` (role_assignments) 와 `service_memberships.role` 의 **canonical source 책임 분리** 확인
3. operator 권한의 **single source of truth** 판정
4. 데이터 보정 vs middleware 보강 중 **어느 방향이 canonical** 인지 결정
5. F6 / F9 / F11 정책과의 정합 검토

을 수행하여 후속 WO 의 방향성을 확정한다.

> 본 IR 은 코드를 수정하지 않는다. 후속 WO 의 *수정 범위* 와 *데이터 영향* 확정을 목적으로 한다.

---

## 1. 조사 대상 — 5 endpoint 의 guard 체인

### 1.1 Guard 체인 비교표

| Endpoint | 라우트 파일 | Middleware 체인 | Membership-only operator 결과 |
|----------|------------|-----------------|-----------------------------|
| `/operator/members` + `/stats` | [routes/operator/membership.routes.ts:21](apps/api-server/src/routes/operator/membership.routes.ts#L21) | `authenticate` → **`requireRole([platform, neture:operator, ...])`** → `injectServiceScope` | **403** (`requireRole` 차단) |
| `/operator/stores` | [routes/operator/stores.routes.ts:62](apps/api-server/src/routes/operator/stores.routes.ts#L62) | `authenticate` → **`requireOperatorAccess`** (커스텀) → `injectServiceScope` | **200** (membership fallback 통과) |
| `/operator/products` | [routes/operator/products.routes.ts:19](apps/api-server/src/routes/operator/products.routes.ts#L19) | `authenticate` → **`requireRole([...])`** → `injectServiceScope` | **403** |
| `/operator/analytics/*` | [routes/operator/analytics.routes.ts:24](apps/api-server/src/routes/operator/analytics.routes.ts#L24) | `authenticate` → **`requireRole([...])` (변수명 `requireOperatorOrAdmin`)** → `injectServiceScope` | **403** |

### 1.2 두 guard 의 동작 차이

**`requireRole(roles[])`** ([authorization.middleware.ts:99-115](apps/api-server/src/common/middleware/auth/authorization.middleware.ts#L99-L115)):

```ts
// P0 RBAC: Check roles using RoleAssignment service only
const hasActiveRole = await roleAssignmentService.hasAnyRole(user.id, roleList);
```

→ **role_assignments 테이블만** 확인. service_memberships 무시.

**`requireOperatorAccess`** ([stores.routes.ts:31-58](apps/api-server/src/routes/operator/stores.routes.ts#L31-L58)) — `WO-KPA-SOCIETY-STORE-ACCESS-FIX-V1` 에서 도입:

```ts
// Check JWT roles (from role_assignments, set at login)
const userRoles = user.roles || [];
if (OPERATOR_ROLES.some(r => userRoles.includes(r))) { next(); return; }

// Fallback: active service membership in JWT (KPA-style membership-based operators)
const memberships = user.memberships || [];
if (memberships.some(m => m.status === 'active')) { next(); return; }
```

→ role_assignments **OR** active service membership 둘 다 허용. 명시적 주석:

> KPA Society operators use membership-based auth (service_memberships), not role_assignments, so requireRole() would reject them.

### 1.3 판정

**비대칭의 원인**: `stores.routes.ts` 만 `WO-KPA-SOCIETY-STORE-ACCESS-FIX-V1` 로 membership fallback 추가. 다른 4 endpoint 는 F9 RBAC SSOT 의 표준 `requireRole` 사용.

---

## 2. Canonical Source 분석

### 2.1 F9 RBAC Freeze SSOT

[RBAC-FREEZE-DECLARATION-V1 §1-2](../rbac/RBAC-FREEZE-DECLARATION-V1.md):

> ## 1. RBAC SSOT 선언
>
> 현재 플랫폼의 권한 단일 소스(Single Source of Truth):
>
> ```
> role_assignments (Layer A)
> ```
>
> ## 2. 읽기/쓰기/검증 경로 확정
>
> | 영역 | 단일 경로 |
> |------|-----------|
> | **Read** | `roleAssignmentService.getRoleNames()` → `user.roles` (middleware override) |
> | **JWT** | `roleAssignmentService.getRoleNames()` → token payload |
> | **Guard** | `requireAdmin` / `requireRole` / `createServiceScopeGuard` (모두 RA 기반) |

**판정**: 권한 검사의 canonical source 는 `role_assignments`. JWT 의 `user.roles` 도 여기서만 생성됨.

### 2.2 F11 User/Operator Freeze SSOT

[USER-OPERATOR-FREEZE-V1 §1.2](../architecture/USER-OPERATOR-FREEZE-V1.md):

```text
Operator = service_memberships 존재 (active + is_active)
Role = 권한 판단 전용 (role_assignments)
Platform Admin = admin/super_admin in role_assignments → 모든 서비스 접근
```

[USER-OPERATOR-FREEZE-V1 §2 Forbidden Patterns]:

```text
❌ user.role 기반 operator 판단
❌ users.service_key 사용
❌ role만으로 operator 판단
❌ 서비스별 예외 로직
❌ membership bypass 로직
❌ 독립 권한 테이블 생성
```

**판정**: F11 은 **두 테이블의 책임을 명시적으로 분리** —
- `service_memberships` = "이 사용자가 Operator 인가" (식별)
- `role_assignments` = "이 사용자가 무엇을 할 수 있는가" (권한)

그리고 **`membership bypass 로직` 명시적 금지**.

### 2.3 Seed Bootstrap Migration 의 의도

[migrations/20260927100000-BootstrapCanonicalSeedAccounts.ts](apps/api-server/src/database/migrations/20260927100000-BootstrapCanonicalSeedAccounts.ts):

```text
생성 규칙:
  users → service_memberships → role_assignments → domain profile
  (F11 User/Operator Freeze 준수)
```

각 BOOTSTRAP_ACCOUNTS 는 `smRole` (service_memberships.role) 와 `raRole` (role_assignments.role) 을 **둘 다** 정의:

```ts
{
  email: 'neture-operator@o4o.com',
  serviceKey: 'neture',
  smRole: 'operator',          // service_memberships.role
  raRole: 'neture:operator',   // role_assignments.role
},
```

→ **canonical 설계 의도는 두 테이블 모두 채워야 함**. seed 가 둘 다 생성하도록 정의됨.

### 2.4 종합 — Canonical Source 책임

| 역할 | Canonical Table | 책임 |
|-----|----------------|------|
| "이 사용자가 Operator 인가" | `service_memberships` (F11 §1.2) | Identity / 식별 |
| "이 사용자가 무엇을 할 수 있는가" | `role_assignments` (F9 SSOT) | Permission / 권한 |

**둘 다 채워져 있어야 정상**. 둘 중 하나만 있는 상태는 *data drift / partial state*.

---

## 3. 실제 데이터 상태 — 추정 및 검증 필요

### 3.1 관찰된 사실

- `neture-operator@o4o.com` 로그인 시 JWT `roles: []` 반환
- F9 SSOT 에 의해 JWT roles 는 `roleAssignmentService.getRoleNames(userId)` 로 생성됨
- 따라서 **`role_assignments` 에 본 사용자의 active row 가 없음** (확정적 추정)
- 동시에 `memberships: [{neture:operator:active}]` 존재 — service_memberships 에는 row 있음

### 3.2 추정 원인 (확정 SQL 검증 필요)

가능성:

| # | 추정 원인 | 가능성 |
|---|----------|:------:|
| (a) | seed migration `20260927100000` 가 production 에 아직 미적용 (파일명 timestamp 가 2026-09-27, 현재 2026-05-23 보다 미래) | HIGH |
| (b) | 이전 다른 seed 가 이 사용자를 *service_memberships 만* 생성 (예: KPA Society initial seed) | MEDIUM |
| (c) | role_assignments row 가 한 번 생성되었다가 비활성화 / 삭제됨 | LOW |
| (d) | seed migration 의 `_upsertRoleAssignment` 호출 단계가 부분 실패함 (DO NOTHING 충돌 등) | LOW |

### 3.3 SQL 검증 (후속 WO 의 §1 사전 조사)

```sql
-- Read-only — neture-operator 의 role_assignments 실제 상태
SELECT id, role, is_active, valid_from, valid_until, scope_type, scope_id, assigned_by
FROM role_assignments
WHERE user_id = 'b0000000-b000-4000-b000-000000000005'
ORDER BY created_at DESC;

-- Read-only — 같은 패턴의 다른 service operator 들의 동일 상태 점검
SELECT u.email, sm.service_key, sm.role AS sm_role, sm.status,
       COALESCE(array_agg(ra.role) FILTER (WHERE ra.is_active), ARRAY[]::text[]) AS active_role_assignments
FROM users u
JOIN service_memberships sm ON sm.user_id = u.id AND sm.role IN ('operator', 'admin') AND sm.status = 'active'
LEFT JOIN role_assignments ra ON ra.user_id = u.id AND ra.is_active = true
WHERE u.email IN (
  'neture-operator@o4o.com', 'kpa-operator@o4o.com', 'kpa-admin@o4o.com',
  'glyco-operator@o4o.com', 'kcos-operator@o4o.com', 'kcos-admin@o4o.com'
)
GROUP BY u.email, sm.service_key, sm.role, sm.status
ORDER BY u.email;
```

→ 본 IR 의 권장 후속 WO 의 §1 단계로 사용자 승인 후 실행 권장.

---

## 4. Current Structure vs O4O Philosophy Conflict Check (필수)

| 차원 | Current | F9 / F11 / F6 SSOT | 충돌 |
|------|---------|--------------------|:----:|
| **권한 검사 single path** | `requireRole` (4 endpoint) — RA only ✓ | F9: "Guard 모두 RA 기반" | 정합 |
| **`requireOperatorAccess` (stores.routes)** | role_assignments OR membership fallback | **F11 §2 ❌ membership bypass 로직** | **위반** (명시적 forbidden pattern) |
| Guard 패턴 일관성 | 5 endpoint 중 4 endpoint = RA-only, 1 endpoint = OR membership | 정책은 *전 endpoint 일관* 가정 | **드리프트** |
| Operator 식별 ↔ 권한 검사 책임 분리 | 둘이 섞여 있음 (stores 의 fallback) | F11 §1.2: 식별=membership, 권한=RA | **혼선** |
| 데이터 상태 (seed 의도) | partial — membership 있고 RA 없음 | seed 는 둘 다 생성 의도 | **데이터 드리프트** |
| `injectServiceScope` 의 membership fallback | scope 결정에 membership 사용 — 권한이 아니라 *어느 서비스* 인지만 | F11 ✓ (scope 결정은 membership 가능) | 정합 |

**종합 판정: 부분 충돌**

- `requireOperatorAccess` (stores) 는 **F11 §2 의 "membership bypass 로직" 명시적 금지 조항 위반**.
- 데이터 상태도 partial — F9+F11 의 **양 테이블 채움 의도** 위반.
- 그러나 *식별과 권한의 책임 분리* 원칙 자체는 정합. 위반은 stores.routes 의 fallback 과 데이터 드리프트 2 곳에 국한.

---

## 5. 운영자 권한의 Canonical Source 판정

**Canonical Path (F9 + F11 종합)**:

```text
Identity / Operator 식별:
  service_memberships (status=active, role in {operator, admin, ...})

Permission / 권한 검사:
  role_assignments (is_active=true, role=<service>:<operator|admin|...>)

JWT.roles:
  roleAssignmentService.getRoleNames(userId) → user.roles
  (membership 미반영 — F9 SSOT)

Guard:
  requireRole / requireAdmin / requireScope — 전부 RA 기반
```

→ **role_assignments 가 권한 검사의 canonical source**. service_memberships 는 식별 목적이지 권한 부여 수단이 아님.

→ 따라서 정상 운영자는 *두 테이블 모두 row 보유*. membership-only 상태는 **data drift 이지 정책 대안이 아님**.

---

## 6. 두 가지 수정 방향 비교

### Option A — 데이터 보정 (Canonical, F9+F11 정합)

**내용**:

1. seed migration 을 production 에 적용 (또는 즉시 실행 가능한 Admin API 보정 스크립트)
2. service_memberships 가 있고 role_assignments 가 없는 모든 operator 계정에 대해 `<service>:<smRole>` 형식의 `role_assignments` row 생성
3. `requireOperatorAccess` (stores.routes) 를 표준 `requireRole` 로 되돌림 — F11 §2 위반 제거

**장점**

- F9 + F11 정합 회복
- 5 endpoint 의 guard 패턴 통일
- F11 §2 명시적 금지 조항 (membership bypass) 위반 제거
- canonical 한 single path 유지 — 신규 endpoint 추가 시 default 가 안전

**단점**

- 데이터 보정 1회 필요 — 영향 받는 계정 수 미상 (운영 SQL 로 확인 필요)
- stores.routes 의 fallback 제거 시 *현재 membership-only 상태인 운영자가 즉시 차단됨* → 데이터 보정과 코드 변경이 **동시 / 순서 보장** 필요

**적합 상황**: F9+F11 SSOT 의 일관성 회복을 우선하는 경우 (본 IR 권장)

### Option B — Middleware 보강 (`requireRole` 에 membership-aware fallback 추가)

**내용**:

1. `requireRole` 의 내부 로직을 변경: role_assignments 미보유 시 service_memberships 의 role 도 인식
2. 모든 endpoint 에 자동 적용

**장점**

- 데이터 보정 불필요
- 일관성 회복 — 5 endpoint 동일 동작

**단점**

- **F9 SSOT 명시적 위반** — "Guard 모두 RA 기반" 조항. role_assignments 가 더 이상 권한의 single source 아님
- **F11 §2 명시적 위반** — "membership bypass 로직" forbidden
- JWT `user.roles` 와 실제 권한이 분리됨 — 호출자가 자기 권한을 JWT 만으로 알 수 없음
- canonical 책임 분리 (identity vs permission) 가 혼선됨
- 신규 endpoint 작성 시 guard 의도가 모호해짐

**적합 상황**: F9/F11 정책을 amendment 하는 경우 (큰 영향 — 권장하지 않음)

### Option C — 현 상태 유지 (Status quo)

**내용**: 변경 없음.

**단점**

- 4 endpoint 의 403 잔존 — 일부 operator UI 가 깨진 채로 운영됨
- guard 패턴 비일관성 — silent drift 누적
- F11 §2 위반 (stores.routes) 누적

**적합 상황**: 없음 — 추천 불가.

### 비교 매트릭스

| 항목 | A (데이터 보정) | B (Middleware 보강) | C (현 상태) |
|------|:--------------:|:------------------:|:----------:|
| F9 정합 | ✅ | ❌ | 부분 |
| F11 §1.2 정합 | ✅ | ❌ | 부분 |
| F11 §2 forbidden patterns | ✅ (보정 후 stores 의 fallback 제거) | ❌ | ❌ |
| Guard 패턴 일관성 | ✅ | ✅ | ❌ |
| 데이터 보정 부담 | 1회 (운영) | 0 | 0 |
| 신규 endpoint 안전성 | ✅ | △ | ❌ |
| 정책 신뢰도 | 회복 | 약화 | 누적 약화 |

---

## 7. 본 IR 의 권장 방향

### 7.1 권장: **Option A — 데이터 보정 + stores.routes fallback 제거**

**근거**:

1. **F9 + F11 명시 SSOT 정합** — role_assignments 가 권한 single source 이며, membership bypass 는 forbidden pattern. 두 정책 모두 Option A 와 정합.
2. **Seed 의도 회복** — `BootstrapCanonicalSeedAccounts` 가 이미 둘 다 채우도록 정의됨. partial state 는 마이그레이션 미적용 또는 historical drift 일 뿐, 의도된 상태가 아님.
3. **신규 endpoint 안전성** — 새로 추가되는 operator endpoint 가 `requireRole` 만 사용해도 자동으로 정합 동작.
4. **정책 신뢰도 회복** — F11 §2 forbidden pattern 위반 1건 제거.

### 7.2 실행 순서 (제안 — 별도 WO)

```text
[Phase 1 — 데이터 사전 조사 (read-only)]
  1.1  운영 DB 에서 membership-only operator 의 정확한 수 / 명단 확정
       (§3.3 SQL 사용)
  1.2  영향 범위 보고 (사용자 검토)

[Phase 2 — 데이터 보정 (write)]
  2.1  seed migration 강제 실행 (또는 별도 보정 스크립트로 RA upsert)
  2.2  보정 후 같은 SQL 로 검증 — membership-only 잔여 0 확인
  2.3  영향 받은 사용자 재로그인 시 JWT.roles 정상 발급 확인

[Phase 3 — 코드 변경]
  3.1  stores.routes.ts 의 requireOperatorAccess → requireRole 표준화
       (membership bypass 제거)
  3.2  injectServiceScope 의 membership fallback 도 검토 — scope 결정용이라
       완전 제거할 필요는 없으나, log 추가 권장 (membership-only 발견 시 경고)

[Phase 4 — 검증]
  4.1  5 endpoint 모두 동일 동작 확인 — service operator (RA 보유) 정상,
       membership-only 는 *원천 차단 + 보정 안내*
  4.2  데이터 보정 후에는 membership-only 자체가 발생하지 않아야 함
```

순서: **1 (사전 조사) → 2 (데이터 보정) → 3 (코드 정합) → 4 (검증)**. Phase 2 와 Phase 3 의 동시성 확보 중요 (Phase 3 만 먼저 적용하면 미보정 운영자 차단).

---

## 8. 본 IR 이 결정하지 않는 것

- 실제 데이터 보정 (별도 WO 의 Phase 2)
- `requireOperatorAccess` 와 `injectServiceScope` 의 정확한 변경 범위 (별도 WO 의 Phase 3)
- 운영 환경에서 영향 받는 정확한 사용자 수 (Phase 1 의 SQL 검증 결과로 확정)
- F11 §2 "membership bypass 로직" 의 *허용 범위 amendment* — Option A 권장이므로 불필요

---

## 9. WO 후보

| # | 산출물 | 비고 |
|---|--------|------|
| **W1** | `WO-O4O-OPERATOR-ROLE-ASSIGNMENT-REPAIR-AND-GUARD-NORMALIZATION-V1` | 본 IR 권장 Option A 전체 — 데이터 보정 + stores.routes 정상화 |
| W2 (선행) | `IR-O4O-OPERATOR-ROLE-ASSIGNMENT-DATA-AUDIT-V1` | W1 의 Phase 1 사전 조사 — 영향 사용자 명단·수 확정 (read-only SQL) |
| W3 (선택) | `IR-O4O-INJECTSERVICESCOPE-MEMBERSHIP-FALLBACK-POLICY-V1` | `injectServiceScope` 의 membership fallback 정책화 (scope 결정에서는 membership 사용 허용으로 명문화) |

순서: **W2 → W1 → W3 (선택)**.

---

## 10. 사용자 확정 필요 항목

| # | 항목 | 본 IR 권고 |
|---|------|:----------:|
| 1 | Canonical source 판정 — role_assignments | **확정** (§2, §5) |
| 2 | 수정 방향 — A / B / C 중 선택 | **A** (§7.1) |
| 3 | 데이터 보정 선행 여부 | **권장** — W2 IR (Phase 1) → W1 WO (Phase 2-4) |
| 4 | `requireOperatorAccess` 제거 시 운영자 차단 risk | 데이터 보정 *완료 이후* 코드 변경 (Phase 2 → Phase 3 순서 보장) |
| 5 | `injectServiceScope` 의 membership fallback 처리 | **유지** (scope 식별 용도, F11 §1.2 와 정합). W3 IR 후속 정합화 검토 가능 |
| 6 | F11 §2 forbidden pattern 의 *strict 해석* 유지 여부 | **strict 유지** — `requireOperatorAccess` 는 historical 워크어라운드이며 정책 amendment 대상 아님 |

---

## 11. 부록 — Endpoint 별 200/403 원인 요약

| Endpoint | Middleware 첫 차단 지점 | neture-operator 의 통과/차단 |
|----------|------------------------|----------------------------|
| `/operator/members` | `requireRole([..., 'neture:operator', ...])` ([membership.routes.ts:21](apps/api-server/src/routes/operator/membership.routes.ts#L21)) | **차단** — `roleAssignmentService.hasAnyRole` false (RA 없음) |
| `/operator/members/stats` | 동일 | **차단** |
| `/operator/stores` | `requireOperatorAccess` ([stores.routes.ts:62](apps/api-server/src/routes/operator/stores.routes.ts#L62)) | **통과** — `memberships.some(m=>m.status==='active')` true |
| `/operator/products` | `requireRole([...])` ([products.routes.ts:19](apps/api-server/src/routes/operator/products.routes.ts#L19)) | **차단** |
| `/operator/analytics/*` | `requireOperatorOrAdmin = requireRole([...])` ([analytics.routes.ts:24](apps/api-server/src/routes/operator/analytics.routes.ts#L24)) | **차단** |

→ 본 IR 권장 Option A 적용 후 동작 (데이터 보정 + stores 정상화):

| Endpoint | 변경 후 |
|----------|---------|
| 모든 5 endpoint | 정상 운영자 (RA + SM 둘 다 보유) → 통과. membership-only (RA 없음) → 일관 차단 + 보정 필요 안내 |

---

*Version: V1 (2026-05-23)*
*Status: Investigation Report — 사용자 확정 대기*
*Next: §10 확정 → W2 IR (데이터 사전 조사) → W1 WO (보정 + 정상화)*

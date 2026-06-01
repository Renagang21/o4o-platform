# IR-O4O-AUTH-RBAC-COMPLEXITY-AUDIT-V1

> **Investigation Report — Auth / RBAC / Membership / Routing 구조 감사**
>
> Date: 2026-03-25
> Status: Complete
> Scope: Backend auth middleware, Frontend routing guards, RBAC SSOT, Supplier flow

---

## 1. 인증 구조도 (Auth Structure Diagram)

```
┌─────────────────────────────────────────────────────────────────────┐
│  LOGIN FLOW                                                         │
│                                                                     │
│  POST /auth/login                                                   │
│    │                                                                │
│    ├─ 1. bcrypt.compare(password, hash)                             │
│    ├─ 2. roleAssignmentService.getRoleNames(userId)                 │
│    │      → SELECT role FROM role_assignments WHERE user_id=$1      │
│    ├─ 3. membershipService.getUserMemberships(userId)               │
│    │      → SELECT * FROM service_memberships WHERE user_id=$1      │
│    ├─ 4. deriveUserScopes(roles, memberships)                       │
│    │      → ['neture:admin', 'neture:operator', ...]                │
│    └─ 5. generateTokens(user, roles, domain)                        │
│           → JWT { sub, roles[], memberships[], scopes[], tokenType } │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  TOKEN → CONTEXT (Frontend)                                         │
│                                                                     │
│  AuthContext (React)                                                 │
│    ├─ accessToken, refreshToken                                     │
│    ├─ user: { id, email, name, role, roles[] }                      │
│    │         ↑ mapApiRoles(apiRoles) strips prefixes                │
│    │         ↑ 'neture:admin' → 'admin'                             │
│    ├─ memberships: ServiceMembership[]                              │
│    └─ scopes: string[]                                              │
│                                                                     │
│  getPrimaryDashboardRoute(roles, memberships)                       │
│    ├─ roles[0] === 'super_admin' → '/admin'                         │
│    ├─ roles[0] === 'admin'       → '/admin'                         │
│    ├─ roles[0] === 'operator'    → '/operator'                      │
│    ├─ membership(neture, active) → '/supplier/dashboard'            │
│    └─ default                    → '/'                              │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ROUTE GUARDS (Frontend)                                            │
│                                                                     │
│  OperatorRoute                                                      │
│    └─ CHECK: memberships.some(m =>                                  │
│         m.serviceKey === 'neture' && m.status === 'active')         │
│       ⚠️ role 미검증 — membership만 확인                              │
│                                                                     │
│  AdminRoute                                                         │
│    └─ CHECK: roles.includes('admin') || roles.includes('super_admin')│
│       ⚠️ membership 미검증 — role만 확인                              │
│                                                                     │
│  SupplierRoute / PartnerRoute                                       │
│    └─ ❌ Route-level guard 없음 — Layout 내부에서만 체크               │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  BACKEND MIDDLEWARE CHAIN                                           │
│                                                                     │
│  requireAuth (JWT 기반, DB 쿼리 없음)                                │
│    └─ req.user = { id, email, roles: payload.roles }                │
│                                                                     │
│  requireNetureScope('neture:operator')                              │
│    └─ createMembershipScopeGuard() →                                │
│       ├─ Platform bypass: 'platform:super_admin' in scopes → PASS   │
│       ├─ Scope check: requiredScope in scopes → PASS                │
│       └─ ⚠️ Legacy compat: unprefixed 'operator' →                  │
│            augment to 'platform:super_admin' scopes → PASS          │
│                                                                     │
│  requireAdmin (DB 쿼리, 실시간)                                      │
│    └─ roleAssignmentService.hasAnyRole(userId,                      │
│         ['admin','super_admin','operator'])                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. 역할/멤버십 책임표 (Role / Membership Responsibility Matrix)

### 2-A. 데이터 소스

| 테이블 | 역할 | SSOT 여부 | 비고 |
|--------|------|:---------:|------|
| `role_assignments` | RBAC 역할 부여 | **YES** | `(user_id, role, domain, is_active)` |
| `service_memberships` | 서비스 가입/멤버십 | YES (멤버십) | `(user_id, service_key, status, role)` |
| `users` | Identity only | — | `role`, `roles` 컬럼 삭제됨 (Phase 3-E) |
| `user_roles` | — | — | 테이블 삭제됨 (Phase 3-E) |

### 2-B. 역할 포맷

| 포맷 | 예시 | 저장 위치 | 사용처 |
|------|------|----------|--------|
| Platform-prefixed | `platform:super_admin` | role_assignments | Backend scopes, middleware bypass |
| Service-prefixed | `neture:admin`, `neture:operator` | role_assignments | Backend scope guard |
| Unprefixed | `admin`, `operator`, `supplier` | Frontend (mapApiRoles 후) | Frontend route guard, dashboard routing |
| Legacy unprefixed | `operator` | role_assignments (잔존 가능) | Legacy compat bypass 트리거 |

### 2-C. 각 Guard가 검증하는 항목

| Guard | Role 검증 | Membership 검증 | Scope 검증 | DB 쿼리 |
|-------|:---------:|:---------------:|:----------:|:-------:|
| **requireAuth** | JWT→req.user.roles | — | — | ❌ |
| **requireAdmin** | RA table 직접 조회 | — | — | ✅ |
| **requireNetureScope** | — | — | JWT scopes + legacy compat | ❌ |
| **OperatorRoute** (FE) | — | ✅ serviceKey+status | — | ❌ |
| **AdminRoute** (FE) | ✅ roles.includes | — | — | ❌ |
| **SupplierRoute** (FE) | — | — | — | ❌ (guard 없음) |

---

## 3. 공급자 오인식 원인 — 1차 결론

### 근본 원인 3가지

#### 원인 1: OperatorRoute — Role 미검증 (Critical)

**파일**: `services/web-neture/src/components/auth/RoleGuard.tsx`

```tsx
// OperatorRoute 현재 로직
const hasOperatorAccess = memberships.some(
  m => m.serviceKey === 'neture' && m.status === 'active'
);
```

**문제**: `neture` 서비스에 active membership이 있으면 role과 무관하게 `/operator/*` 접근 가능.
Supplier도 `service_memberships`에 `(neture, active)` 레코드가 있으므로 **이 guard를 통과**한다.

**경로**: Supplier 로그인 → roles=['supplier'], memberships=[{neture, active}] → OperatorRoute guard 통과 → Operator 대시보드 접근

#### 원인 2: mapApiRoles() prefix 제거 후 충돌 (Medium)

**파일**: `packages/auth-utils/src/mapApiRoles.ts`

```
Backend: ['neture:operator', 'neture:supplier']
  ↓ mapApiRoles()
Frontend: ['operator', 'supplier']
```

prefix가 제거되면 서로 다른 서비스의 동일 역할명이 충돌할 수 있다.
`getPrimaryDashboardRoute()`는 `roles[0]`을 기준으로 대시보드를 결정하므로, 배열 순서에 의존하는 불안정한 구조이다.

#### 원인 3: Legacy Role Bypass in Membership Guard (Medium)

**파일**: `apps/api-server/src/common/middleware/membership-guard.middleware.ts`

```ts
// Legacy compat: unprefixed 'operator' role
if (userRoles.includes('operator')) {
  augmentedScopes.push('platform:super_admin');
}
```

`role_assignments`에 unprefixed `operator` 레코드가 잔존하면, 해당 사용자가 `platform:super_admin` 스코프를 획득하여 모든 서비스의 scope guard를 bypass한다.

---

## 4. 복잡성 원인 목록

| # | 원인 | 영향 범위 | 심각도 |
|---|------|----------|--------|
| C1 | **Role 이중 표현** — Backend prefixed vs Frontend unprefixed | 전체 | High |
| C2 | **Guard 불일치** — OperatorRoute(membership only) vs AdminRoute(role only) vs Backend(scope) | 라우팅 전체 | High |
| C3 | **Scope 파생 로직 분산** — `deriveUserScopes()` + `membershipGuard augment` + `requireAdmin DB query` 3곳에서 권한 판단 | 미들웨어 | High |
| C4 | **Legacy compat 코드** — unprefixed role → platform:super_admin 승격 | membership-guard | Medium |
| C5 | **Supplier/Partner route guard 부재** — Layout 내부 체크에만 의존 | 프론트엔드 | Medium |
| C6 | **Dashboard 라우팅이 roles[0] 순서에 의존** — 역할 추가/삭제 시 대시보드 변경 가능 | 네비게이션 | Medium |
| C7 | **requireAuth(JWT) vs requireAdmin(DB)** 일관성 부재 — 동일 요청에서 다른 데이터 소스 참조 가능 | 인증 미들웨어 | Low |
| C8 | **freshenUserContext() 미사용** — 정의되어 있으나 login 외 경로에서 호출 안 됨 → role 변경 시 JWT 갱신까지 지연 | 세션 관리 | Low |

---

## 5. 정비 제안안

### Option A: Minimal Fix (최소 수정 — 권장)

> 목표: 공급자 오인식 차단 + Legacy bypass 제거, 구조 변경 최소화

| 단계 | 작업 | 파일 | 변경량 |
|------|------|------|--------|
| A-1 | **OperatorRoute에 role 검증 추가** | `RoleGuard.tsx` | ~5줄 |
| | `hasOperatorAccess = membership(active) AND roles.includes('operator' or 'admin' or 'super_admin')` | | |
| A-2 | **SupplierRoute guard 신규 추가** | `RoleGuard.tsx` | ~15줄 |
| | `membership(neture, active) AND roles.includes('supplier')` | | |
| A-3 | **Legacy compat bypass 제거** | `membership-guard.middleware.ts` | ~10줄 삭제 |
| | unprefixed 'operator' → super_admin 승격 로직 제거 | | |
| A-4 | **role_assignments 잔존 unprefixed role 마이그레이션** | Migration | SQL 1건 |
| | `UPDATE role_assignments SET role = 'platform:' || role WHERE role NOT LIKE '%:%'` | | |

**장점**: 변경 최소, 즉시 적용 가능, 기존 구조 유지
**단점**: 이중 표현(C1) 미해결, Guard 불일치(C2) 부분 해소만

---

### Option B: Guard Unification (Guard 통합)

> 목표: Frontend guard를 Backend scope 체계와 일치시킴

| 단계 | 작업 | 파일 | 변경량 |
|------|------|------|--------|
| B-1 | Option A 전체 포함 | — | — |
| B-2 | **Frontend에서 prefixed role 사용** | `AuthContext`, `mapApiRoles` | ~30줄 |
| | `mapApiRoles()` 제거, `roles[]`를 prefixed 그대로 저장 | | |
| B-3 | **통합 RouteGuard 컴포넌트** | `RoleGuard.tsx` | ~50줄 |
| | `<RouteGuard requiredScope="neture:operator">` — scope 기반 단일 guard | | |
| B-4 | **getPrimaryDashboardRoute를 scope 기반으로 전환** | `auth-utils` | ~20줄 |
| | `scopes.includes('neture:operator')` → '/operator' | | |

**장점**: Frontend/Backend guard 일치, prefix 충돌 해소(C1, C2 해결)
**단점**: auth-utils 패키지 변경 → 5개 web 서비스 전체 영향

---

### Option C: Full RBAC Refactor (완전 정비)

> 목표: 인증/인가 단일 경로화

| 단계 | 작업 |
|------|------|
| C-1 | Option B 전체 포함 |
| C-2 | **requireAuth에서 scope 파생까지 통합** — JWT에 scopes만 포함, roles/memberships는 별도 조회 엔드포인트로 분리 |
| C-3 | **freshenUserContext()를 token refresh 시 자동 호출** — role 변경 즉시 반영 |
| C-4 | **Scope Guard 단일 미들웨어** — requireNetureScope, requireAdmin, membership-guard를 `requireScope(scope)` 하나로 통합 |

**장점**: 완전한 구조 정리, 향후 서비스 추가 시 일관성 보장
**단점**: 대규모 변경, F10(O4O Core Freeze) 해제 WO 필요, 전체 서비스 테스트 필수

---

### 권장: **Option A 즉시 실행 → Option B 다음 분기 계획**

- Option A만으로 공급자 오인식(원인 1, 3)이 차단됨
- Option B는 F1(Operator OS) baseline 다음 리비전 시 통합 진행
- Option C는 현재 불필요 — 서비스 6개 수준에서 복잡성 관리 가능

---

## 부록: 주요 파일 위치

| 파일 | 역할 |
|------|------|
| `apps/api-server/src/common/middleware/auth/authentication.middleware.ts` | requireAuth |
| `apps/api-server/src/common/middleware/auth/authorization.middleware.ts` | requireAdmin |
| `apps/api-server/src/common/middleware/membership-guard.middleware.ts` | createMembershipScopeGuard |
| `apps/api-server/src/utils/token.utils.ts` | JWT 생성 (generateTokens) |
| `apps/api-server/src/utils/scope-assignment.utils.ts` | deriveUserScopes |
| `apps/api-server/src/services/auth/auth-context.helper.ts` | freshenUserContext |
| `services/web-neture/src/components/auth/RoleGuard.tsx` | OperatorRoute, AdminRoute |
| `packages/auth-utils/src/mapApiRoles.ts` | prefix 제거 변환 |
| `packages/auth-utils/src/getPrimaryDashboardRoute.ts` | 대시보드 라우팅 결정 |

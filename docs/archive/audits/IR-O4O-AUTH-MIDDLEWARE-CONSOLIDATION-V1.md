# IR-O4O-AUTH-MIDDLEWARE-CONSOLIDATION-V1

> **Auth Middleware 통합 조사 보고서**
> Date: 2026-03-15
> Status: Investigation Complete — WO 실행 준비 완료

---

## 1. 조사 목적

O4O Platform의 인증/인가(Auth/RBAC) 미들웨어가 **두 개의 독립적 시스템**으로 분리 운영되고 있어, 역할 검사 결과가 불일치하는 버그가 반복 발생하고 있다. 본 조사는 통합 WO 실행 전 전체 구조를 파악하고, 문제 영역을 식별하며, 마이그레이션 범위를 확정하는 것이 목적이다.

**목표 구조:**
- `permission.middleware.ts` 제거 → `auth.middleware.ts` 단일 통합
- JWT = **identity only** (userId, email, tokenType)
- `role_assignments` = **RBAC 단일 소스 of truth** (DB 실시간 조회)

---

## 2. Core Auth 구조 (Login → JWT → Middleware)

### 2.1 로그인 흐름

```
User Login Request
  → authentication.service.ts :: handleEmailLogin()
    → roleAssignmentService.getRoleNames(user.id)  ← role_assignments 테이블 조회
    → tokenUtils.generateTokens(user, userRoles, domain, memberships)
      → JWT payload: { userId, email, roles: [...], memberships: [...] }
    → Response: { tokens: { accessToken, refreshToken }, user: {...} }
```

**핵심**: JWT `roles` 배열은 **로그인 시점의 role_assignments 스냅샷**이다. 이후 role_assignments 변경 시 JWT 갱신 없이는 반영되지 않는다.

### 2.2 JWT Payload 구조

```typescript
// token.utils.ts :: generateAccessToken()
{
  userId: string,
  email: string,
  role: string,         // roles[0] (legacy 호환)
  roles: string[],      // role_assignments에서 가져온 역할 배열 (스냅샷)
  memberships: [...],   // service_memberships 스냅샷
  tokenType: 'platform' | 'service' | 'guest',
  iss: 'o4o-api-server',
  aud: 'o4o-platform',
}
```

### 2.3 requireAuth 동작 (auth.middleware.ts:62)

```
Request → extractToken(Bearer header or httpOnly cookie)
  → verifyAccessToken(token)   ← JWT 서명/만료/발급자 검증
  → DB: User.findOne({ id: payload.userId })
  → user.roles = payload.roles || []       ← JWT 스냅샷 할당 (DB 조회 아님!)
  → user.memberships = payload.memberships
  → req.user = user
```

**주의**: `requireAuth`는 `user.roles`를 JWT payload에서 가져온다. DB `role_assignments`를 재조회하지 않는다.

---

## 3. Middleware 이원 구조

### 3.1 permission.middleware.ts (JWT 기반)

| 위치 | `apps/api-server/src/middleware/permission.middleware.ts` |
|------|----------------------------------------------------------|
| RBAC 소스 | `user.roles` (JWT payload 스냅샷) |
| 매칭 방식 | `User.hasRole()` → endsWith 매칭 |
| 동기/비동기 | **동기** (DB 조회 없음) |
| 역할 갱신 | **로그인 시점 고정** → 역할 변경 후 재로그인 필요 |

**Export 목록:**
| 함수 | 설명 | 사용 횟수 |
|------|------|-----------|
| `requireAdmin` | `requireAnyRole([ADMIN, SUPER_ADMIN, OPERATOR])` | ~80 routes |
| `requireAnyRole` | JWT roles 기반 다중 역할 검사 | ~20 routes |
| `requireRole` | JWT roles 기반 단일 역할 검사 | 소수 |
| `requireSuperAdmin` | `requireRole(SUPER_ADMIN)` | 소수 |
| `requireSelfOrAdmin` | 자기 리소스 or Admin | 소수 |
| `ensureAuthenticated` | `req.user` 존재 확인 | ~5 routes |
| `requirePermission` | JWT permission 검사 | 소수 |
| `requireAnyPermission` | JWT permission 다중 검사 | 소수 |

**사용 파일 (26개 import):**

```
routes/admin/users.routes.ts         ← requireAnyRole, requireAdmin
routes/admin/suppliers.routes.ts     ← requireAnyRole, requireAdmin
routes/admin/seller-authorization.routes.ts ← requireAdmin
routes/admin/dashboard.routes.ts     ← requireAdmin
routes/admin/apps.routes.ts          ← requireAdmin
routes/settingsRoutes.ts             ← requireAdmin
routes/ai-admin.routes.ts            ← requireAdmin
routes/ai-query.routes.ts            ← requireAdmin
routes/cpt.ts                        ← requireAdmin
routes/service-monitor.routes.ts     ← requireAdmin
routes/v1/admin.routes.ts            ← requireAdmin
routes/v1/acf.routes.ts              ← requireAdmin
routes/v1/customizer.routes.ts       ← requireAdmin
routes/v1/customizer-presets.routes.ts ← requireAdmin
routes/v1/apps.routes.ts             ← requireAdmin
routes/v1/theme.routes.ts            ← requireAdmin
routes/v1/plugins.routes.ts          ← requireAdmin
routes/partner.routes.ts             ← requireAnyRole
routes/operator/stores.routes.ts     ← requireAnyRole
routes/operator/products.routes.ts   ← requireAnyRole
routes/operator/membership.routes.ts ← requireAnyRole
routes/signage/signage.routes.ts     ← ensureAuthenticated
modules/operator/operator-copilot.controller.ts ← requireAdmin
modules/cpt-acf/routes/cpt.routes.ts ← requireAdmin
modules/cpt-acf/routes/acf.routes.ts ← requireAdmin
middleware/index.ts                  ← re-export
```

### 3.2 auth.middleware.ts (DB 기반, Core Frozen)

| 위치 | `apps/api-server/src/common/middleware/auth.middleware.ts` |
|------|-----------------------------------------------------------|
| RBAC 소스 | `roleAssignmentService.hasAnyRole(userId, roles)` → DB 실시간 조회 |
| 매칭 방식 | `roles.includes(a.role)` → **exact string match** |
| 동기/비동기 | **비동기** (DB query per request) |
| 역할 갱신 | **즉시 반영** (role_assignments 변경 즉시 적용) |
| Freeze | Core Freeze F10 (2026-03-11) |

**Export 목록:**
| 함수 | 설명 | 사용 횟수 |
|------|------|-----------|
| `requireAuth` | JWT 검증 + DB User 조회 + roles 할당 | ~200+ routes |
| `requireAdmin` | DB role_assignments 실시간 조회 (admin, super_admin, operator, platform:*) | ~30 routes |
| `requireRole(roles)` | DB role_assignments 실시간 조회 (generic) | ~20 routes |
| `optionalAuth` | 선택적 인증 | ~20 routes |
| `requirePermission` | DB 기반 권한 검사 | 소수 |
| `requirePlatformUser` | Service token 거부 | ~10 routes |
| `requireServiceUser` | Platform token 거부 | ~15 routes |
| `requireGuestUser` | Guest 전용 인증 | 소수 |

**사용 파일:** 125개 파일에서 import

### 3.3 이원 구조 비교표

| 속성 | permission.middleware | auth.middleware |
|------|----------------------|-----------------|
| RBAC 소스 | JWT payload (스냅샷) | role_assignments DB (실시간) |
| `requireAdmin` 역할 | `[admin, super_admin, operator]` | `[admin, super_admin, operator, platform:admin, platform:super_admin]` |
| 역할 매칭 | `endsWith` (cross-service 위험) | `exact match` |
| 역할 갱신 | 재로그인 필요 | 즉시 반영 |
| DB 부하 | 없음 | 요청당 1 query |
| `neture:operator` → `operator` | **매칭됨** (endsWith) | **매칭 안됨** (exact) |
| 동결 상태 | 미동결 | Core Freeze F10 |

---

## 4. JWT Role Snapshot 의존 구조

### 4.1 JWT roles가 사용되는 경로

`requireAuth`가 `user.roles = payload.roles`로 설정한 후, 이 값이 다음 경로로 소비된다:

1. **permission.middleware.ts** — `user.hasRole()`, `user.hasAnyRole()` → JWT 기반
2. **membership-guard.middleware.ts** — `user.roles?.includes('platform:super_admin')` → JWT 기반 bypass
3. **membership-guard.middleware.ts** — `user.roles?.some(r => r.startsWith(servicePrefix))` → JWT 기반 bypass
4. **User.ts :: hasRole()** — `this.roles.some(r => r.endsWith(':${roleStr}'))` → JWT 기반
5. **User.ts :: isAdmin()** — `this.hasAnyRole([SUPER_ADMIN, ADMIN])` → JWT 기반

### 4.2 CRITICAL: JWT 직접 디코딩 사용처

| 위치 | 심각도 | 설명 |
|------|--------|------|
| 각 서비스 Auth 미들웨어 내 `toPublicData()` | MEDIUM | `roles` 배열을 클라이언트에 전달 — 스냅샷 기반 |
| `membership-guard.middleware.ts:62` | HIGH | `user.roles?.includes('platform:super_admin')` — JWT 기반 bypass |
| `membership-guard.middleware.ts:70` | HIGH | `user.roles?.some(r => r.startsWith(servicePrefix))` — JWT 기반 service role bypass |

### 4.3 JWT Staleness 시나리오

```
1. 사용자 로그인 → JWT roles: ['user']
2. Admin이 role_assignments에 'neture:operator' 추가
3. 사용자가 Operator Dashboard 접근 시도
   - permission.middleware: user.hasRole('operator')
     → roles.some(r => r.endsWith(':operator')) → false ('user'만 있음)
     → 403 Forbidden ❌
   - auth.middleware: roleAssignmentService.hasAnyRole(userId, ['neture:operator'])
     → DB 실시간 조회 → true
     → 200 OK ✅
4. 사용자가 재로그인해야 permission.middleware도 통과
```

이 시나리오가 **WO-O4O-NETURE-REGISTRATION-LIST-NOT-SHOWING-V1**의 실제 원인이었다.

---

## 5. role_assignments RBAC 구조

### 5.1 테이블 구조

```sql
role_assignments (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  role VARCHAR(50) NOT NULL,   -- e.g., 'neture:operator', 'platform:admin'
  is_active BOOLEAN DEFAULT true,
  assigned_by UUID,
  assigned_at TIMESTAMP,
  expires_at TIMESTAMP,
  UNIQUE (user_id, role, is_active)
)
```

### 5.2 roleAssignmentService API

```typescript
// role-assignment.service.ts
getRoleNames(userId: string): Promise<string[]>           // 활성 역할 이름 배열
getActiveRoles(userId: string): Promise<RoleAssignment[]>  // 활성 역할 엔티티 배열
hasAnyRole(userId: string, roles: string[]): Promise<boolean> // roles.includes(a.role) 매칭
hasPermission(userId: string, permission: string): Promise<boolean>
```

### 5.3 auth.middleware.ts 역할 검사 흐름

```
requireAdmin:
  roleAssignmentService.hasAnyRole(user.id, [
    'admin', 'super_admin', 'operator',
    'platform:admin', 'platform:super_admin'
  ])
  → SELECT * FROM role_assignments WHERE user_id = $1 AND is_active = true
  → result.some(a => roles.includes(a.role))  // exact match
```

### 5.4 RBAC Freeze (F9)

> `docs/rbac/RBAC-FREEZE-DECLARATION-V1.md`
> - `role_assignments`가 유일한 RBAC 소스
> - `users.role`, `roles` 테이블, `user_roles` 테이블 제거 완료
> - Write-path 통일: 모든 역할 할당은 `roleAssignmentService`를 통해서만

---

## 6. Service Scope RBAC 구조

### 6.1 서비스별 Scope Guard 목록

| 서비스 | Guard | Config | 정의 위치 |
|--------|-------|--------|-----------|
| **Neture** | `requireNetureScope` | `NETURE_SCOPE_CONFIG` | `middleware/neture-scope.middleware.ts:12` |
| **KPA** | `requireKpaScope` | `KPA_SCOPE_CONFIG` | `routes/kpa/kpa.routes.ts:131` |
| **GlycoPharm** | `requireGlycopharmScope` | `GLYCOPHARM_SCOPE_CONFIG` | `routes/glycopharm/glycopharm.routes.ts:69` |
| **K-Cosmetics** | `requireCosmeticsScope` | `COSMETICS_SCOPE_CONFIG` | `routes/cosmetics/cosmetics.routes.ts:49` |
| **GlucoseView** | `requireGlucoseViewScope` | `GLUCOSEVIEW_SCOPE_CONFIG` | `routes/glucoseview/glucoseview.routes.ts:36` |
| **KPA LMS** | `kpaLmsScopeGuard` | (특수) | `middleware/kpa-lms-scope-guard.ts:64` |

### 6.2 Scope Guard 동작 흐름

모든 서비스 Scope Guard는 `createMembershipScopeGuard(config)` → `@o4o/security-core :: createServiceScopeGuard(config)` 구조:

```
Request → createMembershipScopeGuard
  1. user 존재 확인 (401)
  2. platform:super_admin bypass (config.platformBypass 시)
     → user.roles?.includes('platform:super_admin')  ← ⚠️ JWT 기반
  3. service-prefixed role bypass
     → user.roles?.some(r => r.startsWith(`${config.serviceKey}:`))  ← ⚠️ JWT 기반
  4. membership 확인 (user.memberships — JWT 기반)
     → membership 없음 → 403 MEMBERSHIP_NOT_FOUND
     → membership 비활성 → 403 MEMBERSHIP_NOT_ACTIVE
  5. membership active → createServiceScopeGuard로 위임
```

### 6.3 JWT 의존성 문제

`createMembershipScopeGuard`의 **2, 3, 4단계**가 모두 JWT payload에 의존한다:
- `user.roles` → JWT 스냅샷
- `user.memberships` → JWT 스냅샷

역할이나 멤버십이 변경되면 재로그인 전까지 scope guard 판단이 잘못될 수 있다.

---

## 7. Role Naming 구조

### 7.1 역할 명명 패턴

| 패턴 | 예시 | 용도 |
|------|------|------|
| **Bare role** | `admin`, `operator`, `user` | Platform 레벨 역할 |
| **Platform-prefixed** | `platform:admin`, `platform:super_admin` | Platform 명시적 역할 |
| **Service-prefixed** | `neture:operator`, `kpa:admin`, `glycopharm:admin` | Service 레벨 역할 |
| **Legacy enum** | `UserRole.ADMIN = 'admin'` | `types/auth.ts` Enum |

### 7.2 서비스별 역할 목록

| 서비스 | 역할들 |
|--------|--------|
| **Platform** | `admin`, `super_admin`, `operator`, `manager`, `user`, `customer` |
| **Platform (prefixed)** | `platform:admin`, `platform:super_admin` |
| **Neture** | `neture:admin`, `neture:operator`, `neture:supplier`, `neture:seller`, `neture:partner` |
| **KPA** | `kpa:admin`, `kpa:operator`, `kpa:pharmacist`, `kpa:branch_admin` |
| **GlycoPharm** | `glycopharm:admin`, `glycopharm:operator`, `glycopharm:pharmacist` |
| **K-Cosmetics** | `cosmetics:admin`, `cosmetics:operator` |
| **GlucoseView** | `glucoseview:admin`, `glucoseview:operator` |
| **Commerce** | `supplier`, `seller`, `partner`, `affiliate`, `vendor`, `business` |

### 7.3 명명 충돌 및 모호성

#### 충돌 1: Scope vs Role 구분 불명

`requireKpaScope('kpa:admin')` — `kpa:admin`이 **scope 이름**인지 **role 이름**인지 문맥 의존. scope guard는 내부적으로 `user.roles`에서 이 문자열을 매칭하므로 실질적으로 **role name = scope name**.

#### 충돌 2: Platform vs Service 중복

`admin` (bare) vs `platform:admin` (prefixed) — 같은 의미이지만 `roleAssignmentService.hasAnyRole`에서는 **별도 문자열**로 취급. `requireAdmin`(auth.middleware)은 둘 다 나열하여 해결.

#### 충돌 3: Legacy + Prefixed 공존

```typescript
// permission.middleware.ts:189
requireAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.OPERATOR])
// → ['admin', 'super_admin', 'operator']  (bare만)

// auth.middleware.ts:171
roleAssignmentService.hasAnyRole(user.id, [
  'admin', 'super_admin', 'operator',
  'platform:admin', 'platform:super_admin'
])
// → bare + prefixed 모두
```

#### 충돌 4: User.hasRole() endsWith 모호성

```typescript
// User.ts:236
return this.roles.some(r =>
  r === roleStr ||
  r === `platform:${roleStr}` ||
  r.endsWith(`:${roleStr}`)
);
```

`hasRole('operator')` 호출 시:
- `neture:operator` → **매칭** (endsWith)
- `kpa:operator` → **매칭** (endsWith)
- `cosmetics:operator` → **매칭** (endsWith)

→ **Cross-service role escalation 위험**: Neture operator가 KPA operator 권한을 얻을 수 있다.

#### 충돌 5: Commerce 역할 이중 존재

`supplier` (bare) vs `neture:supplier` (service-prefixed) — Dropshipping supplier와 Neture supplier가 다른 엔티티이지만 `hasRole('supplier')` endsWith로 둘 다 매칭.

---

## 8. User.hasRole() 구조 분석

### 8.1 구현 (User.ts:230-241)

```typescript
hasRole(role: UserRole | string): boolean {
  const roleStr = role as string;
  if (!this.roles || this.roles.length === 0) return false;
  return this.roles.some(r =>
    r === roleStr ||
    r === `platform:${roleStr}` ||
    r.endsWith(`:${roleStr}`)
  );
}

hasAnyRole(roles: (UserRole | string)[]): boolean {
  return roles.some((role: any) => this.hasRole(role));
}
```

### 8.2 문제점

| # | 문제 | 심각도 |
|---|------|--------|
| 1 | **endsWith cross-service 매칭** — `hasRole('admin')` → `kpa:admin`, `neture:admin` 모두 매칭 | HIGH |
| 2 | **JWT 스냅샷 의존** — `this.roles`는 requireAuth에서 JWT payload로 설정 | HIGH |
| 3 | **Core Freeze** — User.ts는 F10 동결이므로 hasRole() 수정 불가 | CONSTRAINT |
| 4 | **permission.middleware 전체가 이 함수에 의존** — requireAnyRole, requireRole, requireAdmin 모두 | HIGH |

### 8.3 roleAssignmentService와의 차이

| 속성 | User.hasRole() | roleAssignmentService.hasAnyRole() |
|------|---------------|-------------------------------------|
| 소스 | JWT roles (메모리) | role_assignments (DB) |
| 매칭 | endsWith (fuzzy) | includes (exact) |
| 갱신 | 재로그인 필요 | 즉시 반영 |
| 성능 | O(1) | O(query) |

---

## 9. Auth 구조 지도

### 9.1 전체 인증/인가 흐름

```
┌──────────────────────────────────────────────────────────────┐
│                    Request Flow                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─── LOGIN ──────────────────────────────────────┐          │
│  │ authentication.service.ts                       │          │
│  │  → roleAssignmentService.getRoleNames(userId)   │          │
│  │  → JWT { roles: [...snapshot...] }              │          │
│  └─────────────────────────────────────────────────┘          │
│                        │                                      │
│                        ▼                                      │
│  ┌─── requireAuth (auth.middleware.ts:62) ────────┐          │
│  │ JWT 검증 → DB User 조회 → user.roles = JWT.roles│          │
│  └─────────────────────────────────────────────────┘          │
│                        │                                      │
│           ┌────────────┼────────────┐                         │
│           ▼            ▼            ▼                         │
│   ┌─── Path A ──┐  ┌── Path B ──┐  ┌── Path C ──────────┐   │
│   │ permission   │  │ auth       │  │ membership-guard   │   │
│   │ .middleware  │  │ .middleware │  │ .middleware        │   │
│   │ (JWT 기반)   │  │ (DB 기반)   │  │ (JWT 기반)         │   │
│   │              │  │            │  │                    │   │
│   │ user.hasRole │  │ roleAssign │  │ user.roles +       │   │
│   │ user.hasAny  │  │ Service    │  │ user.memberships   │   │
│   │ Role         │  │ .hasAnyRole│  │ (JWT 스냅샷)        │   │
│   │              │  │ (DB query) │  │                    │   │
│   ├──────────────┤  ├────────────┤  ├────────────────────┤   │
│   │ ~26 files    │  │ ~125 files │  │ 6 service scopes   │   │
│   │ ~100 routes  │  │ ~200 routes│  │ ~100 routes        │   │
│   └──────────────┘  └────────────┘  └────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 9.2 Import 그래프

```
permission.middleware.ts
  ← imports: User, UserRole from entities/User.ts
  ← uses: user.hasRole(), user.hasAnyRole() (JWT 기반)
  → 26개 route 파일에서 import

auth.middleware.ts
  ← imports: roleAssignmentService, User, RoleAssignment
  ← uses: roleAssignmentService.hasAnyRole() (DB 기반)
  → 125개 파일에서 import

membership-guard.middleware.ts
  ← imports: createServiceScopeGuard from @o4o/security-core
  ← uses: user.roles (JWT), user.memberships (JWT)
  → 7개 서비스 scope guard에서 사용
```

---

## 10. 문제 영역 목록

### CRITICAL

| # | 문제 | 위치 | 영향 |
|---|------|------|------|
| C1 | **permission.middleware가 JWT 스냅샷 사용** | `middleware/permission.middleware.ts` 전체 | 26개 파일, ~100 routes에서 역할 변경이 재로그인 전까지 반영 안 됨 |
| C2 | **User.hasRole() endsWith 매칭** | `User.ts:236` | Cross-service role escalation 가능 (neture:operator → kpa operator 매칭) |
| C3 | **두 requireAdmin이 다른 역할 매칭** | permission L189 vs auth L156 | 같은 요청이 어느 middleware를 거치느냐에 따라 403 or 200 |

### HIGH

| # | 문제 | 위치 | 영향 |
|---|------|------|------|
| H1 | **membership-guard JWT 의존** | `membership-guard.middleware.ts:62,70` | platform:super_admin bypass + service role bypass가 JWT 기반 |
| H2 | **admin/users.routes.ts 이원 사용** | `routes/admin/users.routes.ts` | `requireAnyRole`(permission) + `requireAdmin`(permission) 혼용 — JWT 기반 |
| H3 | **Legacy bare role + Prefixed role 이중 관리** | role_assignments 전체 | `admin` vs `platform:admin` 매핑을 매번 수동으로 나열 |
| H4 | **Scope Guard config별 role 목록 하드코딩** | 각 서비스 routes 파일 | `allowedRoles`, `blockedServicePrefixes` 등이 분산 관리 |

### MEDIUM

| # | 문제 | 위치 | 영향 |
|---|------|------|------|
| M1 | **Commerce roles 이중 존재** | `supplier` (bare) vs `neture:supplier` | Dropshipping vs Neture supplier 구분 모호 |
| M2 | **requireAuth가 roles를 JWT에서 설정** | `auth.middleware.ts:115` | requireAuth 이후 모든 `user.roles` 참조가 스냅샷 |
| M3 | **isAdmin() JWT 기반** | `User.ts:243` | Controller에서 `req.user.isAdmin()` 호출 시 스냅샷 기반 |

---

## 11. 통합 WO 권고사항

### 11.1 WO-O4O-AUTH-MIDDLEWARE-CONSOLIDATION-V1 실행 범위

#### Phase 1: permission.middleware 제거 (26개 파일)

모든 `permission.middleware.ts` import를 `auth.middleware.ts` 대응 함수로 교체:

| permission.middleware | auth.middleware 대체 |
|----------------------|---------------------|
| `requireAdmin` | `requireAdmin` (이름 동일, DB 기반) |
| `requireAnyRole([...])` | `requireRole([...])` |
| `requireRole(role)` | `requireRole(role)` |
| `requireSuperAdmin` | `requireRole('platform:super_admin')` |
| `ensureAuthenticated` | `requireAuth` |
| `requireSelfOrAdmin` | 신규 구현 필요 (DB 기반) |
| `requirePermission` | `requirePermission` (이름 동일, DB 기반) |
| `requireAnyPermission` | `requireAnyPermission` (이름 동일, DB 기반) |

**주의**: `requireAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER])` → `requireRole(['admin', 'super_admin', 'manager', 'platform:admin', 'platform:super_admin'])` — prefixed 역할도 명시적으로 추가해야 한다 (exact match이므로).

#### Phase 2: membership-guard JWT 의존 제거

`membership-guard.middleware.ts`의 JWT 기반 bypass를 DB 기반으로 변경:
- Line 62: `user.roles?.includes('platform:super_admin')` → `roleAssignmentService.hasAnyRole(userId, ['platform:super_admin'])`
- Line 70: `user.roles?.some(r => r.startsWith(servicePrefix))` → DB 조회
- Line 75: `user.memberships` → DB `service_memberships` 조회

**주의**: Core Freeze F10 적용 대상이므로 WO 승인 필요.

#### Phase 3: JWT payload 경량화

JWT에서 `roles` 배열 제거 (identity only):
```typescript
// 현재
{ userId, email, roles: [...], memberships: [...], ... }

// 목표
{ userId, email, tokenType, ... }
```

모든 RBAC 판단은 `roleAssignmentService` DB 조회로 통일.

**주의**: 이 변경은 membership-guard, scope guard 모두 영향을 받으므로 Phase 2 완료 후 실행.

### 11.2 수정 금지 (Core Freeze)

| 파일 | Freeze | 설명 |
|------|--------|------|
| `auth.middleware.ts` | F10 | 구조 변경 금지, 버그 수정만 허용 |
| `User.ts` | F10 | `hasRole()` 수정 불가 |
| `membership-guard.middleware.ts` | F10 | 구조 변경 금지 |
| `@o4o/security-core` | F1 | 수정 불가 |

### 11.3 실행 순서

```
Phase 1: permission.middleware → auth.middleware 마이그레이션 (26개 파일)
  ├── 1.1 각 파일의 import 교체
  ├── 1.2 역할 배열에 prefixed 역할 추가 (exact match 대응)
  ├── 1.3 requireSelfOrAdmin DB 기반 구현
  └── 1.4 permission.middleware.ts 파일 제거

Phase 2: membership-guard JWT 의존 제거 (Core WO 필요)
  ├── 2.1 membership-guard.middleware.ts DB 조회 전환
  └── 2.2 각 scope guard 테스트

Phase 3: JWT roles 제거 (Phase 2 완료 후)
  ├── 3.1 token.utils.ts에서 roles 제거
  ├── 3.2 requireAuth에서 user.roles 설정 제거
  └── 3.3 User.roles 사용처 전환
```

### 11.4 위험 평가

| Phase | 영향 파일 | 위험도 | 비고 |
|-------|----------|--------|------|
| 1 | 26 + 1 | **LOW** | Import 교체 + 역할 목록 보강, 기능 변경 없음 |
| 2 | 1 | **HIGH** | Core Frozen 파일 수정, 6개 서비스 scope guard 영향 |
| 3 | 3-5 | **HIGH** | JWT 구조 변경, 전체 인증 흐름 영향 |

---

## 12. 수정 파일 목록 (Phase 1)

| # | 파일 | 현재 import | 변경 |
|---|------|------------|------|
| 1 | `routes/admin/users.routes.ts` | permission: requireAnyRole, requireAdmin | auth: requireRole, requireAdmin |
| 2 | `routes/admin/suppliers.routes.ts` | permission: requireAnyRole, requireAdmin | auth: requireRole, requireAdmin |
| 3 | `routes/admin/seller-authorization.routes.ts` | permission: requireAdmin | auth: requireAdmin |
| 4 | `routes/admin/dashboard.routes.ts` | permission: requireAdmin | auth: requireAdmin |
| 5 | `routes/admin/apps.routes.ts` | permission: requireAdmin | auth: requireAdmin |
| 6 | `routes/settingsRoutes.ts` | permission: requireAdmin | auth: requireAdmin |
| 7 | `routes/ai-admin.routes.ts` | permission: requireAdmin | auth: requireAdmin |
| 8 | `routes/ai-query.routes.ts` | permission: requireAdmin | auth: requireAdmin |
| 9 | `routes/cpt.ts` | permission: requireAdmin | auth: requireAdmin |
| 10 | `routes/service-monitor.routes.ts` | permission: requireAdmin | auth: requireAdmin |
| 11 | `routes/v1/admin.routes.ts` | permission: requireAdmin | auth: requireAdmin |
| 12 | `routes/v1/acf.routes.ts` | permission: requireAdmin | auth: requireAdmin |
| 13 | `routes/v1/customizer.routes.ts` | permission: requireAdmin | auth: requireAdmin |
| 14 | `routes/v1/customizer-presets.routes.ts` | permission: requireAdmin | auth: requireAdmin |
| 15 | `routes/v1/apps.routes.ts` | permission: requireAdmin | auth: requireAdmin |
| 16 | `routes/v1/theme.routes.ts` | permission: requireAdmin | auth: requireAdmin |
| 17 | `routes/v1/plugins.routes.ts` | permission: requireAdmin | auth: requireAdmin |
| 18 | `routes/partner.routes.ts` | permission: requireAnyRole | auth: requireRole |
| 19 | `routes/operator/stores.routes.ts` | permission: requireAnyRole | auth: requireRole |
| 20 | `routes/operator/products.routes.ts` | permission: requireAnyRole | auth: requireRole |
| 21 | `routes/operator/membership.routes.ts` | permission: requireAnyRole | auth: requireRole |
| 22 | `routes/signage/signage.routes.ts` | permission: ensureAuthenticated | auth: requireAuth |
| 23 | `modules/operator/operator-copilot.controller.ts` | permission: requireAdmin | auth: requireAdmin |
| 24 | `modules/cpt-acf/routes/cpt.routes.ts` | permission: requireAdmin | auth: requireAdmin |
| 25 | `modules/cpt-acf/routes/acf.routes.ts` | permission: requireAdmin | auth: requireAdmin |
| 26 | `middleware/index.ts` | re-export permission | re-export 제거 |
| 27 | `middleware/permission.middleware.ts` | — | 파일 삭제 |

**requireAnyRole → requireRole 변환 시 역할 목록 보강 필요:**

```typescript
// 현재 (permission.middleware)
requireAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER])
// → user.hasAnyRole(['admin', 'super_admin', 'manager'])
// → endsWith 매칭이므로 platform:admin도 매칭

// 변경 (auth.middleware)
requireRole([
  'admin', 'super_admin', 'manager',
  'platform:admin', 'platform:super_admin'
])
// → exact match이므로 prefixed 역할 명시 필요
```

---

## 부록 A: 서비스별 Scope Config 참조

| 서비스 | `serviceKey` | `platformBypass` | `allowedRoles` |
|--------|-------------|-----------------|----------------|
| Neture | `neture` | true | `neture:admin`, `neture:operator` |
| KPA | `kpa` | false | `kpa:admin`, `kpa:operator`, `kpa:pharmacist`, `kpa:branch_admin` |
| GlycoPharm | `glycopharm` | true | `glycopharm:admin`, `glycopharm:operator`, `glycopharm:pharmacist` |
| K-Cosmetics | `cosmetics` | true | `cosmetics:admin`, `cosmetics:operator` |
| GlucoseView | `glucoseview` | true | `glucoseview:admin`, `glucoseview:operator` |

## 부록 B: 관련 Freeze 문서

| Freeze | 문서 | 영향 |
|--------|------|------|
| F9 | `docs/rbac/RBAC-FREEZE-DECLARATION-V1.md` | role_assignments SSOT 동결 |
| F10 | `docs/architecture/O4O-CORE-FREEZE-V1.md` | auth.middleware, User.ts, membership-guard 동결 |
| F1 | `docs/baseline/BASELINE-OPERATOR-OS-V1.md` | security-core 동결 |

---

*Generated: 2026-03-15*
*Investigation: IR-O4O-AUTH-MIDDLEWARE-CONSOLIDATION-V1*
*Next: WO-O4O-AUTH-MIDDLEWARE-CONSOLIDATION-V1 Phase 1 실행*

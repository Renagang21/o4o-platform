# IR-O4O-AUTH-MIDDLEWARE-CONSOLIDATION-V2

> **Auth/RBAC 구조 전수 조사 보고서 (Full Investigation)**
> Date: 2026-03-16
> Status: Investigation Complete — WO 실행 준비
> Previous: IR-O4O-AUTH-MIDDLEWARE-CONSOLIDATION-V1.md (2026-03-15)

---

## 0. 조사 목적

O4O Platform의 Auth/RBAC 구조를 **전수 조사**하여 단일 RBAC 구조(`role_assignments` 기반)로 통합하기 위한 **구조 지도**를 작성한다.

**목표 구조:**
```
JWT = identity only (userId, email, tokenType)
RBAC = role_assignments (DB 실시간 조회)
```

**이번 조사는 코드 수정 없이 조사만 수행한다.**

---

## 1. Auth 구조 지도 (O4O AUTH MAP)

### 1.1 전체 흐름

```
┌─────────────────────────────────────────────────────────────┐
│ 1. POST /api/v1/auth/login                                  │
│    email + password                                          │
└────────────────────┬────────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. authentication.service.ts :: handleEmailLogin()           │
│    → User DB 조회 + 비밀번호 검증                            │
│    → roleAssignmentService.getRoleNames(userId)              │
│      └─ SELECT role FROM role_assignments                    │
│         WHERE user_id=? AND is_active=true                   │
│    → service_memberships 조회                                │
│    → generateTokens(user, roles[], domain, memberships[])    │
└────────────────────┬────────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. JWT Access Token Payload                                  │
│    {                                                         │
│      userId, sub, email,                                     │
│      role: roles[0],        ← primary role                   │
│      roles: [...],          ← Phase3-E: from role_assignments│
│      scopes: [...],         ← deriveUserScopes()             │
│      memberships: [...],    ← service_memberships            │
│      tokenType: 'user',                                      │
│      iss: 'o4o-platform', aud: 'o4o-api',                   │
│      exp: 15min, iat                                         │
│    }                                                         │
└────────────────────┬────────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. API Request → requireAuth Middleware                      │
│    → JWT 검증 (signature, iss/aud, exp)                     │
│    → User DB 조회 (findOne by userId)                       │
│    → user.roles = payload.roles  ← JWT snapshot, NO DB query │
│    → user.memberships = payload.memberships                  │
│    → req.user = user                                         │
└────────────────────┬────────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. 권한 체크 (2가지 경로 공존)                                │
│                                                              │
│  [A] JWT Snapshot 기반 (빠름, stale 가능)                    │
│    req.user.roles.includes('admin')                          │
│    → 45+ 사용처                                              │
│                                                              │
│  [B] DB 기반 — SSOT (정확, 추가 DB I/O)                     │
│    roleAssignmentService.hasAnyRole(userId, roles)           │
│    → requireAdmin, requireRole                               │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Token 생성 경로 (12개)

| # | 파일 | 위치 | 용도 |
|---|------|------|------|
| 1 | `token.utils.ts` | generateTokens() | 메인 토큰 생성 |
| 2 | `authentication.service.ts` | handleEmailLogin() | 이메일 로그인 |
| 3 | `authentication.service.ts` | handleOAuthLogin() (새 사용자) | OAuth 로그인 |
| 4 | `authentication.service.ts` | handleOAuthLogin() (자동 링크) | OAuth 계정 연결 |
| 5 | `authentication.service.ts` | handleOAuthLogin() (신규 생성) | OAuth 신규 계정 |
| 6 | `authentication.service.ts` | refreshTokens() | 토큰 갱신 |
| 7 | `AuthService.ts` | login() | Legacy 래퍼 |
| 8 | `socialAuthService.ts` | handleCallback() | Social Auth |
| 9 | `password.controller.ts` | resetPassword() | 비밀번호 초기화 |
| 10 | `handoff.controller.ts` | handleHandoff() | SSO Handoff |
| 11 | `refresh-token.service.ts` | refresh() | Refresh 시 fresh roles |
| 12 | `token.utils.ts` | generateServiceTokens() | 서비스 토큰 |

---

## 2. Middleware 구조 — 이중 시스템

### 2.1 파일 위치

| 파일 | 상태 | 역할 |
|------|------|------|
| `common/middleware/auth.middleware.ts` | **ACTIVE (최신)** | Core 동결 (F10) |
| `middleware/permission.middleware.ts` | **LEGACY — 제거 대상** | 구식 구현 |
| `middleware/auth.middleware.ts` | **RE-EXPORT** | → common/middleware로 redirect |

### 2.2 auth.middleware.ts (현재 표준)

| 함수 | 방식 | 설명 |
|------|------|------|
| `requireAuth` | JWT 검증 | 인증 필수, req.user 설정 |
| `requireAdmin` | **DB 쿼리** | roleAssignmentService.hasAnyRole() |
| `requireRole(roles)` | **DB 쿼리** | roleAssignmentService.hasAnyRole() |
| `requirePermission(perm)` | **DB 쿼리** | roleAssignmentService.hasPermission() |
| `requireAnyPermission(perms)` | **DB 쿼리** | 복수 권한 중 하나 |
| `requirePlatformUser` | JWT tokenType | Service token 거부 |
| `requireServiceUser` | JWT tokenType | Platform token 거부 |
| `requireGuestUser` | JWT tokenType | Guest만 허용 |
| `requireGuestOrServiceUser` | JWT tokenType | Guest 또는 Service |
| `optionalAuth` | JWT 검증 | 인증 선택 |
| `optionalServiceAuth` | JWT 검증 | 서비스 인증 선택 |

### 2.3 permission.middleware.ts (LEGACY — 제거 대상)

| 함수 | 방식 | 문제 |
|------|------|------|
| `requireRole(role)` | **JWT snapshot** | `req.user.hasRole(role)` — stale 가능 |
| `requireAnyRole(roles)` | **JWT snapshot** | `req.user.hasAnyRole(roles)` — stale 가능 |
| `requireAdmin` | **JWT snapshot** | `req.user.isAdmin()` — stale 가능 |
| `requireSuperAdmin` | **JWT snapshot** | super_admin만 |
| `ensureAuthenticated` | 인증 체크 | requireAuth 중복 |
| `requirePermission(perm)` | JWT 기반 | User.hasPermission() |

**핵심 차이:**
```
auth.middleware.requireAdmin     → roleAssignmentService.hasAnyRole() → DB 쿼리 (정확)
permission.middleware.requireAdmin → req.user.isAdmin()               → JWT snapshot (stale 가능)
```

---

## 3. Middleware 사용 현황 (전수 조사)

### 3.1 permission.middleware 사용처 (제거 대상)

| 라우트 파일 | 엔드포인트 | 사용 middleware | 영향 |
|------------|-----------|----------------|------|
| `admin/users.routes.ts` | GET /admin/users | requireAnyRole([ADMIN,SUPER_ADMIN,MANAGER,OPERATOR]) | **제거 대상** |
| `admin/users.routes.ts` | POST /admin/users | requireAdmin | **제거 대상** |
| `admin/users.routes.ts` | PUT /admin/users/:id | requireAnyRole(...) | **제거 대상** |
| `admin/users.routes.ts` | PATCH /admin/users/:id/status | requireAnyRole(...) | **제거 대상** |
| `admin/users.routes.ts` | DELETE /admin/users/:id | requireAdmin | **제거 대상** |
| `admin/suppliers.routes.ts` | GET /admin/suppliers | requireAnyRole([ADMIN,SUPER_ADMIN,MANAGER]) | **제거 대상** |
| `admin/suppliers.routes.ts` | POST /admin/suppliers | requireAdmin | **제거 대상** |
| `admin/suppliers.routes.ts` | PATCH /admin/suppliers/:id/approve | requireAdmin | **제거 대상** |
| `admin/suppliers.routes.ts` | DELETE /admin/suppliers/:id | requireAdmin | **제거 대상** |
| `admin/dashboard.routes.ts` | GET /admin/dashboard/* | requireAdmin | **제거 대상** |
| `v1/smtp.routes.ts` | SMTP endpoints | requireRole(['admin','staff']) | **제거 대상** |
| `v1/platformInquiry.routes.ts` | Platform Inquiry | requireRole(['admin','super_admin']) | **제거 대상** |

### 3.2 auth.middleware 사용처 (유지)

| 영역 | 엔드포인트 수 | middleware | 기반 |
|------|-------------|-----------|------|
| Admin (apps/channel-ops/metrics) | 3+ | requireAdmin | DB |
| Neture | 20+ | requireAuth + requireRole/requireNetureScope | DB |
| KPA | 30+ | requireAuth + requireKpaScope | DB |
| GlycoPharm | 15+ | requireAuth + requireGlycopharmScope | DB |
| Cosmetics | 10+ | requireAuth | JWT |
| GlucoseView | 5+ | requireAuth | JWT |
| LMS | 10+ | requireAuth + requireInstructor | DB |
| CMS Content | 10+ | requireAuth + requireRole | DB |
| User/Profile | 5+ | requireAuth | JWT |
| Store/Commerce | 10+ | requireAuth + requireStoreAuth | JWT |
| **총계** | **~120+** | | |

### 3.3 Custom Scope Guards (서비스별)

| 서비스 | Guard | 파일 | 방식 |
|--------|-------|------|------|
| neture | requireNetureScope | `neture-scope.middleware.ts` | membershipGuard + DB |
| kpa | requireKpaScope | `kpa.routes.ts` 내 | membershipGuard + DB |
| glycopharm | requireGlycopharmScope | `glycopharm.routes.ts` 내 | membershipGuard + DB |
| cosmetics | (membershipGuard 직접) | `cosmetics.routes.ts` | membershipGuard |
| LMS | requireInstructor | `requireInstructor.ts` | roleAssignmentService.hasAnyRole |

---

## 4. JWT Role Snapshot 의존성

### 4.1 req.user.roles 직접 체크 사용처 (45+건)

**위험도 높음 — JWT stale 시 권한 불일치:**

| 파일 | 건수 | 패턴 | 위험도 |
|------|------|------|--------|
| `cpt/FormsController.ts` | 9 | `user.roles?.includes('admin')` | ⚠️ 중 |
| `cpt/TaxonomiesController.ts` | 7 | `user.roles?.includes('admin')` | ⚠️ 중 |
| `cpt/FieldGroupsController.ts` | 6 | `user.roles?.includes('admin')` | ⚠️ 중 |
| `templatesController.ts` | 4 | `user.roles?.includes('admin')` | ⚠️ 중 |
| `userController.ts` | 8 | `user.roles?.[0]`, `user.roles.length` | ⚠️ 낮 |
| `approvalController.ts` | 1 | `user.roles.includes('seller')` | ⚠️ 중 |
| `adminOrderController.ts` | 1 | `user.roles?.some(r => ['admin','operator'].includes(r))` | ⚠️ 중 |
| `checkoutController.ts` | 1 | `user.roles?.some(...)` | ⚠️ 중 |
| `membershipGuard.middleware.ts` | 2 | `user.roles?.includes('platform:super_admin')` | ⚠️ 낮(bypass) |
| `auth-context.middleware.ts` | 2 | `roles: user.roles \|\| []` | ⚠️ 낮(전파) |
| `SignageContent.ts` | 1 | `user.roles?.includes('admin')` | ⚠️ 낮(entity) |
| `Store.ts` | 1 | `user.roles?.includes('admin')` | ⚠️ 낮(entity) |
| `forum/ForumAIController.ts` | 3 | `user.roles \|\| []` | ⚠️ 낮 |
| `kpa-lms-scope-guard.ts` | 1 | `user.roles \|\| []` | ⚠️ 낮 |
| `cacheMiddleware.ts` | 1 | `user.roles?.[0]` (캐시 키) | ⚠️ 낮 |

### 4.2 DB 기반 권한 체크 사용처 (SSOT — 정상)

| 파일 | 함수 | 방식 |
|------|------|------|
| `auth.middleware.ts` | requireAdmin | `roleAssignmentService.hasAnyRole()` |
| `auth.middleware.ts` | requireRole() | `roleAssignmentService.hasAnyRole()` |
| `auth.middleware.ts` | requirePermission() | `roleAssignmentService.hasPermission()` |
| `auth.controller.ts` | /auth/status | `roleAssignmentService.getRoleNames()` (fresh) |
| `requireInstructor.ts` | requireInstructor | `roleAssignmentService.hasAnyRole()` |
| `InstructorController.ts` | 2곳 | `roleAssignmentService.hasAnyRole()` |
| `CourseController.ts` | 1곳 | `roleAssignmentService.hasAnyRole()` |
| `cms-content.routes.ts` | 1곳 | `roleAssignmentService.hasAnyRole()` |

### 4.3 Stale Token 시나리오

```
시간   이벤트                    JWT                DB (role_assignments)
─────  ────────────────────────  ────────────────   ─────────────────────
T=0    로그인, 토큰 발급          roles=['seller']   roles=['seller'] ✓
T=1    Admin이 역할 제거          roles=['seller'] ❌ (no roles) ✓
T=2    API 호출                  JWT 체크 통과 ❌    requireAdmin 거부 ✓
T=3    토큰 만료 (15분 후)       재발급 시 동기화    ✓
```

**최대 불일치 시간**: 15분 (Access Token 유효기간)

---

## 5. User.hasRole() 구조 — 충돌 위험

### 5.1 구현

```typescript
// User.ts:230-236
hasRole(role: UserRole | string): boolean {
  const roleStr = role as string;
  if (!this.roles || this.roles.length === 0) return false;
  // Direct match, platform-prefixed match, or service-prefixed match
  // e.g., 'admin' matches 'platform:admin', 'glycopharm:admin', 'kpa:admin'
  return this.roles.some(r =>
    r === roleStr ||
    r === `platform:${roleStr}` ||
    r.endsWith(`:${roleStr}`)   // ← 위험: suffix matching
  );
}
```

### 5.2 Suffix Matching 충돌 위험

```
hasRole('admin') 호출 시:
  'admin'              → true ✓ (direct match)
  'platform:admin'     → true ✓ (platform prefix)
  'neture:admin'       → true ⚠️ (suffix match — 의도와 다를 수 있음)
  'kpa:admin'          → true ⚠️ (suffix match)
  'glycopharm:admin'   → true ⚠️ (suffix match)
```

**문제**: `hasRole('admin')`이 **모든 서비스의 admin**을 포함. 서비스 간 권한 경계가 무너질 수 있음.

### 5.3 사용처

| 파일 | 사용 방식 | 영향 |
|------|----------|------|
| `permission.middleware.ts` | `req.user.hasRole(role)` | Legacy 전체 |
| `permission.middleware.ts` | `req.user.hasAnyRole(roles)` | Legacy 전체 |
| `permission.middleware.ts` | `req.user.isAdmin()` | Admin 체크 |
| `User.ts` | `this.isSupplier()` → `hasRole('supplier')` | 공급자 체크 |
| `User.ts` | `this.isSeller()` → `hasRole('seller')` | 판매자 체크 |
| `User.ts` | `this.isPartner()` → `hasRole('partner')` | 파트너 체크 |

---

## 6. Role Naming 조사

### 6.1 현재 사용 중인 역할 형식

| 형식 | 예시 | 출처 | 상태 |
|------|------|------|------|
| **Legacy Unprefixed** | `admin`, `super_admin`, `operator`, `seller`, `vendor` | 마이그레이션 이전 | 제거 대상 |
| **Platform Prefixed** | `platform:super_admin`, `platform:admin` | ROLE_REGISTRY | 표준 |
| **Service Prefixed** | `neture:admin`, `kpa:operator`, `cosmetics:seller` | ROLE_REGISTRY | 표준 |
| **KPA-b (Demo)** | `kpa-b:district-admin`, `kpa-b:branch` | ROLE_REGISTRY | 제거 예정 |
| **KPA-c (Branch)** | `kpa-c:admin`, `kpa-c:operator` | ROLE_REGISTRY | 표준 |

### 6.2 서비스별 역할 목록

#### Platform (공통)
```
platform:super_admin   platform:admin   platform:operator
platform:manager       platform:vendor  platform:member
platform:contributor
```

#### Neture
```
neture:admin    neture:operator   neture:supplier
neture:partner  neture:user
```

#### KPA Society
```
kpa:admin           kpa:operator       kpa:district_admin
kpa:branch_admin    kpa:branch_operator  kpa:pharmacist
```

#### GlycoPharm
```
glycopharm:admin     glycopharm:operator    glycopharm:pharmacy
glycopharm:supplier  glycopharm:partner     glycopharm:consumer
```

#### K-Cosmetics
```
cosmetics:admin    cosmetics:operator   cosmetics:pharmacist
cosmetics:user     cosmetics:supplier   cosmetics:seller
cosmetics:partner
```

#### GlucoseView
```
glucoseview:admin   glucoseview:operator
glucoseview:pharmacist  glucoseview:user
```

### 6.3 Namespace 충돌 발견

| 충돌 | 원인 | 영향 |
|------|------|------|
| `admin` vs `platform:admin` vs `neture:admin` | requireAdmin이 모두 지원 | 낮음 (의도적) |
| `User.hasRole('admin')` suffix matching | `kpa:admin` 등 모두 매칭 | **높음** — 서비스 간 경계 침범 |
| `operator` 중복 | unprefixed + 5개 서비스 | 중간 — 마이그레이션 기간 한정 |

---

## 7. Service Scope RBAC

### 7.1 구조

```
role_assignments          service_memberships        JWT payload
─────────────────         ─────────────────────      ─────────────────
user_id: xxx              user_id: xxx               roles: ['kpa:admin']
role: 'kpa:admin'         service_key: 'kpa-society' memberships: [{
is_active: true           status: 'active'             serviceKey: 'kpa-society',
scope_type: 'global'                                   status: 'active'
                                                     }]
```

### 7.2 Scope Guard 체인

```
requireAuth
  → JWT 검증 + req.user 설정
  → createMembershipScopeGuard(config)(scope)
    → platform:super_admin? → bypass ✓
    → user.roles has {service}:*? → bypass ✓
    → service_memberships.status = 'active'? → pass ✓
    → 403 MEMBERSHIP_NOT_FOUND / MEMBERSHIP_NOT_ACTIVE
```

### 7.3 Scope Key 매핑

```typescript
// membership-guard.middleware.ts
const SCOPE_TO_MEMBERSHIP_KEY = {
  'kpa': 'kpa-society',        // scope → DB service_key
  'cosmetics': 'k-cosmetics',
};
```

---

## 8. 문제 영역 식별 (Problem Areas)

### P1. 이중 Middleware 시스템

```
permission.middleware.ts (JWT snapshot) ← 12+ 엔드포인트 사용 중
auth.middleware.ts (DB 쿼리)           ← 120+ 엔드포인트 사용 중
```

**문제**: 같은 `requireAdmin` 이름으로 다른 동작. import 경로에 따라 결과가 다름.
**영향**: Admin 라우트 전체 (users, suppliers, dashboard)

### P2. JWT Role Snapshot 직접 의존 (45+건)

```
req.user.roles.includes('admin')  ← 컨트롤러 내 하드코딩
```

**문제**: 토큰 발급 후 15분간 stale. 역할 변경이 즉시 반영 안 됨.
**영향**: CPT 컨트롤러 22건, 기타 23건

### P3. User.hasRole() Suffix Matching

```
hasRole('admin') → neture:admin, kpa:admin 모두 매칭
```

**문제**: 서비스 간 권한 경계 침범 가능.
**영향**: permission.middleware 전체 + Entity helper 메서드

### P4. Legacy Unprefixed Role 잔존

```
requireAdmin: ['admin', 'super_admin', 'operator', ...]  ← 구/신 병행
```

**문제**: 마이그레이션 완료 후에도 구 형식 코드가 남아있으면 혼동.
**영향**: auth.middleware.ts requireAdmin, Role Registry

### P5. /auth/me vs /auth/status 불일치

```
/auth/me     → user.roles = JWT snapshot  (stale 가능)
/auth/status → roleAssignmentService.getRoleNames()  (fresh DB 쿼리)
```

**문제**: 클라이언트가 어느 엔드포인트를 쓰느냐에 따라 다른 roles를 받음.

### P6. Token 생성 경로 12개

**문제**: roles 주입 누락 가능성. 모든 경로에서 일관된 roles 주입 필요.

---

## 9. RBAC 테이블 구조

### 9.1 role_assignments (SSOT — Frozen F9, F10)

```sql
CREATE TABLE role_assignments (
  id            UUID PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES users(id),
  role          VARCHAR(50) NOT NULL,
  is_active     BOOLEAN DEFAULT true,
  valid_from    TIMESTAMP,
  valid_until   TIMESTAMP,
  assigned_at   TIMESTAMP,
  assigned_by   UUID REFERENCES users(id),
  scope_type    VARCHAR(50) DEFAULT 'global',
  scope_id      UUID,
  created_at    TIMESTAMP,
  updated_at    TIMESTAMP,

  UNIQUE (user_id, role, is_active)
);
```

### 9.2 Role Read API

| 엔드포인트 | 소스 | 용도 |
|-----------|------|------|
| GET /auth/status | roleAssignmentService.getRoleNames() (DB) | Fresh roles |
| GET /auth/me | req.user.roles (JWT) | Snapshot roles |
| GET /users/:id/roles | roleAssignmentService.getActiveRoles() (DB) | 관리자용 |
| GET /admin/users | role_assignments JOIN (DB) | 사용자 목록 |

### 9.3 Role Write API

| 엔드포인트 | 동작 |
|-----------|------|
| POST /users/:id/roles | roleAssignmentService.assignRole() |
| DELETE /users/:id/roles/:roleId | roleAssignmentService.removeRole() |
| PUT /users/:id/roles/:roleId | valid_from/valid_until 수정 |
| POST /admin/users | 사용자 생성 + 역할 할당 |

---

## 10. 통계 요약

| 항목 | 수량 |
|------|------|
| 보호 엔드포인트 총 수 | ~179+ |
| auth.middleware 사용 | ~120+ (정상) |
| permission.middleware 사용 | ~12 (**제거 대상**) |
| JWT snapshot 직접 체크 | ~45건 (**점진 전환 대상**) |
| DB 기반 권한 체크 | ~15건 (정상) |
| Custom scope guards | ~50 엔드포인트 (정상) |
| Token 생성 경로 | 12개 (검증 필요) |
| 서비스별 역할 정의 | 7개 서비스, ~40개 역할 |

---

## 11. WO 실행 범위 (권장)

### Phase A: permission.middleware 제거 (우선순위 1)

**범위**: 12 엔드포인트
**작업**: import 경로를 `permission.middleware` → `auth.middleware`로 변경
**영향 파일**:
- `routes/admin/users.routes.ts`
- `routes/admin/suppliers.routes.ts`
- `routes/admin/dashboard.routes.ts`
- `routes/v1/smtp.routes.ts`
- `routes/v1/platformInquiry.routes.ts`

**주의**: auth.middleware의 requireRole은 DB 기반이므로 동작이 달라짐 (더 안전)

### Phase B: JWT snapshot 직접 체크 → requireRole() 전환 (우선순위 2)

**범위**: 45+ 사용처
**작업**: `req.user.roles.includes('admin')` → `await roleAssignmentService.hasAnyRole(user.id, ['admin'])`
**우선 대상**: CPT 컨트롤러 22건 (FieldGroups, Forms, Taxonomies)

### Phase C: User.hasRole() suffix matching 수정 (우선순위 3)

**작업**: suffix matching (`r.endsWith(':admin')`) 제거, direct match만 유지
**영향**: permission.middleware 제거 후 영향 범위 축소

### Phase D: JWT payload 경량화 (우선순위 4 — 장기)

**목표**: `JWT = identity only`
```
현재: { userId, email, roles[], scopes[], memberships[], ... }
목표: { userId, email, tokenType, iss, aud }
```
**전제**: 모든 roles 체크가 DB 기반으로 전환된 후

### Phase E: /auth/me → /auth/status 통일 (우선순위 5)

**작업**: /auth/me도 fresh roles 반환하도록 변경

---

## 12. 배포 후 검증 SQL

```sql
-- role_assignments 현황
SELECT role, COUNT(*)::int as cnt
FROM role_assignments
WHERE is_active = true
GROUP BY role
ORDER BY cnt DESC;

-- service_memberships 현황
SELECT service_key, status, COUNT(*)::int as cnt
FROM service_memberships
GROUP BY service_key, status
ORDER BY service_key, status;

-- Unprefixed role 잔존 확인
SELECT role, COUNT(*)::int as cnt
FROM role_assignments
WHERE is_active = true AND role NOT LIKE '%:%'
GROUP BY role
ORDER BY cnt DESC;
```

---

## 13. 참조 문서

| 문서 | 경로 |
|------|------|
| RBAC Freeze Declaration | `docs/rbac/RBAC-FREEZE-DECLARATION-V1.md` |
| O4O Core Freeze | `docs/architecture/O4O-CORE-FREEZE-V1.md` |
| Boundary Policy | `docs/architecture/O4O-BOUNDARY-POLICY-V1.md` |
| KPA Society Structure | `docs/baseline/KPA-SOCIETY-SERVICE-STRUCTURE.md` |
| 이전 IR V1 | `docs/audit/IR-O4O-AUTH-MIDDLEWARE-CONSOLIDATION-V1.md` |

---

## 14. 결론

O4O Platform의 Auth/RBAC 구조는 **Phase3-E 마이그레이션으로 핵심 RBAC(requireAdmin, requireRole)은 DB 기반으로 전환 완료**되었으나, 다음 잔존 문제가 있다:

1. **permission.middleware** 12개 엔드포인트가 여전히 JWT snapshot 기반 구식 체크 사용
2. **45+ 컨트롤러 코드**에서 `req.user.roles.includes()` 직접 체크 (stale 가능)
3. **User.hasRole() suffix matching**이 서비스 간 권한 경계를 침범할 수 있음

**권장 실행 순서:**
```
Phase A (permission.middleware 제거) → Phase B (JWT 직접 체크 전환) → Phase C (suffix matching 수정)
```

Phase A만으로도 **이중 middleware 문제가 완전 해소**되며, 즉시 실행 가능하다.

---

*조사 완료: 2026-03-16*
*조사 도구: Claude Code (4개 병렬 에이전트 + 수동 검증)*
*코드 수정: 없음 (조사만 수행)*

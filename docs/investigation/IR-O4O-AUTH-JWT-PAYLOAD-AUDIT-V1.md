# IR-O4O-AUTH-JWT-PAYLOAD-AUDIT-V1

> **조사일**: 2026-03-13
> **목적**: JWT 토큰 payload 구조 파악 — Service Handoff, Account Center 설계 기준 자료
> **트리거**: WO-O4O-SERVICE-CATALOG-FOUNDATION-V1 완료 후 handoff 설계 준비

---

## 1. 핵심 발견 요약

### JWT 구조: 구조 B — JWT에 권한 포함

| 항목 | JWT 포함 여부 | 상세 |
|------|:---:|------|
| userId | ✅ | `userId` + `sub` (UUID) |
| email | ✅ | `user.email` |
| roles | ✅ | `role_assignments` 테이블에서 로그인 시 조회 |
| memberships | ⚠️ 부분 | 이메일 로그인만 포함, **OAuth 로그인 누락** |
| scopes | ✅ | `deriveUserScopes()`로 roles에서 파생 |
| permissions | ✅ | `user.permissions` 컬럼 |
| domain | ✅ | 항상 `'neture.co.kr'` (하드코딩) |
| tokenType | ✅ | `'user'` / `'service'` / `'guest'` 3종 |

### 치명적 발견 4건

| # | 이슈 | 위험도 | 영향 |
|---|------|--------|------|
| 1 | **OAuth 로그인 시 memberships 누락** | 🔴 높음 | OAuth 사용자 membership-guard 실패 |
| 2 | **API Gateway iss/aud 미검증** | 🟡 중간 | Server Isolation 우회 가능 |
| 3 | **WebSocket `decoded.id` 참조** | 🟡 중간 | payload에 `id` 미설정, 잠재적 버그 |
| 4 | **JWT_SECRET을 admin header 비교에 사용** | 🟡 중간 | 서명 키 노출 위험 |

---

## 2. JWT Payload 구조 — 토큰 타입별

### 2.1 Platform User Access Token (`tokenType: 'user'`)

**생성 위치**: `apps/api-server/src/utils/token.utils.ts` → `generateAccessToken()` (line 75)

```typescript
{
  // Identity
  userId: string,           // user.id (UUID)
  sub: string,              // user.id (JWT 표준)
  email: string,            // user.email

  // RBAC (role_assignments 테이블 기반)
  role: string,             // 대표 역할 (roles[0] || 'user')
  roles: string[],          // 전체 활성 역할 배열
  permissions: string[],    // user.permissions 컬럼
  scopes: string[],         // deriveUserScopes()로 파생

  // Service Membership (WO-O4O-SERVICE-MEMBERSHIP-GUARD-V1)
  memberships: { serviceKey: string; status: string }[],

  // Domain & Type
  domain: string,           // 'neture.co.kr' (하드코딩)
  tokenType: 'user',

  // JWT 표준
  iss: string,              // 'o4o-platform' (JWT_ISSUER)
  aud: string,              // 'o4o-api' (JWT_AUDIENCE)
  exp: number,              // iat + 900초 (15분)
  iat: number,
}
```

### 2.2 Service User Access Token (`tokenType: 'service'`)

**생성 위치**: `generateServiceAccessToken()` (line 123)

```typescript
{
  userId: string,           // OAuth provider ID
  sub: string,
  email: string,
  name: string,             // displayName
  role: 'service_user',     // 고정
  permissions: [],
  scopes: [],
  domain: string,
  tokenType: 'service',
  serviceId: string,        // 'neture', 'k-cosmetics' 등
  storeId?: string,
  iss, aud, exp, iat
}
```

### 2.3 Guest Token (`tokenType: 'guest'`)

**생성 위치**: `generateGuestAccessToken()` (line 462)

```typescript
{
  userId: string,           // 'guest_174..._abc123'
  sub: string,
  role: 'guest',
  permissions: [],
  scopes: [],
  domain: string,
  tokenType: 'guest',
  serviceId: string,
  storeId?: string,
  deviceId?: string,
  guestSessionId: string,
  iss, aud, exp(2시간), iat
}
```

### 2.4 Refresh Token

**생성 위치**: `generateRefreshToken()` (line 214)
**시크릿**: `JWT_REFRESH_SECRET` (별도)

```typescript
{
  userId: string,
  sub: string,
  tokenVersion: 1,          // 고정
  tokenFamily: string,      // UUID (rotation 감지용)
  iss, aud, exp(7일), iat
}
```

**저장 방식**: Hybrid — JWT 자체 + `users.refreshTokenFamily` 컬럼에 family UUID 저장
- Refresh 시 tokenFamily 비교 → 불일치 = 토큰 탈취 → 전체 무효화

---

## 3. JWT 생성 흐름

### 3.1 이메일 로그인 (정상 경로)

```
POST /api/v1/auth/login
  ↓
authentication.service.ts login()
  ↓
1. roleAssignmentService.getRoleNames(userId)     → roles[]
2. SQL: SELECT serviceKey, status FROM service_memberships → memberships[]
3. deriveUserScopes(user, roles)                   → scopes[]
  ↓
generateTokens(user, roles, 'neture.co.kr', memberships)
  ↓
{ accessToken, refreshToken }
```

### 3.2 OAuth 로그인 (⚠️ memberships 누락)

```
POST /auth/oauth/callback
  ↓
authentication.service.ts handleOAuthLogin()
  ↓
1. roleAssignmentService.getRoleNames(userId)     → roles[]
2. ❌ memberships 조회 없음
  ↓
generateTokens(user, roles, 'neture.co.kr')       → memberships = [] (기본값)
```

### 3.3 토큰 갱신

```
POST /api/v1/auth/refresh
  ↓
1. verifyRefreshToken(token) → payload.userId
2. users.refreshTokenFamily === payload.tokenFamily 검증
3. roleAssignmentService.getRoleNames(userId)      → 최신 roles
4. SQL: SELECT ... FROM service_memberships        → 최신 memberships
  ↓
generateTokens(user, freshRoles, domain, freshMemberships)
```

Refresh 시에는 **DB에서 최신 roles와 memberships를 다시 조회**한다.

---

## 4. JWT 검증 흐름

### 4.1 requireAuth (JWT 기반, DB 미조회)

```
Request → Extract Bearer token
  ↓
verifyAccessToken(token)
  ↓ jwt.verify(token, JWT_SECRET, { issuer, audience })
Decode payload
  ↓
Load user from DB (findOne by userId, with linkedAccounts)
  ↓
user.roles = payload.roles      ← JWT에서 직접 할당
user.memberships = payload.memberships
  ↓
req.user = user
```

**핵심**: `requireAuth`는 `role_assignments` 테이블을 조회하지 않는다. JWT payload의 roles를 그대로 사용.

### 4.2 requireAdmin (DB 조회, 엄격)

```
requireAuth 통과 후
  ↓
roleAssignmentService.hasAnyRole(userId, ['admin', 'super_admin', 'operator', ...])
  ↓ SQL: SELECT 1 FROM role_assignments WHERE user_id = $1 AND role IN (...) AND is_active
```

**핵심**: `requireAdmin`은 **DB에서 실시간 조회**하므로 JWT 만료 전에도 권한 변경이 반영됨.

### 4.3 Membership Guard (JWT 기반)

```
user.memberships (from JWT)
  ↓
찾기: serviceKey 일치 && status === 'active'
  ↓
platform:super_admin → bypass
service-scoped role (e.g., kpa:admin) → bypass
없으면 → 403 MEMBERSHIP_NOT_FOUND
```

---

## 5. JWT 공유 범위

### 5.1 동일 JWT_SECRET 사용처

| 시스템 | iss/aud 검증 | 비고 |
|--------|:---:|------|
| API Server (`o4o-core-api`) | ✅ | 정식 검증 |
| API Gateway | ❌ | `jwt.verify(token, secret)` — iss/aud 미검증 |
| WebSocket (sessionSync) | ❌ | `decoded.id` 참조 (payload에 `id` 필드 없음) |
| Preview Token | ✅ | 별도 payload (`{userId, pageId, jti}`) |
| Product Policy Internal | ❌ | `X-Admin-Secret === JWT_SECRET` — 시크릿 노출 |

### 5.2 모든 서비스가 동일 JWT 사용

```
neture.co.kr       ─┐
glycopharm.co.kr   ─┤
glucoseview.co.kr  ─┤── 동일 JWT_SECRET
yaksa.site         ─┤   동일 o4o-core-api
cosmetics.neture   ─┘
```

하나의 JWT로 **모든 서비스에 접근 가능**. 서비스 격리는 `memberships` 필드와 `membership-guard` 미들웨어로 수행.

---

## 6. 권한 처리 구조 정리

### 이중 구조: JWT (빠른 경로) + DB (엄격 경로)

```
                    ┌─── JWT Roles ────── requireAuth (빠른, 15분 캐시)
                    │
req.user.roles ─────┤
                    │
                    └─── DB query ────── requireAdmin (엄격, 실시간)
                                         requireRole() (엄격, 실시간)

                    ┌─── JWT memberships ── membership-guard (빠른)
                    │
req.user.memberships┤
                    │
                    └─── /auth/me ────── DB query (최신, 응답에 포함)
```

---

## 7. Handoff 영향 분석

### 현재 구조에서 서비스 이동이 가능한가?

**가능하다.** 이유:

1. **동일 JWT_SECRET** — 모든 서비스가 같은 API 서버 사용
2. **memberships 포함** — JWT에 가입 서비스 목록 존재
3. **tokenType 분리** — user/service/guest 구분 가능

### Handoff 시 주의점

| 항목 | 현재 상태 | handoff 영향 |
|------|----------|-------------|
| domain 필드 | `'neture.co.kr'` 하드코딩 | 서비스별 domain 미분리 |
| memberships | 로그인 시점 스냅샷 | 가입 후 재로그인 필요 |
| roles | 로그인 시점 스냅샷 | 승인 후 재로그인 필요 |
| refresh | 최신 DB 조회 | refresh 시 자동 갱신 |

### Handoff 권장 패턴

```
서비스 A (neture.co.kr)
  ↓ 사용자가 서비스 B로 이동 클릭
  ↓ 기존 JWT 그대로 전달 (same API server)
서비스 B (glycopharm.co.kr)
  ↓ 기존 JWT로 API 호출
  ↓ membership-guard가 memberships 확인
  ↓ 접근 허용/거부
```

**JWT 재발급 불필요** — 동일 API 서버이므로 기존 JWT를 그대로 사용.
단, memberships가 JWT 갱신 전까지 outdated일 수 있으므로, handoff 시 `/auth/refresh` 호출 권장.

---

## 8. 결론

### 구조 판정: **구조 B — JWT 권한 포함** (이중 보호)

```
JWT = userId + email + roles[] + memberships[] + scopes[]
       ↑ 빠른 경로 (15분 캐시)

DB = role_assignments + service_memberships
       ↑ 엄격 경로 (requireAdmin, requireRole)
```

### Service Handoff를 위한 준비 상태

| 준비 항목 | 상태 |
|-----------|------|
| 동일 JWT across services | ✅ 완료 |
| ServiceMembership in JWT | ⚠️ OAuth 누락 수정 필요 |
| Service Catalog | ✅ 완료 (WO-O4O-SERVICE-CATALOG-FOUNDATION-V1) |
| domain 필드 분리 | ❌ 하드코딩 'neture.co.kr' |
| Handoff URL 표준 | ❌ 미정의 |

### 권장 후속 작업

1. **WO-O4O-AUTH-OAUTH-MEMBERSHIP-FIX-V1** — OAuth 로그인 시 memberships 포함 (즉시)
2. **WO-O4O-AUTH-TOKEN-STRUCTURE-REFINE-V1** — domain 하드코딩 제거, WebSocket id 버그 수정
3. **WO-O4O-SERVICE-HANDOFF-ARCHITECTURE-V1** — 서비스 이동 표준 정의

---

*조사 완료: 2026-03-13*
*SSOT 파일: `apps/api-server/src/utils/token.utils.ts`*
*다음 단계: WO-O4O-SERVICE-HANDOFF-ARCHITECTURE-V1 설계 시 이 조사 결과 참조*

# IR-O4O-AUTH-ARCHITECTURE-V1

> Investigation Report: O4O Platform Authentication Architecture
> Date: 2026-03-06
> Status: Complete
> WO: WO-O4O-AUTH-ARCHITECTURE-DOCUMENTATION-V1

---

## Executive Summary

O4O 플랫폼은 **단일 API 서버(`o4o-core-api`)** 위에 5개 프론트엔드 서비스가
동일한 인증 인프라를 공유하는 구조이다.

### 인증 구조 한눈에 보기

```
┌─────────────────────────────────────────────────────────────────┐
│                        api.neture.co.kr                         │
│                        (o4o-core-api)                           │
│                                                                 │
│  JWT (HS256) + httpOnly Cookie + Role Assignments (SSOT)        │
│  Access Token: 15분 | Refresh Token: 7일                       │
└──────────────┬──────────┬──────────┬──────────┬────────────────┘
               │          │          │          │
    ┌──────────┴──┐  ┌────┴────┐  ┌─┴──────┐  ┌┴───────────┐
    │ neture.co.kr│  │kpa-     │  │glucose │  │k-cosmetics │
    │             │  │society  │  │view    │  │.site       │
    │  Cookie     │  │.co.kr   │  │.co.kr  │  │            │
    │             │  │         │  │        │  │  Cookie     │
    │             │  │localStorage│ Cookie │  │            │
    └─────────────┘  └─────────┘  └────────┘  └────────────┘
                                                     │
                                              ┌──────┴──────┐
                                              │admin.neture │
                                              │.co.kr       │
                                              │             │
                                              │Cookie+local │
                                              │Storage      │
                                              └─────────────┘
```

| 항목 | 값 |
|------|------|
| API 서버 | 단일 (`api.neture.co.kr`) |
| 인증 방식 | JWT (HS256) |
| 토큰 저장 | httpOnly Cookie (주) / localStorage (보조) |
| Role SSOT | `role_assignments` 테이블 |
| SSO | 미구현 (계획됨) |
| 서비스 유저 | 별도 토큰 체계 (Phase 2) |
| 게스트 유저 | 별도 토큰 체계 (2시간) |

---

## 1. 인증 구조 개요

### 1.1 사용자 유형

O4O 플랫폼은 3가지 사용자 유형을 지원한다.

| 유형 | tokenType | 토큰 만료 | Refresh | DB 조회 |
|------|-----------|----------|---------|---------|
| **Platform User** | `user` | 15분 | 7일 | `users` 테이블 |
| **Service User** | `service` | 15분 | 7일 | DB 없음 (토큰 기반) |
| **Guest User** | `guest` | 2시간 | 없음 | DB 없음 |

### 1.2 핵심 파일 맵

| 역할 | 파일 |
|------|------|
| JWT 생성/검증 | `apps/api-server/src/utils/token.utils.ts` |
| 인증 미들웨어 | `apps/api-server/src/common/middleware/auth.middleware.ts` |
| 인증 컨트롤러 | `apps/api-server/src/modules/auth/controllers/auth.controller.ts` |
| 인증 서비스 | `apps/api-server/src/services/authentication.service.ts` |
| 쿠키 관리 | `apps/api-server/src/utils/cookie.utils.ts` |
| Role Assignment 엔티티 | `apps/api-server/src/modules/auth/entities/RoleAssignment.ts` |
| Role Assignment 서비스 | `apps/api-server/src/modules/auth/services/role-assignment.service.ts` |
| Role 타입 정의 | `apps/api-server/src/types/roles.ts` |
| 로그인 보안 | `apps/api-server/src/modules/auth/services/login-security.service.ts` |
| 공유 Auth Client | `packages/auth-client/src/client.ts` |
| 공유 Token Storage | `packages/auth-client/src/token-storage.ts` |
| Auth Context Provider | `packages/auth-context/src/AuthProvider.tsx` |

---

## 2. 로그인 흐름

### 2.1 전체 흐름

```
클라이언트                          API 서버
   │                                  │
   │  POST /api/v1/auth/login         │
   │  { email, password }             │
   │ ─────────────────────────────►   │
   │                                  │
   │                    ┌─────────────┤
   │                    │ 1. Rate Limit 체크
   │                    │ 2. User 조회 (email)
   │                    │ 3. Account Lock 체크
   │                    │ 4. Password 검증 (bcrypt)
   │                    │ 5. Account Status 체크
   │                    │ 6. role_assignments 조회
   │                    │ 7. JWT 생성 (access + refresh)
   │                    │ 8. httpOnly Cookie 설정
   │                    └─────────────┤
   │                                  │
   │  Set-Cookie: accessToken=...     │
   │  Set-Cookie: refreshToken=...    │
   │  { success, data: { user } }     │
   │ ◄─────────────────────────────   │
   │                                  │
   │  GET /api/v1/auth/me             │
   │  Cookie: accessToken=...         │
   │ ─────────────────────────────►   │
   │                                  │
   │  { user, roles, kpaMembership }  │
   │ ◄─────────────────────────────   │
```

### 2.2 단계별 상세

| 단계 | 처리 내용 | 코드 위치 |
|------|----------|----------|
| **요청** | `POST /api/v1/auth/login` | `auth.controller.ts:209` |
| **Rate Limit** | `LoginSecurityService.isLoginAllowed(email, ip)` | `login-security.service.ts` |
| **User 조회** | `users` 테이블 email 검색 → `linked_accounts` 폴백 | `authentication.service.ts:133` |
| **Lock 체크** | `user.isLocked \|\| user.lockedUntil > now` | `authentication.service.ts:156` |
| **Password 검증** | `bcrypt.compare(password, user.password)` | `authentication.service.ts:170` |
| **Status 체크** | `user.status` = ACTIVE 또는 APPROVED | `authentication.service.ts:176` |
| **Role 조회** | `roleAssignmentService.getRoleNames(user.id)` | `authentication.service.ts:194` |
| **Token 생성** | `generateTokens(user, roles, 'neture.co.kr')` | `token.utils.ts:237` |
| **Cookie 설정** | `setAuthCookies(req, res, tokens, sessionId)` | `cookie.utils.ts` |
| **응답** | `{ success, data: { user, pharmacistRole, kpaMembership } }` | `auth.controller.ts:257` |

### 2.3 Cross-Origin 토큰 전달

동일 도메인(`*.neture.co.kr`)이면 httpOnly Cookie만 사용.
Cross-Origin이면 응답 body에도 토큰 포함:

```typescript
// Cross-Origin 감지: Origin 헤더 기반
// neture.co.kr ↔ api.neture.co.kr = 동일 (Cookie OK)
// glycopharm.co.kr ↔ api.neture.co.kr = Cross-Origin (body 토큰 추가)
```

### 2.4 에러 코드

| 에러 코드 | HTTP | 설명 |
|----------|------|------|
| `INVALID_CREDENTIALS` | 401 | 이메일/비밀번호 불일치 |
| `ACCOUNT_LOCKED` | 403 | 계정 잠금 (브루트포스 방지) |
| `ACCOUNT_NOT_ACTIVE` | 403 | 계정 비활성 |
| `TOO_MANY_ATTEMPTS` | 429 | Rate Limit 초과 |
| `SOCIAL_LOGIN_REQUIRED` | 400 | 소셜 계정 (비밀번호 미설정) |

---

## 3. 토큰 구조

### 3.1 Access Token (JWT)

| 필드 | 설명 | 예시 |
|------|------|------|
| `userId` | 사용자 UUID | `"a1b2c3..."` |
| `sub` | JWT 표준 Subject (= userId) | `"a1b2c3..."` |
| `email` | 이메일 | `"user@neture.co.kr"` |
| `role` | 주 역할 (레거시 호환) | `"user"` |
| `roles[]` | 활성 역할 배열 (Phase3-E) | `["kpa:admin", "neture:operator"]` |
| `permissions[]` | 직접 권한 | `[]` |
| `scopes[]` | 서비스 스코프 (역할에서 파생) | `["kpa", "neture"]` |
| `domain` | 멀티테넌트 도메인 | `"neture.co.kr"` |
| `tokenType` | 토큰 유형 | `"user"` |
| `iss` | 발급자 | `"o4o-platform"` |
| `aud` | 수신자 | `"o4o-api"` |
| `exp` | 만료 (Unix timestamp) | `1741244400` |
| `iat` | 발급 시간 | `1741243500` |

**서명**: HS256 (HMAC SHA-256), 비밀키: `JWT_SECRET` 환경변수

### 3.2 Refresh Token

| 항목 | 값 |
|------|------|
| 만료 | 7일 (604,800초) |
| 비밀키 | `JWT_REFRESH_SECRET` (별도) |
| Token Family | 회전 감지용 (`user.refreshTokenFamily`) |
| 페이로드 | `userId`, `tokenFamily`, `tokenType: 'refresh'` |

### 3.3 토큰 만료 시간 요약

| 토큰 | 만료 |
|------|------|
| Access Token (Platform User) | **15분** |
| Refresh Token | **7일** |
| Access Token (Guest) | **2시간** |
| Access Token (Service User) | **15분** |

### 3.4 토큰 갱신 로직

```
클라이언트                          API 서버
   │                                  │
   │  API 요청 → 401 Unauthorized     │
   │ ◄─────────────────────────────   │
   │                                  │
   │  POST /api/v1/auth/refresh       │
   │  { refreshToken }                │
   │ ─────────────────────────────►   │
   │                                  │
   │             ┌────────────────────┤
   │             │ 1. Refresh Token 검증
   │             │ 2. Token Family 비교 (도난 감지)
   │             │ 3. User 조회 (isActive)
   │             │ 4. Fresh roles 조회 (role_assignments)
   │             │ 5. 새 Access + Refresh Token 생성
   │             │ 6. Token Family 갱신
   │             └────────────────────┤
   │                                  │
   │  새 accessToken + refreshToken   │
   │ ◄─────────────────────────────   │
   │                                  │
   │  원래 요청 재시도 (새 토큰)       │
   │ ─────────────────────────────►   │
```

**Token Family 보안**: Refresh Token 재사용(도난) 감지 시 모든 토큰 무효화

### 3.5 401 발생 시 처리

| 단계 | 처리 |
|------|------|
| 1 | 401 응답 수신 |
| 2 | Refresh Token으로 갱신 시도 |
| 3-A (성공) | 새 토큰 저장 → 원래 요청 재시도 |
| 3-B (실패) | 모든 토큰 삭제 → 로그인 페이지로 이동 |

**In-flight 중복 방지**: 여러 API 호출이 동시에 401을 받아도 refresh 요청은 1회만 실행

---

## 4. 권한(Role) 시스템

### 4.1 Role Assignment 테이블 (SSOT)

```sql
role_assignments (
  id              UUID PRIMARY KEY,
  user_id         UUID NOT NULL → users.id,
  role            VARCHAR(50) NOT NULL,
  is_active       BOOLEAN DEFAULT true,
  valid_from      TIMESTAMP DEFAULT NOW(),
  valid_until     TIMESTAMP NULL,
  assigned_at     TIMESTAMP DEFAULT NOW(),
  assigned_by     UUID → users.id,
  scope_type      VARCHAR(50) DEFAULT 'global',
  scope_id        UUID NULL
)

-- 인덱스
UNIQUE(user_id, role, is_active)
INDEX(user_id, is_active)
INDEX(role)
```

### 4.2 Scope 구조

| scope_type | scope_id | 설명 |
|-----------|----------|------|
| `global` | `null` | 플랫폼 전체 역할 |
| `organization` | org UUID | 조직 범위 역할 |

### 4.3 역할 체계

**플랫폼 역할 (Global)**

| 역할 | 설명 |
|------|------|
| `platform:super_admin` | 최고 관리자 |
| `platform:admin` | 플랫폼 관리자 |

**서비스 역할 (서비스별)**

| 서비스 | Admin | Operator | 기타 |
|--------|-------|----------|------|
| KPA-A | `kpa:admin` | `kpa:operator` | `kpa:pharmacist`, `kpa:district_admin`, `kpa:branch_admin`, `kpa:branch_operator` |
| KPA-B | `kpa-b:district-admin` | `kpa-b:district` | `kpa-b:branch-admin`, `kpa-b:branch` |
| KPA-C | `kpa-c:admin` | `kpa-c:operator` | `kpa-c:pharmacist` |
| Neture | `neture:admin` | `neture:operator` | - |
| GlycoPharm | `glycopharm:admin` | `glycopharm:operator` | - |
| GlucoseView | `glucoseview:admin` | `glucoseview:operator` | - |
| Cosmetics | `cosmetics:admin` | `cosmetics:operator` | - |

**기본 역할**

| 역할 | 설명 |
|------|------|
| `user` | 기본 가입자 |
| `member` | 멤버 |
| `contributor` | 기여자 |
| `seller` | 판매자 |
| `vendor` | 벤더 |
| `partner` | 파트너 |
| `operator` | 운영자 (일반) |
| `admin` | 관리자 (일반) |
| `super_admin` | 최고 관리자 (일반) |

### 4.4 역할 조회 흐름

```
로그인 시:
  roleAssignmentService.getRoleNames(userId)
  → SELECT role FROM role_assignments
    WHERE user_id = $1 AND is_active = true
    AND (valid_from IS NULL OR valid_from <= NOW())
    AND (valid_until IS NULL OR valid_until > NOW())
  → generateTokens(user, roles[], domain)
  → JWT payload.roles = ["kpa:admin", "neture:operator"]

인증 미들웨어 (requireAuth):
  → JWT payload에서 roles 읽음 (DB 쿼리 없음)
  → req.user.roles = payload.roles

/auth/status:
  → Fresh DB 쿼리: roleAssignmentService.getRoleNames(userId)
  → 항상 최신 역할 반환
```

### 4.5 역할 확인 미들웨어

| 미들웨어 | 체크 방식 | 용도 |
|---------|----------|------|
| `requireAuth` | JWT 서명 검증 + User 존재 확인 | 일반 인증 |
| `requireAdmin` | `roleAssignmentService.hasAnyRole(userId, ['admin','super_admin','operator'])` | 관리자 |
| `requireRole(roles)` | `roleAssignmentService.hasAnyRole(userId, roles)` | 특정 역할 |
| `requirePermission(perm)` | `user.permissions[]` + `roleAssignmentService.hasPermission()` | 권한 기반 |
| `requirePlatformUser` | Service Token 거부 | 플랫폼 유저 전용 |
| `requireServiceUser` | Platform Token 거부 | 서비스 유저 전용 |
| `requireGuestUser` | Guest Token 확인 | 게스트 전용 |

---

## 5. 서비스 간 인증 구조

### 5.1 인증 방식 비교

| 서비스 | 도메인 | 토큰 저장 | API 인증 | 공유 라이브러리 |
|--------|--------|----------|---------|---------------|
| **Neture** | neture.co.kr | httpOnly Cookie | `credentials: 'include'` | 직접 fetch |
| **KPA Society** | kpa-society.co.kr | localStorage | `Authorization: Bearer` | `@o4o/auth-client` |
| **GlucoseView** | glucoseview.co.kr | httpOnly Cookie | `credentials: 'include'` | 직접 fetch |
| **K-Cosmetics** | k-cosmetics.site | httpOnly Cookie | `credentials: 'include'` | 직접 fetch |
| **GlycoPharm** | glycopharm.co.kr | localStorage | `Authorization: Bearer` | 직접 fetch |
| **Admin** | admin.neture.co.kr | localStorage + Cookie | 혼합 | `@o4o/auth-client` + `@o4o/auth-context` |

### 5.2 동일 인증 vs 독립 인증

**동일 인증 (단일 API 서버)**

모든 서비스가 `api.neture.co.kr`의 동일한 인증 엔드포인트를 사용한다.

```
POST  /api/v1/auth/login     ← 모든 서비스 공통
POST  /api/v1/auth/register  ← 모든 서비스 공통
POST  /api/v1/auth/refresh   ← 모든 서비스 공통
GET   /api/v1/auth/me        ← 모든 서비스 공통
GET   /api/v1/auth/status    ← 모든 서비스 공통
POST  /api/v1/auth/logout    ← 모든 서비스 공통
```

**차이점**: 토큰 저장/전송 방식만 다름 (Cookie vs localStorage)

### 5.3 Cookie 도메인 설정

서버가 인식하는 서비스 도메인:

```typescript
const SERVICE_DOMAINS = [
  '.neture.co.kr',
  '.glycopharm.co.kr',
  '.kpa-society.co.kr',
  '.glucoseview.co.kr',
  '.k-cosmetics.site'
];
```

Cookie 설정:
```typescript
{
  httpOnly: true,
  secure: true,           // 프로덕션
  sameSite: 'none',       // 프로덕션 (Cross-Origin)
  domain: '.neture.co.kr' // Origin에서 자동 추출
}
```

### 5.4 SSO 상태

현재 **미구현**. 각 서비스는 독립적으로 로그인해야 한다.

- `admin.neture.co.kr`에 SSO Service 스텁이 존재 (`sso.ts`)
- `packages/auth-client/src/sso-client.ts` 존재하나 비활성

### 5.5 serviceKey 기반 인증

serviceKey는 **인증이 아닌 데이터 격리**에 사용된다.

| 서비스 | serviceKey | 용도 |
|--------|-----------|------|
| KPA-A | `kpa-a` | 커뮤니티 콘텐츠 격리 |
| KPA-B | `kpa-b` | 데모 서비스 격리 |
| Neture | `neture` | 네처 콘텐츠 격리 |
| Signage | 서비스별 | 디지털 사이니지 콘텐츠 |

---

## 6. AuthContext 구조

### 6.1 서비스별 AuthContext 비교

#### Neture (`web-neture/src/contexts/AuthContext.tsx`)

```typescript
// 토큰: httpOnly Cookie (서버 관리)
// 초기 체크: 마운트 시 GET /auth/me (credentials: 'include')
// 역할 매핑: admin, super_admin → 'admin' / supplier → 'supplier' / 기타 → 'user'
// 로그아웃: POST /auth/logout (credentials: 'include')
```

#### KPA Society (`web-kpa-society/src/contexts/AuthContext.tsx`, 498줄)

```typescript
// 토큰: localStorage (o4o_accessToken / o4o_refreshToken)
// 초기 체크: 토큰 존재 시만 GET /auth/me (토큰 없으면 스킵 → 401 루프 방지)
// Auth Client: @o4o/auth-client (인터셉터 자동 refresh)
// 역할: platform roles + kpaMembership 객체
// 추가 데이터: membershipType, activityType, kpaMembership.serviceAccess
// Service User: 별도 토큰 (kpa_pharmacy_service_access_token)
```

#### GlucoseView (`web-glucoseview/src/contexts/AuthContext.tsx`, 215줄)

```typescript
// 토큰: httpOnly Cookie
// 초기 체크: 마운트 시 GET /auth/me (credentials: 'include')
// 역할 매핑: admin → 'admin' / pharmacist → 'pharmacist' / partner → 'partner'
// 추가 상태: approvalStatus ('pending' | 'approved' | 'rejected')
```

#### K-Cosmetics (`web-k-cosmetics/src/contexts/AuthContext.tsx`, 200줄)

```typescript
// 토큰: httpOnly Cookie
// 초기 체크: Lazy — 보호된 라우트 진입 시만 체크 (checkSession)
// 역할: admin, supplier, seller, partner, operator
```

#### GlycoPharm (`web-glycopharm/src/contexts/AuthContext.tsx`, 398줄)

```typescript
// 토큰: localStorage (glycopharm_access_token / glycopharm_refresh_token)
// 초기 체크: 토큰 존재 시 GET /auth/me (Authorization: Bearer)
// 수동 refresh: 401 시 refreshAccessToken() 호출
// Service User: 별도 토큰 (glycopharm_service_access_token)
```

#### Admin Dashboard (`@o4o/auth-context` + `admin-dashboard/src/stores/authStore.ts`)

```typescript
// 토큰: localStorage (admin-auth-storage) + Cookie (Phase 6-7)
// 초기 체크: localStorage에서 빠른 복원 → 백그라운드 /auth/status 검증
// Auth Client: @o4o/auth-client + @o4o/auth-context
// 역할: domain-prefixed (platform:admin, kpa:admin, neture:operator)
// AdminProtectedRoute: isDashboardRole() 함수로 관리 역할 검증
```

### 6.2 토큰 저장 키 정리

| 서비스 | Access Token 키 | Refresh Token 키 |
|--------|----------------|-----------------|
| Neture | httpOnly Cookie `accessToken` | httpOnly Cookie `refreshToken` |
| KPA | `o4o_accessToken` (localStorage) | `o4o_refreshToken` (localStorage) |
| GlucoseView | httpOnly Cookie `accessToken` | httpOnly Cookie `refreshToken` |
| K-Cosmetics | httpOnly Cookie `accessToken` | httpOnly Cookie `refreshToken` |
| GlycoPharm | `glycopharm_access_token` (localStorage) | `glycopharm_refresh_token` (localStorage) |
| Admin | `admin-auth-storage` (localStorage) | httpOnly Cookie |

### 6.3 초기 인증 체크 패턴

```
┌──────────────────────────────────────────────┐
│ AuthProvider 마운트                            │
├──────────────────────────────────────────────┤
│                                              │
│  Cookie 서비스 (Neture, GlucoseView, K-Cos)  │
│  ┌────────────────────────────────────────┐  │
│  │ useEffect → GET /auth/me              │  │
│  │ credentials: 'include'                │  │
│  │ 200 → setUser(data)                   │  │
│  │ 401 → setUser(null)                   │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  localStorage 서비스 (KPA, GlycoPharm)       │
│  ┌────────────────────────────────────────┐  │
│  │ 토큰 존재 확인                          │  │
│  │ 없음 → setUser(null) (API 호출 안 함)  │  │
│  │ 있음 → GET /auth/me (Bearer 토큰)      │  │
│  │   200 → setUser(data)                  │  │
│  │   401 → tryRefreshToken()              │  │
│  │     성공 → 재시도                       │  │
│  │     실패 → clearAllTokens()            │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  Admin Dashboard                             │
│  ┌────────────────────────────────────────┐  │
│  │ admin-auth-storage에서 빠른 복원        │  │
│  │ (로딩 없이 즉시 렌더링)                 │  │
│  │ 백그라운드: GET /auth/status 검증       │  │
│  │ 불일치 → 로그아웃                       │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

---

## 7. 인증 다이어그램

### 7.1 전체 인증 흐름

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         O4O 인증 아키텍처                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐     POST /auth/login      ┌──────────────────────────┐   │
│  │          │ ──────────────────────►    │                          │   │
│  │ 클라이언트│     email + password       │    o4o-core-api          │   │
│  │          │ ◄──────────────────────    │                          │   │
│  │          │     Set-Cookie + JWT       │  ┌────────────────────┐  │   │
│  └────┬─────┘                           │  │ authentication     │  │   │
│       │                                 │  │ .service.ts        │  │   │
│       │  매 요청마다                     │  │                    │  │   │
│       │  Cookie 또는 Bearer 전송         │  │ 1. rate limit      │  │   │
│       ▼                                 │  │ 2. user lookup     │  │   │
│  ┌──────────┐                           │  │ 3. lock check      │  │   │
│  │ Auth     │     GET /auth/me          │  │ 4. bcrypt verify   │  │   │
│  │ Context  │ ──────────────────────►   │  │ 5. role query      │  │   │
│  │          │ ◄──────────────────────   │  │ 6. JWT generate    │  │   │
│  │ user     │     user + roles          │  └────────────────────┘  │   │
│  │ roles    │                           │                          │   │
│  │ loading  │                           │  ┌────────────────────┐  │   │
│  └────┬─────┘                           │  │ role_assignments   │  │   │
│       │                                 │  │ (SSOT)             │  │   │
│       ▼                                 │  │                    │  │   │
│  ┌──────────┐                           │  │ user_id            │  │   │
│  │ Route    │                           │  │ role               │  │   │
│  │ Guard    │                           │  │ is_active          │  │   │
│  │          │                           │  │ scope_type         │  │   │
│  │ roles[]  │                           │  │ scope_id           │  │   │
│  │ check    │                           │  └────────────────────┘  │   │
│  └──────────┘                           └──────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 7.2 사용자 유형별 인증 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│                    사용자 유형별 인증                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Platform User (약사, 운영자, 관리자, 파트너)                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ POST /auth/login → JWT (user) → httpOnly Cookie          │  │
│  │ requireAuth → DB user 조회 → req.user 설정               │  │
│  │ requireAdmin → roleAssignmentService.hasAnyRole()        │  │
│  │ requireRole(['kpa:admin']) → role_assignments 체크        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Service User (약국 고객, 외부 서비스 이용자)                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ POST /auth/service/login → JWT (service) → localStorage  │  │
│  │ requireServiceUser → 토큰 payload만 (DB 없음)            │  │
│  │ req.serviceUser = { providerUserId, serviceId, storeId } │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Guest User (비회원 방문자)                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ POST /auth/guest/session → JWT (guest) → 2시간 만료      │  │
│  │ requireGuestUser → 토큰 payload만 (DB 없음)              │  │
│  │ req.guestUser = { guestSessionId, serviceId, deviceId }  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Admin / Operator                                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 동일 로그인 → AdminProtectedRoute에서 역할 검증           │  │
│  │ isDashboardRole(): admin, super_admin, operator           │  │
│  │ 또는 서비스:admin, 서비스:operator 패턴                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Supplier / Partner                                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 동일 로그인 → RoleGuard에서 역할 검증                     │  │
│  │ 공급자: neture:supplier 또는 supplier                     │  │
│  │ 파트너: partner                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 서비스별 미들웨어 체인

```
┌────────────────────────────────────────────────────────┐
│              서비스별 미들웨어 체인                       │
├────────────────────────────────────────────────────────┤
│                                                        │
│  일반 API                                              │
│  requireAuth ──► Route Handler                         │
│                                                        │
│  관리자 API                                             │
│  requireAuth ──► requireAdmin ──► Route Handler        │
│                                                        │
│  KPA 서비스                                             │
│  requireAuth ──► requireRole(['kpa:admin'])             │
│              ──► kpaOrgRoleMiddleware('admin')          │
│              ──► Route Handler                          │
│                                                        │
│  GlycoPharm Care API                                   │
│  requireAuth ──► PharmacyContextMiddleware              │
│              ──► (req.pharmacyId 설정)                  │
│              ──► Route Handler                          │
│                                                        │
│  Signage API                                           │
│  requireAuth ──► requireSignageOperator(serviceKey)     │
│              ──► Route Handler                          │
│                                                        │
│  Store API (Service User)                               │
│  requireServiceUser ──► Route Handler                   │
│  (req.serviceUser)                                      │
│                                                        │
│  Store API (Guest)                                      │
│  requireGuestOrServiceUser ──► Route Handler            │
│  (req.guestUser || req.serviceUser)                     │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 8. 보안 기능 요약

### 8.1 구현된 보안 기능

| 기능 | 상태 | 설명 |
|------|------|------|
| bcrypt 비밀번호 해싱 | **구현** | BCRYPT_ROUNDS=12 |
| 계정 잠금 (브루트포스 방지) | **구현** | 연속 실패 시 자동 잠금 |
| Rate Limiting | **구현** | IP + Email 기반 |
| Token Family 회전 | **구현** | Refresh Token 도난 감지 |
| httpOnly Cookie | **구현** | XSS 토큰 탈취 방지 |
| Secure + SameSite | **구현** | CSRF 방지 |
| JWT 발급자/수신자 검증 | **구현** | iss + aud 체크 |
| 세션 관리 | **구현** | 동시 접속 제한 |
| 비밀번호 재설정 | **구현** | 10분 만료 토큰 |

### 8.2 미구현 사항

| 기능 | 상태 | 비고 |
|------|------|------|
| SSO (Cross-Service) | **미구현** | 스텁 존재, 서비스별 개별 로그인 필요 |
| MFA (Multi-Factor Auth) | **미구현** | - |
| OAuth Provider 통합 | **부분** | Google/Kakao/Naver 소셜 로그인 코드 존재 |
| API Key 인증 | **미구현** | 외부 시스템 연동용 |

---

## 9. 파일 매니페스트

### API 서버 인증

| 파일 | 역할 |
|------|------|
| `apps/api-server/src/utils/token.utils.ts` | JWT 생성/검증, 토큰 만료, HS256 서명 |
| `apps/api-server/src/common/middleware/auth.middleware.ts` | requireAuth, requireAdmin, requireRole 등 12개 미들웨어 |
| `apps/api-server/src/middleware/auth.middleware.ts` | 호환 re-export (72 importers) |
| `apps/api-server/src/modules/auth/controllers/auth.controller.ts` | login, register, logout, me, status, refresh |
| `apps/api-server/src/services/authentication.service.ts` | 인증 비즈니스 로직, Cookie 설정 |
| `apps/api-server/src/utils/cookie.utils.ts` | httpOnly Cookie 관리, 도메인 감지 |
| `apps/api-server/src/modules/auth/entities/RoleAssignment.ts` | role_assignments 엔티티 |
| `apps/api-server/src/modules/auth/services/role-assignment.service.ts` | 역할 조회/할당/검증 |
| `apps/api-server/src/modules/auth/services/login-security.service.ts` | 로그인 보안, Rate Limit |
| `apps/api-server/src/types/roles.ts` | 전체 역할 타입 정의 + Registry |

### 서비스별 미들웨어

| 파일 | 역할 |
|------|------|
| `apps/api-server/src/modules/care/care-pharmacy-context.middleware.ts` | GlycoPharm 약국 컨텍스트 |
| `apps/api-server/src/routes/kpa/middleware/kpa-org-role.middleware.ts` | KPA 조직 역할 체크 |
| `apps/api-server/src/middleware/signage-role.middleware.ts` | Signage 역할 5단계 |

### 공유 패키지

| 파일 | 역할 |
|------|------|
| `packages/auth-client/src/client.ts` | AuthClient 클래스, 인터셉터, refresh 로직 |
| `packages/auth-client/src/token-storage.ts` | localStorage SSOT (o4o_accessToken) |
| `packages/auth-client/src/sso-client.ts` | SSO 클라이언트 (비활성) |
| `packages/auth-client/src/rbac.ts` | RBAC 유틸리티 |
| `packages/auth-context/src/AuthProvider.tsx` | React AuthProvider (Cookie/localStorage) |
| `packages/auth-context/src/AdminProtectedRoute.tsx` | 관리자 라우트 보호 |

### 프론트엔드 AuthContext

| 파일 | 서비스 | 줄 수 |
|------|--------|------|
| `services/web-neture/src/contexts/AuthContext.tsx` | Neture | 193 |
| `services/web-kpa-society/src/contexts/AuthContext.tsx` | KPA Society | 498 |
| `services/web-kpa-society/src/api/client.ts` | KPA API Client | 128 |
| `services/web-kpa-society/src/api/token-refresh.ts` | KPA Token Refresh | 74 |
| `services/web-glucoseview/src/contexts/AuthContext.tsx` | GlucoseView | 215 |
| `services/web-k-cosmetics/src/contexts/AuthContext.tsx` | K-Cosmetics | 200 |
| `services/web-glycopharm/src/contexts/AuthContext.tsx` | GlycoPharm | 398 |
| `apps/admin-dashboard/src/stores/authStore.ts` | Admin Dashboard | 201 |

### Route Guard

| 파일 | 서비스 |
|------|--------|
| `services/web-neture/src/components/auth/RoleGuard.tsx` | Neture |
| `services/web-kpa-society/src/components/auth/RoleGuard.tsx` | KPA |
| `services/web-kpa-society/src/components/admin/AdminAuthGuard.tsx` | KPA Admin |
| `services/web-kpa-society/src/components/auth/PharmacistOnlyGuard.tsx` | KPA 약사 전용 |
| `services/web-kpa-society/src/components/branch-admin/BranchAdminAuthGuard.tsx` | KPA 분회 관리자 |

---

*Investigation completed: 2026-03-06*
*Investigator: Claude Code (AI)*
*No code modifications were made during this audit.*

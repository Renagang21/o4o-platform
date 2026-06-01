# IR-O4O-IDENTITY-ARCHITECTURE-AUDIT-V1

> **O4O 플랫폼 사용자 인증 및 Identity 구조 전체 감사**
> 작성일: 2026-03-04
> 상태: READ-ONLY 조사 완료
> 범위: api-server + 전체 프론트엔드 서비스 (KPA, Neture, GlycoPharm, GlucoseView, Cosmetics, Admin Dashboard)

---

## 결론 요약: 구조 A 확정

O4O 플랫폼은 **Identity 공유 + Session 공유 + 서비스 격리(Role Prefix)** 구조로 구현되어 있다.

```
                    ┌─────────────────────────┐
                    │    Identity Core         │
                    │  ┌───────────────────┐   │
                    │  │ users (단일 테이블) │   │
                    │  │ role_assignments   │   │
                    │  │ auth (단일 로그인)  │   │
                    │  └───────────────────┘   │
                    └────────────┬─────────────┘
                                 │
          ┌──────────┬───────────┼───────────┬──────────┐
          ▼          ▼           ▼           ▼          ▼
       ┌─────┐  ┌────────┐  ┌───────┐  ┌────────┐  ┌──────────┐
       │ KPA │  │ Neture │  │Glyco- │  │Glucose-│  │Cosmetics │
       │     │  │        │  │Pharm  │  │View    │  │          │
       └─────┘  └────────┘  └───────┘  └────────┘  └──────────┘
       격리       bypass      bypass     bypass      bypass
```

---

## Phase 1. users 테이블

### 1.1 위치

| 항목 | 값 |
|------|------|
| **Entity 파일** | `apps/api-server/src/modules/auth/entities/User.ts` |
| **재수출** | `apps/api-server/src/entities/User.ts` |
| **테이블명** | `users` |
| **데이터베이스** | `o4o_platform` (단일 DB, Cloud SQL) |

### 1.2 모든 서비스가 같은 users 테이블 사용

**YES — 100% 공유.**

| 서비스 | 자체 User 엔티티 | users 테이블 사용 |
|--------|:----------------:|:-----------------:|
| KPA Society | ❌ 없음 | ✅ API 서버 경유 |
| Neture | ❌ 없음 | ✅ API 서버 경유 |
| GlycoPharm | ❌ 없음 | ✅ API 서버 경유 |
| GlucoseView | ❌ 없음 | ✅ API 서버 경유 |
| K-Cosmetics | ❌ 없음 | ✅ API 서버 경유 |
| Admin Dashboard | ❌ 없음 | ✅ API 서버 경유 |

모든 프론트엔드 서비스는 `o4o-core-api` (Cloud Run)의 REST API를 호출. 자체 User 모델 없음.

### 1.3 주요 컬럼

```
id, email (UNIQUE), password (bcrypt), name, nickname, avatar, phone,
status (ACTIVE/INACTIVE/PENDING/APPROVED/SUSPENDED/REJECTED),
isActive, isEmailVerified, domain, service_key,
provider, provider_id (OAuth),
lastLoginAt, lastLoginIp, loginAttempts, lockedUntil,
onboarding_completed, tos_accepted_at, privacy_accepted_at,
createdAt, updatedAt

삭제됨 (RBAC 정규화 완료):
  role, roles, pharmacist_role, pharmacist_function
```

**런타임 `roles: string[]`:** DB 컬럼이 아님. `requireAuth` 미들웨어에서 JWT payload로부터 할당.

---

## Phase 2. role_assignments

### 2.1 테이블 구조

| 컬럼 | 타입 | 용도 |
|------|------|------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | CASCADE 삭제 |
| `role` | VARCHAR(50) | 서비스 프리픽스 포함 (예: `kpa:admin`) |
| `is_active` | BOOLEAN | 활성 여부 |
| `valid_from` | TIMESTAMP | 유효 시작 |
| `valid_until` | TIMESTAMP | 유효 종료 (nullable) |
| `assigned_by` | UUID FK → users | 할당자 |
| `scope_type` | VARCHAR(50) | `'global'` 또는 `'organization'` |
| `scope_id` | UUID | scope_type='organization'일 때 조직 ID |

**UNIQUE 제약:** `(user_id, role, is_active)` — 사용자당 동일 역할 중복 불가.

### 2.2 **글로벌 공유 테이블**

`role_assignments`는 **모든 서비스가 공유하는 단일 테이블.** 서비스 구분은 **역할 프리픽스**로 수행.

### 2.3 역할 프리픽스 전체 목록

| 프리픽스 | 서비스 | 주요 역할 |
|----------|--------|----------|
| `platform:` | 플랫폼 전체 | `super_admin`, `admin`, `operator` |
| `kpa:` | KPA 약사회 | `admin`, `operator`, `pharmacist`, `district_admin`, `branch_admin`, `branch_operator` |
| `neture:` | 네처 | `admin`, `operator`, `products:read/write`, `orders:read/manage`, `partners:read/manage` |
| `glycopharm:` | 글라이코팜 | `admin`, `operator`, `products:read/write`, `forum:read/write/manage` |
| `glucoseview:` | 글루코스뷰 | `admin`, `operator`, `customer:read/write/manage`, `pharmacist:read/manage` |
| `cosmetics:` | 코스메틱스 | `admin`, `operator`, `products:read/write`, `partners:manage` |
| (무프리픽스) | 레거시 | `admin`, `super_admin`, `operator`, `supplier`, `seller`, `partner`, `user` |

### 2.4 서비스 레지스트리

| 코드 | API 경로 | 상태 |
|------|----------|:----:|
| `kpa-society` | `/api/v1/kpa` | active |
| `neture` | `/api/v1/neture` | active |
| `glycopharm` | `/api/v1/glycopharm` | active |
| `glucoseview` | `/api/v1/glucoseview` | active |
| `cosmetics` | `/api/v1/cosmetics` | active |

---

## Phase 3. 로그인 API

### 3.1 **단일 통합 로그인 엔드포인트**

```
POST /api/v1/auth/login        ← 모든 서비스 공유 (플랫폼 사용자)
POST /api/v1/auth/service/login ← OAuth 서비스 사용자 (DB 저장 없음)
POST /api/v1/auth/guest/issue   ← QR/키오스크 게스트 (DB 저장 없음)
```

**서비스별 분리 로그인 없음.** `/api/v1/kpa/login`, `/api/v1/neture/login` 같은 것은 존재하지 않음.

### 3.2 로그인 흐름

```
POST /api/v1/auth/login { email, password }
  ↓
1. users 테이블에서 email 검색
2. bcrypt 비밀번호 검증
3. roleAssignmentService.getRoleNames(userId) → ['kpa:admin', 'kpa:operator']
4. JWT 생성 (roles 포함)
5. httpOnly 쿠키 설정 + (크로스 도메인 시 body에도 토큰 포함)
  ↓
Response: { user: { id, email, roles, scopes, ... }, tokens?: { ... } }
```

### 3.3 /auth/status vs /auth/me

| 엔드포인트 | 인증 필수 | roles 소스 | 용도 |
|------------|:--------:|-----------|------|
| `GET /auth/status` | ❌ optionalAuth | **role_assignments DB 쿼리** (실시간) | 앱 초기화 시 세션 확인 |
| `GET /auth/me` | ✅ requireAuth | JWT payload (캐시) | 프로필 조회 |

---

## Phase 4. JWT 구조

### 4.1 3종 토큰 체계

| 토큰 타입 | `tokenType` | 만료 | DB 조회 | 용도 |
|-----------|:-----------:|:----:|:-------:|------|
| **Platform User** | `'user'` | 15분 (리프레시 7일) | ✅ User 엔티티 | 플랫폼 사용자 |
| **Service User** | `'service'` | 15분 | ❌ 없음 | OAuth 서비스 사용자 |
| **Guest** | `'guest'` | 2시간 | ❌ 없음 | QR/키오스크 |

### 4.2 Platform User JWT Payload

```json
{
  "userId": "uuid",
  "sub": "uuid",
  "email": "user@example.com",
  "role": "kpa:admin",
  "roles": ["kpa:admin", "kpa:operator"],
  "permissions": [],
  "scopes": ["kpa:operator", "admin:user-management"],
  "domain": "neture.co.kr",
  "tokenType": "user",
  "iss": "o4o-platform",
  "aud": "o4o-api",
  "exp": 1709553600,
  "iat": 1709552700
}
```

**핵심:** JWT에 `service` 필드는 **없음.** 서비스 구분은 `roles[]` 배열의 프리픽스로 수행.

### 4.3 서버 격리 (Phase 2.5)

- `iss` (issuer): `JWT_ISSUER` 환경변수 → `"o4o-platform"`
- `aud` (audience): `JWT_AUDIENCE` 환경변수 → `"o4o-api"`
- 다른 서버에서 발급한 토큰은 issuer/audience 불일치로 자동 거부

### 4.4 토큰 추출 우선순위

```
1. Authorization: Bearer {token} 헤더
2. httpOnly 쿠키 (accessToken)
```

### 4.5 크로스 도메인 처리

| 상황 | 쿠키 | Body 토큰 |
|------|:----:|:---------:|
| 같은 도메인 (admin.neture.co.kr → api.neture.co.kr) | ✅ 설정 | ❌ 미포함 |
| 크로스 도메인 (glycopharm.co.kr → api.neture.co.kr) | ✅ 설정 | ✅ 포함 |

---

## Phase 5. 서비스별 인증 미들웨어

### 5.1 미들웨어 체인

```
요청 → extractToken(cookie/header) → verifyAccessToken(iss/aud 검증) → requireAuth/requireServiceUser/requireGuestUser
```

| 미들웨어 | 토큰 타입 | DB 조회 | 용도 |
|----------|:---------:|:-------:|------|
| `requireAuth` | `user` | ✅ User 엔티티 | 플랫폼 사용자 인증 |
| `requireServiceUser` | `service` | ❌ | OAuth 서비스 사용자 |
| `requireGuestUser` | `guest` | ❌ | QR/키오스크 |
| `requireAdmin` | `user` | ✅ role_assignments | 관리자 권한 |
| `optionalAuth` | `user` | ✅ (있으면) | 인증 선택적 |

### 5.2 서비스 격리: Scope Guard

**서비스 식별 방식:** URL 경로 + 역할 프리픽스 조합

```
/api/v1/kpa/*      → KPA_SCOPE_CONFIG 가드 적용
/api/v1/neture/*   → NETURE_SCOPE_CONFIG 가드 적용
/api/v1/cosmetics/* → 인라인 Cosmetics 가드 적용
/api/v1/glycopharm/* → GLYCOPHARM_SCOPE_CONFIG 가드 적용
```

**Scope Guard 로직 (3단계):**

```
1. 해당 서비스 역할 보유? (예: kpa:admin) → PASS
2. 다른 서비스 역할 보유? (예: neture:admin → KPA 접근 시) → 403 DENY (크로스 서비스 차단)
3. 기본 → 403 DENY
```

### 5.3 크로스 서비스 접근 매트릭스

| 사용자 역할 → 서비스 | KPA | Neture | GlycoPharm | Cosmetics | GlucoseView |
|---------------------|:---:|:------:|:----------:|:---------:|:-----------:|
| `kpa:admin` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `neture:admin` | ❌ | ✅ | ❌ | ❌ | ❌ |
| `glycopharm:admin` | ❌ | ❌ | ✅ | ❌ | ❌ |
| `cosmetics:admin` | ❌ | ❌ | ❌ | ✅ | ❌ |
| `platform:super_admin` | **❌** | ✅ | ✅ | ✅ | ✅ |

**KPA만 `platformBypass: false`** — platform:super_admin도 KPA에 접근 불가 (조직 격리).

### 5.4 프론트엔드 서비스 인증 설정

| 프론트엔드 | API Base URL | 인증 방식 |
|-----------|-------------|----------|
| web-kpa-society | `{VITE_API_BASE_URL}/api/v1/kpa` | Bearer 토큰 (localStorage) |
| web-neture | `{VITE_API_BASE_URL}/api/v1/neture` | Bearer 토큰 |
| web-glycopharm | `{VITE_API_BASE_URL}/api/v1/glycopharm` | authFetch |
| admin-dashboard | `{VITE_API_BASE_URL}/api/v1` | Cookie (auth-context) |

**공통:** `VITE_API_BASE_URL = https://api.neture.co.kr`

### 5.5 세션/쿠키 구조

- **단일 세션:** 모든 프론트엔드가 같은 로그인 세션 사용
- **서비스 분리:** JWT의 `roles[]`로 접근 가능 서비스 결정
- **쿠키 도메인:** `.neture.co.kr` (같은 도메인 하위 서비스 공유)
- **크로스 도메인:** Bearer 토큰 사용 (쿠키 불가 시)

---

## 완료 기준 답변

| # | 질문 | 답변 |
|---|------|------|
| 1 | **users 테이블이 어디에 있는가?** | `o4o-core-api` (api-server) 단일 DB. 모든 서비스가 공유. |
| 2 | **모든 서비스가 같은 users를 사용하는가?** | **YES.** KPA, Neture, GlycoPharm, Cosmetics, GlucoseView 모두 동일 API 서버의 users 테이블 사용. |
| 3 | **role_assignments 위치?** | **Global.** 단일 테이블, 역할 프리픽스(`kpa:`, `neture:` 등)로 서비스 구분. |
| 4 | **로그인 API?** | `POST /api/v1/auth/login` **하나.** 서비스별 분리 로그인 없음. |
| 5 | **JWT 구조?** | `{ userId, roles: ["kpa:admin"], tokenType: "user", iss, aud }` — service 필드 없음, 역할 프리픽스로 서비스 구분. |

---

## Identity 구조 확정

```
O4O Identity Core
├── users               → 단일 테이블 (Identity ONLY)
├── role_assignments    → 단일 테이블 (RBAC SSOT, 역할 프리픽스)
├── auth                → 단일 로그인 (/api/v1/auth/login)
├── JWT                 → 3종 토큰 (user/service/guest)
└── Scope Guard         → 서비스별 역할 프리픽스 차단

서비스 격리
├── KPA          → platformBypass: false (완전 격리)
├── Neture       → platformBypass: true
├── GlycoPharm   → platformBypass: true
├── Cosmetics    → platformBypass: true
└── GlucoseView  → platformBypass: true
```

**이 구조에서 가능한 것:**
- ✅ SSO (Single Sign-On) — 이미 구현됨 (단일 로그인)
- ✅ 서비스 세션 분리 — Scope Guard로 구현됨
- ✅ 멀티 서비스 역할 할당 — role_assignments에 여러 프리픽스 역할 가능
- ✅ 플랫폼 관리자 크로스 서비스 접근 — platformBypass 설정으로 제어

---

## 주요 파일 참조

### Identity Core
- `apps/api-server/src/modules/auth/entities/User.ts` — User 엔티티
- `apps/api-server/src/modules/auth/entities/RoleAssignment.ts` — RoleAssignment 엔티티
- `apps/api-server/src/modules/auth/services/role-assignment.service.ts` — RoleAssignmentService
- `apps/api-server/src/utils/token.utils.ts` — JWT 생성/검증
- `apps/api-server/src/database/connection.ts` — DB 연결 설정

### Auth 미들웨어
- `apps/api-server/src/common/middleware/auth.middleware.ts` — 핵심 인증 미들웨어
- `apps/api-server/src/middleware/auth.middleware.ts` — 재수출
- `apps/api-server/src/middleware/permission.middleware.ts` — 권한 미들웨어

### Service Scope Guard
- `packages/security-core/src/service-scope-guard.ts` — 스코프 가드 팩토리
- `packages/security-core/src/service-configs.ts` — 서비스별 설정 (KPA, Neture, GlycoPharm 등)

### Auth Controller
- `apps/api-server/src/modules/auth/controllers/auth.controller.ts` — login/me/status/refresh
- `apps/api-server/src/modules/auth/routes/auth.routes.ts` — 플랫폼 사용자 라우트
- `apps/api-server/src/modules/auth/routes/service-auth.routes.ts` — 서비스 사용자 라우트
- `apps/api-server/src/modules/auth/routes/guest-auth.routes.ts` — 게스트 라우트

### Service Registry
- `apps/api-server/src/config/service-registry.ts` — 서비스 등록
- `apps/api-server/src/config/service-scopes.ts` — 서비스 스코프 정의

### Frontend Auth
- `packages/auth-context/src/AuthProvider.tsx` — 프론트엔드 인증 Provider
- `packages/auth-client/src/client.ts` — API 클라이언트
- `services/web-kpa-society/src/api/client.ts` — KPA API 클라이언트
- `services/web-neture/src/lib/api.ts` — Neture API 클라이언트

### Route Mounting
- `apps/api-server/src/main.ts` (L551-1023) — 전체 서비스 라우트 마운트

---

*IR-O4O-IDENTITY-ARCHITECTURE-AUDIT-V1 완료*
*조사자: Claude Code*
*일자: 2026-03-04*

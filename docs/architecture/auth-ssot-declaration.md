# Auth SSOT 선언 & Token Storage 정책 확정

> **Work Order ID**: WO-AUTH-SSOT-TOKEN-DECLARATION-V1
> **Version**: 1.0
> **Status**: Decision & Declaration (APPROVED)
> **Date**: 2026-01-06
> **Precondition**: WO-AUTH-INVESTIGATION-R3, WO-AUTH-INVESTIGATION-R3-B (PASS)

---

## 1. 목적 (Purpose)

본 문서는 다음 두 가지를 **공식 확정**한다:

1. **Auth 영역의 단일 진실 원점(SSOT) 공식 선언**
2. **플랫폼 전체에서 통일 적용할 토큰 저장 정책 확정**

---

## 2. 결정 1 - Auth SSOT 공식 선언

### 2.1 SSOT 선언문 (확정)

> **O4O Platform에서 인증(Auth)의 단일 진실 원점(SSOT)은
> `AuthenticationService` 단 하나뿐이다.**

### 2.2 공식 정책

| 항목 | 정책 |
|------|------|
| Auth 핵심 서비스 | `AuthenticationService` |
| deprecated 서비스 | `AuthService`, `AuthServiceV2` |
| 상태 | **즉시 Deprecated -> 접근 차단 대상** |
| 신규 개발 | AuthenticationService 외 사용 금지 |

### 2.3 Deprecated 서비스 처리 원칙

- 즉시 삭제하지 않는다
- **Import 불가 상태로 전환**
- 주석 및 문서로 "사용 금지" 명시
- Implementation Phase에서 단계적 제거

### 2.4 SSOT 기준 아키텍처

```
[ Client ]
    |
    v
[ Auth Routes ]
    |
    v
[ AuthenticationService ]   <-- 유일한 Auth 판단자
    |
    v
[ DB / Token / Role ]
```

다른 어떤 서비스도:
- 토큰 생성 금지
- 인증 판단 금지
- Role 해석 금지

---

## 3. 결정 2 - Token Storage 정책 확정

### 3.1 현재 문제 정의

- 동일 accessToken이 3개 이상의 localStorage 키에 중복 저장
- 서비스별 prefix로 분산 저장
- 결과: 세션 공유 불가, 디버깅 불가, 보안/운영 기준 붕괴

### 3.2 Token Storage 정책 (확정)

**단일 키 + 플랫폼 prefix 방식 채택**

```
localStorage Key (표준)
-> o4o_accessToken
```

### 3.3 정책 선택 이유

| 옵션 | 판정 | 사유 |
|------|------|------|
| `accessToken` 단일 | X | 타 라이브러리와 충돌 위험 |
| 서비스별 prefix | X | 세션 단절, 복잡성 증가 |
| `o4o_accessToken` | O | 명확한 소유권, 충돌 방지 |

### 3.4 세부 정책

| 항목 | 정책 |
|------|------|
| accessToken 저장 | `o4o_accessToken` |
| 중복 키 | 전면 금지 |
| 하위 호환 | Migration Phase에서만 임시 허용 |
| 토큰의 주인 | **플랫폼 (O4O)** |

### 3.5 Cookie 인증과의 관계

본 문서에서는 Cookie vs localStorage 통일을 결정하지 않는다.
단, 다음 원칙을 선언한다:

> **Cookie 인증을 도입하더라도,
> Token의 "논리적 진실 원점"은 AuthenticationService이다.**

---

## 4. Auth <-> Infra 책임 경계 선언

### 4.1 책임 분리 원칙

| 영역 | 책임 |
|------|------|
| Auth | 인증 판단 (401/403) |
| Infra(DB, Network) | 서비스 가용성 |
| Health Check | DB 상태 판단 |

**Auth는 DB 상태 검사자가 아니다**

### 4.2 GRACEFUL_STARTUP 정책

본 문서에서는 정책 변경을 하지 않는다.
단, 다음 Phase에서 반드시 다룬다:

> "DB 실패 시 Auth가 503을 반환해야 하는가?"

---

## 5. Definition of Done (DoD)

- Auth SSOT가 문서/코드/의사결정에서 단일화
- 토큰 저장 정책이 논쟁 없이 명확
- 다음 Implementation Work Order를 기계적으로 작성 가능

---

## 6. 구현 완료 내역 (Implementation Completed)

### Phase 4-A (Implementation) - COMPLETED 2026-01-06
**WO-AUTH-SSOT-MIGRATION-V1**
- [x] deprecated AuthService imports 제거
- [x] AuthServiceV2 exports 제거
- [x] SocialAuthService가 tokenUtils/cookieUtils 직접 사용
- [x] 라우트 레이어 통합 확인
- [x] 코드 레벨 SSOT 선언 강화

### Phase 4-B (Implementation) - COMPLETED 2026-01-06
**WO-AUTH-TOKEN-MIGRATION-V1**
- [x] Token Storage 유틸리티 생성 (`packages/auth-context/src/token-storage.ts`)
- [x] Token Storage 유틸리티 생성 (`packages/auth-client/src/token-storage.ts`)
- [x] auth-context AuthProvider 중복 저장 제거
- [x] auth-client 중복 토큰 접근 제거
- [x] glycopharm-web 독자 키 -> SSOT 전환

### 생성된 SSOT 유틸리티

```typescript
// packages/auth-context/src/token-storage.ts
// packages/auth-client/src/token-storage.ts
// services/web-glycopharm/src/utils/token-storage.ts

export function getAccessToken(): string | null;
export function setAccessToken(token: string): void;
export function clearAccessToken(): void;
export function getRefreshToken(): string | null;
export function setRefreshToken(token: string): void;
export function clearAllTokens(): void;
```

### Migration 동작

- 읽기: `o4o_accessToken` → 레거시 키 (fallback)
- 쓰기: `o4o_accessToken`만 사용 + 레거시 키 자동 삭제

### Phase 5-B (Implementation) - COMPLETED 2026-01-06
**WO-AUTH-INFRA-SEPARATION-V1**
- [x] Auth 계층의 DB 상태 검사 제거 (503 반환 금지)
- [x] Startup/Infra 로직 주석 강화
- [x] Health Check 책임 재정의
- [x] Auth 응답 정합성 확인

**핵심 원칙:**
- Auth는 503을 반환하지 않음
- 503 판단은 Health Check의 책임
- DB 실패 시 Auth는 500 반환

@see [docs/architecture/auth-infra-separation.md](./auth-infra-separation.md)

### Phase 6-7 (Implementation) - COMPLETED 2026-01-06
**WO-AUTH-COOKIE-TRANSITION-V1**

#### 정책 선언: Cookie Primary, localStorage Legacy

> **O4O Platform의 B2C 인증은 Cookie를 기본(Primary) 전략으로 사용한다.**
> **localStorage는 Legacy 호환을 위한 옵션으로만 제공된다.**

| 항목 | Cookie (Primary) | localStorage (Legacy) |
|------|------------------|----------------------|
| 적용 대상 | B2C Web 서비스 (기본) | Admin Dashboard 등 특수 케이스 |
| 토큰 저장 | httpOnly Cookie | `o4o_accessToken` localStorage |
| 인증 상태 판별 | `/auth/status` API 호출 | localStorage 토큰 존재 확인 |
| 보안 수준 | XSS 방어 가능 | XSS 취약 |
| 설정 방법 | `AuthClient({ strategy: 'cookie' })` (기본값) | `AuthClient({ strategy: 'localStorage' })` |

#### 완료 작업

- [x] Task 1: Cookie Auth Primary 전환
  - `/auth/login`, `/auth/signup`, `/auth/refresh` - httpOnly Cookie 설정
  - JSON body 토큰 반환 → optional (`includeLegacyTokens: true` 시에만)
  - `/auth/logout` - Cookie 클리어

- [x] Task 2: Auth Client 기본 전략 변경
  - `AuthClient` 기본 strategy: `'cookie'`
  - `withCredentials: true` 자동 설정 (cookie strategy)
  - localStorage 전략: `{ strategy: 'localStorage' }` 옵션 필요

- [x] Task 3: 인증 상태 판별 로직 수정 (Web)
  - Cookie strategy: `/auth/status` API 호출로 인증 상태 확인
  - localStorage strategy: 기존 localStorage 토큰 확인 (legacy)
  - `AuthProvider`에 `strategy` prop 추가

- [x] Task 4: localStorage Fallback 범위 제한
  - token-storage.ts: localStorage strategy 전용 명시
  - Cookie strategy에서는 사용하지 않음

#### 영향받은 파일

**API Server:**
- `apps/api-server/src/routes/auth.ts`
- `apps/api-server/src/modules/auth/controllers/auth.controller.ts`

**Packages:**
- `packages/auth-client/src/client.ts` - AuthStrategy 타입, 기본값 'cookie'
- `packages/auth-client/src/types.ts` - AuthResponse 타입 업데이트
- `packages/auth-client/src/token-storage.ts` - Phase 6-7 문서화
- `packages/auth-context/src/AuthProvider.tsx` - strategy prop 추가

---

## 7. 최종 판정

> **이제 Auth는 "고치는 대상"이 아니라
> "기준이 생긴 영역"이 되었다.**
>
> **Phase 6-7 추가:**
> **Cookie Primary, localStorage Legacy - 인증 전략이 명확해졌다.**

---

## 8. Freeze 선언 (Phase 8)

**WO-AUTH-FULL-VERIFICATION-V1** 검증 완료 후, Auth 영역은 **FROZEN** 상태로 전환되었다.

| 검증 항목 | 결과 |
|-----------|------|
| A-1. Auth SSOT 검증 | ✅ PASS |
| A-2. Auth ↔ Infra 책임 분리 검증 | ✅ PASS |
| B-1. Token 저장 정책 검증 | ✅ PASS |
| B-2. Fallback 정책 검증 | ✅ PASS |
| C-1~3. Cookie Auth 동작 검증 | ✅ PASS |
| D-1~2. 운영 시나리오 검증 | ✅ PASS |
| E. 문서·코드 정합성 검증 | ✅ PASS |

> **Auth 영역 변경은 명시적 승인 없이 불가하다.**

@see [auth-freeze-declaration.md](./auth-freeze-declaration.md)

---

*Approved: 2026-01-06*
*Updated: 2026-01-06 (Phase 8 - Freeze)*
*Status: Platform Infrastructure - FROZEN*

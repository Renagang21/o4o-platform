# IR-O4O-AUTHENTICATION-SERVICE-SPLIT-POST-CHECK-V1

> **WO-O4O-AUTHENTICATION-SERVICE-SPLIT-V1 분해 결과 사후 점검**

| 항목 | 값 |
|------|------|
| 작성일 | 2026-03-21 |
| 기준 작업 | WO-O4O-AUTHENTICATION-SERVICE-SPLIT-V1 |
| 기준 브랜치 | `feature/auth-service-split` |
| 기준 커밋 | `6f2f562b3` |
| 상태 | push 전 |
| 산출물 | 분해 품질 판정 + 잔존 이슈 + 다음 대상 추천 |

---

## 1. 전체 판정

| 항목 | 결과 |
|------|------|
| **auth split 최종 상태** | **SAFE — 성공적 분해** |
| **oversized 정비 1차 완료** | **확정 가능** |
| **push 가능 여부** | **가능** (dead code 1건은 선택적 follow-up) |

근거:
- facade 17개 public method 전부 정상 위임
- 외부 소비자 4개 파일 변경 0건
- sub-service 간 의존 방향 acyclic
- `tsc --noEmit` 신규 오류 0건
- 중복 로직 5회 → `auth-context.helper.ts`로 통합 완료

---

## 2. 파일별 상세 표

### 2.1 Facade

| 항목 | 값 |
|------|------|
| 파일 | `services/authentication.service.ts` |
| 줄 수 | 149 (was 1,277) |
| 역할 | Thin facade — 5 sub-service 인스턴스 + 17 delegation |
| 판정 | **SAFE** |
| 책임 혼합 | 없음 (순수 delegation만) |
| 비고 | business logic 0줄, singleton export 패턴 유지 |

### 2.2 Sub-services

| 파일 | 줄 수 | 역할 | 판정 | 책임 혼합 | 비고 |
|------|-------|------|------|----------|------|
| `auth/auth-login.service.ts` | 508 | email + OAuth 로그인 | **SAFE** | 단일 (login flow) | 508줄이나 email/OAuth는 하나의 login flow — 아래 §4 상세 |
| `auth/auth-token-session.service.ts` | 171 | token refresh, verify, logout, cookie | **SAFE** | 단일 (token/session) | token 생명주기 전체를 무리 없이 포함 |
| `auth/auth-service-user.service.ts` | 156 | Service User OAuth | **SAFE** | 단일 (service auth) | 독립 leaf service, 외부 의존 최소 |
| `auth/auth-guest.service.ts` | 262 | Guest token + upgrade | **SAFE** | 단일 (guest flow) | ServiceUserService 주입받아 upgrade 처리 |
| `auth/auth-account-inquiry.service.ts` | 216 | canLogin, providers, test accounts, find-id | **SAFE** | 단일 (inquiry) | 조회 전용, 상태 변경 없음 (test account 제외) |
| `auth/auth-context.helper.ts` | 63 | role/membership freshening | **SAFE** | helper 범위 이내 | 3 exported functions, 부작용 없음 |

**합계**: 1,525줄 (원본 1,277줄 + 248줄 boilerplate overhead)

### 2.3 External Consumers (변경 0건)

| 소비자 | import 방식 | 호출 메서드 | 변경 | 판정 |
|--------|------------|-----------|------|------|
| `auth/controllers/auth.controller.ts` | `{ authenticationService }` | login, setAuthCookies, logout, clearAuthCookies, refreshTokens, logoutAll | 0건 | **SAFE** |
| `auth/controllers/password.controller.ts` | `{ authenticationService }` | setAuthCookies | 0건 | **SAFE** |
| `auth/routes/service-auth.routes.ts` | `{ getAuthenticationService }` | handleServiceUserLogin, refreshTokens | 0건 | **SAFE** |
| `auth/routes/guest-auth.routes.ts` | `{ getAuthenticationService }` | issueGuestToken, upgradeGuestToServiceUser | 0건 | **SAFE** |

### 2.4 Sub-service Dependency Graph

```
authentication.service.ts (Facade)
├── AuthLoginService
│   └── auth-context.helper ✓
├── AuthTokenSessionService
│   └── auth-context.helper ✓
├── AuthServiceUserService
│   (standalone — leaf)
├── AuthGuestService
│   └── AuthServiceUserService (constructor injection) ✓
└── AuthAccountInquiryService
    (standalone — leaf)
```

- 순환 참조 없음
- 모든 의존 방향 단방향 (acyclic)
- sub-service 간 직접 참조는 1건만 (Guest → ServiceUser, type import + constructor injection)
- 외부에서 sub-service 직접 import 0건 — facade 통과만 허용

---

## 3. 잔존 이슈

### 3.1 Dead Code (pre-existing)

| 위치 | 내용 | 원인 | 심각도 | 권장 |
|------|------|------|--------|------|
| `auth-login.service.ts:469-475` | `handleSuccessfulLogin()` private method | `handleEmailLogin()`에서 동일 로직을 인라인으로 수행 (lines 191-196). 이 메서드는 호출부가 없음 | **LOW** | 제거 가능 (10줄) |

**중요**: 이 dead code는 원본 `authentication.service.ts`에 이미 존재했던 것이며, 분해가 원인이 아님. WO의 "구조 분해만, 동작 변경 없음" 원칙에 따라 그대로 추출된 것.

### 3.2 Facade 메서드 중 외부 소비자 0건 (pre-existing)

아래 facade 메서드는 어떤 controller/route에서도 호출하지 않음:

| 메서드 | facade 줄 | sub-service | 설명 |
|--------|----------|-------------|------|
| `canLogin()` | 121 | AccountInquiry | 호출부 없음 |
| `getAvailableProviders()` | 125 | AccountInquiry | 호출부 없음 |
| `getTestAccounts()` | 129 | AccountInquiry | 별도 seed-test-accounts.ts가 독자 구현 |
| `sendFindIdEmail()` | 133 | AccountInquiry | PasswordController.findId가 독자 구현 |
| `verifyAccessToken()` | 95 | TokenSession | auth.middleware가 tokenUtils 직접 사용 |
| `getUserById()` | 115 | TokenSession | 다른 service들이 자체 userRepo 사용 |

**판정**: 이 6개 메서드는 분해 전부터 이미 unused였음. 이번 분해의 범위(구조 분해만)에서 제거하면 "동작 변경"에 해당하므로 별도 WO가 적절.

### 3.3 중복 로직

| 항목 | 상태 |
|------|------|
| role/membership freshening 5회 중복 | **해결됨** — `auth-context.helper.ts`로 통합 |
| `maskEmail()` 중복 (AccountInquiry + PasswordController) | **pre-existing** — 분해와 무관, 별도 공통 util 추출 가능하나 우선순위 낮음 |

### 3.4 과분할/미분리

| 항목 | 판정 |
|------|------|
| 과분할 (over-split) | **없음** — 각 sub-service가 최소 2개 이상 메서드, 독립적 책임 |
| 미분리 (under-split) | **없음** — auth-login.service.ts가 508줄이나 단일 책임 (아래 §4 참조) |
| 불필요한 sub-service | **없음** — AuthServiceUserService (156줄)가 가장 작으나 Guest 의존이 있어 유지 가치 있음 |

---

## 4. Oversized 잔존 여부 점검

### auth-login.service.ts (508 lines)

| 평가 항목 | 결과 |
|----------|------|
| 500줄 초과 여부 | 508줄 (8줄 초과) |
| 책임 혼합 | **1개** — login flow only (email path + OAuth path) |
| email/OAuth 분리 실익 | **낮음** — 두 path가 동일한 의존성(userRepo, linkedAccountRepo, activityRepo, SessionSync, tokenUtils)을 공유하며, 분리 시 상호 참조 또는 중복 발생 |
| dead code 제거 시 | ~498줄 (handleSuccessfulLogin 10줄 제거) |
| 구조 | import 31줄, boilerplate 26줄, **실질 비즈니스 로직 ~400줄** |

**판정: 유지 가능**

email/OAuth를 분리하면:
- 공유 의존성(5개 repo + 4개 service)을 양쪽에 중복 선언해야 함
- logLoginAttempt, handleFailedLogin을 공유 helper로 다시 추출해야 함
- 총 줄 수가 오히려 증가

508줄에서 dead code 제거 시 498줄로 500 미만이 되며, 실익 없는 재분할은 WO 원칙("최소 수정") 위반.

---

## 5. 다음 Oversized 정비 추천

### P0 잔여 현황 (authentication.service.ts 완료 후)

| # | 파일 | 줄 수 | 유형 | 분해 난이도 |
|---|------|-------|------|-----------|
| 2 | `routes/platform/unified-store-public.routes.ts` | 1,090 | Mega-route | 중 |
| 3 | `routes/cms-content/cms-content.routes.ts` | 1,065 | Mega-route | 중 |
| 4 | `modules/neture/controllers/partner.controller.ts` | 1,055 | Multi-domain controller | 중-고 |
| 5 | `services/AppManager.ts` | 951 | God-service | 고 |
| 6 | `controllers/cpt/DropshippingCPTController.ts` | 867 | God-class | 중 |
| 7 | `modules/neture/controllers/admin.controller.ts` | 866 | Multi-domain controller | 중 |
| 8 | `routes/neture/services/neture.service.ts` | 792 | Legacy duplicate | 저 |

### 추천: 1순위 — `partner.controller.ts` (1,055 lines)

**이유**:
1. Neture 도메인에 이미 split 선례 (neture.service.ts split 완료)
2. 31+ endpoints가 6개 이상 business domain 혼합 (recruiting, applications, dashboard, content, contracts, commissions)
3. 도메인 경계가 비교적 명확 — endpoint URL 패턴으로 자연 분리 가능
4. Neture modules/ 하위에 이미 controllers/ 디렉토리 구조가 있어 sub-controller 배치 용이

**형태**: 단독 WO 권장
- `WO-O4O-NETURE-PARTNER-CONTROLLER-SPLIT-V1`
- 패턴: authentication split과 동일한 thin facade + sub-controller 위임
- 예상 산출물: 4-6개 sub-controller + facade

### 참고: 2순위 — `unified-store-public.routes.ts` (1,090 lines)

- 가장 큰 파일이나 routes는 inline business logic 추출이 주요 과제
- Service 추출 후 route는 delegation만 남으므로 service split과 병행 필요
- 별도 WO가 적절: `WO-O4O-STORE-PUBLIC-ROUTE-SPLIT-V1`

### 참고: 3순위 — `cms-content.routes.ts` (1,065 lines)

- CMS 도메인 특성상 stats/status/slot이 혼합
- Service 추출이 선행되어야 route가 줄어듦
- 묶음 WO 가능: `WO-O4O-CMS-CONTENT-ROUTE-SPLIT-V1`

---

## 6. 결론

| 항목 | 판정 |
|------|------|
| facade 안전성 | **SAFE** — 순수 delegation, 0줄 business logic |
| sub-service 분리 | **SAFE** — 5개 모두 단일 책임, acyclic 의존 |
| dead code | **1건** — `handleSuccessfulLogin` (pre-existing, 10줄) |
| 미사용 facade 메서드 | **6건** — pre-existing, 별도 cleanup WO 대상 |
| oversized 잔존 | **없음** — auth-login.service.ts는 유지 가능 (dead code 제거 시 498줄) |
| push 판정 | **가능** — 현재 상태 그대로 push 가능 |
| 후속 조치 | 선택적: dead code 1건 제거 (follow-up 또는 다음 WO에서 처리) |

**이번 auth split은 oversized 정비 1차 완료로 확정 가능.**

---

*작성: Claude (IR-O4O-AUTHENTICATION-SERVICE-SPLIT-POST-CHECK-V1)*
*날짜: 2026-03-21*

# CHECK-O4O-AUTH-SERVICE-TOKEN-BOUNDARY-HARDENING-V1

> **WO**: [`WO-O4O-AUTH-SERVICE-TOKEN-BOUNDARY-HARDENING-V1`](../work-orders/WO-O4O-AUTH-SERVICE-TOKEN-BOUNDARY-HARDENING-V1.md)
> **작성일**: 2026-09-17 · **기준 commit**: `d2c59ab8e` (origin/main)
> **선행**: [`IR-O4O-PRIVACY-DATA-CENSUS-V1`](../investigations/IR-O4O-PRIVACY-DATA-CENSUS-V1.md) §7-1 #1(CRITICAL: service login 무검증 발급) · #2(CRITICAL: `requireAuth` 가 service 토큰 미거부)
> **판정**: **RETIRE** (legitimate caller 0) + `requireAuth` 사람 사용자 경계 고정
> **보안 원칙**: 토큰 원문 · 비밀번호 · 개인정보 미기록. 운영 DB 는 read-only COUNT 만.

---

## 1. 목적

`POST /api/v1/auth/service/login` 이 임의 `{id,email}` JSON 만으로 `tokenType:'service'` JWT 를 사용자 토큰과 **같은 `jwtSecret`** 으로 발급하고, `requireAuth`(소비 966곳) 가 `tokenType` 을 보지 않아 `users.id` 만 알면 일반 인증 경계를 통과하던 구조를 닫는다. Google 전환 · 개인정보 Target Model · 다른 SECURITY_FIX(#3~#9) 는 건드리지 않는다.

## 2. 조사 결과 (§2-1 6항목)

### 2-1. 실제 caller 교차 확인 (검색 1회로 선언하지 않음)

| 축 | 방법 | 결과 |
|---|---|---|
| 백엔드 route | `rg` 전체(`auth/service`, `auth/guest`, `handleServiceUserLogin`, `generateServiceTokens`, `upgradeGuestToServiceUser`, `requireServiceUser`, `isServiceToken` 등 20 패턴, node_modules 제외) | 발급 진입점 2곳 — `service-auth.routes.ts POST /login` · `guest-auth.routes.ts POST /upgrade`(같은 `handleServiceUserLogin` 재사용). service 토큰 소비 route 는 `GET /auth/service/me`(`requireServiceUser`) 1곳뿐. `requireServiceUser`/`optionalServiceAuth`/`requireGuestOrServiceUser`/`optionalGuestOrServiceAuth`/`requirePlatformUser` 의 route 소비 0 |
| 프론트 클라이언트 (`services/**`, `packages/**`, admin) | Grep(`!node_modules`) | `services/web-kpa-society/src/contexts/AuthContext.tsx` 의 `serviceUserLogin` 블록 1곳 — 그 블록의 소비처 0 ([`CHECK-...-FRONTEND-AUTH-CONTEXT-...-FULL-CLOSE-V1`](CHECK-O4O-FRONTEND-AUTH-CONTEXT-AND-ROUTE-GUARD-COMMONIZATION-FULL-CLOSE-V1.md):100 이 dead 로 기록). GlycoPharm 잔존 참조 0 |
| workflow / scripts | `rg --hidden` `.github` · `scripts` | 0 |
| 테스트 | `apps/api-server/src/**/__tests__` · `*.spec.ts` | 참조 0 (`restricted-account-access.spec.ts` 의 `isServiceToken: () => false` mock 만) |
| 문서 | `docs/**` | 설계 · Census · dead-code IR 의 기록만 — 계약 문서 없음. [`IR-...-DEAD-CODE-...-PASS2`](../investigations/IR-O4O-REPOSITORY-WIDE-DEAD-CODE-AND-LEGACY-SURFACE-CENSUS-V1-PASS2.md):177-182 가 zero-literal-caller 후보로 이미 지목 |
| **운영 실측(read-only)** | `account_activities` `type LIKE 'service_login%' OR 'guest_%'` COUNT | **0 건 / 전체 9,331 건** (성공 시 항상 기록되는 로그) — 운영 개시 이래 정상 사용 0 · 성공 우회 흔적 0 |

→ **legitimate caller = 0** (외부 서비스 · 프로덕션 workflow 계약 없음).

### 2-2. 나머지 항목

- **발급 JWT claim**: `generateServiceAccessToken` — `userId = sub = providerUserId`(입력 JSON 의 `id` 그대로) · `role:'service_user'` · `tokenType:'service'` · `iss/aud` 는 사용자 토큰과 동일 · exp 15분 · **서명 secret 동일(`jwtSecret`)**. refresh 는 `jwtRefreshSecret` + 무작위 tokenFamily.
- **구분 수단**: `tokenType` claim 과 `isServiceToken()`/`isPlatformUserToken()` 은 존재했으나 `requireAuth` 가 사용하지 않았다. `requirePlatformUser`(service 거부) 는 route 소비 0.
- **`service_credentials`**: Census 대로 사람 사용자 로그인 L2 password credential (`servicePasswordLoginSelection.test.ts` 등). service login 과 무관 → **미접촉**.
- **직접 원인**: ① `validateServiceOAuthToken` 이 `JSON.parse(oauthToken)` 에 `id`·`email` 만 있으면 provider 검증 없이 통과 ② 그 `id` 를 `userId` 로 같은 secret 서명 ③ `requireAuth` 가 `verifyAccessToken`(iss/aud 만) → `users.findOne({id})` 만 수행. 세 조건이 결합해 `users.id` 만 알면 requireAuth 단독 route 통과(roles/memberships 는 payload 기준 빈 배열).

## 3. 판정 — RETIRE

caller 0 · 운영 사용 0 · "Phase 1 for testing" 검증 stub. 새 machine credential 구조를 만들지 않고 발급 경로를 제거한다. 추가로 발급 경로가 나중에 어떤 형태로 되살아나더라도 통과하지 못하도록 `requireAuth` 에 사람 사용자 경계를 명시한다(방어 2중).

### auth-core 변경 사유 (§2-3)

`requireAuth` 는 966곳이 공유하는 유일한 공통 경계이며 token 단위(`verifyAccessToken`)에서는 "service 전용 route 인지" 를 알 수 없으므로 경계 자체에 두어야 한다. `authentication.middleware.ts` 2곳(`requireAuth` 9줄 · `optionalAuth` 3줄) 만 추가, 기존 분기 · 응답 계약 · 순서 불변. 범용 리팩토링 없음. regression test 포함.

## 4. 변경 (api-server 9 · web-kpa-society 1 · 테스트 1 · 문서 2)

### 4-1. RETIRE (삭제 3)

- `apps/api-server/src/modules/auth/routes/service-auth.routes.ts` — `/login` · `/status` · `/refresh` · `/me` 전부
- `apps/api-server/src/services/auth/auth-service-user.service.ts` — `handleServiceUserLogin` · `validateServiceOAuthToken`
- `apps/api-server/src/modules/auth/dto/service-login.dto.ts`

### 4-2. RETIRE (수정 6)

- [`bootstrap/register-routes.ts`](../../apps/api-server/src/bootstrap/register-routes.ts) — `/api/v1/auth/service` mount 제거 (`/api/v1/auth/guest` 는 유지)
- [`modules/auth/routes/guest-auth.routes.ts`](../../apps/api-server/src/modules/auth/routes/guest-auth.routes.ts) — `POST /upgrade`(guest → service) 제거. `/issue` · `/status` · `/me` 불변
- [`modules/auth/dto/guest-auth.dto.ts`](../../apps/api-server/src/modules/auth/dto/guest-auth.dto.ts) · [`dto/index.ts`](../../apps/api-server/src/modules/auth/dto/index.ts) — upgrade DTO · service-login export 제거
- [`services/auth/auth-guest.service.ts`](../../apps/api-server/src/services/auth/auth-guest.service.ts) — `upgradeGuestToServiceUser` · `AuthServiceUserService` 의존 · `logGuestUpgrade` 제거
- [`services/authentication.service.ts`](../../apps/api-server/src/services/authentication.service.ts) — service user 위임 2건 제거
- [`utils/token.utils.ts`](../../apps/api-server/src/utils/token.utils.ts) — `generateServiceAccessToken` / `generateServiceRefreshToken` / `generateServiceTokens` 제거 (**service 토큰 발급 함수 0**). `isServiceToken` 등 판별 함수 · guest 발급은 유지

### 4-3. 경계 (auth-core 최소 diff 1)

- [`common/middleware/auth/authentication.middleware.ts`](../../apps/api-server/src/common/middleware/auth/authentication.middleware.ts) — `requireAuth`: `payload.tokenType && payload.tokenType !== 'user'` → `401 TOKEN_TYPE_NOT_ALLOWED` (DB 조회 전). `optionalAuth`: 동일 조건이면 비로그인 취급. `tokenType` 미기재 토큰은 기존 `isPlatformUserToken` 규약대로 사용자 토큰.

### 4-4. 프론트 dead client (1)

- [`services/web-kpa-society/src/contexts/AuthContext.tsx`](../../services/web-kpa-society/src/contexts/AuthContext.tsx) — `serviceUserLogin`/`serviceUserLogout`/`ServiceUser`/`kpa_pharmacy_service_*` localStorage 블록 제거(소비처 0). 플랫폼 로그인 · KPA context 로딩 불변.

### 4-5. 미변경 (의도)

`service-access.middleware.ts`(요구 시 service/guest 토큰을 **거부**만 하는 guard · `requireGuestUser` 는 `/auth/guest/me` 가 사용) · `types/account-linking.ts` 의 Service 타입 · `auth-context.helpers.ts` — 발급 경로가 없으므로 위험 0, 삭제는 정리 트랙 범위. `POST /auth/guest/issue`(무인증 guest 토큰) — guest 토큰의 `userId` 는 무작위 `guestSessionId` 이며 이제 `requireAuth` 도 거부하므로 CRITICAL 아님 · 범위 밖.

## 5. 인증 경계 전/후

```text
BEFORE
  {id,email} JSON ──POST /auth/service/login──▶ service JWT(userId=id, jwtSecret)
  guest JWT + {id,email} ──POST /auth/guest/upgrade──▶ service JWT
  service JWT ──requireAuth(966)──▶ users.findOne({id}) 존재 → 통과

AFTER
  /auth/service/*            → 404 (router 부재)
  /auth/guest/upgrade        → 404
  generateService*Token      → 존재하지 않음
  requireAuth / optionalAuth → tokenType ∉ {undefined,'user'} 이면 401 / 비로그인 (DB 조회 전)
  사용자 JWT(tokenType:'user') → 기존과 동일
```

## 6. 검증

### 6-1. Negative Test — [`src/__tests__/security/service-token-boundary.spec.ts`](../../apps/api-server/src/__tests__/security/service-token-boundary.spec.ts) **14/14 PASS**

실제 `jsonwebtoken` 서명(테스트 secret) · `AppDataSource.findOne` 만 stub(실재 `users.id` 1건).

| WO 6-1 항목 | 테스트 | 결과 |
|---|---|---|
| ① 임의 `{id,email}` → 발급 실패 | 발급 3파일 부재 · register-routes mount 부재 · `generateService*` export 부재 · `POST /auth/guest/upgrade` + 임의 `{id,email}` → **404**, tokens 없음 | PASS |
| ② 실재 `users.id` 만 제시 → 실패 | `/guest/upgrade` + `{id: 실재 users.id}` → 404 · 같은 secret 으로 서명한 `tokenType:'service'` + `userId=실재 users.id` → requireAuth **401 `TOKEN_TYPE_NOT_ALLOWED`** | PASS |
| ③ 변조 credential/token → 실패 | 다른 secret 서명 → 401 `INVALID_TOKEN` · service 토큰 payload 의 `tokenType` 을 `user` 로 바꿔치기 → 서명 불일치 401 | PASS |
| ④ service 성격 토큰 → requireAuth 단독 route 실패 | service 401 · guest 401 · `optionalAuth` 에서 service 토큰은 `req.user` 미부착 | PASS |
| ⑤ 기존 사용자 인증 회귀 없음 | `generateAccessToken()` 토큰 200 · `tokenType` 없는 구형 토큰 200 · optionalAuth 사용자 토큰 `req.user` 부착 · `/auth/guest/issue` 200 유지 | PASS |

legitimate service caller 가 없으므로 "정상 service credential 성공" 계열 테스트는 **해당 없음**.

### 6-2. 회귀 · 정적 검증

- jest `src/services/auth` · `src/common/middleware` · `src/bootstrap` · `src/__tests__/security` · `src/modules/auth` — **27 suites / 527 tests PASS** (L2 `service_credentials` 로그인 계약 `servicePasswordLoginSelection` · `orphanCredentialLoginContract` · refresh family · restricted login 포함)
- `tsc --noEmit` api-server **0 error** · web-kpa-society **0 error**
- eslint 변경 파일 0 error (기존 warning 만)
- 운영 smoke: 배포 후 `POST /api/v1/auth/service/login` 404 확인은 배포 시점 사항(이 CHECK 시점 미배포 — **미실행**)

## 7. 영향

- **기존 사용자 로그인**: 영향 없음 — `/auth/login` · L2 `service_credentials` 경로 · refresh · handoff 코드 미접촉, 사용자 토큰은 `tokenType:'user'` 로 발급되므로 새 guard 통과. 구형(`tokenType` 없음) 토큰도 통과.
- **service caller**: 0 → 영향 없음. 운영 로그 0 건.
- **JWT secret rotation**: **불필요**. 근거 ① 취약점은 secret 유출이 아니라 발급 경로(서버가 정상 secret 으로 서명) ② 과거에 발급됐을 수 있는 service 토큰은 access 15분 만료 + 이제 `requireAuth` 가 tokenType 으로 거부 · service refresh 토큰은 `/auth/service/refresh` 소멸 + 일반 `/auth/refresh` 는 family MISMATCH 로 거부 ③ 운영 `account_activities` 에 성공 발급 로그 0 건 ④ 회전 시 전 사용자 강제 로그아웃 비용. 단 secret 자체가 다른 경로로 노출된 정황이 생기면 별도 판단.

## 8. 남은 후속 (범위 밖 · 미수정)

- Census SECURITY_FIX #3 check-license 무인증 · #4 OAuth clientSecret 응답 · #5 localStorage 토큰 · #6 로그 email(이 WO 로 `service-auth.routes.ts` 2건은 소멸) · #7 test 계정/리터럴 · #8 `.env.example` · #9 평문 컬럼 — 각각 별도 WO.
- `service-access.middleware.ts` · `account-linking.ts` Service/Guest 타입 · `POST /auth/guest/issue` 의 존치 여부 — dead surface 정리 트랙(현재 CLOSED · 재개 조건 충족 시).
- 다음 단계: Phase 1 개인정보 Target Model 설계 조사(WO 후속 절).

## 9. Git

- 커밋: 본 CHECK 와 함께 path-specific (`check-staged-scope.mjs` → `git commit -- <paths>`).
- 다른 세션 dirty/untracked(`startup.service.ts` · `privacy-retention.*` · hospital-drug WO) 미접촉.

---

*상태: CLOSED (RETIRE) · 2026-09-17*

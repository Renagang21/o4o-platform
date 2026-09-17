# CHECK-O4O-AUTH-REFRESH-TOKEN-FAMILY-CONTINUITY-AND-HANDOFF-STALE-TOKEN-GUARD-V1

> **WO**: WO-O4O-AUTH-REFRESH-TOKEN-FAMILY-CONTINUITY-AND-HANDOFF-STALE-TOKEN-GUARD-V1
> **작성일**: 2026-09-17 · **기준 commit**: census `ef9265810` (origin/main, clean) → 구현 `3a182eb92`
> **선행**: [`IR-O4O-CROSSSERVICE-HANDOFF-SESSION-PERSISTENCE-V1`](../ir/IR-O4O-CROSSSERVICE-HANDOFF-SESSION-PERSISTENCE-V1.md) (REPRODUCED · `df32ad2b6`) — 원인 R1(refresh rotation 이 family 미승계) · R2(stale refresh 1회 → family null → 전체 REVOKED) · 가속 경로(`/handoff` 착지 stale 토큰 경합)
> **계약**: `login → 새 family F1` · `handoff A→B 는 F1 승계` · `refresh A/B 는 토큰만 회전, family 는 F1 유지` · `logout / logout-all → family null`
> **보안 원칙**: 토큰 원문 · 비밀번호 · 개인정보 미기록 — 존재 여부 · 길이 · claim 키 · family 앞 4자만 기록

---

## 1. 목적

같은 계정이 여러 origin(KPA · Neture · K-Cosmetics · Pharmacy-Hub) 에서 handoff 로 한 family 를 공유하는 상태에서 **어느 origin 의 refresh 도 다른 origin 의 세션을 죽이지 않도록** 공통 auth core 를 최소 수정한다. 동시에 `/handoff` 착지 시 대상 origin 에 남은 낡은 토큰이 exchange 와 교차 실행되어 서버 family 를 null 로 만드는 가속 경로를 receiver 측에서 차단한다. MISMATCH / REVOKED / logout 계약 · RBAC · 쿠키 전략 · 세션 테이블은 건드리지 않는다.

## 2. Fresh Census (origin/main `ef9265810`, clean)

| 항목 | 결과 |
|---|---|
| `auth-token-session.service.ts refreshTokens()` | IR 과 동일 — `generateTokens(user, roles, domain, memberships)` 로 `reuseTokenFamily` 미전달 → 매 refresh 새 family 를 `users.refreshTokenFamily` 에 덮어씀. **원인 유효** |
| `token.utils.ts generateTokens()` | `reuseTokenFamily?: string` 5번째 인자 이미 존재(`reuseTokenFamily \|\| uuidv4()`). 서명 변경 불요 |
| `handoff.controller.ts exchange` | `user.refreshTokenFamily ?? null` 을 승계 — 변경 불요 |
| MISMATCH / REVOKED / logout / logout-all | 기존 분기 그대로 존재 — 변경 불요 |
| localStorage 전략 Handoff receiver | `web-neture` · `web-k-cosmetics` · `web-kpa-society` · `web-pharmacy-hub` · `web-kpa-branch` 5곳 (IR 과 동일 수). 모두 `/handoff` 진입 시 낡은 토큰 미정리 |
| `web-account/HandoffPage.tsx` | cookie 전략 · 토큰 저장 없음 · deploy 대상 아님 → **영향 없음, 제외** |
| `web-kpa-society/App.tsx` | `HandoffPage` 가 `lazy()` — 청크 로드 전에 `AuthProvider` passive effect 가 먼저 실행되므로 자식 `useLayoutEffect` 순서 보장이 깨짐 → 정적 import 로 전환 필요(발견) |
| 다른 세션의 auth core 파일 수정 | `git status` clean · dirty/untracked 0 → 병렬 충돌 없음 |

## 3. 변경 (`3a182eb92`, 9 files)

### 3-1. 서버 (auth core, 최소 수정)

- [`apps/api-server/src/services/auth/auth-token-session.service.ts`](../../apps/api-server/src/services/auth/auth-token-session.service.ts) — `refreshTokens()` 가 `payload.tokenFamily` 를 `generateTokens(..., payload.tokenFamily)` 로 승계. 회전 후 family 가 `users.refreshTokenFamily` 와 같으면 `save` 생략(방어적으로 다를 때만 저장). `REFRESH_TOKEN_INVALID`(family 없음) · `TOKEN_FAMILY_REVOKED`(서버 null) · `TOKEN_FAMILY_MISMATCH → family null` · logout / logout-all 의 null 처리 · 신규 로그인 = 새 family 는 **불변**.

### 3-2. Handoff receiver (5곳)

- [`services/web-neture/src/pages/HandoffPage.tsx`](../../services/web-neture/src/pages/HandoffPage.tsx) · [`web-k-cosmetics`](../../services/web-k-cosmetics/src/pages/HandoffPage.tsx) · [`web-pharmacy-hub`](../../services/web-pharmacy-hub/src/pages/HandoffPage.tsx) · [`web-kpa-branch`](../../services/web-kpa-branch/src/pages/HandoffPage.tsx) · [`web-kpa-society`](../../services/web-kpa-society/src/pages/HandoffPage.tsx) — `useLayoutEffect(() => { clearStoredTokens(); }, [])` 를 exchange 보다 앞에 추가. React 는 자식 layout effect 를 모든 passive effect 보다 먼저 실행하므로 `AuthProvider(useServiceAuth)` 의 `/auth/me` 가 낡은 토큰을 읽기 전에 정리된다. `clearStoredTokens` 는 `@o4o/auth-client` 기존 export(`clearAllTokens` alias) — **새 token-storage 구현 0** · auth core 에 `/handoff` 문자열 조건 0.
- [`services/web-kpa-society/src/App.tsx`](../../services/web-kpa-society/src/App.tsx) — `HandoffPage` `lazy()` → 정적 import (위 순서 보장 조건).

### 3-3. 테스트

- [`apps/api-server/src/services/auth/__tests__/refreshTokenFamilyContract.test.ts`](../../apps/api-server/src/services/auth/__tests__/refreshTokenFamilyContract.test.ts) — A(로그인 새 family) · B(refresh 후 family 유지 + DB save 없음) · C(F1 공유 두 RT 교대 refresh 전부 200) · D(다른 family → MISMATCH + null) · E(null 이후 REVOKED) · F(logout-all → null · 모든 RT 거부).
- [`services/web-neture/src/pages/__tests__/HandoffPage.staleTokenGuard.test.tsx`](../../services/web-neture/src/pages/__tests__/HandoffPage.staleTokenGuard.test.tsx) — 실제 `<AuthProvider><HandoffPage/>` 렌더. ① 낡은 토큰 존재 시 `/auth/me` 호출 0 · exchange 시점 storage 비어 있음 · 새 토큰 저장 · `replace(returnTo)`. ② exchange 실패 시 낡은 토큰 복원 없음 · `/auth/me` 0 · replace 없음. **회귀 항목 「exchange 성공 후 새 토큰을 guard 가 다시 삭제」 = 없음**(①에서 새 토큰 저장 확인). guard 를 주석 처리한 음성 확인에서 ①② 모두 실패 → 테스트가 순서를 실제로 고정.

## 4. 검증 (로컬)

| 항목 | 결과 |
|---|---|
| jest `services/auth` (api-server) | 32/32 (family 계약 9/9 포함) |
| vitest `web-neture` | 95/95 (guard 2/2 포함) |
| vitest `auth-client` / `auth-react` (각 패키지 config) | 15/15 · 44/44 |
| typecheck api-server + web-neture/k-cosmetics/kpa-society/pharmacy-hub/kpa-branch | 전부 exit 0 |
| `web-kpa-society` vite build (lazy→static) | OK |
| `check-staged-scope` | 9/9 ✅ |

## 5. 배포

- Deploy API Server `35179565611` success (12:57) · Deploy Web Services `35179565580` success (12:52) · CI Pipeline `35179565666` success · CodeQL `35179565627` success.

## 6. Production smoke (read-only · Playwright MCP · KPA 검증용 약국 경영자 계정)

표기: `AT=길이` · `RT=길이` · `fam=앞4자`. 모든 handoff 는 각 origin 의 Bearer 로 `POST /auth/handoff` → `data.targetUrl` 을 같은 탭 `location.assign`(앱 `openServiceEntry` 와 동일 API).

### 6-1. 로그인 → KPA→Neture 착지

| 단계 | 관찰 |
|---|---|
| KPA 로그인 | AT=1193 RT=395 · (로그인 직전 KPA 에 남아 있던 이전 세션 토큰은 `/auth/me 401 → refresh 401 → Tokens cleared` 로 정리됨 — 로그인 전 정상 동작) |
| KPA→Neture handoff | `/auth/handoff 200` → `/handoff/exchange 200` → `/auth/me 200`. 착지 AT=1000 RT=395 **fam=`6e59`** (KPA 와 동일 · 승계) |

### 6-2. family 연속성 — 두 origin 교대 refresh (WO §8)

KPA → Neture → KPA → Neture 순 `POST /auth/refresh {refreshToken}` (1.1s 간격): **4/4 → 200**, fam `6e59 → 6e59` 유지. (IR Case C 에서는 2번째가 MISMATCH · 3번째가 REVOKED 였음 → 해소)

### 6-3. stale-token 착지 (IR Case E 재검) — WO §9

이전 IR 세션이 남긴 낡은 토큰이 실제로 잔존한 상태에서 착지:

| 착지 origin | 착지 전 잔존 토큰 | 착지 네트워크(순서) | 결과 |
|---|---|---|---|
| Neture → **K-Cosmetics** (apex `k-cosmetics.site`) | AT=1000(만료) · RT fam=`a9d2`(무효) | `exchange 200` → cms/ads/latest/footer-legal → `/auth/me 200` | **stale `/auth/me` = 0 · stale `/auth/refresh` = 0** · fam=`6e59` 승계 |
| Neture → **Pharmacy-Hub** | AT=1000(만료) · RT fam=`2b07`(무효) | `exchange 200` → footer-legal/news/forum/latest → `/auth/me 200` | **stale `/auth/me` = 0 · stale `/auth/refresh` = 0** · fam=`6e59` 승계 |
| Neture → **KPA** (`/store`) | 현행 토큰(fam `6e59`) | `exchange 200` → `/auth/me 200` | 정상 |

IR Case E 에서는 `exchange 200 → /auth/me 401(낡은 AT) → /auth/refresh 401 → Tokens cleared` 로 출발 origin 이 즉시 죽었으나, 이번에는 **stale 요청 자체가 발생하지 않음**.

### 6-4. 4 origin 교대 refresh + reload

- Neture → KCos → Neture → PH → KPA → KCos → PH → Neture 순 refresh: **8/8 → 200**, 전 origin fam `6e59` 유지.
- 직후 4 origin 전체 reload: KPA · Neture · K-Cosmetics · Pharmacy-Hub 모두 `/auth/me 200` · refresh 실패 0 · 토큰 AT=1193 RT=395 유지. (WO §8 의 「reload → /auth/me 200」 충족. 15분 만료 대기 대신 `/auth/refresh` 직접 호출로 대체 — WO 허용)

### 6-5. 보안 계약 (MISMATCH · REVOKED · 새 로그인 = 새 family)

- 별도 브라우저 context 에서 같은 계정 재로그인 → 새 family **fam=`ed84`**(≠ `6e59`).
- 기존 family(`6e59`) RT 로 refresh → **401 `TOKEN_FAMILY_MISMATCH`** (서버 family → null).
- 이어 새 family(`ed84`) RT 로 refresh → **401 `TOKEN_FAMILY_REVOKED`**.
- → 사용자당 단일 family(기기 간 단일 세션) · 재사용 탐지 계약 **불변**. (이 확인으로 검증 세션은 종료 상태가 됨 — 의도된 결과)

### 6-6. 데이터 변경

production 에서 수행한 것은 로그인 · handoff · refresh · reload 뿐(인증 세션 상태만 갱신). 업무 데이터 · schema · seed 변경 0.

## 7. 범위 밖 · 보류

1. `HOME_AUTH_LOADING_FLASH` — O4OHomePage 가 `authLoading` 동안 「로그인·회원가입」 버튼을 먼저 보였다가 교체(IR §0-5). 세션 유지와 무관 → **DEFERRED_UX**.
2. `web-account` HandoffPage — cookie 전략 · 미배포. 영향 없음(WO §4 허용).
3. 동일 초 발급 JWT 동일성(iat 초 단위 · jti 없음) — refresh 회전 시 1초 안에 두 번 호출하면 같은 토큰. 기존 발급 특성이며 본 WO 의 계약(family 유지) 과 무관 · 미수정.
4. 다른 세션이 남긴 토큰이 실제로 15분 동안 살아 있는 별 기기 세션은 새 로그인으로 여전히 무효화됨(단일 슬롯 계약). per-device 세션 테이블은 명시적 out-of-scope.

## 8. Git

- 구현: `3a182eb92` (9 files, path-specific stage · `check-staged-scope` 9/9) → push → Deploy API `35179565611` · Web `35179565580` success.
- Same-scope re-census(smoke 후 `git fetch`): HEAD == origin/main == `3a182eb92` · clean · auth core 파일에 타 세션 변경 0.
- CHECK: 본 문서(별도 docs 커밋).

## 9. 최종 판정

```
AUTH_REFRESH_FAMILY_CONTINUITY = PASS
CROSS_ORIGIN_REFRESH           = PASS
HANDOFF_STALE_TOKEN_GUARD      = PASS
TOKEN_FAMILY_MISMATCH_SECURITY = PASS
TOKEN_FAMILY_REVOKED           = PASS
LOGOUT_ALL_REVOCATION          = PASS   (jest F · 서버 분기 불변)
AFFECTED_SERVICES_FIXED        = PASS   (neture · k-cosmetics · kpa-society · pharmacy-hub · kpa-branch)
SERVICE_SPECIFIC_AUTH_FORK     = 0
DB_SCHEMA_CHANGE               = 0
NEW_SESSION_TABLE              = 0
SECURITY_BOUNDARY_CHANGE       = 0
PRODUCTION_HANDOFF_SMOKE       = PASS
HOME_AUTH_LOADING_FLASH        = DEFERRED_UX
NEXT = CLOSED
```

# IR-O4O-CROSSSERVICE-HANDOFF-SESSION-PERSISTENCE-V1

> **조사 보고서 (Investigation Report) — 조사 전용 / 코드·DB·UI 변경 없음.**
>
> O4O 대표 홈 또는 다른 서비스 → `/auth/handoff` → 대상 서비스 로그인 성공 → 화면 사용 가능 → 전체 page reload 후 세션이 사라지거나 `/auth/me` 401 이 되는 현상의 정확한 원인을 시간순 증거로 확정한다.

- **작성일:** 2026-09-17
- **분류:** Investigation (read-only) · 프로덕션 read-only 재현 (데이터 변경 없음 — 로그인/refresh 가 남기는 `users.refreshTokenFamily` 세션 상태 갱신만 자연 발생)
- **기준 커밋:** `origin/main` `4f8dd3b90` 에서 Fresh Census 시작 (조사 중 `1bf4e86a0` 까지 전진, 인증 코드 무변경)
- **참고(과거 기록):** [IR-O4O-AUTH-HANDOFF-POLICY-AUDIT-V1](../investigations/IR-O4O-AUTH-HANDOFF-POLICY-AUDIT-V1.md) — 정책 판단 기록, 본 IR 의 근거로 쓰지 않음
- **보안 원칙:** 토큰 원문·비밀번호·개인정보 미기록. 토큰은 **존재 여부·길이·claim 키·family 앞 4자** 만 기록. 로그인은 KPA 체험 계정 버튼(자격증명 입력 없음).

---

## 0. 결론 요약 (TL;DR)

1. **REPRODUCED = YES.** 단, 사용자가 관찰한 「handoff 직후 reload 하면 세션이 사라진다」 는 **reload 자체의 문제가 아니다.** handoff 직후·이후 반복 reload 에서 `o4o_accessToken / o4o_refreshToken` 은 localStorage 에 그대로 남고 `/auth/me` 는 200 이다 (§3 Case A·B·D·E).
2. **실제로 세션이 죽는 지점은 `refresh` 단계다.** 원인은 공통 auth core(서버) 의 refresh token family 계약 결함 2가지가 결합한 것이다.
   - **R1 · rotation 이 family 를 승계하지 않는다.** `AuthTokenSessionService.refreshTokens()` 가 `generateTokens(user, roles, domain, memberships)` 를 family 없이 호출 → 매 refresh 마다 **새 uuid family** 발급·저장. `users.refreshTokenFamily` 는 사용자당 **단일 슬롯**이므로, handoff 로 같은 family 를 승계받은 **다른 origin(서비스) 의 refresh token 은 즉시 stale** 이 된다.
   - **R2 · stale refresh 1회가 사용자 전체 family 를 null 로 만든다.** family 불일치 → `TOKEN_FAMILY_MISMATCH` + `refreshTokenFamily = null` (도난 대응) → 이후 **모든 서비스** 의 refresh 가 `TOKEN_FAMILY_REVOKED`.
   - 결과: 서비스 A·B 를 handoff 로 함께 쓰면, access token(15분) 만료 후 **먼저 refresh 한 쪽이 다른 쪽을 죽이고, 죽은 쪽의 다음 refresh 가 먼저 쪽까지 죽인다.** 그 뒤 어느 서비스든 전체 reload(또는 다음 API 호출) 시 `/auth/me 401(INVALID_TOKEN, 만료)` → `/auth/refresh 401` → auth-client `clearAllTokens()` → `auth:token-cleared` → 비로그인.
3. **가속 경로(handoff 착지 시 stale token 경합).** 대상 origin 의 localStorage 에 **이전 세션의 낡은 토큰**이 남아 있으면, `/handoff` 화면이 뜨는 순간 `AuthProvider(useServiceAuth)` 가 낡은 토큰으로 `/auth/me` → 401 → auth-client 가 낡은 refresh token 으로 `/auth/refresh` → **R2 발동(서버 family null)** → 그 다음 도착한 `handoff/exchange` 는 null 을 승계 못 해 새 family 발급 → **원 서비스(출발지) 세션이 그 자리에서 죽는다.** 착지 서비스 자체는 정상 로그인되므로 「로그인 성공 → 화면 사용 가능 → 나중에 reload 후 401」 로 보인다 (§3 Case E 로 직접 재현).
4. **서비스별 결함은 0.** 4개 서비스 HandoffPage/AuthContext/apiClient 는 storage 계약(SSOT key)·exchange 계약을 모두 지킨다. KPA HandoffPage 만 `credentials:'include'` 없이 `localStorage.setItem` 직접 호출이지만 결과 동일(쿠키는 어차피 `.neture.co.kr` 도메인에만 실리고 axios 가 보내지 않음). 토큰 claim 차이는 handoff exchange 토큰의 `memberships[].role` 누락뿐이며 소비처 없음(§4-10).
5. **부수 관찰(세션 소실 아님):** 대표 홈 `O4OHomePage` 계정 영역이 `authLoading` 중에도 「로그인·회원가입」 버튼을 그려 전체 reload 직후 약 0.5~1초 **비로그인처럼 보이는 플래시**가 있다. 과거 smoke 에서 「reload 시 소실」 로 기록된 관찰 일부는 이 플래시로 설명된다.

---

## 1. 조사 범위 · 방법

| 항목 | 내용 |
|---|---|
| 서버 | `POST /api/v1/auth/handoff` · `POST /api/v1/auth/handoff/exchange` (`handoff.controller.ts`) · `handoff-token.service.ts` · `/auth/me` · `/auth/refresh` · `/auth/logout(-all)` (`auth-session.controller.ts` · `auth-token-session.service.ts` · `auth-context.helper.ts`) · `requireAuth`/`extractToken` · `cookie.utils.ts` · CORS(`setup-middlewares.ts`) |
| 공통 패키지 | `@o4o/auth-client` `client.ts`(storage · 401 interceptor · refresh single-flight · `clearAllTokens` · `auth:token-cleared`) · `@o4o/auth-react` `useServiceAuth` · `@o4o/auth-utils` `authEvents.ts` |
| 서비스 | Neture(대표 홈 `O4OHomePage` · `AuthContext` · `home-entry.ts openServiceEntry`) · KPA Society · K-Cosmetics · Pharmacy-Hub · (kpa-branch · account HandoffPage 는 정적 확인만) · GlycoPharm 제외 |
| 브라우저 | Playwright MCP Chromium(격리 프로필) · 프로덕션 도메인 · KPA 체험용 약국 경영자 버튼 로그인 · handoff 생성은 각 origin 의 localStorage Bearer 로 `POST /auth/handoff` 직접 호출(앱 `openServiceEntry` 와 동일 API) → `data.targetUrl` 로 이동 |
| 시간 기준 | 토큰 `iat/exp`(epoch 초) 와 브라우저 `Date.now()` 로 절대 시각 정렬 |

---

## 2. 계약 정적 분석 (코드 사실)

### 2-1 토큰 · family 계약

| 항목 | 사실 | 근거 |
|---|---|---|
| access token | 15분 · claims `userId, sub, email, role, roles[], memberships[{serviceKey,status(,role)}], accountAccess, tokenType:'user', iss, aud, exp, iat` · **서비스/domain claim 없음** | `token.utils.ts generateAccessToken` |
| refresh token | 7일 · claims `userId, sub, tokenVersion, tokenFamily(uuid), iss, aud, exp, iat` | `token.utils.ts generateRefreshToken` |
| family 저장 | `users.refreshTokenFamily` **사용자당 1개** (기기·origin 별 세션 레코드 없음) | `auth-token-session.service.ts logoutAll` 주석 |
| 로그인 | `generateTokensWithContext(user)` → **새 family** → `persistRefreshTokenFamily` | `auth-login.service.ts:265,352,412,488` |
| **refresh** | `generateTokens(user, ctx.roles, 'neture.co.kr', ctx.memberships)` — **`reuseTokenFamily` 미전달 → 새 uuid family** → `user.refreshTokenFamily = 새 family` 저장 | `auth-token-session.service.ts` "Generate new tokens (with rotation)" (2026-03-21 분리 이후 동일) |
| family 불일치 | `user.refreshTokenFamily !== payload.tokenFamily` → **`refreshTokenFamily = null` 저장** + 401 `TOKEN_FAMILY_MISMATCH` | 동일 파일 |
| family null | 401 `TOKEN_FAMILY_REVOKED` | 동일 파일 (WO-O4O-LOGOUT-ALL-TOKEN-INVALIDATION-V1, 2026-08-18) |
| logout / logout-all | 둘 다 `refreshTokenFamily = null` → **사용자 전체** 무효화 | 동일 파일 |
| handoff exchange | `generateTokens(..., user.refreshTokenFamily ?? null)` — 기존 family **승계**(없으면 새 family) → `persistRefreshTokenFamily` · `setAuthCookies` · body 에 tokens | `handoff.controller.ts:281-300` |
| handoff exchange claim 차이 | memberships 를 `SELECT service_key, status` 로 읽어 **`role` 필드 없음** (login/refresh 는 `role` 포함) → access token 길이 1000 vs 1193 | `handoff.controller.ts:218` vs `auth-context.helper.ts freshenUserContext` |

### 2-2 요청 · 저장 계약

| 항목 | 사실 |
|---|---|
| `requireAuth` | `Authorization: Bearer` 우선 → 없으면 `req.cookies.accessToken`. 만료/무효 → 401 `INVALID_TOKEN`; 없음 → 401 `AUTH_REQUIRED` |
| `/auth/refresh` | `req.cookies?.refreshToken || req.body.refreshToken` (쿠키 우선). 실패 → `clearAuthCookies` + 401 `{code, retryable:false}`. 성공 → 쿠키 + (cross-origin 또는 `includeLegacyTokens`) body `data.tokens` |
| 쿠키 | httpOnly · secure · SameSite=None · domain 은 Origin 기준(`.neture.co.kr` / `.kpa-society.co.kr` / `.k-cosmetics.site`). API host 가 `api.neture.co.kr` 이므로 브라우저는 **`.neture.co.kr` 쿠키만 수락**. 모든 서비스 AuthClient 가 `strategy:'localStorage'` → `withCredentials:false` → **쿠키는 인증에 관여하지 않음** (exchange `fetch credentials:'include'` 만 예외, 부작용 없음) |
| 저장 SSOT | `o4o_accessToken` / `o4o_refreshToken` (localStorage). legacy 자동 이관 제거됨(`d805e50be`) |
| auth-client 401 interceptor | auth endpoint 제외 · refresh token 존재 시 single-flight `POST /auth/refresh {refreshToken, includeLegacyTokens:true}` → 실패 시 `isSessionEndedSince` 아니고 `freshLoginOccurred`(요청 시작 토큰 ≠ 현재 토큰 && 현재 토큰 ≠ null) 아니면 `sessionGeneration++` · `clearAllTokens()` · `auth:token-cleared` · console `Authentication failed. Tokens cleared.` |
| `useServiceAuth` | 토큰 없으면 `/auth/me` 호출 안 함. `/auth/me` 실패 → `user=null` (토큰은 안 지움). `auth:token-cleared` → `user=null` |
| Neture AuthContext | `pageshow persisted` → `refresh()`; `storage` key null → `user=null`; key `o4o_accessToken` newValue null → `user=null`, 아니면 `refresh()` |
| HandoffPage | neture/k-cosmetics/pharmacy-hub/kpa-branch/account: `fetch exchange credentials:'include'` → `storeTokens()` → `location.replace(returnTo)`. **KPA society**: `fetch` (credentials 없음) → `localStorage.setItem` 2건 → `location.replace`. 5곳 모두 **`/handoff` 진입 시 기존(낡은) 토큰을 정리하지 않음** → App 의 `AuthProvider` 효과가 낡은 토큰으로 `/auth/me` 를 동시에 쏜다 |
| 서비스 카드 이동 | `openServiceEntry` → `window.location.assign(targetUrl)` (같은 탭) |

---

## 3. 브라우저 재현 — 시간순 증거 (마스킹)

표기: `AT=길이` access token, `RT=길이` refresh token, `fam=앞4자` refresh family, 시각은 epoch 초(서버 `iat` 기준).

### Case A · KPA → Neture (착지 + reload) — 이전 컨텍스트 재현, 정상

| 단계 | 관찰 |
|---|---|
| handoff 전 (KPA) | 체험 로그인 · AT=1193 RT=395 |
| exchange 응답 | 200 · body `data.tokens.{accessToken,refreshToken}` · family = KPA 와 동일(승계 확인) |
| 저장 직후 (neture) | AT=1000 RT=395 · 쿠키 `accessToken`·`refreshToken` `.neture.co.kr` 도 생성 |
| landing `/` | 로그인 상태 · 4 workspace 카드 |
| reload | AT=1000 RT=395 유지 · `/auth/me 200` · refresh 호출 없음 |
| **판정** | **NOT_REPRODUCED** (단순 reload 는 세션 유지) |

### Case B · Neture → KPA(같은 탭 `location.assign`) → `https://neture.co.kr/` 전체 로드 복귀

| 시각 | 단계 | 관찰 |
|---|---|---|
| ~1789614132 | (선행) neture 탭이 유휴 중 refresh 수행 | neture AT=1193(iat 1789614132) RT fam=`b9e2` — **rotation 으로 family 가 이미 1회 바뀜** |
| 1789614160 | `POST /auth/handoff {kpa-society,/store}` | 200 · 직전/직후 localStorage AT=1193 RT=395 **변화 없음** |
| 1789614166 | KPA `/handoff` exchange | 200 · KPA AT=1000 RT=395 fam=`b9e2`(승계) · `/store` 로그인 상태 |
| +~40s | neture.co.kr 전체 로드 | localStorage AT=1193 RT=395 **그대로** · `/auth/me 200` · `/neture/home/entry 200` · refresh 없음 · console 0 |
| 로드 직후 스냅샷 | **「로그인·회원가입」 버튼이 먼저 보였다가** `/auth/me` 응답 후 계정 메뉴·4 카드로 교체 | `authLoading` 미반영 플래시 (§0-5) |
| **판정** | 세션 유지. **토큰이 사라지는 지점은 handoff 왕복에 없다** |

### Case C · family 경합 — 서버 계약 직접 검증 (같은 계정, neture 탭 + KPA 탭 동시 보유, fam 모두 `b9e2`)

auth-client interceptor 가 보내는 것과 동일한 요청(`POST /auth/refresh {refreshToken, includeLegacyTokens:true}`)을 각 origin 에서 순서대로 호출.

| 순서 | origin | 요청 | 응답 | 서버 family 상태(추정→다음 단계로 확인) |
|---|---|---|---|---|
| 1 | KPA | refresh(fam `b9e2`) | **200** · 새 RT fam=`1bfd` · AT=1193 | `1bfd` |
| 2 | neture | `/auth/me`(AT 유효) | 200 | — |
| 2' | neture | refresh(fam `b9e2`) | **401 `TOKEN_FAMILY_MISMATCH`** `retryable:false` | **null** (도난 대응) |
| 3 | KPA | `/auth/me`(AT 유효) | 200 | — |
| 3' | KPA | refresh(fam `1bfd` — 방금 발급받은 정상 토큰) | **401 `TOKEN_FAMILY_REVOKED`** | null |
| **판정** | **R1(rotation=새 family) + R2(mismatch=전체 null)** 로 **두 origin 모두 refresh 불능.** 각자의 AT 가 만료되는 순간(15분 내) 어느 쪽이든 `/auth/me 401` → refresh 401 → `clearAllTokens` |

### Case D · Neture → K-Cosmetics (착지 origin 에 이전 세션의 낡은 토큰 잔존)

`https://www.k-cosmetics.site` 는 빈 localStorage 였으나 handoff 착지 host 는 **apex `k-cosmetics.site`**(별 origin) 이고 그곳에 이전 세션 토큰이 남아 있었다.

| ms(탭 기준) | 단계 | 관찰 |
|---|---|---|
| — | `/handoff?token=…` 로드 | localStorage 에 낡은 AT/RT 존재 |
| 818 | `AuthProvider` → `/auth/me`(낡은 AT) | **401** |
| 887 | interceptor → `/auth/refresh`(낡은 RT) | **401** |
| 888 | console `Authentication failed. Tokens cleared.` | `clearAllTokens()` (낡은 토큰 삭제) |
| 이후 | `handoff/exchange` | 200 → `storeTokens` AT=1000 RT=395 **fam=`a9d2`(새 family — 서버 family 가 Case C 로 null 이었음)** → `location.replace('/')` |
| `/` | `/auth/me` | 200 · 로그인 상태 |
| reload | `/auth/me` | 200 · 토큰 유지 |
| **판정** | 착지·reload 정상. stale 정리는 `storeTokens` **이전**에 끝나 `freshLoginOccurred` 가드가 필요 없었음 |

### Case E · Neture → Pharmacy-Hub (낡은 토큰 잔존 + exchange 와 stale refresh 교차) — **가속 경로 직접 재현**

| 단계 | 관찰 |
|---|---|
| `/handoff` 로드 (0.5s 간격 폴링) | 첫 샘플부터 AT=1000 RT=395 (낡은 것 → 새 것으로 교체, 길이 동일하여 폴링으로는 구분 불가) → 0.5s 후 `/` |
| 네트워크 순서 | `exchange 200` → `footer-legal` → **`/auth/me 401`(낡은 AT)** → **`/auth/refresh 401`(낡은 RT, family 불일치)** → console `Tokens cleared` → `/` 홈 요청들 → `/auth/me 200` |
| 저장된 새 RT | **fam=`2b07`** — Case D 직후 서버 family 는 `a9d2` 였으므로, exchange 가 `a9d2` 를 승계하지 못하고 새 family 를 만든 것은 **stale refresh(mismatch) 가 exchange 의 family 조회보다 먼저 서버 family 를 null 로 만들었다** 는 증거 |
| 교차 검증 | K-Cosmetics 탭 refresh(fam `a9d2`) → **401 `TOKEN_FAMILY_MISMATCH`**(서버=`2b07`) → 서버 null → Pharmacy-Hub refresh(fam `2b07`) → **401 `TOKEN_FAMILY_REVOKED`** |
| **판정** | 착지 서비스는 정상 로그인(AT 15분 유효). **출발 서비스(및 다른 모든 origin) 의 refresh 는 착지 순간 이미 죽어 있다.** 사용자 체감 = 「handoff 로그인 성공 → 사용 가능 → 15분 뒤 reload/다음 요청에서 401」 |

### Case F · 최종 상태 — AT 만료 후 전체 reload (클라이언트 체인 end-to-end)

neture 탭 · AT `exp=1789615032` · RT fam=`b9e2`(Case C 로 서버에서 이미 무효).

| 시각 | 단계 | 관찰 |
|---|---|---|
| 1789615046 | reload 직전 | localStorage AT=1193 RT=395 **존재** · 화면은 아직 로그인 상태(마지막 요청 이후 유휴) |
| 1789615050 | `https://neture.co.kr/` 전체 로드 | `/auth/me` → **401**(만료 AT, `INVALID_TOKEN`) |
| +ms | auth-client interceptor | `/auth/refresh` → **401**(family 무효) |
| +ms | console | `Authentication failed. Tokens cleared.` (`clearAllTokens()` + `auth:token-cleared`) |
| 1789615056 | 최종 | localStorage **키 0개** · 「로그인·회원가입」 버튼 · 4 카드 없음 |
| **판정** | **REPRODUCED.** 토큰이 사라지는 지점 = **reload 후 첫 `/auth/me` 401 에 이은 refresh 실패 시점의 `clearAllTokens()`**. reload 나 handoff 왕복 자체는 토큰을 건드리지 않았다 |

### Case G · 과거 기록 대조 (2026-09-17 01:03–01:06 세션 transcript)

- KPA 로그인 → neture handoff → 매장 카드로 KPA 재이동 → `neture.co.kr` 복귀 시 「로그인」 버튼 관찰 (console 401 없음) → **Case B 의 플래시** 또는 이전 세션 토큰 소실 상태와 일치.
- Neture → K-Cosmetics 착지 `401 /auth/me`, Neture → PharmacyHub 착지 `401 /auth/me` + `401 /auth/refresh` + `Tokens cleared` → **Case D·E 의 stale 토큰 경합**과 동일 패턴.
- 2026-09-16 05:46 curl API 로그인 + 브라우저 로그인 병행 → 401 me/refresh → **R1/R2 의 기기 간 변형**(로그인도 새 family).

---

## 4. Neture 기준 확인 항목 10건

| # | 항목 | 결과 |
|---|---|---|
| 1 | exchange 직후 `o4o_accessToken` | 존재 · 길이 1000 (`storeTokens`) |
| 2 | `o4o_refreshToken` 저장 | 존재 · 길이 395 · family 승계(서버 family 가 살아 있을 때) |
| 3 | reload 전/후 localStorage | 동일 (Case A·B·D·E 전부) — **저장소에서 토큰이 사라지는 경우는 auth-client `clearAllTokens()` 뿐** |
| 4 | reload 첫 `/auth/me` Authorization | 있음(Bearer) — 200 응답이 이를 증명(쿠키는 미전송) |
| 5 | 401 시 서버 코드 | AT 만료 → `INVALID_TOKEN`; refresh → `TOKEN_FAMILY_MISMATCH` / `TOKEN_FAMILY_REVOKED` (`retryable:false`) |
| 6 | auth-client refresh 시도 | 함 (single-flight, body refreshToken) |
| 7 | refresh 자격 origin 별 사용 가능성 | localStorage refresh token 만 사용. 쿠키 `.neture.co.kr` 은 존재하나 미전송. **origin 이 아니라 사용자 단위 family 슬롯이 유효성을 결정** |
| 8 | refresh/me 실패 → `clearAllTokens` / 이벤트 | refresh 401 → `clearAllTokens()` + `auth:token-cleared` (Case D·E console). `/auth/me` 단독 실패는 토큰 안 지움 |
| 9 | 다른 탭 storage 이벤트 경합 | 관찰 없음. Neture `AuthContext` 는 `newValue===null` 만으로 비로그인 처리하므로 안전. **본 결함과 무관** |
| 10 | handoff 토큰 vs 로그인 토큰 claim | 키 동일 · `iss/aud/tokenType` 동일 · 서비스 scope claim 없음. 차이 = handoff `memberships[].role` 누락(길이 1000 vs 1193). 소비처(`membership-guard.middleware.ts`) 는 `serviceKey/status` 만 사용 → **영향 없음** |

---

## 5. 분류 · 판정

| 분류 코드 | 판정 | 근거 |
|---|---|---|
| `TOKEN_NOT_STORED` | NO | Case A·B·D·E |
| `TOKEN_CLEARED_BEFORE_RELOAD` | NO (직접 원인 아님) | 삭제는 refresh 실패의 결과 |
| `TOKEN_PRESENT_BUT_ME_401` | 부분 — AT 만료(15분) 시에만 · 정상 만료 | `INVALID_TOKEN` |
| **`REFRESH_TOKEN_MISSING_OR_INVALID`** | **YES — 주원인** | R1 + R2 · Case C·E 코드 확인 |
| `COOKIE_ORIGIN_MISMATCH` | NO | 쿠키 미사용 경로 |
| `TOKEN_CLAIM_OR_SERVICE_SCOPE_MISMATCH` | NO | §4-10 |
| **`AUTH_CLIENT_REFRESH_RACE`** | **YES — 가속 요인** | `/handoff` 착지 시 stale 토큰으로 `/auth/me`→refresh 가 exchange 와 교차 (Case D·E). 클라이언트 가드(`freshLoginOccurred`)는 **로컬 저장소만 보호**하고 **서버 family null 은 막지 못함** |
| `STORAGE_EVENT_RACE` | NO | §4-9 |
| `HANDOFF_EXCHANGE_CONTRACT_DEFECT` | NO (계약 준수) — 단 exchange 가 「family 승계」 를 전제하는데 그 전제를 refresh rotation 이 깨뜨림 | §2-1 |
| `OTHER_HOME_AUTH_LOADING_FLASH` | 관찰 (세션 소실 아님) | `O4OHomePage` 계정 영역 `authLoading` 미반영 |

---

## 6. 최소 수정안 (본 IR 에서 구현하지 않음)

**수정 표면 = 공통 auth core(서버) 1곳 + HandoffPage 착지 정리 1패턴.** 서비스별 개별 수정·쿠키 전환·handoff 폐지 모두 불필요.

| # | 위치 | 최소 변경 | 효과 |
|---|---|---|---|
| F1 | `apps/api-server/src/services/auth/auth-token-session.service.ts refreshTokens()` | rotation 시 `generateTokens(user, roles, domain, memberships, payload.tokenFamily)` 로 **family 승계** (family = 세션 계보, 토큰 = 회전). `refreshTokenFamily` 는 이미 같은 값이므로 저장 생략 가능 | handoff 로 family 를 공유하는 모든 origin 이 서로를 죽이지 않음. logout/logout-all 의 「family null = 전체 무효화」 계약 유지. 기존 `refreshTokenFamilyContract.test.ts` 보강 필요 |
| F2 | 5개 `HandoffPage.tsx` (또는 `@o4o/auth-client` 에 `/handoff` 경로 가드 1곳) | `/handoff` 진입 즉시(exchange 전) `clearAllTokens()` 로 **낡은 토큰 선제 정리** — 자식 effect 가 부모 `AuthProvider` effect 보다 먼저 실행되므로 `/auth/me` 자체가 발생하지 않음 | 착지 시 stale refresh 가 서버 family 를 null 로 만드는 가속 경로 차단 |
| F3 (선택) | `O4OHomePage` 계정 영역 | `authLoading` 동안 로그인/회원가입 버튼 대신 빈 자리·스켈레톤 | 비로그인 플래시 제거 (UX, 세션 무관) |
| 정책 메모 (범위 밖) | 로그인 시 새 family 발급 → 다른 기기·브라우저 세션이 즉시 죽음(기기 간 단일 세션 정책). 의도라면 유지, 아니라면 별도 WO(기기별 세션 레코드) | 본 IR 판단 대상 아님 |

재현·회귀 검증(후속 WO 용): Case C 시퀀스(두 origin refresh 교대) 가 모두 200 이어야 하며, Case E 시퀀스에서 출발 origin refresh 가 200 을 유지해야 한다.

---

## 7. 최종 판정 키

```
REPRODUCED = YES
AFFECTED_SERVICES = neture, kpa-society, k-cosmetics, pharmacy-hub (handoff 로 같은 사용자 family 를 공유하는 모든 origin · 사실상 다중 기기 세션 전부)
ROOT_CAUSE = (R1) /auth/refresh rotation 이 refresh token family 를 승계하지 않고 매번 새 family 를 users.refreshTokenFamily(사용자당 단일 슬롯) 에 덮어써 handoff 로 승계된 다른 origin 의 refresh token 을 stale 로 만들고, (R2) stale refresh 1회가 family 를 null 로 만들어(TOKEN_FAMILY_MISMATCH→TOKEN_FAMILY_REVOKED) 사용자 전체 refresh 를 무효화 → AT 만료 후 첫 요청/reload 에서 me 401→refresh 401→clearAllTokens. 가속: /handoff 착지 시 stale 토큰으로 발생하는 /auth/me→refresh 가 exchange 와 교차하여 출발 origin 을 즉시 죽임.
FAILURE_STAGE = refresh
COMMON_CORE_DEFECT = YES (apps/api-server auth-token-session.service.ts refreshTokens · 5개 HandoffPage 공통 패턴)
SERVICE_SPECIFIC_DEFECT = 0
SECURITY_BOUNDARY_CHANGE_REQUIRED = NO (family 계약 의미 정정 · logout-all 전체 무효화 유지 · 쿠키/CORS 불변)
DB_CHANGE_REQUIRED = NO
RECOMMENDED_FIX_SURFACE = auth core 서버 refreshTokens() family 승계 1줄 + HandoffPage 착지 시 clearAllTokens() 선제 정리(또는 auth-client /handoff 가드 1곳) + (선택) O4OHomePage authLoading 플래시
NEXT = GO_WO-O4O-AUTH-REFRESH-TOKEN-FAMILY-CONTINUITY-AND-HANDOFF-STALE-TOKEN-GUARD-V1
```

---

## 8. 문서 정합

`문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건(§7 NEXT)` — 기준 문서 중 family 를 서술하는 곳(`O4O-IDENTITY-ARCHITECTURE-V1.md:158` "토큰 회전 추적", `USER-DOMAIN-SSOT-V1.md:21`) 은 본 결함과 모순되지 않으며 정정 대상 아님.

---

*IR-O4O-CROSSSERVICE-HANDOFF-SESSION-PERSISTENCE-V1 · 2026-09-17 · 조사 전용 · 코드/DB/UI 변경 0*

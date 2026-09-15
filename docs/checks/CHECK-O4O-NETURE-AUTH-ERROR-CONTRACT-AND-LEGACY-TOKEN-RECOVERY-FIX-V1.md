# CHECK — O4O Neture 인증 오류 계약 정리 · 과거 토큰 자동 이관 경합 제거

- **WO**: `WO-O4O-NETURE-AUTH-ERROR-CONTRACT-AND-LEGACY-TOKEN-RECOVERY-FIX-V1`
- **선행 WO**: `WO-O4O-NETURE-MAIN-ACCOUNT-AND-SUPPLIER-PARTNER-SERVICE-SEPARATION-V1` ([CHECK](CHECK-O4O-NETURE-MAIN-ACCOUNT-AND-SUPPLIER-PARTNER-SERVICE-SEPARATION-V1.md)) — 이미 적용된 `6ea6f4494`(다른 탭 로그아웃 되돌림 경합) · `cc53d5099`(파트너 게이트 관리자 예외 제거) 는 그대로 유지
- **작성일**: 2026-09-15
- **결과**: **PASS** (운영 실브라우저 12/12 · 단위 테스트 jest 14 · vitest 15 신규 + 회귀 44/41 · CI · E2E Auth Runtime 통과) — 운영 미검증 항목은 §6 에 분리 기록
- **중복 WO 확인**: 착수 시 `origin/main` 에 본 WO 커밋 없음 → 신규 구현

---

## 1. 원인과 수정 방식

| # | 증상 | 원인 | 수정 |
|---|---|---|---|
| 1 | 공급자 회원이 파트너 화면·API 를 만지면 **대표 로그인이 끝남** | `NO_SUPPLIER` / `NO_PARTNER`(서비스 미가입) 를 **401** 로 응답 → `auth-client` 401 interceptor 가 "access 만료" 로 오판 → `/auth/refresh` 시도 → (성공해도 재시도가 다시 401 / 실패면) `clearAllTokens()` + `auth:token-cleared` → 대표 로그아웃 연쇄 | 서비스 미가입은 **403** 으로 분리. 오류 코드 · 응답 구조는 불변. 401 은 자격증명 없음·무효(`UNAUTHORIZED`)에만 남김 |
| 2 | 로그아웃해도 **과거 저장소의 토큰으로 로그인이 되살아남** (특히 다른 탭 로그아웃 직후) | `getAccessToken()` / `getRefreshToken()` 이 **읽는 순간** legacy 키(`accessToken`·`authToken`·`token`·`refreshToken`) 와 `admin-auth-storage` 에서 표준 키로 **다시 저장**(읽기 이관). 다른 탭의 `clearAllTokens()` 가 키를 순차 삭제하는 사이 이 탭이 읽으면 아직 남은 `admin-auth-storage` 값이 `o4o_accessToken` 으로 복원됨 | 읽기 함수는 **표준 키만 읽고 저장소를 바꾸지 않음**. legacy 읽기 이관 제거(§3 근거). `clearAllTokens()` 는 그대로 인증 키만 개별 삭제(`localStorage.clear()` 아님) |
| 3 | refresh 진행 중 로그아웃 → **늦게 도착한 refresh 성공 응답**이 토큰을 다시 저장 | interceptor 가 refresh 응답을 받으면 무조건 `setTokens()` | `sessionGeneration` 세대 카운터: `logout()`·`logoutAll()`·refresh 실패 정리 시 +1. refresh 응답 시점에 **시작 세대와 다르거나(같은 탭 로그아웃) storage 에 refresh token 이 없으면(다른 탭 로그아웃)** 응답을 폐기하고 대기 요청은 원래 401 로 종료 |

## 2. 401 → 403 으로 바꾼 API (9곳) · 유지한 오류 코드

**변경 원칙**: "인증되지 않은 요청을 일괄 403 으로 바꾸지 않는다" — `req.user` 가 없는 경우의 `401 UNAUTHORIZED` 는 전부 그대로다. 바뀐 것은 **로그인은 유효하지만 서비스 행이 없는** 경우뿐이다.

| 파일 | 위치 | 코드 | status |
|---|---|---|---|
| `apps/api-server/src/modules/neture/middleware/neture-identity.middleware.ts` | `createRequireActiveSupplier` · `createRequireLinkedSupplier` | `NO_SUPPLIER` | 401 → **403** |
| 〃 | `createRequireActivePartner` · `createRequireLinkedPartner` | `NO_PARTNER` | 401 → **403** |
| `apps/api-server/src/modules/neture/controllers/admin.controller.ts` | 인라인 `requireActiveSupplier` | `NO_SUPPLIER` | 401 → **403** |
| `apps/api-server/src/modules/neture/neture-library.routes.ts` | 인라인 guard 2곳 | `NO_SUPPLIER` | 401 → **403** |
| `apps/api-server/src/modules/neture/controllers/supplier-service-delivery.controller.ts` | 인라인 guard 2곳 (`{ success:false, error:'공급자 계정을 확인할 수 없습니다.', code:'NO_SUPPLIER' }`) | `NO_SUPPLIER` | 401 → **403** |

**유지**: `401 UNAUTHORIZED`(미인증) · `403 SUPPLIER_NOT_ACTIVE` / `403 PARTNER_NOT_ACTIVE` + `currentStatus`(신청 중·반려·정지·탈퇴) · role/ownership 403 · 응답 구조 `{ success:false, error:{ code, message } }` 전부 불변. Neture 모듈에 남은 401 은 `UNAUTHORIZED` 뿐 (partner-dashboard · seller controller).

**프론트**: `web-neture` 에는 403 → 로그인 리다이렉트 처리가 없음(403 은 오류 메시지 문자열로만 사용 · `notifications.ts` · market-trial 페이지 리다이렉트는 401 한정). `auth-client` interceptor 는 401 에서만 refresh — 403 은 refresh · 토큰 삭제 · 이벤트를 일으키지 않음(단위 테스트로 고정). `ServiceUsageGate.tsx` · `lib/api/supplier.ts` 는 주석만 정정.

## 3. legacy 토큰 이관 — 제거 결정과 근거

**결정: 읽기 시점 이관 제거(`getAccessToken`·`getRefreshToken` 은 표준 키만 읽음).** `updateAuthStorage()` / `storeTokens()`(쓰기) 와 `clearAllTokens()`(삭제 대상에 legacy 키 · `admin-auth-storage` · `user` 포함) 는 그대로 둠.

근거 (실제 사용처 추적):
- localStorage 전략을 쓰는 서비스(web-neture · web-k-cosmetics · web-kpa-branch · web-kpa-society · web-pharmacy-hub) 에서 legacy 키(`accessToken`·`authToken`·`token`·`refreshToken`) 를 **쓰는 코드가 없음**. `admin-auth-storage` 를 쓰는 유일한 곳은 `auth-client` 자신의 `updateAuthStorage()` — 즉 "자기가 쓴 것을 자기가 읽어 되살리는" 구조였고, 표준 키가 없다는 것은 곧 로그아웃·만료라는 뜻이므로 되살릴 정당한 경우가 없음.
- `admin-dashboard` 는 별도 origin 에서 cookie 전략 + 자체 zustand store(`admin-auth-storage`) 를 쓰므로 web 서비스의 localStorage 와 공유되지 않음. `packages/auth-context` 의 token-storage 사본은 admin-dashboard 용이며 본 WO 범위 밖 — 손대지 않음.
- `node scripts/quality/check-literal-consumers.mjs --source packages/auth-client/src/token-storage.ts` → 살아있는 소비처 0 (과거 문서 언급만).
- 새 인증 체계 · 서비스별 세션 · 서비스 간 전역 로그아웃은 만들지 않음. 기존 `storage` 이벤트 기반 다른 탭 반영(`6ea6f4494`) 그대로.

## 4. 검증

### 4-1. 단위 테스트

| 대상 | 명령 | 결과 |
|---|---|---|
| Neture guard 4종 (신규) | `cd apps/api-server && npx jest src/modules/neture/middleware` | **14/14** — 미인증 401 `UNAUTHORIZED` · 미가입 403 `NO_SUPPLIER`/`NO_PARTNER`(정확한 응답 구조) · 비활성 403 `*_NOT_ACTIVE`+`currentStatus` · 활성 통과(`supplierId`/`partnerId` 설정) |
| auth-client token-storage (신규) | `npx vitest run --config packages/auth-client/vitest.config.mjs` | **8/8** — legacy 키 · `admin-auth-storage` 만 있으면 null 이고 표준 키에 되살리지 않음 · `clearAllTokens` 가 무관한 설정(`neture:theme` 등) 은 남김 |
| auth-client refresh 경합 (신규) | 〃 | **7/7** — 정상 refresh+재시도 · 403 은 refresh/삭제/이벤트 없음 · refresh 실패 시 삭제+`auth:token-cleared` 1회 · 같은 탭 logout 중 늦은 응답 폐기 · 다른 탭 storage 삭제 중 늦은 응답 폐기 · 대기 요청 401 종료 · 로그아웃 후 이벤트 중복 없음 |
| 회귀 | `packages/auth-react` vitest · `services/web-neture` vitest · `tsc --noEmit`(auth-client · web-neture) | 44/44 · 41/41 · clean |

`packages/auth-client/vitest.config.mjs` 는 신규이며 **CI 파이프라인에는 편입하지 않음**(CI 변경은 중지 조건 · 범위 밖). 로컬 실행 명령은 위와 같다.

### 4-2. 배포 (커밋 `d805e50be` 기준)

| Workflow | run | 결과 |
|---|---|---|
| Deploy API Server (Cloud Run) | `34931559207` | success |
| Deploy Web Services (Cloud Run) | `34931559189` | success |
| Deploy Admin Dashboard (Cloud Run) | `34931559281` | success |
| CI Pipeline | `34931559242` | success |
| E2E — Auth Runtime Regression (auth-client 변경 자동 트리거 · Neture/KPA-Society/K-Cosmetics 운영 대상) | `34931559247` | success |

### 4-3. 운영 실브라우저 검증 (Playwright · `neture.co.kr` · 2026-09-15 배포 후)

계정: `docs/local/TEST-ACCOUNTS.local.md` 의 공급자 승인 회원(53행) · 관리자(50행). 자격증명은 기록하지 않는다. 운영 계정의 가입·승인 상태는 변경하지 않았다.

| WO §5 항목 | 방법 | 결과 |
|---|---|---|
| 비로그인 → 401 | `GET /neture/partner/dashboard/summary` · `GET /neture/supplier/dashboard/summary` (토큰 없음) | **PASS** 401 (`AUTH_REQUIRED`) |
| 공급자 회원 → 파트너 API | 로그인 후 `GET /neture/partner/dashboard/summary` · `/partner/commissions/summary` | **PASS** 403 `NO_PARTNER` |
| 공급자 회원 → `/partner/dashboard` 화면 | 화면 진입 후 게이트 · 토큰 · `/auth/*` 호출 관찰 | **PASS** `service-gate-partner-none` 안내 · 토큰 동일 · `/auth/refresh` 호출 없음(`/auth/me` 200 만) |
| `O4O 홈으로` | 사이드바 링크 클릭 | **PASS** `/` 이동 · 계정 메뉴 유지 · 토큰 동일 |
| access 만료 + refresh 유효 | access 토큰을 훼손 후 `/supplier/dashboard` 진입 | **PASS** `401 /auth/me → 200 /auth/refresh → 200 /auth/me` · 공급자 대시보드 유지 |
| refresh 진행 중 로그아웃 + 늦은 성공 응답 | `/auth/refresh` 응답(서버 200 · 새 토큰 발급 완료) 을 route 로 보류 → 같은 세션의 다른 탭에서 세션 종료 → 응답 방출 | **PASS** 방출 후 `localStorage` 인증 키 0개 · 로그인 미복원. 비고: 다른 탭은 수동 로그아웃 전에 **자체 refresh 가 회전된 refresh token 으로 실패**해 자동 종료됨 — 실제 운영에서 발생하는 경합 그대로이며, 같은 탭 `logout()` 변형은 단위 테스트로 고정 |
| 로그아웃 후 뒤로가기 · 새로고침 · 직접 URL | bfcache 활성 Chromium 으로 `goBack()` · `reload()` · `/supplier/dashboard` 직접 진입 | **PASS** 토큰 null · 계정 메뉴 없음 · 직접 진입은 `/` 로 이동(로그인 버튼 노출) |
| legacy 저장소 토큰 잔존 | 로그아웃 상태에서 `admin-auth-storage` · `accessToken` · `authToken` 에 유효 토큰 주입 후 새로고침 | **PASS** `o4o_accessToken` null · 비로그인 유지(수정 전에는 복원되던 경로) |
| 두 탭 로그아웃 | 탭2 `/supplier/dashboard` 열어 둔 채 탭1 홈에서 `O4O 로그아웃` | **PASS** 탭2 토큰 null · 사용자 메뉴 사라짐 |
| 서비스 미가입 회원(공급자·파트너 행 없는 관리자) | `GET /neture/supplier/dashboard/summary` · `/neture/partner/dashboard/summary` · `/partner/dashboard` 화면 | **PASS** 403 `NO_SUPPLIER` · 403 `NO_PARTNER` · 게이트 안내 · 토큰 유지 · refresh 없음 |

## 5. 공통 인증 패키지 영향 범위

- 변경 패키지: `packages/auth-client` (`token-storage.ts` · `client.ts`). 소비처: localStorage 전략 5 서비스(web-neture · web-k-cosmetics · web-kpa-branch · web-kpa-society · web-pharmacy-hub) + cookie 전략(admin-dashboard — 세대 검사는 `strategy === 'localStorage'` 에서만 동작하므로 영향 없음).
- 다른 서비스 확인: E2E Auth Runtime(Neture · KPA-Society · K-Cosmetics 운영) success. 공개 API · 오류 코드 · 이벤트(`auth:token-cleared`) 계약 불변, `logout()`/`logoutAll()` 시그니처 불변.
- `packages/auth-context` 의 token-storage 사본(admin-dashboard 전용) 은 손대지 않음.

## 6. 운영 미검증 (준비되지 않은 상태 · 단위 테스트/코드 근거로만 확인)

| 항목 | 근거 | 비고 |
|---|---|---|
| 신청 중 · 반려 · 정지 · 탈퇴 상태 회원의 403 `*_NOT_ACTIVE` + 상태 안내 | jest 14 중 `SUPPLIER_NOT_ACTIVE`/`PARTNER_NOT_ACTIVE` + `currentStatus` 케이스 · 코드 불변 | 운영에 해당 상태 테스트 계정 없음. 운영 계정 상태를 임의 변경하지 않음 |
| refresh token 실제 만료(시간 경과) → 로그아웃 | vitest "refresh 불가(401) → 토큰 삭제 + `auth:token-cleared`" · 운영에서는 회전된 refresh token 실패로 동일 경로 관찰(§4-3 늦은 응답 항목의 탭B) | 실 만료 시각까지 대기하지 않음 |
| 같은 탭 `logout()` 호출 중 늦은 refresh 응답 | vitest 2건 (같은 탭 logout · 로그아웃 후 refresh 실패 시 이벤트 중복 없음) | 운영 화면은 refresh 보류 중 게이트 로딩 상태라 같은 탭에서 로그아웃 UI 에 도달할 수 없음 — 다른 탭 경로로 대체 검증 |
| web-neture 외 4개 localStorage 전략 서비스의 legacy 저장소 잔존 시나리오 | 코드 추적(legacy 키 쓰는 곳 없음) · E2E Auth Runtime | 서비스별 브라우저 재현은 하지 않음 |
| 네트워크·서버 오류가 "미가입" 으로 처리되지 않음 | 프론트 403/네트워크 오류 분기 코드 확인(리다이렉트 없음) | 운영 장애 유도 불가 |

## 7. 커밋 · Git 상태

| 커밋 | 내용 |
|---|---|
| `3146c5d24` | fix(neture-api): 서비스 미가입 오류 401→403 (9곳) · jest 14 |
| `d805e50be` | fix(auth-client): 읽기 이관 제거 · `sessionGeneration` 늦은 refresh 차단 · vitest 15 · web-neture 주석 |
| (본 CHECK) | docs(check) |

- push 전 `origin/main` 에 다른 세션 커밋(`b502c2395`) 이 있어 clean 상태에서 `rebase` 후 push — 이력 재작성 · 덮어쓰기 없음.
- 완료 조건: 본 WO 범위 미커밋 0건 · `HEAD == origin/main`.
- 다른 세션의 미추적 파일(`docs/checks/CHECK-O4O-STORE-TABLET-...` · `scripts/e2e/`) 은 접촉하지 않음.

## 8. 범위 밖 · 후속 제안

- `packages/auth-client/src/token-storage.ts` 헤더의 `@see docs/architecture/auth-ssot-declaration.md` 는 저장소에 없는 문서를 가리킨다(소스 주석 · 기준 문서 아님). 보고만 하며 수정하지 않음.
- `packages/auth-client` vitest 의 CI 편입은 CI 변경 중지 조건에 해당해 별도 WO 로 제안.
- `packages/auth-context` 의 token-storage 사본에도 동일한 읽기 이관 코드가 있는지 여부는 admin-dashboard 범위이므로 본 WO 에서 판단하지 않음.

문서 정합: 발견 1건(소스 주석의 부재 문서 참조 · 기준 문서 아님) / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건(auth-client vitest CI 편입)

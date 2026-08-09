# CHECK-O4O-FRONTEND-AUTH-CONTEXT-AND-ROUTE-GUARD-COMMONIZATION-V1

> WO: `WO-O4O-FRONTEND-AUTH-CONTEXT-AND-ROUTE-GUARD-COMMONIZATION-V1`
> 대상: 5개 서비스 프런트 `AuthContext` + 4개 서비스 일반 `RoleGuard` 를 `@o4o/auth-react` 공통 Core 로 수렴
> 브랜치: `work/frontend-auth-commonization` (전용 worktree `C:/tmp/o4o-auth-commonize`) — **main 미병합**
> 상태: **Guard 수렴 완료 · 정적/컴포넌트/브라우저 회귀검증 통과 · 실제 로그인만 `BLOCKED_EXTERNAL`**

---

## 0. 결론 요약

| 항목 | 범위 | 상태 |
|---|---|---|
| 1단계 — AuthContext 5개 서비스 수렴 (`useServiceAuth`) | KPA / K-Cos / Glyco / Neture / PH | ✅ 완료 (`bcdb1cf9b`) |
| 2단계 — 일반 RoleGuard 4개 서비스 수렴 (`createRouteGuard`) | KPA / K-Cos / Glyco / Neture | ✅ 완료 (본 커밋) |
| KPA 전용 Guard 5종 · Glyco 전용 Guard 2종 · PH `MembershipGate` | — | ✅ **무변경** (의미 보존, 통합하지 않음) |
| Core 계약 확장 — `isAllowed` 술어 주입 | `@o4o/auth-react` | ✅ 추가 (서비스명 조건문 0) |
| 정적 검증 (5개 서비스 tsc + lint ratchet) | 전 서비스 | ✅ GREEN |
| 컴포넌트 검증 (vitest 36 tests) | Core | ✅ 36/36 PASS |
| 브라우저 검증 (BEFORE/AFTER 동치, 4서비스 × 6시나리오) | 실 앱 | ✅ 24/24 **url·본문 완전 동일** |
| **실제 계정 로그인 성공** | 실 API | ⛔ **BLOCKED_EXTERNAL** — Identity V2 credential drift (§6) |
| CI 파이프라인 테스트 배선 | — | ⬜ 미실시 (CI 인프라 변경 = 별도 WO) |

### 한 줄 요약

Guard 판정 로직을 Core 로 옮기면서 **4개 서비스의 화면 동작이 변경 전과 바이트 단위로 같음을 브라우저로 실측**했다.
실제 로그인만 백엔드 문제로 검증 불가이며, 그 항목은 PASS 로 계상하지 않았다.

---

## 1. 범위와 비범위

### 이번 WO 가 한 것

- 4개 서비스의 **일반** `RoleGuard` / `RouteGuard` 판정 순서를 `createRouteGuard` 로 위임
- 판정 순서 외 차이(로딩 UI · 접근거부 렌더 · MembershipGate · 역할 술어 · redirectMap)는 **전부 주입**으로 분리
- Core 에 `isAllowed` 술어 주입점 추가 (배열로 표현 불가능한 역할 판정용)

### 명시적 비범위 (건드리지 않음)

| 대상 | 이유 |
|---|---|
| KPA 전용 Guard — `AdminAuthGuard` / `HubGuard` / `PharmacyGuard` / `PharmacyOwnerOnlyGuard` / `PharmacistOnlyGuard` | `USER-OPERATOR-FREEZE-V1 §8.4` — "KPA-a 구조를 일반 서비스 구조로 단순화 금지" |
| GlycoPharm 전용 Guard — `GlycoHubGuard` / `PharmacyStoreGuard` | 서비스 고유 정책 |
| PharmacyHub `MembershipGate` (단독 게이트, RoleGuard 없음) | 통합 대상 아님 |
| 4개 서비스 `MembershipGate` 컴포넌트 | 주입만 하고 구현은 그대로 |
| 백엔드 인증 · `auth-login.service.ts` · credential 계약 | Identity V2 별도 WO |
| `@o4o/auth-context` (admin-dashboard 전용) | 계약이 다름 — 무접촉 |
| CI 파이프라인 | 인프라 변경 = 중지 조건 |

---

## 2. 변경 내용

### 2-1. Core — `packages/auth-react/src/createRouteGuard.tsx`

`RouteGuardProps` 에 `isAllowed?: (roles: string[]) => boolean` 추가.

```
roleOk = (allowedRoles ? hasAnyRole(roles, allowedRoles) : true)
      && (isAllowed    ? isAllowed(roles)                : true)
```

**왜 필요했나.** GlycoPharm `OperatorRoute` 는 `isOperatorOrAbove(roles,'glycopharm')`,
K-Cosmetics `OperatorRoute` 는 `isAdminOrAbove(roles,'k-cosmetics') || 'k-cosmetics:operator' || 'cosmetics:operator'`
로 판정한다. 둘 다 **배열 상수로 펼치면 canonical 화 규칙이 서비스 코드에 복제**된다.
술어를 그대로 주입하게 해서 Core 안에 서비스명 조건문이 생기지 않도록 했다.

### 2-2. 서비스별 전환

| 서비스 | 파일 | 라인 | 전환 방식 |
|---|---|---|---|
| KPA | `components/auth/RoleGuard.tsx` | 127 → 100 | `createRouteGuard` + `renderDenied`(AccessDeniedCard) 주입 |
| K-Cosmetics | 동 | 103 → 91 | `createRouteGuard` + **`useGuardAuth` 어댑터**(§3-3) + `isAllowed` |
| GlycoPharm | 동 | 87 → 57 | `createRouteGuard` + `isAllowed` |
| Neture | 동 | 198 → 174 | `createRouteGuard` 를 `BaseGuard` 로 두고 5개 래퍼 유지 |

**export 표면 무변경.** 호출부(각 `App.tsx`, KPA `OperatorRoutes.tsx`) 수정 0건.

---

## 3. 동작 동치성 — 기존 → 신규 매핑

### 3-1. 공통 판정 순서 (4개 서비스 모두 동일했음)

```
1) isLoading            → 로딩 렌더
2) !isAuthenticated     → Navigate(fallback, state.from)
3) redirectMap          → 역할별 선행 리다이렉트 (Neture 만 사용)
4) 역할 불충족          → 거부 처리
5) enforceMembership    → MembershipGate 위임
```

### 3-2. 서비스별 계약 보존

| 계약 | 기존 | 신규 | 판정 |
|---|---|---|---|
| KPA `accessDeniedMessage` 있음 | AccessDeniedCard | `renderDenied({message})` → 카드 | 동일 |
| KPA `accessDeniedMessage` 없음 | `Navigate('/')` | `renderDenied` 가 `null` → `deniedRedirect='/'` | 동일 |
| KPA 로딩 문구 | "권한을 확인하는 중..." | `renderLoading` 주입 | 동일 |
| K-Cos / Glyco 로딩 스피너 | 서비스별 색상 | `renderLoading` 주입 | 동일 |
| Neture 로딩 스피너 `min-h-[400px]` | 동 | `renderLoading` 주입 | 동일 |
| Neture `requireMembership` 지정 | `<MembershipGate serviceKey=...>` | `enforceMembership={!!requireMembership}` + `membershipServiceKey` | 동일 |
| Neture `PlatformRoute` (membership 미요구) | membership 검사 없음 | `enforceMembership=false` | 동일 |
| `state.from` 복귀 경로 | 4개 서비스 모두 보존 | Core 가 보존 | 동일 |

### 3-3. 의도적으로 다르게 쓴 곳 2건 (판정은 동일)

**(a) K-Cosmetics lazy session check** — `WO-O4O-STORE-OWNER-GUARD-CHECKSESSION-FIX-V1` 계약.
기존 Guard 는 `useEffect` 로 `checkSession()` 을 트리거하고 `!isSessionChecked || isLoading` 을 로딩으로 취급했다.
Core 를 바꾸는 대신 **`useGuardAuth` 어댑터 훅** 안에 그대로 옮겼다:

```
useGuardAuth(): { isAuthenticated, user, isLoading: !isSessionChecked || isLoading }
                 + useEffect(() => { if (!isSessionChecked) checkSession() })
```

Core 는 `deps.useAuth()` 를 렌더 중에 호출하므로 어댑터 내부 훅 순서는 안정적이다.

**(b) Neture legacy `RoleGuard` 의 super_admin 선분기 제거.**
기존: `if (user && !isPlatformSuperAdmin(user)) return <MembershipGate>` — super_admin 은 Gate 를 건너뜀.
신규: 항상 `<MembershipGate>` 로 감쌈.
**동치인 이유**: 4개 서비스 `MembershipGate` 가 모두 내부에서 `isPlatformSuperAdmin(user)` 를 먼저 통과시킨다
(`packages/auth-utils/src/membershipGate.ts` 의 공통 헬퍼). 중복 판정이 하나 줄었을 뿐 결과는 같다.

### 3-4. 도달 불가 분기 정리

기존 K-Cos/Glyco/Neture 는 `!isAuthenticated` 검사 후 `!user` 를 따로 다뤘다.
`useServiceAuth` 는 `isAuthenticated: !!user` 이므로(`useServiceAuth.ts:148`) 두 조건은 동치이며,
Core 의 `!isAuthenticated || !user` 는 기존 분기를 모두 포함한다. 도달 가능한 동작 차이 없음.

---

## 4. 검증 — 방법별 분리

> **원칙: 방법이 증명하는 범위를 넘어 판정하지 않는다.**
> 토큰 주입·Mock 은 "로그인 성공"을 증명하지 않는다. 아래 표는 그 경계를 지켜 작성했다.

### 4-1. 판정표

| # | 검증 항목 | 방법 | 결과 |
|---|---|---|---|
| 1 | `login()` 반환 계약 | 컴포넌트/단위 (vitest) | ✅ PASS — 성공 시 `{success:true,user}`, throw 없음, `serviceKey` 동봉 확인 |
| 2 | 로그인 실패·오류 코드 전달 | Mock 계약 테스트 | ✅ PASS — `SERVICE_NOT_MEMBER`/`INVALID_CREDENTIALS`/429/네트워크 4종 분기 |
| 3 | **실제 계정 로그인 성공** | 실 API·브라우저 | ⛔ **BLOCKED_EXTERNAL** (§6) |
| 4 | 세션 복구 | 유효 토큰 주입 + 브라우저 / 단위 | ✅ PASS — 토큰 없으면 `/auth/me` 미호출, 있으면 복구 |
| 5 | 토큰 만료·갱신 | 제어된 토큰 + 이벤트 | ✅ PASS — `/auth/me` 401 → 비로그인, `auth:token-cleared` → user 정리 |
| 6 | 로그아웃 | 컴포넌트 | ✅ PASS — 서버 실패 시에도 로컬 정리, `logoutAll` 엔드포인트 확인 |
| 7 | 미인증 접근 | 토큰 없는 브라우저 | ✅ PASS — 4서비스 fallback 리다이렉트 |
| 8 | 미가입·승인대기 | 상태 Fixture + 브라우저 | ✅ PASS — `none`/`pending` 별 안내 화면 |
| 9 | 허용·금지 역할 | 역할 Fixture + 브라우저/단위 | ✅ PASS — 4서비스 통과/거부 |
| 10 | 기본 route | 브라우저 | ✅ PASS — `/operator` 진입·거부 후 도착지 |
| 11 | KPA 전용 Guard | 무변경 + tsc + 브라우저 | ✅ PASS(무변경) — 파일 미수정, KPA 앱 정상 기동 |

**미실시로 남은 것**: CI 파이프라인 테스트 배선(§9). PASS 로 계상하지 않았다.

### 4-2. 정적 검증

```
pnpm run type-check:frontend      → OK (services 8개 전체)
  web-kpa-society / web-k-cosmetics / web-glycopharm / web-neture / web-pharmacy-hub 포함
node scripts/lint-ratchet.mjs     → ESLint: 102 errors, 2369 warnings (error baseline 102)
```

**변경 전 baseline 도 동일하게 취득**했다 — 4개 서비스 `npx tsc --noEmit` 전부 exit 0.
따라서 GREEN 은 "원래 GREEN 이었다"가 아니라 "변경 후에도 GREEN 을 유지했다"이다.

### 4-3. 컴포넌트 검증 (vitest 36 tests)

```
npx vitest run --config packages/auth-react/vitest.config.mjs
  packages/auth-react/src/__tests__/createRouteGuard.test.tsx   21 tests
  packages/auth-react/src/__tests__/useServiceAuth.test.tsx     15 tests
  → 36 passed (36)
```

커버 범위: 판정 순서 · fallback + `state.from` · KPA 안내카드 2분기 · `isAllowed` 술어(Glyco/K-Cos 동치식) ·
`allowedRoles` ∧ `isAllowed` · `redirectMap` 선행성 · `enforceMembership` on/off · `membershipServiceKey` 전달 ·
세션 복구 4종 · login 반환 계약 · 오류 코드 4종 · 토큰 정리 이벤트 · logout 3종.

> 루트에 이미 설치된 vitest 3.2.4 / jsdom / @testing-library/react 를 사용한다.
> **테스트용 의존성을 새로 추가하지 않았다** (§7 lockfile 감사).

### 4-4. 브라우저 검증 — BEFORE/AFTER 동치 실측

가장 강한 증거다. **변경분을 `git stash` 로 내린 1단계 상태(BEFORE)와 변경 후(AFTER)에
동일 하네스를 각각 실행해 결과를 직접 비교**했다.

- 방식: vite dev 실기동 → `o4o_accessToken` localStorage 주입 → `**://api.neture.co.kr/**` 인터셉트로
  `/auth/me` 만 fixture 응답, 나머지 API 는 무해한 빈 성공 응답 → `/operator` 진입 → URL·본문 텍스트 수집
- **실 API 는 한 번도 타지 않는다.** 따라서 이 결과는 로그인 성공의 근거가 아니다.

| 시나리오 | 준비 | KPA | K-Cos | Glyco | Neture |
|---|---|---|---|---|---|
| B1 미인증 | 토큰 없음 | `/login` 로그인 화면 | `/login` | `/` + 로그인 모달 | `/` + 로그인 모달 |
| B2 무효 토큰 | 토큰 + `/auth/me` 401 | `/login` | `/login` | `/` + 로그인 모달 | `/` + 로그인 모달 |
| B3 허용역할 + active | operator + active | `/operator` 운영자 IA | `/operator` | `/operator` | `/operator` |
| B4 금지 역할 | member + active | `/operator` **접근 안내 카드** | `/` 홈 | `/` 홈 | `/` 홈 |
| B5 membership 없음 | operator + `[]` | "서비스 가입이 필요합니다" | 동 | 동 | 동 |
| B6 membership pending | operator + pending | "가입 승인 대기 중" | 동 | 동 | 동 |

**BEFORE vs AFTER 비교 결과 (4서비스 × 6시나리오 = 24건)**

```
kpa    → url+text 완전 동일 (6/6)
kcos   → url+text 완전 동일 (6/6)
glyco  → url+text 완전 동일 (6/6)
neture → url+text 완전 동일 (6/6)
```

B4 에서 KPA 만 리다이렉트가 아니라 카드를 그리는 것이 `accessDeniedMessage` 계약이며,
문구도 기존 그대로다 — "이 기능은 운영자(Operator) 권한이 필요합니다."

**관측된 console error 는 전부 하네스가 만든 것**이다:
B2 의 401 은 내가 넣은 mock 응답이고, KPA B3 의 `Unexpected token '<'` 는 KPA 자체 fetch 클라이언트가
`VITE_API_BASE_URL` 미설정 상태에서 상대경로 `/api/v1/kpa/...` 를 호출해 vite 가 index.html 을 돌려준 결과다.
**둘 다 BEFORE 에서도 동일하게 발생**했고 Guard 판정과 무관하다.

> 하네스(`guard-browser-verify.mjs`)는 dev 서버에 의존하는 일회성 도구라 저장소에 커밋하지 않았다.
> 위 표의 시나리오 정의(토큰 키 `o4o_accessToken`, fixture user 구조, 인터셉트 대상)만으로 재현 가능하다.

---

## 5. 소비처 영향 매트릭스 (Shared Module Change Protocol §7)

| 소비처 | 변경 shared module | 영향 | 검증 |
|---|---|---|---|
| `services/web-kpa-society` | `@o4o/auth-react` (`createRouteGuard`) | RoleGuard 내부 구현만 | tsc ✅ / 브라우저 6/6 동일 ✅ |
| `services/web-k-cosmetics` | 동 | RoleGuard + OperatorRoute | tsc ✅ / 브라우저 6/6 동일 ✅ |
| `services/web-glycopharm` | 동 | RoleGuard + OperatorRoute | tsc ✅ / 브라우저 6/6 동일 ✅ |
| `services/web-neture` | 동 | RouteGuard + 래퍼 5종 | tsc ✅ / 브라우저 6/6 동일 ✅ |
| `services/web-pharmacy-hub` | `@o4o/auth-react` (`useServiceAuth` 만) | Guard 없음 — 무영향 | tsc ✅ |
| `apps/admin-dashboard` | 없음 (`@o4o/auth-context` 사용) | 무영향 | 무변경 |

**route / role / capability 점검**: route 추가·삭제 0건, role 상수 변경 0건, capability 변경 0건.
Guard export 표면이 그대로라 호출부 수정도 0건이다.

---

## 6. BLOCKED_EXTERNAL — Identity V2 credential drift

### 현상

`serviceKey` 를 실은 로그인만 401 이 된다. 5개 서비스 모두 `authClient.login({email,password,serviceKey})`
를 호출하므로 **실제 계정 로그인 E2E 를 이 브랜치에서 수행할 수 없다.**

### 원인 가설 (미확정 — 본 WO 에서 진단하지 않음)

`users.password` 와 `service_credentials.password_hash` 불일치. serviceKey 유무에 따라 credential
선택 경로가 갈리며, service credential 쪽 hash 가 stale 인 것으로 의심된다.

### 본 WO 의 처리

- 백엔드 인증 코드(`auth-login.service.ts` 등)를 **접촉하지 않았다.**
- 프런트에서 `serviceKey` 를 빼거나 `users.password` 로 fallback 하는 우회를 **하지 않았다.**
  serviceKey 검증은 의도된 보안 경계이므로 우회는 회귀가 아니라 취약점이 된다.
- 영향 서비스: KPA / K-Cosmetics / GlycoPharm / Neture / PharmacyHub **전부**.
- 후속: `WO-O4O-IDENTITY-V2-SERVICE-CREDENTIAL-PASSWORD-HASH-DRIFT-AUDIT-AND-FIX-V1` 로 분리.

### 재검증 조건

Identity V2 수정 후 실제 계정으로 5개 서비스 로그인 E2E 를 수행하고, 그 결과로 본 CHECK §4-1 의
3번 항목을 갱신한다. **그때까지 본 브랜치의 최종 통합 판정은 보류한다.**

---

## 7. pnpm-lock.yaml 감사 — 외부 의존성 추가 0

1단계에서 신규 workspace 패키지(`@o4o/auth-react`)를 만들면서 lockfile 이 바뀌었다.
`origin/main...HEAD` 기준 실제 변경은 다음이 전부다.

| 변경 | 내용 | 외부 의존성? |
|---|---|---|
| 신규 importer `packages/auth-react` | `@o4o/auth-client` · `@o4o/auth-utils` → `link:` (workspace) | ❌ 없음 |
| 〃 | `react` 19.2.0 · `react-dom` 19.2.0 · `react-router-dom` 7.9.6 | ❌ **기존 해석 버전 재사용** (신규 resolution 0) |
| 〃 devDep | `typescript` 5.4.5 | ❌ 기존 버전 |
| 서비스 importer 5곳 | `@o4o/auth-react: link:../../packages/auth-react` | ❌ workspace link |
| 부수 2줄 | `glob@7.1.6` / `glob@7.2.3` 의 `deprecated:` 메시지 문구 변경 | ❌ 레지스트리 메타데이터 갱신 (버전·의존성 불변) |

**신규 외부 패키지 0개 / 신규 버전 해석 0개.** 2단계에서는 lockfile 을 추가로 건드리지 않았다
(테스트도 루트 기설치 도구만 사용).

---

## 8. Git

| 항목 | 값 |
|---|---|
| worktree | `C:/tmp/o4o-auth-commonize` |
| 브랜치 | `work/frontend-auth-commonization` |
| 1단계 | `265c57780` (패키지 골격) → `bcdb1cf9b` (AuthContext 5개 수렴) |
| 2단계 | 본 커밋 (Guard 4개 수렴 + Core `isAllowed` + 테스트 + 본 CHECK) |
| main 병합 | ❌ 하지 않음 — Identity V2 복구 후 최종 통합 판정 |
| origin/main 대비 | 2 behind (조사 중 병렬 세션이 `48faea93e`·`a5229acbd` 커밋). 본 변경과 파일 교집합 없음 — rebase 하지 않음 |

---

## 9. 후속 (본 WO 에서 하지 않음)

| # | 항목 | 사유 |
|---|---|---|
| 1 | Identity V2 credential hash drift 진단·수정 | 별도 WO (§6) |
| 2 | `packages/auth-react` 테스트를 CI 파이프라인에 배선 | CI 인프라 변경 = 중지 조건. 현재는 로컬 실행 전용 |
| 3 | KPA 전용 Guard 5종 / Glyco 전용 2종 정리 | F11 §8.4 — 구조 보존이 원칙 |
| 4 | KPA 자체 fetch `ApiClient`(158L, api 77파일 중 35파일) ↔ `authClient` 이중 운영 해소 | 범위가 커 별도 WO |
| 5 | `USER-OPERATOR-FREEZE-V1 §8.3` 문서 정합 — 존재하지 않는 Guard 3종(`BranchAdminAuthGuard`·`BranchOperatorAuthGuard`·`IntranetAuthGuard`) 기재, 실재하는 `HubGuard`·`PharmacyOwnerOnlyGuard` 누락 | Frozen 문서 변경은 별도 WO |
| 6 | `services/web-neture/tailwind.config.js` 가 `shared-space-ui`(56파일 import)·`operator-core-ui`·`store-ui-core`·`store-products-ui` 를 content 에 미포함 | 본 WO 범위 밖 (Guard 무관). 렌더 실측 동반 필요 |

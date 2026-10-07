# CHECK-O4O-DEMO-LOGIN-ENTRY-AND-EXPERIENCE-UX-V1

> WO: WO-O4O-DEMO-LOGIN-ENTRY-AND-EXPERIENCE-UX-V1 · 발행 2026-10-02 · 상태: **Phase A Fresh Census 완료 — 코드 변경 0 · 운영 write 0 · 구현 계획 승인 대기(STOP)**
> 전제: CANONICAL_DEMO_ACCOUNT_FOUNDATION = CLOSED ([CHECK](CHECK-O4O-CANONICAL-DEMO-ACCOUNT-FOUNDATION-AND-EXPERIENCE-LOGIN-V1.md) §2-11) — 다시 변경하지 않는다.

---

## 1. Fresh Census (2026-10-02 · read-only)

### 1-1. neture 로그인 UI

```text
진입          /login → LoginRedirect(홈 + 로그인 모달 열기) · 헤더 로그인 버튼 → LoginModalContext
컴포넌트      services/web-neture/src/components/LoginModal.tsx (서비스 전용)
구성          <EmailLoginForm>(@o4o/auth-react, 공통) → "또는" 구분선 → <GoogleContinue>(공통) → 오류/미가입 안내
              회원가입 · 아이디 찾기 · 비밀번호 찾기 링크는 EmailLoginForm 의 links prop
email 로그인  useAuth().loginWithEmail(email, password) = useServiceAuth(@o4o/auth-react).loginWithEmail
              → POST /auth/email/login → AuthLoginResult { success, error?, code? } (throw 아님)
```

Demo 버튼은 **LoginModal(서비스 전용) 안에서 `loginWithEmail` 을 그대로 호출**하면 된다 — 공통 패키지(`EmailLoginForm`) 변경 불필요.

### 1-2. 로그인 후 redirect

```text
LoginModal.handleLoginSuccess   returnUrl 있으면 navigate + LOGIN_EXPLICIT_NAV_KEY(sessionStorage) 1회 플래그
App.tsx PostLoginRedirect       플래그 있으면 미개입 · pathname '/login' 일 때만 역할 대시보드로 · '/' 는 그대로 홈
홈 '/'                          로그인 후 HomeEntryPanel(GET /neture/home/entry) — 매장 버튼 = 기존 handoff
```

Demo landing 은 기존 `LOGIN_EXPLICIT_NAV_KEY` + `navigate` 계약으로 처리 가능(새 redirect 경로 불필요).

### 1-3. Demo canonical landing (운영 실측)

| Demo | 실측 경로 | 결과 |
|---|---|---|
| Store | neture.co.kr 로그인 → 홈 HomeEntryPanel "테스트 약국" → `POST /auth/handoff` 200 → `/auth/handoff/exchange` 200 → **`https://pharmacy.neture.co.kr/store/workspace`** | "테스트 약국 업무공간 · 내 매장 · 매장 HUB · 내 서비스" · 거부/로그인요구 0 · API 4xx/5xx 0 |
| Supplier | neture.co.kr 로그인 → **`/supplier/dashboard`** (내부 이동) | §2-11 PASS 그대로. `VITE_HOST_CUTOVER_SUPPLIER` 는 workflow 에 미설정 → neture.co.kr 경로가 현행 |

`/neture/home/entry` 실측: Store = stores 1(kpa-society · 테스트 약국 · owner) · Supplier = stores 0 · `serviceStates.supplier=active`.

Store Demo 는 **store.neture.co.kr 을 거치지 않는다** — 기존 handoff 로 pharmacy.neture.co.kr Store Workspace 에 착지하므로
store.neture.co.kr 로그인 정책 변경이 필요 없다.

### 1-4. Demo metadata

```text
/auth/me (auth-account.controller)         isDemo · demoType 없음
POST /auth/email/login (email-auth.controller) 없음
frontend (web-neture · auth-react)         Demo 판정 수단 없음 (User = id · email · name · roles · memberships)
backend 정본                               demoAccountService.getDemoAccountType(userId) → 'STORE_OWNER'|'SUPPLIER'|null
                                           ("배지 · 안내 문구용" 주석으로 이미 준비됨 · demo_accounts.user_id 기준)
차단 응답                                   403 DEMO_ACCOUNT_FORBIDDEN · message "테스트 계정에서는 사용할 수 없는 기능입니다. …"
                                           frontend 에서 code 별 처리 0 (일반 오류로 표시)
```

→ **Demo 배지에는 최소 backend 확장이 필요하다**(WO §22-23 허용 범위). email 비교 · 버튼 클릭 로컬 플래그는 정본 판정이 아니다.

### 1-5. analytics

web-neture · 공통 패키지에 client analytics(gtag · dataLayer · posthog 등) **없음**. 운영자 화면의 "analytics" 는 서버 통계 페이지다.
→ WO §16 대로 **새로 만들지 않는다**(V1 analytics 생략).

---

## 2. 최소 구현 계획 (승인 대기)

```text
B-1 backend (최소)   /auth/me · POST /auth/email/login 의 user 에 demo: { isDemo, demoType } 추가
                     getDemoAccountType 1회 · 실패 시 { isDemo:false } (로그인 비차단) · 내부 id · registry 컬럼 미노출
                     Google 로그인 응답은 대상 아님(Demo 는 Google linking 차단)
F-1 정본 1곳         services/web-neture/src/lib/demoAccounts.ts — STORE_OWNER · SUPPLIER { email, password, label, desc, landing }
F-2 LoginModal       "체험하기" 구분선 + [매장 경영자 Demo 체험] [공급자 Demo 체험] — loginWithEmail 재사용
                     loading · disabled · 중복 클릭 방지 · credential 화면 미노출 · 실패 문구 3종(인증/권한/서버)
F-3 landing          Supplier → navigate('/supplier/dashboard') (LOGIN_EXPLICIT_NAV_KEY)
                     Store    → 홈 '/' 에 머물고 HomeEntryPanel 의 매장 버튼(기존 handoff)으로 진입 — 자동 handoff 는 하지 않음
F-4 Demo 배지        web-neture 헤더 "Demo 계정으로 체험 중 · 일부 변경 기능은 제한됩니다" (user.demo.isDemo 기준)
F-5 차단 안내        DEMO_ACCOUNT_FORBIDDEN code → 사용자 문구(공용 helper 1개, 호출부는 Demo 차단 대상 화면만)
테스트               LoginModal Demo 버튼 단위 테스트 · buildPlatformUser/toUser demo 필드 · 일반 로그인 회귀
```

## 3. 결정 필요 (구현 전)

1. **API 배포 경로** — B-1 은 API 배포가 필요하다. 운영 API 는 격리 배포 `fd3a7c8b5` 이고 main 에는 미배포 87ebdb074(Automation Discovery, BLOCKED_FREEZE)가 있다.
   (a) fd3a7c8b5 위에 B-1 만 얹은 격리 배포(직전과 같은 방식) · (b) frontend-only 로 V1(배지 없이 버튼 · landing 만) 후 배지는 API 배포 가능 시점.
2. **Store Demo 착지 서비스의 배지** — Store Demo 는 pharmacy.neture.co.kr(web-kpa-society)로 넘어간다. 그 화면의 배지는 web-kpa-society 변경이다.
   V1 은 neture.co.kr 만(WO §4 Phase A) · 착지 서비스 배지는 Phase B 로 둘지.
3. **Store landing** — 로그인 후 홈 매장 버튼 1회 클릭(현재 안) vs 로그인 직후 자동 handoff.

---

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건

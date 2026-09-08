# CHECK-O4O-COMMON-HOME-PHASE1-V1

> WO: `WO-O4O-COMMON-HOME-PHASE1-V1` — `neture.co.kr/` 를 O4O 전체 서비스 대표 진입점으로 전환 (Phase 1)
> 작업일: 2026-09-08 · 대상: `services/web-neture`

---

## 1. 조사 결과 (read-only, 최신 main 기준)

| # | 확인 항목 | 실측 |
|---|---|---|
| 1 | `/` 와 `/community` 실제 route | `/` → `CommunityPage` (NetureLayout 내부). **`/community` route 는 존재하지 않았다** — WO §3 의 "이미 `/community` 가 있다" 는 전제와 상이. `NetureHomePage` 는 이전 WO 에서 제거됨 |
| 2 | `PostLoginRedirect` 최신 조건 | `justLoggedIn` 1회 · `LOGIN_EXPLICIT_NAV_KEY` skip → `pathname ∈ {'/', '/login'}` 만 동작 → workspace prefix early-exit → `getNetureDashboardRoute()` |
| 3 | `LoginModal` returnUrl 처리 | `handleLoginSuccess()` 에서 `returnUrl && !startsWith('/workspace/')` 이면 `sessionStorage[LOGIN_EXPLICIT_NAV_KEY]='1'` 후 `navigate(returnUrl)` |
| 4 | `neture_login_explicit_nav` 보호 로직 | `App.tsx:585` 와 `LoginModal.tsx:23` 동명 상수. PostLoginRedirect 가 pathname 가드보다 **먼저** 이 플래그를 확인(레이스 방지) |
| 5 | `NetureLayout` 적용 route | `/`(구) · `/mypage/*` · `/community/*` 계열 · `/forum/*` · `/guide/*` · `/market-trial/*` · `/contact` · `/terms` · `/privacy` · `/supplier`·`/partner` 랜딩 등. 내부에 `NetureGlobalHeader` + Footer + `NetureBottomNav` 포함 |
| 6 | SEO registry `/` | `netureSeoRegistry['/']` = "Neture — O4O 유통·협업 플랫폼" |
| 7 | canonical route | `/supplier`·`/partner` 랜딩(NetureLayout) / `/supplier/*`·`/partner/*` 워크스페이스(전용 layout) / `/operator/*` / `/admin/*` / `/mypage/*` / `/handoff`(layout 없음) |
| 8 | web-neture deploy workflow | `.github/workflows/deploy-web-services.yml` — `services/web-neture/**` path trigger + `detect-changes` 가 `event.before..github.sha` 전체 배치를 비교(tip-only 결함은 이미 수정됨). `workflow_dispatch(service=neture)` 수동 경로 존재 |

**WO 전제와의 차이 → 최소 범위 조정 (§13 적용)**
`/community` 가 없었으므로 "기존 route 유지"가 아니라 **`/` 의 `CommunityPage` 를 `/community` 로 이동**했다.
`CommunityPage` 컴포넌트 자체는 복제·수정하지 않고 그대로 재사용한다.

---

## 2. 수정 파일 (4)

| 파일 | 변경 |
|---|---|
| `services/web-neture/src/pages/O4OHomePage.tsx` | **신규** — O4O 공통 Home + 최소 shell |
| `services/web-neture/src/App.tsx` | `O4OHomePage` import / `/` → `O4OHomePage`(NetureLayout 밖) / `/community` → `CommunityPage` 추가 / `PostLoginRedirect` 에서 `'/'` 제거 |
| `services/web-neture/src/config/navigation.ts` | `NETURE_PUBLIC_NAV` 에 `커뮤니티 → /community` 추가 |
| `services/web-neture/src/config/seoRegistry.ts` | `'/'` = O4O Home SEO 로 교체 · `'/community'` 에 기존 Neture 홈 SEO 이전 |

DB · migration · API · auth · membership · package.json · workflow 변경 **0건**. 기존 코드 삭제 **0건**.

---

## 3. route 전후

```text
[전]
/            → NetureLayout > CommunityPage
(/community  → 없음)

[후]
/            → O4OHomePage            (NetureLayout 밖, 자체 최소 shell)
/community   → NetureLayout > CommunityPage   (같은 컴포넌트, 이동만)
```

그 외 `/mypage/*` · `/market-trial/*` · `/forum/*` · `/guide/*` · `/supplier/*` · `/partner/*` ·
`/operator/*` · `/admin/*` · `/handoff` · `/qr/:slug` 등은 **무변경**.

---

## 4. Home shell 처리 / 화면 구성

WO §6 의 **A안**(`/` 만 `NetureLayout` 밖에 배치)을 선택했다. 신규 layout 파일을 만들지 않고
`O4OHomePage` 가 자체 최소 shell 을 직접 렌더한다.

**추가 UI 지침(검색엔진 초기 화면형) 반영** — 포털형 홈이 아니라 향후 AI / Local Work Agent
작업 시작 화면의 기준 화면으로 구성했다.

```text
(우상단)                                  [계정 아이콘] 로그인 / 이름
                       O4O
                무엇을 도와드릴까요?
        [        준비 중입니다 (비활성)        ]
  [약국][약국 경영][화장품][혈당 관리][공급자][파트너][커뮤니티]
                이용약관 · 개인정보처리방침 · Contact
```

- 상단 대형 navigation · Neture 전용 메뉴 · 서비스 메뉴바 **없음**. 우상단 최소 계정 영역만
  (비로그인 = 로그인 버튼 → 전역 LoginModal / 로그인 = 아이콘 + 이름 → `/mypage`)
- `NetureLayout` · `NetureGlobalHeader` · `Footer` · `NetureBottomNav` **무수정 · 미사용**
- 중앙 입력창은 `disabled` placeholder — **AI API 호출 · Work Scope · Agent 미구현**(Phase 3~4 자리)
- 서비스는 큰 카드가 아니라 작은 pill 배너. 홍보 · 뉴스 · 통계 · 광고 섹션 없음, 푸터는 법정 고지 링크만
- 넓은 여백 · 중앙 집중 · `flex-wrap` 으로 모바일 대응

**진입 대상** — 신규 도메인·route 를 만들지 않았다.

| 라벨 | 진입 | 비고 |
|---|---|---|
| 약국 | `https://kpa-society.co.kr/` | 외부 |
| 약국 경영 | `https://pharmacyhub.co.kr` | 외부 |
| 화장품 | `https://www.k-cosmetics.site/` | 외부 |
| 혈당 관리 | `https://www.glycopharm.co.kr` | 외부 |
| 공급자 | `/supplier` | 내부 canonical |
| 파트너 | `/partner` | 내부 canonical |
| 커뮤니티 | `/community` | 내부 canonical |

지침의 "공급자·파트너" 는 진입 route 가 `/supplier` · `/partner` 둘이므로 각각 노출했다
(데드링크 0 / 기능 은폐 0). 외부 URL 값은 `packages/shared-space-ui/src/O4OHelpSection.tsx` 의
cross-service 카탈로그와 동일하다 — 해당 상수는 export 되지 않아 공유 패키지를 수정하지 않고
web-neture 안에 두었다(공유 패키지 변경은 전 서비스 재빌드 + Shared Module Change Protocol 대상 → 범위 밖).

## 5. PostLoginRedirect 변경

```diff
-    if (location.pathname !== '/' && location.pathname !== '/login') {
+    if (location.pathname !== '/login') {
```

- `/` 는 역할 기반 자동 redirect 대상에서 **제외**. 로그인 사용자도 O4O Home 에 머문다.
- `PostLoginRedirect` 컴포넌트 · `LOGIN_EXPLICIT_NAV_KEY` skip 가드 · workspace early-exit 는 **삭제하지 않았다**.
- 참고: `/login` 은 `LoginRedirect` 가 즉시 `<Navigate to="/">` 하고 모달을 여는 구조이므로,
  로그인 성공 시점의 pathname 은 실질적으로 항상 `/` 다. 따라서 이번 변경으로 **모달 로그인의
  역할 기반 자동 이동은 사실상 발생하지 않는다** — 이것이 WO §7 의 새 정책과 일치한다.
  `/login` 조건절은 계약 보존을 위해 그대로 유지했다.

---

## 6. returnUrl 보호 확인 (무변경 확인)

| 대상 | 상태 |
|---|---|
| `LoginModal` explicit returnUrl 처리 | 무변경 |
| `LOGIN_EXPLICIT_NAV_KEY` / `neture_login_explicit_nav` | 무변경 (양쪽 상수 동일) |
| `RoleGuard` `state.from` 처리 | 무변경 |
| protected route 복귀 계약 | 무변경 |
| handoff 복귀 흐름 | 무변경 (`/handoff` route 무변경) |

---

## 7. Community 유지 결과

`CommunityPage.tsx` **무수정**. 페이지 복제 없음. `/community` 로 경로만 이동했고
`NetureLayout` 안에 그대로 있어 헤더·푸터·하단 nav 가 이전과 동일하다.
`NETURE_PUBLIC_NAV` 에 `커뮤니티` 항목을 추가해 route 있는 실기능이 nav 에서 숨겨지지 않도록 했다
(CLAUDE.md Shared Module / Core+Extension Change Rule — 데드링크 0 / 기능 은폐 0).

---

## 8. 검증

### 코드
| 항목 | 결과 |
|---|---|
| `tsc --noEmit -p services/web-neture/tsconfig.json` | **PASS** (에러 0) |
| `npm run build` (web-neture) | **PASS** (`✓ built in 31.93s`) |

### 로컬 브라우저 smoke (`vite preview`, 비로그인)
| 경로 | 결과 |
|---|---|
| `/` | **PASS** — O4O Home. title `O4O — 전문 매장 업무 플랫폼`, 중앙 워드마크 + 안내 문구 + 비활성 입력창 + 진입 pill 7, Neture 크롬 미노출 |
| `/community` | **PASS** — `NetureLayout` + CommunityPage(공지/포럼 최신글/역할 시작/서비스 바로가기 전 섹션 렌더), title `Neture — O4O 유통·협업 플랫폼` |
| `/supplier` | **PASS** — SupplierLandingPage 정상, 헤더 nav 4항목 |

### 프로덕션 smoke
§9 참조.

---

## 9. Production deploy / smoke

### 배포

| 항목 | 값 |
|---|---|
| Workflow | `.github/workflows/deploy-web-services.yml` |
| Run | `34195912966` (df80f0638, deploy-neture success) / `34196443286` (03acb7c06, deploy-neture success) |
| Cloud Run service | `neture-web` (asia-northeast3 / netureyoutube) |
| 배포 revision | `neture-web-01549-pc4` |
| 이미지 태그 | `gcr.io/netureyoutube/neture-web:03acb7c06b77147cef39d8631b9864d9f0b3cde9` |

`detect-changes` skip 사고 재발 여부를 확인하기 위해 CI green 만으로 끝내지 않고
**deploy-neture job 실행 → revision → 이미지 태그 == push 한 commit SHA** 까지 대조했다. 일치.

### 실브라우저 smoke (`https://neture.co.kr`)

| # | 시나리오 | 결과 |
|:--:|---|:--:|
| 1 | 미인증 `/` | PASS — 새 O4O Home(타이틀 `O4O — 전문 매장 업무 플랫폼`, 워드마크 · `무엇을 도와드릴까요?` · 비활성 입력창 `준비 중입니다` · 진입 pill 7 · 법정 링크 footer). Neture Header/Footer 미노출 |
| 2 | 미인증 `/operator` (protected deep link) | PASS — `/` 로 이동 + 로그인 모달. 로그인 후 **`/operator` 로 복귀**(역할 대시보드로 덮어쓰지 않음), Operator 대시보드 정상 렌더 |
| 3 | 로그인 상태 `/` | PASS — **`/` 에 머무름**. 역할 대시보드 자동 이동 없음. 우상단 최소 계정 링크만 표시 |
| 4 | `/community` | PASS — `NetureLayout` + 기존 `CommunityPage` 그대로. SEO 타이틀 `Neture — O4O 유통·협업 플랫폼` 유지. Header nav 에 `커뮤니티` 노출 |
| 5 | `/supplier` | PASS — `Supplier — Neture` |
| 6 | `/partner` | PASS — `Partner — Neture` |
| 7 | `/mypage` · `/mypage/profile` | PASS — `마이페이지` / `프로필` |
| 8 | `/admin` | PASS — `관리자 대시보드` |
| 9 | `/operator/suppliers` (하위 route) | PASS — `공급자 승인` |
| 10 | `/supplier/products` (하위 route) | PASS — `접근 권한이 없습니다`. smoke 계정이 supplier 역할이 아니어서 나오는 **기존 역할 가드 동작**이며 `/` 로 튕기지 않음 |
| 11 | `/handoff` | PASS — `/handoff` 유지(외부 복귀 처리 화면), `/` 로 덮어쓰지 않음 |

smoke 계정: `docs/local/TEST-ACCOUNTS.local.md` 의 Neture admin/operator 계정 (자격정보 본 문서 미기재).

---

## 10. 후속 작업

- Phase 2 — O4O Home 서비스/업무 진입 구조 정밀화 → Work Scope 모델 확정
- Phase 3 — 공통 AI 입력창 (본 Home hero 하단이 삽입 지점)
- Phase 4~6 — Local Work Agent V0 / Chrome·Computer Use / Local SQLite·Device 연결
- 별도 작업공간: `ServiceSwitcher` 정비 · `main-site` 정비 · Community 구조 정비
- `O4OHelpSection.ALL_SERVICE_ITEMS` 를 cross-service 진입 URL SSOT 로 export 승격할지 판단
  (현재 O4O Home 이 같은 값을 로컬에 보유 — 공유 패키지 변경은 별도 WO 필요)
- O4O Home 이 실제로 대체한 Neture 홈 잔재(브랜딩 문구 등) 정리 — 이번 WO 범위 밖(대량 삭제 금지)

---

## 11. 문서 정합

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건

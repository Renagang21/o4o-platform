# IR-O4O-CROSS-SERVICE-PUBLIC-HOME-AND-BRAND-DESIGN-CENSUS-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-06 · **최종 갱신**: 2026-10-06
> **근거 WO/IR**: IR-O4O-CROSS-SERVICE-PUBLIC-HOME-AND-BRAND-DESIGN-CENSUS-V1 (조사 전용)
> **성격**: read-only census. 코드 · CSS · route · auth · DB · 배포 · 로고/파비콘/이미지 생성 **0건**. 제안은 제안일 뿐 구현 지시가 아니다.

---

## 0. 요약 (결론 먼저)

1. **9개 호스트가 6개 앱 · 6개 브랜드 표기 · 7개 주색 · 0개 공통 토큰**으로 운영되고 있다. 공통으로 쓰이는 것은 `PublicLegalFooterInfo` · `O4OHomeButton` · (일부) `GlobalHeader` 정도이며, 디자인 토큰 · 폰트 · 파비콘 체계는 서비스마다 따로다.
2. **로그아웃 방문자가 `https://neture.co.kr/` 로 돌아갈 명시적 경로가 있는 곳은 store · study 2곳뿐**이다. pharmacy · retail · kpa 는 로그인 후에만 "O4O 홈"이 보이고, supplier · community · funding 은 "Neture" 로고가 자기 호스트 `/` 로 간다.
3. **pharmacy.neture.co.kr 는 화면 · 메타 · manifest · footer 전부가 "KPA-Society / 약사회" 브랜드**다. "O4O Pharmacy" 표기는 0건. GlycoPharm · PharmacyHub 문자열은 UI 노출 0건(코드 잔존은 은퇴 앱 `web-pharmacy-hub` 에만).
4. **retail.neture.co.kr 는 2026-10-05 은퇴 결정**([DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1 §14](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md))이 있으나 기준 문서 [O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1](../baseline/O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md) 은 활성 서비스로 기술한다 → **사용자 판정 필요(§12 D1)**. 화면은 영어 "K-Beauty Community Hub" 로 '리테일/소매' 표기 0건.
5. **Hero 유형**: TEXT_ONLY 5(neture · funding · community · study · kpa) · GRADIENT 1(supplier) · CARD 2(pharmacy — 광고 시 IMAGE · retail) · NO_HERO 1(store). 공통 Hero 언어가 없다.
6. **SEO**: web-neture 4개 호스트가 모두 같은 O4O title · `og:url=neture.co.kr` 을 낸다(호스트 미인식). pharmacy 는 `og:url`·sitemap·robots 가 `kpa-society.co.kr`. og:image 는 전 서비스 0건. `/favicon.ico` 전 서비스 404, study · store · kpa 는 파비콘 자체가 없다.
7. **권고 Phase 순서(재정렬)**: **A(브랜드·명칭 결정 + 메인 복귀 계약) → B(토큰·폰트 최소 공통화) → C(헤더/푸터 config 정렬) → D(Hero 서비스별 적용) → E(아이콘·SEO 메타)**. 단 E 의 "파일 슬롯 · 메타 호스트 인식"은 자산 없이도 가능해 C 와 병합 가능(§11).

---

## 1. 조사 범위 · 방법

| 항목 | 내용 |
|---|---|
| 대상 호스트 | `neture` · `pharmacy` · `retail` · `supplier` · `community` · `study` · `funding` · `store` · `kpa` (모두 `.neture.co.kr`, 메인은 `neture.co.kr`) |
| 제외 | `neture.co.kr/hospital` (WO 지시) · PharmacyHub 독립 서비스 부활 검토 (WO 지시) |
| 브라우저 실측 | Playwright(시스템 Chrome, headless) · 로그아웃 상태 · Desktop 1280×800 / Mobile 390×844 · viewport + full-page 스크린샷 · DOM 지표(header/footer/h1/링크/overflow/폰트/색) 수집 · 2026-10-06 |
| 코드 조사 | origin/main `1fc49cbc5` 기준 각 앱 `App.tsx` route, 헤더/푸터/홈 컴포넌트, `index.html` · `public/` · tailwind config · CSS 변수, 공통 패키지 |
| 로그인 상태 | 테스트 계정 미사용(운영 users = 관리자 1행). **로그인 후 화면은 코드 trace 로만** 판정하고 실측 미수행으로 표기 |
| 스크린샷 | 로컬 전용(저장소 미커밋): `C:\Users\home\Downloads\o4o-design-census-2026-10-06\` — `{host}-d.jpg`(1280) · `{host}-m.jpg`(390) · `{host}-full.jpg`(full page) · `census.json`(DOM 지표) · `ico-*.png` |

전 호스트 HTTP 200. **두 폭 모두 가로 overflow 0건.**

---

## 2. 호스트 → 앱 매핑

| 호스트 | 앱 | serviceKey / role prefix | `/` 렌더 |
|---|---|---|---|
| `neture.co.kr` | `services/web-neture` | `neture` | `O4OHomePage` (NetureLayout **밖**) — `App.tsx:721` |
| `supplier.` | web-neture (`hostProfile.ts` + `HostBoundary`) | `neture:supplier` | `SupplierLandingPage` (NetureLayout 안) — `App.tsx:727-733` |
| `funding.` | web-neture | — | `MarketTrialHubPage` |
| `community.` | web-neture | `community` | `CommunityHostHomePage` |
| `pharmacy.` | `services/web-kpa-society` | `kpa-society` / `kpa:*` | AuthGate → Layout → `CommunityHomePage` — `App.tsx:711` |
| `retail.` | `services/web-k-cosmetics` | `k-cosmetics` / `cosmetics:*` | 홈(AuthGate 없음) |
| `store.` | `services/web-store` | (serviceKey 서비스 아님) | `StoreGate` → 로그아웃 시 로그인 안내 카드 |
| `study.` | `services/web-lecture` | — | 공개 홈 |
| `kpa.` | `services/web-kpa-branch` | `kpa-branch:*` | `DirectoryPage` (shell **없음**) · `/{slug}` 는 `BranchLayout` |

`hostProfile.ts`: `MAIN_ORIGIN='https://neture.co.kr'`, `SHARED_PREFIXES`(login · auth · terms · privacy · contact · mypage)는 모든 web-neture 호스트에서 공유, community `/pharmacist` → `pharmacy/forum` · `/retail` → `retail/forum` 대상.

---

## 3. 서비스별 현재 화면

분류: **PUBLIC_LANDING**(공개 소개 중심) · **PUBLIC_PLUS_WORKSPACE**(공개 + 로그인 시 업무 진입) · **WORKSPACE_FIRST**(업무 화면이 첫 화면) · **AUTH_ONLY**(로그인 전 내용 없음).

### 3-1. neture.co.kr (메인)

| 항목 | 현재 |
|---|---|
| 분류 | PUBLIC_PLUS_WORKSPACE (로그아웃=소개, 로그인=`HomeEntryPanel` 4 업무공간 카드 = DASHBOARD_DIRECT 형) |
| 헤더 | **`<header>` 요소 없음 · 로고 없음.** 인라인 상단 바에 "로그인" 모달 버튼만 |
| Hero | **TEXT_ONLY** — h1 "O4O" / "온라인의 정보와 콘텐츠를 / 오프라인 매장의 활동으로 연결합니다." / CTA "로그인하고 시작하기" |
| 본문 | "주요 서비스" 카드 약국 · 리테일 · 공급자(**새 탭** 열림, `O4OHomePage.tsx:99-111`) → "함께 이용하는 서비스" 커뮤니티 · 강의 · 유통참여형 펀딩 → "O4O AI" composer |
| 푸터 | 이용약관 · 개인정보처리방침 · Contact + 법정정보(`PublicLegalFooterInfo`) |
| 메인 복귀 | 자기 자신 (N/A) |
| 스크린샷 | `neture-d.jpg` · `neture-m.jpg` · `neture-full.jpg` |

### 3-2. supplier.neture.co.kr

| 항목 | 현재 |
|---|---|
| 분류 | PUBLIC_LANDING |
| 헤더 | `NetureGlobalHeader` — "🌿 Neture" / "O4O 통합 업무 공간", emerald `#059669`, 로고 → **자기 호스트 `/`**. nav: Home · 커뮤니티 · 이용 안내 · Contact Us |
| Hero | **GRADIENT_HERO** (blue-600→800) — h1 "Neture 공급자로 참여하세요" · CTA 공급자 등록(`/register`) · 공급자 로그인 (`SupplierLandingPage.tsx:98-128`) |
| 본문 | 혜택 → 흐름 → 제품 → 가입 절차 → dark CTA |
| 푸터 | NetureLayout "© 2026 Neture. O4O 통합 업무 공간" + 법정정보. **메인 링크 없음** |
| 메인 복귀 | **MISSING** (로그아웃) |
| 모바일 | 단어 중간 줄바꿈 "참여하세/요" · "전/국" (`word-break: keep-all` 부재) |

### 3-3. funding.neture.co.kr

| 항목 | 현재 |
|---|---|
| 분류 | PUBLIC_LANDING |
| 헤더/푸터 | supplier 와 동일 (NetureLayout) |
| Hero | **TEXT_ONLY** · 인라인 style · max-width 920px |
| 본문 | 안내 그리드 `repeat(3,1fr)` **breakpoint 없음**(`MarketTrialHubPage.tsx:421`) → 390px 에서 3열 압축 · **종료 섹션에 "[SMOKE] …운영 루프 테스트" 항목이 공개 노출** · 하단 문구에 "서비스(K-Cosmetics / KPA-a 등)" 구 명칭 |
| 메인 복귀 | **MISSING** |

### 3-4. community.neture.co.kr

| 항목 | 현재 |
|---|---|
| 분류 | PUBLIC_LANDING (커뮤니티 선택 허브) |
| 헤더/푸터 | NetureLayout |
| Hero | **TEXT_ONLY** — h1 "O4O 커뮤니티" + 카드 2(약사 커뮤니티 · 소매업소 커뮤니티) |
| 메인 복귀 | **MISSING** |

### 3-5. pharmacy.neture.co.kr

| 항목 | 현재 |
|---|---|
| 분류 | PUBLIC_PLUS_WORKSPACE |
| 헤더 | `KpaGlobalHeader`(`@o4o/ui GlobalHeader` 기반) — "💊 KPA-Society" / "약사 전문 플랫폼", `#2563eb` (`KpaGlobalHeader.tsx:119-125`). "O4O 홈" 은 **로그인 시에만**(`:137-143`, `GlobalHeader.tsx:252` `isAuthenticated && utilitySlot`) |
| 로그인 모달 | "KPA Society 로그인 / 약국 사업자 서비스" |
| 상단 | 체험 계정 배너 — container 없이 전폭 |
| Hero | **CARD_HERO**(광고 없음) / 광고 있으면 320px **IMAGE** carousel — 배지 "약사·약국 O4O 플랫폼" · h1 "정보를 매장 실행 경쟁력으로 연결합니다" · sub "AI · 운영자 자료 · 매장 도구를 연결해 작은 약국도 경쟁력을 만듭니다" · **CTA 없음** (`CommunityHomePage :154-156`) |
| 본문 | 공지 / 약사공론 뉴스 placeholder → 최신글 → 서비스 바로가기 → CTA → "KPA-Society 이용 가이드" → 내 역할 → "다른 서비스 소개"(K-Cosmetics 카드 → `www.k-cosmetics.site`, `O4OHelpSection.tsx:26-39`) |
| 푸터 | "Copyright © 2026 약사회" · "약사회" 섹션 · "약사회 소개" + 법정정보 |
| 메인 복귀 | **MISSING** (로그아웃) |
| 모바일 | hero h1 "연/결합니다" 단어 분리 |
| 미검증 | 공지·CTA 섹션 배경이 `--color-primary-light`(`#3B82F6`)로 채도 높게 렌더될 가능성 — **코드 추론만, 실측 미확인** |

### 3-6. retail.neture.co.kr

| 항목 | 현재 |
|---|---|
| 분류 | PUBLIC_LANDING (커뮤니티형) |
| 헤더 | "K-Cosmetics" / "K-Beauty 전문 플랫폼", `#db2777`. 로그아웃 시 메인 복귀 없음 |
| Hero | **CARD_HERO** — 배지 "K-Cosmetics Community" · h1 "K-Beauty Community Hub" · sub "Forum, Video, Resources all in one place" (**영어**) · CTA 없음 |
| 본문 | "다른 서비스" 카드 → `kpa-society.co.kr` |
| 푸터 | 레거시 k-cosmetics.site 지원 이메일 · "© K-Cosmetics" |
| 표기 | "리테일 / 소매" 문자열 UI 0건 |
| 메인 복귀 | **MISSING** |

### 3-7. store.neture.co.kr

| 항목 | 현재 |
|---|---|
| 분류 | **AUTH_ONLY**(로그아웃) / WORKSPACE_FIRST(로그인) |
| 헤더 | `RootShell.tsx:43-60` — 텍스트 "내 매장" · nav 6개 · **"O4O 홈" 상시** · 720px 미만 wrap(햄버거 없음) |
| Hero | NO_HERO (로그아웃 카드 "내 매장 / 로그인이 필요합니다.") · 로그인 후 `HomePage`: eyebrow "Unified Store Workspace" · h1 조직명 또는 "내 매장" · sub "가입한 모든 서비스의 매장 업무를 한곳에서" (코드 trace) |
| 푸터 | neture.co.kr 링크 포함 |
| 메인 복귀 | **있음** (헤더 + 푸터) |

### 3-8. study.neture.co.kr

| 항목 | 현재 |
|---|---|
| 분류 | PUBLIC_PLUS_WORKSPACE |
| Hero | **TEXT_ONLY** — eyebrow "Neture Study" · h1 "O4O 강의" · sub "강의·학습·평가·수료를 한곳에서" · CTA 강의 둘러보기(`/courses`) · 서비스 로그인(`/login`) |
| 헤더/푸터 | "O4O 홈" 헤더 + 푸터 **상시** |
| 메인 복귀 | **있음** |

### 3-9. kpa.neture.co.kr

| 항목 | 현재 |
|---|---|
| 분류 | PUBLIC_LANDING(분회 디렉터리) / 분회 `/{slug}` = PUBLIC_PLUS_WORKSPACE |
| `/` | **TEXT_ONLY** · `DirectoryPage` — **header · footer · O4O 홈 전부 없음**. h1 "약사회 분회" · sub "분회별 홈페이지와 회원 소속을 한 곳에서" · 로그인 / 가입 신청 / 내 분회 · 분회 목록 → 모바일 full-page 높이 11,684px |
| `/{slug}` | `BranchLayout` — 모바일 토글 메뉴 있음 · "O4O 홈" 로그인 시에만(`:178`) · 푸터는 연락처만(**약관 · 개인정보처리방침 · 법정정보 없음**) |
| 메인 복귀 | **MISSING** |
| 코드 drift | `BRAND.domain` = `kpa-society.co.kr` (stale) |

---

## 4. 메인 복귀(`https://neture.co.kr/`) 현황

| 호스트 | 로그아웃 | 로그인 (코드 trace) | 위치 |
|---|---|---|---|
| neture | N/A | N/A | — |
| supplier · funding · community | **MISSING** (로고=자기 `/`) | MISSING | — |
| pharmacy | **MISSING** | 있음 (`O4OHomeButton`, handoff POST) | 헤더 utility |
| retail | **MISSING** | 코드상 동일 구조(`GlobalHeader` utilitySlot) | 헤더 |
| store | 있음 | 있음 | 헤더 + 푸터 |
| study | 있음 | 있음 | 헤더 + 푸터 |
| kpa `/` | **MISSING** (shell 없음) | MISSING | — |
| kpa `/{slug}` | **MISSING** | 있음 | 헤더 |

원인: ① `GlobalHeader.tsx:252` 가 `utilitySlot` 을 `isAuthenticated` 일 때만 렌더 ② `NetureGlobalHeader` 로고 `href` 기본값 `/` 가 호스트 상대 ③ 푸터에 메인 링크 슬롯 없음. 공통 컴포넌트 `O4OHomeButton`(`packages/auth-react/src/useO4OHomeReturn.tsx:23-26`, `O4O_HOME_URL='https://neture.co.kr/'`, 라벨 "O4O 홈")은 이미 존재한다.

---

## 5. 로고 · 파비콘 · 메타 (운영 실측)

| 호스트 | 헤더 로고 | favicon | apple-touch / manifest | `<title>` (로그아웃 `/`) | description / og |
|---|---|---|---|---|---|
| neture · supplier · funding · community | 이모지 "🌿 Neture" 텍스트 (메인은 로고 없음) | `/favicon.png` 45×47 (707 B) | 없음 | 4 호스트 모두 "O4O — 소규모 사업자를 위한 통합 업무 공간" | `resolveNetureSeoDefaults` 가 **path 만 보고 host 무시** → `og:url=neture.co.kr` 공통, og:image 없음 |
| pharmacy | 이모지 "💊 KPA-Society" 텍스트 | `favicon.png` 녹색 "약" 배지 (3,918 B) | apple-touch · 192 · 512 · `manifest.json`(name "KPA Society", short_name "KPA", theme `#2563EB`) | 정적 "KPA Society — …" / 런타임 "KPA Society — 커뮤니티" | `og:url` · `sitemap.xml` · `robots.txt` = `kpa-society.co.kr` |
| retail | 텍스트 "K-Cosmetics" | `favicon.svg` | 없음 | "K-Cosmetics - O4O Platform" | description · og 없음 |
| store | 텍스트 "내 매장" | **없음**(`public/` 디렉터리 없음) | 없음 | "내 매장 \| Neture" | 없음 |
| study | 텍스트 | **없음** | 없음 | "O4O 강의 \| Neture" | 없음 |
| kpa | 없음(`/`) | **없음** | 없음 | "약사회 분회" | 없음 |

- `/favicon.ico` 는 **전 호스트 404**.
- 이미지 로고 파일(SVG/PNG wordmark)은 **전 서비스 0건** — 모두 이모지 또는 텍스트.
- `packages/types/src/service-branding.ts` 의 `SERVICE_BRANDING` 은 **소비처 0 (dead)**.

---

## 6. Pharmacy 브랜딩 집중 census

| 축 | 표기 | 위치 |
|---|---|---|
| 서비스명 | "KPA-Society" / "KPA Society" (하이픈 혼용) | 헤더 · 로그인 모달 · title · manifest · 이용 가이드 섹션 · `SERVICE_NAME='KPA-Society'`(`App.tsx:339`) |
| 조직명 | "약사회" | 푸터 copyright · 푸터 섹션 · "약사회 소개" |
| 태그라인 | "약사 전문 플랫폼" (헤더) vs "약사·약국 O4O 플랫폼" (hero 배지) vs "약국 사업자 서비스" (로그인 모달) | 3종 혼재 |
| 도메인 | `kpa-society.co.kr` | `og:url` · sitemap · robots · `kpa-branch BRAND.domain` |
| 아이콘 | 녹색 "약" 배지 on blue theme | favicon · icons/ |
| "O4O Pharmacy" | **0건** | — |
| GlycoPharm | UI 0건 | 은퇴 트랙 CLOSED(2026-09-18) |
| PharmacyHub | UI 0건 · 코드는 은퇴 앱 `services/web-pharmacy-hub`(Pretendard CDN 링크 포함) | — |

판단: [O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1](../baseline/O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md) 상 `pharmacy` = **약국 사업자 세미프랜차이즈 서비스**, `kpa` = **약사 개인 분회**. 현재 pharmacy 화면은 "약사회(KPA)" 정체성이 강해 **두 호스트의 의미 경계가 브랜드에서 흐려진다**. serviceKey `kpa-society` 는 유지(WO 지시) 하고 **표시명만** 정리 대상이다 → §12 D2.

---

## 7. 디자인 토큰 census

| 앱 | 주색(primary) | 방식 | 폰트 |
|---|---|---|---|
| web-neture | Tailwind primary sky `#0284c7` · 헤더 emerald `#059669` · supplier hero blue-600~800 | Tailwind config | system stack |
| web-kpa-society | `#2563eb` / `--color-primary-light #3B82F6` | CSS 변수 + `styles/theme.ts` | CSS 에 "Pretendard" 명시 · **로드 안 됨** |
| web-k-cosmetics | rose `#E11D48` + pink `#db2777` (2종 공존) | CSS 변수 + Tailwind | "Pretendard" 명시 · 로드 안 됨 |
| web-store | shell indigo `#302b73` + Tailwind blue 사본 | 이중 | "Pretendard" 명시 · 로드 안 됨 |
| web-lecture | indigo | minified CSS (Tailwind 없음) | "Pretendard" 명시 · 로드 안 됨 |
| web-kpa-branch | 자체 | CSS | "Pretendard" 명시 · 로드 안 됨 |

| 분류 | 대상 |
|---|---|
| **shared (실사용)** | 없음 — 공통 토큰을 import 하는 앱 0 |
| **shared (미사용 · dead)** | `packages/ui/src/theme/tokens.ts` · `appearance-system` · `SERVICE_BRANDING` |
| **override** | 각 앱 CSS 변수 / Tailwind `theme.extend.colors` |
| **legacy** | web-pharmacy-hub 의 Pretendard CDN · K-Cosmetics 2중 red · web-store 2중 primary |

공통 Tailwind preset 없음. 확인: Pretendard 문자열은 web-kpa-society · web-k-cosmetics · web-store · web-lecture · web-kpa-branch 의 CSS/theme 에 있으나, `@font-face`/CDN 로드는 은퇴 앱 `web-pharmacy-hub/index.html` 에만 있다 → **실제 렌더 폰트는 OS fallback**.

---

## 8. 반응형 · 접근성 기본

| 항목 | 발견 |
|---|---|
| 가로 overflow | 0건 (전 호스트 · 두 폭) |
| 한국어 줄바꿈 | `word-break: keep-all` 부재 → pharmacy "연/결합니다", supplier "참여하세/요" · "전/국" |
| 고정 그리드 | funding `repeat(3,1fr)` breakpoint 없음 |
| 모바일 nav | store: 720px 미만 wrap, 햄버거 없음 · kpa `/`: nav 자체 없음 · kpa `/{slug}`: 토글 있음 |
| 랜드마크 | neture 메인 `<header>` 없음 · kpa `/` header/footer 없음 |
| 긴 페이지 | kpa `/` 모바일 11,684px (분회 목록 전량 나열) |
| 전폭 배너 | pharmacy · retail 체험 배너 container 없음 |
| 새 탭 | 메인 "주요 서비스" 카드 새 탭 열림 — 표시 아이콘/aria 안내 없음 |
| 이모지 로고 | 스크린리더 읽기 · 플랫폼별 렌더 차이 |

정밀 a11y 감사(대비 · 포커스 · aria)는 범위 밖 — 기본 지표만.

---

## 9. 명칭 drift 표

| 개념 | 현재 표기들 | 위치 |
|---|---|---|
| 플랫폼 | O4O · Neture · "O4O 통합 업무 공간" · "O4O Platform" | 메인 h1 / 헤더 / title |
| 메인 복귀 | "O4O 홈" · (로고 "Neture") | `O4OHomeButton` / NetureGlobalHeader |
| 약국 서비스 | 약국 (메인 카드) · KPA-Society · KPA Society · 약사회 · 약사 전문 플랫폼 · 약사·약국 O4O 플랫폼 | §6 |
| 소매 서비스 | 리테일 (메인 카드) · 소매업소 (커뮤니티) · K-Cosmetics · K-Beauty Community Hub · 화장품·일반 소매 (기준 문서) | — |
| 공급자 | 공급자 · Neture 공급자 | supplier |
| 펀딩 | 유통참여형 펀딩 · Market Trial (route `/market-trial`) | 메인 / route |
| 강의 | O4O 강의 · Neture Study · 강의 | study |
| 매장 | 내 매장 · Unified Store Workspace · "내 매장 \| Neture" | store |
| 분회 | 약사회 분회 · KPA · kpa-society.co.kr | kpa |
| 타 서비스 링크 | `www.k-cosmetics.site` · `kpa-society.co.kr` · "K-Cosmetics / KPA-a" | pharmacy · retail · funding |

---

## 10. 디자인 부채 매트릭스

심각도: **H** = 사용자 이탈/오해 · 브랜드 정체성 충돌 / **M** = 일관성 · 품질 / **L** = 정돈.

| # | 부채 | 호스트 | 심각도 | Phase |
|---|---|---|---|---|
| 1 | 로그아웃 메인 복귀 MISSING | supplier · funding · community · pharmacy · retail · kpa | H | A(계약) · C(적용) |
| 2 | pharmacy 브랜드 = KPA-Society/약사회 (의미상 사업자 서비스) | pharmacy | H | A(결정) · C/E |
| 3 | retail 은퇴 결정 vs 활성 화면 · 영어 hero | retail | H | A(결정) |
| 4 | 공개 화면 [SMOKE] 테스트 항목 노출 | funding | H | 별도 운영 데이터 처리(본 트랙 밖) |
| 5 | 타 서비스 링크가 구 도메인(`k-cosmetics.site` · `kpa-society.co.kr`) | pharmacy · retail · funding | M | C |
| 6 | SEO 메타 host 미인식 · og:image 0 · `og:url` 구 도메인 | web-neture 4 · pharmacy | M | E |
| 7 | favicon 없음 / `.ico` 404 | study · store · kpa / 전체 | M | E |
| 8 | 공통 토큰 0 · 주색 7종 · Pretendard 미로드 | 전체 | M | B |
| 9 | Hero 유형 불일치 · CTA 부재(pharmacy · retail) | 전체 | M | D |
| 10 | 한국어 단어 분리 | pharmacy · supplier | M | B (전역 CSS 1줄) |
| 11 | funding 3열 고정 그리드 | funding | M | D |
| 12 | kpa `/` shell 없음 · 분회 푸터에 약관/법정정보 없음 | kpa | M | C |
| 13 | neture 메인 `<header>`/로고 없음 | neture | L | C |
| 14 | store 모바일 nav wrap | store | L | C |
| 15 | dead 공통 자산(`SERVICE_BRANDING` · tokens · appearance-system) | packages | L | B (재사용 또는 정리) |
| 16 | 체험 배너 전폭 | pharmacy · retail | L | C |

---

## 11. 제안 (구현 아님)

### 11-A. 공통 디자인 언어 (config-first · 최소 공통화)

원칙: **새 UI framework · wrapper 계층을 만들지 않는다.** 이미 있는 `GlobalHeader` · `PublicLegalFooterInfo` · `O4OHomeButton` · `HeroBannerSection` 을 **설정값으로** 정렬하고, 공통화는 아래 3가지만.

1. **토큰 1장** — `packages/ui/src/theme/tokens.ts`(현재 dead)를 정본으로 살려 CSS 변수 세트(`--o4o-*`: neutral 9단 · radius · spacing · shadow · 타이포 스케일)만 정의. 각 앱은 `--o4o-accent` 하나만 override.
2. **폰트** — Pretendard 를 실제로 로드하거나(self-host 또는 허용 CDN), 명시를 제거하고 system stack 으로 통일. 둘 중 하나로 결정. 전역 `word-break: keep-all` 1줄.
3. **서비스 브랜드 config 1개** — `SERVICE_BRANDING`(현재 dead)을 `{ displayName, tagline, accent, iconBase, canonicalHost }` 형태로 재사용해 헤더 · title · manifest · og 가 같은 값을 읽게 한다.

브랜드 위계(제안): **O4O**(플랫폼 · 메인) → **O4O 약국 / O4O 리테일 / O4O 공급자 / O4O 커뮤니티 / O4O 강의 / O4O 펀딩 / 내 매장**. "Neture" 는 회사 · 도메인 표기로 한정. 약사회 분회(kpa)는 O4O 하위 서비스가 아니라 **분회가 주체인 별도 표기**(O4O 는 "powered by" 수준)를 권고 — §12 D2 와 함께 결정.

### 11-B. 서비스별 Hero 초안

공통 형식: eyebrow(서비스명) · h1(한 문장 가치) · sub(대상+행동) · CTA 1~2 · 선택 visual. 유형은 **TEXT_ONLY + accent 띠**를 기본으로, 이미지 자산이 생기면 IMAGE 로 승격.

| 호스트 | Headline | Description | CTA | Visual 개념 | Accent |
|---|---|---|---|---|---|
| neture | 온라인의 정보를 매장의 실행으로 | 약국 · 전문매장 · 공급자가 정보를 나누고 매장에서 바로 씁니다 | 로그인하고 시작하기 / 서비스 둘러보기 | 3 주체 연결 다이어그램(아이콘) | O4O 중립(neutral + 공통 accent) |
| pharmacy | 작은 약국도 정보로 경쟁합니다 | 운영자 자료 · AI · 매장 도구를 약국 업무에 연결합니다 | 약국으로 시작하기 / 로그인 | 약국 카운터 · 태블릿 · QR 일러스트 | blue (`#2563eb` 유지) |
| retail* | 전문매장 운영을 한곳에서 | 화장품 · 일반 소매 매장의 자료 · 커뮤니티 · 매장 도구 | 시작하기 / 로그인 | 진열대 · QR | rose 1종으로 통일 |
| supplier | 매장으로 가는 가장 짧은 길 | 제품 정보와 콘텐츠를 등록하면 참여 매장이 바로 활용합니다 | 공급자 등록 / 공급자 로그인 | 기존 gradient 유지 + 흐름 3단계 | blue → 공통 accent 정렬 |
| community | 같은 업종끼리 묻고 답합니다 | 약사 · 소매업소 커뮤니티 | 약사 커뮤니티 / 소매업소 커뮤니티 | 카드 2 유지 | 중립 |
| study | 매장에 필요한 것만 배웁니다 | 강의 · 학습 · 평가 · 수료를 한곳에서 | 강의 둘러보기 / 로그인 | 현행 유지 | indigo |
| funding | 함께 유통을 시작합니다 | 매장이 참여하는 유통참여형 펀딩 | 진행 중 펀딩 보기 / 참여 안내 | 진행 카드 | amber 계열(신규 1색) |
| store | (NO_HERO 유지) 로그인 카드에 서비스 설명 1줄 추가 | 가입한 모든 서비스의 매장 업무를 한곳에서 | 로그인 | — | 내 매장 indigo |
| kpa | 우리 분회를 찾으세요 | 분회 홈페이지와 회원 소속을 한곳에서 | 분회 검색 / 가입 신청 | 검색 입력 중심(목록 페이징) | 분회 자체 색 |

\* retail 은 §12 D1 결정 전까지 초안 보류.

### 11-C. 메인 복귀 계약 (제안)

1. **모든 공개 호스트는 로그아웃 상태에서도** `https://neture.co.kr/` 로 가는 링크를 **헤더 1곳 + 푸터 1곳**에 둔다. 라벨은 "O4O 홈" 단일.
2. 구현 수단은 기존 `O4OHomeButton` (로그인 시 handoff, 로그아웃 시 일반 링크). 새 컴포넌트 신설 금지.
3. 서비스 로고 클릭 = 그 서비스 `/` (현행 유지). 메인 복귀와 혼동시키지 않는다.
4. 예외: kpa 분회는 헤더 대신 **푸터 "powered by O4O" 링크**만 허용(§12 D2 결정에 따름).
5. 쟁점: `GlobalHeader.tsx:252` 의 `isAuthenticated && utilitySlot` 조건 — 공통 컴포넌트 변경이므로 [SHARED-MODULE-CHANGE-PROTOCOL](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md) 에 따라 소비처 식별 후 진행.

### 11-D. Pharmacy 로고 · 파비콘 요구사항 (자산 생성은 별도)

| 파일 | 형식 · 크기 | 배치 |
|---|---|---|
| `logo.svg` | 가로형 wordmark (심볼 + "O4O 약국" 또는 D2 결정명), 높이 기준 32px 설계 | 헤더 |
| `logo-mark.svg` | 정사각 심볼만 | 모바일 헤더 · 파비콘 원본 |
| `favicon.ico` | 16 · 32 · 48 멀티 | `public/` 루트 (`/favicon.ico` 404 해소) |
| `favicon.svg` | 정사각 · 다크모드 대응 | `<link rel="icon" type="image/svg+xml">` |
| `apple-touch-icon.png` | 180×180 · 불투명 배경 | `public/` |
| `icon-192.png` · `icon-512.png` · `icon-512-maskable.png` | PWA · maskable safe zone 80% | `manifest.json` |
| `og-image.png` | 1200×630 · 서비스명 + 한 줄 가치 | `og:image` · `twitter:image` |

현행 녹색 "약" 배지(blue theme 와 색 충돌)는 교체 대상. 같은 슬롯 구성을 전 서비스 공통 체크리스트로 쓴다.

### 11-E. SEO · 소셜 프리뷰 (제안)

- web-neture `resolveNetureSeoDefaults` 를 **host 인식**으로 — supplier · funding · community 에 각자 title · description · `og:url`.
- pharmacy `og:url` · sitemap · robots 의 `kpa-society.co.kr` → `pharmacy.neture.co.kr` (canonical host 결정 후).
- 전 서비스 `description` · `og:title` · `og:description` · `og:image` 최소 세트. title 형식 통일 제안: `{페이지} | O4O {서비스}`.

### 11-F. Phase 순서 (WO 의 A~E 재정렬 · 병합)

| Phase | 내용 | 산출 | 선행 |
|---|---|---|---|
| **A. 결정** | D1(retail 은퇴 반영) · D2(pharmacy 표시명) · 브랜드 위계 · 메인 복귀 계약 확정 | 기준 문서 1건 (BRAND 정본) | — |
| **B. 토큰 · 폰트** | dead tokens 재사용 · 폰트 결정 · keep-all · 각 앱 accent 변수만 override | 공통 CSS 변수 | A |
| **C. 셸 정렬 + 메타 슬롯** | 헤더/푸터 config 정렬 · 로그아웃 O4O 홈 · 구 도메인 링크 교체 · kpa `/` shell · **SEO host 인식 · favicon 슬롯**(자산 없이 가능한 부분 병합) | 6 앱 config 변경 | A, B |
| **D. Hero** | 서비스별 Hero 적용 · funding 그리드 · pharmacy/retail CTA | 홈 컴포넌트 | B, C |
| **E. 자산** | 로고 · 파비콘 · og-image 제작 및 교체 | 이미지 파일 | A (디자인 산출) |

WO 를 잘게 쪼개지 않는다: **A 1건 · B+C 1건 · D 1건 · E 1건 = 4 WO** 가 적정. funding [SMOKE] 노출(부채 #4)은 디자인과 무관한 운영 데이터 정리로 별도.

---

## 12. 사용자 판정 필요

| # | 질문 | 근거 |
|---|---|---|
| **D1** | retail.neture.co.kr 를 디자인 정비 대상에 포함하는가, 은퇴 결정(2026-10-05)을 우선하는가 | DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1 §14 vs SUBDOMAIN-SEMANTICS 활성 기술 · WO 는 "리테일/전문매장 O4O" 로 활성 취급 |
| **D2** | pharmacy 표시명을 "O4O 약국"(또는 O4O Pharmacy) 로 바꾸고 "KPA-Society / 약사회" 표기를 kpa(분회) 쪽으로 한정하는가 | §6 — serviceKey `kpa-society` 는 불변 |
| D3 | Pretendard 실제 로드 vs system stack 통일 | §7 |
| D4 | 메인 복귀를 kpa 분회에도 헤더로 둘지, footer "powered by" 로 한정할지 | §11-C |

---

## 13. 미검증 · 한계

- 로그인 후 화면은 테스트 계정 부재로 **코드 trace 만** — 실측 아님.
- pharmacy 공지/CTA 섹션 배경 채도 — 코드 추론, 실측 미확인.
- pharmacy hero 광고 carousel(IMAGE) 상태 — 조사 시점 광고 없음으로 CARD_HERO 관측.
- a11y 는 기본 지표만(대비 · 포커스 · aria 미감사).

---

## 14. 문서 정합

- 발견 1건: [O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1](../baseline/O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md) 이 `retail.neture.co.kr` 를 활성 서비스로 기술 — 2026-10-05 은퇴 결정 미반영. 결정이 design 문서에만 있고 정본 승격 여부가 불명확하므로 CLAUDE.md §16-6 에 따라 **ACTIVE 유지 · 보고만**.
- 코드 내 stale 도메인(`kpa-society.co.kr` · `k-cosmetics.site`)은 문서 drift 가 아니라 코드 부채(§10 #5 · #6).

`문서 정합: 발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건`

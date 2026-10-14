# CHECK-O4O-CROSS-SERVICE-PUBLIC-DESIGN-AND-BRAND-REFRESH-V1

> 이 CHECK 는 8개 공개 host 의 대표 화면 디자인과 브랜드를 정비한 결과다. 내용은 O4O 홈 복귀, 공통 Hero·토큰, O4O 약국 표시명, host 별 메타다. 운영 배포 전 코드 완료와 로컬 빌드 smoke 까지를 기록한다.

| 항목 | 값 |
|------|------|
| WO | `WO-O4O-CROSS-SERVICE-PUBLIC-DESIGN-AND-BRAND-REFRESH-V1` |
| 선행 | [`IR-O4O-CROSS-SERVICE-PUBLIC-HOME-AND-BRAND-DESIGN-CENSUS-V1`](../investigations/IR-O4O-CROSS-SERVICE-PUBLIC-HOME-AND-BRAND-DESIGN-CENSUS-V1.md) (PR #331 MERGED) |
| 성격 | 프런트엔드 표시 계층만 변경. route·API·권한·DB·serviceKey·package name 은 바꾸지 않았다 |
| 기준 | `origin/main` 0e283ba10 · branch `wo/o4o-cross-service-public-design-brand-refresh-v1` |
| 완료 판정 | **`CODE_COMPLETE` / `PRODUCTION_DEPLOYED`** — 단계 배포 01~05 완료. 01 web-neture(neture · supplier · community · funding) · 02 web-kpa-society(pharmacy) · 03 web-lecture(study) · 04 web-store(store) · 05 web-kpa-branch(kpa) 배포 · production smoke PASS(§9 · §10 · §11 · §13 · §14). 로그인 후 smoke 는 PENDING_USER_VERIFICATION. 06 final polish(§15~§19): study · kpa 운영 반영, pharmacy · store 는 API 선행 의존(#349)으로 배포 보류 — **`PARTIALLY_DEPLOYED`** (§19) |
| 작성일 | 2026-10-07 |

---

## 1. 완료 기준 판정

| 기준 | 판정 | 근거 |
|---|---|---|
| O4O_HOME_RETURN | **PASS** (코드 · 로컬 smoke) | 대상 7 host 의 헤더에 O4O 홈이 로그인 여부와 관계없이 보인다(§4). neture.co.kr 은 그 자체가 O4O 홈이다 |
| PUBLIC_HOME_VISUAL_SYSTEM | **CONSISTENT** | 공통 토큰 · Pretendard · `O4OPublicHero` · `o4o-cta` · `o4o-home-link` 를 5 앱이 함께 쓴다 |
| PHARMACY_DISPLAY_BRAND | **O4O 약국** | header · Hero eyebrow · title · og · manifest name/short_name 을 바꿨다. 내부 `kpa-society` 키는 그대로 |
| KPA_IDENTITY | **SEPARATE** | kpa.neture.co.kr 은 "약사회 분회" 정체성을 유지하고, 헤더에 작은 O4O 홈 유틸리티만 추가했다 |
| RESPONSIVE_1280_390 | **PASS** (로컬 빌드) | 8 host × 2 폭 = 16 run 모두 가로 overflow 0, h1 1개, page error 0 |
| HOST_METADATA | **SERVICE_AWARE** (runtime 기준 · 한계 1건) | title · description · og:title · og:description · og:url · canonical · favicon 을 host 별로 둔다. og:image 는 넣지 않았다. JS 를 실행하지 않는 crawler 에서는 supplier · funding · community 가 neture.co.kr 기본 메타로 보인다(§8 finding 2) |
| RETAIL | **NOT_REDESIGNED** | `services/web-k-cosmetics` 변경 0 |
| HOSPITAL | **UNTOUCHED** | neture.co.kr/hospital 관련 파일 변경 0 |
| DB_CHANGE | **0** | migration · write 0. 아래 §6 의 [SMOKE] row 는 STOP 하고 보고만 한다 |
| 운영 배포 | **배포 완료 (05/05)** | PR #337 merge(0d0ff4fdc) 후 서비스별로 하나씩 배포했다. 01 web-neture 완료(§9) · 02 pharmacy 완료(§10) · 03 study 완료(§11) · 04 store 완료(§13) · 05 kpa 완료(§14) |

---

## 2. 변경 요약

### 2-1. 공통 (최소 · framework 신설 없음)

- `packages/auth-react/src/public-brand/`
  - `tokens.css`: CSS 변수, `.o4o-hero` · `.o4o-cta` · `.o4o-cta-secondary` · `.o4o-home-link`
  - `O4OPublicHero.tsx`: eyebrow, h1 하나, 설명, actions, children
  - 서비스별 조건문은 두지 않았다. 문구와 accent 는 각 앱 config 가 넘긴다
- `packages/ui/src/layout/GlobalHeader.tsx`: `homeSlot` prop 을 추가했다. 로그인 여부와 관계없이 렌더한다
  - 소비처: web-neture · web-kpa-society 헤더
  - homeSlot 을 넘기지 않는 기존 소비처는 동작이 바뀌지 않는다
- Pretendard
  - 5 앱 `index.html` 에서 jsDelivr 의 `pretendard@v1.3.9` dynamic-subset CSS 를 preconnect 와 함께 로드한다
  - font bundle 을 저장소에 추가하지 않았다. 버전을 고정했고, 글자 단위 subset 이라 필요한 글리프만 받는다
  - 각 tailwind · body font stack 의 맨 앞에 두고, 기존 시스템 폰트는 fallback 으로 남겼다

### 2-2. host 별

| host | 앱 | 변경 |
|---|---|---|
| neture.co.kr | web-neture | IA 는 그대로다. 폰트와 토큰만 정렬했다(대표 홈 구조는 변경하지 않음). 헤더 O4O 홈 슬롯은 공용 헤더를 쓰는 다른 화면에 적용된다 |
| supplier | web-neture | `SupplierLandingPage` Hero 를 확정 문구로 바꿨다 · 주 CTA `/register` · 보조 공급자 로그인 · 로그인 시 `ServiceApplyPanel` 유지 · 혜택 카드의 색 배경과 그림자를 제거했다 |
| funding | web-neture | `MarketTrialHubPage` 에 Hero 를 추가했다 · 주 CTA 는 같은 화면의 모집 목록(`#market-trial-recruiting`) · 보조는 이용 방법 · 은퇴 서비스명 문구를 제거했다 |
| community | web-neture | `CommunityHostHomePage` 를 Hero 와 커뮤니티 목록으로 재구성했다 · 주 CTA `/pharmacist`(실제 동작하는 약사 커뮤니티) |
| pharmacy | web-kpa-society | 표시 브랜드를 O4O 약국으로 바꿨다(`config/brand.ts`) · Hero 확정 문구 · SEO registry · og:url/canonical host 기준 · manifest · robots · sitemap |
| study | web-lecture | `HomePage` 를 `O4OPublicHero` 로 바꿨다(`STUDY_HERO`) · 주 CTA `/courses` · 메타 · fallback favicon |
| store | web-store | **workspace-first 를 유지했다** — HomePage 는 변경하지 않았다. 메타 · favicon · 헤더 O4O 홈 스타일만 바꿨다 |
| kpa | web-kpa-branch | `/` 에 `DirectoryShell` 헤더와 푸터를 추가했다(분회 정체성 · O4O 홈 · 로그인 · 분회 찾기/가입 신청/내 분회) · `BranchLayout` 의 O4O 홈을 로그인과 무관하게 만들었다 · 마케팅 Hero 는 없다 |

### 2-3. 하지 않은 것

- Retail · Hospital · Google auth · membership · DB migration · route 재설계 · Store architecture · Forum/LMS/Funding 기능 재설계는 하지 않았다
- 로고 · 이미지를 생성하거나 임의로 디자인하지 않았다
- 가짜 CTA 나 가짜 콘텐츠를 만들지 않았다. 펀딩에 모집 중인 건이 없으면 빈 상태를 그대로 보여준다
- 존재하지 않는 brand image URL 을 참조하지 않았다

---

## 3. Brand asset 자리

- **O4O 약국**: `services/web-kpa-society/src/config/brand.ts`
  - `PHARMACY_BRAND_ASSET_SLOTS` 에 `/brand/logo-horizontal.svg` · `logo-mark.svg` · `favicon.svg` · `favicon.ico` · `apple-touch-icon.png` · `og-image.png` · `icon-192.png` · `icon-512.png` 자리를 두었다
  - `PHARMACY_BRAND_ASSETS_READY = false`
  - 사용자가 파일을 넣은 뒤 플래그를 true 로 바꾸고, index.html 과 manifest 의 icon 및 og:image 를 이 경로로 교체한다. 이것은 후속 작업이다
- **legacy asset 은 삭제하지 않았다**: `/favicon.png` · `/icons/*` 를 그대로 쓴다. 테스트로 존재를 확인한다
- **study · store · kpa 의 fallback favicon**
  - `apps/admin-dashboard/public/favicon.svg` 를 복사한 O4O mark 다
  - 이 mark 는 gradient 를 쓴다. 정식 O4O 마크가 나오면 교체할 대상이다
- **og:image**: 5 앱 모두 넣지 않았다. 테스트로 부재를 확인한다

---

## 4. 검증

### 4-1. 자동 테스트

| 묶음 | 결과 |
|---|---|
| `packages/auth-react` vitest | 9 files / 138 passed (Codex 대응 후) |
| `services/web-neture` vitest | 41 files / 334 passed |
| `services/web-kpa-society` vitest | 7 files / 67 passed |
| `services/web-kpa-branch` vitest | 2 files / 20 passed |
| `packages/shared-space-ui` vitest | 7 files / 87 passed |
| `packages/ui` vitest | 1 file / 10 passed |
| `apps/api-server` jest | 변경 파일을 소스 스캔하는 18 suites / 556 passed |

신규 테스트:

- `packages/auth-react/src/__tests__/O4OPublicHero.test.tsx`
- `publicBrandConsumers.test.ts`
  - 5 앱의 토큰 import, Pretendard, favicon 링크와 파일, og:url host, og:image 부재
  - O4O 약국 manifest, legacy favicon 보존
- `services/web-neture/src/config/__tests__/hostSeo.brandRefresh.test.ts`
- `services/web-neture/src/pages/__tests__/publicHero.brandRefresh.test.tsx`
  - h1 하나 · 확정 문구 · CTA 대상 · 빈 상태
- `services/web-neture/src/components/__tests__/O4OHomeSlot.brandRefresh.test.tsx`
- `services/web-kpa-society/src/config/__tests__/pharmacyBrand.brandRefresh.test.ts`
- `services/web-kpa-branch/src/layouts/DirectoryShell.test.tsx`

### 4-2. 빌드

web-neture · web-kpa-society · web-store · web-lecture · web-kpa-branch 의 `tsc && vite build` 가 모두 exit 0 이다. 기존 chunk size 경고 외의 경고는 없다. 각 dist CSS 에 토큰이 포함되었다.

### 4-3. 로컬 브라우저 smoke (운영 아님)

- **방법**: Chrome headless 로 실제 hostname(`https://<host>/`)을 열었다
  - 그 host 의 요청만 로컬 `dist` 로 응답했다. 브라우저 route interception 을 썼다
  - API · CDN 요청은 그대로 통과시켰다
  - hostname 기반 프로필(supplier · funding · community)이 운영과 같은 방식으로 판정된다
- **범위**: 8 host × 1280/390 = 16 run, 비로그인
- **스크린샷**: 세션 scratchpad 에만 저장했고 저장소에는 커밋하지 않았다

| host | status | h1 (1개) | O4O 홈 | 주 CTA | og:url |
|---|---|---|---|---|---|
| neture.co.kr | 200 | O4O | (O4O 홈 자체) | — (IA 유지) | neture.co.kr/ |
| supplier | 200 | 제품과 콘텐츠를 매장과 연결합니다 | 보임 | 공급자 등록 → /register | supplier…/ |
| funding | 200 | 제품의 가능성을 유통 참여로 연결합니다 | 보임 | 모집 중인 펀딩 보기 → #market-trial-recruiting | funding…/ |
| community | 200 | 현장의 경험과 정보를 함께 나눕니다 | 보임 | 약사 커뮤니티 들어가기 → /pharmacist | community…/ |
| pharmacy | 200 | 약국의 정보와 업무를 하나로 연결합니다 | 보임 | 로그인하고 시작하기 | pharmacy…/ |
| study | 200 | 필요한 지식을 실무와 연결합니다 | 보임 | 강의 둘러보기 → /courses | study…/ |
| store | 200 | 내 매장 | 보임 | (workspace-first, 로그인 카드) | store…/ |
| kpa | 200 | 약사회 분회 | 보임 | (분회 찾기 목록) | 없음 (§8 finding 3 대응 후) |

공통 결과(16 run 전체):

- 가로 overflow 0, page error 0, alt 없는 img 0
- Pretendard 로드 확인
- 화면 본문에 KPA-Society · K-Cosmetics 문구 0

**smoke 한계**

- 운영 배포본이 아니다. 운영 smoke 는 `PRODUCTION_SMOKE_PENDING_DEPLOY` 이다
- 로그인 상태 smoke 는 하지 않았다. 로그인 상태에서도 O4O 홈이 보이는 것은 단위 테스트로 확인했다
- pharmacy 홈의 공지 영역이 로컬 smoke 에서 "공지를 불러오지 못했습니다" 를 표시했다
  - interception 환경에서 API 호출이 실패한 것이다
  - 이번 변경과 무관한 기존 오류 표시 경로이며, 운영 smoke 때 다시 확인한다

---

## 5. 남은 legacy 표시 문구 (범위 밖 · 별도 WO 후보)

공개 홈 · 헤더 · 메타 · 주요 안내문은 O4O 약국으로 바꿨다. 아래는 admin · operator · QR 랜딩 같은 내부 화면이거나 공개 홈 밖이라 이번 범위에서 제외했다.

- `KpaAdminDashboardPage` · `AdminSidebar`(주석) · `MemberDeleteRiskModal` `serviceLabel` · operator `OrdersPage` · `ProductsPage` description: "KPA-Society"
- `ForeignVisitorAffiliatePublicLandingPage` · `MultilingualProductPublicLandingPage`: QR 공개 랜딩 하단의 "KPA-Society" 표기
- `App.tsx` `KpaStoreFooter`: `serviceName="약사회"` 표기
- `web-kpa-society/public/sitemap.xml` `/lms`: 강의 독립 분리(study) 이후 stale 가능성이 있다
- `web-kpa-branch` `BRAND.domain = 'kpa-society.co.kr'`
  - backend service-catalog 와 같은 값이라는 주석이 있다
  - 공개 표시에는 쓰이지 않는다. 정합 여부는 별도로 확인해야 한다

---

## 6. STOP — production 데이터

- funding.neture.co.kr 목록의 "마감" 영역에 `[SMOKE] 유통참여형 펀딩 운영 루프 테스트` row 1건이 공개 노출된다(id prefix `cf6cdc98`, closed)
- 숨기려면 production DB 수정(삭제 또는 비노출 처리)이 필요하다
- WO 규칙에 따라 **이번 작업에서는 수정하지 않고 보고만 한다**. 처리 방식은 사용자 판단이다

---

## 7. 기타

- 선행 census branch `wo/o4o-cross-service-public-home-brand-census-v1` 의 로컬 삭제는 권한 거부로 수행하지 않았다. 정리가 필요하면 사용자가 진행한다
- 운영 배포 후 확인할 항목
  - 8 host 실 URL 의 1280/390 화면
  - 로그인 상태의 O4O 홈 동작
  - og/canonical 실측
  - pharmacy 공지 영역

---

## 8. Codex review 대응 (PR #337)

| # | finding | 처리 |
|---|---|---|
| 1 | 세션 복구(auth loading) 중 O4O 홈을 누르면 handoff 없이 이동해 로그인 상태가 이어지지 않는다 | **수정**. `O4OHomeButton` 에 `authLoading` prop 을 추가하고, 복구 중에는 비활성(`disabled` · `aria-busy`)으로 둔다. 호출처 4곳(KpaGlobalHeader · NetureGlobalHeader · BranchLayout · DirectoryShell)에 연결했다. 테스트: 복구 중 클릭 시 post · navigate 0 → 복구 완료 후 handoff post + 이동 |
| 2 | web-neture 는 정적 index.html 하나라서 JS 를 실행하지 않는 crawler 는 supplier · funding · community 에서도 neture.co.kr 메타를 본다 | **미수정 · 별도 WO 제안**. 해결하려면 host 별 HTML 생성 또는 서버/edge 단 메타 주입이 필요하다. 이는 Docker · 인프라 변경이라 이번 WO 의 중지 조건에 해당한다. runtime(JS 실행) 메타는 host 별로 맞다 |
| 3 | kpa-branch index.html 의 고정 og:url(`kpa.neture.co.kr/`)이 분회 slug · 분회 자체 도메인에도 그대로 나간다 | **수정**. 고정 og:url 을 제거하고 이유를 주석으로 남겼다. `publicBrandConsumers.test.ts` 는 kpa-branch 에 og:url 이 없음을 확인한다 |

대응 후 재검증: auth-react 138 · web-neture 334 · web-kpa-society 67 · web-kpa-branch 20 passed. web-neture · web-kpa-society · web-kpa-branch 빌드 exit 0.

---

## 9. Production 배포 01 — web-neture (WO-O4O-PUBLIC-DESIGN-PRODUCTION-DEPLOY-01-NETURE-V1)

> 실행일 2026-10-07. 배포 대상은 `neture-web` Cloud Run service 하나다. 다른 서비스 · API · Admin · DB · migration 은 건드리지 않았다.

### 9-1. 배포 단위

- URL map 에서 `neture.co.kr`(path-matcher-neture-hospital) 과 `supplier` · `community` · `funding.neture.co.kr`(path-matcher-neture) 의 기본 backend 가 모두 `backend-neture-web-http` 다.
- 따라서 web-neture artifact 1회 배포로 **4 host 가 함께 바뀐다**. "neture 만 화면 변경" 이 아니다. 4 host 를 같은 범위로 smoke 했다.
- `neture.co.kr/hospital` 은 별도 service(`hospital-pharmacy-web`) 이고 이번 배포에서 바뀌지 않았다.

### 9-2. 배포 전 상태 (rollback 기준)

| 항목 | 값 |
|---|---|
| service | `neture-web` (asia-northeast3) |
| serving revision | `neture-web-01692-pir` · traffic 100% |
| image | `neture-web:0e283ba10…` · digest `sha256:5bff7260…` |
| `o4o-commit-sha` | `0e283ba102a86b2e6ce07d88926d3b39a0ea6fe9` |
| 배포 gate | `DEPLOY_FREEZE=false` (2026-10-03 부터 유지). WO 의 `DEPLOY_ENABLED` 에 해당하는 현행 변수는 `DEPLOY_FREEZE` 다 |

### 9-3. 후보 census (serving 0e283ba10 → candidate)

- candidate 는 처음 `0d0ff4fdc`(PR #337 merge) 였다. dispatch 직전 main HEAD 가 `6ad3d1263`(PR #343, `docs/investigations/` IR 1개) 로 움직였다. promote 는 SHA == main HEAD 를 요구하므로 **candidate 를 `6ad3d12638bf4915acaf9b26e707c209f899f899` 로 바꿨다**. 0d0ff4fdc → 6ad3d1263 의 runtime diff 는 0 이다.
- 0e283ba10 → 6ad3d1263 에서 web-neture 와 의존 package closure 를 바꾼 commit 은 PR #337 의 2건(9a4c0e571 · 0920e1895) 뿐이다.

| 분류 | 내용 |
|---|---|
| DESIGN_REFRESH_REQUIRED | `services/web-neture/**`(index.html · App.tsx · NetureGlobalHeader · seoRegistry · publicHero · index.css · Supplier/Community/MarketTrial Hero) · `packages/auth-react`(public-brand · useO4OHomeReturn · index) · `packages/ui` GlobalHeader |
| SAFE_DEPENDENCY | 없음 |
| UNRELATED | Phase E(#325 · api-server · tools/o4o-local-agent) · docs/HANDOFF commit — web-neture artifact 에 들어가지 않는다 |
| UNVERIFIED | 0 |

- 공통 package 는 publish 하지 않는다. `@o4o/auth-react` 는 `main/types/exports = ./src/index.ts` 로 monorepo source 를 직접 소비하므로 web-neture build 에 함께 들어간다. 서빙 HTML 에서 Pretendard 링크를, 화면에서 O4O 홈 · Hero 를 확인했다(§9-5).
- Delivery 판정: neture = `BEHIND · LEVEL_3` (rule `auth-package` — auth-react 경로 변경). 자동 경로는 배포하지 않는다(main push 의 Delivery run 2회 모두 Classify 만 · 배포 job skipped). 그래서 `promote.yml` 로 neture 하나만 승격했다.

### 9-4. 배포 실행

| 항목 | 값 |
|---|---|
| CI (candidate) | CI Pipeline run 37559092714 success |
| dry-run | Promote run 37559025270 (0d0ff4fdc · `services=neture` · dry_run) → neture=PROMOTE · 나머지 NOT_SELECTED · api=NO_DEPLOY |
| 실제 promote | Promote run **37559429675** (`sha=6ad3d1263…` · `services=neture`) success |
| job | `deploy-neture` success (01:56:54Z~01:59:14Z). deploy-kpa-society · kpa-branch · lecture · store · pharmacy-hub · hospital-pharmacy · API · Admin = skipped |
| 새 revision | **`neture-web-01695-kos`** · `o4o-commit-sha=6ad3d1263…` · digest `sha256:88d8edad…` |
| traffic | 새 revision 100% |
| 이전 revision | `neture-web-01692-pir` 보존 (rollback 가능) |
| 다른 service | kpa-society 02029 · lecture 00043 · store 00059 · kpa-branch 00202 · pharmacy-hub 00284 · core-api 03840 · admin 01352 — 배포 전과 같다 |
| gate | `DEPLOY_FREEZE` 는 열고 닫지 않았다. 배포 전후 모두 `false`(10-03 부터의 운영 상태) 다. L3 는 promote 없이는 자동 배포되지 않으므로 열린 gate 를 다른 push 가 이 변경에 쓸 수는 없다 |

### 9-5. Production smoke (비로그인 · Chrome headless · 실 URL)

4 host × 1280/390 = 8 run. 모두 HTTP 200 · pageerror 0 · console error 0 · 4xx/5xx 응답 0 · 가로 overflow 0 · Pretendard loaded · 화면에 KPA-Society/K-Cosmetics 0.

| host | h1 | O4O 홈 | 주 CTA | title (JS 실행 후) | og:url |
|---|---|---|---|---|---|
| neture.co.kr | O4O (60px / 390: 48px, 1줄) | (O4O 홈 자체) | 로그인하고 시작하기 | O4O — 소규모 사업자를 위한 통합 업무 공간 | neture.co.kr/ |
| supplier | 제품과 콘텐츠를 매장과 연결합니다 (2줄) | 보임 (1280 · 390) | 공급자 등록 → /register | 공급자 — 제품과 콘텐츠를 매장과 연결합니다 \| O4O | supplier…/ |
| community | 현장의 경험과 정보를 함께 나눕니다 (2줄) | 보임 | 약사 커뮤니티 들어가기 → /pharmacist | O4O 커뮤니티 — 현장의 경험과 정보를 함께 나눕니다 | community…/ |
| funding | 제품의 가능성을 유통 참여로 연결합니다 (2줄) | 보임 | 모집 중인 펀딩 보기 → #market-trial-recruiting | 유통참여형 펀딩 — 제품의 가능성을 유통 참여로 연결합니다 \| O4O | funding…/ |

neture.co.kr 대표 홈 IA 회귀 확인(화면 판독):

- O4O 소개 → [로그인하고 시작하기] → 주요 서비스(약국 · 공급자) → 함께 이용하는 서비스(커뮤니티 · 강의 · 유통참여형 펀딩) → O4O AI → Footer(법정정보) 순서가 그대로다.
- WO 의 "Google로 시작" 은 #320(로그인 진입 정상화) 에서 "로그인하고 시작하기"(모달: 이메일 · Google) 로 바뀐 기존 문구다. 이번 배포의 회귀가 아니다.
- "서비스 소식" 은 정책상 공개 글이 있을 때만 나온다. 이번 smoke 에서는 섹션이 없었고 소식 API 실패 응답도 없었다.
- Hero 는 과하지 않다(워드마크 + 2줄 + 설명 + CTA 1개). 첫 화면에 O4O 정체성과 CTA 가 보인다. AI 는 서비스 발견 뒤에 있다. 390 에서 제목 줄바꿈이 자연스럽고 카드는 1열로 쌓인다.
- 스크린샷은 세션 scratchpad 에만 두고 저장소에는 커밋하지 않았다.

### 9-6. 기타 판정

| 항목 | 값 |
|---|---|
| FUNDING_SMOKE_ROW | **PRESENT** — funding 목록에 `[SMOKE]` row 가 그대로 보인다. DB 는 수정하지 않았다(§6, 별도 data cleanup) |
| 정적 OG (known limitation) | 재현됨 — `curl` 로 받은 supplier.neture.co.kr HTML 의 `<title>` · `og:title` 은 neture 기본값이다. JS 실행 후에는 host 별 값이다. 별도 인프라 WO 유지(§8 finding 2) |
| AUTHENTICATED_SMOKE | **PENDING_USER_VERIFICATION** — 사용할 Google 테스트 계정이 없어 로그인 상태는 확인하지 않았다. 계정 생성 · DB 수정은 하지 않았다 |
| ROLLBACK | 없음 — rollback 사유(접근 불가 · fatal error · navigation · 로그인 진입 · responsive 파손) 0 |

---

## 10. Production 배포 02 — web-kpa-society / pharmacy (WO-O4O-PUBLIC-DESIGN-PRODUCTION-DEPLOY-02-PHARMACY-V1)

> 실행일 2026-10-07. 배포 대상은 `kpa-society-web` Cloud Run service 하나다(`pharmacy.neture.co.kr` → path-matcher-pharmacy → `backend-kpa-society-web`). 다른 web · API · Admin · DB · migration 은 건드리지 않았다. 내부 serviceKey `kpa-society` · package 이름 · route · API · DB key 는 바꾸지 않았다.

### 10-1. 배포 전 상태 (rollback 기준)

| 항목 | 값 |
|---|---|
| service | `kpa-society-web` (asia-northeast3) |
| serving revision | `kpa-society-web-02029-paf` · traffic 100% (그 이전 `02026-zex`) |
| `o4o-commit-sha` | `0e283ba102a86b2e6ce07d88926d3b39a0ea6fe9` · digest `sha256:41dcab71…` |
| 정적 HTML | `<title>` KPA Society — 약사 커뮤니티·강의·매장 지원 · og:title "KPA Society" · og:url `https://kpa-society.co.kr/` · Pretendard 링크 없음 |
| 화면 (1280/390) | 헤더 "KPA-Society 약사 전문 플랫폼" · h1 "정보를 매장 실행 경쟁력으로 연결합니다" · O4O 홈 0(390 메뉴 열어도 0) · O4OPublicHero 없음 · Pretendard 미적용 · 본문에 "KPA-Society 활용이 처음이신가요?" 등 · footer "Copyright © 2026 약사회" |
| 배포 gate | `DEPLOY_FREEZE=false` 유지 (열고 닫지 않음) |

### 10-2. 후보 census (serving 0e283ba10 → candidate 021e80327)

- candidate = main HEAD `021e803276f3d564d5e6ddb73e7991a8e4854716` (PR #344 merge). 01 이후 main 에 들어온 #330(lecture handoff UX) · #344(CHECK 문서) 은 pharmacy closure 를 건드리지 않는다.
- `git diff 0e283ba10 021e80327 -- services/web-kpa-society packages` = PR #337 의 2 commit(9a4c0e571 · 0920e1895) diff 와 같다(30 files, +716/-106). root `package.json` · lockfile · build config 변경 0.

| 분류 | 내용 |
|---|---|
| PHARMACY_DESIGN_REQUIRED | `services/web-kpa-society/**`(index.html · manifest · robots · sitemap · brand.ts · seoRegistry · KpaGlobalHeader · Footer · LoginModal · CommunityHomePage · gate 3종 문구 · index.css · tailwind.config) |
| SAFE_DEPENDENCY | `packages/auth-react`(public-brand Hero · tokens.css · useO4OHomeReturn · index) · `packages/ui` GlobalHeader — 01 에서 web-neture 로 같은 코드가 이미 운영 검증됨 |
| UNRELATED | api-server · tools/o4o-local-agent · web-lecture · web-store · web-kpa-branch · web-neture · docs — kpa-society artifact 에 들어가지 않는다 |
| UNVERIFIED | 0 |

canonical 정리 (candidate 파일 기준 `kpa-society.co.kr` 잔존 수): index.html 0 · robots.txt 0 · sitemap.xml 0 · manifest.json 0 · seoRegistry.ts 0. 모두 `pharmacy.neture.co.kr` 기준이다. 옛 도메인 호환(DNS · 리다이렉트)은 건드리지 않았다.

### 10-3. 배포 실행

| 항목 | 값 |
|---|---|
| CI (candidate) | CI Pipeline run 37563795016 success · 자동 Delivery run 37564509953 = Classify 만(배포 job 전부 skipped) |
| service key 확인 | local plan-only + Promote dry-run **37565109119** (`services=kpa-society`) → kpa-society = PROMOTE(LEVEL_3, rule `auth-package`) · 나머지 NOT_SELECTED · api/hospital-pharmacy = NO_DEPLOY · plan `web(parallel)=kpa-society` |
| 실제 promote | Promote run **37565244345** (`sha=021e80327…` · `services=kpa-society`) success |
| job | `deploy-kpa-society` success. deploy-neture · pharmacy-hub · hospital-pharmacy · store · kpa-branch · lecture · API · Admin = skipped |
| 새 revision | **`kpa-society-web-02032-mag`** · `o4o-commit-sha=021e803276f3…` · digest `sha256:17975449…` |
| traffic | 새 revision 100% |
| 이전 revision | `kpa-society-web-02029-paf` 보존 (rollback 가능) |
| 다른 service | neture 01695 · lecture 00043 · store 00059 · kpa-branch 00202 · pharmacy-hub 00284 · core-api 03840 · admin 01352 · hospital-pharmacy 00029 — 배포 전과 같다 |

### 10-4. Production smoke (비로그인 · Chrome headless · 실 URL)

1280/390 모두 HTTP 200 · pageerror 0 · console error 0 · 4xx/5xx 응답 0 · 가로 overflow 0 · Pretendard loaded(`Pretendard Variable`).

| 항목 | 결과 |
|---|---|
| 표시 브랜드 | 헤더 "O4O 약국 · 약국 정보 · 업무 연결" · Hero eyebrow "O4O 약국". 헤더 · 첫 화면에 KPA-Society · 약사회 · PharmacyHub · GlycoPharm 0 |
| Hero | h1 "약국의 정보와 업무를 / 하나로 연결합니다" (1280 52px · 390 32px, 둘 다 2줄 자연 줄바꿈) · 설명 2줄 · 과한 gradient / card stack 없음 |
| CTA | 로그인하고 시작하기(button → 로그인 모달) · 이용 가이드 → `/guide/usage` · 체험 계정 보기 → `/login`. 실제 route, 200, 404 문구 0 |
| 헤더 · 푸터 링크 | nav(/ · /service-guide · /about · /contact) · footer 12개(/forum · /content · /signage · /resources · /guide/intro · /guide/features · /policy · /privacy 등) 전부 200 · 404 문구 0 · JS error 0 |
| O4O 홈 | 1280 · 390 헤더에 보임(390 은 메뉴 밖 헤더에 직접). **실제 클릭** → `https://neture.co.kr/` 도착(title "O4O — 소규모 사업자를 위한 통합 업무 공간"). 세션 복구 중 비활성은 단위 테스트로 보장(§8 #1) |
| 로그인 진입 | 헤더 [로그인](390 은 메뉴 안) → "O4O 약국 로그인" 모달 · 이메일 폼 · "Google 계정으로 계속하기" 버튼 표시. 인증은 진행하지 않았다 |
| title / description | "O4O 약국 — 약국의 정보와 업무를 하나로 연결합니다" / Hero 설명 문구. 정적 HTML(curl) 도 같은 title · og:title "O4O 약국" |
| canonical / og:url | `https://pharmacy.neture.co.kr/` (JS 실행 후 · 정적 og:url 동일) · robots.txt `Sitemap: https://pharmacy.neture.co.kr/sitemap.xml` · 서빙 sitemap 의 kpa-society.co.kr 0 |
| favicon | 기존 fallback `/favicon.png` 200 image/png · `/icons/apple-touch-icon.png` 200. `PHARMACY_BRAND_ASSETS_READY=false` 유지 |
| manifest | `/manifest.json` 200 · name / short_name "O4O 약국" |
| og:image | 없음 (WO 기준 FAIL 아님) |

스크린샷은 세션 scratchpad 에만 두고 저장소에는 커밋하지 않았다.

### 10-5. legacy 표시 문구 판정

| 분류 | 위치 | 처리 |
|---|---|---|
| LEGACY_PHARMACY_BRAND (대표 브랜드) | 0 | — |
| FOOTER_RESIDUAL | 공개 홈 footer: 링크 그룹 제목 "약사회" · 링크 "약사회 소개"(→ /about) · "Copyright © 2026 약사회" | 미수정 · 별도 WO 후보. footer 브랜드 줄은 "O4O 약국" 이다 |
| FOOTER_RESIDUAL | `KpaStoreFooter` `serviceName="약사회"` (§5) | 미수정 (WO 지시) |
| OUT_OF_SCOPE_ADMIN_OPERATOR | admin · operator "KPA-Society" · QR 랜딩 하단 (§5) | 미수정 (WO 지시) |
| EXPECTED_KPA_CONTEXT | 공지 영역 옆 "약사공론 뉴스" (매체 이름) | 유지 |

### 10-6. 기타 판정

| 항목 | 값 |
|---|---|
| AUTHENTICATED_SMOKE / 로그인 상태 O4O 홈 | **PENDING_USER_VERIFICATION** — Google 테스트 계정이 없어 확인하지 않았다. 계정 생성 · DB 수정 없음 |
| ROLLBACK | 없음 — rollback 사유(접근 불가 · JS fatal · 로그인 진입 · O4O 홈 이동 · header/nav 파손 · 모바일 Hero · canonical 진입 차단) 0 |
| 남은 배포 | 03 study → 04 store → 05 kpa (미착수, 별도 지시) |

---

## 11. Production 배포 03 — web-lecture / study (WO-O4O-PUBLIC-DESIGN-PRODUCTION-DEPLOY-03-STUDY)

> 실행일 2026-10-07. 배포 대상은 `lecture-web` Cloud Run service 하나다(`study.neture.co.kr`). 다른 web · API · Admin · DB · migration 은 건드리지 않았다. 내부 serviceKey `lecture` · route · API key 는 바꾸지 않았다. 판정 기준은 02 와 같은 항목을 적용했다.

### 11-1. 배포 전 상태 (rollback 기준)

| 항목 | 값 |
|---|---|
| service | `lecture-web` (asia-northeast3) |
| serving revision | `lecture-web-00043-boy` · traffic 100% (그 이전 `00040-hin`) |
| `o4o-commit-sha` | `0e283ba102a86b2e6ce07d88926d3b39a0ea6fe9` · digest `sha256:42160985…` |
| 화면 (1280/390) | title "O4O 강의 \| Neture" · og 없음 · canonical 없음 · favicon 없음 · Pretendard 미로드 · h1 "O4O 강의"(옛 Hero, O4OPublicHero 없음) · O4O 홈은 헤더 · footer 에 이미 있음 · legacy 문구 0 |
| 배포 gate | `DEPLOY_FREEZE=false` 유지 (열고 닫지 않음) |

### 11-2. 후보 census (serving 0e283ba10 → candidate 1939c7c69)

- candidate = main HEAD `1939c7c69c1595b9477f01a76ae32909e7e8c72c`. 처음 후보 `34e96e4fd`(#346 merge) 로 dry-run 했으나 그 사이 main 이 문서 전용 merge 2건(#269 CHECK · #237 IR/WO, docs 3 files) 으로 움직여 `PROMOTE_REFUSED_NOT_HEAD` 였다. 34e96e4fd → 1939c7c69 runtime diff 0 이라 후보를 바꿨다.
- `services/web-lecture` + `packages` 에 들어간 commit: PR #337 2건(9a4c0e571 · 0920e1895) + **PR #330 1건(f762ec214)**.

| 분류 | 내용 |
|---|---|
| STUDY_DESIGN_REQUIRED | `services/web-lecture`: index.html(title · description · og · favicon · Pretendard) · `public/favicon.svg` · SiteShell(O4O 홈 class) · `config/service.ts` `STUDY_HERO` · HomePage(O4OPublicHero) · index.css |
| SAFE_DEPENDENCY | `packages/auth-react` public-brand · useO4OHomeReturn · `packages/ui` GlobalHeader — 01 · 02 에서 운영 검증됨 |
| 함께 배포된 기승인 변경 | **PR #330** (WO-O4O-LECTURE-HANDOFF-NONMEMBER-UX-V1, 사용자 승인 merge) — web-lecture `AccessGate` · `HandoffPage` · `CoursesPage` · `lmsViewAdapter` · `config/service.ts`(`INQUIRY_URL` · `isPublicLecturePath`). 프런트 문구 · 복귀 경로만, API · auth/handoff 계약 · DB · dependency 변경 0. CI green · 빌드 검증(web-lecture 는 테스트 인프라 없음). 이번 smoke 에 화면 확인을 포함했다(§11-4) |
| UNRELATED | api-server · tools · web-neture · web-kpa-* · web-store · docs |
| UNVERIFIED | 0 |

- #330 의 web-neture 쪽(`ServiceEntryPage` 미가입 안내)은 01 의 neture image(6ad3d1263) 에 없다. 다음 neture 배포 때 들어간다 → §12 에서 neture 단독 promote 로 반영. lecture 쪽 변경은 방어 문구라 neture 쪽 없이 배포해도 기존 흐름보다 나빠지지 않는다.
- 정적 파일: web-lecture 에는 `manifest.json` · `robots.txt` · `sitemap.xml` 이 원래 없다(SPA fallback 이 index.html 을 돌려준다). `kpa-society.co.kr` 등 옛 canonical 잔존 0.

### 11-3. 배포 실행

| 항목 | 값 |
|---|---|
| CI (candidate) | CI Pipeline run 37573412280 success · 자동 Delivery run 37573689099 = Classify 만(배포 job 전부 skipped) |
| dry-run | Promote run 37573396931 (34e96e4fd) → `PROMOTE_REFUSED_NOT_HEAD`(배포 0) · Promote run **37573837511** (1939c7c69 · `services=lecture`) → lecture = PROMOTE(LEVEL_3, rule `auth-package`) · 나머지 NOT_SELECTED/NO_DEPLOY · plan `web(parallel)=lecture` |
| 실제 promote | Promote run **37573984205** (`sha=1939c7c69…` · `services=lecture`) success |
| job | `deploy-lecture` 만 실행. 다른 web · API · Admin = skipped |
| 새 revision | **`lecture-web-00046-zef`** · `o4o-commit-sha=1939c7c69c15…` · digest `sha256:e2a2cdc8…` |
| traffic | 새 revision 100% |
| 이전 revision | `lecture-web-00043-boy` 보존 (rollback 가능) |
| 다른 service | neture 01695 · kpa-society 02032 · store 00059 · kpa-branch 00202 · pharmacy-hub 00284 · core-api 03840 · admin 01352 · hospital-pharmacy 00029 — 배포 전과 같다 |

### 11-4. Production smoke (비로그인 · Chrome headless · 실 URL)

공개 홈 1280/390: HTTP 200 · pageerror 0 · console error 0 · 4xx/5xx 응답 0 · 가로 overflow 0 · Pretendard loaded(`Pretendard Variable`). 예외: 무효 token 으로 일부러 연 `/handoff?token=<무효>` 확인 시나리오 1개에서 handoff API 가 HTTP 401 을 총 2회 돌려줬다(1280 · 390 각 1회, 예상 응답 — 아래 #330 화면 행). 그 밖의 4xx/5xx 는 0 이다.

| 항목 | 결과 |
|---|---|
| 표시 브랜드 | 헤더 "O4O 강의" · Hero eyebrow "O4O 강의" · footer "© 2026 Neture · O4O 강의". legacy 문구 0 |
| Hero | h1 "필요한 지식을 / 실무와 연결합니다" (1280 52px · 390 32px, 둘 다 2줄) · 설명 · 과한 장식 없음 |
| CTA | 강의 둘러보기 → `/courses` · 서비스 로그인 → `/login`. 헤더 · footer 포함 내부 링크 5개(/ · /courses · /login · /terms · /privacy) 전부 200 · 404 문구 0 · JS error 0 |
| O4O 홈 | 1280 · 390 헤더에 보임(+ footer). **실제 클릭** → `https://neture.co.kr/` 도착 |
| 로그인 진입 | 헤더 [로그인] → `/login` "O4O 강의 로그인 — Neture 에서 로그인하고 계속하기" → 클릭 시 `neture.co.kr/service-entry/lecture?returnPath=%2F` 의 Neture 로그인 모달에 "Google 계정으로 계속하기" 표시. 인증은 진행하지 않았다 |
| #330 화면 | 비로그인 `/my/enrollments` → AccessGate "내 학습 · 로그인이 필요합니다 · [로그인]" · `/handoff?token=<무효>` → "이동 링크가 만료되었거나 이미 사용되었습니다 · 다시 로그인 · Neture로 돌아가기" (API 401 은 무효 token 에 대한 예상 응답) |
| title / description | "O4O 강의 — 필요한 지식을 실무와 연결합니다" / Hero 설명 문구. 정적 HTML(curl) 도 같은 title · og:title |
| og:url / canonical | og:url `https://study.neture.co.kr/` · canonical 은 배포 전과 같이 없음(옛 도메인 canonical 아님 — FAIL 아님) |
| favicon | `/favicon.svg` 200 image/svg+xml (기존 O4O 공통 마크) |
| manifest | 없음 (원래 없음 — 대상 아님) |

스크린샷은 세션 scratchpad 에만 두고 저장소에는 커밋하지 않았다.

### 11-5. 기타 판정

| 항목 | 값 |
|---|---|
| LEGACY_VISIBLE_TEXT | 0 |
| AUTHENTICATED_SMOKE / 로그인 상태 O4O 홈 · handoff | **PENDING_USER_VERIFICATION** — Google 테스트 계정이 없어 확인하지 않았다. 계정 생성 · DB 수정 없음 |
| ROLLBACK | 없음 — rollback 사유 0 |
| 남은 배포 | 04 store → 05 kpa (미착수, 별도 지시) |

---

## 12. 후속 배포 — web-neture #330 `ServiceEntryPage` 반영 (neture 단독 promote)

§11-2 에서 미룬 #330 의 web-neture 쪽을 neture 단독으로 배포했다. 사용자 승인: "neture 단독 promote 진행" (2026-10-07).

### 12-1. 배포 전 상태 (rollback 기준)

| 항목 | 값 |
|---|---|
| neture-web | `neture-web-01695-kos` · `o4o-commit-sha=6ad3d1263…` (§9 배포 01) · traffic 100% |
| Delivery 판정 | `a07861f57` 자동 Delivery run 37577053794 → neture = LEVEL_3 `AUTO_DEPLOY_BLOCKED` (rule auth-frontend `services/web-neture/src/pages/auth/ServiceEntryPage.tsx`) |

### 12-2. 후보 census (serving 6ad3d1263 → candidate a07861f57)

| 분류 | 내용 |
|---|---|
| web-neture · 의존 package 변경 | **#330 만** — `services/web-neture/src/pages/auth/ServiceEntryPage.tsx` (+75/-8) · `__tests__/ServiceEntryPage.nonmember.test.tsx` (신규). `packages/**` 변경 0 |
| 성격 | 미가입(`HANDOFF_TARGET_NO_MEMBERSHIP` · `_NOT_ACTIVE` · `_WITHDRAWN`) 응답을 "로그인 완료 + 이용 자격 필요" 화면으로 구분 · lecture 공개 경로(`/courses` · `/certificates/verify/` 등)만 공개 복귀 허용. API · auth/handoff 계약 · DB · dependency 변경 0 |
| UNVERIFIED | 0 |

### 12-3. 배포 실행

| 항목 | 값 |
|---|---|
| CI (candidate) | CI Pipeline run 37576880006 success · CodeQL success |
| dry-run | Promote run **37580108333** (`a07861f57` · `services=neture`) → neture = PROMOTE · admin · store · kpa-branch · pharmacy-hub = NOT_SELECTED · api · kpa-society · lecture · hospital-pharmacy = NO_DEPLOY(`BEHIND_NO_RUNTIME_CHANGE`) · plan `deploy_api=false` · `web(parallel)=neture` |
| 실제 promote | Promote run **37580292820** (`sha=a07861f57…` · `services=neture`) success |
| job | `deploy-neture` 만 실행. 다른 web · API · Admin = skipped |
| 새 revision | **`neture-web-01698-yet`** · `o4o-commit-sha=a07861f57f03…` · digest `sha256:2ef46d7b…` |
| traffic | 새 revision 100% |
| 이전 revision | `neture-web-01695-kos` 보존 (rollback 가능) |
| 다른 service | kpa-society 02032 · lecture 00046 · store 00059 · kpa-branch 00202 · pharmacy-hub 00284 · core-api 03840 · admin 01352 · hospital-pharmacy 00029 — 배포 전과 같다 |

### 12-4. Production smoke (비로그인 · Chrome headless · 실 URL)

neture · supplier · community · funding 공개 홈 + `neture.co.kr/service-entry/lecture`, 1366/390 각 1회 (10/10):
HTTP 200 · pageerror 0 · console error 0 · 4xx/5xx 응답 0 · 가로 overflow 0.

| 항목 | 결과 |
|---|---|
| 4 host 공개 홈 | §9 와 같은 title · Hero · footer 표시. 회귀 0 |
| `/service-entry/lecture` (비로그인) | Neture 로그인 화면 + "O4O 강의 로그인 — O4O 계정으로 로그인하면 O4O 강의로 이어서 이동합니다" 표시 |
| 운영 bundle | `/assets/index-CL5z4Yne.js` 에 `HANDOFF_TARGET_NO_MEMBERSHIP` · `HANDOFF_TARGET_WITHDRAWN` · `certificates/verify/` 포함 — #330 코드가 운영 image 에 들어갔다 |
| 미가입 안내 화면 자체 | **PENDING_USER_VERIFICATION** — lecture 미가입 Google 계정이 있어야 보인다. 계정 생성 · DB 수정 없음 |

스크린샷은 세션 scratchpad 에만 두고 저장소에는 커밋하지 않았다.

### 12-5. 기타 판정

| 항목 | 값 |
|---|---|
| ROLLBACK | 없음 — rollback 사유 0 |
| #330 | web-lecture(§11) · web-neture(§12) 모두 운영 반영 |
| 남은 배포 | 04 store → 05 kpa (미착수, 별도 지시) — 변경 없음 |

---

## 13. Production 배포 04 — web-store / store (WO-O4O-PUBLIC-DESIGN-PRODUCTION-DEPLOY-04-STORE-V1)

> 실행일 2026-10-07. 배포 대상은 `store-web` Cloud Run service 하나다(`store.neture.co.kr`). 다른 web · API · Admin · DB · migration 은 건드리지 않았다. Store 는 공개 마케팅 화면이 아니라 업무 Workspace 이므로 Hero 가 없는 것을 FAIL 로 보지 않는다(WO §3).

### 13-1. 배포 전 상태 (rollback 기준)

| 항목 | 값 |
|---|---|
| service | `store-web` (asia-northeast3) |
| serving revision | `store-web-00059-qew` · traffic 100% (그 이전 `00056-kin`) |
| `o4o-commit-sha` | `0e283ba102a86b2e6ce07d88926d3b39a0ea6fe9` · digest `sha256:69005a09…` |
| 화면 (1280/390) | title "내 매장 \| Neture" · description "내 매장 - O4O 공통 매장 업무공간 (Unified Store Workspace)" · og 없음 · canonical 없음 · favicon 없음(`/favicon.svg` 가 SPA fallback 으로 text/html) · Pretendard 이름만 있고 미로드 · 첫 화면 = StoreGate "내 매장 · 로그인이 필요합니다 · [로그인]" · O4O 홈은 헤더 · footer 에 이미 있음 · overflow 0 · legacy 문구 0 |
| 배포 gate | `DEPLOY_FREEZE=false` 유지 (열고 닫지 않음) |

### 13-2. 후보 census (serving 0e283ba10 → candidate a07861f57)

- candidate = main HEAD `a07861f57f03be11d7667a096ac19c23a4444207` (CI Pipeline · CodeQL success).
- store image 의 build closure(Dockerfile 이 COPY 하는 `services/web-store` + `packages` 20개 + root 설정 · lockfile) 에 들어간 commit: **PR #337 2건(9a4c0e571 · 0920e1895) 만**. lockfile · package.json 변경 0.

| 분류 | 내용 |
|---|---|
| STORE_DESIGN_REQUIRED | `services/web-store`: index.html(title · description · og · favicon · Pretendard) · `public/favicon.svg` · RootShell(O4O 홈 className `o4o-home-link` 만) · index.css(`tokens.css` import · `Pretendard Variable`) · tailwind.config.js(글꼴) |
| SAFE_DEPENDENCY | `packages/auth-react` public-brand(tokens · O4OPublicHero export) · `useO4OHomeReturn`(`authLoading` prop 추가, 기본 false) · `packages/ui` GlobalHeader(`homeSlot` additive, store 는 미사용) — 01~03 에서 운영 검증됨 |
| UNRELATED | 테스트 파일 · `tools/o4o-local-agent` · HANDOFF.md · docs · 다른 서비스 |
| UNVERIFIED | 0 |

- Workspace 구조: `App.tsx` route · `StoreGate` · `StoreOwnerOnly` · `LoginPage` · `HandoffPage` · `AuthContext` · `LoginMethods` · `GoogleContinue` 의 diff 0. 권한 guard · redirect · handoff 변경 없음.
- 테스트: `packages/auth-react` vitest 9 files · 138 tests PASS (store 소비 계약 `publicBrandConsumers` 포함). web-store 자체 테스트 인프라 없음.

### 13-3. 배포 실행

| 항목 | 값 |
|---|---|
| dry-run | Promote run **37581898950** (`a07861f57` · `services=store`) → store = PROMOTE(LEVEL_3, rule `auth-package` `packages/auth-react/src/index.ts`) · admin · pharmacy-hub · kpa-branch = NOT_SELECTED · api · neture · kpa-society · lecture · hospital-pharmacy = NO_DEPLOY · plan `deploy_api=false` · `web(parallel)=store` |
| 실제 promote | Promote run **37582107873** (`sha=a07861f57…` · `services=store`) success |
| job | `deploy-store` 만 실행. 다른 web · API · Admin = skipped |
| 새 revision | **`store-web-00062-ruq`** · `o4o-commit-sha=a07861f57f03…` · digest `sha256:8f5f3aa5…` |
| traffic | 새 revision 100% |
| 이전 revision | `store-web-00059-qew` 보존 (rollback 가능) |
| 다른 service | neture 01698(§12) · kpa-society 02032 · lecture 00046 · kpa-branch 00202 · pharmacy-hub 00284 · core-api 03840 · admin 01352 · hospital-pharmacy 00029 — 배포 전과 같다 |

### 13-4. Production smoke (비로그인 · Chrome headless · 실 URL)

1280/390: `/` 와 업무 route 7개(`/store` · `/work` · `/hub` · `/services` · `/settings` · `/select-store` · `/handoff`) · `/login` 모두 HTTP 200 · pageerror 0 · console error 0 · 4xx/5xx 응답 0 · 가로 overflow 0 · Pretendard loaded(`Pretendard Variable`).

| 항목 | 결과 |
|---|---|
| 서비스 정체성 | 헤더 brand "내 매장" + nav 6(홈 · 내 매장 · 서비스 업무 · 매장 HUB · 내 서비스 · 설정) · footer "© 2026 Neture · 내 매장". legacy 문구 0 |
| Workspace-first | 첫 화면 = StoreGate 카드 "내 매장 · 로그인이 필요합니다 · [로그인]". Hero · 홍보 영역 없음(의도) |
| O4O 홈 | 1280 · 390 헤더에 보임(+ footer, 390 은 nav 둘째 줄). **실제 클릭** → `https://neture.co.kr/` 도착 |
| 로그인 진입 | 헤더 [로그인] → `/login` "내 매장 로그인" → "Google 계정으로 계속하기" 버튼 표시(GIS). 인증은 진행하지 않았다 |
| 이메일 · 비밀번호 폼 | `/login` 에 공통 `LoginMethods` 의 이메일 · 비밀번호 폼이 Google 위에 있다. **배포 전과 같은 동작**(LoginMethods · LoginPage diff 0)이고 로그인 수단 정본 [`O4O-MYPAGE-CANONICAL-V1`](../baseline/O4O-MYPAGE-CANONICAL-V1.md) 의 "Google + 이메일·비밀번호 병행(2026-09-29)" 을 따른다 — 이번 배포에서 "다시 나타난" 것이 아니다. WO §10 의 "Google-only" 문구와 다른 점은 보고만 한다 |
| 업무 route (비로그인) | 7개 모두 StoreGate idle 카드("로그인이 필요합니다") — guard 정상. `/handoff`(token 없음) → "이동 실패 · 이동 정보가 없습니다 · Neture로 돌아가기" |
| 외부 링크 | 이용약관 `neture.co.kr/terms` 200 · 개인정보처리방침 `neture.co.kr/privacy` 200 |
| title / description | "내 매장 — O4O" / "가입한 모든 서비스의 매장 업무를 한곳에서 — O4O 공통 매장 업무공간입니다." · og:title 같음 |
| og:url / canonical | og:url `https://store.neture.co.kr/` · canonical 없음(배포 전과 같음, 업무공간) |
| favicon | `/favicon.svg` 200 image/svg+xml (기존 O4O 공통 마크) |
| manifest | 없음 (원래 없음 — 대상 아님) |

인증 상태별 첫 화면(코드 기준 · `StoreGate` 변경 0): 비로그인 = idle 카드 · 세션 복구 중 = "로그인 상태를 확인하는 중..." · 로그인 + 매장 권한 있음 = 매장 선택(`/select-store`) 또는 업무 화면 · 로그인 + 매장 권한 없음 = `NoStorePage`. 로그인 상태 3종은 운영에서 확인하지 않았다(아래 13-5).

스크린샷은 세션 scratchpad 에만 두고 저장소에는 커밋하지 않았다.

### 13-5. 기타 판정

| 항목 | 값 |
|---|---|
| LEGACY_VISIBLE_TEXT | 0 |
| AUTHENTICATED_WORKSPACE_SMOKE | **PENDING_USER_VERIFICATION** — Google store_owner 테스트 계정이 없어 확인하지 않았다. 계정 생성 · DB 수정 없음 |
| ROLLBACK | 없음 — rollback 사유 0 |
| 시각 잔여 (배포 전부터 있던 것 · rollback 사유 아님) | ① 390 에서 헤더 brand "내 매장" 이 두 줄, nav 가 두 줄로 접힘(O4O 홈 · 로그인 접근 가능) ② StoreGate 카드 제목(h1)이 본문 크기(16px)라 위계가 약하고 1280 에서 카드 주변 여백이 넓다 ③ store RootShell 의 O4O 홈은 `authLoading` 을 넘기지 않는다(neture · kpa-society · kpa-branch 는 넘김) — 세션 복구 중 클릭 시 handoff 없이 대표 홈으로 갈 수 있다. 셋 다 06 잔여 정리 후보 |
| 남은 배포 | 05 kpa — §14 에서 완료 |

## 14. Production 배포 05 — web-kpa-branch / kpa (WO-O4O-PUBLIC-DESIGN-PRODUCTION-DEPLOY-05-KPA-V1)

> 실행일 2026-10-07. 배포 대상은 `kpa-branch-web` Cloud Run service 하나다(`kpa.neture.co.kr`). O4O 약국(`kpa-society-web`) · neture · lecture · store · retail · API · Admin · Hospital · DB · migration 은 건드리지 않았다. KPA 는 약사회 · 분회 정체성을 유지하고 O4O 약국과 합치지 않는다(WO §6).

### 14-1. Mapping census (추측 없이 실측)

| 단계 | 실측 값 |
|---|---|
| host | `kpa.neture.co.kr` → 전역 LB `o4o-global-lb` (Cloud Run domain mapping 아님 — `domain-mappings list` 0) |
| URL map | host rule `kpa.neture.co.kr` → path matcher `path-matcher-kpa-host` → default `backend-kpa-branch-web` (path rule 없음) |
| backend → service | `backend-kpa-branch-web` → serverless NEG `neg-kpa-branch-web` → Cloud Run **`kpa-branch-web`** |
| deploy key / job | promote key **`kpa-branch`** → `deploy-web-services.yml` job `deploy-kpa-branch` |
| build app | `services/web-kpa-branch/Dockerfile` (vite `base: '/kpa/'`, runner 가 dist 를 `/` 와 `/kpa/` 두 곳에 서빙) |
| 같은 이미지의 다른 진입 | `kpa-society.co.kr` · `www.kpa-society.co.kr` 의 path rule `/kpa` · `/kpa/*` → `backend-kpa-branch-web` (옛 공용 경로). 같은 host 의 `/kpa/tablet/*` · `/kpa/store/*` 와 그 밖의 경로 → `backend-kpa-society-web` (이번 대상 아님) |

### 14-2. 배포 전 상태 (rollback 기준)

| 항목 | 값 |
|---|---|
| service | `kpa-branch-web` (asia-northeast3) |
| serving revision | `kpa-branch-web-00202-cen` · traffic 100% (그 이전 `00199-deq`) |
| `o4o-commit-sha` | `0e283ba102a86b2e6ce07d88926d3b39a0ea6fe9` · digest `sha256:9e22d360…` |
| `/` 화면 (1280/390) | title "약사회 분회" · description · og · canonical 없음 · favicon link 없음 · Pretendard 이름만 있고 미로드 · 헤더 = 페이지 안 제목 블록(로그인 · 가입 신청 · 내 분회 텍스트 링크) · **footer 없음 · O4O 홈 0** · overflow 0 |
| 분회 route | `/o4o-pilot` · `/gangnamgu` · `kpa-society.co.kr/kpa/o4o-pilot` — 분회 헤더 · nav · footer 있음, **O4O 홈 0** |
| 배포 gate | `DEPLOY_FREEZE=false` 유지 (열고 닫지 않음) |

### 14-3. 후보 census (serving 0e283ba10 → candidate b34da10a8)

- candidate = main HEAD `b34da10a851f02c0250fd9132ac6b9fca6e62da0` (CI Pipeline · CodeQL · Delivery success). a07861f57 이후는 docs commit(#350 · #351) 만.
- kpa-branch image 의 **소스** closure(Dockerfile 이 COPY 하는 `services/web-kpa-branch` + `packages/types` · `auth-utils` · `auth-client` · `auth-react` + root 설정 · `pnpm-workspace.yaml` · package.json) 에 들어간 commit: **PR #337 2건(9a4c0e571 · 0920e1895) 만**. package.json · Dockerfile 변경 0.
- **외부 dependency 는 이 census 로 고정되지 않는다** (Codex review PR #353 P2). `services/web-kpa-branch/Dockerfile` 은 `pnpm-lock.yaml` 을 COPY 하지 않고 `pnpm install --filter kpa-branch-web... --ignore-scripts` 로 범위 버전(`^`)을 **빌드 시점에** 해석한다. 그래서 이전 이미지(00202)와 새 이미지(00205)의 third-party 버전이 같다는 보장이 없고, 소스 commit 2건만으로 이미지 입력 전체를 확정할 수 없다. 이 부분은 diff 가 아니라 아래 14-6 운영 smoke(pageerror 0 · 예상 밖 console error 0)로 확인했다.

| 분류 | 내용 |
|---|---|
| KPA_DESIGN_REQUIRED | `services/web-kpa-branch`: index.html(description · og:title/description/type/site_name · favicon · Pretendard, **og:url 없음**) · `public/favicon.svg` · `DirectoryShell`(신규 — `/` 헤더 · nav · O4O 홈 · 로그인 · footer) · `BranchLayout`(헤더에 O4O 홈 · `authLoading`) · `DirectoryPage`(진입 링크를 shell 로 이동) · index.css(`tokens.css` import · `Pretendard Variable`) · tailwind.config.js(글꼴) |
| SAFE_DEPENDENCY | `packages/auth-react` public-brand(tokens · O4OPublicHero export) · `useO4OHomeReturn`(`authLoading` prop 추가, 기본 false) — 01~04 에서 운영 검증됨 |
| UNRELATED | 테스트 파일 · 다른 서비스 · docs |
| UNVERIFIED | 소스 0 · **외부 dependency 해석 1건**(lockfile 미사용 — diff 로 고정 불가, 운영 smoke 로 확인) |

- 라우팅: `App.tsx` 변경은 `/` element 를 `DirectoryShell` 로 감싼 것 하나. 분회 route · `detectBasename` · `tenant.tsx`(PLATFORM_HOSTS · 자체 도메인 해석) · LoginPage · HandoffPage · AuthContext diff 0. 분회 routing · custom domain 처리 변경 없음.
- 테스트: web-kpa-branch Vitest(`DirectoryShell.test.tsx` 포함)는 candidate CI Pipeline 에서 PASS.

### 14-4. 분회 route · custom domain census (read-only)

- 공개 목록 API `GET /api/v1/kpa-branch/branches` → 분회 211개. smoke 대상: **`o4o-pilot`**(영구 검증 tenant · 공개 홈페이지 있음) · **`gangnamgu`**(실제 목록 항목 · 홈페이지 미공개).
- 분회 자체 도메인: LB host rule 에 분회 전용 host 0 (LB default = `backend-neture-web-http`) · 공개 API 응답에 domain 필드 없음 → **등록 · 연결된 자체 도메인 0**. DNS · 설정 변경 없음. 대신 같은 이미지가 서빙하는 옛 공용 경로 `kpa-society.co.kr/kpa/o4o-pilot` 를 smoke 했다.

### 14-5. 배포 실행

| 항목 | 값 |
|---|---|
| dry-run | Promote run **37586568354** (`b34da10a8` · `services=kpa-branch`) → kpa-branch = PROMOTE(LEVEL_3, rule `auth-package` `packages/auth-react/src/index.ts`) · admin · pharmacy-hub = NOT_SELECTED · api · neture · kpa-society · lecture · store · hospital-pharmacy = NO_DEPLOY · plan `api=false` · `web(parallel)=kpa-branch` |
| 실제 promote | Promote run **37586853950** (`sha=b34da10a8…` · `services=kpa-branch`) success |
| job | `deploy-kpa-branch` 만 실행. 다른 web · API · Admin = skipped |
| 새 revision | **`kpa-branch-web-00205-puz`** · `o4o-commit-sha=b34da10a851f…` · digest `sha256:c9f1e4a9…` |
| traffic | 새 revision 100% |
| 이전 revision | `kpa-branch-web-00202-cen` 보존 (rollback 가능) |
| 다른 service | neture 01698 · kpa-society 02032 · lecture 00046 · store 00062 · pharmacy-hub 00284 · core-api 03840 · admin 01352 · hospital-pharmacy 00029 — 배포 전과 같다 |

### 14-6. Production smoke (비로그인 · Chrome headless · 실 URL)

1280/390: `kpa.neture.co.kr/` · `/o4o-pilot` · `/gangnamgu` · `kpa-society.co.kr/kpa/o4o-pilot` · `/login` 모두 HTTP 200 · pageerror 0 · 가로 overflow 0 · Pretendard loaded(`Pretendard Variable`). console error · 4xx 는 `/gangnamgu` 의 `GET /kpa-branch/branches/gangnamgu/site` 404 뿐이다 — 홈페이지 미공개 분회의 기존 응답이고 화면은 "아직 공개되지 않은 분회 홈페이지입니다" 로 처리된다(배포 전과 같음).

| 항목 | 결과 |
|---|---|
| `/` 구조 | 헤더(분회 마크 + "약사회 분회" · O4O 홈 · 로그인) · nav "분회 찾기 · 가입 신청 · 내 분회" · 첫 콘텐츠 = 분회 검색 + 목록 · footer "약사회 분회 · 분회별 홈페이지와 회원 소속을 한 곳에서 · O4O 홈". 무거운 Hero 없음(의도) |
| KPA 정체성 | 루트 = "약사회 분회", 분회 = 분회명(예: "O4O 파일럿 테스트분회"). **"O4O 약국" 표시 0** (4개 URL × 2 viewport) |
| O4O 홈 | 루트 · 분회 · 옛 공용 경로 모두 **헤더**에 보임(1280 · 390, 루트는 footer 에도). **실제 클릭** → `https://neture.co.kr/` 도착(루트 · `/o4o-pilot` × 1280 · 390). 버튼 disabled 아님 |
| 분회 route | `/o4o-pilot` — 분회명 h1 · nav(홈 · 공지 · 행사 · 자료실 · 임원소개, 390 은 "메뉴 열기") · footer 연락처 정상. 옛 공용 경로도 같은 화면 |
| 로그인 진입 | 헤더 [로그인] → `/login` "약사회 분회 로그인" · Google 진입 표시. 이메일 · 비밀번호 폼은 배포 전과 같다(로그인 화면 diff 0, 정본 "Google + 이메일·비밀번호 병행"). 인증은 진행하지 않았다 |
| title / description | "약사회 분회" / "분회별 홈페이지와 회원 소속을 한 곳에서 — 약사회 분회 서비스입니다." |
| og:url | **없음** (루트 · 분회 slug · 옛 공용 경로 모두) — `https://kpa.neture.co.kr/` 고정 회귀 없음 |
| canonical | 없음 (배포 전과 같음) |
| favicon | `kpa.neture.co.kr/kpa/favicon.svg` · `kpa-society.co.kr/kpa/favicon.svg` 200 image/svg+xml (O4O 공통 마크 fallback). 배포 전 옛 공용 경로 1280 에서 보이던 404 console error 1건(URL 미기록 · favicon link 부재로 추정)은 배포 후 0 |

스크린샷은 세션 scratchpad 에만 두고 저장소에는 커밋하지 않았다.

### 14-7. 기타 판정

| 항목 | 값 |
|---|---|
| OG_URL_FIXED_REGRESSION | 없음 |
| AUTHENTICATED_SMOKE | **PENDING_USER_VERIFICATION** — 분회 회원 테스트 계정으로 로그인하지 않았다. 계정 생성 · DB 수정 없음 |
| ROLLBACK | 없음 — rollback 사유 0 |
| 시각 잔여 (rollback 사유 아님) | ① 390 분회 헤더가 3단(분회명 / O4O 홈 · 로그인 · 가입 신청 / 메뉴 열기)으로 높이 171px(배포 전 127px) ② favicon 은 KPA 전용 마크가 아닌 O4O 공통 마크 fallback. 둘 다 06 잔여 정리 후보 |
| 이미지 재현성 (별도 WO 제안) | 배포 web Dockerfile 중 `web-account` 만 `pnpm-lock.yaml` 을 COPY 한다. kpa-branch · kpa-society · neture · lecture · store · pharmacy-hub · hospital-pharmacy 는 lockfile 없이 설치하므로 01~04(§9~§13) 이미지도 같은 조건이다. Dockerfile 변경은 build 인프라 변경이라 이번 범위 밖 — 보고만 한다 |
| 남은 배포 | 없음 — 단계 배포 01~05 완료. 06(최종 smoke · 잔여 정리)은 별도 WO |

---

## 15. Final Polish Census (WO-O4O-CROSS-SERVICE-PUBLIC-DESIGN-FINAL-POLISH-V1)

> 실행일 2026-10-07. 기준 `origin/main` de68a0f18 · branch `wo/o4o-cross-service-public-design-final-polish-v1`. 01~05 이후 다른 세션이 이 잔여를 먼저 고친 것은 없다(아래 항목 모두 de68a0f18 에서 재현).

### 15-1. 시작 시 serving revision (read-only)

| service | revision (traffic 100%) |
|---|---|
| neture-web | `neture-web-01698-yet` |
| kpa-society-web (pharmacy) | `kpa-society-web-02032-mag` |
| lecture-web (study) | `lecture-web-00046-zef` |
| store-web | `store-web-00062-ruq` |
| kpa-branch-web (kpa) | `kpa-branch-web-00205-puz` |

§9~§14 기록과 같다.

### 15-2. 판정

| # | 항목 | Fresh Census 결과 | 판정 |
|---|---|---|---|
| A | Pharmacy footer "약사회" 3곳 | 그룹 제목 "약사회" · 링크 "약사회 소개"(→ `/about`) · copyright "Copyright © 2026 약사회". `/about` 은 `AboutPage` — 본문 · title 모두 **O4O 약국 서비스 소개**이고 대한약사회 조직 페이지가 아니다. 세 곳 모두 `BRAND_LEGACY` (`REAL_ORGANIZATION_REFERENCE` 0). 같은 링크의 seoRegistry `/about` description "대한약사회 …" 도 같은 legacy | **FIX_NOW** |
| B | Pharmacy brand assets | `public/brand/` 없음 · `PHARMACY_BRAND_ASSETS_READY=false`. 사용자 · ChatGPT 제공 자산이 아직 없다. WO §6 에 따라 개발 에이전트가 심볼을 만들지 않는다 | **PENDING_USER_ASSET** (§16-4) |
| C | Funding `[SMOKE]` row | §17-1 | **SEPARATE_TRACK** |
| D | Store 모바일 header | 390 에서 brand · nav 가 각각 2줄. 원인: O4O 홈 · 로그인이 nav 안에 있어 nav 전체가 오른쪽 정렬로 wrap | **FIX_NOW** |
| E | Store 로그인 필요 카드 | tailwind base 가 `h1` 을 본문 크기(16px), `p` margin 을 0 으로 되돌려 제목 · 본문 · CTA 가 붙어 보인다 | **FIX_NOW** |
| F | Store O4O 홈 auth-loading | `RootShell` 의 O4OHomeButton 2곳이 `authLoading` 을 넘기지 않는다 — 실제 결함. 전수 검색으로 **web-lecture `SiteShell` 2곳도 같은 누락**을 발견했다(study, §11 배포본) | **FIX_NOW** (store + study) |
| G | Store 로그인 방식 | `O4O-IDENTITY-ARCHITECTURE-V3`(CANONICAL) · `O4O-MYPAGE-CANONICAL-V1` 모두 "Google + 이메일·비밀번호 병행(2026-09-29)". Store `/login` 의 공통 `LoginMethods` 는 이 정본 그대로다 | **CURRENT_CANONICAL → KEEP_AS_IS** |
| H | KPA 모바일 header | 390 분회 헤더 3단(분회명 / O4O 홈 · 로그인 · 가입 신청 / 메뉴 열기) | **FIX_NOW** |
| I | KPA favicon | 저장소에 KPA 정본 마크 없음(git ls-files 검색 0). 분회 헤더는 분회별 `logoUrl` 을 쓰고, favicon 은 O4O 공통 마크로 제품군 소속을 보여준다 | **KEEP_AS_IS** (전용 마크가 필요하면 브랜드 제작 별도 트랙) |
| J | web-neture 정적 OG | §8 finding 2 그대로 | **SEPARATE_TRACK** (§17-2) |
| K | production Dockerfile lockfile | §14-7 그대로 | **SEPARATE_TRACK** (§17-3) |
| L | 로그인 후 production smoke | 사용할 테스트 계정 없음 | **PENDING_USER_VERIFICATION** (§17-4) |

---

## 16. FIX_NOW 결과

PR #357 (`wo/o4o-cross-service-public-design-final-polish-v1`). route · 권한 · StoreGate 로직 · API · DB · Dockerfile · package.json 변경 0.

### 16-1. 변경

| host | 파일 | 변경 |
|---|---|---|
| pharmacy | `web-kpa-society` `config/navigation.ts` · `components/Footer.tsx` · `config/seoRegistry.ts` | footer 그룹 "약사회" → "O4O 약국" · "약사회 소개" → "서비스 소개"(→ `/about`) · copyright "© 2026 Neture · O4O 약국"(다른 O4O 서비스와 같은 형식) · `/about` description 의 "대한약사회" 제거. 그룹은 상수로 분리했다(pharmacy-hub footer 와의 기존 중복 블록 분리 — Sonar) |
| store | `web-store` `components/RootShell.tsx` · `index.css` | O4O 홈 · 계정을 nav 와 분리한 `header-actions`. 1280 은 brand │ nav │ O4O 홈 · 로그인(배치 동일), 390 은 1줄 brand + O4O 홈 · 로그인 / 2줄 nav 한 줄(넘치면 nav 안에서만 가로 스크롤). 카드 `.card>h1` 22px(390 20px) · `.card>p` 간격 — tailwind base 리셋 보정, 직계 자식만이라 폼 카드 내부는 영향 없음 |
| store · study | `RootShell.tsx` · `web-lecture` `components/SiteShell.tsx` | 헤더 · footer O4OHomeButton 4곳에 `authLoading` 연결 |
| kpa | `web-kpa-branch` `layouts/BranchLayout.tsx` | 모바일 헤더 2단 — 메뉴 토글을 계정 줄로 올리고 닫힌 nav 는 높이 0 · 로고 32px(md 40px). md 이상 배치 동일 |

### 16-2. 검증

| 묶음 | 결과 |
|---|---|
| `packages/auth-react` vitest | 9 files / 144 passed — 신규: 공개 헤더 6곳(neture · pharmacy · kpa 2 · study · store)의 모든 O4OHomeButton 이 `authLoading` 을 넘기는지 소스 스캔 |
| `web-kpa-society` vitest | 7 files / 69 passed — 신규: footer 그룹 · 라벨 "약사회" 0 · `/about` = "서비스 소개" · `/about` description "약사회" 0 |
| `web-kpa-branch` vitest | 3 files / 34 passed |
| tsc · vite build | web-store · web-lecture · web-kpa-branch · web-kpa-society exit 0 (store 는 origin/main #339 병합 후 재확인) |
| CI (PR #357) | CI Gate · Web production build(affected) · API Jest 3 · CodeQL · Docs sensitive guard · SonarCloud 모두 pass. Sonar 첫 run 의 실패(CSS 중복 selector 2 · 기존 중복 블록 안 수정 줄)는 코드로 고쳤다 — 게이트 완화 없음 |

로컬 dist smoke (실 hostname route interception · 비로그인 · 운영 아님) — 4 host × 1280/390 = 10 run(kpa 는 `/` · `/o4o-pilot`):

| host | 390 header 높이 | h1 | 결과 |
|---|---|---|---|
| pharmacy | 65px | Hero 32px | 본문 "약사회" 0 |
| study | 69px | Hero 32px | O4O 홈 헤더 · footer |
| store | **88px (2줄)** | 카드 제목 **20px**(1280 22px, 이전 16px) | 1줄 brand · O4O 홈 · 로그인 / 2줄 nav 6개 한 줄 |
| kpa `/o4o-pilot` | **97px (2단, 이전 171px)** | 분회명 | 분회명 / O4O 홈 · 로그인 · 가입 신청 · 메뉴 열기 |

모든 run: HTTP 200 · 가로 overflow 0 · pageerror 0 · console error 0 · 4xx/5xx 0. 스크린샷은 세션 scratchpad 에만 두었다.

### 16-3. KEEP_AS_IS

- Store 로그인 방식(G) — 정본 그대로
- KPA favicon(I) — O4O 공통 마크 유지

### 16-4. Pharmacy brand assets — PENDING_USER_ASSET

자산이 들어오면 `public/brand/` 투입 → `PHARMACY_BRAND_ASSETS_READY=true` → `index.html` favicon · apple-touch-icon · og:image 와 `manifest.json` icons 를 `PHARMACY_BRAND_ASSET_SLOTS` 경로로 교체한다(§3). 소비 자리:

- favicon · apple-touch-icon · manifest icon 192/512 · og:image — `index.html` · `manifest.json`
- `logo-mark` — 헤더 `PHARMACY_HEADER_BRAND.icon` 과 footer `brand.icon`
  - 지금은 💊 문자다
  - 두 슬롯 모두 ReactNode(`GlobalHeader` · `CommunitySiteFooter`)라 앱 config 에서 `<img>` 로 바꿀 수 있고, 공통 package 변경은 필요 없다
- `logo-horizontal` — 현재 소비 자리가 없다. 쓰지 않는 파일을 형식적으로 만들지 않는다

---

## 17. Separate Tracks

### 17-1. PRODUCTION_TEST_DATA_CLEANUP — Funding `[SMOKE]` row

공개 API `GET /api/market-trial` 로 read-only 확인했다(DB 직접 접속 · write 0).

| 항목 | 값 |
|---|---|
| row id | `[REDACTED_ROW_ID]` (§6 의 prefix 와 같은 row) |
| title | `[SMOKE] 유통참여형 펀딩 운영 루프 테스트` |
| status | `closed` |
| 생성 | 2026-06-07 · [`CHECK-O4O-NETURE-DISTRIBUTION-FUNDING-SMOKE-DATA-FLOW-V1`](../investigations/CHECK-O4O-NETURE-DISTRIBUTION-FUNDING-SMOKE-DATA-FLOW-V1.md) 의 운영 smoke 로 만든 테스트 데이터 |
| 참조 관계 | 참여 1건(`currentParticipants=1`) · 정산 · 결과 snapshot 필드 · 이후 CHECK 2건이 검증 fixture 로 참조(`CHECK-O4O-MARKET-TRIAL-CONTENT-ONLY-POST-DEPLOY-VALIDATION-V1` · `CHECK-O4O-MARKET-TRIAL-PARTICIPATION-REPORT-CLEANUP-V1`) |
| 공개 노출 | 공개 목록 전체 1건 중 1건 — funding.neture.co.kr "마감" 영역 |

- UI 에서 숨기지 않았고 DB 를 수정하지 않았다.
- `TrialStatus` 에는 비공개 종료 상태가 없다(`draft` · `submitted` · `recruiting` · `development` · `outcome_confirming` · `fulfilled` · `closed`). 상태 전환만으로는 공개 목록에서 뺄 수 없고, 비공개 플래그를 새로 두면 schema 변경이다.
- **제안**: 별도 승인 WO 에서 trial 과 종속 row(참여 · 정산 · 결과)를 snapshot 으로 남긴 뒤 함께 삭제한다. 운영 검증 fixture 가 필요하면 공개 목록에 나오지 않는 방식(예: `draft`)으로 새로 만든다. 삭제는 건별 승인 대상이다.

### 17-2. HOST_AWARE_STATIC_METADATA

web-neture 는 정적 index.html 하나라 JS 를 실행하지 않는 crawler 는 supplier · funding · community 에서 neture.co.kr 메타를 본다(§8 finding 2 · §9-6 재현). host 별 HTML 생성 또는 edge 메타 주입은 Docker · 인프라 변경이라 이번 polish 에 섞지 않았다.

### 17-3. PRODUCTION_WEB_REPRODUCIBLE_BUILD

운영 web Dockerfile 7개(kpa-branch · kpa-society · neture · lecture · store · pharmacy-hub · hospital-pharmacy)가 `pnpm-lock.yaml` 없이 설치한다(§14-7). 이번 06 배포도 같은 조건으로 빌드된다. Dockerfile 은 바꾸지 않았다.

### 17-4. AUTHENTICATED_SMOKE

Neture · Pharmacy · Study · Store · KPA 의 로그인 후 smoke 는 하나로 묶어 **PENDING_USER_VERIFICATION** 이다. 테스트 계정을 만들거나 DB 를 수정하지 않았다. 세션 복구 중 O4O 홈 비활성은 공통 단위 테스트(`O4OHomeButton`)와 소비처 스캔 테스트(§16-2)로 보장한다.

---

## 18. 06 배포 · Final Production Smoke

### 18-1. 배포 판정 (main `d23a267d6` = PR #357 merge)

- 사용자 "main 통합 진행" 후 PR #357 merge. main CI Pipeline success.
- 06 사이에 다른 세션이 `447869cc5`(#339 K-Cosmetics 은퇴 · #352 kpa canonical 호스트 포함)를 운영에 반영했다. 그래서 06 배포에 남은 다른 트랙 변경은 **#349(a66ef4697, Neture 약국 가입 구조)** 하나다.
- 이 commit 은 API 와 web 을 함께 바꿨다. web 쪽 변경(문구 · 새 오류 코드 처리)은 API 보다 먼저 나가도 깨지지 않지만, 배포 파이프라인은 같은 commit 의 API 를 먼저 요구한다.

Promote dry-run **37627419412** (`services=store,lecture,kpa-society,kpa-branch`):

| service | 판정 |
|---|---|
| lecture · kpa-branch | PROMOTE (LEVEL_2 · API 와 독립) |
| store · kpa-society | **HELD_API_NOT_DEPLOYED** — #349 의 API 가 아직 배포되지 않았다 |

- 결정: 파이프라인의 의존 판정을 따른다. #349 의 API(가입 판정 변경)는 그 트랙이 단계별로 배포하는 변경이므로, 이 WO 에서 API 를 함께 승격하지 않았다.
- pharmacy · store 의 06 변경은 #349 API 배포 뒤 promote 한다(§19).

### 18-2. 배포 실행

| 항목 | 값 |
|---|---|
| 자동 배포 | merge 직후 Delivery run **37627260995**(workflow_run · LEVEL_2 자동 경로)가 lecture · kpa-branch 를 `d23a267d6` 으로 배포했다 |
| 수동 promote | run 37628052140(`services=lecture,kpa-branch`) → 두 서비스 모두 이미 UP_TO_DATE 라 배포 0 |
| lecture-web | `lecture-web-00049-juz`(447869cc5) → **`lecture-web-00052-jiw`** · `o4o-commit-sha=d23a267d6…` · traffic 100% |
| kpa-branch-web | `kpa-branch-web-00208-biv`(447869cc5) → **`kpa-branch-web-00211-kuc`** · `o4o-commit-sha=d23a267d6…` · traffic 100% |
| 보류 | store-web `00065-jel` · kpa-society-web `02035-rok`(둘 다 447869cc5) 그대로 |
| 손대지 않음 | API(`o4o-core-api-03843-bob`) · neture · admin · hospital-pharmacy · DB · migration · `DEPLOY_FREEZE` |

### 18-3. Final Production Smoke (비로그인 · Chrome headless · 실 URL)

8 host × 1280/390 = 16 viewport, 여기에 kpa 분회 `/o4o-pilot` 2 run 을 더해 총 18 run.

**공통 결과 (18/18):** HTTP 200 · pageerror 0 · console error 0 · 4xx/5xx 응답 0 · 가로 overflow 0.

| host | 1280 / 390 h1 | O4O 홈 | favicon | 390 header | 비고 |
|---|---|---|---|---|---|
| neture.co.kr | O4O 60 / 48px | (O4O 홈 자체) | /favicon.png | — | 회귀 0 |
| pharmacy | Hero 52 / 32px | 보임 | /favicon.png | 65px | **06 보류** — footer "약사회 소개" · "Copyright © 2026 약사회" 가 운영에 남아 있다 |
| supplier | Hero 52 / 32px | 보임 | /favicon.png | 65px | 회귀 0 |
| community | Hero 52 / 32px | 보임 | /favicon.png | 65px | 회귀 0 |
| study | Hero 52 / 32px | 헤더 · footer | /favicon.svg | 69px | **06 반영** (authLoading) |
| funding | Hero 52 / 32px | 보임 | /favicon.png | 65px | `[SMOKE]` row 그대로(§17-1) |
| store | 카드 16px | 헤더 · footer | /favicon.svg | 102px | **06 보류** — 옛 헤더 · 카드 |
| kpa `/` | 약사회 분회 24px | 헤더 · footer | /kpa/favicon.svg | 105px | 회귀 0 |
| kpa `/o4o-pilot` | 분회명 24px | 헤더 | /kpa/favicon.svg | **97px**(05 배포 때 171px) | **06 반영** — 2단 |

- 화면 판독: 8 host 가 같은 Pretendard · 토큰 · O4O 홈 위치(헤더 오른쪽)를 쓴다. 서비스 정체성은 서비스마다 다르게 보인다(O4O 약국 · 공급자 · 커뮤니티 · O4O 강의 · 유통참여형 펀딩 · 내 매장 · 약사회 분회).
- Hero 는 공개 서비스(pharmacy · supplier · community · study · funding)에만 있다. Workspace(store)와 KPA 에는 없다.
- 로그인 후 smoke 는 하지 않았다(§17-4).
- 스크린샷은 세션 scratchpad 에만 두었다.

---

## 19. Closure (06)

| 판정 | 값 |
|---|---|
| CROSS_SERVICE_PUBLIC_DESIGN | **PRODUCTION_COMPLETE** (01~05) · 06 polish **PARTIALLY_DEPLOYED** — study · kpa 반영, pharmacy · store 보류 |
| O4O_HOME_RETURN | **PASS** — 8 host 헤더(neture 는 자체). 세션 복구 중 비활성: 운영 반영은 neture · kpa · study, store 는 06 보류분 |
| RESPONSIVE | **PASS** — 18 run 가로 overflow 0. KPA 분회 390 은 2단 |
| PHARMACY_BRAND | **PENDING_USER_ASSET** — 로고/favicon 파일 대기(§16-4). 표시명 O4O 약국은 02 에서 완료 |
| PUBLIC_LEGACY_BRANDING | **코드 CLEAN** (main) · 운영은 pharmacy footer 2건이 06 보류분으로 남아 있다 |
| FUNDING_SMOKE_DATA | **SEPARATE_TRACK** (§17-1) |
| STATIC_OG | **SEPARATE_TRACK** (§17-2) |
| REPRODUCIBLE_WEB_BUILD | **SEPARATE_TRACK** (§17-3) |
| AUTHENTICATED_SMOKE | **PENDING_USER_VERIFICATION** (§17-4) |

남은 일:

1. #349 API 배포(그 트랙 소관) 뒤 `services=store,kpa-society` promote → pharmacy · store smoke. 로고 자산이 그 전에 오면 pharmacy 는 한 번에 배포한다.
2. O4O 약국 로고/favicon 투입(§16-4).

# CHECK-O4O-CROSS-SERVICE-PUBLIC-DESIGN-AND-BRAND-REFRESH-V1

> 이 CHECK 는 8개 공개 host 의 대표 화면 디자인과 브랜드를 정비한 결과다. 내용은 O4O 홈 복귀, 공통 Hero·토큰, O4O 약국 표시명, host 별 메타다. 운영 배포 전 코드 완료와 로컬 빌드 smoke 까지를 기록한다.

| 항목 | 값 |
|------|------|
| WO | `WO-O4O-CROSS-SERVICE-PUBLIC-DESIGN-AND-BRAND-REFRESH-V1` |
| 선행 | [`IR-O4O-CROSS-SERVICE-PUBLIC-HOME-AND-BRAND-DESIGN-CENSUS-V1`](../investigations/IR-O4O-CROSS-SERVICE-PUBLIC-HOME-AND-BRAND-DESIGN-CENSUS-V1.md) (PR #331 MERGED) |
| 성격 | 프런트엔드 표시 계층만 변경. route·API·권한·DB·serviceKey·package name 은 바꾸지 않았다 |
| 기준 | `origin/main` 0e283ba10 · branch `wo/o4o-cross-service-public-design-brand-refresh-v1` |
| 완료 판정 | **`CODE_COMPLETE` / `PRODUCTION_SMOKE_PENDING_DEPLOY`** — 단계 배포 중. 01 web-neture(neture · supplier · community · funding) 배포 · production smoke PASS(§9). 나머지 host 는 미배포 |
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
| 운영 배포 | **부분 배포 (01/05)** | PR #337 merge(0d0ff4fdc) 후 서비스별로 하나씩 배포한다. 01 web-neture 완료(§9). pharmacy · study · store · kpa 는 미배포 |

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

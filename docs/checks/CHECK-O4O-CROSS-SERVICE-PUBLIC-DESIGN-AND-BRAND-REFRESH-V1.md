# CHECK-O4O-CROSS-SERVICE-PUBLIC-DESIGN-AND-BRAND-REFRESH-V1

> 이 CHECK 는 8개 공개 host 의 대표 화면 디자인과 브랜드를 정비한 결과다. 내용은 O4O 홈 복귀, 공통 Hero·토큰, O4O 약국 표시명, host 별 메타다. 운영 배포 전 코드 완료와 로컬 빌드 smoke 까지를 기록한다.

| 항목 | 값 |
|------|------|
| WO | `WO-O4O-CROSS-SERVICE-PUBLIC-DESIGN-AND-BRAND-REFRESH-V1` |
| 선행 | [`IR-O4O-CROSS-SERVICE-PUBLIC-HOME-AND-BRAND-DESIGN-CENSUS-V1`](../investigations/IR-O4O-CROSS-SERVICE-PUBLIC-HOME-AND-BRAND-DESIGN-CENSUS-V1.md) (PR #331 MERGED) |
| 성격 | 프런트엔드 표시 계층만 변경. route·API·권한·DB·serviceKey·package name 은 바꾸지 않았다 |
| 기준 | `origin/main` 0e283ba10 · branch `wo/o4o-cross-service-public-design-brand-refresh-v1` |
| 완료 판정 | **`CODE_COMPLETE` / `PRODUCTION_SMOKE_PENDING_DEPLOY`** |
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
| HOST_METADATA | **SERVICE_AWARE** | title · description · og:title · og:description · og:url · canonical · favicon 을 host 별로 둔다. og:image 는 넣지 않았다 |
| RETAIL | **NOT_REDESIGNED** | `services/web-k-cosmetics` 변경 0 |
| HOSPITAL | **UNTOUCHED** | neture.co.kr/hospital 관련 파일 변경 0 |
| DB_CHANGE | **0** | migration · write 0. 아래 §6 의 [SMOKE] row 는 STOP 하고 보고만 한다 |
| 운영 배포 | **미배포** | 이 PR 은 merge 전이다. 운영 smoke 는 배포 후에 한다 |

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
| `packages/auth-react` vitest | 9 files / 137 passed |
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
| kpa | 200 | 약사회 분회 | 보임 | (분회 찾기 목록) | kpa…/ |

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

# 약국 협력사업 4곳 동급 독립 정비

> **상태**: OPEN
> **작성일**: 2026-10-20
> **근거**: 사용자 결정(2026-10-20) — pharmacy 예외 제거 · 4개 협력사업 독립 · 사업별 약관 분리
> **분류**: IMPLEMENTATION (단계별 진행 · 각 단계 검증 후 다음 단계)
> **선행 기록**: [WO-O4O-PHARMACY-COOPERATION-SERVICE-INDEPENDENCE-V1](WO-O4O-PHARMACY-COOPERATION-SERVICE-INDEPENDENCE-V1.md) (2026-10-16, 독립 서비스 의미 확정)

## INITIAL_PURPOSE

`pharmacy` · `megapharm` · `pharmcoop` · `carepharm` 은 `neture.co.kr` 서브도메인에서 서로 다른 사업자가 운영할 약국 협력사업이다. 네 사업을 **같은 수준의 독립 사업**으로 만든다. 한 사업의 데이터 · 기능 공간 · 약관이 다른 사업과 공유되지 않아야 한다.

## CONFIRMED_DECISIONS

| # | 결정 | 출처 |
|---|---|---|
| D1 | **pharmacy 는 다른 세 사업과 같은 수준이다.** pharmacy 만 서비스 키(`kpa-society`)를 갖는 예외를 없앤다. pharmacy 만 따로 독립 서비스로 만들지 않는다. | 사용자 2026-10-20 |
| D2 | **네 협력사업은 각각 독립적이다.** 같은 앱 이미지를 쓰더라도 포럼 · 콘텐츠 · 자료 · 미디어 · 사이니지 · 장바구니 · 운영 화면 데이터를 사업끼리 공유하지 않는다. 구조가 같은 부분을 core-extension 으로 공통화하는 것은 독립 정비 **이후** 별도 작업이다. | 사용자 2026-10-20 |
| D3 | **약관 · 정책 문서는 사업별로 따로 둔다.** 내용이 비슷해도 하나를 공유하지 않는다. 각 사업의 약관은 그 사업에 속하며 그 사업 단위로 관리 · 게시 · 동의 기록한다. | 사용자 2026-10-20 |
| D4 | 기존 `service_key='kpa-society'` 회원 · 약관 동의 · 콘텐츠는 의미 없는 테스트 데이터다. 데이터 이전 단계를 두지 않는다. | 사용자 2026-10-20 |
| D5 | 사업 식별은 서비스 키가 아니라 사업 데이터 행(`semi_franchises.key`)으로 한다. 이 결정은 유지한다(D1 은 pharmacy 를 이 방식에 맞추는 것). | [O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1](../baseline/O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md) L59 · [RBAC-ROLE-CATALOG-V1](../rbac/RBAC-ROLE-CATALOG-V1.md) L164-182 |
| D7 | **옛 KPA 운영 · 관리 화면은 남기지 않는다.** `kpa:operator` · `kpa:admin` 으로 들어가는 운영 콘솔(`/operator/*` · `/admin/*`)과 그 화면이 쓰는 KPA 전용 화면을 이전하지 않고 삭제한다. pharmacy 에 필요한 운영 화면은 다른 세 사업과 같은 사업 운영 화면(`/operator/semi-franchises`) 기준으로 새로 만든다. | 사용자 2026-10-21 |
| D8 | **KPA 분회와 같이 쓰던 테이블과의 관계를 끊는다.** pharmacy 는 `kpa_organizations` · `kpa_members` · `kpa_pharmacist_profiles` 를 읽거나 쓰지 않는다. KPA 분회는 새로 만들 예정이며, 그 테이블 설계는 분회를 새로 만들 때 정한다. 이 WO 는 분회 쪽 테이블 · 코드를 바꾸지 않는다. | 사용자 2026-10-21 |
| D6 | **은퇴 도메인 관련 내용은 전부 삭제한다**: `kpa-society.co.kr` · `k-cosmetics.site` · `glycopharm.co.kr` · `pharmacyhub.co.kr` · `siteguide.co.kr` · `glucoseview.co.kr`. 혼선을 막기 위해서다. 옛 주소 지원(CORS · 쿠키 · 세션 판정 · 분회 옛 경로 이동)도 남기지 않는다. 외부 DNS 는 사용자가 정리 완료(2026-10-20). | 사용자 2026-10-20 |

D1 과 D5 를 합치면 로그인 계정 · 세션은 네 사업 모두 O4O 공통 계정 축(`neture`)이다. 사업 독립은 사업 가입 원장 · 사업 범위 데이터 · 사업별 약관으로 구현한다. 이 해석이 사용자 의도와 다르면 단계 1 시작 전에 정정한다.

## 조사로 확인한 현재 상태 (2026-10-20, origin/main 9c1b5def6b)

### 사업별 앱 · 세션

| 사업 | 앱 | 도메인 | 세션 키 (Origin 판정) |
|---|---|---|---|
| pharmacy | `services/web-kpa-society` (Cloud Run `kpa-society-web`) | `pharmacy.neture.co.kr` | `kpa-society` |
| megapharm | 같은 이미지, hostname 으로 사업 판정 | `megapharm.neture.co.kr` | `neture` |
| carepharm | `services/web-neture` host profile | `carepharm.neture.co.kr` | `neture` |
| pharmcoop | `services/web-pharmacy-coop` (Cloud Run `cooperative-web`) | `pharmcoop.neture.co.kr` | `coop` (catalog 밖 · 가입 Origin 거절) |

- 세션 키는 요청 Origin 으로 정한다 — `apps/api-server/src/utils/session-origin.ts:42-70`, `apps/api-server/src/config/service-catalog.ts:139-169`.
- 사업 가입은 이미 사업 원장으로 분리되어 있다 — `semi_franchise_memberships`(약국 조직 단위), `cooperative_memberships`(pharmcoop 개인 단위). 사업 공간의 포럼은 `communityKey` 로 분리된다(`services/web-kpa-society/src/pages/business/BusinessForumPage.tsx:41`).

### 독립성 위반 지점

1. **pharmacy 예외 (D1 위반)**
   - `service-catalog.ts:153-169` — `kpa-society` 항목 · `semiFranchiseAccessKey:'pharmacy'` · `legacyDomains:['kpa-society.co.kr']`.
   - `modules/neture-pharmacy/services/semi-franchise.service.ts:92-94` — `key==='pharmacy'` 만 사업 약관 기록.
   - `modules/neture-pharmacy/services/pharmacy-membership.service.ts:152-185` — 항상 `kpa-society` 기록.
   - `services/auth/signup-policy.service.ts:11,13,43,67` — 자체 가입 약관은 `kpa-society` 만.
   - `services/web-kpa-society/src/config/businessSite.ts:19` — `authServiceKey: key === "pharmacy" ? "kpa-society" : "neture"`.
2. **megapharm 데이터 공유 (D2 위반)** — `services/web-kpa-society/src` 의 `'kpa-society'` 하드코딩 약 70곳이 hostname 과 무관하게 같은 범위를 쓴다.
   - 포럼 `api/forum.ts` (serviceCode), CMS `api/cms.ts:15`, 설문 `api/survey.ts` · `api/participation.ts`, 알림 `KpaGlobalHeader.tsx:65` · `MobileBottomNav.tsx:80`, 가이드 편집 5곳.
   - 미디어 업로드 9곳(`mediaApi.upload(..., 'kpa-society', ...)`), 사이니지 `/api/signage/kpa-society` 3곳 + 화면 4곳, 장바구니 `utils/eventOfferCart.ts:19` · `store-cart/StoreCartPage.tsx:24`, 통합 매장 경로 `lib/unifiedStoreScope.ts:9,15`.
   - 운영자 화면 약 15곳(`?serviceKey=kpa-society` · props), 서비스 전환 `currentServiceKey` 4곳, 가입 게이트 `lib/membershipGate.ts:30` · `components/auth/MembershipGate.tsx:47`.
   - 빌드 변수 `VITE_PHARMACY_BUSINESS_KEY` 는 어디서도 설정되지 않는다 — 사업 판정은 hostname 하나에 의존.
3. **약관 공유 (D3 위반)**
   - `modules/service-legal/service-legal-scope.ts:32-43,77-85` · `modules/policy-acceptance/service-enrollment-policy.service.ts:6` — 법적 문서 · 가입 약관은 서비스 키 allowlist 기준이며 사업 단위가 없다.
   - 테이블 `service_legal_profiles` · `service_policy_documents`(`migrations/20261104000000-CreateServiceLegalTables.ts`) · `user_policy_acceptances` 는 서비스 키로만 구분된다.
   - 프런트 `components/auth/TermsAcceptanceGate.tsx:30` · `lib/legalDocument.ts:46` 은 `kpa-society` 또는 `neture` 둘 중 하나.
4. **pharmcoop · carepharm 수준 차이** — pharmcoop 세션 `'coop'` 은 catalog 밖이라 가입 Origin 이 거절된다(`SIGNUP_ORIGIN_NOT_ALLOWED`). carepharm 은 handoff alias(`config/handoff-service-aliases.ts:4`)로만 연결된다.

### 운영 데이터 (기존 기록 기준, 이번 WO 에서 재조회 전)

- `semi_franchises` 활성 행 = `pharmacy` 1건. carepharm · megapharm 0건, pharmcoop `cooperatives` 0건 — [CHECK-O4O-CARE-MEGA-BUSINESS-LEDGER-ALIGNMENT-V1](../checks/CHECK-O4O-CARE-MEGA-BUSINESS-LEDGER-ALIGNMENT-V1.md), [CHECK-O4O-PHARMCOOP-DOMAIN-CORRECTION-V1](../checks/CHECK-O4O-PHARMCOOP-DOMAIN-CORRECTION-V1.md).

## 단계

각 단계는 검증 후 다음 단계로 간다. 단계 안에서 아래 중지 조건에 걸리면 그 항목만 멈추고 보고한다.

### 단계 1 — 정본 정렬 (문서)
- D1~D5 를 정본에 반영한다: [O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1](../baseline/O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md) L50 · §3-1-1, [O4O-HOME-SERVICE-DISCOVERY-V1](../baseline/O4O-HOME-SERVICE-DISCOVERY-V1.md) §1.1, [O4O-ROLE-WORKSPACE-ARCHITECTURE-V1](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §3, [RBAC-ROLE-CATALOG-V1](../rbac/RBAC-ROLE-CATALOG-V1.md) L164-189, [DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md) L17 · §3-1.
- `kpa-society.co.kr` 를 현행처럼 쓴 기준 문서에 SUPERSEDED 표기 또는 정정: `docs/architecture/O4O-IDENTITY-ARCHITECTURE-V1.md`, `docs/baseline/KPA-SOCIETY-SERVICE-STRUCTURE.md`, `docs/reference/KPA-SOCIETY-*`, `scripts/README.md`.

### 단계 2 — 사업 범위 키 설계 확정
- 사업 범위 데이터(포럼 · CMS · 설문 · 알림 · 미디어 · 사이니지 · 장바구니 · 운영 화면 · 약관)가 쓸 **사업 범위 키**를 하나의 규칙으로 정한다. 기존 `communityKey`(`business:{key}`) 선례와 각 백엔드 모듈의 범위 컬럼을 대조한다.
- 사업별 약관 저장 방식(기존 법적 문서 테이블의 범위 확장 또는 사업 키 범위 추가)을 정한다. 스키마 변경이 필요하면 migration 계획만 작성하고 중지한다.
- 산출물: 이 WO 에 "사업 범위 키 규칙" 절 추가.

### 단계 3 — 백엔드
- pharmacy 예외 제거: catalog `kpa-society` 항목 정리, `pharmacy.neture.co.kr` 세션을 다른 사업과 같은 축으로, `semi-franchise.service.ts` · `pharmacy-membership.service.ts` · `signup-policy.service.ts` 의 `kpa-society` 하드코딩을 사업 키 기준으로 일반화.
- 사업별 약관 · 정책 문서 관리 · 게시 · 동의 기록.
- pharmcoop 세션 `'coop'` 과 가입 Origin 을 다른 사업과 같은 수준으로.
- 사업 범위 데이터 API 가 사업 범위 키를 받도록 정비(포럼 · CMS · 미디어 · 사이니지 · 장바구니).

### 단계 4 — 프런트
- `services/web-kpa-society`: `'kpa-society'` 하드코딩을 `BUSINESS_SITE` 기반 사업 범위 키로 교체. megapharm 도메인에서 pharmacy 데이터가 보이지 않음을 실브라우저로 확인.
- `services/web-neture`(carepharm) · `services/web-pharmacy-coop`(pharmcoop): 사업별 약관 · 가입 흐름을 같은 수준으로 맞춘다.

### 단계 4-a — 프런트 1차: 옛 KPA 화면 삭제 (D7 · D8) · 완료(이 branch)
- `services/web-kpa-society/src` 파일 329개 삭제 — 옛 운영 · 관리 콘솔(`/operator/*` · `/admin/*` · `routes/OperatorRoutes`), 로컬 매장 화면(`pages/pharmacy` 64개 — 같은 화면의 정본은 `services/web-store/src/pages/pharmacy`), 가이드 · 서비스 소개, KPA 커뮤니티 홈 · 콘텐츠 · 자료실 · 설문 · 참여 · 마이페이지 KPA 화면, 그 화면만 쓰던 `api/*` · 컴포넌트.
- 매장 진입: `/store/*` · `/hub/*` · `/store-hub/*` 는 조건 없이 `KpaUnifiedStoreHandoff` 로 store.neture.co.kr 에 넘긴다(`PharmacyGuard` · 로컬 layout · `isUnifiedStoreHandoffEnabled` 제거). 공개 · 기기 경로(`/tablet/*` · `/store/:slug/products/:id` · `/store/:slug/blog*` · `/qr/:slug` · 다국어 · 외국인 제휴 · `/public/signage`)는 handoff 밖에 그대로 둔다.
- 송출(TV) `/store/marketing/signage/play/:playlistId` 는 로컬 재생 화면이 없어졌으므로 `toKpaScopedStorePath` 가 서비스 지정 트리로 바꾸지 않고 web-store 최상위 chrome-free route 로 보낸다(그대로 두면 `/work/kpa-society/store/...` 에 route 가 없어 404).
- D8: `AuthContext` 의 `/kpa/me-context` 보강(`activityType` · `isStoreOwner` · `kpaMembership`) 제거. 매장 접근 판정은 handoff 목적지가 한다.
- 계약 테스트 정렬: 삭제 파일을 읽던 api-server spec 18개 · operator-core-ui 2개 · shared-space-ui 4개를 "파일 없음 · route 없음" 단언 또는 web-store 정본 단언으로 바꿨다.
- 검증: web-kpa-society vitest 16 files / 121 tests PASS · `tsc --noEmit` PASS · `pnpm run build` PASS · KPA 참조 api-server spec 26 suites / 682 tests PASS · operator-core-ui 20 · shared-space-ui 136 PASS. 실브라우저 smoke 미실행(배포 전).

- PR #760 리뷰 대응: 삭제된 화면을 가리키는 외부 진입이 404 가 되지 않게 호환 이동을 두었다. `/operator/*` · `/admin/*` → `/operator/semi-franchises`(Neture My Home 운영 카드), `/operator/collaboration-requests` → `/operator/inbox/business/{key}`(문의 알림 · Neture 문의 화면), `/mypage/*` → `/`(회원 알림), `/guide/*` → `/`(web-store `GuideBackLink`). 원본 링크(`web-neture/lib/home-entry.ts` · `contact-request.controller.ts` · `member.controller.ts` · web-store `GuideBackLink`)의 정리는 단계 3 에서 한다.

#### 이번 단계에서 발견 · 미해결 — 처리 결과 (2026-10-22, branch `wo/pharmacy-stage4a-residuals`)
1. **공급자 콘텐츠 handoff 대상 막다른 길 — 처리.** `supplier-content-handoff-targets.ts` 에 규칙 4(수신 · 승인 화면이 있어야 한다)와 `RECEIVER_UNAVAILABLE = {'kpa-society'}` 를 두어 대상에서 뺐다. 현재 제공 대상은 0 이며 Neture 공급자 자료함은 대상이 없으면 제공 영역을 숨긴다(`SupplierLibraryPage` `handoffTargets.length > 0`). 수신 화면을 pharmacy.neture.co.kr 에 새로 만들 때 이 집합에서 뺀다. 이미 제공돼 pending 인 행(`cms_contents` serviceKey `kpa` · `kpa_approval_requests`)은 운영 DB 를 조회하지 않았다 — 단계 5 집계 때 함께 본다.
2. ~~**QR 랜딩 fallback**~~ — PR #760 리뷰에서 처리: 인라인 본문이 없는 page QR 은 삭제된 `/content/:id` 로 보내지 않고 미공개 안내를 표시한다.
3. **`VITE_UNIFIED_STORE_HANDOFF` 미사용 — 처리.** 배포 workflow 의 env · `--build-arg`, `services/web-kpa-society/Dockerfile` 의 ARG/ENV, `vite-env.d.ts` 선언을 제거했다. 해석 함수 `isUnifiedStoreHandoffEnabled`(`packages/store-ui-core`)는 소비 앱이 없지만 공용 패키지 export 라 남겼다(별도 정리 대상).
4. **web-store 잘못된 origin 버그 — 처리.** `StoreQrAiDescriptionPage`(QR 공개 주소) · `StoreContentEditPage`(공개 보기 주소 · 링크) · `StoreAssetSelectorModal`(블로그 주소)이 `window.location.origin`(store.neture.co.kr — 공개 route 없음) 대신 `getActiveServicePublicOrigin()` 을 쓴다. "공개 보기" 는 앱 내부 `<Link>` 가 아니라 서비스 공개 주소를 새 탭으로 연다. 결제 복귀(`ForeignVisitorSalesSupportPage`)와 URL 파싱 base(`MultilingualPublicActions`)는 store 호스트가 맞아 그대로 두었다.
5. **공유 guide copy 잔재 — 처리.** `packages/shared-space-ui/src/guide/copy/kpa.ts` 와 index export 를 삭제했다(`check-literal-consumers` 소비처 0). 공용 guide 컴포넌트 테스트는 로컬 fixture 로 바꿨다.
6. **`/api/v1/kpa/*` backend — 처리(2026-10-22, branch `wo/kpa-unused-route-cleanup`).** 프런트 소비처를 다시 census 해(`/kpa` base + 상대 경로 · 간접 호출 포함) 소비처 0 인 mount 만 `kpa.routes.ts` 에서 뺐다: members · qualifications · instructor* · forum-requests · community-hub · operator summary/actions/approvals/contact-requests/ai summarize/audit-logs/resources · recruitment-exposure proxy · supplier content-submissions · signage campaign-requests/reports · store seller-recruitment browse(약국은 `/neture/pharmacy/recruitments` 사용) · join-inquiries 관리 · contact-requests · legal-documents · me-context · pharmacy/store config · stores template/layout/settings · forum/* · credits · home/* · signage(playlists/media 옛 면) · mypage/*. controller 22 개 · `operator-dashboard.service` · `action-definitions` 와 이를 읽던 test 를 삭제하고, mount 존재를 고정하던 api-server spec 은 "제거됨" 으로 뒤집었다. 남은 service(content-approval · supplier-content · community-hub · mypage)는 다른 소비처가 있어 유지. 프런트 고아: web-store `api/news.ts` · `api/resources.ts` · `SellerRecruitmentsBrowsePage`, web-kpa-society `api/contactRequest.ts` · `ContactModal`, operator-core-ui `KpaEditUserModal` 묶음 삭제.
   - **유지(별도 판단)**: ① 부분 사용 router 의 미사용 handler — organizations(POST · GET /:id · PATCH), news(목록 · 생성 · 수정 외), contents(조회 외 쓰기). ② 업무 흐름 면 `/operator/product-applications` · `/groupbuy-admin`, 운영자 제작 API(blog · pop · video · multilingual · qr · screen-sets), `/payments` 410 tombstone · `/b2b/payments` · `/health` · `GET /me/membership`. ③ package.json `exports` 로 노출된 operator-core-ui 모듈(cms-content · product-applications · recruitment-exposure · resources)과 operator-ux-core `RecruitmentExposureConsole` — 지우려면 package.json 변경이 필요해 남겼다. ④ `SupplierContentInbox` — 수신 화면을 새로 만들 때 쓸 공통 inbox 로 spec 이 계약을 고정한다.
7. **web-store 이벤트 오퍼 상품 링크 — 처리.** `EventOfferContentPanel` 의 막다른 `/event-offers/:id` 링크를 상품명 표시로 바꿨다. 상세 화면이 생기면 다시 연결한다.
8. sitemap 은 남은 공개 주소(`/` · `/contact`)만 두도록 이번에 정리했다.
9. **호환 이동의 원본 링크 — 처리.** `web-neture/lib/home-entry.ts` 의 pharmacy 운영 · 관리 진입 → `/operator/semi-franchises`, 문의 알림 `targetUrl` · 메일 `adminManageUrl` → `/operator/inbox/business/pharmacy`, 회원 승인 알림 `targetUrl` → `/`, web-store `GuideBackLink` 3곳과 `/guide/*` 이동(`ServiceGuideRedirect`) 제거. pharmacy 앱의 호환 redirect 는 이미 저장된 알림 때문에 남긴다.
- 검증: shared-space-ui 17 files / 162 · web-neture 142 / 1251 · web-store 62 / 761 vitest PASS, api-server 관련 jest 17 suites / 412 PASS, `tsc --noEmit`(api-server · web-store · web-kpa-society · web-neture) PASS, `scripts/ci` deploy-workflow-diff 21 PASS. 실브라우저 smoke 미실행(배포 전).

### 단계 5 — 테스트 데이터 정리
- 운영 DB read-only 로 `kpa-society` 범위 테스트 데이터 건수를 집계한다. 삭제는 운영 write 라 건별 사용자 승인 후 실행한다.

### 단계 0 — 옛 도메인 삭제 (D6) · 코드 · 문서 완료, 운영 인프라 대기
- 완료(이 branch):
  - API: CORS 허용 목록 · 쿠키 도메인 · catalog `legacyDomains` 제거, 관련 주석 · dev 스크립트 안내.
  - 분회 앱: 옛 경로 이동 모듈(`lib/canonicalHost`) · 공용 호스트 목록의 옛 도메인 제거. `/kpa` asset base 는 유지(현행 LB · Dockerfile 계약).
  - 약국 앱 Dockerfile 기본 `VITE_SERVICE_URL`, 관리자 QR 안내 · 공용 도움말 링크 · 가이드 문구, Local Agent 허용 origin, e2e · 검증 스크립트, CI fixture.
  - 테스트: 옛 도메인을 쓰던 origin 예시를 `pharmacy.neture.co.kr` 로 교체. 재등록 방지 guard 3곳만 문자열을 남긴다(세션 판정 null · 분회 공용 호스트 목록 · 대표 홈 가입 안내).
  - 문서: `KPA-SOCIETY-SERVICE-STRUCTURE` 본문 삭제 · 은퇴 안내로 교체(SUPERSEDED), reference 문서 2건 삭제, `O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1` 옛 주소 열 · §4 행, CANONICAL-INDEX 행, `CLAUDE.md` §10, `scripts/README.md`.
- 의도적으로 남긴 것:
  - 이미 운영에 적용된 migration `20270305000000-SeedKpaBranchServiceAndRoles`(이력 파일 수정 금지). 운영 DB `platform_services` 의 해당 URL 값은 아래 운영 단계.
  - 기록물(`docs/checks` · `investigations` · `work-orders` · `ir` · `archive`)과 이미 SUPERSEDED 인 `O4O-IDENTITY-ARCHITECTURE-V1` — 과거 시점 기록이라 수정하지 않는다.
- 추가 4개 도메인(D6 확장): K-Cosmetics catalog `legacyDomains` 제거(이제 catalog 에 옛 호스트 0), 코드 주석 · 테스트 fixture · README · 배포 workflow 주석. 재등록 방지 guard 는 `service-catalog.canonical-domain.test.ts` 한 목록에 6개 도메인을 모았다(그 밖에 web-neture 대표 홈 guard 2곳 유지). `O4O-IDENTITY-ARCHITECTURE-V1`(SUPERSEDED) 본문 삭제.
- 남긴 것: `scripts/deployment/pharmacy-hub-*`(PH 인프라 퇴역 도구 — 대상 호스트 문자열이 동작 조건) · `pharmacyhub-qr-cutover.yml`, `DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1` 의 미실행 테스트 QR 4행 삭제 SQL, `HANDOFF.md` · `docs/handoffs` 인계 기록.
- 운영 상태 (2026-10-20, 완료):
  - DNS — 사용자 정리 완료(`retail` A 레코드 포함). `account` CNAME(ghs.googlehosted.com)은 용도 미상이라 사용자 판단으로 유지 — 이 GCP 프로젝트(App Engine · Cloud Run 도메인 매핑)와 저장소에는 연결이 없다.
  - LB `o4o-global-lb` — 옛 약국 앱 도메인 host rule 2 · `path-matcher-kpa-society` · `api.kpa-society.co.kr` 제거(validate 통과 후 import). 나머지 5개 도메인 host rule 은 원래 없었다.
  - 인증서 — 공용 `cm-cert-neture-v4`(옛 약국 앱 도메인 3개 SAN 포함)를 neture 4개 도메인만의 `cm-cert-neture-v5`(기존 DNS authorization 재사용, 만료 2027-01-18)로 교체 → entry 4개 재지정 · ACTIVE → 옛 도메인 entry 3개 · DNS authorization 3개 · v4 삭제. 남은 DNS authorization 은 neture 4개뿐, 은퇴 도메인 인증서 0.
  - 검증 — neture · www · admin · api 가 v5 를 서빙(SAN 4개), 9개 호스트(neture · www · admin · api /health · pharmacy · megapharm · kpa · pharmcoop · store) HTTP 200.
  - 운영 DB `platform_services.entry_url` — `kpa-society` → `https://pharmacy.neture.co.kr`, `kpa-branch` → `https://kpa.neture.co.kr`, `k-cosmetics`(퇴역) → NULL. 현재값 조건부 UPDATE 1건씩 · 단일 트랜잭션 · 사용자 승인 · 은퇴 도메인 잔여 0.
  - 남은 것 — K-Cosmetics 잔여 정리(catalog `domain: retail.neture.co.kr` · `cosmetics:*` · 가입 데이터)는 [K-COSMETICS-RETIREMENT-RESIDUE-CONTRACT-V1](../architecture/K-COSMETICS-RETIREMENT-RESIDUE-CONTRACT-V1.md) 범위로 별도.

### 단계 6 — 명칭 잔재 (후순위)
- Cloud Run 이름 `kpa-society-web` · 앱 디렉터리 `services/web-kpa-society` · 서비스 키 `kpa-society` 이름. 인프라 변경은 사용자 승인 후.

## 중지 조건 (이 WO 에서 예상되는 것)

- DB schema · migration 필요 (단계 2 · 3 의 사업별 약관 저장, 사업 범위 컬럼).
- 공용 패키지 변경 필요 (`packages/security-core`, `packages/auth-react`, `packages/types`) — 소비처 전수 확인 후 승인.
- 권한 · role · route · API contract 변경 (단계 3).
- 운영 DB 삭제 (단계 5), LB · Cloud Run 변경 (단계 6).
- 실제 약관 문안 — 법무 판단 사항이다. 개발은 사업별 문서 슬롯과 관리 화면까지만 한다.

## OUT_OF_SCOPE

- core-extension 공통화 (D2 — 독립 정비 이후 별도 작업).
- 네 사업 상위 분류 이름 결정.
- 약관 문안 작성 · 법무 검토.
- 실제 사업자 계정 생성 · 사업 행 운영 등록(기존 [CHECK-O4O-CARE-MEGA-BUSINESS-LEDGER-ALIGNMENT-V1](../checks/CHECK-O4O-CARE-MEGA-BUSINESS-LEDGER-ALIGNMENT-V1.md) §6 승인 대기 항목).

## DONE_CRITERIA

1. 정본에 D1~D5 가 반영되고 pharmacy 예외 서술이 없다.
2. 네 사업 모두 같은 세션 축 · 같은 가입 판정 방식이며 백엔드에 pharmacy 전용 분기가 없다(`kpa-society` 리터럴 0, 단 이력 주석 제외).
3. 각 사업이 자기 약관 · 정책 문서를 갖고, 가입 · 동의 기록이 사업 단위로 남는다.
4. megapharm · pharmacy 도메인에서 각자 쓴 포럼 · 콘텐츠 · 미디어 · 사이니지 데이터가 서로 보이지 않음을 실브라우저와 API 응답으로 확인한다.
5. 남은 명칭 잔재(단계 6)는 목록과 처리 여부를 CHECK 에 기록한다.

## 2026-10-22 연결 작업 — 메가팜 운영 완성 WO

[메가팜 운영 완성 WO](WO-O4O-MEGAPHARM-OPERATIONAL-COMPLETION-V1.md)에서 D1/D3 일부와 D8의 상담 판정을 연결한다. 네 사업 호스트의 세션은 neture로 정렬하고, 사업별 법정정보·약관은 기존 테이블의 business:<사업 UUID> 범위로 관리·공개·동의한다. 매장 약사 사용 확인에서 kpa_pharmacist_profiles 읽기를 제거한다. PR #760의 옛 운영·설문·로컬 매장 사본 제거는 보존한다.

이 연결로 본 WO 전체가 완료되는 것은 아니다. 기존 kpa-society catalog/공통 Store 및 내 매장 신청의 legacy 정책 키, 남은 backend 소비처 정리·운영 데이터 삭제·인프라 이름 변경은 이 WO의 후속 범위로 남는다. 실제 사업 약관 게시·경영자의 사용 확인·현장 음성 품질은 자동 설정하지 않는다. 이번 검증과 Delivery 결과는 연결 WO/CHECK와 해당 PR에서 추적한다.

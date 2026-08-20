# CHECK — WO-O4O-PHARMACYHUB-GUIDE-ADOPTION-V1

- **WO**: `WO-O4O-PHARMACYHUB-GUIDE-ADOPTION-V1` (PharmacyHub Guide 도입 · B-1)
- **작업일**: 2026-08-20
- **기준 commit**: `9c296cdcc` (직전 WO `WO-O4O-GUIDE-ENTRY-AND-LANDING-COMMONIZATION-V1` 종료 시점)
- **판정**: **PASS**

---

## 1. 목표

PharmacyHub 에 Guide 구조를 **새로 복제하지 않고** 기존 shared Guide core 를 그대로 채택한다.

```
/service-guide  → 공개 서비스 소개
/guide          → /guide/intro
/guide/*        → 기능 매뉴얼
```

PharmacyHub 전용 Guide framework 는 만들지 않는다.

---

## 2. §3 PharmacyHub Guide entry census (미조사 0)

최신 `main` 의 `services/web-pharmacy-hub/src` 전수 조사.

| 대상 | 결과 |
|------|------|
| App.tsx route 총수 | 53 (도입 전) |
| `/guide` 존재 | **없음** |
| `/service-guide` 존재 | **없음** |
| 기존 help / support route | **없음** |
| 기존 guide 페이지 파일 | **없음** (`src/pages/guide/` 부재) |
| header nav (`PH_PUBLIC_NAV`) Guide 진입점 | **0** (홈 · 커뮤니티 · 교육) |
| contextual nav (`PH_CONTEXTUAL_NAV`) Guide 진입점 | **0** |
| footer (`PH_FOOTER_SECTIONS`) Guide 진입점 | **0** (서비스 · 참여하기 · 약관) |
| store 메뉴 (`PHARMACY_HUB_STORE_CONFIG`) Guide 진입점 | **0** |
| dead entry | 3 — `O4OHelpSection` 기본 usageItems (`href: '#'` → "준비중" 카드) |
| 억제된 Guide 훅 | 2 — `LibraryPage guideLink={null}` · `CommunityHomePage help={{ currentServiceKey }}` |
| **route 의미 충돌** | **0** — `/guide` · `/service-guide` 모두 미사용 |

> 조사 대상: header / footer / navigation / dashboard / store-owner / operator / supplier / admin /
> service-info / help·support / legal / community / education route 전체. **미조사 0.**

---

## 3. §4 채택 route (17)

| route | View (공통) | props |
|-------|------------|-------|
| `/service-guide` | `GuideServiceIntroPage` | `pharmacyHubServiceIntroProps` |
| `/guide` | `<Navigate to="/guide/intro" replace />` | — |
| `/guide/intro` | `GuideIntroPage` | `pharmacyHubGuideIntroProps` |
| `/guide/intro/structure` | `GuideIntroStructurePage` | `pharmacyHubGuideIntroStructureProps` |
| `/guide/intro/kpa` | `GuideIntroKpaPage` | `pharmacyHubGuideIntroKpaProps` |
| `/guide/intro/operation` | `GuideIntroOperationPage` | `pharmacyHubGuideIntroOperationProps` |
| `/guide/intro/concept` | `GuideIntroConceptPage` | `pharmacyHubGuideIntroConceptProps` |
| `/guide/usage` | `GuideUsagePage` | `pharmacyHubGuideUsageProps` |
| `/guide/features` | `GuideFeaturesPage` | `pharmacyHubGuideFeaturesProps` |
| `/guide/features/forum` | `GuideFeatureManualPage` | `pharmacyHubGuideFeatureForumProps` |
| `/guide/features/supply-order` | `GuideFeatureManualPage` | `pharmacyHubGuideFeatureSupplyOrderProps` |
| `/guide/features/store-products` | `GuideFeatureManualPage` | `pharmacyHubGuideFeatureStoreProductsProps` |
| `/guide/features/content` | `GuideFeatureManualPage` | `pharmacyHubGuideFeatureContentProps` |
| `/guide/features/qr` | `GuideFeatureManualPage` | `pharmacyHubGuideFeatureQrProps` |
| `/guide/features/pop` | `GuideFeatureManualPage` | `pharmacyHubGuideFeaturePopProps` |
| `/guide/features/signage` | `GuideFeatureManualPage` | `pharmacyHubGuideFeatureSignageProps` |
| `/guide/features/tablet` | `GuideFeatureManualPage` | `pharmacyHubGuideFeatureTabletProps` |
| `/guide/features/manuals` | `GuideFeatureManualPage` | `pharmacyHubGuideFeatureManualsProps` |

`/guide/intro` 은 하위 4개 섹션 카드(`structure` · `kpa` · `operation` · `concept`)를 링크하므로
**4개를 함께 채택하지 않으면 데드링크가 발생**한다 → 함께 채택했다.

**서비스별 View 복제 0.** PharmacyHub 는 Guide page 파일을 만들지 않고 공통 View 를 route 에 직접 mount 한다
(K-Cosmetics 와 동일한 adoption 패턴).

---

## 4. §5 PharmacyHub copy/config

- 신규 파일: `packages/shared-space-ui/src/guide/copy/pharmacy-hub.ts` (1,017 lines, props 17종)
- 주입 항목: service name · intro copy · feature list · usage copy · navigation labels · serviceGuide↔guide links
- **금지 사항 준수**
  - `GuideServiceIntroPage` 내부 `serviceKey` 분기 **0** (View 무수정)
  - PharmacyHub 전용 shared View 복제 **0**
  - KPA · KCos · GP 문구 복사 후 의미만 바꾸기 **0** — 문구는 실제 PharmacyHub route·메뉴·화면 라벨
    (`PHARMACY_HUB_STORE_CONFIG` · 각 페이지 UI 텍스트)에 근거해 새로 작성

---

## 5. §8 PharmacyHub 기능 정합 판정

| 기능 축 | route | 판정 | 근거 |
|---------|-------|:----:|------|
| 커뮤니티 홈 · 검색 · 내 글 | `/community` · `/community/search` · `/forum/my-posts` | IMPLEMENTED | route + 화면 존재 |
| 포럼 | `/forum` (+ posts/write/edit/:postId) | IMPLEMENTED | route + 화면 존재 |
| 교육(LMS) | `/education` (+ course/lesson) | IMPLEMENTED | route + 화면 존재 |
| 공급 상품 탐색 | `/store-owner/products` (+ `/:offerId`) | IMPLEMENTED | 공급자·규제유형 필터 · 서비스 공급가 표기 |
| 장바구니 · 주문 · 결제 | `/store-owner/cart` · `/orders` · `/payment` | IMPLEMENTED | 공급자별 합계 · 결제 예정 금액 · 주문 내역 |
| 매장 경영활용 제품 | `/store-owner/handled-products` | IMPLEMENTED | 공급 상품에서 추가 · 분류(미분류) |
| 매장 자체 상품 | `/store-owner/local-products` | IMPLEMENTED | 별도 등록 축 |
| 매장 콘텐츠 | `/store-owner/content` | IMPLEMENTED | 직접 작성 / 가져온 자료 |
| 자료함 | `/store-owner/library` (+ `/resources`) | IMPLEMENTED | 공통 `StoreProductionMaterialsView` |
| 블로그 | `/store-owner/blog` (+ new/edit) | IMPLEMENTED | 매장 블로그 |
| QR | `/store-owner/qr` · 공개 `/qr/:slug` | IMPLEMENTED | 연결 대상 선택 · 이름 수정 · 최근 7일 스캔 |
| POP | `/store-owner/pop` | IMPLEMENTED | 작성 · 운영자 자료 가져오기 · 작성중/발행됨/보관됨 |
| 디지털 사이니지 | `/store-owner/signage` | IMPLEMENTED | 재생 목록 만들기 · 항목 추가 |
| 태블릿 | `/store-owner/tablets` | IMPLEMENTED | 등록 · 저장된 화면 세트 · 미적용 |
| 상품 설명서 | `/store-owner/manuals` (+ `/:listingId`) | IMPLEMENTED | 제품 검색 · 언어 · 설명서 없음 상태 |
| 매장 허브 | `/store-hub` | IMPLEMENTED | 자원 탐색 진입점 |
| 매장 정보 · 내 계정 | `/store-owner/info` · `/account` | IMPLEMENTED | — |
| 가입 신청 · 상태 확인 | `/join` · `/join/status` | IMPLEMENTED | — |
| 원본→사본 파생(derivations) | — | NOT_AVAILABLE | PH 에 생성 경로 없음(빈 어댑터) → **Guide 미기술** |
| 설문 | — | NOT_AVAILABLE | route 없음 → **Guide 미기술** |
| 운영자 검수·승인 워크스페이스 | `/operator/memberships` 만 | SERVICE_SPECIFIC | 회원 승인만 존재 → 운영 구조 페이지에서 "가입 승인·정책"으로만 기술, 별도 매뉴얼 미작성 |
| 공급자 상품 제공 | `/supplier/products` | SERVICE_SPECIFIC | 소개·개요 수준으로만 기술, 별도 매뉴얼 미작성 |

**구현되지 않은 기능을 정상 기능처럼 안내한 항목 0.**

기계 검증: `guideRouteContract.test.ts` 에 `pharmacy-hub` 서비스를 추가해
**copy 가 참조하는 모든 내부 경로가 PharmacyHub 실제 `<Route>` 와 매칭**됨을 정적 검사로 고정했다 (unresolved 0).

---

## 6. §6 Navigation / discoverability

| 지점 | 변경 |
|------|------|
| `PH_PUBLIC_NAV` | `이용 안내` 그룹 신설 → 서비스 소개 `/service-guide` · 이용 가이드 `/guide/intro` · 기능별 이용 방법 `/guide/features` |
| `PH_FOOTER_SECTIONS` | `이용 안내` 섹션 신설 (동일 3링크). "/service-guide 는 route 가 없어 넣지 않는다" 주석 정정 |
| `StoreOwnerShell` | 매장 셸 `navItems` 에 `이용 가이드 → /guide/features` 추가 |
| `LibraryPage` | `guideLink={null}` → `{ to: '/guide/features/content', label: '콘텐츠·자료함 이용 방법' }` (억제 해제) |
| `CommunityHomePage` | `O4OHelpSection` 기본 usageItems 3개(`href:'#'` "준비중" 데드 엔트리) → 실제 Guide 3링크로 대체 |
| `/service-guide` ↔ `/guide` | serviceIntro `relatedGuide` 3링크 → `/guide/*`, guide intro `bottomNav.serviceGuide` → `/service-guide` |

기존 navigation 구조는 유지했다 — 항목 삭제·재편 0, 추가만 수행.

---

## 7. §9 기존 4서비스 회귀

| 서비스 | 변경 | build |
|--------|------|:-----:|
| KPA-Society | 없음 | PASS (18.67s) |
| K-Cosmetics | 없음 | PASS (32.40s) |
| GlycoPharm | 없음 | PASS (32.29s) |
| Neture | 없음 (`/guide` shared shell 구조 무변경) | PASS (16.55s) |
| PharmacyHub | 도입 | PASS (41.14s) |

공통 패키지 변경은 **추가 전용**(신규 copy 파일 + barrel export). 기존 View·types·copy 무수정.

---

## 8. §10 검증

| 항목 | 결과 |
|------|------|
| `shared-space-ui` guide tests | **40 passed** (기존 31 + PharmacyHub 신규 9) |
| `guideRouteContract` (5서비스) | PASS — pharmacy-hub 포함 unresolved 0 |
| PharmacyHub typecheck (`tsc -b`) | PASS |
| PharmacyHub production build | PASS |
| 4서비스 회귀 build | PASS |

신규 계약 테스트 (`guideServiceIntro.test.tsx` — `PharmacyHub adoption` describe):

1. 공통 View 를 route 에 직접 mount · PharmacyHub 전용 Guide page 파일 0
2. deep-link route 17개 등재
3. `/guide` → `/guide/intro` 수렴 · `/guide/intro` 는 실제 페이지 (redirect loop 0)
4. `/service-guide` ↔ `/guide` 상호 링크 copy 고정
5. navigation Guide 진입점 등재 (고립 0)

추가로 `GuideServiceIntroPage` 렌더 계약 테스트의 서비스 목록에 PharmacyHub 를 포함시켰다 (3 → 4서비스).

---

## 9. §11 Production browser smoke

- 대상: `https://pharmacyhub.co.kr` (deploy run `32344976426` / headSha `39901c13101e92ec39d45b0d2af98f96cdf10d7d` — `deploy-pharmacy-hub: success`)
- 도구: Playwright chromium · desktop 1280×900 / mobile 390×844
- 판정 기준: status 200 · 본문 길이 ≥ 80 (white screen) · pageerror/console.error 0 · 수평 overflow ≤ 1px · 최종 URL 일치(`/guide` 만 `/guide/intro` 수렴)

### 9-1. 17 route × 2 viewport = 34 case — 전수 PASS

| route | desktop h1 | mobile h1 | status | ovf | JS err |
|---|---|---|---|:---:|:---:|
| `/service-guide` | 약국 경영을 위한 O4O 서비스 안내 | 동일 | 200 | 0 | 0 |
| `/guide` → `/guide/intro` | O4O 개요 | 동일 | 200 | 0 | 0 |
| `/guide/intro` | O4O 개요 | 동일 | 200 | 0 | 0 |
| `/guide/intro/structure` | O4O 기본 구조 | 동일 | 200 | 0 | 0 |
| `/guide/intro/kpa` | PharmacyHub 위치 | 동일 | 200 | 0 | 0 |
| `/guide/intro/operation` | 운영 구조 | 동일 | 200 | 0 | 0 |
| `/guide/intro/concept` | 핵심 개념 | 동일 | 200 | 0 | 0 |
| `/guide/usage` | 서비스 활용 방법 | 동일 | 200 | 0 | 0 |
| `/guide/features` | 기능별 이용 방법 | 동일 | 200 | 0 | 0 |
| `/guide/features/forum` | 커뮤니티 이용 방법 | 동일 | 200 | 0 | 0 |
| `/guide/features/supply-order` | 공급 상품 주문 방법 | 동일 | 200 | 0 | 0 |
| `/guide/features/store-products` | 매장 제품 관리 방법 | 동일 | 200 | 0 | 0 |
| `/guide/features/content` | 콘텐츠 · 자료함 이용 방법 | 동일 | 200 | 0 | 0 |
| `/guide/features/qr` | QR 이용 방법 | 동일 | 200 | 0 | 0 |
| `/guide/features/pop` | POP 이용 방법 | 동일 | 200 | 0 | 0 |
| `/guide/features/signage` | 디지털 사이니지 이용 방법 | 동일 | 200 | 0 | 0 |
| `/guide/features/tablet` | 태블릿 이용 방법 | 동일 | 200 | 0 | 0 |
| `/guide/features/manuals` | 상품 설명서 이용 방법 | 동일 | 200 | 0 | 0 |

`/guide` 는 desktop · mobile 모두 최종 URL 이 `/guide/intro` 로 1회 수렴했고, `/guide/intro` 는 자기 자신으로 머무르므로 **redirect loop 0**.

### 9-2. dead link — Guide 화면이 노출하는 내부 링크 31개 전수 PASS

`/` · `/community` · `/community/search` · `/education` · `/forum` · `/forum/my-posts` · `/guide/features` · `/guide/intro` · `/guide/intro/{structure, kpa, operation, concept}` · `/guide/usage` · `/join` · `/join/status` · `/privacy` · `/service-guide` · `/terms` · `/store-owner/{blog, cart, content, handled-products, library, local-products, manuals, orders, pop, products, qr, signage, tablets}`

전부 status 200 · "페이지를 찾을 수 없음" 문구 0. (`/store-owner/*` 는 미로그인 상태에서 로그인 안내 화면을 렌더하며 404/500 이 아니다.)

### 9-3. §11 상호 링크 — 실 `<a href>` 기준

| 방향 | 실측 href | 결과 |
|---|---|:---:|
| `/service-guide` → `/guide/intro` | `/guide/intro` | PASS |
| `/service-guide` → `/guide/usage` | `/guide/usage` | PASS |
| `/service-guide` → `/guide/features` | `/guide/features` | PASS |
| `/guide/intro` → `/service-guide` | `/service-guide` | PASS |

### 9-4. 집계

```text
dead link 0 / 404·500 0 / white screen 0 / JS exception 0 / mobile overflow 0 / redirect loop 0
FAIL 총계 0 (34 route case + 31 link case + 4 상호링크 = 69 case)
```

---

## 10. 변경 파일

| 파일 | 변경 |
|------|------|
| `packages/shared-space-ui/src/guide/copy/pharmacy-hub.ts` | 신규 1,017 |
| `packages/shared-space-ui/src/guide/index.ts` | +22 |
| `packages/shared-space-ui/src/guide/__tests__/guideServiceIntro.test.tsx` | +73 |
| `packages/shared-space-ui/src/guide/__tests__/guideRouteContract.test.ts` | +2 |
| `services/web-pharmacy-hub/src/App.tsx` | +102 / -1 |
| `services/web-pharmacy-hub/src/config/navigation.ts` | +23 / -2 |
| `services/web-pharmacy-hub/src/layouts/StoreOwnerShell.tsx` | +6 / -2 |
| `services/web-pharmacy-hub/src/pages/community/CommunityHomePage.tsx` | +12 / -1 |
| `services/web-pharmacy-hub/src/pages/store-owner/LibraryPage.tsx` | +6 / -2 |

**9 files · +1,255 / -8**

---

## 11. 완료 지표

```
PharmacyHub Guide entry census: 미조사 0
route 의미 충돌: 0
채택 route: 17
서비스별 View 복제: 0
NOT_AVAILABLE 기능 Guide 기술: 0
dead entry 해소: 3 (O4OHelpSection 준비중 카드)
억제 훅 해제: 1 (LibraryPage guideLink)
기존 4서비스 회귀: 0
tests: 40 passed
build: 5/5 PASS
production smoke: 69/69 PASS (desktop+mobile)
dead link 0 / 404·500 0 / white screen 0 / JS exception 0 / mobile overflow 0 / redirect loop 0
```

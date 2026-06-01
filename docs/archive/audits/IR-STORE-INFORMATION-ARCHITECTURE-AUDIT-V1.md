# IR-STORE-INFORMATION-ARCHITECTURE-AUDIT-V1

> **KPA-Society `/store` Information Architecture — Current State Investigation Report**
>
> 조사 전용 IR (investigation-only). 코드 수정 없음.
>
> 작성 일자: 2026-04-16
> 조사 범위: `services/web-kpa-society` 의 `/store/*` 영역 전체 (라우트 + 사이드바 + 홈 카드 + 각 페이지 실체)
> 조사 근거: `App.tsx` 라우트, `packages/store-ui-core` 메뉴 구성, 28개 페이지 컴포넌트 직접 읽기

---

## 1. 전체 판정

### **PARTIAL**

| 항목 | 상태 |
|------|------|
| 사용자 주 흐름 | 대부분 살아 있음 |
| 페이지 구현 완성도 | 28개 중 25개 ALIVE, 3개 PARTIAL (Mock 또는 API 미연결) |
| IA(정보 구조) 정합성 | **사이드바-홈카드-라우트 삼자 불일치** 존재 |
| 새 4-분류(HOME/ORDER/STORE_DISPLAY/EXTERNAL_PROMOTION) 재배치 | 가능 — 대부분 명확히 귀속, 3~4개만 경계 애매 |

**핵심 결론:** 개별 기능은 대부분 동작하나, **메뉴 체계/홈 카드/URL prefix 가 세 가지 서로 다른 기준**으로 굴러가고 있어 **IA 재정의가 필요**. 하지만 기능 자체는 살아 있으므로, 재배치 WO 는 "없던 기능 만들기" 가 아니라 "있는 기능 재배치" 중심이 되어야 함.

---

## 2. `/store` 라우트 전체 맵

### 2.1 인증 라우트 — PharmacyGuard + KpaStoreLayoutWrapper (28개)

| # | URL | 페이지 | LOC | 상태 |
|---|-----|--------|-----|------|
| 1 | `/store` | StoreHomePage | 477 | ALIVE |
| 2 | `/store/info` | PharmacyInfoPage | 545 | ALIVE |
| 3 | `/store/operation/library` | StoreLibraryPage | 584 | ALIVE |
| 4 | `/store/operation/library/new` | StoreLibraryNewPage | 520 | ALIVE |
| 5 | `/store/operation/library/:id` | StoreLibraryDetailPage | 460 | ALIVE |
| 6 | `/store/operation/library/:id/edit` | StoreLibraryEditPage | 556 | ALIVE |
| 7 | `/store/marketing/qr` | StoreQRPage | 932 | ALIVE |
| 8 | `/store/marketing/pop` | StorePopPage | 424 | ALIVE |
| 9 | `/store/marketing/signage` | StoreSignagePage | **1,622** | ALIVE (대형, 3-tab) |
| 10 | `/store/commerce/products` | PharmacyB2BPage | 507 | ALIVE |
| 11 | `/store/commerce/products/b2c` | PharmacySellPage | 856 | ALIVE |
| 12 | `/store/commerce/products/suppliers` | SupplierListPage | 456 | **PARTIAL (Mock)** |
| 13 | `/store/commerce/products/suppliers/:id` | SupplierDetailPage | 593 | **PARTIAL (Mock)** |
| 14 | `/store/commerce/products/:productId/marketing` | ProductMarketingPage | 464 | ALIVE |
| 15 | `/store/commerce/local-products` | StoreLocalProductsPage | 654 | ALIVE |
| 16 | `/store/commerce/tablet-displays` | StoreTabletDisplaysPage | 474 | ALIVE |
| 17 | `/store/commerce/order-worktable` | StoreOrderWorktablePage | 694 | ALIVE |
| 18 | `/store/commerce/orders` | StoreOrdersPage | 206 | **PARTIAL (API 없음)** |
| 19 | `/store/analytics/marketing` | MarketingAnalyticsPage | 429 | ALIVE |
| 20 | `/store/channels` (hidden) | StoreChannelsPage | 911 | ALIVE |
| 21 | `/store/channels/tablet` (hidden) | TabletRequestsPage | 381 | ALIVE |
| 22 | `/store/content` (hidden) | StoreAssetsPage | 83 | ALIVE (thin wrapper) |
| 23 | `/store/content/blog` (hidden 사이드바, 홈카드 노출) | PharmacyBlogPage | 378 | ALIVE |
| 24 | `/store/content/:snapshotId/edit` (hidden) | StoreContentEditPage | 623 | ALIVE |
| 25 | `/store/billing` (hidden) | StoreBillingPage | 179 | **PARTIAL (API 미연결)** |
| 26 | `/store/settings` (hidden) | PharmacyStorePage | 1,076 | ALIVE |
| 27 | `/store/settings/layout` | LayoutBuilderPage | 364 | ALIVE (v1, D&D 는 v2 예정) |
| 28 | `/store/settings/template` (hidden) | PharmacyTemplatePage | 202 | ALIVE |

### 2.2 Legacy Redirect (12개 — App.tsx 내 리다이렉트)

| Legacy URL | → 공식 URL |
|-----------|-----------|
| `/store/dashboard` | `/store` |
| `/store/commerce/orderable` | `/hub/b2b` |
| `/store/qr` | `/store/marketing/qr` |
| `/store/pop` | `/store/marketing/pop` |
| `/store/signage` | `/store/marketing/signage` |
| `/store/library` | `/store/operation/library` |
| `/store/library/new` | `/store/operation/library/new` |
| `/store/analytics` | `/store/analytics/marketing` |
| `/store/products` | `/store/commerce/products` |
| `/store/products/b2c` | `/store/commerce/products/b2c` |
| `/store/products/suppliers` | `/store/commerce/products/suppliers` |
| `/store/orders` | `/store/commerce/orders` |

### 2.3 공개 스토어프론트 — `/store/:slug/*` (인증 없음, 7개)

| URL | 페이지 |
|-----|--------|
| `/store/:slug` | StorefrontHomePage |
| `/store/:slug/products/:id` | StorefrontProductDetailPage |
| `/store/:slug/checkout` | CheckoutPage |
| `/store/:slug/payment/success` | PaymentSuccessPage |
| `/store/:slug/payment/fail` | PaymentFailPage |
| `/store/:slug/blog` | StoreBlogPage |
| `/store/:slug/blog/:postSlug` | StoreBlogPostPage |

**중요**: `/store/:slug/*` 는 `/store/*` 인증 경로와 **동일 prefix 이지만 완전 별개 시스템**. PharmacyGuard 적용 대상 아님. 공개 스토어프론트는 이번 IA 정비 범위에 포함하지 않음 (별도 consumer-facing domain).

---

## 3. 사이드바 메뉴 정의

### 3.1 정의 위치

| 파일 | 역할 |
|------|------|
| `packages/store-ui-core/src/config/storeMenuConfig.ts` | `KPA_SOCIETY_STORE_CONFIG` (menuSections 배열) |
| `packages/store-ui-core/src/config/menuCapabilityMap.ts` | capability → menuKey 필터링 맵 |
| `packages/store-ui-core/src/components/StoreSidebar.tsx` | 사이드바 렌더러 (섹션 모드) |
| `services/web-kpa-society/src/hooks/useStoreCapabilities.ts` | `/store-hub/capabilities` API fetch |
| `services/web-kpa-society/src/App.tsx` (284~325) | `KpaStoreLayoutWrapper` 에서 `resolveStoreMenu()` 호출 |

### 3.2 현재 사이드바 (6 섹션 / 13 항목)

| 섹션 | 항목 | URL | Capability |
|------|------|-----|------------|
| *(무헤더)* | 홈 | `/store` | — |
| *(무헤더)* | 약국 정보 | `/store/info` | — |
| **콘텐츠** | 자료실 | `/store/operation/library` | LIBRARY |
| **콘텐츠** | 블로그 | `/store/content/blog` | — |
| **콘텐츠** | 매장 사이니지 | `/store/marketing/signage` | SIGNAGE |
| **홍보** | QR 관리 | `/store/marketing/qr` | QR_MARKETING |
| **홍보** | POP 자료 | `/store/marketing/pop` | POP_PRINT |
| **상품/주문** | 상품 관리 | `/store/commerce/products` | B2C_COMMERCE |
| **상품/주문** | 자체 상품 | `/store/commerce/local-products` | — |
| **상품/주문** | 주문 관리 | `/store/commerce/orders` | B2C_COMMERCE |
| **분석** | 마케팅 분석 | `/store/analytics/marketing` | — |
| **설정** | 매장 설정 | `/store/settings` | — |
| **설정** | 레이아웃 빌더 | `/store/settings/layout` | — |

### 3.3 사이드바에 없으나 라우트 존재 (hidden)

| URL | 페이지 | 실체 |
|-----|--------|------|
| `/store/channels` | StoreChannelsPage | ALIVE 911 LOC |
| `/store/channels/tablet` | TabletRequestsPage | ALIVE |
| `/store/content` | StoreAssetsPage | ALIVE thin wrapper |
| `/store/content/:snapshotId/edit` | StoreContentEditPage | ALIVE |
| `/store/billing` | StoreBillingPage | PARTIAL |
| `/store/settings/template` | PharmacyTemplatePage | ALIVE |
| `/store/commerce/tablet-displays` | StoreTabletDisplaysPage | ALIVE |
| `/store/commerce/products/b2c` | PharmacySellPage | ALIVE 856 LOC |
| `/store/commerce/products/suppliers` | SupplierListPage | PARTIAL Mock |
| `/store/commerce/order-worktable` | StoreOrderWorktablePage | ALIVE 694 LOC |
| `/store/commerce/products/:id/marketing` | ProductMarketingPage | ALIVE |

**⚠️ 관측:** hidden 라우트 중 **911 LOC (Channels), 856 LOC (Sell), 694 LOC (OrderWorktable)** 는 대규모 기능임에도 메뉴에서 제외됨. "미완성 비노출" 인지 "의도된 백도어" 인지 판단 필요.

---

## 4. 홈 카드 / 바로가기 연결

### 4.1 StoreHomePage 의 6개 QuickCard

| # | 카드 라벨 | URL | 설명 | 대상 페이지 실체 |
|---|-----------|-----|------|-----------------|
| 1 | 자료실 | `/store/operation/library` | 매장 자료 관리 | StoreLibraryPage (ALIVE) |
| 2 | QR 관리 | `/store/marketing/qr` | QR 코드 생성 및 관리 | StoreQRPage (ALIVE) |
| 3 | POP 자료 | `/store/marketing/pop` | POP 광고 PDF 생성 | StorePopPage (ALIVE) |
| 4 | 사이니지 | `/store/marketing/signage` | 디지털 디스플레이 관리 | StoreSignagePage (ALIVE) |
| 5 | 블로그 | `/store/content/blog` | 약국 블로그 관리 | PharmacyBlogPage (ALIVE) |
| 6 | 상품 관리 | `/store/commerce/products` | B2B 상품 관리 | PharmacyB2BPage (ALIVE) |

### 4.2 기타 홈 영역 링크

| 위치 | URL | 실체 |
|------|-----|------|
| "상세 분석" 링크 | `/store/analytics/marketing` | MarketingAnalyticsPage (ALIVE) |

### 4.3 KPI 카드 (네비게이션 없음, 데이터 표시만)

- 자료실 수 (libraryCount)
- 활성 QR 수 (analytics.activeQrCount)
- 진열 상품 수 (productCount)
- 이번주 스캔 (analytics.weeklyScans)

### 4.4 홈-사이드바 정합성 점검

| 홈카드 | 사이드바 항목 | 정합 |
|--------|--------------|------|
| 자료실 | 콘텐츠>자료실 | ✅ |
| QR 관리 | 홍보>QR 관리 | ✅ |
| POP 자료 | 홍보>POP 자료 | ✅ |
| 사이니지 | 콘텐츠>매장 사이니지 | ✅ |
| 블로그 | 콘텐츠>블로그 | ✅ |
| 상품 관리 | 상품/주문>상품 관리 | ✅ |

→ 홈 카드와 사이드바는 **일치**. 다만 **사이드바에만 있고 홈카드엔 없는 항목**이 존재:
- 약국 정보, 자체 상품, 주문 관리, 마케팅 분석, 매장 설정, 레이아웃 빌더

→ **홈카드에 없고 사이드바에도 없는 hidden 라우트 다수 존재** (위 3.3 참조).

---

## 5. 페이지 실체 — 요약표

### 5.1 ALIVE (25개, 실제 API + 실제 기능)

| 그룹 | 페이지 |
|------|--------|
| **홈/정보** | StoreHomePage, PharmacyInfoPage |
| **자료실 CRUD** | StoreLibraryPage, NewPage, DetailPage, EditPage |
| **매장 콘텐츠** | StoreAssetsPage (wrapper), StoreContentEditPage, PharmacyBlogPage |
| **홍보 도구** | StoreQRPage, StorePopPage, StoreSignagePage |
| **상품/주문** | PharmacyB2BPage, PharmacySellPage, StoreLocalProductsPage, StoreOrderWorktablePage, ProductMarketingPage |
| **태블릿/채널** | StoreTabletDisplaysPage, StoreChannelsPage, TabletRequestsPage |
| **분석** | MarketingAnalyticsPage |
| **설정** | PharmacyStorePage, PharmacyTemplatePage, LayoutBuilderPage |

### 5.2 PARTIAL (3개, 실 동작 제한)

| 페이지 | 사유 |
|--------|------|
| **StoreOrdersPage** | 코드 내 주석 `"KPA-a는 아직 주문 API가 없으므로 빈 상태 UI를 표시한다"` — 사이드바에 노출됨에도 불구하고 실데이터 없음 |
| **StoreBillingPage** | 코드 내 주석 `"API 미연결 — 실데이터 없음"` — hidden 상태, 사용자 접근 경로 없음 |
| **SupplierListPage / SupplierDetailPage** | `mockSuppliers` / `mockSupplierDetail` 하드코딩 배열 사용 — API 호출 0건. 필터 `onChange` 도 미구현. WIP. |

### 5.3 DEAD 또는 DUPLICATE

- **없음** — 조사 결과 완전히 죽은 페이지는 발견되지 않음.
- **진정한 duplicate 없음** — `PharmacyB2BPage` vs `StoreOrderWorktablePage` 는 "브라우즈 vs 주문 입력" 으로 워크플로우 분할. `PharmacyTemplatePage` vs `LayoutBuilderPage` 는 "preset vs fine-tune" 계층 분할. `StoreMarketingDashboardPage` vs `MarketingAnalyticsPage` 는 "개요 vs 심화" 분할. → **중복 아님**.

### 5.4 문제성 관찰

| # | 관찰 | 심각도 |
|---|------|--------|
| 1 | **`StoreOrdersPage` 가 사이드바에 노출되지만 실데이터 0건** — 사용자가 클릭 시 빈 화면. UX 거짓 약속. | HIGH |
| 2 | **대형 hidden 페이지 3개 (Channels 911 / Sell 856 / OrderWorktable 694 LOC)** — URL 직접 접근만 가능. "백도어 기능" 상태. | HIGH |
| 3 | **SupplierList/Detail 이 Mock 데이터** — hidden 이라 일반 사용자 도달 불가하나 코드로는 존재. 공급사 기능 자체가 WIP. | MEDIUM |
| 4 | **`/store/marketing/signage` 가 "marketing" prefix 아래 있으나 실제로는 매장 내 디스플레이** — 이름과 기능의 의미론 불일치. | MEDIUM |
| 5 | **`/store/content/blog` 가 content prefix 아래** — 블로그는 "외부 발행" 목적인데 content (대외/대내 공용) prefix. | LOW |
| 6 | **`/store/operation/library`** — operation prefix 는 다른 곳에 쓰이지 않음. library 단독을 위해 생긴 prefix. | LOW |
| 7 | **`/store/channels` vs `/store/commerce/tablet-displays` vs `/store/marketing/signage`** — 세 곳에서 "디스플레이 채널 관리" 가 겹침. 역할 분담 불명. | HIGH |
| 8 | **홈 KPI 에 "진열 상품 수" 가 있으나 진열 상품 관리 진입점은 hidden (`PharmacySellPage`)** — 홈에서 숫자는 보이는데 그 숫자를 관리할 UI 링크는 사이드바·홈 어디에도 없음. | HIGH |

---

## 6. 4-분류 재배치 제안

### 6.1 재분류 기준

| 분류 | 정의 |
|------|------|
| **HOME** | 진입점 · 매장 자신의 정보 · 고정 설정 |
| **ORDER** | 들어오고 나가는 주문 · 결제 · 공급사 · 공급-구매 연결 |
| **STORE_DISPLAY** | 매장 "안" 고객에게 보여지는 것 (진열 / 디스플레이 / 사이니지 / 태블릿) |
| **EXTERNAL_PROMOTION** | 매장 "밖" 으로 내보내는 홍보 (QR / 블로그 / POP / 분석) |

### 6.2 재배치 표

| # | 현재 URL | 현재 사이드바/홈 위치 | 페이지 | 새 분류 | 이동 필요 여부 |
|---|---------|---------------------|--------|---------|--------------|
| 1 | `/store` | — | StoreHomePage | HOME | — |
| 2 | `/store/info` | 사이드바 (무헤더) | PharmacyInfoPage | HOME | — |
| 3 | `/store/settings` | hidden | PharmacyStorePage | HOME | hidden 해제 |
| 4 | `/store/settings/template` | hidden | PharmacyTemplatePage | STORE_DISPLAY | 이동 (설정>템플릿 → 매장표시>템플릿) |
| 5 | `/store/settings/layout` | 사이드바 설정 | LayoutBuilderPage | STORE_DISPLAY | 이동 |
| 6 | `/store/commerce/products` | 사이드바 상품/주문 + 홈카드 | PharmacyB2BPage | ORDER | 카테고리명 재정의 (상품관리 → B2B 공급구매) |
| 7 | `/store/commerce/products/suppliers` | hidden | SupplierListPage | ORDER | **Mock 해결 필요** |
| 8 | `/store/commerce/products/suppliers/:id` | hidden | SupplierDetailPage | ORDER | **Mock 해결 필요** |
| 9 | `/store/commerce/products/:id/marketing` | hidden | ProductMarketingPage | EXTERNAL_PROMOTION | 이동 (제품별 홍보 자산) |
| 10 | `/store/commerce/products/b2c` | hidden | PharmacySellPage | STORE_DISPLAY | **hidden 해제 + 이동** (매장 진열 신청/관리) |
| 11 | `/store/commerce/local-products` | 사이드바 상품/주문 | StoreLocalProductsPage | STORE_DISPLAY | 이동 |
| 12 | `/store/commerce/tablet-displays` | hidden | StoreTabletDisplaysPage | STORE_DISPLAY | hidden 해제 |
| 13 | `/store/commerce/order-worktable` | hidden | StoreOrderWorktablePage | ORDER | **hidden 해제** (핵심 주문 워크테이블) |
| 14 | `/store/commerce/orders` | 사이드바 상품/주문 | StoreOrdersPage | ORDER | PARTIAL 해결 전까지 노출 보류 |
| 15 | `/store/billing` | hidden | StoreBillingPage | ORDER | PARTIAL 해결 전까지 hidden 유지 |
| 16 | `/store/channels` | hidden | StoreChannelsPage | STORE_DISPLAY | **hidden 해제 또는 통합** |
| 17 | `/store/channels/tablet` | hidden | TabletRequestsPage | ORDER | hidden 해제 (고객 주문 요청 관리) |
| 18 | `/store/marketing/signage` | 사이드바 콘텐츠 + 홈카드 | StoreSignagePage | STORE_DISPLAY | 이동 (marketing → store_display) + URL 재정의 |
| 19 | `/store/marketing/qr` | 사이드바 홍보 + 홈카드 | StoreQRPage | EXTERNAL_PROMOTION | — |
| 20 | `/store/marketing/pop` | 사이드바 홍보 + 홈카드 | StorePopPage | EXTERNAL_PROMOTION | — (POP 는 매장 내 부착도 가능하나, 생성 자체는 외부 배포 목적) |
| 21 | `/store/content/blog` | 사이드바 콘텐츠 + 홈카드 | PharmacyBlogPage | EXTERNAL_PROMOTION | 이동 |
| 22 | `/store/content` | hidden | StoreAssetsPage | STORE_DISPLAY | 이동 또는 흡수 (thin wrapper) |
| 23 | `/store/content/:id/edit` | hidden | StoreContentEditPage | STORE_DISPLAY | 이동 |
| 24 | `/store/operation/library` | 사이드바 콘텐츠 + 홈카드 | StoreLibraryPage | **경계 애매** | → 별도 논의 (아래 6.3) |
| 25 | `/store/operation/library/new` | (library CRUD) | StoreLibraryNewPage | 〃 | 〃 |
| 26 | `/store/operation/library/:id` | (library CRUD) | StoreLibraryDetailPage | 〃 | 〃 |
| 27 | `/store/operation/library/:id/edit` | (library CRUD) | StoreLibraryEditPage | 〃 | 〃 |
| 28 | `/store/analytics/marketing` | 사이드바 분석 + 홈 링크 | MarketingAnalyticsPage | EXTERNAL_PROMOTION | 이동 (홍보 성과 분석) |

### 6.3 경계 애매 항목 결정 기준

| 페이지 | 애매 사유 | 권고 |
|--------|----------|------|
| **자료실 (Library)** | 내부 컨텐츠 저장소 + QR/POP/사이니지/콘텐츠 편집기가 모두 소비 → 어느 하나에 귀속시키면 중복이 생김 | **STORE_DISPLAY 하위로 두되, "자산(Library)" 로 명명**. QR/POP 도 같은 자산을 소비하므로, "자산이 매장 안에서 쓰이는지 밖에서 쓰이는지" 로 구분하기보다 "원본 저장소는 매장에 있음" 기준. |
| **POP 자료** | 생성물은 인쇄되어 매장 안에도 붙고 매장 밖(전단)에도 뿌려짐 | **EXTERNAL_PROMOTION** — PDF 생성 자체가 "외부 배포용 인쇄물" 성격이 강함. |
| **블로그 (PharmacyBlogPage)** | 매장 안 고객도 볼 수 있으나 주 독자는 웹 검색 유입 | **EXTERNAL_PROMOTION** — SEO 및 외부 독자 대상 |
| **Channels 콘솔** | B2C/KIOSK/TABLET/SIGNAGE 4채널에 상품 할당 — 각 채널은 "매장 안 디스플레이" | **STORE_DISPLAY** — 본질은 매장 내 디스플레이 채널 분배 |
| **TabletRequests** | 고객이 태블릿에서 주문 의사 표시 → 매장이 응대 | **ORDER** — 주문 입구로 역할 |

### 6.4 새 사이드바 초안

```
[HOME]
  홈                    /store
  약국 정보             /store/info
  매장 설정             /store/settings

[ORDER]
  공급 상품 찾기        /store/commerce/products          (현 PharmacyB2BPage)
  주문 워크테이블       /store/commerce/order-worktable   (hidden 해제)
  공급사 목록           /store/commerce/products/suppliers  (Mock 해결 후)
  고객 주문             /store/commerce/orders            (API 연결 후)
  태블릿 주문 요청      /store/channels/tablet            (hidden 해제)
  정산/결제             /store/billing                    (API 연결 후)

[STORE_DISPLAY]
  매장 진열 상품        /store/commerce/products/b2c      (hidden 해제, PharmacySellPage)
  자체 상품             /store/commerce/local-products
  태블릿 디스플레이     /store/commerce/tablet-displays   (hidden 해제)
  매장 사이니지         /store/marketing/signage          (URL 재정의 권고)
  채널 집행             /store/channels                   (hidden 해제)
  자산 허브             /store/content                    (StoreAssetsPage)
  자료실                /store/operation/library
  매장 레이아웃         /store/settings/layout
  매장 템플릿           /store/settings/template          (hidden 해제)

[EXTERNAL_PROMOTION]
  QR 관리               /store/marketing/qr
  POP 자료              /store/marketing/pop
  블로그                /store/content/blog
  마케팅 분석           /store/analytics/marketing
  제품 홍보 자산        /store/commerce/products/:id/marketing  (제품 상세에서 진입)
```

---

## 7. URL 재정의 권고 (선택적 — 큰 변경)

현재 URL prefix 는 의미론과 맞지 않음:
- `/store/marketing/signage` — **marketing** 인데 실제로는 매장 내 디스플레이
- `/store/operation/library` — **operation** 은 이 라우트만 사용
- `/store/content/blog` — content 는 cross-cutting

**권고 — V2 에서 고려 (V1 에서는 Legacy Redirect 방식 유지):**

| 현재 URL | 권고 URL |
|---------|---------|
| `/store/marketing/signage` | `/store/display/signage` |
| `/store/commerce/tablet-displays` | `/store/display/tablet` |
| `/store/channels` | `/store/display/channels` |
| `/store/operation/library` | `/store/display/library` (또는 최상위 `/store/library`) |
| `/store/content/blog` | `/store/promotion/blog` |
| `/store/marketing/qr` | `/store/promotion/qr` |
| `/store/marketing/pop` | `/store/promotion/pop` |
| `/store/analytics/marketing` | `/store/promotion/analytics` |
| `/store/commerce/orders` | `/store/order/customer` |
| `/store/commerce/order-worktable` | `/store/order/worktable` |
| `/store/commerce/products` | `/store/order/catalog` |
| `/store/commerce/products/suppliers` | `/store/order/suppliers` |
| `/store/commerce/products/b2c` | `/store/display/listings` |
| `/store/commerce/local-products` | `/store/display/local-products` |

**주의:** URL 재정의는 Legacy Redirect 추가로 보상 가능하나 **fragile**. V1 재배치에서는 URL 유지 + 사이드바만 재구성을 강력 권고.

---

## 8. 문제 Top 5

### P1. 사이드바-홈카드-hidden 라우트 삼자 불일치 (IA 거짓 신호)

- 사이드바에 `주문 관리` 가 있으나 실 동작 없음 (StoreOrdersPage PARTIAL)
- hidden 라우트 중 대형 기능 3건 (Channels 911, Sell 856, OrderWorktable 694 LOC) — 사용자 도달 불가
- 홈 KPI 의 "진열 상품 수" 는 PharmacySellPage 가 관장하나 진입점 없음

### P2. URL prefix 의미론 파괴

- `/marketing/signage` 는 매장 내 디스플레이이고 `/content/blog` 는 외부 발행. prefix 와 기능의 관계가 일관되지 않음.
- `operation` prefix 는 library 만을 위한 단독 카테고리.

### P3. "상품/주문" 단일 그룹이 3가지 다른 목적 혼재

- 공급사로부터의 **B2B 구매** (PharmacyB2BPage + OrderWorktable)
- **매장 자체 상품** 관리 (LocalProducts)
- **B2C 고객 주문** 수신 (StoreOrdersPage)

4-분류로 나누면 이 3가지가 각각 ORDER / STORE_DISPLAY / ORDER 로 분해되어야 함.

### P4. Mock 페이지의 존재

- `SupplierListPage` / `SupplierDetailPage` 는 100% Mock. 공급사 기능 전체가 WIP.
- hidden 이라 사용자 도달 불가이긴 하나, 정비 시 "삭제할 것인가 / 구현 완료할 것인가" 결정 필요.

### P5. PARTIAL 상태 2건이 사이드바 정책과 충돌

- StoreOrdersPage: 사이드바 노출 + API 없음 → **거짓 약속**. hidden 하거나 "준비중" 배너 필요.
- StoreBillingPage: hidden + API 없음 → 현재는 안전하나 실제로 활성화하려면 API 선행 필요.

---

## 9. 삭제/숨김/이동 후보 요약

### 9.1 이동 (Move) — 사이드바 그룹 재배치만 변경, URL 유지

| 페이지 | 현재 그룹 | 새 분류 |
|--------|----------|---------|
| 매장 사이니지 | 콘텐츠 | STORE_DISPLAY |
| 자체 상품 | 상품/주문 | STORE_DISPLAY |
| 상품 관리 (PharmacyB2BPage) | 상품/주문 | ORDER (공급 상품 찾기) |
| 주문 관리 | 상품/주문 | ORDER |
| 레이아웃 빌더 | 설정 | STORE_DISPLAY |
| 자료실 | 콘텐츠 | STORE_DISPLAY |
| 블로그 | 콘텐츠 | EXTERNAL_PROMOTION |
| 마케팅 분석 | 분석 | EXTERNAL_PROMOTION |

### 9.2 숨김 해제 (Unhide) — hidden 해제 + 사이드바 추가

| 페이지 | 현재 | 조건 |
|--------|------|------|
| **StoreChannelsPage** | hidden 911LOC | 역할이 매장 디스플레이 관리자와 겹치는지 확인 후 결정 |
| **PharmacySellPage** | hidden 856LOC | 매장 진열 상품 관리 진입점 필요 |
| **StoreOrderWorktablePage** | hidden 694LOC | B2B 주문의 핵심 워크테이블 |
| **StoreTabletDisplaysPage** | hidden | 태블릿 디스플레이 설정 진입점 필요 |
| **TabletRequestsPage** | hidden | 고객 태블릿 주문 요청 처리 |
| **PharmacyTemplatePage** | hidden | 매장 템플릿 선택 진입점 |
| **StoreAssetsPage** | hidden | 자산 허브 |
| **StoreContentEditPage** | hidden | (content 에디터 진입은 자산 상세에서 — 유지) |
| **PharmacyStorePage** | hidden | 매장 설정 진입점 |

### 9.3 숨김 유지 (Keep Hidden)

| 페이지 | 사유 |
|--------|------|
| StoreBillingPage | API 미연결 — 준비 후 노출 |
| SupplierListPage / SupplierDetailPage | Mock — 실 API 구현 후 노출 |

### 9.4 삭제 (Delete)

- **현재 감사 기준으로는 삭제 후보 없음.** 모든 페이지가 용도가 명확하거나 WIP 상태. 구조 개선 WO 진행 후 재검토 권고.

### 9.5 조건부 노출 (Conditional Show)

| 페이지 | 조건 |
|--------|------|
| StoreOrdersPage | 주문 API 연결 시 사이드바 노출 유지. 연결 전까지 "준비중" 배너 필요 |

---

## 10. 다음 WO 를 위한 정리 메모

### 10.1 선행 조건 (재배치 WO 전에 해결 권장)

1. **StoreOrdersPage 의 "거짓 신호" 제거** — 사이드바 항목에 "준비중" 표시 또는 임시 hidden 처리.
2. **홈 KPI 의 "진열 상품 수" 진입점 확보** — PharmacySellPage 접근 경로 정의.
3. **Channels vs Sell vs TabletDisplays vs Signage 역할 매트릭스 정의** — 4개 기능의 책임 경계 문서화 (각각 어떤 상품/자산이 어떤 채널로 흐르는지).

### 10.2 재배치 WO 초안 제안

| WO 이름 후보 | 내용 |
|--------------|------|
| WO-STORE-SIDEBAR-4CATEGORY-RESTRUCTURE-V1 | 사이드바 섹션을 HOME/ORDER/STORE_DISPLAY/EXTERNAL_PROMOTION 4개로 재구성 (URL 유지) |
| WO-STORE-HIDDEN-ROUTES-UNHIDE-V1 | 대형 hidden 페이지 (Channels/Sell/OrderWorktable 등) 사이드바 노출 또는 의도적 hidden 유지 결정 |
| WO-STORE-HOME-CARDS-REALIGN-V1 | 홈 카드 6개를 새 4-분류 체계에 맞추어 재정렬 (카드 수 조정 포함) |
| WO-STORE-SUPPLIER-MOCK-REAL-V1 | SupplierList/Detail 의 Mock → 실 API 전환 (선행 조건: 공급사 API 스펙) |
| WO-STORE-ORDERS-API-V1 | StoreOrdersPage 의 B2C 주문 API 구현 + 사이드바 정식 노출 |

### 10.3 재배치 WO 에서 **하지 말아야** 할 것

- URL 변경 (V1 에서는 사이드바 구성만 변경, URL 유지)
- 페이지 분할/통합 (각 페이지는 현 상태 유지)
- 신규 기능 추가 (기존 기능의 재배치만)
- 공개 스토어프론트 (`/store/:slug/*`) 건드리기 (완전 별개 시스템)
- `packages/store-ui-core` 의 다른 서비스용 config 건드리기 (glycopharm, cosmetics 영향 주의)

---

## 부록 A. 주요 파일 위치

| 영역 | 경로 |
|------|------|
| 라우트 정의 | `services/web-kpa-society/src/App.tsx` (645~721 라인) |
| Layout Wrapper | `services/web-kpa-society/src/App.tsx` (284~325 라인, `KpaStoreLayoutWrapper`) |
| 사이드바 Config | `packages/store-ui-core/src/config/storeMenuConfig.ts` (`KPA_SOCIETY_STORE_CONFIG`) |
| Capability 필터 | `packages/store-ui-core/src/config/menuCapabilityMap.ts` |
| 사이드바 컴포넌트 | `packages/store-ui-core/src/components/StoreSidebar.tsx` |
| Capability Hook | `services/web-kpa-society/src/hooks/useStoreCapabilities.ts` |
| 홈 페이지 | `services/web-kpa-society/src/pages/pharmacy/StoreHomePage.tsx` |
| 페이지 디렉터리 | `services/web-kpa-society/src/pages/pharmacy/` (28개 관리자 페이지) |
| 공개 스토어프론트 | `services/web-kpa-society/src/pages/store/` + `services/web-kpa-society/src/pages/storefront/` |

## 부록 B. 조사 범위 외

이번 감사에서 **의도적으로 제외된** 영역:

- 공개 스토어프론트 (`/store/:slug/*`) — 별개 시스템, 이번 IA 정비와 무관
- KPA 커뮤니티 영역 (`/forum`, `/lms`, `/content`, `/hub`) — `/store` 밖
- Operator / Admin 영역 (`/operator`, `/admin`)
- 로그인/회원가입/마이페이지 (`/login`, `/mypage` 등)
- 다른 서비스 (glycopharm, k-cosmetics 등)

---

*조사자: Claude (Opus 4.6)*
*조사 일자: 2026-04-16*
*조사 근거: 3개 병렬 Explore agent 결과 + App.tsx 라우트 직접 검증 + 28개 페이지 LOC/기능 확인*
*범위: KPA Society `/store/*` 인증 영역 — 수정 없음, 판정/재분류만 수록*

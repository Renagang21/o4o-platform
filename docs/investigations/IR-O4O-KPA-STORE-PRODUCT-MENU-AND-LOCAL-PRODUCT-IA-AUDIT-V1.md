# IR-O4O-KPA-STORE-PRODUCT-MENU-AND-LOCAL-PRODUCT-IA-AUDIT-V1

> 유형: 조사 (read-only) / 상태: 원인·구조 확정, 후속 WO 결정 대기
> 작성일: 2026-06-26 / 범위: KPA (web-kpa-society), GP/KCos 는 영향 메모만
> 코드/route/DB 변경 없음

---

## 1. 결론 요약 (먼저)

- **"내 매장 제품"(`/my-products`) 과 "매장 자체 제품"(`/commerce/local-products`) 은 중복이 아니다.** 서로 **다른 테이블·다른 제품 생태계**다.
  - `/my-products` → `organization_product_listings` (O4O **ProductMaster** 기반, 매장이 공급사 제품을 **취급 listing** 한 것).
  - `/commerce/local-products` → `store_local_products` (매장이 **직접 등록**한 자체 제품, Display Domain, Checkout 비연결).
  - 판정: **§6.3 의 C(서로 다른 데이터/목적)**. 일부 D(과거/신규 혼재 인상)·E(타블렛 그룹에 제품 관리가 섞임) 성격도 있음.
- **타블렛(`/commerce/tablet-displays`) 은 제품을 등록/수정하지 않는다.** product-pool(공급사 listing + 자체 제품 혼합) 중 **노출 선택·순서·표시 설정만** 하는 **활용 채널**이다.
- **"매장 취급제품" 단일 기준 목록**은 현재 **단일 테이블이 없다.** `organization_product_listings`(O4O 취급) + `store_local_products`(자체) **두 소스의 합**이 곧 "매장이 취급하는 전체 제품"이며, 통합 뷰는 미제공.
- **타블렛 메뉴를 '약국 경영지원' 하위로 이동**하는 것은 성격상 타당(거래가 아닌 노출/화면 구성). 단, 현재 '타블렛' 그룹에 제품 **기준 관리 메뉴**(my-products, local-products)가 함께 들어 있어 **이동 전에 제품 메뉴를 거래 영역으로 분리**해야 함.
- 권장 후속: **B안(기준 제품 관리 ↔ 채널 노출 설정 분리)** 을 1차로, "매장 취급제품 통합 뷰"는 두 테이블 합산이라 **별도 설계(C안 요소)** 로 분리.

---

## 2. 현재 KPA 사이드바 구조 (`storeMenuConfig.ts` KPA 블록, line 255–344)

```
약국 상품·거래
  - O4O 제품        /commerce/products            (PharmacyB2BPage)
  - 발주 내역       /commerce/orders
  - 신청·승인 현황   /commerce/recruitment-applications
약국 경영지원
  - 상품 설명       /marketing/product-descriptions
  - 블로그          /content/blog
  - POP            /marketing/pop
  - QR-code        /marketing/qr
약국 자료함 (콘텐츠 / 자료)
디지털 사이니지 (…)
온라인 판매
  - 판매 설정       /online-sales/settings
  - 판매 상품       /online-sales/products       (StoreChannelsPage section=products)
  - 주문 관리       /online-sales/orders
타블렛
  - 내 매장 제품     /my-products                 (StoreProductsManagerPage)   ← 제품 기준관리
  - 매장 자체 제품   /commerce/local-products      (StoreLocalProductsPage)     ← 제품 기준관리
  - 타블렛 구성     /commerce/tablet-displays     (StoreTabletDisplaysPage)    ← 노출 선택
판매 채널 확장 · 분석 · 설정
```

> KPA 는 **자체 config 객체**(line 255~). GP/KCos 블록(line 93~, 195~)에도 my-products/local-products 가 있으나 **별도 블록**이라 KPA 블록 변경은 GP/KCos 무영향(Shared Module Protocol 상 안전). 단 `StoreLocalProductsPage`·`StoreProductsManagerPage`·`StoreTabletDisplaysPage` 컴포넌트/route/API 는 공유이므로 컴포넌트 수정 시 전 서비스 영향.

---

## 3. 제품 관련 메뉴 — route / component / API / 데이터 모델 매핑

| 메뉴 | route(/store~) | component (파일) | 주요 API (함수 · path) | 데이터 모델/테이블 | 기능 성격 | 등록/수정/삭제 |
|---|---|---|---|---|---|---|
| **내 매장 제품** | `/my-products` | `StoreProductsManagerPage` (`@o4o/store-products-ui`) | `searchStoreProducts`·`createStoreListing`·`updateStoreListing` (`GET/POST/PATCH /api/v1/store/products`) | `organization_product_listings` (ProductMaster 참조) | 기준관리(O4O 제품 취급 등록) + 채널 노출 토글 | 등록○(O4O검색→listing)/수정○/삭제✕(비활성) |
| **매장 자체 제품** | `/commerce/local-products` | `StoreLocalProductsPage` (`pages/pharmacy/`) + 공유 `StoreLocalProductsManager` | `fetchLocalProducts`·`createLocalProduct`·`updateLocalProduct`·`deleteLocalProduct` (`GET/POST/PUT/DELETE /api/v1/store/local-products`) | `store_local_products` (Display Domain, Checkout 비연결) | 기준관리(자체 제품 완전 CRUD) | 등록○/수정○/삭제○ |
| **타블렛 구성** | `/commerce/tablet-displays` | `StoreTabletDisplaysPage` (`pages/pharmacy/`) | `fetchProductPool`·`fetchTabletDisplays`·`saveTabletDisplays` (`GET /api/v1/store/product-pool`, `GET/PUT /api/v1/store/tablets/:id/displays`) | `store_tablets`(디바이스) + 진열 항목. **풀 = supplier listing + local 혼합** | 노출 선택(기존 제품 진열·순서·표시설정) | 등록✕/선택·순서○ |
| **온라인 판매 > 판매 상품** | `/online-sales/products` | `StoreChannelsPage` (`section="products"`) | `fetchChannelProducts`·`addProductToChannel`·`activate/deactivate` (`/store-hub/channel-products/:channelId…`) | `organization_product_channels` (listing 의 채널 노출 매핑) | 노출 선택(listing 의 B2C 진열) | 등록✕(listing만)/활성·순서○ |
| **약국 상품·거래 > O4O 제품** | `/commerce/products` | `PharmacyB2BPage` (`pages/pharmacy/`) | `getCatalog`·`applyBySupplyProductId`·`getListings`·`updateListing` (`/pharmacy/products/{catalog,apply,listings}`) | `organization_product_listings` (Supplier ProductMaster/Offer) | 기준관리(공급사 카탈로그 신청 → listing) | 신청○/수정○/취소(삭제✕) |

데이터 엔티티 위치:
- `store_local_products` — `apps/api-server/src/routes/platform/entities/store-local-product.entity.ts`
- `organization_product_listings` — `apps/api-server/src/modules/store-core/entities/organization-product-listing.entity.ts`
- `organization_product_channels` — `…/organization-product-channel.entity.ts`

엔티티 관계:
```
ProductMaster(O4O 마스터) → organization_product_listings(매장 취급) → organization_product_channels(채널 노출)
store_local_products(매장 자체) ─┐
organization_product_listings ──┴→ product-pool(타블렛 진열 소스, 혼합)
```

---

## 4. "내 매장 제품" 메뉴는 실제로 몇 개인가? (§6.1)

| 기준 | 개수 | 비고 |
|---|---|---|
| 사이드바 라벨 | **1개** (`내 매장 제품`, /my-products) | + 인접한 `매장 자체 제품`(/commerce/local-products) 이 함께 있어 사용자에게 "제품 메뉴 2개"로 인지됨 |
| route | **2개** | `/my-products`, `/commerce/local-products` (서로 다른 페이지) |
| component | **2개** | `StoreProductsManagerPage`(공유 패키지), `StoreLocalProductsPage`(KPA 페이지) |
| API | **2계열** | `/api/v1/store/products`(listings) vs `/api/v1/store/local-products`(local) |
| 데이터 모델 | **2개** | `organization_product_listings` vs `store_local_products` |

→ "내 매장 제품"이라는 **이름의 메뉴는 1개**지만, **제품을 등록·관리하는 메뉴는 타블렛 그룹에 2개**(my-products + local-products)다. 사용자가 느낀 "두 곳"은 이 둘이다.

---

## 5. 두 메뉴 비교표 (§6.2 / §10)

| 비교 항목 | 내 매장 제품 (/my-products) | 매장 자체 제품 (/commerce/local-products) | 판단 |
|---|---|---|---|
| 메뉴 위치 | 타블렛 그룹 | 타블렛 그룹 | 인접(혼동) |
| route | `/store/my-products` | `/store/commerce/local-products` | 다름 |
| component | StoreProductsManagerPage(@o4o/store-products-ui) | StoreLocalProductsPage(pages/pharmacy) | 다름 |
| API | `/api/v1/store/products` | `/api/v1/store/local-products` | 다름 |
| 데이터 모델 | organization_product_listings | store_local_products | 다름 |
| 제품 출처 | **O4O ProductMaster(공급사 제공)** | **매장 직접 입력(자체)** | 다름 |
| 등록 | O4O 검색 → listing 생성 | 폼 직접 생성 | 다름 |
| 수정 | ○ | ○ | — |
| 삭제 | ✕(비활성) | ○ | 다름 |
| 타블렛 노출 관련 | listing 도 product-pool 에 포함 | local 도 product-pool 에 포함 | 둘 다 진열 소스 |
| 온라인몰 배치 관련 | ○(channel-products) | △(Display Domain — Checkout 비연결) | 다름 |
| **결론** | **O4O 공급사 제품 취급 목록** | **매장 자체 제품 목록** | **중복 아님 / 서로 다른 기능·데이터(C)** |

---

## 6. "매장 취급제품" 용어 적용 가능성 (§6.4)

- "약국이 실제 취급하는 전체 제품" = `organization_product_listings`(O4O 취급) **∪** `store_local_products`(자체). **현재 이 합집합을 보여주는 단일 화면/테이블은 없다.**
- 따라서 용어 정리는 가능하나, **단일 기준 목록(통합 뷰)** 을 만들려면 두 소스를 합치는 **신규 화면/조회**가 필요(데이터 모델 통합이 아니라 **조회 통합**으로 시작 권장 — 두 테이블 의미가 달라 물리 통합은 위험).
- 명칭 정리 제안:
  - `O4O 제품`(/commerce/products) = 플랫폼 제공·신청 (현행 유지, 이미 라벨 정리됨).
  - `내 매장 제품`(/my-products) = O4O 취급 listing → 혼동 줄이려면 **"취급 중인 O4O 제품"** 류로 구체화 검토.
  - `매장 자체 제품`(/commerce/local-products) = 유지.
  - `매장 취급제품`(신규 통합 관점) = 위 둘의 합을 보는 상위 개념 — **1차엔 용어/그룹 정리, 통합 뷰는 후속**.

---

## 7. 타블렛 메뉴 이동 가능성 (§6.5)

- 타블렛 구성(/commerce/tablet-displays)은 **거래(B2B/주문)와 무관**, 제품을 **노출/화면 구성**하는 채널(POP·QR·블로그·사이니지와 동일 "활용" 성격). → **'약국 경영지원' 하위 이동은 성격상 타당.**
- 단, 현재 '타블렛' 그룹에 **제품 기준 관리 2종(my-products, local-products)** 이 섞여 있음. 이동 시 **제품 관리 메뉴는 '약국 상품·거래'로, 노출 설정(타블렛 구성)만 활용 영역으로** 분리해야 IA 가 깨끗해짐.
- route/page 변경 없이 **메뉴 그룹(label/위치)만 재배치** 가능(storeMenuConfig KPA 블록 한정). 데드링크 0.

---

## 8. 구현 필요 범위 / 위험

| 변경 | 범위 | 위험 |
|---|---|---|
| 메뉴 그룹 재배치(타블렛 그룹의 제품 메뉴를 약국 상품·거래로, 타블렛 구성을 약국 경영지원으로) | `storeMenuConfig.ts` **KPA 블록만** | 낮음(라벨/위치) — route/page/API 불변, GP/KCos 무영향 |
| 라벨 정비("매장 취급제품" 등) | KPA 블록 | 낮음 |
| **매장 취급제품 통합 뷰**(listings + local 합산 조회) | 신규 화면 + 조회 API | 중(두 소스 페이지네이션/정렬/노출플래그 상이) — 별도 설계 필요 |
| 데이터 모델 물리 통합 | store-core | **높음(비권장)** — 의미·도메인(Commerce vs Display) 상이, F-레벨 영향 |

**핵심 위험**: `StoreLocalProductsPage`/`StoreProductsManagerPage`/`StoreTabletDisplaysPage` 는 **공유 컴포넌트** → 컴포넌트 자체 수정은 GP/KCos 영향. **메뉴 재배치(config)는 KPA 블록 한정이라 안전.**

---

## 9. §3 중점 질문 답변 요약

| # | 질문 | 답 |
|---|---|---|
| 6.1 | "내 매장 제품" 몇 개? | 라벨 1, route/component/API/model 기준 **제품 관리 화면 2개**(my-products + local-products) |
| 6.2/6.3 | 같은 기능인가? | **다름** — O4O 취급 listing vs 자체 등록(서로 다른 데이터/목적, C) |
| 6.4 | "매장 취급제품" 통합 가능? | 용어/그룹 정리 가능. **단일 목록은 두 테이블 합산 조회 신규 개발 필요**(물리 통합 비권장) |
| 6.5 | 타블렛을 경영지원으로 이동? | **가능·타당**(노출 채널). 단 제품 관리 메뉴를 거래 영역으로 먼저 분리 |

---

## 10. 권장 후속 WO 분류 (§11)

- **B안(권장 1차) — IA 재배치 + 명칭 정리** : `WO-O4O-KPA-STORE-PRODUCT-MENU-IA-REORG-V1`
  - 약국 상품·거래에 제품 기준 관리(O4O 제품 / 매장 자체 제품) 묶기, 타블렛은 '약국 경영지원'으로 이동해 **노출 설정(타블렛 구성)만** 남김. storeMenuConfig **KPA 블록 라벨/그룹만** 변경(route/page/API/DB 무변경, redirect 불필요). 데드링크 0.
- **C안(후속) — "매장 취급제품" 통합 뷰** : `WO-O4O-KPA-STORE-HANDLED-PRODUCTS-UNIFIED-VIEW-V1`
  - `organization_product_listings` + `store_local_products` 를 **하나의 "매장 취급제품" 목록으로 조회**(채널 노출 플래그 표시). 물리 통합 아님 — 조회/표시 레이어. 별도 설계 IR 선행 권장.
- A안(단순 중복 제거)은 **해당 없음** — 두 메뉴가 다른 데이터라 제거 대상 아님.

---

## 11. 완료 기준 대비

- 제품 관련 메뉴 전수 식별 ✅ (§2·§3)
- "내 매장 제품"/"매장 자체 제품" 차이 설명 ✅ (§5, 중복 아님=C)
- "매장 취급제품" 적용 가능성 판단 ✅ (§6 — 용어/그룹 가능, 통합 뷰는 후속)
- 타블렛 이동 가능성 판단 ✅ (§7 — 가능, 제품 메뉴 선분리 조건)
- 구현 범위 A/B/C 분류 ✅ (§10 — B 1차 + C 후속, A 해당없음)
- read-only(코드 무변경) ✅

---

## 12. 참고 파일

- 메뉴: `packages/store-ui-core/src/config/storeMenuConfig.ts` (KPA 블록 255–344, 타블렛 그룹 321–328)
- 페이지: `services/web-kpa-society/src/pages/pharmacy/{StoreLocalProductsPage,StoreTabletDisplaysPage,PharmacyB2BPage}.tsx`, `packages/store-products-ui`(StoreProductsManagerPage)
- API: `api/{localProducts,tabletDisplays,channelProducts,pharmacyProducts}.ts`, `packages/store-products-ui/src/api.ts`
- 엔티티: `store-local-product.entity.ts`, `modules/store-core/entities/organization-product-{listing,channel}.entity.ts`
- 선행 IR: `IR-O4O-KPA-STORE-LOCAL-PRODUCT-CREATE-VALIDATION-AUDIT-V1.md` (local product 생성 API·메뉴 접근 동선)

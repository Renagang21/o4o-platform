# CHECK — WO-O4O-CROSSSERVICE-B2B-SUPPLIER-TO-STORE-ORDER-CANONICAL-CONTRACT-V1

> **작업일**: 2026-08-25 ~ 2026-08-26
> **유형**: cross-service census + canonical contract 확정 + 결함 수정 + 회귀 가드
> **산출 계약 문서**: [`docs/baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md`](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md)
> **회귀 가드**: `apps/api-server/src/__tests__/b2b-supplier-to-store-order-canonical-contract.spec.ts` (20 tests)

---

## 0. 요약

5개 서비스(KPA Society · GlycoPharm · K-Cosmetics · PharmacyHub · Neture)와 공통 모듈에 흩어진
B2B 주문 · 발주 · 공급 신청 흐름을 current main 기준으로 전수조사했다.

- **살아 있는 공급자→매장 B2B 주문 축은 3개**이고, 셋 다 `store_cart_items` → `checkout_orders` 로 수렴한다.
- 결함 **4건(D1~D4)** 을 발견해 전부 수정했다.
- canonical contract 를 baseline 문서로 확정하고 회귀 가드 스펙 20개를 붙였다.

**POS 는 본 작업 전 범위에서 명시적 OUT_OF_SCOPE 다** — §11 참조. POS 코드는 한 줄도 작성하지 않았다.

| 최종 수치 | 값 |
|---|---|
| `UNJUDGED` | **0** |
| `UNKNOWN` | **0** |
| `DEFERRED` | **4** (DF-1 ~ DF-4, 전부 판정 완료·실행만 유보) |
| consumer commerce 재유입 | **0** |
| cross-service leak | **0** (D1 수정 후) |
| ownership leak | **0** |
| 실제 consumer PG write | **0** |
| POS 개발 | **0** |

---

## 1. 선행 문서 확인 (§2)

`docs/baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md` 를 먼저 읽고 작업했다.

동 문서는 **소비자→매장 commerce** 를 금지한다. 그 금지선은 **공급자→매장 B2B 주문에 적용되지 않는다**
(동 문서 §12 "B2B vs 소비자 order"). 따라서 본 작업에서 B2B 주문 코드를 소비자 commerce 로 혼동해
제거하지 않았다. 오히려 반대로, B2B 축을 **보호 대상으로 명문화**하는 baseline 문서를 새로 만들었다.

---

## 2. Route / API census (§8)

`UNJUDGED = 0` · `UNKNOWN = 0`.

### 2-1. 공통 B2B 장바구니 — `apps/api-server/src/routes/cart/store-cart.routes.ts`

| service | route | method | actor | buyer axis | seller axis | serviceKey | authorization | W/R | consumer | disposition |
|---|---|---|---|---|---|---|---|---|---|---|
| 공통 | `/api/v1/store/cart/:serviceKey/items` | GET | Store | 인증 user | — | path param | auth + **active membership** | R | store-ui-core `useStoreCart` | `B2B_CANONICAL` |
| 공통 | `/api/v1/store/cart/:serviceKey/items` | POST | Store | 인증 user | offer 의 supplier | path param | auth + membership | W | 동일 | `B2B_CANONICAL` |
| 공통 | `/api/v1/store/cart/:serviceKey/items/:id` | PATCH | Store | 인증 user | — | path param | auth + membership | W | 동일 | `B2B_CANONICAL` |
| 공통 | `/api/v1/store/cart/:serviceKey/items/:id` | DELETE | Store | 인증 user | — | path param | auth + membership | W | 동일 | `B2B_CANONICAL` |
| 공통 | `/api/v1/store/cart/:serviceKey` | DELETE | Store | 인증 user | — | path param | auth + membership | W | 동일 | `B2B_CANONICAL` |
| 공통 | `/api/v1/store/cart/:serviceKey/groups` | GET | Store | 인증 user | 공급자별 묶음 | path param | auth + membership | R | 동일 | `B2B_CANONICAL` |
| 공통 | `/api/v1/store/cart/:serviceKey/checkout-preview` | GET | Store | 인증 user | 공급자별 | path param | auth + membership | R | 동일 | `B2B_CANONICAL` |
| 공통 | `/api/v1/store/cart/:serviceKey/checkout-confirm` | POST | Store | 인증 user | 공급자별 분리 생성 | path param | auth + membership | W | KPA/GP/KCos | `B2B_CANONICAL` (Axis A) |
| 공통 | `/api/v1/store/cart/:serviceKey/checkout-confirm-b2b` | POST | Store | 인증 user | 공급자별 | path param + 서비스 내부 `'neture'` 하드 게이트 | W | web-neture | `B2B_CANONICAL` (Axis B) |

### 2-2. 매장(buyer) 주문 조회

| service | route | method | actor | buyer | seller | serviceKey | authz | W/R | consumer | disposition |
|---|---|---|---|---|---|---|---|---|---|---|
| KPA | `/api/v1/kpa/checkout/orders` | GET | Store | 인증 user | — | 마운트 고정 | auth + service scope | R | `web-kpa-society/api/checkout.ts` | `B2B_COMMONIZABLE` |
| KPA | `/api/v1/kpa/checkout/orders/:orderId` | GET | Store | 인증 user | — | 마운트 고정 | 동일 | R | 동일 | `B2B_COMMONIZABLE` |
| KPA | `POST /api/v1/kpa/checkout` | — | — | — | — | — | — | — | — | `DEAD` — 소비자 주문 생성 leg, **라우트 제거(404)** |
| GlycoPharm | `/api/v1/glycopharm/checkout/orders(/:id)` | GET | Store | 인증 user | — | 마운트 고정 | auth + service scope | R | `web-glycopharm/api/store.ts` | `B2B_COMMONIZABLE` |
| GlycoPharm | `/api/v1/glycopharm/checkout/cleanup-expired` | POST | Operator | — | — | 마운트 고정 | 운영 write scope guard | W | 운영 | `B2B_SERVICE_SPECIFIC` |
| K-Cosmetics | `/api/v1/cosmetics/orders(/:id)` | GET | Store | 인증 user | — | 마운트 고정 | auth + service scope | R | `web-k-cosmetics/api/storeOrders.ts` | `B2B_COMMONIZABLE` (경로만 불일치 → DF-1) |
| K-Cosmetics | `POST /api/v1/cosmetics/orders` | POST | — | — | — | — | — | — | — | `LEGACY_CONSUMER_COMMERCE` — **410 `STORE_CONSUMER_ORDER_RETIRED`** (production 확인) |

### 2-3. PharmacyHub (Axis C) — `routes/pharmacy-hub/pharmacy-hub.routes.ts`

| route | method | actor | buyer | seller | serviceKey | authz | W/R | disposition |
|---|---|---|---|---|---|---|---|---|
| `/pharmacy-hub/store-owner/products(/:offerId)` | GET | Store | 인증 user | 공급자 offer | 서버 고정 `'pharmacy-hub'` | `storeOwnerGuards` | R | `B2B_CANONICAL` |
| `/pharmacy-hub/store-owner/cart` | GET | Store | 인증 user | 공급자별 묶음 | 서버 고정 | `storeOwnerGuards` | R | `B2B_CANONICAL` |
| `/pharmacy-hub/store-owner/cart/items` | POST | Store | 인증 user | 공급자 | 서버 고정 | `storeOwnerGuards` | W | `B2B_CANONICAL` |
| `/pharmacy-hub/store-owner/cart/items/:itemId` | PATCH/DELETE | Store | 인증 user | — | 서버 고정 | `storeOwnerGuards` | W | `B2B_CANONICAL` |
| `/pharmacy-hub/store-owner/orders` | POST | Store | 인증 user | 공급자별 | 서버 고정 | `storeOwnerGuards` | W | `B2B_CANONICAL` |
| `/pharmacy-hub/store-owner/orders(/:orderId)` | GET | Store | 인증 user | — | 서버 고정 | `storeOwnerGuards` | R | `B2B_CANONICAL` |
| `/pharmacy-hub/store-owner/payments/prepare` · `/confirm` | POST | Store | 인증 user | — | 서버 고정 | `storeOwnerGuards` | W | `B2B_CANONICAL` (live payment producer `pharmacy-hub`) |
| `/pharmacy-hub/store-owner/orders/:orderId/cancel` | POST | Store | 인증 user | — | 서버 고정 | `storeOwnerGuards` | W | `B2B_CANONICAL` (결제 전) |
| `/pharmacy-hub/store-owner/payments/:paymentGroupId/cancel` | POST | Store | 인증 user | — | 서버 고정 | `storeOwnerGuards` | W | `B2B_CANONICAL` (결제 후·공급자 접수 전) |
| `/pharmacy-hub/operator/fulfillment/stuck` | GET | Operator | — | — | 서버 고정 | `operatorGuards` | R | `B2B_SERVICE_SPECIFIC` (복구 전용) |
| `/pharmacy-hub/operator/fulfillment/:orderId/recover` | POST | Operator | — | — | 서버 고정 | `operatorGuards` | W | `B2B_SERVICE_SPECIFIC` (복구 전용 — 대리 발주 아님) |
| `/pharmacy-hub/store-owner/local-products*` | * | Store | — | — | 서버 고정 | `storeOwnerGuards` | W/R | **주문 축 아님** (매장 자체 상품) |
| `/pharmacy-hub/store-owner/handled-products*` | * | Store | — | — | 서버 고정 | `storeOwnerGuards` | W/R | **주문 축 아님** (매장 경영활용 제품) |

### 2-4. 공급자(seller) 측 — `modules/neture/`

| route | method | actor | authz | W/R | disposition |
|---|---|---|---|---|---|
| `/api/v1/neture/supplier/orders` | GET | Supplier | `requireAuth` + `requireLinkedSupplier` | R | `B2B_CANONICAL` |
| `/api/v1/neture/supplier/orders/summary` · `/kpi` · `/unified` | GET | Supplier | 동일 | R | `B2B_CANONICAL` |
| `/api/v1/neture/supplier/orders/:id` | GET | Supplier | 동일 | R | `B2B_CANONICAL` |
| `/api/v1/neture/supplier/orders/:id/status` | PATCH | Supplier | `requireAuth` + `requireActiveSupplier` | W | `B2B_CANONICAL` |
| `/api/v1/neture/supplier/orders/:orderId/shipment` | POST | Supplier | `requireActiveSupplier` | W | `B2B_CANONICAL` |
| `/api/v1/neture/supplier/orders/:orderId/shipment` | GET | Supplier | `requireLinkedSupplier` | R | `B2B_CANONICAL` |
| `/api/v1/neture/supplier/services/:serviceKey/orders(/:orderId)` | GET | Supplier | supplier + `SUPPLIER_OPTIN_SERVICE_KEYS` 게이트 | R | `B2B_CANONICAL` (Axis C 공급자 뷰) |
| `/api/v1/neture/supplier/services/:serviceKey/orders/:orderId/accept` · `/ship` | POST | Supplier | 동일 | W | `B2B_CANONICAL` |
| `/api/v1/neture/supplier/services/:serviceKey/products(/:offerId/delivery)` | GET/PATCH | Supplier | 동일 | W/R | `B2B_CANONICAL` |
| `/api/v1/neture/supplier/event-offer-proposals*` | * | Supplier | supplier scope | W/R | `EVENT_OR_PROMOTION_FLOW` (Axis A 상품 공급원) |
| `/api/v1/neture/suppliers/:id/order-condition` | GET | Store/Supplier | `requireAuth` | R | `B2B_CANONICAL` (가격/최소주문 조건 소스) |
| `POST /api/v1/neture/supplier/requests` (취급 요청) | — | — | — | — | `DEAD` — 엔드포인트·테이블 모두 제거됨 → 결함 D4 |

### 2-5. 은퇴 확인 (production HTTP 실측)

프로덕션 호스트 `https://api.neture.co.kr` 기준.

| 경로 | 실측 | 판정 |
|---|---|---|
| `/health` | 200 | 호스트 확인 |
| `POST /api/v1/cosmetics/orders` | **410 `STORE_CONSUMER_ORDER_RETIRED`** | 소비자 주문 은퇴 유지 |
| `POST /api/v1/kpa/checkout/orders` | **404** | 라우트 제거 유지 |
| `POST /api/v1/glycopharm/checkout/orders` | **404** | 라우트 제거 유지 |
| `/api/v1/ecommerce/*` | **404** | 서버에 존재하지 않음 → 결함 D2 근거 |
| `/api/v1/store/cart/*` | **401** | 마운트됨 · fail-closed |
| `/api/v1/pharmacy-hub/store-owner/*` | **401** | 마운트됨 · fail-closed |

> `/api/v1/neture/supplier/*` 는 라우터 레벨 `requireAuth` 때문에 **존재 여부와 무관하게 401** 을 반환한다.
> 따라서 이 구역은 HTTP probe 로 라우트 존재를 확인할 수 없다. 정적 분석 + `git log -S` 로 확정했다.
> (실측으로 확인되지 않은 것을 확인된 것처럼 쓰지 않는다.)

---

## 3. Frontend census (§9)

동일 라벨이라도 **실제 호출 API** 로 판정했다.

| 서비스 | 화면 / 모듈 | 호출 API | 판정 |
|---|---|---|---|
| 공통 | `packages/store-ui-core/.../store-cart/createStoreCartApi.ts` · `useStoreCart.ts` | `/api/v1/store/cart/:serviceKey/*` | `B2B_CANONICAL` · **FULLY_COMMON** |
| 공통 | `packages/store-ui-core/.../order-ledger/BuyerOrderLedgerView.tsx` | 서비스별 주문 조회 주입 | `B2B_CANONICAL` · **FULLY_COMMON (view)** |
| 공통 | `packages/store-ui-core/.../event-offers/*` | event-offer 조회 | `EVENT_OR_PROMOTION_FLOW` |
| 공통 | `packages/store-ui-core/src/config/storeMenuConfig.ts` | 메뉴 정의 | 전 항목 라우트 마운트 확인 — **dead link 0** |
| KPA | `pages/pharmacy/StoreOrdersPage.tsx` · `api/checkout.ts` | `/kpa/checkout/orders` | `B2B_CANONICAL` |
| KPA | `pages/pharmacy/StoreOrderWorktablePage.tsx` (관심상품 주문 작업대) | 조회 + canonical 장바구니 안내 | `B2B_SERVICE_SPECIFIC` — 주문 실행 leg 은 이미 은퇴, 화면은 의도적 보존 (DF-3) |
| KPA | `api/eventOffer.ts` | event-offer 조회 | `EVENT_OR_PROMOTION_FLOW` |
| GlycoPharm | `pages/store-management/PharmacyOrders.tsx` · `api/store.ts` | `/glycopharm/checkout/orders` | `B2B_CANONICAL` |
| GlycoPharm | `pages/store-management/b2b-order/B2BOrderPage.tsx` | `/glycopharm/b2b/products?type=…` (조회만) | `APPLICATION_NOT_ORDER` (조회 leg) + `DEAD` (제거된 취급 신청 write → D4) |
| GlycoPharm | `components/layouts/DashboardLayout.tsx` SUPPLIER 메뉴 | `/supplier*` → `RoleNotAvailablePage` | `DEAD` → D3 에서 제거 |
| K-Cosmetics | `pages/store/StoreOrdersPage.tsx` · `api/storeOrders.ts` | `/cosmetics/orders` | `B2B_CANONICAL` |
| K-Cosmetics | `api/operatorOrders.ts` · `StoreRevenueSummaryPage.tsx` | 운영자 주문 조회 | `B2B_SERVICE_SPECIFIC` |
| PharmacyHub | `pages/store-owner/{CartPage,OrdersPage,OrderDetailPage,ProductDetailPage}.tsx` | `/pharmacy-hub/store-owner/*` | `B2B_CANONICAL` |
| PharmacyHub | `pages/store-owner/{PaymentPage,PaymentSuccessPage,PaymentFailPage}.tsx` | `/pharmacy-hub/store-owner/payments/*` | `B2B_CANONICAL` (B2B 결제 — 소비자 PG 아님) |
| Neture | `lib/api/storeCart.ts` · `pages/store/StoreCartPage.tsx` | `/store/cart/neture/*` + `checkout-confirm-b2b` | `B2B_CANONICAL` |
| Neture | `lib/api/seller.ts` `createHandlingRequest` | `POST /neture/supplier/requests` (서버에 없음) | `DEAD` → D4 에서 제거 |
| admin-dashboard | `src/api/unified-client.ts` `ecommerce = {products, orders, cart}` | `/api/v1/ecommerce/*` (404) | `LEGACY_CONSUMER_COMMERCE` → D2 에서 제거 |

**route guard / deep link**: 서비스 프론트의 B2B 메뉴 항목은 전부 마운트된 라우트를 가리킨다.
GlycoPharm `/supplier`, `/supplier/*` 는 404 가 아니라 `RoleNotAvailablePage` 로 고정돼 있다
(= "이 서비스에는 공급자 역할이 없다" 는 계약의 표현). **404 dead link 0.**

---

## 4. Entity / table census (§27)

| 테이블 / 엔티티 | 소유 | 역할 | 판정 |
|---|---|---|---|
| `store_cart_items` (`StoreCartItem.entity.ts`) | 공통 | **B2B 장바구니** | `B2B_CANONICAL` · 보호 대상 |
| `checkout_orders` | 공통 | **canonical 주문 원장** (3축 전부 수렴) | `B2B_CANONICAL` |
| `neture_orders` | Neture | **공급자 fulfillment 원장** (bridge 파생) | `B2B_CANONICAL` |
| `event_offer` 계열 | 공통 | Axis A 상품/offer 소스 | `EVENT_OR_PROMOTION_FLOW` |
| `service_memberships` | Core (F11) | membership 판정 정본 | authorization 소스 |
| `role_assignments` | Core (F9) | role 판정 정본 | authorization 소스 |
| `store_local_products` | Store Ops | 매장 자체 상품 | **주문 축 아님** (§7-3) |
| 공급자 취급 요청 테이블 | — | 취급 요청 | `DEAD` — migration `20260226000002` 에서 drop |

**신규 테이블 0 · migration 0.**

---

## 5. Producer–Consumer matrix (§28)

| producer | 산출 | consumer |
|---|---|---|
| `EventOfferCartCheckoutService` | `checkout_orders` (Axis A) | KPA/GP/KCos 매장 주문 조회 |
| `NetureB2BCartCheckoutService` | `checkout_orders` (Axis B, pending) | 결제 → bridge |
| `PharmacyHubCartCheckoutService` | `checkout_orders` (Axis C) | 결제 → bridge |
| 결제 완료 이벤트 | `checkout_orders.paid` | `CheckoutFulfillmentBridgeService` |
| `CheckoutFulfillmentBridgeService` | `neture_orders` | 공급자 주문 화면 (Neture) |
| `getBuyerOrderServiceKeys(platformServiceKey)` | retail + event-offer key set | 매장 주문 조회 컨트롤러 3벌 (단일 정의 — 중복 정의 0) |

**live payment producer 3개 한정** — `pharmacy-hub` · `neture-b2b` · `store-service-subscription`.
본 작업에서 producer 를 추가하지 않았다.

---

## 6. 발견 결함 및 수정

### D1 — 공통 B2B 장바구니의 cross-service leak (심각)

- **위치**: `apps/api-server/src/routes/cart/store-cart.routes.ts`
- **내용**: 라우터가 **인증만** 요구하고 경로의 `:serviceKey` 에 대한 membership 을 확인하지 않았다.
  어떤 서비스에도 소속되지 않은 인증 사용자가 임의 `serviceKey` 의 장바구니를 만들고
  `checkout-confirm` 으로 **B2B 주문까지 생성**할 수 있었다.
- **수정**: `resolveScope` 말미에 `hasActiveServiceMembership(dataSource, buyerId, serviceKey)` 게이트를
  추가하고 실패 시 `403 SERVICE_MEMBERSHIP_REQUIRED` 를 반환한다. 판정 정본은 DB(`service_memberships`)
  이며 JWT 스냅샷을 쓰지 않는다. DB 오류도 통과가 아니다(fail-closed).
- **부수**: 파일 헤더 docblock 을 "이 cart 는 B2B cart 다" 로 명문화하고 9개 라우트를 전부 나열했다.

### D2 — admin-dashboard 의 소비자 commerce API client 잔재

- **위치**: `apps/admin-dashboard/src/api/unified-client.ts`
- **내용**: `ecommerce = { products, orders, cart }` 블록이 `/api/v1/ecommerce/*` 를 가리켰다.
  **프로덕션 실측 결과 해당 경로는 전부 404** — 서버에 존재하지 않는 소비자 commerce 잔재였다.
- **수정**: 블록 제거 + 재추가 금지 주석.

### D3 — GlycoPharm 공급자 메뉴 dead config

- **위치**: `services/web-glycopharm/src/components/layouts/DashboardLayout.tsx`
- **내용**: `[GLYCOPHARM_ROLES.SUPPLIER]` 메뉴 블록(대시보드/상품 관리/주문 현황/설정)이 남아 있었다.
  (1) 이 레이아웃은 `App.tsx` 에서 ADMIN / CONSUMER 로만 렌더링되므로 도달 불가능한 dead config 였고,
  (2) 가리키던 `/supplier*` 는 `App.tsx` 에서 `RoleNotAvailablePage` 로 고정돼 있었다.
- **수정**: 메뉴 블록 제거 + 미사용 아이콘 import(`Truck`, `Package`, `ShoppingCart`) 제거 + 근거 주석.
- **주의**: 이 라우트들은 **404 dead link 가 아니다.** 조사 중 초기 판단(404)이 틀렸음을 확인하고
  주석과 회귀 가드를 사실에 맞게 고쳤다.

### D4 — 은퇴한 공급자 취급 요청(handling request) 축의 프론트 잔재 2건

- **서버 사실**: `POST /api/v1/neture/supplier/requests` 는 커밋 `9798e2d80`
  (`WO-NETURE-SUPPLIER-OFFERS-DEAD-CODE-REMOVAL-V1`, 2026-04-25) 에서 제거됐고
  관련 테이블은 migration `20260226000002` 에서 drop 됐다.
  전수 검색(`grep -rnE "\.(post)\(\s*['\"\`][^'\"\`]*requests['\"\`]"`) 결과 어떤 `/supplier` 마운트에도
  `POST /requests` 가 없다.
- **수정 1**: `services/web-glycopharm/src/services/api.ts` — `supplierRequestApi.createHandlingRequest` 제거.
- **수정 2**: `services/web-glycopharm/src/pages/store-management/b2b-order/B2BOrderPage.tsx` —
  '취급 요청' 버튼 · `handleRequestHandling` 핸들러 · 관련 state 3개 · 미사용 import 제거.
- **수정 3**: `services/web-neture/src/lib/api/seller.ts` — `sellerApi.createHandlingRequest` 제거(호출부 0).
- **대체 기능을 새로 만들지 않았다** (§22). canonical 축은
  `/api/v1/store/cart/glycopharm/*` → `checkout-confirm` → `/api/v1/glycopharm/checkout/orders` 다.

---

## 7. 공통화 판단 (§24)

| 대상 | 분류 | 근거 |
|---|---|---|
| B2B 장바구니 저장/서비스 (`store_cart_items` · `StoreCartService`) | **FULLY_COMMON** | 3축 전부 재사용. PharmacyHub 도 자체 테이블 없이 재사용 |
| 프론트 장바구니 API/hook (`store-ui-core` `createStoreCartApi` · `useStoreCart`) | **FULLY_COMMON** | 서비스별 복제 없음 |
| 매장 주문 원장 뷰 (`BuyerOrderLedgerView`) | **FULLY_COMMON** | 뷰는 이미 공통 |
| 주문 원장 (`checkout_orders`) | **FULLY_COMMON** | 서비스별 주문 테이블 0 |
| 매장 buyer 주문 **조회 컨트롤러** (KPA / GP / KCos) | **VIEW_DUPLICATED** → `B2B_COMMONIZABLE` | 3벌 중복. 다만 경로·scope guard 가 서비스별로 달라 동시 회귀 필요 → **DF-4 로 유보** |
| PharmacyHub 라우트 표면 (`/store-owner/cart`·`/orders`·`/payments`) | **SERVICE_SPECIFIC** | 공용 라우트로는 Pharmacy-Hub 역할 가드를 걸 수 없다. 저장은 canonical 재사용이므로 정당 |
| 공급자(seller) 주문 화면 | **CORE_ONLY (Neture 단일)** | Neture 가 canonical. 타 서비스 복제 금지 |
| serviceKey → event-offer 매핑 (`CART_TO_EVENT_OFFER_SERVICE_KEY`) | **FULLY_COMMON** | 단일 상수 |
| `getBuyerOrderServiceKeys` | **FULLY_COMMON** | retail + event-offer key set 단일 정의 |
| 부분 출고 · 반품 RMA · 여신 | **NOT_IMPLEMENTED** | 현재 O4O 에 없다. 만들지 않았다 |
| POS · 외부 판매채널 주문 API | **OUT_OF_SCOPE** | §11 · §12 |

**무조건 공통화하지 않았다.** 하나의 Order 모델로 강제 통합하지 않았고, 단순 신청서를 주문으로
재해석하지 않았다(GlycoPharm b2b-order 조회 leg 은 `APPLICATION_NOT_ORDER` 로 남겼다).

---

## 8. Canonical lifecycle · cart · 상품 소스 · 가격/배송/취소

전부 **기존 코드에서 추출**했고 새 상태를 만들지 않았다. 상세는 계약 문서
[`O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1`](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md) §6 · §7 참조.

- **cart 판정**: `store_cart_items` 는 **B2B cart** 다. 담는 주체는 매장 경영자, 대상은 공급자 offer.
  소비자 cart 금지선 대상이 아니며 **보호 대상**으로 명문화했다. 대규모 rename 은 하지 않았고
  주석·문서 최소 정리만 했다.
- **상품/offer 소스**: Axis A = `event_offer`(운영자 승인형), Axis B/C = 공급자 등록 공급 상품(opt-in형).
  `StoreLocalProduct` 는 **주문 가능한 offer 가 아니다** — 혼동하지 않았다.
- **가격**: 공급자 offer + `GET /neture/suppliers/:id/order-condition`. **새 pricing engine 0.**
- **배송**: 공급자 `POST /supplier/orders/:orderId/shipment` · `/services/:serviceKey/orders/:orderId/ship`.
- **취소**: 결제 전 단건 / 결제 후·공급자 접수 전 결제그룹 전체. 접수 후 취소 경로는 없고 만들지 않았다.
  **PG refund 코드와 연결하지 않았다** (§23).

---

## 9. 재유입 차단 · 회귀 가드

`apps/api-server/src/__tests__/b2b-supplier-to-store-order-canonical-contract.spec.ts` — **20 tests, 전부 통과.**

스캔 모집단은 `apps/api-server/src` · `apps/admin-dashboard/src` · 5개 서비스 프론트 `src` ·
`packages/store-ui-core/src` 이며 파일 수 하한 가드(`> 2000`)를 둬서 모집단이 조용히 줄어드는 것을 막는다.

주요 가드:

- 은퇴한 supplier handling-request 축 재유입 차단 (D4)
- GlycoPharm 공급자 화면 축 재유입 차단 (D3) — `RoleNotAvailablePage` 고정도 함께 단언
- `/api/v1/ecommerce/*` client 재유입 차단 (D2)
- B2B 장바구니 membership 게이트 존재 단언 (D1)
- serviceKey 하드코딩(`COALESCE(... service_key, 'neture')`) SSOT 이탈 차단
- 소비자 commerce 은퇴 코드(`STORE_CONSUMER_ORDER_RETIRED` 등) 유지 단언

> 주석 스트리퍼는 블록 주석(JSX `{/* */}` 포함)과 줄 주석을 모두 제거하되 URL 의 `//` 는 살린다.
> 조사 중 이 처리가 없어 오탐이 발생했고, 고친 뒤 재검증했다.

**consumer commerce 재유입 0 · cross-service leak 0 · ownership leak 0.**

---

## 10. 검증 결과

| 항목 | 결과 |
|---|---|
| 계약 회귀 스펙 | **20/20 통과** |
| `tsc --noEmit` — api-server · admin-dashboard · web-glycopharm · web-neture | **통과** |
| api-server jest 전체 (최종) | **204/204 suites · 3416/3416 tests 통과** |
| admin-dashboard vitest 전체 | **229/229 통과** |
| production smoke (`https://api.neture.co.kr`) | §2-5 표대로 전부 기대값 일치 |

### 10-1. 작업 중 있었던 무관한 실패 (해소됨)

작업 중간에 `apps/api-server/src/__tests__/main-site-appstore-parallel-axis-retirement.spec.ts` 의
3개 테스트가 `ENOENT ... apps/main-site/src/components/registry/function.ts` 로 실패했다.

원인은 **다른 세션이 진행 중이던 `apps/main-site/src/**` 삭제**였고 본 작업의 변경이 아니다.
표준 규칙(다른 세션 WIP `수정 금지 / restore 금지 / stash 금지 / stage 금지`)에 따라 손대지 않았다.
해당 세션이 작업을 마감하면서 자연 해소됐고, **최종 전체 실행은 204/204 통과**다.
숨기지 않고 경과를 기록한다.

### 10-2. 브라우저 smoke (§30)

프론트 변경 3건(D3·D4)은 전부 **제거**이고 새 화면·새 호출을 만들지 않았다.
타입 체크 통과 + 라우트 마운트 정적 확인 + 프로덕션 API 실측으로 검증했다.
새 UI 동작을 추가하지 않았으므로 별도의 시나리오 클릭 검증 대상이 없다.

---

## 11. POS — 명시적 OUT_OF_SCOPE (§3)

본 작업에서 **POS 관련 코드·설계·문서를 일절 만들지 않았다.**

| 항목 | 본 작업 처리 |
|---|---|
| POS API 연동 | 하지 않음 (OUT_OF_SCOPE / FUTURE) |
| POS 상품 동기화 · 판매 데이터 수집 | 하지 않음 |
| POS 재고 연동 · 결제 연동 | 하지 않음 |
| POS vendor 선정 · adapter 설계 · schema 설계 · prototype | 하지 않음 |

**B2B 주문 구조를 POS 를 전제로 설계하지 않았다.** 계약 문서 §1-1 에 POS 를
**현재 비개발 영역**으로 명문화했고, "B2B 주문 구조를 설명하기 위해 POS 연동을 선행조건으로 넣지 않는다"
는 규칙을 문서에 고정했다.

**POS 개발 0.**

---

## 12. 외부 판매채널 (§26)

네이버 · 쿠팡 등 외부 판매채널 주문 API 는 **OUT_OF_SCOPE** 다.
census 에서 `EXTERNAL_CHANNEL` 로 분류만 하고 코드에 손대지 않았다. 보호도 제거도 하지 않았다.

---

## 13. Production DB census

**`NO_PRODUCTION_DB_CENSUS`**

`apps/api-server/.env` 의 DB 설정은 `DB_HOST=localhost` / `DB_PORT=5432` 로 **로컬 개발 DB** 를 가리킨다.
`SETUP.md` 기준 프로덕션 접속은 Cloud SQL Auth Proxy(포트 5442) + 별도 자격증명이 필요하며,
본 세션에는 그 자격증명이 제공되지 않았다.

- 우회하지 않았다. 비밀 값을 탐색하거나 출력하지 않았다 (env 변수 **이름**만 확인).
- 과거 실측 수치를 현재 실측인 것처럼 쓰지 않았다.
- 실사용 B2B 주문 생성이나 상태 변경을 하지 않았다 (안전한 fixture 부재).
- **실제 consumer PG write 0 · 실제 PG 결제/환불 0.**

DB 대신 **프로덕션 HTTP 실측**(§2-5)과 정적 분석 + git 이력으로 census 를 확정했다.

---

## 14. 문서 정합 (CLAUDE.md §16)

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 4건 (DF-1 ~ DF-4)
```

- 신규 baseline 문서 1건 추가: `docs/baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md`
- **현재 canonical contract 와 충돌하는 기준 문서는 발견되지 않았다.**
  `O4O-STORE-COMMERCE-BOUNDARY-V1` 은 §12 에서 이미 B2B 를 분리해 두고 있어 충돌이 없다.
- **과거 CHECK 의 역사적 사실을 소급 수정하지 않았다** (`docs/checks/**` 는 §16-1 상 정비 대상 아님).
- CLAUDE.md 색인 줄 추가는 §16-4 상 인라인 금지 항목이므로 하지 않고 **여기서 제안**한다:
  Priority Chain / 상세 규칙 문서 목록에 본 계약 문서를 등재할지 여부는 별도 판단이 필요하다.

---

## 15. 최종 수치

| 지표 | 값 |
|---|---|
| 조사한 서비스 | 5 (KPA Society · GlycoPharm · K-Cosmetics · PharmacyHub · Neture) + 공통 모듈 |
| 살아 있는 B2B 주문 축 | 3 (Axis A / B / C) |
| route census `UNJUDGED` | **0** |
| 분류 `UNKNOWN` | **0** |
| `DEFERRED` | **4** (DF-1 ~ DF-4) |
| 발견 결함 | 4 (D1 ~ D4) — **전부 수정** |
| 신규 테이블 · migration | **0** |
| 신규 주문 상태 | **0** |
| 신규 pricing / 금융 기능 | **0** |
| consumer commerce 재유입 | **0** |
| cross-service leak | **0** |
| ownership leak | **0** |
| 404 dead link | **0** |
| 실제 consumer PG write | **0** |
| POS 개발 | **0** |

---

## 16. 변경 파일

```text
A  apps/api-server/src/__tests__/b2b-supplier-to-store-order-canonical-contract.spec.ts
M  apps/api-server/src/routes/cart/store-cart.routes.ts                       (D1)
M  apps/admin-dashboard/src/api/unified-client.ts                             (D2)
M  services/web-glycopharm/src/components/layouts/DashboardLayout.tsx         (D3)
M  services/web-glycopharm/src/pages/store-management/b2b-order/B2BOrderPage.tsx (D4)
M  services/web-glycopharm/src/services/api.ts                                (D4)
M  services/web-neture/src/lib/api/seller.ts                                  (D4)
A  docs/baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md               (§32)
A  docs/checks/WO-O4O-CROSSSERVICE-B2B-SUPPLIER-TO-STORE-ORDER-CANONICAL-CONTRACT-V1-CHECK.md
```

path-specific stage 만 사용했다. `git add .` 를 쓰지 않았고 다른 세션의 WIP(`apps/main-site/**` 등)에
접촉하지 않았다.

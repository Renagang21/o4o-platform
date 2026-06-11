# CHECK-O4O-NETURE-B2B-LEGACY-SELLER-ORDER-ROUTE-RETIREMENT-V1

> **판정: PASS**
> WO: `WO-O4O-NETURE-B2B-LEGACY-SELLER-ORDER-ROUTE-RETIREMENT-V1` (P2e — legacy buyer order route retirement)
> 작성일: 2026-06-04
> commit: `e5c6052c3`

---

## 1. 목적

Neture B2B buyer 의 legacy 직접 주문 생성 route `POST /api/v1/neture/seller/orders` 를 **410 Gone** 으로 비활성화한다. buyer 주문은 canonical Store Cart 에서 공급자별 배송비가 포함된 **장바구니 총액을 결제**하고, 결제 완료 후 공급자별 주문으로 분리되어 supplier fulfillment bridge 로 전달된다. legacy route 는 더 이상 주문을 생성하지 않는다.

> "1회 결제" 표현 미사용 — "장바구니 결제 / 장바구니 총액 결제" 기준.

---

## 2. 변경 파일 목록

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/modules/neture/controllers/seller.controller.ts` | `POST /orders` handler → 410 Gone (legacyNetureService.createOrder 미호출). +27 / −39 |

신규 API 없음 / DB migration 없음 / frontend 수정 없음.

---

## 3. Retired route

```
POST /api/v1/neture/seller/orders
```

- mount: `apps/api-server/src/modules/neture/neture.routes.ts:185` → `router.use('/seller', createSellerController(dataSource))`
- handler: `seller.controller.ts:322` `router.post('/orders', requireAuth, ...)`
- 미들웨어 `requireAuth` 유지 (auth-first).

### 응답 (410)

```json
{
  "success": false,
  "code": "NETURE_B2B_LEGACY_SELLER_ORDER_RETIRED",
  "message": "B2B 주문은 장바구니 결제를 통해 진행해 주세요.",
  "canonicalAction": "store_cart_checkout_b2b",
  "canonicalRoute": "/api/v1/store/cart/neture/checkout-confirm-b2b"
}
```

---

## 4. 호출처 검색 결과 (§4)

### 4.1 frontend (web-neture buyer)

```
grep -R "seller/orders" services/web-neture/src
grep -R "createOrder|submitOrder|storeApi.createOrder" services/web-neture/src
```

- `lib/api/store.ts:334` `createOrder()` — **API client 메서드 정의만 잔존** (POST /neture/seller/orders). **runtime 호출 0건** (`.createOrder(` invocation 검색 결과 web-neture src 내 0건).
- `lib/api/store.ts:352/363/374` — GET 계열(list/shipment/detail) read 메서드, 보존 대상.
- buyer cart 결제 경로 = `lib/api/storeCart.ts:101` `POST .../checkout-confirm-b2b` (canonical). StoreCartPage 는 canonical Store Cart 사용 (P2d-2 cutover, commit `e4ace2ec4` / `CHECK-O4O-NETURE-B2B-CANONICAL-CART-CHECKOUT-PHASE1-V1`).
- 결론: **buyer UI runtime 호출 0건** (§4.1 만족 — API client 정의 잔존은 §4.1 허용 범위).

### 4.2 backend handler

- POST handler 단일 위치 = `seller.controller.ts:322`. 내부에서 `legacyNetureService.createOrder()` (구 라인 339) 호출.

### 4.3 retire vs 보존 구분

| 구분 | route | 상태 |
|------|-------|------|
| **retire** | `POST /seller/orders` | 410 Gone |
| 보존 | `GET /seller/orders` (`seller.controller.ts:237`) | 무변경 |
| 보존 | `GET /seller/orders/:id` (`:265`) | 무변경 |
| 보존 | `GET /seller/orders/:orderId/shipment` (`:293`) | 무변경 |
| 보존 | `GET /supplier/orders/unified` 등 supplier fulfillment | 무변경 |

GET handler 들은 각각 독립 handler → POST 차단이 read 에 무영향.

---

## 5. service.createOrder 미호출 확인 (§9.3)

- `legacyNetureService.createOrder` 호출처 전수: `apps/api-server/src` 내 **`seller.controller.ts:339` 단 하나** (retire 대상 handler). 410 교체로 호출 경로 제거됨.
- 코드 경로: handler 진입 즉시 410 반환 → `neture_orders` insert / 재고 차감 / referral attribution / 공급자 노출 **진입 불가**.
- 타 createOrder 경로(무관, 미변경):
  - `extensions/trial-fulfillment/trialFulfillment.controller.ts:235` → `netureService.createOrder` (trial, **별도 controller/route**)
  - `services/cart/neture-b2b-cart-checkout.service.ts:292` → `checkoutService.createOrder` (canonical 장바구니 결제 경로)
  - `controllers/checkout/checkoutController.ts:110` 등 canonical checkout

---

## 6. 보존한 legacy service / route 목록 (§7)

```
legacyNetureService.createOrder    (neture.service.ts:501) — 미삭제
neture_orders / neture_order_items entity — 미삭제 (supplier fulfillment record 로 사용 중)
GET /seller/orders, /seller/orders/:id, /seller/orders/:orderId/shipment — 미변경
GET /supplier/orders, /supplier/orders/unified, supplier fulfillment routes — 미변경
trial fulfillment create-order route — 미변경
```

---

## 7. 검증 결과

### 7.1 TypeScript (§9.1)

- 본 변경(`seller.controller.ts`)으로 인한 **신규 tsc 에러 0**.
- `apps/api-server` tsc 에 `marketTrialController.ts:162` (`CreateTrialDto.productId`) 에러 1건 존재하나, **본 WO 변경과 무관한 pre-existing 이슈** — 변경분 stash 후에도 동일하게 검출됨(독립 baseline). 본 WO 범위(§3 제외) 및 다른 세션 WIP 불간섭 원칙에 따라 미수정.

### 7.2 live graceful smoke (§9.4) — 배포 `e5c6052c3` 후 (api.neture.co.kr)

| # | 요청 | 기대 | 실제 |
|---|------|------|------|
| 1 | `POST /neture/seller/orders` no-auth | 401 | **401** `AUTH_REQUIRED` |
| 2 | `POST /neture/seller/orders` authed | 410 | **410** `NETURE_B2B_LEGACY_SELLER_ORDER_RETIRED` (canonicalAction/Route 포함). 유효 items payload 전송에도 410 단락 → **주문 미생성** |
| 3 | `GET /neture/supplier/orders/unified` no-auth | 401 | **401** (mount/auth 정상, 500 없음) |
| 4 | `GET /neture/seller/orders` no-auth | 401 | **401** (read route 보존) |

→ route mount + auth-first 정상, controller 410 반환, seller/supplier read route 500 없음.

### 7.3 browser/network smoke (§9.5)

- buyer flow 의 canonical 전환 및 `/neture/seller/orders` 호출 0건은 **P2d-2 (`CHECK-O4O-NETURE-B2B-CANONICAL-CART-CHECKOUT-PHASE1-V1`)** 에서 확인됨. 본 WO 에서는 §4.1 정적 재확인(`.createOrder(` invocation 0건 + cart 가 `checkout-confirm-b2b` 사용)으로 갈음.

---

## 8. 회귀 무영향 (§10)

canonical Store Cart / checkout-confirm-b2b / paymentGroupId 결제 / paid bridge / supplier unified order view / supplier fulfillment status·shipment / settlement guard / KPA·Glyco·KCos — **무변경** (단일 파일, POST handler 한정 변경).

---

## 9. 완료 기준 대조 (§11)

| # | 기준 | 결과 |
|---|------|------|
| 1 | POST route 위치 확인 | ✅ seller.controller.ts:322 |
| 2 | buyer UI 호출 0건 재확인 | ✅ runtime 0건 (정의만 잔존) |
| 3 | 410 Gone 비활성화 | ✅ |
| 4 | authed → `NETURE_B2B_LEGACY_SELLER_ORDER_RETIRED` | ✅ live 410 |
| 5 | legacyNetureService.createOrder 미호출 | ✅ |
| 6 | neture_orders 직접 생성 없음 | ✅ (410 단락) |
| 7 | GET/read/fulfillment 무변경 | ✅ |
| 8 | api-server tsc | ✅ 신규 에러 0 (marketTrial pre-existing 무관) |
| 9 | live smoke | ✅ |
| 10 | buyer network 0건 / P2d-2 참조 | ✅ P2d-2 참조 + 정적 재확인 |
| 11 | CHECK 문서 | ✅ 본 문서 |
| 12 | path-specific commit | ✅ seller.controller.ts 1파일 |
| 13 | 다른 세션 WIP 불간섭 | ✅ WIP 2파일 unstaged 보존 |

---

## 10. 후속 (§13)

- `CHECK-O4O-NETURE-B2B-CANONICAL-END-TO-END-POSITIVE-SMOKE-V1` — 테스트 계정/유효 SPO/Toss sandbox 확보 시 전체 흐름 실측
- `WO-O4O-NETURE-B2B-CART-LEGACY-LOCALSTORAGE-CLEANUP-V1` — lib/cart.ts 등 미사용 helper + store.ts `createOrder` 정의 제거
- `WO-O4O-NETURE-B2B-LEGACY-SELLER-ORDER-ROUTE-REMOVE-V2` — 일정 기간 호출 0건 확인 후 route 완전 삭제
- `WO-O4O-NETURE-ORDER-SOURCE-LINK-COLUMN-V2` — bridge idempotency hardening
- (무관) `marketTrialController.ts:162` CreateTrialDto.productId tsc 에러 — 별도 정리 대상

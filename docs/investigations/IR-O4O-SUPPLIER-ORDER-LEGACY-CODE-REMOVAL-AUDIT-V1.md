# IR-O4O-SUPPLIER-ORDER-LEGACY-CODE-REMOVAL-AUDIT-V1

> **유형**: Investigation / Removal Audit (read-only)
> **목적**: O4O 공급자 주문 pipeline 에서 정상 커머스 흐름과 맞지 않는 legacy 주문·배송·정산 코드를 식별하고,
> 삭제·비활성화·canonical flow 수렴 대상을 확정한다.
> **성격**: 코드/DB/API/UI **무변경**. 조사 문서만 작성.
> **상위 기준**: `IR-O4O-STORE-ORDER-PAYMENT-READINESS-MODEL-V1`, `IR-O4O-STORE-CART-PAYMENT-FULFILLMENT-STANDARD-COMMERCE-FLOW-V1`
> **방향**: pre-launch 단계 — legacy 를 guard 로 보호하기보다, 정상 흐름과 맞지 않는 코드는 제거/비활성화/canonical 전환 대상으로 본다.
> **작성일**: 2026-06-11

---

## 1. 요약 판정

| 영역 | 판정 | 핵심 |
|------|------|------|
| buyer 주문 원장 | **checkout_orders 가 canonical** | createOrder 단일 orchestrator. KPA/Glyco/KCos/event-offer-cart 모두 수렴 |
| event_offer participate (4 서비스) | **DISABLE → REMOVE** | route 존재, **frontend 호출 0건**(전부 cart-add 전환됨). service @deprecated. helper 는 KEEP |
| Neture B2B store cart 주문 | **CANONICALIZE (최우선)** | `web-neture StoreCartPage → POST /neture/seller/orders → legacyNetureService.createOrder → neture_orders` **직접 생성**. checkout_orders·결제 우회. **ACTIVE UI** |
| trial fulfillment create-order | **UNKNOWN → KEEP(보류)** | operator-only, 소비자 UI 0건. neture_orders 직접 생성하나 운영 경로 불명확 |
| supplier fulfillment workspace | **KEEP (입력 원천만 수렴)** | 주문 read ACTIVE. shipment 생성/상태변경은 neture UI 호출 0건(DEAD) |
| settlement pipeline | **KEEP** | admin calculate/approve/pay + supplier list/kpi 전부 ACTIVE. delivered-only 는 이미 readiness 로 정정됨 |
| supplier unified view | **KEEP (과도기)** | bridge 후 dedup 필요. 최종은 canonical order + fulfillment status view 로 수렴 |

**핵심 결론:**
1. **buyer 주문은 이미 checkout_orders 로 단일화**되어 있다(event_offer 포함). participate 외부 route 만 dead 잔재.
2. **단 하나의 실질 우회 경로 = Neture B2B store cart** (`/neture/seller/orders`). 이것이 checkout_orders·결제·공급자별 배송비 preview 를 우회하고 neture_orders 를 직접 생성하며, **현재 web-neture UI 에서 ACTIVE**. → bridge 보다 **이 경로의 canonical 전환이 먼저**.
3. fulfillment/settlement workspace·table 은 **downstream asset 으로 보존**. 삭제 대상이 아니라 입력 원천만 checkout_orders 로 수렴.
4. participate 4 route 는 안전하게 DISABLE/REMOVE 가능(FE 호출 0).

---

## 2. canonical 주문 흐름 기준
```
Cart → supplier group → supplier subtotal → supplier shipping preview
→ checkout/payment → checkout_order paid
→ supplier fulfillment downstream(neture_order/shipment) → shipped/delivered
→ settlement readiness → settlement
```
불변식: 주문 생성은 `checkoutService.createOrder`(checkout_orders) 경로. 공급자 분리는 supplierId. 결제 완료 주문만 fulfillment. 정산은 delivered + readiness.

---

## 3. 주문 원장 현황

| 원장 | 역할 | 판정 |
|------|------|------|
| `checkout_orders` (+ `checkout_payments`) | **canonical 주문 원장** | KEEP (canonical) |
| `neture_orders` (+ `neture_order_items`) | 현재 **B2B 주문 원장 겸 fulfillment 원장**(이중 역할) | 주문 원장 역할 → downstream fulfillment record 로 **격하 지향**. 입력은 checkout_orders bridge 로 |
| `neture_shipments` | 송장 | KEEP (downstream) |
| `neture_settlements` / `neture_settlement_orders` | 정산 원장 | KEEP (downstream, readiness 기준) |

> 판정: **neture_orders 는 "주문 원장"이 아니라 "공급자 fulfillment record"로 수렴**한다. 단 현재 B2B store cart 가 직접 생성하므로 즉시 격하 불가 → CANONICALIZE 선행.

---

## 4. 주문 생성 경로 전수 (file:line)

### canonical (checkout_orders) — KEEP
| 경로 | file:line | route | 비고 |
|------|-----------|-------|------|
| `checkoutController.initiate` | `controllers/checkout/checkoutController.ts:110` | POST /api/checkout/initiate | Phase N-1 demo, 하드코딩 supplier |
| KPA B2C checkout | `routes/kpa/controllers/kpa-checkout.controller.ts:480` | POST /kpa/checkout | createCheckoutOrder wrapper |
| Glyco checkout | `routes/glycopharm/controllers/checkout.controller.ts:196` | POST /glycopharm/checkout | manager.save(checkout_orders) |
| KCos order | `routes/cosmetics/controllers/cosmetics-order.controller.ts:370` | POST /cosmetics/orders | manager.save(checkout_orders) |
| **event_offer cart-confirm** | `services/cart/event-offer-cart-checkout.service.ts:261` | POST /store/cart/:serviceKey/checkout-confirm | **canonical buyer event_offer 경로** |
| event_offer participate | `routes/kpa/services/event-offer.service.ts:642` | (참여 route, 4서비스) | **@deprecated**, FE 호출 0 |

### legacy (neture_orders 직접) — CANONICALIZE / UNKNOWN
| 경로 | file:line | route | 판정 |
|------|-----------|-------|------|
| **Neture B2B seller order** | `modules/neture/controllers/seller.controller.ts:339` (`POST /orders`) | POST /neture/seller/orders | **CANONICALIZE** — web-neture StoreCartPage ACTIVE |
| trial fulfillment create-order | `extensions/trial-fulfillment/trialFulfillment.controller.ts:235` | POST /api/trial-fulfillment/:id/create-order | **UNKNOWN→KEEP** — operator-only, 소비자 UI 0 |
| (둘 다) `neture.service.createOrder` | `routes/neture/services/neture.service.ts:501-706` | — | 공통 생성기(6-gate). 격하 대상 함수 |

---

## 5. event_offer participate legacy 감사

- **route 존재 (4 서비스)**: neture `event-offer.controller.ts:108`, kpa `:131`, glyco `:95`, cosmetics `:370`. `participate()` 는 checkout_orders 생성(우회 아님)이나 **주문 단위가 listing 단위로 쪼개짐** → canonical(공급자 단위 병합)과 불일치.
- **frontend 호출**: web-kpa-society/web-glycopharm/web-k-cosmetics 전부 **participate → cart-add 로 전환 완료**, participate 직접 호출 **0건**. web-neture `eventOffer.ts:29` 에 메서드 정의는 있으나 MarketTrial 흐름이며 participate 버튼 없음.
- **service @deprecated** (WO-O4O-EVENT-OFFER-PARTICIPATE-LEGACY-DEMOTION-V1).
- **판정**: 외부 route → **DISABLE(410 Gone / canonical cart 안내) → REMOVE**. **검증/수량차감 helper(`loadEventOfferContext`/`reserveEventOfferListing`/`incrementListingQuantity`)는 cart-confirm 과 공유 → KEEP.**

---

## 6. neture_orders 직접 생성 경로 감사

### 6.1 Neture B2B store cart (CANONICALIZE — 최우선)
- 경로: `web-neture/src/pages/store/StoreCartPage.tsx:524` → `storeApi.createOrder` (`lib/api/store.ts:334-336`) → **`POST /neture/seller/orders`** → `seller.controller.ts:339` → `legacyNetureService.createOrder` → **neture_orders 직접 INSERT**.
- **우회 항목**: checkout_orders, checkout_payments(결제 단계), 공급자별 배송비 preview 표준(canonical Store Cart 와 별개의 자체 cart), payment readiness.
- **현재 상태**: **ACTIVE** — web-neture 의 실제 B2B 매장 입고(STORE_RESTOCK) / 직배송(DIRECT_TO_CUSTOMER) 주문 경로.
- **판정**: **CANONICALIZE** — cart → checkout_orders → fulfillment downstream 으로 전환. 단 B2B 는 온라인 결제가 아닌 **인보이스/오프라인 수금** 가능성이 높아 `collectionStatus` 모델(후속 IR)과 동반 설계 필요. → 즉시 삭제 불가, 단계적 전환.

### 6.2 trial fulfillment (UNKNOWN → KEEP 보류)
- 경로: `trialFulfillment.controller.ts:235` → `netureService.createOrder` → neture_orders. metadata `{source:'trial-fulfillment'}`.
- operator-only(requireOwnerOrOperator), **소비자 UI 호출 0건**. `web-neture/api/trial.ts:763 getFulfillment` 정의되나 page 호출 없음.
- **판정**: **UNKNOWN → KEEP(보류)** — 운영 시연 경로일 수 있어 즉시 손대지 않음. 6.1 canonical 전환 시 동일 createOrder 격하의 영향 범위에 포함하여 재검토.

---

## 7. fulfillment workspace 보존/삭제 판단

- backend `supplier-order.controller.ts` (orders summary/kpi/list/unified/detail/status/shipment) + `supplier-order.service.ts` + `neture_shipments`.
- frontend (web-neture): 주문 **read** ACTIVE (`SupplierOrdersPage` → getOrdersSummary/getUnifiedOrders/getOrderKpi). **shipment 생성·상태변경(`createShipment`/`updateOrderStatus`)은 page 호출 0건(DEAD in UI)** — API/route 는 존재.
- **판정**: workspace **KEEP** (공급자 배송 처리 UI 는 최종 구조에 필요). **입력 원천만 checkout_orders bridge 로 수렴.** shipment 쓰기 경로의 UI 부재는 별도(배송 처리 UI 완성 WO)로 분리.

---

## 8. settlement pipeline 보존/삭제 판단

- backend admin: `POST /admin/settlements/calculate`(:54), approve(:168), pay(:187), cancel. supplier: list/kpi/detail. — **전부 frontend ACTIVE** (`AdminSettlementsPage` handleCalculate/approve/pay, `SupplierSettlementsPage` list/kpi/detail).
- delivered-only 후보 조건은 `WO-O4O-SUPPLIER-SETTLEMENT-READINESS-GUARD-V1` 에서 **이미 delivered + readiness 로 정정**됨(legacy 잔여 없음 확인).
- **판정**: **KEEP** (table/service/route/UI 모두 실사용). 향후 checkout_orders 기반 정산 포함(bridge 후) 또는 readiness 기준 유지.

---

## 9. supplier unified view 과도기 코드 판단

- `supplier-unified-order.service.ts`: neture_orders(canFulfill=true) + checkout_orders(canFulfill=false, read-only) **병렬 표시**. FK/dedup 없음.
- bridge 후 checkout_order 원본과 bridge 된 neture_order 가 **중복 표시 위험**.
- **판정**: **KEEP(과도기)**. bridge 도입 시 dedup cleanup 필요. 장기적으로 "병렬 원장 view" → "canonical order + fulfillment status view" 로 수렴.

---

## 10. route/API 삭제·비활성화 후보

| route | backend | frontend | 판정 |
|-------|---------|----------|------|
| POST /{neture,kpa,glyco,cosmetics}/event-offers/:id/participate | 4 controller | **0건** | **DISABLE→REMOVE** |
| POST /neture/seller/orders | seller.controller:322 | StoreCartPage ACTIVE | **CANONICALIZE** |
| POST /api/trial-fulfillment/:id/create-order | trialFulfillment:235 | 0건(operator-only) | **KEEP(보류)** |
| GET /supplier/orders (non-unified) | supplier-order:69 | unified 로 대체됨 | **DISABLE/DEPRECATE** |
| POST /supplier/orders/:id/shipment, PATCH status | supplier-order | UI 호출 0건 | **KEEP**(배송 UI 후속) — route 유지 |
| /admin/settlements/* , /supplier/settlements/* | settlement controllers | ACTIVE | **KEEP** |

---

## 11. REMOVE / DISABLE / CANONICALIZE / KEEP / UNKNOWN 매트릭스

| 항목 | 분류 | 근거 |
|------|------|------|
| checkoutService.createOrder + checkout_orders | **KEEP (canonical)** | 단일 주문 orchestrator |
| event_offer cart-confirm | **KEEP (canonical)** | canonical buyer event_offer |
| event_offer participate route ×4 | **DISABLE→REMOVE** | FE 호출 0, cart-add 전환 완료 |
| event_offer 검증/차감 helper | **KEEP** | cart-confirm 과 공유 |
| Neture B2B store cart → /neture/seller/orders → neture_orders | **CANONICALIZE** | checkout_orders·결제 우회, ACTIVE UI |
| neture.service.createOrder | **CANONICALIZE(격하)** | B2B/trial 공통 생성기 |
| trial fulfillment create-order | **UNKNOWN→KEEP** | operator-only, UI 0 |
| supplier fulfillment workspace(read) | **KEEP** | ACTIVE |
| supplier shipment 쓰기 route | **KEEP** | UI 부재는 별도 WO |
| GET /supplier/orders(non-unified) | **DISABLE/DEPRECATE** | unified 로 대체 |
| settlement (calculate/approve/pay/list/kpi) | **KEEP** | 전부 ACTIVE, readiness 정정 완료 |
| supplier unified view | **KEEP(과도기)** | bridge 후 dedup |
| neture_orders 원장 역할 | **격하 지향** | fulfillment record 로 수렴 |

---

## 12. 삭제/전환 우선순위

```
P1. event_offer participate route ×4 → DISABLE(410 + cart 안내) → REMOVE      (저위험, FE 0)
P2. Neture B2B store cart → canonical cart/checkout 전환 (CANONICALIZE)        (핵심, collectionStatus 동반)
P3. GET /supplier/orders(non-unified) DEPRECATE                                (저위험)
P4. checkout_order → neture_order fulfillment bridge (P2 이후)                  (guard 선행 완료됨)
P5. supplier unified view dedup cleanup (bridge 이후)
P6. trial fulfillment create-order 재검토 (P2 영향 범위 확인 후)
```
> **bridge(P4)는 P2 이후.** Neture B2B 가 여전히 neture_orders 를 직접 만들면 bridge 만으로는 우회 경로가 남는다.

---

## 13. 후속 WO 제안

1. `WO-O4O-EVENT-OFFER-PARTICIPATE-ROUTE-RETIREMENT-V2` — participate route ×4 DISABLE(410)/REMOVE, helper KEEP.
2. `IR/WO-O4O-NETURE-B2B-ORDER-TO-CANONICAL-CART-CHECKOUT-V1` — `/neture/seller/orders` → checkout_orders 전환 설계(B2B 결제/수금 모델 = collectionStatus 동반).
3. `IR/WO-O4O-ORDER-COLLECTION-STATUS-MODEL-V1` — B2B 인보이스/오프라인 수금 readiness 정식 모델(P2 선결).
4. `WO-O4O-CHECKOUT-ORDER-TO-NETURE-FULFILLMENT-BRIDGE-V1` — paid checkout_order 만 fulfillment downstream 으로 bridge (P2 이후).
5. `WO-O4O-SUPPLIER-UNIFIED-ORDER-VIEW-DEDUPE-CLEANUP-V1` — bridge 후 중복 표시 제거.
6. `WO-O4O-SUPPLIER-ORDERS-LEGACY-LIST-ROUTE-DEPRECATE-V1` — GET /supplier/orders(non-unified) 정리.

---

## 14. 이번 IR 에서 수정하지 않은 것
```
코드 / DB schema / migration / route / API / UI 무변경.
participate route 미삭제, seller order route 미변경, 정산/배송/결제 로직 무변경.
다른 세션 WIP 무접촉.
```
발견된 REMOVE/DISABLE/CANONICALIZE 대상은 기록만 하고, 실행은 §13 후속 WO 로 분리한다.

---

## 15. 최종 기준 문장
buyer 주문은 이미 checkout_orders 로 단일화되어 있고, 정상 흐름과 맞지 않는 실질 우회 경로는 **Neture B2B store cart(`/neture/seller/orders`) 단 하나**다. 따라서 bridge 보다 먼저 이 경로를 canonical cart/checkout 으로 전환(P2)하고, FE 호출이 사라진 event_offer participate route(P1)를 정리해야 한다. fulfillment/settlement workspace 와 table 은 삭제 대상이 아니라 입력 원천을 checkout_orders 로 수렴시킬 downstream asset 으로 보존한다.

---

*Date: 2026-06-11 · Status: 완료 (legacy 주문 경로 전수 + 제거/전환 매트릭스. 핵심: Neture B2B store cart canonical 전환이 bridge 선행).*

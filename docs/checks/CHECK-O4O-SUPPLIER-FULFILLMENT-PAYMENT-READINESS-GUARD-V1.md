# CHECK-O4O-SUPPLIER-FULFILLMENT-PAYMENT-READINESS-GUARD-V1

> 미결제 주문이 공급자 배송 흐름에 진입하지 못하도록 fulfillment readiness guard 도입.
> **V1 범위 한정**: checkout_order-origin / future bridge 주문만 대상. legacy neture_orders 무영향.
> **결과: PASS** — api-server tsc 0 / guard 경로·범위 코드 검증. (positive guard hit 은 checkout-origin neture_order 부재로 deferred — bridge 미구현.) — 2026-06-11
> 상위: `IR-O4O-STORE-ORDER-PAYMENT-READINESS-MODEL-V1`

---

## 1. 변경 파일 (3, backend-only)
| 파일 | 변경 |
|------|------|
| `apps/api-server/src/modules/neture/services/supplier-order.service.ts` | **신규** `getFulfillmentReadiness(orderId)` — checkout-origin 식별 + readiness 판정 |
| `apps/api-server/src/modules/neture/controllers/supplier-order.controller.ts` | PATCH `/orders/:id/status`(preparing/shipped/delivered 전이) + POST `/orders/:orderId/shipment` 에 guard. `FULFILLMENT_TARGET_STATUSES` 상수 |
| `apps/api-server/src/modules/neture/services/supplier-unified-order.service.ts` | checkout_orders `canFulfill=false` **유지** + readOnlyReason 에 payment readiness/bridge 명시 + code comment |

> payment handler / settlement / DB schema / migration / bridge / KPA·Glyco·KCos **무변경**.

## 2. guard 적용 대상 (식별 기준)
checkout-origin 판정 (`getFulfillmentReadiness`):
```
isCheckoutOrigin := metadata.source='checkout_order'
                  | metadata.sourceOrderType='checkout_order'
                  | metadata.checkoutOrderId 존재
```
- **isCheckoutOrigin=false → fulfillmentReady=true 반환** → **legacy neture_orders 는 guard 통과(비대상)**. 기존 Neture B2B `created→preparing` 운영 흐름 그대로 유지.

## 3. readiness 판단 기준 (IR 정합)
```
paymentReady    := metadata.paymentStatus='paid' | metadata.paymentReady=true
collectionReady := metadata.collectionStatus='confirmed'   (V2 collectionStatus 모델 대비)
statusReady(보조):= neture_orders.status='paid' | paid_at not null   (bridge 가 order 자체를 paid 로 세팅한 경우)
fulfillmentReady := paymentReady | collectionReady | statusReady
```
- bridge metadata 계약 future-compatible. 구체 필드는 향후 `WO-O4O-CHECKOUT-ORDER-TO-NETURE-FULFILLMENT-BRIDGE-V1` 와 정렬.

## 4. guard 적용 지점
- **updateOrderStatus(PATCH status)**: 기존 전이표 검사 통과 후, target ∈ {preparing, shipped, delivered} 이고 checkout-origin & not ready → **403 `FULFILLMENT_NOT_PAYMENT_READY`** ("결제 또는 수금 확인 전 주문은 배송 처리를 시작할 수 없습니다.").
- **createShipment(POST shipment)**: 기존 `status='preparing'` 검사 후, checkout-origin & not ready → 동일 403. (상태 전이를 우회한 송장 생성으로 배송 시작되는 경로 차단.)
- **unified view canFulfill**: checkout_orders 는 **bridge 전까지 canFulfill=false 유지**(이번 WO 에서 열지 않음). readOnlyReason: "결제 확인 및 공급자 배송 연결(bridge)이 완료된 주문만 배송 처리할 수 있습니다. checkout 주문 배송 통합은 후속 작업입니다." + code comment 로 readiness 기준 명시.

## 5. 검증
- **api-server tsc 0** ✅
- **guard 경로·범위 코드 검증**:
  - supplier-order 컨트롤러를 통과하는 주문은 `neture_orders`(items→supplier_product_offers join). checkout_orders 는 unified view 에서만 read-only 노출 — 직접 fulfillment 진입 경로 없음.
  - `getFulfillmentReadiness` 가 metadata 마커 없는 주문에 `fulfillmentReady=true` 반환 → legacy 무영향(전이/송장 기존 동작 보존) ✅
  - checkout-origin & not ready 경로만 403 추가 ✅
- **positive guard smoke — DEFERRED**: 현재 `metadata.source='checkout_order'` 인 neture_order 가 존재하지 않음(bridge 미구현). 테스트용 checkout-origin neture_order seed 는 운영 데이터 변경이라 지양(WO §7.3). guard hit 실측은 bridge 도입(`WO-O4O-CHECKOUT-ORDER-TO-NETURE-FULFILLMENT-BRIDGE-V1`) 시 동반 CHECK 로 수행.
- **regression**: legacy neture_orders 전이/송장 무영향, checkout_orders canFulfill=false 유지, payment/settlement 무변경 ✅

## 6. 회귀 무영향
- legacy neture_orders 전체 `created→preparing` 흐름 유지(guard 비대상).
- 기존 supplier orders/KPI/detail/shipment API 동작·응답 구조 무변경(guard 는 checkout-origin & not-ready 에서만 403 신규).
- payment handler / settlement 쿼리 / DB schema / migration / bridge 무변경.

## 7. 완료 기준 체크 (WO §9)
1(대상 checkout-origin 한정) ✅. 2(legacy 유지) ✅. 3(전이 차단) ✅. 4(shipment 차단) ✅. 5(unified canFulfill=false 유지) ✅. 6(reason/comment 명시) ✅. 7(payment/settlement 무변경) ✅. 8(schema/migration 무변경) ✅. 9(tsc 0) ✅. 10(read-only smoke — 코드 경로 검증) ✅. 11(positive guard smoke deferred 기록) ✅. 12(CHECK) ✅. 13(path-specific) ✅. 14(다른 세션 무접촉) ✅.

## 8. 남은 GAP/RISK · 후속
- **positive guard smoke**: bridge 도입 시 checkout-origin neture_order 로 403 실측(동반 CHECK).
- **legacy neture_orders 무가드**: `created→preparing` 결제 미확인 전이는 V1 비대상(B2B 운영 보호). collectionStatus 모델(V2) 도입 후 수렴 → `IR/WO-O4O-ORDER-COLLECTION-STATUS-MODEL-V1`.
- **bridge metadata 계약**: 본 guard 의 식별/readiness 필드(`source`/`checkoutOrderId`/`paymentStatus`/`paymentReady`)는 bridge WO 에서 동일하게 세팅해야 동작. bridge WO 에서 계약 고정 필요.
- 후속: `WO-O4O-SUPPLIER-SETTLEMENT-READINESS-GUARD-V1` → `WO-O4O-CHECKOUT-ORDER-TO-NETURE-FULFILLMENT-BRIDGE-V1`(guard 이후).

---

*Date: 2026-06-11 · Status: PASS (checkout-origin fulfillment readiness guard 도입, legacy 무영향. positive guard hit 은 bridge 미구현으로 deferred).*

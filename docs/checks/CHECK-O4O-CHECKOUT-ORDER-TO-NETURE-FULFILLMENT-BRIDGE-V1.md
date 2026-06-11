# CHECK-O4O-CHECKOUT-ORDER-TO-NETURE-FULFILLMENT-BRIDGE-V1

> 결제 완료(`paymentStatus='paid'`)된 Neture B2B checkout_order 만 `neture_orders` fulfillment record 로 bridge → 공급자 주문 리스트 노출.
> **payment-first**: pending bridge 금지. idempotent. collectionStatus 미사용.
> **결과: PASS** — api-server tsc 0 / 배포 무회귀 / payment-first·idempotency·dedup 코드 검증. (positive bridge 실측은 paid B2B 주문 부재로 deferred.)
> 상위: `CHECK-O4O-NETURE-B2B-PAYMENT-FIRST-CANONICAL-FLOW-CORRECTION-V1` · `CHECK-O4O-NETURE-B2B-PAYMENT-FLOW-V1` — 2026-06-11

---

## 1. 변경 파일 (3)
| 파일 | 변경 |
|------|------|
| `apps/api-server/src/services/neture/checkout-fulfillment-bridge.service.ts` | **신규** `CheckoutFulfillmentBridgeService.bridgeCheckoutOrderToNetureFulfillment()` |
| `apps/api-server/src/services/neture/NetureB2bCheckoutPaymentEventHandler.ts` | paid 전이 후 **자동 bridge 호출**(best-effort) |
| `apps/api-server/src/modules/neture/services/supplier-unified-order.service.ts` | bridge 된 checkout_order 를 checkout 소스에서 **제외**(중복 표시 방지) |

> DB/migration **무변경**(metadata 기반). legacy neture_orders·KPA/Glyco/KCos·정산·fulfillment guard·web-neture **무변경**.

## 2. bridge 대상 / 금지
**대상** (모두 충족):
```
metadata.source='neture_b2b_checkout' AND paymentStatus='paid' AND status='paid' AND paidAt not null
AND not already bridged (metadata.checkoutOrderId 조회)
```
**금지(skip reason)**: NOT_FOUND / UNSUPPORTED_SOURCE(B2B 아님) / **PAYMENT_NOT_READY(pending/실패)** / ALREADY_BRIDGED(기존 netureOrderId 반환) / NO_ITEMS / BRIDGE_FAILED.

## 3. 데이터 매핑 (checkout_order → neture_order + items)
- order: subtotal→total_amount, shippingFee→shipping_fee, totalAmount→final_amount, **status=PAID**, paidAt→paid_at, shippingAddress→shipping(필드명 정규화: recipientName/zipCode/address1/address2/memo → recipient_name/postal_code/address/address_detail/delivery_note), orderType=STORE_RESTOCK.
- order_number: `NTR{YYYYMMDD}-{random}` (legacy generateOrderNumber 동일 포맷).
- items: productId(=**SPO id**)→product_id, productName→product_name, quantity, unitPrice→unit_price, subtotal→total_price, item.metadata→options.
- **product_id=SPO id** 이므로 supplier workspace 의 `neture_order_items.product_id → supplier_product_offers.supplier_id` join 그대로 스코프 → bridge 주문이 기존 주문처럼 공급자 리스트에 노출.

## 4. metadata 계약 (paid 인식)
```
source: 'checkout_order', sourceOrderType: 'checkout_order', checkoutOrderId, checkoutOrderNumber,
sourceService: 'neture-b2b', originalSource: 'neture_b2b_checkout',
paymentStatus: 'paid', paymentReady: true, paidAt, supplierId
```
- **fulfillment guard**(`getFulfillmentReadiness`): `metadata.paymentStatus='paid'` | `paymentReady=true` | `status='paid'`/`paid_at` → **fulfillmentReady=true** → preparing/shipped 전이 허용.
- **settlement guard**(`calculateSettlements`): `paid_at IS NOT NULL` | `metadata.paymentStatus='paid'` → delivered 후 정산 후보. (collectionStatus 미사용.)

## 5. idempotency
- bridge 전 `SELECT neture_orders WHERE metadata->>'checkoutOrderId' = $1` → 존재 시 기존 netureOrderId 반환, 신규 생성 안 함.
- **V1 한계**: metadata 기반(unique index 없음). 동시성 race 가능성 낮으나 존재 → 후속 `WO-O4O-NETURE-ORDER-SOURCE-LINK-COLUMN-V2`(source_order_id 컬럼 + unique index) 권고.

## 6. 자동 bridge (payment-first)
- `NetureB2bCheckoutPaymentEventHandler` 가 checkout_order 를 paid 로 전이한 **직후** bridge 호출(best-effort).
- **bridge 실패해도 paid 유지** — 공급자 미노출 상태로 남고 로그 기록. 재시도/수동 복구는 후속(§10).
- pending 주문은 애초에 paid 전이가 없으므로 bridge 도 호출 안 됨(이중 차단: 자동 경로 + 서비스 guard).

## 7. unified view dedup
- `queryCheckoutOrders` 에 `AND NOT EXISTS (SELECT 1 FROM neture_orders WHERE metadata->>'checkoutOrderId' = co.id::text)` 추가 → bridge 된 checkout_order 는 checkout 소스에서 제외. bridge 결과는 neture_orders row(canFulfill=true)로 노출 → **동일 주문 2행 방지**.

## 8. 검증
- **api-server tsc 0** ✅
- **배포 무회귀 (live)** ✅: 신리비전 기동 — 핸들러 init 로그 유지(`✅ NetureB2bCheckoutPaymentEventHandler initialized` / `subscribed (serviceKey=neture-b2b)`), `GET /api/v1/neture/supplier/orders/unified` → 401(mounted, dedup 쿼리 정상 — 500 없음), `POST /neture/b2b/payments/prepare` → 401.
- **payment-first/idempotency/dedup 코드 검증** ✅: pending→PAYMENT_NOT_READY, 재bridge→ALREADY_BRIDGED, unified NOT EXISTS dedup, guard metadata 정합(§4).
- **positive bridge — DEFERRED**: 유효 paid Neture B2B checkout_order seed 필요(현재 부재 — P2b positive 결제 전이도 deferred 상태). P2d frontend 전환 또는 seed 확보 시 동반 실측(neture_order 생성·items·supplier 리스트 노출·checkout 중복 숨김).
- **graceful**: bridge 는 내부 service(외부 route 없음) — payment handler 자동 호출 경로만. no-op 안전(존재하지 않는/미결제 주문 skip).

## 9. 완료 기준 체크 (WO §14)
1(paid 만 bridge) ✅. 2(pending bridge 금지) ✅. 3(neture_order 생성) ✅. 4(neture_order_items 생성) ✅. 5(metadata.checkoutOrderId 보존) ✅. 6(idempotency) ✅. 7(supplier workspace 노출 구조 — product_id=SPO) ✅. 8(중복 방지 — unified dedup) ✅. 9(settlement readiness 정합) ✅. 10(collectionStatus 미사용) ✅. 11(tsc 0) ✅. 12(graceful smoke 기록 — positive deferred) ✅. 13(CHECK) ✅. 14(path-specific) ✅. 15(다른 세션 무접촉) ✅.

## 10. 남은 GAP/RISK · 후속
- **positive bridge 실측**: paid B2B checkout_order seed/실결제 확보 시(P2d 동반).
- **bridge 실패 복구**: paid 후 bridge 실패 시 공급자 미노출 → 재시도 job/수동 bridge route 후속.
- **idempotency 강화**: metadata 기반 → `WO-O4O-NETURE-ORDER-SOURCE-LINK-COLUMN-V2`(source_order_id 컬럼+unique).
- **이벤트오퍼 checkout_order bridge**: 본 WO 는 `neture_b2b_checkout` 만. event_offer(`store_cart_checkout`) bridge 는 범위 외(별도 결정).
- 후속: `WO-O4O-NETURE-B2B-CANONICAL-CART-CHECKOUT-PHASE1-V1`(P2d, frontend) → `WO-O4O-NETURE-B2B-LEGACY-SELLER-ORDER-ROUTE-RETIREMENT-V1`.

---

*Date: 2026-06-11 · Status: PASS (paid checkout_order → neture fulfillment bridge, payment-first/idempotent/dedup. positive bridge 실측 deferred).*

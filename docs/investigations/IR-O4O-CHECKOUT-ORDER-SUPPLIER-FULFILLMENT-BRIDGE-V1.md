# IR-O4O-CHECKOUT-ORDER-SUPPLIER-FULFILLMENT-BRIDGE-V1

> `checkout_orders` 에 생성된 공급자 주문을 공급자 fulfillment workspace 에서 **배송 처리** 가능하게
> 연결하는 bridge 설계 조사. read-only — 코드/스키마/API/정산 무변경.
> 기준: 공급자 주문은 sourceType 무관 단일 fulfillment pipeline. checkout_orders = canonical order ledger,
> neture_orders = migration 기간 downstream fulfillment/settlement asset.
> Date: 2026-06-09

---

## 1. 요약 판정

- **현재 GAP**: KPA/Glyco/KCos event_offer cart + KPA B2C 주문은 `checkout_orders` 로 생성되나, 공급자
  fulfillment(배송 처리/송장/배송완료) 자산은 `neture_orders` 중심. checkout_orders 는 supplier unified
  view 에서 **읽기전용**(`canFulfill=false`)으로만 보이고 **배송 처리 불가**.
- **권장 = 후보 B (checkout_order → neture_order fulfillment bridge)** — 단 **정산 자동 편입을 막는 가드가
  bridge 구현의 비협상 전제조건**. 기존 supplier workspace/neture_shipments/status 전이를 재사용.
- **결정적 위험 (검증완료)**: 정산 쿼리는 `neture_orders.status='delivered'` 를 **source/결제상태 필터
  없이** 자동 집계한다(`neture-settlement.service.ts:141-160`). bridge 가 neture_order 를 만들면 공급자가
  delivered 처리하는 순간 **자동 정산 대상**이 된다. 그런데 checkout-confirm/event_offer 주문은
  `paymentStatus=PENDING`(결제 미연동) → **미수금 주문을 공급자에게 정산**하는 사고 가능.
  → **"배송 처리 가능"과 "정산 가능"은 반드시 분리.** bridge V1 은 정산 편입 금지.
- **sourceType/pricingSource 는 fulfillment 분기에 사용되지 않음**(원칙 부합). 분기는 원장 이원화뿐.

---

## 2. checkout_orders 구조 (`CheckoutOrder.entity.ts`)
- order-level **supplierId**(varchar, 단일 공급자/주문), **sellerOrganizationId**(uuid), buyerId, sellerId.
- 금액: subtotal/shippingFee/discount/totalAmount(snapshot 저장됨).
- **status**(created/pending_payment/paid/refunded/cancelled) = 주문/결제 상태. **fulfillment/shipment 상태머신 없음.**
- **paymentStatus**(pending/paid/failed/refunded), 기본 PENDING. event_offer·B2C checkout-confirm 흐름은 결제 미연동 → **PENDING 상태로 잔존.**
- items jsonb: productId/productName/quantity/unitPrice/subtotal/**metadata?**. event_offer line metadata = sourceType/eventOfferId/organizationProductListingId/cartItemIds/pricingSource/confirmedUnitPrice 보존.
- metadata: serviceKey/source('store_cart_checkout')/sourceTypes/cartItemIds/eventOfferIds.
- **판정**: fulfillment 에 필요한 식별/금액 정보는 충분. 단 **fulfillment 상태·송장 carrier 없음** → 직접 fulfillment(후보 A/C) 시 신설 필요.

## 3. neture_orders fulfillment 구조
- `NetureOrder`(`neture-order.entity.ts`): order_number(unique)+user_id 필수, 금액 default 0, **order-level supplier 없음**(다공급자), status 전체 라이프사이클(created→preparing→shipped→delivered), **metadata jsonb(nullable) 존재**(source link 가능), source_order_id 전용 컬럼 없음.
- `NetureOrderItem`(`neture-order-item.entity.ts`): **product_id uuid(SupplierProductOffer.id)**, quantity/unit_price/total_price, options jsonb. **metadata 필드 없음.**
- supplier workspace(`supplier-order.service.ts`): neture_orders 를 `neture_order_items.product_id→SPO.supplier_id` join 으로 스코프. status 전이(created/paid→preparing→shipped→delivered) + `neture_shipments`(order_id uuid·supplier_id uuid·carrier/tracking·status preparing→shipped→in_transit→delivered, **FK 없음**) 생성 시 order.status='shipped' 자동 전이.
- **판정**: bridge 로 neture_order(+items) 를 만들면 기존 workspace/shipment/status 전이를 **그대로 재사용 가능**. 단 item.product_id 가 **반드시 SPO uuid** 여야 supplier 스코프·정산 join 성립. event_offer checkout item.productId=offerId(SPO) → 호환 ✅. **B2C/general 은 productId 가 SPO 인지 미확인(RISK)**.

## 4. supplier unified view 관계 (`supplier-unified-order.service.ts`)
- `GET /supplier/orders/unified` 가 neture_orders(canFulfill=true, fulfillmentUrl 有) + checkout_orders(`co."supplierId"=$1`, **canFulfill=false, readOnlyReason='…배송 처리 통합은 후속 작업'**)를 in-memory 병합.
- 두 원장 현재 **disjoint** → dedup 불필요. **그러나 bridge 가 checkout_order 로부터 neture_order 를 만들면 동일 주문이 양쪽에 중복 표시** → dedup 필수.
- **판정**: checkout_orders 를 fulfill 가능하게 하려면 (B) bridged neture_order 의 fulfillmentUrl 노출 + 원본 checkout_order row 숨김(또는 merge), 또는 (C) checkout_order row 에 직접 fulfillment action/상태 부여. dedup 키 = `neture_order.metadata.checkoutOrderId`.

## 5. settlement 영향 (결정적)
- `calculateSettlements`(`neture-settlement.service.ts:141`): `FROM neture_orders o JOIN neture_order_items oi JOIN supplier_product_offers spo ON spo.id=oi.product_id WHERE o.status='delivered' AND o.updated_at∈기간 AND NOT EXISTS(neture_settlement_orders)` GROUP BY supplier_id. **source 필터·paymentStatus 확인 없음.** 10% 수수료.
- **위험**: bridge neture_order → delivered 시 **자동 정산 편입**. checkout_orders 는 PENDING(미수금) → **미결제 주문 정산 사고**.
- **판정/권장 기본값**: **bridge V1 은 정산 자동 편입을 금지한다.** 구현 시 두 가지 중 하나가 비협상 전제:
  1. bridge neture_order 에 `metadata.source='checkout_order'` 태깅 + **정산 쿼리에 `AND (o.metadata->>'source' IS DISTINCT FROM 'checkout_order')` 제외절**을 동일 WO 에서 함께 추가(미적용 시 출시 즉시 재무사고). 
  2. 또는 정산 편입을 `IR-O4O-SUPPLIER-SETTLEMENT-PIPELINE-CONSOLIDATION-V1` 가 **결제/수금 readiness 기준**으로 먼저 정의한 뒤 bridge 가 그 기준을 따른다.
- 정산 제외 기준은 **sourceType 이 아니라 결제/수금/정산 readiness** 여야 한다(일반/이벤트 동일 취급).

## 6. 후보 A~D 비교
- **A. checkout_orders 직접 fulfillment(상태머신·shipment 신설)**: 원장 단일화 정합 최고. 단 workspace/shipment/정산 대규모 재작성 → V1 과대·고위험. 비권장(장기 목표).
- **B. checkout_order → neture_order fulfillment bridge** ✅: 기존 fulfillment/shipment/status 자산 재사용, workspace 변경 최소, 단계 수렴. 단 이중원장 공존·dedup·**정산 가드 필수**.
- **C. unified view 에서 checkout_order 전용 fulfillment action**: neture_order 복제 회피, checkout_orders 장기 canonical 에 유리, **정산 자동편입 위험 없음**(neture_orders 미생성). 단 fulfillment 상태/shipment API 를 checkout_orders 용으로 신설해야 해 neture 자산 재사용성 낮음.
- **D. 별도 supplier_fulfillments bridge table**: 주문/이행 원장 분리. 단 새 원장 추가·workspace/정산 재배선 → 단기 복잡도 큼.

## 7. 권장 bridge 설계 (후보 B, 정산 가드 동반)
```
checkout_order (canonical order, paymentStatus 보존)
  → [bridge] neture_order(metadata.source='checkout_order', metadata.checkoutOrderId)
            + neture_order_items(product_id = SPO id)
  → 기존 supplier workspace 에서 배송 처리/송장/delivered (재사용)
  → 정산: bridge 주문은 기본 제외(결제 readiness 정의 전까지)
  → unified view: bridged neture_order 노출, 원본 checkout_order row 는 dedup 으로 숨김
```
- **배송 가능 ≠ 정산 가능** 분리가 설계의 핵심 불변식.
- B2C/general 은 productId=SPO 보장 확인 후 단계 편입(우선은 event_offer).

## 8. 데이터 매핑
`checkout_order → neture_order`: id→metadata.checkoutOrderId(+source='checkout_order') · buyerId→user_id · subtotal→total_amount · shippingFee→shipping_fee · totalAmount→final_amount · shippingAddress→shipping(jsonb) · metadata.serviceKey→metadata.serviceKey. (supplierId 는 order-level 미보유 → items 의 SPO 로 표현, metadata.supplierId 보조 저장 권장.)
`checkout_order.items[] → neture_order_items`: productId(SPO)→product_id · productName→product_name · quantity→quantity · unitPrice→unit_price · subtotal→total_price · **item.metadata(eventOfferId/cartItemId/pricingSource)** → neture_order_items.**options** 또는 neture_order.metadata(전용 metadata 컬럼 없음 — GAP).

## 9. 연결키 / 중복 방지
- neture_orders 에 **source_order_id 전용 컬럼 없음** → `metadata.checkoutOrderId`(+`metadata.source='checkout_order'`) 사용. (정합성·dedup 위해 후속 WO 에서 `source_order_type/source_order_id` 컬럼 + `UNIQUE(source_order_type, source_order_id)` partial index 신설 권장 — migration 별도.)
- **중복 표시 방지**: unified view 에서 checkout_order row 는 "이미 bridged(neture_order.metadata.checkoutOrderId 존재)" 이면 숨김. 미bridge 면 read-only 유지.
- **idempotency**: 동일 checkout_order 재bridge 방지 위해 생성 전 `metadata.checkoutOrderId` 존재 확인 또는 unique index.

## 10. 정산 제외 / 정산 준비 기준
- **bridge V1 = 정산 미편입**(§5). 분리 원칙: "공급자가 배송 처리할 수 있다" ≠ "공급자에게 정산한다".
- 정산 편입은 `IR/WO-O4O-SUPPLIER-SETTLEMENT-PIPELINE-CONSOLIDATION-V1` 에서 **결제/수금 readiness**(예: checkout_order.paymentStatus='paid' 또는 정산대상 플래그) 기준으로 정의. sourceType 기준 분기 금지.
- 그 전까지 정산 쿼리는 bridge(source='checkout_order') 주문을 **명시 제외**해야 한다(가드 미적용 시 미수금 정산 사고).

## 11. 단계별 구현 WO
1. **(권장 선행 또는 동반)** `IR-O4O-SUPPLIER-SETTLEMENT-PIPELINE-CONSOLIDATION-V1` — 정산 readiness 기준 + bridge 주문 제외/편입 규칙 확정. (재무 안전 선결)
2. `WO-O4O-CHECKOUT-ORDER-TO-NETURE-FULFILLMENT-BRIDGE-V1` (후보 B): event_offer checkout_order → neture_order bridge(metadata.source/checkoutOrderId) + items(SPO) + **정산 제외 가드** + unified view dedup. workspace/shipment 재사용. 정산 미편입.
3. `WO-O4O-NETURE-ORDER-SOURCE-LINK-COLUMN-V2` (선택): source_order_type/id 컬럼 + unique index(metadata 의존 제거).
4. B2C/general checkout_orders 의 productId=SPO 보장 확인 후 bridge 확대.

## 12. 이번 IR 에서 수정하지 않은 것
코드/스키마/migration/API/UI/route/정산쿼리 **무변경**. bridge 미구현. source_order_id migration 미작성. participate/Neture B2B 무변경. 다른 세션 WIP 무접촉. 발견 GAP/RISK 기록만.

---

## 핵심 질문 답 (WO §6)
1. checkout_orders 직접 fulfillment? → 가능하나 상태머신/shipment 신설 필요(후보 A/C, V1 과대).
2. neture_order fulfillment record 생성? → **권장(후보 B)**. 기존 자산 재사용.
3. 연결키? → `metadata.checkoutOrderId`+`source`(후속 전용 컬럼+unique 권장).
4. 중복 방지? → unified view 에서 bridged checkout_order row 숨김 + 생성 idempotency.
5. fulfillment status 위치? → bridge 면 **neture_order.status**(checkout_order 는 주문/결제 상태 유지).
6. shipment 재사용? → **가능**(neture_shipments order_id=neture_order.id).
7. 정산 V1 포함? → **불포함(분리)**. §5/§10.
8. sourceType 분기? → **아님**(원칙 부합).
9. event_offer/B2C 동일 처리? → 구조 동일하나 B2C productId=SPO 확인 필요(RISK).
10. Neture B2B 충돌? → bridge 주문은 metadata.source 태깅으로 구분, B2B 무변경.

---

*Status: AUDIT COMPLETE. 권장 = 후보 B + 정산 자동편입 금지 가드. 결정적 위험 = 미결제(PENDING) 주문의 정산 사고. 코드 무변경.*

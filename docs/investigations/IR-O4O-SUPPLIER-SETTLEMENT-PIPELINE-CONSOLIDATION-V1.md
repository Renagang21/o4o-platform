# IR-O4O-SUPPLIER-SETTLEMENT-PIPELINE-CONSOLIDATION-V1

> 공급자 주문 **정산 pipeline 단일화** 조사. read-only — 코드/스키마/정산쿼리/API/UI 무변경.
> 기준: 정산 편입은 sourceType/pricingSource 가 아니라 **fulfillment delivered + payment/collection readiness**.
> Date: 2026-06-09

---

## 1. 요약 판정

- **현재 정산 = `neture_orders.status='delivered'` 단일 기준** (`neture-settlement.service.ts:141-160`).
  결제/수금/source 필터 **없음**. 금액 = `SUM(neture_order_items.total_price)`(item subtotal, **배송비 제외**),
  플랫폼 수수료 **10%**(subtotal 기준), supplier = subtotal − fee. 워크플로우 = admin calculate→approve→pay (수동, **postpaid/offline**).
- **B2B(neture_orders)는 결제확인 없이 created→…→delivered 도달 가능** — 이는 버그가 아니라 **의도된 B2B 도매 offline/invoice(후불) 수금 모델**. 따라서 delivered-only 정산은 **B2B 모델에 한해 허용**.
- **checkout_orders 는 정산에서 전면 제외**(정산 쿼리 미참조) ✅ — 그런데 이게 **현재로선 안전장치**다. 이유:
  - event_offer cart-confirm 주문: 결제 단계 없음 → **paymentStatus 영원히 PENDING(미수금)**.
  - KPA B2C `/kpa/checkout`: paid 전환 경로(Toss) 있으나 **KPA payment event handler 누락**으로 Toss 성공해도 checkout_orders 는 PENDING 잔존(별도 버그, §6 RISK).
  - 즉 checkout_orders 는 **사실상 미수금** → 지금 정산에 넣으면 **수금 안 된 주문을 공급자에 지급하는 재무 사고**.
- **결론**: 정산 기준은 sourceType 이 아니라 **collection model 별 readiness**. B2B=offline 후불(delivered≈정산가능, 운영 합의), online PG(checkout_orders)=paymentStatus='paid'(실제 Toss 수금). 두 모델을 **하나의 readiness 개념**(settlementReady/collectionStatus)으로 통일하는 것이 목표.
- **fulfillment bridge 의 비협상 전제 재확인**: checkout_order→neture_order bridge 시 delivered → 자동 정산되므로, **bridge 주문은 정산에서 명시 제외**(또는 readiness 기준 적용)해야 한다.

---

## 2. 현재 neture settlement 구조 (`neture-settlement.service.ts`)
- `calculateSettlements(periodStart, periodEnd)`: `FROM neture_orders o JOIN neture_order_items oi JOIN supplier_product_offers spo ON spo.id=oi.product_id WHERE o.status='delivered' AND o.updated_at∈기간 AND NOT EXISTS(neture_settlement_orders nso WHERE nso.order_id=o.id) GROUP BY spo.supplier_id HAVING SUM(oi.total_price)>0`.
- 금액: `total_sales = SUM(oi.total_price)`(item subtotal). **shipping_fee 미포함**(플랫폼 보유). fee=`round(total*0.10)`, supplier=`total−fee`. `platform_fee_rate` snapshot 저장.
- 엔티티: `neture_settlements`(supplier_id, period, total_sales, platform_fee, supplier_amount, fee_rate, order_count, status: pending→calculated→approved→paid→cancelled) + `neture_settlement_orders`(settlement_id, order_id unique=중복정산 방지, supplier_sales_amount).
- 워크플로우: admin `POST /settlements/calculate` → `PATCH /:id/approve` → `PATCH /:id/pay`(paid_at). **수동 postpaid**.
- **취소/환불**: `cancelSettlement`(calculated/approved 상태만, junction 삭제로 재정산 허용) 존재. **단 정산 paid 후 주문 환불 시 자동 clawback/조정 없음**(GAP). 주문 cancel 은 재고 복구만, 정산 reversal 없음.

## 3. checkout_orders payment/collection 구조
- `CheckoutOrder`: status(created/pending_payment/paid/refunded/cancelled), **paymentStatus(pending/paid/failed/refunded), 기본 PENDING**. `CheckoutPayment`(checkout_payments): orderId FK, paymentKey(Toss), pgProvider='toss', status(pending/success/failed/refunded), approvedAt.
- `completePayment(orderId, {paymentKey, approvedAt,...})`: payment.status='success'+paymentKey 기록 → order.status=PAID + **paymentStatus=PAID** + paidAt. **`paymentStatus='paid'` 는 실제 Toss PG 확인으로만 설정됨**(돈 없이 설정되는 경로 없음). → paid = 실수금 신뢰 가능 ✅.
- refund: `refundOrder`(paid 주문만) → status/paymentStatus=REFUNDED. cancel(결제 전): created/pending_payment 만 → CANCELLED.

## 4. Store Cart checkout-confirm 주문의 정산 상태
- `event-offer-cart-checkout.service` → `createOrder()` → checkout_orders 생성, **paymentStatus=PENDING**, 이후 **결제 confirm 단계 없음** → **PENDING 영구**(미수금 order stub). metadata.source='store_cart_checkout'.
- **판정**: 현재 checkout-confirm 주문은 **수금 완료 주문이 아님**. 정산 가능 판단은 paymentStatus 가 아니라(어차피 PENDING) **수금 모델 정의 후** 가능. 지금은 정산 **불가/제외**가 정답.

## 5. fulfillment bridge 와 settlement 위험
- bridge(IR-O4O-CHECKOUT-ORDER-SUPPLIER-FULFILLMENT-BRIDGE-V1)로 checkout_order→neture_order 생성 시, 공급자 delivered 처리 → **정산 쿼리에 자동 편입**(source/payment 필터 없음). checkout_order 는 PENDING(미수금) → **CRITICAL: 미수금 정산**.
- 제외 가드 필요: 정산 쿼리에 `AND (o.metadata->>'source' IS DISTINCT FROM 'checkout_order')` 또는 readiness 기준. bridge WO 와 **반드시 동반**.

## 6. Neture B2B 정산 상태
- neture_orders 는 created 로 생성, payment_method/key/paid_at 미설정. status 전이(updateOrderStatus)에 **결제 확인 게이트 없음** → delivered 도달 가능. 정산은 delivered 만으로 집계.
- **판정**: 이는 **의도된 offline/invoice 후불 도매 모델**(WO-O4O-SETTLEMENT-ENGINE-V1, F8 Distribution Engine freeze 영역). 즉 B2B 는 "delivered = 수금 책임 발생(후불 청구)" 운영 합의. **online PG checkout_orders 에 같은 기준을 적용하면 안 됨**(checkout 은 선결제 모델인데 미수금 상태).
- **RISK(별도 버그)**: KPA B2C 는 `/kpa/payments/confirm`(Toss)로 paid 전환 가능하나 **KPA payment event handler 미초기화**(Glyco 는 있음, register-routes) → Toss 성공해도 checkout_orders.paymentStatus=pending 잔존. checkout 기반 정산 도입 전 **선결 수정 필요**.

## 7. sourceType / pricingSource 원칙 확인
- 정산 코드에 sourceType/pricingSource 분기 **없음**(neture_order_items 엔 sourceType 자체가 없음). 정산 분기 기준은 **원장(neture vs checkout)** 과 **status='delivered'** 뿐. → 원칙 부합. 통일 기준은 collection readiness 여야 함.

## 8. 정산 readiness 후보 비교
- **A. delivered 만**: 현행. B2B offline 모델엔 허용되나 checkout(선결제) 엔 미수금 정산 위험. **단독 비권장**.
- **B. delivered + paymentStatus='paid'**: online PG 정합. 단 B2B offline(후불, 영원히 unpaid) 주문을 정산 못 함(현 B2B 운영 깨짐), event_offer cart 도 PENDING 이라 영원히 정산 불가. **단독 부적합**.
- **C. delivered + settlementReady flag** ✅: online 결제·offline 후불·invoice 모두 명시 수용. 모델별로 settlementReady 설정 흐름만 정의하면 단일 pipeline. (신규 필드/metadata + 설정 흐름 필요.)
- **D. delivered + collectionStatus(paid/collected/invoice_confirmed)** ✅: 수금 상태를 명시 표현, B2B 후불에 적합. (필드/운영 흐름 필요, C 와 유사.)
- **E. source 별 예외**: sourceType/원장이 정산 모델을 가르게 됨 → **사용자 기준 위반, 비권장**.
- **권장 = C 또는 D** (readiness/collection 개념 도입). B2B 후불은 readiness=delivered-시-자동, online 은 readiness=paid 로 매핑하여 **하나의 기준식**으로 표현.

## 9. 정산 금액 기준
- 현행: 매출=item subtotal(`SUM(oi.total_price)`), **배송비 제외**(플랫폼 보유), 수수료=subtotal×10%, supplier=subtotal−fee. 할인/이벤트가격은 unit_price snapshot 기준(event_offer 도 동일 — 별도 처리 없음 ✅).
- **판정**: 금액식은 sourceType 무관 통일됨. checkout_orders 편입 시에도 동일식(item subtotal 기준) 적용 가능. 단 **배송비 정산 정책**(공급자 지급 vs 플랫폼)·event 가격 손익 귀속은 정책 결정 항목으로 남김(GAP).

## 10. 취소/환불/부분취소 영향
- checkout: paid→refundOrder(REFUNDED). neture: cancel=재고복구만. **정산 paid 이후 환불 시 자동 정산 차감/clawback 없음**(neture·checkout 공통 GAP). 부분취소/부분환불 모델 부재.
- **판정**: 정산 편입 확대 전 **post-settlement refund 조정(reversal/clawback)** 정책 필요. 미정 시 환불-정산 불일치 위험. 후속 risk 기록.

## 11. 설계안 비교
- **1. exclusion guard 만**(bridge 주문 metadata.source 제외): 최速 재무사고 방지, checkout 정산 누락은 잔존. **V1 안전망으로 채택**.
- **2. settlementReady metadata**: source→readiness 전환. 기존 주문 backfill/default 정책 필요.
- **3. collectionStatus 컬럼 도입**: 가장 명확, online/offline/후불 수용. migration/API/운영 UI 필요(범위 큼).
- **4. checkout_orders 정산 원장 확장**: canonical 정합 최고, neture settlement legacy 격하. 단기 부담 큼(장기).
- **권장 순서**: 1(가드) → 3 또는 2(readiness 모델) → 4(장기).

## 12. 권장 로드맵
1. **V1 Safety Guard**: bridge(checkout 기반) neture_order 가 delivered 라도 기존 정산에 **자동 포함 안 되게** 제외. (bridge WO 와 동반 — 재무사고 방지)
2. **V2 Settlement Readiness Model**: `settlementReady`/`collectionStatus` 도입. B2B 후불(delivered=ready)·online(paid=ready)·invoice 를 하나로. + **KPA payment event handler 누락 수정**(§6) 선결.
3. **V3 Checkout Order Settlement Inclusion**: readiness 충족 checkout_orders 를 supplier 정산에 편입(금액식 §9 동일). post-settlement refund 조정 정책 포함.
4. **V4 Neture B2B settlement readiness 정렬**: legacy neture_orders 도 delivered-only → readiness 기준으로 수렴(F8 freeze 검토).

## 13. 다음 구현 WO 제안
1. `WO-O4O-SUPPLIER-SETTLEMENT-BRIDGE-EXCLUSION-GUARD-V1` (V1, bridge 동반 필수) — 정산 쿼리에서 source='checkout_order' 제외.
2. `WO-O4O-KPA-PAYMENT-EVENT-HANDLER-FIX-V1` (선결 버그) — KPA B2C Toss 확인 시 checkout_orders.paymentStatus=paid 반영.
3. `IR/WO-O4O-SUPPLIER-SETTLEMENT-READINESS-MODEL-V1` (V2) — settlementReady/collectionStatus 설계.
4. `WO-O4O-CHECKOUT-ORDER-SUPPLIER-SETTLEMENT-INCLUSION-V1` (V3) — readiness 충족 시 편입 + refund 조정.
5. `WO-O4O-CHECKOUT-ORDER-TO-NETURE-FULFILLMENT-BRIDGE-V1` — **반드시 #1 가드 또는 readiness 확정 후** 진행.

## 14. 이번 IR 에서 수정하지 않은 것
정산 쿼리/스키마/migration/API/UI/checkout/neture 로직 **무변경**. KPA handler 버그 미수정(기록만). 다른 세션 WIP 무접촉. 발견 CRITICAL/RISK/GAP 기록만.

---

## 핵심 질문 답 (WO §5)
1. 정산 기준 = neture_orders.status='delivered' 단독(결제/source 무관). 2. delivered-only 는 **B2B offline 후불엔 의도적·허용, online checkout 엔 위험**. 3. checkout_orders 제외는 현재 안전장치(미수금이라). 4. bridge 시 자동 정산 위험 **실재**(§5). 5. readiness = delivered + collection confirmed(모델별). 6. paymentStatus='paid' 는 online PG 엔 충분하나 B2B 후불·event_offer PENDING 은 미수용 → 단독 불충분. 7. offline/후불 = settlementReady/collectionStatus 필요. 8. 배송비 현재 정산 제외(플랫폼 보유). 9. 수수료 = item subtotal 10%. 10. 정산 후 환불 조정 **없음(GAP)**. 11. sourceType 정산 분기 **없음**. 12. bridge checkout_order **기본 제외**. 13. 편입 시점 = readiness 모델 확정 + (event_offer 수금 모델 정의) 후.

---

*Status: AUDIT COMPLETE. 핵심 결론: "delivered 만으로 정산"은 B2B offline 후불엔 의도적이나 checkout_orders(선결제·현재 미수금)엔 위험 → 정산 편입 전 readiness(collection) 모델 필수 + bridge 정산 제외 가드 선결. 코드 무변경.*

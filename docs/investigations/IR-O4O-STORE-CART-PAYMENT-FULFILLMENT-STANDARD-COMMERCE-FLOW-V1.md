# IR-O4O-STORE-CART-PAYMENT-FULFILLMENT-STANDARD-COMMERCE-FLOW-V1

> **상위 기준 문서.** O4O 매장 주문 흐름(Cart → Checkout/Order → Payment/Collection → Supplier
> Fulfillment → Shipping → Settlement)이 일반 전자상거래 표준 순서에서 벗어나지 않았는지 전면 감사.
> read-only — 코드/스키마/정산쿼리/API/UI 무변경.
> 기준: O4O 차별점은 **상품 출처·진열 방식의 다양성**뿐. 주문 이후 흐름은 표준 커머스를 따른다.
> sourceType/pricingSource 는 metadata 일 뿐 주문·결제·배송·정산 모델 분리 기준이 아니다.
> Date: 2026-06-09 · 본 IR 은 `IR-O4O-...-SETTLEMENT-PIPELINE-CONSOLIDATION-V1` 및
> `IR-O4O-CHECKOUT-ORDER-SUPPLIER-FULFILLMENT-BRIDGE-V1` 의 **상위 정렬 기준**이다.

---

## 1. 요약 판정

표준 커머스 6단계 대비 현 코드 적합도:

| 단계 | 현 상태 | 판정 |
|------|--------|------|
| 1. 진열(다양 출처) | sourceType 로 출처만 구분, 주문행동 동일 | **PASS** |
| 2. Cart | StoreCartItem = 주문 전 상태. 담기 시 주문/차감/배송/정산 미발생 | **PASS** |
| 3. Checkout/Order 생성 | checkout-confirm = 주문 record 생성 + (event_offer)수량 차감. **paymentStatus=PENDING** | **부분 GAP**(주문생성=정상, 단 미결제) |
| 4. Payment/Collection 확인 | `paymentStatus='paid'`=실 Toss 수금(신뢰가능). 그러나 event_offer cart=**결제단계 없음(PENDING 영구)**, KPA B2C=**handler 누락**으로 paid 미반영 | **CRITICAL GAP** |
| 5. Supplier Fulfillment 시작 | neture_orders 상태전이 `created→preparing` 에 **결제/수금 게이트 없음**. checkout_orders 는 현재 fulfill 불가(read-only) | **RISK**(게이트 부재) |
| 6. Settlement | `delivered` 단독, 결제/수금 필터 없음 | **RISK**(B2B offline 엔 의도적, online 엔 위험) |

- **핵심 판정**: O4O 주문 흐름의 **기본 순서(1→2→3)는 표준 부합**. 그러나 **3→4→5→6 사이의 "결제/수금 readiness 게이트"가 부재**하다. 즉 *결제/수금 확인 없이 배송·정산으로 넘어갈 수 있는 구조*가 코드에 존재한다.
- **단, B2B(neture_orders)의 결제확인 없는 delivered→정산은 "offline/후불 도매 수금" 의 의도된 모델**이며 표준 위반이 아니다 — 표준의 4단계는 "선결제"가 아니라 **"collection readiness 가 명시·확인됨"** 이고, offline 확정도 이를 충족하는 한 형태다. 문제는 readiness 가 **명시되지 않고 delivered 로 암묵 대체**된다는 점.
- **권장 = 후보 A(표준 흐름 엄격 적용, 단계적)**: cart=주문전 / checkout_order=주문record / **collection confirmed 이후 fulfillment 시작** / **delivered + collection confirmed 이후 settlement**. online=paid, offline=invoice/operator 확정을 하나의 **readiness 개념**으로 통일.
- **sourceType/pricingSource 가 흐름을 분기하는 코드 없음**(원칙 부합). 실제 분기는 **원장 이원화(checkout vs neture)** 와 **결제/수금 게이트 부재**.

---

## 2. 표준 커머스 기준 흐름 (이 IR 의 척도)
```
진열 → Cart(주문전) → Order 생성(미결제 가능) → Payment/Collection 확인
     → Supplier Fulfillment(준비→송장→배송→완료) → Settlement(완료+수금확인+미환불)
```
불변식: **결제/수금 확인 이전에 공급자 배송을 시작하지 않는다. 배송완료+수금확인 이전에 정산하지 않는다.**
(collection 확인은 모델별: online=PG paid / offline 도매=invoice·operator 확정.)

## 3. 현재 cart 상태 감사 — PASS
- `StoreCartItem`/`store-cart.service`: 담기/목록/수량/삭제/group/preview 만. **add 시 주문·수량차감·배송·정산 미발생.** reserve(FOR UPDATE)+차감은 **checkout-confirm 시점에만**. checkout-preview 는 주문 미생성. sourceType/pricingSource=metadata.
- → 일반 전자상거래 cart 역할 충족. ✅

## 4. checkout-confirm / checkout_order 상태 감사 — 부분 GAP
- `event-offer-cart-checkout.service` → `createOrder()`: checkout_orders 생성, status=CREATED, **paymentStatus=PENDING**. event_offer 최종검증+수량차감이 이 시점(주문 생성)에 발생 = 표준의 "주문 확정 시 재고 확정" 부합.
- **GAP/R1**: "checkout-confirm" 이라는 이름은 결제 완결을 연상시키나 **실제로는 주문 record 생성(미결제)** 이다. 이를 결제완료 주문으로 오해해 fulfillment/정산에 태우면 위험.
- 판정: 주문 생성 단계로는 정상. 단 **미결제 상태**임이 명확히 게이트되어야 함(현재 게이트 없음).

## 5. payment / collection 상태 감사 — CRITICAL GAP
- `paymentStatus='paid'` 는 `completePayment`(Toss `paymentKey`+approvedAt) 로만 설정 → **실 수금 신뢰 가능** ✅.
- 그러나 **checkout_orders 는 사실상 미수금**:
  - event_offer cart-confirm: 결제 confirm 단계 자체가 흐름에 없음 → **PENDING 영구**.
  - KPA B2C `/kpa/checkout`: Toss confirm 경로 존재하나 **KPA payment event handler 미초기화**(Glyco 는 register-routes 에 있음) → Toss 성공해도 checkout_orders.paymentStatus=pending 잔존(**버그**).
  - Glyco/KCos: payment handler 유무·event_offer 결제단계 부재 — 동일하게 event_offer 는 미결제.
- **collection/offline 확정 개념 부재**: checkout_orders 에 paymentStatus 외 collectionStatus/settlementReady 없음.
- → 표준 4단계가 **online 경로에서 미완성**(미수금 잔존) + offline 확정 개념 부재.

## 6. supplier fulfillment 시작 조건 감사 — RISK(게이트 부재)
- `supplier-order.service` 상태전이: `created→preparing`, `paid→preparing`, `preparing→shipped`, `shipped→delivered`. → **`created`(미결제)에서 바로 fulfillment 시작 가능. 결제/수금 게이트 없음.**
- checkout_orders 는 unified view 에서 `canFulfill=false`(read-only) → 현재는 fulfill 불가(노출만). 즉 **지금 당장 미결제 checkout_order 가 배송되지는 않음**(bridge 전).
- **R2(미래 위험)**: bridge(checkout→neture) 가 생기면 미결제 checkout_order 가 fulfillable neture_order 가 되어, 게이트 없이 배송 시작 가능 → **표준 위반**. bridge 는 fulfillment readiness guard 동반 필수.

## 7. neture_orders legacy 경로 감사
- `/neture/seller/orders` → neture.service.createOrder → neture_orders(created), 결제확인 게이트 없이 delivered 도달 가능 → 정산.
- **판정**: 이는 **명시된 B2B offline/후불 도매 운영 모델**(WO-O4O-SETTLEMENT-ENGINE-V1, F8). legacy 코드 잔존이 아니라 의도된 수금 모델. → **표준의 "collection 확인"을 offline 확정으로 충족한다고 간주**. 단 readiness 가 명시되지 않고 delivered 로 암묵 대체되는 점이 개선 대상.
- **R4**: 이 offline 예외를 **online checkout_orders 의 canonical 기준으로 오염시키면 안 됨**(checkout 은 선결제 모델인데 미수금). bridge/settlement 가 neture 기준(delivered-only)을 그대로 checkout 에 적용 = 사고.

## 8. settlement 기준 감사 — RISK
- `neture-settlement.service`: `neture_orders.status='delivered'` 단독, 결제/source/paymentStatus 필터 **없음**. 금액=item subtotal(배송비 제외, 플랫폼 보유), 수수료 10%. 정산 후 환불 clawback **없음(GAP)**.
- checkout_orders 정산 **전면 제외**(쿼리 미참조) — 현재는 미수금이라 **안전장치**로 작동.
- **R3**: delivered-only 는 B2B offline 엔 의도적이나, bridge 로 checkout_order 가 neture_order 가 되면 **미수금 정산 사고**.

## 9. sourceType / pricingSource 원칙 확인 — PASS
- cart/주문/배송/정산 코드 어디에도 sourceType/pricingSource 기준 **모델 분기 없음**. 출처/가격근거 metadata 로만 보존. ✅
- 실제 분기는 **원장 이원화 + 결제/수금 게이트 부재**이며, 둘 다 sourceType 무관.

## 10. 표준 흐름 위반 위험 목록
- **R1**(GAP): checkout-confirm 미결제 주문을 결제완료로 오해 가능.
- **R2**(CRITICAL, 미래): fulfillment 시작에 결제/수금 게이트 부재 → bridge 시 미결제 배송.
- **R3**(CRITICAL, 미래): delivered-only settlement → bridge 시 미수금 정산.
- **R4**(RISK): B2B offline 예외가 online canonical 로 오염.
- **R5**(현재 없음): sourceType 별 모델 분리 — 미발견(원칙 부합).
- **R6**(버그): KPA B2C payment handler 누락 → Toss 성공해도 paid 미반영.

## 11. 후보 A~C 비교
- **A. 표준 커머스 흐름 엄격(단계적)** ✅: cart=주문전 / order record / **collection confirmed 후 fulfillment** / **delivered+collection 후 settlement**. 사용자 기준·재무안전 정합. 단 readiness 모델 보강 + legacy 단계 수렴 필요.
- **B. legacy 병행**: checkout=표준, neture=delivered 중심 유지. 영향 최소이나 이원화 영속 → 단일화 기준 위배.
- **C. source 별 흐름**: 비권장(주문 이후까지 갈라짐 = O4O 차별점 오남용).

## 12. 권장 표준 pipeline
```
Cart(주문전, sourceType=metadata)
 → checkout-confirm: checkout_order 생성(미결제 가능) + 재고 확정(차감)
 → Payment/Collection 확인: online=paymentStatus 'paid'(Toss) | offline 도매=invoice/operator 확정
     → 하나의 readiness(settlementReady/collectionStatus)로 표현
 → Supplier Fulfillment: **readiness 충족 후에만** 시작(preparing→송장→shipped→delivered)
 → Settlement: delivered + readiness 충족 + 미취소/환불 + 미정산
```
- 불변식 2개(배송 전 수금확인 / 정산 전 수금+배송확인)를 **fulfillment guard + settlement guard** 로 코드화.
- B2B offline 은 readiness=operator/invoice 확정으로, online 은 readiness=paid 로 **동일 게이트의 다른 입력**.

## 13. 단계별 수렴 로드맵 (재정렬 — 본 IR 기준)
1. **R6 버그 수정** `WO-O4O-KPA-PAYMENT-EVENT-HANDLER-FIX-V1` — KPA B2C Toss 성공 시 paymentStatus=paid 반영(online readiness 신뢰 회복). 저위험·독립.
2. **readiness 모델** `IR/WO-O4O-STORE-ORDER-PAYMENT-READINESS-MODEL-V1` — collectionStatus/settlementReady 정의(online paid / offline 확정 통일).
3. **fulfillment guard** `WO-O4O-SUPPLIER-FULFILLMENT-PAYMENT-READINESS-GUARD-V1` — readiness 전 배송 시작 불가(neture 상태전이 + bridge 진입에 적용).
4. **settlement guard** `WO-O4O-SUPPLIER-SETTLEMENT-READINESS-GUARD-V1` — delivered+readiness 만 정산(+ bridge 제외 가드 흡수).
5. **bridge** `WO-O4O-CHECKOUT-ORDER-TO-NETURE-FULFILLMENT-BRIDGE-V1` — **3·4 guard 선행/동반 후** 진행.
- 순서 원칙: **게이트(3·4)를 bridge(5)보다 먼저** 세워야 미결제 배송/정산 사고를 원천 차단.

## 14. 다음 구현 WO 제안 (우선순위)
1. `WO-O4O-KPA-PAYMENT-EVENT-HANDLER-FIX-V1` (버그, 저위험, 즉시 가능)
2. `IR/WO-O4O-STORE-ORDER-PAYMENT-READINESS-MODEL-V1` (게이트의 공통 기준 정의)
3. `WO-O4O-SUPPLIER-FULFILLMENT-PAYMENT-READINESS-GUARD-V1` + `WO-O4O-SUPPLIER-SETTLEMENT-READINESS-GUARD-V1`
4. `WO-O4O-CHECKOUT-ORDER-TO-NETURE-FULFILLMENT-BRIDGE-V1` (guard 이후)

## 15. 이번 IR 에서 수정하지 않은 것
코드/스키마/migration/정산쿼리/API/UI/배송상태 **무변경**. KPA handler 버그 미수정(기록만). bridge/guard 미구현. 다른 세션 WIP 무접촉. CRITICAL/RISK/GAP 기록만.

---

## 핵심 질문 답 (WO §6)
1. 기본 순서(cart→order→…) 표준 부합. 단 결제/수금 게이트 부재. 2. cart=주문전 ✅. 3. checkout-confirm=주문 생성(미결제), 결제 아님. 4. **예 — paymentStatus=PENDING 주문이 (bridge 시) 배송으로 갈 수 있음**(현재는 checkout read-only 라 차단). 5. **fulfillment 시작에 readiness 게이트 없음**(created→preparing 허용). 6. neture B2B 는 결제확인 없이 배송/정산 — 의도된 offline 후불. 7. checkout_orders 는 아직 fulfillment 미연결(read-only). 8. settlement=delivered 단독(readiness 미반영). 9. sourceType 분기 없음 ✅. 10. **차별점은 진열/출처에 머묾, 주문 이후는 표준 지향이나 결제/수금 게이트가 비어 있음** = 본 IR 의 핵심 보강점.

---

*Status: AUDIT COMPLETE. 결론: 기본 순서는 표준 부합하나 "결제/수금 readiness 게이트"가 fulfillment·settlement 진입에 부재. 권장=후보 A(단계적). 게이트(guard)를 bridge 보다 먼저. B2B offline 은 표준의 collection 확인을 offline 확정으로 충족(예외 아님). 코드 무변경.*

# IR-O4O-NETURE-CART-CHECKOUT-ORDER-CANONICAL-FLOW-AUDIT-V1

> **유형**: Investigation / Stop-Output Audit (조사 전용 — 코드/DB/API/UI/route 변경 없음)
> **일자**: 2026-06-08
> **출처**: `WO-O4O-NETURE-STORE-CART-CHECKOUT-CANONICAL-FLOW-FIX-V1` 의 **중단 조건(§9) 충족** 으로 전환된 산출물.
> **판정**: 🛑 **STOP** — 이벤트오퍼를 장바구니 흐름으로 옮기는 것은 소규모 fix 가 아니라 **다중 서비스 cross-service 대규모 변경**. 최소 fix 조차 담을 canonical cart 가 존재하지 않음.

---

## 1. 요약 판정

**🛑 구현 중단. 이벤트오퍼 주문을 "장바구니→checkout" canonical flow 로 옮기는 작업은 안전한 최소 fix 가 불가능하다.** 이유는 단순 우회(participate)의 문제가 아니라 **매장 서비스(KPA/Glyco/KCos)에 정렬할 공유 canonical cart/checkout 인프라 자체가 없기 때문**이다.

| 중단 조건 (WO §9) | 실측 | 결과 |
|------------------|------|:----:|
| 현재 cart model 이 event_offer item 을 표현 불가 | KPA=localStorage B2C cart(이벤트오퍼 무관), KCos=cart 없음, Glyco=Neture B2B 전용 cart, **백엔드 cart 모델 0** | 🛑 HIT |
| cart checkout 이 supplierId/pricingSource 보존 불가 | event_offer/sourceType/eventOfferId 필드 없음, cart 타입 3서비스 상이 | 🛑 HIT |
| event offer 수량 차감이 participate 에 강결합 | `SELECT FOR UPDATE` + `UPDATE total_quantity` 가 participate 트랜잭션 내 원자적(event-offer.service.ts:611-706) | 🛑 HIT |
| checkout 결제 흐름이 주문 확정으로 사용 불가 | 이벤트오퍼는 'paid' 도달 경로 없음(선행 IR) + createOrder 는 **단일 supplierId/주문** | 🛑 HIT |
| event offer 를 cart 로 옮기면 기존 서비스 주문 크게 깨짐 | participate=수량차감+주문 원자성 / 다중공급자 분할 부재 | 🛑 HIT |

→ **5개 중단 조건 전부 충족.** WO 규정대로 구현 중단, 본 설계 IR 로 전환.

---

## 2. 정상(canonical) 목표 흐름 (WO 기준)

```text
상품 리스트(탭=표시 방식) → 수량 입력 → 장바구니 담기
→ 공급자별 subtotal/배송비/무료배송 계산 → 결제 또는 주문 확정
→ 공급자 주문 전달 → 공급자 배송 처리 → 정산
```
이벤트오퍼 = 공급자 상품에 **이벤트 가격 조건이 붙은 장바구니/주문 라인** (별도 주문 흐름이 아님). 이 목표는 **타당**하다. 문제는 이 흐름을 받칠 인프라가 없다는 것.

---

## 3. 현재 실제 흐름 (우회)

매장 buyer 가 이벤트오퍼 화면에서 "주문하기" 클릭:
```text
eventOfferApi.participate(id, qty)
→ event-offer.service.participate()
   ├─ Step3 트랜잭션: SELECT FOR UPDATE listing → 한도검증 → total_quantity 원자 차감 → commit (611-706)
   └─ Step4: checkoutService.createOrder() 로 checkout_orders 직접 생성 (710)
→ 장바구니 없음 · 결제 단계 없음 · 공급자 fulfillment 연결 없음
```
- 즉 participate 는 **"수량 확정 + 주문 생성"을 한 번에** 수행하는 우회 경로. 일반 장바구니/결제/공급자 배송 흐름을 타지 않는다.

---

## 4. 서비스별 cart/checkout 실측

| 영역 | 현황 | 근거 |
|------|------|------|
| **백엔드 cart** | **없음** — Cart 엔티티/`cart_items` 테이블/`/cart` 라우트 부재. checkout_orders 는 cart 없이 직접 생성 | apps/api-server grep |
| **web-kpa-society** | **localStorage B2C cart**(`services/cartService.ts`, item={productId,name,price,qty}) — 이벤트오퍼는 cart 미경유, participate 직접 | cartService.ts:1-96, EventOfferDetailPage.tsx:148 |
| **web-glycopharm** | **server-backed cart**(`StoreCart.tsx`, `/store/cart`) 이나 **Neture B2B 공급 주문 전용**, 이벤트오퍼 무관 | StoreCart.tsx, HubEventOffersPage.tsx:81 |
| **web-k-cosmetics** | **cart 없음** — 이벤트오퍼 participate(id,1) 직접 | HubEventOffersPage.tsx:84 |
| **web-neture** | client cart(StoreCartPage) → `storeApi.createOrder` → **neture 전용 `/seller/orders`**. cart item={offerId,supplierId,priceGeneral,qty} — sourceType/eventOfferId 없음, Neture 공급상품 전용 | StoreCartPage.tsx, store.ts:30-41 |
| **checkout.createOrder** | `CreateOrderDto.supplierId` **단일** → 1 호출=1 공급자 주문. 다중공급자 cart 는 **분할 오케스트레이션 필요** | checkout.service.ts:43-58 |

→ **"매장 서비스가 공유하는 canonical cart/checkout"은 존재하지 않는다.** 3개 서비스가 제각각(없음/로컬/B2B전용)이고, 이벤트오퍼는 어디서도 cart 를 경유하지 않는다.

---

## 5. 왜 최소 fix 가 불가한가

WO §7 의 "안전하게 가능하면 이벤트오퍼 장바구니 담기" 는 **담을 cart 가 없어서 성립하지 않는다.**
1. **cart 부재**: KPA/KCos 에 (이벤트오퍼용) cart 없음 → "담기" 대상 자체가 없음. 새 cart 인프라 신설 필요.
2. **수량차감 강결합**: total_quantity/per_order/per_store 차감이 participate 트랜잭션에 원자 결합 → cart 로 옮기면 차감 시점을 checkout 으로 이동해야 하고, soft-hold/경쟁 조건 재설계 필요.
3. **per-supplier 분할**: createOrder 단일 supplierId → 다중공급자 cart checkout 은 공급자별 분할 생성 오케스트레이션 신설 필요.
4. **타입 비호환**: 기존 cart item 들에 sourceType/eventOfferId/pricingSource/shippingPolicy 없음 → 3서비스 타입 확장 필요.
5. **결제 부재**: 이벤트오퍼 'paid' 경로 없음(선행 IR) → "결제 후 확정" 도 미성립.

→ 어느 하나도 단독 소규모로 닫히지 않고 **서로 맞물린다.**

---

## 6. 핵심 재해석 — 진짜 GAP 은 "공유 canonical cart/checkout 부재"

WO 가설은 "이벤트오퍼가 cart 를 우회한다"였으나, 실측의 더 깊은 사실은 **매장 서비스에 정렬할 canonical cart/checkout 이 애초에 없다**는 것이다.
- web-neture 만 (Neture 공급상품 전용) cart 보유, 나머지는 없음/로컬/B2B전용.
- checkout_orders 는 cart 없이 여러 경로(participate, kpa-checkout, neture seller order)가 **직접** 생성.
- 따라서 "이벤트오퍼만 cart 로 옮기기" 전에 **공유 cart/checkout 표준을 먼저 세우는 것(Phase 0)** 이 선결이다.

---

## 7. 단계적 설계 제안 (대규모 → 분할)

```text
Phase 0 — Canonical Cart/Checkout 표준 수립 (선결, 대형)
  · 공유 cart 모델(서버 or 표준 client) + cart item 표준(sourceType/supplierId/pricingSource/eventOfferId/priceSnapshot)
  · checkout 오케스트레이션: 공급자별 분할 → checkoutService.createOrder N회
  · 수량차감을 checkout 확정 시점으로 이동(soft-hold 정책 포함)
  · 매장 서비스(KPA/Glyco/KCos) 적용 — 공통화 우선, 서비스별 분기 최소

Phase 1 — 이벤트오퍼를 cart item 으로 편입
  · 이벤트오퍼 buyer 화면 "주문하기" → "수량 선택 → 장바구니 담기"
  · checkout 시 이벤트 기간/승인/수량/한도/event price 최종 검증(담기 시점 미확정)
  · participate() 는 내부 함수/legacy 로 격하

Phase 2 — 공급자 fulfillment/정산 연결
  · checkout 확정 → 공급자 fulfillment(선행 IR 후보 B: neture_order record) → 정산
  · 정산은 결제·수금 모델 확정 후(선행 IR §6 미수금 정산 RISK)
```

> 핵심: 이 작업은 "participate 봉합"이 아니라 **커머스 코어(cart·checkout·수량·정산)의 다단계 표준화**다. 한 WO 로 닫을 수 없다.

---

## 8. 권장 — 지금 하지 말 것 / 다음 후보

- **지금 즉시 구현 비권장**: 5개 중단 조건 충족. 부분 fix 도 cart 부재로 불가.
- **후속 후보**:
  1. **IR-O4O-STORE-CANONICAL-CART-CHECKOUT-FOUNDATION-DESIGN-V1** (Phase 0) — 공유 cart/checkout 표준·수량차감 이동·per-supplier 분할 설계. **선결.**
  2. **WO-O4O-EVENT-OFFER-TO-CART-MIGRATION-V1** (Phase 1) — Phase 0 완료 후 이벤트오퍼 cart 편입.
  3. **WO-O4O-NETURE-EVENT-OFFER-CHECKOUT-TO-NETURE-ORDER-SYNC-V1** (선행 IR fulfillment) — Phase 2 의 fulfillment 부분, 결제모델 IR 와 함께.
- **단기 현실론(선택)**: 사업 흐름 정합을 코드로 즉시 강제하기 어렵다면, 우선 **선행 IR(EVENT-OFFER-SUPPLIER-FULFILLMENT-INTEGRATION) 의 fulfillment 동기화**로 "이벤트오퍼 주문이 공급자 배송 처리 흐름에 들어가는" 절반을 먼저 닫고, cart 표준화(Phase 0)는 별도 트랙으로 진행하는 것이 위험 분산에 유리.

---

## 9. 중단 시 보존한 사실(재사용용)
- participate 수량차감 로직: event-offer.service.ts:611-706 (트랜잭션 원자). cart 이동 시 checkout 시점으로 이전 + 보상/soft-hold 재설계 대상.
- checkout per-supplier: checkout.service.ts:43-58. 다중공급자 분할 지점.
- 이벤트오퍼 가격 snapshot: items[].unitPrice = event_price ?? price_general (event-offer.service.ts). cart priceSnapshot 으로 보존.
- 배송비: SHIPPING-CALCULATION-V2 shippingPolicy 주입 — cart subtotal 기준 계산 유지.

---

## 10. 이번 감사에서 수정하지 않은 것
cart/checkout/participate/event-offer/neture_orders/checkout_orders/정산/배송비/UI — **전부 무변경**. 코드 0줄. 다른 세션 WIP 무접촉. 문서만 작성.

---

### Evidence
- participate/차감: `routes/kpa/services/event-offer.service.ts:546-771`(차감 611-706, createOrder 710)
- checkout: `services/checkout.service.ts:43-58,127-180`(단일 supplierId), `routes/kpa/controllers/kpa-checkout.controller.ts:480-484`
- cart: `web-kpa-society/src/services/cartService.ts`, `web-glycopharm/src/pages/store/StoreCart.tsx`, `web-k-cosmetics`(없음), `web-neture/src/pages/store/StoreCartPage.tsx` + `lib/api/store.ts:30-41`
- buyer 진입: KPA `EventOfferDetailPage.tsx:148`/`KpaEventOfferPage.tsx`, Glyco `HubEventOffersPage.tsx:81`, KCos `HubEventOffersPage.tsx:84`
- 백엔드 cart 부재: apps/api-server grep(Cart 엔티티/라우트 없음)

*조사 전용 — WO 중단 조건 충족 산출물. 코드/스키마/라우트 변경 없음.*

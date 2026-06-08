# IR-O4O-STORE-CANONICAL-CART-CHECKOUT-FOUNDATION-DESIGN-V1

> **유형**: Design Investigation (설계 전용 — 코드/DB/API/UI/route 변경 없음)
> **일자**: 2026-06-08
> **출처**: `IR-O4O-NETURE-CART-CHECKOUT-ORDER-CANONICAL-FLOW-AUDIT-V1` (STOP) → Phase 0 정공법 선택.
> **목적**: 매장 경영자가 주문 가능한 **모든 상품 유형(운영자 승인 상품 / B2B 공급 상품 / 이벤트 오퍼 / 판매자 모집)** 을 **하나의 장바구니/checkout 표준**으로 정렬하기 위한 기반 설계.
> **계약 근거**: `CLAUDE.md §4 E-Commerce Core`(checkoutService.createOrder() 필수 / `*_orders` 신규 생성 금지), `docs/baseline/E-COMMERCE-ORDER-CONTRACT.md`, `docs/architecture/O4O-BOUNDARY-POLICY-V1.md`(Commerce=storeId), `O4O-STORE-MENU-CANONICAL-TREE-V1`.

---

## 0. 설계 원칙 (불변)

```text
탭은 상품을 보여주는 방식일 뿐이다. 주문 흐름은 하나여야 한다.

상품 리스트(탭) → 수량 입력 → 장바구니 담기
→ 공급자별 그룹(subtotal/배송비/무료배송)
→ 결제 또는 주문 확정 → 공급자 주문 전달 → 배송 처리 → 정산
```
이벤트오퍼 = 공급자 상품에 **이벤트 가격 조건이 붙은 장바구니/주문 라인** (별도 주문 흐름 아님).

---

## 1. 요약 판정

**현재 매장 커머스는 "표준"이 없다 — 원장 2개·생성경로 3개·cart 변종 4개·공유 cart 0.** Phase 0 의 핵심은 ① **Canonical Cart Item 표준**, ② **checkoutService 단일 진입 + 공급자별 분할 오케스트레이션**, ③ **수량 차감을 checkout 확정 시점으로 이전**, ④ **주문 원장 역할 확정(checkout_orders canonical, neture_orders=legacy→fulfillment)** 네 기둥을 세우는 것이다.

| 기둥 | 결정 방향 | 비고 |
|------|-----------|------|
| Cart Item 표준 | sourceType/supplierId/pricingSource/eventOfferId/priceSnapshot/serviceKey 포함 단일 모델 | §4 |
| Cart 저장 | **서버 백엔드 cart**(cart_items) 신설, client 변종 수렴 | §5 (governance) |
| Checkout 진입 | **checkoutService.createOrder() 단일**, 공급자별 N분할 | §6 (계약 정합) |
| 수량 차감 | participate 원자 차감 → **checkout 확정 시점** 이전(+soft-hold 선택) | §7 |
| 원장 역할 | **checkout_orders = canonical 주문 원장**, neture_orders = legacy/fulfillment 수렴 | §8 (F4·계약 충돌 → 거버넌스 WO) |

---

## 2. 현재 단편화 실측 (Phase 0 가 풀어야 할 것)

### 2-1. 주문 원장 2개
- **neture_orders**: web-neture B2B 공급 주문(`/neture/seller/orders` → `seller.controller` → `legacyNetureService.createOrder`) + 공급자 fulfillment 원장(상태/송장/정산).
- **checkout_orders**: ① 이벤트오퍼 participate, ② **KPA B2C storefront**(`kpa-checkout.controller` `createCheckoutOrder`, `channel_type='B2C'`, 약국=seller), ③ 서비스 주문. (Glyco/KCos 유사.)

> **⚠ 계약 충돌**: `CLAUDE.md §4` 는 `*_orders` 신규 생성 금지 + `checkoutService.createOrder()` 필수. **`neture_orders` 는 이 계약의 legacy 예외**(F4/boundary 에서 명문화). canonical 방향은 checkout_orders.

### 2-2. 생성 경로 ≥3개 (cart 없이 직접)
participate(이벤트), kpa-checkout(B2C), neture seller order(B2B) — 모두 **cart 를 경유하지 않고** order 를 직접 생성.

### 2-3. cart 변종 4개 + 공유 0
| 서비스 | cart | 성격 |
|--------|------|------|
| web-kpa-society | localStorage `cartService.ts` | B2C storefront 전용, 이벤트오퍼 무관 |
| web-glycopharm | server cart `/store/cart`(StoreCart.tsx) | Neture B2B 공급주문 전용 |
| web-k-cosmetics | 없음 | — |
| web-neture | client cart(StoreCartPage) → neture_orders | Neture 공급상품 전용 |
| **백엔드 공유 cart** | **없음**(Cart 엔티티/`cart_items`/`/cart` 라우트 0) | — |
| **cart item 타입** | 서비스마다 상이, sourceType/eventOfferId/pricingSource 없음 | — |

---

## 3. Canonical 목표 흐름 + 불변식

```text
[상품 리스트/탭]  운영자승인 · B2B · 이벤트오퍼 · 판매자모집
      │  (탭=표시, 주문행동 동일)
      ▼ 수량 입력 → 장바구니 담기
[Cart]  공급자별 그룹 · sourceType 보존 · priceSnapshot
      ▼ 공급자별 subtotal/배송비(SHIPPING-V2)/무료배송
[Checkout 확정]  공급자별 분할 → checkoutService.createOrder × N
      │  이 시점에 수량 차감(원자) + 최종검증(이벤트 기간/한도)
      ▼
[checkout_orders]  canonical 주문 원장
      ▼ 공급자 fulfillment record(배송/송장) → 정산
```
**불변식**:
1. 모든 매장 주문은 `checkoutService.createOrder()` 를 통과한다(계약 §4).
2. 이벤트 가격·배송비는 **확정 시점 snapshot**, 이후 재계산/원본가 덮어쓰기 금지.
3. 수량 한도(total/per_order/per_store)는 **checkout 확정 시점 원자 검증·차감**.
4. 다른 공급자 상품은 해당 공급자 무료배송 기준에 미포함(공급자별 그룹).

---

## 4. Canonical Cart Item 표준 (제안)

```ts
interface CanonicalCartItem {
  // 식별/그룹
  sourceType: 'regular' | 'operator_approved' | 'b2b' | 'event_offer' | 'seller_recruitment';
  serviceKey: string;            // 매장이 속한 서비스(kpa/glycopharm/k-cosmetics/neture)
  supplierId: string;            // 공급자별 그룹·배송비 기준 (NetureSupplier.id)
  // 상품 참조 (sourceType 별)
  supplierProductOfferId?: string;        // SPO id (일반/B2B/이벤트 공통 가격원)
  organizationProductListingId?: string;  // OPL id (이벤트오퍼/진열)
  eventOfferId?: string;                   // 이벤트오퍼 listing id
  productMasterId?: string;                // 표시/검색용
  // 표시·가격
  productName: string;
  quantity: number;
  pricingSource: 'regular' | 'event_offer';
  priceSnapshot: number;         // 담을 때 표시가(검증은 checkout 에서 재확인)
}
```
- **핵심**: `sourceType` + `pricingSource` 로 "이벤트오퍼=가격 조건이 붙은 라인"을 표현. 별도 흐름 불필요.
- `supplierId` 로 공급자별 그룹/배송비. `supplierProductOfferId` 가 가격·재고·정산의 공통 앵커(이벤트오퍼도 SPO 기반).
- priceSnapshot 은 **표시용 임시값** — 신뢰 가격은 checkout 재검증(§7).

---

## 5. Cart 저장 모델 결정 + 수렴

**제안: 서버 백엔드 cart 신설(`store_carts`/`cart_items`), boundary = storeId(organizationId)+serviceKey.**
- 근거: 다중 기기·다중 공급자·checkout 재검증을 위해 client-only(localStorage)는 부적합. Boundary Policy(Commerce=storeId)와 정합.
- 수렴 전략:
  - web-kpa localStorage cart(B2C storefront) → 표준 cart 로 흡수(또는 B2C 는 별도 유지 판단 — §12 governance).
  - web-glyco server cart(/store/cart, Neture B2B) → 표준 cart 로 일반화하거나 표준이 이를 대체.
  - web-neture cart → 표준 cart + checkoutService 경로로 이전(현재 neture_orders 직접 생성 → §8).
  - 프론트는 `@o4o/*` 공통 cart hook/컴포넌트로 일원화(공통화 우선, 서비스 분기 최소).
- **대안(경량)**: 표준 client cart 모델 + 표준 checkout API 만 두고 서버 cart 는 후속. → Phase 0 범위 축소 가능(governance 선택지).

---

## 6. Checkout 오케스트레이션 (공급자별 분할)

- 현재 `checkoutService.createOrder(dto)` 는 **단일 supplierId** → 1 호출 = 1 공급자 주문(checkout.service.ts:43-58).
- **제안**: cart → `groupBy(supplierId)` → 각 그룹마다 createOrder 호출 → **N개 checkout_orders**(공급자별), 각 그룹 subtotal 기준 배송비(SHIPPING-V2 shippingPolicy 주입) 적용.
- 단일 "주문 확정" 액션 = 트랜잭션/사가로 N개 order 생성(부분 실패 보상 정책 필요 — §12).
- 결제(Toss)가 붙는 경우: 다중 공급자 결제 분할/합산은 **Phase 0 범위 밖**(결제모델 IR). Phase 0 은 "주문 확정"까지.

---

## 7. 수량 차감 재배치 + soft-hold

- 현재: participate 가 `SELECT FOR UPDATE` + `UPDATE total_quantity` 를 **주문 생성과 원자 결합**(event-offer.service.ts:611-706), 실패 시 보상(757-768).
- **제안**: 차감을 **checkout 확정 시점**으로 이전 — 장바구니 담기 시점은 **미확정**(검증만, 차감 없음). checkout 확정 트랜잭션에서 한도(total/per_order/per_store) 재검증 + 차감 + order 생성.
- **soft-hold**: 인기 이벤트 동시성↑ 시 담기~확정 사이 품절 UX 문제 → soft-hold(임시 점유 TTL) **선택적 후속**. Phase 0 은 "확정 시점 차감"만, soft-hold 는 별도 WO(과설계 방지).
- 이벤트오퍼 가격 검증도 확정 시점(이벤트 기간/승인/event_price)으로 이전.

---

## 8. checkout_orders vs neture_orders 역할 결정 ★거버넌스

**제안 방향: checkout_orders = canonical 주문 원장 / neture_orders = legacy → fulfillment 수렴.**
- 계약(§4)·E-Commerce Order Contract 상 checkoutService.createOrder() 가 정본. neture_orders 는 명문화된 legacy 예외.
- 따라서 표준 흐름은 **모든 매장 주문(이벤트/ B2B / 승인상품) → checkout_orders**. 공급자 fulfillment(배송/송장/정산)는 **downstream record**(선행 IR 후보 B: checkout_order→neture_order fulfillment record, 또는 checkout 자체 fulfillment 필드).
- **⚠ 충돌/제약**: web-neture B2B 가 현재 neture_orders 직접 생성(legacyNetureService.createOrder). 이를 checkout 경로로 옮기는 것은 **F4/boundary freeze·정산(neture delivered 기준)·fulfillment workspace** 와 얽힘 → **별도 거버넌스 WO 승인 필요**(본 IR 은 방향만 제시, 즉시 전환 비권장).
- **단계 타협**: Phase 0 은 **이벤트오퍼/매장 주문을 checkout_orders 표준으로** 먼저 정렬하고, neture_orders B2B 수렴은 **Phase 2+ 거버넌스**로 분리.

---

## 9. participate() 격하 경로

- participate 는 "수량 확정 + 주문 생성" 우회 함수 → **표준 cart/checkout 도입 후 내부 함수/legacy 로 격하**.
- 격하 방식: 이벤트오퍼 buyer "주문하기" → "장바구니 담기"로 전환(Phase 1). participate 의 수량검증/차감 로직은 **checkout 확정 오케스트레이션으로 추출·재사용**(삭제가 아닌 이전). 외부 직접 호출 제거, 내부 헬퍼로 보존.
- 회귀 방지: 기존 participate 경로는 Phase 1 전환 완료 + 검증까지 유지, 이후 단일 진입만 남김.

---

## 10. 단계적 구현 로드맵

```text
Phase 0 (본 IR → 후속 WO)
  0a. Canonical Cart Item 표준 + (서버 or 표준 client) cart 모델 확정
  0b. checkout 오케스트레이션(공급자별 분할) + 수량차감 확정시점 이전
  0c. 이벤트오퍼/매장 주문을 checkout_orders 표준으로 정렬(neture B2B 수렴은 제외)
Phase 1
  - 이벤트오퍼 buyer "주문하기"→"장바구니 담기", participate 격하
  - KPA/Glyco/KCos 공통 cart UI(공통화 우선)
Phase 2
  - 공급자 fulfillment 연결(선행 IR 후보 B) + 정산(결제·수금 모델 IR 후)
  - (거버넌스) neture_orders B2B → checkout 수렴 여부 결정
```

---

## 11. 후속 WO/IR 제안
1. **WO-O4O-STORE-CANONICAL-CART-CHECKOUT-FOUNDATION-V1** (Phase 0a/0b) — cart 모델 + checkout 분할 오케스트레이션 + 수량차감 이전. 이벤트오퍼/매장 주문 한정, neture B2B 수렴 제외.
2. **WO-O4O-EVENT-OFFER-TO-CART-MIGRATION-V1** (Phase 1) — 0 완료 후 이벤트오퍼 cart 편입 + participate 격하.
3. **(선행/병행) IR-O4O-NETURE-EVENT-OFFER-PAYMENT-AND-SETTLEMENT-MODEL-V1** — 결제·수금·정산(선행 fulfillment IR §6 미수금 RISK 연동).
4. **(거버넌스) IR-O4O-ORDER-LEDGER-CONVERGENCE-GOVERNANCE-V1** — neture_orders(legacy) ↔ checkout_orders(canonical) 수렴 결정(F4/boundary/정산 영향).

---

## 12. 리스크 / 미결 거버넌스 질문
- **R1** 원장 수렴: neture_orders 를 fulfillment 로 강등하고 checkout_orders 를 canonical 로 둘지 — F4 freeze·정산·workspace 영향. **거버넌스 결정 필요.**
- **R2** 서버 cart 신설 범위: 전면 서버 cart vs 표준 client cart + 표준 API. Phase 0 비용 좌우.
- **R3** 다중공급자 "주문 확정"의 부분 실패/보상(사가) 정책.
- **R4** B2C storefront(kpa-checkout, channelType B2C)와 B2B/이벤트 주문을 같은 cart 로 합칠지 분리할지(성격 상이).
- **R5** 결제(Toss) 연동 시점 — Phase 0 은 "주문 확정"까지, 결제 분할은 후속.
- **R6** 공통화 세션과의 충돌(다른 세션이 cart/guide/공통 패키지 작업 중일 수 있음) — 착수 전 동기화 필수.

---

## 13. 이번 IR에서 수정하지 않은 것
cart/checkout/participate/event-offer/neture_orders/checkout_orders/정산/배송비/UI/route/DB — **전부 무변경**. 코드 0줄. 다른 세션 WIP 무접촉. 설계 문서만 작성. (사용자 지시대로 SYNC-V1 미진행 — participate 직접 주문 흐름을 더 굳히지 않기 위함.)

---

### Evidence
- 원장/생성경로: `modules/neture/controllers/seller.controller.ts:339`(legacyNetureService.createOrder→neture_orders), `routes/kpa/controllers/kpa-checkout.controller.ts:114-117,474-484`(checkout_orders, channelType B2C), `routes/kpa/services/event-offer.service.ts:546-771`(participate→checkout_orders)
- checkout: `services/checkout.service.ts:43-58`(단일 supplierId)
- cart 변종: `web-kpa-society/src/services/cartService.ts`, `web-glycopharm/src/pages/store/StoreCart.tsx`, `web-k-cosmetics`(없음), `web-neture/src/pages/store/StoreCartPage.tsx`+`lib/api/store.ts:334`
- 계약: `CLAUDE.md §4`, `docs/baseline/E-COMMERCE-ORDER-CONTRACT.md`

*설계 전용 — 코드/스키마/라우트 변경 없음. Phase 0 후속 WO 의 기준 문서.*

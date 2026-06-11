# IR-O4O-NETURE-B2B-FRONTEND-CART-PAYMENT-MIGRATION-AUDIT-V1

> **유형**: Investigation (IR) — **P2d 단일 WO 구현 보류 판정**
> **목적**: `WO-O4O-NETURE-B2B-CANONICAL-CART-CHECKOUT-PHASE1-V1`(P2d) 착수 전 web-neture frontend 전환 범위·위험을 확정하고, 안전한 sub-phase 로 분할한다.
> **성격**: 코드/UI/API/DB **무변경**. 조사 문서만.
> **상위 기준**: `CHECK-O4O-NETURE-B2B-PAYMENT-FIRST-CANONICAL-FLOW-CORRECTION-V1` · P2a/P2b/P2c CHECK
> **작성일**: 2026-06-11

---

## 1. 요약 판정 — **P2d 를 단일 WO 로 밀지 않는다. payment UI 선행 후 cutover.**

| § WO 중단조건 | 적중 |
|---|:---:|
| Toss payment UI 재사용 어렵/범위 큼 | ✅ **HIT** — web-neture 에 Toss 결제 UI **전무**(0 matches) |
| frontend 전환 시 기존 주문 UX 끊김 | ✅ **HIT** — 안 A(cart→pending checkout_order, 결제 UI 없음)는 buyer 가 **결제 못 하는 pending 주문**만 양산 → 현행보다 나쁨 |
| multi-supplier createdOrders vs 단일 orderId payment | ❌ **해소** — 현행 UX 가 **공급자별 1주문** → checkout_order 1:1 payment 매핑 깔끔 |
| cart-add 진입점 과다 | ❌ **해소** — 단 3곳(동일 `addToCart` 시그니처) |

→ **결론**: 전환 자체는 가능하나, **payment-first cutover 는 결제 UI 가 frontend 에 존재해야** 성립한다. 결제 UI 가 없으므로 **(1) payment UI 선행 빌드 → (2) cart canonical + confirm + pay cutover** 2단계로 분할한다. 단일 WO 강행은 라이브 UI UX 단절 위험.

---

## 2. 조사 결과 (web-neture)

| 항목 | 사실 | 출처 |
|------|------|------|
| cart 저장 | **localStorage** `neture-store-cart`, CartItem `{offerId, name, imageUrl, priceGeneral, quantity, supplierId, supplierName}` (**productMasterId 없음**) | `src/lib/cart.ts:12-29` |
| cart-add 진입점 | **3곳** 동일 `addToCart` — StoreProductPage:121, StoreOrderDetailPage:160(reorder), StoreOrdersPage:161(bulk reorder) | — |
| canonical Store Cart API client | **없음** — `/api/v1/store/cart/*` 호출 0. 신규 `storeCart.ts` 빌드 필요 | (검색 0 matches) |
| 현행 주문 경로 | `StoreCartPage.handleSubmitOrder` → `storeApi.createOrder` → `POST /neture/seller/orders` → neture_orders. **결제 단계 없음** | `lib/api/store.ts:334`, `StoreCartPage.tsx:515-545` |
| 주문 UX | **공급자별 1주문**(그룹 카드별 "주문하기" → ShippingModal → 1 supplier order) | `StoreCartPage.tsx:440,515` |
| **Toss/결제 UI** | **전무** — `@tosspayments`/`loadTossPayments`/`clientKey`/`paymentKey`/`/payments/confirm`/PaymentPage 0 matches | (검색 0 matches) |

## 3. 핵심 함의
1. **결제 UI 부재가 최대 변수**(예상대로). payment-first frontend 는 "장바구니 → 결제 → 완료"인데, web-neture 엔 결제 위젯/확인 페이지가 없다. P2b 에서 만든 `/neture/b2b/payments/prepare|confirm`(backend)을 호출할 **Toss 위젯 UI 를 신규 빌드**해야 한다.
2. **per-supplier UX 가 다행**: createdOrders 1개 → payment prepare 1회. 다중 공급자 결제 합산(IR 별도) **불필요**. cutover 시 confirm 은 **supplier group 의 itemIds 만** 넘겨 checkout-confirm-b2b → 1 checkout_order → 1 payment.
3. **cart 전환은 저위험**(3 진입점). 단 cart-add 를 canonical `POST /store/cart/neture/items`(sourceType='b2b')로 바꾸면 localStorage→DB cart 로 모델이 바뀌므로, 3 진입점 + StoreCartPage 조회/그룹/수량/삭제까지 일괄 전환 필요.
4. **안 A(결제 UI 없이 cart만 전환)는 부적절**: 현행은 (잘못됐지만) "주문 완료"가 되는 흐름인데, 안 A 는 "pending 주문 생성 후 결제 불가"로 끝나 **완료 UX 가 사라진다**. payment-first 원칙상 결제 전 미완료가 맞지만, **결제 UI 없이 cutover 하면 buyer 가 주문을 끝낼 수 없다.**

## 4. 권장 분할 (P2d → P2d-1 / P2d-2)
```
P2d-1. WO-O4O-NETURE-B2B-PAYMENT-WIDGET-UI-V1
  - web-neture Toss 결제 위젯 + 결제 성공/실패 페이지 신설.
  - /neture/b2b/payments/order/:id (prepare 정보) → Toss 위젯 → confirm 호출 → 결과 처리.
  - KPA/Glyco/KCos 결제 UI 패턴 재사용 가능 여부 조사(있으면 이식, 없으면 신규).
  - 이 단계는 아직 cart 와 연결하지 않거나, 테스트 주문으로만 검증.

P2d-2. WO-O4O-NETURE-B2B-CANONICAL-CART-CHECKOUT-PHASE1-V1 (재정의)
  - cart-add 3진입점 + StoreCartPage 를 canonical Store Cart(/store/cart/neture/*)로 전환.
  - supplier group 별 checkout-confirm-b2b → checkout_order(pending) → P2d-1 결제 위젯으로 결제.
  - paid → bridge(자동, P2c) → 공급자 노출. legacy /neture/seller/orders buyer 호출 제거.
  - positive end-to-end 실측(주문→결제→paid→bridge→supplier 노출).

P2e. legacy /neture/seller/orders retirement (P2d-2 후)
```
> **순서 근거**: 결제 위젯(P2d-1)이 있어야 cart cutover(P2d-2)가 buyer 주문을 완료시킬 수 있다. 결제 UI 가 cart cutover 의 선행.

## 5. 대안 검토
- **안 B(단일 WO 풀 전환)**: cart+confirm+payment widget 동시 → 범위 과다(결제 위젯 신규 + cart 모델 전환 + 3진입점 + end-to-end). 라이브 UI 단일 PR 위험 큼 → 비권장.
- **안 A(cart만, 결제 후속)**: UX 단절(§3.4) → 비권장.
- **권장**: P2d-1(결제 위젯) → P2d-2(cart cutover). 각각 독립 검증·배포.

## 6. P2d-1 착수 전 확인 (다음 조사 항목)
```
- KPA/Glyco/KCos 에 재사용 가능한 Toss 결제 위젯/페이지 컴포넌트가 있는가? (web-kpa-society 등)
- web-neture 의 결제 성공/실패 redirect(successUrl/failUrl) 라우트 설계.
- 결제 위젯 clientKey 환경변수/테스트 모드 처리.
```

## 7. 이번 IR 에서 수정하지 않은 것
```
코드 / UI / API / DB / route 무변경. web-neture cart/주문/결제 무변경.
backend P2a/P2b/P2c 무변경. legacy /neture/seller/orders 유지.
다른 세션 WIP 무접촉.
```

## 8. 후속 WO
1. `WO-O4O-NETURE-B2B-PAYMENT-WIDGET-UI-V1` (P2d-1) — **다음 후보**(결제 위젯 선행). 단, KPA/Glyco/KCos 결제 UI 재사용성 조사 선행 권장.
2. `WO-O4O-NETURE-B2B-CANONICAL-CART-CHECKOUT-PHASE1-V1` (P2d-2, 재정의) — cart cutover + 결제 연결 + positive 실측.
3. `WO-O4O-NETURE-B2B-LEGACY-SELLER-ORDER-ROUTE-RETIREMENT-V1` (P2e).

## 9. 최종 기준 문장
web-neture B2B 주문은 per-supplier UX·3 cart-add 진입점으로 cart 전환 자체는 저위험이나, **Toss 결제 UI 가 전무**하여 payment-first cutover 를 단일 WO 로 닫을 수 없다. 결제 위젯(P2d-1)을 먼저 빌드한 뒤 cart canonical cutover(P2d-2)를 진행해야 buyer 주문이 결제까지 완료된다. 안 A(결제 UI 없이 cart 전환)는 미완료 pending 주문만 남겨 UX 를 단절시키므로 채택하지 않는다.

---

*Date: 2026-06-11 · Status: IR 완료 (P2d 단일 WO 보류 — 결제 UI 부재. P2d-1 결제위젯 → P2d-2 cart cutover 분할. multi-supplier·cart-add 진입점 위험은 해소됨).*

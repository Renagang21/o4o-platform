# IR-O4O-NETURE-B2B-PAYMENT-WIDGET-UI-REUSE-AUDIT-V1

> **유형**: Frontend/Payment UI Reuse Investigation (read-only)
> **목적**: web-neture B2B 결제 UI 구현 전, 기존 KPA/Glyco/KCos 결제 위젯·prepare·confirm 패턴 재사용 가능성을 확정하고 P2d-1 범위를 정한다.
> **성격**: 코드/DB/API/UI **무변경**. 조사 문서만.
> **상위 기준**: P2a/P2b/P2c CHECK · `IR-O4O-MULTI-SUPPLIER-CART-PAYMENT-AGGREGATION-V1` · `IR-O4O-NETURE-B2B-FRONTEND-CART-PAYMENT-MIGRATION-AUDIT-V1`
> **작성일**: 2026-06-11

---

## 1. 요약 판정 — **후보 A (KPA UI 복사 적용). 구현 가능.**

| 핵심 질문 | 답 |
|------|-----|
| 공통 payment 위젯 패키지 존재? | **없음** — 서비스별. backend 만 공통(PaymentCoreService). frontend 위젯은 **KPA 만 완성** |
| KPA/Glyco/KCos 중 재사용 원본? | **KPA 단독** — Glyco/KCos 는 frontend 결제 UI **전무**(backend 만 ready). → KPA 가 유일 reference |
| KPA UI 를 web-neture 로 복사 가능? | **예** — route 기반 분리(checkout/success/fail), neture-b2b endpoint 로 교체 |
| clientKey 출처 | **prepare 응답**(`payment.metadata.clientKey`) → web-neture 가 prepare 호출로 획득(env 불요) |
| paymentGroupId 를 Toss orderId 슬롯에 사용 가능? | **예** — Toss orderId 는 merchant 문자열(KPA 는 order.orderNumber 사용). format 제약 없음 → paymentGroupId 치환 저위험 |
| separate page vs inline | **separate page**(KPA: `/checkout` → `/payment/success` → `/payment/fail`). web-neture route 스타일과 호환 |

→ **결론**: P2d-1 = **KPA storefront 결제 3페이지(CheckoutPage/PaymentSuccessPage/PaymentFailPage)를 web-neture 로 복사**하고, ① endpoint 를 `/api/v1/neture/b2b/payments/*`(P2b 기구현)로, ② Toss orderId 슬롯을 **paymentGroupId** 로(group 결제) 교체. **§11 중단조건 미적중** — 구현 가능.

## 2. 조사 결과

### 2.1 KPA — 완성된 reference (복사 원본)
`services/web-kpa-society/src/pages/storefront/`
- **CheckoutPage.tsx**: order 생성 → `POST /api/v1/kpa/payments/prepare {orderId,successUrl,failUrl}` → `loadTossPayments(payment.clientKey)` → `requestPayment('카드', { amount, orderId: order.orderNumber, orderName, successUrl, failUrl })`. clientKey = prepare 응답.
- **PaymentSuccessPage.tsx**: redirect `?orderId&paymentKey&paymentId` → `POST /api/v1/kpa/payments/confirm {paymentId,paymentKey,orderId}`.
- **PaymentFailPage.tsx**: 에러 UI + 재시도.
- route(App.tsx): `/store/:slug/checkout`, `/store/:slug/payment/success`, `/store/:slug/payment/fail`.
- payment 호출은 **inline fetch**(별도 api client 추상화 아님).

### 2.2 Glyco / KCos — frontend 결제 UI 없음
- `@tosspayments`/`clientKey`/`/payments/prepare` **0 matches**(web-glycopharm, web-k-cosmetics). backend(payment controller)만 ready. → 재사용 원본으로 부적합(미구현). **KPA 가 유일.**

### 2.3 공통 payment 패키지 — 없음
- packages/ 및 services 컴포넌트에 공통 PaymentWidget/usePaymentFlow **없음**. backend `PaymentCoreService`(packages/payment-core)만 공통. **frontend 위젯은 서비스별 중복.**

### 2.4 web-neture — 결제 UI 전무
- `@tosspayments`/payment page/route **0**. `/store/checkout`·`/payment/*` route 없음. api client 에 payment 없음(guideContent/trial 만).
- store route 는 `/store/cart`, `/store/orders` 등 존재(App.tsx) → 결제 page 를 `/store/*` 하위에 추가 가능.

### 2.5 backend 전제 (P2b 기구현)
- `/api/v1/neture/b2b/payments/{prepare,confirm,order/:id}` 존재(sourceService='neture-b2b'). 단 **현재 prepare 는 단일 orderId** — group 결제는 `IR-O4O-MULTI-SUPPLIER-CART-PAYMENT-AGGREGATION-V1` 구현(paymentGroupId prepare) 선행 또는 동반 필요.

## 3. paymentGroupId UI 적용 (저위험 확인)
- KPA 가 Toss 위젯에 넘기는 `orderId` = `order.orderNumber`(merchant 문자열, UUID 아님). Toss SDK 는 orderId format 제약 없음.
- → group 결제 시 **orderId 슬롯에 paymentGroupId** 전달, success redirect 에 paymentGroupId carry, confirm body 에 paymentGroupId. backend(aggregation 구현)가 paymentGroupId 로 N개 order 처리(앞 IR §3).
- 단일 공급자(createdOrders 1) 도 동일 paymentGroupId 경로 → 일관.

## 4. 권장 후보 — A (+ separate page)
| 후보 | 판정 |
|------|------|
| **A. KPA UI 복사 → web-neture, neture-b2b endpoint** | **채택** — 유일 reference, 빠름, 회귀 낮음(neture 전용) |
| B. 공통 PaymentWidget 추출 후 적용 | 비채택(V1) — 범위 큼, KPA/Glyco/KCos 회귀 위험. 공통화는 후속 |
| C. web-neture 전용 최소 결제 page | A 와 수렴(KPA 가 이미 separate page) — A 로 흡수 |
| D. StoreCartPage 인라인 결제 | 비채택 — 상태/redirect 복잡. **separate page(8.1) 권장** |

## 5. P2d-1 구현 범위 (turnkey)
```
P2d-1. WO-O4O-NETURE-B2B-PAYMENT-WIDGET-UI-V1
  1. web-neture/src/pages/store/ 에 KPA 3페이지 복사·적응:
     - StoreCheckoutPage.tsx (또는 StorePaymentPage) — paymentGroupId 받아 prepare → Toss 위젯
     - StorePaymentSuccessPage.tsx — confirm(paymentGroupId)
     - StorePaymentFailPage.tsx
  2. endpoint: /api/v1/neture/b2b/payments/{prepare,confirm,order/:id}, sourceService='neture-b2b'
  3. Toss orderId 슬롯 = paymentGroupId. clientKey = prepare 응답.
  4. route(App.tsx): /store/checkout(or /store/payment) · /store/payment/success · /store/payment/fail
  5. web-neture api client 패턴(authClient/coreApiClient) 에 맞춰 inline fetch 대체
  - 선행/동반: MULTI-SUPPLIER aggregation 구현(group prepare/confirm) — paymentGroupId 결제가 backend 에서 동작해야 위젯 positive 검증 가능
```

## 6. UI 흐름 (권장 8.1 separate page)
```
/store/cart → checkout-confirm-b2b → paymentGroupId/groupTotalAmount
→ /store/payment?paymentGroupId=... → prepare → Toss 위젯
→ success redirect(/store/payment/success?paymentGroupId&paymentKey&paymentId) → confirm
→ 결과(공급자별 주문번호/금액/상태) → /store/orders
```
결제 전 안내: "결제 완료 후 공급자에게 주문이 전달됩니다." 결과: 공급자별 주문 요약(bridge 즉시 확인 API 없으면 "주문 내역에서 확인").

## 7. §11 중단조건 점검 (미적중)
```
기존 결제 UI 서비스별 강결합 → KPA 는 route 기반 분리, 복사 가능
clientKey/config 불명확 → prepare 응답으로 제공(env fallback 도 존재)
paymentGroupId 를 orderId 슬롯에 → Toss format 제약 없음, 저위험
success/fail redirect 가 web-neture route 와 불일치 → /store/* 하위 추가 가능
backend group 결제 미지원 → aggregation 구현 선행/동반(별도 WO, 설계 확정됨)
aggregation 선행 필요 → 맞음. P2d-1 은 aggregation 구현과 순서/동반 진행
```
→ 구현 보류 사유 없음. 단 **순서**: `MULTI-SUPPLIER aggregation 구현` → `P2d-1 위젯` → `P2d-2 cart cutover`(또는 위젯+aggregation 동반).

## 8. 이번 IR 에서 수정하지 않은 것
```
코드 / UI / API / DB / route 무변경. KPA/Glyco/KCos/web-neture 무변경. 다른 세션 WIP 무접촉.
```

## 9. 후속 WO (확정 순서)
1. `WO-O4O-MULTI-SUPPLIER-CART-PAYMENT-AGGREGATION-V1`(backend group 결제 — IR 설계 turnkey) — **선행**.
2. `WO-O4O-NETURE-B2B-PAYMENT-WIDGET-UI-V1`(P2d-1 — KPA 3페이지 복사 적용) — aggregation 동반/직후.
3. `WO-O4O-NETURE-B2B-CANONICAL-CART-CHECKOUT-PHASE1-V1`(P2d-2 — cart cutover + end-to-end positive 실측).
4. `WO-O4O-NETURE-B2B-LEGACY-SELLER-ORDER-ROUTE-RETIREMENT-V1`(P2e).
5. (후속 공통화 옵션) `WO-O4O-PAYMENT-WIDGET-SHARED-COMPONENT-V1`(KPA+neture 공통 추출).

## 10. 최종 기준 문장
web-neture B2B 결제 UI 는 **KPA storefront 결제 3페이지를 복사 적용(후보 A)** 하는 것이 가장 안전·빠르다(Glyco/KCos 는 frontend 결제 UI 부재로 KPA 가 유일 reference). clientKey 는 prepare 응답으로 제공되고, Toss orderId 슬롯에 paymentGroupId 를 넣는 group 결제도 저위험으로 가능하다. 단 backend group 결제(aggregation)가 위젯 positive 검증의 선행이므로, 구현 순서는 **aggregation → 결제위젯(P2d-1) → cart cutover(P2d-2)** 이다.

---

*Date: 2026-06-11 · Status: IR 완료 (후보 A — KPA UI 복사. 공통 위젯 부재·KPA 유일 reference·clientKey from prepare·paymentGroupId 저위험. 순서: aggregation → P2d-1 → P2d-2).*

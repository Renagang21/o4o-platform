# IR-O4O-NETURE-B2B-ORDER-TO-CANONICAL-CART-CHECKOUT-V1

> **유형**: Investigation (IR) — **구현 보류 판정**
> **목적**: Neture B2B Store Cart 의 legacy 직접 주문 경로(`/neture/seller/orders → neture_orders`)를 canonical Store Cart / checkout_orders 흐름으로 전환하기 위한 설계·범위·위험을 확정한다.
> **성격**: 코드/DB/API/UI **무변경**. 조사 문서만.
> **상위 기준**: `IR-O4O-SUPPLIER-ORDER-LEGACY-CODE-REMOVAL-AUDIT-V1`(P2), `IR-O4O-ORDER-COLLECTION-STATUS-MODEL-V1`, `WO-O4O-ORDER-COLLECTION-STATUS-METADATA-CONTRACT-V1`, fulfillment/settlement readiness guard.
> **작성일**: 2026-06-11

---

## 1. 요약 판정 — **Phase 1 구현 보류 (IR only). 중단조건 다수 적중.**

| § | 중단조건 | 적중 |
|---|----------|:---:|
| 9-① | canonical checkout-confirm 이 event_offer 전용이라 B2B item 처리 불가 | ✅ **HIT** |
| 9-③ | collectionStatus 기본값 결정 필요(비즈니스) | ✅ **HIT** |
| 9-④ | 수금 확인 action 없이 주문 후 후속 흐름 막힘 | ✅ (부분 — confirmed 경로 없음) |
| 9-⑥ | supplier fulfillment 연결 없이 전환 시 공급자 업무 단절 | ✅ **HIT** (checkout_orders `canFulfill=false`, bridge 미구현) |
| 9-⑦ | TS 영향 범위 과도(web-neture localStorage cart 전면 개편 + B2B 오케스트레이터 신설) | ✅ (큼) |

→ **결론: 지금 Phase 1(web-neture → canonical checkout_orders 전환)을 구현하면 안 된다.** 선결 4종(아래 §7)을 먼저 만든 뒤 전환해야 안전하다. 본 IR 은 그 선결 항목과 Phase 재배열을 확정하고 종료한다.

---

## 2. 현재 경로 (확정)
```
web-neture StoreCartPage.tsx (handleSubmitOrder)
→ storeApi.createOrder (lib/api/store.ts:334)
→ POST /api/v1/neture/seller/orders (seller.controller.ts:322)
→ legacyNetureService.createOrder (neture.service.ts:501-706)
→ neture_orders 직접 INSERT (status='created', 결제/수금 단계 없음)
```
- web-neture cart = **localStorage `neture-store-cart`** (lib/cart.ts), 7필드 ephemeral CartItem(offerId/name/imageUrl/priceGeneral/quantity/supplierId/supplierName). **canonical StoreCartItem DB 미사용.**
- 배송비: supplier policy 기반(`calculateSupplierShippingFee`), 단 UI 는 "안내 정보…실제 결제 반영은 별도 단계"로 disclaim(`StoreCartPage.tsx:431`).
- 결제 단계 없음(B2B 발주형). orderType: STORE_RESTOCK / DIRECT_TO_CUSTOMER(+customer_info PII+consent_at).

## 3. canonical Store Cart foundation 현황 (확정)
- **StoreCartItem 엔티티는 B2B 준비됨**: `sourceType ∈ {regular, operator_approved, b2b, event_offer, seller_recruitment}`, 필드(supplierId/supplierProductOfferId/organizationProductListingId/priceSnapshot/serviceKey/organizationId) 모두 존재. **serviceKey='neture' 유효**(service-catalog allowlist).
- **groupBySupplier / checkout-preview 는 source-agnostic** — b2b item 도 그룹/배송비 preview 가능.
- **그러나 checkout-confirm 은 event_offer 전용**:
  - `event-offer-cart-checkout.service.ts:113` — `CART_TO_EVENT_OFFER_SERVICE_KEY` 에 **neture 없음** → `UNSUPPORTED_CART_SERVICE` throw.
  - `:136` — `sourceType !== 'event_offer'` 는 `failedItems(UNSUPPORTED_CART_ITEM_SOURCE)` 로 거부.
- → **저장/조회/preview 는 되지만, B2B item 으로 checkout_orders 를 만드는 경로가 0.** (참여형 reserve→createOrder 로직에 종속.)

## 4. payload 거리 (확정)
| 항목 | `/neture/seller/orders` | `checkoutService.createOrder(CreateOrderDto)` | 격차 |
|------|------|------|------|
| items | `{product_id, quantity}` | `{productId, productName, quantity, unitPrice, subtotal, metadata?}` | **enrich 필요**(name/price/subtotal 서버 계산) |
| orderer | orderer_name/phone/email | buyerId 토큰에 암묵 | 분리/매핑 |
| shipping | recipient_name/postal_code/address_detail/delivery_note | recipientName/zipCode/address2/memo | 필드명 정규화 |
| order_type | STORE_RESTOCK / DIRECT_TO_CUSTOMER | **없음** | **모델 결정 필요** |
| customer_info | name/phone/consent_at (PII) | **없음** | **PII consent 저장 위치 결정** |
| shippingFee | createOrder 내부 계산 | shippingFeeSnapshot/policy 주입 | 책임 이동 |
| collection | (없음) | metadata.collectionStatus(계약 존재) | 기본값 결정 |

→ **drop-in 불가. adapter/transformer + 모델 결정(order_type/customer_info)이 필요.**

## 5. supplier fulfillment 단절 위험 (핵심)
- supplier workspace(`supplier-order.*`, `SupplierOrdersPage`)는 **neture_orders 를 읽는다.** checkout_orders 는 unified view 에서 `canFulfill=false`(read-only) — **fulfillment bridge 미구현.**
- B2B 를 지금 checkout_orders 로만 생성하면 → **공급자가 주문을 받아 배송 처리할 경로가 사라진다.** (orphan)
- 따라서 전환은 **fulfillment 연속성(bridge 또는 checkout_orders 직접 fulfillment)이 함께 갖춰질 때만** 안전.

## 6. collectionStatus 기본값 — 비즈니스 결정 필요
- B2B 는 결제 없음 → `paymentStatus='paid'` 안 옴. readiness 는 `collectionStatus='confirmed'` 에 의존(계약·guard 준비됨).
- **결정 필요**: 주문 생성 시 (a) `collectionStatus='pending'` + 운영자 "수금 확인" 후 confirmed, vs (b) "주문 확정 = 수금 확인"이면 생성 즉시 `confirmed`(method='operator_confirmed'/'invoice').
- (a) 는 `WO-O4O-ORDER-COLLECTION-STATUS-CONFIRM-ACTION-V1`(운영자 액션) 선결. (b) 는 액션 불요하나 "발주=수금확인" 비즈니스 합의 필요.
- **본 IR 단독으로 결정 불가 — 사용자/운영 정책 입력 필요.**

---

## 7. 전환 선결 항목 (Phase 1 전에 반드시)
```
S1. B2B checkout 오케스트레이터 신설
    - checkout-confirm 이 event_offer 전용 → 일반(b2b/regular) cart item → checkout_orders 생성 경로 필요.
    - items enrich(SPO→productName/unitPrice/subtotal), supplier group, shippingFeeSnapshot.
S2. order_type / customer_info 모델 결정
    - DIRECT_TO_CUSTOMER + customer_info(PII, consent_at)를 checkout_orders 에 어떻게 보존할지.
    - metadata vs 신규 필드. PII consent 는 민감 — 보존/마스킹 정책 동반.
S3. collectionStatus 기본값 비즈니스 결정 (§6) + (a 선택 시) 수금 확인 액션.
S4. supplier fulfillment 연속성 (§5)
    - checkout_order → neture_order fulfillment bridge(confirmed/paid 만), 또는 checkout_orders 직접 fulfillment.
    - 전환 시점에 공급자 업무가 끊기지 않도록.
(+ S5. web-neture cart localStorage → canonical StoreCartItem DB 전환(add/list/remove API 연동) — frontend rework.)
```

## 8. 권장 Phase 재배열 (removal audit 의 P2/P4 순서 보정)
```
P2-pre.  본 IR (완료)
P2a. WO-O4O-NETURE-B2B-CHECKOUT-ORCHESTRATOR-V1
     - 일반 cart item → checkout_orders 생성 오케스트레이터(S1) + order_type/customer_info 모델(S2) + collectionStatus 기본값(S3 결정 반영).
     - 단 web-neture 는 아직 미연결(백엔드 경로만, 내부 검증).
P2b. WO-O4O-CHECKOUT-ORDER-TO-NETURE-FULFILLMENT-BRIDGE-V1 (S4)
     - confirmed/paid checkout_order 만 neture_order fulfillment record 로 bridge. (guard 이미 준비)
     - → 공급자 fulfillment 연속성 확보.
P2c. WO-O4O-NETURE-B2B-CANONICAL-CART-CHECKOUT-PHASE1-V1
     - web-neture cart → canonical StoreCart API + P2a 오케스트레이터로 주문. (S5)
     - 이 시점에 비로소 frontend 전환.
P2d. WO-O4O-NETURE-B2B-LEGACY-SELLER-ORDER-ROUTE-RETIREMENT-V1
     - /neture/seller/orders 410/deprecated.
P2e. WO-O4O-SUPPLIER-UNIFIED-ORDER-VIEW-DEDUPE-CLEANUP-V1
```
> **핵심 보정**: removal audit 는 "P2 canonical → P4 bridge" 순서였으나, 본 조사로 **bridge(또는 fulfillment 연속성)가 frontend 전환(P2c)보다 먼저(P2b)** 여야 공급자 업무 단절이 없음이 확인됨. 즉 **bridge 가 frontend 전환의 선결.**

## 9. 핵심 질문 답변 (§6 of WO)
1. web-neture cart → canonical 바로 이전? **아니오** — localStorage 7필드, DB cart 미사용. frontend rework 필요.
2. seller payload → CreateOrderDto 변환? **부분** — items enrich + order_type/customer_info 모델 결정 필요(drop-in 불가).
3. checkout-confirm 이 B2B 처리? **아니오** — event_offer 전용(serviceKey·sourceType 이중 거부).
4. sourceType='b2b' 표준 존재? **엔티티엔 존재**, 단 **주문화(checkout_orders 생성) 경로 없음.**
5. collectionStatus 기본값? **미결 — 비즈니스 결정 필요**(pending+확인 vs confirmed-on-create).
6. 수금 확인 없이 fulfillment 가능? **아니오** — confirmed 아니면 guard 가 배송 차단.
7. /neture/seller/orders 410 시점? **P2d**(canonical 전환·bridge 후). 지금은 불가(유일 주문 경로).
8. neture_orders 직접 생성 중 제거 가능 부분? **buyer 경로(seller.controller POST /orders)** — 단 P2c 이후. trial 은 별도(UNKNOWN).
9. supplier workspace 연결 시점? **P2b bridge** 에서.
10. 중복 표시 방지? **P2e dedup**(bridge 후).
11. 단일 WO 가능? **불가 — Phase 분리 필수**(S1~S5).

## 10. 이번 IR 에서 수정하지 않은 것
```
코드 / DB schema / migration / API / route / UI 무변경.
web-neture cart·seller order·checkout-confirm·guard·정산 무변경.
다른 세션 WIP 무접촉.
```

## 11. 후속 WO (Phase 재배열 §8)
1. `WO-O4O-NETURE-B2B-CHECKOUT-ORCHESTRATOR-V1` (S1+S2+S3, 백엔드 경로) — **다음 후보**.
2. `WO-O4O-CHECKOUT-ORDER-TO-NETURE-FULFILLMENT-BRIDGE-V1` (S4, frontend 전환 선결).
3. `WO-O4O-NETURE-B2B-CANONICAL-CART-CHECKOUT-PHASE1-V1` (S5, frontend 전환).
4. `WO-O4O-NETURE-B2B-LEGACY-SELLER-ORDER-ROUTE-RETIREMENT-V1`.
5. `WO-O4O-SUPPLIER-UNIFIED-ORDER-VIEW-DEDUPE-CLEANUP-V1`.
6. (병행) `WO-O4O-ORDER-COLLECTION-STATUS-CONFIRM-ACTION-V1` — §6 (a) 선택 시.

## 12. 사용자 결정 필요 사항 (다음 단계 진입 전)
```
D1. order_type/customer_info(DIRECT_TO_CUSTOMER PII+consent) 를 checkout_orders 에서 어떻게 보존? (metadata vs 필드, 마스킹 정책)
D2. B2B 주문의 collectionStatus 기본값? (pending+운영자확인 vs 생성즉시 confirmed)
D3. 공급자 fulfillment 연속성: bridge(neture_order) vs checkout_orders 직접 fulfillment 중 어느 방향?
```

---

## 13. 최종 기준 문장
canonical Store Cart 저장/조회/preview 는 B2B 를 이미 수용하지만, **주문화(checkout_orders 생성)는 event_offer 전용**이고 **공급자 fulfillment 는 neture_orders 에 묶여 있어**, Neture B2B 를 지금 곧바로 canonical 로 전환하면 공급자 업무가 단절된다. 따라서 본 IR 은 **Phase 1 구현을 보류**하고, ① B2B checkout 오케스트레이터 ② order_type/customer_info 모델 ③ collectionStatus 기본값(비즈니스) ④ fulfillment 연속성(bridge) 을 선결로 확정한다. 특히 **bridge 가 frontend 전환보다 먼저**여야 한다(removal audit P2/P4 순서 보정).

---

*Date: 2026-06-11 · Status: IR 완료 (Phase 1 구현 보류 — 중단조건 다수 적중. 선결 S1~S4 + 사용자 결정 D1~D3 확정. bridge 가 frontend 전환의 선결).*

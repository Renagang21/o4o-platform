# IR-O4O-ORDER-COLLECTION-STATUS-MODEL-V1

> **유형**: Investigation / Design IR (read-only)
> **목적**: Neture B2B 주문을 canonical cart/checkout 흐름으로 전환하기 전에, "결제 완료 / 수금 확인" 상태 모델(collectionStatus)을 정의한다.
> **성격**: 코드/DB/API/UI **무변경**. 조사·설계 문서만 작성.
> **상위 기준**: `IR-O4O-SUPPLIER-ORDER-LEGACY-CODE-REMOVAL-AUDIT-V1`(P2 선행), `IR-O4O-STORE-ORDER-PAYMENT-READINESS-MODEL-V1`
> **작성일**: 2026-06-11

---

## 1. 요약 판정

| 질문 | 판정 |
|------|------|
| B2B 주문은 online 결제 주문인가, 수금 확인형인가 | **수금 확인형** — Neture B2B store cart 는 **결제 단계 없이** neture_orders 직접 생성(`StoreCartPage.tsx:500` "결제 반영 X"). → `paymentStatus='paid'` 가 영원히 안 옴 |
| collectionStatus 필요한가 | **필요 (CONFIRMED)** — paymentStatus 만으로는 B2B 수금 확인 표현 불가 |
| metadata 로 충분한가 | **임시만 가능** — 이미 fulfillment/settlement guard 가 `metadata.collectionStatus='confirmed'` 를 읽음. canonical 장기 기준은 컬럼 |
| 어디에 둘 것인가 | **checkout_orders** (B2B canonical 전환 대상 원장). neture_orders 는 bridge metadata 로 수렴 |
| guard 수정 필요한가 | **현재 없음** — fulfillment guard·settlement guard 가 이미 `metadata.collectionStatus='confirmed'` 인식(V1 metadata 호환). 컬럼 도입 시(V2) guard 조건만 보강 |
| B2B canonical 전환 선행 여부 | **본 collectionStatus 모델이 P2 선행** — 단 V1 metadata 계약만으로도 P2 착수 가능 |

**핵심 결론:**
1. **B2B 주문은 결제(Toss)를 거치지 않는 수금 확인형**이다 — Neture store cart 는 주문 record 생성 = 완료(`status='created'`, `paid_at=null`). 따라서 `paymentStatus='paid'` 를 readiness 로 쓸 수 없고 **명시적 `collectionStatus='confirmed'`(운영자/입금 확인)가 필요**하다.
2. readiness 모델은 이미 `paymentReady OR collectionReady` 로 설계돼 있고, **guard 2개가 이미 `metadata.collectionStatus='confirmed'` 를 인식**한다 → **V1 은 metadata 계약**으로 즉시 가능, **V2 는 checkout_orders 컬럼 승격**.
3. B2B canonical 전환(P2)의 최소 선행 조건 = **collectionStatus metadata 계약 확정**(값·method·confirmedAt·confirmedBy). 컬럼 migration 은 P2 와 동반 또는 후속.

---

## 2. collectionStatus 가 필요한 이유
- online 결제(KPA/Glyco/KCos B2C): `payment.completed` → `paymentStatus='paid'` 로 readiness 확정(검증됨).
- **B2B(Neture store cart)**: 결제 단계 없음. 주문 = 공급자에게 보내는 발주이고, 대금은 **인보이스/계좌입금/운영자 확인** 방식으로 사후 처리될 가능성. → "이 주문은 수금이 확인되었다"를 표현할 상태가 **없으면**, 공급자 배송·정산 readiness 를 판정할 수 없다.
- `paymentStatus='paid'` 한 축만으로는 B2B 가 영원히 not-ready → 배송/정산 불가. **collectionStatus 가 두 번째 readiness 축.**

---

## 3. checkout_orders 상태 구조 (현황)
`apps/api-server/src/entities/checkout/CheckoutOrder.entity.ts`
- `status`(created/pending_payment/paid/refunded/cancelled), `paymentStatus`(pending/paid/failed/refunded), `paidAt`/`refundedAt`/`cancelledAt`, `metadata jsonb`, `items[].metadata`.
- **collectionStatus 컬럼 없음.** metadata 로 임시 표현 가능(`metadata.collectionStatus`).
- B2B 주문을 checkout_orders 로 생성하려면: supplierId/sellerOrganizationId(존재), items(존재), 그리고 **collection 상태 필드**(신규)가 필요.

## 4. neture_orders 상태 구조 (현황)
`routes/neture/entities/neture-order.entity.ts`
- `status`(created/pending_payment/paid/preparing/shipped/delivered/cancelled/refunded), `paid_at`, `payment_key`, `metadata jsonb`, `orderType`(STORE_RESTOCK/DIRECT_TO_CUSTOMER), `customerInfo`.
- **collectionStatus 컬럼 없음.** paid 는 status 값에 융합(delivered 전이 시 status 덮임, paid_at 잔존).
- B2B store cart 주문은 `status='created'`, `paid_at=null` 로 생성 → 현재 readiness 신호 **전무**.

## 5. Neture B2B 주문 생성 흐름 (현황)
```
web-neture StoreCartPage.tsx:515 handleSubmitOrder
→ storeApi.createOrder (lib/api/store.ts:334 → POST /neture/seller/orders)
→ seller.controller.ts:339 → legacyNetureService.createOrder
→ neture_orders INSERT (status='created', paid_at=null)
→ 성공 = "주문 완료" (StoreCartPage.tsx:540)
```
- **결제 단계 없음** (`StoreCartPage.tsx:500` 주석 "결제 반영 X — 단순 소계 합산").
- Neture Toss payment controller(`routes/neture/controllers/payment.controller.ts`)는 **존재하나 이 store cart 흐름은 호출하지 않음.**
- orderType: STORE_RESTOCK(매장 입고) / DIRECT_TO_CUSTOMER(고객 직배송). 둘 다 수금 단계 없이 발주만.

> 판정: B2B = **발주형/수금 확인형**. canonical 전환 시 "주문 생성 → (운영자/입금) 수금 확인 → 배송" 흐름이 필요하고, 그 "수금 확인"이 `collectionStatus='confirmed'`.

## 6. current payment/collection readiness gap
- fulfillment guard(`WO-O4O-SUPPLIER-FULFILLMENT-PAYMENT-READINESS-GUARD-V1`): checkout-origin 주문에 `metadata.collectionStatus='confirmed'` 를 readiness 로 **이미 인식**.
- settlement guard(`WO-O4O-SUPPLIER-SETTLEMENT-READINESS-GUARD-V1`): `o.metadata->>'collectionStatus'='confirmed'` 를 정산 readiness 로 **이미 인식**.
- → **guard 측은 collectionStatus(metadata) 를 받을 준비 완료.** 비어 있는 것은 **(a) collectionStatus 를 세팅하는 주체/UI, (b) 값/method 계약, (c) 컬럼 승격 여부**.

---

## 7. collectionStatus 후보 A~D 비교

| 후보 | 내용 | 장점 | 단점 | 판정 |
|------|------|------|------|------|
| **A. metadata 기반** | `metadata.collectionStatus/collectionConfirmedAt/collectionConfirmedBy/collectionMethod` | migration 0, **guard 가 이미 인식**, bridge 즉시 적용 | 쿼리/인덱싱/정합성 약함, 장기 불안정 | **V1 채택(계약 고정)** |
| **B. checkout_orders 컬럼** | `collection_status/collection_confirmed_at/collection_method/collection_confirmed_by` | canonical 원장 명시, guard 기준 견고, 인덱싱 | migration + backfill | **V2 채택(승격)** |
| **C. 별도 order_collections 테이블** | 수금 이력/부분수금/증빙 | 추적 최강 | V1 과함, UI/API 큼 | 후속(부분수금 필요 시) |
| **D. paymentStatus 만** | 추가 모델 없음 | 단순 | **B2B 표현 불가**(사용자 기준 위반) | 비채택 |

---

## 8. 권장 모델
```
[online 결제]  paymentReady   := paymentStatus = 'paid'
[B2B/수금]     collectionReady := collectionStatus = 'confirmed'
fulfillmentReady := paymentReady OR collectionReady   (AND not cancelled/refunded)
settlementReady  := delivered AND (paymentReady OR collectionReady) AND not cancelled/refunded AND not settled
```
**collectionStatus 값**: `pending`(기본·수금 전) / `confirmed`(수금 확인 — 배송·정산 가능) / `failed` / `cancelled`(수금 전 취소) / `refunded`(수금 후 환불).
**collectionMethod**: `online_payment` / `invoice` / `operator_confirmed` / `manual_bank_transfer`.
**부속 필드**: `collectionConfirmedAt`(ISO), `collectionConfirmedBy`(operator userId).

**단계화**:
- **V1**: metadata 계약 고정(위 필드명). B2B 주문은 `collectionStatus='pending'` 으로 생성, 운영자 "수금 확인" 액션이 `'confirmed'` 로 전이. guard 는 이미 인식 → 코드 추가 최소.
- **V2**: checkout_orders 컬럼 승격 + guard 조건을 metadata→컬럼 OR 로 확장. backfill: 기존 paid 주문은 `online_payment/confirmed` 매핑.
- **V3**: 부분수금/증빙이 필요하면 order_collections.

---

## 9. fulfillment guard 와의 관계
- 현재 `getFulfillmentReadiness` 가 `metadata.collectionStatus='confirmed'` 를 인식 → **V1 metadata 만으로 동작**.
- B2B canonical 전환 시 checkout-origin 주문이 `collectionStatus='confirmed'` 면 fulfillable. **guard 수정 불요(V1).** V2 컬럼 도입 시 OR 조건만 추가.

## 10. settlement guard 와의 관계
- 현재 `calculateSettlements` 가 `o.metadata->>'collectionStatus'='confirmed'` 를 정산 readiness 로 인식 → **V1 동작**.
- 단 현 정산은 neture_orders 대상이므로, B2B 가 checkout_orders 로 canonical 전환되면 정산 쿼리도 checkout_orders 포함하도록 확장 필요(별도 WO, bridge 동반). **본 IR V1 범위 밖.**

## 11. Neture B2B canonical 전환(P2) 선행 조건
```
1. collectionStatus metadata 계약 확정(값/method/confirmedAt/confirmedBy)        ← 본 IR
2. B2B 주문 생성을 checkout_orders 로 (collectionStatus='pending' 초기값)
3. 운영자/입금 "수금 확인" 액션 → collectionStatus='confirmed' (+ confirmedAt/By)
4. confirmed 주문만 supplier fulfillment downstream (guard 이미 준비)
5. /neture/seller/orders legacy route 는 전환 후 deprecated/disabled
```
- **최소 선행 = 1번(metadata 계약)**. 2~5 는 P2 본체에서 단계 구현. 컬럼(V2)은 P2 와 동반 또는 후속.

## 12. migration 필요 여부
- **V1**: 불요(metadata). guard 이미 호환.
- **V2(컬럼 승격)**: checkout_orders 에 `collection_status` 등 4 컬럼 추가 migration + 기존 paid 주문 backfill(`online_payment/confirmed`). CI/CD 자동.
- neture_orders 는 격하 지향이므로 컬럼 추가하지 않고 bridge metadata 로 수렴.

---

## 13. 판정 매트릭스
| 항목 | 판정 |
|------|------|
| collectionStatus 필요 여부 | **필요** |
| metadata 로 충분한지 | **임시(V1)만 — 장기 불충분** |
| 컬럼 도입 필요 여부 | **필요(V2)** |
| checkout_orders 적용 | V1(metadata) → V2(컬럼) |
| neture_orders 적용 | bridge metadata / 후속 수렴(컬럼 미추가) |
| B2B canonical 전환 선행 여부 | **선행(metadata 계약) + 동반(컬럼)** |
| fulfillment guard 수정 필요 | **없음(V1)** / OR 조건 추가(V2) |
| settlement guard 수정 필요 | **없음(V1, neture_orders)** / checkout_orders 포함 시 별도 WO |

---

## 14. 후속 WO 제안
1. `WO-O4O-ORDER-COLLECTION-STATUS-METADATA-CONTRACT-V1` — collectionStatus metadata 계약 + 운영자 "수금 확인" 액션(checkout_orders metadata 세팅) 도입(V1).
2. `IR/WO-O4O-NETURE-B2B-ORDER-TO-CANONICAL-CART-CHECKOUT-V1` — `/neture/seller/orders` → checkout_orders 전환(collectionStatus='pending' 생성).
3. `WO-O4O-ORDER-COLLECTION-STATUS-COLUMN-PROMOTION-V2` — checkout_orders 컬럼 승격 + backfill + guard OR 확장.
4. `WO-O4O-NETURE-B2B-LEGACY-SELLER-ORDER-ROUTE-RETIREMENT-V1` — 전환 후 legacy route 비활성화.
5. `WO-O4O-CHECKOUT-ORDER-TO-NETURE-FULFILLMENT-BRIDGE-V1` — paid/confirmed 주문만 downstream bridge(+ 정산 checkout_orders 포함 검토).

---

## 15. 이번 IR 에서 수정하지 않은 것
```
코드 / DB schema / migration / API / UI 무변경.
collectionStatus 컬럼·metadata 세팅 미구현. B2B 주문 흐름·guard·정산 무변경.
다른 세션 WIP 무접촉.
```

## 16. 중단 조건 점검
- "B2B 가 online 결제만 쓰도록 확정 / paymentStatus 만으로 충분"? → **아니오** (B2B store cart 결제 단계 없음 확인). collectionStatus 필요 확정.
- "B2B 가 collection 상태 없이 정산 중"? → 현재 정산은 readiness(paid_at/metadata) 필터 적용됨(이전 WO). B2B 는 paid_at null 이라 현재도 정산 제외 → 정산되려면 collectionStatus 필요(모순 없음, 진행 가능).
- F7 Neture Partner Contract / F8 Distribution Engine 충돌? → 본 IR 은 주문 readiness 상태 모델만 다루며 partner contract/distribution tier 구조 무변경 → 충돌 없음(전환 WO 에서 재확인).

---

*Date: 2026-06-11 · Status: 완료 (collectionStatus 모델 정의 — B2B 수금 확인형 확정. V1 metadata 계약 → V2 컬럼 승격. guard 이미 호환. P2 선행조건 = metadata 계약).*

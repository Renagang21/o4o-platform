# CHECK-O4O-ORDER-COLLECTION-STATUS-METADATA-CONTRACT-V1

> B2B/인보이스/운영자 확인 주문의 "수금 확인됨"을 `collectionStatus='confirmed'` metadata 계약으로 고정(DB 컬럼 미추가).
> fulfillment guard·settlement guard 가 **이미 동일 필드명을 읽고 있음**을 확인하고, 순수 helper/타입으로 계약을 명문화.
> **결과: PASS** — api-server tsc 0 / guard 필드명 정합 확인 / 순수 additive(helper 신규 + entity 주석). 수금 확인 API 는 안 A 로 deferred.
> 상위: `IR-O4O-STORE-ORDER-PAYMENT-READINESS-MODEL-V1` — 2026-06-11

---

## 1. 변경 파일 (3, additive)
| 파일 | 변경 |
|------|------|
| `apps/api-server/src/services/order-collection-status.ts` | **신규** — `OrderCollectionStatus`/`OrderCollectionMethod`/`OrderCollectionMetadata` 타입 + `isCollectionConfirmed()` + `buildCollectionConfirmedMetadata()`. 순수 모듈(엔티티/서비스 import 0 → import cycle 없음) |
| `apps/api-server/src/entities/checkout/CheckoutOrder.entity.ts` | metadata 주석에 collection 계약 명시(구조 무변경) |
| `apps/api-server/src/routes/neture/entities/neture-order.entity.ts` | metadata 주석에 bridge collection 계약 명시(구조 무변경) |

> guard/service/SQL/payment/settlement 로직 **무변경**. DB schema/migration **무변경**. API/route/menu **무변경**.

## 2. metadata 계약 (V1 고정)
```ts
type OrderCollectionStatus = 'pending' | 'confirmed' | 'failed' | 'cancelled' | 'refunded';
type OrderCollectionMethod = 'online_payment' | 'invoice' | 'operator_confirmed' | 'manual_bank_transfer';
interface OrderCollectionMetadata {
  collectionStatus?: OrderCollectionStatus;
  collectionMethod?: OrderCollectionMethod;
  collectionConfirmedAt?: string;  // ISO 8601
  collectionConfirmedBy?: string;  // userId
}
```
- **상태 의미**: pending(확인 전·불가) / confirmed(확인·배송·정산 후보) / failed·cancelled·refunded(불가).
- **method 의미**: online_payment(PG, 보통 paymentStatus='paid' 동반) / invoice(후불 청구) / operator_confirmed(운영자 확인) / manual_bank_transfer(수동 입금).
- **merge 원칙**: `buildCollectionConfirmedMetadata()` 반환을 기존 metadata 위에 spread 병합. 통째 덮어쓰기 금지(주석/JSDoc 에 명시).

## 3. readiness 모델 (IR 정합)
```
fulfillmentReady := paymentStatus='paid' OR collectionStatus='confirmed'
settlementReady  := delivered AND (paymentStatus='paid' OR collectionStatus='confirmed')
```

## 4. guard 정합 확인 (핵심)
계약 필드명 `collectionStatus` 는 **기존 guard 가 이미 읽는 것과 정확히 일치** (신규 정합 아님, 명문화):

| guard | 위치 | readiness 조건 |
|-------|------|----------------|
| **fulfillment** | `supplier-order.service.ts:187` `getFulfillmentReadiness()` | `const collectionReady = md.collectionStatus === 'confirmed';` → `paymentReady \|\| collectionReady \|\| statusReady` |
| **settlement** | `neture-settlement.service.ts:169` `calculateSettlements()` | `... OR o.metadata->>'collectionStatus' = 'confirmed'` (delivered + 미정산 AND) |

→ 필드명·의미 모두 helper 계약과 동일. **두 guard 가 같은 필드를 읽음을 확인**(WO §9.4 충족). guard 자체는 미수정(런타임 무변경, settlement 는 raw SQL 이라 TS helper 사용 불가).

## 5. 수금 확인 액션 — 안 A (deferred)
- **안 A 채택**: 계약/helper 만 고정. 운영자/admin 수금 확인 API 미구현.
- 사유(WO §6.4): checkout_order metadata 를 안전하게 PATCH 하는 **명확한 admin route 부재**. 기존 매칭은 operator query/dashboard 조회 controller 뿐 → 신규 route+guard 신설은 본 WO 의 "크게 만들지 않는다" 범위 초과.
- `buildCollectionConfirmedMetadata()` 헬퍼는 후속 confirm-action WO 가 바로 사용할 수 있도록 미리 제공.
- 후속: `WO-O4O-ORDER-COLLECTION-STATUS-CONFIRM-ACTION-V1`.

## 6. 검증
- **api-server tsc 0** ✅ (helper unused 경고 없음 — 모두 export, entity 주석 무영향)
- **guard 필드명 정합** ✅ (§4 — fulfillment/settlement 모두 `collectionStatus='confirmed'`)
- **import cycle 없음** ✅ (helper 는 순수 모듈, 엔티티/서비스 import 0)
- **API smoke** — N/A (안 A, API 미추가). 코드 경로 검증 + tsc 로 갈음.
- **회귀** ✅ — paymentStatus='paid' readiness·fulfillment guard·settlement guard 기존 동작 무변경(코드 미수정). DB schema 무변경.

## 7. 회귀 무영향
- helper 는 신규·미참조(기존 흐름 진입 0). entity 주석만 추가 → 런타임/직렬화 무변경.
- guard/payment/settlement/fulfillment/bridge/cart/checkout 로직 무변경.

## 8. 완료 기준 체크 (WO §9)
1(collectionStatus 계약 고정) ✅. 2(collectionMethod 고정) ✅. 3(confirmedAt/By 고정) ✅. 4(guard 필드명 정합 확인) ✅. 5(helper 추가) ✅. 6(merge 원칙 기록) ✅. 7(schema/migration 무변경) ✅. 8(payment/fulfillment/settlement 무변경) ✅. 9(api-server tsc 0) ✅. 10(수금 확인 액션 deferred 사유 기록 — 안 A) ✅. 11(CHECK) ✅. 12(path-specific) ✅. 13(다른 세션 무접촉) ✅.

## 9. 남은 GAP/RISK · 후속
- **수금 확인 액션**: `WO-O4O-ORDER-COLLECTION-STATUS-CONFIRM-ACTION-V1` (운영자/admin PATCH, helper 사용).
- **컬럼 승격**: `WO-O4O-ORDER-COLLECTION-STATUS-COLUMN-MODEL-V2` (metadata → 컬럼, 필요 시).
- **bridge / B2B canonical**: `IR/WO-O4O-NETURE-B2B-ORDER-TO-CANONICAL-CART-CHECKOUT-V1`, `WO-O4O-CHECKOUT-ORDER-TO-NETURE-FULFILLMENT-BRIDGE-V1` — 본 계약 필드명을 동일하게 세팅해야 guard 동작.
- guard 가 helper(`isCollectionConfirmed`)를 직접 호출하도록 수렴하는 것은 선택적 후속(현재는 필드명 일치로 충분).

---

*Date: 2026-06-11 · Status: PASS (collection status metadata 계약 고정, guard 필드명 정합 확인. 수금 확인 API 는 안 A 로 deferred).*

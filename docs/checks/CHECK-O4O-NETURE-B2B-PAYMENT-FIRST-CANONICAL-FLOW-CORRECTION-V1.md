# CHECK-O4O-NETURE-B2B-PAYMENT-FIRST-CANONICAL-FLOW-CORRECTION-V1

> **유형**: 기준 보정 CHECK (문서 전용)
> **목적**: Neture B2B 주문 흐름에서 잘못 섞인 `후불/인보이스/수금 확인형(collectionStatus)` 전제를 **폐기**하고, O4O B2B 주문은 일반 전자상거래처럼 **장바구니 → 결제 → 결제 완료 후 공급자 노출 → 배송 → 정산** 의 **payment-first** 흐름을 따른다는 기준을 공식 고정한다.
> **성격**: 코드/DB/API/UI/route/guard/payment/정산 **무변경**. 문서 전용.
> **상위 기준**: O4O 의 차별점은 상품 출처·진열 방식의 다양성이며, 장바구니 이후 주문·결제·배송·정산은 하나의 표준 커머스 흐름이다.
> **작성일**: 2026-06-11

---

## 0. 정정 선언 (TL;DR)
이전 일부 IR/CHECK 가 B2B 를 "수금 확인형(collectionStatus='confirmed' 이면 배송 가능)"으로 전제했다. **이 전제를 폐기한다.**
**O4O B2B 는 선결제(payment-first)다. `paymentStatus='paid'` 가 공급자 노출·배송·정산의 유일 readiness 기준이다.** `collectionStatus` 는 B2B 기본 흐름에서 사용하지 않는다(미사용 예외 계약으로 보존만).

---

## 1. 최종 canonical flow (B2B 포함)
```
Cart
→ Supplier Group
→ Supplier Shipping Preview
→ Checkout Order (paymentStatus='pending')
→ Payment
→ paymentStatus='paid'
→ Supplier Fulfillment Visibility   ← 여기서 처음 공급자에게 보임
→ Shipping
→ Delivered
→ Settlement
```
**불변식:**
```
결제 전 주문은 공급자에게 보이지 않는다.
결제 전 주문은 배송 대상이 아니다.
결제 전 주문은 정산 대상이 아니다.
결제 완료된 주문만 공급자 주문 리스트에 보인다.
공급자는 결제 완료된 주문만 보고 배송한다.
```

## 2. 폐기 전제 (B2B 기본 흐름에서 사용 금지)
```
B2B 후불 / B2B 인보이스 후불
오프라인 수금 확인형 B2B / 운영자 수금 확인형 B2B
발주 확인과 수금 확인 분리
주문 생성 즉시 collectionStatus='confirmed'
collectionStatus='confirmed' 만으로 supplier fulfillment 가능
```
→ 후속 IR/WO 문안에서 위 표현을 **기본 흐름으로 사용하지 않는다.**

## 3. readiness 기준 보정
**기존(폐기):** `paymentStatus='paid' OR collectionStatus='confirmed'`
**보정(고정):**
```
B2B fulfillment readiness := paymentStatus='paid'
B2B settlement readiness  := delivered AND paymentStatus='paid' AND not cancelled/refunded AND not already settled
```
```
paymentStatus='pending' → 공급자 미노출 / 배송 불가 / 정산 불가
paymentStatus='paid'    → 공급자 노출 가능 / 배송 가능 / delivered 후 정산 가능
```

## 4. collectionStatus 의 위치
- `collectionStatus` metadata 계약(`services/order-collection-status.ts`, `WO-O4O-ORDER-COLLECTION-STATUS-METADATA-CONTRACT-V1`)은 **삭제하지 않되**, **B2B 기본 흐름의 readiness 기준으로 사용하지 않는다.**
- 후속 문서/코드에서 collectionStatus 를 **"미사용 예외 계약"** 으로 취급한다. 새 코드가 B2B 기본 readiness 로 참조 금지.
- (참고) guard 구현은 `paymentStatus='paid'` 를 우선 readiness 로 이미 인정한다. collectionStatus OR 조건이 코드에 남아 있어도 B2B 기본 흐름에선 paid 로만 readiness 가 충족되므로 **현재 런타임 동작은 본 기준과 모순 없음**(코드 변경 불요, 정책 보정만).

## 5. 기존 완료 작업 영향 (정책 재해석 — 코드 무변경)
| 작업 | 보정된 해석 |
|------|-------------|
| `CHECK-O4O-SUPPLIER-FULFILLMENT-PAYMENT-READINESS-GUARD-V1` | B2B 기본 흐름 readiness = `paymentStatus='paid'`. guard 의 collectionStatus 인식은 **B2B 기본 경로 미사용**(예외 계약). 코드 무변경 |
| `CHECK-O4O-SUPPLIER-SETTLEMENT-READINESS-GUARD-V1` | 정산 = `delivered AND paymentStatus='paid'`. settlement guard 의 `paid_at`/metadata 조건 중 B2B 기본은 paid 경로만 사용 |
| `CHECK-O4O-ORDER-COLLECTION-STATUS-METADATA-CONTRACT-V1` | 계약 보존, 단 **B2B 기본 readiness 아님**. "후불/인보이스/운영자 수금" 도입 근거로 인용 금지 |
| `IR-O4O-STORE-ORDER-PAYMENT-READINESS-MODEL-V1` | `paymentReady OR collectionReady` 중 **B2B 는 paymentReady 만** 적용 |
| `IR-O4O-ORDER-COLLECTION-STATUS-MODEL-V1` | "B2B 수금 확인형" 서술은 **폐기**. 본 CHECK 가 상위 보정 |
| `IR-O4O-NETURE-B2B-ORDER-TO-CANONICAL-CART-CHECKOUT-V1` | §6/§12 의 collectionStatus 기본값·"수금 확인형" 전제 폐기. 결정사항 D2(collectionStatus 기본값) **무효화** — B2B 는 payment-first |

> **코드/guard/정산 쿼리는 수정하지 않는다.** 본 문서는 정책 SSOT 보정이며, 실제 코드 정합은 후속 orchestrator/bridge WO 가 payment-first 로 구현하면 자연히 충족된다.

## 6. Neture B2B legacy 경로 재정의
```
web-neture StoreCart → POST /api/v1/neture/seller/orders → legacyNetureService.createOrder → neture_orders 직접 생성
```
- legacy 제거 사유 보정: **"수금 확인형 경로가 필요"가 아니라, 결제(checkout_orders + paymentStatus='paid')를 우회하고 공급자 주문 원장에 직접 들어간다**는 점이 문제.
- → checkout_orders + payment flow 로 전환해야 한다.

## 7. 수정된 Neture B2B canonical 목표
```
web-neture StoreCart
→ canonical Store Cart → supplier group shipping preview
→ checkout_orders (paymentStatus='pending')   ← 공급자 미노출
→ 결제 → paymentStatus='paid'
→ paid 주문만 supplier fulfillment bridge      ← 여기서 공급자 노출
→ 배송 → delivered → settlement
```

## 8. 수정된 후속 로드맵 (payment-first)
| Phase | WO | 역할 |
|------|----|------|
| P2a | `WO-O4O-NETURE-B2B-CHECKOUT-ORCHESTRATOR-V1` | B2B cart → checkout_orders 생성(`paymentStatus='pending'`), 공급자 미노출, collectionStatus 미사용 |
| P2b | `WO-O4O-NETURE-B2B-PAYMENT-FLOW-V1` | B2B checkout_order 결제 연결, `payment.completed` → `paymentStatus='paid'` |
| P2c | `WO-O4O-CHECKOUT-ORDER-TO-NETURE-FULFILLMENT-BRIDGE-V1` | **paid 주문만** supplier fulfillment bridge (pending bridge 금지) |
| P2d | `WO-O4O-NETURE-B2B-CANONICAL-CART-CHECKOUT-PHASE1-V1` | web-neture cart → canonical Store Cart/checkout/payment, `/neture/seller/orders` 미사용 |
| P2e | `WO-O4O-NETURE-B2B-LEGACY-SELLER-ORDER-ROUTE-RETIREMENT-V1` | `/neture/seller/orders` 410/제거 |
| P2f | `WO-O4O-SUPPLIER-UNIFIED-ORDER-VIEW-DEDUPE-CLEANUP-V1` | bridge 후 중복 표시 제거 |

> **이전 IR 대비 변경점**: ① collectionStatus 기본값 결정 단계 제거 ② "수금 확인 후 fulfillment" → "결제(paid) 후 fulfillment" ③ payment flow(P2b)가 명시 단계로 추가. **bridge 가 frontend 전환보다 먼저**(P2c < P2d)는 유지.

## 9. 기존 IR 보정 참조 대상
다음 문서는 후속 작업 시 **본 CHECK 를 상위 보정 기준으로 참조**한다:
```
IR-O4O-ORDER-COLLECTION-STATUS-MODEL-V1
IR-O4O-NETURE-B2B-ORDER-TO-CANONICAL-CART-CHECKOUT-V1
CHECK-O4O-ORDER-COLLECTION-STATUS-METADATA-CONTRACT-V1
CHECK-O4O-SUPPLIER-FULFILLMENT-PAYMENT-READINESS-GUARD-V1
CHECK-O4O-SUPPLIER-SETTLEMENT-READINESS-GUARD-V1
IR-O4O-STORE-ORDER-PAYMENT-READINESS-MODEL-V1
```
보정 기준: **B2B 기본 흐름은 payment-first. collectionStatus/후불/인보이스 도입 안 함. `paymentStatus='paid'` 가 공급자 노출·배송·정산의 기준.**

## 10. 이번 CHECK 에서 수정하지 않은 것
```
코드 / DB schema / migration / API / route / UI / guard / payment / 정산 쿼리 무변경.
collectionStatus helper·metadata 계약 미삭제(미사용 예외로 보존).
다른 세션 WIP 무접촉.
```

## 11. 완료 기준 체크
1(후불/인보이스 폐기 명시) ✅. 2(결제 후 공급자 노출 명시) ✅. 3(paymentStatus='paid' fulfillment readiness 고정) ✅. 4(paymentStatus='paid' settlement readiness 고정) ✅. 5(collectionStatus B2B 기본 미사용 명시) ✅. 6(/neture/seller/orders 결제 우회 legacy 재정의) ✅. 7(payment-first 로드맵 보정) ✅. 8(코드/DB/API/UI 무변경) ✅. 9(path-specific commit) ✅. 10(다른 세션 무접촉) ✅.

## 12. 최종 기준 문장
O4O B2B 는 후불/인보이스 모델을 도입하지 않는다. B2B 주문은 장바구니에서 공급업체별 배송비를 확인한 뒤 **결제**하고, **결제 완료(`paymentStatus='paid'`) 후에만** 공급자 주문 리스트에 노출된다. 공급자는 결제 완료된 주문만 보고 배송하며, 정산은 결제 완료 + 배송 완료 주문만 대상으로 한다. `collectionStatus` 는 B2B 기본 흐름에서 사용하지 않는다.

---

*Date: 2026-06-11 · Status: 기준 보정 완료 (B2B payment-first canonical flow 공식 고정. 후불/인보이스/collectionStatus 전제 폐기. 코드 무변경 — 정책 SSOT 보정).*

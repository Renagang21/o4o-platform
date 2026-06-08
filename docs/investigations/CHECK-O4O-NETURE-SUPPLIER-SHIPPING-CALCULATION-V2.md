# CHECK-O4O-NETURE-SUPPLIER-SHIPPING-CALCULATION-V2

> WO-O4O-NETURE-SUPPLIER-SHIPPING-CALCULATION-V2 검증 기록.
> 공급자 배송 정책(`base_shipping_fee`/`free_shipping_threshold`)을 주문 생성 시 배송비 계산에 반영.

- **작업일**: 2026-06-08
- **커밋**: `ebb4454e0`
- **배포**: Deploy API Server (Cloud Run) — `ebb4454e0` **success** (스키마 변경 없음 → 마이그레이션 불필요)
- **선행**: Foundation V1(필드 추가), IR-O4O-NETURE-ORDER-TABLE-BOUNDARY-DESIGN-V1(boundary)

---

## 1. 변경 요약

| 파일 | 변경 |
|------|------|
| `services/shipping/supplier-shipping.ts` (신규) | 순수 helper `calculateSupplierShippingFee(subtotal, policy)`. 엔티티/DB 무의존 → core/service 공용 |
| `services/checkout.service.ts` | `const shippingFee = 0` 제거 → `dto.shippingPolicy` 기준 계산. `CreateOrderDto.shippingPolicy?` 추가 |
| `routes/kpa/services/event-offer.service.ts` | Step2 SQL 에 `s.base_shipping_fee, s.free_shipping_threshold` 추가 → `createOrder` 에 `shippingPolicy` 주입 |
| `routes/neture/services/neture.service.ts` | `>=50000?0:3000` 고정식 제거 → 공급자별 subtotal 정책 합산(`offer.supplier` 정책 사용) |

주문 테이블/스키마/정산/송장/환불/배송상태 **무변경**.

---

## 2. Fallback 정책 (확정)

**공급자 정책 우선, 미설정 시 0원.**

```text
baseShippingFee == null        → shippingFee = 0  (policySource: fallback)
subtotal <= 0                  → shippingFee = 0
freeShippingThreshold != null
  && subtotal >= threshold     → shippingFee = 0  (freeShippingApplied: true)
else                           → shippingFee = baseShippingFee (>=0 clamp)
```

**근거**: ① Foundation 마이그레이션 주석이 "계산은 V2"로 명시하고 모든 필드 nullable·backfill 없음. ② 공급자가 명시 설정하지 않은 상태에서 자동 3,000원 부과 시 운영 민원 위험. ③ 사용자 지시(설정 없으면 0원).

---

## 3. ⚠️ 행동 변화 (운영 주의)

**기존 neture_orders 고정식(5만↑ 무료 / else 3,000원) 제거.**

- 변경 전: 공급자 정책과 무관하게 모든 neture 주문에 flat 3,000원(5만↑ 무료).
- 변경 후: **공급자가 `base_shipping_fee`를 설정하지 않으면 0원.**
- 즉 공급자별 배송 정책 입력 전까지 neture 주문 배송비는 **0원으로 표시·청구**됨.
- 운영 권고: 공급자 프로필에서 `base_shipping_fee`/`free_shipping_threshold` 설정을 안내해야 의도한 배송비가 부과됨.
- checkout(이벤트 오퍼)는 기존에도 `shippingFee=0` 였으므로 정책 설정 공급자에 한해 **증가 방향**(0→정책)만 발생 — 회귀 위험 낮음.

---

## 4. 검증

| 항목 | 결과 |
|------|------|
| api-server `tsc --noEmit` | PASS (4파일 무오류). marketTrial 팬텀 오류는 `@o4o/market-trial` stale dist → 패키지 rebuild 후 clean |
| 계층 규칙 | checkout(core)은 neture 엔티티 미import — 정책은 호출자(event-offer, service 계층)가 dto 주입. 역방향 의존 없음 |
| 공급자 정책 로딩 | neture: `findSupplierOffersByIds` `relations:['supplier']` → `offer.supplier.baseShippingFee`. event-offer: raw SQL JOIN `neture_suppliers` |
| 혼합 공급자 주문 | neture 경로는 공급자별 subtotal 그룹 합산 → 공급자별 무료배송 기준 독립 적용 |
| 배포 | Cloud Run API deploy success (`ebb4454e0`) |

### 계산 표(정책 base=3000, threshold=50000 가정)
```text
subtotal=30000 → 3000   (정책 적용)
subtotal=50000 → 0      (무료배송)
정책 미설정     → 0      (fallback)
threshold=null  → 항상 base (무료 기준 없음)
```

---

## 5. 이번에 하지 않은 것
주문 테이블 병합/동기화, supplier unified view, 정산/환불/송장/배송상태 로직, 도서산간·냉장·상품별·서비스별 예외, 무료배송 잔여금액 UI, 유통참여형 펀딩 연결, schema 변경 — 전부 범위 외.

## 6. 후속
- `WO-O4O-NETURE-SUPPLIER-ORDER-UNIFIED-VIEW-V1` (IR 권장 C)
- `WO-O4O-NETURE-SUPPLIER-FREE-SHIPPING-PROGRESS-UI-V1` (무료배송 잔여금 안내)
- 공급자 배송 정책 설정 유도(운영) — 행동 변화(§3) 완화

*조사·구현 결과 기록. 런타임 주문 생성 smoke 는 데이터 변경을 수반하므로 미수행(필요 시 통제된 smoke 별도 진행).*

# CHECK-O4O-KPA-SUPPLIER-UNIFIED-ORDER-CHECKOUT-PAYMENT-VISIBILITY-FIX-V1

> 공급자 unified 주문 리스트의 checkout_orders 조회에 `paymentStatus='paid'` 필터 추가 — payment-first 가시성 정합.
> 미결제(pending/failed) checkout_order 가 공급자에게 노출되던 가시성 드리프트 차단.
> **결과: PASS** — api-server tsc 0 / 필터·dedup·canFulfill 코드 검증 / no-auth smoke 401(mount 정상). (positive paid/pending 구분 실측은 paid B2B checkout_order 부재로 deferred.)
> 상위: `IR-O4O-KPA-SUPPLIER-PRODUCT-EXPOSURE-ORDER-FLOW-AUDIT-V1` (§10-4 C, §11 D1) — 2026-06-11

---

## 1. 변경 파일 (1, backend-only)
| 파일 | 변경 |
|------|------|
| `apps/api-server/src/modules/neture/services/supplier-unified-order.service.ts` | `queryCheckoutOrders` WHERE 절에 `AND co."paymentStatus" = 'paid'` 추가 |

> legacy `queryNetureOrders` / canFulfill 계산 / response shape / bridge dedup / DB·migration **무변경**.

## 2. 원인 (IR §9·§10-4)
- checkout fulfillment bridge 는 `paymentStatus='paid' & status='paid' & paidAt` 만 neture_orders 로 bridge(payment-first 엄격).
- 그러나 `supplier-unified-order.service.queryCheckoutOrders` 는 `WHERE co."supplierId" = $1 AND NOT EXISTS(bridge dedup)` 로 **paymentStatus 필터가 없어** 미결제(pending) checkout_order 가 공급자 unified 리스트에 read-only(canFulfill=false)로 노출 → payment-first invariant("결제 전 주문은 공급자에게 보이지 않는다")와 가시성 층 불일치.

## 3. 수정
```sql
WHERE co."supplierId" = $1
  AND co."paymentStatus" = 'paid'          -- 신규: payment-first 가시성
  AND NOT EXISTS ( ... bridge dedup ... )   -- 기존 유지
```
- `CheckoutPaymentStatus.PAID = 'paid'`(소문자 enum 값) 과 일치.
- **paid 주문**: 대부분 bridge 되어 neture_orders 로 노출(dedup 제외) → 아직 bridge 안 된 paid 주문만 read-only 로 남음.
- **pending/failed 주문**: 완전 제외(공급자 미노출).

## 4. 안전장치 / 무회귀
- legacy `neture_orders` 조회(`queryNetureOrders`) 무변경 — 기존 B2B 원장 노출 유지.
- `canFulfill: false`(checkout read-only) 계산 무변경 — 배송 가능 판정은 기존 paid guard 유지.
- bridge dedup(`NOT EXISTS metadata.checkoutOrderId`) 유지 — 중복 행 방지.
- response shape(UnifiedSupplierOrder) 무변경. route/DB/migration 무변경.

## 5. 검증
- **api-server tsc 0** ✅
- **코드 검증**: 필터는 checkout 소스에만 적용, neture 소스·canFulfill·dedup·shape 무변경 ✅
- **no-auth smoke (live, 현 리비전)**: `GET /api/v1/neture/supplier/orders/unified` → **401**(mounted, auth-first, 500 없음) ✅
- **positive 구분 실측 — DEFERRED**: paid B2B checkout_order seed 부재(상위 P2b positive 결제 전이도 deferred). 인증된 공급자로 paid 노출/pending 제외 실측은 seed 또는 P2d frontend 전환 동반 시. 쿼리 AND 조건 추가라 paid 주문은 기존과 동일 노출, pending 만 추가 제외 — 회귀 위험 없음.

## 6. 완료 기준 체크 (WO)
1(checkout 조회 paymentStatus='paid' 필터 적용) ✅. 2(pending 제외) ✅. 3(paid 기존 노출 유지) ✅. 4(bridge dedup 유지) ✅. 5(response shape 무변경) ✅. 6(legacy neture 무변경) ✅. 7(canFulfill 무변경) ✅. 8(tsc 통과) ✅. 9(path-specific commit) ✅. 10(다른 세션 무접촉) ✅.

## 7. 남은 GAP/RISK · 후속
- **positive 실측**: paid/pending checkout_order seed 확보 시 인증 공급자 노출/제외 실측.
- **legacy paid 기준 이원화**: neture_orders(paid_at) vs checkout(paymentStatus) — IR §10-9 B, 장기 수렴 후보.
- 후속(IR 로드맵): `IR-O4O-STORE-ORDERABLE-VS-CARRIED-PRODUCT-MODEL-V1`(내 매장 공통화 핵심 선행) → `IR-O4O-SELLER-RECRUITMENT-TO-SUPPLY-APPROVAL-FLOW-V1` → `IR-O4O-DISTRIBUTION-FUNDING-VS-MARKET-TRIAL-DEFINITION-V1`.

---

*Date: 2026-06-11 · Status: PASS (supplier unified checkout 조회 payment-first 가시성 필터 적용. positive 구분 실측 deferred).*

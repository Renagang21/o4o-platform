# CHECK-O4O-CHECKOUT-CREATEORDER-SHIPPING-RESPONSIBILITY-CLEANUP-V1

> `createOrder` 가 배송비를 새로 결정하는 구조를 줄이고, 장바구니에서 계산된 공급자별 배송비를 주문에
> snapshot 으로 저장하도록 책임 정리. KPA B2C 고정 3,000원은 조사 후 판단(무리한 변경 금지).
> **결과: PASS** — api-server tsc 0 / graceful no-regression smoke. (snapshot non-zero 라이브 관측은
> 정책 set supplier + active offer 부재로 deferred — 현 데이터선 snapshot/fallback 모두 0원 동일.) — 2026-06-10

---

## 1. createOrder 호출처 전수 (checkoutService.createOrder)
| 호출처 | snapshot 전달 | 비고 |
|--------|:-------------:|------|
| `services/cart/event-offer-cart-checkout.service.ts:251` (cart confirm) | **예(신규)** | orchestrator 계산 → snapshot |
| `routes/kpa/services/event-offer.service.ts:642` (participate legacy) | 아니오 | shippingPolicy fallback(무변경) |
| `controllers/checkout/checkoutController.ts:110` (Phase N-1 test/initiate) | 아니오 | fallback(무변경) |

> Neture seller(`seller.controller`)·trial-fulfillment 은 `netureService/legacyNetureService.createOrder`(별도 service) — 본 WO 범위 밖.

## 2. KPA B2C 고정 3,000원 조사 결론 — Case 2 (변경 안 함)
- `routes/kpa/controllers/kpa-checkout.controller.ts`: `shippingFee = deliveryMethod==='delivery' ? 3000 : 0`, 주문 생성은 `createCheckoutOrder(queryRunner.manager, {...})` **직접**(checkoutService.createOrder 미경유, sales_limit 트랜잭션 내).
- `supplierId = sellerId = sellerOrganizationId = organization.id` → **"공급자" = 약국 매장 org(NetureSupplier 아님)**. 즉 KPA B2C 는 **매장→소비자 B2C 모델**. NetureSupplier 배송정책(base/threshold) 적용 불가.
- 고정 3,000원은 **매장 B2C 배송비**(다른 모델)이며, 이미 `shippingFee` 를 직접 넘기는 snapshot 방식. → **유지**. 별도 정렬은 후속 `WO-O4O-KPA-B2C-SHIPPING-POLICY-ALIGNMENT-V1`.
- (WO §10 중단조건 부합: supplier policy 연결 불명확 → 무리한 변경 중단, 기록.)

## 3. 구현 (후보 C — additive, backward-compatible)
- `checkout.service.ts` `CreateOrderDto.shippingFeeSnapshot?: number` 추가.
  ```
  shippingFee = (typeof snapshot==='number' && finite && >=0) ? trunc(snapshot)
              : calculateSupplierShippingFee(subtotal, shippingPolicy).shippingFee
  ```
  → snapshot 제공 시 그대로 저장, 미제공/비유효 시 **기존 정책 계산 fallback(동작 불변)**.
- `event-offer-cart-checkout.service.ts`: `groupSubtotal = Σ lineItems.subtotal` → `shippingFeeSnapshot = calculateSupplierShippingFee(groupSubtotal, first.shippingPolicy).shippingFee` 계산 후 createOrder 에 전달. (shippingPolicy 도 fallback/debug 로 함께 전달)
  → **cart preview(groupBySupplier) 와 동일 fn·정책·subtotal** 사용 → preview==order 배송비 정렬을 orchestrator 책임으로 명시. createOrder 는 배송비 재결정 안 함.

## 4. 검증
- **api-server tsc 0** ✅ (frontend 무변경 → web tsc 불요)
- **graceful no-regression smoke** (production `o4o-core-api-02078`, kpa-society):
  - seed event_offer → preview subtotal=12,000 / shippingFee=0 / displayTotal=12,000 ✅(회귀 없음)
  - checkout-confirm(bogus offer) → createdOrders=0 / failedItems=1 ✅(graceful 유지)
  - cleanup ✅
- **snapshot non-zero 라이브 관측 — DEFERRED**: 실주문 생성엔 active event offer(KPA 0건) + non-zero 엔 정책 set supplier(프로덕션 3건 base=null) 필요 → 부재. 현 데이터선 snapshot 경로·fallback 경로 모두 0원이라 관측 동작 동일. precedence 로직은 tsc + 코드로 검증. 정책/오퍼 확보 시 자동 활성.

## 5. 회귀 무영향
- participate/checkout initiate: snapshot 미전달 → 기존 shippingPolicy fallback 그대로 ✅.
- KPA B2C: 무접촉 ✅. cart preview/confirm/CRUD/participate/결제/정산/fulfillment 무변경 ✅.
- DTO 변경은 optional additive — 기존 호출처 영향 없음.

## 6. 완료 기준 체크 (WO §11)
1(createOrder 배송비 책임 조사) ✅. 2(호출처 전수) ✅(§1). 3(snapshot additive 판단) ✅(후보 C). 4(snapshot 우선 보강) ✅. 5(cart confirm snapshot 전달) ✅. 6(shippingPolicy fallback 유지) ✅. 7(KPA B2C 조사·결론) ✅(Case 2). 8(무리한 변경 안 함) ✅. 9(tsc) ✅. 10(결제/정산/fulfillment 무변경) ✅. 11(CHECK) ✅. 12(path-specific) ✅. 13(다른 세션 무접촉) ✅.

## 7. 남은 GAP/RISK · 후속
- snapshot non-zero positive 실측(active offer + 정책 supplier) — 후속.
- KPA B2C 매장 배송비: `WO-O4O-KPA-B2C-SHIPPING-POLICY-ALIGNMENT-V1`(매장별 B2C 배송정책 구성 필요 시).
- `WO-O4O-SUPPLIER-SHIPPING-POLICY-ONBOARDING-NOTICE-V1` (0원 fallback 입력 유도).
- `IR/WO-O4O-STORE-ORDER-PAYMENT-READINESS-MODEL-V1`, `WO-O4O-KPA-PAYMENT-EVENT-HANDLER-FIX-V1`.

---

*Date: 2026-06-10 · Status: PASS (createOrder=snapshot 저장자 / orchestrator=배송비 계산자 정렬, KPA B2C 는 매장 B2C 모델로 유지. non-zero 실측 deferred).*

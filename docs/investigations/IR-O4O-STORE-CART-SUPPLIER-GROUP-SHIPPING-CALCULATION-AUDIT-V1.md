# IR-O4O-STORE-CART-SUPPLIER-GROUP-SHIPPING-CALCULATION-AUDIT-V1

> Store Cart 의 multi-supplier 담기, **공급자별 subtotal 기준 배송비/무료배송**, 주문 생성 시 배송비
> snapshot, 공급자별 주문 분리를 감사. read-only — 코드/스키마/배송비·주문 로직 무변경.
> 기준: **배송비는 주문 생성에서 새로 정하는 값이 아니라, 장바구니의 공급자별 subtotal 기준으로 먼저
> 계산되어야 한다.** sourceType/pricingSource 는 metadata 일 뿐 배송·주문 분리 기준이 아니다.
> Date: 2026-06-09 · 상위 기준: `IR-O4O-STORE-CART-PAYMENT-FULFILLMENT-STANDARD-COMMERCE-FLOW-V1`

---

## 1. 요약 판정

| 감사 항목 | 판정 |
|-----------|------|
| StoreCartItem multi-supplier 표현 | **PASS** (buyerId+serviceKey scope, item 별 supplierId) |
| groupBySupplier 공급자별 subtotal | **PASS** (event_offer 포함, 타 공급자 미혼입) |
| 공급자 배송 정책 저장(base/threshold) | **PASS** (NetureSupplier) · R7 미설정 시 0원 fallback |
| 배송비 계산식 = 공급자별 subtotal 기준 | **PASS** (`calculateSupplierShippingFee` 순수함수) |
| **checkout-preview 배송비 계산** | **GAP** — preview 는 배송비 미계산, `displayGrandTotal=상품 subtotal 만` |
| checkout-confirm→createOrder 배송비 snapshot | **PASS**(정확) — 단 계산이 **createOrder 에만** 존재 |
| **경로 간 배송비 계산 일관성** | **RISK** — event_offer/neture B2B=공급자 정책, **KPA B2C=고정 3000원** |
| 공급자별 주문 분리(split) | **PASS** ((supplierId, sellerOrg) 그룹별 1주문) |
| 공급자 전달 범위(자기 주문만) | **PASS** (supplierId 스코프) |
| sourceType/pricingSource 배송·split 분기 | **PASS** (분기 없음) |

- **핵심 판정**: 배송비 **계산식과 모델(공급자별 subtotal·무료배송)은 올바르고**, 공급자별 주문 분리/전달도 정상. 그러나 ① **장바구니 미리보기(checkout-preview)가 배송비를 계산하지 않아** 사용자가 주문 전 공급자 배송비/총액을 못 본다(GAP, R1), ② **배송비 계산이 createOrder 시점에만 존재**해 cart 표시와 어긋날 수 있다(R4), ③ **KPA B2C 경로는 공급자 정책이 아닌 고정 3000원**을 써서 경로 간 배송비 계산이 불일치한다(RISK).
- **권장 = 후보 A(Cart 가 배송비 계산 기준)**: `calculateSupplierShippingFee` 순수함수를 **preview·confirm 양쪽에서 동일 공급자 정책으로 호출**해, 장바구니 표시 = 주문 snapshot 을 보장. createOrder 는 배송비를 독립 재계산하지 않고 동일 함수의 단일 source 로 사용.

---

## 2. 기준 원칙
장바구니 이후 흐름은 출처 무관 표준 커머스. 배송비/무료배송은 **공급자별 subtotal** 기준(전체 cart 총액 아님). 주문 생성은 cart 계산값의 **snapshot 확정** 단계이지 새 계산 단계가 아니다.

## 3. StoreCartItem multi-supplier 구조 — PASS
- `StoreCartItem`: buyerId+serviceKey 경계, **item 별 supplierId**(varchar), sourceType/pricingSource/priceSnapshot/quantity/eventOfferId/supplierProductOfferId/organizationProductListingId 보존. 한 buyer+service cart 에 **여러 supplierId item 공존 가능**. → multi-supplier cart 표현 가능 ✅.

## 4. groupBySupplier subtotal 감사 — PASS
- `store-cart.service.groupBySupplier`: `supplierId`(없으면 `__no_supplier__`) 버킷팅, `displaySubtotal = Σ priceSnapshot×quantity`, itemCount/totalQuantity 계산. **sourceType 필터 없음 → event_offer 도 동일 공급자 subtotal 에 포함** ✅. 타 공급자 subtotal 미혼입 ✅.

## 5. 공급자 배송 정책 구조 감사 — PASS (R7)
- `NetureSupplier.baseShippingFee`(int, nullable) / `freeShippingThreshold`(int, nullable). event_offer 경로는 `loadEventOfferContext` 가 `neture_suppliers.base_shipping_fee/free_shipping_threshold` 를 읽어 정책 주입.
- **R7**: 정책 미설정 시 `calculateSupplierShippingFee` 가 **0원(무료) fallback**(supplier-shipping.ts:15-17, CHECK 확정). 의도된 정책이나, 공급자가 배송비 입력을 안 하면 **무료배송으로 운영 손실** 위험 → onboarding 유도 권장.

## 6. checkout-preview 배송비 계산 감사 — GAP (R1)
- `buildCheckoutPreview`(store-cart.service:251-283): suppliers(groupBySupplier) → draftOrders(items subtotal) → `displayGrandTotal = Σ g.displaySubtotal`. **배송비(shippingFee) 미계산, 무료배송 판정 없음.** `pricingRevalidationRequired:true` 는 가격/재고/배송 재검증이 confirm 단계임을 명시.
- → **장바구니 미리보기 endpoint 는 공급자별 배송비/무료배송/배송포함 총액을 제공하지 않는다.** 사용자는 주문 확정 전에는 배송비를 모름(프론트 detail 의 FreeShippingNotice 는 display-only 추정치로 별개). **표준 커머스의 "주문 전 배송비 확인" 미충족.**

## 7. checkout-confirm / createOrder 배송비 snapshot 감사 — PASS(정확) / R4
- `event-offer-cart-checkout`: 그룹별 `createOrder({ shippingPolicy: first.shippingPolicy, items: 그룹 line items })`. 그룹은 (supplierId, sellerOrg) 동일 → 모든 item 이 같은 공급자 → `first.shippingPolicy` 사용 정당.
- `checkout.service.createOrder`: `subtotal=Σitems.subtotal`, `shippingFee = calculateSupplierShippingFee(subtotal, shippingPolicy).shippingFee`, `totalAmount=subtotal+shippingFee`. → **공급자 그룹 subtotal 기준 배송비를 checkout_order.shippingFee 로 snapshot** ✅. 무료배송 threshold 도 그룹 subtotal 기준 ✅.
- **R4**: 배송비 **계산이 createOrder 안에서만** 일어난다(caller 는 policy 만 주입). cart preview 에는 동일 계산이 없어 **"미리보기 총액 ≠ 주문 총액"**(preview=상품만, order=상품+배송). 같은 순수함수를 preview 에서도 호출하면 해소.

## 8. checkoutService.createOrder 배송비 책임
- `CreateOrderDto.shippingPolicy?` 수신 → 내부에서 `calculateSupplierShippingFee` 로 배송비 산출(직접 shippingFee 입력 아님). 정책 미전달 시 0원. event_offer cart·participate·neture B2B 모두 공급자 정책 주입.
- **RISK(경로 불일치)**: **KPA B2C `/kpa/checkout` 은 `calculateSupplierShippingFee` 를 쓰지 않고 `deliveryMethod==='delivery' ? 3000 : 0` 고정**(이전 감사 확인). 즉 동일 supplier 라도 event_offer cart 경로와 B2C 경로의 배송비가 다르게 산출됨 → 단일 배송 모델 위반. 통일 필요.

## 9. 공급자별 주문 분리 감사 — PASS
- `event-offer-cart-checkout`: (supplierId, sellerOrganizationId) 그룹핑 → 그룹마다 createOrder 1회 → 각 checkout_order 는 **그 그룹 item 만** 포함. 동일 supplier+sellerOrg 는 1주문 병합, 다른 supplier 는 별도. 성공 그룹 cart item 제거, 실패 그룹 item 은 cart 유지(best-effort). ✅ 사용자는 1 cart, 내부는 공급자별 분리.

## 10. 공급자 전달 범위 감사 — PASS
- supplier unified view: checkout_orders `co."supplierId"=$1`, neture_orders `items→SPO.supplier_id=$1` 스코프 → **각 공급자 자기 주문만**. bridge 후에도 supplierId 스코프 유지 시 안전(R6 해당 없음, 단 bridge 구현 시 동일 스코프 유지 필요).

## 11. 위험 목록
- **R1(GAP)**: checkout-preview 배송비 미계산 → 주문 전 배송비/총액 확인 불가.
- **R4(RISK)**: 배송비 계산이 createOrder 에만 존재 → preview ≠ order 총액.
- **경로 불일치(RISK)**: KPA B2C 고정 3000원 vs 공급자 정책 — 배송 모델 이원화.
- **R7(RISK)**: 공급자 정책 미설정 시 0원 무료배송 운영 손실.
- **R3(참고)**: 배송비는 정산에서 공급자 미지급(플랫폼 보유) — 별도 IR(settlement) 영역.
- R2/R5/R6: split·scope 정상(현재 위험 없음). sourceType 분기 없음.

## 12. 후보 A~D 비교
- **A. Cart 가 배송비 계산 기준** ✅: groupBySupplier→공급자별 subtotal→`calculateSupplierShippingFee`→preview 표시→confirm 동일값 snapshot. 장바구니=주문 금액 일치 보장.
- **B. createOrder 가 계산**: 현재 부분 상태(계산은 createOrder, preview 없음) → 미리보기 불일치. 비권장(단일 함수로 preview 공유하면 A 로 수렴).
- **C. 전체 cart 총액 무료배송**: 공급자별 정책 위반. **현 코드 미해당**(공급자별로 올바름) → 유지 금지 대상 아님.
- **D. sourceType 별 배송비**: 미해당(분기 없음). 비권장.

## 13. 권장 설계 방향
- `calculateSupplierShippingFee` 를 **단일 배송비 source** 로 고정하고, **checkout-preview 와 checkout-confirm 양쪽에서 동일 공급자 정책으로 호출**. preview 에 `shippingFee/freeShippingApplied/공급자별 총액/grandTotal(배송 포함)` 추가 → 장바구니 표시 = 주문 snapshot.
- **KPA B2C 배송비를 공급자 정책 기반으로 통일**(고정 3000원 제거 또는 정책상 flat 임을 명문화). 단 KPA B2C 는 `/kpa/checkout` 별도 orchestrator·org 컨텍스트라 신중히.
- 공급자 배송 정책 onboarding 유도(0원 fallback 손실 방지).
- createOrder 는 배송비 **재계산이 아니라 동일 함수 결과를 snapshot**(이미 그러하나 preview 와 동기화).

## 14. 다음 구현 WO 제안 (우선순위)
1. `WO-O4O-STORE-CART-SUPPLIER-GROUP-SHIPPING-PREVIEW-V1` — checkout-preview 에 공급자별 배송비/무료배송/배송포함 총액 추가(동일 순수함수 사용). (R1 직접 해소, frontend StoreCartPage 표시 동반)
2. `WO-O4O-STORE-CART-SHIPPING-SNAPSHOT-ALIGNMENT-V1` — preview 와 checkout_order.shippingFee 일치 보장(테스트 포함).
3. `WO-O4O-CHECKOUT-CREATEORDER-SHIPPING-RESPONSIBILITY-CLEANUP-V1` — KPA B2C 고정 3000원 → 공급자 정책 통일(또는 flat 명문화).
4. `WO-O4O-SUPPLIER-SHIPPING-POLICY-ONBOARDING-NOTICE-V1` — 정책 미설정 0원 안내/입력 유도.
5. `WO-O4O-STORE-CART-SUPPLIER-SPLIT-ORDER-HARDENING-V1` — (현재 PASS, 향후 일반/B2B 혼합 cart 확대 시) split·부분실패 강화.

## 15. 이번 IR 에서 수정하지 않은 것
코드/스키마/migration/배송비·주문 로직/API/UI **무변경**. 다른 세션 WIP 무접촉. PASS/GAP/RISK 기록만.

---

## 핵심 질문 답 (WO §5)
1. multi-supplier cart 공존 가능 ✅. 2. groupBy 정확 ✅. 3. 공급자별 subtotal 정확 ✅. 4. 배송비/무료배송 **cart preview 단계엔 미계산(GAP)**, 계산식 자체는 공급자별 subtotal 기준 ✅. 5. 전체 cart 총액 무료배송 **없음** ✅. 6. createOrder 가 배송비를 **계산**(독립 재계산은 아니고 주입 정책으로 산출)하나 preview 와 어긋남. 7. **불일치 가능**: preview 총액(상품만) ≠ order 총액(상품+배송), KPA B2C 고정 3000 vs 공급자정책. 8. event_offer 동일 공급자 subtotal·무료배송에 포함 ✅. 9. checkout-confirm supplier split 수행 ✅. 10. 공급자 자기 주문만 ✅. 11. sourceType 배송/split 분기 없음 ✅. 12. 위험 = preview 배송비 부재 + 경로 간 배송비 계산 불일치(R1/R4/KPA B2C).

---

*Status: AUDIT COMPLETE. 배송 모델(공급자별 subtotal)·split·scope 는 정상. 핵심 보강 = checkout-preview 배송비 계산 + 경로 간 배송비 계산 통일(KPA B2C 고정 3000원). 코드 무변경.*

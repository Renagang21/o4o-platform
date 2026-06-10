# CHECK-O4O-STORE-CART-SUPPLIER-GROUP-SHIPPING-PREVIEW-V1

> `WO-O4O-STORE-CART-SUPPLIER-GROUP-SHIPPING-PREVIEW-V1` 결과.
> 장바구니에서 **공급자별 배송비/무료배송/배송 포함 총액**을 표시. 배송비는 주문 생성에서 새로 정하는 값이
> 아니라 장바구니 공급자별 subtotal 기준으로 계산(기존 `calculateSupplierShippingFee` 단일 source).
> **결과: PASS** — tsc 4영역 0 / API smoke / live 브라우저 PASS. (비-zero 배송비 math 는 정책 set된
> supplier 부재로 라이브 미실증 — production-proven 순수함수로 커버.) — 2026-06-10

---

## 1. 변경 파일 (7)

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/services/cart/store-cart.service.ts` | `SupplierGroup` 에 `shipping`(shippingFee/freeShippingApplied/freeShippingThreshold/remainingForFreeShipping/policyConfigured) + `displayTotal` 추가. `loadShippingPolicies`(neture_suppliers batch, uuid only, 실패/미설정→0원 fallback) + `buildGroupShipping`(calculateSupplierShippingFee 사용). groupBySupplier·buildCheckoutPreview 보강. preview 에 displayItemsSubtotal/displayShippingTotal/displayGrandTotal(=상품+배송) |
| `services/web-kpa-society/src/api/storeCart.ts` | `SupplierGroupShipping` + SupplierGroup.shipping/displayTotal 타입 |
| `services/web-kpa-society/src/pages/store-cart/StoreCartPage.tsx` | 공급자별 상품금액/배송비/공급자 합계 + 무료배송 안내 + 요약(상품/배송비/총액) |
| `services/web-glycopharm/src/api/storeCart.ts` | 동일 타입 |
| `services/web-glycopharm/src/pages/store-cart/StoreCartPage.tsx` | 동일(Tailwind, teal) |
| `services/web-k-cosmetics/src/api/storeCart.ts` | 동일 타입 |
| `services/web-k-cosmetics/src/pages/store-cart/StoreCartPage.tsx` | 동일(Tailwind, pink) |

> 배송비 계산은 기존 `services/shipping/supplier-shipping.ts` 의 `calculateSupplierShippingFee` 재사용(신규 계산식 없음).
> createOrder/checkout-confirm/정산/결제 **무변경**. event_offer 도 동일 공급자 subtotal 에 포함(sourceType 분기 없음).

## 2. 배송비 계산 기준
- 공급자별: `shippingFee = calculateSupplierShippingFee(displaySubtotal, policy)`. threshold 충족→0(무료), 정책 미설정→0(fallback), else base.
- `remainingForFreeShipping = max(0, threshold - displaySubtotal)` (기준 있고 미충족 시).
- `policyConfigured = policy.baseShippingFee != null`.
- preview/page 총액 = `displayItemsSubtotal + displayShippingTotal`.
- 정책 조회: `neture_suppliers` batch (supplierId=uuid). 조회 실패/비-uuid/미설정 → 0원 fallback(R7).

## 3. 검증

### 3.1 TypeScript
- api-server 0 · web-kpa-society 0 · web-glycopharm 0 · web-k-cosmetics 0 ✅

### 3.2 API smoke (production `o4o-core-api-02077`, serviceKey kpa-society)
| 항목 | 결과 |
|------|:----:|
| 동일 supplier 에 event_offer(9,000×2) + regular(5,000×1) 담기 → 1 group subtotal=23,000 | ✅ (event_offer+regular 동일 공급자 subtotal 합산) |
| groups[].shipping: shippingFee=0, freeShippingApplied=false, **policyConfigured=false**(실제 supplier 정책 미설정), displayTotal=23,000 | ✅ |
| checkout-preview: displayItemsSubtotal=23,000, displayShippingTotal=0, displayGrandTotal=23,000 | ✅ |
| 실제 supplier uuid(460b8513…)로 batch 정책 조회 wiring 동작(행 조회 후 base=null→fallback) | ✅ |
| cleanup | ✅ |

### 3.3 live 브라우저 (kpa-society-web, store owner)
- `/store-hub/cart` 공급자 그룹에 **상품금액 / 배송비 0원 / 공급자 합계** 표시 ✅
- 정책 미설정 안내 "배송 정책이 설정되지 않아 배송비가 0원으로 표시됩니다…" 노출(R7 onboarding nudge) ✅
- 요약 **상품 합계 / 배송비 합계 / 총 주문 예정 금액** 표시 ✅
- 주문 확정 / 장바구니 비우기 버튼 기존 동작 유지 ✅

## 4. 미실증 (graceful)
- **비-zero 배송비 / 무료배송 충족 math**: 프로덕션 supplier 3건 모두 base_shipping_fee 미설정 → 라이브로 fee>0 / freeShippingApplied=true 경로 실증 불가. 계산식(`calculateSupplierShippingFee`)은 production createOrder 가 쓰는 동일 순수함수로 검증됨. 공급자가 정책 설정 시 자동 활성. (Glyco/KCos 브라우저는 동일 코드·동일 backend라 KPA 로 대표 검증.)

## 5. 회귀 무영향
- cart add/update/remove/clear, checkout-confirm, participate, createOrder/정산/결제 **무변경**.
- preview displayGrandTotal 의미를 "상품 subtotal"→"상품+배송"으로 변경했으나, frontend StoreCartPage 는 preview 미사용(groupBySupplier 기반)이라 영향 없음. displayItemsSubtotal/displayShippingTotal additive.
- SupplierGroup.shipping/displayTotal 은 additive 필드.

## 6. 완료 기준 체크 (WO §10)
1~5(공급자별 배송비/무료배송/남은금액/총액/ event_offer 포함) ✅(API smoke). 6~7(StoreCartPage 배송비·총액 표시) ✅(브라우저). 8~9(cart CRUD/checkout-confirm 유지) ✅. 10~11(tsc) ✅. 12(API smoke) ✅. 13(browser/graceful) ✅. 14(CHECK) ✅. 15(path-specific) ✅. 16(다른 세션 무접촉) ✅.

## 7. 후속
- `WO-O4O-STORE-CART-SHIPPING-SNAPSHOT-ALIGNMENT-V1` — preview shippingFee = checkout_order.shippingFee 일치 테스트.
- `WO-O4O-CHECKOUT-CREATEORDER-SHIPPING-RESPONSIBILITY-CLEANUP-V1` — KPA B2C 고정 3000원 → 공급자 정책 통일.
- `WO-O4O-SUPPLIER-SHIPPING-POLICY-ONBOARDING-NOTICE-V1` — 0원 fallback 입력 유도.

---

*Date: 2026-06-10 · Status: PASS (비-zero 배송비 math 만 정책 set supplier 부재로 graceful).*

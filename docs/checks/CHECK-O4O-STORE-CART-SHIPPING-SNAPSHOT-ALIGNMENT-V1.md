# CHECK-O4O-STORE-CART-SHIPPING-SNAPSHOT-ALIGNMENT-V1

> 장바구니 preview 배송비 = checkout-confirm 으로 생성되는 `checkout_order.shippingFee` 가 같은 기준으로
> 계산·저장되는지 검증. 검증 중심(코드 변경 없음). read-only 분석 + graceful smoke.
> **결과: PASS (정렬은 코드 경로 동등성으로 성립)** — 단 ① positive non-zero/실주문 비교는 정책 set
> supplier + active offer 부재로 deferred, ② sellerOrg 다중 분기·가격 revalidation 은 명시 위험으로 기록. — 2026-06-10

---

## 1. 요약 판정
- preview 와 checkout-confirm 은 **동일한 배송비 계산 source 를 사용** → 정렬은 **구성상 보장**:
  - **계산 fn 동일**: 양쪽 `calculateSupplierShippingFee(subtotal, policy)` (`services/shipping/supplier-shipping.ts`).
  - **정책 source 동일**: preview `loadShippingPolicies`(neture_suppliers `base_shipping_fee`/`free_shipping_threshold`) ≡ confirm `ctx.shippingPolicy`(`loadEventOfferContext` 의 `s.base_shipping_fee`/`s.free_shipping_threshold`). 같은 테이블·컬럼.
  - **subtotal 기준 동일(가격 동일 시)**: preview = Σ(priceSnapshot×qty), confirm = Σ(ctx.unitPrice×qty). 공급자별.
- **코드 변경 불필요**: 계산이 이미 공유되고, checkout-confirm 응답 `createdOrders[]` 에 `subtotal/shippingFee/totalAmount` 가 이미 존재(비교 가능). 추가 필드/계산식 변경 없음.
- **명시 위험(2)**: ① 가격 revalidation(snapshot≠재조회) ② sellerOrg 다중 그룹 분기 — 아래 §4.

## 2. 경로 대조

| 측면 | preview (groupBySupplier/buildCheckoutPreview) | confirm (event-offer-cart-checkout → createOrder) | 일치 |
|------|-----------------------------------------------|---------------------------------------------------|:----:|
| 계산 fn | `calculateSupplierShippingFee` | `calculateSupplierShippingFee` (createOrder 내부) | ✅ |
| 정책 source | `loadShippingPolicies` → neture_suppliers base/threshold | `loadEventOfferContext` → neture_suppliers base/threshold | ✅ |
| subtotal | Σ cart `priceSnapshot`×qty (공급자별) | Σ 재조회 `ctx.unitPrice`×qty (공급자별) | 가격 동일 시 ✅ |
| grouping key | `supplierId` | `(supplierId, sellerOrganizationId=opl.organization_id)` | 단일 sellerOrg 시 ✅ |
| fee 저장 | (표시) supplier.shipping.shippingFee / displayTotal | checkout_order.shippingFee / totalAmount(=subtotal+ship) | ✅ |

→ **가격 불변 + supplier 당 단일 sellerOrg** 조건에서 preview shippingFee == checkout_order.shippingFee, preview displayTotal == checkout_order.totalAmount (구성상 동일 입력→동일 출력).

## 3. 검증

### 3.1 graceful API smoke (production `o4o-core-api-02077`, kpa-society)
| 항목 | 결과 |
|------|:----:|
| event_offer item(7,000×3) seed → preview | subtotal=21,000, shippingFee=0(정책 미설정 fallback), displayTotal=21,000, grandTotal=21,000 ✅ |
| checkout-confirm (bogus offer) | createdOrders=0 / failedItems=1 → 실주문 미생성 ✅ (graceful) |
| cleanup | ✅ |

### 3.2 positive alignment smoke — DEFERRED
- 실주문(checkout_order) 생성에는 **active event offer** 필요(KPA 0건). non-zero shippingFee 비교에는 **정책 set supplier** 필요(프로덕션 3건 모두 base=null). 둘 다 부재 → live 비교 불가.
- 대체 증명: §2 코드 경로 동등성(동일 fn·정책·subtotal식). non-zero fee 자체는 production createOrder(participate/event_offer/B2B)가 쓰는 동일 순수함수로 검증됨.

### 3.3 tsc / 회귀
- 코드 변경 없음 → tsc 영향 없음. cart CRUD/groupBySupplier/checkout-preview/checkout-confirm/participate/결제/정산/fulfillment **무변경**. UI(PREVIEW-V1) 회귀 없음.

## 4. 명시 위험 / 한계
- **R-가격**: preview 는 `priceSnapshot`(표시용), confirm 은 `ctx.unitPrice`(재조회). 담은 뒤 event price 변동 시 subtotal 이 달라져 **무료배송 경계 근처에서 shippingFee 불일치 가능**. 이는 `pricingRevalidationRequired:true` 로 명시된 **의도된 재검증**이며 버그 아님(확정 금액 우선). UI 에 "확정 시 재검증" 문구 이미 있음.
- **R-sellerOrg**: preview 는 `supplierId` 로만 그룹, confirm 은 `(supplierId, sellerOrganizationId)` 로 그룹. 한 supplier 의 cart item 이 **여러 operator org(opl.organization_id)** 에 걸치면, preview(병합 1그룹) vs confirm(org별 분리) 의 subtotal 분할이 달라져 **무료배송 경계에서 배송비 불일치** 가능.
  - **현재 현실**: 서비스별 event offer 는 단일 operator org 기준(예: KPA `c9beb4a2…`) → supplier 당 단일 sellerOrg → 분기 없음, **정렬 성립**.
  - **다중 operator org 도입 시** 분기 가능 → 후속 정렬 필요. cart item 에 organizationId 미저장(event_offer)이라 preview 가 sellerOrg 를 알 수 없는 구조적 한계.

## 5. 후속 작업
- `IR-O4O-STORE-CART-SELLERORG-GROUPING-ALIGNMENT-V1` — preview/confirm grouping key 정렬(다중 operator org 대비). 현재는 단일 org 라 우선순위 낮음.
- `WO-O4O-STORE-CART-SHIPPING-SNAPSHOT-ALIGNMENT-V2` — active event offer + 정책 set supplier 확보 시 preview shippingFee == checkout_order.shippingFee positive smoke 실측.
- `WO-O4O-CHECKOUT-CREATEORDER-SHIPPING-RESPONSIBILITY-CLEANUP-V1` — KPA B2C 고정 3000원 통일(이번 범위 외).

## 6. 완료 기준 체크 (WO §12)
1~3(preview/confirm 경로 + 동일 fn·정책 확인) ✅(§2). 4(grouping 차이 분석) ✅(§4 R-sellerOrg). 5(positive 일치 smoke) — DEFERRED(§3.2). 6(코드 경로 증명 + graceful 기록) ✅. 7(UI 회귀 없음) ✅. 8(tsc) ✅(변경 없음). 9(결제/정산/fulfillment 무변경) ✅. 10(CHECK) ✅. 11(path-specific) ✅. 12(다른 세션 무접촉) ✅.

---

*Date: 2026-06-10 · Status: PASS (정렬 = 코드 경로 동등성으로 성립; positive 실측 deferred; 가격 revalidation·다중 sellerOrg 는 명시 위험). 코드 무변경 — CHECK 문서만.*

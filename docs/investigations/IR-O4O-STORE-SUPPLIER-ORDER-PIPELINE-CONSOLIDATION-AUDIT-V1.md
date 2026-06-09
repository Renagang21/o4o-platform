# IR-O4O-STORE-SUPPLIER-ORDER-PIPELINE-CONSOLIDATION-AUDIT-V1

> 공급업체로 전달되는 주문의 **생성·배송·정산 코드 경로 전면 감사**. read-only — 코드/스키마/API 무변경.
> 기준 문장: *공급자에게 가는 주문은 상품 출처와 무관하게 단일 supplier order pipeline 을 타야 한다.
> sourceType/pricingSource 는 metadata 일 뿐 주문 모델 분리 기준이 아니다.*
> Date: 2026-06-09

---

## 1. 요약 판정

현재 공급자 주문은 **두 개의 병렬 주문 원장**으로 갈라져 있다 — 이것이 단일화의 핵심 대상이다.

| 원장 | 생성 함수 | 쓰는 흐름 | 정산 | fulfillment |
|------|----------|----------|------|-------------|
| **checkout_orders** (`CheckoutOrder`) | `checkoutService.createOrder()` (CLAUDE.md §4 canonical) | event_offer cart, KPA B2C(`/kpa/checkout`), participate(legacy), Phase N-1 test | **누락(정산 안 됨)** | 상태머신 없음(read-only 노출만) |
| **neture_orders** (`NetureOrder`) | `neture.service.createOrder()` (legacy) | Neture B2B 셀러주문(`/neture/seller/orders`), trial-fulfillment | **정산 기준 원장** (delivered) | 상태머신 + shipments 보유 |

**판정:**
- **CANONICAL 생성 지점 = `checkoutService.createOrder()` → checkout_orders** (CLAUDE.md §4 강제, KPA B2C·event_offer 이미 사용). ✅
- **LEGACY 격하 대상 = neture_orders direct create(`/neture/seller/orders`)** — 단, 정산·fulfillment 자산이 여기에만 있어 즉시 폐기 불가. ⚠️
- **CRITICAL GAP**: checkout_orders 로 생성된 주문(event_offer·B2C)은 **정산에서 제외**된다(정산은 neture_orders delivered 만 집계). 단일화의 1차 동인.
- **sourceType/pricingSource 는 metadata 로만 사용**됨(주문 모델 분기 없음) — 기준 부합. 실제 분기는 sourceType 이 아니라 **두 원장 자체**다. ✅(원칙 위반 코드 없음)
- **권장 방향 = 후보 B** (checkout_orders canonical + neture_orders 를 downstream fulfillment/settlement bridge 로 단계 수렴). 이미 2026-06-08 supplier unified read-only view 로 1보 진행됨.

> 선행 설계 문서 존재: `IR-O4O-NETURE-ORDER-TABLE-BOUNDARY-DESIGN-V1` + `CHECK-O4O-NETURE-SUPPLIER-ORDER-UNIFIED-VIEW-V1`(2026-06-08, Option C 읽기전용 통합 구현). 본 IR 은 그 위에 **정산/생성 단일화 로드맵**을 얹는다.

---

## 2. 현재 주문 코드 경로 map (생성 진입점 6)

### checkout_orders 계열 — `checkoutService.createOrder()` (`apps/api-server/src/services/checkout.service.ts:127`)
1. **`POST /api/checkout/initiate`** — `controllers/checkout/checkoutController.ts:110`. Phase N-1 테스트(supplierId/sellerId 하드코딩, metadata 없음). → **LEGACY/TEST**.
2. **store cart `checkout-confirm`** — `services/cart/event-offer-cart-checkout.service.ts:251`. supplier+sellerOrg 그룹별 1주문, items[].metadata(sourceType/eventOfferId/...) 보존. → **CANONICAL (신규 entry)**.
3. **`POST /event-offer/:id/participate`** — `routes/kpa/services/event-offer.service.ts:634`. buyer UI 직접호출 0건(Phase 1a/1c 이후). → **LEGACY (검증/차감 helper 로 잔존)**.
4. **`POST /api/v1/kpa/checkout`** — `routes/kpa/controllers/kpa-checkout.controller.ts`. KPA B2C 스토어프론트. checkout_orders 생성, `metadata.channelType='B2C'`·`serviceKey` 는 **routing metadata only**(분기 아님). → **CANONICAL-aligned** (단 localStorage cart 미수렴).

### neture_orders 계열 — `neture.service.createOrder()` (`routes/neture/services/neture.service.ts:501`)
5. **`POST /api/v1/neture/seller/orders`** — `modules/neture/controllers/seller.controller.ts:322`. Neture B2B 셀러주문. neture_orders 생성. **다공급자/주문**, orderType(STORE_RESTOCK/DIRECT_TO_CUSTOMER), 재고예약(trackInventory). → **LEGACY-divergent (수렴 핵심)**.
6. **`POST /api/trial-fulfillment/:participationId/create-order`** — `extensions/trial-fulfillment/trialFulfillment.controller.ts:235`. neture_orders 생성(단건, metadata.source='trial-fulfillment'). → **LEGACY-divergent**.

> **두 원장 사이 FK/연결키 없음.** 공통키는 supplierId 뿐(checkout_orders.supplierId 컬럼 ↔ neture_order_items.product_id→SPO.supplier_id).

---

## 3. Store Cart checkout-confirm 경로
- `StoreCartItem`(sourceType/pricingSource/eventOfferId/supplierId/priceSnapshot) → `EventOfferCartCheckoutService.confirm()` → `(supplierId, sellerOrganizationId)` 그룹 → 그룹 1트랜잭션 reserve(FOR UPDATE+한도+차감) → 병합 `createOrder()` → checkout_orders 1행(line item metadata 보존) → cart cleanup. 그룹 단위 atomic, 그룹 간 best-effort.
- **판정**: supplier order canonical entry 로 확장 **가능**. 현재 V1 은 `sourceType='event_offer'` 만 처리하지만 구조(supplier 그룹 + line item source metadata)는 일반/B2B/승인/모집 상품을 그대로 수용 가능. **GAP**: 일반/B2B 상품을 cart 에 담는 add 경로·재고차감 모델 미구현.

## 4. event-offer participate legacy 경로
- `participate()` 는 이제 `loadEventOfferContext`+`reserveEventOfferListing` helper 를 쓰며 buyer UI 직접 호출 **0건**(KPA/Glyco/KCos 모두 cart 담기로 전환됨). Glyco/KCos 컨트롤러는 동일 service 를 service_key 만 바꿔 재사용.
- **판정**: participate 는 **외부 buyer 주문 API 로 유지 불필요**. 검증/차감 helper(`reserveEventOfferListing`)는 cart checkout-confirm 이 이미 재사용 중. → **LEGACY 격하 가능**(운영자/테스트 잔존 호출 확인 후 deprecation).

## 5. KPA/Glyco/KCos event_offer cart 경로
- 3서비스 동일 `StoreCartItem` + `buildEventOfferCartPayload`(uuid guard) + `StoreCartPage` + `/store-hub/cart`. serviceKey mapping 일관(`kpa-society→kpa-groupbuy`, `glycopharm→glycopharm-event-offer`, `k-cosmetics→k-cosmetics-event-offer`). checkout-confirm supplier+sellerOrg 병합. graceful smoke 3서비스 PASS, positive 는 active offer 부재로 deferred.
- **판정**: cross-service 일관 **PASS**. canonical 흐름의 reference.

## 6. web-neture B2B / neture_orders 경로
- 프론트 `services/web-neture/src/pages/store/StoreCartPage.tsx`(localStorage cart) → `storeApi.createOrder()` → `POST /neture/seller/orders` → `neture.service.createOrder()` → **neture_orders direct create**(checkoutService 미경유).
- 특징: 다공급자/주문(supplierId 주문레벨 없음, item 별 SPO 로 resolve), orderType 분기, 7-gate(재고예약 포함), supplier 정책 배송비.
- **판정**: **checkoutService.createOrder 계약과 충돌하는 legacy-divergent 경로**(RISK). 수렴하려면: ① 다공급자→공급자별 분할(checkout_orders 는 단일공급자), ② 재고예약 모델을 createOrder/checkout-confirm 으로 이식, ③ orderType 를 order metadata 로 표현, ④ F8 Neture Distribution Engine freeze 검토.

## 7. KPA B2C storefront checkout 경로
- 프론트 `storefront/CheckoutPage.tsx`(localStorage `o4o_kpa_cart_${slug}`, canonical StoreCartItem 과 분리) → `POST /kpa/checkout` → `kpa-checkout.controller` → **checkout_orders 생성**(metadata.channelType='B2C'·serviceKey, 9-gate, sales_limit FOR UPDATE).
- **판정**: 주문 원장은 **이미 canonical(checkout_orders)**. channelType/serviceKey 는 metadata only(분기 아님) → 기준 부합 ✅. **GAP**: B2C localStorage cart 가 canonical StoreCartItem 으로 미수렴(별도 cart). 주문 entry 는 `/kpa/checkout`(별도 orchestrator) — store-cart checkout-confirm 과 별개. 통합 여지 있으나 우선순위 낮음.

## 8. checkoutService.createOrder 사용처
- `CreateOrderDto`: buyerId/sellerId/supplierId(필수), sellerOrganizationId?(uuid), items[](productId/productName/quantity/unitPrice/subtotal/**metadata?**), shippingPolicy?, metadata?. 자체 트랜잭션 없음, **재고 차감 안 함**, checkout_orders 1행(items jsonb) 생성. status=CREATED/paymentStatus=PENDING.
- 호출처: §2 의 1·2·3·4(총 4 entry, 모두 checkout_orders).
- **판정**: **canonical entry 로 충분**. 단 부족 책임 = ① 재고/한도 차감(현재 호출자 책임), ② fulfillment/shipment 상태머신 부재, ③ serviceKey 가 컬럼 아닌 metadata.

## 9. neture_orders fulfillment / settlement 경로
- supplier workspace(`modules/neture/.../supplier-order.service.ts`): neture_orders 가 1차(fulfillable), checkout_orders 는 `/supplier/orders/unified` 로 **읽기전용**(canFulfill=false, 2026-06-08).
- 상태머신: neture_orders.status(created→preparing→shipped→delivered) + neture_shipments(preparing→shipped→in_transit→delivered).
- 정산(`neture-settlement.service.ts:141`): **neture_orders.status='delivered' 만** 집계, SUM(neture_order_items.total_price), 10% 수수료. **checkout_orders 전면 제외**.
- **판정**: neture_orders 는 현재 **공급자 주문 + fulfillment + 정산의 canonical 원장**(생성 시점 적재, downstream bridge 아님). checkout_orders 주문은 fulfillment/정산 밖. → **단일화의 최대 GAP은 정산**. bridge 가능(링크키: checkout_orders.id + supplierId, neture fulfillment record 신설 또는 정산 쿼리에 checkout_orders 편입).

## 10. sourceType / pricingSource 원칙 위반 여부
- cart line metadata / order metadata 로만 사용. **주문 생성·배송·정산 코드를 분기하는 곳 없음** → 원칙 부합 ✅.
- 유사 분기 후보: neture_orders.orderType(STORE_RESTOCK/DIRECT_TO_CUSTOMER)은 sourceType 이 아니라 **배송 의도** 도메인 필드(허용). 단 두 ORDER 원장 자체의 분리(B2B↔event/B2C)는 sourceType 무관한 **구조적 분기** — 본 IR 의 수렴 대상.
- **RISK 기록**: 없음(sourceType 기준 분기 코드 미발견). 단 "원장 이원화"가 사실상 흐름 분기로 작동.

## 11. 후보 A~D 비교 (요지)
- **A. checkout_orders 단일 원장(fulfillment/settlement 까지 흡수)**: 원장 완전 단일화·계약 정합 최고. 단 supplier workspace·shipments·settlement 전면 재작성, neture_orders 폐기 → 대규모/고위험.
- **B. checkout_orders canonical + neture downstream fulfillment/settlement bridge** ✅: 계약 준수, 기존 fulfillment/정산 자산 재사용, 단계 수렴, unified view 로 기반 마련됨. 단 연결키·이중원장 일시 공존·정산 기준 명문화 필요.
- **C. neture_orders 유지(현행)**: 기존 자산 그대로. 단 이중원장 지속·계약 충돌·checkout_orders 정산 누락 영속 → 비권장(현 interim).
- **D. 상품유형별 경로 유지**: 사용자 기준 정면 위배(sourceType 이 주문 모델 분리). **비권장**.

## 12. 권장 canonical pipeline
**후보 B.** 
```
StoreCart(StoreCartItem, 모든 sourceType) → supplier+sellerOrg 그룹
  → checkoutService.createOrder() → checkout_orders (= canonical 주문 원장)
  → (bridge) 공급자 fulfillment record + settlement = checkout_orders 기준으로 편입
```
- 신규 supplier 주문 생성은 모두 checkout_orders 로 수렴.
- neture_orders 는 점진적으로 (a) B2B 생성 경로를 checkout_orders 로 이전하고 (b) fulfillment/shipment/settlement 는 checkout_orders 를 대상으로 읽도록 확장하여 **downstream 역할로 격하**.
- 정산 기준을 "neture_orders delivered" → "canonical supplier order(checkout_orders) + fulfillment delivered" 로 이동.

## 13. 단계별 수렴 로드맵
- **Phase A — 주문 생성 entry 단일화**: 신규 supplier order 는 store-cart checkout-confirm/equivalent orchestrator → createOrder 로만. 일반/승인/모집 상품도 StoreCartItem sourceType 으로 add 가능하게 확장. → `WO-O4O-STORE-SUPPLIER-ORDER-ENTRY-CONSOLIDATION-V1`.
- **Phase B — participate legacy 격하**: buyer 호출 0 확인 후 participate 를 internal helper/legacy 로 명문화·문서화. → `WO-O4O-EVENT-OFFER-PARTICIPATE-LEGACY-DEMOTION-V1`. (저위험, 선행 가능)
- **Phase C — Neture B2B 주문 경로 정렬**: `/neture/seller/orders` 다공급자 주문을 공급자별 checkout_orders 로 분할 생성 + 재고예약 모델 이식. **F8 freeze·재고/orderType 검토 필수**. → `IR/WO-O4O-NETURE-B2B-ORDER-CHECKOUT-PIPELINE-ALIGNMENT-V1`. (고위험)
- **Phase D — fulfillment bridge**: checkout_orders 주문을 supplier workspace 에서 fulfill 가능하게(상태머신/shipments 를 checkout_orders 에 연결 또는 fulfillment record 생성). → `WO-O4O-CHECKOUT-ORDER-SUPPLIER-FULFILLMENT-BRIDGE-V1`.
- **Phase E — settlement convergence**: 정산을 canonical supplier order(checkout_orders) delivered 기준으로 편입(checkout_orders 정산 누락 해소). → `IR/WO-O4O-SUPPLIER-SETTLEMENT-PIPELINE-CONSOLIDATION-V1`.

순서 권장: **B(저위험·선행) → D/E(checkout_orders 정산·fulfillment 편입, GAP 해소) → A(entry 확장) → C(B2B 이전, 최고 위험·마지막)**.
(주의: A 를 C 보다 먼저 하면 신규 B2B 주문이 여전히 neture_orders 로 가는 모순이 생기므로, A 는 "event/B2C 외 신규 경로"에 한정 적용하고 C 에서 B2B 본체를 옮긴다.)

## 14. 다음 구현 WO 제안 (우선순위)
1. `WO-O4O-EVENT-OFFER-PARTICIPATE-LEGACY-DEMOTION-V1` (저위험, 문서+가드)
2. `WO-O4O-CHECKOUT-ORDER-SUPPLIER-FULFILLMENT-BRIDGE-V1` + `IR-O4O-SUPPLIER-SETTLEMENT-PIPELINE-CONSOLIDATION-V1` (checkout_orders 정산/fulfillment 편입 — GAP 직접 해소)
3. `WO-O4O-STORE-SUPPLIER-ORDER-ENTRY-CONSOLIDATION-V1` (StoreCartItem 에 일반/B2B sourceType add 경로)
4. `IR-O4O-NETURE-B2B-ORDER-CHECKOUT-PIPELINE-ALIGNMENT-V1` (F8 freeze 검토 동반, 최후)

## 15. 이번 IR 에서 수정하지 않은 것
코드/스키마/마이그레이션/API/UI/route/정산 로직 **무변경**. participate 미삭제. neture_orders/checkout_orders 무변경. 다른 세션 WIP 무접촉. 발견 GAP/RISK 는 본 문서 기록만.

---

## 부록 — 중단/주의 조건 (구현 시 IR 분리)
- `checkoutService.createOrder` 가 B2B 다공급자·재고예약을 수용 못함(현재 단일공급자·차감 없음) → Phase A/C 전 보강 필요.
- neture 정산이 checkout_orders 와 연결 불가 시 → Phase E 에서 link key(checkout_orders.id/supplierId) 신설.
- sellerOrganizationId resolve 가 서비스별 불안정(event_offer 는 opl.organization_id, B2B 는 미보유) → 통일 기준 필요.
- 기존 Neture B2B 주문이 **F8 Neture Distribution Engine freeze** 또는 운영 계약상 즉시 이동 불가 → Phase C 는 명시적 freeze 예외 WO 필요.

---

*Status: AUDIT COMPLETE. 권장 = 후보 B. 1차 동인 = checkout_orders 정산 누락(GAP). 코드 무변경.*

# IR-O4O-NETURE-SUPPLIER-SHIPPING-SETTING-FOUNDATION-DESIGN-V1

> **유형:** Read-only Investigation Report (조사 전용 — 코드/DB/API/UI/route 무수정)
> **상태:** 조사 완료
> **작성:** 2026-06-07
> **목적:** Neture 공급자별 배송/무료배송/반품 정책 foundation 설계를 위해 현재 공급자 설정·주문·배송비·이벤트 오퍼·펀딩 구조를 read-only 조사하고 V1 구현 범위를 결정

---

## 1. 요약 판정 (TL;DR)

- **권장 = 판정 A (기존 `NetureSupplier`(neture_suppliers) 확장).** 이 엔티티는 이미 **배송 안내 텍스트**(`shipping_standard/island/mountain`)와 **B2B 주문 조건**(`min_order_amount`, `min_order_surcharge`, `order_condition_note`), `pricing_policy`를 보유한다. 배송 정책의 자연스러운 소유처다.
- **`minOrderAmount`는 이미 존재**(PASS). 저장·업데이트 경로(`supplier-management.controller.updateSupplierProfile` + `MyBusinessProfilePage`/`SupplierProfilePage`)도 동작. **GAP은 숫자형 계산 필드**(`baseShippingFee`, `freeShippingThreshold`, `averageDispatchDays`)와 `returnExchangeNotice`뿐.
- **주문 원장 = `checkout_orders`** (선행 IR-ORDER-CANONICAL-TABLE-CONFIRM-V1 확정). checkout_orders는 **order 레벨 단일 `supplierId` + `shippingFee`**를 가진다 → **주문은 이미 공급자 단위**. 다공급자 장바구니는 공급자별 별도 주문으로 처리되는 구조. (items[]에는 per-item supplierId 없음 = 항목 단위 다공급자 모델 아님.)
- **배송비 계산은 현재 부재** — `checkout.service.ts`에서 `shippingFee = 0` 하드코딩. 무료배송/threshold 로직 전무 (GAP).
- **이벤트 오퍼 주문은 checkout_orders에 적재**되고 `supplierId`를 SPO에서 해석, 단가 = `event_price ?? price_general`(원본 불변) → **이벤트 오퍼 상품은 공급자 subtotal에 포함 가능**(CONDITIONAL PASS).
- **유통참여형 펀딩(MarketTrial)은 참여 기록만, 주문/배송과 구조적으로 연결하지 않는다** → 배송 범위에서 **제외**(나중에 다룰 보류가 아니라, 펀딩은 주문 배송 흐름으로 연결하지 않는 것이 정책). 참여금은 운영자 오프라인 수령 모델.
- **주문 grouping IR(판정 C)은 V1 전제 아님** — 주문이 이미 공급자 단위라 V1은 "공급자 배송 정책 저장+표시"만으로 안전. 실제 배송비 계산 적용은 후속(V2)로 분리.

> **결론:** V1 = `NetureSupplier`에 숫자형 배송 필드 additive + 공급자 설정 UI 섹션 + 저장/조회. **주문 배송비 계산은 V1에서 변경하지 않는다**(표시·저장 foundation만). 이벤트 오퍼는 이미 공급자 subtotal 포함 가능, 펀딩은 제외.

---

## 2. 현재 공급자 설정 / 프로필 구조

**엔티티: `apps/api-server/src/modules/neture/entities/NetureSupplier.entity.ts` (`neture_suppliers`)**

| 영역 | 필드 | 비고 |
|---|---|---|
| 배송 안내(텍스트) | `shipping_standard`, `shipping_island`, `shipping_mountain` (text) | **이미 존재** — 기본/도서/산간 배송 안내 문구 |
| B2B 주문 조건 | `min_order_amount`(int), `min_order_surcharge`(int), `order_condition_note`(text) | **이미 존재** (WO-NETURE-B2B-SUPPLIER-ORDER-CONDITION-V1) |
| 가격 정책 | `pricing_policy`(text) | 존재 |
| 연락/공개 | contact_*, *_visibility | 존재 |
| 사업자 | businessType, businessItem, taxInvoiceEmail … | 존재 |
| 관계 | `offers` → SupplierProductOffer (supplier_id) | 공급자 ↔ 오퍼 연결 |

**저장/조회 경로:**
- 업데이트: `supplier-management.controller.ts` → `netureService.updateSupplierProfile(supplierId, {... minOrderAmount, minOrderSurcharge, orderConditionNote ...})`.
- 프론트: `services/web-neture/src/pages/mypage/MyBusinessProfilePage.tsx`, `pages/supplier/SupplierProfilePage.tsx`.
- **선례(zero-migration 패턴):** P4 사업자 필드(`businessEntityType`, `businessStartDate`)는 `neture_suppliers` 컬럼 부재로 **`users.businessInfo` JSONB에 저장**(주석 명시). → 컬럼 추가 없이 JSONB로 보존하는 패턴이 이미 사용됨(판정 C 근거).

**판정:**
- `minOrderAmount` 저장 위치 존재 — **PASS**.
- 배송 안내 텍스트 3필드 존재 — **PASS** (notice 계열은 추가 불필요).
- 숫자형 계산 필드(`baseShippingFee`, `freeShippingThreshold`, `averageDispatchDays`), `returnExchangeNotice` — **GAP** (추가 필요).
- 별도 `SupplierShippingPolicy` 엔티티는 현재 **없음**.

---

## 3. 현재 주문 / 주문상품 구조

**Canonical 원장 = `checkout_orders`** (`CheckoutOrder.entity.ts`, 선행 IR 확정. `ecommerce_orders`는 프로덕션 미존재).

| 요소 | 값 |
|---|---|
| order 레벨 `supplierId` (varchar100, indexed) | **존재** — 주문 = 공급자 단위 |
| order 레벨 `shippingFee` (decimal) | **존재** (현재 항상 0) |
| `subtotal`, `discount`, `totalAmount` | 존재 |
| `sellerOrganizationId` (uuid) | 매장 단위 추적 |
| `items` (jsonb) | `{ productId, productName, quantity, unitPrice, subtotal }[]` — **per-item supplierId 없음** |
| `metadata` (jsonb) | serviceKey/channel 등 |

**생성:** `checkout.service.ts createOrder(dto)` — `dto.supplierId` **필수 단일값**. 즉 한 주문 = 한 공급자.

**판정:**
- `order_items`에 supplier_id 없음 — 그러나 **order 레벨 supplierId로 공급자 grouping 이미 성립**(주문 자체가 공급자 단위). 다공급자 장바구니 → 공급자별 별도 checkout_order.
- 따라서 "공급자별 subtotal/무료배송 기준 적용"은 **order 단위로 자연스럽게 가능** — **CONDITIONAL PASS** (항목 단위 혼합 다공급자 주문은 모델 아님; 별도 order split 구조가 이미 전제).
- `shippingFee`가 order 레벨이므로 향후 계산은 `order.supplierId → NetureSupplier.정책` 조회로 적용 가능.

---

## 4. 현재 배송비 / 무료배송 계산 구조

| 항목 | 현황 |
|---|---|
| 플랫폼 전역 배송비 | **없음** |
| 서비스별 배송비 | **없음** |
| 공급자별 배송비 | **없음** (정책 저장 필드 자체가 GAP) |
| 무료배송 기준(freeShippingThreshold) | **없음** |
| `checkout.service` 계산 | `const shippingFee = 0;` **하드코딩** → totalAmount = subtotal − discount |
| minOrderAmount vs freeShippingThreshold | minOrderAmount만 존재(저장값), 계산 적용은 미연결 |

**판정:** 배송비 계산 로직은 **전무 (GAP)**. V1에서 계산을 새로 구현하면 주문/정산 영향이 크므로, **V1은 정책 저장+표시까지만**, 계산 적용은 V2로 분리(RISK 회피).

---

## 5. 이벤트 오퍼 주문 구조와 supplier subtotal 가능성

**경로:** `routes/kpa/services/event-offer.service.ts` (canonical, "checkout_orders 사용, ecommerce_orders 제거" 명시).

- 참여(주문) = `checkoutService` → **checkout_orders 생성**.
- 주문 라인 해석: `OPL.offer_id → SPO(spo.supplier_id) → neture_suppliers`. `supplierId = spo.supplier_id`.
- 적용 단가 = `event_price ?? price_general` (스냅샷) — **원본 상품 기본가 변경 없음**.

**판정:** 이벤트 오퍼 주문은 **checkout_orders.supplierId를 가지므로** 일반 상품과 동일하게 **해당 공급자 subtotal에 포함 가능** — **CONDITIONAL PASS**. (배경 §3 기준 "이벤트 오퍼 상품 = 공급자 주문 상품 중 하나" 충족 가능.) 단 현재 shippingFee=0이므로 실제 합산 계산은 V2에서.

---

## 6. 유통참여형 펀딩 참여 / 주문 구조

- `MarketTrial` / `MarketTrialParticipant` — 참여 기록 중심. `trialUnitPrice`, `targetAmount`, `rewardRate`, `productId`(soft 참조) 보유.
- `createOrder`/`checkout_orders` 연결 **없음** (참여금은 운영자 오프라인 수령 모델 — 온라인 결제 미제공).
- supplierId 추적: trial은 `supplierId`(생성자) 보유하나 **주문/배송 대상이 아님**.

**판정:** 펀딩은 주문/배송 흐름이 아니다 → **주문 배송으로 연결하지 않는다(구조적 제외)**. 배송 foundation V1뿐 아니라 이후에도 펀딩 참여를 checkout_orders/배송비 계산에 편입하지 않는다(참여금=운영자 오프라인 수령, 온라인 결제 미제공 모델과 정합). "나중에 배송으로 다룰 보류"가 아님.

---

## 7. 공급자 배송 정책 저장 후보 A/B/C 비교

| 후보 | 내용 | 장점 | 단점 | migration | 판정 |
|---|---|---|---|---|---|
| **A. NetureSupplier 확장** | `neture_suppliers`에 숫자 필드 additive | 배송 안내·minOrderAmount 이미 같은 엔티티, 업데이트/UI 경로 재사용, 가장 단순 | 정책 커지면 비대, 서비스별/상품별 예외 표현 한계 | **소규모 additive ALTER** (또는 §2 JSONB 패턴으로 zero-migration 가능) | ✅ **V1 권장** |
| B. SupplierShippingPolicy 별도 테이블 | `supplier_shipping_policies` 신설 | 책임 명확, 서비스별/상품별/온도대 확장 용이, grouping 연결 | 신규 테이블+migration, 초기 범위 큼 | 신규 CREATE | 후속(확장 시) |
| C. organization/JSONB 저장 | 기존 JSONB(예: users.businessInfo 선례) | migration 최소/zero | 타입 안정성 약함, 주문 계산 시 필드 참조 불리, 정산 확장 불리 | 없음 | 차선(계산 연결 시 불리) |

**권장:** **A.** 이유 — 배송 정책의 핵심(안내 텍스트 3종 + minOrderAmount)이 이미 `NetureSupplier`에 있고, 숫자 필드 몇 개만 additive로 더하면 된다. 정책이 서비스별/상품별/온도대로 커지는 시점에 **B로 승격**(후속). C는 계산 연결 시 필드 참조가 불리하므로 비권장(단 ALTER를 피해야 하는 제약이 강하면 §2 JSONB 선례로 임시 가능 — 타입 안정성 trade-off 명시).

---

## 8. V1 최소 필드 제안

이미 존재(재사용):
```
min_order_amount          (minimumOrderAmount)        ✅ 존재
shipping_standard/island/mountain  (배송 안내 문구)    ✅ 존재
order_condition_note      (주문 조건 안내)             ✅ 존재
```

V1 추가(GAP — additive):
```
base_shipping_fee         (기본 배송비)                숫자
free_shipping_threshold   (무료배송 기준 금액)          숫자
average_dispatch_days     (기본 출고 소요일)            숫자
return_exchange_notice    (반품/교환 안내)             텍스트
```

후속(V2+):
```
minimum_shipment_amount   (최소 발송 금액)
remote_area_extra_fee     (도서산간 추가비 — 현재는 shipping_island/mountain 텍스트로 대체)
cold_chain_required, shipping_carrier
service_specific_policy, product_specific_shipping_override, event_offer_shipping_override
event_offer_free_shipping_inclusion (이벤트 오퍼 무료배송 기준 포함 여부)
```

> V1은 **저장+표시**만. 위 필드를 주문 배송비 계산에 연결하는 것은 V2.

---

## 9. 주문 grouping 영향도

| 질문 | 답 |
|---|---|
| 하나의 order에 multiple suppliers? | **아니오** — checkout_orders는 order 레벨 단일 supplierId. 다공급자 장바구니는 **공급자별 별도 order**. |
| supplier group 표현? | **order 자체가 supplier group** (order.supplierId). 별도 grouping 구조 불필요. |
| order split 필요? | 이미 공급자 단위 생성(createOrder는 supplierId 단일). 추가 split 불필요. |
| order_items에서 supplier 역추적? | item에는 없음. 단 **order.supplierId로 충분**(주문이 단일 공급자). 이벤트 오퍼는 SPO→supplier 해석. |
| shippingFee 단위? | **order(=supplier group) 단위** — 공급자별 배송비/무료배송 적용에 적합. |
| 이벤트 오퍼 상품 subtotal 포함? | **가능** — 동일 checkout_orders.supplierId. |

**판정:** 주문 grouping 측면에서 **별도 재설계 IR(판정 C) 불필요** — 구조가 이미 공급자 단위. 단 **per-item 다공급자 단일주문**을 도입하려면 그때 grouping IR 필요(현재는 아님).

---

## 10. 후속 구현 권장안

**판정 A — 기존 profile 확장으로 V1 가능.**

**후속 WO: `WO-O4O-NETURE-SUPPLIER-SHIPPING-SETTING-FOUNDATION-V1`**
범위:
```
1. NetureSupplier 에 배송 숫자 필드 additive
   (base_shipping_fee, free_shipping_threshold, average_dispatch_days, return_exchange_notice)
   — 소규모 additive ALTER migration (또는 zero-migration 필요 시 §2 JSONB 패턴 검토)
2. updateSupplierProfile DTO + supplier 설정 UI(MyBusinessProfilePage/SupplierProfilePage)에
   "배송 정책" 섹션 추가 (저장/조회)
3. 배송 안내 텍스트(shipping_standard/island/mountain) + minOrderAmount 와 함께 한 섹션에 노출
4. 주문 배송비 계산은 변경하지 않음 (shippingFee=0 유지) — 표시·저장 foundation 만
```

**후속(분리):**
```
WO-..-SHIPPING-FEE-CALCULATION-V2   — 공급자 정책 → checkout shippingFee 실제 계산(이벤트 오퍼 subtotal 포함, 무료배송까지 남은 금액 안내)
WO-..-SHIPPING-POLICY-ENTITY-V3     — 서비스별/상품별 예외가 필요해지면 별도 supplier_shipping_policies 로 승격
(펀딩은 주문 배송으로 연결하지 않음 — 구조적 제외, 후속 WO 대상도 아님)
```

---

## 11. 이번 IR에서 수정하지 않은 것

```
코드/엔티티/DTO/API/UI/route 무수정
DB migration 미작성
배송비 계산 변경 없음
주문/정산/이벤트/펀딩 구조 변경 없음
다른 세션 WIP 미접촉 · DB write 없음
본 IR 1개 문서만 생성
```

---

## 12. 판정 요약 (PASS / GAP / RISK / DEFER)

| 항목 | 판정 |
|---|---|
| minOrderAmount 저장 위치 | **PASS** (neture_suppliers.min_order_amount) |
| 배송 안내 텍스트 필드 | **PASS** (shipping_standard/island/mountain) |
| 숫자형 배송비/무료배송 필드 | **GAP** (V1 additive 추가) |
| 주문 공급자 grouping | **CONDITIONAL PASS** (order 단위 supplierId, 항목단위 아님) |
| 배송비 계산 로직 | **GAP** (shippingFee=0 하드코딩 → V2) |
| 이벤트 오퍼 supplier subtotal 포함 | **CONDITIONAL PASS** (checkout_orders.supplierId) |
| 유통참여형 펀딩 배송 | **제외(구조적)** — 주문 배송으로 연결하지 않음 (참여 기록, 주문 아님) |
| 주문 grouping 재설계 IR | 불필요 (현 구조 충분) |
| 저장 후보 | **A 권장**, B 후속, C 차선 |

---

## 산출물

- 본 문서: `docs/investigations/IR-O4O-NETURE-SUPPLIER-SHIPPING-SETTING-FOUNDATION-DESIGN-V1.md`
- 조사 기준 commit: `d07fe143c`

## 최종 판정

배송 foundation은 **공급자별 정책**이며 `NetureSupplier`가 이미 배송 안내·minOrderAmount를 보유하므로, **V1은 이 엔티티에 숫자형 배송 필드를 additive로 더하고 설정 UI/저장만 추가**(판정 A)하는 것이 안전하다. 주문은 이미 공급자 단위(checkout_orders.supplierId)라 grouping 재설계가 필요 없고, 이벤트 오퍼 주문도 동일 supplierId로 subtotal 포함이 가능하다. **배송비 실제 계산과 펀딩은 V1 범위 밖**(각각 V2 / DEFER).

*상태: 조사 완료 — V1 권장안 A 확정. 실행은 후속 WO(승인 후).*

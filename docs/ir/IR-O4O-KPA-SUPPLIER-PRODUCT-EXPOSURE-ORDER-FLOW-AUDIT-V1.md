# IR-O4O-KPA-SUPPLIER-PRODUCT-EXPOSURE-ORDER-FLOW-AUDIT-V1

> **Type:** IR (read-only 선행 조사 — 내 매장 공통화 전)
> **Date:** 2026-06-11
> **대표 서비스:** KPA-society / **참조:** Neture(공급자 측) / **제외:** GlycoPharm·K-Cosmetics
> **수정 파일:** 없음 (read-only)
> **조사 기준 commit:** `c56ab39de`

---

## 1. 목적

KPA-society 기준으로 **공급자 등록 → 운영자 승인/노출 조건 → 매장 허브 노출 → 매장 경영자 선택/신청/주문 → 결제 → 공급자 주문 리스트 반영**의 전 과정을 5개 상품 유형별로 세밀하게 확인하고, 단절/중복/legacy/용어 혼선 지점을 **소형 보정 WO / 추가 IR / 내 매장 공통화 WO** 로 분리한다. 본 IR 은 구현이 아니라 선행 조사다.

---

## 2. 범위

- 대표: KPA-society. 참조: Neture(공급자 등록·오퍼·주문 수신 화면 범위만). 제외: GP/KCos(영향 가능성만 후속 기록).
- 코드/UI/API/DB 무수정. 발견 단절은 후속 후보로 분리(즉시 수정 금지).

---

## 3. 용어 기준 (고정)

| 용어 | 정의 |
|------|------|
| **매장 취급 상품** | O4O 공급자 주문과 무관하게 매장이 자체 취급하는 상품(비-O4O) |
| **O4O 주문 가능 상품** | O4O 공급자·승인·공급조건과 연결되어 매장이 반복/빠른 주문용으로 내 매장 영역에서 관리하는 상품 |
| **매장 허브 노출 상품** | 매장 허브에서 탐색하는 상품/오퍼/모집(B2B·승인공급·이벤트오퍼·판매자모집·펀딩) |
| **판매자 모집 공고** | 공급자가 "판매할 매장"을 찾기 위해 허브에 노출하는 모집형 항목. **클릭/신청만으로 주문 가능 상품이 되지 않음** |
| **공급 승인 상품** | 판매자 모집에 매장이 신청 → 공급자/운영자가 해당 매장에 공급 승인한 상품 |

> "내 매장 상품"이라는 포괄 표현은 본 IR 에서 사용하지 않는다.

---

## 4. 조사 대상 상품 유형 (5)

1. B2B 일반 공급 상품 · 2. 운영자 승인 공급 상품 · 3. 이벤트 오퍼 · 4. 판매자 모집 공고 · 5. 유통참여형 펀딩

---

## 5. Phase 1 — Route/API/Entity 매핑

| 영역 | 기능 | route / API | entity·table | 비고 |
|------|------|-------------|--------------|------|
| 공급자 | B2B/공급 상품 등록 | Neture `/supplier/products`, POST `/supplier/products` | `supplier_product_offers`(`SupplierProductOffer`) | serviceKeys 배열에 'kpa' 포함 |
| 공급자 | 이벤트 오퍼 제안 | `/supplier/event-offers`, POST `/kpa/supplier/event-offers` | `organization_product_listings`(제안) | is_active=false 제안 생성(확정 필요 — §주의) |
| 공급자 | 판매자 모집/펀딩 | Neture `/partner/recruiting-products`(조회), `/supplier/market-trial/new` | `neture_partner_recruitments` / `market_trials` | mechanism 모호(§10 D) |
| 운영자 | 제품/승인 관리 | KPA `/operator/product-applications` | `product_approvals`(`ProductApproval`) + `organization_product_listings` | SERVICE/PRIVATE approval_type |
| 운영자 | 이벤트 오퍼 승인 | KPA `/operator/event-offers` (EventOfferManagePage) | `organization_product_listings`(status) | pending→approved |
| 매장 | 허브 카탈로그 | `/store-hub/b2b`(HubB2BCatalogPage), GET `/pharmacy/products/catalog` | (조회) | distributionType 필터 |
| 매장 | 이벤트 오퍼 | `/store-hub/event-offers`(KpaEventOfferPage) | groupbuy/listing(§10 D) | 독립 페이지 |
| 매장 | 장바구니/주문 | `/store/cart/kpa-society/*`, checkout-confirm | `store_cart_items` → `checkout_orders`/`checkout_order_items` | sourceType 분화 |
| 공급자 | 주문 리스트 | Neture `/supplier/orders`, `/supplier/orders/unified` | `neture_orders` + `checkout_orders` (unified read view) | bridge dedup |

> **주의(확정 필요):** 이벤트 오퍼의 저장 모델이 `organization_product_listings`(제안/승인)인지 groupbuy 캠페인인지 에이전트 조사가 엇갈림 → §10 D2.

---

## 6. Phase 2 — 공급자 등록 및 운영자 승인 흐름

| 유형 | 공급자 등록 | 저장 table | 운영자 승인 필요 | 운영자 화면 | 승인 전 매장 노출 | 승인 후 노출 | 상태값 |
|------|:---:|------|:---:|:---:|:---:|:---:|------|
| B2B 일반 | ✅ | `supplier_product_offers` | ❌ 자동 | ❌ | ❌(is_active 차단) | ✅(is_active=true) | approval_status(자동 APPROVED)+is_active |
| 운영자 승인 공급 | ✅ | `product_approvals`(SERVICE)+listing | ✅ | ✅ ProductApplicationManagementPage | ❌(승인 전 listing 없음) | ✅(approved+is_active) | pending/approved/rejected |
| 이벤트 오퍼 | ✅ | `organization_product_listings`(추정) | ✅ | ✅ EventOfferManagePage | ❌(status=pending 차단) | ✅(approved+is_active) | pending/approved/canceled |
| 판매자 모집 공고 | ✅ | `neture_partner_recruitments` 또는 PRIVATE approval(모호) | ✅(공급/운영자 승인) | ❌/불명확 | △ 모집 자체는 노출 | 신청→승인 후 공급 승인 상품 | recruiting/closed + approval |
| 유통참여형 펀딩 | ✅(market trial) | `market_trials` | ✅(submitted→approved) | ❌(공급자 대시보드만) | ❌(approved 전 차단) | △(recruiting) | draft/submitted/approved/recruiting/… |

**핵심:**
- **승인 거쳐야 매장 노출**: 운영자 승인 공급(2), 이벤트 오퍼(3), 펀딩(5).
- **자동 노출**: B2B 일반(1)은 운영자 승인 없이 is_active 기준 노출(명문화된 자동 흐름).
- 승인 전 노출 차단 메커니즘 3패턴: `supplier_product_offers.is_active/approval_status`, `product_approvals.approval_status`, `organization_product_listings.is_active+status`, `market_trials.status`.

---

## 7. Phase 3 — 매장 허브 노출 흐름

| 유형 | 허브 위치 | route | 노출 조건 | 표시 형태 | 문제/누락 |
|------|----------|-------|-----------|-----------|-----------|
| B2B 일반 | B2B 카탈로그 | `/store-hub/b2b` | serviceKey='kpa', is_active=true, supplier ACTIVE | 상품 카드 | 만료/반려 필터(expire_at 미사용) 미흡 가능 |
| 운영자 승인 공급 | B2B 카탈로그 "운영자" 탭 | `/store-hub/b2b` | 승인 참여 흔적(operatorView) | 상품 카드 | B2B와 기술상 동일·탭 분리 |
| 이벤트 오퍼 | **독립 페이지** | `/store-hub/event-offers` | 승인+활성 | 오퍼 카드 | ✅ 상품 리스트 탭 미혼입(정상) |
| 판매자 모집 공고 | 카탈로그(PRIVATE) 또는 별도 | `/store-hub/b2b`(PRIVATE 추정) | recruiting | 모집 카드 | mechanism/위치 모호(§10 D) |
| 유통참여형 펀딩 | 카탈로그 미노출 | — | distributionType='FUNDING' **미구현** | — | catalog 펀딩 유형 부재(§10 D/E) |

**핵심:**
- ✅ **이벤트 오퍼는 `/store-hub/event-offers` 독립 페이지 유지, 상품 리스트 탭에 미혼입**(WO 우려 해소).
- ⚠️ 펀딩은 catalog distributionType='FUNDING'이 **미구현**. `market_trials`는 별도 흐름으로 존재 → 둘의 관계 정의 필요.
- 노출 필터는 serviceKey='kpa' + 활성/승인 기준. 만료/반려 명시 차단은 유형별 편차.

---

## 8. Phase 4 — 매장 허브 선택 후 데이터 반영

| 유형 | 매장 행동 | 생성 데이터 | O4O 주문 가능 상품? | 매장 취급 상품? | 신청/참여 상태? | 공급 승인 필요 |
|------|-----------|-------------|:---:|:---:|:---:|:---:|
| B2B 일반 | "내 매장에 추가" | `ProductApproval`(SERVICE, **PENDING**) | ❌(승인 전) → ✅(승인 후 listing) | ❌ | ✅ 신청 | ✅(공급자) |
| 운영자 승인 공급 | "내 매장에 추가" | `ProductApproval`(SERVICE, PENDING) | ❌ → ✅(승인 후) | ❌ | ✅ | ✅(운영자) |
| 이벤트 오퍼 | "장바구니/주문" | `store_cart_items`(event_offer) / 참여 | ❌(listing 미생성, 주문 중심) | ❌ | ✅ 참여 | — |
| 판매자 모집 공고 | "신청" | `ProductApproval`(PRIVATE, PENDING) 추정 | ❌(신청만) → ✅(승인 후 공급 승인 상품) | ❌ | ✅ 신청 | ✅(판매자/공급자) |
| 유통참여형 펀딩 | "참여" | market_trial 참여(별도) | ❌ | ❌ | ✅ 참여 | — |

**★핵심 (WO 우려 #2 검증):**
- ✅ **신청 즉시 O4O 주문 가능 상품으로 들어가는 잘못된 흐름은 발견되지 않음.** SERVICE/PRIVATE 모두 신청 시 `ProductApproval(PENDING)`만 생성되고 **`OrganizationProductListing`은 승인 후에 생성**된다(주문 가능 상태는 승인 게이트 통과 후).
- ⚠️ 단, **판매자 모집 공고의 정확한 mechanism**(PRIVATE ProductApproval 단일 경로인지, `neture_partner_recruitments` 별도 경로인지)이 조사상 엇갈림 → §10 D.
- "O4O 주문 가능 상품 목록 vs 매장 취급 상품 목록"의 DB/화면 분리 여부는 본 IR 에서 단정 불가 → §10 D 확인 항목.

---

## 9. Phase 5 — 장바구니/주문/결제/공급자 주문 리스트

| 유형 | cart sourceType | checkout 연결 | paymentStatus 기준 | 공급자 리스트 노출 | fulfillment 가능 |
|------|-----------------|---------------|--------------------|--------------------|------------------|
| 이벤트 오퍼(KPA) | `event_offer` | checkout_orders + items | **초기값 불명확**(§10 D) → paid 전이는 `KpaPaymentEventHandler` | unified view(checkout 소스, **필터 없음**) | bridge 전 canFulfill=false |
| B2B(Neture 참조) | `b2b`/`regular` | checkout_orders(paymentStatus='pending' 명시) | paid 후 bridge | paid→neture_orders / pending→checkout read-only | bridge+paid |
| 판매자 모집 | `seller_recruitment` | (주문 아님 — 신청/승인 모델) | — | — | — |

**검증된 핵심:**
- **cart**: serviceKey='kpa-society', sourceType ∈ {regular, operator_approved, b2b, event_offer, seller_recruitment}. KPA 경로는 `event_offer` 항목이 checkout-confirm 대상. supplier별 배송비/무료배송 preview 계산 존재.
- **결제 게이트(✅ 적용)**: `checkout-fulfillment-bridge.service`는 `paymentStatus='paid' && status='paid' && paidAt` 만 neture_orders 로 bridge(payment-first 엄격, idempotent). settlement = delivered + paid. 배송 전이 전 `getFulfillmentReadiness`가 checkout-origin 주문에 paid 확인.
- **⚠️ 가시성 드리프트(확정)**: `supplier-unified-order.service.queryCheckoutOrders`(L164)는
  ```sql
  WHERE co."supplierId" = $1 AND NOT EXISTS (bridge dedup)
  ```
  로 **paymentStatus='paid' 필터가 없다**. → **미결제(pending) checkout_order 가 공급자 unified 리스트에 read-only(canFulfill=false)로 노출**됨. 기능적 fulfillment 은 차단되나, payment-first invariant("결제 전 주문은 공급자에게 보이지 않는다")와 **가시성 층에서 불일치**.
- **legacy vs canonical**: `neture_orders`(paymentStatus 컬럼 없음, paid_at/metadata 의존) + `checkout_orders`(paymentStatus enum)를 unified view 가 병합. bridge 된 주문은 `metadata.checkoutOrderId` 로 dedup(중복 행 방지 ✅). 단 paid 기준이 이원화(legacy=paid_at, canonical=paymentStatus).

---

## 10. Phase 6 — 단절/중복/legacy 판정

| # | 영역 | 현재 상태 | 판정 | 근거 | 후속 |
|---|------|-----------|:---:|------|------|
| 1 | 신청→승인→listing(SERVICE/PRIVATE) | 신청=PENDING, 승인 후 listing | **A** | product-approval 흐름 | 그대로 공통화 기준 |
| 2 | 이벤트 오퍼 독립 페이지 | `/store-hub/event-offers` 분리 | **A** | App.tsx store-hub routes | 유지 |
| 3 | 결제 후 bridge(paid only) | payment-first 엄격 | **A** | checkout-fulfillment-bridge.service:87 | 유지 |
| 4 | **공급자 unified checkout 노출 paymentStatus 필터 부재** | pending도 read-only 노출 | **C** | supplier-unified-order.service.ts:164 | **소형 WO**(§D1) |
| 5 | KPA event_offer checkout paymentStatus 초기값 | 명시 확인 불가 | **D** | event-offer-cart-checkout.service | 소형 조사/확인 |
| 6 | **판매자 모집 mechanism**(PRIVATE approval vs partner_recruitments) | 조사 엇갈림 | **D** | 에이전트 불일치 | **추가 IR** |
| 7 | **유통참여형 펀딩 정의**(catalog FUNDING 미구현 vs market_trials) | 분리/미정의 | **D** | distributionType FUNDING 부재 | **추가 IR** |
| 8 | O4O 주문 가능 상품 vs 매장 취급 상품 DB/화면 분리 | 단정 불가 | **D** | listing/profile 관계 미확정 | 추가 IR |
| 9 | legacy neture_orders ↔ checkout paid 기준 이원화 | paid_at vs paymentStatus | **B** | unified service | 문서 정합/장기 수렴 |
| 10 | 만료/반려 항목 노출 차단(expire_at 등) | 유형별 편차 | **B** | catalog 필터 | 소형 보정 후보 |

---

## 11. 후속 WO 후보 (소형 보정)

- **D1. `WO-O4O-KPA-SUPPLIER-UNIFIED-ORDER-CHECKOUT-PAYMENT-VISIBILITY-FIX-V1`** — unified checkout 조회에 `paymentStatus='paid'` 필터 추가(또는 pending 명시 분리). payment-first 가시성 invariant 정합. 소규모 backend, response shape 무변경. ※ `CHECK-O4O-CHECKOUT-ORDER-TO-NETURE-FULFILLMENT-BRIDGE-V1 §10` 의 "bridge 전 노출" gap 과 동일선상.
- (선택) 만료/반려 노출 차단 보정 — catalog 필터(§10-10).

## 12. 추가 IR 후보

- **`IR-O4O-SELLER-RECRUITMENT-TO-SUPPLY-APPROVAL-FLOW-V1`** — 판매자 모집 공고의 단일 mechanism 확정(PRIVATE ProductApproval vs `neture_partner_recruitments`), 신청→공급 승인→공급 승인 상품 반영 경로 정합(§10-6).
- **`IR-O4O-DISTRIBUTION-FUNDING-VS-MARKET-TRIAL-DEFINITION-V1`** — 유통참여형 펀딩 = market_trial 인지, 별도 catalog 유형인지 정의(§10-7).
- **`IR-O4O-STORE-ORDERABLE-VS-CARRIED-PRODUCT-MODEL-V1`** — O4O 주문 가능 상품(OrganizationProductListing) vs 매장 취급 상품 DB/화면 분리 모델(§10-8). **내 매장 공통화의 핵심 선행.**
- (확인) KPA event_offer checkout paymentStatus 초기값(§10-5) — 소형 조사로 흡수 가능.

---

## 13. 내 매장 공통화에 반영할 기준 (잠정)

1. **신청 ≠ 주문 가능**: 매장 허브 신청은 `ProductApproval(PENDING)` 까지. **O4O 주문 가능 상품은 승인(listing 생성) 후**에만. → 내 매장 "O4O 주문 가능 상품" 목록은 `OrganizationProductListing(approved+is_active)` 기준.
2. **매장 취급 상품 ≠ O4O 주문 가능 상품**: 두 목록을 화면/DB 에서 분리 표기(§12 IR 후 확정).
3. **이벤트 오퍼는 주문 중심**(listing 미생성) — 내 매장 "주문 가능 상품"과 별도 취급.
4. **판매자 모집/펀딩은 신청·참여 상태**로 표기, 주문 가능 상품과 구분(공급 승인 후에만 전환).
5. **공급자 노출은 paid 기준**: 내 매장 주문 → checkout_orders(pending) → 결제 → paid → 공급자 노출. 가시성 필터(§11 D1) 선행 권고.

---

## 14. 결론

- KPA 의 공급자→매장→주문→공급자 리스트 흐름은 **승인 게이트·payment-first bridge 기준으로 핵심 골격이 정상(A)** 이며, **신청 즉시 주문 가능 전환 같은 위험 흐름은 발견되지 않음**.
- **즉시 보정 가능(C)**: 공급자 unified 리스트의 pending checkout 가시성(§11 D1).
- **추가 IR 필요(D)**: 판매자 모집 mechanism, 펀딩 정의, O4O 주문 가능 상품 vs 매장 취급 상품 모델 — 이 3건은 **내 매장 공통화 WO 전에 반드시 확정**해야 한다.
- 따라서 **내 매장 공통화 WO 는 본 IR 직후 바로 작성하지 않는다.** 순서: 본 IR → §11 소형 보정 → §12 추가 IR(특히 store-orderable-vs-carried 모델) → KPA 기준 확정 → `WO-O4O-MY-STORE-COMMONIZATION-PHASE5-KPA-BASELINE-V1`.
- GP/KCos 확장은 KPA 기준 확정 후 별도 판단.

> **조사 한계:** 일부 항목(이벤트 오퍼 저장 모델, 판매자 모집 mechanism)은 코드 경로가 엇갈려 본 IR 에서 단정하지 않고 D(추가 IR)로 분리했다. 정적 코드 조사 기반이며 live 데이터/실행 검증은 미수행.

---

*Generated: 2026-06-11 · read-only IR · 코드 무변경 · 조사 기준 commit `c56ab39de`*

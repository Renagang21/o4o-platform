# IR-O4O-STORE-ORDERABLE-VS-CARRIED-PRODUCT-MODEL-V1

> **Type:** IR (read-only — 내 매장 공통화 핵심 선행 조사)
> **Date:** 2026-06-11
> **대표:** KPA-society / **참조:** Neture(공급자 모델) / **제외:** GP·KCos
> **수정 파일:** 없음 (read-only) · **조사 기준 commit:** `512104c9d`

---

## 1. 목적

KPA 기준으로 **매장 취급 상품** vs **O4O 주문 가능 상품**을 DB/API/UI/용어 차원에서 분리 확정하여, 내 매장 공통화 WO 가 사용할 기준 모델을 만든다. 구현 아님, 선행 조사.

---

## 2. 배경

선행 IR(`IR-O4O-KPA-SUPPLIER-PRODUCT-EXPOSURE-ORDER-FLOW-AUDIT-V1`)에서 **신청 ≠ 주문 가능** 이 고정됨. 내 매장에는 성격이 다른 두 상품(비-O4O 자체 취급 / O4O 주문 가능)이 공존하므로 "내 매장 상품" 포괄 표현 대신 분리 용어를 사용한다.

---

## 3. 용어 기준 (고정)

| 용어 | 정의 | DB 기준(결론) |
|------|------|---------------|
| **매장 취급 상품** | O4O 주문과 무관한 매장 자체 취급(진열/표시) 상품 | `StoreLocalProduct`(비-Commerce) |
| **O4O 주문 가능 상품** | 공급자·승인·주문 조건과 연결된 반복 주문용 상품 | `OrganizationProductListing`(approved+is_active) |
| **공급 승인 상품** | 모집/신청에 공급자·운영자가 매장에 공급 승인한 상품 | `ProductApproval(APPROVED)` → listing |
| **매장 허브 노출 상품** | 허브에서 탐색하는 상품/오퍼/모집(노출 ≠ 주문 가능) | 카탈로그/오퍼 view |

> "내 매장 상품" 포괄 표현은 본 IR 에서 사용하지 않는다.

---

## 4. 조사 범위

KPA-society 대표. Neture 공급자 모델 참조. GP/KCos 제외(적용 가능성만 후속). 코드 무수정.

---

## 5. Phase 1 — Entity 역할 매트릭스

| entity/table | 역할 | 원천 | 공급 조건 | 신청 상태 | O4O 주문 가능 | 매장 취급 | 주문/결제 |
|--------------|------|:---:|:---:|:---:|:---:|:---:|:---:|
| **ProductMaster** | 제품 원장(SSOT, barcode) | ✅ | | | | | |
| **SupplierProductOffer** | 공급자 공급 조건(distributionType PUBLIC/SERVICE/PRIVATE, serviceKeys, price) | | ✅ | | | | |
| **ProductApproval** | 신청→승인(approval_type SERVICE/PRIVATE, PENDING/APPROVED) | | | ✅ | | | |
| **OrganizationProductListing** | **O4O 주문 가능 상품 핵심**(organizationId, offerId, masterId, is_active+status) | | | | ✅ | | |
| **StoreProductProfile** | 매장별 커스터마이징 메타(displayName/description/약사코멘트) — 공용 | | | | △(메타) | △(메타) | |
| **StoreLocalProduct** | **매장 취급 상품(비-O4O)** — 독립, ProductMaster 미연결, **Commerce 금지(주석)** | | | | | ✅ | ❌(연결 금지) |

**근거:**
- `OrganizationProductListing` = O4O 주문 가능 기준: `pharmacy-products.controller.ts:122-131`(opl.is_active + approval_status='approved').
- `StoreLocalProduct` = 비-Commerce 매장 취급: `store-local-product.entity.ts:6-8`("Commerce Object 아님, Checkout/EcommerceOrder 연결 금지"), ProductMaster 미연결, organizationId 격리. **실사용**(tablet/storefront 진열: `store-tablet.routes.ts:82-89`).
- `StoreProductProfile` = ProductMaster 기반 매장 메타(표시명/설명), O4O·비-O4O 공용.

→ **매장 취급 상품(StoreLocalProduct)과 O4O 주문 가능 상품(OrganizationProductListing)은 물리적으로 별도 테이블로 분리됨.**

---

## 6. Phase 2 — 화면/API/데이터 소스 매트릭스

| 화면 | route | component | API | 데이터 소스 | 성격 | 혼재 |
|------|-------|-----------|-----|-------------|------|------|
| 매장 게이트웨이 | `/store` | KpaStoreLayoutWrapper | — | — | layout | — |
| **내 매장 상품 관리** | `/store/my-products` | StoreProductsManagerPage | `getMyStoreListings()` | `OrganizationProductListing` | **O4O 주문 가능만** | ❌ 없음 |
| B2B 구매 목록 | `/store/commerce/products` | PharmacyB2BPage | `getListings()` | ProductListing(도메인 탭) | O4O 주문(B2B/그룹바이 탭) | △ 도메인 탭(event offer 포함) |
| **매장 취급 상품** | `/store/commerce/local-products` | StoreLocalProductsPage | `fetchLocalProducts()` | `StoreLocalProduct` | **매장 취급(주문 불가)** | ❌ 없음 |
| 허브 홈 | `/store-hub` | StoreHubPage | — | — | 탐색 랜딩 | — |
| 허브 B2B 카탈로그 | `/store-hub/b2b` | HubB2BCatalogPage | `getCatalog()` | 카탈로그(공급 가능) | 탐색(추가 진입) | △ SERVICE/PRIVATE/operator 탭 |
| 허브 이벤트 오퍼 | `/store-hub/event-offers` | KpaEventOfferPage | `getEnrichedOffers()` | EventOffer(status) | 탐색/담기 | ❌ 없음(독립) |
| 장바구니 | `/store-hub/cart` | StoreCartPage | `groupBySupplier()` | store_cart_items | 주문 준비 | — |

**핵심:**
- ✅ **목록 단위 혼재 없음**: `/store/my-products`(O4O 주문 가능)·`/store/commerce/local-products`(매장 취급)·이벤트 오퍼(독립)가 화면상 분리.
- ⚠️ **용어 혼선(B)**: "자체 상품"(StoreLocalProduct) / "내 매장 상품"(OrganizationProductListing) / "내 매장" 배지가 혼용. 포괄 "내 매장 상품" 이 OrganizationProductListing 에 사용됨.
- ⚠️ `/store/commerce/products` 는 도메인 탭(kpa/kpa-groupbuy 등)으로 event offer 주문이 섞여 표시(탭 분리이긴 함).

---

## 7. Phase 3 — 매장 허브 선택 후 O4O 주문 가능 전환 경로

**`applyBySupplyProductId` → distributionType 분기**(`pharmacy-products.controller.ts:194-228`, `product-approval-v2.service.ts`):

| distributionType | 즉시 생성 | 승인 | 승인 후 생성 | 주문 가능 시점 |
|------------------|-----------|:---:|--------------|----------------|
| **SERVICE** | `ProductApproval(PENDING)` | ✅ operator/supplier | `createServiceApproval`→승인 시 `OrganizationProductListing(is_active=false)` | 승인 + 매장 활성화 후 |
| **PRIVATE**(판매자 모집) | `ProductApproval(PENDING)` | ✅ supplier | `approvePrivateProduct`→`OrganizationProductListing(is_active=false)` | 공급 승인 + 활성화 후 |
| **PUBLIC** | **즉시 `OrganizationProductListing`** | ❌ 불필요 | — | 즉시(공급자가 공개한 상품) |

**핵심(불일치 해소):**
- **SERVICE/PRIVATE: 신청 = `ProductApproval(PENDING)`, listing 은 승인 후 `is_active=false` 로 생성** → **신청 ≠ 주문 가능(안전).** 활성화는 매장이 별도 토글.
- **PUBLIC: 승인 없이 즉시 listing 생성** → 즉시 주문 가능(공급자가 PUBLIC 공개한 상품의 의도된 흐름).
- StoreProductProfile 은 barcode 등록/매장 메타 편집 시 upsert(주문 가능 여부와 독립).

---

## 8. Phase 4 — 매장 취급 상품 모델

| 기능 | route/API | entity | ProductMaster 연결 | O4O 주문 연결 | 실행 자산 연결 |
|------|-----------|--------|:---:|:---:|:---:|
| 자체 상품 관리 | `/store/commerce/local-products`, `fetchLocalProducts()` | `StoreLocalProduct` | ❌ 없음 | ❌ **금지(주석 명시)** | tablet/storefront 진열 |

- `StoreLocalProduct` 는 **실사용**(GET/POST/PUT/DELETE route + tablet/public storefront JOIN).
- **Commerce Object 아님** — Checkout/EcommerceOrder 연결 금지(entity 주석). 주문 버튼 없음(관리/진열만).
- ProductMaster 미연결(독립 organizationId 격리).
- → 매장 취급 상품 모델은 **이미 O4O 주문 가능 상품과 구조적으로 완전 분리**되어 있음. 화면 용어는 "자체 상품".

---

## 9. Phase 5 — 이벤트 오퍼/판매자 모집/펀딩 반영 방식

| 유형 | 생성 데이터 | O4O 주문 가능 목록 포함 | 별도 이력/상태 | 판정 |
|------|-------------|:---:|:---:|:---:|
| **이벤트 오퍼** | `StoreCartItem(event_offer)`→`Order`. listing 미생성 | ❌(주문 중심) | ✅ status(active/ended)+주문 이력 | A — `/store/my-products` 미포함, 별도 분리 정상 |
| **판매자 모집(PRIVATE)** | `ProductApproval(PRIVATE,PENDING)`→승인 시 listing | △ 승인 후 O4O 주문 가능 | ✅ 신청/승인 상태 | B/D — mechanism(PRIVATE approval vs `neture_partner_recruitments`) 여전히 불확정 |
| **유통참여형 펀딩(market trial)** | KPA 에서 **Neture 리다이렉트**(`/market-trial`→neture.co.kr) | ❌ | — | D — KPA 내 매장 미연결, 정의 미확정 |

**핵심:**
- 이벤트 오퍼는 **O4O 주문 가능 상품 목록(OrganizationProductListing)에 들어가지 않음** — 주문/이벤트 이력으로 분리(정상).
- 판매자 모집은 PRIVATE approval 경로로는 신청→승인→listing(공급 승인 상품) 이나, 모집 공고 자체의 단일 mechanism 은 미확정(추가 IR).
- 펀딩은 KPA 미연결(Neture 리다이렉트) → 내 매장 공통화 범위에서 제외 가능.

---

## 10. Phase 6 — 내 매장 공통화 기준 모델 (제안)

### 10.1 메뉴/탭 구조 (제안)
```
내 매장
├─ 매장 취급 상품        → StoreLocalProduct (주문 불가, 진열/관리)
├─ O4O 주문 가능 상품    → OrganizationProductListing(approved+is_active)
├─ 신청/승인 현황        → ProductApproval(PENDING/APPROVED, SERVICE/PRIVATE)
├─ 주문 내역            → checkout_orders / checkout_order_items
├─ 이벤트 오퍼 주문      → store_cart_items(event_offer) / 주문 이력 (별도)
└─ (제작 자료/실행 자산)  → 기존 Store Hub 공통화 축
```

### 10.2 화면 용어 기준
- 금지: "내 매장 상품"(포괄), "자체 상품"↔"O4O 주문 가능 상품" 혼용.
- 권장: **매장 취급 상품 / O4O 주문 가능 상품 / 신청·승인 현황 / 공급 승인 상품 / 이벤트 오퍼 주문**.

### 10.3 데이터 기준
| 화면/섹션 | 기준 entity | 포함 | 제외 | 주문 가능 |
|-----------|-------------|------|------|:---:|
| 매장 취급 상품 | `StoreLocalProduct` | 자체 진열 상품 | O4O 공급 상품 | ❌ |
| O4O 주문 가능 상품 | `OrganizationProductListing`(approved+is_active) | 승인·활성 공급 상품 | PENDING 신청 | ✅ |
| 신청/승인 현황 | `ProductApproval` | PENDING/APPROVED/REJECTED | 활성 listing | — |
| 이벤트 오퍼 주문 | `store_cart_items`/`checkout_orders` | event_offer 주문 | listing | 주문 시 |
| 매장 메타 | `StoreProductProfile` | 표시명/설명(공용) | — | — |
| 원천/공급 | `ProductMaster`/`SupplierProductOffer` | 원장/공급 조건 | — | — |

---

## 11. Phase 7 — 판정 및 후속

| # | 영역 | 판정 | 근거 | 후속 |
|---|------|:---:|------|------|
| 1 | 매장 취급(StoreLocalProduct) vs O4O 주문 가능(OrganizationProductListing) **테이블 분리** | **A** | 별도 entity, Commerce 금지 주석 | 그대로 기준 |
| 2 | `/store/my-products`·local-products·event 화면 목록 분리 | **A** | Phase 2 | 유지 |
| 3 | SERVICE/PRIVATE 신청≠주문가능(승인 후 listing) | **A** | Phase 3 | 유지 |
| 4 | 화면 용어 혼선("자체 상품"/"내 매장 상품"/포괄) | **B** | Phase 2 | 소형 WO(용어 정리) |
| 5 | `/store/commerce/products` 도메인 탭에 event offer 혼재 | **B** | Phase 2 | 소형 WO(탭/표기 정리) |
| 6 | PUBLIC 즉시 listing vs SERVICE/PRIVATE 승인 경로 | **A** | Phase 3 | 공통화 시 명시 |
| 7 | 판매자 모집 mechanism(PRIVATE approval vs recruitments) | **D** | Phase 5 | 추가 IR(선행 IR과 동일) |
| 8 | 유통참여형 펀딩/market trial 정의(KPA 리다이렉트) | **D** | Phase 5 | 추가 IR |
| 9 | StoreProductProfile O4O/비-O4O 공용 역할 | **B** | Phase 1 | 공통화 시 메타 계층 명시 |

### 소형 WO 후보
- `WO-O4O-MY-STORE-PRODUCT-TERMINOLOGY-ALIGNMENT-V1` — "매장 취급 상품 / O4O 주문 가능 상품" 용어·탭 정리(#4, #5).

### 추가 IR 후보 (공통화 전 불필수 — 병행 가능)
- `IR-O4O-SELLER-RECRUITMENT-TO-SUPPLY-APPROVAL-FLOW-V1`(#7) · `IR-O4O-DISTRIBUTION-FUNDING-VS-MARKET-TRIAL-DEFINITION-V1`(#8).

### 내 매장 공통화 WO
- `WO-O4O-MY-STORE-COMMONIZATION-PHASE5-KPA-BASELINE-V1` — **본 IR §10 기준 모델로 진행 가능**(구조 분리는 이미 A).

---

## 12. 결론

> **결론 = "2. 일부는 분리되어 있지만 화면/용어/API에서 혼선이 있다."**

- **구조(DB)는 이미 분리됨(A)**: 매장 취급 상품=`StoreLocalProduct`(비-Commerce, 독립), O4O 주문 가능 상품=`OrganizationProductListing`(approved+is_active). 신청 상태(`ProductApproval`)도 별도. **테이블 재구조화 보정 불필요.**
- **표면(용어/탭)에 혼선(B)**: "자체 상품"↔"내 매장 상품"↔포괄 용어 혼용, `/store/commerce/products` 도메인 탭 event 혼재. → 소형 용어/탭 정리 WO 권고.
- **미확정(D)**: 판매자 모집 mechanism, 펀딩 정의 — 내 매장 공통화의 **필수 차단 요인은 아님**(별도 섹션/상태로 처리 가능), 병행 추가 IR.
- 따라서 **내 매장 공통화 WO 는 §10 기준 모델로 안전하게 진행 가능**하며, 용어 정렬(소형 WO)을 선행/병행하면 혼선 위험이 제거된다.
- GP/KCos: KPA 의 6-entity 모델이 service-neutral(serviceKey 기반)이라 동일 적용 가능성 높음 — KPA 기준 확정 후 판단.

> **조사 한계:** 판매자 모집 mechanism·펀딩 정의는 본 IR 에서도 단정하지 않고 D 로 분리. 정적 코드 조사 기반, live 미수행. 일부 경로(applyBySupplyProductId 의 PUBLIC 즉시 listing)는 controller 분기로 확인됨.

---

*Generated: 2026-06-11 · read-only IR · 코드 무변경 · 조사 기준 commit `512104c9d`*

# O4O-PRODUCT-CORE-BASELINE-V1

> O4O 상품 정보 canonical 구조와 단계별 정비 기준 **Baseline 선언**.
>
> Status: Active (Baseline)
> Version: 1.0
> Created: 2026-06-06
> WO: `WO-O4O-PRODUCT-CORE-BASELINE-V1`
> 선행 조사: [`IR-O4O-PRODUCT-CORE-AND-REGISTRATION-FLOW-AUDIT-V1`](../investigations/IR-O4O-PRODUCT-CORE-AND-REGISTRATION-FLOW-AUDIT-V1.md)
> 선행 참조: CLAUDE.md §4 E-commerce Core, §5 Store, §7 Boundary, §9 도메인 규칙,
>   [`O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1`](../architecture/O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1.md),
>   [`STORE-PRODUCTS-CANONICAL-V1`](../architecture/STORE-PRODUCTS-CANONICAL-V1.md)

---

## 1. Purpose

본 문서는 O4O Platform 상품 정보(Product) 영역의 **canonical 구조와 단계별 정비 순서를 고정**하기 위한 baseline 선언이다.

선행 조사([`IR-O4O-PRODUCT-CORE-AND-REGISTRATION-FLOW-AUDIT-V1`](../investigations/IR-O4O-PRODUCT-CORE-AND-REGISTRATION-FLOW-AUDIT-V1.md))의 핵심 결론은 다음과 같다:

> **Product Core 단일화는 신규 구축(greenfield)이 아니라, 이미 존재하는 `product_masters` / `ProductMaster` 중심 canonical 모델로의 통합·확장·마이그레이션 문제다.**

따라서 본 baseline은 "무엇을 새로 만들 것인가"가 아니라 **"이미 무엇이 SSOT이고, 무엇이 legacy이며, 실제 공백을 어떤 순서로 메울 것인가"** 를 고정한다.

본 문서는 **문서 baseline 이다.** 코드·엔티티·migration·API·UI 변경을 포함하지 않는다. 후속 구현 WO(Phase 2~6)는 본 baseline을 기준으로 판단한다.

---

## 2. Canonical Product Model

원칙: **신규 테이블 최소화. 현존 canonical(`ProductMaster` 중심)을 SSOT로 고정**하고, 부족분(Identifier / Candidate / Draft / Rx)만 가산(additive)한다.

```
                         ┌────────────────────────┐
   (신규) mobile_product_drafts ──┐                │
   (현존) catalog_import_rows ────┼──► product_candidates (신규: 웹 검토 후보 큐)
   (현존) csv_import_rows ────────┘                │  매칭/확정
                                                   ▼
                            ┌──────────────────────────────┐
                            │   ProductMaster (현존, SSOT)   │  ◄── product_identifiers (신규 계층)
                            │   product_masters             │       barcode/표준/보험/내부/공급자/로컬
                            └──────────────────────────────┘
                              │            │             │
              SupplierProductOffer   StoreProductProfile  PharmaProductMaster (현존)
              (현존, 공급자 전용)     OrganizationProductListing   ├─ otc_drug profile (강화)
                                     (현존, 매장 활용)            └─ rx_drug extension (신규)
```

핵심 선언:

1. **`ProductMaster` (`product_masters`) 를 O4O 상품 정보 SSOT 로 선언한다.** 식별/규제/카테고리/브랜드/이미지/스펙은 Core 에 귀속한다.
2. **`SupplierProductOffer` 는 Product Core 가 아니라 공급자 확장 정보다.** Master 만 참조하며, 공급 정책(B2B/distribution/seller모집/공급조건/승인/가격/재고)은 Core 로 끌어올리지 않는다.
3. **`StoreProductProfile` + `OrganizationProductListing` 은 내 약국/내 매장 활용 확장이다.** Master 를 참조하되 Offer 의 공급 정책은 소비하지 않는다.
4. **`CatalogProduct` + `StoreProduct` 는 공용 카탈로그 및 매장 copy 계층이다.** (catalog = 매장 공용 풀, store = 매장 독립 copy)
5. **`PharmaProductMaster` 는 Drug Extension 이다.** Product Core 와의 연결 강화(`coreProductMasterId` 필수화 검토)가 필요하다.
6. **`product_identifiers` (Identifier Core) 는 신규 필요 계층이다.** 도입 전까지 `product_masters.barcode` 단일 UNIQUE 구조가 현존 제약이다.

---

## 3. Existing Canonical Components

조사 결과, 다음 canonical 구성요소는 **이미 존재**한다 (유지·발전 대상).

| 개념 | 테이블 / 엔티티 | 역할 | 파일 |
|---|---|---|---|
| **Product Core (SSOT)** | `product_masters` / `ProductMaster` | 플랫폼 상품 SSOT. barcode UNIQUE, MFDS regulatory immutable | `apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts` |
| **Supplier Product Profile** | `supplier_product_offers` / `SupplierProductOffer` | 공급자 공급 제안 (B2B/B2C, distribution, 가격, 재고) | `apps/api-server/src/modules/neture/entities/SupplierProductOffer.entity.ts` |
| **Store/Pharmacy Product Profile** | `store_product_profiles` / `StoreProductProfile` (`(org_id, master_id)` UNIQUE) | 매장별 Master 표시 프로필 | `apps/api-server/src/modules/store-core/entities/StoreProductProfile.entity.ts` |
| **Store Listing** | `organization_product_listings` / `OrganizationProductListing` | 매장 진열/이벤트/승인 lifecycle | `apps/api-server/src/modules/store-core/entities/organization-product-listing.entity.ts` |
| **공용 카탈로그** | `catalog_products` / `CatalogProduct` | 매장 공용 상품 풀 (Master 연결 optional) | `apps/api-server/src/modules/catalog/entities/catalog-product.entity.ts` |
| **매장 copy 계층** | `store_products` / `StoreProduct` | catalog → 매장 독립 copy | `apps/api-server/src/modules/store/entities/store-product.entity.ts` |
| **Drug Extension** | `pharma_product_masters` / `PharmaProductMaster` | 의약품 확장 (drugCode/insuranceCode/atcCode, OTC·ETC·QUASI) — Core 와 느슨한 연결 | `packages/pharmaceutical-core/src/entities/PharmaProductMaster.entity.ts` |
| **Service Product prep** | `service_products` / `ServiceProduct` | `Master→Offer→ServiceProduct→Listing` 미래 구조 준비 | `apps/api-server/src/routes/kpa/entities/service-product.entity.ts` |
| **Import / Source staging** | `catalog_import_rows`, `csv_import_rows` | CSV/xlsx 일괄등록 staging (원시 수집→매칭→확정 패턴) | `apps/api-server/src/modules/catalog-import/entities/`, `.../neture/entities/SupplierCsvImportRow.entity.ts` |

---

## 4. Legacy / Migration Candidates

다음은 canonical 과 병존하는 **legacy per-service 상품 구조**다. 단일화 시 마이그레이션·deprecation 대상이나, 본 baseline 에서는 분류만 고정하고 구현은 후속 WO 로 미룬다.

| 엔티티 | 상태 | 비고 |
|---|---|---|
| `GlycopharmProduct` | catalog+store 로 마이그레이션 **진행됨** (`20260409300000`) | 잔존 정리 필요 |
| `CosmeticsProduct` | cosmetics 독립 스키마(`cosmetics_` prefix, CLAUDE.md §9) 격리, 잔존 | canonical 통합 여부는 cosmetics 도메인 규칙과 함께 **별도 판단** |
| `NetureProduct` | neture schema 골격, 잔존 | 정리 후보 |
| `StoreLocalProduct` | display-only (commerce 금지), 별도 도메인 | **통합 대상 아님** (혼동 금지) |
| `OrganizationProductApplication` | **이미 제거됨** (빈 파일, 테이블 drop) | 조치 불필요 |

> 주의: `StoreLocalProduct` 는 display-only 별도 도메인으로 Product Core 통합 대상이 **아니다.** legacy 상품 테이블과 혼동하지 않는다. (IR §2.3, §4.5)

---

## 5. Product Identifier Policy

### 5.1 현존 제약

- barcode 저장 위치: `product_masters.barcode` `varchar(14)` **단일 컬럼**
- UNIQUE 제약: `uq_product_masters_barcode UNIQUE(barcode)` (전역 UNIQUE, 중복 불가)
- barcode 없음: 내부 바코드 자동 생성(GS1 prefix 200, EAN-13) + `barcode_source=INTERNAL`
- 기타 식별자(drugCode/insuranceCode/atcCode): `PharmaProductMaster` 에 **산재**
- 통합 `product_identifiers` 테이블: **부재**

### 5.2 정책

> **`product_masters.barcode` 단일 UNIQUE 구조는 현존 제약이다. Identifier Core(`product_identifiers`) 도입 전에는 모바일 등록·OTC 등록·Rx 등록 구현을 시작하지 않는다.**

근거: 단일 UNIQUE 컬럼 구조는 (a) 중복 바코드, (b) 다중 식별자(표준코드/보험코드/내부코드/공급자코드/약국 로컬코드), (c) 처방의약품의 다른 코드 체계 를 수용할 수 없다. 이는 Phase 5/6(OTC/Rx)의 전제이며, 현 구조의 **가장 큰 제약**이다.

### 5.3 전환 원칙 (Phase 2 설계 가이드)

- `product_identifiers` 는 **additive** 로 도입한다 (예: `{product_master_id, identifier_type, value, source, is_primary, verification_status}`).
- `ProductMaster.barcode` 는 다수 소비처(매칭/검색/slug/UNIQUE)에 깊게 결합돼 있으므로 **빅뱅 제거 불가**. primary barcode 는 Master 에 **mirror 로 유지**하고 identifiers 는 가산한다.
- 일반/의약품 식별자를 단일 계층에서 일관 처리하도록 `PharmaProductMaster` 의 코드들을 Identifier Core 로 승격 검토한다.

---

## 6. Supplier Product Boundary

`SupplierProductOffer` 에 응집된 다음은 **공급자 책임 영역**이며 매장 활용 상품에서 분리 유지한다:

- **B2B 설명** (`businessShortDescription`, `businessDetailDescription`) vs **B2C 설명** (`consumerShortDescription`, `consumerDetailDescription`)
- 공급가/서비스가/스팟가/소비자참고가 (`priceGeneral`, `priceGold`, `pricePlatinum`, `consumerReferencePrice`)
- 공급 조건·노출 정책: distribution(`isPublic` + `serviceKeys` → PUBLIC/SERVICE/PRIVATE), `approvalStatus`, `allowedSellerIds`(판매자 모집/제한), `isFeatured`
- 재고(`stockQuantity`/`reservedQuantity`/`trackInventory`), soft-delete/recycle bin

> **경계 선언:** 공급자 전용(B2B/distribution/seller모집/공급조건/승인/가격/재고)은 **절대 Product Core 로 끌어올리지 않는다.** 매장 활용 상품(StoreProductProfile)은 Master 만 참조하고 Offer 의 공급 정책은 소비하지 않는다. 이미 구조적으로 분리돼 있으므로 이 경계를 **무너뜨리지 않는 것**이 과제다.

---

## 7. Store / Pharmacy Product Boundary

매장(약국/매장) 측 canonical 흐름은 `packages/store-products-ui` + `/api/v1/store/products` 로 이미 공통화돼 있다:

- 검색: `StoreProductSearchResult` (`id = masterId`) → **ProductMaster 검색**
- 진열: `StoreListingItem` → `OrganizationProductListing` (master 기반, `offerId` nullable = master-only listing)
- 매장 표시명/설명: `StoreProductProfile` (`(org_id, master_id)` UNIQUE)

`WO-O4O-KPA-STORE-MY-PRODUCTS-FLOW-SIMPLIFY-V1` 로 **offer 없이 master 만으로도 매장 진열** 가능하게 이미 단순화됨.

> **경계 선언:** 세 서비스(KPA/GlycoPharm/K-Cosmetics)는 `ProductMaster` + `OrganizationProductListing` + `StoreProductProfile` 를 공유한다. 사용자-facing 용어(내 약국/내 매장/약국·분회)는 서비스 정체성으로 보존하되 **구조는 공통**이다. Store Ops 는 CLAUDE.md §7 에 따라 `organizationId` boundary 를 유지한다.

---

## 8. Mobile Registration Boundary

### 8.1 현황

- `services/mobile-app/` (Expo/RN) — **Foundation skeleton (v0.1.0)**. 홈 메뉴(`상품 관리`, `카메라/업로드`)는 전부 `disabled` "준비 중".
- 바코드 스캔/촬영·상품명·이미지·가격 수집·저장 entity·`mobile_product_drafts` draft 테이블·웹 검토함 연결 — **전부 부재**.

### 8.2 정책

> **모바일은 정식 등록이 아니라 수집이다. 웹은 검토·확정·활용 설정이다.**

- 모바일은 바코드/상품명/이미지/가격수준을 "검토 필요" 상태로 **수집(draft)** 만 한다.
- 확정(매칭/신규 Master 생성/매장 활용 전환)은 **웹 검토 큐(`product_candidates`)** 에서 수행한다.
- 가장 근접한 기존 패턴은 CSV/xlsx import staging(`catalog_import_rows`/`csv_import_rows`)의 "원시 수집 → 매칭 → 확정" 이며, 모바일 draft 는 이를 row-단위 수집으로 일반화한다.
- **모바일 수집 데이터를 `ProductMaster` 에 직접 확정 저장하지 않는다** (SSOT 오염 방지).

---

## 9. Product Type and Drug Extension Policy

비의약품 / 비처방의약품(OTC) / 처방의약품(Rx) 는 **Product Core 를 공유하되 extension 과 등록 UX/검증 정책을 분리**한다.

| 분류 | 현존 수용 | 정책 |
|---|---|---|
| `non_drug` (비의약품) | ✅ Master + Offer | 기존 일반 상품 등록 (현존) |
| `otc_drug` (비처방의약품) | ⚠️ Master + `PharmaProductMaster`(OTC) 부분 — 등록 UX 분기 미흡 | 같은 Product Core + **의약품 전용 등록 UX/검증 분기**(성분/함량/제형/허가/효능출처/용법/주의/광고검토 상태). Phase 5 |
| `rx_drug` (처방의약품) | ❌ enum(ETC)만 존재 | **별도 등록 루트** + 고객 노출/온라인판매 차단 + 보험/표준코드 identifier + barcode 체계 차이 수용. Phase 6 |
| `quasi_drug` (의약외품) | ✅ enum 존재 (QUASI_DRUG) | 추가 불필요 |
| `health_functional_food` | ⚠️ regulatoryType 문자열로만 | 필요 시 profile |
| `cosmetics` | ⚠️ cosmetics 독립 스키마 별존 | 통합 판단 별도 |
| `device` | ⚠️ glycopharm CGM 기기(레거시) | profile |
| `other` | ✅ GENERAL | — |

규제 게이트: `assertPharmacyOnlyServiceKeys(isRegulated, ...)` — 규제 상품(의약품)은 약국 전용 서비스에만 연결 가능 (현존, `WO-O4O-REGULATED-PRODUCT-GATE-CONSOLIDATION-V1`).

> **연결 강화 필요:** `PharmaProductMaster` 는 Core 와 느슨한 연결(`coreProductMasterId` nullable). Identifier Core 승격 시 일반/의약품 식별자를 단일 계층에서 일관 처리하고 `coreProductMasterId` 필수화를 검토한다.

---

## 10. Rx Drug Policy

처방의약품(Rx, `ETC`)은 별도 등록 루트와 고객 노출/온라인 판매 차단 정책이 필요하다.

- **별도 등록 루트:** Rx 전용 등록 흐름. 최종 저장은 `ProductMaster + Identifier Core + Rx Extension` 지향.
- **노출/판매 차단:** 고객 대상 판매/홍보 노출 차단, 온라인 판매 불가. 약국 내부 확인/업무 보조 중심.
- **식별자:** 보험코드/표준코드 identifier + GTIN(8/12/13/14)과 다른 barcode 체계 차이 수용 — **Identifier Core(Phase 2) 전제**.
- 현재는 `assertPharmacyOnlyServiceKeys` 게이트만 존재 → Rx 전용 차단 정책 별도 신규.

> **전제:** Rx 루트는 Identifier Core(Phase 2) 확정 후 착수한다 (Phase 6). 약사법 리스크가 있으므로 노출/판매 차단 정책을 등록 루트와 **동반** 설계한다.

---

## 11. Implementation Phase Order

다음 순서로 고정한다. 선후 의존을 반드시 준수한다.

| Phase | 내용 | 산출물 |
|---|---|---|
| **Phase 1 — Product Core baseline** | 현존 canonical 고정 선언, legacy 분류, 용어 매핑 (본 문서) | `O4O-PRODUCT-CORE-BASELINE-V1` (문서) |
| **Phase 2 — Identifier Core** | `product_identifiers` additive 도입. primary barcode mirror, 다중/중복/비-GTIN 코드 수용. 소비처(매칭/검색/slug) 영향 매핑 | WO (migration + service) |
| **Phase 3 — Web product candidate review queue** | `product_candidates` 검토 큐: 기존 Master 매칭 / 신규 후보 / 매장 활용 전환. CSV import staging 수렴 | WO |
| **Phase 4 — Mobile product draft** | `mobile_product_drafts` (바코드/상품명/이미지/가격수준 수집, "검토 필요") → Phase 3 검토 큐 연결 | WO |
| **Phase 5 — Non-drug / OTC extension** | OTC 등록 UX 분기 + 의약품 검증 정책. pharma extension 강화 | WO |
| **Phase 6 — Rx drug registration route and policy** | 처방의약품 전용 등록 루트 + 고객 노출/온라인판매 차단 + 보험/표준코드 identifier | WO |

> **선후 의존:** Phase 2(Identifier Core)는 Phase 5/6 의 전제. Phase 3 은 Phase 4 의 전제. Phase 1 은 전체 착수 전 선행.
>
> ⚠️ **구현 착수 보류 대상:** 모바일 등록 구현 · 약국/매장 상품 등록 화면 신규 구현 · 비처방의약품 등록 화면 — 모두 **Identifier Core(Phase 2) 설계 확정 전 착수 금지**.

---

## 12. Prohibited Shortcuts

다음은 본 baseline 위반이며 금지한다.

1. **Neture 공급자 상품 등록 기능을 약국/매장 상품 등록으로 그대로 복사 금지** — Offer 의 B2B/distribution/seller모집/공급조건/승인은 공급자 전용. 매장은 Master 만 참조.
2. **`product_masters.barcode` 단일 UNIQUE 컬럼을 장기 식별자 모델로 확정 금지** — Identifier Core 없이 중복/다중/Rx 식별자 수용 불가.
3. **모바일 수집 데이터를 `ProductMaster` 에 직접 확정 저장 금지** — 반드시 candidate/draft 경유 (SSOT 오염 방지).
4. **비처방의약품(OTC)을 일반 상품 등록 화면으로 그대로 처리 금지** — 검증 정책/효능·용법 출처/광고 검토 분기 필수.
5. **처방의약품(Rx)을 온라인 판매/고객 노출 흐름에 연결 금지** — 노출/판매 차단 정책 동반.
6. **공급자 B2B/B2C 상세정보를 Product Core 로 끌어올리기 금지** — 공급 정책은 Offer 에 유지.
7. **서비스별 사용자-facing 용어 혼용 금지** — 내 약국(GlycoPharm)/내 매장(K-Cosmetics)/약국·분회(KPA)/공급자·파트너(Neture). 구조는 공통, 용어는 서비스 정체성.

추가 가드 (CLAUDE.md 연계):
- 독립 주문 테이블 금지, OrderType 불변 (§4). Product 작업이 commerce 경계 침범 금지.
- Store Ops = `organizationId` boundary (§7). UUID 단독 조회 금지, Domain Primary Boundary 필터 필수.
- `StoreLocalProduct`(display-only)는 Product Core 통합 대상 아님 — 혼동 금지.

---

## 13. Follow-up WO List

| 순서 | WO | 성격 | 전제 |
|---|---|---|---|
| 1 | `WO-O4O-PRODUCT-CORE-BASELINE-V1` (본 문서) | 문서 | — |
| 2 | `WO-O4O-PRODUCT-IDENTIFIER-CORE-V1` | 구현 (migration + service) | Phase 1 |
| 3 | `WO-O4O-PRODUCT-CANDIDATE-REVIEW-QUEUE-V1` | 구현 | Phase 2 |
| 4 | `WO-O4O-MOBILE-PRODUCT-DRAFT-V1` | 구현 | Phase 3 |
| 5 | `WO-O4O-OTC-DRUG-EXTENSION-V1` | 구현 | Phase 2 |
| 6 | `WO-O4O-RX-DRUG-REGISTRATION-ROUTE-V1` | 구현 | Phase 2 |

> 다음 권고 작업: **`WO-O4O-PRODUCT-IDENTIFIER-CORE-V1`** (Phase 2). `product_identifiers` additive 도입 설계 — primary barcode mirror, 소비처 영향 매핑. Phase 5/6 의 전제이며 현 구조의 가장 큰 제약을 해소한다.

---

**작성:** O4O Platform Team · 2026-06-06
**상태:** Active Baseline — ProductMaster = SSOT (현존), Identifier Core·Product Candidates·Mobile Draft·Rx 루트가 실제 공백

# IR-O4O-PRODUCT-CORE-AND-REGISTRATION-FLOW-AUDIT-V1

> O4O 상품 정보 단일화와 등록 흐름 정비를 위한 **read-only 조사**.
> 현재 코드·DB·화면·API 구조를 파악하고, Product Core + Identifier Core + Extension 구조로 정비하기 위한 기준과 단계별 WO를 제안한다.
>
> **조사 전용 — 코드/엔티티/마이그레이션/라우트/UI 수정 없음. DB write 없음. migration 없음.**

- **작성일:** 2026-06-05
- **분류:** Investigation (IR) — Product Core & Registration Flow Audit
- **상태:** Complete (조사 완료 + 단계별 WO 제안)
- **프로토콜:** [`O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1`](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md)
- **선행 참조:** CLAUDE.md §4 E-commerce Core, §5 Store, §7 Boundary, §9 도메인 규칙, [`O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1`](../architecture/O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1.md), [`STORE-PRODUCTS-CANONICAL-V1`](../architecture/STORE-PRODUCTS-CANONICAL-V1.md)

---

## 1. Executive Summary

### 1.1 핵심 결론 (예상과 다른 지점)

본 IR의 가장 중요한 발견은 다음과 같다:

> **Product Core 단일화는 "신규 구축(greenfield)"이 아니라 "이미 상당 부분 구축된 canonical 모델로의 통합/마이그레이션" 문제다.**

플랫폼에는 이미 service-neutral 한 상품 SSOT 체계가 존재한다:

| 후보 개념 (WO §8) | 현존 여부 | 실제 테이블/엔티티 |
|---|---|---|
| **Product Core** | ✅ 존재 | `product_masters` (`ProductMaster`) — 플랫폼 SSOT, barcode 1=1, MFDS 규제정보 immutable |
| **Supplier Product Profile** | ✅ 존재 | `supplier_product_offers` (`SupplierProductOffer`) — B2B/B2C 설명·재고·가격·distribution·serviceKeys |
| **Store/Pharmacy Product Profile** | ✅ 존재 | `store_product_profiles` (`StoreProductProfile`, `(org_id, master_id)` UNIQUE) + `organization_product_listings` (진열) |
| **공용 카탈로그(store-shared pool)** | ✅ 존재 | `catalog_products` (`CatalogProduct`) + `store_products` (`StoreProduct`, 매장 독립 copy) |
| **Drug Extension** | ✅ 부분 존재 | `pharma_product_masters` (`PharmaProductMaster`) — drugCode/insuranceCode/atcCode/성분/효능/용법/주의, OTC·ETC·QUASI enum. 단, Core와 **느슨한 연결**(`coreProductMasterId` nullable) |
| **Service Product Layer** | ✅ prep 존재 | `service_products` (`ServiceProduct`) — `Master→Offer→ServiceProduct→Listing` 미래 구조 준비 |
| **Product Source Records** | ⚠️ 부분 | import staging: `catalog_import_rows`, `csv_import_rows` (CSV/xlsx 일괄등록용) — 범용 source record 아님 |
| **Identifier Core** | ❌ **부재** | barcode는 `product_masters.barcode` **단일 UNIQUE 컬럼**. pharma 코드는 별도 엔티티에 산재 |
| **Product Candidates (검토 후보)** | ❌ **부재** | 웹 검토함/후보 큐 없음 |
| **Mobile Product Draft** | ❌ **부재** | 모바일 앱은 골격(skeleton)만 존재 |
| **Rx Drug Extension (전용 루트)** | ❌ **부재** | ETC enum 값만 존재, 전용 등록 루트·노출 차단 없음 |

### 1.2 Product Core 단일화 가능성

- **가능하다. 이미 진행 중이다.** `ProductMaster`가 SSOT로 정의돼 있고(`WO-O4O-PRODUCT-MASTER-CORE-RESET-V1`), GlycoPharm 레거시 상품은 이미 `catalog_products`+`store_products`로 마이그레이션됨(`20260409300000-MigrateGlycopharmProductsToCatalogAndStore.ts`).
- 남은 단일화 대상은 **레거시 per-service 상품 테이블**(`glycopharm-product`, `cosmetics-product`, `neture-product`)의 잔존과, 규제식별자(Identifier) 단일화다.

### 1.3 가장 먼저 정비해야 할 단계

1. **(문서)** Product terminology / 현존 canonical 모델 baseline 선언 — 무엇이 SSOT이고 무엇이 legacy인지 고정.
2. **(Identifier Core)** `product_masters.barcode` 단일 UNIQUE 컬럼 → `product_identifiers` 다중 식별자 계층 도입 설계. **이것이 Rx·보험코드·중복바코드 수용의 전제이며, 현 구조의 가장 큰 제약.**
3. 이후 모바일 draft → 웹 검토 흐름, OTC/Rx extension 순.

> ⚠️ **현 시점 구현 착수 보류 권고 대상:** 모바일 등록 구현, 약국/매장 상품 등록 화면 신규 구현, 비처방의약품 등록 화면 — 모두 **Identifier Core 설계 확정 전 착수 금지**. (Risk §10 참조)

---

## 2. Current Code Map

### 2.1 Canonical 상품 엔티티 (modern, 유지·발전 대상)

| 엔티티 | 테이블 | 파일 | 역할 |
|---|---|---|---|
| `ProductMaster` | `product_masters` | `apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts` | 플랫폼 상품 SSOT. barcode UNIQUE, MFDS regulatory immutable |
| `SupplierProductOffer` | `supplier_product_offers` | `apps/api-server/src/modules/neture/entities/SupplierProductOffer.entity.ts` | 공급자 공급 제안 (Supplier Profile) |
| `ProductCategory` / `Brand` / `ProductImage` | (각) | `apps/api-server/src/modules/neture/entities/{ProductCategory,Brand,ProductImage}.entity.ts` | Master 부속 |
| `ProductAlias` | — | `apps/api-server/src/modules/neture/entities/ProductAlias.entity.ts` | 상품명 별칭(매칭 보조) |
| `CatalogProduct` | `catalog_products` | `apps/api-server/src/modules/catalog/entities/catalog-product.entity.ts` | 매장 공용 상품 풀 (Master 연결 optional) |
| `StoreProduct` | `store_products` | `apps/api-server/src/modules/store/entities/store-product.entity.ts` | catalog → 매장 독립 copy |
| `StoreProductProfile` | `store_product_profiles` | `apps/api-server/src/modules/store-core/entities/StoreProductProfile.entity.ts` | 매장별 Master 표시 프로필 |
| `OrganizationProductListing` | `organization_product_listings` | `apps/api-server/src/modules/store-core/entities/organization-product-listing.entity.ts` | 매장 진열/이벤트/승인 lifecycle |
| `ServiceProduct` | `service_products` | `apps/api-server/src/routes/kpa/entities/service-product.entity.ts` | 서비스별 제품 정책 prep layer |
| `PharmaProductMaster` | `pharma_product_masters` | `packages/pharmaceutical-core/src/entities/PharmaProductMaster.entity.ts` | 의약품 확장 (Core와 느슨한 연결) |

### 2.2 Import / Source staging

| 엔티티 | 테이블 | 파일 |
|---|---|---|
| `CatalogImportJob` / `CatalogImportRow` | `catalog_import_*` | `apps/api-server/src/modules/catalog-import/entities/` |
| `SupplierCsvImportRow` | `csv_import_rows` | `apps/api-server/src/modules/neture/entities/SupplierCsvImportRow.entity.ts` |
| matching | — | `apps/api-server/src/modules/neture/services/bulk-match.service.ts` (barcode→master) |

### 2.3 Legacy per-service 상품 테이블 (통합/정리 후보)

| 엔티티 | 상태 | 파일 |
|---|---|---|
| `GlycopharmProduct` | catalog+store로 마이그레이션 진행됨 | `apps/api-server/src/routes/glycopharm/entities/glycopharm-product.entity.ts` (+ migration `20260409300000`) |
| `CosmeticsProduct` | cosmetics schema 격리, 잔존 | `apps/api-server/src/routes/cosmetics/entities/cosmetics-product.entity.ts` |
| `NetureProduct` | neture schema 골격, 잔존 | `apps/api-server/src/routes/neture/entities/neture-product.entity.ts` |
| `StoreLocalProduct` | display-only (commerce 금지), 별도 도메인 | `apps/api-server/src/routes/platform/entities/store-local-product.entity.ts` |
| `OrganizationProductApplication` | **이미 제거됨** (빈 파일, 테이블 drop) | `apps/api-server/src/routes/kpa/entities/organization-product-application.entity.ts` |

### 2.4 API / Controller / Service

| 영역 | 파일 |
|---|---|
| 공급자 상품 등록 | `apps/api-server/src/modules/neture/controllers/supplier-product.controller.ts` (`POST/GET /supplier/products`) |
| Offer 생성 로직 | `apps/api-server/src/modules/neture/services/offer.service.ts` (`createSupplierOffer`, `resolveProductMetadata`) |
| CSV import | `apps/api-server/src/modules/neture/services/csv-import.service.ts`, `xlsx-parser.service.ts`, `mfds.service.ts` |
| 매장(약국) 상품 검색·진열 | `apps/api-server/src/routes/o4o-store/controllers/store-product-library.controller.ts` (`/api/v1/store/products`) |
| Operator 상품 콘솔 | `apps/api-server/src/controllers/operator/ProductConsoleController.ts`, `apps/api-server/src/routes/operator/products.routes.ts` |
| 식별자 유틸 | `apps/api-server/src/utils/gtin.ts` (GTIN 검증 + 내부 바코드 생성) |
| 의약품 서비스 | `packages/pharmaceutical-core/src/services/PharmaProductService.ts` |

### 2.5 Frontend / Packages

| 영역 | 위치 |
|---|---|
| 공급자 상품 등록 UI | `services/web-neture/src/lib/api/{supplier,product,csvImport}.ts` (+ 해당 페이지) |
| 매장 상품 UI 공통 | `packages/store-products-ui/` (contract: `/api/v1/store/products`, `StoreProductSearchResult.id = masterId`) |
| Operator 상품 정리 | `services/web-neture/src/lib/api/operatorProductCleanup.ts`, `apps/admin-dashboard/src/api/product-library.api.ts` |
| 모바일 | `services/mobile-app/` (Expo/React Native, **skeleton**), `apps/mobile-app/` (Capacitor Android wrapper) |

### 2.6 주요 마이그레이션

- `20260301100000-ProductMasterCoreReset.ts` — `product_masters` 생성, **`uq_product_masters_barcode UNIQUE(barcode)`** + `idx_product_masters_barcode`
- `20260307200000-CategoryBrandProductMasterExtension.ts`, `20260307210000-CreateProductImages.ts`
- `20260309100000-CreateServiceProducts.ts`
- `20260325400000-AddBarcodeSourceToProductMasters.ts` — `barcode_source` (`GTIN`/`INTERNAL`)
- `20260409200000-CreateCatalogAndStoreProducts.ts`, `20260409300000-MigrateGlycopharmProductsToCatalogAndStore.ts`
- `20260307100000-CreateCatalogImportTables.ts`, `20260301300000-CsvImportBatchTables.ts`

---

## 3. Neture Supplier Product Findings

### 3.1 등록 흐름

`createSupplierOffer(supplierId, data)` (`offer.service.ts:729`):
1. `validateCreateInput` → barcode 검증/정규화
2. `resolveProductMetadata(manualData, barcode, name, categoryId, brandName)` → **barcode로 기존 `ProductMaster` 매칭, 없으면 신규 생성** (barcode 미입력 시 `gtin.ts:generateInternalBarcode`로 내부 바코드 생성, `barcode_source=INTERNAL`). MFDS 기반 `regulatoryType`/`regulatoryName` 설정, `isRegulated` 판정.
3. `assertPharmacyOnlyServiceKeys(isRegulated, serviceKeys)` — **규제 상품(의약품)은 약국 전용 서비스에만 연결 가능** (`WO-O4O-REGULATED-PRODUCT-GATE-CONSOLIDATION-V1`).
4. `SupplierProductOffer` 생성 (PENDING, isActive=false).

### 3.2 Product Core로 재사용 가능한 부분

- `ProductMaster`의 식별/규제/카테고리/브랜드/이미지/스펙 — **그대로 Core**.
- barcode→master 매칭 로직, GTIN 검증, MFDS regulatory 판정 — **Core 공통 로직**.

### 3.3 Supplier Extension으로 남겨야 할 부분 (공급자 전용)

`SupplierProductOffer`에 응집된 다음은 **공급자 책임 영역**이며 매장 활용 상품에서 제외/분리:
- **B2B 설명** (`businessShortDescription`, `businessDetailDescription`) vs **B2C 설명** (`consumerShortDescription`, `consumerDetailDescription`) — Tiptap HTML, 동일 엔티티 내 4필드로 분리돼 있음.
- 공급가/서비스가/스팟가/소비자참고가 (`priceGeneral`, `priceGold`, `pricePlatinum`, `consumerReferencePrice`).
- **공급 조건·노출 정책:** distribution (`isPublic` + `serviceKeys` → PUBLIC/SERVICE/PRIVATE 파생), `approvalStatus`, `allowedSellerIds`(판매자 모집/제한), `isFeatured`(추천 노출 희망).
- 재고(`stockQuantity`/`reservedQuantity`/`trackInventory`), soft-delete/recycle bin.

> **판단:** 공급자 전용(B2B/distribution/seller모집/공급조건/승인)은 **절대 Product Core로 끌어올리지 말 것.** 매장 활용 상품(StoreProductProfile)은 Master만 참조하고 Offer의 공급 정책은 소비하지 않는다. 이미 구조적으로 분리돼 있으므로 이 경계를 **무너뜨리지 않는 것**이 핵심.

### 3.4 이미지/바코드/가격/카테고리

- 이미지: `ProductImage`(Master OneToMany) — Master 귀속. (공급자 등록 시 채움)
- 바코드: Master 단일 UNIQUE (§6).
- 가격: **Offer 귀속** (Core 아님).
- 카테고리/브랜드: Master FK (`category_id`, `brand_id`).

---

## 4. Store / Pharmacy Product Findings

### 4.1 공통 store product 구조 — 이미 존재

매장(약국/매장) 측 canonical 흐름은 `packages/store-products-ui` + `/api/v1/store/products`로 공통화돼 있다:
- 검색: `StoreProductSearchResult` (`id = masterId`, barcode/regulatoryName 등) → **ProductMaster 검색**.
- 진열: `StoreListingItem` → `OrganizationProductListing` (master 기반, `offerId` nullable = master-only listing).
- 매장 표시명/설명: `StoreProductProfile` (`(org_id, master_id)` UNIQUE).

`WO-O4O-KPA-STORE-MY-PRODUCTS-FLOW-SIMPLIFY-V1`로 **offer 없이 master만으로도 매장 진열** 가능하게 이미 단순화됨.

### 4.2 GlycoPharm (내 약국)

- 레거시 `GlycopharmProduct`(CGM 기기/검사지 등)는 `catalog_products`+`store_products`로 **마이그레이션 진행됨** (`20260409300000`).
- 내 약국 상품·거래·등록품목·상품 설명은 canonical store 흐름(store-products-ui)으로 수렴 가능.
- Store Hub·POP·QR·블로그·태블릿·사이니지의 상품 정보 연결: Store Production Material / `store-ai`(product-ai-content, product-pop-pdf) 계층이 master/listing을 소비. (별도 IR 영역 — 본 IR은 등록 흐름 중심)

### 4.3 KPA (약국/분회)

- KPA는 O4O 공통 구조의 reference implementation (CLAUDE.md §13). `OrganizationProductListing.service_key` 기본값 `'kpa'`, `ServiceProduct`도 KPA 라우트에 정의됨.
- store-products-ui가 KPA 내 약국 상품 화면을 구동.

### 4.4 K-Cosmetics (내 매장)

- 레거시 `CosmeticsProduct` (cosmetics schema 격리, `cosmetics_` prefix — CLAUDE.md §9) 잔존.
- 내 매장 상품/전자상거래는 cosmetics 독립 스키마 기반. canonical Master로의 통합 여부는 cosmetics 도메인 규칙과 함께 별도 판단 필요.

### 4.5 공통화 가능성 / 충돌

- **가능:** 세 서비스 모두 `ProductMaster` + `OrganizationProductListing` + `StoreProductProfile`를 공유할 수 있고, KPA/GlycoPharm은 이미 그 방향.
- **충돌/중복:** 레거시 `glycopharm-product`/`cosmetics-product`/`neture-product`가 canonical과 병존 → 단일화 시 마이그레이션·deprecation 필요. `StoreLocalProduct`(display-only)는 commerce와 무관한 별도 도메인이므로 **통합 대상 아님**(혼동 주의).

---

## 5. Mobile Registration Findings

### 5.1 모바일 코드 위치

- `services/mobile-app/` — Expo / React Native. **현재 Foundation skeleton (v0.1.0)**: `(auth)/login`, `(app)/index`, `src/api/client.ts`, `src/contexts/AuthContext.tsx`만 존재.
- `apps/mobile-app/` — Capacitor Android 래퍼 (`com.o4o.mobile`).
- `packages/cgm-pharmacist-app/` — CGM/당뇨 약사 앱 (상품 등록과 무관).

### 5.2 수집 데이터 구조 / 저장 / draft

- 홈 화면 메뉴(`상품 관리`, `카메라/업로드`)는 **전부 `disabled` "준비 중"** (`services/mobile-app/app/(app)/index.tsx`).
- 바코드 스캔/촬영, 상품명·이미지·가격 수집, 저장 entity — **전부 부재**.
- `mobile_product_drafts` 같은 draft 테이블 — **부재**.
- 웹 검토함으로의 연결 — **부재**.

### 5.3 결론

> **모바일 상품 등록 = ABSENT (skeleton only).** 가장 근접한 기존 구조는 공급자 **CSV/xlsx 일괄 import staging**(`catalog_import_rows`/`csv_import_rows`)으로, "원시 수집 → 매칭 → 확정" 패턴의 참고 모델이 된다. 모바일 draft 흐름은 이 import staging 패턴을 row-단위 수집으로 일반화하는 형태가 자연스럽다.

---

## 6. Identifier Findings

### 6.1 현황

| 항목 | 결과 | 근거 |
|---|---|---|
| barcode 저장 위치 | `product_masters.barcode` `varchar(14)` **단일 컬럼** | `ProductMaster.entity.ts:33` |
| UNIQUE 제약 | **있음** — `uq_product_masters_barcode UNIQUE(barcode)` | `20260301100000-ProductMasterCoreReset.ts:66` |
| 중복 barcode 허용 | **불가** (전역 UNIQUE) | 동일 |
| barcode 없음 처리 | 내부 바코드 자동 생성(GS1 prefix 200, EAN-13) + `barcode_source=INTERNAL` | `gtin.ts:71`, `AddBarcodeSourceToProductMasters` |
| barcode 검색 API | 있음 — supplier 등록/import 매칭(`bulk-match.service`), store-products 검색 | §2.4 |
| 기타 식별자 (drugCode/insuranceCode/atcCode) | **별도 엔티티에 산재** — `PharmaProductMaster.drugCode/insuranceCode/atcCode`, `sku/barcode` 별도 보유 | `PharmaProductMaster.entity.ts:62-86` |
| `sku` | 일부 레거시(neture-product `sku` unique, pharma `sku`) | §2.3 |
| **통합 `product_identifiers` 테이블** | **부재** | — |

### 6.2 Identifier Core 필요성 — **HIGH**

현 구조는 `products.barcode` **단일 UNIQUE 컬럼으로 고정**돼 있어 WO 설계 방향과 정면 충돌한다:
- **중복 바코드 수용 불가** — 동일 GTIN을 복수 Master가 가질 수 없음(전역 UNIQUE).
- **다중 식별자 수용 불가** — 표준코드/보험코드/내부코드/공급자코드/약국 로컬코드를 Master 단일 컬럼에 담을 수 없음. 현재는 의약품 코드만 `PharmaProductMaster`에 분산.
- **처방의약품 바코드 체계 차이 수용 곤란** — 길이/체계가 GTIN(8/12/13/14)과 다른 경우 `validateGtin`이 거부(`gtin.ts:38-42`).

> **판단:** `product_identifiers` 계층(예: `{product_master_id, identifier_type, value, source, is_primary}`) 도입이 **Rx·보험코드·중복바코드·다중코드 수용의 전제**다. 단, `ProductMaster.barcode`는 다수 소비처(매칭/검색/slug/UNIQUE)에 깊게 결합돼 있어 **빅뱅 제거 불가**. primary barcode는 Master에 mirror로 유지하고 identifiers는 가산(additive)하는 점진 전환이 안전.

### 6.3 처방의약품 식별자 확장 가능성

`PharmaProductMaster`에 drugCode(표준코드)/insuranceCode(보험코드)/atcCode가 이미 있으나 Core와 느슨한 연결(`coreProductMasterId` nullable). Identifier Core로 승격하면 일반/의약품 식별자를 단일 계층에서 일관 처리 가능.

---

## 7. Product Type / Extension Findings

### 7.1 현존 분류 체계

| 위치 | 분류 표현 |
|---|---|
| `ProductMaster.regulatoryType` | MFDS 기반 문자열 (DRUG / HEALTH_FUNCTIONAL / QUASI_DRUG / COSMETIC / GENERAL 등) — `CatalogProduct` 주석 |
| `PharmaProductMaster.category` (enum) | `OTC`(일반의약품) / `ETC`(전문의약품=처방) / `QUASI_DRUG`(의약외품) |
| 규제 게이트 | `assertPharmacyOnlyServiceKeys(isRegulated, ...)` — 규제 상품은 약국 전용 서비스 한정 |

### 7.2 WO 요구 분류별 수용도

| 분류 | 현존 수용 | extension 필요 |
|---|---|---|
| `non_drug` (비의약품) | ✅ Master + Offer (일반 상품 정보, B2B/B2C, 태블릿/온라인) | 추가 불필요 |
| `otc_drug` (비처방의약품) | ⚠️ Master + `PharmaProductMaster`(OTC) 부분 — **등록 UX 분기 미흡** | 의약품 등록 분기(성분/함량/제형/허가/효능출처/용법/주의/광고검토 상태) — pharma 엔티티에 필드 일부 존재, **검증 정책·UX 분기 부재** |
| `rx_drug` (처방의약품) | ❌ enum(ETC)만 존재 | **전용 등록 루트 + 고객 노출/판매 차단 + 보험코드/표준코드 identifier + barcode 체계 차이 수용** 전부 신규 |
| `quasi_drug` | ✅ enum 존재 (QUASI_DRUG) | 추가 불필요 |
| `health_functional_food` | ⚠️ regulatoryType 문자열로만 | 필요 시 profile |
| `cosmetics` | ⚠️ cosmetics 독립 스키마 별존 | 통합 판단 별도 |
| `device` | ⚠️ glycopharm CGM 기기(레거시) | profile |
| `other` | ✅ GENERAL | — |

### 7.3 등록 UX 분기 필요성

- 비의약품: 기존 일반 상품 등록(현존).
- 비처방의약품(OTC): **같은 Product Core를 쓰되 등록 UX·검증 정책이 의약품 전용 분기**를 타야 함 — 현재 검증 분기 미구현.
- 처방의약품(Rx): **별도 등록 루트** 필요. 단 최종 저장은 `ProductMaster + Identifier Core + Rx Extension` 지향. 고객 대상 판매/홍보 노출 차단, 온라인 판매 불가, 약국 내부 확인/업무 보조 중심.

---

## 8. Proposed Canonical Model

> 원칙: **신규 테이블 최소화. 현존 canonical(`ProductMaster` 중심)을 SSOT로 고정**하고, 부족분(Identifier / Candidate / Draft / Rx)만 가산한다.

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

| 개념 | 매핑 | 작업 |
|---|---|---|
| **Product Core** | `product_masters` | 유지 (SSOT 선언) |
| **Identifier Core** | `product_identifiers` | **신규** — Master 1:N 식별자, primary는 Master.barcode mirror |
| **Product Source Records** | `catalog_import_rows`/`csv_import_rows` | 유지 + (모바일) draft 추가 |
| **Product Candidates** | `product_candidates` | **신규** — 웹 검토 후보 큐 (기존상품 매칭 / 신규후보 / 활용전환) |
| **Supplier Product Profile** | `supplier_product_offers` | 유지 (경계 보존) |
| **Store/Pharmacy Product Profile** | `store_product_profiles` + `organization_product_listings` | 유지 |
| **Drug Extension** | `pharma_product_masters` | Core 연결 강화 (`coreProductMasterId` 필수화 검토) |
| **Rx Drug Extension** | `pharma_product_masters`(ETC) + 신규 노출/판매 차단 정책 | **신규** |
| **Mobile Product Draft** | `mobile_product_drafts` | **신규** |

---

## 9. Recommended Implementation Phases

| Phase | 내용 | 산출물 |
|---|---|---|
| **Phase 1 — Terminology / Baseline** | 현존 canonical(`ProductMaster` SSOT, Offer=공급자전용, Listing/Profile=매장) 고정 선언, legacy(`glycopharm/cosmetics/neture-product`) 분류. 서비스별 용어 매핑(내 약국/내 매장/공급자) 명문화 | `O4O-PRODUCT-CORE-BASELINE-V1` (문서) |
| **Phase 2 — Identifier Core** | `product_identifiers` 도입(additive). primary barcode mirror, 다중/중복/비-GTIN 코드 수용 설계. 소비처(매칭/검색/slug) 영향 매핑 | WO (migration + service) |
| **Phase 3 — Web 등록/검토 흐름** | `product_candidates` 검토 큐: 기존 Master 매칭 / 신규 후보 생성 / 매장 활용 전환. CSV import staging을 이 큐로 수렴 | WO |
| **Phase 4 — Mobile draft → Web 검토** | `mobile_product_drafts` (바코드/상품명/이미지/가격수준 수집, "검토 필요" 상태) → Phase 3 검토 큐 연결. 모바일은 "수집"만, 웹이 "확정" | WO |
| **Phase 5 — Non-drug / OTC extension** | OTC 등록 UX 분기 + 의약품 검증 정책(성분/효능·용법 출처/광고 검토 상태). pharma extension 강화 | WO |
| **Phase 6 — Rx 등록 루트** | 처방의약품 전용 등록 루트 + 고객 노출/온라인판매 차단 + 보험/표준코드 identifier + barcode 체계 차이 수용 | WO |

> **선후 의존:** Phase 2(Identifier Core)는 Phase 5/6의 전제. Phase 3은 Phase 4의 전제. Phase 1은 전체 착수 전 선행.

---

## 10. Risks

| # | Risk | 등급 | 비고 |
|---|---|---|---|
| 10-1 | **Neture 공급자 기능을 그대로 복사** | HIGH | Offer의 B2B/distribution/seller모집/공급조건/승인은 **공급자 전용**. 매장 활용 상품으로 복사 시 책임 경계 붕괴. Master만 참조하도록 유지 |
| 10-2 | **`products.barcode` 단일 UNIQUE 컬럼 고정** | HIGH | 현 구조가 이미 그 상태(`uq_product_masters_barcode`). Identifier Core 없이는 중복/다중/Rx 식별자 수용 불가. 단, 빅뱅 제거는 다수 소비처 파손 → additive 전환 필수 |
| 10-3 | **모바일 데이터를 바로 상품으로 확정** | HIGH | draft 부재 상태에서 모바일→Master 직결 시 미검증 데이터가 SSOT 오염. 반드시 candidate/draft 경유 |
| 10-4 | **비처방의약품을 일반 상품 등록 흐름으로 처리** | MED | 검증 정책/효능·용법 출처/광고 검토 없이 OTC 등록 시 약사법 리스크. UX 분기 필수 |
| 10-5 | **처방의약품 노출/판매 정책 혼선** | HIGH | Rx는 고객 노출/온라인판매 차단이 핵심. 현재 `assertPharmacyOnlyServiceKeys` 게이트만 존재 → Rx 전용 차단 정책 별도 필요 |
| 10-6 | **서비스별 용어 혼선** | LOW | 내 약국(GlycoPharm)/내 매장(K-Cosmetics)/약국·분회(KPA)/공급자·파트너(Neture) 사용자-facing 용어 보존. 구조는 공통, 용어는 서비스 정체성 |
| 10-7 | **legacy ↔ 신규 product core 마이그레이션** | MED | `glycopharm/cosmetics/neture-product` 잔존. cosmetics 독립 스키마(`cosmetics_` prefix, §9)와 통합 시 도메인 규칙 충돌 주의. `StoreLocalProduct`(display-only)는 통합 대상 아님(혼동 금지) |
| 10-8 | **CLAUDE.md §4 E-commerce / §7 Boundary 위반** | MED | 독립 주문 테이블 금지, OrderType 불변, Store Ops=`organizationId` boundary. Product 작업이 commerce 경계 침범 금지 |

---

## 11. Next WO Recommendation

조사 결과상 **즉시 구현 착수보다 Phase 1(Baseline 문서) + Phase 2(Identifier Core 설계 WO)를 먼저 권고**한다.

1. **`O4O-PRODUCT-CORE-BASELINE-V1`** (문서 WO) — 현존 canonical 모델을 SSOT로 선언, legacy 분류, 용어 매핑. *(코드 무변경)*
2. **`WO-O4O-PRODUCT-IDENTIFIER-CORE-V1`** — `product_identifiers` additive 도입 설계 (migration + service, primary barcode mirror, 소비처 영향 매핑). *Phase 5/6 전제.*

이후 Phase 3(웹 검토 큐) → Phase 4(모바일 draft) → Phase 5(OTC) → Phase 6(Rx) 순. 본 IR은 WO 문서 생성·코드 구현을 포함하지 않는다.

### 본 IR이 답해야 했던 6개 핵심 질문

| # | 질문 | 답 |
|---|---|---|
| 1 | 기존 Neture 공급자 상품 코드를 Product Core로 승격 가능한가? | **이미 승격돼 있음.** `ProductMaster`가 SSOT. 공급자 전용분(Offer)은 분리 유지. 추가 승격 불필요, 경계 보존이 과제 |
| 2 | 새 Product Core / Identifier Core가 필요한가? | Product Core 신규 불필요(현존). **Identifier Core는 신규 필요(HIGH)** |
| 3 | 모바일 등록은 현재 draft로 받을 수 있는가? | **불가.** 모바일은 skeleton, draft 부재. `mobile_product_drafts` 신규 필요 |
| 4 | 웹 확정 흐름을 어디에 먼저 만들 것인가? | `product_candidates` 검토 큐 — CSV import staging 패턴을 일반화 (Phase 3) |
| 5 | 비처방의약품은 어느 단계에서 분기? | Phase 5 — Product Core 공유 + 등록 UX/검증 분기. `PharmaProductMaster`(OTC) 강화 |
| 6 | 처방의약품은 당장 설계만 vs 별도 후속? | **별도 후속(Phase 6).** Identifier Core(Phase 2) 확정 후. 노출/판매 차단 정책 동반 |

---

## 12. Evidence

- Product Core SSOT: `apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts:27-113`
- barcode UNIQUE: `apps/api-server/src/database/migrations/20260301100000-ProductMasterCoreReset.ts:66,71`
- barcode_source: `apps/api-server/src/database/migrations/20260325400000-AddBarcodeSourceToProductMasters.ts`
- GTIN/내부바코드: `apps/api-server/src/utils/gtin.ts:28-87`
- Supplier 전용(Offer): `apps/api-server/src/modules/neture/entities/SupplierProductOffer.entity.ts:107-153`
- Offer 생성·규제게이트: `apps/api-server/src/modules/neture/services/offer.service.ts:729-804`
- Store 활용: `apps/api-server/src/modules/store-core/entities/{StoreProductProfile,organization-product-listing}.entity.ts`, `packages/store-products-ui/src/types.ts`
- 공용 카탈로그: `apps/api-server/src/modules/catalog/entities/catalog-product.entity.ts`, `apps/api-server/src/modules/store/entities/store-product.entity.ts`
- Drug Extension: `packages/pharmaceutical-core/src/entities/PharmaProductMaster.entity.ts:27-200`
- Service Product prep: `apps/api-server/src/routes/kpa/entities/service-product.entity.ts:1-30`
- Import staging: `apps/api-server/src/modules/catalog-import/entities/`, `apps/api-server/src/modules/neture/entities/SupplierCsvImportRow.entity.ts`
- 모바일 skeleton: `services/mobile-app/app/(app)/index.tsx` (`상품 관리`/`카메라/업로드` disabled "준비 중")
- Legacy 마이그레이션: `apps/api-server/src/database/migrations/20260409300000-MigrateGlycopharmProductsToCatalogAndStore.ts`
- Application 제거: `apps/api-server/src/routes/kpa/entities/organization-product-application.entity.ts` (빈 파일)

---

**작성:** O4O Platform Team · 2026-06-05
**상태:** Complete — Product Core는 현존(통합/마이그레이션 문제), Identifier Core·Mobile draft·Rx 루트가 실제 공백

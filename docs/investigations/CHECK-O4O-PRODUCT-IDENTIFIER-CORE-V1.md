# CHECK-O4O-PRODUCT-IDENTIFIER-CORE-V1

> Phase 2 — Identifier Core 도입(additive) 구현 검증 보고.
>
> WO: `WO-O4O-PRODUCT-IDENTIFIER-CORE-V1`
> Baseline: [`O4O-PRODUCT-CORE-BASELINE-V1`](../baseline/O4O-PRODUCT-CORE-BASELINE-V1.md) §5
> 선행 조사: [`IR-O4O-PRODUCT-CORE-AND-REGISTRATION-FLOW-AUDIT-V1`](IR-O4O-PRODUCT-CORE-AND-REGISTRATION-FLOW-AUDIT-V1.md)
> 작성일: 2026-06-06
> 상태: 구현 완료 (additive), API endpoint 미공개

---

## 1. Summary

`product_identifiers` 테이블과 `ProductIdentifier` 엔티티를 **additive** 방식으로 도입했다. ProductMaster 1:N ProductIdentifier 구조로, 다중 식별자 / 비-GTIN 식별자 / 의약품 코드 / 보험코드 / 공급자 코드 / 내부 코드 / 약국·매장 로컬 코드를 수용할 기반을 마련했다.

이번 WO는 **`product_masters.barcode` 를 제거하거나 그 UNIQUE 제약을 변경하지 않는다.** primary barcode 는 `ProductMaster.barcode` 에 mirror 로 유지되고, identifiers 는 가산된다. 기존 등록/검색/매칭 소비처는 전환하지 않았으며(no-regression), 영향 지점만 본 문서 §7에 기록했다. API endpoint 는 공개하지 않고 내부 service/util 수준으로만 시작했다.

검증: api-server TypeScript `tsc --noEmit` **0 errors** (migration 포함 전체 프로젝트).

---

## 2. Files Changed

| 파일 | 변경 | 성격 |
|---|---|---|
| `apps/api-server/src/modules/neture/entities/ProductIdentifier.entity.ts` | 신규 | Entity + type union/상수 |
| `apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts` | 수정 | `@OneToMany('ProductIdentifier','productMaster') identifiers?` 역관계 추가 (barcode 등 불변) |
| `apps/api-server/src/modules/neture/utils/product-identifier.util.ts` | 신규 | 정규화/추론 유틸 (gtin.ts 불간섭) |
| `apps/api-server/src/modules/neture/services/product-identifier.service.ts` | 신규 | 최소 내부 service |
| `apps/api-server/src/modules/neture/entities/index.ts` | 수정 | `ProductIdentifier` 등 export |
| `apps/api-server/src/database/connection.ts` | 수정 | import 블록 + entities 배열 등록 (2곳) |
| `apps/api-server/src/database/migrations/20260606000000-CreateProductIdentifiers.ts` | 신규 | 테이블+index+백필 |
| `docs/investigations/CHECK-O4O-PRODUCT-IDENTIFIER-CORE-V1.md` | 신규 | 본 문서 |

> ESM 규칙(CLAUDE.md §2) 준수: 관계는 `import type` + 문자열 기반(`@ManyToOne('ProductMaster','identifiers')`, `@OneToMany('ProductIdentifier','productMaster')`).

---

## 3. Migration Details

`CreateProductIdentifiers20260606000000` (`20260606000000-CreateProductIdentifiers.ts`)

- **테이블 생성:** `product_identifiers` (FK `product_master_id → product_masters(id) ON DELETE CASCADE`)
- **컬럼:** id, product_master_id, identifier_type, identifier_value, normalized_value, source_type, source_id, source_label, country, is_primary, verification_status, metadata(jsonb), created_at, updated_at, deleted_at
- **Index (6):**
  - `idx_product_identifiers_product_master_id`
  - `idx_product_identifiers_identifier_type`
  - `idx_product_identifiers_normalized_value`
  - `idx_product_identifiers_type_normalized`
  - `idx_product_identifiers_primary` (product_master_id, is_primary)
  - `uq_product_identifiers_master_type_normalized` — **partial unique** `(product_master_id, identifier_type, normalized_value) WHERE deleted_at IS NULL`
- **down:** `DROP TABLE IF EXISTS product_identifiers CASCADE` (index 동반 drop, product_masters 무변경)

> migration 위치는 `src/database/migrations` (glob 포함 디렉터리). pending 판정은 class 명 `CreateProductIdentifiers20260606000000` 기준.

---

## 4. Backfill Policy

기존 `product_masters.barcode` 를 primary 식별자로 1:1 백필 (INSERT … SELECT, **idempotent**).

- **대상:** `barcode IS NOT NULL AND btrim(barcode) <> '' AND` (숫자 정규화 결과가 비어있지 않음)
- **idempotent 가드:** 해당 master 에 활성 primary 식별자(`is_primary=TRUE AND deleted_at IS NULL`)가 이미 있으면 skip → 재실행 안전
- **identifier_type 추론** (util.`inferIdentifierTypeFromBarcode` 와 일치):
  - `barcode_source='INTERNAL'` → `INTERNAL_O4O`
  - 숫자 13자리 → `EAN13`
  - 그 외 → `GTIN`
- **normalized_value:** `regexp_replace(barcode, '\D', '', 'g')` (숫자만)
- **is_primary:** `TRUE`
- **verification_status:** `INTERNAL` → `system_generated`, 그 외 → `imported`
- **source_type:** `'product_master_backfill'`
- **metadata:** `{ originalBarcodeSource: <barcode_source> }`

> 기존 barcode 값은 **읽기만** 하며 변경/삭제하지 않는다.

---

## 5. Identifier Types

DB enum 이 아니라 **varchar + application-level union** (확장 시 enum migration 반복 회피).

- `identifier_type`: GTIN / EAN13 / UPC / JAN / INTERNAL_O4O / SUPPLIER_SKU / PHARMACY_LOCAL / STORE_LOCAL / KOREA_DRUG_CODE / KOREA_INSURANCE_CODE / ATC_CODE / MFDS_CODE / UNKNOWN
- `verification_status`: unverified / system_generated / imported / supplier_provided / pharmacy_provided / operator_verified / conflict / deprecated

상수 배열(`PRODUCT_IDENTIFIER_TYPES`, `PRODUCT_IDENTIFIER_VERIFICATION_STATUSES`)을 entity 에서 export.

---

## 6. ProductMaster.barcode Mirror Policy

- `ProductMaster.barcode`(varchar(14), `uq_product_masters_barcode` UNIQUE)는 **그대로 유지** = primary barcode mirror.
- primary 식별자(`is_primary=TRUE`)가 barcode 의 거울. 단, 본 WO 에서는 service 가 barcode 컬럼을 **자동 동기화하지 않는다** (`setPrimaryIdentifier` 는 identifiers 의 primary 플래그만 토글). barcode↔primary 양방향 동기화는 후속 WO 로 미룸(§9).
- 전역 UNIQUE 는 identifiers 에 두지 않음 → 중복 barcode/충돌 수용 가능. master 내 중복만 partial unique 로 방지.

---

## 7. Existing Consumer Impact

이번 WO 는 소비처를 전환하지 않았다. 영향 지점과 후속 전환 후보만 기록한다.

| 소비처 | 현재 동작 | 본 WO 영향 | 후속 전환 후보 |
|---|---|---|---|
| `offer.service.ts` `resolveProductMetadata` → `catalogService.resolveOrCreateMaster(barcode, …)` | barcode exact → master resolve/create | 무변경 | exact match 후 `product_identifiers` fallback 조회 |
| `bulk-match.service.ts` | name 기반 ILIKE 매칭 | 무변경 | identifier 기반 매칭 보강 |
| `csv-import.service.ts` / `xlsx-parser.service.ts` | barcode/이름 매칭 import | 무변경 | import 시 식별자 다건 적재 |
| `store-products` 검색 (`/api/v1/store/products`) | master 기반 검색 | 무변경 | identifier 검색 옵션 |
| operator product console | master/offer 조회 | 무변경 | — |
| `gtin.ts` (`validateGtin`/`generateInternalBarcode`) | GTIN 검증/내부바코드 | **무변경·불간섭** (util 별도 계층) | — |
| `PharmaProductMaster` drugCode/insuranceCode/atcCode | 별도 엔티티 보유 | 무변경 (§8) | identifier 승격 |

> 안전한 fallback 만 추가하도록 권고됐으나, 매칭 로직 무리한 변경을 피하기 위해 **이번 WO 에서는 소비처 전환을 하지 않고 service/util 만 준비**했다. 전환은 Phase 3(검토 큐)·후속 WO 에서 점진 적용.

---

## 8. PharmaProductMaster 연결 (조사/문서화만)

이번 WO 에서 `PharmaProductMaster` 의 코드를 `product_identifiers` 로 강제 이전하지 않았다. 후속 매핑 계획:

- `drugCode` → `KOREA_DRUG_CODE`
- `insuranceCode` → `KOREA_INSURANCE_CODE`
- `atcCode` → `ATC_CODE`
- `coreProductMasterId` 가 있는 경우 → `product_identifiers` 로 backfill 가능
- `coreProductMasterId` 가 null 인 경우 → Phase 5/6 에서 처리 (Core 연결 강화와 함께)

---

## 9. What Was Not Changed / Risks / Follow-ups

### What Was Not Changed (불변 보장)

- ✅ `product_masters.barcode` 컬럼 제거하지 않음
- ✅ `uq_product_masters_barcode` UNIQUE 제거하지 않음
- ✅ 기존 `product_masters.barcode` 값 변경하지 않음 (읽기만)
- ✅ 모바일 draft 구현하지 않음
- ✅ `product_candidates` 구현하지 않음
- ✅ OTC 등록 분기 구현하지 않음
- ✅ Rx 등록 루트 구현하지 않음
- ✅ `SupplierProductOffer` 경계 변경하지 않음
- ✅ `StoreProductProfile` / `OrganizationProductListing` 경계 변경하지 않음
- ✅ cosmetics/glycopharm/neture legacy product migration 포함하지 않음
- ✅ API endpoint 신규 공개하지 않음 (내부 service/util 수준)

### Risks / Follow-ups

| # | 항목 | 비고 |
|---|---|---|
| R1 | barcode ↔ primary identifier 양방향 동기화 미구현 | 현재 백필은 단방향(barcode→identifier). 등록 시 identifier 자동 생성·barcode 변경 시 mirror 갱신은 후속 WO |
| R2 | 소비처 미전환 | 매칭/검색은 여전히 barcode 컬럼 기반. identifier fallback 은 Phase 3·후속 |
| R3 | PharmaProductMaster 코드 미승격 | §8 — Phase 5/6 |
| R4 | conflict 상태 운영 정책 없음 | 중복 normalized_value(다른 master) 발생 시 `conflict` 표기/검토 플로우는 검토 큐(Phase 3)에서 |

---

## 10. Verification Results

| 항목 | 결과 |
|---|---|
| api-server `tsc --noEmit -p tsconfig.json` | ✅ 0 errors (migration·entity·service·util 포함 전체) |
| ESM 규칙 (import type + 문자열 관계) | ✅ 준수 |
| entity 등록 (index.ts + connection.ts import + 배열) | ✅ 3곳 등록 |
| migration 위치 (src/database/migrations) | ✅ |
| migration 클래스명 유일성 | ✅ `CreateProductIdentifiers20260606000000` (기존과 충돌 없음) |
| `product_masters.barcode` 값/UNIQUE 무변경 | ✅ (migration 은 읽기만) |
| 백필 idempotency (NOT EXISTS primary 가드) | ✅ SQL 검토 |
| 전역 UNIQUE 미설정 / master 내 partial unique | ✅ |

> 본 검증은 정적(컴파일 + SQL 검토) 기준. 실제 DB 적용(테이블 생성/백필 결과)은 main 배포 후 CI/CD 마이그레이션(`o4o-api-migrations` job) 또는 `migration:show` 로 확인한다.

---

**작성:** O4O Platform Team · 2026-06-06
**상태:** Phase 2 완료 (additive). 다음: Phase 3 — `product_candidates` 웹 검토 큐.

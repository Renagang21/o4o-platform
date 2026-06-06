# CHECK-O4O-PRODUCT-DRUG-CATEGORY-ACTIVE-MODEL-F1-V1

> active ProductMaster 계층에 `drug_category` 를 추가해 OTC/Rx/QUASI/UNSPECIFIED 를 런타임 판정 가능하게 함 (F1).
>
> WO: `WO-O4O-PRODUCT-DRUG-CATEGORY-ACTIVE-MODEL-F1-V1`
> Baseline: [`O4O-PRODUCT-CORE-BASELINE-V1`](../baseline/O4O-PRODUCT-CORE-BASELINE-V1.md) §9
> 선행: [`CHECK-O4O-PRODUCT-TYPE-OTC-EXTENSION-REGISTRATION-POLICY-V1`](CHECK-O4O-PRODUCT-TYPE-OTC-EXTENSION-REGISTRATION-POLICY-V1.md) (OTC foundation, F1 도출)
> 작성일: 2026-06-06
> 상태: 구현·정적검증 완료. UI/판매/노출 미구현, Rx 루트 제외.

---

## 1. Summary

OTC foundation 에서 확인된 갭(활성 `regulatoryType` 은 'DRUG'까지만 구분 → OTC/Rx 미구분)을 해소하기 위해, **active `ProductMaster` 에 `drug_category`(varchar nullable)** 를 additive 로 추가했다. `classifyProductType` 이 이 active 값을 우선 사용하도록 wiring했다.

- **B안 채택**: dormant `PharmaProductMaster` 를 wiring하지 않고 active Core 에 최소 컬럼 추가.
- regulatoryType='DRUG' + drug_category 미설정 → **drug_unspecified** (보수). OTC/Rx 임의 추정 백필 없음.
- 검증: api-server `tsc --noEmit` **0 errors** (migration 포함).

---

## 2. Decision: Active drug_category vs PharmaProductMaster wiring

| 후보 | 판단 |
|---|---|
| A) PharmaProductMaster wiring | ❌ 보류 — dormant(미등록/migration 없음/미사용) + ESM 위반 파일 → 구조 정비 부담 큼 |
| **B) active ProductMaster.drug_category** | ✅ **채택** — 당장 목적(OTC/Rx 런타임 판정)에 최소·안전 |

PharmaProductMaster dormant cleanup/wiring 은 별도 후속 WO로 분리(F-list).

---

## 3. Files Changed

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts` | `drugCategory: ProductDrugCategory \| null` 컬럼 추가 (mutable, immutable 목록 미포함) |
| `apps/api-server/src/database/migrations/20260606030000-AddDrugCategoryToProductMasters.ts` | drug_category 컬럼 + index + 보수 백필 |
| `apps/api-server/src/modules/neture/utils/product-type.util.ts` | `ProductDrugCategory` union/상수 + `classifyProductType` 매핑 확장 (drug_unspecified/non_drug) |
| `apps/api-server/src/modules/neture/services/catalog.service.ts` | `resolveOrCreateMaster`(manual) + `updateProductMaster` 에 drugCategory 수용(정규화) |
| `docs/investigations/CHECK-O4O-PRODUCT-DRUG-CATEGORY-ACTIVE-MODEL-F1-V1.md` | 본 문서 |

> ProductMaster.entity 가 `import type { ProductDrugCategory }` 를 utils 에서 가져온다(type-only, 런타임 cycle 없음).

---

## 4. Migration Details

`AddDrugCategoryToProductMasters20260606030000`

- `ALTER TABLE product_masters ADD COLUMN IF NOT EXISTS drug_category VARCHAR(32)` (nullable, DB enum 아님)
- `CREATE INDEX IF NOT EXISTS idx_product_masters_drug_category`
- down: index drop + column drop
- regulatory_type / barcode 등 기존 컬럼 무변경

---

## 5. Backfill Policy

보수적 — OTC/Rx 임의 추정 금지:

| 조건 (drug_category IS NULL) | 설정값 |
|---|---|
| regulatory_type ∈ {DRUG, 의약품} | `drug_unspecified` |
| regulatory_type ∈ {QUASI_DRUG, 의약외품} | `quasi_drug` |
| 그 외 (비의약품) | NULL 유지 (기존 데이터 변경 최소화) |
| 이미 drug_category 존재 | 건드리지 않음 |

> DRUG 를 전부 OTC/Rx 로 만들지 않음 — 미확정은 drug_unspecified.

---

## 6. ProductMaster Entity Change

- `drugCategory: ProductDrugCategory | null` (`name: 'drug_category'`, varchar(32), nullable).
- **mutable**: immutable 목록(`MASTER_IMMUTABLE_FIELDS`)에 넣지 않음 — 검토 중 `drug_unspecified → otc` refine 가능.
- regulatoryType 은 **불변 유지** (제거/변경 없음).

---

## 7. classifyProductType Wiring

`classifyProductType` 우선순위 (기존 helper 보강):
1. 명시 `drugCategory`: otc→otc_drug, rx→rx_drug, quasi_drug→quasi_drug, **drug_unspecified→drug_unspecified, non_drug→non_drug** (신규 매핑)
2. candidate rawPayload(drug_category/product_type)
3. regulatoryType: DRUG→drug_unspecified, QUASI_DRUG→quasi_drug, HEALTH_FUNCTIONAL→health_functional, COSMETIC/GENERAL→non_drug
4. unknown

> 호출처는 `classifyProductType({ regulatoryType: m.regulatoryType, drugCategory: m.drugCategory, rawPayload })` 형태로 active 값을 전달. drug_unspecified 보수 정책(고객노출/온라인판매 blocked, 약국전용)은 그대로 유지.

---

## 8. Offer Flow Impact

- `resolveOrCreateMaster` manualData 에 `drugCategory?` optional 추가. manual 생성 시 허용값이면 저장, 없으면 null(기존 동작).
- offer.service `resolveProductMetadata` 의 manualData 는 **passthrough** 이므로, rawManualData 에 drugCategory 가 있으면 자동 전달 → 별도 offer.service 수정 불필요.
- 공급자 UI/필드 추가 없음. regulatoryType='DRUG' + drugCategory 미제공 → 생성 시 null, 백필/판정에서 drug_unspecified 로 보수 처리.

---

## 9. ProductCandidate Impact

- candidate table/migration **변경 없음**. `classifyProductType` 가 candidate `rawPayload.drug_category/product_type` 를 이미 인식(OTC foundation 에서 준비됨) → 추가 보강 불필요.
- Operator 후보 상세 OTC/Rx 표시·필터는 **F3** 후속.

---

## 10. What Was Not Changed

- ✅ PharmaProductMaster api-server wiring 없음 (dormant 유지)
- ✅ ProductMaster.regulatoryType 제거/변경 없음
- ✅ product_masters.barcode 변경 없음
- ✅ ProductIdentifier 구조 변경 없음
- ✅ ProductCandidate table 구조 변경 없음
- ✅ MobileProductDraft 변경 없음
- ✅ SupplierProductOffer B2B/B2C 경계 변경 없음
- ✅ StoreProductProfile / OrganizationProductListing 변경 없음
- ✅ OTC 등록 UI / Rx 등록 루트 없음
- ✅ 온라인 판매 허용 / 고객 공개 노출 허용 없음
- ✅ 광고 승인 기능 없음

---

## 11. Verification Results

| 항목 | 결과 |
|---|---|
| api-server `tsc --noEmit -p tsconfig.json` (migration·entity·util·service 포함) | ✅ 0 errors |
| migration 위치/클래스명 유일성 | ✅ `AddDrugCategoryToProductMasters20260606030000` |
| 기존 supplier offer create / candidate / listing flow compile | ✅ no-regression |
| classify 판정 (정적 검토) | ✅ DRUG+null→drug_unspecified, DRUG+otc→otc_drug, DRUG+rx→rx_drug, QUASI→quasi_drug, GENERAL→non_drug |

> 정적(컴파일 + SQL/코드 경로) 기준. 실제 컬럼 추가·백필 결과는 main 배포 후 CI/CD 마이그레이션(`o4o-api-migrations` job) 또는 `migration:show` 로 확인.

---

## 12. Follow-ups

| # | 항목 |
|---|---|
| F3 | `classifyProductType` wiring 을 offer 응답 + candidate 상세/필터 + operator UI 에 노출 (자동 확정 없이) |
| F-ext | Drug Extension 영속 (검증상태/노출·광고·판매 정책/출처 필드 + migration) |
| F-pharma | PharmaProductMaster dormant cleanup 또는 정식 wiring (ESM 규칙 정정 동반) |
| F-rx | Rx 별도 루트 `WO-O4O-RX-DRUG-REGISTRATION-ROUTE-AND-POLICY-V1` |

---

**작성:** O4O Platform Team · 2026-06-06
**상태:** F1 완료 — active drug_category 런타임 판정 가능. 다음: F3 (classify wiring 노출).

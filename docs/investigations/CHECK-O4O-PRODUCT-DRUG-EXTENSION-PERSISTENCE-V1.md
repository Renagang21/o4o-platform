# CHECK-O4O-PRODUCT-DRUG-EXTENSION-PERSISTENCE-V1

> active ProductMaster 1:1 Drug Extension 영속 계층 — 의약품 상세·검증·출처·노출/광고/판매 정책 저장.
>
> WO: `WO-O4O-PRODUCT-DRUG-EXTENSION-PERSISTENCE-V1`
> Baseline: [`O4O-PRODUCT-CORE-BASELINE-V1`](../baseline/O4O-PRODUCT-CORE-BASELINE-V1.md) §9, §10
> 선행: F1(drug_category), F3(classification), F4(refine UX)
> 작성일: 2026-06-06
> 상태: persistence foundation 완료. OTC/Rx 등록 UX·판매·노출 없음.

---

## 1. Summary

active api-server 에 `product_drug_extensions`(ProductMaster 1:1) 를 추가해 의약품 상세/검증/출처/정책을 저장하는 기반을 마련했다. F4 drug_category refine 시 extension 을 보장(생성/동기화)하고, F3 classification 응답에 extension 요약을 additive 로 부착했다.

- dormant `PharmaProductMaster` 를 살리지 않고 **active 신규 entity** 채택(F1 결정 유지).
- 정책은 **보수 기본값**(약국전용·고객노출/온라인판매 차단·Rx 광고 blocked)으로 저장. 권한 여는 로직 아님.
- 검증: api-server `tsc` 0 errors, web-neture `tsc` 0 errors.

---

## 2. Decision: Active ProductDrugExtension vs dormant PharmaProductMaster

| 후보 | 판단 |
|---|---|
| dormant PharmaProductMaster wiring | ❌ 보류 (미등록/migration 없음/ESM 위반 — F1 과 동일 사유) |
| **active ProductDrugExtension (1:1)** | ✅ 채택 — ProductMaster SSOT 위 extension, 즉시 사용 가능 |

drug_category 는 ProductMaster(빠른 분류) + extension(mirror) 양쪽 — service 동기화. PharmaProductMaster cleanup 은 후속.

---

## 3. Files Changed

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/modules/neture/entities/ProductDrugExtension.entity.ts` | 신규 entity(1:1) + 타입(Advertising/Tablet/PublicDisplay) |
| `apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts` | `@OneToOne('ProductDrugExtension','productMaster') drugExtension?` (additive) |
| `apps/api-server/src/modules/neture/entities/index.ts` | export |
| `apps/api-server/src/database/connection.ts` | import + entities 배열 등록 (2곳) |
| `apps/api-server/src/database/migrations/20260606040000-CreateProductDrugExtensions.ts` | 테이블+index 8+보수 백필 |
| `apps/api-server/src/modules/neture/services/product-drug-extension.service.ts` | 신규 service |
| `apps/api-server/src/modules/neture/services/product-candidate.service.ts` | F4 refine → ensure 연결 + classification drugExtension 요약 |
| `services/web-neture/src/lib/api/operatorProductCandidates.ts` | `CandidateDrugExtensionSummary` + classification 필드 |
| `services/web-neture/src/pages/operator/ProductCandidateReviewPage.tsx` | 상세 모달 의약품 상세 요약 배지 |
| `docs/investigations/CHECK-O4O-PRODUCT-DRUG-EXTENSION-PERSISTENCE-V1.md` | 본 문서 |

> ESM 규칙: OneToOne 문자열 기반(`@OneToOne('ProductDrugExtension','productMaster')` / extension owning `@OneToOne('ProductMaster')` + JoinColumn). PharmaProductMaster wiring 없음.

---

## 4. Migration Details

`CreateProductDrugExtensions20260606040000`
- `product_drug_extensions` (ProductMaster 1:1, `product_master_id` UNIQUE + FK ON DELETE CASCADE)
- 컬럼: 검증(verification_status/reviewer_type/reviewed_by/at/review_note) · 식별허가(drug/insurance/mfds/atc_code, approval_number/date, regulatory_status) · 기본정보(ingredient_summary/active_ingredients(jsonb)/dosage_form/strength/package_*/manufacturer) · 문구(efficacy/dosage/caution/storage/contraindication_text) · 출처(data_source/mfds_source_url/source_updated_at/*_source) · 정책(pharmacy_only/customer_display_allowed/tablet_display_allowed/online_sale_allowed/advertising_review_status/public_display_policy) · timestamps + deleted_at
- index 8개 (§WO 명세)
- down: DROP TABLE

---

## 5. Backfill Policy

- 대상: `product_masters.drug_category ∈ {otc, rx, quasi_drug, drug_unspecified}` (비의약품/null 제외), 이미 extension 있으면 skip(idempotent).
- 기본값: verification_status=`pending_review`, pharmacy_only=`true`, customer_display_allowed=`false`, tablet_display_allowed=`limited`, online_sale_allowed=`false`, public_display_policy=`blocked`, advertising_review_status=`rx → blocked / 그 외 needs_review`.
- **online_sale/customer_display 를 true 로 백필하지 않음.** OTC 라도 판매 가능으로 만들지 않음. Rx 는 광고 blocked.

---

## 6. ProductDrugExtension Model

varchar + application-level union (DB enum 아님): drug_category(ProductDrugCategory), verification_status(DrugVerificationStatus), reviewer_type(DrugReviewer), advertising_review_status(AdvertisingReviewStatus), tablet_display_allowed(TabletDisplayPolicy), public_display_policy(PublicDisplayPolicy). 정책 boolean: pharmacy_only/customer_display_allowed/online_sale_allowed.

---

## 7. Default Policy

`getDefaultExtensionPolicy(drugCategory)`: pharmacyOnly true / customerDisplayAllowed false / tabletDisplayAllowed 'limited' / onlineSaleAllowed false / publicDisplayPolicy 'blocked' / advertisingReviewStatus (rx → 'blocked', else 'needs_review'). 검토 전 차단 상태.

---

## 8. Service Behavior

`ProductDrugExtensionService`:
- `getByProductMasterId`, `getDefaultExtensionPolicy`
- `ensureForProductMaster(id)`: 의약품 분류면 없을 때 보수 기본값 생성, 있으면 drug_category mirror 동기화. 비의약품/null → null(미생성).
- `syncDrugCategoryFromProductMaster(master)`: extension 있을 때 drug_category 동기화.
- `updateDrugExtension(id, input)`: 상세/출처/광고검토 필드 갱신. **노출/판매 enable(customerDisplayAllowed/onlineSaleAllowed/publicDisplayPolicy/pharmacyOnly) 은 변경하지 않음**(guard — 후속 정책 WO).
- `updateReviewStatus(id, input)`: 검증 상태 갱신.

> rawPayload/공급자 문구를 자동 저장하지 않음 — 전달값만 저장(검증 책임은 호출처/검토).

---

## 9. F4 Refine Integration

`refineCandidateDrugCategory` 에서 `master.drugCategory` 저장 직후 `ensureForProductMaster(master.id)` 호출(best-effort) → 의약품 분류면 extension 생성/동기화. classification 재계산 시 extension 요약 포함.

---

## 10. API / UI Scope

- **신규 standalone operator API 미추가** (WO 허용안: "기존 product candidate endpoint 통해서만 노출"). drug extension 요약은 candidate list/detail 의 `classification.drugExtension` 으로 노출. 별도 GET/PATCH 컨트롤러는 F5(공급자 OTC 등록) 와 함께 도입.
- UI: 후보 상세 모달에 의약품 상세 요약 배지(검증/광고/공개 정책) + "상세 검토는 후속 화면" 안내. 대형 편집 UI 없음.

---

## 11. What Was Not Changed

- ✅ dormant PharmaProductMaster wiring 없음
- ✅ ProductMaster SSOT/regulatoryType/barcode/drug_category 구조 변경 없음 (OneToOne 관계 additive)
- ✅ ProductIdentifier / ProductCandidate table / MobileProductDraft / SupplierProductOffer / StoreProductProfile / OrganizationProductListing 변경 없음
- ✅ OTC 등록 UX 없음 / Rx 등록 루트 없음
- ✅ 온라인 판매 허용 없음 / 고객 공개 노출 허용 없음 / 광고 승인 UI 없음
- ✅ 의약품 상세 편집 대형 UI 없음
- ✅ rawPayload 문구 자동 공식 저장 없음

---

## 12. Verification Results

| 항목 | 결과 |
|---|---|
| api-server `tsc --noEmit` (entity·service·migration·candidate 통합) | ✅ 0 errors |
| web-neture `tsc --noEmit` | ✅ 0 errors |
| migration 위치/클래스명 유일성 | ✅ `CreateProductDrugExtensions20260606040000` |
| F4 refine / F3 classification / link / 기존 candidate API no-regression | ✅ (additive) |
| 기본 정책 보수성 (online/customer false, rx 광고 blocked) | ✅ migration + service 검토 |
| N+1 회피 (extension batch 로드) | ✅ |

> 정적 기준. 실제 테이블/백필·ensure 동작은 배포 후 CI 마이그레이션 + 의약품 데이터 시드 후 확인(현 prod neture 의약품 0 = pre-service).

---

## 13. Follow-ups

| # | 항목 |
|---|---|
| F5 | 공급자 OTC 등록 분기 — 입력 OTC 정보를 ProductDrugExtension 에 저장(검증 경유) |
| F-ext-api | operator drug-extension GET/PATCH 전용 API (상세 편집), 노출/판매 enable 정책 override |
| F-pharma | PharmaProductMaster dormant cleanup |
| F6 | Rx 별도 루트 |

---

**작성:** O4O Platform Team · 2026-06-06
**상태:** Drug Extension persistence foundation 완료. 다음: 공급자 OTC 등록 분기(F5).

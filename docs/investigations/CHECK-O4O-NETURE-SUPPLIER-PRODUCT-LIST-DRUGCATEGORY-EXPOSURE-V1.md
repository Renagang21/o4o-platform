# CHECK-O4O-NETURE-SUPPLIER-PRODUCT-LIST-DRUGCATEGORY-EXPOSURE-V1

> Product Core 의 `drug_category` 를 공급자 제품 목록 응답·타입·표시·게이트까지 additive 노출 (기반 보강).
>
> WO: `WO-O4O-NETURE-SUPPLIER-PRODUCT-LIST-DRUGCATEGORY-EXPOSURE-V1`
> 선행: F1(drug_category 도입) / OFFER-MODE-SELECTION-V1 / WORKSPACE-PREFILL-V1
> 작성일: 2026-06-07
> 상태: 구현·정적검증 완료.

---

## 1. Summary

공급자 제품 목록(paginated) 응답에 ProductMaster 의 `drug_category` 를 **additive** 로 노출하고, 프론트 타입·표시 라벨·후속 액션 게이트가 이를 수용하도록 보강했다. 후속 액션 정책은 **기존 보수 정책 유지**(DRUG=검토 중심).

- DB migration / ProductMaster 구조 변경 없음 — 이미 존재하는 컬럼을 SELECT 에 추가.
- N+1 없음 — 기존 `product_masters(pm)` join 의 SELECT 에 컬럼만 추가.
- `drugCategory` 없는 데이터도 기존처럼 동작(안전 fallback).
- 검증: api-server `tsc` 0 errors / web-neture `tsc` — §6.

---

## 2. Files Changed

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/modules/neture/services/offer.service.ts` | paginated 목록 SELECT 2곳에 `pm.drug_category AS "drugCategory"` 추가 |
| `services/web-neture/src/lib/api/supplier.ts` | `SupplierProduct.drugCategory?: string \| null` (additive) |
| `services/web-neture/src/lib/supplierProductTypes.ts` | `getSupplierProductTypeLabel(regulatoryType, drugCategory)` + `getAllowedOfferActions` object 시그니처(drugCategory 수용, 정책 동일) |
| `services/web-neture/src/pages/supplier/SupplierProductsPage.tsx` | 규제 컬럼 라벨을 drugCategory 조합으로 표시(DRUG=amber) + 게이트 호출 object 화 |
| `docs/investigations/CHECK-O4O-NETURE-SUPPLIER-PRODUCT-LIST-DRUGCATEGORY-EXPOSURE-V1.md` | 본 문서 |

> 비페이지네이션 `getSupplierProducts` 는 다른 응답 shape + 프론트 목록은 paginated 사용 → 범위 외.

---

## 3. Backend (additive)

`offer.service.ts` 의 `getSupplierProductsPaginated` 계열 두 SELECT(데이터/카운트 변형)에서 이미 `pm.regulatory_type` 을 select 중 → 바로 뒤에 `pm.drug_category AS "drugCategory"` 추가. product_masters 는 이미 join 상태라 추가 쿼리/조인 없음.

---

## 4. 표시 라벨 매핑 (getSupplierProductTypeLabel)

| regulatoryType | drugCategory | 라벨 |
|---|---|---|
| DRUG | otc | 비처방 의약품 |
| DRUG | rx | 처방의약품 |
| DRUG | drug_unspecified / null | 의약품 분류 필요 |
| QUASI_DRUG | (any) | 의약외품 |
| GENERAL / '' | — | 비의약품 |
| 기타(COSMETIC/HEALTH_FUNCTIONAL/MEDICAL_DEVICE) | — | null → 기존 `REGULATORY_TYPE_LABELS` fallback |

- DRUG 계열은 amber 배지로 시각 구분, 그 외 violet 유지.
- 값 없으면 기존처럼 `-`.

---

## 5. 후속 액션 게이트 (보수 유지)

`getAllowedOfferActions({ regulatoryType, drugCategory })`:
- `regulatoryType === 'DRUG'` (otc/rx/drug_unspecified/null 무관) → **restricted**(후속 공급활동 없음).
- 그 외(비의약품/의약외품/기타) → 전체 액션(공급/이벤트/펀딩 + 판매자 모집 준비중).
- drugCategory 는 시그니처로 수용하되 **본 V1 에서 gate 완화 없음**(otc 약국 공급 허용 등은 후속 별도 WO). 문자열 단독 인자 하위호환 유지.

---

## 6. Verification Results

| 항목 | 결과 |
|---|---|
| api-server `tsc --noEmit` | ✅ 0 errors |
| web-neture `tsc --noEmit` (background) | ✅ 0 errors |
| drugCategory 없는 데이터 안전 표시 | ✅ (helper fallback / `-`) |
| DRUG 후속 액션 차단 유지 | ✅ |
| 비의약품/의약외품 후속 액션 유지 | ✅ |
| N+1 / 신규 join | ✅ 없음 (기존 pm SELECT 에 컬럼 추가) |

---

## 7. What Was Not Changed

- ✅ DB migration / ProductMaster 구조 변경 없음
- ✅ 제품 등록/저장 로직 변경 없음
- ✅ OTC/Rx 후속 액션 활성화 없음 (보수 정책 유지)
- ✅ 이벤트/펀딩 바인딩 V2 없음
- ✅ Drug Extension 상세 입력 / bulk 파서 / 배송 grouping / 주문·정산 변경 없음
- ✅ 판매자 모집 구현 없음

---

## 8. Follow-ups

| WO | 범위 |
|---|---|
| WO-O4O-NETURE-SUPPLIER-OTC-PHARMACY-SUPPLY-GATE-V1 | OTC 약국 대상 일반 공급 후보 허용 여부 |
| WO-O4O-NETURE-SUPPLIER-EVENT-FUNDING-WORKSPACE-BINDING-V2 | 이벤트/펀딩 상품 실제 바인딩 |
| WO-O4O-NETURE-SUPPLIER-BULK-UPLOAD-TEMPLATE-V1 / SHIPPING-SETTING-FOUNDATION-V1 | 후속 |

---

**작성:** O4O Platform Team · 2026-06-07
**상태:** drugCategory 목록 노출 기반 보강 완료. 제품 유형 판단 기준 정교화 — 후속 정책 분기의 토대.

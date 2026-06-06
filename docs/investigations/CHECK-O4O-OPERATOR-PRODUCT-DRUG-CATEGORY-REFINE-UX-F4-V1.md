# CHECK-O4O-OPERATOR-PRODUCT-DRUG-CATEGORY-REFINE-UX-F4-V1

> 운영자가 matched ProductMaster 의 drug_category 를 검토·수정(refine)하는 액션 (F4).
>
> WO: `WO-O4O-OPERATOR-PRODUCT-DRUG-CATEGORY-REFINE-UX-F4-V1`
> Baseline: [`O4O-PRODUCT-CORE-BASELINE-V1`](../baseline/O4O-PRODUCT-CORE-BASELINE-V1.md) §9
> 선행: F1 (active drug_category), F3 (classification wiring)
> 작성일: 2026-06-06
> 상태: 구현·정적검증 완료. 판매/노출/광고 권한 변경 없음, Rx 루트·OTC 등록 UX 없음.

---

## 1. Summary

운영자가 후보 상세에서 **matched ProductMaster 의 drug_category** 를 OTC/Rx/의약외품/의약품 미분류로 확정·수정할 수 있게 했다. F1 에서 도입된 `ProductMaster.drug_category`(mutable) 를 재사용한다.

- **migration 없음 / DB 구조 변경 없음.** 기존 컬럼 값만 갱신.
- regulatoryType **충돌 가드**: 의약품(DRUG)만 otc/rx/drug_unspecified, 의약외품(QUASI)도 quasi_drug 허용. regulatoryType 자체는 변경하지 않음.
- 분류 변경 후 **classification 재계산**하여 반환. Rx 선택 시 경고.
- 분류/검토 정보 변경일 뿐 **판매/노출/광고 권한 변경 아님** (UI 명시).

검증: api-server `tsc` 0 errors, web-neture `tsc` 0 errors.

---

## 2. Files Changed

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/modules/neture/services/product-candidate.service.ts` | `refineCandidateDrugCategory()` (가드 + master.drugCategory 갱신 + classification 재계산) |
| `apps/api-server/src/modules/neture/controllers/product-candidate.controller.ts` | `POST /:id/refine-drug-category` + 에러 매핑(INVALID 400 / CONFLICT·NOT_REFINABLE 409) |
| `services/web-neture/src/lib/api/operatorProductCandidates.ts` | `refineDrugCategory()` + payload/result 타입 |
| `services/web-neture/src/pages/operator/ProductCandidateReviewPage.tsx` | 상세 모달 분류 수정 select + Rx 경고 + 메시지 |
| `docs/investigations/CHECK-O4O-OPERATOR-PRODUCT-DRUG-CATEGORY-REFINE-UX-F4-V1.md` | 본 문서 |

> DB/migration/엔티티 무변경. catalog.service 재사용 대신 service 내 masterRepo 로 직접 갱신(자체 가드 포함) — 최소 의존.

---

## 3. Backend Action

`POST /api/v1/operator/product-candidates/:id/refine-drug-category` (operator/admin guard)

- body: `drugCategory: 'otc'|'rx'|'quasi_drug'|'drug_unspecified'|null`, `note?`
- 흐름: candidate 조회 → rejected/archived 차단(`CANDIDATE_NOT_REFINABLE`) → matchedProductMasterId 필수(`CANDIDATE_NOT_MATCHED`) → 값 validate(`INVALID_DRUG_CATEGORY`) → master 조회(`PRODUCT_MASTER_NOT_FOUND`) → regulatoryType 가드 → `master.drugCategory` 갱신·save → candidate.review_note refine 마커 + reviewedBy/At → classification 재계산
- response: `{ candidate(+classification), classification, productMaster{id,name,regulatoryType,drugCategory} }`

---

## 4. DrugCategory Validation Policy

| 요청 drugCategory | 허용 조건 (regulatoryType) |
|---|---|
| otc / rx / drug_unspecified | DRUG(또는 '의약품')만 — 아니면 409 `DRUG_CATEGORY_REGULATORY_CONFLICT` |
| quasi_drug | DRUG 또는 QUASI_DRUG('의약외품') |
| null | 항상 허용 (분류 초기화) |
| non_drug | **미허용** (이 endpoint 는 받지 않음 — 비의약품은 null + regulatoryType 판정, F1 정책 유지) |

- 영문 코드 + 한글 별칭 모두 수용.
- **regulatoryType 변경 아님** — DRUG↔GENERAL 같은 규제유형 변경은 별도 후속(ProductMaster regulatory refinement) WO.
- GENERAL/COSMETIC/HEALTH_FUNCTIONAL 에 otc/rx 지정은 차단(409).

---

## 5. Classification Recalculation

refine 후 `withClassification([candidate])` 재호출 → master 의 갱신된 drug_category 로 productTypeClass/displayPolicy 재계산하여 응답. 프론트는 응답 classification 으로 배지/정책 즉시 갱신.

---

## 6. Operator UI Changes

상세 모달에 "의약품 분류 수정 (검토)" 영역:
- matchedProductMasterId 없으면 안내("기존 상품에 먼저 매칭…") — 비활성
- select: 미지정 / 의약품 미분류 / 비처방의약품 / 처방의약품 / 의약외품 + note + "분류 저장"
- 저장 성공 → 상세/목록 새로고침(classification 반영)
- 충돌 시 메시지("규제 유형과 충돌 — 의약품만 OTC/Rx 지정 가능")
- 안내문: "이 분류 변경은 노출·판매 권한을 열지 않습니다."

---

## 7. Rx Warning / Display Policy

- select=`rx` 시 경고 박스: "처방의약품으로 분류하면 고객 공개 노출·온라인 판매·광고 노출은 기본 차단 상태로 유지됩니다. 이번 변경은 분류 표시·검토 정책에만 반영됩니다."
- backend 응답 classification.displayPolicy 가 rx → pharmacyOnly/노출·판매 차단/광고 blocked 로 재계산되어 상세 정책 배지에 반영.

---

## 8. Permission / Boundary

- operator/admin guard + service scope (기존 컨트롤러 상속).
- matchedProductMasterId 있는 candidate 만 refine. ProductMaster regulatoryType/barcode 불변.
- review_note 에 refine 기록(`[drug-category-refine] prev → next by operator | note`). 별도 audit table 없음(후속).

---

## 9. What Was Not Changed

- ✅ migration 없음 / ProductMaster 구조 변경 없음
- ✅ ProductMaster.regulatoryType 변경 없음 / barcode 변경 없음
- ✅ ProductIdentifier 변경 없음
- ✅ ProductCandidate table 변경 없음 (review_note 값 갱신만)
- ✅ MobileProductDraft 변경 없음
- ✅ SupplierProductOffer 변경 없음
- ✅ StoreProductProfile / OrganizationProductListing 변경 없음
- ✅ OTC 등록 UI 없음 / Rx 등록 루트 없음
- ✅ 온라인 판매 허용 없음 / 고객 공개 노출 허용 없음 / 광고 승인 기능 없음
- ✅ audit table 없음
- ✅ ProductMaster 자동 생성 없음 / "활용 상품으로 추가" 액션 조건 불변

---

## 10. Verification Results

| 항목 | 결과 |
|---|---|
| api-server `tsc --noEmit` | ✅ 0 errors |
| web-neture `tsc --noEmit` | ✅ 0 errors |
| 기존 candidate API / link-to-listing / classification(F3) no-regression | ✅ (additive endpoint) |
| 가드 경로 (정적 검토) | ✅ unmatched→CANDIDATE_NOT_MATCHED(409), archived→NOT_REFINABLE(409), GENERAL+otc→CONFLICT(409), 잘못된 값→INVALID(400) |
| refine 후 classification 재계산 | ✅ withClassification 재호출 |

> 정적 기준. 실제 동작(refine API/UI)은 배포 후 operator smoke. matched candidate + 의약품 master 필요 — 현 prod neture 의약품 데이터 0(pre-service)이라 happy-path 실측은 데이터 시드 후. (계정 제약은 기존 smoke CHECK 참조)

---

## 11. Follow-ups

| # | 항목 |
|---|---|
| F-audit | drug_category 변경 이력 audit table / 변경자 userId 영속 (현재 review_note 기록만) |
| F-reg | ProductMaster regulatoryType refinement (규제유형 자체 수정) — 별도 WO |
| F5 | 공급자 OTC 등록 분기 |
| F-ext | Drug Extension 영속 (검증상태/노출·광고·판매 정책/출처 필드) |
| F6 | Rx 별도 루트 |

---

**작성:** O4O Platform Team · 2026-06-06
**상태:** F4 완료 — 운영자가 의약품 미분류를 OTC/Rx/의약외품으로 정리 가능. 다음: 공급자 OTC 등록 분기 또는 Drug Extension 영속.

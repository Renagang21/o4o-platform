# CHECK-O4O-PRODUCT-TYPE-CLASSIFICATION-WIRING-F3-V1

> classifyProductType 정책을 candidate 응답 + operator UI 에 **표시용**으로 wiring (F3).
>
> WO: `WO-O4O-PRODUCT-TYPE-CLASSIFICATION-WIRING-F3-V1`
> Baseline: [`O4O-PRODUCT-CORE-BASELINE-V1`](../baseline/O4O-PRODUCT-CORE-BASELINE-V1.md) §9
> 선행: OTC foundation, F1 (`CHECK-O4O-PRODUCT-DRUG-CATEGORY-ACTIVE-MODEL-F1-V1`)
> 작성일: 2026-06-06
> 상태: 구현·정적검증 완료. 등록 UX/판매/노출 변경 없음, Rx 루트 제외.

---

## 1. Summary

F1 `ProductMaster.drug_category` + `classifyProductType`(util) 결과를 운영자 후보 검토 응답·화면에 **표시용**으로 연결했다. 운영자는 후보가 비의약품/비처방의약품(OTC)/처방의약품(Rx)/의약품 미분류/의약외품 중 무엇인지, 검토 전 기본 노출/판매 정책이 무엇인지 확인할 수 있다.

- **migration 없음 / DB·엔티티 구조 변경 없음.** 분류는 **읽기 기반 계산** + additive 응답 필드(`classification`).
- 판매/노출 권한을 여는 로직 아님. Rx 라우팅·OTC 등록 UX 없음.

검증: api-server `tsc` 0 errors, web-neture `tsc` 0 errors.

---

## 2. Files Changed

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/modules/neture/services/product-candidate.service.ts` | `withClassification()` + `CandidateClassification` 타입 (matched master batch 조회 → classifyProductType) |
| `apps/api-server/src/modules/neture/controllers/product-candidate.controller.ts` | list/detail 응답에 `classification` 부착 |
| `services/web-neture/src/lib/api/operatorProductCandidates.ts` | `ProductTypeClass`/`ProductDrugCategory`/`DrugDisplayPolicy`/`CandidateClassification` 타입 + `ProductCandidate.classification?` |
| `services/web-neture/src/pages/operator/ProductCandidateReviewPage.tsx` | 분류 배지 컬럼 + 분류 필터 + 상세 모달 분류/정책 표시 |
| `docs/investigations/CHECK-O4O-PRODUCT-TYPE-CLASSIFICATION-WIRING-F3-V1.md` | 본 문서 |

> offer.service / supplier offer 응답은 이번에 **변경하지 않음** (risk 회피, F-follow). DB/migration/엔티티 무변경.

---

## 3. Backend Classification Wiring

`ProductCandidateService.withClassification(items)`:
- matched `matchedProductMasterId` 들을 **batch 1회** 조회(`SELECT id, regulatory_type, drug_category FROM product_masters WHERE id = ANY`) → N+1 회피.
- matched master 있으면 `classifyProductType({regulatoryType, drugCategory})`, basis=`matched_master`.
- 없으면 candidate `rawPayload` 추론, basis=`inferred` (확정 아님).
- `classification = { productTypeClass, drugCategory, displayPolicy(getDefaultDrugDisplayPolicy), isOtcRegistrable, isRxClass, basis }`.
- ProductMaster/Candidate 변경 없음 (읽기만).

---

## 4. Candidate API Changes

- `GET /operator/product-candidates` (list): 각 item 에 `classification` 부착 → `{ items: (candidate & {classification})[], total }`.
- `GET /operator/product-candidates/:id` (detail): `classification` 부착.
- 그 외 엔드포인트 계약/스키마 불변. 응답 필드 **additive**.

---

## 5. Operator UI Changes

`ProductCandidateReviewPage`:
- 목록 **분류 컬럼**(배지): 비의약품/비처방의약품/처방의약품/의약외품/건강기능식품/의약품 미분류/미상.
- **분류 필터** dropdown (전체/비의약품/비처방의약품/처방의약품/의약품 미분류/의약외품) — **client-side**(로드된 100건 내 필터; backend list 필터 미지원, 성능 이슈 시 후속 backend 필터).
- 상세 모달: 상품 분류 배지 + drug_category + basis(매칭 상품 기준 / 후보 추론) + 정책 배지(약국 전용 / 고객 노출 제한 / 온라인 판매 차단 / 광고 검토 필요·차단) + Rx 경고.
- 안내문: "분류·정책은 안내용 — 등록/판매/노출 권한을 자동 변경하지 않음."

---

## 6. Product Type / Drug Policy Display

| productTypeClass | 라벨 | 기본 정책 배지 |
|---|---|---|
| non_drug | 비의약품 | (제한 없음) |
| otc_drug | 비처방의약품 | 약국 전용·고객 노출 제한·온라인 판매 차단·광고 검토 필요 |
| drug_unspecified | 의약품 미분류 | (otc 와 동일 보수) |
| rx_drug | 처방의약품 | 약국 전용·노출/판매 차단·광고 차단 + Rx 경고 |
| quasi_drug / health_functional | 의약외품 / 건강기능식품 | 온라인 판매 차단(검토) |

정책값은 `getDefaultDrugDisplayPolicy` 기본값 — 검토 전 보수 상태 표시. 권한 변경 아님.

---

## 7. Supplier Offer Impact

- 이번 WO 에서 supplier offer 응답/화면 **변경하지 않음** (WO §7 "신중히/가능하면" — risk 회피). 분류 wiring 은 operator candidate 표면에 한정.
- Follow-up: supplier offer 상세/목록 응답에 additive `classification` 노출 (별도, 공급자 화면 무변경 전제).

---

## 8. What Was Not Changed

- ✅ ProductMaster.drug_category migration 없음 / ProductMaster 구조 변경 없음
- ✅ ProductIdentifier 구조 변경 없음
- ✅ ProductCandidate table 변경 없음 (응답 additive 필드만)
- ✅ MobileProductDraft 변경 없음
- ✅ SupplierProductOffer 구조/응답 변경 없음
- ✅ StoreProductProfile / OrganizationProductListing 변경 없음
- ✅ OTC 등록 UI 없음 / Rx 등록 루트 없음
- ✅ 온라인 판매 허용 없음 / 고객 공개 노출 허용 없음 / 광고 승인 기능 없음
- ✅ "활용 상품으로 추가" 액션 조건 불변 (분류와 무관하게 기존 조건 유지)
- ✅ ProductMaster 자동 생성 없음

---

## 9. Verification Results

| 항목 | 결과 |
|---|---|
| api-server `tsc --noEmit -p tsconfig.json` | ✅ 0 errors |
| web-neture `tsc --noEmit` | ✅ 0 errors |
| 기존 candidate API / 활용연결(link) / linked 탭 no-regression | ✅ (응답 additive, 액션 무변경) |
| classify 표시 (정적 검토) | ✅ DRUG+null→의약품 미분류, DRUG+otc→비처방의약품, DRUG+rx→처방의약품(경고), GENERAL→비의약품 |
| N+1 회피 (master batch 조회) | ✅ |

> 정적(컴파일 + 코드 경로) 기준. 실제 화면 표시·필터는 배포 후 operator smoke (단, sohae2100=platform admin scope 제약은 [`CHECK-O4O-PRODUCT-CANDIDATE-OPERATOR-SCOPED-SMOKE-V1`](CHECK-O4O-PRODUCT-CANDIDATE-OPERATOR-SCOPED-SMOKE-V1.md) 참조).

---

## 10. Follow-ups

| # | 항목 |
|---|---|
| F-offer | supplier offer 응답에 additive classification 노출 (공급자 화면 무변경) |
| F-filter | candidate list backend 의 productTypeClass 필터 (현재 client-side) |
| F4 | Operator OTC 표시/검토 UX 보강 (분류 refine 액션 등) |
| F5 | 공급자 OTC 등록 분기 |
| F6 | Rx 별도 루트 |

---

**작성:** O4O Platform Team · 2026-06-06
**상태:** F3 완료 — 운영자가 후보의 비의약품/OTC/Rx/미분류를 확인 가능. 다음: F4 (OTC 검토 UX).

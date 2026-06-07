# CHECK-O4O-NETURE-SUPPLIER-BULK-OPERATOR-REVIEW-V4

> 공급자 대량 등록(SAVE-V3)으로 저장된 `ProductCandidate`가 **기존 운영자 후보 검토 화면**에서 출처·제품유형·CSV row·rawPayload 요약·의약품 분류로 명확히 식별·검토되도록 정렬.
>
> WO: `WO-O4O-NETURE-SUPPLIER-BULK-OPERATOR-REVIEW-V4`
> 선행: `BULK-UPLOAD-SAVE-V3`(후보 저장) · `OPERATOR-PRODUCT-CANDIDATE-REVIEW-UI-V1`(검토 콘솔)
> 작성일: 2026-06-07
> 상태: 구현·정적검증 완료. **frontend only · 신규 콘솔 없음.**

---

## 1. §4.1 현재 흐름 재확인 결과

| 항목 | 현황 | 보강 필요 |
|---|---|---|
| bulk 후보 목록 노출 | ✅ 표시됨(`출처: CSV`) | 일반 CSV와 구분 안 됨 |
| classification 표시 | ✅ rawPayload 추론(`drug_category`/`product_type`) | — |
| sourceLabel('공급자 대량 등록') | ❌ 미사용(SOURCE_LABEL 맵만) | ✅ 보강 |
| rawPayload(productType/rowNumber/공급자/fields) | ❌ 어디에도 미표시 | ✅ 보강 |
| 백엔드 응답 | `/api/v1/operator/product-candidates` list/get 이 이미 **sourceLabel·rawPayload·classification 반환** | 변경 불필요 |

**판정:** 백엔드·API client는 이미 필요한 데이터를 모두 반환한다 → **순수 frontend 표시 보강.** 신규 콘솔/엔드포인트/migration 없음.

---

## 2. Files Changed

| 파일 | 변경 |
|---|---|
| `services/web-neture/src/pages/operator/ProductCandidateReviewPage.tsx` | bulk 식별 헬퍼 + 목록 badge + 출처 sourceLabel + "공급자 대량 등록만" 필터 + 상세 "대량 등록 정보" 섹션(제품유형/분류/CSV row/공급자/CSV 행 요약) + rawPayload 원문 접기 |
| `docs/investigations/CHECK-O4O-NETURE-SUPPLIER-BULK-OPERATOR-REVIEW-V4.md` | 본 문서 |

> 백엔드(controller/service/entity)·API client 변경 0. migration 0.

---

## 3. 구현 내용

### 3.1 bulk 식별 (`getBulkInfo`)
`rawPayload.source === 'supplier_bulk_upload'` 또는 `sourceLabel` 포함으로 판정. rawPayload null/누락 안전(`{}` fallback, 타입 가드).
추출: productType(+한글 라벨), regulatoryType, drugCategory, rowNumber, supplierId, duplicateInBatch, fields.

### 3.2 목록
- 후보명 셀: **[공급자 대량 등록]** + **CSV row n** + (중복 시) **중복 가능** badge.
- 출처 컬럼: `sourceLabel` 우선(없으면 기존 SOURCE_LABEL 맵).
- 필터 행: **"공급자 대량 등록만"** 체크박스(클라이언트 필터 — rawPayload 기준 정밀, 일반 CSV 제외).

### 3.3 상세 모달 (`BulkDetailSection`)
- bulk 후보면 "공급자 대량 등록" 박스: 제품 유형 / regulatoryType / drugCategory / 공급자 ID + **CSV 행 요약**(제품명·제조사·코드·포장단위·성분명·함량·제형·공급가·메모 등 정해진 순서).
- 모든 후보: rawPayload 있으면 **원문 JSON 접기(`<details>`)** 제공.
- rawPayload null/빈 후보 → 섹션 미렌더(crash 0).

### 3.4 분류 표시 정합성 (§4.4)
기존 classification 박스가 그대로 동작. bulk 저장 시 rawPayload에 `drug_category`/`product_type`를 넣었으므로 `classifyProductType`가 추론 → non_drug/otc_drug/rx_drug/quasi_drug/drug_unspecified 표시. 불명확 시 '미상'.

---

## 4. Verification Results

| 항목 | 결과 |
|---|---|
| web-neture `tsc --noEmit` | ✅ 0 errors (exit 0) |
| api-server `tsc` | ✅ 무변경 (백엔드 미수정) |
| bulk 후보 목록 식별(badge/출처) | ✅ |
| 제품유형/의약품 분류 표시 | ✅ |
| 상세 CSV row 요약 + rawPayload 접기 | ✅ |
| rawPayload 없는 후보 crash | ✅ 없음(가드) |
| 기존 manual-match/reject/archive/link/refine | ✅ 무변경 |
| 기존 mobile/supplier/web/CSV 후보 표시 | ✅ 무변경(additive) |

---

## 5. What Was Not Changed (§5)

- ✅ 신규 운영자 콘솔 없음 — 기존 `ProductCandidateReviewPage` 재사용
- ✅ ProductMaster 직접 생성 UI / approveAsNewProductMaster 없음
- ✅ bulk 후보 자동 매칭/자동 승인/자동 연결 없음
- ✅ ProductCandidate entity 구조/union 변경 없음 · **migration 없음**
- ✅ SupplierOffer/EventOffer/MarketTrial/OPL/SPO 자동 생성 없음
- ✅ OTC 공급 gate / Rx 후속 액션 오픈 없음 · DRUG 후속 액션 차단 유지
- ✅ Candidate → Store/Pharmacy 활용 상품 연결(link-to-listing) 흐름 무변경
- ✅ 백엔드 candidate API 무변경

---

## 6. Follow-ups (§8)

| WO | 범위 |
|---|---|
| WO-O4O-NETURE-SUPPLIER-BULK-CANDIDATE-FILTER-V5 | source 서버 필터/페이지네이션 정식화 |
| WO-O4O-NETURE-SUPPLIER-OTC-PHARMACY-SUPPLY-GATE-V1 | OTC 약국 공급 gate |
| WO-O4O-NETURE-SUPPLIER-SHIPPING-SETTING-FOUNDATION-V1 | 배송 설정 기반 |

---

**작성:** O4O Platform Team · 2026-06-07
**상태:** 공급자 대량 등록 저장 → 운영자 검토 루프 닫힘. 신규 콘솔/백엔드/migration 없음.

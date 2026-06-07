# CHECK-O4O-NETURE-SUPPLIER-BULK-UPLOAD-SAVE-V3

> PARSE-V2 검증 통과 row를 **ProductMaster 직접 생성이 아니라 안전한 후보(ProductCandidate) 저장 경로**로 제출.
>
> WO: `WO-O4O-NETURE-SUPPLIER-BULK-UPLOAD-SAVE-V3`
> 선행: `BULK-UPLOAD-PARSE-V2`(검증·미리보기) · `PRODUCT-CANDIDATE-REVIEW-QUEUE-V1`(후보 큐)
> 작성일: 2026-06-07
> 상태: 구현·정적검증 완료.

---

## 1. §5 선행 조사 결과 (저장 대상 판단)

| 후보 | 조사 결과 | 판정 |
|---|---|---|
| **A. ProductCandidate** | `ProductCandidateService.createCandidate`(status=pending, match=unmatched) — ProductMaster/Offer 생성 안 함. operator review API 완비(`/api/v1/operator/product-candidates` list/match/manual-match/reject/archive/link/refine). `rawPayload`(jsonb)로 productType/regulatoryType/drugCategory 보존. `classifyProductType`가 rawPayload `drug_category`/`product_type` 키를 읽어 운영자 콘솔 분류 자동 추론. 테이블 이미 존재(`20260606010000-CreateProductCandidates`) | ✅ **채택** |
| C. 단일 등록 재사용 | `POST /neture/supplier/products` → `netureService.createSupplierOffer()` = **SupplierProductOffer/ProductMaster 직접 생성** | ❌ §5.2/§C 금지 |
| D. CSV Import applyBatch | 백엔드 batch apply, **유형 분리·처방 가드 없음** | ❌ §6 금지 |

### §11 중단 조건 점검 — 해당 없음
- 후보 저장 계층 존재(ProductCandidate) ✅
- migration 불필요(테이블·서비스 이미 존재) ✅
- productType/regulatoryType/drugCategory 보존 가능(rawPayload, WO §7.5 허용) ✅
- operator review UI 연결됨(기존 콘솔) ✅

→ **구현 진행(GO).**

> **저장 대상 명시:** `product_candidates` 테이블. `sourceType='csv_import'`, `sourceLabel='공급자 대량 등록'`, `candidateStatus='pending'`. (전용 `supplier_bulk` source 값을 새로 만들지 않고 기존 union 재사용 + rawPayload.source='supplier_bulk_upload'로 출처 보존 — 공유 entity union 미변경, 더 안전.)

---

## 2. Files Changed

| 파일 | 변경 |
|---|---|
| `services/web-neture/src/lib/bulkUploadValidation.ts` | `BulkRowResult`에 `fields`(정규화)·`raw`(원본) 추가 — 저장 payload 빌드용 |
| `apps/api-server/src/modules/neture/controllers/supplier-product.controller.ts` | **신규** `POST /products/bulk-candidates` (supplier guard) + 서버 재검증 상수/헬퍼. ProductCandidateService.createCandidate 호출 |
| `services/web-neture/src/lib/api/supplier.ts` | `submitBulkCandidates()` client + 타입 |
| `services/web-neture/src/pages/supplier/SupplierBulkRegisterPage.tsx` | 저장 버튼 활성화 + 저장 전 확인 모달 + 저장 결과 모달 + CTA |
| `docs/investigations/CHECK-O4O-NETURE-SUPPLIER-BULK-UPLOAD-SAVE-V3.md` | 본 문서 |

---

## 3. 저장 흐름

```
PARSE-V2 검증 통과 rows (status≠error)
→ submitBulkCandidates(productType, rows[{rowNumber, fields, raw}])
→ POST /api/v1/neture/supplier/products/bulk-candidates (requireAuth + requireActiveSupplier)
→ 서버 재검증
→ ProductCandidateService.createCandidate (per row, status=pending)
→ row별 결과 반환 (created/duplicate/failed)
→ 운영자: /api/v1/operator/product-candidates 에서 검토·매칭·연결
```

## 4. 서버 재검증 (frontend와 독립)

요청 레벨(400 차단):
- `productType` 유효(BULK_TYPE_MAP) — 필수
- `rows` 비어있지 않음 / **최대 200행**(초과 시 분할 안내)
- **금지 컬럼**(lot/expiry/serial/유효기간/일련번호/재고/입고일 …) 한 row라도 있으면 전체 차단

row 레벨(개별 failed):
- 제품명 필수
- 기본공급가 숫자
- 혼합 메타(`drug_category` 등) 값 ↔ 선택 유형 불일치
- 요청 내 SKU/코드 중복 → `duplicate`(저장하되 플래그, 자동 병합 안 함)

## 5. 저장 데이터 (ProductCandidate)

| 필드 | 값 |
|---|---|
| sourceType | `csv_import` |
| sourceLabel | `공급자 대량 등록` |
| submittedBy | 요청 user id |
| serviceKey | `neture` |
| candidateStatus | `pending` (서비스 기본) |
| candidateName/Brand/Manufacturer/Spec/Unit/ImageUrl/Price | fields 매핑 |
| rawPayload | `{ source:'supplier_bulk_upload', productType, regulatoryType, drugCategory, drug_category, product_type, supplierId, rowNumber, duplicateInBatch, fields, original }` |

> `regulatoryType`/`drugCategory` 전용 컬럼이 없어 **rawPayload에 보존**(WO §7.5). `drug_category`/`product_type` 키는 운영자 콘솔 `classifyProductType` 추론용.

## 6. 제품 유형별 저장 정책 (서버 BULK_TYPE_MAP)

| 유형 | regulatoryType | drugCategory |
|---|---|---|
| 비의약품 non_drug | GENERAL | null |
| 의약외품 quasi_drug | QUASI_DRUG | quasi_drug |
| 비처방 otc_drug | DRUG | otc |
| 처방 rx_drug | DRUG | rx |
| 미분류 unclassified | null | null (운영자 검토) |

- 의약품·처방·미분류 → 모두 `pending` 후보. **일반 판매/이벤트/펀딩 자동 연결 없음.**
- 처방: lot/expiry/serial 수집 없음(금지 컬럼 차단).

## 7. 프론트 UX

- 저장 버튼: 검증 통과(`!hasError`) + 저장 대상(정상+경고)≥1 일 때만 활성. 오류 row 있으면 비활성.
- **저장 전 확인 모달**: 제품 유형/총·정상·경고·오류 수 + 의약품/처방 운영자 검토 안내 + "즉시 확정 등록 아님(후보 제출)" 명시.
- **저장 결과 모달**: 생성/중복/실패 카운트 + 비정상 row 표 + CTA(제품 목록 / 대량 등록 계속).

---

## 8. Verification Results

| 항목 | 결과 |
|---|---|
| api-server `tsc --noEmit` | ✅ 0 errors (exit 0) |
| web-neture `tsc --noEmit` | ✅ 0 errors (exit 0) |
| 권한 없는 요청 차단 (supplier guard) | ✅ requireActiveSupplier |
| productType 필수/유효 검증 | ✅ 400 |
| row 수 제한(200) | ✅ 400 |
| 처방 금지 컬럼 서버 차단 | ✅ 400 |
| 혼합 productType 행 차단 | ✅ row failed |
| row별 결과 반환 | ✅ created/duplicate/failed |
| 저장 버튼 활성/비활성 | ✅ hasError 가드 |
| 확인/결과 모달 | ✅ |
| CSV Import 직접 접근 crash | ✅ 없음 |

---

## 9. What Was Not Changed (§10)

- ✅ ProductMaster 직접 생성 없음 · SupplierOffer 직접 생성 없음
- ✅ EventOffer/MarketTrial/OPL/SPO 자동 생성 없음
- ✅ Drug Extension 상세 저장 없음 · 외부 의약품 DB 매칭 없음
- ✅ 기존 CSV Import applyBatch 재사용/개편 없음 · legacy 제거 없음
- ✅ **migration 없음** (product_candidates 테이블·서비스 기존)
- ✅ 단일 등록/등록 도우미/제품 목록/이벤트/펀딩/주문·배송·정산 무변경
- ✅ ProductCandidate **entity union(sourceType) 미변경** — 기존 'csv_import' 재사용
- ✅ DRUG 후속 액션 차단 정책 유지

---

## 10. Follow-ups (§14)

| WO | 범위 |
|---|---|
| WO-O4O-NETURE-SUPPLIER-BULK-OPERATOR-REVIEW-V4 | 운영자 콘솔에서 bulk 후보 검토·매칭·승격 UX 정렬 |
| WO-O4O-NETURE-SUPPLIER-OTC-PHARMACY-SUPPLY-GATE-V1 | OTC 약국 공급 gate |
| WO-O4O-NETURE-SUPPLIER-SHIPPING-SETTING-FOUNDATION-V1 | 배송 설정 기반 |

---

**작성:** O4O Platform Team · 2026-06-07
**상태:** 검증 통과 row → 안전 후보(ProductCandidate) 저장 완료. ProductMaster 직접 생성 없음, migration 없음.

# CHECK-O4O-NETURE-SUPPLIER-BULK-UPLOAD-PARSE-V2

> 공급자 대량 등록에서 CSV를 **저장 전에 유형별로 파싱·검증·미리보기**. **저장은 V3로 분리** — 기존 CSV Import applyBatch 재사용 안 함.
>
> WO: `WO-O4O-NETURE-SUPPLIER-BULK-UPLOAD-PARSE-V2`
> 선행: `BULK-UPLOAD-TEMPLATE-V1`(유형별 템플릿) · `MENU-ASSISTANT-IA-CLEANUP-V1`(CSV Import 우회 정리)
> 작성일: 2026-06-07
> 상태: 구현·정적검증 완료. **frontend only.**

---

## 1. §3.1 구조 재확인 결과 (저장 전 필수 확인)

| 항목 | 결과 |
|---|---|
| CSV parsing 위치 | **백엔드** — `csvImportApi.uploadCsv(file)` → 서버 batch 생성 |
| 기존 CSV Import 저장 | `csvImportApi.applyBatch(batchId)` — **서버 batch apply** |
| 저장 경로의 유형 분리 | **없음** — 단일 공통 batch (제품 유형 무관) |
| 새 유형 원칙과 정합? | **불일치** → V2에서 이 저장 경로를 재사용하지 않음 |

**판정:** 기존 CSV Import는 유형 분리 없이 서버에 실제 저장하는 경로다. WO §3.7/§4 지시대로 V2는 **이 경로에 연결하지 않고** frontend 전용 파싱·검증·미리보기만 제공한다. 저장은 검증 기준이 안정된 뒤 `BULK-UPLOAD-SAVE-V3`에서 별도로 다룬다.

---

## 2. Files Changed

| 파일 | 변경 |
|---|---|
| `services/web-neture/src/lib/bulkUploadValidation.ts` | **신규** — CSV 파서 + 유형별 header/혼합/row/금지컬럼 검증 (frontend 전용, 네트워크/저장 없음) |
| `services/web-neture/src/pages/supplier/SupplierBulkRegisterPage.tsx` | 유형별 CSV 업로드 + 검증 결과/미리보기 테이블 + 저장 disabled(준비 중) |
| `services/web-neture/src/pages/supplier/SupplierCsvImportPage.tsx` | legacy 안내에 "대량 등록에서 저장 전 검증/미리보기 가능" 한 줄 보강 (§5.3) |
| `docs/investigations/CHECK-O4O-NETURE-SUPPLIER-BULK-UPLOAD-PARSE-V2.md` | 본 문서 |

---

## 3. 검증 로직 (`bulkUploadValidation.ts`)

```
업로드 CSV → parseCsv(BOM/따옴표/콤마/줄바꿈/한글)
→ header 정규화(한↔영 별칭 → 표준 한글명)
→ header 검증 → row 검증 → BulkValidationResult
```

### 3.1 Header 검증
- **필수 컬럼 누락** → 오류 (유형별 `제품명` 등)
- **권장 컬럼 누락** → 경고
- **금지 컬럼**(lot/expiry/serial/유효기간/일련번호/재고/입고일 계열, 한·영) → 오류. **처방의약품엔 전용 강한 메시지**
- **타 유형 템플릿 컬럼 혼입**(예: 비의약품 파일의 `의약품표준코드`/`standard_code_or_kd_code`) → 오류
- **알 수 없는 컬럼** → 경고(비차단)

### 3.2 혼합 파일 방지 (메타 컬럼)
- `drug_category` / `regulatory_type` / `product_type`(한·영) 컬럼이 있으면 **행 값**을 선택 유형과 대조.
- 예: 비의약품 파일에 `drug_category=rx` 행 → 오류.

### 3.3 Row 검증
- `제품명` 필수(없으면 오류)
- `기본공급가` 값이 있으나 숫자 아님 → 오류
- 권장 컬럼 값 비어있음 → 경고
- 빈 행 무시

### 3.4 별칭 정규화
영문 헤더(`product_name`, `base_supply_price`, `standard_code_or_kd_code`…)를 표준 한글 템플릿명으로 매핑 → 한·영 CSV 모두 동일 기준 검증.

---

## 4. 미리보기 UI (`SupplierBulkRegisterPage`)

```
유형 선택 → 템플릿 다운로드 → CSV 파일 선택
→ 검증 결과 요약(정상/경고/오류 카운트)
→ 헤더 오류/경고 박스
→ 미리보기 테이블(#·제품명·제조사/브랜드·SKU·코드/바코드·공급가·상태·메시지)
→ 저장 버튼 [disabled "준비 중"]
```

- 행 상태: 정상/경고/오류 배지.
- **저장 버튼은 항상 disabled** (V2는 저장 미제공). 오류 있으면 별도 안내.
- 유형 변경 시 이전 검증 결과 초기화(유형별 기준 상이).

---

## 5. Verification Results

| 항목 | 결과 |
|---|---|
| web-neture `tsc --noEmit` | ✅ 0 errors (exit 0) |
| `/supplier/products/bulk` 렌더 | ✅ (정적) |
| 유형별 CSV 업로드 + header 검증 | ✅ |
| 필수 컬럼 누락 오류 | ✅ |
| 처방의약품 금지 컬럼 오류(expiry_date 등) | ✅ |
| 타 유형 컬럼 혼입 오류(비의약품 파일 standard_code) | ✅ |
| 메타 컬럼 혼합 행 오류(drug_category=rx) | ✅ |
| 미리보기 테이블 + 행 상태 | ✅ |
| 저장 비활성(미제공) | ✅ disabled |
| CSV Import 직접 접근 crash | ✅ 없음(라우트/배너 유지) |
| 단일 등록/등록 도우미/제품 목록/이벤트/펀딩 영향 | ✅ 없음 |

---

## 6. What Was Not Changed

- ✅ 대량 저장 백엔드 신규 구현 없음
- ✅ 기존 CSV Import `applyBatch` 무검증 재사용 없음 (연결 안 함)
- ✅ DB migration 없음
- ✅ ProductMaster / ProductCandidate / Drug Extension 구조 무변경
- ✅ 이벤트 오퍼 / 유통참여형 펀딩 / 주문·배송·정산 무변경
- ✅ OTC 공급 gate / 처방의약품 lot·expiry·serial 관리 — 없음(수집 안 함 명시)
- ✅ 외부 의약품 DB 자동 매칭 없음
- ✅ DRUG 후속 액션 차단 정책 유지

---

## 7. Follow-ups

| WO | 범위 |
|---|---|
| WO-O4O-NETURE-SUPPLIER-BULK-UPLOAD-SAVE-V3 | 검증 통과 데이터의 안전한 유형별 저장 경로 |
| WO-O4O-NETURE-SUPPLIER-OTC-PHARMACY-SUPPLY-GATE-V1 | OTC 공급 gate |
| WO-O4O-NETURE-SUPPLIER-SHIPPING-SETTING-FOUNDATION-V1 | 배송 설정 기반 |

---

**작성:** O4O Platform Team · 2026-06-07
**상태:** 저장 전 검증·미리보기 완료. 저장은 V3.

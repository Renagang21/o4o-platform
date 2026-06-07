# CHECK-O4O-NETURE-SUPPLIER-BULK-UPLOAD-TEMPLATE-V1

> 대량 등록(`/supplier/products/bulk`)에 유형별 CSV 템플릿 다운로드 + 혼합금지 강화 + 처방 lot/expiry/serial 제외 (frontend only).
>
> WO: `WO-O4O-NETURE-SUPPLIER-BULK-UPLOAD-TEMPLATE-V1`
> 선행: REGISTRATION-IA-V1(bulk landing), WIZARD-V2, OFFER-MODE, REFERENCE-V1
> 작성일: 2026-06-07
> 상태: 구현·정적검증 완료 (템플릿/안내까지, 저장 파서는 V2).

---

## 0. 작업공간 위생 (선행)

- 시작 시 로컬 HEAD 가 origin/main 보다 1커밋(다른 세션 Guide IA) 앞선 것으로 보였으나, **`git fetch` 결과 origin/main = `1361b0586`** — 다른 세션이 이미 push 완료. HEAD == origin 동기화 상태로 오염 자연 해소.
- 격리용 worktree 를 origin/main 으로 생성·검증(node_modules up-resolution OK) 후 **불필요해져 제거**. 다른 세션 커밋 **push/reset 미수행**. 본 작업은 깨끗한 primary tree 에서 진행.

---

## 1. Summary

`/supplier/products/bulk` 의 유형별 분기 landing 에 **유형 전용 CSV 템플릿 다운로드**를 추가하고 혼합금지·처방 정책 안내를 강화했다.

- 5개 유형(비의약품/의약외품/비처방/처방/미분류) 각각 전용 헤더 컬럼 템플릿 제공.
- **처방의약품 템플릿에 lot/유효기간/일련번호/재고 이력 컬럼 없음** + "유통 정보화 범위만" 안내.
- 템플릿 CSV 는 **백엔드 없이 클라이언트 생성**(Blob 다운로드, UTF-8 BOM).
- 저장 API/bulk 파서/migration/ProductMaster/이벤트·펀딩/배송 변경 없음. 저장은 V2.
- 검증: web-neture `tsc` — §4.

---

## 2. Files Changed

| 파일 | 변경 |
|---|---|
| `services/web-neture/src/lib/supplierProductTypes.ts` | `SUPPLIER_BULK_TEMPLATE_COLUMNS`(유형별 헤더) + `SUPPLIER_BULK_EXCLUDED_COLUMNS` + `getBulkTemplateColumns` + `buildBulkTemplateCsv`(BOM) |
| `services/web-neture/src/pages/supplier/SupplierBulkRegisterPage.tsx` | 유형별 템플릿 컬럼 표시 + CSV 다운로드 버튼 + 혼합금지/처방 제외 안내 강화 |
| `docs/investigations/CHECK-O4O-NETURE-SUPPLIER-BULK-UPLOAD-TEMPLATE-V1.md` | 본 문서 |

---

## 3. 유형별 템플릿 컬럼

| 유형 | 헤더 컬럼 |
|---|---|
| 비의약품 | 제품명·브랜드·제조사·공급자상품코드·바코드·규격·단위·기본공급가·제품설명·이미지URL |
| 의약외품 | …·바코드또는표준코드·품목신고번호·… |
| 비처방 의약품 | 제품명·제조사·공급자상품코드·의약품표준코드·보험코드·포장단위·성분명·함량·제형·기본공급가·약국대상여부 |
| **처방의약품** | 제품명·제조사·공급자상품코드·의약품표준코드·보험코드·포장단위·성분명·함량·제형·기본공급가·공급메모 — **lot/유효기간/일련번호/재고 없음** |
| 미분류 | 제품명·브랜드·제조사·공급자상품코드·바코드·기본공급가·비고 |

- `SUPPLIER_BULK_EXCLUDED_COLUMNS`(lot/expiry/serial/유효기간/일련번호/재고/traceability)는 어떤 템플릿에도 포함하지 않는 O4O 범위 가드(특히 처방).

---

## 4. Verification Results

| 항목 | 결과 |
|---|---|
| web-neture `tsc --noEmit` (background) | ✅ 0 errors |
| 템플릿 CSV 다운로드 (클라이언트 Blob) | ✅ (downloadTemplate, BOM 포함) |
| 처방 템플릿에 lot/expiry/serial 없음 | ✅ (컬럼 정의 + 제외 가드) |
| 혼합금지 안내 | ✅ (상단 경고 + 유형별 "이 유형만") |
| 기존 단일 등록/목록/이벤트/펀딩 흐름 영향 | ✅ 없음 (bulk landing 한정) |
| 다른 세션 Guide IA 커밋 미포함 | ✅ (origin 동기화 후 진행, 내 변경만 staging) |

---

## 5. What Was Not Changed

- ✅ 저장 API / bulk 저장 백엔드 / 파서 없음 (헤더 검증·미리보기·저장은 V2)
- ✅ DB migration / ProductMaster 구조 변경 없음
- ✅ 이벤트 오퍼 / 유통참여형 펀딩 / 배송 grouping / 주문·정산 변경 없음
- ✅ 처방의약품 lot/expiry/serial/재고 미도입
- ✅ 단일 등록 wizard / 제품 목록 변경 없음

---

## 6. Follow-ups

| WO | 범위 |
|---|---|
| WO-O4O-NETURE-SUPPLIER-BULK-UPLOAD-PARSE-V2 | 업로드 파일 헤더 검증·미리보기·유형별 저장 |
| WO-O4O-NETURE-MARKET-TRIAL-PRODUCT-REFERENCE-DISPLAY-V2 | 펀딩 productId 표시 |
| WO-O4O-NETURE-SUPPLIER-OTC-PHARMACY-SUPPLY-GATE-V1 / SHIPPING-SETTING-FOUNDATION-V1 | 후속 |

---

**작성:** O4O Platform Team · 2026-06-07
**상태:** 유형별 대량 등록 템플릿 기준선 완료. 저장 파서는 V2.

# CHECK-O4O-PRODUCT-IDENTIFIER-LEGACY-TYPE-CLEANUP-V1

> WO-O4O-PRODUCT-IDENTIFIER-LEGACY-TYPE-CLEANUP-V1 실행·검증 기록
> 선행: WO-O4O-LEGACY-INTERNAL-BARCODE-TO-NULL-MIGRATION-V1 (Phase D — 활성 데이터 0 확보)

| 항목 | 값 |
|------|-----|
| 실행일 | 2026-07-10 |
| 유형 | 코드·타입 정리 (데이터 무변경) |
| 커밋 | `5c597e3d7` |
| 배포 | deploy-api ✅ / deploy-admin ✅ (revision `o4o-core-api-02520-wjm`) |
| 상태 | ✅ 완료 (type-check 0 · unit test pass · 배포·회귀 무이상) |

---

## 1. 목적

Phase D 이관으로 **활성 데이터가 0** 이 된, 더 이상 사용하지 않는 ProductIdentifier 유형을
코드·타입에서 제거한다. soft-deleted 잔존 row 는 감사·롤백용으로 보존한다.

제거 대상: `INTERNAL_O4O` · `STORE_LOCAL` · `PHARMACY_LOCAL` · `SUPPLIER_SKU`

---

## 2. 사전 검증 (프로덕션 read-only)

### 2.1 identifier_type census

| identifier_type | active | soft-deleted | total |
|-----------------|-------:|-------------:|------:|
| MFDS_CODE | 194,561 | 0 | 194,561 |
| KOREA_DRUG_CODE | 177,413 | 0 | 177,413 |
| ATC_CODE | 176,962 | 0 | 176,962 |
| KOREA_INSURANCE_CODE | 64,692 | 0 | 64,692 |
| **INTERNAL_O4O** | **0** | **17,148** | 17,148 |
| GTIN | 3,826 | 0 | 3,826 |
| UDI_DI | 3,826 | 0 | 3,826 |

- 제거 대상 4종의 **활성 = 0** (STORE_LOCAL / PHARMACY_LOCAL / SUPPLIER_SKU 은 row 자체가 0건).
- `INTERNAL_O4O` soft-deleted 17,148건 보존 — hard delete 하지 않음.

### 2.2 코드 사용처 매핑 + LIVE producer 점검

전체 repo grep (`INTERNAL_O4O|STORE_LOCAL|PHARMACY_LOCAL|SUPPLIER_SKU`) + type-check 로 누락 없이 확인:

| 파일 | 사용 | 조치 |
|------|------|------|
| `entities/ProductIdentifier.entity.ts` | union + 상수배열 + 주석 | 4종 제거, 폐기 주석 명시 |
| `utils/product-identifier.util.ts` | `isInternalO4OCode` / `INTERNAL_O4O_PREFIX` / normalize 분기 / `inferIdentifierTypeFromBarcode` 반환 | 200 대역 추론 제거(13자리→EAN13), 관련 함수·상수 제거 |
| `admin ProductMasterDetailPage.tsx` | identifier 라벨맵 4종 | 제거 (Record<string> fallback 유지) |
| `docs/guides/products/general-food/README.md` R5 | 합성 내부코드 자동생성 서술(stale) | barcode=NULL 로 정정 |
| migrations `20260606…` / `20270102…` | raw SQL 문자열 | **무변경**(과거 기록) |

**LIVE producer 점검**: `inferIdentifierTypeFromBarcode` 는 store 신규 상품 요청 경로
(`store-product-request.controller` 제출 / `store-product-request-admin.service` 승인)에서 호출된다.
200 대역 → INTERNAL_O4O 분기를 제거하여, store 가 입력한 13자리 실제 바코드는 **EAN13** 으로 추론된다
(INTERNAL_O4O 개념 폐기와 일치, 더 정확한 분류). 호출부 3곳 모두 단일 인자 → `barcodeSource` 파라미터 제거 무회귀.
`normalizeIdentifier` 는 입력 type 을 받는 일반 함수이며 4종을 하드코딩 생성하는 경로 없음.

---

## 3. 변경 내용

- **ProductIdentifier.entity**: `ProductIdentifierType` union + `PRODUCT_IDENTIFIER_TYPES` 배열에서 4종 제거.
  주석에 폐기 사유·soft-deleted 잔존(identifier_type varchar 라 값 보존, 활성 조회 대상 아님) 명시.
- **product-identifier.util**: `isInternalO4OCode` 함수·`INTERNAL_O4O_PREFIX` 상수 제거,
  `normalizeIdentifier` 의 `INTERNAL_O4O` case 제거, `inferIdentifierTypeFromBarcode` 의 200 대역
  INTERNAL_O4O 추론 및 `barcodeSource` 파라미터 제거. 헤더 주석의 `generateInternalBarcode` 참조 정리.
- **admin ProductMasterDetailPage**: 라벨맵에서 4종 제거 (미존재 유형은 원본 코드 fallback).
- **general-food README R5**: 바코드리스 등록 = `barcode=NULL` 로 정정(합성코드 자동생성 서술 제거).

**무변경**: 공식 식별자(MFDS_CODE/KOREA_DRUG_CODE/KOREA_INSURANCE_CODE/ATC_CODE/UDI_DI/GTIN),
ProductMaster 데이터, soft-deleted INTERNAL_O4O row, 주문/listing/description. 과거 migration/CHECK/IR/WO 기록.

**범위 외**: EAN13/UPC/JAN/UNKNOWN(데이터 0이나 WO 대상 아님) 은 유지.

---

## 4. 검증

| 검증 | 결과 |
|------|:----:|
| api-server `tsc --noEmit -p tsconfig.build.json` | ✅ 0 errors |
| admin-dashboard `tsc --noEmit` | ✅ 0 errors |
| `product-identifier.util.test.ts` (jest) | ✅ 8 passed |
| deploy-api (Cloud Run + migrations + verify) | ✅ success |
| deploy-admin (Cloud Run) | ✅ success |
| 배포 API 회귀 — master 상세 identifiers 직렬화 | ✅ HTTP 200, KOREA_DRUG_CODE/ATC_CODE/KOREA_INSURANCE_CODE/MFDS_CODE 정상 반환 |

- 회귀 표본 master `072e925b…`(휴베그론서방정): 공식 식별자 4종 그대로 직렬화 확인 → 유지 유형 무영향.
- `type` 필드로 반환(varchar) — union 축소는 런타임 직렬화에 영향 없음.

---

## 5. 롤백

- 코드 되돌림(revert `5c597e3d7`)으로 union/util/label 복원 가능.
- 데이터 무변경이므로 DB 롤백 불필요. soft-deleted INTERNAL_O4O 17,148건은 그대로 보존.

---

## 6. 결론

ProductIdentifier 레거시 4종 유형 정리 완료. 상품 정체성 = UUID 단일 전환의 **타입·코드 정합**까지 마무리:

- 활성 0 확인 후 union/배열/추론·정규화 분기/라벨/stale 문서에서 제거
- 공식 식별자·ProductMaster·soft-deleted 감사 row 전량 보존
- store 신규요청 바코드 추론은 EAN13/GTIN 로 수렴(INTERNAL_O4O 개념 완전 폐기)

향후 필요 시 soft-deleted INTERNAL_O4O archive/hard-delete 는 별도 보존기간 후 WO 로 분리.

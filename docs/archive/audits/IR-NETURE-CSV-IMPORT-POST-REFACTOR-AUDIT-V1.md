# IR-NETURE-CSV-IMPORT-POST-REFACTOR-AUDIT-V1

**작성일**: 2026-03-21
**상태**: POST-REFACTOR (구조 전환 완료 후 상태 기록)
**선행 문서**: IR-O4O-NETURE-SUPPLIER-CSV-PRODUCT-STRUCTURE-AUDIT-V1.md (전환 이전 상태)

---

## 1. 문서 목적

이전 IR(IR-O4O-NETURE-SUPPLIER-CSV-PRODUCT-STRUCTURE-AUDIT-V1)은 **구조 전환 이전 상태**를 기록한 문서다.
본 문서는 다음 WO들이 완료된 **현재 시스템 상태**를 정확히 기록한다.

| WO | 핵심 변경 |
|----|----------|
| WO-O4O-B2B-CSV-INGEST-PIPELINE-V1 | 2-Phase 파이프라인 기반 구축 |
| WO-O4O-SUPPLIER-PRODUCT-REGISTRATION-REFINEMENT-V1 | image_url, manualData(regulatory/manufacturer/brand) 지원 |
| WO-NETURE-CSV-MASTER-CREATION-DECOUPLING-V1 | **MFDS 디커플링 — marketing_name 기반 Master 생성** |
| WO-NETURE-CSV-TEMPLATE-V1 | supply_price 필수화, consumer_short_description 추가 |
| WO-NETURE-FIRSTMALL-BASIC-BULK-IMPORT-ENABLEMENT-V1 | msrp/stockQty/description Apply 단계 전달, Brand 자동 생성, 이미지/AI 파이프라인 |

---

## 2. 이전 → 현재 핵심 변경점

| 항목 | 이전 (IR 기록 시점) | 현재 |
|------|-------------------|------|
| Master 생성 | MFDS 의존 (STUB → REJECT) | CSV `marketing_name` 기반 생성 가능 |
| 신규 barcode | 등록 불가 | **등록 가능** (CREATE_MASTER) |
| MFDS 역할 | Validation gate (blocking) | **Advisory-only** (Apply 단계, non-blocking) |
| CSV 역할 | 가격/정책 수정 도구 | **상품 등록 + 수정 통합 인터페이스** |
| 활성 컬럼 | barcode, supply_price, distribution_type | +marketing_name, regulatory_name, manufacturer_name, brand, image_url, consumer_short_description |

---

## 3. 현재 파이프라인 흐름

### Phase 1: Upload + Validate (`POST /supplier/csv-import/upload`)

```
CSV 파일 업로드
  ↓
Parse (csv-parse/sync)
  ↓
Batch 생성 (status: VALIDATING)
  ↓
각 행 검증:
  1. barcode 추출 (빈값 → INVALID_BARCODE REJECT)
  2. GTIN 체크섬 (실패 → INVALID_GTIN REJECT)
  3. 배치 내 중복 (→ DUPLICATE_IN_BATCH REJECT)
  4. supply_price 파싱 (필수, 음수/비정수 → INVALID_PRICE REJECT)
  5. distribution_type 파싱 (잘못된 값 → INVALID_DISTRIBUTION_TYPE REJECT)
  6. ProductMaster 조회:
     a) 존재 → LINK_EXISTING (VALID)
     b) 미존재:
        - marketing_name OR regulatory_name 있음 → CREATE_MASTER (VALID)
        - 둘 다 없음 → MISSING_MARKETING_NAME REJECT
  ↓
validRows > 0 → READY / 0 → FAILED
```

### Phase 2: Apply (`POST /supplier/csv-import/batches/:id/apply`)

```
각 VALID 행에 대해:

[CREATE_MASTER인 경우]
  1. MFDS advisory 호출 (non-blocking)
  2. Master 생성:
     - marketingName: CSV > MFDS > 'UNKNOWN_PRODUCT'
     - regulatoryName: CSV > MFDS > 'UNKNOWN'
     - manufacturerName: CSV > MFDS > null
     - isMfdsVerified: MFDS 성공 시만 true
  3. Brand 해석 (CSV brand 컬럼 → 조회/자동 생성)

[LINK_EXISTING인 경우]
  Master 이미 존재 → skip

[공통]
  4. Offer UPSERT:
     - INSERT (PENDING, inactive)
     - ON CONFLICT (master_id, supplier_id) → UPDATE prices
  5. 이미지 파이프라인 (fire-and-forget)
  6. AI 콘텐츠 생성 (fire-and-forget)
```

---

## 4. CSV 컬럼 상태표

| 컬럼 | 필수 | Phase 1 검증 | Phase 2 저장 | 저장 대상 | 상태 |
|------|:----:|:----------:|:----------:|----------|:----:|
| **barcode** | YES | GTIN 체크섬 | Master 조회/생성 | ProductMaster.barcode | **ACTIVE** |
| **supply_price** | YES | 정수 ≥ 0 | Offer.priceGeneral | SupplierProductOffer | **ACTIVE** |
| **distribution_type** | NO | ENUM 검증 | Offer.distributionType | SupplierProductOffer | **ACTIVE** |
| **marketing_name** | NO* | 존재 여부 체크 | Master.marketingName | ProductMaster | **ACTIVE** |
| **regulatory_name** | NO* | 존재 여부 체크 | Master.regulatoryName | ProductMaster | **ACTIVE** |
| **manufacturer_name** | NO | — | Master.manufacturerName | ProductMaster | **ACTIVE** |
| **brand** | NO | — | Brand 조회/생성 → Master.brandId | Brand + ProductMaster | **ACTIVE** |
| **image_url** | NO | — | GCS 업로드 → ProductImage | ProductImage | **ACTIVE** |
| **consumer_short_description** | NO | — | `<p>` 래핑 → Offer.consumerShortDescription | SupplierProductOffer | **ACTIVE** |
| **msrp** | NO | — | parseInt → Offer.consumerReferencePrice | SupplierProductOffer | **PARTIAL** |
| **stock_qty** | NO | — | parseInt → Offer.stockQuantity | SupplierProductOffer | **PARTIAL** |
| **description** | NO | — | consumer_short_description 폴백 | SupplierProductOffer | **PARTIAL** |
| **supplier_sku** | NO | — | — | — | **INERT** |

\* `marketing_name` 또는 `regulatory_name` 중 하나는 신규 Master 생성 시 필수

**상태 정의**:
- **ACTIVE**: Phase 1 검증 + Phase 2 저장 모두 동작
- **PARTIAL**: Phase 1 검증 없음, Phase 2에서 파싱/저장은 수행 (에러 리포팅 불완전)
- **INERT**: ALLOWED_CSV_COLUMNS에 선언되었으나 실제 동작 없음

---

## 5. MFDS 현재 역할

### Advisory-Only (Non-Blocking)

```
Phase 1 (Validate): MFDS 호출 없음
Phase 2 (Apply):    MFDS 호출 → 실패해도 Master 생성 진행
```

| 시나리오 | MFDS 응답 | 결과 |
|---------|----------|------|
| MFDS_API_KEY 미설정 | graceful degradation | Master 생성 (isMfdsVerified: false) |
| MFDS API 호출 성공 | 데이터 반환 | CSV 데이터 우선, MFDS 보조 (isMfdsVerified: true) |
| MFDS API 호출 실패 | 에러/미발견 | Master 생성 진행 (isMfdsVerified: false) |

**데이터 우선순위**: CSV 필드 > MFDS 데이터 > 기본값('UNKNOWN')

---

## 6. Barcode 처리 의사결정 매트릭스

| Master 존재 | marketing/regulatory_name | 결과 | actionType |
|:----------:|:------------------------:|------|:----------:|
| YES | — (무관) | 기존 Master 연결, Offer upsert | LINK_EXISTING |
| NO | 하나 이상 존재 | Master 신규 생성, Offer 생성 | CREATE_MASTER |
| NO | 둘 다 없음 | 행 거부 | REJECT |

---

## 7. 잔여 갭 분석

### HIGH — Phase 1 검증 누락

| 컬럼 | 현상 | 영향 |
|------|------|------|
| msrp | Phase 1에서 미검증, Phase 2에서만 parseInt | 잘못된 값 입력 시 Phase 1 리포트에 표시 안 됨 |
| stock_qty | 동일 | 동일 |
| description | 길이/내용 검증 없음 | 매우 긴 문자열 입력 가능 |

### MEDIUM — 미지원 기능

| 기능 | 현상 |
|------|------|
| B2B 티어 가격 (Gold/Platinum) | CSV 지원 없음 (API 전용) |
| 상세 설명 (Tiptap HTML) | CSV 지원 없음 (API 전용) |
| supplier_sku | ALLOWED에 선언되었으나 저장 대상 없음 |

### LOW — 운영 안정성

| 항목 | 현상 |
|------|------|
| 배치 크기 제한 | 미문서화 (대형 CSV 타임아웃 가능) |
| 이미지 실패 추적 | fire-and-forget, 실패 시 가시성 없음 |
| Brand 동시성 | 동시 Apply 시 중복 Brand 생성 가능성 |

---

## 8. 현재 상태 한 줄 정의

> **CSV Import는 "가격 수정 도구"에서 "상품 등록 + 수정 통합 인터페이스"로 전환 완료된 상태다.**
> MFDS는 advisory-only, marketing_name이 있으면 신규 상품 등록 가능.

---

## 9. 파일 참조

| 컴포넌트 | 경로 |
|---------|------|
| CSV Service Core | `apps/api-server/src/modules/neture/services/csv-import.service.ts` |
| Common Import Service | `apps/api-server/src/modules/neture/services/product-import-common.service.ts` |
| MFDS Service | `apps/api-server/src/modules/neture/services/mfds.service.ts` |
| API Controller | `apps/api-server/src/modules/neture/controllers/supplier-product.controller.ts` |
| Batch Entity | `apps/api-server/src/modules/neture/entities/SupplierCsvImportBatch.entity.ts` |
| Row Entity | `apps/api-server/src/modules/neture/entities/SupplierCsvImportRow.entity.ts` |
| Master Entity | `apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts` |
| Offer Entity | `apps/api-server/src/modules/neture/entities/SupplierProductOffer.entity.ts` |

---

## 10. 다음 단계

이 IR은 현재 상태 기록이며 **실사용 검증 단계**의 기준선이다.

- FirstMall 테스트 계속 진행
- 문제 발생 시에만 WO 생성
- PARTIAL 컬럼(msrp, stock_qty)의 Phase 1 검증 추가 여부는 실사용 피드백 후 결정

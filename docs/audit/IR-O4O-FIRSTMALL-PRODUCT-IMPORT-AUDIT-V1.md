# IR-O4O-FIRSTMALL-PRODUCT-IMPORT-AUDIT-V1

> Investigation Report: Firstmall Product Import Feasibility Audit
> Date: 2026-03-06
> Status: Complete
> WO: WO-O4O-PRODUCT-IMPORT-FIRSTMALL-AUDIT-V1
> Prerequisite: IR-O4O-PRODUCT-CATALOG-AUDIT-V1

---

## Executive Summary

Firstmall(가비아 퍼스트몰) 상품 데이터를 O4O Product Catalog로 Import하는 것은
**기술적으로 가능**하며, 핵심 경로가 이미 구현되어 있다.

### 핵심 결론

| 항목 | 가능 여부 | 근거 |
|------|----------|------|
| Firstmall → ProductMaster Import | **가능** | 수동 생성 API 존재 (`/admin/masters/resolve`) |
| CSV Import 기반 확장 | **가능** | CSV Import Pipeline 완전 구현됨 |
| Barcode 매핑 | **가능** | Firstmall barcode → GTIN 변환 필요 |
| 이미지 Import | **부분 가능** | URL 다운로드 가능, 클라우드 스토리지 미구축 |
| Supplier Service 확장 | **가능** | NetureSupplier + SupplierProductOffer 구조 활용 |

---

## 1. Firstmall 상품 데이터 구조

### 1.1 Firstmall 상품 필드

Firstmall(가비아 퍼스트몰)은 다음 상품 데이터를 지원한다:

| 필드 | 설명 | O4O 매핑 가능 |
|------|------|--------------|
| 상품명 | 상품 이름 | YES |
| 상품코드 | 자동 생성 (브랜드/카테고리/컬러/사이즈 기반) | YES (SKU) |
| 바코드 | Code39, Code128 포맷 | **YES** (GTIN 변환 필요) |
| 브랜드 | 브랜드 정보 | YES |
| 카테고리 | 분류 체계 | YES (카테고리 매핑) |
| 상품 이미지 | 이미지 URL | YES |
| 상품 설명 | 상세 설명 | YES |
| 재고 | 재고 수량 | (CSV import에서 무시) |
| 판매가 | 가격 정보 | YES |
| 옵션 | 색상/사이즈 변형 | (현재 미지원) |
| 제조사 | 제조사 정보 | YES |

### 1.2 Firstmall 데이터 Export 방식

- 관리자 페이지에서 엑셀(Excel) 다운로드 지원
- 다운로드 항목 커스터마이즈 가능
- 완료된 엑셀은 7일간 재다운로드 가능

### 1.3 바코드 포맷 차이

| 시스템 | 바코드 포맷 | 검증 |
|--------|-----------|------|
| Firstmall | Code39, Code128 | 자체 생성 |
| O4O ProductMaster | **GTIN** (8/12/13/14자리) | `validateGtin()` 체크디짓 |

**주의**: Firstmall의 Code39/Code128 바코드가 GTIN 규격이 아닐 수 있음.
GTIN 비호환 바코드는 수동 생성 경로(`manualData`)를 통해 Import 가능.

---

## 2. Firstmall → O4O Product Mapping

### 2.1 필드 매핑 표

| Firstmall 필드 | O4O ProductMaster 필드 | 매핑 방식 | 비고 |
|---------------|----------------------|----------|------|
| 상품명 | `marketing_name` | 직접 매핑 | - |
| 바코드 | `barcode` | GTIN 변환 | GTIN 비호환 시 수동 생성 |
| 브랜드 | `brand_name` | 직접 매핑 | nullable |
| 제조사 | `manufacturer_name` | 직접 매핑 | NOT NULL, 필수 |
| 카테고리 | `regulatory_type` | 매핑 테이블 필요 | default 'UNKNOWN' |
| - | `regulatory_name` | **수동 입력 필요** | NOT NULL, 필수 |
| - | `mfds_product_id` | barcode 대체 사용 | 수동 생성 시 |

### 2.2 SupplierProductOffer 매핑

| Firstmall 필드 | O4O Offer 필드 | 매핑 방식 |
|---------------|---------------|----------|
| 판매가 | `price_general` | 직접 매핑 (INT, KRW) |
| - | `distribution_type` | 기본값 PRIVATE |
| - | `approval_status` | 기본값 PENDING |

### 2.3 매핑 경로

```
Firstmall Excel Export
    ↓ (엑셀 → CSV 변환)
CSV File
    ↓ (O4O CSV Import Pipeline)
    ├ barcode → ProductMaster 조회/생성
    ├ 가격 → SupplierProductOffer UPSERT
    └ 이미지 → (별도 처리 필요)
```

---

## 3. 이미지 Import 구조

### 3.1 현재 이미지 인프라

| 구성요소 | 상태 | 파일 |
|---------|------|------|
| Multer 업로드 | **구현됨** | `apps/api-server/src/middleware/upload.middleware.ts` |
| Sharp 이미지 처리 | **구현됨** | mediaUploadController.ts |
| URL → Buffer 다운로드 | **구현됨** | `apps/api-server/src/services/pop-generator.service.ts` |
| 클라우드 스토리지 (GCS/S3) | **미구현** | - |
| 로컬 파일 저장 | **구현됨** | `/public/uploads/` |

### 3.2 상품 이미지 저장 구조

```typescript
// GlycopharmProduct 이미지 구조
interface GlycopharmProductImage {
  url: string;        // 이미지 URL
  alt?: string;       // 대체 텍스트
  is_primary: boolean; // 대표 이미지 여부
  order?: number;     // 정렬 순서
}

// DB 저장: JSONB 배열
@Column({ type: 'jsonb', nullable: true })
images?: GlycopharmProductImage[];
```

### 3.3 이미지 Import 가능성

| 방식 | 가능 여부 | 설명 |
|------|----------|------|
| URL 참조 저장 | **가능** | Firstmall 이미지 URL을 그대로 JSONB에 저장 |
| URL 다운로드 + 로컬 저장 | **가능** | axios fetch → `/public/uploads/` |
| URL 다운로드 + 클라우드 저장 | **미구현** | GCS/S3 통합 필요 |

**권고**: 초기에는 Firstmall 이미지 URL을 직접 참조하고,
향후 클라우드 스토리지 구축 후 이미지 마이그레이션.

### 3.4 ProductMaster 이미지 필드

**현재 ProductMaster에 이미지 컬럼이 없음.**

이미지는 도메인별 상품 엔티티(glycopharm_products, store_local_products 등)에만 존재.
ProductMaster에 이미지를 추가하려면 마이그레이션 필요.

대안: `store_product_profiles` 테이블 활용 (organization별 커스텀 표시).

---

## 4. CSV Import 기반 Import 가능성

### 4.1 기존 CSV Import Pipeline

> IR-O4O-PRODUCT-CATALOG-AUDIT-V1 Section 5 참조

**이미 구현된 Pipeline:**

```
POST /api/v1/neture/supplier/csv-import/upload → 검증
POST /api/v1/neture/supplier/csv-import/batches/:id/apply → 적용
```

### 4.2 CSV 허용 컬럼

```
barcode            (필수, GTIN)
supplier_sku       (선택)
supply_price       (선택, 정수 KRW)
distribution_type  (선택, PUBLIC/SERVICE/PRIVATE)
```

### 4.3 Firstmall Excel → CSV 변환

Firstmall Excel Export → CSV 변환 시 다음 매핑 필요:

| Firstmall 컬럼 | CSV 컬럼 | 변환 |
|---------------|----------|------|
| 바코드 | `barcode` | GTIN 포맷 검증 |
| 상품코드 | `supplier_sku` | 직접 매핑 |
| 판매가 | `supply_price` | 정수 변환 |
| - | `distribution_type` | 기본값 'PRIVATE' |

### 4.4 GTIN 비호환 바코드 처리

Firstmall 바코드가 GTIN 포맷이 아닌 경우:

**옵션 A**: CSV Import 전 수동 ProductMaster 생성
```
POST /api/v1/neture/admin/masters/resolve
  { barcode: "GTIN바코드", manualData: { ... } }
```

**옵션 B**: CSV Import Pipeline에 `manualData` 옵션 추가 (코드 수정 필요)

**옵션 C**: GTIN 비호환 바코드를 EAN-13으로 재생성

---

## 5. Product Master 수동 생성 경로

### 5.1 Admin API: `/admin/masters/resolve`

**파일**: `apps/api-server/src/modules/neture/neture.routes.ts` (line 570-592)
**서비스**: `apps/api-server/src/modules/neture/neture.service.ts` (line 1500-1567)

```
POST /api/v1/neture/admin/masters/resolve
Auth: requireAuth + requireNetureScope('neture:admin')

Request:
{
  barcode: "8801234567890",           // GTIN
  manualData: {                       // MFDS 스텁 우회용
    regulatoryName: "상품공식명",      // 필수
    manufacturerName: "제조사",        // 필수
    regulatoryType: "건강기능식품",     // 선택
    marketingName: "마케팅명",         // 선택
    mfdsPermitNumber: null            // 선택
  }
}
```

### 5.2 3단계 Resolution Pipeline

```
1. GTIN 검증 → validateGtin(barcode)
2. 기존 Master 조회 → findOne({ barcode })
   ├ 존재: 기존 Master 반환
   └ 미존재: 다음 단계
3. MFDS 검증 시도 → verifyProductByBarcode()
   ├ 성공: MFDS 데이터로 Master 생성 (isMfdsVerified=true)
   └ 실패: manualData 확인
       ├ manualData 존재: 수동 Master 생성 (isMfdsVerified=false)
       └ manualData 없음: 오류 반환
```

**핵심**: `manualData` 옵션으로 MFDS 스텁을 우회하여 수동 ProductMaster 생성 가능.

### 5.3 Admin UI

**파일**: `services/web-neture/src/pages/admin/AdminMasterManagementPage.tsx`

- "신규 등록" 버튼으로 수동 등록 가능
- 바코드, 마케팅명, 브랜드명 입력
- `resolveMaster()` API 호출

---

## 6. Supplier Product 연결 구조

> IR-O4O-PRODUCT-CATALOG-AUDIT-V1 Section 3 참조

### 6.1 Firstmall → Supplier 구조

대표님 Firstmall을 O4O Supplier로 등록하면:

```
NetureSupplier (대표님 쇼핑몰)
  slug: "firstmall-store"
  status: ACTIVE
    │
    ├──< SupplierProductOffer
    │     master_id → ProductMaster (barcode 기반)
    │     supplier_id → 대표님 Supplier
    │     price_general → Firstmall 판매가
    │     distribution_type → PRIVATE
    │
    └── 향후: 다른 공급자도 동일 구조로 추가
```

### 6.2 Listing Flow

```
SupplierProductOffer (공급)
    ↓ ProductApproval (승인)
    ↓ OrganizationProductListing (약국 진열)
    ↓ OrganizationProductChannel (채널 배포)
    ↓ 소비자 구매
```

---

## 7. Barcode 정책

> IR-O4O-PRODUCT-CATALOG-AUDIT-V1 Section 2 참조

**추가 확인 사항**: Firstmall 바코드 호환성

| Firstmall | O4O | 호환 |
|-----------|-----|------|
| Code39 바코드 | GTIN (8/12/13/14) | **부분 호환** |
| Code128 바코드 | GTIN (8/12/13/14) | **부분 호환** |
| EAN-13 (국제 표준) | GTIN-13 | **완전 호환** |

**실무**: Firstmall에서 EAN-13 바코드를 사용하는 상품은 직접 Import 가능.
Code39/Code128 자체 생성 바코드는 GTIN 변환 또는 수동 Master 생성 필요.

---

## 8. Barcode 충돌 처리

> IR-O4O-PRODUCT-CATALOG-AUDIT-V1 Section 6 참조

Firstmall Import 시 추가 고려사항:

| 시나리오 | 처리 |
|---------|------|
| Firstmall barcode가 이미 ProductMaster에 존재 | LINK_EXISTING (기존 연결) |
| Firstmall barcode가 새로운 GTIN | CREATE_MASTER (manualData) |
| Firstmall barcode가 GTIN 비호환 | 수동 Master 생성 후 CSV Import |

---

## 9. Product Group 존재 여부

> IR-O4O-PRODUCT-CATALOG-AUDIT-V1 Section 4 참조

전용 Product Group 없음. Firstmall 카테고리는 다음으로 매핑:
- `regulatory_type` (ProductMaster)
- `service_key` (OrganizationProductListing)

---

## 10. Import → Supplier Service 확장 가능성

### 10.1 확장 로드맵

```
Phase 1: Firstmall Import (수동)
  대표님 Firstmall 상품 → Excel Export → CSV 변환 → O4O CSV Import
  ├ 대표님 = NetureSupplier (ACTIVE)
  ├ 상품 = ProductMaster (manualData)
  └ 오퍼 = SupplierProductOffer (PRIVATE)

Phase 2: 일반 공급자 서비스
  외부 공급자 → NetureSupplier 등록 → CSV Upload → 자동 Import
  ├ 공급자 = NetureSupplier (PENDING → ACTIVE)
  ├ 상품 = ProductMaster (MFDS 연동 시 자동 검증)
  └ 오퍼 = SupplierProductOffer (PENDING → APPROVED)

Phase 3: POS/Barcode 통합
  약국 POS → Barcode Scan → ProductMaster Lookup → 판매
  ├ POS Barcode Lookup API 추가
  ├ Checkout barcode 지원
  └ 매출 리포트 연동
```

### 10.2 현재 구현 상태 vs 필요 작업

| 항목 | 현재 상태 | Phase 1 필요 작업 |
|------|----------|-----------------|
| NetureSupplier CRUD | **구현됨** | 대표님 Supplier 등록 |
| CSV Import Pipeline | **구현됨** | Firstmall Excel → CSV 변환 도구 |
| ProductMaster 수동 생성 | **구현됨** | GTIN 비호환 상품 사전 등록 |
| SupplierProductOffer UPSERT | **구현됨** | - |
| ProductApproval | **구현됨** | 자동 승인 또는 Admin 승인 |
| OrganizationProductListing | **구현됨** | 약국 진열 설정 |
| Image Import | **부분 구현** | URL 참조 저장 |
| MFDS 연동 | **스텁** | Phase 2에서 해결 |
| POS Barcode Lookup | **미구현** | Phase 3에서 해결 |

### 10.3 Phase 1 최소 구현 범위

**코드 수정 없이 가능한 것:**
1. 대표님을 NetureSupplier로 등록 (Admin UI)
2. Firstmall Excel → CSV 수동 변환
3. `/admin/masters/resolve` API로 ProductMaster 사전 등록
4. CSV Import Pipeline으로 Offer 생성

**코드 수정이 필요한 것:**
1. Firstmall Excel → O4O CSV 자동 변환 도구
2. ProductMaster 이미지 필드 추가 (선택)
3. 일괄 `manualData` 처리 (CSV에서 GTIN 비호환 바코드 자동 처리)

---

## 11. 위험 요소

### RISK-1: Firstmall 바코드 포맷 (MEDIUM)

Firstmall이 Code39/Code128 자체 생성 바코드를 사용하는 경우
GTIN 검증 실패. 수동 Master 생성 경로로 우회 가능하나 일괄 처리 시 추가 도구 필요.

**완화**: 대표님 Firstmall에서 실제 엑셀 Export 후 바코드 포맷 확인 필요.

### RISK-2: 이미지 영속성 (LOW)

Firstmall 이미지 URL 직접 참조 시, Firstmall 서비스 변경/종료 시 이미지 유실 가능.

**완화**: Phase 2에서 클라우드 스토리지 구축 후 이미지 복사.

### RISK-3: 상품 옵션 미지원 (LOW)

Firstmall의 색상/사이즈 옵션은 O4O ProductMaster에서 지원하지 않음.
ProductMaster는 1 barcode = 1 physical product 원칙.

**완화**: 옵션별 별도 ProductMaster 생성 또는 Phase 2에서 옵션 구조 추가.

---

## 12. 결론 및 권고

### Firstmall → O4O Import: **가능**

핵심 인프라가 이미 구현되어 있으며, Phase 1은 **코드 수정 최소화**로 진행 가능.

### 즉시 실행 가능한 다음 단계

1. **대표님 Firstmall에서 상품 Excel Export** → 실제 필드/바코드 포맷 확인
2. **대표님을 NetureSupplier로 등록** (Admin UI)
3. **테스트 상품 1~2건 수동 Import** (`/admin/masters/resolve` → CSV Import)
4. **결과 검증 후 일괄 Import 도구 제작** 여부 결정

### Phase 1 완료 시 달성되는 것

```
대표님 Firstmall 상품 → O4O Product Catalog
  → 약국 진열 (OrganizationProductListing)
  → 채널 배포 (B2C, Tablet, Signage)
  → POS 판매 (Phase 3)
```

---

*Investigation completed: 2026-03-06*
*Investigator: Claude Code (AI)*
*No code modifications were made during this audit.*

Sources:
- [Firstmall 주요기능 > 상품관리](https://www.firstmall.kr/functions/category/4)
- [Firstmall 매뉴얼](http://m.gmanual.firstmall.kr/manual/view?category=004100010007)
- [Firstmall FAQ](https://www.firstmall.kr/customer/faq/248)

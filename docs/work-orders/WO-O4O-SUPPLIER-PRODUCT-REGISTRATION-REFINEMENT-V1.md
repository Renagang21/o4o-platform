# WO-O4O-SUPPLIER-PRODUCT-REGISTRATION-REFINEMENT-V1

> **Status**: Approved
> **Date**: 2026-03-16
> **Type**: Work Order — 기능 보완 (구조 변경 없음)
> **기준 문서**: IR-O4O-SUPPLIER-PRODUCT-REGISTRATION-AUDIT-V1

---

## 1. 작업 목적

공급자 상품 등록 시스템은 다음 구조로 안정적으로 동작하고 있다.

```
ProductMaster → SupplierProductOffer → OrganizationProductListing
```

따라서 본 작업의 목적은 **구조 변경이 아니라 운영 기능 보완**이다.

개선 대상:
- MFDS Barcode 검증
- CSV Import 기능 보완
- Store Library UX 개선
- Import 코드 중복 정리

---

## 2. 작업 범위

| 대상 | 범위 |
|------|------|
| 서비스 | api-server, web-neture |
| 기능 | 상품 등록, 상품 Import, 상품 이미지 처리, 매장 상품 선택 |

---

## 3. 작업 항목

### 3.1 MFDS Barcode Verification 연동

**현재 상태**: `verifyProductByBarcode()` → Stub 구현 (항상 unverified)

**문제**: ProductMaster 자동 생성 불가, 모든 Master가 수동 입력 의존

**작업**: MFDS API 실제 연동

| 항목 | 내용 |
|------|------|
| 대상 함수 | `verifyProductByBarcode()` |
| 동작 | barcode → MFDS 데이터 조회 → 성공 시 Master 자동 생성 |
| 적용 데이터 | regulatoryName, manufacturerName, brand, category |
| 대상 파일 | `mfds.service.ts`, `neture.service.ts` |

---

### 3.2 CSV Import 이미지 지원

**현재 상태**: CSV Import에 이미지 컬럼 없음

**작업**: CSV에 `image_url` 컬럼 추가

```
image_url → fetch → ImageStorageService.uploadImage() → product_images INSERT
```

Catalog Import 이미지 파이프라인 재사용.

| 항목 | 내용 |
|------|------|
| 추가 컬럼 | `image_url` |
| 처리 방식 | Catalog Import 이미지 파이프라인 재사용 (fire-and-forget) |
| 대상 파일 | `csv-import.service.ts` |

---

### 3.3 CSV Import Manual Master 생성 지원

**현재 상태**: CSV Import → MFDS 검증 제품만 Master 생성 가능

**문제**: MFDS 미등록 제품은 CSV Import 불가

**작업**: CSV에 manualData 컬럼 추가

| 추가 컬럼 | 용도 |
|-----------|------|
| `regulatory_name` | 식약처 등록명 |
| `manufacturer_name` | 제조사명 |
| `brand` | 브랜드명 |

처리 흐름:
```
MFDS 검증 실패 → manualData 존재 확인 → ProductMaster 생성 (isMfdsVerified=false)
```

---

### 3.4 Store Product Library UX 개선

**현재 문제**: 매장 Offer 선택 시 설명/가격 tier 미표시

**작업**: Store Library API + 프론트엔드 확장

| 추가 필드 | 용도 |
|-----------|------|
| `consumerShortDescription` | B2C 설명 미리보기 |
| `businessShortDescription` | B2B 설명 미리보기 |
| `priceGeneral` / `priceGold` / `pricePlatinum` | 가격 tier 표시 |
| `brandName` | 브랜드 정보 |

대상 파일:
- `store-product-library.controller.ts` (API 확장)
- `StoreProductLibraryPage.tsx` (Offer 모달 보강)

---

### 3.5 Import 서비스 코드 정리

**현재**: CSV Import와 Catalog Import에 동일한 Offer 생성 SQL 중복

**작업**: 공통 서비스 추출

```
product-import-common.service.ts
├─ upsertSupplierOffer()
├─ resolveOrCreateMaster()
└─ processImportImages()
```

---

## 4. 비작업 항목 (Out of Scope)

| 항목 | 사유 |
|------|------|
| ProductMaster 구조 변경 | SSOT 안정 상태 |
| SupplierOffer 구조 변경 | Frozen (Distribution Engine) |
| 이미지 소유 구조 변경 | Master 단위 유지 |
| B2B/B2C 데이터 구조 변경 | 통합 구조 유지 |

---

## 5. 구현 순서

| 순서 | 작업 | 의존성 |
|:----:|------|--------|
| 1 | MFDS API 연동 (3.1) | 없음 |
| 2 | CSV Import 이미지 지원 (3.2) | 없음 |
| 3 | CSV Import manualData 지원 (3.3) | 3.1 (MFDS 폴백) |
| 4 | Store Library UX 개선 (3.4) | 없음 |
| 5 | Import 서비스 공통화 (3.5) | 3.2, 3.3 완료 후 |

---

## 6. 완료 기준

| # | 기준 |
|:-:|------|
| 1 | MFDS Barcode 조회 정상 동작 |
| 2 | CSV Import 이미지 등록 가능 |
| 3 | CSV Import MFDS 미등록 제품 등록 가능 |
| 4 | Store Library에서 Offer 설명/가격 tier 표시 |
| 5 | Import 서비스 중복 코드 제거 |

---

*Created: 2026-03-16*
*Status: Approved*

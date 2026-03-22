# IR-O4O-NETURE-PRODUCT-IMPORT-CLEANUP-AUDIT-V1

> **조사 전용** — 코드 수정 없음
> **날짜**: 2026-03-22

---

## 1. FirstMall 제거 대상

### 완전 제거 가능 (프로덕션 영향 ZERO)

| # | 파일 | 역할 | 제거 영향 |
|---|------|------|----------|
| 1 | `tools/firstmall-converter/` (7개 파일) | CLI 도구 — FirstMall Excel → O4O CSV 변환 | 없음 (독립 도구) |
| 2 | `services/web-neture/src/pages/admin/catalog-import/FirstmallImportPage.tsx` | FirstMall Excel 업로드 3단계 위자드 | UI 제거 |
| 3 | `services/web-neture/src/App.tsx` line 308, 704 | FirstMall 라우트 2개 | 라우트 제거 |
| 4 | `CatalogImportDashboardPage.tsx` line 20-23 | FirstMall Import 카드 | UI 카드 제거 |

### 조건부 제거 (FirstMall Excel 임포트 폐기 시)

| # | 파일 | 역할 | 비고 |
|---|------|------|------|
| 5 | `catalog-import/extensions/firstmall/firstmall-parser.extension.ts` | FirstMall Excel → NormalizedProduct[] 파서 | EXTENSION_REGISTRY에서 제거 필요 |

### 유지 필수 (공유 의존)

| # | 파일 | 이유 |
|---|------|------|
| 6 | `csv-import.service.ts` | CSV + Catalog Import 양쪽에서 사용 |
| 7 | `product-import-common.service.ts` | Offer upsert, Brand, Image, AI 공통 파이프라인 |
| 8 | `catalog-import.service.ts` | 메인 오케스트레이터 (CSV 플로우도 사용) |

---

## 2. CSV 구조

### 현재 컬럼 (csv-import.service.ts line 40-57)

| # | 컬럼 | Required | 저장 대상 | 상태 |
|---|------|:--------:|----------|:----:|
| 1 | **barcode** | YES | ProductMaster.barcode | ACTIVE |
| 2 | **marketing_name** | NO* | ProductMaster.marketingName | ACTIVE |
| 3 | **regulatory_name** | NO | ProductMaster.regulatoryName | ACTIVE |
| 4 | **supply_price** | YES | Offer.priceGeneral | ACTIVE |
| 5 | **distribution_type** | NO | Offer.distributionType (default: PRIVATE) | ACTIVE |
| 6 | **manufacturer_name** | NO | ProductMaster.manufacturerName | ACTIVE |
| 7 | **brand** | NO | Brand lookup/create → Master.brandId | ACTIVE |
| 8 | **image_url** | NO | ProductImage (GCS 업로드) | ACTIVE |
| 9 | **consumer_short_description** | NO | Offer.consumerShortDescription | ACTIVE |
| 10 | **msrp** | NO | Offer.consumerReferencePrice | ACTIVE |
| 11 | **stock_qty** | NO | Offer.stockQuantity | ACTIVE |
| 12 | **supplier_sku** | NO | 메타데이터만 (FirstMall 미매핑) | REFERENCE_ONLY |

> `*` marketing_name 또는 regulatory_name 중 하나 필수

### 판정

- **제거 후보**: `supplier_sku` — FirstMall에서도 매핑 안 됨, 메타데이터 전용
- **나머지 10개**: 모두 ACTIVE, CSV + FirstMall 동일 템플릿 사용
- **FirstMall 전용 필드**: 없음 (FirstMall 파서가 내부적으로 변환 후 동일 컬럼으로 출력)

---

## 3. B2B/B2C 구조

### 현재 방식: **엔티티 내 병렬 필드** (레코드 복제 아님)

`SupplierProductOffer` 하나에 B2B/B2C 필드가 공존:

```
설명: consumerShortDescription / consumerDetailDescription  (B2C)
      businessShortDescription / businessDetailDescription  (B2B)
가격: priceGeneral / priceGold / pricePlatinum              (B2B 티어)
      consumerReferencePrice                                 (B2C 참고가)
```

### 핵심 답변

> **B. lazy fallback도 아니고 A. 생성 시 복제도 아님**
> → **단일 레코드에 양쪽 필드가 optional로 공존** (설계 의도)

### 문제점

| 문제 | 설명 |
|------|------|
| 필드 팽창 | 설명 4개 + 가격 4개 = 8개 필드가 모두 optional |
| 불완전 데이터 | B2C만 입력, B2B는 null인 Offer 가능 |
| CSV 임포트 | `consumer_short_description`만 채움 → B2B 설명 항상 null |
| validation 부재 | distributionType에 따른 필수 필드 강제 없음 |

### 제거 필요 여부: **NO** (구조 변경 아닌 validation 강화 필요)

---

## 4. 개별 등록

### 현재 입력 구조

**엔드포인트**: `POST /supplier/products`
**파일**: `supplier-product.controller.ts` lines 25-48

| 파라미터 | 필수 | 비고 |
|---------|:----:|------|
| barcode | YES | GTIN 검증 |
| distributionType | NO | default PRIVATE |
| manualData | NO | Master 메타데이터 (regulatoryName, manufacturerName 등) |
| priceGeneral | NO | default 0 |
| priceGold | NO | nullable |
| pricePlatinum | NO | nullable |
| consumerReferencePrice | NO | nullable |
| consumerShortDescription | NO | B2C 간이 |
| consumerDetailDescription | NO | B2C 상세 |
| businessShortDescription | NO | B2B 간이 |
| businessDetailDescription | NO | B2B 상세 |

### 문제

1. **11개 파라미터 flat 전달** — 구조화 안 됨
2. **모든 필드 optional** — 빈 Offer 생성 가능 (barcode + price 0만으로)
3. **distributionType별 validation 없음** — PUBLIC인데 B2C 설명 없어도 통과

### 단순화 가능 여부: **YES** (다음 WO에서)

---

## 5. 이미지 구조

### 현재 방식: **별도 엔티티 + GCS 업로드** (정상 구조)

| 항목 | 구현 |
|------|------|
| 테이블 | `product_images` (masterId, imageUrl, gcsPath, sortOrder, isPrimary) |
| 업로드 | Multer → Sharp(1200×1200, WebP 85%) → GCS |
| 버킷 | `o4o-neture-product-images` |
| 경로 | `products/{masterId}/{uuid}.webp` |
| 다중 이미지 | 지원 (sortOrder로 정렬) |
| 대표 이미지 | isPrimary flag |
| CSV 임포트 | image_url → fetch → GCS 업로드 (fire-and-forget) |
| 삭제 | DB + GCS 동시 삭제 |

### 문제: **없음** — 이미지 구조는 정상

---

## 6. 최종 판정

```
CLEANUP_REQUIRED
```

| 영역 | 판정 | 다음 액션 |
|------|------|----------|
| FirstMall | CLEANUP_REQUIRED | 6개 파일 + 1개 디렉토리 제거 |
| CSV 컬럼 | ACTIVE (supplier_sku 제외) | supplier_sku 제거 검토 |
| B2B/B2C | VALIDATION_REQUIRED | distributionType별 필수 필드 강제 |
| 개별 등록 | SIMPLIFICATION_REQUIRED | 구조화된 요청 DTO + validation |
| 이미지 | SAFE | 변경 불필요 |

---

## 알려진 버그

| 버그 | 위치 | 영향 |
|------|------|------|
| 옵션 상품 REJECTED→VALID 덮어쓰기 | CatalogImportValidator.validateRows() | 옵션 상품이 잘못된 VALID 상태로 통과 |
| stock_quantity Admin API 미반환 | admin.controller.ts offer 쿼리 | 저장은 되나 조회 응답에 없음 |
| 이미지 fire-and-forget | csv-import.service.ts line 459-464 | 이미지 실패 시 silent drop |

---

## 다음 단계

이 조사 완료 → 다음 WO 진행 가능:

```
WO-NETURE-PRODUCT-INPUT-SIMPLIFICATION-V1
```

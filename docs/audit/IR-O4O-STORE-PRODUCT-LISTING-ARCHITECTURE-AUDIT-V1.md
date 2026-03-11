# IR-O4O-STORE-PRODUCT-LISTING-ARCHITECTURE-AUDIT-V1

> **Investigation Report — 매장 상품 리스팅 아키텍처 현황 감사**
> Date: 2026-03-11
> Status: READ-ONLY Investigation (코드 변경 없음)

---

## 목차

1. [공급자 상품 구조](#1-공급자-상품-구조)
2. [매장 상품 선택 (Listing Adoption)](#2-매장-상품-선택-listing-adoption)
3. [매장 상품 리스팅 관리](#3-매장-상품-리스팅-관리)
4. [로컬 상품 (Display Domain)](#4-로컬-상품-display-domain)
5. [서비스 연동 현황](#5-서비스-연동-현황)
6. [B2C 스토어프론트 연결](#6-b2c-스토어프론트-연결)
7. [태블릿·POP·QR 연동](#7-태블릿popqr-연동)
8. [AI 콘텐츠 엔진](#8-ai-콘텐츠-엔진)
9. [구현 상태 종합 평가](#9-구현-상태-종합-평가)

---

## 1. 공급자 상품 구조

### 상태: ✅ OK

### 1.1 ProductMaster (SSOT)

| 항목 | 값 |
|------|------|
| 엔티티 | `ProductMaster` |
| 테이블 | `product_masters` |
| 위치 | `apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts` |
| 역할 | 상품 마스터 데이터 (Single Source of Truth) |

**핵심 컬럼:**

| 컬럼 | 타입 | 설명 | 불변 |
|------|------|------|:----:|
| `id` | uuid PK | 자동 생성 | - |
| `barcode` | varchar(14) | GTIN, 고유 식별자 | ✅ |
| `regulatory_type` | varchar(50) | 식약처 분류 | ✅ |
| `regulatory_name` | varchar(255) | 식약처 공식명 | ✅ |
| `marketing_name` | varchar(255) | 표시명 | |
| `brand_id` | uuid nullable | FK → Brand | |
| `category_id` | uuid nullable | FK → ProductCategory | |
| `specification` | text nullable | 규격 (예: "500mg × 60정") | |
| `manufacturer_name` | varchar(255) | 제조사명 | ✅ |
| `mfds_permit_number` | varchar(100) nullable | 식약처 허가번호 | ✅ |
| `mfds_product_id` | varchar(100) | 식약처 제품 ID | ✅ |
| `is_mfds_verified` | boolean (default true) | 식약처 검증 여부 | |
| `tags` | jsonb (default []) | 검색/필터 태그 | |

**관계:**
- `→ SupplierProductOffer[]` (OneToMany: offers)
- `→ ProductImage[]` (OneToMany: images)
- `→ ProductCategory` (ManyToOne: category_id)
- `→ Brand` (ManyToOne: brand_id)

**설계 원칙:**
- barcode 기반 고유성 — 동일 바코드의 중복 마스터 금지
- 규제 관련 필드(regulatory_type, regulatory_name, manufacturer_name, mfds_*) 불변
- 상업적 속성(marketing_name, tags)만 변경 가능

### 1.2 SupplierProductOffer (가격·재고·유통)

| 항목 | 값 |
|------|------|
| 엔티티 | `SupplierProductOffer` |
| 테이블 | `supplier_product_offers` |
| 위치 | `apps/api-server/src/modules/neture/entities/SupplierProductOffer.entity.ts` |
| 역할 | 공급자별 가격 책정, 재고 관리, 유통 정책 |

**핵심 컬럼:**

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `master_id` | uuid FK | → ProductMaster |
| `supplier_id` | uuid FK | → NetureSupplier |
| `distribution_type` | enum | `PUBLIC` / `SERVICE` / `PRIVATE` |
| `approval_status` | enum | `PENDING` / `APPROVED` / `REJECTED` |
| `is_active` | boolean | 활성 여부 |
| `price_general` | int | B2B 일반가 |
| `price_gold` | int nullable | B2B 골드 등급가 |
| `price_platinum` | int nullable | B2B 플래티넘 등급가 |
| `consumer_reference_price` | int nullable | 소비자 권장가(RRP) |
| `stock_quantity` | int | 총 재고 |
| `reserved_quantity` | int | 예약 재고 |
| `low_stock_threshold` | int | 부족 알림 기준 |
| `track_inventory` | boolean | false = 무한 재고 모드 |
| `slug` | varchar(160) UNIQUE | SEO 슬러그 |
| `allowed_seller_ids` | text[] nullable | 허용 판매자 UUID 배열 |

**유통 정책 ENUM:**
```
PUBLIC   — 모든 매장 채택 가능
SERVICE  — 특정 서비스 키 범위 내 매장만
PRIVATE  — allowed_seller_ids 목록의 매장만
```

**승인 워크플로우:**
```
PENDING → APPROVED → (판매 가능)
PENDING → REJECTED → (판매 불가)
```

**3단계 가격:**
```
price_platinum > price_gold > price_general
매장의 등급(Tier)에 따라 자동 매칭
```

### 1.3 ProductImage (이미지 관리)

| 항목 | 값 |
|------|------|
| 엔티티 | `ProductImage` |
| 테이블 | `product_images` |
| 위치 | `apps/api-server/src/modules/neture/entities/ProductImage.entity.ts` |

**컬럼:**

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `master_id` | uuid FK | → ProductMaster (CASCADE) |
| `image_url` | text | 공개 URL |
| `gcs_path` | text | GCS 스토리지 경로 |
| `sort_order` | int | 정렬 순서 |
| `is_primary` | boolean | 대표 이미지 플래그 |

**저장소:** Google Cloud Storage (GCS)

---

## 2. 매장 상품 선택 (Listing Adoption)

### 상태: ✅ OK

### 2.1 OrganizationProductListing (매장 채택 레이어)

| 항목 | 값 |
|------|------|
| 엔티티 | `OrganizationProductListing` |
| 테이블 | `organization_product_listings` |
| 위치 | `apps/api-server/src/routes/kpa/entities/organization-product-listing.entity.ts` |
| 역할 | 매장이 공급자 상품을 자기 매장에 등록(채택)하는 레이어 |

**핵심 컬럼:**

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `organization_id` | uuid FK | → OrganizationStore |
| `service_key` | varchar(50) | 서비스 파티션 (default: 'kpa') |
| `master_id` | uuid FK | → ProductMaster |
| `offer_id` | uuid FK | → SupplierProductOffer (CASCADE) |
| `is_active` | boolean | 리스팅 활성 여부 |
| `price` | numeric(12,2) nullable | 매장별 가격 오버라이드 |
| `service_product_id` | uuid nullable | → ServiceProduct (향후 확장용) |

**인덱스:**
- `IDX_org_product_listing_org_id` — organization_id
- `IDX_org_product_listing_active` — is_active

**데이터 흐름:**
```
SupplierProductOffer → [매장 관리자가 채택] → OrganizationProductListing
                                              ↓
                                    (채널별 노출 설정)
                                              ↓
                                    OrganizationProductChannel
```

### 2.2 채택 프로세스

1. **공급자**: ProductMaster 등록 → SupplierProductOffer 생성 (가격/유통 설정)
2. **운영자**: Offer 승인 (approval_status: APPROVED)
3. **매장 관리자**: 승인된 Offer를 자기 매장에 채택 → OrganizationProductListing 생성
4. **매장 관리자**: 채널별 노출 설정 → OrganizationProductChannel 생성
5. **자동**: B2C/KIOSK 채널은 자동 승인, TABLET/SIGNAGE는 별도 승인 필요

---

## 3. 매장 상품 리스팅 관리

### 상태: ✅ OK

### 3.1 OrganizationChannel (채널 관리)

| 항목 | 값 |
|------|------|
| 엔티티 | `OrganizationChannel` |
| 테이블 | `organization_channels` |
| 위치 | `apps/api-server/src/routes/kpa/entities/organization-channel.entity.ts` |
| 역할 | 매장의 판매 채널 등록 및 승인 관리 |

**핵심 컬럼:**

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `organization_id` | uuid FK | → OrganizationStore |
| `channel_type` | enum | `B2C` / `KIOSK` / `TABLET` / `SIGNAGE` |
| `status` | enum | `PENDING` / `APPROVED` / `REJECTED` / `SUSPENDED` / `EXPIRED` / `TERMINATED` |
| `approved_at` | timestamp nullable | 승인 일시 |
| `config` | jsonb | 채널별 설정 |

**채널 타입:**
```
B2C      — 온라인 스토어프론트 (공개 웹)
KIOSK    — 매장 내 키오스크
TABLET   — 태블릿 디바이스
SIGNAGE  — 사이니지 디스플레이
```

**승인 상태 머신:**
```
PENDING → APPROVED → SUSPENDED → APPROVED (복원 가능)
PENDING → REJECTED
APPROVED → EXPIRED
APPROVED → TERMINATED (영구 종료)
```

### 3.2 OrganizationProductChannel (채널별 상품 매핑)

| 항목 | 값 |
|------|------|
| 엔티티 | `OrganizationProductChannel` |
| 테이블 | `organization_product_channels` |
| 위치 | `apps/api-server/src/routes/kpa/entities/organization-product-channel.entity.ts` |
| 역할 | 특정 상품을 특정 채널에 노출하는 매핑 |

**핵심 컬럼:**

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `channel_id` | uuid FK | → OrganizationChannel |
| `product_listing_id` | uuid FK | → OrganizationProductListing |
| `is_active` | boolean | 매핑 활성 여부 |
| `display_order` | int | 노출 순서 |
| `sales_limit` | int nullable | 채널별 판매 한도 |

### 3.3 StoreProductProfile (매장별 커스터마이징)

| 항목 | 값 |
|------|------|
| 엔티티 | `StoreProductProfile` |
| 테이블 | `store_product_profiles` |
| 위치 | `apps/api-server/src/modules/neture/entities/StoreProductProfile.entity.ts` |
| 역할 | 매장별 상품 표시명·설명 오버라이드 + 약사 코멘트 |

**핵심 컬럼:**

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `organization_id` | uuid | 매장 식별자 |
| `master_id` | uuid FK | → ProductMaster |
| `display_name` | varchar(255) nullable | 매장별 표시명 오버라이드 |
| `description` | text nullable | 매장별 설명 오버라이드 |
| `pharmacist_comment` | text nullable | 약사 추천 코멘트 |
| `is_active` | boolean | 활성 여부 |

**제약:** `UNIQUE(organization_id, master_id)` — 매장당 상품 마스터 1개 프로필

---

## 4. 로컬 상품 (Display Domain)

### 상태: ✅ OK

### 4.1 StoreLocalProduct

| 항목 | 값 |
|------|------|
| 엔티티 | `StoreLocalProduct` |
| 테이블 | `store_local_products` |
| 위치 | `apps/api-server/src/routes/platform/entities/store-local-product.entity.ts` |
| 역할 | **Display Domain** — 매장 자체 상품 전시 (Checkout/주문과 연결 금지) |

**핵심 컬럼:**

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `organization_id` | uuid | 멀티테넌트 격리 키 |
| `name` | varchar(200) | 상품명 |
| `description` | text nullable | 설명 |
| `images` | jsonb (default []) | 이미지 URL 배열 |
| `category` | varchar(100) nullable | 카테고리 |
| `price_display` | numeric(12,2) nullable | **표시 가격 (상거래 가격 아님)** |
| `is_active` | boolean | 활성 여부 |
| `sort_order` | int | 정렬 순서 |
| `summary` | text nullable | 요약 |
| `detail_html` | text nullable | HTML 상세 (목록 쿼리에서 제외) |
| `usage_info` | text nullable | 사용법 (목록 쿼리에서 제외) |
| `caution_info` | text nullable | 주의사항 (목록 쿼리에서 제외) |
| `thumbnail_url` | varchar(500) nullable | 썸네일 |
| `gallery_images` | jsonb (default []) | 갤러리 이미지 |
| `badge_type` | enum | `none` / `new` / `recommend` / `event` |
| `highlight_flag` | boolean | 하이라이트 표시 |

**인덱스:**
- `IDX_store_local_products_org` — organization_id
- `IDX_store_local_products_org_active` — (organizationId, isActive)

**핵심 설계 원칙:**
```
⚠️  Display Domain ONLY
- CheckoutOrder / EcommerceOrder와 연결 금지
- 가격은 "표시용"이며 결제에 사용되지 않음
- B2C 스토어프론트에서 별도 섹션으로 표시
- Commerce 상품과 DB UNION 금지 — 앱 레이어에서 병합
```

---

## 5. 서비스 연동 현황

### 상태: ✅ OK

### 5.1 채널 실행 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                    Product Flow                              │
│                                                              │
│  ProductMaster ──→ SupplierProductOffer ──→ OrgProductListing│
│       │                    │                      │          │
│       ▼                    ▼                      ▼          │
│  ProductImage         가격/재고/유통          채널 매핑        │
│  ProductAiContent     승인 상태              OrgProductChannel│
│                                                   │          │
│                                          ┌────────┴────────┐ │
│                                          ▼        ▼        ▼ │
│                                        B2C    TABLET   SIGNAGE│
│                                                              │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
│                                                              │
│  StoreLocalProduct ──→ B2C (별도 섹션, UNION 금지)            │
│  StoreProductProfile ──→ 매장별 표시명/설명 오버라이드          │
│  ProductMarketingAsset ──→ QR/POP/사이니지 에셋 연결           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 ProductMarketingAsset (에셋 연결)

| 항목 | 값 |
|------|------|
| 엔티티 | `ProductMarketingAsset` |
| 테이블 | `product_marketing_assets` |
| 위치 | `apps/api-server/src/routes/platform/entities/product-marketing-asset.entity.ts` |
| 역할 | 상품과 마케팅 에셋(QR, POP, 라이브러리, 사이니지) 간 다형성 연결 |

**핵심 컬럼:**

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `organization_id` | uuid | 멀티테넌트 격리 |
| `product_id` | uuid | 상품 참조 (SupplierProductOffer 또는 로컬) |
| `asset_type` | varchar(50) | `qr` / `pop` / `library` / `signage` |
| `asset_id` | uuid | 대상 에셋 레코드 FK |

**인덱스:**
- `IDX_pma_org_product` — (organizationId, productId)
- `IDX_pma_org_asset` — (organizationId, assetType, assetId)
- `UQ_pma_product_asset` — UNIQUE (productId, assetType, assetId)

**설계:** FK 데코레이터 없는 다형성 링크. `asset_type`이 대상 테이블을 식별:
```
qr       → QR 코드 에셋
pop      → POP 인쇄물 에셋
library  → 자료실 에셋
signage  → 사이니지 콘텐츠 에셋
```

---

## 6. B2C 스토어프론트 연결

### 상태: ⚠️ PARTIAL (KPA 슬러그 미등록)

### 6.1 스토어 슬러그 시스템

| 항목 | 값 |
|------|------|
| 테이블 | `platform_store_slugs` |
| 위치 | 마이그레이션 정의 (`1771200000000-CreatePlatformStoreSlugsTables.ts`) |
| 역할 | 플랫폼 전체 고유 스토어 URL 슬러그 관리 |

**컬럼:**

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `slug` | varchar(120) UNIQUE | 플랫폼 전체 고유 슬러그 |
| `store_id` | uuid | 매장 PK |
| `service_key` | varchar(50) | 서비스 키 |
| `is_active` | boolean | 활성 여부 |

**슬러그 이력 테이블:** `platform_store_slug_history` (변경 추적)

**URL 패턴:** `/store/{slug}` → 슬러그로 `(store_id, service_key)` 결정 → 상품 조회

### 6.2 B2C Visibility Gate (4중 + 2중 = 6중 게이트)

**파일:** `apps/api-server/src/routes/platform/unified-store-public.routes.ts`
**엔드포인트:** `GET /api/v1/stores/:slug/products`

```sql
FROM supplier_product_offers spo
JOIN product_masters pm ON pm.id = spo.master_id
JOIN neture_suppliers s ON s.id = spo.supplier_id
INNER JOIN organization_product_listings opl
  ON opl.offer_id = spo.id
  AND opl.organization_id = $1           -- Boundary: 매장 격리
  AND opl.service_key = ANY($2::text[])  -- Boundary: 서비스 키 격리
  AND opl.is_active = true               -- Gate 1: 리스팅 활성
INNER JOIN organization_product_channels opc
  ON opc.product_listing_id = opl.id
  AND opc.is_active = true               -- Gate 2: 채널 매핑 활성
INNER JOIN organization_channels oc
  ON oc.id = opc.channel_id
  AND oc.channel_type = 'B2C'           -- Gate 3: B2C 채널 타입
  AND oc.status = 'APPROVED'            -- Gate 4: 채널 승인 상태
WHERE spo.is_active = true              -- Gate 5: 오퍼 활성
  AND s.status = 'ACTIVE'              -- Gate 6: 공급자 활성
```

**가시성 게이트 정리:**

| # | 게이트 | 테이블 | 조건 |
|---|--------|--------|------|
| 1 | 리스팅 활성 | `organization_product_listings` | `is_active = true` |
| 2 | 채널 매핑 활성 | `organization_product_channels` | `is_active = true` |
| 3 | 채널 타입 | `organization_channels` | `channel_type = 'B2C'` |
| 4 | 채널 승인 | `organization_channels` | `status = 'APPROVED'` |
| 5 | 오퍼 활성 | `supplier_product_offers` | `is_active = true` |
| 6 | 공급자 활성 | `neture_suppliers` | `status = 'ACTIVE'` |

**캐싱:** SHA1 키 기반 `cacheAside()`, `READ_CACHE_TTL.STOREFRONT` TTL

### 6.3 KPA 슬러그 갭 (Critical Gap)

```
⚠️  CRITICAL GAP
KPA 매장들이 platform_store_slugs 테이블에 미등록
→ B2C 스토어프론트 접근 시 404 반환
→ 상품 리스팅이 존재해도 공개 접근 불가
```

**영향:** KPA 서비스의 모든 매장 공개 B2C 스토어프론트 불가
**원인:** KPA 매장 생성/승인 워크플로우에 슬러그 자동 등록 미구현
**해결 방안:** KPA OrganizationStore 생성/승인 시 `platform_store_slugs` 자동 삽입 로직 추가

---

## 7. 태블릿·POP·QR 연동

### 상태: ✅ OK

### 7.1 태블릿 (TABLET)

- **채널 타입:** `organization_channels.channel_type = 'TABLET'`
- **동일 게이트 구조:** B2C와 동일한 6중 가시성 게이트, `channel_type = 'TABLET'` 조건만 차이
- **별도 승인:** B2C/KIOSK와 달리 수동 승인 필요

### 7.2 POP (Point of Purchase)

- **AI 콘텐츠 연동:** `product_ai_contents.content_type = 'pop_short'` / `'pop_long'`
- **에셋 연결:** `product_marketing_assets.asset_type = 'pop'`
- **용도:** 매장 내 인쇄물, 상품 진열대 홍보물

### 7.3 QR 코드

- **AI 콘텐츠 연동:** `product_ai_contents.content_type = 'qr_description'`
- **에셋 연결:** `product_marketing_assets.asset_type = 'qr'`
- **용도:** 상품 QR 스캔 시 표시되는 설명 콘텐츠

### 7.4 사이니지 (SIGNAGE)

- **채널 타입:** `organization_channels.channel_type = 'SIGNAGE'`
- **AI 콘텐츠 연동:** `product_ai_contents.content_type = 'signage_text'`
- **에셋 연결:** `product_marketing_assets.asset_type = 'signage'`
- **Core Signage API:** `/api/signage/:serviceKey/` (별도 시스템, Operator Console에서 관리)

---

## 8. AI 콘텐츠 엔진

### 상태: ✅ OK

### 8.1 ProductAiContent

| 항목 | 값 |
|------|------|
| 엔티티 | `ProductAiContent` |
| 테이블 | `product_ai_contents` |
| 위치 | `apps/api-server/src/modules/store-ai/entities/product-ai-content.entity.ts` |
| 역할 | AI 생성 상품 콘텐츠 저장 (5가지 타입) |

**핵심 컬럼:**

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `product_id` | uuid | SupplierProductOffer.id 참조 (FK 데코레이터 없음) |
| `content_type` | varchar(50) | 콘텐츠 유형 |
| `content` | text | AI 생성 텍스트 |
| `model` | varchar(100) nullable | 사용된 LLM 모델명 |

**인덱스:**
- `IDX_product_ai_contents_product` — productId
- `IDX_product_ai_contents_type` — (productId, contentType) 복합

### 8.2 콘텐츠 타입 (5종)

| 타입 | 용도 | 설명 |
|------|------|------|
| `product_description` | B2C 스토어 | 상품 상세 설명 |
| `pop_short` | POP 인쇄물 | 짧은 홍보 문구 |
| `pop_long` | POP 인쇄물 | 상세 홍보 문구 |
| `qr_description` | QR 스캔 | QR 코드 스캔 시 설명 |
| `signage_text` | 사이니지 | 사이니지 디스플레이 텍스트 |

### 8.3 AI 생성 서비스

| 항목 | 값 |
|------|------|
| 서비스 | `ProductAiContentService` |
| 위치 | `apps/api-server/src/modules/store-ai/services/product-ai-content.service.ts` |
| LLM | Gemini 3.0 Flash (`@o4o/ai-core` → `GeminiProvider`) |

**입력 데이터 (ProductContentInput):**
- regulatoryName, marketingName, specification
- categoryName, brandName, manufacturerName
- tags, ocrText (처음 500자)

**동작:**
- 5가지 콘텐츠 타입별 전용 프롬프트
- Upsert 로직: 동일 (product_id, content_type)이면 교체
- 재시도: 2회, 2초 딜레이
- Fire-and-forget: 실패해도 상품 데이터에 영향 없음
- API 키 해석: `ai_settings` 테이블 우선 → `GEMINI_API_KEY` 환경변수 폴백

### 8.4 OCR 통합

- ocrText가 제공되면 LLM 프롬프트에 첫 500자 추가
- 상품 이미지의 텍스트 인식 결과를 AI 콘텐츠 생성에 활용

---

## 9. 구현 상태 종합 평가

### 9.1 영역별 평가

| # | 영역 | 상태 | 설명 |
|---|------|:----:|------|
| 1 | 공급자 상품 구조 | ✅ OK | ProductMaster SSOT + SupplierProductOffer 3단계 가격 + ProductImage GCS 저장 |
| 2 | 매장 상품 채택 | ✅ OK | OrganizationProductListing 채택 레이어 완비 |
| 3 | 채널 실행 | ✅ OK | 4종 채널(B2C/KIOSK/TABLET/SIGNAGE) + 6단계 승인 상태 머신 |
| 4 | 로컬 상품 | ✅ OK | StoreLocalProduct Display Domain 분리 원칙 준수 |
| 5 | B2C 스토어프론트 | ⚠️ PARTIAL | 6중 가시성 게이트 구현 완료, **KPA 슬러그 미등록 갭** |
| 6 | 매장별 커스터마이징 | ✅ OK | StoreProductProfile 오버라이드 + 약사 코멘트 |
| 7 | 마케팅 에셋 | ✅ OK | ProductMarketingAsset 다형성 연결 (4종 에셋 타입) |
| 8 | AI 콘텐츠 | ✅ OK | 5종 콘텐츠 타입 + Gemini 3.0 Flash + OCR 통합 |
| 9 | 태블릿/POP/QR/사이니지 | ✅ OK | 채널 게이트 + AI 콘텐츠 + 에셋 연결 완비 |

### 9.2 데이터 모델 관계도

```
                         ┌──────────────┐
                         │ ProductMaster│
                         │ (SSOT)       │
                         └──────┬───────┘
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
             ProductImage  SupplierOffer  StoreProduct
             (GCS)         (가격/재고)     Profile
                                │         (커스터마이징)
                                ▼
                    OrgProductListing
                    (매장 채택)
                         │
                         ▼
                 OrgProductChannel ──→ OrgChannel
                 (채널 매핑)           (B2C/KIOSK/
                                       TABLET/SIGNAGE)
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
         B2C 게이트  Tablet 게이트  Signage 연동
              │
              ▼
     platform_store_slugs ──→ /store/{slug}/products
                                    │
                                    ├── Commerce 상품 (6중 게이트)
                                    └── 로컬 상품 (StoreLocalProduct, 별도 쿼리)

 별도 시스템:
  ProductAiContent (5종) ──→ POP/QR/사이니지/B2C
  ProductMarketingAsset ──→ QR/POP/라이브러리/사이니지 에셋
```

### 9.3 Critical Gap 상세

| # | 갭 | 영향 | 심각도 |
|---|------|------|:------:|
| 1 | **KPA 슬러그 미등록** | KPA 매장 B2C 스토어프론트 404 | 🔴 HIGH |

**KPA 슬러그 갭 상세:**
- `platform_store_slugs` 테이블에 KPA 서비스 키의 매장이 미등록
- KPA OrganizationStore 생성/승인 워크플로우에 슬러그 자동 삽입 로직 부재
- 상품 리스팅, 채널 매핑이 모두 존재해도 슬러그 없이는 공개 접근 불가
- 해결: KPA store 생성/승인 로직에 `platform_store_slugs` INSERT 추가

### 9.4 전체 완성도

```
전체 아키텍처 완성도: 95%

완료: 공급자 상품 → 매장 채택 → 채널 실행 → B2C/Tablet/POP/QR/Signage
      AI 콘텐츠 엔진 (5종) + 마케팅 에셋 연결 + Display Domain 분리

미완: KPA 서비스 B2C 스토어프론트 (슬러그 등록만 추가하면 해결)
```

---

## 부록: 파일 참조

| 엔티티/기능 | 파일 경로 |
|------------|----------|
| ProductMaster | `apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts` |
| SupplierProductOffer | `apps/api-server/src/modules/neture/entities/SupplierProductOffer.entity.ts` |
| ProductImage | `apps/api-server/src/modules/neture/entities/ProductImage.entity.ts` |
| StoreProductProfile | `apps/api-server/src/modules/neture/entities/StoreProductProfile.entity.ts` |
| OrganizationProductListing | `apps/api-server/src/routes/kpa/entities/organization-product-listing.entity.ts` |
| OrganizationChannel | `apps/api-server/src/routes/kpa/entities/organization-channel.entity.ts` |
| OrganizationProductChannel | `apps/api-server/src/routes/kpa/entities/organization-product-channel.entity.ts` |
| StoreLocalProduct | `apps/api-server/src/routes/platform/entities/store-local-product.entity.ts` |
| ProductMarketingAsset | `apps/api-server/src/routes/platform/entities/product-marketing-asset.entity.ts` |
| ProductAiContent | `apps/api-server/src/modules/store-ai/entities/product-ai-content.entity.ts` |
| ProductAiContentService | `apps/api-server/src/modules/store-ai/services/product-ai-content.service.ts` |
| B2C 스토어프론트 | `apps/api-server/src/routes/platform/unified-store-public.routes.ts` |
| 슬러그 마이그레이션 | `apps/api-server/src/migrations/1771200000000-CreatePlatformStoreSlugsTables.ts` |

---

*Generated: 2026-03-11*
*Status: Investigation Complete — READ-ONLY*

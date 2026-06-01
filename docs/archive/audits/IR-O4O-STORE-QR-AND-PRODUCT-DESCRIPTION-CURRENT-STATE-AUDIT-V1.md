# IR-O4O-STORE-QR-AND-PRODUCT-DESCRIPTION-CURRENT-STATE-AUDIT-V1

> **조사일**: 2026-04-15
> **목적**: QR-code 운영 기능 및 상품 설명서 사용자 수정 가능 여부 현 상태 기준선 조사

---

## 1. 전체 판정

### **PARTIAL** — QR 운영 기반은 상당히 완성, 상품 설명서 매장 수정은 미구현

- QR 기능은 **DB 스키마 + 백엔드 CRUD + 프론트엔드 관리 UI + 랜딩 페이지 + PDF 출력**까지 전 범위 구현됨
- 상품 설명서는 **공급자(Supplier) 측 등록/수정만 존재**, 매장/사용자 측 수정 UI/API 부재
- **공개 상품 상세 API(`queryVisibleProducts`)에서 description이 빈 문자열로 하드코딩**되어, 실제로 설명이 소비자에게 전달되지 않는 상태

---

## 2. 핵심 결론 요약

| 항목 | 결론 |
|------|------|
| **QR 관련 기존 기반** | **충분히 존재** — 엔티티, CRUD API, 프론트엔드 관리 UI, QR 랜딩 페이지, 스캔 추적, PDF 출력까지 전 범위 구현됨 |
| **매장 표준 주소 기반** | **완성** — `platform_store_slugs` 테이블 + `StoreSlugService` + slug 이력 관리 + 서비스별 slug 통합 |
| **리스트/인쇄/템플릿 구조 재사용성** | **높음** — 3가지 QR PDF 서비스(qr-print, qr-flyer, product-pop-pdf) + POP generator + Library 연동 |
| **상품 상세설명서 사용자 수정** | **불가** — 공급자만 등록/수정 가능. 매장/사용자 측 수정 UI/API 없음 |
| **향후 구현 시 중심 레이어** | 설명 수정은 `SupplierProductOffer`의 copy-on-write 또는 `StoreProduct` 레이어가 후보 |

---

## 3. 항목별 조사 결과 표

| 항목 | 상태 | 위치(파일/API) | 설명 |
|------|------|---------------|------|
| **매장 공개 주소 체계** | **구현됨** | `packages/platform-core/src/store-identity/entities/platform-store-slug.entity.ts` | `platform_store_slugs` 테이블. slug → storeId + serviceKey 해석. 전체 서비스 통합 유니크 |
| **상품 공개 상세 라우트** | **구현됨 (설명 누락)** | `routes/platform/store-public/store-public-product.handler.ts` → `GET /:slug/products/:id` | 상품 상세 반환하지만 **description/short_description이 빈 문자열**로 하드코딩 |
| **QR 관련 기존 코드** | **완전 구현** | 아래 상세 참조 | 엔티티 + 마이그레이션 + CRUD + 랜딩 + 스캔 추적 + PDF 출력 |
| **QR 리스트 관리 기반** | **구현됨** | `web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx` | 리스트 조회, 체크박스 선택, 일괄 PDF 출력, 개별 다운로드/삭제/분석 |
| **템플릿 선택 기반** | **부분 구현** | `services/qr-flyer.service.ts` (1/4/8분할) | 백엔드에 3가지 Flyer 템플릿. 프론트엔드 템플릿 선택 UI는 미구현 |
| **인쇄/PDF 기반** | **완전 구현** | 3개 서비스: `qr-print.service.ts`, `qr-flyer.service.ts`, `product-pop-pdf.service.ts` | pdfkit + qrcode + NotoSansKR 폰트. A4/A5/A6 지원 |
| **POP 생성 기반** | **구현됨** | `services/pop-generator.service.ts` + `controllers/store-pop.controller.ts` | Library 항목 + QR 조합하여 POP PDF 생성 |
| **tracking 구조** | **구현됨** | `entities/store-qr-scan-event.entity.ts` + 컨트롤러 analytics 엔드포인트 | device type, IP hash, 5초 중복 방지, 일/주간 통계 |
| **상세설명서 저장 구조** | **공급자 레벨 존재** | `SupplierProductOffer.entity.ts`: `consumer_detail_description` (Tiptap HTML) | 공급자가 등록 시 입력. 매장 복사/수정 구조 없음 |
| **간이 설명 저장 구조** | **공급자 레벨 존재** | `SupplierProductOffer.entity.ts`: `consumer_short_description` (Tiptap HTML) | 공급자가 등록 시 입력. 매장 복사/수정 구조 없음 |
| **사용자 수정 UI/API** | **미구현** | — | 매장/사용자 측 상품 설명 수정 화면 및 API 없음 |
| **복사 후 수정 가능성** | **구조적 후보 있음** | `store-product.entity.ts`: `shortDescription`, `description` 필드 존재 | StoreProduct에 독립 설명 필드가 있으나 현재 비어있음. copy-on-write 패턴 적용 가능 |

---

## 4. 상세 분석

### A. QR 관련 현재 구조

#### 데이터베이스 레이어

| 테이블 | 마이그레이션 | 목적 |
|--------|-------------|------|
| `store_qr_codes` | `20260304120000` | QR 코드 메타데이터. slug 기반 공개 URL. organization_id 격리 |
| `store_qr_scan_events` | `20260304130000` | QR 스캔 이벤트 로그. device/IP/timestamp |
| `product_marketing_assets` | `20260304200000` | 상품 ↔ QR/POP/Library/Signage 연결 (Display Domain) |
| `store_library_items` | (별도) | 매장 자료실 항목. QR 생성 시 연결 대상 |

#### 백엔드 API (`store-qr-landing.controller.ts`)

| 엔드포인트 | 인증 | 설명 |
|-----------|------|------|
| `GET /qr/public/:slug` | Public | QR 랜딩 데이터 + 스캔 이벤트 자동 기록 |
| `GET /pharmacy/qr` | Auth + Owner | QR 코드 목록 (scanCount JOIN) |
| `POST /pharmacy/qr` | Auth + Owner | QR 코드 생성 + product_marketing_assets 자동 연결 |
| `PUT /pharmacy/qr/:id` | Auth + Owner | QR 코드 수정 (slug 변경 시 충돌 검사) |
| `DELETE /pharmacy/qr/:id` | Auth + Owner | soft-delete (isActive=false) |
| `GET /pharmacy/qr/:id/analytics` | Auth + Owner | 스캔 통계 (total/today/weekly/device) |
| `GET /pharmacy/qr/:id/image` | Auth + Owner | QR 이미지 다운로드 (PNG/SVG, 크기 지정 가능) |
| `POST /pharmacy/qr/print` | Auth + Owner | 선택 QR 일괄 A4 PDF 출력 (최대 24개) |

#### 백엔드 PDF/출력 서비스

| 서비스 | 파일 | 용도 |
|--------|------|------|
| **qr-print.service** | `services/qr-print.service.ts` | QR PNG/SVG/DataURL 생성 + A4 8분할 PDF |
| **qr-flyer.service** | `services/qr-flyer.service.ts` | 상품 QR 전단지 PDF. 3가지 템플릿 (A4 1분할/4분할/8분할). 상품이미지 + 가격 + 약사코멘트 + QR |
| **pop-generator.service** | `services/pop-generator.service.ts` | Library + QR 조합 POP PDF (A4/A5) |
| **product-pop-pdf.service** | `modules/store-ai/services/product-pop-pdf.service.ts` | AI Content (pop_short/pop_long) + 이미지 + QR → POP PDF (A4/A5/A6) |

#### 프론트엔드

| 페이지 | 파일 | 기능 |
|--------|------|------|
| **StoreQRPage** | `web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx` | QR 관리 전체 UI: 생성(Library 선택→slug 설정→landingType 선택→저장), 리스트, 체크박스 선택, 일괄 PDF 출력, 개별 PNG/SVG 다운로드, 스캔 분석 패널 |
| **QrLandingPage** (KPA) | `web-kpa-society/src/pages/qr/QrLandingPage.tsx` | 공개 랜딩 페이지: `/qr/:slug` → 모바일 카드 UI → 대상 페이지 이동 |
| **QrLandingPage** (Glyco) | `web-glycopharm/src/pages/qr/QrLandingPage.tsx` | Glycopharm용 QR 랜딩 |
| **QrLandingPage** (Neture) | `web-neture/src/pages/store/QrLandingPage.tsx` | Neture용 QR 랜딩 |
| **QrLandingPage** (Admin) | `admin-dashboard/src/pages/storefront/QrLandingPage.tsx` | Admin용 QR 랜딩 |
| **StorePopPage** | `web-kpa-society/src/pages/pharmacy/StorePopPage.tsx` | POP 자동 생성 UI |

#### QR 랜딩 라우팅 흐름

```
사용자 QR 스캔 → /qr/:slug (공개)
  → 백엔드: GET /qr/public/:slug
    → store_qr_codes 조회 + store_library_items JOIN
    → store_qr_scan_events INSERT (fire-and-forget)
    → platform_store_slugs 조회 (storeSlug)
  → 프론트엔드: QrLandingPage
    → landingType에 따라 리다이렉트:
      - product → /store/{storeSlug}/products/{targetId}
      - promotion → /store/{storeSlug}/events/{targetId}
      - page → /content/{targetId}
      - link → window.open(외부URL)
```

### B. 상품 설명서 관련 현재 구조

#### 설명 필드가 존재하는 엔티티

| 엔티티 | 테이블 | 필드 | 소유자 | 편집 가능 |
|--------|--------|------|--------|----------|
| **SupplierProductOffer** | `supplier_product_offers` | `consumer_short_description` (Tiptap HTML) | 공급자 | 공급자만 |
| **SupplierProductOffer** | `supplier_product_offers` | `consumer_detail_description` (Tiptap HTML) | 공급자 | 공급자만 |
| **SupplierProductOffer** | `supplier_product_offers` | `business_short_description` (Tiptap HTML) | 공급자 | 공급자만 |
| **SupplierProductOffer** | `supplier_product_offers` | `business_detail_description` (Tiptap HTML) | 공급자 | 공급자만 |
| **CatalogProduct** | `catalog_products` | `short_description`, `description` | 플랫폼 공용 | 등록자 |
| **StoreProduct** | `store_products` | `short_description`, `description` | 매장 | **잠재적 수정 대상** (현재 미사용) |
| **GlycopharmProduct** | `glycopharm_products` | `short_description`, `description` | 약국 | 약국 |
| **NatureProduct** | `neture_products` | `short_description` | 공급자 | 공급자 |
| **CosmeticsProduct** | `cosmetics_products` | `short_description` | 공급자 | 공급자 |

#### AI 생성 콘텐츠

| 엔티티 | 테이블 | content_type | 목적 |
|--------|--------|-------------|------|
| **ProductAiContent** | `product_ai_contents` | `product_description` | AI 자동 생성 상품 설명 |
| **ProductAiContent** | `product_ai_contents` | `pop_short` / `pop_long` | POP 문구 |
| **ProductAiContent** | `product_ai_contents` | `qr_description` | QR 설명 |
| **ProductAiContent** | `product_ai_contents` | `signage_text` | 디지털 사이니지 텍스트 |

#### 공급자 측 설명 수정 경로

1. **등록 시**: `SupplierProductCreatePage.tsx` → `RichTextEditor` (Tiptap) → API `createSupplierOffer()` → `consumer_short_description` / `consumer_detail_description` 저장
2. **수정 시**: `ProductDetailDrawer.tsx` / `SupplierProductsPage.tsx` → offer 업데이트 API → 같은 필드 수정

#### 매장 측 설명 접근 현황

- **StoreProductLibrary 컨트롤러**: `COALESCE(spo.business_short_description, spo.consumer_short_description)` 로 "effective" 설명을 읽기 전용으로 보여줌
- **공개 상품 상세 API (`queryVisibleProducts`)**: `'' AS description, '' AS short_description` — **설명을 아예 전달하지 않음**
- **StorefrontProductDetailPage.tsx**: `product.description`을 렌더링하지만, API가 빈 문자열을 보내므로 실제로 비어있음
- **매장 측 수정 UI**: 없음
- **매장 측 수정 API**: 없음

#### 핵심 문제점

1. 공급자가 등록한 `consumer_short_description` / `consumer_detail_description`이 **공개 상품 상세 API에서 전달되지 않음**
2. 매장이 설명을 독립적으로 수정할 수 있는 **레이어가 없음** (StoreProduct에 필드는 있으나 연결 안 됨)
3. `@o4o/content-editor` 패키지에 `RichTextEditor`, `ContentRenderer`, `sanitizeHtml`이 있어 에디터 인프라는 준비됨

### C. 재사용 가능한 공통 자산

| 자산 | 위치 | 재사용 가능성 |
|------|------|-------------|
| `@o4o/content-editor` (Tiptap 기반 RichTextEditor) | `packages/content-editor/` | **높음** — 설명 편집에 바로 사용 가능 |
| `ContentRenderer` | `packages/content-editor/src/components/ContentRenderer.tsx` | **높음** — HTML 설명 안전 렌더링 |
| `sanitizeHtml` | `packages/content-editor/src/sanitize.ts` | **높음** — XSS 방지 |
| `StoreLibrarySelectorModal` | `web-kpa-society/src/components/store/StoreLibrarySelectorModal.tsx` | **높음** — QR/POP 생성 시 자료 선택 UI |
| pdfkit + qrcode + NotoSansKR 폰트 | `services/qr-print.service.ts` 등 | **높음** — PDF 생성 인프라 완비 |
| `StoreSlugService` | `packages/platform-core/src/store-identity/` | **높음** — slug 해석/생성/이력 관리 |
| `product_marketing_assets` 연결 구조 | `entities/product-marketing-asset.entity.ts` | **높음** — QR ↔ Product 연결 그래프 |

### D. 부족한 부분 / 신규 필요 영역

| 영역 | 상태 | 필요한 작업 |
|------|------|-----------|
| 공개 상품 상세 API의 설명 전달 | 빈 문자열 하드코딩 | `queryVisibleProducts`에서 `spo.consumer_short_description` / `spo.consumer_detail_description` 반환 필요 |
| 매장별 독립 설명 수정 | 미구현 | StoreProduct 또는 별도 overlay 테이블에서 매장별 설명 관리 + 수정 API + UI |
| QR Flyer 프론트엔드 템플릿 선택 UI | 미구현 | 현재 백엔드에 3가지 템플릿 있으나 프론트엔드에서 선택하는 UI 없음 |
| QR 생성 시 자동 slug 생성 개선 | 부분 | 현재 한글 제거 후 영문만 사용. 한글 slug 또는 nanoid 기반 자동 생성 개선 필요 |
| QR → 상품 상세 페이지 설명 표시 | 미연결 | QR → 상품 상세 → 설명 비어있음. 파이프라인 전체 연결 필요 |

---

## 5. 구현 방향 제안

> 아직 WO 수준이 아닌, 조사 기반 방향 제안

### QR 운영 확장

- **기존 구조 확장이 맞음**. 새로운 모듈이 아닌 기존 `store-qr-landing.controller.ts` + `StoreQRPage.tsx` 확장
- Flyer 템플릿 선택 UI만 추가하면 QR → PDF 출력 흐름이 완성됨
- QR 유입 추적은 이미 `store_qr_scan_events`로 충분히 구현되어 있음

### 상품 설명서 매장 수정

- **2단계 접근 권장**:
  1. **즉시**: `queryVisibleProducts`에서 `consumer_short_description` / `consumer_detail_description` 전달 (공급자 원본 그대로)
  2. **향후**: 매장별 독립 수정은 `StoreProduct` 레이어가 가장 자연스러움

- **StoreProduct이 적합한 이유**:
  - 이미 `shortDescription`, `description` 필드가 있음
  - `CatalogProduct`에서 application layer copy로 생성되는 패턴이 확립됨
  - organization_id 기반 격리가 되어있음
  - "원본은 공급자, 매장별 override는 StoreProduct" 패턴이 자연스러움

- **대안 평가**:
  - `SupplierProductOffer` 직접 수정 → 원본 오염. 불가
  - 별도 콘텐츠 레이어 → 과도한 복잡성. 비권장
  - `ProductAiContent` 확장 → AI 전용 테이블이므로 부적절

### QR → 설명 페이지 연결

- QR landingType=`product` → `/store/{slug}/products/{id}` → 상품 상세 → **설명이 비어있는 문제** 해결이 선행 필요
- 설명이 전달되면 QR → 설명 페이지 연결은 자동으로 완성됨

---

## 6. 참고 파일 목록

### QR 코드 관련

**엔티티/마이그레이션:**
- `apps/api-server/src/routes/platform/entities/store-qr-code.entity.ts`
- `apps/api-server/src/routes/platform/entities/store-qr-scan-event.entity.ts`
- `apps/api-server/src/routes/platform/entities/product-marketing-asset.entity.ts`
- `apps/api-server/src/routes/platform/entities/store-library-item.entity.ts`
- `apps/api-server/src/database/migrations/20260304120000-CreateStoreQrCodes.ts`
- `apps/api-server/src/database/migrations/20260304130000-CreateStoreQrScanEvents.ts`
- `apps/api-server/src/database/migrations/20260304200000-CreateProductMarketingAssets.ts`

**백엔드 서비스/컨트롤러:**
- `apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts`
- `apps/api-server/src/routes/o4o-store/controllers/store-pop.controller.ts`
- `apps/api-server/src/routes/o4o-store/controllers/product-marketing.controller.ts`
- `apps/api-server/src/services/qr-print.service.ts`
- `apps/api-server/src/services/qr-flyer.service.ts`
- `apps/api-server/src/services/pop-generator.service.ts`
- `apps/api-server/src/modules/store-ai/services/product-pop-pdf.service.ts`
- `apps/api-server/src/modules/store-ai/controllers/product-pop-pdf.controller.ts`

**프론트엔드:**
- `services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx`
- `services/web-kpa-society/src/pages/pharmacy/StorePopPage.tsx`
- `services/web-kpa-society/src/pages/qr/QrLandingPage.tsx`
- `services/web-kpa-society/src/api/storeQr.ts`
- `services/web-kpa-society/src/components/store/StoreLibrarySelectorModal.tsx`
- `services/web-glycopharm/src/pages/qr/QrLandingPage.tsx`
- `services/web-neture/src/pages/store/QrLandingPage.tsx`
- `apps/admin-dashboard/src/pages/storefront/QrLandingPage.tsx`

### 매장 주소 체계

- `packages/platform-core/src/store-identity/entities/platform-store-slug.entity.ts`
- `packages/platform-core/src/store-identity/services/store-slug.service.ts`
- `apps/api-server/src/routes/platform/unified-store-public.routes.ts`
- `apps/api-server/src/routes/platform/store-public/store-public-product.handler.ts`
- `apps/api-server/src/routes/platform/store-public/store-public-utils.ts`

### 상품 설명서 관련

**엔티티:**
- `apps/api-server/src/modules/neture/entities/SupplierProductOffer.entity.ts` (line 107~123: B2C/B2B 설명 4개 필드)
- `apps/api-server/src/modules/catalog/entities/catalog-product.entity.ts` (line 55~60: shortDescription, description)
- `apps/api-server/src/modules/store/entities/store-product.entity.ts` (line 68~72: shortDescription, description)
- `apps/api-server/src/modules/store-ai/entities/product-ai-content.entity.ts`

**공급자 수정 UI:**
- `services/web-neture/src/pages/supplier/SupplierProductCreatePage.tsx` (Step 3: RichTextEditor)
- `services/web-neture/src/pages/supplier/ProductDetailDrawer.tsx`
- `services/web-neture/src/pages/supplier/SupplierB2BContentPage.tsx`

**공용 에디터/렌더러:**
- `packages/content-editor/src/components/RichTextEditor.tsx`
- `packages/content-editor/src/components/ContentRenderer.tsx`
- `packages/content-editor/src/sanitize.ts`

**공개 상품 상세 (설명 누락 지점):**
- `apps/api-server/src/routes/platform/store-public/store-public-utils.ts` (line 172~173: `'' AS description, '' AS short_description`)
- `services/web-kpa-society/src/pages/storefront/StorefrontProductDetailPage.tsx`

---

*End of IR*

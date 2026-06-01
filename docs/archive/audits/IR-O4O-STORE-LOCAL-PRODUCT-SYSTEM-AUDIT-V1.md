# IR-O4O-STORE-LOCAL-PRODUCT-SYSTEM-AUDIT-V1

> **Store Local Product System 존재 여부 및 구조 감사 보고서**

| 항목 | 값 |
|------|------|
| **문서 유형** | Investigation Report (IR) |
| **작성일** | 2026-03-15 |
| **조사 범위** | Store Local Product Entity, API, Tablet Integration, Frontend UI |
| **핵심 질문** | 매장 자체 상품(Local Product) 시스템이 존재하는가? |
| **판정** | **CASE 2 — 부분 구현 (Backend 완전, Frontend UI 미구현)** |

---

## 1. Executive Summary

O4O 플랫폼의 **Store Local Product** 시스템은 **Backend가 완전히 구현**되어 있다.

- Entity/Table: `store_local_products` — Display Domain 전용, Commerce 분리 확정
- API: `/api/v1/store/local-products` — Full CRUD (4 endpoints)
- Tablet 통합: `store_tablet_displays.product_type` discriminator로 supplier + local 혼합 진열
- Public API: `/:slug/tablet/products` — supplier + local 분리 응답 (DB UNION 금지)
- **Frontend: 전용 관리 UI 없음** — 어떤 서비스(GlycoPharm, Neture, KPA 등)에도 Local Product CRUD 페이지가 존재하지 않음

**Store Product Dual Architecture** (Supplier Product + Local Product) 개념은 백엔드에서 완전히 구현되었으나, 운영자가 실제로 Local Product를 등록·관리할 수 있는 화면이 없어 **사실상 비활성 상태**이다.

---

## 2. 조사 결과 상세

### 2.1 Entity / Table 구조

#### 2.1.1 `store_local_products` 테이블

**파일**: `apps/api-server/src/routes/platform/entities/store-local-product.entity.ts`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID (PK) | - |
| `organization_id` | UUID | **Boundary Key** — 멀티테넌트 격리 |
| `name` | varchar(200) | 상품명 |
| `description` | text | 기본 설명 |
| `summary` | text | 요약 (Content Refinement) |
| `detail_html` | text | HTML 상세 설명 (sanitize 적용) |
| `usage_info` | text | 사용법 |
| `caution_info` | text | 주의사항 |
| `images` | jsonb | 기본 이미지 배열 |
| `thumbnail_url` | varchar(500) | 썸네일 |
| `gallery_images` | jsonb | 갤러리 이미지 배열 |
| `category` | varchar(100) | 카테고리 |
| `price_display` | numeric(12,2) | **표시 가격** (Commerce 가격 아님) |
| `badge_type` | enum | `none` / `new` / `recommend` / `event` |
| `highlight_flag` | boolean | 강조 표시 여부 |
| `is_active` | boolean | 활성화 상태 |
| `sort_order` | int | 정렬 순서 |
| `created_at` | timestamp | - |
| `updated_at` | timestamp | - |

**인덱스**: `IDX_store_local_products_org`, `IDX_store_local_products_org_active`

**Work Orders**:
- `WO-STORE-LOCAL-PRODUCT-DISPLAY-V1` — 초기 구현
- `WO-STORE-LOCAL-PRODUCT-CONTENT-REFINEMENT-V1` — 콘텐츠 블록 필드 추가

**핵심 선언** (Entity 주석):
> "Commerce Object가 아니며, Checkout/EcommerceOrder와 연결 금지."

#### 2.1.2 `store_tablets` 테이블

**파일**: `apps/api-server/src/routes/platform/entities/store-tablet.entity.ts`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID (PK) | - |
| `organization_id` | UUID | **Boundary Key** |
| `name` | varchar(100) | 태블릿 이름 |
| `location` | varchar(100) | 설치 위치 |
| `is_active` | boolean | 활성화 상태 |
| `created_at` | timestamp | - |

**관계**: `OneToMany → StoreTabletDisplay`

#### 2.1.3 `store_tablet_displays` 테이블

**파일**: `apps/api-server/src/routes/platform/entities/store-tablet-display.entity.ts`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID (PK) | - |
| `tablet_id` | UUID (FK) | → `store_tablets.id` |
| `product_type` | varchar(20) | **Discriminator**: `'supplier'` \| `'local'` |
| `product_id` | UUID | **Soft Reference** — product_type에 따라 다른 테이블 참조 |
| `sort_order` | int | 정렬 순서 |
| `is_visible` | boolean | 진열 가시성 |
| `created_at` | timestamp | - |

**핵심 설계**: `product_type` discriminator로 **Dual Product Architecture** 구현
- `supplier` → `organization_product_listings.id` 참조
- `local` → `store_local_products.id` 참조

#### 2.1.4 `tablet_interest_requests` 테이블

**파일**: `apps/api-server/src/routes/platform/entities/tablet-interest-request.entity.ts`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID (PK) | - |
| `organization_id` | UUID | **Boundary Key** |
| `master_id` | UUID (FK) | → `product_masters.id` |
| `product_name` | varchar(255) | 상품명 (스냅샷) |
| `customer_name` | varchar(100) | 고객명 (선택) |
| `customer_note` | text | 고객 메모 (선택) |
| `status` | enum | `REQUESTED` → `ACKNOWLEDGED` → `COMPLETED` \| `CANCELLED` |
| `acknowledged_at` | timestamp | 확인 시점 |
| `completed_at` | timestamp | 완료 시점 |
| `cancelled_at` | timestamp | 취소 시점 |

**상태 머신**: `REQUESTED → ACKNOWLEDGED → COMPLETED | CANCELLED`

> "이것은 주문(order) 테이블이 아닌 관심 요청(interest) 큐이다. E-commerce Core와 분리되어 운영된다."

---

### 2.2 API Endpoints

#### 2.2.1 Local Product CRUD API

**파일**: `apps/api-server/src/routes/platform/store-local-product.routes.ts`
**Namespace**: `/api/v1/store/local-products`
**인증**: `requireAuth` + `resolveStoreAccess` (약국 소유자/운영자)

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/local-products` | 목록 조회 (페이징, 카테고리, activeOnly, highlightOnly 필터) |
| `POST` | `/local-products` | 생성 (name 필수, badgeType 검증, HTML sanitize) |
| `PUT` | `/local-products/:id` | 수정 (organization_id 복합 조건으로 소유권 검증) |
| `DELETE` | `/local-products/:id` | **Soft Delete** (is_active = false) |

**Boundary Policy 준수 확인**:
- ✅ UUID 단독 조회 없음 — `organization_id` 복합 조건 필수
- ✅ Raw SQL Parameter Binding 사용 — String Interpolation 없음
- ✅ `organization_id` 필터 모든 쿼리에 적용
- ✅ `sanitizeHtml()` — `<script>` 태그 및 inline event handler 제거

#### 2.2.2 Tablet Management API

**파일**: `apps/api-server/src/routes/platform/store-tablet.routes.ts`
**Namespace**: `/api/v1/store`
**인증**: `requireAuth` + `createRequireStoreOwner` (약국 소유자)

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/tablets` | 태블릿 목록 |
| `POST` | `/tablets` | 태블릿 등록 |
| `PUT` | `/tablets/:id` | 태블릿 수정 |
| `DELETE` | `/tablets/:id` | 태블릿 비활성화 (soft delete) |
| `GET` | `/tablets/:id/displays` | 진열 구성 조회 |
| `PUT` | `/tablets/:id/displays` | 진열 구성 저장 (전체 교체) |
| `GET` | `/tablets/:id/product-pool` | **상품 풀 조회** (supplier + local 분리) |
| `POST` | `/products/register-by-barcode` | 바코드 → Master → StoreProductProfile upsert |
| `GET` | `/interest/pending-count` | 미확인 관심 요청 건수 |
| `GET` | `/interest/recent` | 최근 관심 요청 목록 |
| `GET` | `/interest/stats` | 대시보드 통계 |
| `PATCH` | `/interest/:id/acknowledge` | 확인 처리 |
| `PATCH` | `/interest/:id/complete` | 완료 처리 |
| `PATCH` | `/interest/:id/cancel` | 취소 처리 |

**핵심**: `GET /tablets/:id/product-pool`이 **Dual Product Architecture의 접점**

```
상품 풀 = {
  supplierProducts: organization_product_listings (Commerce Domain),
  localProducts: store_local_products (Display Domain)
}
```

**Display Guard** (`validateDisplayItems`):
- `supplier` → `organization_product_listings WHERE id = $1 AND organization_id = $2 AND is_active = true`
- `local` → `store_local_products WHERE id = $1 AND organization_id = $2 AND is_active = true`

#### 2.2.3 Public Tablet API (Storefront)

**파일**: `apps/api-server/src/routes/platform/unified-store-public.routes.ts`
**Namespace**: `/api/v1/stores/:slug/tablet`

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/:slug/tablet/products` | Tablet 채널 상품 (supplier + local 분리 응답) |
| `POST` | `/:slug/tablet/requests` | Tablet 서비스 요청 (rate-limited) |
| `POST` | `/:slug/tablet/interest` | 관심 요청 (rate-limited) |
| `GET` | `/:slug/tablet/requests/:id` | 서비스 요청 상태 조회 |

**`GET /:slug/tablet/products` 응답 구조** (Hardening Guard):

```json
{
  "success": true,
  "data": [...],           // supplierProducts (4중 Visibility Gate)
  "meta": { ... },
  "localProducts": [...]   // Display Domain (is_active only)
}
```

**WO-STORE-LOCAL-PRODUCT-HARDENING-V1 규칙**:
- ❌ DB UNION 금지 — supplier와 local을 같은 쿼리로 JOIN하면 안 됨
- ✅ 애플리케이션 레벨 merge만 허용
- Supplier: 4중 Visibility Gate (`product.status + listing.is_active + channel.is_active + channel.status`)
- Local: 단순 `is_active = true` 조건

---

### 2.3 Channel 연결 구조

#### 2.3.1 Supplier Product 경로 (Commerce Domain)

```
product_masters
  → supplier_product_offers
    → organization_product_listings  (SSOT)
      → organization_product_channels
        → organization_channels (channel_type = 'TABLET', status = 'APPROVED')
```

**4중 Visibility Gate** 적용 — Checkout 진입 가능

#### 2.3.2 Local Product 경로 (Display Domain)

```
store_local_products
  → store_tablet_displays (product_type = 'local')
    → store_tablets
```

**단순 is_active 게이트** — Checkout 진입 불가

#### 2.3.3 Dual Architecture 합류점

두 경로가 합류하는 지점은 **Tablet Display** 레벨:

```
store_tablet_displays
  ├── product_type = 'supplier' → organization_product_listings
  └── product_type = 'local'    → store_local_products
```

Public API (`/:slug/tablet/products`)에서는 **응답 레벨에서 분리**:
- `data[]` + `meta` — supplier products
- `localProducts[]` — local products (별도 키)

---

### 2.4 Frontend UI 조사

#### 2.4.1 조사 결과: 전용 UI 없음

아래 서비스의 모든 admin/operator 페이지를 조사한 결과, **Local Product 전용 관리 UI가 존재하지 않는다**.

| 서비스 | 조사 경로 | Local Product 페이지 |
|--------|----------|---------------------|
| GlycoPharm (`web-glycopharm`) | `src/pages/admin/` | ❌ 없음 |
| Neture (`web-neture`) | `src/pages/admin/` | ❌ 없음 |
| KPA Society (`web-kpa-society`) | `src/pages/` | ❌ 없음 |
| K-Cosmetics (`web-k-cosmetics`) | `src/pages/admin/` | ❌ 없음 |

#### 2.4.2 간접적으로 Local Product를 표시할 수 있는 화면

| 화면 | 가능성 | 설명 |
|------|--------|------|
| `TabletStorePage` | ⚠️ 가능 | `/:slug/tablet/products` API 호출 시 `localProducts` 포함 응답 |
| `StoreChannelsPage` | ❌ 불가 | Channel Product는 `organization_product_channels` 기반이므로 supplier only |

#### 2.4.3 결론

Backend API는 완전하지만, 운영자가 다음을 수행할 수 있는 UI가 없다:
1. **Local Product 등록/수정/삭제** → `POST/PUT/DELETE /api/v1/store/local-products` 호출 UI 없음
2. **Tablet Display에 Local Product 배치** → `PUT /api/v1/store/tablets/:id/displays` 호출 UI 없음
3. **상품 풀에서 Local Product 확인** → `GET /api/v1/store/tablets/:id/product-pool` 결과 표시 UI 없음

---

## 3. Domain Boundary 분석

### 3.1 Commerce vs Display 경계

```
┌──────────────────────────────────────────────────────────────┐
│                    Commerce Domain                            │
│                                                              │
│  product_masters → supplier_product_offers                   │
│    → organization_product_listings (SSOT)                    │
│      → organization_product_channels                         │
│        → ecommerce_order_items (Checkout 가능)               │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                    Display Domain                             │
│                                                              │
│  store_local_products                                        │
│    → store_tablet_displays (product_type='local')            │
│      → 태블릿 화면 표시 전용                                  │
│                                                              │
│  ❌ ecommerce_order_items 연결 금지                           │
│  ❌ Checkout flow 진입 금지                                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Boundary Policy 준수 현황

| Rule | 항목 | 상태 |
|------|------|------|
| Rule 1 | UUID 단독 조회 금지 | ✅ `organization_id` 복합 조건 사용 |
| Rule 2 | Raw SQL Parameter Binding | ✅ `$1, $2` 파라미터 바인딩 |
| Rule 3 | Domain Primary Boundary 필터 | ✅ 모든 쿼리에 `organization_id` |
| Rule 4 | serviceKey 스푸핑 금지 | ✅ Local Product는 serviceKey 사용 안 함 |
| Rule 5 | Cross-domain JOIN 금지 | ✅ DB UNION 금지 (Hardening Guard) |

---

## 4. Work Order 이력

| Work Order | 내용 | 상태 |
|------------|------|------|
| `WO-STORE-LOCAL-PRODUCT-DISPLAY-V1` | Local Product Entity + Tablet Display + API 구현 | ✅ 완료 |
| `WO-STORE-LOCAL-PRODUCT-CONTENT-REFINEMENT-V1` | 콘텐츠 블록 필드 추가 (summary, detailHtml, usageInfo, cautionInfo, thumbnailUrl, galleryImages, badgeType, highlightFlag) | ✅ 완료 |
| `WO-STORE-LOCAL-PRODUCT-HARDENING-V1` | Query Separation Guard (DB UNION 금지, Display Domain 격리) | ✅ 완료 |
| `WO-O4O-TABLET-MODULE-V1` | Tablet Interest Request + Barcode Registration + Staff Routes | ✅ 완료 |
| **Frontend UI WO** | Local Product 관리 페이지 | ❌ **미생성** |

---

## 5. 판정 및 권고

### 5.1 판정: CASE 2 — 부분 구현

| 구성 요소 | 상태 | 완성도 |
|-----------|------|--------|
| Entity / Table | ✅ 완전 | 100% |
| Backend API (CRUD) | ✅ 완전 | 100% |
| Tablet Display 통합 | ✅ 완전 | 100% |
| Public Storefront API | ✅ 완전 | 100% |
| Interest Request System | ✅ 완전 | 100% |
| Boundary Guards | ✅ 완전 | 100% |
| **Frontend 관리 UI** | ❌ 없음 | **0%** |
| **총 Dual Architecture 완성도** | — | **~85%** |

### 5.2 권고 사항

#### P1: Local Product 관리 페이지 구현

Store OS 완성을 위해 다음 UI가 필요하다:

1. **Local Product CRUD 페이지** — `StoreLocalProductsPage.tsx`
   - 목록 (테이블 + 페이징 + 카테고리 필터)
   - 생성/수정 모달 (name, description, priceDisplay, images, badgeType 등)
   - Soft delete (비활성화)

2. **Tablet Display 편집에 Local Product 포함** — 기존 Tablet 관리 UI에 product-pool 통합
   - `GET /tablets/:id/product-pool` 결과에서 supplier + local 표시
   - Drag & Drop 또는 선택 방식으로 display 구성

#### P2: 고려 사항

- Local Product는 Display Domain이므로 **가격은 표시용**임을 UI에서 명시해야 함
- `price_display`는 `numeric(12,2)`이지만 Commerce 가격과 혼동 방지 필요
- Content Refinement 필드(summary, detailHtml, usageInfo, cautionInfo)를 활용하는 상세 보기 필요

---

## 6. 파일 참조 인덱스

| # | 파일 | 역할 |
|---|------|------|
| 1 | `apps/api-server/src/routes/platform/entities/store-local-product.entity.ts` | Local Product Entity |
| 2 | `apps/api-server/src/routes/platform/entities/store-tablet.entity.ts` | Tablet Entity |
| 3 | `apps/api-server/src/routes/platform/entities/store-tablet-display.entity.ts` | Tablet Display Entity (Discriminator) |
| 4 | `apps/api-server/src/routes/platform/entities/tablet-interest-request.entity.ts` | Interest Request Entity |
| 5 | `apps/api-server/src/routes/platform/store-local-product.routes.ts` | Local Product CRUD API |
| 6 | `apps/api-server/src/routes/platform/store-tablet.routes.ts` | Tablet Management API |
| 7 | `apps/api-server/src/routes/platform/unified-store-public.routes.ts` | Public Storefront API |

---

*End of IR-O4O-STORE-LOCAL-PRODUCT-SYSTEM-AUDIT-V1*

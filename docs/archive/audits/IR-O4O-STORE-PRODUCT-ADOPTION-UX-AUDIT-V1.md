# IR-O4O-STORE-PRODUCT-ADOPTION-UX-AUDIT-V1

> **Investigation Report — 매장 상품 채택 UX 흐름 감사**
> Date: 2026-03-11
> Status: READ-ONLY Investigation (코드 변경 없음)

---

## 목차

1. [공급자 상품 조회 UX](#1-공급자-상품-조회-ux)
2. [상품 채택 UX](#2-상품-채택-ux)
3. [채택 상품 관리 UX](#3-채택-상품-관리-ux)
4. [채널 설정 UX](#4-채널-설정-ux)
5. [로컬 상품 UX](#5-로컬-상품-ux)
6. [채널 표시 흐름](#6-채널-표시-흐름)
7. [UX 문제 분석](#7-ux-문제-분석)

---

## 1. 공급자 상품 조회 UX

### 1.1 KPA Society — ✅ OK

| 항목 | 값 |
|------|------|
| 페이지 | `HubB2BCatalogPage.tsx` |
| 위치 | `services/web-kpa-society/src/pages/pharmacy/HubB2BCatalogPage.tsx` |
| 라우트 | `/hub/b2b` |
| 메뉴 | 약국 HUB → B2B 카탈로그 |

**기능:**
- 카테고리 필터 탭 (의약품, 건강기능식품, 의료기기, 화장품, 생활용품)
- 정렬 가능 테이블: 상품명 | 공급자 | 카테고리 | 상태 | 날짜
- 공급자 로고 표시
- 통계 요약: 판매중 | 승인완료 | 승인대기

**상품 상태 머신 (4단계):**

| 상태 | 표시 | 버튼 동작 |
|------|------|----------|
| `AVAILABLE` (신청가능) | 신청 가능 | **"판매 신청"** 버튼 → 채택 신청 |
| `PENDING` (승인대기) | 승인 대기 | 비활성 버튼 (대기 중) |
| `APPROVED` (승인완료) | 승인 완료 | **"매장 관리"** 버튼 → `/store/commerce/products` 이동 |
| `LISTED` (판매중) | 판매 중 | 비활성 버튼 (이미 진열) |

**API 호출:**
- `GET /pharmacy/products/catalog` — B2B 카탈로그 조회
- `POST /pharmacy/products/apply` — 판매 신청

**데이터 구조:**
```typescript
interface CatalogProduct {
  id: string;
  name: string;
  category: string | null;
  supplierId: string;
  supplierName: string;
  supplierLogoUrl: string | null;
  isApplied: boolean;    // 신청 여부
  isApproved: boolean;   // 승인 여부
  isListed: boolean;     // 진열 여부
  updatedAt: string;
}
```

### 1.2 GlycoPharm — ⚠️ CONFUSING

| 항목 | 값 |
|------|------|
| 페이지 | `ProductsPage.tsx` |
| 위치 | `services/web-glycopharm/src/pages/operator/ProductsPage.tsx` |
| 라우트 | `/operator/products` |
| 메뉴 | 사이드바 → 상품 관리 (Package 아이콘) |

**문제:** 이 페이지는 **운영자용 ProductMaster 관리 콘솔**이다.
매장 관리자가 공급자 상품을 탐색하는 페이지가 **아님**.

- 검색: 상품명, 바코드, 브랜드, 제조사
- 통계: 전체 상품 | 이미지 보유 | 공급자 연결 | 중복 바코드
- 테이블: 이미지 | 이름 | 바코드 | 브랜드 | 카테고리 | 공급자 수 | 날짜

**API 호출:**
- `GET /api/v1/operator/products` — 플랫폼 전체 상품 목록
- `GET /api/v1/operator/products/:productId` — 상품 상세 + 공급자 오퍼

**결론:** 매장용 카탈로그 브라우징 UI 없음. 운영자 콘솔만 존재.

### 1.3 K-Cosmetics — ❌ MISSING

매장 관리자용 공급자 상품 조회 화면 없음.

### 1.4 Neture — ❌ MISSING (해당 없음)

공급자(Supplier) 측 상품 관리 페이지만 존재:
- `SupplierProductsListPage.tsx` — 공급자 계정 관리
- `SupplierProductsPage.tsx` — 공급자 상품 관리

매장 측 카탈로그 브라우징 페이지 없음. Neture는 공급자 유통 플랫폼이므로 매장 채택 흐름이 구조적으로 다름.

---

## 2. 상품 채택 UX

### 2.1 KPA Society — 매장 신청 흐름 ✅ OK

**채택 신청 (매장 관리자):**

| 단계 | 동작 | API |
|------|------|-----|
| 1 | `/hub/b2b` 카탈로그 접근 | |
| 2 | `AVAILABLE` 상품에서 "판매 신청" 클릭 | `POST /pharmacy/products/apply` |
| 3 | 확인 토스트: "「상품명」 판매 신청이 완료되었습니다" | |
| 4 | 상품 상태 변경: `AVAILABLE` → `PENDING` | |

**API 호출:**
```typescript
POST /pharmacy/products/apply
Body: { supplyProductId: string }
```

**백엔드 처리:**
- `product_approvals` 테이블에 레코드 생성 (v2 승인 시스템)
- `approval_status = 'pending'` 설정
- 운영자 승인 대기

### 2.2 KPA Society — 운영자 승인 흐름 ✅ OK

| 항목 | 값 |
|------|------|
| 페이지 | `ProductApplicationManagementPage.tsx` |
| 위치 | `services/web-kpa-society/src/pages/operator/ProductApplicationManagementPage.tsx` |
| 라우트 | `/operator/product-applications` |

**기능:**
- 상태 필터 탭: 전체 | 승인대기 | 승인 | 거절
- 통계 카드: 상태별 건수
- 테이블: 약국명 | 상품명 | 공급자 | 카테고리 | 신청일 | 상태 | 액션

**승인 동작:**

| 액션 | API | 결과 |
|------|-----|------|
| 승인 | `PATCH /operator/product-applications/:id/approve` | `organization_product_listings` 자동 생성 |
| 거절 | `PATCH /operator/product-applications/:id/reject` | 거절 사유 기록 |

**승인 시 토스트:** "「상품명」 승인 완료. 매장 진열 상품이 생성되었습니다."

**핵심:** 승인 시 `OrganizationProductListing` 레코드가 **자동 생성**됨 → 매장 재고에 자동 추가

**데이터 구조:**
```typescript
interface ProductApplication {
  id: string;
  organization_id: string;
  organizationName: string | null;
  service_key: string;
  external_product_id: string;
  product_name: string;
  supplierName: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reject_reason: string | null;
  requested_by: string;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
}
```

### 2.3 GlycoPharm — ❌ MISSING

- 매장 채택 신청 UI 없음
- 운영자 승인 워크플로우 없음
- 상품 채택 버튼/API 미구현

### 2.4 K-Cosmetics — ❌ MISSING

- 상품 채택 워크플로우 전체 미구현

### 2.5 Neture — ❌ MISSING

- 매장 채택 워크플로우 없음 (공급자 유통 플랫폼이므로 구조가 다름)

---

## 3. 채택 상품 관리 UX

### 3.1 KPA Society — 채택 상품 목록 ✅ OK

| 항목 | 값 |
|------|------|
| 페이지 | `PharmacyB2BPage.tsx` |
| 위치 | `services/web-kpa-society/src/pages/pharmacy/PharmacyB2BPage.tsx` |
| 라우트 | `/store/commerce/products` |
| 메뉴 | 사이드바 → Store → B2B 구매 |

**기능:**
- 도메인 탭 필터: 전체 | 일반 B2B (kpa) | 공동구매 (kpa-groupbuy) | 혈당관리 (glycopharm) | 화장품 (cosmetics)
- 채택된 상품 카드 목록
- 상품 카드: 이름 | 공급자 | 카테고리 | 상태

**API 호출:**
- `GET /pharmacy/products/listings` — 채택 상품 목록

**데이터 구조:**
```typescript
interface ProductListing {
  id: string;
  organization_id: string;
  service_key: string;       // kpa | kpa-groupbuy | glycopharm | cosmetics
  external_product_id: string;
  product_name: string;
  retail_price: number | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}
```

### 3.2 KPA Society — 채택 상품 편집 ⚠️ PARTIAL

**API 존재 (pharmacyProducts.ts):**
```typescript
updateListing(id: string, params: {
  retailPrice?: number;   // 가격 오버라이드
  isActive?: boolean;     // 활성/비활성
  displayOrder?: number;  // 정렬 순서
})
```

**문제:** API는 존재하지만 이 API를 호출하는 **전용 편집 UI가 불명확**.
- `PharmacyB2BPage`에서 인라인 편집이 가능한지 확인 필요
- 별도 편집 페이지 미발견

**관리 기능 현황:**

| 기능 | 상태 | 설명 |
|------|:----:|------|
| 채택 상품 목록 | ✅ OK | PharmacyB2BPage |
| 가격 변경 | ⚠️ PARTIAL | API 존재, UI 불명확 |
| 노출 여부 | ⚠️ PARTIAL | API 존재, UI 불명확 |
| 채널 설정 | ✅ OK | StoreChannelsPage |
| 정렬 변경 | ⚠️ PARTIAL | API 존재, UI 불명확 |
| 삭제 | ❌ MISSING | API/UI 미발견 |

### 3.3 GlycoPharm — ❌ MISSING

채택 상품 관리 화면 없음.

### 3.4 K-Cosmetics — ❌ MISSING

채택 상품 관리 화면 없음.

### 3.5 Neture — ⚠️ PARTIAL

- `StoreProductPage.tsx` — 고객 대면 상품 상세 페이지 (관리 UI 아님)
- 매장 관리자용 상품 관리 페이지 미발견

---

## 4. 채널 설정 UX

### 4.1 KPA Society — 채널 실행 콘솔 ✅ OK

| 항목 | 값 |
|------|------|
| 페이지 | `StoreChannelsPage.tsx` |
| 위치 | `services/web-kpa-society/src/pages/pharmacy/StoreChannelsPage.tsx` |
| 라우트 | `/store/channels` |
| 메뉴 | 숨김 (직접 URL 접근) |

**기능:**
- 채널 탭: B2C (온라인 스토어) | KIOSK (키오스크) | TABLET (태블릿) | SIGNAGE (사이니지)
- 채널별 KPI: 상태 | 상품 수 | 콘텐츠 수 | 강제 노출 수
- 빠른 액션: 채널 미리보기 | 새로고침

**B2C/KIOSK 채널 상품 관리:**

| 기능 | 설명 |
|------|------|
| 상품 테이블 | 상품명 \| 가시성 토글 (ON/OFF) \| 판매 한도 \| 노출 순서 |
| 상품 추가 | "제품 추가" 버튼 → 모달에서 가용 리스팅 선택 |
| 순서 변경 | 드래그앤드롭 또는 ↑↓ 버튼 |
| 상품 비활성 | "×" 버튼으로 비활성화 |

**API 호출:**

| 용도 | API |
|------|-----|
| 채널 현황 | `GET /channels/overview` |
| 채널 상품 목록 | `GET /channels/:channelType/products` |
| 추가 가능 상품 | `GET /listings/available` |
| 상품 추가 | `POST /channels/:channelType/products` |
| 상품 제거 | `DELETE /channels/:channelType/products/:productId` |
| 순서 변경 | `PUT /channels/:channelType/products/reorder` |

**데이터 구조:**
```typescript
interface ChannelOverview {
  type: 'B2C' | 'KIOSK' | 'TABLET' | 'SIGNAGE';
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'SUSPENDED' | 'EXPIRED' | 'TERMINATED';
  productCount: number;
  contentCount: number;
  forcedExposureCount: number;
}

interface ChannelProduct {
  id: string;
  productId: string;
  productName: string;
  isVisible: boolean;
  salesLimit: number | null;
  displayOrder: number;
}
```

### 4.2 KPA Society — 리스팅별 채널 설정 API ✅ OK

**API (pharmacyProducts.ts):**
```typescript
getListingChannels(listingId: string)
  → { data: ListingChannelSetting[] }

updateListingChannels(listingId: string, channels: Array<{
  channelId: string;
  isVisible: boolean;
  salesLimit?: number;
  displayOrder?: number;
}>) → { updated: number }
```

### 4.3 GlycoPharm / K-Cosmetics / Neture — ❌ MISSING

채널 설정 UI 없음 (백엔드 구조는 존재하지만 프론트엔드 미구현).

---

## 5. 로컬 상품 UX

### 5.1 KPA Society — 도메인 탭으로 구분 ⚠️ PARTIAL

**공급자 상품 (채택 상품):**
- `PharmacyB2BPage` (`/store/commerce/products`)
- 서비스 키 탭: kpa | kpa-groupbuy | glycopharm | cosmetics
- 데이터 소스: `organization_product_listings`

**로컬 상품:**
- **전용 관리 UI 미발견**
- 데이터 소스: `store_local_products`
- 백엔드 API 존재 (store-local-product routes)

**구분 방식:**
```
공급자 상품: PharmacyB2BPage (서비스 키 탭)
로컬 상품:  전용 UI 없음 → MISSING
```

**문제:** 매장 관리자가 로컬 상품을 관리할 수 있는 UI가 명시적으로 발견되지 않음.

### 5.2 B2C 스토어프론트에서의 구분

- Commerce 상품: 6중 가시성 게이트를 통과한 상품 (별도 쿼리)
- 로컬 상품: `store_local_products`에서 별도 쿼리
- **DB UNION 금지** — 앱 레이어에서 병합

### 5.3 GlycoPharm / K-Cosmetics / Neture — ❌ MISSING

로컬 상품/공급자 상품 구분 UI 없음.

---

## 6. 채널 표시 흐름

### 6.1 B2C 스토어프론트 — KPA ✅ OK

| 항목 | 값 |
|------|------|
| 페이지 | `StorefrontProductDetailPage.tsx` |
| 위치 | `services/web-kpa-society/src/pages/storefront/StorefrontProductDetailPage.tsx` |
| 라우트 | `/store/:slug/products/:id` |

**흐름:**
```
공개 방문자 → /store/{slug} → 스토어프론트 홈 → 상품 클릭 → 상품 상세
```

**표시 조건 (6중 게이트):**
1. `organization_product_listings.is_active = true`
2. `organization_product_channels.is_active = true`
3. `organization_channels.channel_type = 'B2C'`
4. `organization_channels.status = 'APPROVED'`
5. `supplier_product_offers.is_active = true`
6. `neture_suppliers.status = 'ACTIVE'`

### 6.2 B2C 스토어프론트 — Neture ⚠️ PARTIAL

| 항목 | 값 |
|------|------|
| 페이지 | `StoreProductPage.tsx` |
| 위치 | `services/web-neture/src/pages/store/StoreProductPage.tsx` |
| 라우트 | `/store/:storeSlug/product/:productSlug` (v2), `/store/product/:offerId` (v1) |

**기능:**
- Hero 섹션: 이미지 + 상품명 + 브랜드 + 공급자
- 가격 섹션: 공급자 가격 + 소비자 참고가 + 리스팅 오버라이드 가격
- 약사 코멘트: `StoreProductProfile`에서 조회
- QR 코드 다운로드 + 공유 링크 + 전단지 PDF (1/4/8분할 A4)
- 장바구니/바로구매 버튼

**참조 토큰:** `?ref=TOKEN` → sessionStorage (리퍼럴 추적)

### 6.3 B2C 스토어프론트 — GlycoPharm ❌ MISSING

매장 스토어프론트 없음.

### 6.4 Tablet 채널 — ⚠️ PARTIAL

| 항목 | 값 |
|------|------|
| 백엔드 | `tablet.controller.ts` |
| 위치 | `apps/api-server/src/routes/o4o-store/controllers/tablet.controller.ts` |

- 백엔드 라우트 존재
- 프론트엔드: 데이터 기반 렌더링 (태블릿 하드웨어)
- 전용 웹 UI 불명확

### 6.5 Signage 채널 — ✅ OK (별도 시스템)

- Core Signage API: `/api/signage/:serviceKey/`
- Signage Player 앱에서 렌더링
- Operator Console에서 HQ 콘텐츠 관리 (WO-O4O-SIGNAGE-CONSOLE-V1 완료)

### 6.6 POP / QR — ✅ OK

- POP: AI 콘텐츠 (`pop_short`, `pop_long`) + 마케팅 에셋
- QR: AI 콘텐츠 (`qr_description`) + Neture `StoreProductPage`의 QR 다운로드 기능

---

## 7. UX 문제 분석

### 7.1 서비스별 종합 평가

| # | 영역 | KPA Society | GlycoPharm | K-Cosmetics | Neture |
|---|------|:-----------:|:----------:|:-----------:|:------:|
| 1 | 공급자 상품 조회 | ✅ OK | ⚠️ CONFUSING | ❌ MISSING | ❌ MISSING |
| 2 | 상품 채택 신청 | ✅ OK | ❌ MISSING | ❌ MISSING | ❌ MISSING |
| 3 | 운영자 승인 | ✅ OK | ❌ MISSING | ❌ MISSING | ❌ MISSING |
| 4 | 채택 상품 목록 | ✅ OK | ❌ MISSING | ❌ MISSING | ❌ MISSING |
| 5 | 가격/노출 편집 | ⚠️ PARTIAL | ❌ MISSING | ❌ MISSING | ❌ MISSING |
| 6 | 채널 관리 | ✅ OK | ❌ MISSING | ❌ MISSING | ❌ MISSING |
| 7 | B2C 스토어프론트 | ✅ OK | ❌ MISSING | ❌ MISSING | ⚠️ PARTIAL |
| 8 | 로컬 상품 관리 | ⚠️ PARTIAL | ❌ MISSING | ❌ MISSING | ❌ MISSING |
| 9 | Tablet/Signage | ⚠️ PARTIAL | ⚠️ PARTIAL | ⚠️ PARTIAL | ⚠️ PARTIAL |

### 7.2 Critical UX 문제

| # | 문제 | 영향 | 심각도 |
|---|------|------|:------:|
| 1 | **GlycoPharm 매장 채택 UX 전체 부재** | GlycoPharm 매장이 상품을 채택할 수 없음 | 🔴 HIGH |
| 2 | **K-Cosmetics 매장 채택 UX 전체 부재** | K-Cosmetics 매장이 상품을 채택할 수 없음 | 🔴 HIGH |
| 3 | **KPA 리스팅 편집 UI 불명확** | 매장 관리자가 가격/노출 변경할 방법이 모호 | 🟡 MEDIUM |
| 4 | **KPA 로컬 상품 관리 UI 미발견** | 매장 자체 상품(Display Domain) 관리 경로 불분명 | 🟡 MEDIUM |
| 5 | **채널 관리 페이지 숨김** | `/store/channels` 직접 URL만 가능, 메뉴에 미표시 | 🟡 MEDIUM |

### 7.3 구조적 관찰

**KPA Society만 완전한 채택 UX 보유:**
```
카탈로그 → 판매 신청 → 운영자 승인 → 자동 리스팅 생성 → 채널 설정 → B2C 표시
```

**GlycoPharm/K-Cosmetics/Neture:**
- 백엔드 인프라(엔티티, 마이그레이션, API 라우트)는 대부분 존재
- 프론트엔드 UI가 미구현 → 실질적으로 상품 채택 불가

**GlycoPharm 특이사항:**
- 운영자용 ProductMaster 콘솔은 존재 (`/operator/products`)
- 매장용 카탈로그/채택 페이지는 없음
- 운영자 콘솔과 매장 관리 화면의 혼동 가능성

### 7.4 UX 흐름 비교

**KPA Society (Complete):**
```
[매장 관리자]                              [운영자]
    │                                        │
    ▼                                        │
 /hub/b2b (카탈로그)                          │
    │                                        │
    ▼                                        │
 "판매 신청" 클릭                              │
    │                                        │
    ▼                                        ▼
 POST /pharmacy/products/apply ──→ /operator/product-applications
    │                                        │
    │                               "승인" 클릭 │
    │                                        ▼
    │                           PATCH /:id/approve
    │                                        │
    │                           OrganizationProductListing 자동 생성
    │                                        │
    ▼                                        │
 /store/commerce/products                    │
 (채택 상품 확인)                              │
    │                                        │
    ▼                                        │
 /store/channels                             │
 (채널별 상품 노출 설정)                        │
    │                                        │
    ▼                                        │
 B2C: /store/:slug/products                  │
 (공개 스토어프론트에 표시)                      │
```

**GlycoPharm / K-Cosmetics (Missing):**
```
[매장 관리자]
    │
    ▼
  ??? (카탈로그 없음)
    │
    ▼
  ??? (채택 신청 없음)
    │
    ▼
  ??? (리스팅 관리 없음)
    │
    ▼
  ??? (채널 설정 없음)
```

---

## 부록: 파일 참조

### 프론트엔드 (브라우저 UI)

| 기능 | 파일 |
|------|------|
| KPA 카탈로그 | `services/web-kpa-society/src/pages/pharmacy/HubB2BCatalogPage.tsx` |
| KPA 운영자 승인 | `services/web-kpa-society/src/pages/operator/ProductApplicationManagementPage.tsx` |
| KPA 채택 상품 목록 | `services/web-kpa-society/src/pages/pharmacy/PharmacyB2BPage.tsx` |
| KPA 채널 관리 | `services/web-kpa-society/src/pages/pharmacy/StoreChannelsPage.tsx` |
| KPA 스토어프론트 상품 | `services/web-kpa-society/src/pages/storefront/StorefrontProductDetailPage.tsx` |
| GlycoPharm 운영자 상품 | `services/web-glycopharm/src/pages/operator/ProductsPage.tsx` |
| Neture 스토어 상품 | `services/web-neture/src/pages/store/StoreProductPage.tsx` |

### API 클라이언트

| 기능 | 파일 |
|------|------|
| KPA 상품 API | `services/web-kpa-society/src/api/pharmacyProducts.ts` |
| KPA 채널 API | `services/web-kpa-society/src/api/channelProducts.ts` |

### 백엔드 (API 서버)

| 기능 | 파일 |
|------|------|
| 운영자 승인 컨트롤러 | `apps/api-server/src/routes/kpa/controllers/operator-product-applications.controller.ts` |
| KPA 라우트 매니페스트 | `apps/api-server/src/routes/kpa/kpa.routes.ts` |
| 태블릿 컨트롤러 | `apps/api-server/src/routes/o4o-store/controllers/tablet.controller.ts` |

### 엔티티 (TypeORM)

| 엔티티 | 파일 |
|--------|------|
| OrganizationProductListing | `apps/api-server/src/routes/kpa/entities/organization-product-listing.entity.ts` |
| OrganizationProductChannel | `apps/api-server/src/routes/kpa/entities/organization-product-channel.entity.ts` |
| OrganizationChannel | `apps/api-server/src/routes/kpa/entities/organization-channel.entity.ts` |
| StoreLocalProduct | `apps/api-server/src/routes/platform/entities/store-local-product.entity.ts` |

---

## 후속 작업 참조

이 조사 결과를 기반으로 다음 WO를 수행할 수 있다:

| WO | 목적 |
|------|------|
| `WO-O4O-STORE-PRODUCT-ADOPTION-UX-FIX-V1` | GlycoPharm/K-Cosmetics 매장 채택 UX 구현 |
| `WO-O4O-STORE-CATALOG-MANAGEMENT-V1` | 카탈로그 브라우징 + 채택 관리 UI 통합 |
| `WO-O4O-STORE-CHANNEL-EXPOSURE-FIX-V1` | 채널 관리 메뉴 노출 + 리스팅 편집 UI |

---

*Generated: 2026-03-11*
*Status: Investigation Complete — READ-ONLY*

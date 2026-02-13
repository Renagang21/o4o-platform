# IR-O4O-STOREFRONT-RUNTIME-AUDIT-V1

> **O4O StoreFront Runtime Audit**
> Investigator: Claude Code | Date: 2026-02-13 | Status: **COMPLETE**

---

## 1. Executive Summary

**종합 판정: "구조 불완전" — GlycoPharm만 부분 동작, 나머지 서비스 StoreFront 부재**

GlycoPharm은 유일하게 공개 StoreFront(`/store/:pharmacyId`)를 가지고 있으며,
상품 조회와 약국 정보는 **실제 DB 기반**으로 동작한다.
그러나 **템플릿/테마/Hero/Event 콘텐츠**는 DB 영속성이 없는 Mock/Client-only 상태이다.

K-Cosmetics와 Neture는 **B2C 공개 매장 페이지 자체가 없다.**

### 체크리스트 총점

| 영역 | GlycoPharm | K-Cosmetics | Neture |
|------|:----------:|:-----------:|:------:|
| A. URL/라우팅 | **4/5** | 0/5 | 0/5 |
| B. 데이터 소스 | **4/5** | 1/5 | 0/5 |
| C. 템플릿 영속성 | **1.5/5** | 0/5 | 0/5 |
| D. 상품 노출 | **4/5** | 2/5 | 0/5 |
| E. 상태 제어 | **3/5** | 1/5 | 0/5 |
| F. SEO/외부 접근 | **0/5** | 0/5 | 0/5 |
| **서비스 평균** | **2.8/5** | **0.7/5** | **0/5** |

---

## 2. Area A — URL 및 라우팅 구조

### 2.1 GlycoPharm (Score: 4/5)

**파일:** `services/web-glycopharm/src/App.tsx` (Lines 105-418)

**라우트 패턴:** `/store/:pharmacyId/*`

3가지 디스플레이 모드 지원:

| 모드 | URL | Layout | 용도 |
|------|-----|--------|------|
| Consumer Web | `/store/:pharmacyId` | `StoreLayout` | 일반 웹 쇼핑 |
| Kiosk | `/store/:pharmacyId/kiosk` | `KioskLayout` | 매장 키오스크 |
| Tablet | `/store/:pharmacyId/tablet` | `TabletLayout` | 직원용 태블릿 |
| QR Landing | `/qr/:pharmacyId` | 단독 | QR 코드 진입 |

**각 모드 하위 라우트:** `index`, `products`, `products/:productId`, `cart`

| 항목 | 질문 | 상태 | 상세 |
|------|------|:----:|------|
| A-1 | `/store/:slug` 라우트 존재? | **YES** | `/store/:pharmacyId/*` (3개 모드) |
| A-2 | slug DB 컬럼 존재? | **YES** | `GlycopharmPharmacy.code` (VARCHAR 100, unique) |
| A-3 | slug unique 제약? | **YES** | `@Column({ unique: true })` |
| A-4 | slug 자동 생성 로직? | **YES** | 승인 시 `GP-{timestamp}-{random}` 생성 |
| A-5 | status != active 시 접근 차단? | **PARTIAL** | API 레벨에서 active만 반환, **Frontend 라우트 가드 없음** |

### 2.2 K-Cosmetics (Score: 0/5)

**B2C 공개 StoreFront 없음.** `/platform/stores`는 운영자 대시보드(인증 필요).

### 2.3 Neture (Score: 0/5)

**B2C 공개 StoreFront 없음.** `/workspace/*`는 B2B 공급자 플랫폼(인증 필요).

---

## 3. Area B — Store 데이터 소스

### 3.1 GlycoPharm (Score: 4/5)

**파일:** `services/web-glycopharm/src/api/store.ts`

| 엔드포인트 | Method | 데이터 소스 | Mock 여부 |
|-----------|--------|-----------|----------|
| `/api/v1/glycopharm/stores/{slug}` | GET | **DB** (`glycopharm_pharmacies`) | **NO** |
| `/api/v1/glycopharm/stores/{slug}/categories` | GET | **DB** | **NO** |
| `/api/v1/glycopharm/stores/{slug}/products` | GET | **DB** (`glycopharm_products`) | **NO** |
| `/api/v1/glycopharm/stores/{slug}/products/featured` | GET | **DB** (`glycopharm_featured_products`) | **NO** |
| `/api/v1/glycopharm/stores/{slug}/products/{id}` | GET | **DB** | **NO** |
| `/api/v1/glycopharm/stores/{slug}/cart` | GET/POST/DELETE | **DB** | **NO** |
| `/api/v1/glycopharm/stores/{slug}/orders` | POST | **DB** | **NO** |

**StoreFront 데이터 로딩 흐름** (`StoreFront.tsx` Lines 38-75):
```
useEffect → Promise.all([
  storeApi.getStoreBySlug(storeSlug),       // 약국 정보
  storeApi.getStoreCategories(storeSlug),   // 카테고리
  storeApi.getFeaturedProducts(storeSlug, 4) // 추천 상품
])
```

| 항목 | 질문 | 상태 | 상세 |
|------|------|:----:|------|
| B-1 | Store 조회 API 존재? | **YES** | `/stores/{slug}` 전체 구현 |
| B-2 | 실제 DB 조회? | **YES** | Repository → TypeORM query |
| B-3 | enabled_services 반영? | **PARTIAL** | Entity에 존재하나 StoreFront 필터링 미확인 |
| B-4 | StoreMember 기반 권한 체크? | **NO** | 공개 API — 인증 불요 |
| B-5 | fallback mock 존재? | **NO** | 순수 DB 기반 |

### 3.2 K-Cosmetics (Score: 1/5)

- 공개 상품 API 존재: `GET /api/v1/cosmetics/products` (DB 기반)
- 그러나 **매장 단위 조회 API 없음** — 모든 상품이 카탈로그 수준
- 매장별 필터(`storeId`) 없이 전체 상품만 반환

### 3.3 Neture (Score: 0/5)

- 공급자 API 존재하나 StoreFront 개념 없음

---

## 4. Area C — 템플릿 및 디자인 영속성

### 4.1 GlycoPharm 종합 (Score: 1.5/5)

| 콘텐츠 | DB 테이블 | API 엔드포인트 | 현재 상태 |
|--------|----------|--------------|----------|
| **Hero Content** | **없음** | **없음** | **MOCK ONLY** — `HeroManagerTab`에 하드코딩 |
| **Featured Products** | `glycopharm_featured_products` | `GET/POST/PATCH/DELETE /operator/featured-products` | **LIVE** ✅ |
| **Event/Notice** | **없음** | **없음** | **MOCK ONLY** — `EventNoticeTab`에 하드코딩 |
| **Template Config** | **없음** (Pharmacy에 컬럼 없음) | **없음** | **TYPE ONLY** — Frontend 타입 정의만 |
| **Theme Selection** | **없음** (Pharmacy에 컬럼 없음) | **없음** | **TYPE ONLY** — Frontend 타입 정의만 |
| **Store Info** | `glycopharm_pharmacies` | `GET /stores/{slug}` | **LIVE** ✅ |

| 항목 | 질문 | 상태 | 상세 |
|------|------|:----:|------|
| C-1 | Template DB 저장 테이블 존재? | **NO** | 템플릿 관련 마이그레이션 없음 |
| C-2 | Store에 templateId 필드? | **NO** | `GlycopharmPharmacy`에 template/theme 컬럼 없음 |
| C-3 | theme 선택 후 DB 반영? | **NO** | `PharmacySettings.handleSave()`에 TODO: API 미구현 |
| C-4 | Hero/Event DB 저장 구조? | **PARTIAL** | Featured Products만 DB, Hero/Event는 Mock |
| C-5 | 서비스별 기본 템플릿 자동 적용? | **YES** | Frontend 코드에서 `DEFAULT_STORE_TEMPLATE` 적용 |

### 4.2 Featured Products — 유일한 완전 구현

**Entity:** `apps/api-server/src/routes/glycopharm/entities/glycopharm-featured-product.entity.ts`

```
glycopharm_featured_products
  ├── id (UUID PK)
  ├── service (default: 'glycopharm')
  ├── context (default: 'store-home')
  ├── product_id (FK → GlycopharmProduct)
  ├── position (int, 0-based)
  ├── is_active (boolean)
  ├── created_by_user_id
  └── created_by_user_name
```

**CRUD API 완비:**
- `GET /operator/featured-products` — 목록 (service, context 필터)
- `POST /operator/featured-products` — 추가 (중복 체크, 자동 position)
- `PATCH /operator/featured-products/order` — 순서 변경 (트랜잭션)
- `PATCH /operator/featured-products/:id` — 활성/비활성
- `DELETE /operator/featured-products/:id` — 삭제 + 재정렬

**Service:** `apps/api-server/src/routes/glycopharm/services/featured-products.service.ts`

### 4.3 Hero Content — Mock 상태 상세

**파일:** `services/web-glycopharm/src/pages/operator/store-template/tabs/HeroManagerTab.tsx`

- Lines 26-61: `MOCK_HERO_CONTENTS` 3개 항목 하드코딩
- `handleSave()`는 `useState` 로컬 상태만 업데이트
- TODO 코멘트: "Implement save API"
- **DB 테이블 없음, API 없음, 서버 저장 불가**

### 4.4 Event/Notice — Mock 상태 상세

**파일:** `services/web-glycopharm/src/pages/operator/store-template/tabs/EventNoticeTab.tsx`

- Lines 29-64: `MOCK_EVENT_NOTICES` 3개 항목 하드코딩
- `handleSave()`는 `useState` 로컬 상태만 업데이트
- **DB 테이블 없음, API 없음, 서버 저장 불가**

> **참고:** `GlycopharmEvent` Entity가 존재하나 이것은 **사용자 행동 추적**(impression/click/qr_scan)용이지 운영자 콘텐츠 관리용이 아님

### 4.5 PharmacySettings — Theme 저장 불가

**파일:** `services/web-glycopharm/src/pages/pharmacy/PharmacySettings.tsx`

- Template 선택 UI: 드롭다운 (franchise-standard 1종)
- Theme 선택 UI: 4종 테마 선택 + 컬러 프리뷰
- `handleSave()`: **API 미구현** — 로컬 state만 변경
- 탭 6개 중 Payment, Shipping, Security는 "Coming soon" 상태

---

## 5. Area D — 상품 노출 연결

### 5.1 GlycoPharm (Score: 4/5)

**상품 Entity:** `apps/api-server/src/routes/glycopharm/entities/glycopharm-product.entity.ts`

```
glycopharm_products
  ├── id (UUID PK)
  ├── pharmacy_id (FK → GlycopharmPharmacy, nullable)
  ├── name, sku (unique), description
  ├── category (enum: 'blood_glucose_meter', 'test_strip', etc.)
  ├── price, sale_price (decimal)
  ├── stock_quantity (int)
  ├── images (JSONB)
  ├── status ('draft' | 'active' | 'inactive' | 'discontinued')
  └── is_featured (boolean, deprecated → FeaturedProduct entity)
```

**Featured Products 우선순위 체인:**
```
1. Operator 지정 (GlycopharmFeaturedProduct.is_active=true, position 순)
2. Market Trial 상품 (StoreProduct.isMarketTrial=true)
3. 자동 추천 (알고리즘)
4. 일반 재고 상품
```

| 항목 | 질문 | 상태 | 상세 |
|------|------|:----:|------|
| D-1 | 매장별 상품 연결 구조? | **YES** | `pharmacy_id` FK on products |
| D-2 | Listing 기반 조회? | **PARTIAL** | GlycoPharm은 직접 FK, K-Cosmetics만 Listing 패턴 |
| D-3 | 상품 0개 시 empty UI? | **미확인** | StoreFront에서 확인 필요 |
| D-4 | 운영자 추천과 충돌 처리? | **YES** | 명확한 우선순위 체인 |
| D-5 | 매장 카테고리 필터? | **YES** | `storeApi.getStoreCategories()` + serviceContext 필터 |

### 5.2 K-Cosmetics (Score: 2/5)

- `CosmeticsStoreListing` Entity 존재 (store↔product 매핑 + 가격 오버라이드)
- **그러나 공개 API 없음** — 인증된 멤버만 조회 가능
- Public product API는 매장 무관 카탈로그 전체 반환

### 5.3 Neture (Score: 0/5)

- 매장 개념 없으므로 매장별 상품 노출 해당 없음

---

## 6. Area E — 공개 제어 및 상태 관리

### 6.1 GlycoPharm Public API 상태 체크 (Score: 3/5)

| 엔드포인트 | 상태 필터 | 방식 |
|-----------|:--------:|------|
| `GET /pharmacies` | **YES** | `status='active'` 하드코딩 |
| `GET /products` | **YES** | `findPublicProducts()` → `status='active'` 강제 |
| `GET /products/:id` | **YES** | `status !== 'active'` → 404 반환 |
| `GET /stores/{slug}` | **미확인** | API 존재하나 상태 체크 로직 미확인 |

| 항목 | 질문 | 상태 | 상세 |
|------|------|:----:|------|
| E-1 | suspended 시 403 처리? | **PARTIAL** | API에서 active만 반환하나, `/store/:id` Frontend 라우트 자체는 차단 안 됨 |
| E-2 | draft 상태 접근 차단? | **YES** | API 레벨에서 active 외 미노출 |
| E-3 | 신청 중 접근 제한? | **YES** | Pharmacy가 아직 생성 안 됐으므로 slug 자체 없음 |
| E-4 | 삭제된 매장 404? | **미확인** | soft-delete 패턴 미구현 |

### 6.2 K-Cosmetics 상태 체크 (Score: 1/5)

| 엔드포인트 | 상태 필터 |
|-----------|:--------:|
| `GET /cosmetics/products` | **NO** — 매장 status 체크 없음 |
| `GET /cosmetics/products/:id` | **NO** — 매장 status 체크 없음 |
| `GET /cosmetics/stores/:storeId` | **NO** — membership만 체크, status 무시 |
| `PATCH /cosmetics/stores/admin/:id/status` | **YES** — admin이 상태 변경 가능 |

**위험:** 정지(suspended)된 매장의 상품이 공개 카탈로그에 계속 노출될 수 있음

### 6.3 Neture 상태 체크 (Score: 0/5)

- `GET /neture/suppliers`: 상태 필터 **선택적** (강제 아님)
- `GET /neture/suppliers/:slug`: 상태 체크 **없음**

---

## 7. Area F — SEO 및 외부 접근성

### 7.1 전 서비스 (Score: 0/5)

| 항목 | 질문 | 상태 | 상세 |
|------|------|:----:|------|
| F-1 | SSR 또는 SEO 메타 태그? | **NO** | `react-helmet` 사용 없음 (SPA only) |
| F-2 | OpenGraph 동적 반영? | **NO** | `og:title`, `og:image` 없음 |
| F-3 | sitemap 반영? | **NO** | 동적 sitemap 생성 없음 |

**결론:** 모든 서비스가 CSR(Client-Side Rendering) SPA이므로 검색 엔진 크롤링 불가.
매장 공개 URL을 외부에 공유해도 **메타 정보 없이 빈 페이지로 표시**됨.

---

## 8. 전체 GAP 종합

### CRITICAL

| ID | GAP | 서비스 | 영향 |
|----|-----|--------|------|
| **S-1** | Hero/Event 콘텐츠 DB 영속성 없음 — Mock only | GlycoPharm | 운영자가 등록한 콘텐츠 저장 불가 |
| **S-2** | Template/Theme 선택 DB 영속성 없음 | GlycoPharm | 약국별 커스터마이징 저장 불가 |
| **S-3** | K-Cosmetics B2C 공개 StoreFront 전무 | K-Cosmetics | 소비자 쇼핑 불가 |

### HIGH

| ID | GAP | 서비스 | 영향 |
|----|-----|--------|------|
| **S-4** | Cosmetics 공개 상품 API에 매장 상태 체크 없음 | K-Cosmetics | 정지 매장 상품 노출 |
| **S-5** | SEO/OpenGraph 전 서비스 미구현 | All | 검색 엔진 노출 불가, SNS 공유 시 빈 카드 |
| **S-6** | GlycoPharm Frontend 라우트 가드에 매장 상태 체크 없음 | GlycoPharm | 비활성 매장 URL 직접 접근 가능 |
| **S-7** | PharmacySettings 저장 API 전무 (Payment, Shipping, Security 포함) | GlycoPharm | 매장 설정 변경 영속 불가 |

### MEDIUM

| ID | GAP | 서비스 | 영향 |
|----|-----|--------|------|
| **S-8** | GlycoPharm slug가 `code` 필드 재활용 — 전용 slug 없음 | GlycoPharm | SEO 불리한 URL (`GP-1707123456-abc123`) |
| **S-9** | Neture 공급자 상태 필터 선택적 — 비활성 공급자 공개 가능 | Neture | 데이터 노출 위험 |
| **S-10** | Authenticated 매장 접근에 status 체크 없음 (membership만) | K-Cosmetics | 정지 매장 멤버가 데이터 접근 가능 |
| **S-11** | 매장 soft-delete/hard-delete 정책 미정의 | All | 삭제된 매장 처리 불명 |

### LOW

| ID | GAP | 서비스 |
|----|-----|--------|
| **S-12** | Template 타입 `franchise-standard` 1종만 정의 | GlycoPharm |
| **S-13** | Neture B2C StoreFront 부재 | Neture |

---

## 9. 아키텍처 관찰

### 9.1 StoreFront 구현 성숙도 매트릭스

```
                 DB 영속성
                    ▲
                    │
              5 ────┤                              ╔══════════════╗
                    │                              ║ Featured     ║
              4 ────┤    ╔═══════════╗             ║ Products     ║
                    │    ║ Store Info ║             ╚══════════════╝
              3 ────┤    ║ Products   ║
                    │    ╚═══════════╝
              2 ────┤
                    │                  ╔═══════════╗
              1 ────┤                  ║ Hero      ║
                    │                  ║ Event     ║
              0 ────┤──────────────────║ Template  ║──────────────►
                    │  Mock/None       ║ Theme     ║     운영 완비
                                       ╚═══════════╝

Store Info, Products, Featured Products = DB 기반 (LIVE)
Hero, Event, Template, Theme = Mock/Type only (NOT PERSISTED)
```

### 9.2 서비스별 StoreFront 존재 여부

| 서비스 | 공개 URL | 인증 불요 | DB 기반 | 템플릿 | 상태 |
|--------|:--------:|:--------:|:------:|:------:|------|
| GlycoPharm | `/store/:code` (3 modes) | **YES** | **YES** (부분) | **YES** (부분) | **부분 동작** |
| K-Cosmetics | **없음** | — | — | — | **미구현** |
| Neture | **없음** | — | — | — | **미구현** |
| KPA | **없음** (조직 기반) | — | — | — | **해당 없음** |

### 9.3 GlycoPharm StoreFront 동작 요약

```
[소비자]  /store/GP-xxxx  (공개, 인증 불요)
           │
           ├── Store Info ──── DB ✅ (glycopharm_pharmacies)
           ├── Categories ──── DB ✅ (glycopharm products 기반)
           ├── Products ────── DB ✅ (glycopharm_products where pharmacy_id=X)
           ├── Featured ────── DB ✅ (glycopharm_featured_products)
           │
           ├── Hero Banner ─── MOCK ❌ (Frontend 하드코딩)
           ├── Events ──────── MOCK ❌ (Frontend 하드코딩)
           ├── Template ────── DEFAULT ❌ (franchise-standard 고정)
           └── Theme ────────── DEFAULT ❌ (professional 고정)

[약국주인]  /pharmacy/settings
           ├── Template 선택 → 저장 불가 ❌
           ├── Theme 선택 → 저장 불가 ❌
           └── Payment/Shipping → "Coming soon"

[운영자]  /operator/store-template
           ├── Hero 관리 → Mock 저장 ❌
           ├── Featured Products → DB 저장 ✅
           └── Event/Notice → Mock 저장 ❌
```

---

## 10. 종합 판정

### GlycoPharm StoreFront: "구조 불완전"

| 기준 | 상태 | 판정 |
|------|:----:|------|
| DB 기반 | **PARTIAL** | 상품/약국 = DB, 템플릿/콘텐츠 = Mock |
| slug 영속 | **YES** | `pharmacy.code` (unique, DB) |
| 상품 연결 | **YES** | `pharmacy_id` FK + Featured Products |
| 템플릿 영속 | **NO** | DB 컬럼/테이블 없음 |
| 상태 제어 | **PARTIAL** | API 레벨만, Frontend 가드 없음 |
| 운영자 개입 반영 | **PARTIAL** | Featured Products만, Hero/Event는 Mock |

**6개 기준 중 2개 YES, 3개 PARTIAL, 1개 NO → "구조 불완전"**

### K-Cosmetics / Neture: "미구현"

B2C 공개 StoreFront 자체가 존재하지 않으므로 판정 불가.

---

## 11. 우선순위 권고

### Phase 1: GlycoPharm StoreFront 완성 (DB 영속화)

1. **Hero Content DB 테이블 생성 + API 구현**
   - 마이그레이션: `glycopharm_hero_contents` 테이블
   - CRUD API 엔드포인트
   - `HeroManagerTab` → 실제 API 연결

2. **Event/Notice DB 테이블 생성 + API 구현**
   - 마이그레이션: `glycopharm_event_notices` 테이블
   - CRUD API 엔드포인트
   - `EventNoticeTab` → 실제 API 연결

3. **Template/Theme 영속화**
   - `glycopharm_pharmacies`에 `template`, `theme` 컬럼 추가
   - `PharmacySettings.handleSave()` → API 연결

### Phase 2: 접근 제어 강화

4. **Frontend 라우트 가드에 매장 상태 체크 추가**
5. **K-Cosmetics 공개 상품 API에 매장 상태 필터 추가**

### Phase 3: SEO/외부 접근성

6. **SSR 또는 메타 태그 인프라 구축**
7. **SEO 친화적 slug 생성 로직** (현재 `GP-timestamp-random` → `약국명-지역`)

---

## 12. 부록: 조사 범위

### 조사한 Frontend 파일

| 파일 | 조사 내용 |
|------|----------|
| `web-glycopharm/src/App.tsx` | 라우팅 정의 (Lines 105-418) |
| `web-glycopharm/src/pages/store/StoreFront.tsx` | 데이터 로딩 흐름 |
| `web-glycopharm/src/api/store.ts` | Store API 클라이언트 |
| `web-glycopharm/src/api/glycopharm.ts` | Featured Products API |
| `web-glycopharm/src/components/store/template/FranchiseStandardTemplate.tsx` | 템플릿 렌더러 |
| `web-glycopharm/src/pages/operator/store-template/tabs/HeroManagerTab.tsx` | Hero Mock 확인 |
| `web-glycopharm/src/pages/operator/store-template/tabs/FeaturedProductsTab.tsx` | Featured API 확인 |
| `web-glycopharm/src/pages/operator/store-template/tabs/EventNoticeTab.tsx` | Event Mock 확인 |
| `web-glycopharm/src/pages/pharmacy/PharmacySettings.tsx` | 설정 저장 확인 |
| `web-glycopharm/src/types/store.ts` | 타입 정의 전체 |
| `web-k-cosmetics/src/App.tsx` | StoreFront 부재 확인 |
| `web-neture/src/App.tsx` | StoreFront 부재 확인 |

### 조사한 Backend 파일

| 파일 | 조사 내용 |
|------|----------|
| `routes/glycopharm/controllers/glycopharm.controller.ts` | 공개 API + 상태 필터 |
| `routes/glycopharm/controllers/pharmacy.controller.ts` | 인증 API |
| `routes/glycopharm/controllers/public.controller.ts` | 전용 공개 엔드포인트 |
| `routes/glycopharm/controllers/cockpit.controller.ts` | 약국 대시보드 |
| `routes/glycopharm/repositories/glycopharm.repository.ts` | DB 쿼리 확인 |
| `routes/glycopharm/services/featured-products.service.ts` | Featured CRUD |
| `routes/glycopharm/entities/glycopharm-featured-product.entity.ts` | Featured Entity |
| `routes/glycopharm/entities/glycopharm-product.entity.ts` | 상품 Entity |
| `routes/glycopharm/entities/glycopharm-pharmacy.entity.ts` | 약국 Entity |
| `routes/cosmetics/controllers/cosmetics.controller.ts` | 공개 API |
| `routes/cosmetics/controllers/cosmetics-store.controller.ts` | 매장 관리 API |
| `routes/neture/controllers/neture.controller.ts` | 공급자 API |

### 조사한 Controller 전체 목록

| 서비스 | Controller 수 | 주요 컨트롤러 |
|--------|:------------:|-------------|
| GlycoPharm | **18개** | glycopharm, admin, pharmacy, public, cockpit, checkout, display, signage, operator, event, funnel, report, billing, invoice 등 |
| K-Cosmetics | **4개** | cosmetics, cosmetics-store, cosmetics-order, cosmetics-payment |
| KPA | **6개** | branch-public, admin-dashboard, operator-summary, member, application, organization |
| Neture | **2개** | neture, payment |

---

*End of Report*

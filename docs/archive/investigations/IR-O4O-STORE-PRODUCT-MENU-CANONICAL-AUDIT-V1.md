# IR-O4O-STORE-PRODUCT-MENU-CANONICAL-AUDIT-V1

> 목표: O4O Store 상품 관련 전체 구조를 현재 코드/DB/API/UI 기준으로 조사하고,
> 새로 합의된 canonical 구조와의 GAP을 식별하여 정비 방향을 결정한다.

**조사일**: 2026-05-11  
**조사 기준**: main 브랜치 HEAD (동기화 완료)  
**조사 범위**: 메뉴·UI·API·DB entity·제작 흐름·B2C 연결  
**변경사항**: 없음 (조사 전용)

---

## 1. 현재 메뉴 구조

### 1.1 사이드바 표시 항목 (storeMenuConfig.ts)

```
상품 관리
├── 공급 상품            → /store/commerce/products       (PharmacyB2BPage)
├── 내 매장 상품(통합)   → /store/my-products             (StoreProductsManagerPage)
├── 내 매장 상품         → /store/commerce/local-products  (StoreLocalProductsPage)
└── 주문 내역            → /store/commerce/orders          (StoreOrdersPage)
```

### 1.2 Hidden Routes (사이드바 미표시, URL 직접 접근만)

```
/store/commerce/products/b2c             → PharmacySellPage
/store/commerce/products/suppliers       → SupplierListPage
/store/commerce/products/:id/marketing   → ProductMarketingPage
/store/commerce/products/:id/pop         → ProductPopBuilderPage
```

### 1.3 Store Hub (별도 레이아웃, /store-hub)

```
/store-hub/b2b   → HubB2BCatalogPage   (공급자 상품 탐색 + 내 매장 추가 신청)
```

---

## 2. 각 페이지 실제 역할

### 2.1 PharmacyB2BPage (`/store/commerce/products`) — "공급 상품"

**실제 역할**: 플랫폼 B2B 카탈로그 조회 + 주문 작업대 (체크박스+수량 → 주문)

```typescript
// API
getCatalog()      → GET /pharmacy/products/catalog   (B2B 상품 카탈로그)
getListings()     → GET /pharmacy/products/listings  (내 취급 상품)

// 탭
전체 / 일반 B2B(kpa) / Event Offer(kpa-groupbuy) / 혈당관리(glycopharm) / 화장품(cosmetics)
```

**현재 이름 "공급 상품" 문제**: 이름은 "공급" 이나 실제 기능은 "B2B 주문/구매"  
canonical 기준 이 화면은 **"공급자 상품 구매"** (supplier 상품을 검색 → 주문 작업대 전달)

---

### 2.2 StoreProductsManagerPage (`/store/my-products`) — "내 매장 상품(통합)"

**실제 역할**: ProductMaster 기반 Offer 선택 → OrganizationProductListing 등록/관리

```typescript
// API — @o4o/store-products-ui/api.ts
searchStoreProducts()    → GET /api/v1/store/products/search       (ProductMaster 검색)
getMasterOffers()        → GET /api/v1/store/products/master/:id/offers (Offer 목록)
createStoreListing()     → POST /api/v1/store/products/list         (Listing 생성)
getMyStoreListings()     → GET /api/v1/store/products               (내 진열 목록)
updateStoreListing()     → PATCH /api/v1/store/products/:id         (활성/가격 수정)
updateListingDescription()→ PATCH /api/v1/store/products/:offerId/description (설명 override → store_product_profiles)

// 채널 관리
getMyChannels()          → GET /api/v1/store/products/my-channels
addProductToChannel()    → POST /api/v1/store/channel-products/:channelId
toggleChannelProduct()   → PATCH /api/v1/store/channel-products/:channelId/:id/activate|deactivate
```

**3단계 등록 플로우**:
```
ProductMaster 검색 → SupplierProductOffer 선택 → OrganizationProductListing 생성
```

**현재 이름 "내 매장 상품(통합)" 문제**:  
"(통합)" 접미는 사용자에게 불명확. 실제 기능은 **공급자 상품을 내 매장 진열 목록에 등록하고 관리**

---

### 2.3 StoreLocalProductsPage (`/store/commerce/local-products`) — "내 매장 상품"

**실제 역할**: 매장 자체 직접 등록 상품 CRUD (Display Domain only)

```typescript
// API
fetchLocalProducts()    → GET /api/v1/store/local-products
createLocalProduct()    → POST /api/v1/store/local-products
updateLocalProduct()    → PUT /api/v1/store/local-products/:id
deleteLocalProduct()    → DELETE /api/v1/store/local-products/:id

// 엔티티: store_local_products
// organization_id로 격리
// Checkout/Order 연결 금지 (주석 명시)
```

**현재 이름 "내 매장 상품" 문제**:  
`StoreProductsManagerPage`의 OrganizationProductListing도 "내 매장 상품"으로 인식될 수 있어 혼동 발생  
실제로는 **"직접 등록 상품"** (외부 공급 없이 매장이 자체 생성한 표시용 상품)

---

### 2.4 PharmacySellPage (`/store/commerce/products/b2c`, hidden) — 사이드바 미표시

**실제 역할**: 상품 판매 신청 + 매장 B2C/KIOSK/TABLET/SIGNAGE 채널 진열 관리

```typescript
// 탭 1: 판매 등록 신청 — product_applications
applyProduct()       → POST /pharmacy/products/apply
getApplications()    → GET /pharmacy/products/applications

// 탭 2: 내 매장 진열 상품 — organization_product_listings
getListings()        → GET /pharmacy/products/listings
updateListing()      → PUT /pharmacy/products/listings/:id
getListingChannels() → (채널 설정)
```

**문제**: 이 페이지가 사이드바에 없음. B2C 채널 진열 관리가 숨겨져 있어 약사가 발견 어려움.  
canonical 기준 이 기능은 **"내 매장 상품" 관리 하위**에 있어야 할 핵심 기능.

---

### 2.5 HubB2BCatalogPage (`/store-hub/b2b`) — 공급자 상품 탐색

**실제 역할**: 플랫폼 공급자 상품 탐색 → "내 매장에 추가" 신청

```typescript
getCatalog()              → GET /pharmacy/products/catalog
applyBySupplyProductId()  → POST /pharmacy/products/apply
cancelProductByOfferId()  → (내 매장에서 상품 제외)
```

**위치**: Store Hub (공동 공간)  
**Canonical**: 공급자 상품 탐색 → 신청은 Hub에서, 관리는 Store에서 — 구조적으로 적합

---

### 2.6 ProductMarketingPage (`/store/commerce/products/:id/marketing`, hidden)

**실제 역할**: 개별 상품에 연결된 QR + Library 자산 조회/관리 그래프

```typescript
getProductMarketing()           → 상품별 QR + library 자산 연결 현황
unlinkProductMarketingAsset()   → 자산 연결 해제
// "POP 만들기" → /store/commerce/products/:id/pop 으로 이동
```

**문제**: 사이드바 미표시. OrganizationProductListing의 개별 상품 상세에서만 진입.  
자료함 연계가 "상품 → QR/Library → 제작물" 방향이나 canonical 흐름(자료함 → 편집 → 결과물)과 반대.

---

### 2.7 ProductPopBuilderPage (`/store/commerce/products/:id/pop`, hidden)

**실제 역할**: 특정 OrganizationProductListing 기반 POP 만들기 (AI prefill)

```typescript
// 사용 엔티티: product_ai_contents (content_type='pop_short'|'pop_long')
// Reference: productId 기반
// B2C: StoreLocalProduct 기반이 아닌 OrganizationProductListing 기반
```

---

## 3. DB / Entity 구조 현황

### 3.1 활성 상품 관련 테이블

| 테이블 | 엔티티 | 역할 | KPA 사용 | 비고 |
|--------|--------|------|:---:|------|
| `product_masters` | ProductMaster | 바코드 기반 물리적 상품 SSOT | ✅ | `/api/v1/store/products/search` 기반 |
| `supplier_product_offers` | SupplierProductOffer | 공급자 공급 제안 | ✅ | offer_id → OPL로 연결 |
| `organization_product_listings` | OrganizationProductListing | 매장 진열 상품 (Listing) | ✅ | **두 API 경로가 동시 사용** |
| `store_local_products` | StoreLocalProduct | 직접 등록 상품 (Display Domain) | ✅ | Checkout 연결 금지 명시 |
| `store_product_profiles` | StoreProductProfile | 매장별 상품 설명 override | ✅ | (org_id, master_id) UNIQUE |
| `catalog_products` | CatalogProduct | 공용 상품 풀 | ⚠️ KPA 미사용 | GlycoPharm 전용 이중쓰기 |
| `store_products` | StoreProduct | CatalogProduct 복사 독립 상품 | ⚠️ KPA 미사용 | GlycoPharm 전용 |
| `service_products` | ServiceProduct | 서비스별 공급 정책 레이어 | ⚠️ 준비 테이블 | 미래 확장용 (주석 명시) |

### 3.2 OrganizationProductListing 생성 경로 이중화

동일 테이블(`organization_product_listings`)에 두 API 경로가 쓴다:

| 경로 | 컨트롤러 | 진입 화면 | 방식 |
|------|---------|---------|------|
| `POST /pharmacy/products/apply` | PharmacyProductsController | HubB2BCatalogPage + PharmacySellPage | service_key 기반 신청 → 승인 |
| `POST /api/v1/store/products/list` | StoreProductLibraryController | StoreProductsManagerPage | master_id + offer_id 직접 등록 |

**문제**: 두 흐름이 같은 테이블에 다른 방식으로 레코드를 생성.  
신청(apply) 흐름은 `operator 승인` 이 필요하나, 직접 등록(list) 흐름은 즉시 생성.

---

## 4. API 흐름 구조

### 4.1 공급자 상품 → 내 매장 상품 흐름 (2개 경로 공존)

```
[구 흐름] HubB2BCatalogPage / PharmacySellPage
  getCatalog()  → /pharmacy/products/catalog
  apply()       → /pharmacy/products/apply        → product_applications
                     ↓ operator 승인
                     → organization_product_listings (service_key 기반)

[신 흐름] StoreProductsManagerPage
  searchStoreProducts()  → /api/v1/store/products/search  (ProductMaster)
  getMasterOffers()      → /api/v1/store/products/master/:id/offers
  createStoreListing()   → /api/v1/store/products/list    → organization_product_listings (master_id + offer_id 기반)
```

두 흐름이 모두 활성 상태. canonical 단일 진입 경로 미정.

### 4.2 직접 등록 상품 흐름

```
StoreLocalProductsPage
  fetchLocalProducts()  → /api/v1/store/local-products  → store_local_products
  createLocalProduct()  → /api/v1/store/local-products  (POST)
```

명확하고 독립적. 타 흐름과 중복 없음.

### 4.3 제작 기능에서의 상품 참조

```
StoreQRPage                  → fetchLocalProducts()    → store_local_products
StoreProductDescriptionsPage → fetchLocalProducts()    → store_local_products
ProductPopBuilderPage        → useParams productId     → organization_product_listings
```

**문제**: QR/상품 상세설명은 LocalProduct 참조, POP Builder는 OPL 참조 — 두 제작 도구가 서로 다른 "상품" 개념 사용.

### 4.4 B2C 연결 흐름

```
OrganizationProductListing
  → B2C 채널 등록 (addProductToChannel / updateListing)
  → /store/:slug/products/:id (public storefront)
  → 소비자 주문 → checkoutService.createOrder()
  → 공급자 배송
```

B2C 연결 자체는 canonical 구조와 일치 (매장은 연결/전달만).  
**문제**: 채널 등록/관리 UI(`PharmacySellPage`)가 사이드바 미표시.

---

## 5. Canonical GAP 분석

### 5.1 메뉴 이름 불일치

| 현재 이름 | 현재 위치 | 실제 기능 | Canonical 이름 |
|---------|---------|---------|--------------|
| 공급 상품 | 사이드바 1순위 | B2B 카탈로그 조회 + 주문 작업대 | **공급자 상품 구매** |
| 내 매장 상품(통합) | 사이드바 2순위 | ProductMaster 기반 Listing 등록 | **내 매장 상품** |
| 내 매장 상품 | 사이드바 3순위 | 직접 등록 상품 CRUD | **직접 등록 상품** |

세 항목의 이름이 canonical 정의와 불일치. "공급 상품" ≠ "공급자 상품", "내 매장 상품(통합)" ≠ "내 매장 상품".

---

### 5.2 사이드바 미표시 핵심 기능

| 화면 | 경로 | 문제 |
|------|------|------|
| PharmacySellPage | `/store/commerce/products/b2c` | 판매 신청 + B2C 채널 진열 관리 — 숨겨짐 |
| ProductMarketingPage | `/store/commerce/products/:id/marketing` | 상품별 QR/Library 자산 관리 — 숨겨짐 |

PharmacySellPage는 B2C 진열의 핵심 기능임에도 진입 경로가 불명확.

---

### 5.3 OrganizationProductListing 이중 관리 경로

두 API 경로가 모두 OPL을 관리:
- `/pharmacy/products/apply` → **신청+승인** 흐름 (기존)
- `/api/v1/store/products/list` → **즉시 등록** 흐름 (신규)

동일 테이블에 서로 다른 승인 정책으로 레코드가 생성됨.  
canonical 단일 흐름으로 정리 필요.

---

### 5.4 제작 도구의 상품 소스 혼재

```
canonical: 내 자료함 데이터 불러오기 → 편집 → 결과물 저장

현재 현황:
  QR 만들기            → store_local_products (직접 등록 상품)  ← Local
  상품 상세설명 만들기  → store_local_products (직접 등록 상품)  ← Local
  POP 만들기 (자동)    → organization_product_listings           ← OPL
  POP 만들기 (via 자료함) → StartProductionModal → StoreLibrary  ← Snapshot
```

QR/상품 상세설명과 POP 빌더가 서로 다른 상품 소스를 참조.  
통일된 "상품 연계" 개념이 없음.

---

### 5.5 CatalogProduct / StoreProduct — KPA 미사용 레거시

- `catalog_products` 테이블: KPA에서 미사용. GlycoPharm이 이중쓰기 중.
- `store_products` 테이블: KPA에서 미사용. GlycoPharm catalog-store bridge 전용.
- `service_products` 테이블: 미래 준비 테이블, 현재 미사용 (주석 명시).

KPA 상품 흐름에서 이 테이블들이 등장하지 않으나, 플랫폼 레벨에서는 여전히 존재.

---

### 5.6 ProductMarketingPage 구조 역방향

현재 흐름: 상품 → QR 연결 → Library 자산 확인  
Canonical 흐름: 내 자료함 → 제작 시작 → 결과물 저장

ProductMarketingPage는 canonical과 반대 방향("상품 중심 자산 조회"). 자료함 중심 흐름으로 통합될지, 독립 보존될지 미결.

---

## 6. 현재 구조도 (AS-IS)

```
매장 사이드바 "상품 관리"
  ├── 공급 상품 (/store/commerce/products)
  │     └── PharmacyB2BPage
  │           ├── getCatalog → /pharmacy/products/catalog
  │           ├── getListings → /pharmacy/products/listings
  │           └── [주문 작업대] → StoreOrdersPage
  │
  ├── 내 매장 상품(통합) (/store/my-products)
  │     └── StoreProductsManagerPage
  │           ├── search → /api/v1/store/products/search (ProductMaster)
  │           ├── offers → /api/v1/store/products/master/:id/offers
  │           ├── list   → /api/v1/store/products/list (OPL 생성)
  │           └── channel → /api/v1/store/channel-products/...
  │
  ├── 내 매장 상품 (/store/commerce/local-products)
  │     └── StoreLocalProductsPage
  │           └── CRUD → /api/v1/store/local-products (store_local_products)
  │
  └── 주문 내역 (/store/commerce/orders)

Hidden Routes
  ├── /store/commerce/products/b2c → PharmacySellPage
  │     ├── 신청 → /pharmacy/products/apply → product_applications
  │     └── 진열 → /pharmacy/products/listings → organization_product_listings
  │
  ├── /store/commerce/products/:id/marketing → ProductMarketingPage
  │     └── QR + Library 자산 그래프
  │
  └── /store/commerce/products/:id/pop → ProductPopBuilderPage
        └── AI POP 생성 → product_ai_contents (productId 기반)

Store Hub (별도)
  └── /store-hub/b2b → HubB2BCatalogPage
        └── getCatalog → applyBySupplyProductId → product_applications
```

---

## 7. Canonical 목표 구조도 (TO-BE)

```
매장 사이드바 "상품 관리"
  ├── 공급자 상품     (/store/commerce/products)
  │     └── 공급자 상품 탐색 + 주문 [구매 중심]
  │         ※ HubB2BCatalogPage 기능과 통합 검토 필요
  │
  ├── 직접 등록 상품  (/store/commerce/local-products)
  │     └── 매장 자체 상품 등록/관리 (Display Only)
  │         ※ QR/상품 상세설명 제작의 상품 소스
  │
  └── 내 매장 상품    (/store/my-products 또는 통합)
        └── ProductMaster 기반 진열 + B2C 채널 관리
            ├── Listing 등록 (ProductMaster → Offer → 등록)
            └── 채널 관리 (B2C/KIOSK 노출)
            ※ PharmacySellPage 기능 노출 필요

제작 기능 (상품 연계 통일 필요)
  ├── QR 만들기     → LocalProduct (현재) — 통일 방향 결정 필요
  ├── 상품 상세설명  → LocalProduct (현재) — 통일 방향 결정 필요
  └── POP 만들기    → StartProductionModal → 자료함 기반 (canonical ✅)
```

---

## 8. 메뉴 재배치안

### Option A — 이름 정비만 (최소 변경)

| 현재 | 변경 후 | 이유 |
|------|---------|------|
| 공급 상품 | **공급자 상품** | 역할 명확화 |
| 내 매장 상품(통합) | **내 매장 상품** | "(통합)" 불필요 |
| 내 매장 상품 | **직접 등록 상품** | LocalProduct 의미 명확화 |

→ 위험도 없음. 3개 label 수정만.

### Option B — B2C 채널 관리 사이드바 노출 추가

```
상품 관리
  ├── 공급자 상품
  ├── 직접 등록 상품
  ├── 내 매장 상품         (Listing 관리)
  │     └── [서브: B2C 채널 관리]  ← PharmacySellPage 노출
  └── 주문 내역
```

→ 위험도 낮음. 사이드바 항목 추가만.

### Option C — OPL 이중 경로 통일 (중기)

- `/pharmacy/products/apply` (신청 흐름) 폐기 또는 Hub로 이전
- `/api/v1/store/products` 단일 경로로 통일
- PharmacySellPage를 StoreProductsManagerPage와 통합

→ 위험도 중간. API 경로 변경 필요.

---

## 9. 구조별 판정 표

| 항목 | 현재 상태 | 판정 | 우선순위 |
|------|---------|------|---------|
| "공급 상품" 라벨 | 오해를 유발 | **이름 변경** | 즉시 |
| "내 매장 상품(통합)" 라벨 | "(통합)" 혼란 | **이름 변경** | 즉시 |
| "내 매장 상품" 라벨 | LocalProduct 의미 불명확 | **이름 변경** | 즉시 |
| PharmacySellPage hidden | B2C 채널 관리 숨겨짐 | **사이드바 노출** | 단기 |
| OPL 이중 생성 경로 | /pharmacy/products vs /api/v1/store/products | **단일화 필요** | 중기 |
| QR/상품상세설명 LocalProduct 기반 | 제작 도구 상품 소스 불일치 | **방향 결정 필요** | 중기 |
| ProductMarketingPage hidden | 상품별 자산 그래프 진입 불명확 | **흐름 재검토** | 중기 |
| catalog_products/store_products | KPA 미사용 | **플랫폼 레벨 재검토** | 장기 |
| service_products | 준비 테이블, 미사용 | **현상 유지** | 장기 |
| StoreProductProfile | 설명 override, 정상 사용 | **Keep** | — |
| HubB2BCatalogPage (/store-hub/b2b) | 탐색 역할 명확 | **Keep** | — |

---

## 10. Dead 구조 / 중복 목록

| 항목 | 위치 | 판정 |
|------|------|------|
| `catalog_products` 테이블 | KPA에서 미참조 | KPA 기준 dead, GlycoPharm 유지 |
| `store_products` 테이블 | KPA에서 미참조 | KPA 기준 dead, GlycoPharm 유지 |
| `service_products` 테이블 | 현재 미사용 | 준비 테이블, dead는 아님 |
| `/pharmacy/products/apply` 경로 | PharmacySellPage + Hub에서 사용 | OPL 단일화 시 폐기 후보 |
| `PharmacySellPage` 탭2 (진열 관리) | StoreProductsManagerPage와 기능 중복 | 통합 후보 |

---

## 11. 후속 WO 제안 (위험도 낮은 순)

### WO-1 (즉시, 3줄, 위험도 없음)
```
WO-O4O-KPA-STORE-PRODUCT-MENU-LABEL-RENAME-V1
- storeMenuConfig.ts 3개 항목 이름 변경
  - "공급 상품"        → "공급자 상품"
  - "내 매장 상품(통합)" → "내 매장 상품"
  - "내 매장 상품"      → "직접 등록 상품"
- 위험도: 없음
```

### WO-2 (단기, 위험도 낮음)
```
WO-O4O-KPA-STORE-B2C-CHANNEL-SIDEBAR-ENTRY-V1
- PharmacySellPage를 사이드바에 노출
- "내 매장 상품" 하위 또는 별도 항목으로 배치
- B2C 채널 진열 관리 접근성 확보
- 위험도: 낮음 (사이드바 항목 추가)
```

### WO-3 (중기, 설계 필요)
```
WO-O4O-KPA-STORE-OPL-CREATE-FLOW-UNIFICATION-V1
- OrganizationProductListing 생성 경로 단일화
- /pharmacy/products/apply (신청+승인) vs /api/v1/store/products/list (즉시 등록) 중 canonical 결정
- PharmacySellPage 탭2 + StoreProductsManagerPage 통합 검토
- 위험도: 중간 (API 경로, 승인 정책 포함)
```

### WO-4 (중기, 방향 결정 필요)
```
WO-O4O-KPA-STORE-PRODUCTION-PRODUCT-SOURCE-UNIFICATION-V1
- QR/상품 상세설명의 상품 소스를 LocalProduct 또는 OPL로 통일
- ProductMarketingPage 역할을 canonical 자료함 흐름과 통합할지 결정
- 위험도: 중간 (제작 흐름 변경)
```

### WO-5 (장기, 플랫폼 레벨)
```
WO-O4O-CATALOG-STORE-PRODUCT-TABLE-ROLE-CLARIFICATION-V1
- catalog_products / store_products 테이블의 플랫폼 역할 재정의
- KPA에서는 미사용, GlycoPharm에서만 사용 중
- service_products 준비 테이블 향후 활성화 계획 수립
- 위험도: 높음 (GlycoPharm 영향)
```

---

## 12. Migration 필요 여부

| 항목 | Migration 필요 |
|------|:---:|
| 메뉴 라벨 변경 (WO-1) | ❌ (코드만) |
| 사이드바 B2C 노출 (WO-2) | ❌ (코드만) |
| OPL 경로 단일화 (WO-3) | ✅ (기존 레코드 service_key 정합성 검토) |
| 제작 상품 소스 통일 (WO-4) | ⚠️ 방향에 따라 결정 |
| catalog/store_products 재정의 (WO-5) | ✅ (GlycoPharm 대규모 영향) |

---

## 13. 결론 요약

**핵심 발견 3가지**:

1. **메뉴 3개 항목 이름이 모두 canonical 정의와 불일치** — 즉시 수정 가능, 위험 없음
2. **OrganizationProductListing이 두 API 경로에서 다른 승인 정책으로 생성** — 중기 단일화 필요
3. **QR/상품상세설명과 POP Builder가 서로 다른 "상품" 소스 참조** — 제작 흐름 설계 결정 필요

**B2C 구조 자체는 canonical과 일치** — 매장은 연결/전달 역할만 수행. 단, 관리 UI(`PharmacySellPage`)가 숨겨져 있어 접근성 문제.

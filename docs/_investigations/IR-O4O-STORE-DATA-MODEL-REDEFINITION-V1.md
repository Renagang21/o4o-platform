# IR-O4O-STORE-DATA-MODEL-REDEFINITION-V1

> **Store Core 데이터 모델 재정의를 위한 4-Layer 구조 조사**

| 항목 | 값 |
|------|------|
| 문서 ID | IR-O4O-STORE-DATA-MODEL-REDEFINITION-V1 |
| 상태 | COMPLETED |
| 조사일 | 2026-02-13 |
| 선행 조사 | IR-O4O-CYBER-STORE-LIFECYCLE-AUDIT-V1, IR-O4O-STOREFRONT-RUNTIME-AUDIT-V1 |

---

## 1. 조사 목적

O4O Platform에 공존하는 3개 Store 모델(GlycoPharm, K-Cosmetics, PhysicalStore)을
**Canonical Store Core** 데이터 모델로 통합 가능한지 판단한다.

조사 대상 4개 Layer:
- **A. Identity Layer** — 매장 식별/기본정보
- **B. Presentation Layer** — 템플릿/테마/히어로/콘텐츠
- **C. Commerce Layer** — 상품-매장 연결/주문 귀속
- **D. Lifecycle Layer** — 신청→승인→생성→비활성화

---

## 2. Layer A — Store Identity Layer

### 2.1 현행 엔티티 필드 비교

| 필드 | GlycopharmPharmacy | CosmeticsStore | PhysicalStore | GlucoseViewPharmacy |
|------|-------------------|----------------|---------------|---------------------|
| **스키마** | `public` | `cosmetics` | `public` | `public` |
| **테이블** | `glycopharm_pharmacies` | `cosmetics_stores` | `physical_stores` | `glucoseview_pharmacies` |
| **PK** | UUID (auto) | UUID (auto) | UUID (auto) | UUID (auto) |
| **name** | varchar(255) NOT NULL | varchar(200) NOT NULL, @Index | varchar(255) NOT NULL | varchar(255) NOT NULL |
| **code** | varchar(100) UNIQUE | varchar(100) UNIQUE, @Index | --- | --- |
| **businessNumber** | varchar(50) nullable, **제약 없음** | varchar(100) NOT NULL, **UNIQUE @Index** | varchar(20) NOT NULL, **UNIQUE @Index** | varchar(100) nullable, **제약 없음** |
| **ownerName** | varchar(100) nullable | varchar(200) NOT NULL | --- | --- |
| **contactPhone** | varchar(50) nullable | varchar(50) nullable | --- | --- |
| **email** | varchar(255) nullable | --- | --- | --- |
| **address** | text nullable | text nullable | --- | --- |
| **region** | --- | varchar(100) nullable, @Index | varchar(100) nullable | --- |
| **status** | varchar(20) default `'active'` | varchar(20) default `'draft'` @Index | --- | varchar(20) default `'active'` |
| **status 값** | active / inactive / suspended | draft / pending / approved / rejected / suspended | N/A | active / inactive / suspended |
| **enabled_services** | JSONB default `'[]'` | --- | --- | JSONB default `'[]'` |
| **sort_order** | int default 0 | --- | --- | --- |
| **created_by_user_id** | UUID nullable | --- | --- | --- |
| **created_by_user_name** | varchar(100) nullable | --- | --- | --- |
| **userId** (owner) | --- | --- | --- | UUID NOT NULL |
| **glycopharmPharmacyId** | --- | --- | --- | UUID nullable (연결용) |
| **created_at** | timestamp auto | timestamp auto | timestamp auto | timestamp auto |
| **updated_at** | timestamp auto | timestamp auto | timestamp auto | timestamp auto |

### 2.2 공통 부재 필드 (모든 엔티티)

| 필드 | 용도 | 필요도 |
|------|------|--------|
| `slug` | URL-friendly 식별자 | **CRITICAL** — 현재 `code`로 대체 중이나 GP-TIMESTAMP-RANDOM 형식은 URL 부적합 |
| `description` | 매장 소개 | HIGH — StoreFront 필수 |
| `logo` | 브랜드 이미지 URL | HIGH — StoreFront, 목록 표시 필수 |
| `heroImage` | 대표 배너 이미지 URL | MEDIUM — StoreFront 헤더용 |
| `subtitle` | 부제/슬로건 | LOW — 선택적 |

### 2.3 핵심 불일치

**사업자번호 (businessNumber) 정합성 붕괴:**

| 엔티티 | NOT NULL | UNIQUE | INDEX | varchar 길이 |
|--------|----------|--------|-------|-------------|
| CosmeticsStore | YES | YES | YES | 100 |
| PhysicalStore | YES | YES | YES | 20 |
| GlycopharmPharmacy | NO | NO | NO | 50 |
| GlucoseViewPharmacy | NO | NO | NO | 100 |

> **판정**: 가장 중요한 비즈니스 식별자가 2/4 엔티티에서 무결성 미확보.
> PhysicalStore가 businessNumber로 교차 연결하는 모델인데,
> GlycoPharm/GlucoseView에서 nullable이면 연결 불가.

**코드/슬러그 생성 패턴:**

| 엔티티 | 코드 필드 | 생성 패턴 | URL 적합성 |
|--------|----------|----------|-----------|
| GlycopharmPharmacy | `code` | `GP-{timestamp}-{random}` | LOW — 인간 비가독 |
| CosmeticsStore | `code` | `generateStoreCode()` | MEDIUM — 패턴 미확인 |
| PhysicalStore | 없음 | businessNumber만 사용 | LOW — 비가독 |
| GlucoseViewPharmacy | 없음 | UUID 직접 사용 | VERY LOW |

**네이밍 컨벤션 불일치:**

| 엔티티 | 코드 내 컨벤션 | 비고 |
|--------|-------------|------|
| GlycopharmPharmacy | snake_case | `owner_name`, `business_number` |
| CosmeticsStore | camelCase | `ownerName`, `businessNumber` (TypeORM 매핑) |
| PhysicalStore | camelCase | `businessNumber`, `storeName` |
| GlucoseViewPharmacy | camelCase | `enabledServices` |

---

## 3. Layer B — Store Presentation Layer

### 3.1 DB 영속화 vs 프론트엔드 전용 매트릭스

| 기능 | DB 엔티티 | DB 테이블 | Frontend 타입 | Mock 데이터 | 실제 상태 |
|------|----------|----------|--------------|-----------|----------|
| **Template 구조** | --- | --- | `StoreTemplate` | `DEFAULT_FRANCHISE_STANDARD_SECTIONS` | FRONTEND-ONLY |
| **Template 섹션** | --- | --- | `TemplateSectionConfig[]` | 5개 고정 섹션 | FRONTEND-ONLY |
| **Theme 타입** | --- | --- | `StoreTheme` enum | `THEME_METAS` 배열 | FRONTEND-ONLY |
| **Theme 색상** | --- | --- | `ThemeColors` interface | CSS 변수 상수 | FRONTEND-ONLY |
| **Theme 폰트** | --- | --- | `ThemeFonts` interface | 설정 상수 | FRONTEND-ONLY |
| **Hero 콘텐츠** | `CmsContent` | `cms_contents` | `HeroContent` | `MOCK_HERO_CONTENTS` | **혼합** — CMS에 데이터 있으나 HeroManagerTab은 Mock 사용 |
| **Featured Products** | `GlycopharmFeaturedProduct` | `glycopharm_featured_products` | API 연동 | --- | **DB-BACKED** |
| **Event/Notice** | `CmsContent` | `cms_contents` | `EventNoticeContent` | --- | **DB-BACKED** (CMS Core) |
| **Store Settings** | `GlycopharmPharmacy` | `glycopharm_pharmacies` | --- | --- | `enabled_services` JSONB만 |
| **Signage/Playlist** (GlycoPharm) | `DisplayPlaylist` | `glycopharm_display_playlists` | --- | --- | **DB-BACKED** |
| **Signage/Playlist** (Cosmetics) | `CosmeticsStorePlaylist` | `cosmetics_store_playlists` | `StorePlaylist` | --- | **DB-BACKED** |

### 3.2 핵심 발견

**Template/Theme = 완전 프론트엔드**:
- `services/web-glycopharm/src/types/store.ts` (617행)에 전체 타입 시스템 정의
- 4개 테마: `neutral`, `clean`, `modern`, `professional`
- 1개 템플릿: `franchise-standard` (유일)
- **DB 컬럼 없음** — pharmacy 엔티티에 template/theme 필드 부재
- **저장 API 없음** — 약국이 테마 선택해도 영속화 불가

**Hero 콘텐츠 = 이중 구조**:
- CMS Core (`cms_contents` 테이블)에 `type='hero'`, `serviceKey='glycopharm'` 데이터 존재
- Operator Dashboard가 CMS 데이터를 쿼리하여 통계 표시 (실재)
- 그러나 `HeroManagerTab.tsx`는 `MOCK_HERO_CONTENTS` 사용 (L27-61)
- "Implement save API" TODO 주석 존재

**CMS Core 역할**:
- `CmsContent` 엔티티가 서비스 횡단 콘텐츠 저장소 역할
- serviceKey + type 조합으로 스코핑
- 이미 hero, event, notice, featured 타입 지원
- **CmsTemplate** 엔티티는 Store 템플릿이 아닌 페이지 레이아웃 용도 (Handlebars/EJS/Pug)

### 3.3 서비스별 Presentation 비교

| 기능 | GlycoPharm | K-Cosmetics | Neture |
|------|-----------|-------------|--------|
| **Public StoreFront** | YES (3 모드: web/kiosk/tablet) | NO | NO |
| **Template 선택** | Frontend type only | --- | --- |
| **Theme 선택** | Frontend type only | --- | --- |
| **Hero 관리** | Mock (UI 있으나 저장 안됨) | --- | --- |
| **Featured 관리** | DB-backed (전용 테이블) | --- | --- |
| **Signage/Playlist** | DisplayPlaylist entity | CosmeticsStorePlaylist entity | --- |
| **CMS 연동** | serviceKey='glycopharm' | --- | --- |

---

## 4. Layer C — Store Commerce Layer

### 4.1 상품-매장 연결 패턴

| 서비스 | 연결 방식 | 메커니즘 | 다중 매장 가능 |
|--------|----------|---------|--------------|
| **GlycoPharm** | 직접 FK | `GlycopharmProduct.pharmacy_id` → Pharmacy | NO |
| **K-Cosmetics** | 중간 테이블 | `CosmeticsStoreListing` (store_id + product_id) | YES |
| **Neture** | 직접 FK | `NetureProduct.partner_id` → Partner | NO |

**아키텍처적 차이점:**
- GlycoPharm/Neture: 상품이 매장에 **종속** (1:1)
- Cosmetics: 상품이 카탈로그에 **독립** (N:M) — 가장 유연

### 4.2 가격 오버라이드

| 서비스 | 지원 | 메커니즘 | 세부 |
|--------|------|---------|------|
| **K-Cosmetics** | YES | `CosmeticsStoreListing.price_override` (int, nullable) | 매장별 개별 가격 설정 가능 |
| **GlycoPharm** | NO | `Product.price` + `Product.sale_price` 글로벌 | 약국별 가격 차별화 불가 |
| **Neture** | NO | `Product.basePrice` + `Product.salePrice` 글로벌 | 파트너별 가격 차별화 불가 |

### 4.3 재고 관리

| 서비스 | 위치 | 범위 | 매장별 재고 |
|--------|------|------|-----------|
| **GlycoPharm** | `Product.stock_quantity` | 글로벌 | NO |
| **K-Cosmetics** | Extension `SellerInventory` | 매장별 | YES (Extension 의존) |
| **Neture** | `Product.stock` | 글로벌 | NO |

### 4.4 Featured Products

| 서비스 | 구현 방식 | 컨텍스트 지원 | 매장별 커스텀 |
|--------|----------|-------------|-------------|
| **GlycoPharm** | 전용 테이블 `glycopharm_featured_products` | YES (context 필드) | Implicit |
| **K-Cosmetics** | 없음 | NO | NO |
| **Neture** | `Product.is_featured` boolean | NO | NO |

### 4.5 주문-매장 귀속

| 서비스 | 주문 엔티티 | storeId 필드 | OrderType | 매장 귀속 방법 |
|--------|-----------|-------------|-----------|-------------|
| **K-Cosmetics** | EcommerceOrder (계획) | YES | `RETAIL` | `metadata.storeId` + `EcommerceOrder.storeId` |
| **GlycoPharm** | EcommerceOrder (계획) | BLOCKED | `GLYCOPHARM` | 암묵적: `Product.pharmacy_id` |
| **Neture** | NetureOrder (독립) | NO | N/A | 암묵적: `Product.partner_id` |

**CRITICAL**: `ecommerce_orders` 테이블 미생성 (선행 조사에서 확인). 주문 귀속 시스템 자체가 미작동.

### 4.6 Commerce Chain 비교

```
GlycoPharm:
  Pharmacy ← Product (FK) ← Order (implicit via product)
  단일 매장 귀속 | 글로벌 가격 | 글로벌 재고

K-Cosmetics:
  Product → StoreListing → Store ← Order (explicit storeId)
  다중 매장 가능 | 매장별 가격 | Extension 재고

Neture:
  Partner ← Product (FK) ← OrderItem (FK)
  단일 파트너 | 글로벌 가격 | 글로벌 재고
```

---

## 5. Layer D — Store Lifecycle Layer

### 5.1 Application→Approval→Creation 흐름

#### GlycoPharm

```
Application(submitted) → Operator Review → [approved]
  → GlycopharmPharmacy 자동 생성 (atomic)
     - code: GP-{timestamp}-{random}
     - status: 'active' (하드코딩)
     - enabled_services: application.serviceTypes
     - created_by_user_id: application.userId
  → 기존 약국 있으면 서비스 병합만
  → 역할 미부여 (CRITICAL GAP)
```

- 파일: `admin.controller.ts` L206-327
- 한 사용자 = 하나의 약국 (중복 체크)
- **역할(glycopharm:pharmacy) 미부여** → 이전 조사에서 확인된 GAP

#### K-Cosmetics

```
Application(draft) → Submit(submitted) → Admin Review → [approved]
  → TRANSACTION:
    1. Application.status → 'approved'
    2. CosmeticsStore 생성 (status: 'approved')
    3. CosmeticsStoreMember 생성 (role: 'owner')
  → 거절 시: rejectionReason 기록, 매장 미생성
```

- 파일: `cosmetics-store.service.ts` L71-151
- **트랜잭션 보장** — 3개 작업 원자적 실행
- GlycoPharm보다 성숙한 패턴 (Member 자동 생성)

#### KPA

```
Application(submitted) → Reviewer Decision → [approved]
  → 어떤 엔티티도 자동 생성 안됨
  → 수동 후속 작업 필요:
    - 조직 그룹 배정
    - 권한 설정
    - KpaMember 생성 (별도)
```

- 파일: `application.controller.ts`
- **"매장" 개념 없음** — KpaOrganization이 조직 구조 역할

### 5.2 상태 전이 비교

| | GlycoPharm | K-Cosmetics | KPA |
|---|-----------|-------------|-----|
| **상태 필드** | status (varchar) | status (enum) | is_active (boolean) |
| **초기 값** | `'active'` (생성 즉시) | `'draft'` → `'pending'` → `'approved'` | `true` |
| **상태 수** | 3 (active/inactive/suspended) | 5 (draft/pending/approved/rejected/suspended) | 2 (true/false) |
| **상태 기계** | 없음 (아무 전이 허용) | 없음 (서비스 레이어 검증) | 없음 (토글) |
| **복귀 가능** | suspended → active | suspended → approved | false → true |
| **최종 상태** | 없음 | rejected (복귀 불가) | 없음 |

### 5.3 Public URL Guard

| 서비스 | 필터링 | 구현 위치 | 하드코딩 여부 |
|--------|--------|----------|-------------|
| GlycoPharm | `status='active'` | public.controller.ts | YES — 쿼리에 직접 |
| K-Cosmetics | status 파라미터 선택적 | repository 레이어 | NO — 관리자 제어 |
| Neture | N/A | 공개 매장 없음 | N/A |

### 5.4 삭제/비활성화 정책

**전 서비스 공통**: Hard Delete 금지

| 서비스 | 삭제 방식 | 소프트 삭제 패턴 |
|--------|----------|----------------|
| GlycoPharm | Status-based (`suspended`) | deletedAt 없음 |
| K-Cosmetics | Status-based + Member soft-delete | `CosmeticsStoreMember.isActive` + `deactivatedAt` + `deactivatedBy` |
| KPA | `is_active` boolean | 단순 토글 |

> K-Cosmetics가 유일하게 Member-level soft delete 패턴 구현.
> 누가, 언제 비활성화했는지 추적 가능.

### 5.5 Cross-Service Store Linking

**PhysicalStore + PhysicalStoreLink 시스템:**

```
Cosmetics Store (BN: 123-45-67890) ──┐
                                      ├── PhysicalStore (BN: 1234567890)
GlycoPharm Pharmacy (BN: 123-45-67890) ──┘
                                      ↑
                                 정규화된 businessNumber
```

- `PhysicalStoreService.syncLinks()` 구현 존재
- POST `/platform/physical-stores/sync` 엔드포인트 활성
- businessNumber 정규화 (공백/하이픈 제거) 후 그룹핑
- **ACTIVE** — 실제 운영 중

---

## 6. Canonical Store Core 모델 제안

### 6.1 제안 구조

현행 4개 엔티티를 분석한 결과, **통합 Core Entity** + **서비스별 Extension** 패턴을 제안.

```
┌─────────────────────────────────────────────────────┐
│                    StoreCore                         │
│  (모든 매장이 공유하는 최소 Identity)                   │
├─────────────────────────────────────────────────────┤
│  id: UUID (PK)                                      │
│  name: varchar(255) NOT NULL                        │
│  code: varchar(100) NOT NULL UNIQUE                 │
│  businessNumber: varchar(20) NOT NULL UNIQUE INDEX  │
│  ownerName: varchar(200) NOT NULL                   │
│  status: StoreStatus NOT NULL                       │
│  contactPhone: varchar(50) nullable                 │
│  email: varchar(255) nullable                       │
│  address: text nullable                             │
│  region: varchar(100) nullable INDEX                │
│  description: text nullable                         │
│  logo: varchar(2000) nullable                       │
│  heroImage: varchar(2000) nullable                  │
│  enabledServices: JSONB default '[]'                │
│  sortOrder: int default 0                           │
│  createdByUserId: UUID nullable                     │
│  createdAt: timestamp auto                          │
│  updatedAt: timestamp auto                          │
├─────────────────────────────────────────────────────┤
│  Relations:                                         │
│  → StoreMember[] (1:N)                              │
│  → StoreServiceLink[] (1:N, 서비스 연결)             │
└─────────────────────────────────────────────────────┘
```

### 6.2 Status Enum (통합)

```typescript
export enum StoreStatus {
  DRAFT = 'draft',           // 초기 생성, 미완성
  PENDING = 'pending',       // 검토 대기
  APPROVED = 'approved',     // 승인됨 (= active)
  REJECTED = 'rejected',     // 거부됨 (최종)
  SUSPENDED = 'suspended',   // 일시 중지
  INACTIVE = 'inactive',     // 비활성화 (자발적)
}
```

**매핑:**

| 현행 | Core Status |
|------|------------|
| GlycoPharm `active` | `APPROVED` |
| GlycoPharm `inactive` | `INACTIVE` |
| GlycoPharm `suspended` | `SUSPENDED` |
| Cosmetics `draft` | `DRAFT` |
| Cosmetics `pending` | `PENDING` |
| Cosmetics `approved` | `APPROVED` |
| Cosmetics `rejected` | `REJECTED` |
| Cosmetics `suspended` | `SUSPENDED` |

### 6.3 필드 근거

| Core 필드 | 출처 | 근거 |
|----------|------|------|
| `name` | 전 엔티티 공통 | 매장명은 필수 |
| `code` | Glycopharm + Cosmetics | URL/API 식별자 필요, slug 역할 |
| `businessNumber` | PhysicalStore 교차 연결 키 | varchar(20) 통일, NOT NULL UNIQUE |
| `ownerName` | Glycopharm + Cosmetics | 사업자 정보 필수 |
| `status` | 전 엔티티 (형태 다름) | 6-상태 통합 enum |
| `description` | **신규** | StoreFront 필수, 전 엔티티 부재 |
| `logo` | **신규** | 매장 목록/검색 표시 필수 |
| `heroImage` | **신규** | StoreFront 헤더, Frontend 타입만 존재 |
| `enabledServices` | Glycopharm + GlucoseView | 서비스 활성 관리 패턴 |
| `region` | Cosmetics + PhysicalStore | 지역 검색/필터 |
| `createdByUserId` | Glycopharm | 감사 추적 |

### 6.4 Presentation Layer 분리 결정

**결론: Presentation은 Core에 넣지 않는다.**

| 요소 | 저장 위치 | 이유 |
|------|----------|------|
| Template/Theme | 서비스별 설정 테이블 or CMS | 서비스마다 템플릿 구조가 다를 수 있음 |
| Hero 콘텐츠 | CMS Core (`cms_contents`) | 이미 CMS Core에 인프라 존재 |
| Featured Products | APP-FEATURED 패턴 (전용 테이블) | GlycoPharm 패턴이 가장 유연 |
| Signage/Playlist | 서비스별 Extension | Cosmetics와 GlycoPharm 구현이 상이 |

Core에 `logo`, `heroImage`, `description`만 포함하는 이유:
- 이 3개는 **Identity의 일부** (매장 자체를 설명하는 정적 속성)
- Template/Theme/Content는 **동적 구성** (서비스별 다양한 렌더링 로직)

### 6.5 Commerce Layer 연결 전략

| 서비스 | 현행 | Core 연결 방법 |
|--------|------|-------------|
| GlycoPharm | `Product.pharmacy_id` (직접 FK) | `Product.store_id` → StoreCore |
| K-Cosmetics | `StoreListing` (중간 테이블) | `StoreListing.store_id` → StoreCore |
| Neture | `Product.partner_id` (직접 FK) | 별도 — Partner ≠ Store |
| 주문 귀속 | `EcommerceOrder.storeId` | → StoreCore.id |

**Neture 예외**: Partner(판매자/공급자)는 매장이 아닌 비즈니스 파트너.
Store Core에 강제 편입하지 않고, 필요 시 PhysicalStoreLink로 연결.

### 6.6 Lifecycle 통합 방향

```
[Application] → [Approval] → [StoreCore 생성] → [APPROVED]
                                 ↓
                           [StoreMember 생성]
                           (role: 'owner')
                                 ↓
                        [서비스별 Extension 연결]
                        (GlycoPharm: pharmacy settings)
                        (Cosmetics: listings, playlists)
```

**K-Cosmetics 패턴을 기준선으로 채택:**
- 트랜잭션 보장
- Member 자동 생성
- Owner 역할 자동 부여
- GlycoPharm의 "역할 미부여" GAP 해소

---

## 7. Per-Service Extension 전략

### 7.1 GlycoPharm Extension

```
StoreCore (Identity)
  ↓
GlycopharmPharmacySettings (Extension)
  - enabled_services: GlycopharmServiceType[]
  - 약국 고유 설정들
  ↓
GlycopharmProduct (pharmacy_id → StoreCore.id)
GlycopharmFeaturedProduct (기존 유지)
DisplayPlaylist (기존 유지)
```

### 7.2 K-Cosmetics Extension

```
StoreCore (Identity)
  ↓
CosmeticsStoreListing (store_id → StoreCore.id)
  - productId, priceOverride, isVisible, sortOrder
  ↓
CosmeticsStorePlaylist (store_id → StoreCore.id)
SellerInventory (Extension → Extension, 기존 유지)
```

### 7.3 PhysicalStore 역할 변경

```
현행: PhysicalStore = 최소 Linking Hub
미래: StoreCore가 PhysicalStore 역할을 흡수
  - businessNumber UNIQUE → 자연 교차 키
  - PhysicalStoreLink → StoreServiceLink (서비스 연결)
```

---

## 8. GAP 요약

### CRITICAL (구조적 결함)

| # | GAP | 영향 |
|---|-----|------|
| C-1 | businessNumber 무결성 미확보 (Glycopharm/GlucoseView) | PhysicalStore 교차 연결 불가 |
| C-2 | `ecommerce_orders` 테이블 미생성 | 주문-매장 귀속 시스템 미작동 |
| C-3 | Template/Theme DB 미영속화 | 매장 Presentation 커스터마이징 불가 |
| C-4 | Hero Manager Save API 미구현 | StoreFront 콘텐츠 관리 불완전 |

### HIGH

| # | GAP | 영향 |
|---|-----|------|
| H-1 | description/logo/heroImage 전 엔티티 부재 | 매장 검색/리스트/StoreFront 불가 |
| H-2 | Status enum 비통일 (3-state vs 5-state) | 통합 매장 관리 UI 구현 난이 |
| H-3 | 네이밍 컨벤션 비통일 (snake_case vs camelCase) | 개발자 혼선, ORM 매핑 오류 가능 |
| H-4 | Audit 추적 Glycopharm만 구현 | Cosmetics/KPA 매장 변경 이력 추적 불가 |
| H-5 | GlycoPharm 승인 시 역할 미부여 | 약국 소유자 권한 체계 불완전 |

### MEDIUM

| # | GAP | 영향 |
|---|-----|------|
| M-1 | Slug/Code URL 적합성 부족 | SEO, 사용자 경험 저하 |
| M-2 | Soft delete 미구현 (status 대체 사용) | 삭제 감사 추적 미약 |
| M-3 | GlycoPharm 상태 전이 무검증 | 임의 상태 변경 가능 |
| M-4 | 재고 관리 Core 수준 부재 | Cosmetics만 Extension 의존 |

---

## 9. 실행 가능성 평가

### 통합 비용 추정

| 단계 | 작업 | 복잡도 |
|------|------|--------|
| 1 | StoreCore 엔티티 + 마이그레이션 생성 | MEDIUM |
| 2 | 기존 데이터 마이그레이션 (pharmacy → StoreCore) | HIGH |
| 3 | 서비스별 FK 전환 (product.pharmacy_id → store_id) | HIGH |
| 4 | PhysicalStore 역할 전환 | MEDIUM |
| 5 | API 레이어 수정 (컨트롤러/서비스) | HIGH |
| 6 | Frontend 연동 수정 | HIGH |

### 선행 조건

1. `ecommerce_orders` 테이블 생성 (C-2 해소)
2. businessNumber NOT NULL UNIQUE 강제 (C-1 해소, 데이터 정리 필요)
3. Core 동결 정책 예외 승인 (CLAUDE.md §5 — platform-core 변경)

### 대안: 점진적 통합

Core Entity를 즉시 만들지 않고, 단계적으로:

1. **Phase 1**: businessNumber 무결성 확보 (Glycopharm/GlucoseView ALTER TABLE)
2. **Phase 2**: description/logo/heroImage 컬럼 각 엔티티에 추가
3. **Phase 3**: 공통 타입/인터페이스 `@o4o/types/store` 정의
4. **Phase 4**: StoreCore 엔티티 생성 + 데이터 마이그레이션
5. **Phase 5**: 서비스별 FK 전환

---

## 10. 최종 판정

### 통합 가능 여부: **조건부 가능**

| 기준 | 판정 | 이유 |
|------|------|------|
| Identity 통합 | **가능** | 공통 필드(name, code, businessNumber, status) 존재 |
| Presentation 통합 | **분리 유지** | CMS Core + 서비스별 Extension이 자연스러움 |
| Commerce 통합 | **부분 가능** | EcommerceOrder.storeId 경로 존재하나 테이블 미생성 |
| Lifecycle 통합 | **가능** | K-Cosmetics 패턴을 기준선으로 통일 |

### 권장 경로

```
단기 (1-2주):
  → businessNumber 무결성 확보
  → description/logo 컬럼 추가 (각 엔티티)
  → @o4o/types/store 공통 인터페이스 정의

중기 (3-4주):
  → StoreCore 엔티티 생성
  → 기존 데이터 마이그레이션
  → PhysicalStore 역할 전환

장기 (5주+):
  → 서비스별 FK 전환
  → 통합 매장 관리 대시보드
  → 통합 StoreFront 렌더러
```

---

## 부록: 조사 대상 파일

| 파일 | 용도 |
|------|------|
| `apps/api-server/src/routes/glycopharm/entities/glycopharm-pharmacy.entity.ts` | GlycoPharm 매장 |
| `apps/api-server/src/routes/glycopharm/entities/glycopharm-product.entity.ts` | GlycoPharm 상품 |
| `apps/api-server/src/routes/glycopharm/entities/glycopharm-featured-product.entity.ts` | Featured Products |
| `apps/api-server/src/routes/glycopharm/entities/glycopharm-application.entity.ts` | GlycoPharm 신청 |
| `apps/api-server/src/routes/glycopharm/entities/display-playlist.entity.ts` | GlycoPharm Signage |
| `apps/api-server/src/routes/glycopharm/controllers/admin.controller.ts` | 승인 로직 |
| `apps/api-server/src/routes/glycopharm/controllers/public.controller.ts` | 공개 API |
| `apps/api-server/src/routes/cosmetics/entities/cosmetics-store.entity.ts` | K-Cosmetics 매장 |
| `apps/api-server/src/routes/cosmetics/entities/cosmetics-store-application.entity.ts` | 매장 신청 |
| `apps/api-server/src/routes/cosmetics/entities/cosmetics-store-listing.entity.ts` | 매장-상품 매핑 |
| `apps/api-server/src/routes/cosmetics/entities/cosmetics-store-member.entity.ts` | 매장 구성원 |
| `apps/api-server/src/routes/cosmetics/entities/cosmetics-store-playlist.entity.ts` | Signage |
| `apps/api-server/src/routes/cosmetics/entities/cosmetics-product.entity.ts` | 상품 |
| `apps/api-server/src/routes/cosmetics/services/cosmetics-store.service.ts` | 매장 서비스 |
| `apps/api-server/src/routes/platform/entities/physical-store.entity.ts` | 물리 매장 |
| `apps/api-server/src/routes/platform/entities/physical-store-link.entity.ts` | 서비스 연결 |
| `apps/api-server/src/routes/platform/physical-store.service.ts` | 연결 서비스 |
| `apps/api-server/src/routes/glucoseview/entities/glucoseview-pharmacy.entity.ts` | GlucoseView 약국 |
| `apps/api-server/src/routes/neture/entities/neture-product.entity.ts` | Neture 상품 |
| `apps/api-server/src/routes/neture/entities/neture-order.entity.ts` | Neture 주문 |
| `apps/api-server/src/routes/kpa/entities/kpa-application.entity.ts` | KPA 신청 |
| `packages/ecommerce-core/src/entities/EcommerceOrder.entity.ts` | 주문 Core |
| `packages/cms-core/src/entities/CmsContent.entity.ts` | CMS 콘텐츠 |
| `packages/cms-core/src/entities/CmsTemplate.entity.ts` | CMS 템플릿 |
| `packages/cosmetics-seller-extension/src/backend/entities/seller-inventory.entity.ts` | 재고 Extension |
| `services/web-glycopharm/src/types/store.ts` | Frontend 타입 |
| `services/web-glycopharm/src/config/heroConfig.ts` | Hero 설정 |
| `services/web-glycopharm/src/pages/operator/store-template/tabs/HeroManagerTab.tsx` | Hero 관리 UI |
| `services/web-k-cosmetics/src/services/storeApi.ts` | K-Cosmetics API |

---

*Generated: 2026-02-13*
*Investigation Type: Data Model Architecture*
*Status: COMPLETED*

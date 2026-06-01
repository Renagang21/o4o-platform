# IR-NETURE-SUPPLIER-STATE-AUDIT-V1

> **Investigation Report: Neture 공급자(Supplier) 영역 현황 전수 조사**
> **Date**: 2026-02-21
> **Status**: Complete
> **Scope**: Frontend / API / DB / RBAC / 공급자-판매자 흐름

---

## 1. Executive Summary

Neture는 O4O 플랫폼의 **공급자(Supplier) 중심 B2B 마켓플레이스**다.
공급자가 제품을 등록하고, 판매자(Seller/Partner)가 해당 제품 공급을 신청하며,
공급자가 승인/거절을 결정하는 **2-sided supply marketplace** 구조를 갖추고 있다.

### 핵심 판정

| 영역 | 판정 | 요약 |
|------|------|------|
| 공급자 등록/프로필 | ✅ 있음 | NetureSupplier + userId 연결 |
| 공급자 상품 관리 | ✅ 있음 | NetureSupplierProduct (CATALOG/APPLICATION/ACTIVE_SALES) |
| 판매자→공급자 공급 신청 | ✅ 있음 | NetureSupplierRequest (pending→approved/rejected) |
| 공급자 콘텐츠 배포 | ✅ 있음 | NetureSupplierContent (DRAFT/PUBLISHED) |
| 파트너십 요청 | ✅ 있음 | NeturePartnershipRequest (OPEN/MATCHED/CLOSED) |
| 파트너 모집 | ✅ 있음 | NeturePartnerRecruitment + NeturePartnerApplication |
| 파트너 대시보드 | ✅ 있음 | NeturePartnerDashboardItem + content linking |
| 약국 상품 진열 | ✅ 있음 | OrganizationProductListing + Channel + Application |
| 주문/결제 | ⚠️ 부분 | 각 서비스별 분리 처리 (Neture는 summary only) |
| 면허/인증 관리 | ❌ 없음 | 사업자번호만 등록 시 수집, 별도 테이블 없음 |
| 관계 종료 워크플로 | ❌ 없음 | approved 후 해제 프로세스 없음 |
| Phase 9 판매자 권한 | ❌ 없음 | 501 STUB (미구현) |

---

## 2. 프론트엔드 구조 (Section A)

### 2.1 앱 아키텍처

| 항목 | 값 |
|------|------|
| 앱 | `services/web-neture/` |
| 라우터 | React Router v6 |
| 인증 | httpOnly cookie + `/api/v1/auth/me` |
| 레이아웃 | MainLayout (공통), SupplierOpsLayout (/workspace), AdminVaultLayout (/admin-vault) |

### 2.2 역할 체계

```
API 역할 → Web 역할 매핑:
  admin / super_admin  → admin
  supplier             → supplier
  partner              → partner
  seller / customer / user → user
```

### 2.3 라우트 전체 맵

#### 인증/공통

| 경로 | 컴포넌트 | 역할 제한 |
|------|----------|----------|
| `/login` | LoginRedirect | 없음 |
| `/register` | RegisterPage | 없음 |
| `/register/pending` | RegisterPendingPage | 없음 |
| `/my` | MyPage | 인증 필요 |

#### 공급자 대시보드 (`/workspace/supplier/*`)

| 경로 | 컴포넌트 | 용도 |
|------|----------|------|
| `/workspace/supplier/dashboard` | SupplierDashboardPage | 공급자 메인 대시보드 |
| `/workspace/supplier/requests` | SellerRequestsPage | 수신된 판매자 요청 목록 |
| `/workspace/supplier/requests/:id` | SellerRequestDetailPage | 요청 상세 (승인/거절) |
| `/workspace/supplier/products` | SupplierProductsPage | 공급 상품 관리 |
| `/workspace/supplier/supply-requests` | SupplyRequestsPage | 공급 요청 현황 |
| `/workspace/supplier/orders` | SupplierOrdersPage | 주문 요약 (서비스별) |
| `/workspace/supplier/contents` | SupplierContentsPage | 콘텐츠 관리 |
| `/workspace/supplier/contents/new` | ContentEditorPage | 콘텐츠 작성 |
| `/workspace/supplier/contents/:id/edit` | ContentEditorPage | 콘텐츠 수정 |
| `/workspace/supplier/profile` | SupplierProfilePage | 프로필/연락처 설정 |
| `/workspace/supplier/signage/content` | SignageContentHubPage | 사이니지 콘텐츠 |

#### 파트너 대시보드 (`/workspace/partner/*`)

| 경로 | 컴포넌트 | 용도 |
|------|----------|------|
| `/workspace/partner` | PartnerOverviewPage | 파트너 메인 |
| `/workspace/partner/recruiting-products` | RecruitingProductsPage | 모집 상품 목록 |
| `/workspace/partner/collaboration` | CollaborationPage | 협업 현황 |
| `/workspace/partner/promotions` | PromotionsPage | 프로모션 |
| `/workspace/partner/settlements` | SettlementsPage | 정산 |

#### 관리자/운영자 (`/workspace/admin/*`, `/workspace/operator/*`)

| 경로 | 역할 | 용도 |
|------|------|------|
| `/workspace/admin` | admin | 4-Block Admin 대시보드 |
| `/workspace/admin/operators` | admin | 운영자 관리 |
| `/workspace/admin/ai/*` | admin | AI 엔진/정책/비용 관리 |
| `/workspace/operator` | admin, operator | 5-Block Operator 대시보드 |
| `/workspace/operator/registrations` | admin, operator | 가입 승인 관리 |
| `/workspace/operator/supply` | admin, operator | 공급 현황 대시보드 |
| `/workspace/operator/forum-management` | admin, operator | 포럼 관리 |

#### 허브 (`/workspace/hub`)

| 역할 | 표시 카드 |
|------|----------|
| supplier, partner | 상품 관리, 요청 관리, 콘텐츠, 정산, 연결 서비스, AI 리포트 (6장) |
| admin | 공급자 승인, 정책, AI 제어, 운영자, 시스템 감시 (5장) |

### 2.4 네비게이션 메뉴

**SupplierOpsLayout 헤더:**

| 메뉴 | 경로 | 조건 |
|------|------|------|
| 홈 | `/workspace` | 항상 |
| 상품 | `/workspace/supplier/products` | 항상 |
| 콘텐츠 | `/workspace/content` or `/workspace/supplier/contents` | 항상 |
| 정산 | `/workspace/partner/settlements` | 항상 |
| 허브 | `/workspace/hub` | admin, supplier, partner만 |

---

## 3. API 엔드포인트 (Section B)

### 3.1 아키텍처 이중 구조

| 계층 | 위치 | 특징 |
|------|------|------|
| **Legacy (P1)** | `apps/api-server/src/routes/neture/` | GET 위주, 인증 불필요, 읽기 전용 |
| **Module (현행)** | `apps/api-server/src/modules/neture/` | 전체 CRUD, 인증 필수, 비즈니스 로직 |

### 3.2 공급자(Supplier) API

| 엔드포인트 | Method | 인증 | 용도 |
|-----------|--------|------|------|
| `/api/v1/neture/suppliers` | GET | 필요 | 공급자 목록 |
| `/api/v1/neture/suppliers/:slug` | GET | 필요 | 공급자 상세 (연락처 가시성 필터링) |
| `/api/v1/neture/supplier/profile` | GET | 필요 | 내 프로필 조회 |
| `/api/v1/neture/supplier/profile` | PATCH | 필요 | 프로필/연락처 수정 |
| `/api/v1/neture/supplier/profile/completeness` | GET | 필요 | 프로필 완성도 (8항목 체크) |
| `/api/v1/neture/supplier/dashboard/summary` | GET | 필요 | 대시보드 통계 |
| `/api/v1/neture/supplier/dashboard/ai-insight` | GET | 필요 | AI 성장 인사이트 |
| `/api/v1/neture/supplier/events` | GET | 필요 | 전체 이벤트 로그 |

### 3.3 공급자 상품(Supplier Product) API

| 엔드포인트 | Method | 인증 | 용도 |
|-----------|--------|------|------|
| `/api/v1/neture/supplier/products` | GET | 필요 | 내 상품 목록 (대기 요청 수 포함) |
| `/api/v1/neture/supplier/products/:id` | PATCH | 필요 | 상품 활성화/비활성화, 신청 수락 토글 |

### 3.4 판매자→공급자 요청(Supplier Request) API ⭐

> **핵심**: "특정 제품에 대해 공급자가 판매자의 신청을 받아 공급여부를 결정"하는 흐름

| 엔드포인트 | Method | 인증 | 용도 |
|-----------|--------|------|------|
| `/api/v1/neture/supplier/requests` | POST | 필요 | **판매자가 공급 신청** (supplierId, serviceId, productId 필수) |
| `/api/v1/neture/supplier/requests` | GET | 필요 | 수신된 요청 목록 (status, serviceId 필터) |
| `/api/v1/neture/supplier/requests/:id` | GET | 필요 | 요청 상세 |
| `/api/v1/neture/supplier/requests/:id/approve` | POST | supplier | **공급자가 승인** |
| `/api/v1/neture/supplier/requests/:id/reject` | POST | supplier | **공급자가 거절** (reason 필수) |
| `/api/v1/neture/supplier/requests/:id/events` | GET | 필요 | 요청 이벤트 로그 |

**흐름 요약:**
```
판매자 → POST /supplier/requests (신청)
    ↓
공급자 → GET /supplier/requests (수신 확인)
    ↓
공급자 → POST /supplier/requests/:id/approve (승인)
   또는 → POST /supplier/requests/:id/reject (거절 + reason)
    ↓
판매자 → GET /seller/my-products (승인된 상품 확인)
```

**중복 방지**: 동일 (supplierId, sellerId, productId) 조합 → 409 Conflict

### 3.5 공급자 콘텐츠(Supplier Content) API

| 엔드포인트 | Method | 인증 | 용도 |
|-----------|--------|------|------|
| `/api/v1/neture/supplier/contents` | GET | 필요 | 콘텐츠 목록 |
| `/api/v1/neture/supplier/contents/:id` | GET | 필요 | 콘텐츠 상세 |
| `/api/v1/neture/supplier/contents` | POST | 필요 | 콘텐츠 생성 |
| `/api/v1/neture/supplier/contents/:id` | PATCH | 필요 | 수정 (DRAFT→PUBLISHED 전이 포함) |
| `/api/v1/neture/supplier/contents/:id` | DELETE | 필요 | 삭제 |

### 3.6 파트너십/파트너 API

| 엔드포인트 | Method | 용도 |
|-----------|--------|------|
| `/api/v1/neture/partner/recruiting-products` | GET | 모집 중인 상품 (공개) |
| `/api/v1/neture/partner/recruitments` | GET | 모집 목록 (공개) |
| `/api/v1/neture/partner/applications` | POST | 모집 신청 |
| `/api/v1/neture/partner/applications/:id/approve` | POST | 신청 승인 |
| `/api/v1/neture/partner/applications/:id/reject` | POST | 신청 거절 |
| `/api/v1/neture/partner/dashboard/summary` | GET | 파트너 대시보드 통계 |
| `/api/v1/neture/partner/dashboard/items` | GET/POST | 대시보드 상품 슬롯 |
| `/api/v1/neture/partner/contents` | GET | CMS+공급자 콘텐츠 브라우징 |
| `/api/v1/neture/partner/dashboard/items/:id/contents` | GET/POST/DELETE | 콘텐츠 링크 관리 |

### 3.7 관리자 API

| 엔드포인트 | Method | 인증 | 용도 |
|-----------|--------|------|------|
| `/api/v1/neture/admin/dashboard/summary` | GET | neture:admin | 전체 통계 |
| `/api/v1/neture/admin/requests` | GET | neture:admin | 전체 공급 요청 (cross-supplier) |
| `/api/v1/neture/admin/requests/:id/approve` | POST | neture:admin | 관리자 오버라이드 승인 |
| `/api/v1/neture/admin/requests/:id/reject` | POST | neture:admin | 관리자 오버라이드 거절 |
| `/api/v1/neture/admin/operators` | GET | neture:admin | 운영자 목록 |
| `/api/v1/neture/admin/operators/:id/deactivate` | PATCH | neture:admin | 운영자 비활성화 |
| `/api/v1/neture/admin/operators/:id/reactivate` | PATCH | neture:admin | 운영자 활성화 |

### 3.8 운영자 공급 대시보드

| 엔드포인트 | Method | 용도 |
|-----------|--------|------|
| `/api/v1/neture/operator/supply-products` | GET | 공급 가능 상품 + 요청 상태 merged |

---

## 4. 데이터 모델 (Section C)

### 4.1 Neture 고유 엔티티

#### neture_suppliers

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| slug | varchar UNIQUE | URL 식별자 |
| name | varchar | 공급자명 |
| userId | UUID nullable | 계정 연결 |
| status | enum(ACTIVE, INACTIVE) | |
| category | varchar | |
| description | text | |
| pricingPolicy | text | 가격 정책 |
| moq | varchar | 최소 주문 수량 |
| shippingStandard/Island/Mountain | text | 배송비 정책 |
| contactEmail/Phone/Website/Kakao | varchar/text | 연락처 |
| contact*Visibility | varchar(10) | PUBLIC/PARTNERS/PRIVATE |
| createdAt, updatedAt | timestamp | |

**관계**: OneToMany → NetureSupplierProduct, NetureSupplierContent

#### neture_supplier_products

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| supplierId | UUID FK | → neture_suppliers (CASCADE) |
| name | varchar | |
| category | varchar | |
| description | text | |
| purpose | enum(CATALOG, APPLICATION, ACTIVE_SALES) | 상품 용도 |
| isActive | boolean | |
| acceptsApplications | boolean | 신청 수락 여부 |
| createdAt, updatedAt | timestamp | |

#### neture_supplier_requests ⭐

> **판매자→공급자 공급 신청 테이블**

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| supplierId | UUID | 공급자 |
| supplierName | varchar | 스냅샷 |
| sellerId | UUID | 판매자 |
| sellerName | varchar | |
| sellerEmail/Phone/StoreUrl | varchar | 판매자 연락처 |
| serviceId | varchar | 서비스 식별자 (glycopharm, k-cosmetics 등) |
| serviceName | varchar | |
| productId | UUID | 대상 상품 |
| productName | varchar | 스냅샷 |
| productCategory | varchar | |
| productPurpose | varchar | CATALOG/APPLICATION/ACTIVE_SALES |
| **status** | **enum(PENDING, APPROVED, REJECTED)** | **핵심 상태** |
| decidedBy | varchar | 결정자 (supplierId) |
| decidedAt | timestamp | 결정 시각 |
| rejectReason | text | 거절 사유 |
| metadata | jsonb | 확장 필드 |
| createdAt, updatedAt | timestamp | |

**상태 전이**: `PENDING → APPROVED` 또는 `PENDING → REJECTED` (단방향)

#### neture_supplier_contents

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| supplierId | UUID FK | → neture_suppliers (CASCADE) |
| type | enum(DESCRIPTION, IMAGE, BANNER, GUIDE) | |
| title | varchar | |
| description | text | |
| body | text | |
| imageUrl | text | |
| status | enum(DRAFT, PUBLISHED) | |
| availableServices | text[] | 대상 서비스 목록 |
| availableAreas | text[] | 대상 지역 목록 |
| publishedAt | timestamp | |
| createdAt, updatedAt | timestamp | |

#### neture_partnership_requests

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| sellerId | UUID | Soft reference |
| sellerName/ServiceType/StoreUrl | varchar | |
| productCount | int | |
| periodStart/End | date | |
| revenueStructure | text | |
| status | enum(OPEN, MATCHED, CLOSED) | |
| promotionSns/Content/Banner | boolean | |
| promotionOther | text | |
| contactEmail/Phone/Kakao | varchar | |
| metadata | jsonb | |
| matchedAt | timestamp | |
| createdAt | timestamp | |

**관계**: OneToMany → NeturePartnershipProduct (name, category)

#### neture_partner_applications

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| recruitmentId | UUID | Soft reference |
| partnerId | UUID | Soft reference |
| partnerName | varchar | |
| status | enum(PENDING, APPROVED, REJECTED) | |
| appliedAt, decidedAt | timestamp | |
| decidedBy | varchar | |
| reason | text | 거절 사유 |

**제약**: UNIQUE(recruitmentId, partnerId)

### 4.2 Organization 계층 엔티티 (KPA 약국 상품)

#### organization_product_listings

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| organization_id | UUID FK | → organization_stores |
| service_key | varchar(50) | 'kpa' default |
| external_product_id | varchar(200) | 외부 상품 ID |
| product_name | varchar(300) | |
| product_metadata | jsonb | |
| retail_price | int nullable | |
| is_active | boolean | |
| display_order | int | |

#### organization_product_applications

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| organization_id | UUID | |
| service_key | varchar(50) | 'kpa' default |
| external_product_id | varchar(200) | |
| product_name | varchar(300) | |
| product_metadata | jsonb | |
| status | varchar(30) | pending/approved/rejected |
| reject_reason | varchar(500) | |
| requested_by | UUID | |
| requested_at | timestamptz | |
| reviewed_by | UUID | |
| reviewed_at | timestamptz | |

#### organization_product_channels

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| channel_id | UUID FK | → organization_channels |
| product_listing_id | UUID FK | → organization_product_listings |
| is_active | boolean | |
| display_order | int | |
| channel_price | int nullable | |
| sales_limit | int nullable | |

### 4.3 엔티티 관계도

```
NetureSupplier (공급자)
  │
  ├─── 1:N ──→ NetureSupplierProduct (공급 상품)
  │                 │
  │                 └─── productId로 참조 ──→ NetureSupplierRequest
  │
  ├─── 1:N ──→ NetureSupplierContent (마케팅 콘텐츠)
  │
  └─── supplierId로 참조 ──→ NetureSupplierRequest (공급 신청)

NetureSupplierRequest (공급 신청)
  ├── supplierId → NetureSupplier (Soft)
  ├── sellerId → User (Soft)
  ├── productId → NetureSupplierProduct (Soft)
  └── serviceId → 서비스 식별자 (glycopharm, k-cosmetics 등)

NeturePartnershipRequest (파트너십 제안)
  │
  └─── 1:N ──→ NeturePartnershipProduct (제안 상품 목록)

NeturePartnerRecruitment (파트너 모집)
  │
  └─── 1:N ──→ NeturePartnerApplication (모집 신청)

NeturePartnerDashboardItem (파트너 대시보드 슬롯)
  │
  └─── 1:N ──→ NeturePartnerDashboardItemContent (콘텐츠 링크)

OrganizationProductListing (약국 진열 상품)
  │
  ├── ManyToOne → OrganizationStore
  └─── via ──→ OrganizationProductChannel → OrganizationChannel
```

### 4.4 service_key 사용 현황

| 엔티티 | 컬럼명 | 값 예시 | 용도 |
|--------|--------|---------|------|
| OrganizationProductListing | service_key | 'kpa' | 서비스별 상품 분류 |
| OrganizationProductApplication | service_key | 'kpa' | 서비스별 신청 분류 |
| OrganizationServiceEnrollment | service_key | 'kpa', 'glycopharm' | 조직→서비스 등록 |
| KpaMember (user.service_key) | service_key | 'kpa' | 사용자 서비스 소속 |
| NetureSupplierRequest | serviceId | 'glycopharm', 'k-cosmetics' | 공급 대상 서비스 |
| NetureSupplierContent | availableServices | ['glycopharm', 'k-cosmetics'] | 콘텐츠 대상 서비스 |

---

## 5. 권한/역할/RBAC (Section D)

### 5.1 Neture 역할 체계

| Web 역할 | API 역할 | 접근 범위 |
|----------|---------|----------|
| admin | admin, super_admin | 전체 관리자 영역 + 운영자 영역 |
| supplier | supplier | 공급자 대시보드 (상품, 요청, 콘텐츠) |
| partner | partner | 파트너 대시보드 (모집, 협업, 정산) |
| user | seller, customer, user | 일반 사용자 (공급자 목록 열람, 공급 신청) |

### 5.2 접근 제어 패턴

| 패턴 | 위치 | 설명 |
|------|------|------|
| Route-level ProtectedRoute | App.tsx | `allowedRoles={['admin']}` |
| API requireAuth | neture.routes.ts | JWT 세션 필수 |
| API requireRole | neture.routes.ts | `'supplier'` 역할 필수 (approve/reject) |
| API requireNetureScope | neture.routes.ts | `'neture:admin'` (admin 전용) |
| userId→supplierId 해석 | neture.service.ts | `getSupplierIdFromUser(req)` |

### 5.3 가입/승인 흐름

```
1. 회원가입 (/register)
   - 역할 선택: 공급자(supplier) / 파트너(partner)
   - 필드: email, password, name, phone, companyName, businessNumber
   - POST /api/v1/auth/register

2. 승인 대기 (/register/pending)
   - 관리자/운영자가 확인

3. 승인 처리 (/workspace/operator/registrations)
   - 운영자: PENDING → APPROVED / REJECTED
   - 승인 시 계정 활성화 + 역할 부여
```

---

## 6. 공급자-판매자 공급 결정 흐름 (Section E) ⭐

> **"특정 제품에 대해서는 공급자가 판매자의 신청을 받아 공급여부를 결정한다"**

### 6.1 구현 상태: ✅ 있음

`NetureSupplierRequest` 엔티티 + API가 이 흐름을 완전히 구현하고 있다.

### 6.2 상세 흐름

```
┌─────────────┐                              ┌─────────────┐
│  판매자      │                              │  공급자      │
│  (Seller)    │                              │  (Supplier)  │
└──────┬──────┘                              └──────┬──────┘
       │                                            │
       │  1. 공급 가능 상품 조회                      │
       │  GET /supplier/products                    │
       │  (acceptsApplications=true 인 상품만)       │
       │ ──────────────────────────────────────────→ │
       │                                            │
       │  2. 공급 신청                               │
       │  POST /supplier/requests                   │
       │  { supplierId, productId, serviceId }       │
       │ ──────────────────────────────────────────→ │
       │                          409 if duplicate   │
       │                                            │
       │                            3. 요청 수신 확인 │
       │                  GET /supplier/requests     │
       │                                            │
       │                            4a. 승인         │
       │          POST /supplier/requests/:id/approve│
       │ ←────────────────────────────────────────── │
       │                                            │
       │                       또는 4b. 거절         │
       │         POST /supplier/requests/:id/reject  │
       │         { reason: "거절 사유" }              │
       │ ←────────────────────────────────────────── │
       │                                            │
       │  5. 승인된 상품 확인                         │
       │  GET /seller/my-products                   │
       │ ──────────────────────────────────────────→ │
```

### 6.3 데이터 스냅샷 전략

`NetureSupplierRequest`는 **denormalized snapshot**을 저장한다:
- `supplierName` — 공급자명 스냅샷
- `sellerName`, `sellerEmail`, `sellerPhone`, `sellerStoreUrl` — 판매자 정보 스냅샷
- `productName`, `productCategory`, `productPurpose` — 상품 정보 스냅샷
- `serviceName` — 서비스명 스냅샷

이는 원본 데이터가 변경되어도 신청 시점의 정보가 보존됨을 의미한다.

### 6.4 관리자 오버라이드

공급자 외에 **관리자(neture:admin)**도 승인/거절 가능:
- `POST /admin/requests/:id/approve`
- `POST /admin/requests/:id/reject`

이를 통해 분쟁 해결이나 정책적 개입이 가능하다.

### 6.5 운영자 공급 현황 뷰

`GET /operator/supply-products`는 전체 공급 상품 목록과 각 상품의 요청 상태(`available`, `pending`, `approved`, `rejected`)를 병합하여 운영자에게 전체 공급 파이프라인 현황을 제공한다.

---

## 7. 판정표 (Judgment Table)

### 7.1 기능별 판정

| 기능 | 판정 | 엔티티/API | 비고 |
|------|------|-----------|------|
| 공급자 등록 | ✅ 있음 | NetureSupplier + /register | 회원가입 시 역할 선택 |
| 공급자 프로필 관리 | ✅ 있음 | supplier/profile PATCH | 연락처 + 가시성 설정 |
| 공급자 프로필 완성도 | ✅ 있음 | supplier/profile/completeness | 8항목 체크리스트 |
| 공급자 상품 등록 | ✅ 있음 | NetureSupplierProduct | CATALOG/APPLICATION/ACTIVE_SALES |
| 상품 신청 수락 토글 | ✅ 있음 | acceptsApplications 컬럼 | 상품별 on/off |
| 판매자→공급자 공급 신청 | ✅ 있음 | NetureSupplierRequest | PENDING→APPROVED/REJECTED |
| 공급자 승인/거절 | ✅ 있음 | /requests/:id/approve\|reject | supplier 역할 필요 |
| 관리자 오버라이드 | ✅ 있음 | /admin/requests/:id/* | neture:admin 역할 필요 |
| 이벤트 로그 | ✅ 있음 | /requests/:id/events | 시간순 기록 |
| 거절 사유 기록 | ✅ 있음 | rejectReason 컬럼 | reject 시 필수 |
| 중복 신청 방지 | ✅ 있음 | 409 Conflict | (supplierId, sellerId, productId) |
| 공급자 콘텐츠 배포 | ✅ 있음 | NetureSupplierContent | DRAFT→PUBLISHED |
| 콘텐츠 서비스 제한 | ✅ 있음 | availableServices 배열 | 대상 서비스 지정 |
| 파트너십 제안 | ✅ 있음 | NeturePartnershipRequest | OPEN→MATCHED→CLOSED |
| 파트너 모집 | ✅ 있음 | NeturePartnerRecruitment | RECRUITING→CLOSED |
| 파트너 대시보드 | ✅ 있음 | NeturePartnerDashboardItem | 상품 슬롯 + 콘텐츠 링크 |
| 연락처 가시성 제어 | ✅ 있음 | contactXVisibility | PUBLIC/PARTNERS/PRIVATE |
| AI 성장 인사이트 | ✅ 있음 | /dashboard/ai-insight | LLM + rule-based fallback |
| 운영자 공급 현황 | ✅ 있음 | /operator/supply-products | 상품+요청 merged view |
| 약국 상품 진열 | ✅ 있음 | OrganizationProductListing | service_key 기반 분류 |
| 약국 상품 신청 | ✅ 있음 | OrganizationProductApplication | pending→approved/rejected |
| 채널별 상품 매핑 | ✅ 있음 | OrganizationProductChannel | 가격/수량 제한 |
| 면허/인증 관리 | ❌ 없음 | - | businessNumber만 수집 |
| 관계 해제/종료 | ❌ 없음 | - | approved 후 해제 불가 |
| 판매자 권한 시스템 (Phase 9) | ❌ 없음 | - | 501 STUB |
| 공급 계약 관리 | ❌ 없음 | - | 계약 테이블 없음 |
| 정산/결제 처리 | ⚠️ 부분 | 서비스별 분리 | Neture는 요약만 제공 |
| 재고 관리 | ❌ 없음 | - | 수량 추적 없음 |

### 7.2 서비스 간 상품 소유권 모델

```
                    ┌─────────────────────────┐
                    │   NetureSupplier        │
                    │   (공급자 프로필)         │
                    └──────────┬──────────────┘
                               │ 1:N
                    ┌──────────▼──────────────┐
                    │ NetureSupplierProduct    │
                    │ (공급 카탈로그)           │
                    │ purpose: CATALOG/APP/    │
                    │          ACTIVE_SALES    │
                    │ acceptsApplications: T/F │
                    └──────────┬──────────────┘
                               │ productId (Soft)
                    ┌──────────▼──────────────┐
                    │ NetureSupplierRequest    │
                    │ (공급 신청)              │
                    │ serviceId: glycopharm    │
                    │ status: PENDING→APPROVED │
                    └──────────┬──────────────┘
                               │ approved
                    ┌──────────▼──────────────┐
                    │ 서비스별 상품 테이블       │
                    │ glycopharm_products      │
                    │ k-cosmetics_products     │
                    │ neture_products          │
                    └─────────────────────────┘
```

**판정**: 공급자 상품은 Neture에서 관리하고, 실제 판매 상품은 각 서비스별 테이블에서 독립 관리된다. 연결은 `serviceId` + `productId` Soft Reference로 이루어진다.

---

## 8. 첫 거래 정보 교환 (Section E 추가)

> **플랫폼 비저장 원칙**: 사업자 간 첫 거래 시 교환되는 정보는 플랫폼이 저장하지 않는다.

### 8.1 현재 구현 상태

| 항목 | 상태 | 설명 |
|------|------|------|
| 사업자등록번호 | ⚠️ 부분 | 가입 시 수집만 (User 엔티티에 저장 여부 미확인) |
| 사업장 주소 | ❌ 없음 | 별도 필드 없음 |
| 대표자명 | ❌ 없음 | 별도 필드 없음 |
| 통신판매업 신고번호 | ❌ 없음 | 별도 필드 없음 |
| 거래 조건 동의 | ❌ 없음 | 약관 동의만 있음 |

### 8.2 플랫폼 비저장 접근법

현재 `NetureSupplierRequest`의 `metadata` JSONB 필드가 확장 포인트로 존재한다.
첫 거래 시 교환되는 정보는 이 필드에 임시 저장하거나, 별도 보안 채널을 통해 직접 교환하도록 설계할 수 있다.

**가능한 접근법:**
1. `metadata` JSONB에 암호화된 사업자 정보 임시 저장 → 거래 성사 후 삭제
2. 승인 시 연락처 가시성 자동 상향 (PRIVATE → PARTNERS)
3. 별도 "거래 정보 교환" 임시 채널 (메시지 시스템)

현재는 **접근법 2**가 부분적으로 구현되어 있다 (`contactXVisibility` 필드).

---

## 9. 미구현/갭 분석

### 9.1 Critical Gaps

| Gap | 영향 | 권장 조치 |
|-----|------|----------|
| **관계 해제 없음** | 승인 후 공급 관계를 끊을 수 없음 | `REVOKED` 상태 추가 또는 별도 테이블 |
| **면허/인증 없음** | 약사 면허, 사업자 인증 검증 불가 | 별도 인증 모듈 필요 |
| **정산 미통합** | 각 서비스별 독립 처리 | Neture 정산 통합 뷰 필요 |

### 9.2 Non-Critical Gaps

| Gap | 영향 | 현재 대안 |
|-----|------|----------|
| Phase 9 판매자 권한 | 판매자별 세분화된 권한 불가 | 역할 기반 접근 (supplier/partner/user) |
| 재고 추적 | 품절/재고 경고 불가 | 각 서비스별 상품 상태로 대체 |
| 공급 계약 관리 | 법적 계약 추적 불가 | 외부 시스템 사용 |
| 자동 정산 연동 | 수동 정산만 가능 | 정산 페이지 존재 (UI만) |

---

## 10. 주요 파일 참조

| 범주 | 파일 | 줄 수 |
|------|------|-------|
| **API 라우트** | `apps/api-server/src/modules/neture/neture.routes.ts` | ~1,945 |
| **비즈니스 로직** | `apps/api-server/src/modules/neture/neture.service.ts` | ~2,319 |
| **엔티티** | `apps/api-server/src/modules/neture/entities/` | 11 파일 |
| **Legacy 라우트** | `apps/api-server/src/routes/neture/` | P1 읽기전용 |
| **프론트엔드** | `services/web-neture/src/App.tsx` | 메인 라우트 |
| **인증** | `services/web-neture/src/contexts/AuthContext.tsx` | 역할 매핑 |
| **공급자 레이아웃** | `services/web-neture/src/components/layouts/SupplierOpsLayout.tsx` | 네비게이션 |

---

## 11. 결론

Neture 공급자 영역은 **2-sided supply marketplace**로서 핵심 기능이 구현되어 있다:

1. **공급자 관리**: 등록, 프로필, 상품, 콘텐츠 — 완성
2. **공급 신청/승인**: 판매자→공급자 흐름 — 완성 (NetureSupplierRequest)
3. **파트너 시스템**: 파트너십 요청, 모집, 대시보드 — 완성
4. **운영자 도구**: 대시보드, 공급 현황, 가입 승인 — 완성
5. **관리자 도구**: 전체 요청 관리, 오버라이드, 운영자 관리 — 완성

주요 미구현 영역은 **관계 해제**, **면허/인증**, **정산 통합**이며,
이는 향후 WO를 통해 단계적으로 구현할 수 있다.

---

*Investigation completed: 2026-02-21*
*Investigator: Claude Code*
*Classification: Internal Technical Reference*

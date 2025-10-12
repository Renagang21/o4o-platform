# O4O 플랫폼 구조 조사 보고서

작성일: 2025-10-12
작성자: Claude Code AI Agent

---

## 목차

1. [프로젝트 구조](#1-프로젝트-구조)
2. [데이터베이스 스키마](#2-데이터베이스-스키마)
3. [라우팅 구조](#3-라우팅-구조)
4. [인증 및 권한 시스템](#4-인증-및-권한-시스템)
5. [드롭쉬핑 비즈니스 모델](#5-드롭쉬핑-비즈니스-모델)

---

## 1. 프로젝트 구조

### 1.1 모노레포 구조

O4O 플랫폼은 **pnpm workspaces**를 사용하는 모노레포 구조입니다.

```
o4o-platform/
├── apps/              # 각 애플리케이션
├── packages/          # 공유 패키지
└── docs/              # 문서
```

### 1.2 애플리케이션 목록

| 앱 이름 | 경로 | 설명 | 기술 스택 |
|---------|------|------|-----------|
| **api-server** | `apps/api-server` | 백엔드 API 서버 | Express.js 4.21.2 + TypeORM 0.3.26 + PostgreSQL |
| **main-site** | `apps/main-site` | B2C 메인 사이트 | React 18.2.0 + Vite 5.4.x |
| **admin-dashboard** | `apps/admin-dashboard` | B2B 관리자 대시보드 | React 18.2.0 + Vite 5.4.x |
| **ecommerce** | `apps/ecommerce` | B2C 쇼핑몰 + 판매자 대시보드 | React 18.2.0 + Vite 5.4.x |
| **forum** | `apps/forum` | 커뮤니티 포럼 | React 18.2.0 + Vite 5.4.x |
| **digital-signage** | `apps/digital-signage` | 디지털 사이니지 | React 18.2.0 + Vite 5.4.x |
| **crowdfunding** | `apps/crowdfunding` | 크라우드펀딩 | React 18.2.0 + Vite 5.4.x |
| **healthcare** | `apps/healthcare` | 헬스케어 앱 | React 18.2.0 + Vite 5.4.x |
| **api-gateway** | `apps/api-gateway` | API 게이트웨이 | (미확인) |

### 1.3 기술 스택 요약

**프론트엔드:**
- React 18.2.0
- Vite 5.4.x (빌드 도구)
- React Router (라우팅)
- TypeScript

**백엔드:**
- Express.js 4.21.2
- TypeORM 0.3.26 (ORM)
- PostgreSQL (데이터베이스)
- JWT (jsonwebtoken) - 인증
- bcryptjs - 비밀번호 해싱

**Node.js 요구사항:**
- Node.js >= 22.18.0
- pnpm >= 9.0.0

---

## 2. 데이터베이스 스키마

### 2.1 데이터베이스 개요

- **ORM:** TypeORM 0.3.26
- **데이터베이스:** PostgreSQL
- **총 엔티티 수:** 91개
- **Primary Key:** UUID (전체 엔티티)

### 2.2 핵심 엔티티

#### 2.2.1 User 엔티티 (`entities/User.ts`)

**테이블명:** `users`

**주요 필드:**

| 필드명 | 타입 | 설명 | 기본값 |
|--------|------|------|--------|
| `id` | uuid | 사용자 ID (PK) | - |
| `email` | varchar(255) | 이메일 (unique) | - |
| `password` | varchar(255) | bcrypt 해시된 비밀번호 | - |
| `name` | varchar(200) | 사용자 이름 | null |
| `role` | enum(UserRole) | 레거시 단일 역할 | CUSTOMER |
| `roles` | simple-array | 레거시 역할 배열 | ['customer'] |
| `status` | enum(UserStatus) | 계정 상태 | PENDING |
| `businessInfo` | json | 사업자 정보 | null |
| `provider` | varchar(100) | 소셜 로그인 제공자 | null |
| `provider_id` | varchar(255) | 소셜 로그인 ID | null |
| `isActive` | boolean | 활성 상태 | true |
| `isEmailVerified` | boolean | 이메일 인증 여부 | false |
| `lastLoginAt` | timestamp | 마지막 로그인 시간 | null |
| `createdAt` | timestamp | 생성 시간 | now() |
| `updatedAt` | timestamp | 수정 시간 | now() |

**관계 (Relations):**

```typescript
// Many-to-Many: 사용자가 가진 여러 역할 (새로운 DB 기반 시스템)
@ManyToMany(() => Role, role => role.users, { eager: true })
@JoinTable({ name: 'user_roles' })
dbRoles?: Role[];

// Many-to-One: 현재 활성 역할 (역할 전환 기능)
@ManyToOne(() => Role, { nullable: true, eager: true })
@JoinColumn({ name: 'active_role_id' })
activeRole?: Role | null;

// One-to-One: 드롭쉬핑 관련 프로필
supplier?: Supplier;  // 공급자 프로필
seller?: Seller;      // 판매자 프로필
partner?: Partner;    // 파트너 프로필
```

**UserRole Enum:**

```typescript
enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  VENDOR = 'vendor',
  VENDOR_MANAGER = 'vendor_manager',
  SELLER = 'seller',
  CUSTOMER = 'customer',
  BUSINESS = 'business',
  MODERATOR = 'moderator',
  PARTNER = 'partner',
  BETA_USER = 'beta_user',
  SUPPLIER = 'supplier',
  AFFILIATE = 'affiliate',
  MANAGER = 'manager'
}
```

**UserStatus Enum:**

```typescript
enum UserStatus {
  ACTIVE = 'active',       // 활성 계정
  INACTIVE = 'inactive',   // 비활성 계정
  PENDING = 'pending',     // 승인 대기
  APPROVED = 'approved',   // 승인됨
  SUSPENDED = 'suspended', // 정지됨
  REJECTED = 'rejected'    // 거부됨
}
```

**주요 메서드:**

```typescript
// 역할 확인
hasRole(role: UserRole | string): boolean
hasAnyRole(roles: (UserRole | string)[]): boolean
isAdmin(): boolean

// 권한 확인
getAllPermissions(): string[]
hasPermission(permission: string): boolean
hasAnyPermission(permissions: string[]): boolean
hasAllPermissions(permissions: string[]): boolean

// 역할 전환 관련
getActiveRole(): Role | null
canSwitchToRole(roleId: string): boolean
hasMultipleRoles(): boolean

// 드롭쉬핑 역할 확인
isSupplier(): boolean
isSeller(): boolean
isPartner(): boolean
getDropshippingRoles(): string[]
```

#### 2.2.2 Role 엔티티 (`entities/Role.ts`)

**테이블명:** `roles`

**주요 필드:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| `id` | uuid | 역할 ID (PK) |
| `name` | varchar(50) | 역할 이름 (unique) |
| `displayName` | varchar(100) | 표시 이름 |
| `description` | text | 설명 |
| `isActive` | boolean | 활성 상태 |
| `isSystem` | boolean | 시스템 역할 (삭제 불가) |

**관계:**

```typescript
@ManyToMany(() => Permission, permission => permission.roles)
@JoinTable({ name: 'role_permissions' })
permissions!: Permission[];
```

#### 2.2.3 Permission 엔티티 (`entities/Permission.ts`)

**테이블명:** `permissions`

**주요 필드:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| `id` | uuid | 권한 ID (PK) |
| `key` | varchar(100) | 권한 키 (예: 'users.view') |
| `description` | varchar(255) | 설명 |
| `category` | varchar(50) | 카테고리 |
| `isActive` | boolean | 활성 상태 |

**권한 키 예시:**
- `users.view`, `users.create`, `users.edit`, `users.delete`
- `content.view`, `content.create`, `content.edit`, `content.delete`
- `admin.settings`, `admin.analytics`

#### 2.2.4 Supplier 엔티티 (`entities/Supplier.ts`)

**테이블명:** `suppliers`

공급자는 드롭쉬핑 모델에서 제품을 공급하는 역할입니다.

**주요 필드:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| `id` | uuid | 공급자 ID (PK) |
| `userId` | uuid | 사용자 ID (FK) |
| `businessName` | varchar(255) | 사업자명 |
| `businessNumber` | varchar(50) | 사업자등록번호 |
| `status` | enum(SupplierStatus) | 상태 |
| `tier` | enum(SupplierTier) | 등급 |
| `defaultPartnerCommissionRate` | decimal(5,2) | 기본 파트너 커미션율 |

**SupplierTier Enum:**

```typescript
enum SupplierTier {
  BASIC = 'basic',       // 기본: 50개 제품, 기본 수수료
  PREMIUM = 'premium',   // 프리미엄: 200개 제품, 낮은 수수료
  ENTERPRISE = 'enterprise' // 엔터프라이즈: 무제한 제품, 최저 수수료
}
```

**주요 기능:**
- 판매자 등급별 차등 공급가 설정
- 파트너 커미션율 설정
- 제품당 커미션 계산

#### 2.2.5 Seller 엔티티 (`entities/Seller.ts`)

**테이블명:** `sellers`

판매자는 공급자의 제품을 자신의 스토어에서 판매하는 역할입니다.

**주요 필드:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| `id` | uuid | 판매자 ID (PK) |
| `userId` | uuid | 사용자 ID (FK) |
| `businessName` | varchar(255) | 상호명 |
| `storeSlug` | varchar(255) | 스토어 URL 슬러그 |
| `status` | enum(SellerStatus) | 상태 |
| `tier` | enum(SellerTier) | 등급 |
| `platformCommissionRate` | decimal(5,2) | 플랫폼 수수료율 |
| `branding` | json | 브랜딩 설정 |
| `allowPartners` | boolean | 파트너 프로그램 허용 |

**SellerTier Enum & 혜택:**

| 등급 | 제품 수 | 플랫폼 수수료 | 공급자 할인 |
|------|---------|--------------|------------|
| BRONZE | 50개 | 5% | 0% |
| SILVER | 200개 | 4% | 5% |
| GOLD | 500개 | 3% | 10% |
| PLATINUM | 무제한 | 2% | 15% |

**주요 기능:**
- 독립적인 스토어 운영
- 브랜딩 커스터마이징
- 파트너 프로그램 관리
- 등급별 혜택 차등 적용

#### 2.2.6 Partner 엔티티 (`entities/Partner.ts`)

**테이블명:** `partners`

파트너는 판매자에게 소속되어 제품을 홍보하고 커미션을 받는 역할입니다 (어필리에이트/인플루언서).

**주요 필드:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| `id` | uuid | 파트너 ID (PK) |
| `userId` | uuid | 사용자 ID (FK) |
| `sellerId` | uuid | 소속 판매자 ID (FK) |
| `referralCode` | varchar(20) | 추천 코드 (unique) |
| `referralLink` | varchar(500) | 추천 링크 |
| `tier` | enum(PartnerTier) | 등급 |
| `totalEarnings` | decimal(12,2) | 총 수익 |
| `availableBalance` | decimal(12,2) | 출금 가능 금액 |
| `metrics` | json | 성과 지표 |

**PartnerTier Enum:**

```typescript
enum PartnerTier {
  BRONZE = 'bronze',     // 브론즈
  SILVER = 'silver',     // 실버
  GOLD = 'gold',         // 골드
  PLATINUM = 'platinum'  // 플래티넘
}
```

**Metrics (성과 지표):**

```typescript
interface PartnerMetrics {
  clicks: number;          // 클릭 수
  orders: number;          // 주문 수
  revenue: number;         // 발생 매출
  conversionRate: number;  // 전환율
}
```

**주요 기능:**
- 추천 링크 생성 및 관리
- 클릭/주문 추적
- 커미션 수익 계산 및 관리
- 등급별 혜택 차등

#### 2.2.7 Product 엔티티 (`entities/Product.ts`)

**테이블명:** `products`

**주요 필드:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| `id` | uuid | 제품 ID (PK) |
| `supplierId` | uuid | 공급자 ID (FK) |
| `categoryId` | uuid | 카테고리 ID (FK) |
| `name` | varchar(255) | 제품명 |
| `description` | text | 상세 설명 |
| `sku` | varchar(100) | SKU (unique) |
| `slug` | varchar(255) | URL 슬러그 (unique) |
| `type` | enum(ProductType) | 제품 타입 |
| `status` | enum(ProductStatus) | 상태 |
| `supplierPrice` | decimal(10,2) | 공급가 |
| `recommendedPrice` | decimal(10,2) | 권장 판매가 |
| `comparePrice` | decimal(10,2) | 정가 (할인 비교용) |
| `partnerCommissionRate` | decimal(5,2) | 파트너 커미션율 |
| `partnerCommissionAmount` | decimal(10,2) | 고정 커미션 금액 |
| `inventory` | integer | 재고 수량 |
| `trackInventory` | boolean | 재고 추적 여부 |
| `allowBackorder` | boolean | 품절 시 예약 허용 |
| `images` | json | 이미지 정보 |
| `variants` | json | 옵션 정보 (사이즈, 색상 등) |
| `tierPricing` | json | 판매자 등급별 공급가 |

**ProductType Enum:**

```typescript
enum ProductType {
  PHYSICAL = 'physical',         // 실물 제품
  DIGITAL = 'digital',           // 디지털 제품
  SERVICE = 'service',           // 서비스
  SUBSCRIPTION = 'subscription'  // 구독 상품
}
```

**ProductStatus Enum:**

```typescript
enum ProductStatus {
  DRAFT = 'draft',                 // 초안
  ACTIVE = 'active',               // 활성
  INACTIVE = 'inactive',           // 비활성
  OUT_OF_STOCK = 'out_of_stock',   // 품절
  DISCONTINUED = 'discontinued'    // 단종
}
```

**Tier Pricing (등급별 가격):**

```typescript
interface TierPricing {
  bronze?: number;    // 브론즈 판매자 공급가
  silver?: number;    // 실버 판매자 공급가
  gold?: number;      // 골드 판매자 공급가
  platinum?: number;  // 플래티넘 판매자 공급가
}
```

**주요 메서드:**

```typescript
getCurrentPrice(sellerTier?: string): number        // 등급별 공급가 조회
calculatePartnerCommission(salePrice: number): number // 파트너 커미션 계산
isInStock(): boolean                                 // 재고 확인
isLowStock(): boolean                                // 저재고 확인
reduceInventory(quantity: number): void              // 재고 감소
increaseInventory(quantity: number): void            // 재고 증가
canOrder(quantity: number): boolean                  // 주문 가능 여부
```

#### 2.2.8 Order 엔티티 (`entities/Order.ts`)

**테이블명:** `orders`

**주요 필드:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| `id` | uuid | 주문 ID (PK) |
| `orderNumber` | varchar | 주문 번호 (unique) |
| `buyerId` | uuid | 구매자 ID (FK) |
| `items` | jsonb | 주문 항목 |
| `summary` | jsonb | 금액 요약 |
| `status` | enum(OrderStatus) | 주문 상태 |
| `paymentStatus` | enum(PaymentStatus) | 결제 상태 |
| `paymentMethod` | enum(PaymentMethod) | 결제 방법 |
| `billingAddress` | jsonb | 청구지 주소 |
| `shippingAddress` | jsonb | 배송지 주소 |
| `trackingNumber` | varchar | 운송장 번호 |

**OrderStatus Enum:**

```typescript
enum OrderStatus {
  PENDING = 'pending',       // 대기
  CONFIRMED = 'confirmed',   // 확인됨
  PROCESSING = 'processing', // 처리 중
  SHIPPED = 'shipped',       // 배송 중
  DELIVERED = 'delivered',   // 배송 완료
  CANCELLED = 'cancelled',   // 취소됨
  RETURNED = 'returned'      // 반품됨
}
```

**PaymentStatus Enum:**

```typescript
enum PaymentStatus {
  PENDING = 'pending',       // 대기
  COMPLETED = 'completed',   // 완료
  FAILED = 'failed',         // 실패
  REFUNDED = 'refunded'      // 환불
}
```

**OrderItem 구조:**

```typescript
interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  productImage: string;
  variationId?: string;
  variationName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  supplierId: string;       // 공급자 ID
  supplierName: string;     // 공급자명
  attributes?: Record<string, string>;
  notes?: string;
}
```

**OrderSummary 구조:**

```typescript
interface OrderSummary {
  subtotal: number;      // 소계
  discount: number;      // 할인
  shipping: number;      // 배송비
  tax: number;           // 세금
  total: number;         // 총액
  handlingFee?: number;  // 처리 수수료
  insuranceFee?: number; // 보험료
  serviceFee?: number;   // 서비스 수수료
}
```

### 2.3 데이터베이스 관계 다이어그램

```
User (사용자)
├── 1:1 ── Supplier (공급자)
├── 1:1 ── Seller (판매자)
└── 1:1 ── Partner (파트너)

User (사용자)
├── M:N ── Role (역할)
└── M:1 ── Role (활성 역할)

Role (역할)
└── M:N ── Permission (권한)

Supplier (공급자)
└── 1:M ── Product (제품)

Seller (판매자)
└── 1:M ── Partner (파트너)

Order (주문)
├── M:1 ── User (구매자)
└── items → Product (제품 참조)

Product (제품)
├── M:1 ── Supplier (공급자)
└── M:1 ── Category (카테고리)
```

### 2.4 정산 관련 테이블

**주의:** 현재 별도의 정산(Settlement) 엔티티는 발견되지 않았습니다. 정산은 다음 데이터를 기반으로 실시간 계산될 가능성이 있습니다:

- `Order.summary` - 주문 금액 정보
- `Product.tierPricing` - 판매자 등급별 공급가
- `Product.partnerCommissionRate` - 파트너 커미션율
- `Seller.platformCommissionRate` - 플랫폼 수수료율
- `Partner.totalEarnings` - 파트너 총 수익
- `Partner.availableBalance` - 파트너 출금 가능 금액

---

## 3. 라우팅 구조

### 3.1 URL 구조 요약

#### B2B URL (비즈니스 사용자)

| URL | 앱 | 설명 | 대상 사용자 |
|-----|-----|------|-----------|
| `admin.neture.co.kr` | admin-dashboard | 플랫폼 전체 관리 | Super Admin, Admin |
| `admin.neture.co.kr/dropshipping/*` | admin-dashboard | 드롭쉬핑 관리 | Admin |
| `shop.neture.co.kr/vendor/*` | ecommerce | 판매자 대시보드 | Seller, Vendor |

#### B2C URL (일반 고객)

| URL | 앱 | 설명 |
|-----|-----|------|
| `neture.co.kr` | main-site | 메인 콘텐츠 사이트 |
| `shop.neture.co.kr` | ecommerce | 쇼핑몰 |
| `shop.neture.co.kr/shop/:slug` | ecommerce | 개별 공급자 상점 |
| `forum.neture.co.kr` | forum | 커뮤니티 포럼 |
| `signage.neture.co.kr` | digital-signage | 디지털 사이니지 |
| `funding.neture.co.kr` | crowdfunding | 크라우드펀딩 |

### 3.2 API 라우팅 구조

#### 3.2.1 API 서버 라우트 디렉토리

```
apps/api-server/src/routes/
├── v1/                    # V1 API 라우트
├── admin/                 # 관리자 API 라우트
├── auth.ts                # 인증 API
├── seller-products.ts     # 판매자 제품 API
├── partners.ts            # 파트너 API
├── products.ts            # 제품 API
├── orders.routes.ts       # 주문 API
└── ... (기타 라우트)
```

#### 3.2.2 인증 API (`/auth.ts`)

**Base URL:** `/api/auth`

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| POST | `/login` | 로그인 | ❌ |
| POST | `/register` | 회원가입 | ❌ |
| GET | `/verify` | 토큰 검증 | ✅ |
| POST | `/logout` | 로그아웃 | ✅ |
| GET | `/status` | 인증 상태 확인 | ✅ |

**로그인 응답 예시:**

```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "홍길동",
    "role": "customer",
    "activeRole": {
      "id": "role-uuid",
      "name": "customer",
      "displayName": "일반 고객"
    },
    "roles": [
      {
        "id": "role-uuid",
        "name": "customer",
        "displayName": "일반 고객"
      }
    ],
    "canSwitchRoles": false,
    "status": "active"
  }
}
```

#### 3.2.3 사용자 역할 전환 API (`/v1/userRoleSwitch.routes.ts`)

**Base URL:** `/api/v1/users`

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| PATCH | `/me/active-role` | 활성 역할 전환 | ✅ |
| GET | `/me/roles` | 현재 사용자 역할 목록 | ✅ |

**역할 전환 요청:**

```json
{
  "roleId": "role-uuid"
}
```

**역할 전환 응답:**

```json
{
  "success": true,
  "message": "Active role switched to 판매자",
  "data": {
    "userId": "user-uuid",
    "activeRole": {
      "id": "role-uuid",
      "name": "seller",
      "displayName": "판매자",
      "permissions": ["products.view", "products.create", ...]
    },
    "availableRoles": [
      {
        "id": "role1-uuid",
        "name": "customer",
        "displayName": "일반 고객",
        "isActive": false
      },
      {
        "id": "role2-uuid",
        "name": "seller",
        "displayName": "판매자",
        "isActive": true
      }
    ]
  }
}
```

#### 3.2.4 사용자 관리 API (`/v1/users.routes.ts`)

**Base URL:** `/api/v1/users`

| Method | Endpoint | 설명 | 인증 | 권한 |
|--------|----------|------|------|------|
| GET | `/` | 사용자 목록 조회 | ✅ | Admin |
| GET | `/:id` | 단일 사용자 조회 | ✅ | Admin |
| POST | `/` | 사용자 생성 | ✅ | Admin |
| PUT | `/:id` | 사용자 전체 수정 | ✅ | Admin |
| PATCH | `/:id` | 사용자 부분 수정 | ✅ | Admin |
| DELETE | `/:id` | 사용자 삭제 | ✅ | Admin |
| GET | `/statistics` | 사용자 통계 | ✅ | Admin |

#### 3.2.5 판매자 제품 API (`/seller-products.ts`)

**Base URL:** `/api/seller-products`

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| POST | `/` | 제품 추가 | ✅ |
| POST | `/bulk` | 제품 일괄 추가 | ✅ |
| PUT | `/:id` | 제품 수정 | ✅ |
| DELETE | `/:id` | 제품 삭제 | ✅ |
| GET | `/` | 판매자 제품 목록 | ✅ |
| GET | `/available` | 추가 가능한 제품 목록 | ✅ |
| GET | `/:id/profitability` | 제품 수익성 분석 | ✅ |
| POST | `/sync-inventory` | 재고 동기화 | ✅ |
| GET | `/stats` | 통계 | ✅ |
| GET | `/performance` | 성과 지표 | ✅ |
| GET | `/me` | 내 제품 목록 | ✅ |
| GET | `/me/dashboard` | 내 대시보드 | ✅ |

#### 3.2.6 드롭쉬핑 관리 API (`/admin/dropshipping.routes.ts`)

**Base URL:** `/api/admin/dropshipping`

| Method | Endpoint | 설명 | 인증 | 권한 |
|--------|----------|------|------|------|
| GET | `/commission-policies` | 수수료 정책 조회 | ✅ | Admin |
| GET | `/approvals` | 승인 대기 목록 | ✅ | Admin |
| POST | `/approvals/:id/approve` | 승인 처리 | ✅ | Admin |
| POST | `/approvals/:id/reject` | 거부 처리 | ✅ | Admin |
| GET | `/system-status` | 시스템 상태 | ✅ | Admin |
| POST | `/initialize` | 시스템 초기화 | ✅ | Admin |
| POST | `/seed` | 샘플 데이터 생성 | ✅ | Admin |

### 3.3 프론트엔드 라우팅

#### 3.3.1 관리자 대시보드 (`apps/admin-dashboard`)

```typescript
// pages/dropshipping/index.tsx
<Routes>
  <Route path="products" element={<Products />} />
  <Route path="orders" element={<Orders />} />
  <Route path="settlements" element={<Settlements />} />
  <Route path="sellers" element={<SellersList />} />
  <Route path="partners" element={<PartnersList />} />
  <Route path="suppliers" element={<SuppliersList />} />
  <Route path="approvals" element={<Approvals />} />
  <Route path="commissions" element={<Commissions />} />
  <Route path="setup" element={<SystemSetup />} />
</Routes>
```

#### 3.3.2 이커머스 앱 (`apps/ecommerce`)

```typescript
// router.tsx
<Routes>
  {/* B2C 쇼핑몰 */}
  <Route path="/products" element={<ProductsPage />} />
  <Route path="/cart" element={<CartPage />} />
  <Route path="/checkout" element={<CheckoutPage />} />
  <Route path="/orders" element={<OrdersPage />} />
  <Route path="/shop/:slug" element={<SupplierShop />} />

  {/* B2B 판매자 대시보드 */}
  <Route path="/vendor" element={<VendorLayout />}>
    <Route index element={<VendorDashboard />} />
    <Route path="products" element={<VendorProducts />} />
    <Route path="orders" element={<VendorOrders />} />
    <Route path="analytics" element={<VendorAnalytics />} />
    <Route path="settings" element={<VendorSettings />} />
  </Route>
</Routes>
```

---

## 4. 인증 및 권한 시스템

### 4.1 인증 방식

**JWT (JSON Web Token) 기반 인증**

- **토큰 타입:** Bearer Token
- **전송 방식:** Authorization 헤더
- **만료 시간:** 7일
- **시크릿 키:** `JWT_SECRET` 환경 변수

**JWT Payload 구조:**

```typescript
interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;  // Issued At
  exp: number;  // Expiration
}
```

**인증 플로우:**

1. 클라이언트 로그인 요청 (`POST /api/auth/login`)
2. 서버 이메일/비밀번호 검증
3. JWT 토큰 생성 및 반환
4. 클라이언트 토큰 저장 (localStorage/sessionStorage)
5. API 요청 시 Authorization 헤더에 토큰 포함
6. 서버 미들웨어에서 토큰 검증

### 4.2 인증 미들웨어

#### `authenticate` 미들웨어 (`auth.middleware.ts:1-87`)

```typescript
export const authenticate = async (req, res, next) => {
  // 1. Authorization 헤더에서 토큰 추출
  const token = extractBearerToken(req.headers.authorization);

  // 2. JWT 토큰 검증
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // 3. 데이터베이스에서 사용자 정보 로드 (역할 및 권한 포함)
  const user = await userRepository.findOne({
    where: { id: decoded.userId },
    relations: ['dbRoles', 'dbRoles.permissions', 'activeRole']
  });

  // 4. req.user에 사용자 정보 설정
  req.user = user;
  next();
};
```

### 4.3 권한 시스템

#### 4.3.1 권한 체계

O4O 플랫폼은 **RBAC (Role-Based Access Control)** 시스템을 사용합니다.

**계층 구조:**

```
User (사용자)
└── has many ── Role (역할)
    └── has many ── Permission (권한)
```

**특징:**
- 사용자는 여러 역할을 가질 수 있음 (Multi-role support)
- 각 역할은 여러 권한을 가짐
- 사용자는 활성 역할을 전환할 수 있음
- 레거시 시스템과 호환 유지

#### 4.3.2 권한 미들웨어 (`permission.middleware.ts`)

**1. 기본 인증 확인:**

```typescript
export const ensureAuthenticated = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      code: 'NOT_AUTHENTICATED'
    });
  }
  next();
};
```

**2. 단일 권한 확인:**

```typescript
export const requirePermission = (permission: string) => {
  return (req, res, next) => {
    if (!req.user.hasPermission(permission)) {
      return res.status(403).json({
        error: 'Forbidden',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: permission
      });
    }
    next();
  };
};

// 사용 예시
router.get('/users', authenticate, requirePermission('users.view'), handler);
```

**3. 복수 권한 확인 (OR 조건):**

```typescript
export const requireAnyPermission = (permissions: string[]) => {
  return (req, res, next) => {
    if (!req.user.hasAnyPermission(permissions)) {
      return res.status(403).json({
        error: 'Forbidden',
        required: permissions
      });
    }
    next();
  };
};

// 사용 예시
router.get('/content',
  authenticate,
  requireAnyPermission(['content.view', 'content.edit']),
  handler
);
```

**4. 복수 권한 확인 (AND 조건):**

```typescript
export const requireAllPermissions = (permissions: string[]) => {
  return (req, res, next) => {
    if (!req.user.hasAllPermissions(permissions)) {
      return res.status(403).json({
        error: 'Forbidden',
        required: permissions
      });
    }
    next();
  };
};
```

**5. 역할 확인:**

```typescript
export const requireRole = (role: UserRole) => {
  return (req, res, next) => {
    if (!req.user.hasRole(role)) {
      return res.status(403).json({
        error: 'Forbidden',
        code: 'INSUFFICIENT_ROLE',
        required: role
      });
    }
    next();
  };
};

export const requireAnyRole = (roles: UserRole[]) => { ... };
```

**6. 관리자 확인 단축 함수:**

```typescript
// Admin 또는 Super Admin 역할 확인
export const requireAdmin = requireAnyRole([
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN
]);

// Super Admin만 확인
export const requireSuperAdmin = requireRole(UserRole.SUPER_ADMIN);
```

**7. 소유자 또는 관리자 확인:**

```typescript
export const requireSelfOrAdmin = (paramName = 'id') => {
  return (req, res, next) => {
    const targetUserId = req.params[paramName];
    const isOwner = req.user.id === targetUserId;
    const isAdmin = req.user.isAdmin();

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        error: 'Forbidden',
        code: 'ACCESS_DENIED'
      });
    }
    next();
  };
};
```

**8. 커스텀 권한 체크:**

```typescript
export const customPermissionCheck = (
  checkFn: (user: User) => boolean,
  errorMessage: string
) => {
  return (req, res, next) => {
    if (!checkFn(req.user)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: errorMessage
      });
    }
    next();
  };
};

// 사용 예시
router.get('/special',
  authenticate,
  customPermissionCheck(
    (user) => user.isAdmin() || user.hasPermission('special.access'),
    'Special access required'
  ),
  handler
);
```

#### 4.3.3 User 엔티티 권한 메서드

**역할 확인:**

```typescript
user.hasRole('admin');                    // 특정 역할 보유 여부
user.hasAnyRole(['admin', 'vendor']);     // 여러 역할 중 하나라도 보유
user.isAdmin();                           // 관리자 여부
```

**권한 확인:**

```typescript
user.hasPermission('users.view');                     // 특정 권한 보유
user.hasAnyPermission(['users.view', 'users.edit']); // OR 조건
user.hasAllPermissions(['users.view', 'users.edit']); // AND 조건
user.getAllPermissions();                             // 모든 권한 목록
```

**역할 전환:**

```typescript
user.getActiveRole();                // 현재 활성 역할
user.canSwitchToRole(roleId);       // 특정 역할로 전환 가능 여부
user.hasMultipleRoles();            // 복수 역할 보유 여부
```

#### 4.3.4 권한 작동 원리

1. **사용자가 가진 모든 권한 수집:**

```typescript
getAllPermissions(): string[] {
  // 1. 관리자는 모든 권한 자동 부여
  if (this.isAdmin()) {
    return [모든 권한 목록];
  }

  // 2. DB 역할에서 권한 수집
  const rolePermissions = this.dbRoles
    ?.flatMap(role => role.getPermissionKeys()) || [];

  // 3. 직접 부여된 권한 수집
  const directPermissions = this.permissions || [];

  // 4. 중복 제거 후 반환
  return [...new Set([...rolePermissions, ...directPermissions])];
}
```

2. **권한 확인:**

```typescript
hasPermission(permission: string): boolean {
  return this.getAllPermissions().includes(permission);
}
```

### 4.4 미들웨어 사용 패턴

#### 패턴 1: 기본 인증만

```typescript
router.get('/profile',
  authenticate,  // 로그인 확인만
  handler
);
```

#### 패턴 2: 인증 + 권한

```typescript
router.post('/users',
  authenticate,                      // 1. 로그인 확인
  requirePermission('users.create'), // 2. 권한 확인
  handler
);
```

#### 패턴 3: 인증 + 역할

```typescript
router.get('/admin/dashboard',
  authenticate,     // 1. 로그인 확인
  requireAdmin,     // 2. 관리자 역할 확인
  handler
);
```

#### 패턴 4: 인증 + 소유자/관리자

```typescript
router.put('/users/:id',
  authenticate,           // 1. 로그인 확인
  requireSelfOrAdmin(),   // 2. 본인 또는 관리자 확인
  handler
);
```

#### 패턴 5: 복수 미들웨어 체인

```typescript
router.post('/content/publish',
  authenticate,                                    // 1. 로그인
  requireAnyRole(['editor', 'admin']),            // 2. 역할 확인
  requireAnyPermission(['content.publish']),      // 3. 권한 확인
  handler
);
```

### 4.5 에러 코드

| HTTP | Error Code | 설명 |
|------|------------|------|
| 401 | `NOT_AUTHENTICATED` | 인증 필요 (토큰 없음/만료) |
| 401 | `INVALID_TOKEN` | 토큰 검증 실패 |
| 401 | `INVALID_CREDENTIALS` | 이메일/비밀번호 불일치 |
| 403 | `INSUFFICIENT_PERMISSIONS` | 권한 부족 |
| 403 | `INSUFFICIENT_ROLE` | 역할 부족 |
| 403 | `ACCESS_DENIED` | 접근 거부 |
| 400 | `ACCOUNT_NOT_ACTIVE` | 계정 비활성 |

---

## 5. 드롭쉬핑 비즈니스 모델

### 5.1 비즈니스 플로우

```
[공급자] ─────┐
 (Supplier)   │
              ▼
          [제품]
           (Product)
              │
              ├──> [판매자 스토어] ─────> [고객 주문]
              │     (Seller Store)        (Customer Order)
              │            │
              │            ├──> [파트너 링크]
              │            │     (Partner Referral)
              │            │
              └────────────┴──────> [정산]
                                    (Settlement)
```

### 5.2 수익 구조

**제품 판매 시 금액 흐름:**

```
고객 지불 금액: ₩100,000
    │
    ├─> 공급자 수익: ₩60,000 (공급가)
    │
    ├─> 플랫폼 수수료: ₩3,000 (판매가의 3%, 판매자 등급에 따라)
    │
    ├─> 파트너 커미션: ₩5,000 (판매가의 5%, 제품별 설정)
    │
    └─> 판매자 수익: ₩32,000 (잔여 금액)
```

**계산 공식:**

```
판매가 (Sale Price) = ₩100,000
공급가 (Supplier Price) = 판매자 등급별 공급가
플랫폼 수수료 (Platform Fee) = 판매가 × 판매자 수수료율
파트너 커미션 (Partner Commission) = 판매가 × 파트너 커미션율 (또는 고정 금액)
판매자 수익 (Seller Profit) = 판매가 - 공급가 - 플랫폼 수수료 - 파트너 커미션
```

### 5.3 등급 시스템

#### 판매자 (Seller) 등급별 혜택

| 등급 | 제품 수 | 플랫폼 수수료 | 공급자 할인 | 기타 혜택 |
|------|---------|--------------|------------|----------|
| BRONZE | 50개 | 5% | 0% | 기본 |
| SILVER | 200개 | 4% | 5% | 우선 지원 |
| GOLD | 500개 | 3% | 10% | 전용 계정 매니저 |
| PLATINUM | 무제한 | 2% | 15% | 맞춤형 솔루션 |

#### 공급자 (Supplier) 등급

| 등급 | 제품 수 | 수수료율 | 혜택 |
|------|---------|---------|------|
| BASIC | 50개 | 표준 | 기본 지원 |
| PREMIUM | 200개 | 할인 | 우선 노출 |
| ENTERPRISE | 무제한 | 최저 | 전담 지원 |

#### 파트너 (Partner) 등급

| 등급 | 커미션율 | 조건 |
|------|---------|------|
| BRONZE | 기본 | 신규 파트너 |
| SILVER | 기본 + 1% | 월 ₩100만 매출 |
| GOLD | 기본 + 2% | 월 ₩500만 매출 |
| PLATINUM | 기본 + 3% | 월 ₩1,000만 매출 |

### 5.4 주요 기능

#### 5.4.1 공급자 기능

- 제품 등록 및 관리
- 판매자 등급별 공급가 설정
- 재고 관리
- 주문 처리
- 파트너 커미션율 설정

#### 5.4.2 판매자 기능

- 공급자 제품 선택 및 추가
- 독립적인 스토어 운영
- 브랜딩 커스터마이징
- 가격 설정 (권장 판매가 기반)
- 파트너 관리
- 주문 관리
- 수익 분석

#### 5.4.3 파트너 기능

- 추천 링크 생성
- 클릭/주문 추적
- 커미션 수익 확인
- 성과 대시보드
- 출금 요청

#### 5.4.4 관리자 기능

- 전체 사용자 관리
- 승인 워크플로우
- 수수료 정책 관리
- 정산 관리
- 시스템 설정
- 분석 및 리포트

---

## 부록: 주요 파일 참조

### 엔티티 (Entities)

- `apps/api-server/src/entities/User.ts` - 사용자 엔티티
- `apps/api-server/src/entities/Role.ts` - 역할 엔티티
- `apps/api-server/src/entities/Permission.ts` - 권한 엔티티
- `apps/api-server/src/entities/Supplier.ts` - 공급자 엔티티
- `apps/api-server/src/entities/Seller.ts` - 판매자 엔티티
- `apps/api-server/src/entities/Partner.ts` - 파트너 엔티티
- `apps/api-server/src/entities/Product.ts` - 제품 엔티티
- `apps/api-server/src/entities/Order.ts` - 주문 엔티티

### 미들웨어 (Middleware)

- `apps/api-server/src/middleware/auth.middleware.ts` - 인증 미들웨어
- `apps/api-server/src/middleware/permission.middleware.ts` - 권한 미들웨어

### 라우트 (Routes)

- `apps/api-server/src/routes/auth.ts` - 인증 API
- `apps/api-server/src/routes/v1/userRoleSwitch.routes.ts` - 역할 전환 API
- `apps/api-server/src/routes/v1/users.routes.ts` - 사용자 관리 API
- `apps/api-server/src/routes/seller-products.ts` - 판매자 제품 API
- `apps/api-server/src/routes/admin/dropshipping.routes.ts` - 드롭쉬핑 관리 API

### 컨트롤러 (Controllers)

- `apps/api-server/src/controllers/v1/userRoleSwitch.controller.ts` - 역할 전환 컨트롤러

### 타입 정의 (Types)

- `apps/api-server/src/types/auth.ts` - 인증 관련 타입

---

## 요약

O4O 플랫폼은 다음과 같은 특징을 가진 종합 드롭쉬핑 플랫폼입니다:

**핵심 특징:**

1. **Monorepo 구조** - pnpm workspaces로 관리되는 9개 앱
2. **B2B + B2C 분리** - 명확한 URL 및 기능 분리
3. **드롭쉬핑 모델** - Supplier, Seller, Partner의 3자 구조
4. **JWT 인증** - Bearer Token 기반 인증
5. **RBAC 권한 시스템** - Role-based Access Control with multi-role support
6. **역할 전환 기능** - 사용자가 여러 역할을 보유하고 전환 가능
7. **등급 시스템** - 판매자/공급자/파트너 등급별 차등 혜택
8. **PostgreSQL + TypeORM** - 91개 엔티티로 구성된 복잡한 데이터 모델

**기술 스택:**

- **Frontend:** React 18.2.0 + Vite 5.4.x + TypeScript
- **Backend:** Express.js 4.21.2 + TypeORM 0.3.26 + PostgreSQL
- **Auth:** JWT (7일 만료)
- **Password:** bcryptjs
- **Package Manager:** pnpm (monorepo)

---

**작성 완료: 2025-10-12**

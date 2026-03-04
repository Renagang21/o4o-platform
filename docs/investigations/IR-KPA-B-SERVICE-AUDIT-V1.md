# IR-KPA-B-SERVICE-AUDIT-V1

> **KPA-b (지부/분회 서비스) 구조 정밀 감사**
> 작성일: 2026-03-04
> 상태: READ-ONLY 조사 완료
> 목적: KPA-b의 실제 코드 구조가 조직 설계(지부→분회→회원→공동구매)와 일치하는지 검증

---

## 조사 배경

KPA-b는 KPA 3개 서비스 중 **기준 구조**. KPA-c는 본질적으로 "KPA-b − 지부 구조"이므로, KPA-b의 정확한 이해가 전체 KPA 구조 정비의 출발점이다.

조사 대상:
- `apps/api-server/src/routes/kpa/` (백엔드)
- `services/web-kpa-society/src/` (프론트엔드)
- `packages/security-core/` (가드)

---

## Phase 1. 조직 엔티티 구조 (district/branch/organization)

### 1.1 kpa_organizations — 단일 테이블, Type 기반 계층

```
kpa_organizations
├── id              UUID PRIMARY KEY
├── name            VARCHAR(200)
├── type            VARCHAR(50)    → 'association' | 'branch' | 'group'
├── parent_id       UUID (nullable) → self FK
├── description     VARCHAR(500)
├── address         VARCHAR(200)
├── phone           VARCHAR(50)
├── is_active       BOOLEAN
├── storefront_config  JSONB
├── created_at      TIMESTAMP
└── updated_at      TIMESTAMP
```

**핵심: "district" 타입은 존재하지 않는다.**

| 타입 | 실제 의미 | 계층 |
|------|-----------|------|
| `association` | 지부 (시/도 약사회, 예: 서울특별시약사회) | 최상위 |
| `branch` | 분회 (예: 강남분회) | association의 하위 |
| `group` | 기타 그룹 | 별도 |

**계층 관계:**
```
association (지부)
  └── parent_id = NULL
        ↓
branch (분회)
  └── parent_id → association.id
```

소스: `apps/api-server/src/routes/kpa/entities/kpa-organization.entity.ts`

### 1.2 이중 조직 표현 (Dual Organization)

KPA 조직은 **두 테이블**에 동시 존재:

| 테이블 | 소유 | 용도 |
|--------|------|------|
| `kpa_organizations` | KPA 서비스 | KPA 고유 계층 (type, parent_id, storefront_config) |
| `organizations` | platform-core (Frozen F3) | 플랫폼 공통 기능 (스토어, 콘텐츠, 채널) 연동 |

`kpa_members.organization_id` → `organizations.id` (NOT `kpa_organizations.id`)

**동기화**: Phase A 마이그레이션에서 kpa_organizations ↔ organizations 간 동기화 수행.

### 1.3 구조 판정

| 항목 | 판정 |
|------|------|
| 지부/분회 별도 테이블? | ❌ 단일 테이블 type 기반 (정상) |
| district_id 중복 FK? | ❌ 없음 (parent_id 계층만 존재) |
| 계층 무결성? | ✅ self-referencing FK로 보장 |
| **문제점** | organization_id FK 대상이 `organizations`(플랫폼)인데, 실질적 계층은 `kpa_organizations`에 있음 → 조회 시 JOIN 필요 |

---

## Phase 2. 회원 구조 (member/organization_member)

### 2.1 kpa_members — KPA 회원 마스터

```
kpa_members
├── id                UUID PRIMARY KEY
├── user_id           UUID NOT NULL → users.id (UNIQUE — 1:1 매핑)
├── organization_id   UUID NOT NULL → organizations.id
├── role              VARCHAR(50)   → 'member' | 'operator' | 'admin'
├── status            VARCHAR(50)   → 'pending' | 'active' | 'suspended' | 'withdrawn'
├── identity_status   VARCHAR(50)   → 'active' | 'suspended' | 'withdrawn'
├── membership_type   VARCHAR(50)   → 'pharmacist' | 'student'
├── license_number    VARCHAR(100)  (약사 면허번호)
├── pharmacy_name     VARCHAR(200)  (소속 약국명)
├── pharmacy_address  VARCHAR(300)
├── activity_type     VARCHAR(50)   (직능 분류: pharmacy_owner, hospital, etc.)
├── fee_category      VARCHAR(50)   (회비 분류: A1~D)
├── joined_at         DATE
├── created_at        TIMESTAMP
└── updated_at        TIMESTAMP
```

소스: `apps/api-server/src/routes/kpa/entities/kpa-member.entity.ts`

**특징:**
- `user_id` UNIQUE → 한 사용자 = 하나의 KPA 회원 레코드
- `role`은 **KPA 내부 역할** (비즈니스 레이어, RBAC가 아님)
- **이중 상태**: `status` (서비스 참여 상태) + `identity_status` (신원 상태, 징계 등)
- 직능 구조가 풍부: `activity_type` (10종), `fee_category` (7종)

### 2.2 kpa_member_services — 서비스별 가입 상태

```
kpa_member_services
├── id              UUID PRIMARY KEY
├── member_id       UUID → kpa_members.id
├── service_key     VARCHAR(50)    → 'kpa-a' | 'kpa-b' | 'kpa-c'
├── status          VARCHAR(50)    → 'pending' | 'approved' | 'rejected' | 'suspended'
├── approved_by     UUID (nullable)
├── approved_at     TIMESTAMP
├── rejection_reason TEXT
├── created_at      TIMESTAMP
└── updated_at      TIMESTAMP
UNIQUE(member_id, service_key)
```

소스: `apps/api-server/src/routes/kpa/entities/kpa-member-service.entity.ts`

**역할**: KPA 회원(kpa_members)은 하나이지만, 각 서비스(kpa-a/b/c)에 대한 가입/승인을 별도 관리.

### 2.3 organization_members — 플랫폼 교차 도메인

```
organization_members
├── user_id           UUID
├── organization_id   UUID → organizations.id
├── role              VARCHAR → 'owner' | 'member' | 'manager'
├── left_at           TIMESTAMP (nullable — soft delete)
```

**용도**: Store Owner 판정에 사용 (`store-owner.utils.ts`에서 `role = 'owner'` 체크)
**KPA-b 관계**: KPA 회원이 아닌 **매장 소유** 관계. KPA-b 고유 기능에서는 미사용.

### 2.4 회원 구조 판정

| 항목 | 판정 |
|------|------|
| 1:N 회원-조직? | ❌ 1:1 (user_id UNIQUE) — 정상 |
| 서비스별 분리? | ✅ kpa_member_services로 깔끔하게 분리 |
| status 이중화? | ⚠️ `status` + `identity_status` — 의도적 설계이나 동기화 필요 |
| organization_members 혼용? | ⚠️ Store 기능에서만 사용하나, KPA 네임스페이스에 공존 |

---

## Phase 3. 운영자 권한 구조 (role_assignments)

### 3.1 권한 계층 (3-Layer)

```
Layer 1: Platform RBAC (role_assignments / JWT)
├── kpa:admin           → 본부/전체 관리 (KPA-c)
├── kpa:operator        → 커뮤니티/콘텐츠 운영 (KPA-a)
├── kpa:district_admin  → 지부 관리
├── kpa:branch_admin    → 분회 관리
├── kpa:branch_operator → 분회 운영
└── kpa:member          → 일반 회원

Layer 2: Membership Role (kpa_members.role)
├── admin    → 분회 내 관리 권한
├── operator → 분회 내 운영 권한
└── member   → 일반 회원

Layer 3: Store Ownership (organization_members.role)
└── owner    → 매장 소유 (KPA-b 고유가 아닌 플랫폼 공통)
```

### 3.2 가드 패턴

#### verifyBranchAdmin() — KPA-b 핵심 가드

```typescript
// kpa.routes.ts:185-198
async function verifyBranchAdmin(ds, userId, branchId, userRoles) {
  // kpa:admin / kpa:district_admin → bypass
  if (userRoles.some(r => r === 'kpa:admin' || r === 'kpa:district_admin')) return true;
  // 분회 소속 admin 확인
  const [member] = await ds.query(
    `SELECT id FROM kpa_members WHERE user_id = $1 AND organization_id = $2
     AND status = 'active' AND role = 'admin' LIMIT 1`,
    [userId, branchId],
  );
  return !!member;
}
```

**분석:**
- ✅ 상위 역할(kpa:admin, kpa:district_admin) bypass — 정상
- ✅ branchId 복합 조건 (Boundary Policy 준수)
- ✅ status='active' 필터
- ⚠️ `kpa:branch_admin` 역할은 bypass에 포함되지 않음 — branch_admin이 다른 분회 접근 시 DB 체크 필수 (의도적)

#### Service Scope Guard — KPA 격리

```typescript
// packages/security-core/src/service-configs.ts
KPA_SCOPE_CONFIG = {
  platformBypass: false,  // ← 유일하게 false인 서비스
  blockedServicePrefixes: ['platform:', 'neture:', 'glycopharm:', 'cosmetics:', 'glucoseview:']
}
```

**KPA는 플랫폼 관리자도 우회 불가** — 완전한 서비스 격리.

#### createRequireStoreOwner() — Store 접근 가드

```typescript
// store-owner.utils.ts:15-20
KPA_STORE_ACCESS_ROLES = [
  'kpa:branch_admin', 'kpa:branch_operator',
  'kpa:admin', 'kpa:operator'
]
```

**문제점**: KPA 역할로 Store Owner를 우회 → KPA 운영자가 자동으로 매장 관리 권한 획득.
이는 **조직 설계상 의도된 동작**일 수 있으나, 권한 분리 원칙에 위배.

### 3.3 권한 구조 판정

| 항목 | 판정 |
|------|------|
| RBAC SSOT 준수? | ✅ role_assignments 단일 소스 |
| 분회 Boundary 필터? | ✅ verifyBranchAdmin에서 branchId 복합 조건 |
| 서비스 격리? | ✅ platformBypass: false (KPA 전용) |
| **Layer 혼합** | ⚠️ KPA 역할 → Store Owner 자동 bypass (Layer 1 → Layer 3 관통) |
| branch_operator 서버 필터? | ❌ 일부 API에서 서버 사이드 분회 범위 필터 부재 |

---

## Phase 4. 공동구매 구조 (groupbuy)

### 4.1 데이터 모델 — E-commerce Core 재사용

**전용 공동구매 테이블은 없다.** E-commerce Core 인프라를 서비스키로 분리:

```
organization_product_listings (상품 목록)
├── service_key = 'kpa-groupbuy'
├── organization_id → organizations.id
├── product_id → products.id
├── is_visible, display_order
└── ...

ecommerce_orders (주문)
├── order_type = 'RETAIL' (OrderType enum)
├── metadata = { serviceKey: 'kpa-groupbuy', ... }
└── ...
```

### 4.2 API 경로

| 경로 | 가드 | 용도 |
|------|------|------|
| `GET /groupbuy` | optionalAuth | 공동구매 목록 (공개) |
| `GET /groupbuy/:id` | optionalAuth | 상품 상세 (공개) |
| `POST /groupbuy/:id/participate` | authenticate | 참여 신청 |
| `GET /groupbuy/stats` | `requireKpaScope('kpa:operator')` | 운영 통계 |
| `GET /groupbuy/my-participations` | authenticate | 내 참여 이력 |
| `/groupbuy-admin/*` | `requireKpaScope('kpa:operator')` | 운영자 관리 |

### 4.3 주문 생성 패턴

```typescript
// kpa.routes.ts:2538 — "GlycoPharm createCoreOrder 패턴" 주석
// ecommerce_orders에 주문 생성, metadata.serviceKey = 'kpa-groupbuy'
// 주문번호: ORD-YYYYMMDD-XXXX (GlycoPharm 동일 포맷)
```

✅ E-COMMERCE-ORDER-CONTRACT 준수 (별도 주문 테이블 미생성)
✅ serviceKey 기반 격리 (kpa-groupbuy)

### 4.4 통계 서비스

`supplier-stats.service.ts`: 공급자 통계 연계, 캐시 10-30분, 운영자 접근 시에만 조회.

### 4.5 공동구매 구조 판정

| 항목 | 판정 |
|------|------|
| 전용 테이블? | ❌ 없음 (E-commerce Core 재사용 — 정상) |
| 주문 계약? | ✅ checkoutService 패턴 준수 |
| 서비스 격리? | ✅ metadata.serviceKey='kpa-groupbuy' |
| 운영자 가드? | ✅ requireKpaScope('kpa:operator') |
| **문제 없음** | 공동구매는 설계대로 구현됨 |

---

## Phase 5. Store/Signage/QR/POP 매장 기능 오염 확인

### 5.1 오염 현황 요약

| 영역 | 오염 수량 | 상세 |
|------|-----------|------|
| **백엔드 라우트** | 18개 마운트 | kpa.routes.ts:1813~1868 |
| **백엔드 컨트롤러** | 14개 파일 | kpa/controllers/store-*, pharmacy-* |
| **백엔드 엔티티** | 10개 파일 | kpa/entities/store-*, organization-* |
| **GlycoPharm 컨트롤러** | 3개 import | tablet, blog, layout |
| **프론트엔드 /store 라우트** | 40+ 페이지 | App.tsx:618~666 |
| **프론트엔드 리다이렉트** | 20+ 경로 | /pharmacy/* → /store/* |
| **합계** | **51+ 오염점** | |

### 5.2 백엔드 오염 상세

#### Store 컨트롤러 (14개, KPA 디렉토리에 위치)

```
kpa/controllers/
├── store-hub.controller.ts
├── store-channel-products.controller.ts
├── store-content.controller.ts
├── store-library.controller.ts
├── store-qr-landing.controller.ts
├── store-qr.controller.ts
├── store-pop.controller.ts
├── store-analytics.controller.ts
├── store-asset-control.controller.ts
├── store-playlist.controller.ts
├── store-events.controller.ts
├── pharmacy-products.controller.ts
├── pharmacy-store-config.controller.ts
├── pharmacy-request.controller.ts  ← 이것은 KPA-b 고유 (약국 서비스 신청)
```

> `pharmacy-request.controller.ts`는 Store가 아닌 KPA 고유 기능 (약국 서비스 신청 관리)

#### Store 엔티티 (10개, KPA 디렉토리에 위치)

```
kpa/entities/
├── kpa-store-asset-control.entity.ts
├── kpa-store-content.entity.ts
├── organization-channel.entity.ts
├── organization-product-application.entity.ts
├── organization-product-channel.entity.ts
├── organization-product-listing.entity.ts
├── organization-service-enrollment.entity.ts
├── organization-store.entity.ts
├── store-playlist.entity.ts
├── store-playlist-item.entity.ts
```

#### GlycoPharm 크로스 도메인 (3개 import)

```typescript
// kpa.routes.ts:90-92 — GlycoPharm 컨트롤러를 KPA에서 직접 import
import { createTabletController } from '../glycopharm/controllers/tablet.controller.js';
import { createBlogController } from '../glycopharm/controllers/blog.controller.js';
import { createLayoutController } from '../glycopharm/controllers/layout.controller.js';

// 마운트:
router.use('/stores', kpaTabletController);  // kpa.routes.ts:1868
```

**⛔ Cross-domain 의존 위반** (Boundary Policy F6, Guard Rule #5)

#### 라우트 마운트 (18개)

```typescript
// kpa.routes.ts:1813~1868
router.use('/pharmacy-requests', ...)          // KPA 고유
router.use('/store-hub', ...)                  // Store 오염
router.use('/store-hub/channel-products', ...) // Store 오염
router.use('/pharmacy/store', ...)             // Store 오염
router.use('/pharmacy/products', ...)          // Store 오염
router.use('/store-assets', ...)               // Store 오염
router.use('/store-contents', ...)             // Store 오염
router.use('/store-playlists', ...)            // Store 오염
router.use('/', storeLibrary)                  // Store 오염 (root에 마운트!)
router.use('/', storeQrLanding)                // Store 오염 (root에 마운트!)
router.use('/', storePop)                      // Store 오염 (root에 마운트!)
router.use('/', storeAnalytics)                // Store 오염 (root에 마운트!)
router.use('/stores', tabletController)        // GlycoPharm → Store 오염
router.use('/stores', blogController)          // GlycoPharm → Store 오염
router.use('/stores', layoutController)        // GlycoPharm → Store 오염
router.use('/store-template', ...)             // Store 오염
router.use('/groupbuy-admin', ...)             // KPA 고유
router.use('/groupbuy', ...)                   // KPA 고유
```

### 5.3 프론트엔드 오염 상세

#### /store 마스터 라우트 (App.tsx)

```tsx
// App.tsx:283~296 — StoreDashboardLayout + PharmacyGuard
<StoreDashboardLayout config={KPA_SOCIETY_STORE_CONFIG}>
  {/* 40+ 하위 페이지: StorefrontHomePage, StoreBlogPage, etc. */}
</StoreDashboardLayout>
```

#### /pharmacy → /store 리다이렉트 (20+ 경로)

```
/pharmacy/dashboard      → /store
/pharmacy/store          → /store
/pharmacy/store/layout   → /store/settings/layout
/pharmacy/store/template → /store/settings/template
/pharmacy/store/blog     → /store/content/blog
/pharmacy/store/tablet   → /store/channels/tablet
/pharmacy/assets         → /store/content
/pharmacy/settings       → /store/settings
/pharmacy/sales/b2b      → /store/products
... 등 20+ 경로
```

### 5.4 KPA-b 고유 라우트 (오염 아닌 정상 영역)

#### 프론트엔드 (CLEAN)

| 라우트 파일 | Store 오염 | 비고 |
|-------------|:----------:|------|
| `BranchAdminRoutes.tsx` | ❌ | 완전 클린 |
| `BranchOperatorRoutes.tsx` | ❌ | 완전 클린 |
| `AdminRoutes.tsx` | ❌ | 완전 클린 (주석만 signage 언급) |
| `OperatorRoutes.tsx` | ⚠️ | signage/content 1건, pharmacy-requests 1건 |

> **OperatorRoutes의 `pharmacy-requests`는 KPA 고유 기능** (약국 서비스 신청 관리이지 Store가 아님)
> **OperatorRoutes의 `signage/content`는 콘텐츠 허브** — Store가 아닌 CMS 영역

#### 백엔드 KPA-b 고유 컨트롤러 (10개)

```
kpa/controllers/
├── organization.controller.ts        → 조직 CRUD
├── member.controller.ts              → 회원 관리
├── application.controller.ts         → 가입 신청
├── steward.controller.ts             → 임원/감사 관리
├── groupbuy-operator.controller.ts   → 공동구매 운영
├── branch-admin-dashboard.controller.ts  → 분회 대시보드
├── branch-public.controller.ts       → 분회 공개 정보
├── join-inquiry.controller.ts        → 가입 문의
├── organization-join-request.controller.ts → 조직 가입 요청
├── operator-summary.controller.ts    → 운영 요약
```

### 5.5 오염 판정

| 항목 | 심각도 | 설명 |
|------|--------|------|
| Store 컨트롤러/엔티티 위치 | **SEVERE** | 14개 컨트롤러 + 10개 엔티티가 KPA 디렉토리에 존재 |
| GlycoPharm Cross-import | **CRITICAL** | Boundary Policy 위반 — 다른 도메인 컨트롤러 직접 import |
| Root 마운트 (`router.use('/')`) | **HIGH** | 4개 Store 컨트롤러가 KPA 루트에 마운트 → 경로 충돌 가능 |
| /store 프론트엔드 | **SEVERE** | 40+ 페이지가 KPA App에 직접 마운트 |
| KPA 역할 → Store bypass | **HIGH** | KPA_STORE_ACCESS_ROLES로 Layer 관통 |
| KPA-b 고유 라우트 | ✅ CLEAN | BranchAdmin/BranchOperator/Admin 라우트는 오염 없음 |

---

## Phase 6. 종합 판정 및 정비 항목

### KPA-b 실제 구조

```
┌─────────────────────────────────────────────────────────────┐
│                    KPA-b (지부/분회 서비스)                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  조직 계층     kpa_organizations                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ association (지부)                                    │    │
│  │   └── branch (분회) [parent_id FK]                   │    │
│  │         └── group (기타)                              │    │
│  └─────────────────────────────────────────────────────┘    │
│       ↕ 동기화                                              │
│  organizations (platform-core, Frozen)                      │
│                                                             │
│  회원          kpa_members (1:1 user)                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ organization_id → organizations.id                   │    │
│  │ role: member | operator | admin (비즈니스 레이어)      │    │
│  │ status + identity_status (이중 상태)                  │    │
│  │ membership_type: pharmacist | student                │    │
│  │ activity_type + fee_category (직능 분류)              │    │
│  └─────────────────────────────────────────────────────┘    │
│       ↕                                                     │
│  서비스 가입    kpa_member_services                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ service_key: 'kpa-a' | 'kpa-b' | 'kpa-c'           │    │
│  │ UNIQUE(member_id, service_key)                      │    │
│  │ status: pending | approved | rejected | suspended   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  공동구매      E-commerce Core 재사용                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ organization_product_listings (service_key=groupbuy) │    │
│  │ ecommerce_orders (metadata.serviceKey=kpa-groupbuy) │    │
│  │ ✅ 전용 테이블 없음, 계약 준수                        │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  권한 (3-Layer)                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ L1: role_assignments (kpa:branch_admin, etc.)       │    │
│  │ L2: kpa_members.role (admin/operator/member)        │    │
│  │ L3: organization_members.role (owner) ← Store용     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ⛔ Store 오염: 51+ 오염점                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 14 store 컨트롤러 + 10 store 엔티티 + 3 glycopharm  │    │
│  │ 40+ /store 프론트엔드 페이지                          │    │
│  │ KPA_STORE_ACCESS_ROLES Layer 관통                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 문제점 목록

| # | 심각도 | 문제 | 영향 | 근거 |
|---|--------|------|------|------|
| B-1 | **CRITICAL** | GlycoPharm 컨트롤러 KPA에서 직접 import | Boundary Policy F6 위반, Cross-domain 의존 | kpa.routes.ts:90-92 |
| B-2 | **SEVERE** | Store 컨트롤러/엔티티 14+10개가 KPA 디렉토리에 존재 | 도메인 경계 불명확, 유지보수 혼란 | kpa/controllers/store-*, kpa/entities/store-* |
| B-3 | **SEVERE** | /store 프론트엔드 40+ 페이지가 KPA App에 마운트 | KPA-b와 Store 책임 혼합 | App.tsx:283-296, 618-666 |
| B-4 | **HIGH** | KPA_STORE_ACCESS_ROLES로 Layer 1→3 관통 | KPA 운영자가 자동 매장 관리 권한 | store-owner.utils.ts:15-20 |
| B-5 | **HIGH** | Store 컨트롤러 4개가 KPA 루트에 마운트 (`router.use('/')`) | 경로 충돌 가능, 라우팅 의도 불명확 | kpa.routes.ts:1847-1856 |
| B-6 | **MEDIUM** | `kpa_members.organization_id` → `organizations` (not `kpa_organizations`) | 계층 조회 시 추가 JOIN 필요, 간접 참조 | kpa-member.entity.ts:56 |
| B-7 | **MEDIUM** | branch_operator 서버 사이드 분회 범위 필터 부재 | 분회 경계 넘는 조회 가능성 | Phase 3 가드 분석 |

### 정비 필요 항목 (WO 후보)

| 우선순위 | WO 후보 | 범위 | 예상 영향도 |
|----------|---------|------|------------|
| **P0** | GlycoPharm Cross-import 제거 (B-1) | kpa.routes.ts 3줄 import + 마운트 제거, GlycoPharm 독립 라우트로 이전 | LOW |
| **P1** | Store 컨트롤러/엔티티 분리 (B-2) | 14 컨트롤러 + 10 엔티티를 `routes/store/` 또는 `routes/o4o-store/`로 이전 | HIGH — 모든 import 경로 변경 |
| **P1** | /store 프론트엔드 분리 (B-3) | App.tsx에서 /store 라우트를 독립 컴포넌트/모듈로 분리 | HIGH — 프론트엔드 구조 변경 |
| **P1** | KPA Store Access Roles 분리 (B-4) | store-owner.utils.ts에서 KPA 역할 bypass 제거, 독립 가드 체인으로 변경 | MEDIUM |
| **P1** | Root 마운트 정리 (B-5) | `router.use('/')` → 명시적 prefix 부여 | LOW |
| **P2** | organization_id FK 대상 정비 (B-6) | kpa_members.organization_id → kpa_organizations.id로 변경 검토 | HIGH — 마이그레이션 필요 |
| **P2** | branch_operator 서버 필터 강화 (B-7) | 분회 범위 필터 추가 | MEDIUM |

### 핵심 결론

1. **KPA-b 고유 구조는 건전하다.** 조직 계층(association→branch→group), 회원 모델(kpa_members + kpa_member_services), 공동구매(E-commerce Core 재사용), 가드(verifyBranchAdmin + Service Scope Guard) 모두 설계 의도대로 구현됨.

2. **문제는 Store 오염이다.** KPA-b의 51+ Store 오염점은 초기 "약국 = KPA 분회" 가정에서 비롯된 역사적 잔재. Store는 독립 도메인으로 분리해야 한다.

3. **GlycoPharm Cross-import은 즉시 수정 가능.** Boundary Policy 위반이며, 3줄 import 제거 + GlycoPharm 독립 라우트 이전으로 해결 가능 (P0).

4. **"KPA-b − 지부 구조 = KPA-c" 가설 검증 필요.** KPA-c를 별도 IR로 감사하여 KPA-b와의 관계를 정확히 규명해야 한다 (→ IR-KPA-C-SERVICE-AUDIT-V1).

---

## 부록: 용어 정리

| 코드 용어 | 실제 의미 |
|-----------|-----------|
| `association` | 지부 (시/도 약사회) |
| `branch` | 분회 |
| `group` | 기타 그룹 |
| `kpa_members.role` | KPA 내부 비즈니스 역할 (RBAC 아님) |
| `kpa:branch_admin` | role_assignments 기반 RBAC 역할 |
| `organization_members.role='owner'` | 매장 소유 (플랫폼 공통) |
| `KPA_STORE_ACCESS_ROLES` | KPA 역할로 Store Owner를 bypass하는 배열 |

---

*IR-KPA-B-SERVICE-AUDIT-V1 완료*
*다음 단계: IR-KPA-C-SERVICE-AUDIT-V1 (KPA-c 본부/지부 관리 감사)*

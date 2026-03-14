# IR-O4O-OPERATOR-DASHBOARD-ARCHITECTURE-AUDIT-V1

> O4O 서비스 운영자 대시보드 구조 조사 보고서
> 조사일: 2026-03-14

---

## 1. 조사 요약

### 판정

| 영역 | 판정 |
|------|------|
| **Operator HUB** | 3개 서비스 모두 구현 완료. **5-Block 통합 대시보드** 패턴 공유 |
| **Store HUB** | Common Store Core 구조 확인. `@o4o/store-ui-core` 기반 통합 |
| **Store Core 구조** | **Common Store Core** (서비스별 분리 아님) |
| **커뮤니티 구조** | forum-core 공유 + 서비스별 Extension 패턴 |

### 핵심 수치

| 항목 | KPA Society | GlycoPharm | K-Cosmetics |
|------|:-----------:|:----------:|:-----------:|
| Operator 페이지 수 | 18 | 37 | 23 |
| Store 메뉴 항목 | 9 (커스텀) | 8 (전체) | 7 |
| 커뮤니티 기능 | Forum + LMS + News + Events | Forum + Care + Education | Forum + Hub |

---

## 2. OPERATOR HUB ROUTES

### 2.1 서비스별 Operator Route 구조

#### KPA Society (`/operator`)

```
/operator                  → KpaOperatorDashboard (5-Block)
/operator/members          → MemberManagementPage
/operator/forums           → ForumManagementPage
/operator/forum-analytics  → ForumAnalyticsDashboard
/operator/content          → ContentManagementPage
/operator/pharmacy-requests → PharmacyRequestManagementPage
/operator/product-applications → ProductApplicationManagementPage
/operator/operators        → OperatorManagementPage (Admin only)
/operator/audit-log        → AuditLogPage
/operator/ai-report        → OperatorAiReportPage
/operator/legal            → LegalManagementPage
/operator/signage/*        → HqMedia, Playlists, Templates (6 pages)
```

**Branch Operator 별도 경로:**
```
/branch-services/:branchId/operator/* → BranchOperatorDashboard
```

- **Layout**: `BranchOperatorLayout` (7개 메뉴: 대시보드, 공지사항, 게시판, 자료실, 포럼 관리, 콘텐츠 허브, 운영자 관리)
- **Guard**: `BranchOperatorAuthGuard`, `RoleGuard`
- **API**: `services/web-kpa-society/src/api/operator.ts`

#### GlycoPharm (`/admin` → Operator)

```
/admin                     → GlycoPharmOperatorDashboard (5-Block)
/admin/users               → UsersPage
/admin/user/:id            → UserDetailPage
/admin/stores              → StoresPage
/admin/stores/:id          → StoreDetailPage
/admin/store-approvals     → StoreApprovalsPage
/admin/store-approvals/:id → StoreApprovalDetailPage
/admin/store-template      → StoreTemplateManagerPage (3 tabs)
/admin/products            → ProductsPage
/admin/products/:id        → ProductDetailPage
/admin/orders              → OrdersPage
/admin/inventory           → InventoryPage
/admin/settlements         → SettlementsPage
/admin/invoices            → InvoicesPage
/admin/billing-preview     → BillingPreviewPage
/admin/applications        → ApplicationsPage
/admin/application/:id     → ApplicationDetailPage
/admin/forum-requests      → ForumRequestsPage
/admin/forum-management    → OperatorForumManagementPage
/admin/marketing           → MarketingPage
/admin/reports             → ReportsPage
/admin/analytics           → AnalyticsPage
/admin/ai-report           → AiReportPage
/admin/support             → SupportPage
/admin/settings            → SettingsPage
/admin/market-trial        → OperatorTrialSelectorPage
/admin/signage/*           → HqMedia, Playlists, Templates (6 pages)
```

- **Guard**: `ProtectedRoute` with role checks
- **Config**: `operatorConfig.ts` (GlycoPharm-specific signals: store, forum, content)
- **특이사항**: `/operator` → `/admin` redirect (legacy support)

#### K-Cosmetics (`/operator`)

```
/operator                  → KCosmeticsOperatorDashboard (5-Block)
/operator/users            → UsersPage
/operator/users/:id        → UserDetailPage
/operator/stores           → StoresPage
/operator/stores/:id       → StoreDetailPage
/operator/store-cockpit    → StoreCockpitPage
/operator/products         → ProductsPage
/operator/products/:id     → ProductDetailPage
/operator/orders           → OrdersPage
/operator/inventory        → InventoryPage
/operator/settlements      → SettlementsPage
/operator/applications     → ApplicationsPage
/operator/marketing        → MarketingPage
/operator/analytics        → AnalyticsPage
/operator/ai-report        → AiReportPage
/operator/support          → SupportPage
/operator/settings         → SettingsPage
/operator/signage/*        → HqMedia, Playlists, Templates (6 pages)
```

- **Guard**: `ProtectedRoute` with role checks
- **Config**: `operatorConfig.ts` (K-Cosmetics signals: stores, orders, users)
- **API**: `services/web-k-cosmetics/src/services/operatorApi.ts`

### 2.2 Admin Dashboard (Platform Level)

```
/operators                 → OperatorsPage (Central operator CRUD)
/admin/operator/my-policy  → MyPolicyPage (Operator scope & policy)
/admin/marketing/operator/console → Operator Content & Engagement Console
```

- **Guard**: `OperatorFeatureGuard`, `OperatorScopeBadge`
- **Hook**: `useOperatorPolicy`
- **Dashboard Card**: `OperatorCard` (unified dashboard)

---

## 3. OPERATOR DASHBOARD 구성

### 3.1 공통 아키텍처: 5-Block 통합 대시보드

모든 서비스가 `@o4o/operator-ux-core` 기반 **5-Block 레이아웃** 사용:

| Block | 역할 | 설명 |
|-------|------|------|
| **1. KPI Grid** | 핵심 지표 | Action-required 우선 표시 |
| **2. AI Summary** | 상태 요약 | Status-based AI insights |
| **3. Action Queue** | 긴급 항목 | 즉시 처리 필요 항목 |
| **4. Activity Log** | 활동 이력 | 최근 운영 활동 |
| **5. Quick Actions** | 바로가기 | 주요 페이지 빠른 이동 |

### 3.2 서비스별 KPI 구성

| KPI | KPA | GlycoPharm | K-Cosmetics |
|-----|:---:|:----------:|:-----------:|
| 회원 수 | ✅ | ✅ | ✅ |
| 매장 수 | ✅ | ✅ | ✅ |
| 콘텐츠 수 | ✅ | ✅ | - |
| 주문 수 | - | ✅ | ✅ |
| 포럼 활동 | ✅ | ✅ | - |
| 약국 서비스 | ✅ | ✅ | - |
| 상품 수 | - | ✅ | ✅ |
| AI 요약 | ✅ | ✅ | ✅ |

---

## 4. OPERATOR 관리 기능

### 4.1 서비스별 관리 기능 비교

| 기능 | KPA | GlycoPharm | K-Cosmetics |
|------|:---:|:----------:|:-----------:|
| **회원 관리** | ✅ MemberManagement | ✅ UsersPage | ✅ UsersPage |
| **회원 승인** | ✅ PharmacyRequest | ✅ StoreApprovals | ✅ Applications |
| **매장 관리** | - (Branch 구조) | ✅ StoresPage | ✅ StoresPage |
| **매장 승인** | - | ✅ StoreApprovalsPage | - |
| **상품 관리** | ✅ ProductApplication | ✅ ProductsPage | ✅ ProductsPage |
| **주문 관리** | - | ✅ OrdersPage | ✅ OrdersPage |
| **포럼 관리** | ✅ ForumManagement | ✅ ForumRequests | - |
| **콘텐츠 관리** | ✅ ContentManagement | - | - |
| **사이니지** | ✅ Signage (6 pages) | ✅ Signage (6 pages) | ✅ Signage (6 pages) |
| **정산** | - | ✅ Settlements | ✅ Settlements |
| **재고** | - | ✅ InventoryPage | ✅ InventoryPage |
| **마케팅** | - | ✅ MarketingPage | ✅ MarketingPage |
| **분석** | ✅ ForumAnalytics | ✅ AnalyticsPage | ✅ AnalyticsPage |
| **AI 리포트** | ✅ OperatorAiReport | ✅ AiReportPage | ✅ AiReportPage |
| **감사 로그** | ✅ AuditLogPage | - | - |
| **법률 관리** | ✅ LegalManagement | - | - |
| **운영자 관리** | ✅ OperatorManagement | - | - |
| **매장 템플릿** | - | ✅ StoreTemplate (3 tabs) | - |
| **Store Cockpit** | - | - | ✅ StoreCockpitPage |
| **지원** | - | ✅ SupportPage | ✅ SupportPage |
| **설정** | - | ✅ SettingsPage | ✅ SettingsPage |
| **Market Trial** | - | ✅ TrialSelector | - |

---

## 5. STORE HUB ROUTES

### 5.1 서비스별 Store Owner Dashboard

#### KPA Society (`/store`)

```
/store                     → StoreDashboardLayout (KPA_SOCIETY_STORE_CONFIG)
/store/dashboard           → Dashboard
/store/operation/library   → Library/Resources
/store/marketing/qr        → QR Management
/store/marketing/pop       → POP Materials
/store/marketing/signage   → Signage Management
/store/commerce/products   → Product Management
/store/commerce/orders     → Order Management
/store/analytics/marketing → Marketing Analytics
```

**Consumer Storefront:**
```
/store/:slug               → StorefrontHomePage
/store/:slug/products/:id  → StorefrontProductDetailPage
/store/:slug/checkout      → CheckoutPage
/store/:slug/payment/*     → Payment Success/Fail
/store/:slug/blog          → StoreBlogPage
/store/:slug/blog/:postSlug → Blog Post Detail
```

#### GlycoPharm (`/store`)

```
/store                     → StoreEntryPage
/store/hub                 → StoreOverviewPage
/store/assets              → StoreAssetsPage
/store/channels            → StoreChannelsPage
/store/billing             → StoreBillingPage
/store/settings            → Settings
```

**Consumer Storefront (Pharmacy):**
```
/store/:pharmacyId         → StoreFront
/store/:pharmacyId/products → StoreProducts
/store/:pharmacyId/products/:id → StoreProductDetail
/store/:pharmacyId/cart    → StoreCart
/store/:pharmacyId/kiosk   → KioskLayout
/store/:pharmacyId/tablet  → TabletLayout
```

#### K-Cosmetics (`/store`)

```
/store                     → StoreDashboardLayout (COSMETICS_STORE_CONFIG)
/store/products            → Product Management
/store/channels            → StoreChannelsPage
/store/orders              → Order Management
/store/billing             → Billing/Invoice
/store/content             → Content Management
/store/market-trial        → MarketTrialListPage
/store/settings            → Settings
```

#### GlucoseView (`/store`)

```
/store                     → StoreDashboardLayout (GLUCOSEVIEW_STORE_CONFIG)
/store/settings            → Settings
```

**(제한된 기능: Dashboard + Settings만)**

---

## 6. STORE CAPABILITIES

### 6.1 Capability 매트릭스

| Capability Key | 설명 | KPA | GlycoPharm | K-Cosmetics | GlucoseView |
|---------------|------|:---:|:----------:|:-----------:|:-----------:|
| `B2C_COMMERCE` | E-commerce 스토어 | ✅ | ✅ | ✅ | - |
| `TABLET` | 태블릿 디스플레이 | - | ✅ | - | - |
| `KIOSK` | POS 키오스크 | - | ✅ | - | - |
| `QR_MARKETING` | QR 코드 마케팅 | ✅ | - | - | - |
| `POP_PRINT` | POP 인쇄물 | ✅ | - | - | - |
| `SIGNAGE` | 디지털 사이니지 | ✅ | ✅ | - | - |
| `BLOG` | 블로그/콘텐츠 | ✅ | ✅ | ✅ | - |
| `LIBRARY` | 자산 라이브러리 | ✅ | ✅ | ✅ | - |
| `AI_CONTENT` | AI 콘텐츠 | - | - | - | - |
| `LOCAL_PRODUCTS` | 지역 상품 | - | ✅ | - | - |

**Default Capabilities** (매장 생성 시 자동 활성화):
- `B2C_COMMERCE`, `QR_MARKETING`, `POP_PRINT`

### 6.2 Capability → Channel 매핑

```
B2C_COMMERCE → B2C channel
TABLET       → TABLET channel
KIOSK        → KIOSK channel
SIGNAGE      → SIGNAGE channel
나머지        → null (채널 매핑 없음)
```

---

## 7. STORE PRODUCT FLOW

### 7.1 상품 연결 구조

```
Neture Product Master
        ↓
Supplier Product Offer
        ↓
organization_product_listings (service_key, master_id, offer_id, price)
        ↓
organization_product_channels (channel_type: B2C, KIOSK, TABLET, SIGNAGE)
        ↓
Store (organizations table)
        ↓
Customer
```

### 7.2 관련 Entity

| Entity | Table | 역할 |
|--------|-------|------|
| `OrganizationStore` | `organizations` | Store = Organization (통합 구조) |
| `OrganizationProductListing` | `organization_product_listings` | 매장-상품 연결 |
| `OrganizationProductChannel` | `organization_product_channels` | 채널별 상품 배포 |
| `StoreCapability` | `store_capabilities` | 매장 기능 플래그 |
| `OrganizationChannel` | `organization_channels` | 채널 상태 관리 |

---

## 8. STORE CORE STRUCTURE

### 8.1 판정: **Common Store Core**

서비스별 분리 구현이 아닌, **3개 공통 패키지** 기반:

| Package | Layer | 역할 |
|---------|-------|------|
| `@o4o/store-core` | Backend | KPI 엔진 (StoreSummaryEngine, StoreInsightsEngine) |
| `@o4o/store-ui-core` | Frontend | 통합 대시보드 레이아웃 + 메뉴 구성 |
| `@o4o/store-asset-policy-core` | Frontend | 스냅샷 정책 해석 + 자산 관리 UI |

### 8.2 의존 방향 (Frozen — F3)

```
┌──────────────────────────────────────────────┐
│     web-* Services (thin wrappers)           │
│  (데이터 fetch + API 호출만, 로직 없음)        │
└───────┬──────────────┬──────────────┬────────┘
        │              │              │
        ▼              ▼              ▼
┌──────────────┐ ┌───────────────┐ ┌──────────┐
│ store-ui-    │ │ store-asset-  │ │ hub-core │
│ core         │ │ policy-core   │ │ (FROZEN) │
└──────────────┘ └───────────────┘ └──────────┘
        │              │
        ▼              ▼
   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
   Frontend / Backend boundary
   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
        │              │
        ▼              ▼
┌──────────────┐ ┌───────────────┐
│ store-core   │ │ asset-copy-   │
│ (KPI Engine) │ │ core (FROZEN) │
└──────────────┘ └───────────────┘
```

### 8.3 서비스별 Store Config

```typescript
// KPA Society — 커스텀 섹션 기반
KPA_SOCIETY_STORE_CONFIG = {
  basePath: '/store',
  menuSections: [
    { Default: [Dashboard] },
    { Operation: [Library] },
    { Marketing: [QR, POP, Signage] },
    { Commerce: [Products, Orders] },
    { Analytics: [Marketing Analytics] }
  ]
}

// GlycoPharm — 전체 8개 메뉴
GLYCOPHARM_STORE_CONFIG = {
  basePath: '/store',
  enabledMenus: ['dashboard', 'products', 'channels', 'orders',
                 'content', 'signage', 'billing', 'settings']
}

// K-Cosmetics — 7개 메뉴
COSMETICS_STORE_CONFIG = {
  basePath: '/store',
  enabledMenus: ['dashboard', 'products', 'channels', 'orders',
                 'billing', 'content', 'settings']
}

// GlucoseView — 최소 2개 메뉴
GLUCOSEVIEW_STORE_CONFIG = {
  basePath: '/store',
  enabledMenus: ['dashboard', 'settings']
}
```

---

## 9. 서비스 커뮤니티 구조

### 9.1 커뮤니티 기능 비교

| 기능 | KPA Society | GlycoPharm | K-Cosmetics |
|------|:-----------:|:----------:|:-----------:|
| **Forum** | ✅ forum-core + forum-yaksa | ✅ forum-core + forum-pharmacy | ✅ forum-core + forum-cosmetics |
| **LMS/강좌** | ✅ lms-core + lms-yaksa (학점 관리) | ✅ EducationPage | - |
| **News** | ✅ NewsListPage, GalleryPage | - | - |
| **Blog** | ✅ Store Blog | ✅ Store Blog | - |
| **Events** | ✅ EventsHomePage | - | - |
| **Participation** | ✅ Surveys/Quizzes | - | - |
| **Care/Health** | - | ✅ CareDashboard (AI Chat) | - |
| **Content Hub** | ✅ ContentManagement | - | ✅ Hub |

### 9.2 Forum 아키텍처

**공통 Core:**
- `packages/forum-core/` — ForumPost, ForumComment, ForumCategory, ForumTag 등

**서비스별 Extension:**

| Extension | Package | 특화 기능 |
|-----------|---------|---------|
| KPA Yaksa Community | `packages/forum-yaksa/` | 커뮤니티 멤버십, 승인 워크플로우 |
| Pharmacy Forum | `packages/forum-pharmacy/` | 약사 배지, 책임 고지 |
| Cosmetics Forum | `packages/forum-cosmetics/` | 상품 연결 포럼 |
| Organization Forum | `packages/organization-forum/` | 조직 레벨 포럼 |

### 9.3 LMS 아키텍처

**공통 Core:**
- `packages/lms-core/` — InstructorApplication, EngagementLog

**서비스별 Extension:**

| Extension | Package | 특화 기능 |
|-----------|---------|---------|
| Yaksa LMS | `packages/lms-yaksa/` | 학점, 라이선스, 필수 강좌 정책 |
| Marketing LMS | `packages/lms-marketing/` | 상품 콘텐츠, 퀴즈, 설문 |
| Organization LMS | `packages/organization-lms/` | 조직별 수강 등록 |

---

## 10. Backend API 구조

### 10.1 Operator API Endpoints

```
# Operator Console
GET    /api/v1/operator/stores          → 매장 목록 (pagination, search)
GET    /api/v1/operator/stores/:id      → 매장 상세
GET    /api/v1/operator/stores/:id/channels    → 채널 상태
GET    /api/v1/operator/stores/:id/products    → 매장 상품
GET    /api/v1/operator/stores/:id/capabilities → 기능 조회
PUT    /api/v1/operator/stores/:id/capabilities → 기능 업데이트

# Product Console
GET    /api/v1/operator/products        → 상품 목록
GET    /api/v1/operator/products/duplicates → 중복 바코드 감지
GET    /api/v1/operator/products/:id    → 상품 상세
GET    /api/v1/operator/products/:id/suppliers → 공급자 정보

# Membership Console
GET    /api/v1/operator/members         → 회원 목록
GET    /api/v1/operator/members/:id     → 회원 상세
PATCH  /api/v1/operator/members/:id/approve → 승인
PATCH  /api/v1/operator/members/:id/reject  → 거절
```

**인증**: `authenticate` + `requireAnyRole(ADMIN, SUPER_ADMIN, OPERATOR, MANAGER)`

### 10.2 Public Store API Endpoints

```
# Unified Store Public (slug 기반)
GET    /api/v1/stores/:slug             → 스토어 홈
GET    /api/v1/stores/:slug/products    → 상품 목록
GET    /api/v1/stores/:slug/products/featured → 추천 상품
GET    /api/v1/stores/:slug/products/:id → 상품 상세
GET    /api/v1/stores/:slug/categories  → 카테고리
GET    /api/v1/stores/:slug/layout      → 레이아웃
GET    /api/v1/stores/:slug/blog        → 블로그
GET    /api/v1/stores/:slug/blog/:slug  → 블로그 포스트
GET    /api/v1/stores/:slug/template    → 템플릿
GET    /api/v1/stores/:slug/storefront-config → 스토어프론트 설정
GET    /api/v1/stores/:slug/hero        → 히어로 섹션
GET    /api/v1/stores/:slug/tablet/products → 태블릿 상품
POST   /api/v1/stores/:slug/tablet/requests → 태블릿 요청
```

### 10.3 Store Hub API

```
GET    /store-hub/overview              → 통합 자산 요약 (products, contents, signage)
```

### 10.4 O4O Store Controllers (15개)

| Controller | 역할 |
|-----------|------|
| `store-hub.controller.ts` | Hub 집계 |
| `store-channel-products.controller.ts` | 채널별 상품 |
| `store-content.controller.ts` | 매장 콘텐츠 |
| `store-playlist.controller.ts` | 콘텐츠 플레이리스트 |
| `store-library.controller.ts` | 자산 라이브러리 |
| `store-asset-control.controller.ts` | 자산 가시성 제어 |
| `store-analytics.controller.ts` | 매장 분석 |
| `store-qr-landing.controller.ts` | QR 랜딩 |
| `store-pop.controller.ts` | POP 콘텐츠 |
| `pharmacy-store-config.controller.ts` | 약국 설정 |
| `kpa-store-template.controller.ts` | KPA 템플릿 |
| `tablet.controller.ts` | 태블릿 디스플레이 |
| `layout.controller.ts` | 레이아웃 관리 |
| `blog.controller.ts` | 블로그 관리 |
| `pharmacy-products.controller.ts` | 약국 상품 |

---

## 11. Operator Role 구조

### 11.1 서비스별 Role

```typescript
// Platform
platform:super_admin     — 플랫폼 슈퍼 관리자 (전체 서비스)

// KPA Society
kpa:admin               — KPA 커뮤니티 관리자
kpa:operator             — KPA 커뮤니티 운영자
kpa-b:district-admin     — KPA 데모 (deprecated)
kpa-c:admin              — KPA Branch 관리자
kpa-c:operator           — KPA Branch 운영자

// GlycoPharm
glycopharm:admin         — GlycoPharm 관리자
glycopharm:operator      — GlycoPharm 운영자

// K-Cosmetics
cosmetics:admin          — K-Cosmetics 관리자
cosmetics:operator       — K-Cosmetics 운영자

// Others
neture:admin / operator  — Neture
glucoseview:admin / operator — GlucoseView
```

---

## 12. 주요 발견 사항

### 12.1 공통 패턴 (잘 되어 있는 것)

1. **5-Block 대시보드 표준**: 3개 서비스 모두 동일 아키텍처
2. **Common Store Core**: 3개 패키지 기반 통합 구조 (Frozen F3)
3. **Signage Console 표준화**: 3개 서비스 동일 구조 (6 pages each)
4. **AI Report 통합**: 3개 서비스 모두 AI Report 페이지 보유
5. **Capability 시스템**: 10개 capability key 기반 기능 제어

### 12.2 차이점 및 개선 필요 사항

| 항목 | 현상 | 개선 방향 |
|------|------|---------|
| **Route prefix** | KPA `/operator`, GlycoPharm `/admin`, K-Cos `/operator` | 통일 필요 (`/operator` 표준) |
| **Operator Layout** | KPA: BranchOperatorLayout, 나머지: App.tsx lazy | 공통 OperatorLayout 추출 |
| **Config 패턴** | GlycoPharm/K-Cos: operatorConfig.ts, KPA: 없음 | 공통 operatorConfig 패턴 |
| **기능 격차** | GlycoPharm 37페이지 vs KPA 18페이지 | 기능 표준 정의 필요 |
| **Guard 패턴** | 3개 서비스 각각 다른 Guard 사용 | 공통 OperatorGuard 추출 |
| **Store Config** | KPA: menuSections (커스텀), 나머지: enabledMenus | 통일 필요 |

### 12.3 Frozen Baseline 영향

| Baseline | 영향 범위 |
|----------|---------|
| **F1 Operator OS** | security-core, hub-core, ai-core, operator-ux-core 구조 변경 불가 |
| **F3 Store Layer** | store-ui-core, store-core, store-asset-policy-core 의존 방향 고정 |
| **F9 RBAC SSOT** | role_assignments 단일 소스, write-path 통일 |

---

## 13. 다음 단계 제안

### WO-O4O-OPERATOR-DASHBOARD-STANDARD-V1 설계를 위한 핵심 결정 사항

1. **Operator Route 표준**: `/operator` 통일 (GlycoPharm `/admin` → `/operator` 마이그레이션)
2. **공통 Operator Layout**: `@o4o/operator-ux-core` 기반 OperatorLayout 추출
3. **필수 기능 정의**: 모든 서비스 최소 제공 기능 세트 결정
4. **선택 기능 정의**: 서비스별 추가 기능 (Capability 시스템과 연동)
5. **operatorConfig 표준**: 서비스별 KPI/Signal 구성 표준화

### 적용 순서

```
Phase 1: Standard 문서 작성 (이 보고서 기반)
Phase 2: KPA-a 적용 (가장 작은 범위)
Phase 3: GlycoPharm 적용 (가장 큰 범위)
Phase 4: K-Cosmetics 적용
Phase 5: KPA-b, KPA-c 적용
```

---

## 14. 파일 경로 참조

### Operator Dashboard Pages

```
# KPA Society
services/web-kpa-society/src/pages/operator/KpaOperatorDashboard.tsx
services/web-kpa-society/src/routes/OperatorRoutes.tsx
services/web-kpa-society/src/routes/BranchOperatorRoutes.tsx
services/web-kpa-society/src/api/operator.ts

# GlycoPharm
services/web-glycopharm/src/pages/operator/GlycoPharmOperatorDashboard.tsx
services/web-glycopharm/src/pages/operator/operatorConfig.ts

# K-Cosmetics
services/web-k-cosmetics/src/pages/operator/KCosmeticsOperatorDashboard.tsx
services/web-k-cosmetics/src/pages/operator/operatorConfig.ts
services/web-k-cosmetics/src/services/operatorApi.ts

# Admin Dashboard
apps/admin-dashboard/src/pages/operators/OperatorsPage.tsx
apps/admin-dashboard/src/pages/operator/MyPolicyPage.tsx
apps/admin-dashboard/src/components/guards/OperatorFeatureGuard.tsx
```

### Store Core Packages

```
packages/store-core/src/summary.engine.ts
packages/store-core/src/insights.engine.ts
packages/store-ui-core/src/layout/StoreDashboardLayout.tsx
packages/store-ui-core/src/config/storeMenuConfig.ts
packages/store-asset-policy-core/src/components/StoreAssetsPanel.tsx
```

### Backend API

```
apps/api-server/src/routes/operator/stores.routes.ts
apps/api-server/src/routes/operator/products.routes.ts
apps/api-server/src/routes/operator/membership.routes.ts
apps/api-server/src/routes/platform/unified-store-public.routes.ts
apps/api-server/src/routes/platform/store-network.routes.ts
apps/api-server/src/modules/store-core/entities/
apps/api-server/src/modules/store-core/services/store-capability.service.ts
```

---

*IR-O4O-OPERATOR-DASHBOARD-ARCHITECTURE-AUDIT-V1*
*조사일: 2026-03-14*
*Status: Complete*

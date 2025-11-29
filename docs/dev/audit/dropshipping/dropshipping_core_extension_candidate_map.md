# Dropshipping Core/Extension Candidate Map

**Investigation Date:** 2025-11-29
**Branch:** develop
**Purpose:** Detailed migration plan for separating Dropshipping into Core + Extensions
**Investigator:** Claude (Sonnet 4.5)

---

## Table of Contents

1. [Section 1: Dropshipping Core App Structure](#section-1-dropshipping-core-app-structure)
2. [Section 2: Extension Apps Structure](#section-2-extension-apps-structure)
3. [Section 3: Migration Plan](#section-3-migration-plan)
4. [Section 4: Service-Specific Requirements Matrix](#section-4-service-specific-requirements-matrix)
5. [Section 5: Implementation Checklist](#section-5-implementation-checklist)

---

## Section 1: Dropshipping Core App Structure

### 1.1 Package Structure

```
packages/dropshipping-core/
├── package.json
├── tsconfig.json
├── README.md
├── CHANGELOG.md
├── src/
│   ├── index.ts                         # Main export
│   ├── manifest.ts                      # App manifest
│   ├── backend/
│   │   ├── entities/                    # All 18 entities
│   │   │   ├── Product.ts
│   │   │   ├── Supplier.ts
│   │   │   ├── Seller.ts
│   │   │   ├── SellerProduct.ts
│   │   │   ├── SellerAuthorization.ts
│   │   │   ├── Partner.ts
│   │   │   ├── Commission.ts
│   │   │   ├── CommissionPolicy.ts
│   │   │   ├── PartnerCommission.ts
│   │   │   ├── Settlement.ts
│   │   │   ├── SettlementItem.ts
│   │   │   ├── Order.ts                 # Extend base Order with dropshipping fields
│   │   │   ├── PartnerProfile.ts
│   │   │   ├── SellerProfile.ts
│   │   │   ├── SupplierProfile.ts
│   │   │   ├── ChannelProductLink.ts
│   │   │   ├── SellerChannelAccount.ts
│   │   │   ├── PaymentSettlement.ts
│   │   │   └── index.ts
│   │   ├── services/                    # All business logic services
│   │   │   ├── SellerService.ts
│   │   │   ├── SellerProductService.ts
│   │   │   ├── SellerDashboardService.ts
│   │   │   ├── SellerAuthorizationService.ts
│   │   │   ├── SupplierDashboardService.ts
│   │   │   ├── PartnerService.ts
│   │   │   ├── CommissionEngine.ts
│   │   │   ├── CommissionCalculator.ts
│   │   │   ├── settlement/
│   │   │   │   ├── SettlementService.ts
│   │   │   │   ├── SettlementManagementService.ts
│   │   │   │   ├── SettlementReadService.ts
│   │   │   │   ├── SettlementBatchService.ts
│   │   │   │   ├── SettlementScheduler.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── controllers/
│   │   │   ├── DropshippingController.ts
│   │   │   ├── SellerController.ts
│   │   │   ├── SupplierController.ts
│   │   │   ├── DropshippingCPTController.ts
│   │   │   └── index.ts
│   │   ├── routes/
│   │   │   ├── seller.routes.ts
│   │   │   ├── supplier.routes.ts
│   │   │   ├── admin-dropshipping.routes.ts
│   │   │   ├── seller-authorization.routes.ts
│   │   │   ├── cpt-dropshipping.routes.ts
│   │   │   └── index.ts
│   │   ├── cpt/
│   │   │   └── dropshipping-cpts.ts     # CPT definitions
│   │   ├── acf/
│   │   │   └── dropshipping-fields.ts   # Base ACF groups
│   │   ├── schemas/
│   │   │   ├── ds_supplier.schema.ts
│   │   │   ├── ds_partner.schema.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── admin-ui/                        # Admin dashboard pages
│   │   ├── pages/
│   │   │   ├── DropshippingDashboard.tsx
│   │   │   ├── ProductsPage.tsx
│   │   │   ├── ProductEditor.tsx
│   │   │   ├── BulkProductImport.tsx
│   │   │   ├── OrdersPage.tsx
│   │   │   ├── SettlementsPage.tsx
│   │   │   ├── CommissionsPage.tsx
│   │   │   ├── ApprovalsPage.tsx
│   │   │   ├── SystemSetup.tsx
│   │   │   └── index.tsx
│   │   ├── components/
│   │   │   ├── seller/
│   │   │   │   ├── SellerDashboard.tsx
│   │   │   │   ├── SellerProducts.tsx
│   │   │   │   ├── SellerSettlement.tsx
│   │   │   │   ├── ProductMarketplace.tsx
│   │   │   │   └── index.tsx
│   │   │   ├── supplier/
│   │   │   │   ├── SupplierProducts.tsx
│   │   │   │   ├── SupplierProductEditor.tsx
│   │   │   │   └── index.tsx
│   │   │   ├── partner/
│   │   │   │   ├── PartnerDashboard.tsx
│   │   │   │   ├── PartnerProducts.tsx
│   │   │   │   ├── PartnerCommissions.tsx
│   │   │   │   ├── PartnerCommissionDashboard.tsx
│   │   │   │   └── index.tsx
│   │   │   ├── shared/
│   │   │   │   ├── LinkGenerator.tsx
│   │   │   │   ├── SharedPayoutRequests.tsx
│   │   │   │   ├── ProductCard.tsx       # Slot-based component
│   │   │   │   ├── ProductList.tsx       # Slot-based component
│   │   │   │   ├── DashboardStats.tsx    # Slot-based widget
│   │   │   │   └── index.tsx
│   │   │   └── index.tsx
│   │   └── index.tsx
│   ├── main-site/                       # Main site components
│   │   ├── components/
│   │   │   ├── SupplierDashboard.tsx
│   │   │   ├── PartnerDashboard.tsx
│   │   │   ├── PartnerDashboardOverview.tsx
│   │   │   ├── ProductCard.tsx          # Slot-based component
│   │   │   └── index.tsx
│   │   ├── pages/
│   │   │   ├── SellerProductCreatePage.tsx
│   │   │   ├── SupplierProductAuthorizationsPage.tsx
│   │   │   └── index.tsx
│   │   └── index.tsx
│   ├── lifecycle/
│   │   ├── install.ts                   # Installation hook
│   │   ├── activate.ts                  # Activation hook
│   │   ├── deactivate.ts                # Deactivation hook
│   │   ├── uninstall.ts                 # Uninstallation hook
│   │   └── index.ts
│   ├── migrations/
│   │   ├── 001_create_supplier_tables.sql
│   │   ├── 002_create_seller_tables.sql
│   │   ├── 003_create_partner_tables.sql
│   │   ├── 004_create_product_tables.sql
│   │   ├── 005_create_seller_product_tables.sql
│   │   ├── 006_create_authorization_tables.sql
│   │   ├── 007_create_commission_tables.sql
│   │   ├── 008_create_settlement_tables.sql
│   │   ├── 009_initialize_cpt.sql
│   │   ├── 010_seed_default_commission_policies.sql
│   │   └── index.ts
│   ├── types/
│   │   ├── dropshipping.ts
│   │   ├── authorization.ts
│   │   ├── commission.ts
│   │   ├── settlement.ts
│   │   └── index.ts
│   └── utils/
│       ├── pricing.ts
│       ├── commission.ts
│       └── index.ts
├── tests/
│   ├── unit/
│   │   ├── entities/
│   │   ├── services/
│   │   └── utils/
│   ├── integration/
│   │   ├── workflows/
│   │   └── api/
│   └── e2e/
│       └── scenarios/
└── docs/
    ├── API.md
    ├── ENTITIES.md
    ├── SERVICES.md
    └── EXTENSION_GUIDE.md
```

---

### 1.2 Manifest Definition

**File:** `packages/dropshipping-core/src/manifest.ts`

```typescript
/**
 * Dropshipping Core App Manifest
 *
 * Defines the dropshipping-core as a complete, installable core app.
 * This is the "engine" that owns dropshipping data tables and provides core functionality.
 * Service-specific dropshipping apps (cosmetics, pharmacy, travel) extend this core.
 */
export const dropshippingManifest = {
  appId: 'dropshipping-core',
  name: 'Dropshipping Core',
  type: 'core' as const,
  version: '1.0.0',
  description: '드롭쉬핑 마켓플레이스 코어 엔진 (상품/공급자/판매자/파트너/정산)',

  // Uninstall policy
  uninstallPolicy: {
    defaultMode: 'keep-data' as const,
    allowPurge: true,
    autoBackup: true,
  },

  // Data ownership - dropshipping-core owns these tables
  ownsTables: [
    'products',
    'suppliers',
    'sellers',
    'seller_products',
    'seller_authorizations',
    'partners',
    'commissions',
    'commission_policies',
    'partner_commissions',
    'settlements',
    'settlement_items',
    'partner_profiles',
    'seller_profiles',
    'supplier_profiles',
    'channel_product_links',
    'seller_channel_accounts',
    'payment_settlements',
  ],

  // CPT definitions (using Entity storage)
  cpt: [
    {
      name: 'ds_supplier',
      storage: 'entity' as const,
      primaryKey: 'id',
      label: '공급자',
      supports: ['title', 'content', 'custom-fields', 'revisions'],
    },
    {
      name: 'ds_partner',
      storage: 'entity' as const,
      primaryKey: 'id',
      label: '파트너',
      supports: ['title', 'content', 'custom-fields', 'revisions', 'thumbnail'],
    },
    {
      name: 'ds_product',
      storage: 'entity' as const,
      primaryKey: 'id',
      label: '드롭쉬핑 상품',
      supports: ['title', 'content', 'custom-fields', 'revisions', 'thumbnail', 'excerpt'],
      taxonomies: ['ds_product_category', 'ds_product_tag'],
    },
    {
      name: 'ds_commission_policy',
      storage: 'entity' as const,
      primaryKey: 'id',
      label: '수수료 정책',
      supports: ['title', 'content', 'custom-fields', 'revisions'],
    },
  ],

  // ACF groups (core provides base metadata fields)
  acf: [
    {
      groupId: 'ds_product_pricing',
      label: '가격 정보',
      appliesTo: 'ds_product',
      fields: ['cost_price', 'msrp', 'margin_rate', 'partner_commission_rate'],
    },
    {
      groupId: 'ds_product_supplier',
      label: '공급자 정보',
      appliesTo: 'ds_product',
      fields: ['supplier', 'supplier_sku'],
    },
    {
      groupId: 'ds_product_shipping',
      label: '배송 정보',
      appliesTo: 'ds_product',
      fields: ['shipping_days_min', 'shipping_days_max', 'shipping_fee'],
    },
    {
      groupId: 'ds_supplier_info',
      label: '공급자 정보',
      appliesTo: 'ds_supplier',
      fields: ['supplier_email', 'supplier_phone', 'supplier_business_number', 'supplier_api_key'],
    },
    {
      groupId: 'ds_partner_info',
      label: '파트너 정보',
      appliesTo: 'ds_partner',
      fields: ['partner_type', 'partner_grade', 'partner_referral_code', 'partner_commission_rate'],
    },
    {
      groupId: 'ds_commission_policy_details',
      label: '수수료 정책 상세',
      appliesTo: 'ds_commission_policy',
      fields: ['policy_supplier', 'policy_commission_rate', 'policy_partner_grade'],
    },
  ],

  // API routes
  routes: [
    // Seller routes
    '/api/v2/seller/catalog',
    '/api/v2/seller/products',
    '/api/v2/seller/products/:id',
    '/api/v2/seller/dashboard',
    '/api/v2/seller/orders',
    '/api/v2/seller/settlements',
    // Supplier routes
    '/api/v2/supplier/products',
    '/api/v2/supplier/products/:id',
    '/api/v2/supplier/authorizations',
    '/api/v2/supplier/dashboard',
    // Admin routes
    '/api/admin/dropshipping/products',
    '/api/admin/dropshipping/suppliers',
    '/api/admin/dropshipping/sellers',
    '/api/admin/dropshipping/authorizations',
    '/api/admin/dropshipping/settlements',
    '/api/admin/dropshipping/commissions',
    // CPT routes
    '/api/cpt/dropshipping/*',
  ],

  // Permissions
  permissions: [
    'dropshipping.read',
    'dropshipping.write',
    'dropshipping.manage_products',
    'dropshipping.manage_suppliers',
    'dropshipping.manage_sellers',
    'dropshipping.manage_partners',
    'dropshipping.manage_settlements',
    'dropshipping.manage_commissions',
    'dropshipping.admin',
  ],

  // Lifecycle hooks
  lifecycle: {
    install: './lifecycle/install.js',
    activate: './lifecycle/activate.js',
    deactivate: './lifecycle/deactivate.js',
    uninstall: './lifecycle/uninstall.js',
  },

  // Installation options
  installOptions: {
    adoptExistingTables: true, // Adopt existing dropshipping tables if found
    keepDataOnUninstall: true, // Default: keep data when uninstalling
    runMigrations: true,
    seedDefaultData: true,  // Seed default commission policies
  },

  // Menu definition (to be integrated with core menu system)
  menu: {
    id: 'dropshipping',
    label: '드롭쉬핑',
    icon: 'ShoppingCart',
    path: '/dropshipping',
    position: 150,
    children: [
      {
        id: 'dropshipping-dashboard',
        label: '대시보드',
        icon: 'LayoutDashboard',
        path: '/dropshipping',
      },
      {
        id: 'dropshipping-products',
        label: '상품 관리',
        icon: 'Package',
        path: '/dropshipping/products',
      },
      {
        id: 'dropshipping-suppliers',
        label: '공급자 관리',
        icon: 'Factory',
        path: '/dropshipping/suppliers',
      },
      {
        id: 'dropshipping-sellers',
        label: '판매자 관리',
        icon: 'Store',
        path: '/dropshipping/sellers',
      },
      {
        id: 'dropshipping-partners',
        label: '파트너 관리',
        icon: 'Users',
        path: '/dropshipping/partners',
      },
      {
        id: 'dropshipping-settlements',
        label: '정산 관리',
        icon: 'DollarSign',
        path: '/dropshipping/settlements',
      },
      {
        id: 'dropshipping-commissions',
        label: '수수료 관리',
        icon: 'Percent',
        path: '/dropshipping/commissions',
      },
    ],
  },

  // Configuration
  defaultConfig: {
    settlementPeriod: 'monthly' as const,  // 'weekly' | 'monthly' | 'custom'
    commissionHoldPeriod: 7,  // days
    minimumPayout: 50000,  // KRW
    sellerProductLimit: 10,
    authorizationCooldown: 30,  // days
  },
};

export default dropshippingManifest;
```

---

### 1.3 Files to Move from `apps/api-server`

**Complete File Movement Checklist:**

#### Backend Entities (18 files)

- [ ] `apps/api-server/src/entities/Product.ts` → `packages/dropshipping-core/src/backend/entities/Product.ts`
- [ ] `apps/api-server/src/entities/Supplier.ts` → `packages/dropshipping-core/src/backend/entities/Supplier.ts`
- [ ] `apps/api-server/src/entities/Seller.ts` → `packages/dropshipping-core/src/backend/entities/Seller.ts`
- [ ] `apps/api-server/src/entities/SellerProduct.ts` → `packages/dropshipping-core/src/backend/entities/SellerProduct.ts`
- [ ] `apps/api-server/src/entities/SellerAuthorization.ts` → `packages/dropshipping-core/src/backend/entities/SellerAuthorization.ts`
- [ ] `apps/api-server/src/entities/Partner.ts` → `packages/dropshipping-core/src/backend/entities/Partner.ts`
- [ ] `apps/api-server/src/entities/Commission.ts` → `packages/dropshipping-core/src/backend/entities/Commission.ts`
- [ ] `apps/api-server/src/entities/CommissionPolicy.ts` → `packages/dropshipping-core/src/backend/entities/CommissionPolicy.ts`
- [ ] `apps/api-server/src/entities/PartnerCommission.ts` → `packages/dropshipping-core/src/backend/entities/PartnerCommission.ts`
- [ ] `apps/api-server/src/entities/Settlement.ts` → `packages/dropshipping-core/src/backend/entities/Settlement.ts`
- [ ] `apps/api-server/src/entities/SettlementItem.ts` → `packages/dropshipping-core/src/backend/entities/SettlementItem.ts`
- [ ] `apps/api-server/src/entities/PartnerProfile.ts` → `packages/dropshipping-core/src/backend/entities/PartnerProfile.ts`
- [ ] `apps/api-server/src/entities/SellerProfile.ts` → `packages/dropshipping-core/src/backend/entities/SellerProfile.ts`
- [ ] `apps/api-server/src/entities/SupplierProfile.ts` → `packages/dropshipping-core/src/backend/entities/SupplierProfile.ts`
- [ ] `apps/api-server/src/entities/ChannelProductLink.ts` → `packages/dropshipping-core/src/backend/entities/ChannelProductLink.ts`
- [ ] `apps/api-server/src/entities/SellerChannelAccount.ts` → `packages/dropshipping-core/src/backend/entities/SellerChannelAccount.ts`
- [ ] `apps/api-server/src/entities/PaymentSettlement.ts` → `packages/dropshipping-core/src/backend/entities/PaymentSettlement.ts`
- [ ] `apps/api-server/src/entities/OrderEvent.ts` → `packages/dropshipping-core/src/backend/entities/OrderEvent.ts` (if dropshipping-specific)

#### Backend Services (13+ files)

- [ ] `apps/api-server/src/services/SellerService.ts` → `packages/dropshipping-core/src/backend/services/SellerService.ts`
- [ ] `apps/api-server/src/services/SellerProductService.ts` → `packages/dropshipping-core/src/backend/services/SellerProductService.ts`
- [ ] `apps/api-server/src/services/SellerDashboardService.ts` → `packages/dropshipping-core/src/backend/services/SellerDashboardService.ts`
- [ ] `apps/api-server/src/services/SellerAuthorizationService.ts` → `packages/dropshipping-core/src/backend/services/SellerAuthorizationService.ts`
- [ ] `apps/api-server/src/services/SupplierDashboardService.ts` → `packages/dropshipping-core/src/backend/services/SupplierDashboardService.ts`
- [ ] `apps/api-server/src/services/PartnerService.ts` → `packages/dropshipping-core/src/backend/services/PartnerService.ts`
- [ ] `apps/api-server/src/services/CommissionEngine.ts` → `packages/dropshipping-core/src/backend/services/CommissionEngine.ts`
- [ ] `apps/api-server/src/services/CommissionCalculator.ts` → `packages/dropshipping-core/src/backend/services/CommissionCalculator.ts`
- [ ] `apps/api-server/src/services/SettlementService.ts` → `packages/dropshipping-core/src/backend/services/settlement/SettlementService.ts`
- [ ] `apps/api-server/src/services/SettlementManagementService.ts` → `packages/dropshipping-core/src/backend/services/settlement/SettlementManagementService.ts`
- [ ] `apps/api-server/src/services/SettlementReadService.ts` → `packages/dropshipping-core/src/backend/services/settlement/SettlementReadService.ts`
- [ ] `apps/api-server/src/services/SettlementBatchService.ts` → `packages/dropshipping-core/src/backend/services/settlement/SettlementBatchService.ts`
- [ ] `apps/api-server/src/services/SettlementScheduler.ts` → `packages/dropshipping-core/src/backend/services/settlement/SettlementScheduler.ts`
- [ ] `apps/api-server/src/services/settlement-engine/**` → `packages/dropshipping-core/src/backend/services/settlement/` (all settlement engine modules)

#### Controllers (3+ files)

- [ ] `apps/api-server/src/controllers/dropshipping/DropshippingController.ts` → `packages/dropshipping-core/src/backend/controllers/DropshippingController.ts`
- [ ] `apps/api-server/src/controllers/SellerController.ts` → `packages/dropshipping-core/src/backend/controllers/SellerController.ts`
- [ ] `apps/api-server/src/controllers/SupplierController.ts` → `packages/dropshipping-core/src/backend/controllers/SupplierController.ts`
- [ ] `apps/api-server/src/controllers/cpt/DropshippingCPTController.ts` → `packages/dropshipping-core/src/backend/controllers/DropshippingCPTController.ts`

#### Routes (5+ files)

- [ ] `apps/api-server/src/routes/v2/seller.routes.ts` → `packages/dropshipping-core/src/backend/routes/seller.routes.ts`
- [ ] `apps/api-server/src/routes/v2/supplier.routes.ts` → `packages/dropshipping-core/src/backend/routes/supplier.routes.ts`
- [ ] `apps/api-server/src/routes/admin/dropshipping.routes.ts` → `packages/dropshipping-core/src/backend/routes/admin-dropshipping.routes.ts`
- [ ] `apps/api-server/src/routes/admin/seller-authorization.routes.ts` → `packages/dropshipping-core/src/backend/routes/seller-authorization.routes.ts`
- [ ] `apps/api-server/src/routes/cpt/dropshipping.routes.ts` → `packages/dropshipping-core/src/backend/routes/cpt-dropshipping.routes.ts`

#### CPT & ACF (2 files)

- [ ] `apps/api-server/src/services/cpt/dropshipping-cpts.ts` → `packages/dropshipping-core/src/backend/cpt/dropshipping-cpts.ts`
- [ ] `apps/api-server/src/services/acf/dropshipping-fields.ts` → `packages/dropshipping-core/src/backend/acf/dropshipping-fields.ts`

#### Schemas & Types (3+ files)

- [ ] `apps/api-server/src/schemas/ds_supplier.schema.ts` → `packages/dropshipping-core/src/backend/schemas/ds_supplier.schema.ts`
- [ ] `apps/api-server/src/schemas/ds_partner.schema.ts` → `packages/dropshipping-core/src/backend/schemas/ds_partner.schema.ts`
- [ ] `apps/api-server/src/types/dropshipping.ts` → `packages/dropshipping-core/src/types/dropshipping.ts`

#### Migrations (6+ files)

- [ ] `apps/api-server/src/database/migrations/1755000000000-CreateSupplierTables.ts` → `packages/dropshipping-core/src/migrations/001_create_supplier_tables.sql`
- [ ] `apps/api-server/src/database/migrations/1758897000000-InitializeDropshippingCPTs.ts` → `packages/dropshipping-core/src/migrations/009_initialize_cpt.sql`
- [ ] `apps/api-server/src/database/migrations/1800000000000-CreateDropshippingEntities.ts` → Split into multiple SQL files
- [ ] `apps/api-server/src/database/migrations/1759103000000-CreateCustomPostTypeTables.ts` → (Keep in core system, not dropshipping-core)
- [ ] `apps/api-server/src/database/migrations/1737115000000-CreateSettlementTables.ts` → `packages/dropshipping-core/src/migrations/008_create_settlement_tables.sql`
- [ ] `apps/api-server/src/database/migrations/1900000000000-BaselineDropshippingEntities.ts` → Incorporate into individual migration files

---

### 1.4 Files to Keep in `apps/api-server` (Import from Package)

**These files will remain in api-server but import from `@o4o/dropshipping-core`:**

- [ ] `apps/api-server/src/routes/index.ts` - Import dropshipping routes from package
- [ ] `apps/api-server/src/database/connection.ts` - Register dropshipping entities from package
- [ ] `apps/api-server/src/app-manifests/appsCatalog.ts` - Import dropshippingManifest from package

**Example:**
```typescript
// apps/api-server/src/routes/index.ts
import { sellerRoutes, supplierRoutes, adminDropshippingRoutes } from '@o4o/dropshipping-core';

// Register routes
app.use('/api/v2/seller', sellerRoutes);
app.use('/api/v2/supplier', supplierRoutes);
app.use('/api/admin/dropshipping', adminDropshippingRoutes);
```

---

### 1.5 Admin Dashboard Files to Move

**Move from `apps/admin-dashboard` to `packages/dropshipping-core`:**

#### Pages (9 files)

- [ ] `apps/admin-dashboard/src/pages/dropshipping/index.tsx` → `packages/dropshipping-core/src/admin-ui/pages/DropshippingDashboard.tsx`
- [ ] `apps/admin-dashboard/src/pages/dropshipping/Products.tsx` → `packages/dropshipping-core/src/admin-ui/pages/ProductsPage.tsx`
- [ ] `apps/admin-dashboard/src/pages/dropshipping/ProductEditor.tsx` → `packages/dropshipping-core/src/admin-ui/pages/ProductEditor.tsx`
- [ ] `apps/admin-dashboard/src/pages/dropshipping/BulkProductImport.tsx` → `packages/dropshipping-core/src/admin-ui/pages/BulkProductImport.tsx`
- [ ] `apps/admin-dashboard/src/pages/dropshipping/Orders.tsx` → `packages/dropshipping-core/src/admin-ui/pages/OrdersPage.tsx`
- [ ] `apps/admin-dashboard/src/pages/dropshipping/Settlements.tsx` → `packages/dropshipping-core/src/admin-ui/pages/SettlementsPage.tsx`
- [ ] `apps/admin-dashboard/src/pages/dropshipping/Commissions.tsx` → `packages/dropshipping-core/src/admin-ui/pages/CommissionsPage.tsx`
- [ ] `apps/admin-dashboard/src/pages/dropshipping/Approvals.tsx` → `packages/dropshipping-core/src/admin-ui/pages/ApprovalsPage.tsx`
- [ ] `apps/admin-dashboard/src/pages/dropshipping/SystemSetup.tsx` → `packages/dropshipping-core/src/admin-ui/pages/SystemSetup.tsx`

#### Components (20+ files)

- [ ] `apps/admin-dashboard/src/components/shortcodes/dropshipping/**` → `packages/dropshipping-core/src/admin-ui/components/`

---

### 1.6 Main Site Files to Move

- [ ] `apps/main-site/src/components/shortcodes/SupplierDashboard.tsx` → `packages/dropshipping-core/src/main-site/components/SupplierDashboard.tsx`
- [ ] `apps/main-site/src/components/shortcodes/PartnerDashboard.tsx` → `packages/dropshipping-core/src/main-site/components/PartnerDashboard.tsx`
- [ ] `apps/main-site/src/components/shortcodes/PartnerDashboardOverview.tsx` → `packages/dropshipping-core/src/main-site/components/PartnerDashboardOverview.tsx`
- [ ] `apps/main-site/src/pages/dashboard/SellerProductCreatePage.tsx` → `packages/dropshipping-core/src/main-site/pages/SellerProductCreatePage.tsx`
- [ ] `apps/main-site/src/pages/dashboard/SupplierProductAuthorizationsPage.tsx` → `packages/dropshipping-core/src/main-site/pages/SupplierProductAuthorizationsPage.tsx`
- [ ] `apps/main-site/src/types/dropshipping-authorization.ts` → `packages/dropshipping-core/src/types/authorization.ts`
- [ ] `apps/main-site/src/types/supplier-product.ts` → `packages/dropshipping-core/src/types/dropshipping.ts`
- [ ] `apps/main-site/src/types/seller-product.ts` → `packages/dropshipping-core/src/types/dropshipping.ts`
- [ ] `apps/main-site/src/services/authorizationApi.ts` → (Keep in main-site, import types from package)

---

## Section 2: Extension Apps Structure

### 2.1 Cosmetics Extension (`dropshipping-cosmetics`)

```
packages/dropshipping-cosmetics/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts
│   ├── manifest.ts                      # Extension manifest
│   ├── acf/
│   │   └── cosmetic-fields.ts           # Cosmetics-specific ACF
│   ├── admin-ui/
│   │   ├── pages/
│   │   │   ├── CosmeticsProductEditor.tsx    # Override ProductEditor
│   │   │   └── CosmeticsDashboard.tsx        # Override Dashboard
│   │   └── components/
│   │       ├── CosmeticMetadataFields.tsx
│   │       ├── CosmeticProductCard.tsx       # Override ProductCard
│   │       └── CosmeticFilters.tsx
│   ├── main-site/
│   │   └── components/
│   │       ├── CosmeticProductCard.tsx
│   │       └── CosmeticProductFilters.tsx
│   ├── services/
│   │   └── CosmeticsCommissionEngine.ts      # Optional override
│   ├── lifecycle/
│   │   └── install.ts                        # Seed cosmetics data
│   └── config/
│       └── defaultConfig.ts                  # Categories, branding
└── tests/
    └── integration/
        └── cosmetics-workflow.test.ts
```

**Manifest:**

```typescript
export const cosmeticsManifest = {
  appId: 'dropshipping-cosmetics',
  name: 'Dropshipping Extension – Cosmetics',
  type: 'extension' as const,
  version: '1.0.0',
  description: '화장품 드롭쉬핑 익스텐션 (피부타입, 성분, 뷰티 고민)',

  // Core dependency
  dependencies: {
    'dropshipping-core': '>=1.0.0',
  },

  // Uninstall policy
  uninstallPolicy: {
    defaultMode: 'keep-data' as const,
    allowPurge: true,
    autoBackup: false,
  },

  // Extension tables (NONE - uses Core tables)
  ownsTables: [],

  // Extend ds_product CPT with cosmetics metadata
  extendsCPT: [
    {
      name: 'ds_product',
      acfGroup: 'cosmetic_meta',
    },
  ],

  // ACF group for cosmetics metadata
  acf: [
    {
      groupId: 'cosmetic_meta',
      label: '화장품 메타데이터',
      appliesTo: 'ds_product',
      fields: [
        {
          key: 'skinType',
          type: 'multiselect',
          label: '피부 타입',
          options: ['건성', '지성', '복합성', '민감성', '중성'],
        },
        {
          key: 'ingredients',
          type: 'array',
          label: '주요 성분',
          subFields: [
            { key: 'name', type: 'text', label: '성분명' },
            { key: 'percentage', type: 'number', label: '함량 (%)' },
            { key: 'function', type: 'text', label: '기능' },
          ],
        },
        {
          key: 'beautyConcerns',
          type: 'multiselect',
          label: '피부 고민',
          options: ['여드름', '주름', '미백', '모공', '탄력', '진정', '보습', '안티에이징'],
        },
        {
          key: 'productCategory',
          type: 'select',
          label: '제품 카테고리',
          options: ['스킨케어', '메이크업', '바디케어', '헤어케어', '선케어', '남성케어'],
        },
        {
          key: 'usageMethod',
          type: 'textarea',
          label: '사용 방법',
        },
        {
          key: 'certifications',
          type: 'multiselect',
          label: '인증',
          options: ['비건', '유기농', '동물실험무', '저자극', '무향료', '무알코올'],
        },
      ],
    },
  ],

  // Admin UI routes (override core UI)
  adminRoutes: [
    {
      path: '/admin/dropshipping/products',
      component: './admin-ui/pages/CosmeticsProductEditor.tsx',
    },
    {
      path: '/admin/dropshipping',
      component: './admin-ui/pages/CosmeticsDashboard.tsx',
    },
  ],

  // Default configuration
  defaultConfig: {
    categories: [
      { name: '스킨케어', slug: 'skincare', icon: 'droplet', color: '#E8B4B8' },
      { name: '메이크업', slug: 'makeup', icon: 'palette', color: '#D4A5A5' },
      { name: '바디케어', slug: 'bodycare', icon: 'user', color: '#C49A9A' },
      { name: '헤어케어', slug: 'haircare', icon: 'scissors', color: '#B48F8F' },
      { name: '선케어', slug: 'suncare', icon: 'sun', color: '#FFA726' },
      { name: '남성케어', slug: 'mencare', icon: 'user-check', color: '#1E88E5' },
    ],
    brandColor: '#E8B4B8',  // Soft pink
    accentColor: '#8B7355',  // Beige
    skin: 'neture',
    commissionPolicies: [
      {
        policyCode: 'COSMETICS-LUXURY-2025',
        name: '럭셔리 코스메틱 특별 커미션',
        category: '럭셔리 코스메틱',
        commissionRate: 15,
        priority: 100,
      },
      {
        policyCode: 'COSMETICS-ORGANIC-2025',
        name: '유기농 제품 보너스 커미션',
        tags: ['유기농'],
        commissionRate: 12,
        priority: 90,
      },
    ],
  },

  // Permissions (inherits from dropshipping-core)
  permissions: [],

  // Menu (uses core menu with cosmetics theme)
  menu: null,
};

export default cosmeticsManifest;
```

---

### 2.2 Pharmacy Extension (`dropshipping-pharmacy`)

**Manifest:**

```typescript
export const pharmacyManifest = {
  appId: 'dropshipping-pharmacy',
  name: 'Dropshipping Extension – Pharmacy',
  type: 'extension' as const,
  version: '1.0.0',
  description: '약사회 드롭쉬핑 익스텐션 (의약품, 처방전, 약사 인증)',

  dependencies: {
    'dropshipping-core': '>=1.0.0',
  },

  uninstallPolicy: {
    defaultMode: 'keep-data' as const,
    allowPurge: true,
    autoBackup: false,
  },

  ownsTables: [
    'pharmacy_prescriptions',  // Extension-specific table for prescription uploads
  ],

  extendsCPT: [
    {
      name: 'ds_product',
      acfGroup: 'pharmacy_meta',
    },
    {
      name: 'ds_supplier',
      acfGroup: 'pharmacy_supplier_meta',
    },
  ],

  acf: [
    {
      groupId: 'pharmacy_meta',
      label: '의약품 메타데이터',
      appliesTo: 'ds_product',
      fields: [
        {
          key: 'medicationType',
          type: 'select',
          label: '의약품 구분',
          options: ['전문의약품', '일반의약품', '의약외품', '건강기능식품'],
          required: true,
        },
        {
          key: 'requiresPrescription',
          type: 'toggle',
          label: '처방전 필요 여부',
          default: false,
        },
        {
          key: 'activeIngredients',
          type: 'array',
          label: '유효 성분',
          subFields: [
            { key: 'name', type: 'text', label: '성분명' },
            { key: 'dosage', type: 'text', label: '함량' },
          ],
        },
        {
          key: 'dosageForm',
          type: 'select',
          label: '제형',
          options: ['정제', '캡슐', '시럽', '주사제', '연고', '패치', '액제', '분말'],
        },
        {
          key: 'contraindications',
          type: 'textarea',
          label: '금기사항',
        },
        {
          key: 'sideEffects',
          type: 'textarea',
          label: '부작용',
        },
        {
          key: 'storageConditions',
          type: 'text',
          label: '보관 방법',
          default: '실온 보관 (1-30℃)',
        },
        {
          key: 'ageRestriction',
          type: 'number',
          label: '최소 연령 제한',
        },
      ],
    },
    {
      groupId: 'pharmacy_supplier_meta',
      label: '약국 인증 정보',
      appliesTo: 'ds_supplier',
      fields: [
        {
          key: 'pharmacyLicense',
          type: 'text',
          label: '약국 허가 번호',
          required: true,
        },
        {
          key: 'pharmacistName',
          type: 'text',
          label: '약사 이름',
        },
        {
          key: 'pharmacistLicense',
          type: 'text',
          label: '약사 면허 번호',
        },
      ],
    },
  ],

  adminRoutes: [
    {
      path: '/admin/dropshipping/products',
      component: './admin-ui/pages/PharmacyProductEditor.tsx',
    },
    {
      path: '/admin/dropshipping/prescriptions',
      component: './admin-ui/pages/PrescriptionManagement.tsx',  // NEW
    },
    {
      path: '/admin/dropshipping/organization',
      component: './admin-ui/pages/OrganizationDashboard.tsx',  // Yaksa association
    },
  ],

  defaultConfig: {
    categories: [
      { name: '감기/독감', slug: 'cold-flu', icon: 'thermometer' },
      { name: '소화기', slug: 'digestive', icon: 'pill' },
      { name: '진통제', slug: 'painkillers', icon: 'heart-pulse' },
      { name: '영양제', slug: 'supplements', icon: 'capsule' },
      { name: '피부약', slug: 'dermatology', icon: 'spray-can' },
    ],
    brandColor: '#4A90E2',  // Medical blue
    accentColor: '#50E3C2',  // Teal
    skin: 'yaksa',
    organizationFeatures: {
      enableMembershipManagement: true,
      enableEducationResources: true,
      enableProfessionalForum: true,
    },
    commissionPolicies: [
      {
        policyCode: 'PHARMACY-PRESCRIPTION-2025',
        name: '전문의약품 커미션',
        tags: ['전문의약품'],
        commissionRate: 8,
        priority: 100,
      },
    ],
  },

  permissions: [
    'pharmacy.manage_prescriptions',
    'pharmacy.verify_pharmacist',
  ],

  menu: {
    id: 'pharmacy-organization',
    label: '약사회',
    icon: 'Hospital',
    path: '/dropshipping/organization',
    position: 151,
  },
};
```

---

### 2.3 Travel Extension (`dropshipping-travel`)

**Manifest:**

```typescript
export const travelManifest = {
  appId: 'dropshipping-travel',
  name: 'Dropshipping Extension – Travel',
  type: 'extension' as const,
  version: '1.0.0',
  description: '여행 드롭쉬핑 익스텐션 (패키지 투어, 항공권, 숙박)',

  dependencies: {
    'dropshipping-core': '>=1.0.0',
  },

  uninstallPolicy: {
    defaultMode: 'keep-data' as const,
    allowPurge: true,
    autoBackup: false,
  },

  ownsTables: [
    'travel_bookings',  // Extension-specific table for booking management
  ],

  extendsCPT: [
    {
      name: 'ds_product',
      acfGroup: 'travel_meta',
    },
  ],

  acf: [
    {
      groupId: 'travel_meta',
      label: '여행 메타데이터',
      appliesTo: 'ds_product',
      fields: [
        {
          key: 'travelType',
          type: 'select',
          label: '여행 유형',
          options: ['패키지 투어', '자유 여행', '골프 투어', '크루즈', '항공권', '숙박', '액티비티'],
          required: true,
        },
        {
          key: 'destinations',
          type: 'array',
          label: '여행지',
          subFields: [
            { key: 'country', type: 'text', label: '국가' },
            { key: 'city', type: 'text', label: '도시' },
            { key: 'duration', type: 'number', label: '체류 일수' },
          ],
        },
        {
          key: 'departureDate',
          type: 'date',
          label: '출발 날짜',
        },
        {
          key: 'returnDate',
          type: 'date',
          label: '귀국 날짜',
        },
        {
          key: 'totalDuration',
          type: 'text',
          label: '총 여행 기간',
          default: '5박 6일',
        },
        {
          key: 'schedule',
          type: 'array',
          label: '일정표',
          subFields: [
            { key: 'day', type: 'number', label: 'Day' },
            { key: 'activities', type: 'textarea', label: '활동 내역' },
            { key: 'meals', type: 'text', label: '식사 (조/중/석)' },
            { key: 'accommodation', type: 'text', label: '숙소' },
          ],
        },
        {
          key: 'includedServices',
          type: 'multiselect',
          label: '포함 사항',
          options: ['항공권', '숙박', '식사', '관광', '가이드', '여행자 보험', '비자', '공항 픽업'],
        },
        {
          key: 'excludedServices',
          type: 'multiselect',
          label: '불포함 사항',
          options: ['개인 경비', '선택 관광', '팁', '여행자 보험', '비자'],
        },
        {
          key: 'minimumParticipants',
          type: 'number',
          label: '최소 인원',
          default: 10,
        },
        {
          key: 'maximumParticipants',
          type: 'number',
          label: '최대 인원',
          default: 40,
        },
      ],
    },
  ],

  adminRoutes: [
    {
      path: '/admin/dropshipping/products',
      component: './admin-ui/pages/TravelProductEditor.tsx',
    },
    {
      path: '/admin/dropshipping/bookings',
      component: './admin-ui/pages/BookingManagement.tsx',  // NEW
    },
    {
      path: '/admin/dropshipping/calendar',
      component: './admin-ui/pages/TravelCalendar.tsx',  // Availability calendar
    },
  ],

  defaultConfig: {
    categories: [
      { name: '유럽 패키지', slug: 'europe-package', icon: 'plane' },
      { name: '동남아 골프', slug: 'asia-golf', icon: 'golf-flag' },
      { name: '크루즈', slug: 'cruise', icon: 'ship' },
      { name: '항공권', slug: 'flights', icon: 'ticket' },
      { name: '숙박', slug: 'hotels', icon: 'bed' },
    ],
    brandColor: '#1E88E5',  // Sky blue
    accentColor: '#FFA726',  // Orange
    skin: 'travel',
    bookingFeatures: {
      enableCalendar: true,
      enableAvailabilityCheck: true,
      enableGroupBooking: true,
    },
    commissionPolicies: [
      {
        policyCode: 'TRAVEL-INTERNATIONAL-2025',
        name: '해외 패키지 투어 커미션',
        tags: ['해외', '패키지'],
        commissionRate: 12,
        priority: 100,
      },
    ],
  },

  permissions: [
    'travel.manage_bookings',
    'travel.manage_calendar',
  ],

  menu: null,
};
```

---

## Section 3: Migration Plan

### 3.1 Phase 1: Core Extraction (Week 1-2)

#### Step 1: Create Core Package Structure

```bash
# 1. Create package directory
mkdir -p packages/dropshipping-core/src/{backend,admin-ui,main-site,lifecycle,migrations,types,utils,tests}

# 2. Initialize package.json
cd packages/dropshipping-core
pnpm init

# 3. Install dependencies
pnpm add typeorm reflect-metadata pg
pnpm add -D typescript @types/node

# 4. Create tsconfig.json
cat > tsconfig.json << EOF
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
EOF
```

#### Step 2: Move Entities

```bash
# Move all 18 entities
mv apps/api-server/src/entities/Product.ts packages/dropshipping-core/src/backend/entities/
mv apps/api-server/src/entities/Supplier.ts packages/dropshipping-core/src/backend/entities/
mv apps/api-server/src/entities/Seller.ts packages/dropshipping-core/src/backend/entities/
mv apps/api-server/src/entities/SellerProduct.ts packages/dropshipping-core/src/backend/entities/
mv apps/api-server/src/entities/SellerAuthorization.ts packages/dropshipping-core/src/backend/entities/
mv apps/api-server/src/entities/Partner.ts packages/dropshipping-core/src/backend/entities/
mv apps/api-server/src/entities/Commission.ts packages/dropshipping-core/src/backend/entities/
mv apps/api-server/src/entities/CommissionPolicy.ts packages/dropshipping-core/src/backend/entities/
mv apps/api-server/src/entities/PartnerCommission.ts packages/dropshipping-core/src/backend/entities/
mv apps/api-server/src/entities/Settlement.ts packages/dropshipping-core/src/backend/entities/
mv apps/api-server/src/entities/SettlementItem.ts packages/dropshipping-core/src/backend/entities/
mv apps/api-server/src/entities/PartnerProfile.ts packages/dropshipping-core/src/backend/entities/
mv apps/api-server/src/entities/SellerProfile.ts packages/dropshipping-core/src/backend/entities/
mv apps/api-server/src/entities/SupplierProfile.ts packages/dropshipping-core/src/backend/entities/
mv apps/api-server/src/entities/ChannelProductLink.ts packages/dropshipping-core/src/backend/entities/
mv apps/api-server/src/entities/SellerChannelAccount.ts packages/dropshipping-core/src/backend/entities/
mv apps/api-server/src/entities/PaymentSettlement.ts packages/dropshipping-core/src/backend/entities/
mv apps/api-server/src/entities/OrderEvent.ts packages/dropshipping-core/src/backend/entities/

# Create index.ts
cat > packages/dropshipping-core/src/backend/entities/index.ts << EOF
export * from './Product';
export * from './Supplier';
export * from './Seller';
export * from './SellerProduct';
export * from './SellerAuthorization';
export * from './Partner';
export * from './Commission';
export * from './CommissionPolicy';
export * from './PartnerCommission';
export * from './Settlement';
export * from './SettlementItem';
export * from './PartnerProfile';
export * from './SellerProfile';
export * from './SupplierProfile';
export * from './ChannelProductLink';
export * from './SellerChannelAccount';
export * from './PaymentSettlement';
export * from './OrderEvent';
EOF
```

#### Step 3: Move Services

```bash
# Move all services
mv apps/api-server/src/services/SellerService.ts packages/dropshipping-core/src/backend/services/
mv apps/api-server/src/services/SellerProductService.ts packages/dropshipping-core/src/backend/services/
# ... (repeat for all services)

# Create index.ts
cat > packages/dropshipping-core/src/backend/services/index.ts << EOF
export * from './SellerService';
export * from './SellerProductService';
export * from './SellerDashboardService';
export * from './SellerAuthorizationService';
export * from './SupplierDashboardService';
export * from './PartnerService';
export * from './CommissionEngine';
export * from './CommissionCalculator';
export * from './settlement';
EOF
```

#### Step 4: Create Manifest

```bash
# Create manifest.ts (see Section 1.2)
cat > packages/dropshipping-core/src/manifest.ts << 'EOF'
# (Copy manifest from Section 1.2)
EOF
```

#### Step 5: Create Lifecycle Hooks

```bash
# Create lifecycle/install.ts
cat > packages/dropshipping-core/src/lifecycle/install.ts << 'EOF'
import { AppDataSource } from '@o4o/database';
import { runMigrations } from '../migrations';
import { seedDefaultCommissionPolicies } from './seedData';
import logger from '@o4o/logger';

export async function install() {
  logger.info('[Dropshipping Core] Starting installation...');

  // 1. Run migrations
  await runMigrations();

  // 2. Seed default data
  await seedDefaultCommissionPolicies();

  logger.info('[Dropshipping Core] Installation complete');
}
EOF

# Create lifecycle/uninstall.ts
cat > packages/dropshipping-core/src/lifecycle/uninstall.ts << 'EOF'
import { AppDataSource } from '@o4o/database';
import logger from '@o4o/logger';

export async function uninstall(mode: 'keep-data' | 'purge' = 'keep-data') {
  logger.info(`[Dropshipping Core] Starting uninstallation (mode: ${mode})...`);

  if (mode === 'purge') {
    logger.warn('[Dropshipping Core] PURGE mode: Deleting all data...');

    // Confirmation required
    const confirmed = await confirmPurge();
    if (!confirmed) {
      logger.info('[Dropshipping Core] Uninstallation cancelled');
      return;
    }

    // Drop all tables in reverse dependency order
    await AppDataSource.query('DROP TABLE IF EXISTS settlement_items CASCADE');
    await AppDataSource.query('DROP TABLE IF EXISTS settlements CASCADE');
    await AppDataSource.query('DROP TABLE IF EXISTS commissions CASCADE');
    await AppDataSource.query('DROP TABLE IF EXISTS commission_policies CASCADE');
    await AppDataSource.query('DROP TABLE IF EXISTS partner_commissions CASCADE');
    await AppDataSource.query('DROP TABLE IF EXISTS partners CASCADE');
    await AppDataSource.query('DROP TABLE IF EXISTS seller_authorizations CASCADE');
    await AppDataSource.query('DROP TABLE IF EXISTS seller_products CASCADE');
    await AppDataSource.query('DROP TABLE IF EXISTS products CASCADE');
    await AppDataSource.query('DROP TABLE IF EXISTS sellers CASCADE');
    await AppDataSource.query('DROP TABLE IF EXISTS suppliers CASCADE');
    await AppDataSource.query('DROP TABLE IF EXISTS partner_profiles CASCADE');
    await AppDataSource.query('DROP TABLE IF EXISTS seller_profiles CASCADE');
    await AppDataSource.query('DROP TABLE IF EXISTS supplier_profiles CASCADE');
    await AppDataSource.query('DROP TABLE IF EXISTS channel_product_links CASCADE');
    await AppDataSource.query('DROP TABLE IF EXISTS seller_channel_accounts CASCADE');
    await AppDataSource.query('DROP TABLE IF EXISTS payment_settlements CASCADE');

    logger.info('[Dropshipping Core] All data purged');
  } else {
    logger.info('[Dropshipping Core] Data preserved (keep-data mode)');
  }

  logger.info('[Dropshipping Core] Uninstallation complete');
}

async function confirmPurge(): Promise<boolean> {
  // TODO: Implement confirmation UI or CLI prompt
  return false;
}
EOF
```

#### Step 6: Update API Server Imports

```bash
# Update apps/api-server/src/routes/index.ts
cat > apps/api-server/src/routes/index.ts << 'EOF'
import { Router } from 'express';
import {
  sellerRoutes,
  supplierRoutes,
  adminDropshippingRoutes,
  sellerAuthorizationRoutes,
  cptDropshippingRoutes,
} from '@o4o/dropshipping-core';

const router = Router();

// Register dropshipping routes
router.use('/api/v2/seller', sellerRoutes);
router.use('/api/v2/supplier', supplierRoutes);
router.use('/api/admin/dropshipping', adminDropshippingRoutes);
router.use('/api/admin/seller-authorization', sellerAuthorizationRoutes);
router.use('/api/cpt/dropshipping', cptDropshippingRoutes);

export default router;
EOF

# Update apps/api-server/src/database/connection.ts
cat > apps/api-server/src/database/connection.ts << 'EOF'
import { DataSource } from 'typeorm';
import { dropshippingEntities } from '@o4o/dropshipping-core';
import { forumEntities } from '@o4o/forum-app';
// ... other imports

export const AppDataSource = new DataSource({
  type: 'postgres',
  // ... config
  entities: [
    ...dropshippingEntities,
    ...forumEntities,
    // ... other entities
  ],
});
EOF
```

#### Step 7: Test Core Package

```bash
# Run tests
cd packages/dropshipping-core
pnpm test

# Build package
pnpm build

# Verify exports
node -e "console.log(require('./dist/index.js'))"
```

---

### 3.2 Phase 2: Extension Creation (Week 3-4)

#### Step 1: Create Cosmetics Extension

```bash
# 1. Create package structure
mkdir -p packages/dropshipping-cosmetics/src/{acf,admin-ui,main-site,services,lifecycle,config}

# 2. Initialize package.json
cd packages/dropshipping-cosmetics
pnpm init

# 3. Add Core dependency
pnpm add @o4o/dropshipping-core

# 4. Create manifest (see Section 2.1)
cat > src/manifest.ts << 'EOF'
# (Copy cosmetics manifest from Section 2.1)
EOF

# 5. Create ACF fields
cat > src/acf/cosmetic-fields.ts << 'EOF'
# (Copy ACF fields from Section 2.1)
EOF

# 6. Create admin UI overrides
mkdir -p src/admin-ui/pages
cat > src/admin-ui/pages/CosmeticsProductEditor.tsx << 'EOF'
import React from 'react';
import { CoreProductEditor } from '@o4o/dropshipping-core/admin-ui';
import { CosmeticMetadataFields } from '../components/CosmeticMetadataFields';

export default function CosmeticsProductEditor() {
  return (
    <CoreProductEditor
      extraFields={<CosmeticMetadataFields />}
      onSave={handleCosmeticSave}
    />
  );
}

async function handleCosmeticSave(product: any) {
  // Validate cosmetics-specific fields
  if (!product.metadata?.cosmetic?.skinType) {
    throw new Error('피부 타입을 선택하세요');
  }

  // Call core save
  await CoreProductEditor.defaultSave(product);
}
EOF

# 7. Create lifecycle install
cat > src/lifecycle/install.ts << 'EOF'
import { CommissionPolicy } from '@o4o/dropshipping-core';
import logger from '@o4o/logger';

export async function install() {
  logger.info('[Cosmetics Extension] Installing...');

  // Seed cosmetics-specific commission policies
  await CommissionPolicy.create({
    policyCode: 'COSMETICS-LUXURY-2025',
    name: '럭셔리 코스메틱 특별 커미션',
    policyType: 'CATEGORY',
    category: '럭셔리 코스메틱',
    commissionType: 'PERCENTAGE',
    commissionRate: 15,
    priority: 100,
    status: 'ACTIVE',
  });

  logger.info('[Cosmetics Extension] Installation complete');
}
EOF
```

#### Step 2: Test Extension Installation

```bash
# Build extension
pnpm build

# Install extension on staging
cd apps/api-server
pnpm add @o4o/dropshipping-cosmetics

# Run installation
node -e "
const { install } = require('@o4o/dropshipping-cosmetics/lifecycle');
install().then(() => console.log('Extension installed'));
"

# Test admin UI
# Navigate to https://admin.neture.co.kr/dropshipping/products
# Verify cosmetics metadata fields appear
```

---

### 3.3 Phase 3: Multi-Extension Testing (Week 5)

**Create Pharmacy and Travel Extensions (same structure as Cosmetics)**

**Test Extension Switching:**

```bash
# Test 1: Install Cosmetics only
pnpm add @o4o/dropshipping-cosmetics
# Verify: Cosmetics metadata fields visible
# Verify: Pharmacy/Travel fields NOT visible

# Test 2: Install Pharmacy only
pnpm remove @o4o/dropshipping-cosmetics
pnpm add @o4o/dropshipping-pharmacy
# Verify: Pharmacy metadata fields visible
# Verify: Cosmetics/Travel fields NOT visible

# Test 3: Install all three
pnpm add @o4o/dropshipping-cosmetics @o4o/dropshipping-pharmacy @o4o/dropshipping-travel
# Verify: All metadata fields visible
# Verify: No conflicts
```

---

### 3.4 Phase 4: Production Deployment (Week 6)

#### Pre-Deployment Checklist

- [ ] Full database backup completed
- [ ] Core package tested on staging (unit, integration, E2E)
- [ ] All extensions tested on staging
- [ ] Performance tests passed
- [ ] User acceptance testing completed
- [ ] Rollback plan documented
- [ ] Deployment runbook created
- [ ] Team notified of deployment schedule

#### Deployment Steps

```bash
# 1. Full database backup
pg_dump o4o_production > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Deploy Core to production
cd packages/dropshipping-core
pnpm build
pnpm publish --access public

# 3. Update API server
cd apps/api-server
pnpm add @o4o/dropshipping-core@latest
pnpm build
pm2 restart o4o-api-server

# 4. Monitor for errors
pm2 logs o4o-api-server --lines 100

# 5. Deploy Admin Dashboard
cd apps/admin-dashboard
pnpm build
./deploy-admin-manual.sh

# 6. Verify deployment
curl -s https://api.neture.co.kr/api/v2/seller/catalog | jq
curl -s https://admin.neture.co.kr/version.json

# 7. Deploy Extensions (one by one)
cd packages/dropshipping-cosmetics
pnpm publish --access public

cd apps/api-server
pnpm add @o4o/dropshipping-cosmetics@latest
pnpm build
pm2 restart o4o-api-server

# Monitor and verify each extension
```

#### Rollback Plan

```bash
# If critical issues occur:

# 1. Stop services
pm2 stop o4o-api-server

# 2. Restore database
psql o4o_production < backup_TIMESTAMP.sql

# 3. Revert package versions
cd apps/api-server
pnpm add @o4o/dropshipping-core@<old-version>
pnpm build

# 4. Restart services
pm2 restart o4o-api-server

# 5. Verify rollback
curl -s https://api.neture.co.kr/health
```

---

## Section 4: Service-Specific Requirements Matrix

| Feature | Core | Cosmetics | Pharmacy | Travel |
|---------|------|-----------|----------|--------|
| **Product Entity** | ✓ | metadata | metadata | metadata |
| **Supplier Entity** | ✓ | - | license info | - |
| **Seller Entity** | ✓ | specialties | license required | expertise |
| **Authorization Workflow** | ✓ | auto-approve beauty | pharmacy license check | - |
| **Commission Calculation** | ✓ | luxury bonus | prescription fee | international bonus |
| **Settlement Period** | monthly | monthly | monthly | weekly |
| **Product Categories** | - | skincare, makeup | medication types | tours, flights |
| **Metadata Fields** | - | skin type, ingredients | dosage, contraindications | destinations, schedule |
| **UI Customization** | base | beauty theme | medical theme | travel theme |
| **Search Filters** | base | skin type, concerns | medication type, age | destination, dates |
| **Inventory Management** | quantity-based | quantity-based | prescription-based | booking-based |
| **Pricing** | tier-based | tier-based | tier-based | dynamic (season) |
| **Additional Features** | - | routine builder | prescription upload | booking calendar |

---

## Section 5: Implementation Checklist

### Core Package Checklist

#### Backend

- [ ] All 18 entities moved to `packages/dropshipping-core/src/backend/entities`
- [ ] All 13+ services moved to `packages/dropshipping-core/src/backend/services`
- [ ] All controllers moved to `packages/dropshipping-core/src/backend/controllers`
- [ ] All routes moved to `packages/dropshipping-core/src/backend/routes`
- [ ] CPT definitions moved to `packages/dropshipping-core/src/backend/cpt`
- [ ] ACF definitions moved to `packages/dropshipping-core/src/backend/acf`
- [ ] Schemas moved to `packages/dropshipping-core/src/backend/schemas`
- [ ] Types moved to `packages/dropshipping-core/src/types`
- [ ] Migrations converted to SQL and moved to `packages/dropshipping-core/src/migrations`

#### Frontend

- [ ] Admin dashboard pages moved to `packages/dropshipping-core/src/admin-ui/pages`
- [ ] Admin dashboard components moved to `packages/dropshipping-core/src/admin-ui/components`
- [ ] Main site components moved to `packages/dropshipping-core/src/main-site/components`
- [ ] Main site pages moved to `packages/dropshipping-core/src/main-site/pages`

#### Infrastructure

- [ ] `manifest.ts` created
- [ ] `lifecycle/install.ts` created
- [ ] `lifecycle/activate.ts` created
- [ ] `lifecycle/deactivate.ts` created
- [ ] `lifecycle/uninstall.ts` created
- [ ] `package.json` configured
- [ ] `tsconfig.json` configured
- [ ] `README.md` written
- [ ] `CHANGELOG.md` initialized

#### Testing

- [ ] Unit tests for all entities
- [ ] Unit tests for all services
- [ ] Integration tests for workflows
- [ ] E2E tests for seller workflow
- [ ] E2E tests for supplier workflow
- [ ] E2E tests for partner workflow
- [ ] Performance tests for commission calculation
- [ ] Performance tests for settlement generation

#### Documentation

- [ ] API documentation (`docs/API.md`)
- [ ] Entity documentation (`docs/ENTITIES.md`)
- [ ] Service documentation (`docs/SERVICES.md`)
- [ ] Extension guide (`docs/EXTENSION_GUIDE.md`)

---

### Extension Package Checklist (Cosmetics)

- [ ] Package structure created (`packages/dropshipping-cosmetics`)
- [ ] `manifest.ts` created with dependencies
- [ ] ACF fields defined (`src/acf/cosmetic-fields.ts`)
- [ ] Admin UI overrides created (`src/admin-ui/pages/CosmeticsProductEditor.tsx`)
- [ ] Main site components created
- [ ] `lifecycle/install.ts` created (seed data)
- [ ] Default configuration defined (`src/config/defaultConfig.ts`)
- [ ] Integration tests written
- [ ] Documentation written (`README.md`)
- [ ] Package published to registry

**Repeat for Pharmacy and Travel Extensions**

---

### API Server Integration Checklist

- [ ] Import Core entities in `apps/api-server/src/database/connection.ts`
- [ ] Import Core routes in `apps/api-server/src/routes/index.ts`
- [ ] Import Core manifest in `apps/api-server/src/app-manifests/appsCatalog.ts`
- [ ] Remove old entity files from `apps/api-server/src/entities`
- [ ] Remove old service files from `apps/api-server/src/services`
- [ ] Remove old migration files from `apps/api-server/src/database/migrations`
- [ ] Update imports across codebase (`@o4o/dropshipping-core`)
- [ ] Run build and verify no errors
- [ ] Run tests and verify all pass

---

### Admin Dashboard Integration Checklist

- [ ] Remove old pages from `apps/admin-dashboard/src/pages/dropshipping`
- [ ] Remove old components from `apps/admin-dashboard/src/components/shortcodes/dropshipping`
- [ ] Import Core pages in routing configuration
- [ ] Import Core components in component registry
- [ ] Update imports across codebase
- [ ] Run build and verify no errors
- [ ] Test UI in browser

---

### Main Site Integration Checklist

- [ ] Remove old components from `apps/main-site/src/components/shortcodes`
- [ ] Remove old pages from `apps/main-site/src/pages/dashboard`
- [ ] Import Core components
- [ ] Update imports across codebase
- [ ] Run build and verify no errors
- [ ] Test UI in browser

---

### Deployment Checklist

#### Pre-Deployment

- [ ] Full database backup
- [ ] Staging deployment tested
- [ ] User acceptance testing passed
- [ ] Performance benchmarks passed
- [ ] Rollback plan documented
- [ ] Team trained on new structure
- [ ] Deployment runbook created

#### Deployment

- [ ] Core package published to registry
- [ ] API server updated with Core package
- [ ] Admin dashboard updated
- [ ] Main site updated
- [ ] Services restarted
- [ ] Health checks passed
- [ ] Extensions deployed (Cosmetics, Pharmacy, Travel)
- [ ] Monitoring enabled

#### Post-Deployment

- [ ] Smoke tests passed
- [ ] User acceptance testing in production
- [ ] Performance monitoring (no degradation)
- [ ] Error monitoring (no critical errors)
- [ ] Data integrity verified (settlements, commissions)
- [ ] User feedback collected
- [ ] Documentation updated

---

**Status:** Migration plan complete
**Ready for Implementation:** Yes
**Estimated Timeline:** 6 weeks
**Risk Level:** Medium-High (due to production-critical financial operations)
**Recommendation:** Proceed with phased approach, comprehensive testing, and rollback readiness

# Phase B Round 1: Core Candidate Discovery & Assessment

**Date**: 2025-12-14
**Branch**: `feature/cms-core`
**Methodology**: Platform-wide full scan (not pre-defined list)

---

## 1. Core Candidates Identified

### 1.1 App Package Cores (with manifest, appType: 'core')

| Module | Reason |
|--------|--------|
| auth-core | Owns users, roles, permissions tables; Foundation for all auth |
| platform-core | Owns app_registry, settings; Platform infrastructure |
| cms-core | CMS engine; templates, CPT, ACF, views, menus, media |
| organization-core | Organization hierarchy; members; org-scoped permissions |
| forum-core (forum-app) | Community board engine; posts, comments, categories |
| lms-core | Learning management; courses, enrollments, certificates |
| dropshipping-core | Multi-vendor marketplace; supplier/seller/product/order |
| ecommerce-core | Order/payment source of truth; allowPurge: false |
| digital-signage-core | Signage management; media, displays, schedules |
| partner-core | Partner/affiliate system |
| pharmaceutical-core | Pharmacy operations system |
| diabetes-core | Diabetes care system |

### 1.2 Infrastructure Packages (no manifest, Core-like behavior)

| Module | Reason |
|--------|--------|
| types | Platform-wide type definitions; MOST imported (14 packages) |
| utils | Utility functions; shared across platform |
| ui | Shared UI components |
| auth-client | Client-side auth library; used by all frontends |
| auth-context | React auth context provider |
| appearance-system | Theme/design token system |
| block-core | Block editor core (BlockRegistry, BlockManager) |
| block-renderer | Block rendering engine |
| cpt-registry | CPT registration system; schema, validators |
| shortcodes | Shortcode system; registry, parser, renderer |
| slide-app | Slide/presentation system |

### 1.3 API Server Embedded Modules

| Module | Reason |
|--------|--------|
| modules/auth | Authentication/RBAC implementation; entities, services |
| modules/user | User management endpoints |
| modules/cms | CMS backend implementation |
| modules/cpt-acf | CPT/ACF implementation |
| modules/sites | Multi-site management |
| module-loader.ts | AppStore app loading system |

### 1.4 Global Registries & Services

| Module | Reason |
|--------|--------|
| NavigationRegistry | Dynamic menu system (cms-core/view-system) |
| DynamicRouter | Dynamic routing system (cms-core/view-system) |
| ViewRegistry | View component registration (cms-core/view-system) |
| service-templates | Service provisioning templates |
| init-packs | Service initialization packages |
| appsCatalog | App catalog registry |

---

## 2. Core App Structure Assessment

### [Core App: auth-core]

- **Responsibility**: User authentication, RBAC, role/permission management
- **Data Ownership**:
  - users, roles, permissions, role_permissions
  - user_roles, linked_accounts, refresh_tokens, login_attempts
- **Public APIs**: /api/v1/auth/*
- **Dependencies**: None (foundation layer)
- **Extension Points**: User events, role assignment hooks
- **Service Usage**: Required by ALL services
- **Lifecycle**: install, activate, deactivate, uninstall
- **Critical**: allowPurge: false (system tables)

---

### [Core App: platform-core]

- **Responsibility**: App registry, platform settings, activity logging
- **Data Ownership**: app_registry, settings, account_activities
- **Public APIs**: /api/v1/platform/*
- **Dependencies**: auth-core
- **Extension Points**: App lifecycle events, settings change events
- **Service Usage**: Required by ALL services
- **Lifecycle**: install, activate, deactivate, uninstall
- **Critical**: allowPurge: false (system tables)

---

### [Core App: cms-core]

- **Responsibility**: CMS engine - templates, CPT, ACF, views, menus, media
- **Data Ownership**:
  - cms_templates, cms_template_parts, cms_views
  - cms_cpt_types, cms_cpt_fields
  - cms_acf_field_groups, cms_acf_fields, cms_acf_values
  - cms_settings, cms_menus, cms_menu_items, cms_menu_locations
  - cms_media, cms_media_files, cms_media_folders, cms_media_tags
- **Public APIs**: /api/v1/cms/*
- **Dependencies**: None
- **Extension Points**:
  - NavigationRegistry (dynamic menus)
  - DynamicRouter (dynamic routes)
  - ViewRegistry (view components)
- **Service Usage**: GlobalCore in all service templates
- **Lifecycle**: install, activate, deactivate, uninstall
- **Note**: Contains view-system infrastructure

---

### [Core App: organization-core]

- **Responsibility**: Organization hierarchy, members, org-scoped permissions
- **Data Ownership**: organizations, organization_members, organization_units, organization_roles
- **Public APIs**: /api/v1/organizations/*
- **Dependencies**: None
- **Extension Points**: Org events, member events
- **Service Usage**: GlobalCore in all service templates
- **Lifecycle**: install, activate, deactivate, uninstall
- **Note**: Base for membership-yaksa, reporting-yaksa extensions

---

### [Core App: forum-core (forum-app)]

- **Responsibility**: Community board engine - posts, comments, categories, tags
- **Data Ownership**: forum_post, forum_category, forum_comment, forum_tag, forum_like, forum_bookmark
- **Public APIs**: /api/v1/forum/*
- **Dependencies**: Optional: organization-core
- **Extension Points**: Post events, comment events, CPT definitions
- **Service Usage**: Platform-core, yaksa-branch templates
- **Lifecycle**: install, activate, deactivate, uninstall
- **Note**: Has viewTemplates for public pages

---

### [Core App: lms-core]

- **Responsibility**: Learning management - courses, enrollments, progress, certificates
- **Data Ownership**: lms_courses, lms_lessons, lms_enrollments, lms_progress, lms_certificates, lms_events, lms_attendance, lms_content_bundles
- **Public APIs**: /api/v1/lms/*
- **Dependencies**: organization-core
- **Extension Points**: Course events, enrollment events, certificate events
- **Service Usage**: Platform-core, yaksa-branch templates
- **Lifecycle**: install, activate, deactivate, uninstall
- **Note**: Has both admin and member pages

---

### [Core App: dropshipping-core]

- **Responsibility**: Multi-vendor marketplace - supplier/seller/product/order/settlement
- **Data Ownership**:
  - dropshipping_suppliers, dropshipping_sellers
  - dropshipping_product_masters, dropshipping_supplier_product_offers
  - dropshipping_seller_listings, dropshipping_order_relays
  - dropshipping_settlement_batches, dropshipping_commission_rules
  - dropshipping_commission_transactions
- **Public APIs**: /api/v1/dropshipping/*
- **Dependencies**: organization-core
- **Extension Points**: Product events, order events, settlement events
- **Service Usage**: cosmetics-retail, sellerops-universal templates
- **Lifecycle**: install, activate, deactivate, uninstall
- **Note**: Extended by dropshipping-cosmetics

---

### [Core App: ecommerce-core]

- **Responsibility**: Order/payment source of truth - unified sales ledger
- **Data Ownership**: ecommerce_orders, ecommerce_order_items, ecommerce_payments
- **Public APIs**: /api/v1/ecommerce/*
- **Dependencies**: organization-core
- **Extension Points**: Order events, payment events
- **Service Usage**: Platform-core; referenced by all commerce apps
- **Lifecycle**: install, activate, deactivate, uninstall
- **Critical**: allowPurge: false (ledger data)
- **Note**: Source of truth for ALL order types (retail, dropshipping, b2b, subscription)

---

### [Core App: digital-signage-core]

- **Responsibility**: Digital signage management - media, displays, schedules
- **Data Ownership**: signage_media_source, signage_media_list, signage_media_list_item, signage_display, signage_display_slot, signage_schedule, signage_action_execution
- **Public APIs**: /api/v1/signage/*
- **Dependencies**: platform-core, cms-core
- **Extension Points**: Schedule events, action events
- **Service Usage**: signage-retail template
- **Lifecycle**: Has lifecycle hooks

---

### [Infrastructure: types]

- **Responsibility**: Platform-wide TypeScript type definitions
- **Data Ownership**: None (type definitions only)
- **Public APIs**: Export types for: auth, api, app-manifest, cpt, ecommerce, menu, etc.
- **Dependencies**: None
- **Used By**: 14+ packages (MOST imported package)
- **Note**: Infrastructure Core - no manifest

---

### [Infrastructure: auth-client]

- **Responsibility**: Client-side authentication library
- **Data Ownership**: None (client-side only)
- **Public APIs**: AuthClient, useAuth hooks, RBAC helpers, SSO client
- **Dependencies**: types
- **Used By**: All frontend apps (admin-dashboard, main-site, ecommerce)
- **Note**: Infrastructure Core - no manifest

---

### [Infrastructure: auth-context]

- **Responsibility**: React authentication context provider
- **Data Ownership**: None (React context only)
- **Public APIs**: AuthProvider, AdminProtectedRoute, useAuth, SessionManager
- **Dependencies**: auth-client
- **Used By**: All React apps
- **Note**: Infrastructure Core - no manifest

---

### [Infrastructure: appearance-system]

- **Responsibility**: Theme and design token system
- **Data Ownership**: None (CSS/styling only)
- **Public APIs**: css-generators, tokens, inject
- **Dependencies**: None
- **Used By**: Admin dashboard, public sites
- **Note**: Visual Core - no manifest

---

### [Infrastructure: block-core]

- **Responsibility**: Block editor core engine
- **Data Ownership**: None (editor runtime only)
- **Public APIs**: BlockRegistry, BlockManager, PluginLoader
- **Dependencies**: types
- **Used By**: CMS editor, page builder
- **Note**: Editor Core - no manifest

---

### [Infrastructure: cpt-registry]

- **Responsibility**: Custom Post Type registration and validation
- **Data Ownership**: None (registry runtime only)
- **Public APIs**: registry, schema, validators, adapters
- **Dependencies**: types
- **Used By**: cms-core, forum-app, all CPT apps
- **Note**: CMS Infrastructure - no manifest

---

### [Infrastructure: shortcodes]

- **Responsibility**: Shortcode parsing and rendering system
- **Data Ownership**: None (parser runtime only)
- **Public APIs**: registry, parser, renderer, dynamic shortcodes
- **Dependencies**: types
- **Used By**: CMS content rendering, page templates
- **Note**: Content Core - no manifest

---

### [View System: cms-core/view-system]

- **Responsibility**: Dynamic navigation, routing, view registration
- **Components**:
  - NavigationRegistry: Menu structure management
  - DynamicRouter: Route registration and matching
  - ViewRegistry: View component registration
  - context-matcher: Context-based filtering
- **Dependencies**: None
- **Used By**: All apps via manifest registration
- **Note**: Platform Infrastructure within cms-core

---

## 3. Round 1 Summary Observations

### Observation 1: Two-Tier Core Architecture

The platform has two distinct tiers of Core:

**Tier 1 - Foundation Cores (allowPurge: false)**
- auth-core: User/Role/Permission foundation
- platform-core: App registry, settings
- ecommerce-core: Order/payment source of truth

**Tier 2 - Domain Cores (allowPurge: true)**
- cms-core, organization-core, forum-core, lms-core
- dropshipping-core, digital-signage-core
- partner-core, pharmaceutical-core, diabetes-core

### Observation 2: GlobalCore vs ServiceCore Pattern

Service templates define two types of Core dependencies:
- **globalCoreApps**: cms-core, organization-core (required by ALL services)
- **coreApps**: Service-specific cores (e.g., dropshipping-core for cosmetics)

### Observation 3: Infrastructure Packages Without Manifests

Critical infrastructure packages lack manifests:
- types (most imported), utils, ui
- auth-client, auth-context
- appearance-system, block-core, cpt-registry, shortcodes

These are de facto Core but not managed by AppStore.

### Observation 4: View System as Hidden Core

cms-core contains view-system infrastructure:
- NavigationRegistry (Task A)
- DynamicRouter (Task B)
- ViewRegistry

This is Core behavior embedded within a Core app.

### Observation 5: API Server Modules

Some Core functionality is embedded in api-server/src/modules:
- auth module (RoleAssignmentService)
- user module
- cms module
- cpt-acf module

These are not standalone packages but have Core-like responsibilities.

### Observation 6: Dependency Chains

Common dependency pattern:
```
auth-core (foundation)
    ↓
platform-core
    ↓
organization-core ← forum-core, lms-core, dropshipping-core
    ↓
ecommerce-core
```

### Observation 7: Extension Base Pattern

Several Cores serve as extension bases:
- organization-core → membership-yaksa, reporting-yaksa
- forum-core → forum-yaksa, forum-cosmetics
- lms-core → lms-yaksa, lms-marketing
- dropshipping-core → dropshipping-cosmetics, sellerops, supplierops

---

## 4. Files Scanned

| Category | Files |
|----------|-------|
| Package manifests | 40 manifest.ts files |
| Lifecycle hooks | 80+ lifecycle/*.ts files |
| Service templates | 8 JSON templates |
| API modules | 6 module directories |
| Infrastructure packages | 11 packages |
| Global registries | 5 registry systems |

---

*Generated: 2025-12-14*
*Branch: feature/cms-core*
*Phase: B Round 1 (Core Candidate Discovery)*

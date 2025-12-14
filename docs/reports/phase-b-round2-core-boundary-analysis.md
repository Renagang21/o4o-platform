# Phase B Round 2: Core ↔ Core Boundary & Overlap Analysis

**Date**: 2025-12-14
**Branch**: `feature/cms-core`
**Methodology**: Pair-wise comparison of manifests, entities, dependencies

---

## 1. Tier 1: Foundation Core Pairs

### [Core Pair: auth-core ↔ organization-core]

| Aspect | auth-core | organization-core |
|--------|-----------|-------------------|
| **Responsibility** | User authentication, RBAC, role/permission management | Organization hierarchy, members, org-scoped permissions |
| **Data Ownership** | `users`, `roles`, `permissions`, `role_permissions`, `user_roles`, `linked_accounts`, `refresh_tokens`, `login_attempts` | `organizations`, `organization_members`, `organization_units`, `organization_roles` |
| **Dependencies** | None (foundation) | None (foundation) |
| **allowPurge** | false | true |

**Findings**:

1. **Responsibility Overlap**:
   - `RoleAssignment` entity (organization-core) bridges auth and org by storing `scopeType` ('global' | 'organization') and `scopeId`
   - `OrganizationMember.role` field duplicates concept with `auth-core` roles
   - organization-core has its own `organization_roles` table separate from `roles` table

2. **Data Ownership Conflict**:
   - `OrganizationMember.userId` references `auth-core.users.id` but without explicit FK
   - `RoleAssignment.userId` references `auth-core.users.id` without FK
   - No ManyToOne relation to User entity from organization-core (only column type uuid)

3. **Dependency Direction**:
   - Both declare `dependencies.core: []` - no explicit dependency
   - However, `organization-core` functionally depends on `auth-core` (userId references)
   - `RoleAssignment` extends auth concept to org scope

4. **Extension Base Consistency**:
   - `membership-yaksa` extends `organization-core`, not `auth-core`
   - User extensions (supplier, seller, partner) are on `auth-core` User entity

5. **Service Impact**:
   - All service templates use both cores implicitly via auth system
   - `RoleAssignmentService` (in api-server) bridges both cores

---

### [Core Pair: auth-core ↔ platform-core]

| Aspect | auth-core | platform-core |
|--------|-----------|---------------|
| **Responsibility** | User authentication, RBAC | App registry, platform settings, activity logging |
| **Data Ownership** | `users`, `roles`, `permissions`, etc. | `app_registry`, `settings`, `account_activities` |
| **Dependencies** | None | `core: ['auth-core']` |
| **allowPurge** | false | false |

**Findings**:

1. **Responsibility Overlap**:
   - `account_activities` logs user actions - touches auth domain
   - Activity logging crosses auth boundary (login events)

2. **Data Ownership Conflict**:
   - `AccountActivity` likely references `userId` from auth-core
   - No explicit overlap in tables

3. **Dependency Direction**:
   - platform-core explicitly depends on auth-core
   - Correct direction: platform uses auth for user references

4. **Extension Base Consistency**:
   - No extensions for platform-core
   - Clean separation

5. **Service Impact**:
   - Both are Foundation tier, used by ALL services
   - platform-core handles app lifecycle; auth-core handles access control

---

### [Core Pair: platform-core ↔ organization-core]

| Aspect | platform-core | organization-core |
|--------|---------------|-------------------|
| **Responsibility** | App registry, settings, activity logging | Organization hierarchy, members |
| **Data Ownership** | `app_registry`, `settings`, `account_activities` | `organizations`, `organization_members`, etc. |
| **Dependencies** | `auth-core` | None |
| **allowPurge** | false | true |

**Findings**:

1. **Responsibility Overlap**:
   - Both could manage "organization-scoped settings"
   - `platform-core.settings` is global; no org-scoped settings
   - No direct overlap

2. **Data Ownership Conflict**:
   - None identified

3. **Dependency Direction**:
   - No explicit dependency between them
   - organization-core could depend on platform-core for settings
   - Currently independent

4. **Extension Base Consistency**:
   - Different extension chains: platform has none, org has membership/reporting

5. **Service Impact**:
   - platform-core manages what apps are installed
   - organization-core manages who belongs where
   - Both are in `globalCoreApps` for some service templates

---

### [Core Pair: platform-core ↔ cms-core]

| Aspect | platform-core | cms-core |
|--------|---------------|----------|
| **Responsibility** | App registry, settings | CMS engine (templates, CPT, ACF, menus, media) |
| **Data Ownership** | `app_registry`, `settings`, `account_activities` | 17 tables: `cms_templates`, `cms_cpt_*`, `cms_acf_*`, `cms_menus*`, `cms_media*` |
| **Dependencies** | `auth-core` | None |
| **allowPurge** | false | true |

**Findings**:

1. **Responsibility Overlap**:
   - `platform-core.settings` vs `cms-core.cms_settings`
   - Both provide settings storage - different scopes
   - platform_core: global platform; cms_core: CMS-specific

2. **Data Ownership Conflict**:
   - Potential confusion: where do "platform settings" vs "cms settings" go?
   - No actual FK conflicts

3. **Dependency Direction**:
   - No explicit dependency
   - cms-core used in `globalCoreApps` alongside organization-core
   - platform-core manages cms-core's installation status

4. **Extension Base Consistency**:
   - cms-core is extended by view-system infrastructure (NavigationRegistry, DynamicRouter)
   - No Extension apps, but contains registries that all apps use

5. **Service Impact**:
   - cms-core in `globalCoreApps` for cosmetics-retail, yaksa-branch, etc.
   - platform-core indirectly affects cms-core via app lifecycle

---

### [Core Pair: ecommerce-core ↔ dropshipping-core]

| Aspect | ecommerce-core | dropshipping-core |
|--------|----------------|-------------------|
| **Responsibility** | Order/payment source of truth (판매 원장) | Multi-vendor marketplace workflow |
| **Data Ownership** | `ecommerce_orders`, `ecommerce_order_items`, `ecommerce_payments` | `dropshipping_suppliers`, `dropshipping_sellers`, `dropshipping_product_masters`, `dropshipping_supplier_product_offers`, `dropshipping_seller_listings`, `dropshipping_order_relays`, `dropshipping_settlement_batches`, `dropshipping_commission_*` |
| **Dependencies** | `organization-core` | `organization-core` |
| **allowPurge** | false | true |

**Findings**:

1. **Responsibility Overlap**:
   - Both manage "orders" but at different levels
   - `EcommerceOrder` is the source of truth
   - `OrderRelay` references `ecommerceOrderId` (nullable FK)
   - Clear design: ecommerce-core = ledger, dropshipping-core = workflow

2. **Data Ownership Conflict**:
   - `OrderRelay.ecommerceOrderId` references `EcommerceOrder.id`
   - `EcommerceOrder.orderType = 'dropshipping'` routes to dropshipping-core
   - **Issue**: `OrderRelay` has duplicate `ecommerceOrderId` column (lines 48-49 and 55-61)

3. **Dependency Direction**:
   - Both depend on organization-core
   - dropshipping-core should depend on ecommerce-core (not declared)
   - Implicit dependency via `ecommerceOrderId` FK

4. **Extension Base Consistency**:
   - dropshipping-core → dropshipping-cosmetics, sellerops, supplierops
   - ecommerce-core → no extensions yet (retail-core, b2b-core future)

5. **Service Impact**:
   - dropshipping-core in `coreApps` for cosmetics-retail
   - ecommerce-core not explicitly in templates but essential for orders
   - **Missing**: ecommerce-core should be explicit in cosmetics-retail

---

## 2. Tier 2: Domain Core Pairs

### [Core Pair: organization-core ↔ membership-yaksa]

| Aspect | organization-core | membership-yaksa |
|--------|-------------------|------------------|
| **Responsibility** | Generic organization hierarchy | Yaksa-specific member management |
| **Data Ownership** | `organizations`, `organization_members`, etc. | `yaksa_members`, `yaksa_member_*`, `yaksa_membership_*` |
| **Type** | core | extension |
| **Dependencies** | None | `organization-core` |

**Findings**:

1. **Responsibility Overlap**:
   - `OrganizationMember` (core) vs `YaksaMember` (extension)
   - Both track user-organization relationships
   - membership-yaksa adds Yaksa-specific fields (license, verification)

2. **Data Ownership Conflict**:
   - `YaksaMemberAffiliation` likely duplicates `OrganizationMember` concept
   - Potential for data inconsistency between org_members and yaksa_members

3. **Dependency Direction**:
   - Correct: extension depends on core

4. **Extension Base Consistency**:
   - Clean extension pattern

5. **Service Impact**:
   - yaksa-branch template uses membership-yaksa

---

### [Core Pair: organization-core ↔ forum-core]

| Aspect | organization-core | forum-core |
|--------|-------------------|------------|
| **Responsibility** | Organization hierarchy | Forum posts, comments, categories |
| **Data Ownership** | `organizations`, `organization_members` | `forum_post`, `forum_category`, `forum_comment`, `forum_tag`, `forum_like`, `forum_bookmark` |
| **Dependencies** | None | `optional: ['organization-core']` |

**Findings**:

1. **Responsibility Overlap**:
   - forum-core can be org-scoped (optional dependency)
   - `organization-forum` extension bridges them

2. **Data Ownership Conflict**:
   - Forum posts may need `organizationId` for scoping
   - Not visible in forum-core tables

3. **Dependency Direction**:
   - forum-core has optional dependency on organization-core
   - Allows standalone or org-scoped operation

4. **Extension Base Consistency**:
   - forum-core → forum-yaksa, forum-cosmetics
   - organization-forum bridges org+forum

5. **Service Impact**:
   - Both in platform-core template
   - organization-forum in yaksa-branch, cosmetics-retail

---

### [Core Pair: forum-core ↔ cms-core]

| Aspect | forum-core | cms-core |
|--------|------------|----------|
| **Responsibility** | Forum posts, comments | CMS templates, CPT, ACF, menus, media |
| **Data Ownership** | `forum_*` tables | `cms_*` tables |
| **Dependencies** | optional: organization-core | None |

**Findings**:

1. **Responsibility Overlap**:
   - Forum posts are like CPT items
   - forum-core defines own `cpt: [forum_post, forum_category]`
   - Could theoretically use cms-core CPT system instead

2. **Data Ownership Conflict**:
   - None - separate table namespaces

3. **Dependency Direction**:
   - No dependency between them
   - Both independent cores

4. **Extension Base Consistency**:
   - forum-core has viewTemplates (forum-home, post-list, post-single)
   - cms-core has viewTemplates (templates-list, cpt-list, etc.)
   - Both use same template pattern

5. **Service Impact**:
   - cms-core in globalCoreApps
   - forum-core in coreApps for specific services

---

### [Core Pair: lms-core ↔ cms-core]

| Aspect | lms-core | cms-core |
|--------|----------|----------|
| **Responsibility** | Learning management (courses, enrollments) | CMS engine (templates, CPT, ACF) |
| **Data Ownership** | `lms_courses`, `lms_lessons`, `lms_enrollments`, `lms_progress`, `lms_certificates`, `lms_events`, `lms_attendance`, `lms_content_bundles` | `cms_*` tables |
| **Dependencies** | `organization-core` | None |

**Findings**:

1. **Responsibility Overlap**:
   - LMS courses could be CPT items
   - LMS has own entity structure separate from CMS
   - `ContentBundle` could use CMS media system

2. **Data Ownership Conflict**:
   - None - separate namespaces

3. **Dependency Direction**:
   - lms-core depends on organization-core (for org-scoped courses)
   - No dependency on cms-core

4. **Extension Base Consistency**:
   - lms-core → lms-yaksa, lms-marketing
   - Uses own page structure, not cms templates

5. **Service Impact**:
   - lms-core in yaksa-branch coreApps
   - cms-core in globalCoreApps

---

### [Core Pair: dropshipping-core ↔ sellerops]

| Aspect | dropshipping-core | sellerops |
|--------|-------------------|-----------|
| **Responsibility** | Multi-vendor marketplace engine | Seller operations portal |
| **Data Ownership** | `dropshipping_*` tables | No own tables (uses dropshipping-core) |
| **Type** | core | extension/service |
| **Dependencies** | `organization-core` | `dropshipping-core` |

**Findings**:

1. **Responsibility Overlap**:
   - sellerops is a UI/workflow layer over dropshipping-core
   - No data overlap

2. **Data Ownership Conflict**:
   - None - sellerops consumes dropshipping-core data

3. **Dependency Direction**:
   - Correct: sellerops depends on dropshipping-core

4. **Extension Base Consistency**:
   - sellerops, supplierops, partnerops extend dropshipping-core functionality

5. **Service Impact**:
   - Both in cosmetics-retail template

---

## 3. Tier 3: Infrastructure ↔ App Core Pairs

### [Core Pair: types ↔ all cores]

| Aspect | types | All Core Apps |
|--------|-------|---------------|
| **Role** | Type definitions | Domain logic |
| **Data Ownership** | None | Own tables |
| **Has Manifest** | No | Yes |
| **Used By** | 14+ packages | Varies |

**Findings**:

1. **Responsibility**:
   - types provides shared type definitions
   - All cores import from types

2. **Dependency Direction**:
   - types is foundation - no dependencies
   - All packages depend on types

3. **Gap**:
   - types has no manifest - not managed by AppStore
   - No lifecycle hooks

---

### [Core Pair: auth-client/auth-context ↔ auth-core]

| Aspect | auth-client + auth-context | auth-core |
|--------|---------------------------|-----------|
| **Role** | Client-side auth library | Server-side auth |
| **Data Ownership** | None (browser only) | `users`, `roles`, etc. |
| **Dependencies** | `@o4o/types`, `axios` | None |

**Findings**:

1. **Responsibility**:
   - auth-client: API calls, token management, RBAC helpers
   - auth-context: React context provider
   - auth-core: Backend entities, services, routes

2. **Dependency Direction**:
   - auth-client → types (explicit)
   - auth-client → auth-core (implicit, via API)

3. **Gap**:
   - No manifest for auth-client/auth-context
   - Tightly coupled to auth-core but not declared

---

### [Core Pair: appearance-system ↔ cms-core]

| Aspect | appearance-system | cms-core |
|--------|-------------------|----------|
| **Role** | Design tokens, CSS variables | CMS engine |
| **Data Ownership** | None | `cms_*` tables |
| **Has Manifest** | No | Yes |

**Findings**:

1. **Responsibility**:
   - appearance-system: Visual SSOT (design tokens)
   - cms-core: Content management including templates

2. **Overlap**:
   - Both relate to "how things look"
   - cms-core templates could reference appearance-system tokens
   - No explicit connection in manifests

3. **Gap**:
   - No manifest for appearance-system
   - Could be part of cms-core or separate infrastructure

---

### [Core Pair: block-core ↔ cms-core]

| Aspect | block-core | cms-core |
|--------|------------|----------|
| **Role** | Block editor core engine | CMS engine |
| **Data Ownership** | None (runtime only) | `cms_*` tables |
| **Has Manifest** | No | Yes |

**Findings**:

1. **Responsibility**:
   - block-core: BlockRegistry, BlockManager, PluginLoader
   - cms-core: Stores templates, CPT, ACF

2. **Overlap**:
   - block-core provides editing experience
   - cms-core provides storage
   - Natural separation of concerns

3. **Gap**:
   - No manifest for block-core
   - Should be infrastructure within cms-core?

---

### [Core Pair: cpt-registry ↔ cms-core]

| Aspect | cpt-registry | cms-core |
|--------|--------------|----------|
| **Role** | CPT registration and validation | CPT storage and management |
| **Data Ownership** | None (runtime) | `cms_cpt_types`, `cms_cpt_fields` |
| **Has Manifest** | No | Yes |

**Findings**:

1. **Responsibility**:
   - cpt-registry: Schema, validators, adapters
   - cms-core: Database storage of CPT definitions

2. **Overlap**:
   - Both deal with CPT
   - Registry handles runtime; core handles persistence

3. **Gap**:
   - cpt-registry should be part of cms-core infrastructure
   - Or declared as cms-core dependency

---

## 4. Summary Observations

### Observation 1: Missing Dependencies

Several implicit dependencies are not declared in manifests:

| From | To | Evidence |
|------|-----|----------|
| dropshipping-core | ecommerce-core | `OrderRelay.ecommerceOrderId` |
| organization-core | auth-core | `OrganizationMember.userId`, `RoleAssignment.userId` |
| sellerops | ecommerce-core | Uses orders |

### Observation 2: Infrastructure Without Manifests

11 packages behave as Core but lack manifests:

- types, utils, ui
- auth-client, auth-context
- appearance-system, block-core, block-renderer
- cpt-registry, shortcodes, slide-app

### Observation 3: Duplicate Concepts

| Concept | Core A | Core B | Notes |
|---------|--------|--------|-------|
| Roles | auth-core (roles table) | organization-core (organization_roles) | Different scopes |
| Members | auth-core (users) | organization-core (organization_members) | Mapping table |
| Settings | platform-core (settings) | cms-core (cms_settings) | Different scopes |
| Orders | ecommerce-core | dropshipping-core (order_relays) | Ledger vs workflow |

### Observation 4: Extension Patterns

Consistent extension patterns observed:

```
organization-core → membership-yaksa, reporting-yaksa
forum-core → forum-yaksa, forum-cosmetics
lms-core → lms-yaksa, lms-marketing
dropshipping-core → dropshipping-cosmetics, sellerops, supplierops
```

### Observation 5: Code Duplication

`OrderRelay.entity.ts` has duplicate `ecommerceOrderId` column definition (lines 48-49 and 55-61).

---

## 5. Files Examined

| Category | Files |
|----------|-------|
| Manifests | 6 core manifests, 4 extension manifests |
| Entities | User, Organization, OrganizationMember, RoleAssignment, EcommerceOrder, OrderRelay |
| Service Templates | platform-core.json, cosmetics-retail.json, yaksa-branch.json |
| Infrastructure | types, auth-client, appearance-system package.json |

---

*Generated: 2025-12-14*
*Branch: feature/cms-core*
*Phase: B Round 2 (Core ↔ Core Boundary & Overlap Analysis)*

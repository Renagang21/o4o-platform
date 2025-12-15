# Phase C Round 1: Service & App Full Inventory Assessment

**Date:** 2025-12-15
**Branch:** develop
**Scope:** Full platform inventory (zero-miss goal)

---

## [Service Inventory]

### 1. Cosmetics Retail Service
- **ServiceGroup:** cosmetics
- **Status:** 운영중 (Active)
- **Templates/InitPacks:** cosmetics-retail / cosmetics-retail-init
- **Main Apps Used:**
  - Core: dropshipping-core, cms-core, organization-core, ecommerce-core
  - Extension: dropshipping-cosmetics, cosmetics-partner-extension, cosmetics-seller-extension, cosmetics-supplier-extension, cosmetics-sample-display-extension
  - Feature: sellerops, supplierops, partnerops
- **Notes:** Primary commerce service. Influencer routines, product recommendations, skin type filters enabled.

### 2. Yaksa Branch Service
- **ServiceGroup:** yaksa
- **Status:** 운영중 (Active)
- **Templates/InitPacks:** yaksa-branch / yaksa-branch-init
- **Main Apps Used:**
  - Core: cms-core, organization-core, forum-core, lms-core
  - Extension: membership-yaksa, forum-yaksa, reporting-yaksa, lms-yaksa, annualfee-yaksa, yaksa-scheduler
  - Feature: organization-forum
- **Notes:** Pharmacist organization intranet. Member verification, annual reporting, license validation enabled.

### 3. Platform Core Service
- **ServiceGroup:** platform-core
- **Status:** 운영중 (Active)
- **Templates/InitPacks:** platform-core / (no init-pack)
- **Main Apps Used:**
  - Core: cms-core, organization-core, forum-core
  - Feature: organization-forum
- **Notes:** Base platform infrastructure. Auto-install disabled (manual setup required).

### 4. Tourist Service
- **ServiceGroup:** tourist
- **Status:** 개발중 (Development)
- **Templates/InitPacks:** tourist-service / tourist-service-init
- **Main Apps Used:**
  - Core: dropshipping-core, cms-core, organization-core
  - Extension: signage
- **Notes:** Multi-language and location services enabled. Template exists but no tourist-specific apps implemented yet.

### 5. Partner Operations Service
- **ServiceGroup:** partnerops
- **Status:** 운영중 (Active)
- **Templates/InitPacks:** partnerops-service / (no init-pack)
- **Main Apps Used:**
  - Core: dropshipping-core, cms-core, organization-core
  - Feature: partnerops
- **Notes:** Affiliate link tracking, commission management. Default commission rate 5%.

### 6. Digital Signage Service
- **ServiceGroup:** signage
- **Status:** 운영중 (Active)
- **Templates/InitPacks:** signage-retail / (no init-pack)
- **Main Apps Used:**
  - Core: cms-core, digital-signage-core
  - Standalone: signage
- **Notes:** Display scheduling, multi-display support. Agent app exists (digital-signage-agent).

### 7. SellerOps Universal Service
- **ServiceGroup:** sellerops
- **Status:** 운영중 (Active)
- **Templates/InitPacks:** sellerops-universal / (no init-pack)
- **Main Apps Used:**
  - Core: dropshipping-core, cms-core, organization-core
  - Feature: sellerops, supplierops, partnerops
- **Notes:** Multi-vendor marketplace, settlement dashboard, order tracking enabled.

### 8. SupplierOps Universal Service
- **ServiceGroup:** supplierops
- **Status:** 운영중 (Active)
- **Templates/InitPacks:** supplierops-universal / (no init-pack)
- **Main Apps Used:**
  - Core: dropshipping-core, cms-core, organization-core
  - Feature: supplierops, partnerops
- **Notes:** Product catalog, offer management, settlement enabled.

### 9. Diabetes Care Pharmacy Service
- **ServiceGroup:** diabetes-care-pharmacy
- **Status:** 개발중 (Development)
- **Templates/InitPacks:** (none yet)
- **Main Apps Used:**
  - Core: diabetes-core, pharmaceutical-core
  - Extension: diabetes-pharmacy, health-extension, pharmacyops
- **Notes:** Service group defined in AppStore catalog. Apps exist but no service template yet.

### 10. Hospital Service
- **ServiceGroup:** hospital
- **Status:** 계획 (Planned, not implemented)
- **Templates/InitPacks:** (none)
- **Main Apps Used:** (none)
- **Notes:** Service group defined in service-groups/index.ts but no implementation exists.

### 11. B2B Education Service
- **ServiceGroup:** b2b-education
- **Status:** 계획 (Planned, not implemented)
- **Templates/InitPacks:** (none)
- **Main Apps Used:** (none)
- **Notes:** Service group defined in service-groups/index.ts but no implementation exists.

### 12. LMS Marketing Service
- **ServiceGroup:** global (cross-service)
- **Status:** 개발중 (Development)
- **Templates/InitPacks:** (none - global feature)
- **Main Apps Used:**
  - Core: lms-core
  - Extension: lms-marketing
- **Notes:** Quiz campaigns, survey campaigns, product content. Available across all service groups.

### 13. Market Trial Service
- **ServiceGroup:** cosmetics
- **Status:** 실험 (Experimental)
- **Templates/InitPacks:** (none)
- **Main Apps Used:**
  - Core: dropshipping-core
  - Extension: market-trial
- **Notes:** Package.json explicitly marked as experimental. Market trial/testing functionality.

---

## [App Inventory]

### Infrastructure Core Packages (11)

| App Name | Location | Has manifest | App Type | AppStore Registered | Used By Services | Notes |
|----------|----------|--------------|----------|---------------------|------------------|-------|
| @o4o/types | packages/types | No | infra-core | No | All | Type definitions |
| @o4o/utils | packages/utils | No | infra-core | No | All | Utility functions |
| @o4o/ui | packages/ui | No | infra-core | No | All | UI components |
| @o4o/auth-client | packages/auth-client | No | infra-core | No | All | Auth client library |
| @o4o/auth-context | packages/auth-context | No | infra-core | No | All | React auth context |
| @o4o/appearance-system | packages/appearance-system | No | infra-core | No | All | Theming system |
| @o4o/block-core | packages/block-core | No | infra-core | No | CMS services | Block editor core |
| @o4o/block-renderer | packages/block-renderer | No | infra-core | No | CMS services | Block rendering |
| @o4o/cpt-registry | packages/cpt-registry | No | infra-core | No | CMS services | CPT registration |
| @o4o/shortcodes | packages/shortcodes | No | infra-core | No | CMS services | Shortcode system |
| @o4o/slide-app | packages/slide-app | No | infra-core | No | CMS services | Slide presentations |

### Foundation Core Apps (6) - @status FROZEN in manifests

| App Name | Location | Has manifest | App Type | AppStore Registered | Used By Services | Notes |
|----------|----------|--------------|----------|---------------------|------------------|-------|
| @o4o-apps/cms-core | packages/cms-core | Yes | core | Yes | All | CMS V2 engine |
| @o4o/auth-core | packages/auth-core | Yes | core | No (implicit) | All | Authentication core |
| @o4o/organization-core | packages/organization-core | Yes | core | Yes | All org services | Organization management |
| @o4o/platform-core | packages/platform-core | Yes | core | No (implicit) | All | Platform infrastructure |
| @o4o-apps/forum | packages/forum-app | Yes | core | Yes (forum-core) | yaksa, platform | Forum core functionality |
| @o4o/lms-core | packages/lms-core | Yes | core | Yes | yaksa, education | LMS core functionality |

### Commerce Core Apps (3)

| App Name | Location | Has manifest | App Type | AppStore Registered | Used By Services | Notes |
|----------|----------|--------------|----------|---------------------|------------------|-------|
| @o4o/dropshipping-core | packages/dropshipping-core | Yes | core | Yes | cosmetics, tourist, operations | Dropshipping engine |
| @o4o/ecommerce-core | packages/ecommerce-core | Yes | core | Yes | All commerce | Order/payment core |
| @o4o/partner-core | packages/partner-core | Yes | core | No | partnerops | Partner management core |

### Health/Pharma Core Apps (3)

| App Name | Location | Has manifest | App Type | AppStore Registered | Used By Services | Notes |
|----------|----------|--------------|----------|---------------------|------------------|-------|
| @o4o/pharmaceutical-core | packages/pharmaceutical-core | Yes | core | No | diabetes-pharmacy, pharmacyops | Pharma regulations |
| @o4o/diabetes-core | packages/diabetes-core | No | core | No | diabetes-pharmacy | CGM/diabetes management |
| @o4o-apps/digital-signage-core | packages/digital-signage-core | Yes | core | No | signage | Signage infrastructure |

### Yaksa Organization Extensions (7)

| App Name | Location | Has manifest | App Type | AppStore Registered | Used By Services | Notes |
|----------|----------|--------------|----------|---------------------|------------------|-------|
| @o4o/membership-yaksa | packages/membership-yaksa | Yes | extension | Yes | yaksa | Member verification |
| @o4o-apps/forum-yaksa | packages/forum-yaksa | Yes | extension | Yes | yaksa | Forum extension |
| @o4o/reporting-yaksa | packages/reporting-yaksa | Yes | extension | Yes | yaksa | Annual reporting |
| @o4o/lms-yaksa | packages/lms-yaksa | Yes | extension | Yes | yaksa | LMS extension |
| @o4o/annualfee-yaksa | packages/annualfee-yaksa | Yes | extension | No | yaksa | Annual fee management |
| @o4o/yaksa-scheduler | packages/yaksa-scheduler | Yes | extension | Yes | yaksa | Scheduling system |
| @o4o-extensions/organization-lms | packages/organization-lms | Yes | extension | No | yaksa | Org-LMS integration |

### Cosmetics Extensions (5)

| App Name | Location | Has manifest | App Type | AppStore Registered | Used By Services | Notes |
|----------|----------|--------------|----------|---------------------|------------------|-------|
| @o4o/dropshipping-cosmetics | packages/dropshipping-cosmetics | Yes | extension | Yes | cosmetics | Cosmetics dropshipping |
| @o4o/cosmetics-partner-extension | packages/cosmetics-partner-extension | Yes | extension | Yes | cosmetics | Partner/influencer |
| @o4o/cosmetics-seller-extension | packages/cosmetics-seller-extension | Yes | extension | No | cosmetics | Seller extension |
| @o4o/cosmetics-supplier-extension | packages/cosmetics-supplier-extension | Yes | extension | No | cosmetics | Supplier extension |
| @o4o/cosmetics-sample-display-extension | packages/cosmetics-sample-display-extension | Yes | extension | No | cosmetics | Sample display |

### Operations Apps (4)

| App Name | Location | Has manifest | App Type | AppStore Registered | Used By Services | Notes |
|----------|----------|--------------|----------|---------------------|------------------|-------|
| @o4o/sellerops | packages/sellerops | Yes | feature | Yes | cosmetics, sellerops | Seller operations |
| @o4o/supplierops | packages/supplierops | Yes | feature | Yes | cosmetics, supplierops | Supplier operations |
| @o4o/partnerops | packages/partnerops | Yes | feature | Yes | cosmetics, partnerops | Partner operations |
| @o4o/pharmacyops | packages/pharmacyops | Yes | feature | No | diabetes-pharmacy | Pharmacy operations |

### Health Extensions (3)

| App Name | Location | Has manifest | App Type | AppStore Registered | Used By Services | Notes |
|----------|----------|--------------|----------|---------------------|------------------|-------|
| @o4o/diabetes-pharmacy | packages/diabetes-pharmacy | Yes | extension | No | diabetes-pharmacy | Pharmacy diabetes care |
| @o4o/health-extension | packages/health-extension | Yes | extension | No | diabetes-pharmacy | Health features |
| @o4o/partner-ai-builder | packages/partner-ai-builder | Yes | extension | No | cosmetics | AI content generation |

### Integration/Cross-Service Apps (3)

| App Name | Location | Has manifest | App Type | AppStore Registered | Used By Services | Notes |
|----------|----------|--------------|----------|---------------------|------------------|-------|
| @o4o-extensions/organization-forum | packages/organization-forum | Yes | feature | Yes | yaksa, platform | Org-Forum integration |
| @o4o-extensions/lms-marketing | packages/lms-marketing | Yes | extension | Yes | global | Marketing LMS |
| @o4o-apps/forum-cosmetics | packages/forum-cosmetics | Yes | extension | No | cosmetics | Cosmetics forum |

### Standalone/Special Apps (3)

| App Name | Location | Has manifest | App Type | AppStore Registered | Used By Services | Notes |
|----------|----------|--------------|----------|---------------------|------------------|-------|
| @o4o-apps/signage | packages/@o4o-apps/signage | Yes | standalone | Yes | signage | Digital signage |
| @o4o/market-trial | packages/market-trial | Yes | extension | Yes | cosmetics | Experimental |
| @o4o/supplier-connector | packages/supplier-connector | No | utility | No | supplierops | Supplier integration |

### Legacy Frontend Modules (3)

| App Name | Location | Has manifest | App Type | AppStore Registered | Used By Services | Notes |
|----------|----------|--------------|----------|---------------------|------------------|-------|
| @o4o-apps/admin | packages/admin | No | frontend-module | No | (legacy) | Legacy admin UI |
| @o4o-apps/commerce | packages/commerce | No | frontend-module | No | (legacy) | Legacy commerce UI |
| @o4o-apps/customer | packages/customer | No | frontend-module | No | (legacy) | Legacy customer UI |

### Utility Packages (2)

| App Name | Location | Has manifest | App Type | AppStore Registered | Used By Services | Notes |
|----------|----------|--------------|----------|---------------------|------------------|-------|
| @o4o/digital-signage-contract | packages/digital-signage-contract | No | utility | No | signage | Agent-core contract |
| @o4o/design-system-cosmetics | packages/design-system-cosmetics | No | utility | No | cosmetics | Design tokens (new) |

### Application-Level Apps (/apps directory - 9)

| App Name | Location | Has manifest | App Type | AppStore Registered | Used By Services | Notes |
|----------|----------|--------------|----------|---------------------|------------------|-------|
| @o4o/admin-dashboard | apps/admin-dashboard | No | application | No | All | Admin frontend |
| @o4o/api-server | apps/api-server | No | application | No | All | API backend |
| @o4o/api-gateway | apps/api-gateway | No | application | No | All | API proxy |
| @o4o/main-site | apps/main-site | No | application | No | All | Public frontend |
| @o4o/ecommerce | apps/ecommerce | No | application | No | cosmetics | E-commerce frontend |
| @o4o/mobile-app | apps/mobile-app | No | application | No | All | Mobile app (Capacitor) |
| @o4o/page-generator | apps/page-generator | No | application | No | cms-core | AI page generation |
| @o4o/digital-signage-agent | apps/digital-signage-agent | No | application | No | signage | Device agent |
| o4o-integration | apps/vscode-extension | No | tool | No | dev | VSCode extension |

---

## [Service-App Mapping]

### Cosmetics Retail Service
- **Required Apps:** cms-core, organization-core, dropshipping-core, ecommerce-core, dropshipping-cosmetics
- **Optional Apps:** cosmetics-partner-extension, cosmetics-seller-extension, cosmetics-supplier-extension, cosmetics-sample-display-extension, sellerops, supplierops, partnerops, signage, partner-ai-builder, market-trial, forum-cosmetics
- **Applications:** admin-dashboard, api-server, main-site, ecommerce

### Yaksa Branch Service
- **Required Apps:** cms-core, organization-core, forum-core, lms-core, membership-yaksa
- **Optional Apps:** forum-yaksa, reporting-yaksa, lms-yaksa, annualfee-yaksa, yaksa-scheduler, organization-forum, organization-lms
- **Applications:** admin-dashboard, api-server, main-site

### Platform Core Service
- **Required Apps:** cms-core, organization-core, forum-core
- **Optional Apps:** organization-forum
- **Applications:** admin-dashboard, api-server, main-site

### Digital Signage Service
- **Required Apps:** cms-core, digital-signage-core, signage
- **Optional Apps:** (none)
- **Applications:** admin-dashboard, api-server, digital-signage-agent

### Diabetes Care Pharmacy Service
- **Required Apps:** diabetes-core, pharmaceutical-core, diabetes-pharmacy
- **Optional Apps:** health-extension, pharmacyops
- **Applications:** admin-dashboard, api-server, main-site

### Operations Services (SellerOps/SupplierOps/PartnerOps)
- **Required Apps:** dropshipping-core, cms-core, organization-core
- **Optional Apps:** sellerops, supplierops, partnerops
- **Applications:** admin-dashboard, api-server

---

## [Unused/Orphan Apps]

Apps not clearly associated with any active service:

| App Name | Location | Reason | Recommendation |
|----------|----------|--------|----------------|
| @o4o-apps/admin | packages/admin | Legacy frontend module | Confirm deprecation |
| @o4o-apps/commerce | packages/commerce | Legacy frontend module | Confirm deprecation |
| @o4o-apps/customer | packages/customer | Legacy frontend module | Confirm deprecation |
| apps/funding | apps/funding | Empty directory (no package.json) | Remove or populate |
| apps/healthcare | apps/healthcare | Empty directory (no package.json) | Remove or populate |
| @o4o/design-system-cosmetics | packages/design-system-cosmetics | New, untracked directory | Verify purpose |

---

## Summary Statistics

| Category | Count |
|----------|-------|
| **Total Services Identified** | 13 |
| - 운영중 (Active) | 8 |
| - 개발중 (Development) | 3 |
| - 실험 (Experimental) | 1 |
| - 계획 (Planned) | 2 |
| **Total Packages** | 54 |
| - Infrastructure Core | 11 |
| - Foundation Core | 6 |
| - Commerce/Health Core | 6 |
| - Extensions | 22 |
| - Feature Apps | 4 |
| - Standalone | 3 |
| - Legacy | 3 |
| - Utility | 2 |
| **Total /apps Applications** | 9 |
| **AppStore Registered Apps** | 30 |
| **Packages with manifest.ts** | 35 |
| **Orphan/Unused Apps** | 6 |

---

## Key Observations (Facts Only)

1. **Service Template Coverage:** 8 templates exist for 8 active services. 2 service groups (hospital, b2b-education) are defined but have no templates or apps.

2. **Init Pack Coverage:** Only 3 init-packs exist (cosmetics-retail-init, yaksa-branch-init, tourist-service-init). Other services have no init-pack.

3. **AppStore Registration Gap:** 35 packages have manifest.ts but only 30 are registered in AppStore catalog. Some extensions (annualfee-yaksa, cosmetics-seller-extension, etc.) are not in catalog.

4. **Legacy Modules:** 3 frontend modules (admin, commerce, customer) have no manifest.ts and appear to be legacy.

5. **Empty Directories:** 2 directories in /apps (funding, healthcare) have no package.json.

6. **Experimental Status:** Only 1 package (market-trial) is explicitly marked as experimental.

7. **Infrastructure Core Pattern:** 11 packages are infrastructure-level with no manifest.ts and marked as infra-core.

8. **Foundation Core Freeze:** cms-core, auth-core, platform-core, organization-core have @status FROZEN markers in manifests.

---

*Generated: 2025-12-15 | Phase C Round 1 Complete*

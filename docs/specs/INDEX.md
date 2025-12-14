# App Specifications Index

> 최종 업데이트: 2025-12-13 (E-commerce Core Phase 1)
> 총 문서: 43개

---

## Apps Overview

| App | Type | Docs | Description |
|-----|------|------|-------------|
| [cms](./cms/) | Core | 1 | CMS engine |
| [cosmetics](./cosmetics/) | Extension | 4 | Cosmetics store |
| [cpt-acf](./cpt-acf/) | Core | 5 | Custom Post Types & Fields |
| [dropshipping](./dropshipping/) | Core | 4 | Dropshipping system |
| [ecommerce-core](./ecommerce-core/) | Core | 3 | E-commerce engine **(NEW)** |
| [forum](./forum/) | Core | 5 | Forum system |
| [organization](./organization/) | Core | 8 | Organization management |
| [partnerops](./partnerops/) | Extension | 4 | Partner operations |
| [sellerops](./sellerops/) | Extension | 4 | Seller operations |
| [signage](./signage/) | Standalone | 3 | Digital signage |
| [tourist](./tourist/) | Service | 3 | Tourist app

---

## CMS (1 doc)

- [engine-spec.md](./cms/engine-spec.md) - CMS engine specification

## Cosmetics (4 docs)

- [README.md](./cosmetics/README.md) - Overview
- [cosmetics-overview.md](./cosmetics/cosmetics-overview.md) - App overview
- [cosmetics-product.md](./cosmetics/cosmetics-product.md) - Product spec
- [cosmetics-storefront.md](./cosmetics/cosmetics-storefront.md) - Storefront spec

## CPT-ACF (5 docs)

- [cpt-acf-overview.md](./cpt-acf/cpt-acf-overview.md) - System overview
- [presets-spec.md](./cpt-acf/presets-spec.md) - Presets specification
- [route-matrix.md](./cpt-acf/route-matrix.md) - Route matrix
- [cleanup-plan.md](./cpt-acf/cleanup-plan.md) - Cleanup plan **(ARCHIVED)**
- [investigation.md](./cpt-acf/investigation.md) - Investigation report **(ARCHIVED)**

## Dropshipping (4 docs)

- [dropshipping-overview.md](./dropshipping/dropshipping-overview.md) - App overview
- [api-contract.md](./dropshipping/api-contract.md) - API contract
- [db-inventory.md](./dropshipping/db-inventory.md) - Database schema
- [investigation.md](./dropshipping/investigation.md) - Investigation summary

## E-commerce Core (3 docs) **(NEW)**

- [INDEX.md](./ecommerce-core/INDEX.md) - Spec index
- [phase1-design-order-boundary.md](./ecommerce-core/phase1-design-order-boundary.md) - Phase 1 Order 책임 경계 설계
- [responsibility-boundary.md](./ecommerce-core/responsibility-boundary.md) - 책임 경계 요약

## Forum (5 docs)

- [forum-overview.md](./forum/forum-overview.md) - App overview
- [app-structure.md](./forum/app-structure.md) - App structure
- [cms-compatibility-audit.md](./forum/cms-compatibility-audit.md) - CMS audit **(ARCHIVED)**
- [cms-compatibility-result.md](./forum/cms-compatibility-result.md) - Audit result **(ARCHIVED)**
- [phase1-investigation.md](./forum/phase1-investigation.md) - Investigation summary

## Organization (8 docs)

- [api-design.md](./organization/api-design.md) - API design
- [app-manifest.md](./organization/app-manifest.md) - App manifest
- [core-overview.md](./organization/core-overview.md) - Core overview
- [entities.md](./organization/entities.md) - Entity definitions
- [extension-rules.md](./organization/extension-rules.md) - Extension rules
- [integration-map.md](./organization/integration-map.md) - Integration map
- [lifecycle-hooks.md](./organization/lifecycle-hooks.md) - Lifecycle hooks
- [rbac-scope.md](./organization/rbac-scope.md) - RBAC scope

## PartnerOps (4 docs)

- [partnerops-overview.md](./partnerops/partnerops-overview.md) - App overview
- [partnerops-api.md](./partnerops/partnerops-api.md) - API contract
- [partnerops-routines.md](./partnerops/partnerops-routines.md) - Routines specification
- [partnerops-events.md](./partnerops/partnerops-events.md) - Event handlers

## SellerOps (4 docs)

- [sellerops-overview.md](./sellerops/sellerops-overview.md) - App overview
- [sellerops-product-sync.md](./sellerops/sellerops-product-sync.md) - Product sync workflow
- [sellerops-settlement.md](./sellerops/sellerops-settlement.md) - Settlement dashboard
- [sellerops-events.md](./sellerops/sellerops-events.md) - Event handlers

## Signage (3 docs)

- [signage-overview.md](./signage/signage-overview.md) - App overview
- [signage-content.md](./signage/signage-content.md) - Content data model
- [signage-playback.md](./signage/signage-playback.md) - Playback system

## Tourist (3 docs)

- [tourist-overview.md](./tourist/tourist-overview.md) - App overview
- [tourist-order-flow.md](./tourist/tourist-order-flow.md) - Order and pickup flow
- [tourist-storefront.md](./tourist/tourist-storefront.md) - Storefront integration

---

## Document Status

| Status | Count | Description |
|--------|-------|-------------|
| ACTIVE | 39 | 현재 유효 문서 |
| ARCHIVED | 4 | 참고용 아카이브 |

---

## Related Documents

- [Architecture Overview](../design/architecture/)
- [App Guidelines](../app-guidelines/)
- [Document Standards](../_standards/)

---
*최종 업데이트: 2025-12-13*

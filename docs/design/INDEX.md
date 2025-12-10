# Architecture & Design Index

> 최종 업데이트: 2025-12-10 (Phase 14)
> 총 문서: 29개

---

## Categories

| Category | Docs | Description |
|----------|------|-------------|
| [admin](./admin/) | 1 | Admin UI design |
| [api-server](./api-server/) | 1 | API server structure |
| [appstore](./appstore/) | 2 | AppStore system |
| [architecture](./architecture/) | 9 | Core architecture **(+1 NEW)** |
| [auth](./auth/) | 1 | Authentication design |
| [blocks](./blocks/) | 2 | Block system |
| [frontend](./frontend/) | 6 | Frontend architecture |
| [platform](./platform/) | 5 | Platform features |

---

## Admin (1 doc)
- [header-builder-specs.md](./admin/header-builder-specs.md) - Header builder specification

## API Server (1 doc)
- [phase_b_module_structure_draft.md](./api-server/phase_b_module_structure_draft.md) - Module structure

## AppStore (2 docs)
- [manifest-schema-v1.md](./appstore/manifest-schema-v1.md) - Manifest schema v1
- [registry-schema.md](./appstore/registry-schema.md) - Registry schema

## Architecture (9 docs)

### Core Architecture
- [cms-overview.md](./architecture/cms-overview.md) - CMS 2.0 overview
- [appstore-overview.md](./architecture/appstore-overview.md) - AppStore overview **(UPDATED)**
- [module-loader-spec.md](./architecture/module-loader-spec.md) - Module Loader spec **(UPDATED)**
- [extension-lifecycle.md](./architecture/extension-lifecycle.md) - Extension lifecycle
- [view-system.md](./architecture/view-system.md) - View System **(UPDATED)**
- [multi-tenancy.md](./architecture/multi-tenancy.md) - Multi-Tenancy Architecture **(NEW)**

### Reference
- [api-server-requirements.md](./architecture/api-server-requirements.md) - API server requirements
- [editor-data-storage.md](./architecture/editor-data-storage.md) - Editor data storage
- [page-management.md](./architecture/page-management.md) - Page management **(ARCHIVED)**

## Auth (1 doc)
- [schema-design.md](./auth/schema-design.md) - Auth schema design

## Blocks (2 docs)
- [architecture.md](./blocks/architecture.md) - Block architecture
- [dynamic-blocks.md](./blocks/dynamic-blocks.md) - Dynamic blocks

## Frontend (6 docs)
- [component-registry.md](./frontend/component-registry.md) - Component registry
- [layout-system.md](./frontend/layout-system.md) - Layout system
- [routing-view-architecture.md](./frontend/routing-view-architecture.md) - Routing & view
- [shortcode-function-component.md](./frontend/shortcode-function-component.md) - Shortcode components
- [view-generator.md](./frontend/view-generator.md) - View generator
- [view-schema.md](./frontend/view-schema.md) - View schema

## Platform (5 docs)
- [antigravity-integration.md](./platform/antigravity-integration.md) - Antigravity integration
- [monitoring-logging.md](./platform/monitoring-logging.md) - Monitoring & logging
- [payment-gateway.md](./platform/payment-gateway.md) - Payment gateway
- [settlement-engine.md](./platform/settlement-engine.md) - Settlement engine
- [shadow-mode.md](./platform/shadow-mode.md) - Shadow mode

## Root (1 doc)
- [p1_rbac_enhancement.md](./p1_rbac_enhancement.md) - RBAC enhancement

---

## Phase 14 Changes

### Updated Documents
| 문서 | 변경 내용 |
|------|----------|
| view-system.md | View Registry, Navigation Registry, Dynamic Router 상세 설명 추가, Data Flow 다이어그램 보강 |
| module-loader-spec.md | ModuleLoader vs AppManager 역할 분리 도표 추가 |
| appstore-overview.md | ModuleLoader 연계 설명 보강, 상태 전환 다이어그램 추가 |

### New Documents
| 문서 | 설명 |
|------|------|
| multi-tenancy.md | Multi-Tenancy 아키텍처 설계 문서 |

---

## Related Specs (docs/specs/)

| 디렉토리 | 문서 | 설명 |
|----------|------|------|
| cms/ | cms-cpt-overview.md | CMS CPT 전체 개요 **(NEW)** |
| cms/ | cms-media-spec.md | Media CPT 상세 스펙 **(NEW)** |
| cms/ | cms-taxonomy-spec.md | Taxonomy 스펙 **(NEW)** |
| cms/ | engine-spec.md | CMS Engine 아키텍처 |

---

*최종 업데이트: 2025-12-10 (Phase 14 문서 리팩토링)*

# O4O Platform Documentation Index

> 최종 업데이트: 2025-12-10 (Phase 11-B)
> 총 문서: 약 140개

---

## Quick Navigation

| Category | Docs | Description |
|----------|------|-------------|
| [app-guidelines](./app-guidelines/INDEX.md) | 16 | App development rules |
| [specs](./specs/INDEX.md) | 26 | App specifications |
| [reference](./reference/INDEX.md) | 52 | Technical reference |
| [design](./design/INDEX.md) | 27 | Architecture & design |
| [plan](./plan/) | 5 | Active plans |
| [_standards](./_standards/) | 1 | Documentation standards |
| [_analysis](./_analysis/) | 5 | Audit & analysis reports |
| [archive](./archive/) | 3 | Archived documents |

---

## Directory Structure

```
docs/
├── _analysis/            # Audit & analysis reports (NEW)
├── _standards/           # Documentation standards
├── app-guidelines/       # Core/Extension/Service app rules
├── archive/              # Archived documents (NEW)
├── design/               # Architecture & system design
├── plan/active/apps/     # Current app development plans
├── reference/            # Technical reference docs
├── specs/                # App-specific specifications
└── README.md
```

---

## Core Architecture (Quick Start)

새 개발자가 읽어야 할 핵심 문서:

| Document | Description |
|----------|-------------|
| [cms-overview.md](./design/architecture/cms-overview.md) | CMS 2.0 구조 |
| [appstore-overview.md](./design/architecture/appstore-overview.md) | AppStore 시스템 |
| [module-loader-spec.md](./design/architecture/module-loader-spec.md) | Module Loader |
| [view-system.md](./design/architecture/view-system.md) | View System |
| [extension-lifecycle.md](./design/architecture/extension-lifecycle.md) | Lifecycle 훅 |

---

## By Category

### App Development (app-guidelines/)
Essential guides for developing apps on O4O Platform.
- [App Overview](./app-guidelines/app-overview.md) - 앱 개발 전체 흐름
- [Core App Development](./app-guidelines/core-app-development.md)
- [Extension App Guideline](./app-guidelines/extension-app-guideline.md)
- [Service App Guideline](./app-guidelines/service-app-guideline.md)
- [Manifest Guideline](./app-guidelines/manifest-guideline.md)
- [View Guideline](./app-guidelines/view-guideline.md)

### App Specifications (specs/)
Detailed specifications for each app domain.
- [CMS](./specs/cms/) - CMS engine spec
- [Cosmetics](./specs/cosmetics/) - Cosmetics store app
- [Dropshipping](./specs/dropshipping/) - Dropshipping core
- [Forum](./specs/forum/) - Forum system
- [Organization](./specs/organization/) - Organization management
- [CPT-ACF](./specs/cpt-acf/) - Custom Post Types & Fields

### Technical Reference (reference/)
API, authentication, blocks, and other technical docs.
- [Auth](./reference/auth/) - Authentication & authorization
- [API](./reference/api/) - API documentation
- [Blocks](./reference/blocks/) - Block development
- [Database](./reference/database/) - DB optimization
- [Analytics](./reference/analytics/) - Analytics system

### Architecture Design (design/)
System architecture and design documents.
- [Architecture](./design/architecture/) - Core architecture **(+5 NEW)**
- [AppStore](./design/appstore/) - App registry & manifest
- [Frontend](./design/frontend/) - Frontend architecture
- [Platform](./design/platform/) - Platform features

---

## For AI Agents

When referencing documentation:

```
# App development rules
docs/app-guidelines/

# App specifications
docs/specs/{app-id}/

# Technical reference
docs/reference/{topic}/

# Architecture design
docs/design/{domain}/
```

---

*최종 업데이트: 2025-12-10*

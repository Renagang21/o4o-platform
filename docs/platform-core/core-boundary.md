# Core Boundary (G2 Phase)

> **Status**: Active (Constitution Level)
> **Created**: 2025-12-25
> **Work Order**: WO-GEN-PLATFORM-APP-ARCH-G2
> **Phase**: G2 - App Architecture Fixation

---

## 1. Overview

This document defines the **boundary between Core and Domain services** in the O4O Platform.
It establishes what belongs to Core API and what must be implemented as separate App API servers.

---

## 2. Core API Definition

### 2.1 What is Core?

**Core** refers to the platform-level shared infrastructure that all domain services depend on.
It is the **single source of truth** for cross-cutting concerns.

### 2.2 Core API Service

| Item | Value |
|------|-------|
| **Service Name** | o4o-core-api |
| **Deployment** | Cloud Run (asia-northeast3) |
| **Status** | Operational (G1-2 confirmed) |
| **URL** | https://o4o-core-api-*.run.app |

---

## 3. Core Responsibilities (Fixed)

### 3.1 Core Domains

| Domain | Endpoints | Notes |
|--------|-----------|-------|
| **Authentication** | `/api/v1/auth/*` | Login, OAuth, token refresh |
| **Authorization** | `/api/v1/auth/verify` | JWT verification, role check |
| **User Management** | `/api/v1/users/*` | User CRUD, profile |
| **Role & Permission** | `/api/v1/roles/*` | Role assignment |
| **Organization** | `/api/v1/organizations/*` | Org structure (R3.5) |
| **App Registry** | `/api/v1/appstore/*` | App lifecycle |
| **Settings** | `/api/v1/settings/*` | Platform config |
| **Health** | `/health`, `/api/health` | Status monitoring |

### 3.2 Core Database Tables

These tables are **owned by Core API**:

```
users, roles, permissions, role_assignments
refresh_tokens, login_attempts, linked_accounts
organizations, organization_members
apps, app_instances, app_registry
settings, smtp_settings
```

### 3.3 FROZEN Cores

The following are **FROZEN** and cannot be modified:

| Core | Status | Notes |
|------|--------|-------|
| auth-core | FROZEN | Authentication logic |
| cms-core | FROZEN | CMS base structure |
| platform-core | FROZEN | Platform foundation |
| organization-core | FROZEN | Org structure |

---

## 4. Domain Boundaries (What is NOT Core)

### 4.1 Domain Services

These are **NOT part of Core API** and must be separate:

| Domain | Service | Reason |
|--------|---------|--------|
| **Forum** | forum-api | Domain-specific logic |
| **E-commerce** | shop-api | Domain-specific logic |
| **LMS** | lms-api | Domain-specific logic |
| **Signage** | signage-api | Domain-specific logic |
| **Cosmetics** | cosmetics-api | Vertical market |
| **Yaksa** | yaksa-api | Vertical market |

### 4.2 Why Separate?

1. **Independent scaling** - Domain load varies
2. **Independent deployment** - Domain changes don't affect Core
3. **Clear ownership** - Domain team owns their service
4. **Failure isolation** - Domain failure doesn't crash Core

---

## 5. Interaction Rules

### 5.1 Domain → Core

```
ALLOWED:
- Domain API calls Core API via REST
- Domain API verifies JWT through Core API
- Domain API reads user data from Core API

FORBIDDEN:
- Domain API directly queries Core database
- Domain API modifies Core tables
- Domain API bypasses Core authentication
```

### 5.2 Domain → Domain

```
ALLOWED:
- Domain A calls Domain B via REST API
- Domain A emits events, Domain B subscribes

FORBIDDEN:
- Domain A queries Domain B database directly
- Domain A modifies Domain B tables
```

### 5.3 Core → Domain

```
ALLOWED:
- Core API calls Domain API via REST (rare)
- Core API emits events, Domain subscribes

FORBIDDEN:
- Core depends on Domain service availability
- Core imports Domain packages
```

---

## 6. Package Boundary Rules

### 6.1 Allowed Dependencies

```
packages/auth-client    -> Used by Web Servers (frontend)
packages/types          -> Shared types (any)
packages/utils          -> Shared utilities (any)
packages/ui             -> UI components (frontend only)
```

### 6.2 Forbidden Dependencies

```
apps/api-server -> packages/forum-core (FORBIDDEN)
apps/api-server -> packages/cosmetics-* (FORBIDDEN)
packages/forum-core -> apps/api-server direct import (FORBIDDEN)
```

### 6.3 Package Type Ownership

| Type | Owner | Import Rule |
|------|-------|-------------|
| `*-core` | Core API or Domain API | Owned service only |
| `*-extension` | Domain API | Extending service |
| `*-client` | Any frontend | Public API |

---

## 7. Service Creation Rules

### 7.1 When to Create New Service

Create a new App API service when:

1. **New domain** - Fundamentally different business area
2. **Scale requirement** - Need independent scaling
3. **Team ownership** - Different team will maintain
4. **Data isolation** - Separate database needed

### 7.2 When NOT to Create

Do NOT create a new service when:

1. **Can be a module** - Logic can live in existing service
2. **No DB needs** - Pure computation, use existing service
3. **Temporary feature** - Short-lived functionality

### 7.3 New Service Checklist

Before creating a new App API:

- [ ] Domain boundary clearly defined
- [ ] Core API dependency identified
- [ ] Database schema designed (if any)
- [ ] Authentication flow documented
- [ ] Deployment plan ready (Cloud Run config)
- [ ] Naming follows convention: `o4o-{domain}-api`

---

## 8. Summary Matrix

| Action | Core API | App API | Web Server |
|--------|----------|---------|------------|
| Own users table | Yes | No | No |
| Own domain table | No | Yes | No |
| Direct DB access | Yes | Yes (own) | No |
| Implement auth | Yes | No (delegate) | No |
| Call Core API | N/A | Yes | Yes |
| Call App API | Rare | Yes | Yes |

---

## 9. Reference

- [CLAUDE.md](../../CLAUDE.md) - Platform Constitution
- [app-api-architecture.md](./app-api-architecture.md) - App API Rules
- [web-server-architecture.md](./web-server-architecture.md) - Web Server Rules
- [app-structure-boundary.md](./app-structure-boundary.md) - Package Boundaries

---

*This document is part of the G2 Phase - App Architecture Fixation.*
*It is subordinate to CLAUDE.md and defines the Core/Domain service boundary.*

# App API Server Architecture (G2 Phase)

> **Status**: Active (Constitution Level)
> **Created**: 2025-12-25
> **Work Order**: WO-GEN-PLATFORM-APP-ARCH-G2
> **Phase**: G2 - App Architecture Fixation

---

## 1. Overview

This document defines the **mandatory architecture** for all App API servers in the O4O Platform.
Any deviation from these rules requires explicit approval and documentation.

---

## 2. Server Types (Fixed)

### 2.1 Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                    Core API (o4o-core-api)                  │
│  - Authentication/Authorization                             │
│  - User Management                                          │
│  - Platform-level Services                                  │
│  - Cloud SQL (PostgreSQL) Direct Access                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ REST API / JWT
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    App API Servers                          │
│  - Domain-specific business logic                           │
│  - Calls Core API for auth/user                             │
│  - May have own database (domain-specific)                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ REST API
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Web Servers (Frontend)                   │
│  - Static assets (HTML, JS, CSS)                            │
│  - API calls to Core API / App API                          │
│  - No direct database access                                │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Server Type Definitions

| Type | Definition | Example |
|------|------------|---------|
| **Core API** | Platform-level shared services | o4o-core-api |
| **App API** | Domain-specific business API | forum-api, shop-api |
| **Web Server** | Frontend application server | admin-dashboard, main-site |
| **Gateway** | (Optional) API routing/aggregation | api-gateway |

---

## 3. Core API Boundary (Fixed)

### 3.1 Core API Responsibilities

The Core API (`o4o-core-api`) is the **single source of truth** for:

| Domain | Responsibility |
|--------|----------------|
| **Authentication** | Login, logout, token refresh, OAuth |
| **Authorization** | Role/permission verification |
| **User Management** | User CRUD, profile, linked accounts |
| **App Registry** | App installation, activation, lifecycle |
| **Platform Settings** | System configuration |
| **Organization** | Organization structure (Phase R3.5) |

### 3.2 Core API Exclusions

The Core API **does NOT handle**:

- Domain-specific business logic (forum, shop, LMS)
- Domain-specific data models
- High-frequency domain operations

---

## 4. App API Server Rules (Mandatory)

### 4.1 Authentication Delegation

```
❌ FORBIDDEN: App API implements own authentication
✅ REQUIRED:  App API delegates to Core API

Flow:
1. Client sends JWT to App API
2. App API verifies JWT with Core API (/api/v1/auth/verify)
3. App API receives user context
4. App API performs domain operation
```

### 4.2 Database Access Rules

| Scenario | Allowed | Notes |
|----------|---------|-------|
| App API → Core API Database | ❌ | Must use REST API |
| App API → Own Database | ✅ | Domain-specific only |
| App API → Shared Read Replica | ⚠️ | Requires explicit approval |

### 4.3 Inter-Service Communication

```
❌ FORBIDDEN: App API → App API direct database query
✅ ALLOWED:   App API → App API via REST API
✅ ALLOWED:   App API → Core API via REST API
```

### 4.4 Required Endpoints

Every App API **must** implement:

| Endpoint | Purpose |
|----------|---------|
| `/health` | Liveness check |
| `/health/ready` | Readiness check (including dependencies) |
| `/metrics` | (Optional) Prometheus metrics |

---

## 5. Deployment Rules (GCP Fixed)

### 5.1 Cloud Run Configuration

All App API servers follow this standard:

```yaml
# Standard Cloud Run settings
platform: managed
region: asia-northeast3
memory: 512Mi - 2Gi (based on load)
cpu: 1-2
min-instances: 0
max-instances: 10
concurrency: 80
timeout: 300s
```

### 5.2 Environment Variables (Required)

| Variable | Purpose |
|----------|---------|
| `NODE_ENV` | production / development |
| `PORT` | Auto-set by Cloud Run (8080) |
| `CORE_API_URL` | Core API endpoint URL |
| `JWT_SECRET` | (If verifying locally) |
| `GRACEFUL_STARTUP` | true/false |

### 5.3 Naming Convention

```
Service Name: o4o-{domain}-api
Examples:
  - o4o-forum-api
  - o4o-shop-api
  - o4o-lms-api
```

---

## 6. Allowed / Forbidden Summary

### 6.1 Allowed Actions

| Action | Status |
|--------|--------|
| Create new App API for domain-specific logic | ✅ |
| App API has own database | ✅ |
| App API calls Core API for auth | ✅ |
| App API → App API via REST | ✅ |
| Use Cloud Run with standard config | ✅ |

### 6.2 Forbidden Actions

| Action | Status | Alternative |
|--------|--------|-------------|
| App API implements own auth | ❌ | Delegate to Core API |
| App API queries Core database | ❌ | Use Core API REST |
| App API modifies User table | ❌ | Use Core API |
| Deploy to AWS EC2 | ❌ | Use Cloud Run |
| Skip health endpoints | ❌ | Must implement |

---

## 7. Exception Process

If a deviation from these rules is required:

1. **Document the reason** in Work Order
2. **Get explicit approval** (documented in PR)
3. **Add exception to this document** with expiration date
4. **Review quarterly** for removal

### Current Exceptions

| Exception | Reason | Expiration |
|-----------|--------|------------|
| (None) | - | - |

---

## 8. Reference

- [CLAUDE.md](../../CLAUDE.md) - Platform Constitution
- [infra-migration-gcp.md](./infra-migration-gcp.md) - GCP Infrastructure
- [deployment-status-definition.md](./deployment-status-definition.md) - Deployment Status
- [.github/workflows/deploy-api.yml](../../.github/workflows/deploy-api.yml) - Core API Deployment

---

*This document is part of the G2 Phase - App Architecture Fixation.*
*It is subordinate to CLAUDE.md and governs all App API server implementations.*

# Cosmetics API Current State Investigation Report

> **Phase**: 7-A-0 (Investigation Only)  
> **Date**: 2025-12-29  
> **Purpose**: Pre-implementation investigation before cosmetics-web development

---

## 1. Investigation Overview

### 1.1 Investigation Scope

This investigation was conducted to verify the current state of cosmetics implementation before proceeding with cosmetics-web development. All findings are based on actual code inspection with **NO CODE CHANGES** performed.

### 1.2 Reference Documents Reviewed

- ✅ CLAUDE.md §11 (Cosmetics Domain Rules)
- ✅ CLAUDE.md §12 (Cosmetics API Rules)
- ✅ CLAUDE.md §13 (Web Integration Rules)
- ✅ `docs/architecture/cosmetics-db-schema.md`
- ✅ `docs/architecture/cosmetics-api-rules.md`
- ✅ `docs/services/cosmetics/api-definition.md`
- ✅ `docs/services/cosmetics/openapi.yaml` (**EXISTS**)

---

## 2. Current Implementation Summary

### 2.1 OpenAPI Contract Status

**STATUS**: ✅ **OpenAPI spec EXISTS**

**Location**: `docs/services/cosmetics/openapi.yaml`

**Details**:
- Version: 1.0.0
- Total Endpoints Defined: 10 endpoints
- Security: Bearer JWT with `cosmetics:read`, `cosmetics:write`, `cosmetics:admin` scopes
- Compliant with CLAUDE.md §14 (API Contract Enforcement Rules)

**Defined Endpoints**:

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/cosmetics/products` | GET | None | Product list (public) |
| `/cosmetics/products/{id}` | GET | None | Product detail (public) |
| `/cosmetics/products/search` | GET | None | Product search (public) |
| `/cosmetics/brands` | GET | None | Brand list (public) |
| `/cosmetics/brands/{id}` | GET | None | Brand detail (public) |
| `/cosmetics/lines` | GET | None | Line list (public) |
| `/cosmetics/admin/products` | POST | Admin | Create product |
| `/cosmetics/admin/products/{id}` | PUT | Admin | Update product |
| `/cosmetics/admin/products/{id}/status` | PATCH | Admin | Update status |
| `/cosmetics/admin/prices/{productId}` | GET/PUT | Admin | Price policy management |

---

### 2.2 Cosmetics API Implementation Status

**CRITICAL FINDING**: Cosmetics API is **ONLY** a standalone Cloud Run stub

**Location**: `cloud-deploy/cosmetics-api/`

**Implementation**:
- ❌ **NOT integrated with Core API**
- ❌ **NOT using TypeScript/NestJS** (Basic Express.js)
- ❌ **Only 3 endpoints exist**:
  - `GET /health` (health check)
  - `GET /api/products` (hardcoded SQL: `SELECT * FROM products`)
  - `GET /api/products/:id` (hardcoded SQL query)
  - `GET /api/categories` (hardcoded SQL query)

**Database**:
- ❌ Connects to Core DB (`neture` database)
- ❌ NO cosmetics-specific tables exist
- ❌ Uses generic `products` and `categories` tables (NOT `cosmetics_*`)

**Rule Violations**:
- **Violates** CLAUDE.md §11.2 (Table Naming - no `cosmetics_` prefix)
- **Violates** CLAUDE.md §11.1 (Independent Schema - using Core DB)
- **Violates** CLAUDE.md §12.1 (API Responsibility - incomplete scope)
- **Violates** OpenAPI contract (only 3/10 endpoints exist)

---

### 2.3 Core API Dependency Analysis

**STATUS**: ✅ **NO cosmetics logic in Core API**

**Findings**:
- ✅ NO `/cosmetics/*` routes found in `apps/api-server/src/routes`
- ✅ NO cosmetics-related imports in Core API
- ✅ NO business logic mixing

**Conclusion**: Core API is properly isolated from cosmetics domain

---

### 2.4 Web/Frontend Code Investigation

**STATUS**: ⚠️ **Frontend pages EXIST but NO API integration**

**Location**: `apps/admin-dashboard/src/pages/cosmetics-products/`

**Files Found**:
- ✅ `ProductListPage.tsx` (553 lines)
- ✅ `ProductDetailPage.tsx`
- ✅ `BrandListPage.tsx`
- ✅ `BrandDetailPage.tsx`
- ✅ `CosmeticsProductsRouter.tsx`

**Implementation**:
- ✅ Uses AG Design System (compliant with Design Core v1.0)
- ✅ Uses `authClient.api` pattern (CLAUDE.md §10 compliant)
- ❌ **ALL DATA IS HARDCODED** (demo data, no real API calls)
- ❌ NO actual HTTP requests to cosmetics-api
- ❌ NO authentication flow implemented

**Example** (ProductListPage.tsx:87-193):
```typescript
const fetchProducts = useCallback(async () => {
  setLoading(true);
  try {
    // Demo data (hardcoded)
    setProducts([
      { id: 'prod-1', name: '...' }, // hardcoded objects
    ]);
  } catch (err) { ... }
}, [api]);
```

---

### 2.5 Cosmetics Extension Packages

**STATUS**: ⚠️ **Extension skeletons EXIST with NO implementation**

**Packages Found**:
1. `packages/cosmetics-sample-display-extension/` ✅ manifest exists
2. `packages/cosmetics-supplier-extension/` ✅ manifest exists
3. `packages/cosmetics-seller-extension/` (assumed)
4. `packages/cosmetics-partner-extension/` (assumed)

**Analysis** (cosmetics-sample-display-extension):
- ✅ Proper manifest structure
- ✅ Defines tables with `cosmetics_` prefix (compliant)
- ✅ Dependencies declared: `cosmetics-seller-extension`, `cosmetics-supplier-extension`
- ❌ NO backend services implemented
- ❌ NO frontend pages implemented
- ❌ Lifecycle hooks may not be implemented

---

## 3. Conformance Assessment

### 3.1 ✅ Rule-Compliant Items

| Item | Rule | Status |
|------|------|--------|
| OpenAPI exists | §14.1 | ✅ |
| OpenAPI schemas (no `any`) | §14.2 | ✅ |
| Frontend uses Design Core v1.0 | §3.5.2 | ✅ |
| Frontend uses `authClient.api` | §10 | ✅ |
| Core API isolation | §12.5, §13.2 | ✅ |
| Extension table naming | §11.2 | ✅ |

### 3.2 ❌ Missing/Incomplete Items

| Item | Expected | Actual | Impact |
|------|----------|--------|--------|
| Cosmetics API architecture | TypeScript/NestJS in Core Monorepo | Standalone Express.js stub | **CRITICAL** |
| Database schema | `cosmetics_*` tables | Using Core `products` table | **CRITICAL** |
| Endpoint implementation | 10 endpoints (OpenAPI) | 3 basic endpoints | **CRITICAL** |
| JWT auth | Scope verification | None | **HIGH** |
| Business logic | 7 services (brands, products, prices...) | Raw SQL only | **CRITICAL** |
| DB migrations | cosmetics-api owns | None exist | **CRITICAL** |

### 3.3 ❌ Rule Violations

| Violation | Rule | Severity | Remediation |
|-----------|------|----------|-------------|
| Using Core DB | §11.1 | **CRITICAL** | Create independent cosmetics DB schema |
| No `cosmetics_` prefix | §11.2 | **CRITICAL** | Rename tables or create new schema |
| Missing 70% of APIs | OpenAPI contract | **CRITICAL** | Implement all 10 endpoints |
| No auth implementation | §12.2 | **HIGH** | Implement JWT verification |
| Hardcoded SQL | §12.1 | **HIGH** | Implement service layer |

### 3.4 🟡 Experimental/Incomplete Items

| Item | Status | Notes |
|------|--------|-------|
| Frontend pages | Skeleton only | Hardcoded data, needs API integration |
| Extension packages | Manifests only | No actual implementation |
| Cloud Run deployment | Basic stub | Not production-ready |

---

## 4. Cosmetics-Web Implementation Prerequisites

Before starting cosmetics-web development, the following **MUST** be completed:

### 4.1 MANDATORY Prerequisites

#### P0: Database Schema (BLOCKING)

- [ ] Create independent `cosmetics` DB schema
- [ ] Create all `cosmetics_*` tables per `docs/architecture/cosmetics-db-schema.md`
- [ ] Implement TypeORM entities
- [ ] Write and run migrations in cosmetics-api

#### P0: API Implementation (BLOCKING)

- [ ] Re-architect cosmetics-api as TypeScript/NestJS service
- [ ] Implement all 10 OpenAPI endpoints
- [ ] Implement JWT verification (§12.2)
- [ ] Implement service layer (no raw SQL)
- [ ] Add proper error handling (COSMETICS_XXX codes)

#### P0: API Deployment (BLOCKING)

- [ ] Decision: Integrate into Core API vs. Keep separate Cloud Run
- [ ] If separate: Implement proper DB connection (not Unix socket hardcode)
- [ ] Configure CORS for admin-dashboard
- [ ] Set up environment variables (COSMETICS_API_URL)

### 4.2 HIGH Priority (Recommended)

- [ ] Seed initial brand/product data
- [ ] Implement audit logging (product/price changes)
- [ ] Add rate limiting per OpenAPI spec
- [ ] Write integration tests for API endpoints

### 4.3 MEDIUM Priority (Optional)

- [ ] Implement extension packages (sample-display, supplier, seller)
- [ ] Create admin UI for brand/line management
- [ ] Add image upload functionality

---

## 5. Web Integration Constraints

When implementing cosmetics-web:

### 5.1 MANDATORY Constraints (CLAUDE.md §13)

| Constraint | Rule | Enforcement |
|-----------|------|-------------|
| NO business logic in Web | §13.1 | Code review |
| NO direct DB access | §13.4 | Architecture review |
| NO JWT generation | §13.3 | Code review |
| MUST use `authClient.api` | §10, §13.2 | Linting |
| MUST call cosmetics-api only | §13.2 | Code review |

### 5.2 Environment Variables Required

```env
# cosmetics-web MUST have:
COSMETICS_API_URL=https://cosmetics-api.neture.co.kr  # or localhost:3003
CORE_API_URL=https://api.neture.co.kr  # for login only
```

### 5.3 Authentication Flow

```
1. Login: cosmetics-web → Core API → JWT
2. Store JWT: cosmetics-web (localStorage)
3. API calls: cosmetics-web → cosmetics-api (Bearer JWT)
4. JWT verification: cosmetics-api (not Web)
```

---

## 6. Architectural Decisions Required

Before proceeding, the following decisions must be made:

### Decision 1: API Architecture

**Question**: Should cosmetics-api be:
- **Option A**: Integrated into Core API monorepo (`apps/api-server`)
- **Option B**: Separate Cloud Run service (current state)

**Recommendation**: **Option A** (Monorepo)

**Rationale**:
- Shared DB connection pool
- Shared JWT verification
- Easier development (single `pnpm dev`)
- Consistent with other business APIs (future yaksa-api, dropshipping-api)

**Impact**: Requires relocating `cloud-deploy/cosmetics-api` to `apps/api-server/src/routes/cosmetics/*`

---

### Decision 2: Database Schema

**Question**: Create new PostgreSQL database or use schema within Core DB?

**Recommendation**: **Use schema within Core DB** (`cosmetics` schema)

**Rationale**:
- Cloud SQL supports multiple schemas
- Reduces infrastructure complexity
- Maintains logical separation
- Aligns with CLAUDE.md §11 (independent schema, not independent DB)

**Implementation**:
```sql
CREATE SCHEMA cosmetics;
CREATE TABLE cosmetics.products (...);
```

---

### Decision 3: Frontend Deployment

**Question**: Where should cosmetics-web be deployed?

**Options**:
- Admin-dashboard route (`/cosmetics-products/*`)
- Separate app (`apps/cosmetics-web`)

**Current State**: Already in admin-dashboard

**Recommendation**: **Keep in admin-dashboard** for now

**Rationale**:
- Pages already exist
- Uses shared AG Design System
- Admin users likely need both Core and Cosmetics access

---

## 7. Investigation Conclusion

### 7.1 Can cosmetics-web Implementation Proceed?

**VERDICT**: ❌ **NO - BLOCKED**

**Blocking Issues**:

1. **Cosmetics API does NOT exist in production-ready form**
   - Only a 113-line Express.js stub exists
   - 70% of OpenAPI contract is missing
   - No authentication, no business logic, no proper architecture

2. **Database schema does NOT exist**
   - No `cosmetics_*` tables
   - Using Core `products` table violates §11.1

3. **Fundamental architecture mismatch**
   - Current stub uses raw SQL, no TypeORM, no services
   - Does not follow O4O Platform standards

### 7.2 Estimated Effort to Unblock

**Phase 7-A-1: Cosmetics API Implementation**  
**Estimated**: 2-3 days

Tasks:
1. Create cosmetics DB schema + migrations (4-6 hours)
2. Implement 10 OpenAPI endpoints + services (8-12 hours)
3. Set up JWT auth + error handling (2-4 hours)
4. Integration testing (2-4 hours)

**Phase 7-A-2: Frontend Integration**  
**Estimated**: 1-2 days  
(Can only start after Phase 7-A-1 complete)

---

### 7.3 Recommended Next Steps

**STOP** cosmetics-web development until:

1. **Phase 7-A-1 Complete**: Implement cosmetics-api per OpenAPI contract
2. **Verification**: Manually test all 10 endpoints with JWT
3. **Approval**: Architecture review (monorepo vs. Cloud Run decision)

**THEN** proceed with Phase 7-A-2 cosmetics-web integration.

---

## 8. Appendix: Files Investigated

### Reference Documents
- `CLAUDE.md` (lines 387-633, cosmetics rules)
- `docs/architecture/cosmetics-db-schema.md`
- `docs/architecture/cosmetics-api-rules.md`
- `docs/services/cosmetics/api-definition.md`
- `docs/services/cosmetics/openapi.yaml` ✅

### Implementation Files
- `cloud-deploy/cosmetics-api/src/main.js` (113 lines)
- `apps/admin-dashboard/src/pages/cosmetics-products/*.tsx` (4 pages)
- `packages/cosmetics-sample-display-extension/src/manifest.ts`
- `packages/cosmetics-supplier-extension/` (structure only)

### NOT Found
- `/apps/api-server/src/routes/cosmetics/*` (does not exist)
- `cosmetics_*` tables in database
- Actual cosmetics service implementations

---

**END OF INVESTIGATION REPORT**

*This report contains only factual findings. No code changes were performed.*

# Role Prefix Mapping Table
**WO-P1-SERVICE-ROLE-PREFIX-IMPLEMENTATION-V1 - STEP 2**

Generated: 2026-02-05
Based on: STEP 1 Investigation across 7 service areas

---

## Executive Summary

Total unique role strings identified: **26 roles**
Services analyzed: **5 main services + 2 KPA organizational services**
Proposed format: `{serviceKey}:{roleName}`

**Key Principles:**
1. Platform-level roles use `platform:` prefix
2. Service-specific roles use service key prefix (e.g., `kpa:`, `neture:`)
3. Organization-level roles (KpaMember) remain unprefixed (internal to service)
4. Deprecated roles are migrated to new equivalents
5. Position metadata (not authorization) excluded from migration

---

## Service Key Registry

| Service Key | Service Name | Status |
|-------------|--------------|--------|
| `platform` | O4O Platform Core | Active |
| `kpa` | KPA-Society | Active |
| `neture` | Neture | Active |
| `glycopharm` | GlycoPharm | Active |
| `cosmetics` | K-Cosmetics | Active |
| `glucoseview` | GlucoseView | Active |

---

## Complete Role Prefix Mapping Table

### 1. Platform-Level Roles (Cross-Service)

| Current Role | Used By | New Prefixed Role | Migration Type | Notes |
|--------------|---------|-------------------|----------------|-------|
| `super_admin` | All services | `platform:super_admin` | Direct | Highest privilege, cross-service access |
| `admin` | All services | `platform:admin` | Context-dependent | May need service-specific variants |
| `operator` | Platform | `platform:operator` | Direct | Platform operations only |
| `manager` | Platform | `platform:manager` | Direct | Platform management role |
| `administrator` | Platform | `platform:admin` | Alias merge | Merge to `platform:admin` |

**Migration Notes:**
- `admin` role is overloaded - used at platform, service, and organization levels
- During migration, check context: if cross-service → `platform:admin`, if service-specific → `{service}:admin`
- `administrator` is alias of `admin` → consolidate to `platform:admin`

---

### 2. KPA-Society Roles

#### Platform-Level KPA Roles

| Current Role | Used By | New Prefixed Role | Migration Type | Notes |
|--------------|---------|-------------------|----------------|-------|
| `district_admin` | KPA-Society | `kpa:district_admin` | Direct | District-level admin |
| `branch_admin` | KPA-Society | `kpa:branch_admin` | Direct | Branch-level admin |
| `branch_operator` | KPA-Society | `kpa:branch_operator` | Direct | Branch-level operator |
| `pharmacist` | KPA-Society | `kpa:pharmacist` | Direct | General member |

#### Organization-Level KPA Roles (KpaMember Entity)

| Current Role | Scope | New Format | Migration Type | Notes |
|--------------|-------|------------|----------------|-------|
| `member` | Organization | **No prefix** | No change | Internal to KpaMember |
| `operator` | Organization | **No prefix** | No change | Internal to KpaMember |
| `admin` | Organization | **No prefix** | No change | Internal to KpaMember |

**Migration Notes:**
- Platform-level KPA roles (User.roles) → prefixed
- Organization-level roles (KpaMember.role) → remain unprefixed (internal enum)
- Backend must distinguish: User.roles vs KpaMember.role

#### Positions (NOT Roles - Excluded from Migration)

| Current String | Type | Action | Notes |
|----------------|------|--------|-------|
| `district_officer` | Position metadata | No migration | Display-only, not authorization |
| `branch_officer` | Position metadata | No migration | Display-only, not authorization |

---

### 3. Neture Roles

| Current Role | Used By | New Prefixed Role | Migration Type | Notes |
|--------------|---------|-------------------|----------------|-------|
| `admin` | Neture backend | `neture:admin` | Context-dependent | If service-specific only |
| `supplier` | Neture | `neture:supplier` | Direct | Supplier role |
| `partner` | Neture | `neture:partner` | Direct | Partner role |
| `seller` | Neture | `neture:user` | Merge | Frontend maps to `user` |
| `user` | Neture | `neture:user` | Direct | General user |

**Migration Notes:**
- Frontend `UserRole` type defines: `'admin' | 'supplier' | 'partner' | 'user'`
- `seller`, `customer` → mapped to `user` in frontend
- Backend checks `admin` or `super_admin` → migrate to `neture:admin` or keep `platform:admin`

---

### 4. GlycoPharm Roles

| Current Role | Used By | New Prefixed Role | Migration Type | Notes |
|--------------|---------|-------------------|----------------|-------|
| `admin` | GlycoPharm | `glycopharm:admin` | Context-dependent | Service-specific admin |
| `operator` | GlycoPharm | `glycopharm:operator` | Direct | Mapped from platform admin |
| `pharmacy` | GlycoPharm | `glycopharm:pharmacy` | Direct | Pharmacy user |
| `supplier` | GlycoPharm | `glycopharm:supplier` | Direct | Supplier role |
| `partner` | GlycoPharm | `glycopharm:partner` | Direct | Partner role |
| `consumer` | GlycoPharm | `glycopharm:consumer` | Direct | Consumer/patient |

**Migration Notes:**
- Frontend `UserRole`: `'pharmacy' | 'supplier' | 'partner' | 'operator' | 'consumer'`
- Backend `admin`/`super_admin` → frontend maps to `operator`
- GlucoseViewPharmacist entity has separate `role: 'admin'` (service-specific)

---

### 5. K-Cosmetics Roles

| Current Role | Used By | New Prefixed Role | Migration Type | Notes |
|--------------|---------|-------------------|----------------|-------|
| `admin` | K-Cosmetics | `cosmetics:admin` | Direct | Service admin |
| `operator` | K-Cosmetics | `cosmetics:operator` | Direct | Service operator |
| `supplier` | K-Cosmetics | `cosmetics:supplier` | Direct | Supplier role |
| `seller` | K-Cosmetics | `cosmetics:seller` | Direct | Seller/retailer |
| `partner` | K-Cosmetics | `cosmetics:partner` | Direct | Partner role |

**Migration Notes:**
- Frontend `UserRole`: `'admin' | 'supplier' | 'seller' | 'partner' | 'operator'`
- `customer`, `user` → frontend maps to `seller`
- Backend checks `admin` role OR `cosmetics:admin` scope

---

### 6. GlucoseView Roles

| Current Role | Used By | New Prefixed Role | Migration Type | Notes |
|--------------|---------|-------------------|----------------|-------|
| `super_admin` | GlucoseView | `platform:super_admin` | Cross-service | Platform-level |
| `admin` | GlucoseView | `glucoseview:admin` | Context-dependent | Service or pharmacist admin |

**Migration Notes:**
- Backend checks `super_admin` OR `admin` role
- GlucoseViewPharmacist entity: `role: 'admin'` (separate from platform role)
- Minimal role usage - mostly scope-based (`glucoseview:admin`)

---

### 7. Commerce Roles (Cross-Service)

| Current Role | Used By | New Prefixed Role | Migration Type | Notes |
|--------------|---------|-------------------|----------------|-------|
| `seller` | Multiple | Service-specific | Split by service | `neture:user`, `cosmetics:seller` |
| `vendor` | Platform | `platform:vendor` | Direct | Platform-level vendor |
| `supplier` | Multiple | Service-specific | Split by service | Each service has own supplier role |
| `partner` | Multiple | Service-specific | Split by service | Each service has own partner role |

---

### 8. Base User Roles

| Current Role | Used By | New Prefixed Role | Migration Type | Notes |
|--------------|---------|-------------------|----------------|-------|
| `user` | Platform | Service-specific | Split by service | Each service defines own `user` |
| `member` | Platform | `platform:member` | Direct | Generic member |
| `contributor` | Platform | `platform:contributor` | Direct | Content contributor |

---

### 9. Deprecated Roles (Legacy Migration)

| Current Role | Status | New Prefixed Role | Migration Action | Notes |
|--------------|--------|-------------------|------------------|-------|
| `customer` | Deprecated | Service-specific `user` | Replace | Map to service-specific user role |
| `business` | Deprecated | Service-specific `partner` | Replace | Map to partner or remove |

---

## Migration Priority Matrix

### Priority 1: Platform-Level Roles (Immediate)
**Scope:** Roles with cross-service access

| Role | Services Affected | Risk | Migration Strategy |
|------|-------------------|------|-------------------|
| `super_admin` | All | High | Add `platform:super_admin`, keep old for compatibility period |
| `admin` | All | High | Context-dependent: analyze each usage, split by context |
| `operator` | Platform | Medium | Add `platform:operator` |

### Priority 2: KPA-Specific Roles (High Priority)
**Scope:** Already isolated by P0 fix, complete the migration

| Role | Services Affected | Risk | Migration Strategy |
|------|-------------------|------|-------------------|
| `district_admin` | KPA-Society | Low | Add `kpa:district_admin` |
| `branch_admin` | KPA-Society | Low | Add `kpa:branch_admin` |
| `branch_operator` | KPA-Society | Low | Add `kpa:branch_operator` |
| `pharmacist` | KPA-Society | Low | Add `kpa:pharmacist` |

### Priority 3: Service-Specific Roles (Medium Priority)
**Scope:** Isolated to single service

| Service | Roles to Migrate | Risk | Migration Strategy |
|---------|------------------|------|-------------------|
| Neture | `supplier`, `partner`, `user` | Low | Add prefixed versions |
| GlycoPharm | `pharmacy`, `supplier`, `partner`, `operator`, `consumer` | Low | Add prefixed versions |
| K-Cosmetics | `supplier`, `seller`, `partner`, `operator` | Low | Add prefixed versions |
| GlucoseView | Minimal | Low | Scope-based already |

### Priority 4: Deprecated Roles (Low Priority)
**Scope:** Legacy cleanup

| Role | Action | Migration Strategy |
|------|--------|-------------------|
| `customer` | Replace | Map to service-specific `user` |
| `business` | Remove | Map to `partner` or remove entirely |

---

## Implementation Checklist

### Phase 1: Preparation
- [ ] Audit all User.roles in production database
- [ ] Identify cross-service role usage patterns
- [ ] Create role migration utility functions

### Phase 2: Backend Migration
- [ ] Implement `hasServiceRole(userId, 'service:role')` utility
- [ ] Implement `hasAnyServiceRole(userId, ['service:role'])` utility
- [ ] Update all middleware to accept both old and new formats
- [ ] Update all controllers to use new utilities

### Phase 3: Frontend Migration
- [ ] Update AuthContext to handle prefixed roles
- [ ] Update role mapping functions
- [ ] Update UI conditionals (Header, Sidebar, etc.)
- [ ] Test role-based UI visibility

### Phase 4: Database Migration
- [ ] Add prefixed roles to existing users (dual format)
- [ ] Run parallel for compatibility period (2-4 weeks)
- [ ] Remove old roles after verification

### Phase 5: Cleanup
- [ ] Remove old role checking functions
- [ ] Remove deprecated roles
- [ ] Update documentation

---

## Example Code Snippets

### Backend: New Role Utility

```typescript
// apps/api-server/src/utils/role.utils.ts

/**
 * Check if user has a specific service role
 * Format: "service:role" (e.g., "kpa:admin", "platform:super_admin")
 */
export function hasServiceRole(userRoles: string[], serviceRole: string): boolean {
  return userRoles.includes(serviceRole);
}

/**
 * Check if user has any of the specified service roles
 */
export function hasAnyServiceRole(userRoles: string[], serviceRoles: string[]): boolean {
  return serviceRoles.some(role => userRoles.includes(role));
}

/**
 * Migration helper: check both old and new formats
 * @deprecated Remove after migration complete
 */
export function hasRoleCompat(userRoles: string[], oldRole: string, newRole: string): boolean {
  return userRoles.includes(oldRole) || userRoles.includes(newRole);
}
```

### Backend: Controller Usage

```typescript
// Before
const isAdmin = userRoles.includes('admin') || userRoles.includes('super_admin');

// After (migration period)
const isAdmin = hasAnyServiceRole(userRoles, ['kpa:admin', 'platform:admin', 'platform:super_admin'])
  || hasRoleCompat(userRoles, 'admin', 'kpa:admin'); // Compat for old format

// After (final)
const isAdmin = hasAnyServiceRole(userRoles, ['kpa:admin', 'platform:admin', 'platform:super_admin']);
```

### Frontend: AuthContext Update

```typescript
// Before
export type UserRole = 'admin' | 'district_admin' | 'branch_admin' | 'pharmacist';

// After
export type UserRole =
  | 'platform:super_admin'
  | 'platform:admin'
  | 'kpa:admin'
  | 'kpa:district_admin'
  | 'kpa:branch_admin'
  | 'kpa:pharmacist';

// Helper
function parseServiceRole(role: string): { service: string; role: string } {
  const [service, roleName] = role.split(':');
  return { service, role: roleName };
}
```

---

## Risk Assessment

### High Risk
- `admin` role migration - used at multiple levels (platform, service, organization)
- Frontend role mapping changes - could break UI visibility logic

### Medium Risk
- Cross-service admin access patterns
- Backward compatibility during migration period

### Low Risk
- Service-specific roles (isolated to single service)
- Deprecated role removal

---

## Success Criteria

1. **Zero cross-service role contamination**: KPA operators not recognized in Neture/GlycoPharm
2. **No functionality regression**: All existing role checks continue to work
3. **Clean role semantics**: Each role clearly identifies service ownership
4. **Maintainability**: New developers can understand role structure from name alone

---

## Next Steps

1. **User Review & Approval** of this mapping table
2. **STEP 3**: Define deployment strategy and rollout order
3. **STEP 4**: Begin WO-P1 implementation

---

*Generated: 2026-02-05*
*Investigation basis: 7 service areas (5 main + 2 KPA organizational)*
*Total roles mapped: 26*

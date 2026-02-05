# Role Prefix Deployment Strategy
**WO-P1-SERVICE-ROLE-PREFIX-IMPLEMENTATION-V1 - STEP 3**

Generated: 2026-02-05
Based on: Role Prefix Mapping Table (STEP 2)

---

## Executive Summary

**Deployment Approach:** Phased rollout with backward compatibility
**Total Duration:** 4-6 weeks
**Risk Level:** Medium (manageable with proper staging)

**Key Principles:**
1. **Dual-format compatibility period** - Support both old and new role formats simultaneously
2. **Service-by-service rollout** - Start with lowest risk, highest value
3. **Zero downtime** - No service interruptions
4. **Rollback safety** - Each phase can be rolled back independently

---

## Deployment Phases

### Phase 0: Foundation (Week 1)
**Goal:** Prepare infrastructure and utilities

**Tasks:**
- [ ] Create `role.utils.ts` with `hasServiceRole()`, `hasAnyServiceRole()`, `hasRoleCompat()`
- [ ] Create database migration: Add prefixed roles alongside existing roles
- [ ] Update TypeScript types to support prefixed role format
- [ ] Create role migration scripts (audit, transform, validate)
- [ ] Set up monitoring for role-based authorization failures

**Deliverables:**
- `apps/api-server/src/utils/role.utils.ts`
- Migration: `YYYYMMDDHHMMSS-AddPrefixedRoles.ts`
- Script: `apps/api-server/src/scripts/audit-roles.ts`
- Script: `apps/api-server/src/scripts/migrate-roles.ts`

**Exit Criteria:**
- [ ] All utilities tested with unit tests
- [ ] Migration runs successfully on staging DB
- [ ] Role audit script shows complete role inventory

---

### Phase 1: KPA-Society (Week 2)
**Priority:** HIGH
**Risk:** LOW (already isolated by P0 fix)
**Services:** KPA-Society backend + frontend

**Why KPA First:**
- Already has KpaMember-based operator verification (P0)
- Isolated service with clear boundaries
- High value - solves the original cross-service contamination problem
- Lower risk - fewer external dependencies

**Backend Changes:**

**Files to modify:**
- `apps/api-server/src/routes/kpa/controllers/organization-join-request.controller.ts`
- `apps/api-server/src/routes/kpa/controllers/branch-admin-dashboard.controller.ts`
- `apps/api-server/src/routes/kpa/controllers/admin-dashboard.controller.ts`
- `apps/api-server/src/routes/kpa/controllers/steward.controller.ts`
- `apps/api-server/src/routes/kpa/middleware/kpa-scope.middleware.ts`

**Role migrations:**
```typescript
// Before
const isAdmin = userRoles.includes('admin') || userRoles.includes('super_admin');

// After (compatibility period)
const isAdmin = hasAnyServiceRole(userRoles, [
  'kpa:admin',
  'platform:admin',
  'platform:super_admin'
]) || hasRoleCompat(userRoles, 'admin', 'kpa:admin');

// After (final - remove compat)
const isAdmin = hasAnyServiceRole(userRoles, [
  'kpa:admin',
  'platform:admin',
  'platform:super_admin'
]);
```

**Frontend Changes:**

**Files to modify:**
- `services/web-kpa-society/src/contexts/AuthContext.tsx`
- `services/web-kpa-society/src/components/Header.tsx`
- `services/web-kpa-society/src/components/Sidebar.tsx`

**Type updates:**
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
  | 'kpa:branch_operator'
  | 'kpa:pharmacist';
```

**Database migration:**
```sql
-- Add prefixed roles to existing KPA users
UPDATE users
SET roles = array_append(roles, 'kpa:district_admin')
WHERE 'district_admin' = ANY(roles) AND service_key = 'kpa';

UPDATE users
SET roles = array_append(roles, 'kpa:branch_admin')
WHERE 'branch_admin' = ANY(roles) AND service_key = 'kpa';

UPDATE users
SET roles = array_append(roles, 'kpa:branch_operator')
WHERE 'branch_operator' = ANY(roles) AND service_key = 'kpa';

UPDATE users
SET roles = array_append(roles, 'kpa:pharmacist')
WHERE 'pharmacist' = ANY(roles) AND service_key = 'kpa';
```

**Testing:**
- [ ] District admin can access district dashboard
- [ ] Branch admin can access branch dashboard
- [ ] Regular pharmacist has correct permissions
- [ ] Neture admin cannot access KPA admin features (**key test**)

**Exit Criteria:**
- [ ] All KPA role checks use new format
- [ ] Frontend correctly displays role-based UI
- [ ] Zero cross-service role contamination detected
- [ ] All tests pass

---

### Phase 2: Platform-Level Roles (Week 3)
**Priority:** HIGH
**Risk:** MEDIUM (affects all services)
**Services:** All services (backend only)

**Why Platform Roles Second:**
- Affects all services but high value
- Required for proper service isolation
- Builds on KPA success

**Roles to migrate:**
- `super_admin` → `platform:super_admin`
- `admin` → `platform:admin` (context-dependent)
- `operator` → `platform:operator`
- `manager` → `platform:manager`

**Special handling for `admin` role:**

```typescript
// Analyze context before migration
function migrateAdminRole(user: User): string[] {
  const newRoles: string[] = [];

  if (user.roles.includes('admin')) {
    // Check if cross-service admin
    if (user.serviceKey === null || user.serviceKey === 'platform') {
      newRoles.push('platform:admin');
    }
    // Check service-specific admin
    else if (user.serviceKey === 'kpa') {
      newRoles.push('kpa:admin');
    }
    else if (user.serviceKey === 'neture') {
      newRoles.push('neture:admin');
    }
    // ... etc for each service
  }

  return newRoles;
}
```

**Backend Changes:**

**Files to modify:**
- All middleware: `apps/api-server/src/middleware/auth.middleware.ts`
- All service-specific scope middlewares
- Platform admin endpoints

**Testing:**
- [ ] `platform:super_admin` can access all services
- [ ] `platform:admin` can access platform-wide features
- [ ] Service-specific admins restricted to their service
- [ ] No privilege escalation possible

**Exit Criteria:**
- [ ] All platform roles use prefix
- [ ] Existing functionality unchanged
- [ ] Security audit passes

---

### Phase 3: Neture (Week 3-4)
**Priority:** MEDIUM
**Risk:** LOW
**Services:** Neture backend + frontend

**Why Neture Third:**
- Simple role structure (4 roles)
- Low complexity
- Good test case for other services

**Roles to migrate:**
- `admin` → `neture:admin`
- `supplier` → `neture:supplier`
- `partner` → `neture:partner`
- `user` → `neture:user`

**Backend Changes:**

**Files to modify:**
- `apps/api-server/src/routes/neture/neture.controller.ts`
- `apps/api-server/src/routes/neture/neture.routes.ts`

**Frontend Changes:**

**Files to modify:**
- `services/web-neture/src/contexts/AuthContext.tsx`
- `services/web-neture/src/components/Header.tsx`

**Testing:**
- [ ] Admin can approve partnerships
- [ ] Supplier can manage products
- [ ] Partner dashboard access correct
- [ ] Role switching works

**Exit Criteria:**
- [ ] All Neture role checks use prefix
- [ ] Frontend role mapping updated
- [ ] All tests pass

---

### Phase 4: GlycoPharm (Week 4-5)
**Priority:** MEDIUM
**Risk:** MEDIUM (complex role mapping)
**Services:** GlycoPharm backend + frontend

**Why GlycoPharm Fourth:**
- More complex role structure (6 roles)
- Has GlucoseViewPharmacist entity with separate role field
- Requires careful handling of operator role mapping

**Roles to migrate:**
- `admin` → `glycopharm:admin`
- `operator` → `glycopharm:operator`
- `pharmacy` → `glycopharm:pharmacy`
- `supplier` → `glycopharm:supplier`
- `partner` → `glycopharm:partner`
- `consumer` → `glycopharm:consumer`

**Special consideration:**
- GlucoseViewPharmacist.role = 'admin' (entity-level, unprefixed)
- Platform admin/super_admin → frontend maps to `operator`

**Backend Changes:**

**Files to modify:**
- `apps/api-server/src/routes/glycopharm/glycopharm.routes.ts`
- `apps/api-server/src/routes/glucoseview/glucoseview.routes.ts`
- GlucoseView-related controllers

**Frontend Changes:**

**Files to modify:**
- `services/web-glycopharm/src/contexts/AuthContext.tsx`
- Role mapping functions
- RoleSwitcher component

**Testing:**
- [ ] Pharmacy dashboard access
- [ ] B2B product management
- [ ] Smart display management
- [ ] Application approval workflows
- [ ] Role switching between pharmacy/operator/consumer

**Exit Criteria:**
- [ ] All GlycoPharm role checks use prefix
- [ ] Frontend role mapping correct
- [ ] GlucoseView pharmacist admin distinction maintained
- [ ] All tests pass

---

### Phase 5: K-Cosmetics (Week 5)
**Priority:** LOW
**Risk:** LOW
**Services:** K-Cosmetics backend + frontend

**Roles to migrate:**
- `admin` → `cosmetics:admin`
- `operator` → `cosmetics:operator`
- `supplier` → `cosmetics:supplier`
- `seller` → `cosmetics:seller`
- `partner` → `cosmetics:partner`

**Backend Changes:**

**Files to modify:**
- `apps/api-server/src/routes/cosmetics/cosmetics.routes.ts`
- `apps/api-server/src/routes/cosmetics/cosmetics.controller.ts`

**Frontend Changes:**

**Files to modify:**
- `services/web-k-cosmetics/src/contexts/AuthContext.tsx`
- Role mapping functions
- RoleSwitcher component

**Testing:**
- [ ] Admin dashboard access
- [ ] Seller product management
- [ ] Order processing
- [ ] Operator workspace

**Exit Criteria:**
- [ ] All K-Cosmetics role checks use prefix
- [ ] All tests pass

---

### Phase 6: GlucoseView (Week 5-6)
**Priority:** LOW
**Risk:** LOW (minimal role usage, mostly scope-based)
**Services:** GlucoseView backend

**Roles to migrate:**
- `super_admin` → `platform:super_admin` (already in Phase 2)
- `admin` → `glucoseview:admin`

**Note:** GlucoseView primarily uses scope-based auth (`glucoseview:admin`), minimal role migration needed.

**Backend Changes:**

**Files to modify:**
- `apps/api-server/src/routes/glucoseview/glucoseview.routes.ts`

**Testing:**
- [ ] Pharmacist application approval
- [ ] Pharmacy management
- [ ] Customer (patient) management

**Exit Criteria:**
- [ ] All GlucoseView role checks use prefix or scope
- [ ] All tests pass

---

### Phase 7: Cleanup (Week 6)
**Priority:** MEDIUM
**Risk:** LOW
**Goal:** Remove backward compatibility code

**Tasks:**
- [ ] Remove `hasRoleCompat()` utility
- [ ] Remove old role format support from all services
- [ ] Database cleanup: Remove unprefixed roles from users table
- [ ] Update all documentation
- [ ] Archive old role constants

**Database cleanup:**
```sql
-- Remove old unprefixed KPA roles
UPDATE users
SET roles = array_remove(roles, 'district_admin')
WHERE 'kpa:district_admin' = ANY(roles);

UPDATE users
SET roles = array_remove(roles, 'branch_admin')
WHERE 'kpa:branch_admin' = ANY(roles);

-- Repeat for all migrated roles
```

**Exit Criteria:**
- [ ] No old role format in codebase
- [ ] No old roles in database
- [ ] All tests pass
- [ ] Documentation updated

---

## Rollout Order Summary

```
Week 1: Phase 0 - Foundation
        │
        ├─ Create utilities
        ├─ Create migrations
        └─ Set up monitoring

Week 2: Phase 1 - KPA-Society ⭐ HIGH PRIORITY
        │
        ├─ Backend migration
        ├─ Frontend migration
        └─ Verify cross-service isolation

Week 3: Phase 2 - Platform Roles ⭐ HIGH PRIORITY
        │
        ├─ Migrate super_admin, admin, operator
        └─ Update all service middlewares
        │
        Phase 3 - Neture
        │
        └─ Full service migration

Week 4: Phase 4 - GlycoPharm
        │
        └─ Complex role mapping migration

Week 5: Phase 5 - K-Cosmetics
        │
        Phase 6 - GlucoseView
        │
        └─ Minimal migration (scope-based)

Week 6: Phase 7 - Cleanup
        │
        └─ Remove compatibility code
```

---

## Risk Mitigation Strategies

### 1. Backward Compatibility Period (2-4 weeks)

**Strategy:** Support both old and new role formats simultaneously

```typescript
// Compatibility wrapper
function hasRoleCompat(userRoles: string[], oldRole: string, newRole: string): boolean {
  return userRoles.includes(oldRole) || userRoles.includes(newRole);
}

// Usage
const isKpaAdmin = hasAnyServiceRole(userRoles, ['kpa:admin', 'platform:admin'])
  || hasRoleCompat(userRoles, 'admin', 'kpa:admin'); // Fallback
```

**Benefits:**
- Zero downtime
- Gradual migration
- Easy rollback

**Cleanup trigger:** After 2 weeks of stable operation

---

### 2. Feature Flags

**Strategy:** Control rollout per service

```typescript
const FEATURE_FLAGS = {
  USE_PREFIXED_ROLES_KPA: true,        // Week 2
  USE_PREFIXED_ROLES_PLATFORM: true,   // Week 3
  USE_PREFIXED_ROLES_NETURE: true,     // Week 3-4
  USE_PREFIXED_ROLES_GLYCOPHARM: false, // Week 4-5
  USE_PREFIXED_ROLES_COSMETICS: false,  // Week 5
  USE_PREFIXED_ROLES_GLUCOSEVIEW: false, // Week 5-6
};
```

**Benefits:**
- Per-service rollout control
- Instant rollback capability
- A/B testing possible

---

### 3. Monitoring and Alerts

**Metrics to track:**
- Authorization failure rate (should remain constant)
- Role check execution time (should not increase)
- Cross-service role contamination incidents (should drop to zero after KPA migration)

**Alerts:**
- Spike in 403 Forbidden responses
- Any cross-service operator recognition
- Role migration script failures

**Dashboard:**
- Role distribution (prefixed vs unprefixed)
- Migration progress per service
- Authorization failure trends

---

### 4. Rollback Plan

**Per-phase rollback:**

```typescript
// Rollback Phase 1 (KPA)
// 1. Set feature flag to false
FEATURE_FLAGS.USE_PREFIXED_ROLES_KPA = false;

// 2. Revert code changes (git revert)
git revert <commit-hash>

// 3. Database rollback (optional - old roles still present)
// No action needed if in compatibility period
```

**Full rollback:**
- Revert all code changes
- Database cleanup script to remove prefixed roles
- Restore from backup if needed

---

## Testing Strategy

### Unit Tests

**Per utility function:**
- `hasServiceRole()` - test with valid/invalid formats
- `hasAnyServiceRole()` - test with multiple roles
- `hasRoleCompat()` - test backward compatibility

**Per controller:**
- Test all role-based endpoints with new format
- Test backward compatibility with old format
- Test cross-service isolation

### Integration Tests

**Per service:**
- Full user flow with new roles
- Role switching (if applicable)
- Admin functionality
- Operator functionality

**Cross-service:**
- Verify KPA admin cannot access Neture admin features
- Verify Neture admin cannot access KPA admin features
- Verify platform:super_admin can access all services

### Manual Testing

**Critical paths:**
- KPA district admin dashboard
- KPA branch admin dashboard
- Neture partnership approval
- GlycoPharm application approval
- K-Cosmetics admin dashboard

**Regression testing:**
- All existing admin features still work
- All existing operator features still work
- No permission escalation bugs

---

## Success Metrics

### Functional Metrics
- [ ] Zero cross-service role contamination incidents
- [ ] All role-based features function correctly
- [ ] No increase in authorization failures
- [ ] All tests pass (100%)

### Performance Metrics
- [ ] Role check latency < 10ms (same as before)
- [ ] No degradation in API response times
- [ ] Database query performance unchanged

### Code Quality Metrics
- [ ] All role strings follow `service:role` format
- [ ] No hardcoded role strings (use constants)
- [ ] 100% TypeScript type coverage for roles
- [ ] Zero linting warnings related to roles

---

## Communication Plan

### Week 0 (Before Start)
- **Audience:** All developers, QA, DevOps
- **Message:** Role prefix migration starting, timeline, expectations
- **Channel:** Team meeting, Slack announcement

### Weekly Updates
- **Audience:** Stakeholders, team leads
- **Message:** Progress update, completed phases, blockers
- **Channel:** Weekly report, standup

### Phase Completions
- **Audience:** All team members
- **Message:** Phase X complete, what to test, any changes to workflows
- **Channel:** Slack announcement, email

### Final Completion (Week 6)
- **Audience:** All stakeholders
- **Message:** Migration complete, benefits realized, lessons learned
- **Channel:** Team retrospective, documentation update

---

## Lessons Learned (Post-Migration)

**To be filled after completion:**
- What went well?
- What could be improved?
- Unexpected challenges?
- Recommendations for future migrations?

---

## Approval Checklist

Before proceeding to STEP 4 (implementation), confirm:

- [ ] **User approval** of deployment strategy
- [ ] **Timeline feasible** (4-6 weeks acceptable)
- [ ] **Resources available** (developer time, QA time)
- [ ] **Rollout order correct** (KPA → Platform → Neture → GlycoPharm → Cosmetics → GlucoseView)
- [ ] **Risk mitigation adequate** (backward compatibility, feature flags, monitoring)
- [ ] **Testing strategy comprehensive** (unit, integration, manual)
- [ ] **Rollback plan clear** (can abort at any phase)

---

*Generated: 2026-02-05*
*Estimated Duration: 4-6 weeks*
*Risk Level: Medium (manageable)*
*Rollout Phases: 7 (Foundation + 6 services)*

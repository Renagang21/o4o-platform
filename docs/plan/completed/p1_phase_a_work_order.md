# P1 Phase A Work Order: RBAC Schema Extension

**Project:** O4O Platform - User & Role System Enhancement (P1)
**Phase:** P1-A (RBAC Schema Extension)
**Created:** 2025-11-09
**Status:** 📋 Ready for Implementation
**Estimated Duration:** 2-3 days

---

## 🎯 Objective

Transform the current role-based access control into a **permission-based RBAC system** by:
1. Adding granular permissions (e.g., `product.create`, `order.approve`)
2. Extending `/me` endpoint to include `capabilities[]`
3. Creating `requirePermission()` middleware for fine-grained access control
4. Building foundation for admin permission management UI

---

## 🧱 Scope

| Component | Description |
|-----------|-------------|
| **Database Schema** | New tables: `permissions`, `role_permissions` |
| **Entities** | `Permission.ts`, `RolePermission.ts` |
| **API Extension** | `/me` now returns `capabilities[]` |
| **API Endpoints** | `/api/admin/permissions` CRUD operations |
| **Middleware** | `requirePermission(resource, action)` |
| **Seed Data** | 15+ default permissions for admin role |
| **Documentation** | `p1_rbac_enhancement.md` (detailed spec) |

---

## ⚙️ Execution Steps

### A-1: Database Schema & Migration

**File:** `apps/api-server/src/database/migrations/4000000000000-CreatePermissionsSystem.ts`

**Tables to Create:**

1. **permissions**
   - `id` (UUID, PK)
   - `code` (VARCHAR 100, UNIQUE) - e.g., "product.create"
   - `name` (VARCHAR 200) - e.g., "Create Product"
   - `resource` (VARCHAR 50) - e.g., "product"
   - `action` (VARCHAR 50) - e.g., "create"
   - `description` (TEXT)
   - `created_at`, `updated_at` (TIMESTAMP)

2. **role_permissions**
   - `id` (UUID, PK)
   - `role_assignment_id` (UUID, FK → role_assignments.id)
   - `permission_id` (UUID, FK → permissions.id)
   - `granted_at` (TIMESTAMP)
   - `granted_by` (UUID, FK → users.id, nullable)
   - UNIQUE constraint on (role_assignment_id, permission_id)

**Indexes:**
- `permissions.code` (UNIQUE)
- `role_permissions(role_assignment_id, permission_id)` (UNIQUE)
- `role_permissions.permission_id` (for joins)

---

### A-2: Entity Definitions

**File:** `apps/api-server/src/entities/Permission.ts`

Key fields:
- code: Unique identifier (e.g., "enrollment.approve")
- name: Human-readable name
- resource: Categorization (e.g., "enrollment")
- action: Operation type (e.g., "approve", "create", "delete")
- description: Usage context

**File:** `apps/api-server/src/entities/RolePermission.ts`

Relationships:
- ManyToOne → RoleAssignment
- ManyToOne → Permission
- ManyToOne → User (granted_by)

---

### A-3: Seed Data

**File:** `apps/api-server/src/database/seeds/permission.seed.ts`

**Default Permissions (15+):**

| Code | Resource | Action | Description |
|------|----------|--------|-------------|
| `enrollment.create` | enrollment | create | Submit role application |
| `enrollment.read` | enrollment | read | View own enrollments |
| `enrollment.list` | enrollment | list | List all enrollments (admin) |
| `enrollment.approve` | enrollment | approve | Approve enrollments (admin) |
| `enrollment.reject` | enrollment | reject | Reject enrollments (admin) |
| `enrollment.hold` | enrollment | hold | Put enrollments on hold (admin) |
| `dashboard.supplier` | dashboard | view | Access supplier dashboard |
| `dashboard.seller` | dashboard | view | Access seller dashboard |
| `dashboard.partner` | dashboard | view | Access partner dashboard |
| `product.create` | product | create | Create products |
| `product.edit` | product | edit | Edit products |
| `product.delete` | product | delete | Delete products |
| `order.view` | order | view | View orders |
| `order.approve` | order | approve | Approve orders |
| `admin.all` | admin | all | Full administrative access |

**Seed Logic:**
- Create all 15+ permissions
- Find admin role assignments
- Grant all permissions to admin role
- Grant role-specific permissions to existing assignments

---

### A-4: Auth Service Extension

**File:** `apps/api-server/src/routes/auth-v2.ts`

**Modify `/me` endpoint:**

Current response:
```typescript
{
  user: User,
  assignments: RoleAssignment[]
}
```

New response:
```typescript
{
  user: User,
  assignments: RoleAssignment[],
  capabilities: string[]  // NEW
}
```

**Implementation:**
1. For each active assignment, fetch related permissions via `role_permissions`
2. Collect all `permission.code` values
3. Return unique list as `capabilities[]`
4. Cache result in user session (optional optimization)

---

### A-5: Permission Middleware

**File:** `apps/api-server/src/middleware/permission.middleware.ts`

**Function:** `requirePermission(...requiredPermissions: string[])`

**Logic:**
```typescript
export function requirePermission(...required: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // 1. Get user from request (set by auth middleware)
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Please login to continue'
      });
    }

    // 2. Get user's capabilities
    // Option A: From session/cache
    // Option B: Fresh query from database
    const capabilities = await getPermissionsForUser(user.id);

    // 3. Check if user has all required permissions
    const hasAll = required.every(p => capabilities.includes(p));

    if (!hasAll) {
      return res.status(403).json({
        code: 'PERMISSION_DENIED',
        message: 'You do not have permission to perform this action',
        required,
        missing: required.filter(p => !capabilities.includes(p))
      });
    }

    next();
  };
}

// Helper function
async function getPermissionsForUser(userId: string): Promise<string[]> {
  // Query role_assignments JOIN role_permissions JOIN permissions
  // WHERE user_id = userId AND assignment.active = true
  // Return permission.code[]
}
```

**Usage Example:**
```typescript
router.post('/enrollments/:id/approve',
  requireAuth(),
  requirePermission('enrollment.approve'),
  approveEnrollmentHandler
);
```

---

### A-6: Admin API Endpoints

**File:** `apps/api-server/src/routes/admin/permissions.routes.ts`

**Endpoints:**

1. **GET /api/admin/permissions**
   - List all permissions
   - Supports pagination, filtering
   - Requires: `admin.all` or `permission.list`

2. **POST /api/admin/permissions**
   - Create new permission
   - Body: { code, name, resource, action, description }
   - Requires: `admin.all` or `permission.create`

3. **PUT /api/admin/permissions/:id**
   - Update permission
   - Requires: `admin.all` or `permission.edit`

4. **DELETE /api/admin/permissions/:id**
   - Delete permission (if not in use)
   - Requires: `admin.all` or `permission.delete`

5. **GET /api/admin/roles/:roleId/permissions**
   - List permissions for a specific role
   - Requires: `admin.all` or `permission.list`

6. **POST /api/admin/roles/:roleId/permissions**
   - Grant permissions to a role
   - Body: { permissionIds: string[] }
   - Requires: `admin.all` or `role.manage_permissions`

7. **DELETE /api/admin/roles/:roleId/permissions/:permissionId**
   - Revoke permission from role
   - Requires: `admin.all` or `role.manage_permissions`

---

### A-7: Testing & Validation

**Test Cases:**

1. **Migration Test**
   - Run migration on test database
   - Verify tables created with correct schema
   - Verify indexes created

2. **Seed Test**
   - Run seed script
   - Verify 15+ permissions created
   - Verify admin role has all permissions

3. **API Test: /me endpoint**
   - Login as user with role assignments
   - Verify `capabilities[]` present in response
   - Verify capabilities match role permissions

4. **Middleware Test**
   - Access endpoint requiring permission
   - Verify 403 if permission missing
   - Verify 200 if permission present

5. **Admin API Test**
   - Create permission via API
   - Grant permission to role
   - Verify permission appears in user's capabilities

---

## 📋 Definition of Done

- [ ] Database migration created and tested
- [ ] `Permission` and `RolePermission` entities implemented
- [ ] Seed data created (15+ permissions)
- [ ] `/me` endpoint returns `capabilities[]` correctly
- [ ] `requirePermission()` middleware functional
- [ ] Admin permissions API endpoints operational
- [ ] All test cases pass
- [ ] Code review completed
- [ ] Phase A report written: `p1_phase_a_report.md`
- [ ] Documentation updated: `p1_rbac_enhancement.md`

---

## 🕓 Timeline

| Task | Duration | Dependencies |
|------|----------|--------------|
| A-1: Migration | 2 hours | None |
| A-2: Entities | 2 hours | A-1 complete |
| A-3: Seed Data | 1 hour | A-2 complete |
| A-4: `/me` Extension | 3 hours | A-2 complete |
| A-5: Middleware | 2 hours | A-4 complete |
| A-6: Admin API | 4 hours | A-2, A-5 complete |
| A-7: Testing | 4 hours | All above complete |
| Documentation | 2 hours | Parallel |

**Total:** ~20 hours (~2.5 days)

---

## 📦 Git Workflow

**Branch:** `feat/user-refactor-p1-rbac/phase-a-schema`

**Commit Messages:**
```
feat(p1-rbac): phase-a - add permissions and role_permissions tables
feat(p1-rbac): phase-a - create Permission and RolePermission entities
feat(p1-rbac): phase-a - add permission seed data
feat(p1-rbac): phase-a - extend /me endpoint with capabilities
feat(p1-rbac): phase-a - implement requirePermission middleware
feat(p1-rbac): phase-a - add admin permissions API
test(p1-rbac): phase-a - add comprehensive test suite
docs(p1-rbac): phase-a - add implementation report
```

---

## 🔗 Related Documents

- [P1 Kickoff Plan](../planning/p1_kickoff_task_order.md)
- [P1 RBAC Enhancement Spec](../specs/p1_rbac_enhancement.md) (to be created)
- [P0 Implementation Report](../investigations/user-refactor_2025-11/zerodata/p0_phase_c_implementation_report.md)

---

## 🚦 Dependencies & Prerequisites

| Item | Status | Notes |
|------|--------|-------|
| P0 Release | ✅ Complete | v2.0.0-p0 released |
| P0 72h Monitoring | ⏸️ In Progress | Must complete before starting |
| Database Access | ✅ Ready | PostgreSQL 15 |
| TypeORM Setup | ✅ Ready | Existing configuration |
| Test Database | ✅ Ready | For migration testing |

---

## ⚠️ Important Notes

### Backward Compatibility
- All existing endpoints continue to work
- `requireRole()` middleware still functional
- Gradual migration: use `requirePermission()` for new endpoints only

### Performance Considerations
- Cache user capabilities in session/JWT
- Use database indexes for permission queries
- Optimize `/me` endpoint with eager loading

### Security
- Permission checks happen server-side only
- Frontend `hasPermission()` is for UX only
- Never trust client-side permission state

### Migration Strategy
- Existing role assignments are unaffected
- Permissions are additive (no data loss)
- Rollback: drop new tables, revert middleware changes

---

## 🎯 Success Criteria

Phase A is successful when:

1. ✅ All 15+ base permissions exist in database
2. ✅ Admin role has all permissions assigned
3. ✅ `/me` returns accurate `capabilities[]` for all users
4. ✅ `requirePermission()` correctly allows/denies access
5. ✅ Admin can manage permissions via API
6. ✅ No regression in existing functionality
7. ✅ All tests pass
8. ✅ Documentation is complete and accurate

---

## 🔄 Next Steps

After Phase A completion:

1. Merge `phase-a-schema` into `feat/user-refactor-p1-rbac`
2. Create Phase A report with metrics and learnings
3. Begin Phase B: Enrollment Notifications & UX
4. Update frontend to use `capabilities[]` for UI logic

---

**Document Owner:** Platform Team
**Review Required:** Tech Lead approval before implementation
**Implementation Start:** After P0 72h monitoring completion (2025-11-12)

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>

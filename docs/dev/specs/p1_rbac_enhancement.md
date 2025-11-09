# P1 RBAC Enhancement: Permission-Based Access Control

**Project:** o4o-Platform - P1 RBAC Enhancement
**Version:** 1.0
**Created:** 2025-11-09
**Status:** 📋 Design Complete
**Implementation:** Phase A (2025-11-12~)

---

## 📋 Executive Summary

This specification details the transition from role-based to **permission-based access control (PBAC)** in the o4o platform. Building on P0's zero-data role assignment system, P1 adds granular permissions that allow fine-grained control over what users can do within each role.

**Key Changes:**
- New `permissions` and `role_permissions` tables
- `/me` endpoint returns `capabilities[]` array
- `requirePermission(resource, action)` middleware
- Admin UI for permission management
- Backward compatible with P0 role system

---

## 🎯 Goals & Non-Goals

### Goals
✅ Implement permission-based access control
✅ Extend `/me` to include user capabilities
✅ Create admin interface for permission management
✅ Maintain backward compatibility with P0
✅ Prepare foundation for multi-tenancy (P2+)

### Non-Goals
❌ Complete UI overhaul (incremental updates only)
❌ Permission inheritance/hierarchy (future: P2)
❌ Custom permissions per organization (future: multi-tenancy)
❌ Permission expiration/time-based access (future)

---

## 🏗️ Architecture

### Current State (P0)

```
User → RoleAssignment (role: "supplier")
         → hasRole("supplier") → Allow/Deny
```

**Limitations:**
- Binary: user either has role or doesn't
- No granularity: can't restrict specific actions
- Hard to audit: unclear what role allows

### Future State (P1)

```
User → RoleAssignment (role: "supplier")
         → RolePermission[] (permissions: ["product.create", "order.view"])
           → hasPermission("product.create") → Allow/Deny
```

**Benefits:**
- Granular: control individual actions
- Flexible: same role, different permissions per user
- Auditable: clear log of what changed
- Scalable: foundation for complex RBAC

---

## 🗄️ Database Schema

### Table: `permissions`

```sql
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(100) UNIQUE NOT NULL,           -- e.g., "product.create"
  name VARCHAR(200) NOT NULL,                  -- e.g., "Create Product"
  resource VARCHAR(50) NOT NULL,               -- e.g., "product"
  action VARCHAR(50) NOT NULL,                 -- e.g., "create"
  description TEXT,                            -- Human-readable explanation
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Ensure code follows pattern: resource.action
  CONSTRAINT code_format CHECK (code ~ '^[a-z_]+\.[a-z_]+$')
);

CREATE INDEX idx_permissions_code ON permissions(code);
CREATE INDEX idx_permissions_resource ON permissions(resource);
```

**Design Decisions:**

1. **`code` as Unique Identifier**
   - Human-readable (better than UUID in logs)
   - Self-documenting (clear what it allows)
   - Stable (won't change once deployed)

2. **`resource.action` Pattern**
   - Consistent naming convention
   - Easy to search/filter
   - Supports future wildcard matching (e.g., `product.*`)

3. **Separate `resource` and `action` Fields**
   - Allows grouping by resource
   - Enables dynamic permission UI
   - Facilitates bulk operations

---

### Table: `role_permissions`

```sql
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_assignment_id UUID NOT NULL REFERENCES role_assignments(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_at TIMESTAMP DEFAULT NOW(),
  granted_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- One permission per assignment
  UNIQUE(role_assignment_id, permission_id)
);

CREATE INDEX idx_role_permissions_assignment ON role_permissions(role_assignment_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);
CREATE INDEX idx_role_permissions_granted_by ON role_permissions(granted_by);
```

**Design Decisions:**

1. **Link to `role_assignments`, not `roles`**
   - Permissions are per user-role assignment
   - Allows different permissions for same role
   - Supports future custom permissions

2. **Audit Fields (`granted_by`, `granted_at`)**
   - Track who granted permission
   - Essential for compliance
   - Enables permission history

3. **CASCADE on DELETE**
   - If assignment deleted → permissions deleted
   - If permission deleted → assignments unaffected (SET NULL alternative)
   - Prevents orphaned records

---

## 🔐 Permission Naming Convention

### Format: `{resource}.{action}`

**Resources:**
- `enrollment` - Role applications
- `dashboard` - Dashboard access
- `product` - Product management
- `order` - Order management
- `user` - User management
- `admin` - Administrative functions
- `analytics` - Reporting and analytics

**Actions:**
- `create` - Create new entity
- `read` - View single entity
- `list` - View multiple entities
- `edit` - Modify existing entity
- `delete` - Remove entity
- `approve` - Approve request
- `reject` - Reject request
- `export` - Export data
- `all` - Full access to resource

### Examples

| Permission | Resource | Action | Description |
|------------|----------|--------|-------------|
| `enrollment.create` | enrollment | create | Submit role application |
| `enrollment.list` | enrollment | list | View all enrollments (admin) |
| `enrollment.approve` | enrollment | approve | Approve enrollment requests |
| `product.create` | product | create | Create new products |
| `product.edit` | product | edit | Modify product details |
| `order.view` | order | read | View order details |
| `dashboard.supplier` | dashboard | view | Access supplier dashboard |
| `admin.all` | admin | all | Full administrative access |

---

## 🔄 API Changes

### Extended `/me` Endpoint

**Endpoint:** `GET /auth/cookie/me`

**Before (P0):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "assignments": [
    {
      "id": "uuid",
      "role": "supplier",
      "active": true,
      "assignedAt": "2025-11-09T00:00:00Z"
    }
  ]
}
```

**After (P1):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "assignments": [
    {
      "id": "uuid",
      "role": "supplier",
      "active": true,
      "assignedAt": "2025-11-09T00:00:00Z"
    }
  ],
  "capabilities": [
    "product.create",
    "product.edit",
    "product.list",
    "order.view",
    "dashboard.supplier"
  ]
}
```

**Implementation:**
```typescript
// Pseudo-code
async function getCurrentUser(userId: string) {
  const user = await User.findOne(userId);
  const assignments = await RoleAssignment.find({
    userId,
    active: true
  });

  // NEW: Fetch permissions
  const capabilities = await getCapabilities(assignments.map(a => a.id));

  return { user, assignments, capabilities };
}

async function getCapabilities(assignmentIds: string[]): Promise<string[]> {
  const rolePerms = await RolePermission.find({
    where: { role_assignment_id: In(assignmentIds) },
    relations: ['permission']
  });

  return [...new Set(rolePerms.map(rp => rp.permission.code))];
}
```

---

### New Admin API: Permissions Management

#### 1. List All Permissions

```
GET /api/admin/permissions
```

**Query Params:**
- `resource` (string, optional): Filter by resource
- `page` (number, default: 1)
- `limit` (number, default: 20)

**Response:**
```json
{
  "permissions": [
    {
      "id": "uuid",
      "code": "product.create",
      "name": "Create Product",
      "resource": "product",
      "action": "create",
      "description": "Allows creating new products",
      "createdAt": "2025-11-09T00:00:00Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 20
}
```

---

#### 2. Create Permission

```
POST /api/admin/permissions
```

**Requires:** `admin.all` or `permission.create`

**Body:**
```json
{
  "code": "product.archive",
  "name": "Archive Product",
  "resource": "product",
  "action": "archive",
  "description": "Soft-delete products"
}
```

**Response:** 201 Created

---

#### 3. Grant Permissions to Role

```
POST /api/admin/roles/:roleAssignmentId/permissions
```

**Requires:** `admin.all` or `role.manage_permissions`

**Body:**
```json
{
  "permissionIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Response:**
```json
{
  "granted": 3,
  "assignmentId": "uuid",
  "permissions": ["product.create", "product.edit", "product.list"]
}
```

---

#### 4. Revoke Permission from Role

```
DELETE /api/admin/roles/:roleAssignmentId/permissions/:permissionId
```

**Requires:** `admin.all` or `role.manage_permissions`

**Response:** 204 No Content

---

## 🛡️ Middleware

### `requirePermission(...permissions: string[])`

**Purpose:** Check if user has all required permissions

**Usage:**
```typescript
import { requireAuth, requirePermission } from '@/middleware';

router.post('/products',
  requireAuth(),
  requirePermission('product.create'),
  createProductHandler
);

router.delete('/products/:id',
  requireAuth(),
  requirePermission('product.delete', 'admin.all'), // OR logic
  deleteProductHandler
);
```

**Implementation:**
```typescript
export function requirePermission(...required: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Please login to continue'
      });
    }

    // Get capabilities from session or fresh query
    let capabilities: string[];
    if (req.session?.capabilities) {
      capabilities = req.session.capabilities;
    } else {
      capabilities = await getCapabilities(user.assignmentIds);
      req.session.capabilities = capabilities; // Cache for session
    }

    // Check permissions (OR logic)
    const hasAny = required.some(p => capabilities.includes(p));

    if (!hasAny) {
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
```

**OR vs AND Logic:**
- Default: OR (user needs ANY of the permissions)
- For AND: use multiple middleware calls
  ```typescript
  requirePermission('product.create'),
  requirePermission('inventory.manage'),
  ```

---

## 🎨 Frontend Integration

### AuthContext Extension

**File:** `packages/auth-client/src/types.ts`

```typescript
export interface MeResponse {
  user: User;
  assignments: RoleAssignment[];
  capabilities: string[];  // NEW
}
```

**File:** `apps/main-site/src/contexts/AuthContext.tsx`

```typescript
interface AuthContextType {
  user: User | null;
  assignments: RoleAssignment[];
  capabilities: string[];  // NEW
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;  // NEW
  hasAnyPermission: (...permissions: string[]) => boolean;  // NEW
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  // ...
  capabilities: [],
  hasPermission: () => false,
  hasAnyPermission: () => false,
});

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [assignments, setAssignments] = useState<RoleAssignment[]>([]);
  const [capabilities, setCapabilities] = useState<string[]>([]);  // NEW

  const checkAuthStatus = async () => {
    try {
      const data = await cookieAuthClient.getCurrentUser();
      setUser(data.user);
      setAssignments(data.assignments);
      setCapabilities(data.capabilities);  // NEW
    } catch (error) {
      setUser(null);
      setAssignments([]);
      setCapabilities([]);
    }
  };

  const hasPermission = (permission: string): boolean => {
    return capabilities.includes(permission);
  };

  const hasAnyPermission = (...permissions: string[]): boolean => {
    return permissions.some(p => capabilities.includes(p));
  };

  return (
    <AuthContext.Provider value={{
      user,
      assignments,
      capabilities,
      hasRole,
      hasPermission,
      hasAnyPermission,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};
```

**Usage in Components:**
```typescript
const { hasPermission } = useAuth();

return (
  <>
    {hasPermission('product.create') && (
      <Button onClick={handleCreate}>Create Product</Button>
    )}

    {hasPermission('product.edit') && (
      <Button onClick={handleEdit}>Edit</Button>
    )}
  </>
);
```

---

## 🌱 Default Permissions (Seed Data)

### Core Permissions (15+)

| Code | Resource | Action | Roles |
|------|----------|--------|-------|
| `enrollment.create` | enrollment | create | All authenticated |
| `enrollment.read` | enrollment | read | Owner, Admin |
| `enrollment.list` | enrollment | list | Admin |
| `enrollment.approve` | enrollment | approve | Admin |
| `enrollment.reject` | enrollment | reject | Admin |
| `enrollment.hold` | enrollment | hold | Admin |
| `dashboard.supplier` | dashboard | view | Supplier, Admin |
| `dashboard.seller` | dashboard | view | Seller, Admin |
| `dashboard.partner` | dashboard | view | Partner, Admin |
| `product.create` | product | create | Supplier |
| `product.edit` | product | edit | Supplier |
| `product.list` | product | list | Supplier, Seller |
| `order.view` | order | view | Seller, Supplier |
| `order.approve` | order | approve | Admin |
| `admin.all` | admin | all | Admin |

### Seed Logic

```typescript
async function seedPermissions() {
  // 1. Create all permissions
  const permissions = await Permission.save([
    { code: 'enrollment.create', name: 'Submit Application', resource: 'enrollment', action: 'create' },
    { code: 'enrollment.approve', name: 'Approve Application', resource: 'enrollment', action: 'approve' },
    // ... all 15+ permissions
  ]);

  // 2. Find admin role assignments
  const adminAssignments = await RoleAssignment.find({
    where: { role: 'admin', active: true }
  });

  // 3. Grant all permissions to admin
  for (const assignment of adminAssignments) {
    await RolePermission.save(
      permissions.map(p => ({
        role_assignment_id: assignment.id,
        permission_id: p.id,
        granted_by: null, // System grant
      }))
    );
  }

  // 4. Grant role-specific permissions
  const supplierPerms = permissions.filter(p =>
    ['product.create', 'product.edit', 'dashboard.supplier'].includes(p.code)
  );
  // ... grant to supplier assignments
}
```

---

## 🧪 Testing Strategy

### Unit Tests

1. **Permission Model**
   - Create permission with valid data
   - Reject invalid code format
   - Ensure code uniqueness

2. **RolePermission Model**
   - Link permission to assignment
   - Prevent duplicate grants
   - Cascade delete on assignment removal

3. **Middleware**
   - Allow with correct permission
   - Deny with missing permission
   - Handle multiple permissions (OR logic)

### Integration Tests

1. **API: /me endpoint**
   - Returns capabilities for user with assignments
   - Empty capabilities for user without assignments
   - Correct capabilities after permission granted

2. **API: Permission Management**
   - Admin can create permission
   - Admin can grant permission to role
   - Non-admin gets 403

### E2E Tests

1. **User Journey: Permission Grant**
   - Admin grants `product.create` to supplier
   - Supplier refreshes /me
   - Supplier can now create product
   - Supplier still cannot delete product

2. **User Journey: Permission Revoke**
   - Admin revokes `product.edit`
   - Supplier can no longer edit products
   - Edit button hidden in UI

---

## 📊 Monitoring & Metrics

### Key Metrics

1. **Permission Usage**
   - Most frequently used permissions
   - Unused permissions (candidates for removal)
   - Permission grant/revoke frequency

2. **Access Denials**
   - 403 errors by permission
   - Users attempting unauthorized actions
   - Potential indicator of UX issues

3. **Performance**
   - `/me` response time (with capabilities)
   - Permission check latency
   - Cache hit rate

### Logging

**Permission Checks:**
```typescript
logger.info('Permission check', {
  userId: user.id,
  required: permissions,
  granted: hasPermission,
  endpoint: req.path
});
```

**Permission Changes:**
```typescript
logger.info('Permission granted', {
  assignmentId,
  permissionId,
  grantedBy,
  timestamp
});
```

---

## 🔄 Migration Path

### Phase 1: Additive Changes (Phase A)
- Add new tables
- Extend `/me` endpoint
- Create middleware (parallel to existing)
- **No breaking changes**

### Phase 2: Gradual Adoption (Phase B-C)
- Use `requirePermission()` for new endpoints
- Keep `requireRole()` for existing endpoints
- Both systems coexist

### Phase 3: Full Migration (P2+, optional)
- Migrate all endpoints to `requirePermission()`
- Deprecate `requireRole()`
- Remove legacy middleware

---

## 🚨 Rollback Strategy

### Rollback Scenarios

1. **Permission system not working**
   - Disable `requirePermission()` middleware
   - Fall back to `requireRole()`
   - Keep new tables (data preserved)

2. **Performance issues**
   - Implement caching (Redis)
   - Optimize queries (add indexes)
   - Reduce `/me` calls

3. **Complete rollback**
   - Revert migration (drop tables)
   - Remove middleware code
   - Restore `/me` endpoint

**Rollback Command:**
```bash
# Revert migration
npm run migration:revert

# Rollback git changes
git revert <commit-sha>
```

---

## 🔐 Security Considerations

### Best Practices

1. **Server-Side Checks Only**
   - Never trust client-side permission checks
   - Frontend `hasPermission()` is for UX only
   - Always enforce on backend

2. **Principle of Least Privilege**
   - Grant minimum permissions needed
   - Regular permission audits
   - Remove unused permissions

3. **Audit Trail**
   - Log all permission changes
   - Track who granted/revoked
   - Retain logs for compliance

4. **Session Security**
   - Capabilities cached in session
   - Invalidate on permission change
   - Re-fetch on suspicious activity

---

## 📈 Performance Optimization

### Caching Strategy

1. **Session-Level Cache**
   ```typescript
   // Cache capabilities in user session
   req.session.capabilities = await getCapabilities(userId);
   ```

2. **Application-Level Cache (Optional: Redis)**
   ```typescript
   const cacheKey = `capabilities:${userId}`;
   let capabilities = await redis.get(cacheKey);

   if (!capabilities) {
     capabilities = await getCapabilities(userId);
     await redis.set(cacheKey, capabilities, { EX: 300 }); // 5min TTL
   }
   ```

3. **Database Indexes**
   - Index on `role_permissions(role_assignment_id)`
   - Index on `permissions(code)`
   - Consider materialized view for complex queries

### Query Optimization

**Before (N+1 queries):**
```typescript
for (const assignment of assignments) {
  const perms = await RolePermission.find({ assignment_id: assignment.id });
  capabilities.push(...perms.map(p => p.permission.code));
}
```

**After (Single query):**
```typescript
const perms = await RolePermission.find({
  where: { role_assignment_id: In(assignmentIds) },
  relations: ['permission']
});
capabilities = [...new Set(perms.map(p => p.permission.code))];
```

---

## 🔗 Related Documents

- [P1 Kickoff Plan](../planning/p1_kickoff_task_order.md)
- [P1 Phase A Work Order](../tasks/p1_phase_a_work_order.md)
- [P0 Implementation Report](../investigations/user-refactor_2025-11/zerodata/p0_phase_c_implementation_report.md)

---

## 📝 Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-11-09 | 1.0 | Initial specification | Rena |

---

**Document Status:** ✅ Ready for Review
**Next Steps:** Implementation in Phase A (after P0 72h monitoring)
**Approval Required:** Tech Lead, Product Owner

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>

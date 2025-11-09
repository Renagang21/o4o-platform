# O4O Platform Routing System Investigation

## Executive Summary

The O4O platform uses a **hierarchical routing architecture** with centralized configuration for the backend and component-based routing for the frontend. Both systems implement role-based access control (RBAC) with rate limiting, authentication middleware, and permission checking.

---

## FRONTEND ROUTING

### 1. Main-Site Application (`apps/main-site/src/App.tsx`)

**Framework:** React Router v6 (BrowserRouter)

**Route Structure:**
- Public routes (no authentication)
- Protected routes (authentication required)
- Role-guarded routes (specific role/approval required)

**Key Routes:**

```
/                                  # HomePage (public)
/posts/:slugOrId                   # Post detail with Layout
/pages/:slug                        # Page viewer
/blog                              # Blog archive
/blog/:slugOrId                    # Blog post detail

AUTH ROUTES:
/signup, /register                 # User signup
/auth/signup, /auth/register       # Alternative signup paths
/logout                            # Logout
/auth/callback                     # OAuth callback
/auth/callback/:provider           # Provider-specific callback
/auth/verify-email/*               # Email verification flow
/auth/forgot-password              # Password reset request
/auth/reset-password               # Password reset form

P0 RBAC ROUTES (Role Application & Dashboard):
/apply/supplier                    # Apply for supplier role
/apply/seller                      # Apply for seller role
/apply/partner                     # Apply for partner role
/apply/:role/status                # Check application status

/dashboard/supplier                # Supplier dashboard (role-guarded)
/dashboard/seller                  # Seller dashboard (role-guarded)
/dashboard/partner                 # Partner dashboard (role-guarded)

EDITOR ROUTES (Protected):
/editor/page/:id?                  # Page editor

DYNAMIC ROUTES (Catch-all):
/:slug                             # Dynamic page/post by slug
*                                  # 404 fallback
```

**Protection Mechanisms:**

1. **PrivateRoute Component**
   ```tsx
   // Checks: isAuthenticated + user present
   // Redirects to: /auth/login if not authenticated
   ```

2. **RoleGuard Component** (P0 RBAC)
   ```tsx
   // Checks: user.hasRole(role)
   // Role types: 'supplier' | 'seller' | 'partner'
   // Redirects to: /apply/{role}/status if not approved
   ```

3. **Lazy Loading with Suspense**
   ```tsx
   const PageEditor = lazy(() => import('./pages/PageEditor'));
   <Suspense fallback={<PageLoader />}>
     <PageEditor />
   </Suspense>
   ```

---

### 2. Admin Dashboard (`apps/admin-dashboard/src/App.tsx`)

**Framework:** React Router v6 with AuthProvider (SSO Integration)

**Route Structure:**
- Public: `/login`, `/forgot-password`, `/reset-password`
- Protected: All other routes require `AdminProtectedRoute`

**Key Routes:**

```
PUBLIC:
/login                             # Admin login
/forgot-password                   # Password reset request
/reset-password                    # Password reset form

PROTECTED ROUTES (Require AdminProtectedRoute):

EDITOR ROUTES:
/editor/posts/new                  # Create new post
/editor/posts/:id                  # Edit post
/editor/pages/new                  # Create new page
/editor/pages/:id                  # Edit page
/editor/templates/:id              # Edit template
/editor/patterns/:id               # Edit block pattern

CONTENT MANAGEMENT:
/posts                             # Post list
/categories                        # Categories management
/categories/new                    # Create category
/categories/edit/:id               # Edit category
/posts/tags                        # Tags management

PAGES:
/pages/*                           # Page router (nested)

MEDIA:
/media/*                           # Media library

USER MANAGEMENT:
/users                             # User list
/users/add, /users/new             # Create user
/users/profile                     # Profile view
/users/roles                       # Role management
/users/statistics                  # User statistics
/users/:id                         # User detail
/users/:id/edit                    # Edit user

ENROLLMENTS (P0 RBAC):
/enrollments                       # Role application review
/admin/enrollments                 # Alternative path

APPEARANCE:
/customize                         # Theme customizer
/appearance/menus/*                # Menu management
/appearance/template-parts         # Template parts list
/appearance/template-parts/new     # Create template part
/appearance/template-parts/:id/edit # Edit template part

CPT ENGINE:
/cpt-engine/*                      # Unified CPT/ACF management
/cpt-engine/presets/forms          # Form presets
/cpt-engine/presets/views          # View presets
/cpt-engine/presets/templates      # Template presets

DROPSHIPPING:
/dropshipping/*                    # Dropshipping module router

FORUM:
/forum/*                           # Forum module router

SIGNAGE:
/signage/*                         # Digital signage router

CROWDFUNDING:
/crowdfunding/*                    # Crowdfunding router

TOOLS:
/tools                             # Tools page
/tools/media-replace               # Media file replace tool

SETTINGS:
/settings/*                        # Settings router

MONITORING:
/monitoring                        # System monitoring
/monitoring/performance            # Performance dashboard
/monitoring/security               # Security monitoring

ANALYTICS:
/analytics/*                       # Analytics router

OPERATIONS:
/admin/dashboard/operations        # Phase 2.4 operations panel

TEST ROUTES:
/admin/test/minimal-editor         # Test: Minimal editor
/admin/test/ai-page-generator-test # Test: AI page generator
/admin/test/focus-restoration      # Test: Focus restoration
/admin/test/ai-block-debug         # Test: AI block debugging
/admin/test/seed-presets           # Test: Seed presets
/admin/test/preset-integration     # Test: Preset integration

UTILITY:
/ui-showcase                       # UI component showcase
/admin/preview                     # Preview page (no auth required)
/preview/posts/:id                 # Post preview
/preview/pages/:id                 # Page preview
```

**Protection Mechanisms:**

1. **AdminProtectedRoute Component** (from @o4o/auth-context)
   ```tsx
   interface AdminProtectedRouteProps {
     children: ReactNode;
     requiredRoles?: string[];        // e.g., ['admin']
     requiredPermissions?: string[];  // e.g., ['users:read', 'content:write']
     showContactAdmin?: boolean;      // Show error message
   }
   ```

   **Access Control Logic:**
   - Checks `isAuthenticated` and `user` presence
   - Validates `user.role` against `requiredRoles`
   - Checks permissions (currently simplified: admin = all permissions)
   - Shows `AccessDeniedComponent` if requirements not met
   - Redirects to `/login` if not authenticated

2. **Nested Protection**
   ```tsx
   <Route path="/*" element={
     <AdminProtectedRoute requiredRoles={['admin']}>
       <AdminLayout>
         <Routes>
           <Route path="/users" element={
             <AdminProtectedRoute requiredPermissions={['users:read']}>
               <UsersPage />
             </AdminProtectedRoute>
           } />
         </Routes>
       </AdminLayout>
     </AdminProtectedRoute>
   } />
   ```

3. **Lazy Loading**
   - All pages are lazy-loaded with `React.lazy()`
   - Suspense boundary with `PageLoader` component
   - Improves initial bundle size

---

## BACKEND ROUTING

### 1. Server Architecture

**Main File:** `apps/api-server/src/main.ts`

**Route Configuration:** `apps/api-server/src/config/routes.config.ts`

**Key Setup Points:**
1. Middleware configuration (CORS, compression, security)
2. Session management (Redis-based in production)
3. Route registration via `setupRoutes(app)`
4. Swagger documentation setup

---

### 2. Route Organization (`setupRoutes` function)

**Priority-based Route Registration:**

```
PRIORITY 1: HEALTH & MONITORING (No rate limiting)
  GET /health
  GET /api/health
  GET /metrics
  GET /api/auth/health
  GET /api/ecommerce/health

PRIORITY 2: AUTHENTICATION (Before rate limiting)
  POST /api/auth/login
  POST /api/auth/signup
  POST /api/auth/logout
  GET /api/auth/verify
  POST /api/v1/auth/cookie/...
  GET /api/v1/social/...
  POST /api/auth/email/...
  POST /api/auth/accounts/...

PRIORITY 3: PUBLIC ROUTES (Lenient rate limiting)
  GET /api/public/*
  GET /api/v1/posts
  GET /api/v1/pages
  GET /api/categories
  GET /api/tags
  GET /api/media/gallery
  GET /api/preview/*

PRIORITY 4: SETTINGS (Before standard rate limiting)
  GET /api/v1/settings/*
  GET /api/v1/customizer/*
  GET /api/v1/customizer-presets/*

PRIORITY 5: V1 API (Standard rate limiting)
  GET /api/v1/users
  POST /api/v1/users
  GET /api/v1/content/*
  GET /api/v1/platform/*
  POST /api/v1/ai/*
  GET /api/v1/media/*
  POST /api/v1/enrollments
  GET /api/v1/applications/*

PRIORITY 6: LEGACY ROUTES
  GET /api/cpt/*
  POST /api/post-creation/*
  GET /api/content/*

PRIORITY 7: DASHBOARD ENDPOINTS
  GET /ecommerce/dashboard/stats
  GET /api/users/stats
  GET /api/admin/notifications
  POST /api/posts/:id/publish

PRIORITY 8: ERROR HANDLERS (MUST BE LAST)
  404 handler
  Global error handler
```

---

### 3. Rate Limiting Strategy

```typescript
// Different limiters for different endpoint types

standardLimiter          // Most API endpoints
publicLimiter           // Public content (lenient)
settingsLimiter         // Settings endpoints (lenient)
ssoCheckLimiter         // SSO verification (lenient)
userPermissionsLimiter  // User permission checks
enrollmentLimiter       // Role enrollment endpoints
adminReviewLimiter      // Admin enrollment review
```

---

### 4. Example Route File Structure

**Pattern from `apps/api-server/src/routes/enrollments.routes.ts`:**

```typescript
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';

const router: Router = Router();

/**
 * POST /enrollments
 * Create a new role enrollment (application)
 *
 * @body { role: 'supplier'|'seller'|'partner', fields: {...}, agree?: {...} }
 * @returns 201 { id, user_id, role, status: "pending", ... }
 */
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  // Route handler
});

/**
 * GET /enrollments/:id
 * Get enrollment details
 */
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  // Route handler
});

export default router;
```

**Pattern from `apps/api-server/src/routes/users.routes.ts`:**

```typescript
const router: Router = Router();
const userController = new UserManagementController();

// Validation rules (reusable)
const createUserValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  // ... more rules
];

// Middleware pipeline: validation → error checking → handler
router.post(
  '/',
  [createUserValidation],
  validateRequest,
  userController.createUser
);

// Protected with authentication
router.use(authenticate);
router.use(requireAdmin);

// Admin-only endpoints
router.get('/', [paginationValidation], validateRequest, userController.getUsers);
router.get('/:id', [param('id').isUUID()], validateRequest, userController.getUser);

export default router;
```

---

### 5. Authentication Middleware

**Location:** `apps/api-server/src/middleware/auth.middleware.ts`

**Key Functions:**

```typescript
/**
 * extractToken(req: Request): string | null
 * - Tries Bearer token from Authorization header
 * - Falls back to httpOnly cookie (accessToken)
 * - Returns null if neither present
 */

/**
 * requireAuth(req: AuthRequest, res: Response, next: NextFunction)
 * - Validates JWT token
 * - Loads user from database
 * - Checks user.isActive status
 * - Attaches user to req.user
 * - Returns 401 if invalid
 */

/**
 * AuthRequest interface
 * - Extends Express Request
 * - Adds user property with User entity type
 */
interface AuthRequest extends Request {
  user?: User;
}
```

**Token Sources (Priority):**
1. `Authorization: Bearer <token>` header
2. `accessToken` httpOnly cookie (production)

---

### 6. Complete Route Import/Export Pattern

**File:** `apps/api-server/src/config/routes.config.ts`

```typescript
// 1. Import route modules
import authRoutes from '../routes/auth.js';
import authV2Routes from '../routes/auth-v2.js';
import userRoutes from '../routes/users.routes.js';
import usersV1Routes from '../routes/v1/users.routes.js';
import adminRoutes from '../routes/admin.js';
// ... 90+ more route imports

// 2. Setup function
export function setupRoutes(app: Application): void {
  // Register all routes with appropriate middleware/limiters
  app.use('/api/auth', authRoutes);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userPermissionsLimiter, usersV1Routes);
  // ... all routes registered
  
  // Error handlers last
  app.use(errorHandler);
  app.use('*', notFoundHandler);
}

// 3. In main.ts
setupRoutes(app);
```

---

### 7. P0 RBAC Middleware

**Location:** `apps/api-server/src/middleware/auth.middleware.ts`

```typescript
/**
 * P0 RBAC: requireAuth
 * - Basic authentication check (401 if missing)
 * - Loads user with relations: dbRoles, permissions
 * - Checks user.isActive
 */

/**
 * P0 RBAC: hasRole(role: string)
 * - Checks if user has RoleAssignment
 * - Verifies status is ACTIVE
 */

/**
 * P0 RBAC: hasPermission(permission: string)
 * - Checks user.dbRoles for permission
 * - Used for granular access control
 */
```

---

## DYNAMIC ROUTING PATTERNS

### 1. Frontend Dynamic Routes

**Main-Site:** 
```tsx
// Catch-all for custom pages created via editor
<Route path="/:slug" element={<PublicPage />} />

// Editor with optional ID
<Route path="/editor/page/:id?" element={<PageEditor />} />
```

**Admin Dashboard:**
```tsx
// Nested routers for sub-modules
<Route path="/cpt-engine/*" element={<CPTEngine />} />
<Route path="/dropshipping/*" element={<DropshippingRouter />} />
<Route path="/forum/*" element={<ForumRouter />} />

// Each sub-router handles its own routes internally
```

### 2. Backend Dynamic Routes

**Example: V1 User Routes**
```typescript
/api/v1/users              # GET all, POST create
/api/v1/users/statistics   # GET statistics
/api/v1/users/pending      # GET pending approvals
/api/v1/users/new          # GET new user form
/api/v1/users/:id          # GET, PUT, DELETE specific user
/api/v1/users/:id/edit     # PUT edit specific user
```

**Example: Admin Sub-routes**
```typescript
/api/v1/admin/dropshipping # Dropshipping admin endpoints
/api/v1/admin/forum        # Forum admin endpoints
/api/v1/admin/users        # User admin endpoints
/api/v1/admin/suppliers    # Supplier admin endpoints
```

---

## CENTRALIZED CONFIGURATION

### Frontend Configuration

**No centralized config file.** Routes defined directly in:
- `apps/main-site/src/App.tsx` (main site routes)
- `apps/admin-dashboard/src/App.tsx` (admin routes)
- Individual router components (e.g., `PagesRouter`, `ForumRouter`)

### Backend Configuration

**Centralized:** `apps/api-server/src/config/routes.config.ts`

**Advantages:**
- Single source of truth for all routes
- Clear route ordering and priorities
- Rate limiter assignment visible at a glance
- Easy to audit access control

**Structure:**
```typescript
function setupRoutes(app: Application): void {
  // 1. Health & Monitoring (no rate limit)
  // 2. Authentication (before rate limit)
  // 3. Public Routes (lenient limit)
  // 4. Settings (before standard limit)
  // 5. V1 API (standard limit)
  // 6. Legacy Routes
  // 7. Dashboard
  // 8. Root endpoint
  // 9. Stub routes
  // 10. Error handlers (MUST BE LAST)
}
```

---

## ROUTE PROTECTION SUMMARY

### Frontend Protection

| Component | Purpose | Usage |
|-----------|---------|-------|
| `PrivateRoute` | Authentication check | Login-required routes |
| `RoleGuard` | Role verification | Supplier/Seller/Partner dashboards |
| `AdminProtectedRoute` | Admin + permission check | Admin dashboard routes |
| Lazy Loading | Code splitting | All main pages |

### Backend Protection

| Middleware | Purpose | Usage |
|-----------|---------|-------|
| `authenticate` | Token validation | Most protected endpoints |
| `requireAuth` | P0 RBAC: Auth required | Role enrollment endpoints |
| `requireAdmin` | Admin role check | Admin-only endpoints |
| Rate Limiters | Request throttling | All endpoints (different tiers) |
| Passport | OAuth/SSO | Social login flows |

---

## CURRENT PATTERNS & BEST PRACTICES

### Route Naming
- **Public:** `/api/public/*`, `/api/v1/posts`, etc.
- **Protected:** `/api/v1/users`, `/api/admin/*`
- **Versioned:** `/api/v1/*` (current), `/api/*` (legacy)
- **Modules:** `/api/v1/{module}/*` (clean separation)

### Validation
- Express-validator for request validation
- Reusable validation chains
- Centralized error handling

### Authentication Flow
1. Frontend sends JWT (header or cookie)
2. Backend extracts and verifies token
3. Middleware attaches user to `req.user`
4. Route handlers access `req.user`

### Error Handling
- Global error handler at end of middleware stack
- 404 handler for undefined routes
- Consistent error response format

---

## FILES REFERENCED

### Frontend
- `/home/sohae21/o4o-platform/apps/main-site/src/App.tsx`
- `/home/sohae21/o4o-platform/apps/admin-dashboard/src/App.tsx`
- `/home/sohae21/o4o-platform/apps/main-site/src/components/auth/PrivateRoute.tsx`
- `/home/sohae21/o4o-platform/apps/main-site/src/components/auth/RoleGuard.tsx`
- `/home/sohae21/o4o-platform/packages/auth-context/src/AdminProtectedRoute.tsx`

### Backend
- `/home/sohae21/o4o-platform/apps/api-server/src/main.ts`
- `/home/sohae21/o4o-platform/apps/api-server/src/config/routes.config.ts`
- `/home/sohae21/o4o-platform/apps/api-server/src/middleware/auth.middleware.ts`
- `/home/sohae21/o4o-platform/apps/api-server/src/routes/*.ts` (90+ route files)

---

## RECOMMENDATIONS FOR IMPROVEMENT

### Frontend
1. **Route Centralization:** Consider creating a routes config file (e.g., `routes.config.ts`) to centralize route definitions
2. **Route Constants:** Define route paths as constants to avoid string duplication
3. **Nested Route Organization:** Consider organizing sub-routes in dedicated routers (like admin dashboard does)

### Backend
1. **Route Documentation:** Add JSDoc comments to route handlers (partially done)
2. **API Documentation:** Expand Swagger documentation with request/response schemas
3. **Permission Checking:** Implement granular permission checking middleware (currently simplified for admin)
4. **Rate Limiting Tuning:** Review rate limit thresholds based on production usage


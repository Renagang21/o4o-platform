# O4O Platform Routing - Quick Reference

## Frontend Routes at a Glance

### Main Site (apps/main-site/src/App.tsx)
```
PUBLIC:
/                    → HomePage
/posts/:slugOrId     → Post detail
/pages/:slug         → Page viewer
/blog                → Blog archive

AUTH:
/signup              → User signup
/auth/callback       → OAuth redirect
/auth/verify-email/* → Email verification

PROTECTED (PrivateRoute):
/editor/page/:id?    → Page editor
/apply/:role         → Role application

ROLE-GUARDED (RoleGuard):
/dashboard/supplier  → Supplier dashboard
/dashboard/seller    → Seller dashboard
/dashboard/partner   → Partner dashboard

DYNAMIC:
/:slug               → Any custom page/post
*                    → 404 fallback
```

### Admin Dashboard (apps/admin-dashboard/src/App.tsx)
```
PUBLIC:
/login               → Admin login
/forgot-password     → Password reset

PROTECTED (AdminProtectedRoute):
/editor/*            → Content editors
/posts               → Post management
/users               → User management
/categories          → Category management
/pages/*             → Page management
/media/*             → Media library
/settings/*          → Settings
/cpt-engine/*        → Custom post types
/dropshipping/*      → Dropshipping
/forum/*             → Forum module
/signage/*           → Digital signage
/crowdfunding/*      → Crowdfunding
/analytics/*         → Analytics
/monitoring          → System monitoring
/enrollments         → Role review (admin)
```

---

## Backend Routes Hierarchy

### 1. HEALTH & MONITORING (No rate limit)
```
GET /health
GET /api/health
GET /metrics
```

### 2. AUTHENTICATION (Priority before rate limit)
```
POST /api/auth/login
POST /api/auth/signup
POST /api/v1/auth/cookie/*
GET /api/v1/social/*
```

### 3. PUBLIC ROUTES (Lenient limiter)
```
GET /api/public/*
GET /api/v1/posts
GET /api/v1/pages
GET /api/categories
GET /api/preview/*
```

### 4. SETTINGS (Special limiter)
```
GET /api/v1/settings/*
GET /api/v1/customizer/*
```

### 5. MAIN API (Standard limiter)
```
/api/v1/users          → User management
/api/v1/content/*      → Content
/api/v1/enrollments    → Role applications
/api/v1/admin/*        → Admin endpoints
/api/v1/dropshipping/* → Dropshipping
/api/v1/forum/*        → Forum
```

### 6. LEGACY ROUTES
```
/api/cpt/*
/api/content/*
/api/post-creation/*
```

---

## Protection Mechanisms

### Frontend
| Layer | Check | Component |
|-------|-------|-----------|
| 1 | Authenticated? | PrivateRoute |
| 2 | Has role? | RoleGuard |
| 3 | Has permission? | AdminProtectedRoute |

### Backend
| Layer | Check | Middleware |
|-------|-------|-----------|
| 1 | Valid JWT? | requireAuth |
| 2 | User active? | requireAuth |
| 3 | Admin role? | requireAdmin |
| 4 | Rate limit? | Various limiters |

---

## Key Files

### Frontend Route Definitions
- `/home/sohae21/o4o-platform/apps/main-site/src/App.tsx` (229 lines)
- `/home/sohae21/o4o-platform/apps/admin-dashboard/src/App.tsx` (755 lines)

### Frontend Protection Components
- `/home/sohae21/o4o-platform/apps/main-site/src/components/auth/PrivateRoute.tsx`
- `/home/sohae21/o4o-platform/apps/main-site/src/components/auth/RoleGuard.tsx`
- `/home/sohae21/o4o-platform/packages/auth-context/src/AdminProtectedRoute.tsx`

### Backend Configuration
- `/home/sohae21/o4o-platform/apps/api-server/src/config/routes.config.ts` (525 lines)
- `/home/sohae21/o4o-platform/apps/api-server/src/middleware/auth.middleware.ts`

---

## Common Patterns

### Frontend: Protected Route
```tsx
<Route path="/dashboard/supplier" element={
  <PrivateRoute>
    <RoleGuard role="supplier">
      <SupplierDashboard />
    </RoleGuard>
  </PrivateRoute>
} />
```

### Frontend: Admin Route
```tsx
<Route path="/users" element={
  <AdminProtectedRoute requiredPermissions={['users:read']}>
    <UsersPage />
  </AdminProtectedRoute>
} />
```

### Backend: Protected Endpoint
```typescript
router.post(
  '/',
  requireAuth,
  [validation],
  validateRequest,
  controller.handler
);
```

### Backend: Admin Endpoint
```typescript
router.use(authenticate);
router.use(requireAdmin);
router.get('/', controller.listUsers);
```

---

## Rate Limiters Used

| Name | Usage |
|------|-------|
| `standardLimiter` | Most API endpoints |
| `publicLimiter` | Public content (lenient) |
| `settingsLimiter` | Settings endpoints |
| `userPermissionsLimiter` | User permission checks |
| `enrollmentLimiter` | Role applications |
| `adminReviewLimiter` | Admin review endpoints |
| None | Health & monitoring |

---

## Authentication Flow

### Frontend → Backend
```
1. User submits login form
2. Frontend calls POST /api/auth/login
3. Backend returns JWT token
4. Frontend stores in localStorage/cookie
5. Frontend sets in Authorization header (or uses cookie)
```

### On Each Request
```
Frontend:
1. Include token in Authorization: Bearer <token>
   OR send httpOnly cookie

Backend:
1. Extract token from header or cookie
2. Verify JWT signature
3. Load user from database
4. Check user.isActive
5. Attach user to req.user
6. Process request
```

---

## Quick Tips

### Adding a New Protected Route

**Frontend:**
```tsx
<Route path="/new-feature" element={
  <PrivateRoute>
    <NewFeaturePage />
  </PrivateRoute>
} />
```

**Backend:**
```typescript
// 1. Create routes/newFeature.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();
router.get('/', requireAuth, handler);
export default router;

// 2. Add to routes.config.ts
import newFeatureRoutes from '../routes/newFeature.routes.js';
app.use('/api/v1/new-feature', standardLimiter, newFeatureRoutes);
```

### Adding a New Admin Route

**Frontend:**
```tsx
<Route path="/admin/new-section" element={
  <AdminProtectedRoute requiredPermissions={['admin']}>
    <NewAdminSection />
  </AdminProtectedRoute>
} />
```

**Backend:**
```typescript
router.use(authenticate);
router.use(requireAdmin);
router.get('/', controller.getData);
```

---

Generated: 2025-11-09
Source: Complete investigation of O4O platform routing systems

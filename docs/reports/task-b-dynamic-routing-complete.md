# Task B: Dynamic Routing System Complete

**Date**: 2025-12-14
**Branch**: `feature/cms-core`
**Status**: Completed (Foundation Phase)

---

## Summary

Task B (Dynamic Routing System)의 기반 인프라가 완성되었습니다. Routes API와 DynamicRouteLoader 컴포넌트가 구현되어 manifest.viewTemplates 기반 동적 라우팅의 토대가 마련되었습니다.

**참고**: Task A와 동일한 전략으로 기존 하드코딩 라우트는 fallback으로 유지하며, 점진적 마이그레이션을 지원합니다.

---

## Changes Made

### 1. Routes API Endpoint (Step 2)

**File**: `apps/api-server/src/routes/routes.routes.ts` (NEW)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/routes/admin` | GET | Get admin routes with RBAC filtering |
| `/api/v1/routes/stats` | GET | Routes statistics |
| `/api/v1/routes/cache/clear` | POST | Clear routes cache (admin only) |
| `/api/v1/routes/by-app/:appId` | GET | Get routes for specific app |

Features:
- Fetches routes from DynamicRouter (cms-core)
- Role/Permission based filtering
- ServiceGroup/Tenant context support
- ExtendedRouteMeta for RBAC fields

### 2. ViewComponentRegistry (Step 3)

**File**: `apps/admin-dashboard/src/components/routing/ViewComponentRegistry.ts` (NEW)

Maps viewId to lazy-loaded React components.

```typescript
viewComponentRegistry.register(
  'cms-core.cpt-list',
  lazy(() => import('@/pages/cms/cpts/CMSCPTList')),
  { appId: 'cms-core', description: 'CPT List' }
);
```

Pre-registered components:
- CMS-Core: CPT, ACF, Views, Pages, Media
- Forum: Boards, Categories, Posts
- Membership: Dashboard, Members, Verifications
- SellerOps, SupplierOps, PartnerOps routers
- Digital Signage, LMS-Yaksa routers

### 3. DynamicRouteLoader Component (Step 3)

**File**: `apps/admin-dashboard/src/components/routing/DynamicRouteLoader.tsx` (NEW)

React component that:
- Fetches routes from `/api/v1/routes/admin`
- Resolves viewId → component via ViewComponentRegistry
- Wraps routes with AdminProtectedRoute (RBAC)
- Wraps routes with AppRouteGuard (app status)
- Provides useDynamicRoutes hook

### 4. App.tsx Infrastructure (Step 4)

**File**: `apps/admin-dashboard/src/App.tsx`

Changes:
- Added @deprecated annotation to hardcoded routes
- Added migration documentation
- Exported dynamic routing utilities for gradual migration
- Maintained backward compatibility

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Admin Dashboard                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ App.tsx                                                   │  │
│  │  ├── Hardcoded Routes (deprecated, fallback)             │  │
│  │  └── Exports: DynamicRouteLoader, viewComponentRegistry  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ DynamicRouteLoader                                       │  │
│  │  ├── Fetch routes from API                               │  │
│  │  ├── Resolve viewId → Component via Registry             │  │
│  │  └── Apply AdminProtectedRoute + AppRouteGuard           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ViewComponentRegistry                                    │  │
│  │  └── viewId → lazy(() => import('...'))                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Server                                  │
│  ┌──────────────────────┐                                       │
│  │ routes.routes.ts     │ ◄─── Routes API                       │
│  └──────────────────────┘                                       │
│            │                                                     │
│            ▼                                                     │
│  ┌──────────────────────────┐                                   │
│  │ DynamicRouter            │ ◄─── App Activation               │
│  │ (cms-core/view-system)   │      (manifest.viewTemplates)     │
│  └──────────────────────────┘                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Migration Path

1. **Define viewTemplates in manifest**
   ```typescript
   viewTemplates: [
     {
       viewId: 'members-list',
       route: '/admin/membership/members',
       title: 'Members',
       auth: true,
       roles: ['admin'],
     },
   ]
   ```

2. **Register component in ViewComponentRegistry**
   ```typescript
   viewComponentRegistry.register(
     'membership-yaksa.members-list',
     lazy(() => import('@/pages/membership/members/MemberManagement')),
     { appId: 'membership-yaksa' }
   );
   ```

3. **Remove hardcoded route from App.tsx**

4. **Test dynamic routing works**

5. **Repeat for all app routes**

---

## Definition of Done (DoD) Check

| Criteria | Status |
|----------|--------|
| Routes API endpoint created | ✅ |
| ViewComponentRegistry implemented | ✅ |
| DynamicRouteLoader component implemented | ✅ |
| RBAC integration (AdminProtectedRoute) | ✅ |
| App status integration (AppRouteGuard) | ✅ |
| Hardcoded routes deprecated | ✅ |
| Backward compatibility maintained | ✅ |
| api-server build succeeds | ✅ |
| admin-dashboard build succeeds | ✅ |

---

## Files Changed

| File | Change |
|------|--------|
| `apps/api-server/src/routes/routes.routes.ts` | NEW - Routes API |
| `apps/api-server/src/main.ts` | Register routes API |
| `apps/admin-dashboard/src/components/routing/ViewComponentRegistry.ts` | NEW - Component registry |
| `apps/admin-dashboard/src/components/routing/DynamicRouteLoader.tsx` | NEW - Dynamic route loader |
| `apps/admin-dashboard/src/components/routing/index.ts` | NEW - Module exports |
| `apps/admin-dashboard/src/App.tsx` | @deprecated + exports |

---

## Next Steps

1. **Gradual Migration**
   - Move routes from App.tsx to manifest.viewTemplates one app at a time
   - Register corresponding components in ViewComponentRegistry
   - Test each migration thoroughly

2. **Full Dynamic Routing**
   - When all apps migrated, replace hardcoded routes with DynamicRouteLoader
   - Remove deprecated lazy imports from App.tsx

3. **Component Auto-Registration**
   - Consider moving component registration to app packages themselves
   - Apps would self-register their components on load

---

*Generated: 2025-12-14*
*Branch: feature/cms-core*

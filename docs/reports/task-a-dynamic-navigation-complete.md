# Task A: Dynamic Navigation System Complete

**Date**: 2025-12-14
**Branch**: `feature/cms-core`
**Commits**: `c0e99039f`, `a7444594a`, `4f89600d5`
**Status**: Completed

---

## Summary

Task A (Dynamic Navigation System)가 완료되었습니다. manifest 기반 동적 네비게이션 시스템이 구현되어 하드코딩된 메뉴 대신 NavigationRegistry를 통한 동적 메뉴 로딩이 가능해졌습니다.

---

## Changes Made

### 1. Navigation API Endpoint (Step 2)

**File**: `apps/api-server/src/routes/navigation.routes.ts` (NEW)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/navigation/admin` | GET | Admin navigation tree with role filtering |
| `/api/v1/navigation/stats` | GET | Navigation statistics |
| `/api/v1/navigation/cache/clear` | POST | Clear navigation cache (admin only) |

Features:
- Context-based filtering (ServiceGroup, Tenant, Role, Permission)
- 5-minute TTL caching via NavigationRegistry
- Fallback to user object for roles/permissions

### 2. useAdminMenu Hook Update (Step 3)

**File**: `apps/admin-dashboard/src/hooks/useAdminMenu.ts`

Changes:
- Fetch navigation from `/api/v1/navigation/admin` API
- Fall back to `wordpressMenuFinal.tsx` if API empty/fails
- Transform API icon strings to React components
- Continue to inject CPT menus dynamically
- Return `isUsingFallback` flag for debugging

### 3. Manifest Pattern Support (Step 4)

**Files**:
- `packages/cms-core/src/lifecycle/activate.ts`
- `packages/cms-core/src/view-system/index.ts`

Now supports both manifest patterns:

**Pattern A: navigation.admin (flat)**
```typescript
navigation: {
  admin: [
    { id: 'cms-core.cms', label: 'CMS', path: '/admin/cms', order: 5 },
    { id: 'cms-core.templates', parentId: 'cms-core.cms', ... },
  ]
}
```

**Pattern B: menus.admin (nested)**
```typescript
menus: {
  admin: [
    { id: 'membership', label: '회원 관리', icon: 'users', order: 15,
      children: [
        { id: 'members', label: '회원 목록', path: '/admin/membership/members' },
      ]
    },
  ]
}
```

The `flattenMenuItems()` function converts nested structure to flat with `parentId`.

### 4. Hardcoded Menu Deprecation (Step 5)

**File**: `apps/admin-dashboard/src/config/wordpressMenuFinal.tsx`

Added `@deprecated` annotation with migration guide. File kept as fallback.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Admin Dashboard                             │
│  ┌──────────────┐                                               │
│  │ useAdminMenu │ ──┐                                           │
│  └──────────────┘   │                                           │
│         │           │  fallback                                 │
│         ▼           ▼                                           │
│    API call     wordpressMenuFinal.tsx                          │
│         │           (deprecated)                                │
└─────────│───────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Server                                  │
│  ┌──────────────────────┐                                       │
│  │ navigation.routes.ts │                                       │
│  └──────────────────────┘                                       │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────────────────┐                                   │
│  │ NavigationRegistry       │ ◄─── App Activation               │
│  │ (cms-core/view-system)   │      (manifest.navigation.admin)  │
│  └──────────────────────────┘      (manifest.menus.admin)       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Migration Path

1. Apps define navigation in manifest (`navigation.admin` or `menus.admin`)
2. During activation, navigation registered to NavigationRegistry
3. API returns filtered navigation tree
4. useAdminMenu displays navigation from API
5. When all apps migrated, remove `wordpressMenuFinal.tsx`

---

## Definition of Done (DoD) Check

| Criteria | Status |
|----------|--------|
| Navigation API endpoint created | ✅ |
| useAdminMenu fetches from API | ✅ |
| Fallback to hardcoded menu works | ✅ |
| Both manifest patterns supported | ✅ |
| Hardcoded menu deprecated | ✅ |
| Build succeeds | ✅ |
| No breaking changes | ✅ |

---

## Files Changed

| File | Change |
|------|--------|
| `apps/api-server/src/routes/navigation.routes.ts` | NEW - Navigation API |
| `apps/api-server/src/main.ts` | Register navigation routes |
| `apps/admin-dashboard/src/hooks/useAdminMenu.ts` | API fetch + fallback |
| `apps/admin-dashboard/src/config/wordpressMenuFinal.tsx` | @deprecated |
| `packages/cms-core/src/lifecycle/activate.ts` | Support menus.admin |
| `packages/cms-core/src/view-system/index.ts` | Support menus.admin |

---

## Next Steps

- **Task B**: Dynamic Routing System (scheduled next)
- Gradually migrate app manifests to use `navigation.admin` or `menus.admin`
- Remove `wordpressMenuFinal.tsx` after migration complete

---

*Generated: 2025-12-14*
*Branch: feature/cms-core*

# Digital Signage Role Reform Changelog

> Version: 1.0
> Date: 2026-01-17
> Work Order: WO-SIGNAGE-ROLE-REFORM-V1

---

## Overview

이 문서는 Digital Signage Role Reform 작업의 변경 이력을 기록합니다.

---

## Sprint RR-1: 라우팅 구조 분리 ✅

**Date**: 2026-01-17

### Changes

1. **Admin Dashboard Router 리팩토링**
   - File: `apps/admin-dashboard/src/pages/digital-signage/DigitalSignageRouter.tsx`
   - 제거된 라우트:
     - `/preview/hq` → RemovedRouteRedirect
     - `/preview/store/*` → RemovedRouteRedirect
     - `/v2/hq` → RemovedRouteRedirect
     - `/v2/store` → RemovedRouteRedirect
     - `/templates/*` → RemovedRouteRedirect
     - `/content-blocks` → RemovedRouteRedirect
     - `/layout-presets` → RemovedRouteRedirect
     - `/v2/*` → RemovedRouteRedirect
   - 유지된 라우트:
     - `/` → redirect to `/monitoring`
     - `/monitoring` → SystemDashboard
     - `/settings` → SystemSettings (placeholder)
     - `/extensions` → ExtensionList (placeholder)
     - `/suppliers` → SupplierList (placeholder)
     - `/analytics` → SystemAnalytics (placeholder)
     - `/operations/*` → Operations pages (Phase 12 legacy)
     - `/media/*`, `/displays/*`, `/schedules/*`, `/actions/*` → Legacy Phase 6

2. **RemovedRouteRedirect Component**
   - 이전된 라우트 접근 시 안내 메시지 표시
   - Service Frontend 이동 안내

### Documentation

- Created: `docs/platform/digital-signage/ROLE-STRUCTURE-V3.md`
- Created: `docs/platform/digital-signage/SIGNAGE-ROUTING-MAP-V3.md`

---

## Sprint RR-2: RoleGuard 구현 ✅

**Date**: 2026-01-17

### Changes

1. **Frontend RoleGuard Components**
   - File: `apps/admin-dashboard/src/components/signage/SignageRoleGuard.tsx`
   - Components:
     - `AdminSignageGuard` - Admin 권한 검증
     - `OperatorSignageGuard` - Operator 권한 검증
     - `StoreSignageGuard` - Store 권한 검증
   - Helper functions:
     - `hasAdminPermission()`
     - `hasOperatorPermission()`
     - `hasStorePermission()`
   - Hook: `useSignagePermissions()`

2. **Backend Role Middleware**
   - File: `apps/api-server/src/middleware/signage-role.middleware.ts`
   - Middleware:
     - `requireSignageAdmin` - Admin 전용 API 보호
     - `requireSignageOperator` - Operator 전용 API 보호
     - `requireSignageStore` - Store 전용 API 보호
     - `requireSignageOperatorOrStore` - Operator/Store 공유 API
     - `allowSignageStoreRead` - 읽기 전용 접근 허용
     - `validateServiceKey` - 서비스 키 검증
   - Context: `req.signageContext` 설정

3. **API Routes Protection**
   - File: `apps/api-server/src/routes/signage/signage.routes.ts`
   - Applied middleware to all routes:
     - Store routes: `requireSignageStore`
     - Operator routes: `requireSignageOperator`
     - Global read routes: `allowSignageStoreRead`
     - Shared routes: `requireSignageOperatorOrStore`
     - Clone routes: `requireSignageStore`

### Route Protection Summary

| Route Group | Middleware |
|-------------|------------|
| `/playlists` (CRUD) | `requireSignageStore` |
| `/playlists/:id` (GET) | `requireSignageOperatorOrStore` |
| `/media` (CRUD) | `requireSignageStore` |
| `/schedules` | `requireSignageStore` |
| `/templates` (GET) | `allowSignageStoreRead` |
| `/templates` (CUD) | `requireSignageOperator` |
| `/content-blocks` | Same as templates |
| `/layout-presets` | Same as templates |
| `/global/*` | `allowSignageStoreRead` |
| `/hq/*` | `requireSignageOperator` |
| `/*/clone` | `requireSignageStore` |

---

## Sprint RR-3: UI/메뉴 구조 정비 ✅

**Date**: 2026-01-17

### Documentation

- Created: `docs/platform/digital-signage/SIGNAGE-MENU-MAP-V1.md`
  - Admin 메뉴 구조
  - Operator (HQ) 메뉴 구조
  - Store 메뉴 구조
  - 글로벌 콘텐츠 브라우저 3탭 UI
  - 모바일 메뉴

- Created: `docs/platform/digital-signage/ROLE-ACCESS-POLICY-V1.md`
  - 역할별 접근 정책
  - 리소스별 권한 매트릭스
  - API 접근 정책
  - UI 접근 정책
  - 오류 응답 형식

---

## Migration Guide

### For Admin Dashboard Users

| Old URL | New URL | Action |
|---------|---------|--------|
| `/digital-signage/preview/hq` | `/signage/hq` | Service Frontend로 이동 |
| `/digital-signage/preview/store/*` | `/signage/store/*` | Service Frontend로 이동 |
| `/digital-signage/templates` | `/signage/hq/templates` | Operator로 이동 |
| `/digital-signage/v2/*` | - | 새 구조 사용 |

### For API Consumers

All API routes now require authentication and role-based authorization.

```typescript
// Before: No auth check
GET /api/signage/:serviceKey/playlists

// After: Requires Store or Operator permission
GET /api/signage/:serviceKey/playlists
Headers: {
  Authorization: Bearer <token>,
  X-Organization-Id: <orgId>  // For store users
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `NOT_AUTHENTICATED` | 로그인 필요 |
| `SIGNAGE_ADMIN_REQUIRED` | Admin 권한 필요 |
| `SIGNAGE_OPERATOR_REQUIRED` | Operator 권한 필요 |
| `SIGNAGE_STORE_REQUIRED` | Store 접근 권한 필요 |
| `SERVICE_KEY_REQUIRED` | 서비스 키 누락 |
| `ORGANIZATION_ID_REQUIRED` | 매장 ID 누락 |

---

## Files Changed

### Modified

1. `apps/admin-dashboard/src/pages/digital-signage/DigitalSignageRouter.tsx`
2. `apps/api-server/src/routes/signage/signage.routes.ts`
3. `apps/api-server/src/middleware/index.ts`

### Created

1. `apps/admin-dashboard/src/components/signage/SignageRoleGuard.tsx`
2. `apps/api-server/src/middleware/signage-role.middleware.ts`
3. `docs/platform/digital-signage/ROLE-STRUCTURE-V3.md`
4. `docs/platform/digital-signage/SIGNAGE-ROUTING-MAP-V3.md`
5. `docs/platform/digital-signage/SIGNAGE-MENU-MAP-V1.md`
6. `docs/platform/digital-signage/ROLE-ACCESS-POLICY-V1.md`
7. `docs/platform/digital-signage/ROLE-REFORM-CHANGELOG.md`

---

## Testing Checklist

### RR-1: Routing

- [ ] Admin `/digital-signage/monitoring` 접근 가능
- [ ] Admin `/digital-signage/preview/hq` 접근 시 안내 메시지
- [ ] Admin `/digital-signage/preview/store/*` 접근 시 안내 메시지
- [ ] Admin `/digital-signage/v2/*` 접근 시 안내 메시지

### RR-2: API Protection

- [ ] Unauthenticated request → 401
- [ ] Store user → HQ API → 403
- [ ] Operator user → Store CRUD → 403
- [ ] Store user → Clone API → 200
- [ ] Operator user → HQ API → 200

### RR-3: UI/Menu

- [ ] Admin 메뉴 정상 표시
- [ ] Operator 메뉴 정상 표시 (Service Frontend)
- [ ] Store 메뉴 정상 표시 (Service Frontend)

---

## Related Documents

- [Role Structure V3](./ROLE-STRUCTURE-V3.md)
- [Signage Routing Map V3](./SIGNAGE-ROUTING-MAP-V3.md)
- [Signage Menu Map V1](./SIGNAGE-MENU-MAP-V1.md)
- [Role Access Policy V1](./ROLE-ACCESS-POLICY-V1.md)

---

*Last Updated: 2026-01-17*

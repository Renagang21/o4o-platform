# Task C: RBAC Migration Complete

**Date**: 2025-12-14
**Branch**: `feature/cms-core`
**Commit**: `9b1d07b7c`
**Status**: Completed

---

## Summary

Task C (RBAC 정리)가 완료되었습니다. `role_assignments` 테이블 기반 RBAC 시스템으로 100% 전환되었습니다.

---

## Changes Made

### 1. RoleAssignmentService 생성

**File**: `apps/api-server/src/modules/auth/services/role-assignment.service.ts`

새로운 서비스가 생성되어 모든 role 관련 기능을 제공합니다:

| Method | Description |
|--------|-------------|
| `hasRole(userId, role)` | 특정 role 보유 여부 확인 |
| `hasAnyRole(userId, roles)` | 여러 role 중 하나라도 보유 확인 |
| `isAdmin(userId)` | admin/super_admin/operator 확인 |
| `getActiveRoles(userId)` | 활성 role 목록 조회 |
| `getRoleNames(userId)` | 활성 role 이름 목록 조회 |
| `assignRole(input)` | role 할당 |
| `removeRole(userId, role)` | role 제거 |
| `getPermissions(userId)` | 권한 목록 조회 |
| `hasPermission(userId, permission)` | 특정 권한 확인 |

### 2. Auth Middleware 수정

**Files**:
- `apps/api-server/src/middleware/auth.middleware.ts`
- `apps/api-server/src/common/middleware/auth.middleware.ts`

**변경 사항**:
- `requireAuth`: `dbRoles` relation 로딩 제거
- `requireAdmin`: `RoleAssignmentService.hasAnyRole()` 사용
- `requireRole`: `RoleAssignmentService.hasAnyRole()` 사용
- `requirePermission`: `RoleAssignmentService.hasPermission()` 사용
- `requireAnyPermission`: `RoleAssignmentService.hasAnyPermission()` 사용

**Before**:
```typescript
// 레거시 방식: User.hasRole() 사용
const isAdmin = user.hasRole('admin') || user.hasRole('super_admin');
```

**After**:
```typescript
// P0 RBAC: RoleAssignmentService 사용
const isAdmin = await roleAssignmentService.hasAnyRole(user.id, [
  'admin',
  'super_admin',
  'operator'
]);
```

### 3. User Entity 정리

**File**: `apps/api-server/src/modules/auth/entities/User.ts`

다음 메서드들에 `@deprecated` 주석 추가:
- `hasRole()` → Use `RoleAssignmentService.hasRole()`
- `hasAnyRole()` → Use `RoleAssignmentService.hasAnyRole()`
- `isAdmin()` → Use `RoleAssignmentService.isAdmin()`
- `getAllPermissions()` → Use `RoleAssignmentService.getPermissions()`
- `hasPermission()` → Use `RoleAssignmentService.hasPermission()`
- `hasAnyPermission()` → Use `RoleAssignmentService.hasAnyPermission()`
- `hasAllPermissions()` → Use `RoleAssignmentService.hasAllPermissions()`
- `getRoleNames()` → Use `RoleAssignmentService.getRoleNames()`
- `isSupplier()` → Use `RoleAssignmentService.isSupplier()`
- `isSeller()` → Use `RoleAssignmentService.isSeller()`
- `isPartner()` → Use `RoleAssignmentService.isPartner()`
- `getDropshippingRoles()` → Use `RoleAssignmentService.getRoleNames()`
- `getActiveRole()` → Use `RoleAssignmentService.getActiveRoles()`
- `canSwitchToRole()` → Use `RoleAssignmentService.hasRole()`
- `hasMultipleRoles()` → Use `RoleAssignmentService.getActiveRoles()`

### 4. Migration Script 추가

**Files**:
- `apps/api-server/src/scripts/verify-rbac-migration.ts` (신규)
- `apps/api-server/package.json` (`migration:roles:verify` 추가)

---

## Migration Commands

```bash
# 1. 기존 User.role/roles → RoleAssignment 마이그레이션
pnpm -F @o4o/api-server migration:roles

# 2. 마이그레이션 검증
pnpm -F @o4o/api-server migration:roles:verify
```

---

## Remaining Work (Deprecated Fields)

User entity에 다음 deprecated 필드들이 아직 남아있습니다:

| Field | Type | Status |
|-------|------|--------|
| `role` | enum | @deprecated |
| `roles` | simple-array | @deprecated |
| `dbRoles` | ManyToMany | @deprecated |
| `activeRole` | ManyToOne | @deprecated |

**Note**: 이 필드들은 당장 제거하지 않습니다. 다음 사항이 완료된 후 제거:
1. 모든 사용자 role_assignments 마이그레이션 완료
2. 프론트엔드 role 표시 로직 수정 (Task D 이후)
3. 충분한 테스트 기간 경과

---

## Definition of Done (DoD) Check

| Criteria | Status |
|----------|--------|
| Auth middleware uses RoleAssignment only | ✅ |
| User helper methods deprecated | ✅ |
| Migration script exists | ✅ (기존 + 검증) |
| Build succeeds | ✅ |
| No breaking changes | ✅ |

---

## Next Steps

- **Task D**: Member 필드 중복 제거
  - Member.phone, email, name → User 참조로 변경

---

*Generated: 2025-12-14*
*Branch: feature/cms-core*

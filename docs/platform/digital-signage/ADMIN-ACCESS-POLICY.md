# Digital Signage Admin Access Policy

> Phase 2 Refinement (R-1)
> Version: 1.0
> Date: 2026-01-17
> Status: Active

---

## 1. 개요

이 문서는 Digital Signage 시스템의 권한 정책을 정의합니다.

---

## 2. 권한 레벨

### Level 0: System Admin

- **대상**: 플랫폼 관리자
- **접근 범위**: 전체 시스템
- **권한 ID**: `signage:admin`

### Level 1: Service Operator (HQ)

- **대상**: 서비스별 HQ 운영자
- **접근 범위**: 해당 서비스의 글로벌 콘텐츠
- **권한 ID**: `signage:{serviceKey}:operator`

### Level 2: Store Manager

- **대상**: 매장 관리자
- **접근 범위**: 해당 매장의 콘텐츠
- **권한 ID**: `signage:{serviceKey}:{organizationId}:manager`

### Level 3: Store Staff

- **대상**: 매장 직원
- **접근 범위**: 읽기 전용 + 제한된 편집
- **권한 ID**: `signage:{serviceKey}:{organizationId}:staff`

---

## 3. 권한 매트릭스

### 3.1 Admin 기능

| 기능 | Admin | Operator | Store Manager | Store Staff |
|------|-------|----------|---------------|-------------|
| 시스템 설정 | O | X | X | X |
| 공급자 관리 | O | X | X | X |
| 확장 앱 관리 | O | X | X | X |
| 글로벌 템플릿 CRUD | O | X | X | X |
| 레이아웃 프리셋 CRUD | O | X | X | X |
| 콘텐츠 블록 CRUD | O | X | X | X |
| 전체 Analytics | O | X | X | X |

### 3.2 HQ 기능

| 기능 | Admin | Operator | Store Manager | Store Staff |
|------|-------|----------|---------------|-------------|
| HQ 플레이리스트 CRUD | Read | O | X | X |
| HQ 미디어 CRUD | Read | O | X | X |
| 강제 콘텐츠 지정 | X | O | X | X |
| 커뮤니티 콘텐츠 승인 | X | O | X | X |
| 글로벌 스케줄 설정 | X | O | X | X |
| 콘텐츠 통계 | Read | O | X | X |

### 3.3 Store 기능

| 기능 | Admin | Operator | Store Manager | Store Staff |
|------|-------|----------|---------------|-------------|
| 매장 플레이리스트 CRUD | Read | Read | O | Read |
| 매장 미디어 CRUD | Read | Read | O | Read |
| 글로벌 콘텐츠 Clone | X | X | O | X |
| 매장 스케줄 CRUD | Read | Read | O | Read |
| 디스플레이 관리 | Read | Read | O | Read |
| 채널 설정 | Read | Read | O | X |

---

## 4. API 권한 미들웨어

### 4.1 권한 체크 함수

```typescript
// packages/digital-signage-core/src/backend/middleware/signage-auth.middleware.ts

import { Request, Response, NextFunction } from 'express';

export type SignageRole = 'admin' | 'operator' | 'store-manager' | 'store-staff';

interface SignageAuthOptions {
  minRole: SignageRole;
  checkServiceKey?: boolean;
  checkOrganizationId?: boolean;
}

const roleHierarchy: Record<SignageRole, number> = {
  'admin': 100,
  'operator': 80,
  'store-manager': 60,
  'store-staff': 40,
};

export function signageAuth(options: SignageAuthOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userRole = getUserSignageRole(user, req.params.serviceKey);
      const userRoleLevel = roleHierarchy[userRole] || 0;
      const minRoleLevel = roleHierarchy[options.minRole];

      if (userRoleLevel < minRoleLevel) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Service Key 검증
      if (options.checkServiceKey && req.params.serviceKey) {
        if (!userHasServiceAccess(user, req.params.serviceKey)) {
          return res.status(403).json({ error: 'Service access denied' });
        }
      }

      // Organization ID 검증
      if (options.checkOrganizationId) {
        const orgId = req.params.organizationId || req.body?.organizationId;
        if (orgId && !userBelongsToOrganization(user, orgId)) {
          return res.status(403).json({ error: 'Organization access denied' });
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

function getUserSignageRole(user: any, serviceKey?: string): SignageRole {
  // Admin 체크
  if (user.roles?.includes('admin') || user.permissions?.includes('signage:admin')) {
    return 'admin';
  }

  // Operator 체크
  if (serviceKey && user.permissions?.includes(`signage:${serviceKey}:operator`)) {
    return 'operator';
  }

  // Store Manager 체크
  if (user.permissions?.some((p: string) => p.includes(':manager'))) {
    return 'store-manager';
  }

  // Store Staff (기본)
  return 'store-staff';
}

function userHasServiceAccess(user: any, serviceKey: string): boolean {
  return user.roles?.includes('admin') ||
         user.permissions?.some((p: string) => p.includes(`signage:${serviceKey}`));
}

function userBelongsToOrganization(user: any, organizationId: string): boolean {
  return user.organizationId === organizationId ||
         user.organizations?.includes(organizationId) ||
         user.roles?.includes('admin');
}
```

### 4.2 라우트 적용 예시

```typescript
// Admin Only Routes
router.post('/admin/settings', signageAuth({ minRole: 'admin' }), controller.updateSettings);
router.get('/admin/suppliers', signageAuth({ minRole: 'admin' }), controller.getSuppliers);

// Operator Routes
router.post('/:serviceKey/hq/playlists',
  signageAuth({ minRole: 'operator', checkServiceKey: true }),
  controller.createHqPlaylist
);

// Store Routes
router.get('/:serviceKey/playlists',
  signageAuth({ minRole: 'store-staff', checkServiceKey: true, checkOrganizationId: true }),
  controller.getPlaylists
);
```

---

## 5. Frontend 권한 가드

### 5.1 React Context

```typescript
// hooks/useSignagePermissions.ts

import { useAuth } from '@/hooks/useAuth';
import { useMemo } from 'react';

export type SignagePermission =
  | 'admin'
  | 'templates:read'
  | 'templates:write'
  | 'hq:read'
  | 'hq:write'
  | 'store:read'
  | 'store:write'
  | 'store:clone';

export function useSignagePermissions(serviceKey?: string) {
  const { user } = useAuth();

  const permissions = useMemo(() => {
    const perms = new Set<SignagePermission>();

    if (!user) return perms;

    // Admin has all permissions
    if (user.roles?.includes('admin')) {
      perms.add('admin');
      perms.add('templates:read');
      perms.add('templates:write');
      perms.add('hq:read');
      perms.add('hq:write');
      perms.add('store:read');
      perms.add('store:write');
      perms.add('store:clone');
      return perms;
    }

    // Operator permissions
    if (serviceKey && user.permissions?.includes(`signage:${serviceKey}:operator`)) {
      perms.add('hq:read');
      perms.add('hq:write');
      perms.add('store:read');
    }

    // Store Manager permissions
    if (user.permissions?.some((p: string) => p.includes(':manager'))) {
      perms.add('store:read');
      perms.add('store:write');
      perms.add('store:clone');
    }

    // Store Staff permissions
    if (user.permissions?.some((p: string) => p.includes(':staff'))) {
      perms.add('store:read');
    }

    return perms;
  }, [user, serviceKey]);

  return {
    permissions,
    hasPermission: (perm: SignagePermission) => permissions.has(perm),
    isAdmin: permissions.has('admin'),
    isOperator: permissions.has('hq:write'),
    isStoreManager: permissions.has('store:write'),
  };
}
```

### 5.2 Permission Guard Component

```typescript
// components/guards/SignageGuard.tsx

import { Navigate } from 'react-router-dom';
import { useSignagePermissions, SignagePermission } from '@/hooks/useSignagePermissions';

interface SignageGuardProps {
  children: React.ReactNode;
  requires: SignagePermission | SignagePermission[];
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export function SignageGuard({
  children,
  requires,
  fallback,
  redirectTo = '/unauthorized'
}: SignageGuardProps) {
  const { hasPermission } = useSignagePermissions();

  const requiredPermissions = Array.isArray(requires) ? requires : [requires];
  const hasAccess = requiredPermissions.some(perm => hasPermission(perm));

  if (!hasAccess) {
    if (fallback) return <>{fallback}</>;
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
```

---

## 6. 권한 체크 포인트

### 6.1 페이지 진입 시

```tsx
// Admin 전용 페이지
<SignageGuard requires="admin">
  <TemplateListPage />
</SignageGuard>

// HQ 운영자 페이지
<SignageGuard requires="hq:write">
  <HQContentManager />
</SignageGuard>

// Store 페이지
<SignageGuard requires="store:read">
  <StorePlaylistList />
</SignageGuard>
```

### 6.2 UI 요소 표시/숨김

```tsx
const { hasPermission } = useSignagePermissions();

return (
  <div>
    <PlaylistList />

    {hasPermission('store:write') && (
      <Button onClick={handleCreate}>새 플레이리스트</Button>
    )}

    {hasPermission('store:clone') && (
      <Button onClick={handleClone}>복제하기</Button>
    )}
  </div>
);
```

### 6.3 API 호출 전

```tsx
const { hasPermission } = useSignagePermissions();

const handleDelete = async (id: string) => {
  if (!hasPermission('store:write')) {
    toast.error('삭제 권한이 없습니다');
    return;
  }

  await deletePlaylist(id);
};
```

---

## 7. 관련 문서

- [Role Structure V2](./ROLE-STRUCTURE-V2.md)
- [Signage Routing Map V2](./SIGNAGE-ROUTING-MAP-V2.md)

---

*Last Updated: 2026-01-17*

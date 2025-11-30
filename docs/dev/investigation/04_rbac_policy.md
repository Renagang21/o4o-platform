# RBAC 정책 (Role-Based Access Control)

> **작성일**: 2025-01-08
> **Phase**: P0 (MVP), P2 (확장)
> **목적**: assignments 기반 권한 판정 체계 정의

---

## 원칙

1. **서버 중심**: 모든 권한 판정은 **서버에서만** 수행
2. **FE는 보조**: 메뉴 숨김/리디렉션은 UX 개선용, 보안 X
3. **Assignments 기반**: `role_assignments.is_active` 상태로 판정
4. **명시적 거부**: 권한 없으면 **403 Forbidden** 반환
5. **감사 추적**: 권한 검증 실패는 audit_logs에 기록

---

## 1. 역할 계층 (P0 - 단순 구조)

```
admin (관리자)
  ↓
  → supplier (공급자)
  → seller (판매자)
  → partner (파트너)
```

**P0 특징**:
- 역할 간 상속 **없음** (각 역할은 독립적)
- 한 사용자가 **여러 역할** 가능 (supplier + seller)
- admin은 **모든 리소스 접근 가능** (하드코딩)

---

## 2. RBAC 미들웨어 (서버)

### 2.1 기본 미들웨어

```typescript
// apps/api-server/src/middleware/rbac.ts

import { Request, Response, NextFunction } from 'express';
import { RoleAssignment } from '../entities/RoleAssignment';

/**
 * 특정 역할을 요구하는 미들웨어
 * @param roles 허용할 역할 목록
 */
export function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'UNAUTHORIZED', message: '로그인이 필요합니다.' });
      }

      // role_assignments에서 활성 역할 조회
      const assignments = await RoleAssignment.find({
        where: {
          user_id: userId,
          is_active: true,
        },
      });

      // 유효 기간 체크
      const now = new Date();
      const activeAssignments = assignments.filter(a => {
        const validFrom = a.validFrom <= now;
        const validUntil = !a.validUntil || a.validUntil >= now;
        return validFrom && validUntil;
      });

      // 역할 체크
      const userRoles = activeAssignments.map(a => a.role);
      const hasRole = roles.some(role => userRoles.includes(role));

      if (!hasRole) {
        // 감사 로그 기록
        await auditLog({
          event_type: 'access.denied',
          entity_type: 'api_endpoint',
          entity_id: req.path,
          actor_id: userId,
          metadata: {
            required_roles: roles,
            user_roles: userRoles,
          },
        });

        return res.status(403).json({
          error: 'FORBIDDEN',
          message: '접근 권한이 없습니다.',
          required_roles: roles,
        });
      }

      // 성공 시 req.userRoles에 저장
      req.userRoles = userRoles;
      next();
    } catch (error) {
      console.error('RBAC middleware error:', error);
      return res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  };
}

/**
 * admin 역할만 허용
 */
export const requireAdmin = requireRole('admin');

/**
 * 자기 자신의 리소스만 접근 가능 (또는 admin)
 */
export function requireSelfOrAdmin(userIdParam: string = 'id') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const targetUserId = req.params[userIdParam];

    if (!userId) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }

    const isAdmin = await hasRole(userId, 'admin');
    const isSelf = userId === targetUserId;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: 'FORBIDDEN', message: '자신의 정보만 접근 가능합니다.' });
    }

    next();
  };
}
```

### 2.2 Helper 함수

```typescript
/**
 * 사용자가 특정 역할을 가지고 있는지 확인
 */
export async function hasRole(userId: string, role: string): Promise<boolean> {
  const assignment = await RoleAssignment.findOne({
    where: {
      user_id: userId,
      role: role,
      is_active: true,
    },
  });

  if (!assignment) return false;

  // 유효 기간 체크
  const now = new Date();
  const validFrom = assignment.validFrom <= now;
  const validUntil = !assignment.validUntil || assignment.validUntil >= now;

  return validFrom && validUntil;
}

/**
 * 사용자의 활성 역할 목록 조회
 */
export async function getUserRoles(userId: string): Promise<string[]> {
  const assignments = await RoleAssignment.find({
    where: {
      user_id: userId,
      is_active: true,
    },
  });

  const now = new Date();
  return assignments
    .filter(a => {
      const validFrom = a.validFrom <= now;
      const validUntil = !a.validUntil || a.validUntil >= now;
      return validFrom && validUntil;
    })
    .map(a => a.role);
}
```

---

## 3. API 엔드포인트별 권한 매트릭스 (P0 MVP)

### 3.1 인증 (Public)

| 엔드포인트 | 역할 | 설명 |
|-----------|------|------|
| `POST /auth/register` | - | 회원가입 (누구나) |
| `POST /auth/login` | - | 로그인 (누구나) |
| `POST /auth/logout` | authenticated | 로그아웃 |
| `GET /auth/verify` | authenticated | 토큰 검증 |

### 3.2 사용자 정보

| 엔드포인트 | 역할 | 미들웨어 |
|-----------|------|---------|
| `GET /me` | authenticated | `authenticate` |
| `PATCH /me` | authenticated | `authenticate` |
| `GET /users/:id` | self or admin | `requireSelfOrAdmin('id')` |

### 3.3 역할 신청 (Enrollments)

| 엔드포인트 | 역할 | 미들웨어 |
|-----------|------|---------|
| `POST /enrollments` | authenticated | `authenticate` |
| `GET /enrollments` | authenticated | `authenticate` (본인 것만) |
| `GET /enrollments/:id` | self or admin | `requireSelfOrAdmin` |

### 3.4 관리자 - 신청 관리

| 엔드포인트 | 역할 | 미들웨어 |
|-----------|------|---------|
| `GET /admin/enrollments` | admin | `requireAdmin` |
| `GET /admin/enrollments/:id` | admin | `requireAdmin` |
| `PATCH /admin/enrollments/:id` | admin | `requireAdmin` |

### 3.5 역할별 대시보드

| 엔드포인트 | 역할 | 미들웨어 |
|-----------|------|---------|
| `GET /supplier/dashboard` | supplier | `requireRole('supplier')` |
| `GET /seller/dashboard` | seller | `requireRole('seller')` |
| `GET /partner/dashboard` | partner | `requireRole('partner')` |
| `GET /admin/dashboard` | admin | `requireAdmin` |

### 3.6 프로필 관리

| 엔드포인트 | 역할 | 미들웨어 |
|-----------|------|---------|
| `GET /supplier/profile` | supplier | `requireRole('supplier')` |
| `PATCH /supplier/profile` | supplier | `requireRole('supplier')` |
| `GET /seller/profile` | seller | `requireRole('seller')` |
| `PATCH /seller/profile` | seller | `requireRole('seller')` |
| `GET /partner/profile` | partner | `requireRole('partner')` |
| `PATCH /partner/profile` | partner | `requireRole('partner')` |

---

## 4. 사용 예시

### 4.1 API 라우트에 적용

```typescript
// apps/api-server/src/routes/supplier.routes.ts
import { requireRole } from '../middleware/rbac';

router.get('/supplier/dashboard',
  authenticate,
  requireRole('supplier'),
  async (req, res) => {
    // supplier 역할을 가진 사용자만 접근 가능
    const userId = req.user.id;
    const dashboard = await getSupplierDashboard(userId);
    res.json(dashboard);
  }
);

router.patch('/supplier/profile',
  authenticate,
  requireRole('supplier'),
  async (req, res) => {
    const userId = req.user.id;
    await updateSupplierProfile(userId, req.body);
    res.json({ success: true });
  }
);
```

### 4.2 관리자 전용 라우트

```typescript
// apps/api-server/src/routes/admin/enrollments.routes.ts
import { requireAdmin } from '../middleware/rbac';

router.get('/admin/enrollments',
  authenticate,
  requireAdmin,
  async (req, res) => {
    const { role, status } = req.query;
    const enrollments = await getEnrollments({ role, status });
    res.json(enrollments);
  }
);

router.patch('/admin/enrollments/:id',
  authenticate,
  requireAdmin,
  async (req, res) => {
    const { status, review_note } = req.body;
    const enrollment = await reviewEnrollment(req.params.id, {
      status,
      review_note,
      reviewed_by: req.user.id,
    });
    res.json(enrollment);
  }
);
```

---

## 5. FE 권한 체크 (UX만)

### 5.1 Auth Context

```typescript
// packages/auth-context/src/AuthProvider.tsx

interface User {
  id: string;
  email: string;
  status: string;
  assignments: {
    id: string;
    role: string;
    isActive: boolean;
    validFrom: string;
    validUntil?: string;
  }[];
}

interface AuthContext {
  user: User | null;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  isAdmin: () => boolean;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);

  const hasRole = useCallback((role: string) => {
    if (!user?.assignments) return false;

    return user.assignments.some(a => {
      if (!a.isActive) return false;
      if (a.role !== role) return false;

      const now = new Date();
      const validFrom = new Date(a.validFrom);
      const validUntil = a.validUntil ? new Date(a.validUntil) : null;

      return validFrom <= now && (!validUntil || validUntil >= now);
    });
  }, [user]);

  const hasAnyRole = useCallback((roles: string[]) => {
    return roles.some(role => hasRole(role));
  }, [hasRole]);

  const isAdmin = useCallback(() => {
    return hasRole('admin');
  }, [hasRole]);

  return (
    <AuthContext.Provider value={{ user, hasRole, hasAnyRole, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### 5.2 라우트 가드

```typescript
// apps/admin-dashboard/src/components/RouteGuard.tsx

interface RoleGuardProps {
  roles: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGuard({ roles, children, fallback }: RoleGuardProps) {
  const { hasAnyRole } = useAuth();

  if (!hasAnyRole(roles)) {
    return fallback || <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

// 사용 예시
function SupplierDashboard() {
  return (
    <RoleGuard roles={['supplier']} fallback={<Navigate to="/apply/supplier/status" />}>
      <SupplierDashboardContent />
    </RoleGuard>
  );
}
```

### 5.3 메뉴 필터링

```typescript
// apps/admin-dashboard/src/config/menu.tsx

const menuItems = [
  {
    id: 'supplier-dashboard',
    label: '공급자 대시보드',
    path: '/dashboard/supplier',
    requiredRoles: ['supplier'],
  },
  {
    id: 'seller-dashboard',
    label: '판매자 대시보드',
    path: '/dashboard/seller',
    requiredRoles: ['seller'],
  },
  {
    id: 'admin-enrollments',
    label: '신청 관리',
    path: '/admin/enrollments',
    requiredRoles: ['admin'],
  },
];

export function useFilteredMenu() {
  const { hasAnyRole } = useAuth();

  return menuItems.filter(item => {
    if (!item.requiredRoles) return true;
    return hasAnyRole(item.requiredRoles);
  });
}
```

---

## 6. P2 확장 (권한 세분화)

### 6.1 Permission 테이블 도입

```sql
CREATE TABLE permissions (
  id UUID PRIMARY KEY,
  code VARCHAR(100) UNIQUE NOT NULL, -- 'users.view', 'enrollments.approve'
  resource VARCHAR(50) NOT NULL,     -- 'users', 'enrollments'
  action VARCHAR(50) NOT NULL,       -- 'view', 'create', 'approve'
  description TEXT
);

CREATE TABLE role_permissions (
  role VARCHAR(50) NOT NULL,
  permission_id UUID NOT NULL REFERENCES permissions(id),
  PRIMARY KEY (role, permission_id)
);
```

### 6.2 Permission 기반 미들웨어

```typescript
export function requirePermission(...permissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const userPermissions = await getUserPermissions(userId);

    const hasPermission = permissions.some(p => userPermissions.includes(p));

    if (!hasPermission) {
      return res.status(403).json({ error: 'FORBIDDEN', required_permissions: permissions });
    }

    next();
  };
}

// 사용 예시
router.get('/admin/users',
  authenticate,
  requirePermission('users.view'),
  async (req, res) => { ... }
);
```

---

## 7. 검증 체크리스트

- [ ] requireRole 미들웨어 동작 확인
- [ ] requireAdmin 미들웨어 동작 확인
- [ ] 역할 없이 접근 시 403 반환
- [ ] 유효 기간 만료 시 접근 차단
- [ ] FE hasRole() 동작 확인
- [ ] 메뉴 필터링 동작 확인
- [ ] 라우트 가드 리디렉션 확인
- [ ] audit_logs에 access.denied 기록 확인

---

**작성**: Claude Code
**상태**: ✅ P0 RBAC 정책 정의 완료
**다음**: `05_routes_fe.md` (FE 라우팅 정의)

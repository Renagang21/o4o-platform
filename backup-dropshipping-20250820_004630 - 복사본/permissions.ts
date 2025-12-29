import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from '../entities/User';

// Request 인터페이스 확장
declare module 'express' {
  interface Request {
    user?: User;
  }
}

// 권한 타입 정의
export type Permission = 
  | 'apps:manage'
  | 'apps:view'
  | 'content:read'
  | 'content:write'
  | 'categories:read'
  | 'categories:write'
  | 'users:read'
  | 'users:write'
  | 'settings:read'
  | 'settings:write'
  | 'templates:read'
  | 'templates:write'
  | 'menus:read'
  | 'menus:write'
  | 'ecommerce:read'
  | 'ecommerce:write'
  | 'orders:manage'
  | 'products:manage'
  | 'forum:moderate'
  | 'system:admin';

// 역할별 권한 매핑
const rolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: [
    'apps:manage',
    'apps:view',
    'content:read',
    'content:write',
    'categories:read',
    'categories:write',
    'users:read',
    'users:write',
    'settings:read',
    'settings:write',
    'templates:read',
    'templates:write',
    'menus:read',
    'menus:write',
    'ecommerce:read',
    'ecommerce:write',
    'orders:manage',
    'products:manage',
    'forum:moderate',
    'system:admin'
  ],
  [UserRole.ADMIN]: [
    'apps:manage',
    'apps:view',
    'content:read',
    'content:write',
    'categories:read',
    'categories:write',
    'users:read',
    'users:write',
    'settings:read',
    'settings:write',
    'templates:read',
    'templates:write',
    'menus:read',
    'menus:write',
    'ecommerce:read',
    'ecommerce:write',
    'orders:manage',
    'products:manage',
    'forum:moderate',
    'system:admin'
  ],
  [UserRole.VENDOR]: [
    'apps:view',
    'content:read',
    'ecommerce:read',
    'ecommerce:write',
    'products:manage',
    'orders:manage'
  ],
  [UserRole.SUPPLIER]: [
    'apps:view',
    'content:read',
    'ecommerce:read',
    'ecommerce:write',
    'products:manage',
    'orders:manage'
  ],
  [UserRole.SELLER]: [
    'apps:view',
    'content:read',
    'ecommerce:read',
    'products:manage',
    'orders:manage'
  ],
  [UserRole.BUSINESS]: [
    'apps:view',
    'content:read',
    'ecommerce:read',
    'products:manage'
  ],
  [UserRole.MODERATOR]: [
    'apps:view',
    'content:read',
    'content:write',
    'forum:moderate'
  ],
  [UserRole.PARTNER]: [
    'apps:view',
    'content:read',
    'ecommerce:read'
  ],
  [UserRole.BETA_USER]: [
    'apps:view',
    'content:read'
  ],
  [UserRole.MANAGER]: [
    'apps:view',
    'content:read',
    'content:write',
    'users:read'
  ],
  [UserRole.CUSTOMER]: [
    'apps:view',
    'content:read',
    'ecommerce:read'
  ],
  [UserRole.AFFILIATE]: [
    'apps:view',
    'content:read',
    'ecommerce:read'
  ]
};

/**
 * 권한 체크 미들웨어
 * @param requiredPermission 필요한 권한
 * @returns Express 미들웨어
 */
export const checkPermission = (requiredPermission: Permission) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // 사용자 확인
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: No user found'
      });
    }

    // Super Admin과 Admin은 모든 권한을 가짐
    if (req.user.role === UserRole.SUPER_ADMIN || req.user.role === UserRole.ADMIN) {
      return next();
    }

    // 사용자 역할의 권한 확인
    const userPermissions = rolePermissions[req.user.role] || [];
    
    // 사용자가 가진 개별 권한도 확인 (permissions 필드가 있는 경우)
    const customPermissions = req.user.permissions || [];
    const allPermissions = [...userPermissions, ...customPermissions];

    // 권한 체크
    if (!allPermissions.includes(requiredPermission)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: You don't have permission to perform this action (requires: ${requiredPermission})`
      });
    }

    next();
  };
};

/**
 * 여러 권한 중 하나라도 있으면 통과
 * @param permissions 권한 배열
 * @returns Express 미들웨어
 */
export const checkAnyPermission = (permissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // 사용자 확인
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: No user found'
      });
    }

    // Super Admin과 Admin은 모든 권한을 가짐
    if (req.user.role === UserRole.SUPER_ADMIN || req.user.role === UserRole.ADMIN) {
      return next();
    }

    // 사용자 역할의 권한 확인
    const userPermissions = rolePermissions[req.user.role] || [];
    const customPermissions = req.user.permissions || [];
    const allPermissions = [...userPermissions, ...customPermissions];

    // 권한 중 하나라도 있는지 체크
    const hasPermission = permissions.some(permission => 
      allPermissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: You need one of these permissions: ${permissions.join(', ')}`
      });
    }

    next();
  };
};

/**
 * 관리자 권한 체크
 * @returns Express 미들웨어
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: No user found'
    });
  }

  if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPER_ADMIN) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Admin access required'
    });
  }

  next();
};
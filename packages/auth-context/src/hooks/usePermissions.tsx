import { useMemo } from 'react';
import { useAuth } from '../AuthProvider';
import { UserRole } from '@o4o/auth-client';

interface PermissionConfig {
  roles: UserRole[];
  permissions: string[];
  requireAll?: boolean; // true면 모든 권한 필요, false면 하나만 있으면 됨
}

/**
 * 권한 관리 훅
 * 세밀한 권한 제어를 위한 유틸리티
 */
export const usePermissions = () => {
  const { user, hasRole, hasPermission } = useAuth();

  // 권한 체크 함수
  const checkPermission = useMemo(() => ({
    /**
     * 역할 기반 권한 확인
     */
    hasAnyRole: (roles: UserRole[]): boolean => {
      return roles.some(role => hasRole(role));
    },

    /**
     * 모든 역할 보유 확인
     */
    hasAllRoles: (roles: UserRole[]): boolean => {
      return roles.every(role => hasRole(role));
    },

    /**
     * 권한 기반 접근 확인
     */
    hasAnyPermission: (permissions: string[]): boolean => {
      return permissions.some(permission => hasPermission(permission));
    },

    /**
     * 모든 권한 보유 확인
     */
    hasAllPermissions: (permissions: string[]): boolean => {
      return permissions.every(permission => hasPermission(permission));
    },

    /**
     * 복합 권한 확인
     */
    hasAccess: (config: PermissionConfig): boolean => {
      const { roles, permissions, requireAll = false } = config;
      
      let hasRoleAccess = false;
      let hasPermissionAccess = false;

      // 역할 확인
      if (roles.length > 0) {
        hasRoleAccess = requireAll ? 
          roles.every(role => hasRole(role)) : 
          roles.some(role => hasRole(role));
      } else {
        hasRoleAccess = true; // 역할 요구사항 없음
      }

      // 권한 확인
      if (permissions.length > 0) {
        hasPermissionAccess = requireAll ?
          permissions.every(permission => hasPermission(permission)) :
          permissions.some(permission => hasPermission(permission));
      } else {
        hasPermissionAccess = true; // 권한 요구사항 없음
      }

      return hasRoleAccess && hasPermissionAccess;
    }
  }), [hasRole, hasPermission]);

  // 미리 정의된 권한 세트
  const predefinedPermissions = useMemo(() => ({
    // 관리자 권한
    isSystemAdmin: () => hasRole('admin'),
    
    // 사용자 관리 권한
    canManageUsers: () => checkPermission.hasAccess({
      roles: ['admin'],
      permissions: ['users:manage', 'users:create', 'users:delete']
    }),
    
    canViewUsers: () => checkPermission.hasAccess({
      roles: ['admin'],
      permissions: ['users:read']
    }),
    
    // 컨텐츠 관리 권한
    canManageContent: () => checkPermission.hasAccess({
      roles: ['admin'],
      permissions: ['content:manage', 'content:publish']
    }),
    
    canCreateContent: () => checkPermission.hasAccess({
      roles: ['admin'],
      permissions: ['content:create']
    }),
    
    // 이커머스 관리 권한
    canManageProducts: () => checkPermission.hasAccess({
      roles: ['admin'],
      permissions: ['products:manage']
    }),
    
    canManageOrders: () => checkPermission.hasAccess({
      roles: ['admin'],
      permissions: ['orders:manage']
    }),
    
    // 시스템 설정 권한
    canManageSettings: () => checkPermission.hasAccess({
      roles: ['admin'],
      permissions: ['settings:manage']
    }),
    
    // 보안 관련 권한
    canViewSecurityLogs: () => checkPermission.hasAccess({
      roles: ['admin'],
      permissions: ['security:view']
    }),
    
    canManageSecurity: () => checkPermission.hasAccess({
      roles: ['admin'],
      permissions: ['security:manage']
    }),
    
    // 데이터 접근 권한
    canExportData: () => checkPermission.hasAccess({
      roles: ['admin'],
      permissions: ['data:export']
    }),
    
    canDeleteData: () => checkPermission.hasAccess({
      roles: ['admin'],
      permissions: ['data:delete'],
      requireAll: true
    })
  }), [hasRole, checkPermission]);

  // 사용자 정보 요약
  const userSummary = useMemo(() => {
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions,
      isApproved: user.isApproved,
      isLocked: user.isLocked,
      capabilities: {
        isSystemAdmin: predefinedPermissions.isSystemAdmin(),
        canManageUsers: predefinedPermissions.canManageUsers(),
        canManageContent: predefinedPermissions.canManageContent(),
        canManageProducts: predefinedPermissions.canManageProducts(),
        canManageOrders: predefinedPermissions.canManageOrders(),
        canManageSettings: predefinedPermissions.canManageSettings(),
        canViewSecurityLogs: predefinedPermissions.canViewSecurityLogs(),
        canManageSecurity: predefinedPermissions.canManageSecurity()
      }
    };
  }, [user, predefinedPermissions]);

  return {
    user: userSummary,
    check: checkPermission,
    can: predefinedPermissions,
    // 헬퍼 함수들
    isAdmin: () => hasRole('admin'),
    isCustomer: () => hasRole('customer'),
    isBusiness: () => hasRole('business'),
    isAffiliate: () => hasRole('affiliate'),
    isPartner: () => hasRole('partner'),
    isSupplier: () => hasRole('supplier')
  };
};

/**
 * 컴포넌트 권한 확인 HOC
 */
export const withPermissions = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  permissionConfig: PermissionConfig,
  fallbackComponent?: React.ComponentType
) => {
  return (props: P) => {
    const { check } = usePermissions();
    
    if (!check.hasAccess(permissionConfig)) {
      if (fallbackComponent) {
        const FallbackComponent = fallbackComponent;
        return <FallbackComponent {...props} />;
      }
      return (
        <div className="text-center p-4 text-gray-500">
          이 기능에 접근할 권한이 없습니다.
        </div>
      );
    }
    
    return <WrappedComponent {...props} />;
  };
};

export default usePermissions;
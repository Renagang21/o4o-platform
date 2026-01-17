/**
 * Signage Role Guard Components
 *
 * Role Reform (RR-2)
 *
 * Guards for Admin, Operator (HQ), and Store access
 * Based on ROLE-STRUCTURE-V3.md
 */

import { FC, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { ShieldAlert, Building2, Store, Users } from 'lucide-react';

// Type definitions
export type SignageRole = 'admin' | 'operator' | 'store';

export interface SignagePermission {
  role: SignageRole;
  serviceKey?: string;
  organizationId?: string;
}

// Mock auth hook - replace with actual auth implementation
const useAuth = () => {
  // TODO: Replace with actual auth context
  return {
    user: {
      id: 'user-1',
      roles: ['admin'], // For testing, adjust as needed
      permissions: ['signage:admin', 'signage:pharmacy:operator'],
      organizationId: 'org-1',
      organizations: ['org-1', 'org-2'],
    },
    isAuthenticated: true,
  };
};

/**
 * Check if user has admin permission
 */
export function hasAdminPermission(user: any): boolean {
  return (
    user?.roles?.includes('admin') ||
    user?.permissions?.includes('signage:admin')
  );
}

/**
 * Check if user has operator permission for a service
 */
export function hasOperatorPermission(user: any, serviceKey: string): boolean {
  return (
    user?.permissions?.includes(`signage:${serviceKey}:operator`) ||
    hasAdminPermission(user)
  );
}

/**
 * Check if user has store permission for an organization
 */
export function hasStorePermission(user: any, organizationId: string): boolean {
  return (
    user?.organizationId === organizationId ||
    user?.organizations?.includes(organizationId) ||
    hasAdminPermission(user)
  );
}

/**
 * Unauthorized State Component
 */
interface UnauthorizedStateProps {
  role: SignageRole;
  message?: string;
}

const UnauthorizedState: FC<UnauthorizedStateProps> = ({ role, message }) => {
  const roleIcons = {
    admin: <ShieldAlert className="w-12 h-12 text-red-400" />,
    operator: <Building2 className="w-12 h-12 text-orange-400" />,
    store: <Store className="w-12 h-12 text-blue-400" />,
  };

  const roleNames = {
    admin: '시스템 관리자',
    operator: 'HQ 운영자',
    store: '매장 사용자',
  };

  const defaultMessages = {
    admin: '이 기능은 시스템 관리자만 접근할 수 있습니다.',
    operator: '이 기능은 HQ 운영자만 접근할 수 있습니다.',
    store: '이 기능은 해당 매장 사용자만 접근할 수 있습니다.',
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="bg-gray-100 rounded-full p-4 mb-4">
        {roleIcons[role]}
      </div>
      <h2 className="text-xl font-semibold text-gray-800 mb-2">
        접근 권한이 없습니다
      </h2>
      <p className="text-gray-600 text-center max-w-md mb-2">
        {message || defaultMessages[role]}
      </p>
      <p className="text-sm text-gray-500">
        {roleNames[role]} 권한이 필요합니다.
      </p>
    </div>
  );
};

/**
 * Admin Signage Guard
 *
 * Guards content for system administrators only.
 * Used in Admin Dashboard (/digital-signage/*)
 */
export interface AdminSignageGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
}

export const AdminSignageGuard: FC<AdminSignageGuardProps> = ({
  children,
  fallback,
  redirectTo,
}) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasAdminPermission(user)) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }
    return fallback ? <>{fallback}</> : <UnauthorizedState role="admin" />;
  }

  return <>{children}</>;
};

/**
 * Operator Signage Guard
 *
 * Guards content for HQ operators.
 * Used in Service Frontend (/signage/hq/*)
 */
export interface OperatorSignageGuardProps {
  serviceKey: string;
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
}

export const OperatorSignageGuard: FC<OperatorSignageGuardProps> = ({
  serviceKey,
  children,
  fallback,
  redirectTo,
}) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasOperatorPermission(user, serviceKey)) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }
    return fallback ? <>{fallback}</> : <UnauthorizedState role="operator" />;
  }

  return <>{children}</>;
};

/**
 * Store Signage Guard
 *
 * Guards content for store users.
 * Used in Service Frontend (/signage/store/*)
 */
export interface StoreSignageGuardProps {
  organizationId: string;
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
}

export const StoreSignageGuard: FC<StoreSignageGuardProps> = ({
  organizationId,
  children,
  fallback,
  redirectTo,
}) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasStorePermission(user, organizationId)) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }
    return fallback ? <>{fallback}</> : <UnauthorizedState role="store" />;
  }

  return <>{children}</>;
};

/**
 * useSignagePermissions Hook
 *
 * Returns permission checking functions for the current user.
 */
export function useSignagePermissions() {
  const { user } = useAuth();

  return {
    isAdmin: hasAdminPermission(user),
    isOperator: (serviceKey: string) => hasOperatorPermission(user, serviceKey),
    isStore: (organizationId: string) => hasStorePermission(user, organizationId),
    hasPermission: (permission: SignagePermission) => {
      switch (permission.role) {
        case 'admin':
          return hasAdminPermission(user);
        case 'operator':
          return hasOperatorPermission(user, permission.serviceKey || '');
        case 'store':
          return hasStorePermission(user, permission.organizationId || '');
        default:
          return false;
      }
    },
  };
}

export default {
  AdminSignageGuard,
  OperatorSignageGuard,
  StoreSignageGuard,
  useSignagePermissions,
};

import { FC, ReactNode, useEffect, useState } from 'react';
import { authClient } from '@o4o/auth-client';
import { Alert, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';

interface PermissionGuardProps {
  children: ReactNode;
  /** Required permission string (e.g., 'organization.manage', 'forum.moderate') */
  permission?: string;
  /** Organization ID to check permission against */
  organizationId?: string;
  /** If true, shows loading spinner while checking */
  showLoading?: boolean;
  /** If true, redirects to /access-denied instead of showing error */
  redirectOnDenied?: boolean;
  /** Custom fallback component to show when permission is denied */
  fallback?: ReactNode;
  /** If true, check if user is super admin */
  requireSuperAdmin?: boolean;
  /** If true, check if user is organization admin */
  requireOrgAdmin?: boolean;
}

/**
 * PermissionGuard
 *
 * RBAC-based permission checking component.
 * Wraps child components and controls visibility based on user permissions.
 *
 * Features:
 * - Permission-based rendering
 * - Organization-scoped permissions
 * - Super Admin / Organization Admin checks
 * - Flexible fallback options
 *
 * Usage:
 * ```tsx
 * <PermissionGuard permission="organization.manage" organizationId={orgId}>
 *   <Button>Manage Organization</Button>
 * </PermissionGuard>
 * ```
 */
export const PermissionGuard: FC<PermissionGuardProps> = ({
  children,
  permission,
  organizationId,
  showLoading = true,
  redirectOnDenied = false,
  fallback,
  requireSuperAdmin = false,
  requireOrgAdmin = false
}) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkPermission();
  }, [permission, organizationId, requireSuperAdmin, requireOrgAdmin]);

  const checkPermission = async () => {
    setLoading(true);
    try {
      let allowed = false;

      if (requireSuperAdmin) {
        // Check super admin status
        const response = await authClient.api.get('/api/users/me');
        allowed = response.data?.isSuperAdmin || false;
      } else if (requireOrgAdmin && organizationId) {
        // Check organization admin status
        const response = await authClient.api.get(
          `/api/organization/${organizationId}/is-admin`
        );
        allowed = response.data?.isAdmin || false;
      } else if (permission) {
        // Check specific permission
        const params: any = { permission };
        if (organizationId) {
          params.organizationId = organizationId;
        }

        const response = await authClient.api.get('/api/permissions/check', { params });
        allowed = response.data?.allowed || false;
      } else {
        // No permission check required
        allowed = true;
      }

      setHasPermission(allowed);

      // Redirect if denied and redirectOnDenied is true
      if (!allowed && redirectOnDenied) {
        navigate('/access-denied');
      }
    } catch (error) {
      console.error('Permission check failed:', error);
      setHasPermission(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return showLoading ? (
      <div className="flex justify-center items-center p-8">
        <Spin size="large" />
      </div>
    ) : null;
  }

  if (hasPermission === false) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return (
      <Alert
        message="접근 권한 없음"
        description="이 기능을 사용할 권한이 없습니다."
        type="warning"
        showIcon
      />
    );
  }

  return <>{children}</>;
};

export default PermissionGuard;

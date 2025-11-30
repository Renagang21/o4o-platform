import { FC, ReactNode, useEffect, useState } from 'react';
import { authClient } from '@o4o/auth-client';
import { Shield } from 'lucide-react';

interface PermissionGuardProps {
  children: ReactNode;
  required?: string[];
  organizationId?: string;
  requireGlobalAdmin?: boolean;
  requireOrgAdmin?: boolean;
  fallback?: ReactNode;
  showMessage?: boolean;
}

export const PermissionGuard: FC<PermissionGuardProps> = ({
  children,
  required = [],
  organizationId,
  requireGlobalAdmin = false,
  requireOrgAdmin = false,
  fallback,
  showMessage = true
}) => {
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    checkPermission();
  }, [required, organizationId, requireGlobalAdmin, requireOrgAdmin]);

  const checkPermission = async () => {
    setLoading(true);

    try {
      // Check global admin
      if (requireGlobalAdmin) {
        const response = await authClient.api.get('/api/users/me');
        const allowed = response.data?.isSuperAdmin || false;
        setHasPermission(allowed);
        setLoading(false);
        return;
      }

      // Check org admin
      if (requireOrgAdmin && organizationId) {
        const response = await authClient.api.get(`/api/organizations/${organizationId}/members/me`);
        const allowed = response.data?.role === 'admin' || response.data?.role === 'manager';
        setHasPermission(allowed);
        setLoading(false);
        return;
      }

      // Check specific permissions
      if (required.length > 0) {
        const params: any = { permissions: required.join(',') };
        if (organizationId) {
          params.organizationId = organizationId;
        }

        const response = await authClient.api.get('/api/permissions/check', { params });
        setHasPermission(response.data?.allowed || false);
      } else {
        // No specific requirements, allow by default
        setHasPermission(true);
      }
    } catch (error) {
      console.error('Permission check failed:', error);
      setHasPermission(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!hasPermission) {
    if (fallback !== undefined) {
      return <>{fallback}</>;
    }

    if (!showMessage) {
      return null;
    }

    return (
      <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <Shield className="w-5 h-5 text-yellow-600" />
        <div>
          <p className="text-sm font-medium text-yellow-800">권한이 필요합니다</p>
          <p className="text-xs text-yellow-600 mt-1">
            이 기능을 사용하려면 필요한 권한이 있어야 합니다.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default PermissionGuard;

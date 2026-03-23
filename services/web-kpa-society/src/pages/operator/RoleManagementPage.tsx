/**
 * Role Management Page — wrapper
 * WO-O4O-ROLE-MANAGEMENT-PAGE-COMMONIZATION-V1
 */

import { RoleManagementPage } from '@o4o/ui';
import { authClient } from '@o4o/auth-client';
import { toast } from '@o4o/error-handling';
import { useAuth } from '../../contexts/AuthContext';

export default function RoleManagementPageWrapper() {
  const { user } = useAuth();
  const isAdmin = user?.roles?.some((r: string) => ['admin', 'super_admin'].includes(r)) ?? false;

  return <RoleManagementPage apiClient={authClient.api} isAdmin={isAdmin} toast={toast} />;
}

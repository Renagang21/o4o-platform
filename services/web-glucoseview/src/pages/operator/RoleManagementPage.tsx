/**
 * Role Management Page — wrapper
 * WO-O4O-ROLE-MANAGEMENT-PAGE-COMMONIZATION-V1
 */

import { RoleManagementPage } from '@o4o/ui';
import { api } from '../../lib/apiClient';
import { toast } from '@o4o/error-handling';
import { useAuth } from '../../contexts/AuthContext';

export default function RoleManagementPageWrapper() {
  const { user } = useAuth();
  const isAdmin = user?.roles?.some((r: string) => r === 'glucoseview:admin' || r === 'platform:super_admin') ?? false;

  return <RoleManagementPage apiClient={api} isAdmin={isAdmin} toast={toast} />;
}

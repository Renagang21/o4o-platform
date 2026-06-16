/**
 * Role Management Page — wrapper
 * WO-O4O-ROLE-MANAGEMENT-PAGE-COMMONIZATION-V1
 */

import { RoleManagementPage } from '@o4o/ui';
import { api } from '@/lib/apiClient';
import { toast } from '@o4o/error-handling';
import { useAuth } from '@/contexts/AuthContext';

export default function RoleManagementPageWrapper() {
  const { user } = useAuth();
  const isAdmin = user?.roles?.some((r: string) => ['neture:admin', 'platform:super_admin'].includes(r)) ?? false;

  return (
    <div>
      {/* WO-O4O-NETURE-PLATFORM-ADMIN-SCOPE-SEPARATION-V1: 역할/권한 관리 = 플랫폼 관리 성격 명시 */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3 text-xs text-indigo-800">
          역할·권한 관리는 플랫폼 관리 성격의 기능입니다. 서비스별 운영자/관리자 지정 정책은 후속 platform-admin
          정책 결정에 따라 소속과 범위가 조정될 수 있습니다.
        </div>
      </div>
      <RoleManagementPage apiClient={api} isAdmin={isAdmin} toast={toast} />
    </div>
  );
}

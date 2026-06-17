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
      {/* WO-O4O-PLATFORM-ROLES-MENU-MIGRATION-V1: 역할 관리 platform 영역 이동 안내(기능 보존, deprecated) */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex items-center justify-between gap-3">
          <span>
            역할 관리는 <strong>O4O 플랫폼 관리 영역</strong>으로 이동되었습니다. 앞으로는 <code>/admin/platform/roles</code> 에서 관리해 주세요.
          </span>
          <a href="/admin/platform/roles" className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 no-underline">
            플랫폼 역할 관리로 이동
          </a>
        </div>
      </div>
      <RoleManagementPage apiClient={api} isAdmin={isAdmin} toast={toast} />
    </div>
  );
}

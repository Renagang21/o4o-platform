/**
 * PlatformRolesPage — /admin/platform/roles
 *
 * WO-O4O-PLATFORM-ROLES-MENU-MIGRATION-V1
 * 선행: IR-O4O-PLATFORM-TIER1-MENU-MIGRATION-DECISION-V1 (역할 관리 = CROSS-SERVICE, backend CUD 이미 platform 전용 → /admin/platform 이동)
 *
 * 공통 @o4o/ui RoleManagementPage 재사용. platform 성격 안내만 추가.
 * backend(roles API) 무변경 — CUD 는 기존대로 platform admin 전용. 상위 PlatformSectionLayout(platform guard) 안에서 렌더.
 */

import { RoleManagementPage } from '@o4o/ui';
import { api } from '@/lib/apiClient';
import { toast } from '@o4o/error-handling';
import { useAuth } from '@/contexts/AuthContext';

export default function PlatformRolesPage() {
  const { user } = useAuth();
  const isAdmin = user?.roles?.some((r: string) => ['platform:admin', 'platform:super_admin'].includes(r)) ?? false;

  return (
    <div>
      <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3 text-xs text-indigo-800 leading-relaxed mb-4">
        <strong>O4O 플랫폼 역할 관리</strong> — 여러 서비스에서 사용하는 역할 카탈로그를 관리합니다.
        역할 변경은 전체 서비스 권한 체계에 영향을 줄 수 있습니다. (역할 생성/수정/삭제는 platform 관리자 전용)
      </div>
      <RoleManagementPage apiClient={api} isAdmin={isAdmin} toast={toast} />
    </div>
  );
}

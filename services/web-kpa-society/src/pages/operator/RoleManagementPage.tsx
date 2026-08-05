/**
 * Role Management Page — wrapper
 * WO-O4O-ROLE-MANAGEMENT-PAGE-COMMONIZATION-V1
 */

import { RoleManagementPage } from '@o4o/ui';
import { authClient } from '../../contexts/AuthContext';
import { toast } from '@o4o/error-handling';
import { useAuth } from '../../contexts/AuthContext';
import { ROLES } from '../../lib/role-constants';

export default function RoleManagementPageWrapper() {
  const { user } = useAuth();
  // WO-O4O-KPA-SERVICE-OPERATOR-MANAGEMENT-INFORMATION-AUDIT-V1:
  //   기존 판정은 prefix 없는 legacy role('admin'/'super_admin')을 검사해 RBAC namespacing 이후
  //   항상 false 였다(kpa:admin / platform:super_admin 미매칭) → platform:super_admin 이어도
  //   역할 카탈로그 CUD UI 가 숨겨짐(프로덕션 확인).
  //   역할 카탈로그 CUD 는 backend 가 `scope.isPlatformAdmin`(platform:super_admin)
  //   으로 강제하므로 UI 판정도 동일 기준에 맞춘다. kpa:admin 은 조회 전용(403 유발 버튼 미노출).
  const isAdmin = user?.roles?.some(
    (r: string) => r === ROLES.PLATFORM_SUPER_ADMIN,
  ) ?? false;

  return <RoleManagementPage apiClient={authClient.api} isAdmin={isAdmin} toast={toast} />;
}

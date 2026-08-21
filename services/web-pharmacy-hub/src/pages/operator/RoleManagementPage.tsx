/**
 * RoleManagementPage — 역할 관리 (Pharmacy-Hub, wrapper)
 *
 * WO-O4O-PHARMACYHUB-OPERATOR-COMMUNITY-AND-COMMON-CAPABILITY-FULL-ADOPTION-V1:
 *   공통 @o4o/ui RoleManagementPage + 공통 backend `/api/v1/operator/roles`
 *   (serviceScope 로 pharmacy-hub 역할 카탈로그만 반환).
 *   생성/수정/삭제는 backend 가 `scope.isPlatformAdmin` 으로 강제하므로
 *   UI 판정도 platform:super_admin 기준으로 맞춘다 (403 유발 버튼 미노출).
 */

import { RoleManagementPage } from '@o4o/ui';
import { api } from '../../lib/apiClient';
import { toast } from '@o4o/error-handling';
import { useAuth } from '../../contexts/AuthContext';
import { PLATFORM_SUPER_ADMIN, SERVICE_KEY } from '../../config/service';

export default function RoleManagementPageWrapper() {
  const { user } = useAuth();
  const isAdmin = user?.roles?.some((r: string) => r === PLATFORM_SUPER_ADMIN) ?? false;

  // lockedServiceKey: 공통 컴포넌트의 기본값은 '전체'라 다중 서비스 role 보유 계정에서
  // kpa-branch/glycopharm 등 타 서비스 역할까지 노출된다. Pharmacy-Hub 콘솔은
  // pharmacy-hub 카탈로그만 보여준다.
  return (
    <RoleManagementPage
      apiClient={api}
      isAdmin={isAdmin}
      toast={toast}
      lockedServiceKey={SERVICE_KEY}
    />
  );
}

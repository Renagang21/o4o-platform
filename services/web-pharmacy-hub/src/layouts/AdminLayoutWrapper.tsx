/**
 * AdminLayoutWrapper — Pharmacy-Hub 관리자 영역 셸 wrapper
 *
 * WO-O4O-PHARMACYHUB-ADMIN-OPERATOR-DUAL-AREA-ADOPTION-AND-PRODUCTION-CLOSURE-V1
 *
 * K-Cosmetics / GlycoPharm / Neture / KPA 와 동일하게 `/admin` 을 **운영자 영역과 분리된
 * 독립 관리자 영역**으로 둔다. 셸은 공통 OperatorAreaShell(@o4o/operator-ux-core)을
 * 그대로 재사용하고 메뉴·도메인 IA·영역 라벨만 관리자 축으로 주입한다 —
 * 서비스 전용 관리자 Layout/Sidebar 사본을 새로 만들지 않는다.
 *
 * 가드 = MembershipGate(service_memberships.status) + 역할 가드(admin | platform:super_admin).
 * 다른 서비스의 ProtectedRoute(allowedRoles=[{service}:admin, platform:super_admin])와 같은 표다.
 * 실제 권한 경계는 backend service-legal admin scope guard 가 강제하며,
 * 프론트 가드는 UX 안내(빈 화면·403 노출 방지)다.
 */

import { Link } from 'react-router-dom';
import { OperatorAreaShell } from '@o4o/operator-ux-core';
import { useAuth } from '../contexts/AuthContext';
import { MembershipGate } from '../components/MembershipGate';
import { OperatorHeader } from '../components/operator/OperatorHeader';
import {
  ADMIN_UNIFIED_MENU,
  ADMIN_ENABLED_CAPABILITIES,
  PHARMACY_HUB_ADMIN_DOMAIN_IA,
} from '../config/adminMenuGroups';
import { ROLES, satisfiesRole } from '../config/service';

function NoAdminAccess() {
  return (
    <div className="mx-auto max-w-md rounded-lg border border-gray-200 bg-white p-6 text-center">
      <h2 className="mb-2 text-lg font-semibold">관리자 권한이 필요합니다</h2>
      <p className="mb-4 text-sm text-gray-600">
        이 영역은 서비스 관리자 전용입니다. 운영 업무는 운영 대시보드에서 처리해 주세요.
      </p>
      <Link to="/operator" className="text-sm text-primary-600 underline">
        운영 대시보드로 이동
      </Link>
    </div>
  );
}

export function AdminLayoutWrapper() {
  const { user } = useAuth();
  const roles: string[] = Array.isArray(user?.roles) ? (user!.roles as string[]) : [];
  const isAdmin = satisfiesRole(roles, ROLES.admin);

  return (
    <MembershipGate>
      {isAdmin ? (
        <OperatorAreaShell
          header={<OperatorHeader areaHome="/admin" areaLabel="서비스 관리자" />}
          menuItems={ADMIN_UNIFIED_MENU}
          capabilities={ADMIN_ENABLED_CAPABILITIES}
          domainIAConfig={PHARMACY_HUB_ADMIN_DOMAIN_IA}
        />
      ) : (
        <NoAdminAccess />
      )}
    </MembershipGate>
  );
}

/**
 * SubdomainOperatorLayoutWrapper — 서브도메인 운영자 화면(supplier · funding)의 레이아웃
 *
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 — 배포 2 전 경계 보정.
 *   화면 guard 는 `SubdomainOperatorRoute` 가 한다. 이 파일은 **크롬만** 고른다:
 *     - Neture 관리자/운영자이기도 한 사람 → 기존 Neture admin/operator 레이아웃 그대로
 *       (사이드바에서 이 화면으로 들어왔을 때 크롬이 바뀌지 않는다)
 *     - 서브도메인 운영자 역할만 가진 사람 → 자기 화면 하나만 있는 사이드바
 *       (Neture 메뉴를 보여 주면 누르는 곳마다 접근 거부 화면이 된다)
 *   레이아웃 선택은 권한 판정이 아니다 — 다른 경로는 각자의 guard 가 그대로 판정한다.
 */
import { OperatorAreaShell } from '@o4o/operator-ux-core';
import type { OperatorGroupKey, OperatorMenuItem } from '@o4o/ui';
import { ENABLED_CAPABILITIES } from '../../config/operatorCapabilities';
import { NETURE_OPERATOR_DOMAIN_IA } from '../../config/operatorMenuGroups';
import { NetureGlobalHeader } from '../NetureGlobalHeader';
import { NetureBottomNav } from '../NetureBottomNav';
import { useAuth } from '../../contexts/AuthContext';
import { ADMIN_ROLES, OPERATOR_OR_ABOVE_ROLES, type SubdomainOperatorKey } from '../../lib/role-constants';
import AdminLayoutWrapper from './AdminLayoutWrapper';
import OperatorLayoutWrapper from './OperatorLayoutWrapper';

type Area = 'admin' | 'operator';

const SCOPED_MENU: Readonly<Record<'supplier' | 'funding', Partial<Record<OperatorGroupKey, OperatorMenuItem[]>>>> = {
  supplier: { approvals: [{ label: '공급자 상태 관리', path: '/admin/supplier-governance' }] },
  funding: { approvals: [{ label: '유통참여형 펀딩', path: '/operator/market-trial' }] },
};

export default function SubdomainOperatorLayoutWrapper({
  serviceKey,
  area,
}: {
  serviceKey: Extract<SubdomainOperatorKey, 'supplier' | 'funding'>;
  area: Area;
}) {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const netureRoles = area === 'admin' ? ADMIN_ROLES : OPERATOR_OR_ABOVE_ROLES;
  if (roles.some((r) => netureRoles.includes(r))) {
    return area === 'admin' ? <AdminLayoutWrapper /> : <OperatorLayoutWrapper />;
  }

  return (
    <>
      <OperatorAreaShell
        header={<NetureGlobalHeader />}
        menuItems={SCOPED_MENU[serviceKey]}
        capabilities={ENABLED_CAPABILITIES}
        domainIAConfig={NETURE_OPERATOR_DOMAIN_IA}
      />
      <NetureBottomNav />
    </>
  );
}

/**
 * SubdomainOperatorLayoutWrapper — 서브도메인 운영자 화면(supplier · funding · community)의 레이아웃
 *
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 — 배포 2 전 경계 보정.
 *   화면 guard 는 SubdomainOperatorRoute 가 판정한다. 현재 호스트의 담당 업무 메뉴를
 *   표시하며, Neture 역할을 함께 가진 사용자에게도 다른 사업의 메뉴를 섞지 않는다.
 *   레이아웃 선택은 권한을 부여하지 않는다.
 */
import { OperatorAreaShell } from '@o4o/operator-ux-core';
import type { OperatorGroupKey, OperatorMenuItem } from '@o4o/ui';
import { ENABLED_CAPABILITIES } from '../../config/operatorCapabilities';
import { NETURE_OPERATOR_DOMAIN_IA } from '../../config/operatorMenuGroups';
import { NetureGlobalHeader } from '../NetureGlobalHeader';
import { NetureBottomNav } from '../NetureBottomNav';
import { useAuth } from '../../contexts/AuthContext';
import {
  withoutUnreachableSubdomainOperatorItems,
  type SubdomainOperatorKey,
} from '../../lib/role-constants';

type Area = 'admin' | 'operator';

const SCOPED_MENU: Readonly<Record<SubdomainOperatorKey, Partial<Record<OperatorGroupKey, OperatorMenuItem[]>>>> = {
  supplier: {
    approvals: [
      { label: '서비스 회원 관리', path: '/operator/service-members/supplier' },
      { label: '공급자 승인', path: '/operator/suppliers' },
      { label: '공급자 상태 관리', path: '/admin/supplier-governance' },
    ],
  },
  funding: { approvals: [{ label: '서비스 회원 관리', path: '/operator/service-members/funding' },{ label: '유통참여형 펀딩', path: '/operator/market-trial' }] },
  community: { approvals: [
    { label: '서비스 회원 관리', path: '/operator/service-members/community' },
    { label: '커뮤니티 서비스 관리', path: '/admin/communities' },
    { label: '커뮤니티 개설 심사', path: '/operator/communities' },
  ] },
};

export default function SubdomainOperatorLayoutWrapper({
  serviceKey,
}: {
  serviceKey: SubdomainOperatorKey;
  area: Area;
}) {
  const { user } = useAuth();

  return (
    <>
      <OperatorAreaShell
        header={<NetureGlobalHeader />}
        // 같은 서브도메인 안에서도 단계가 다르다 — `supplier:operator` 에게 admin 전용
        // `/admin/supplier-governance` 항목을 보여주지 않는다.
        menuItems={withoutUnreachableSubdomainOperatorItems(SCOPED_MENU[serviceKey], user)}
        capabilities={ENABLED_CAPABILITIES}
        domainIAConfig={NETURE_OPERATOR_DOMAIN_IA}
      />
      <NetureBottomNav />
    </>
  );
}

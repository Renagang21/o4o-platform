/**
 * SubdomainOperatorLayoutWrapper — 서브도메인 운영자 화면(supplier · funding · community)의 레이아웃
 *
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 — 배포 2 전 경계 보정.
 *   화면 guard 는 SubdomainOperatorRoute 가 판정한다. 현재 호스트의 담당 업무 메뉴를
 *   표시하며, Neture 역할을 함께 가진 사용자에게도 다른 사업의 메뉴를 섞지 않는다.
 *   레이아웃 선택은 권한을 부여하지 않는다.
 */
import { OperatorAreaShell, type OperatorDomainIAConfig } from '@o4o/operator-ux-core';
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
  supplier: { dashboard: [{label:'운영 알림·문의함',path:'/operator/inbox/supplier'}],
    approvals: [
      { label: '서비스 회원 관리', path: '/operator/service-members/supplier' },
      { label: '공급자 승인', path: '/operator/suppliers' },
      { label: '문의 관리', path: '/operator/service-contact/supplier' },
      { label: 'Operator 지정 · 해제', path: '/admin/supplier-governance/operators' },
      { label: '공급자 상태 관리', path: '/admin/supplier-governance' },
      { label: '서비스 약관 관리', path: '/operator/legal/supplier' },
      { label: 'Hero · 광고 관리', path: '/operator/home-presentation/supplier' },
    ],
  },
  funding: { dashboard: [{label:'운영 알림·문의함',path:'/operator/inbox/funding'}], approvals: [{ label: '문의 관리', path: '/operator/service-contact/funding' },{ label: 'Operator 지정 · 해제', path: '/operator/market-trial/operators' },{ label: '서비스 회원 관리', path: '/operator/service-members/funding' },{ label: '유통참여형 펀딩', path: '/operator/market-trial' }, { label: '서비스 약관 관리', path: '/operator/legal/funding' }, { label: 'Hero · 광고 관리', path: '/operator/home-presentation/funding' }] },
  community: { dashboard: [{label:'운영 알림·문의함',path:'/operator/inbox/community'}], users: [{ label: '문의 관리', path: '/operator/service-contact/community' },
    { label: '서비스 회원 관리', path: '/operator/service-members/community' },
  ], forum: [
    { label: '게시판 운영', path: '/operator/communities/boards' },
    { label: '게시판 · 공개 설정 관리', path: '/operator/communities' },
  ], content: [
    { label: '첫 화면 · 콘텐츠 · 자료 관리', path: '/operator/communities/home' },
    { label: 'Hero · 광고 관리', path: '/operator/home-presentation/community' },
  ] },
};

const COMMUNITY_OPERATOR_DOMAIN_IA: OperatorDomainIAConfig = {
  labels: { community_operation: { label: '커뮤니티 운영', emoji: '💬' } },
  groupToDomain: { ...NETURE_OPERATOR_DOMAIN_IA.groupToDomain, dashboard: 'community_operation', users: 'community_operation', forum: 'community_operation', content: 'community_operation', system: 'community_operation' },
  groupOrder: { community_operation: ['dashboard', 'users', 'forum', 'content', 'system'] },
  displayOrder: ['community_operation'],
  topPinnedGroups: [],
};

export default function SubdomainOperatorLayoutWrapper({
  serviceKey,
  area,
}: {
  serviceKey: SubdomainOperatorKey;
  area: Area;
}) {
  const { user } = useAuth();
  const menu = serviceKey === 'community' && area === 'admin' ? { system: [
    { label: 'Operator 지정 · 해제', path: '/admin/communities/operators' },
    { label: '회원 데이터 완전 삭제', path: '/admin/communities/members' },
    { label: '게시판 완전 삭제', path: '/admin/communities/boards' },
    { label: '서비스 약관 관리', path: '/operator/legal/community' },
    { label: '일상 운영으로', path: '/operator/communities' },
  ] } : SCOPED_MENU[serviceKey];

  const communityIA = area === 'admin' ? { ...COMMUNITY_OPERATOR_DOMAIN_IA, labels: { community_operation: { label: '커뮤니티 관리', emoji: '⚙️' } } } : COMMUNITY_OPERATOR_DOMAIN_IA;

  return (
    <>
      <OperatorAreaShell
        header={<NetureGlobalHeader />}
        // 같은 서브도메인 안에서도 단계가 다르다 — `supplier:operator` 에게 admin 전용
        // `/admin/supplier-governance` 항목을 보여주지 않는다.
        menuItems={withoutUnreachableSubdomainOperatorItems(menu, user)}
        menuLabel={serviceKey === 'community' && area === 'admin' ? '커뮤니티 관리자 메뉴' : undefined}
        capabilities={ENABLED_CAPABILITIES}
        domainIAConfig={serviceKey === 'community' ? communityIA : NETURE_OPERATOR_DOMAIN_IA}
      />
      <NetureBottomNav />
    </>
  );
}

/**
 * MyPageHub - 마이페이지 (계정 중심 허브)
 *
 * WO-O4O-NETURE-MYPAGE-SPLIT-V1
 * WO-MYPAGE-IA-RESTRUCTURE-V1
 * WO-O4O-NETURE-MYPAGE-KPA-CANONICAL-REALIGNMENT-V1
 * WO-O4O-NETURE-MYPAGE-KPA-UI-STRUCTURE-ALIGNMENT-V1
 *
 * KPA-Society MyDashboardPage 구조 기준 정렬:
 *   - 프로필 요약 카드 (avatar 대형, 이름, 이메일, 역할 배지, 프로필 수정 버튼)
 *   - 최근 활동 섹션 (빈 상태)
 *   - 하단 아이콘형 바로가기 메뉴
 * 공급자 업무 메뉴(상품/주문/정산 등)는 /supplier 대시보드에서 접근.
 */

import { useNavigate } from 'react-router-dom';
import { UserCog, MessageSquare, Building2, Settings } from 'lucide-react';
import { useAuth, getNetureDashboardRoute, getNetureRoleLabel } from '../../contexts';
import { useLoginModal } from '../../contexts/LoginModalContext';
import {
  MyPageLayout,
  QuickActionsSection,
  RoleBadgeGroup,
  MyPageAuthRequired,
  MyPageUserSummary,
  MyPageEntryCardGrid,
  MyPageActivityFeed,
  MembershipStatusBadge,
} from '@o4o/account-ui';
import { getServiceMembershipStatus } from '../../lib/membershipGate';
import { SUPPLIER_ONLY_ROLES } from '../../lib/role-constants';
import { getNetureMyPageNavItems } from './navItems';

export default function MyPageHub() {
  const { user, isAuthenticated, logout } = useAuth();
  const { openLoginModal } = useLoginModal();
  const navigate = useNavigate();

  // WO-O4O-CROSS-SERVICE-MYPAGE-SHELL-LAYOUT-COMMONIZATION-V1:
  // 손으로 만든 로그인 안내를 공통 컴포넌트로 수렴하고, 안내 화면에서도 헤더를 유지한다.
  // 로그인은 Neture 고유의 모달 흐름을 그대로 쓴다.
  if (!isAuthenticated || !user) {
    return (
      <MyPageLayout
        title="마이페이지"
        breadcrumb={[{ label: '홈', href: '/' }, { label: '마이페이지' }]}
        width="wide"
        navItems={getNetureMyPageNavItems([])}
      >
        <MyPageAuthRequired
          description="마이페이지를 이용하려면 로그인해주세요."
          actionLabel="로그인"
          onAction={() => openLoginModal('/mypage')}
        />
      </MyPageLayout>
    );
  }

  const dashboardPath = getNetureDashboardRoute(user.roles);
  const roleLabel = getNetureRoleLabel(user.roles);
  const hasDashboard = dashboardPath !== '/';
  // 역할 판정은 Neture 기존 SSOT(role-constants)만 사용한다 — 인라인 문자열 비교 제거.
  const isSupplier = user.roles.some((r: string) => SUPPLIER_ONLY_ROLES.includes(r));

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <MyPageLayout
      title="마이페이지"
      breadcrumb={[{ label: '홈', href: '/' }, { label: '마이페이지' }]}
      width="wide"
      navItems={getNetureMyPageNavItems(user.roles)}
      userSummary={
        /* 공통 요약 카드 — 서비스 색은 배지 포인트 컬러로만 유지한다. */
        <MyPageUserSummary
          initial="👤"
          name={user.name}
          email={user.email}
          actionHref="/mypage/profile"
          badges={
            <div className="flex items-center gap-2 flex-wrap">
              <RoleBadgeGroup
                badges={[
                  { key: 'role', label: roleLabel, tone: 'primary', variant: 'solid' },
                  /**
                   * WO-O4O-CROSS-SERVICE-MYPAGE-FINAL-AUDIT-AND-CLOSURE-V1:
                   *   공급자 계정은 roleLabel 자체가 '공급자' 라 같은 배지가 두 번 찍혔다.
                   *   보조 배지는 roleLabel 이 '공급자' 가 아닐 때만 덧붙인다.
                   */
                  ...(isSupplier && roleLabel !== '공급자'
                    ? [{ key: 'supplier', label: '공급자', tone: 'slate' as const, variant: 'soft' as const }]
                    : []),
                ]}
                size="md"
              />
              {/* 서비스 가입 상태 — service_memberships.status 축
                  (WO-O4O-CROSS-SERVICE-MYPAGE-MEMBERSHIP-ROLE-STATUS-COMMONIZATION-V1) */}
              <MembershipStatusBadge status={getServiceMembershipStatus(user)} size="md" />
            </div>
          }
        />
      }
    >

      {/* 최근 활동 — 공통 MyPageActivityFeed
          (WO-O4O-CROSS-SERVICE-MYPAGE-HOME-HUB-COMMONIZATION-V1 §8)
          Neture 는 아직 개인 활동 원장 소비 계약이 없어 빈 목록을 넘긴다.
          활동 API 신설은 이번 범위 밖(WO §12·§13)이며, 계약이 생기면
          items 만 채우면 된다 — 화면 골격은 더 손대지 않는다. */}
      <MyPageActivityFeed items={[]} />

      {/* 하단 바로가기 (WO-O4O-MYPAGE-HUB-CARD-CANONICAL-ALIGNMENT-V1) — 공통 MyPageEntryCardGrid */}
      <MyPageEntryCardGrid
        items={[
          { key: 'profile', title: '프로필', href: '/mypage/profile', icon: <UserCog className="w-5 h-5" /> },
          { key: 'forum', title: '포럼', href: '/forum', icon: <MessageSquare className="w-5 h-5" /> },
          {
            key: 'business-profile',
            title: '사업자 정보',
            href: '/mypage/business-profile',
            icon: <Building2 className="w-5 h-5" />,
            visible: isSupplier,
          },
          { key: 'settings', title: '설정', href: '/mypage/settings', icon: <Settings className="w-5 h-5" /> },
        ]}
      />

      {/* 대시보드 바로가기 + 로그아웃 */}
      <QuickActionsSection
        dashboardPath={dashboardPath}
        dashboardLabel={`${roleLabel} 대시보드`}
        showDashboard={hasDashboard}
        onLogout={handleLogout}
      />
    </MyPageLayout>
  );
}

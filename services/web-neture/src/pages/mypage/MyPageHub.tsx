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
  MyPageEmptyState,
  MyPageAuthRequired,
  MyPageUserSummary,
  MyPageEntryCardGrid,
} from '@o4o/account-ui';
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
            <RoleBadgeGroup
              badges={[
                { key: 'role', label: roleLabel, tone: 'primary', variant: 'solid' },
                ...(isSupplier
                  ? [{ key: 'supplier', label: '공급자', tone: 'slate' as const, variant: 'soft' as const }]
                  : []),
              ]}
              size="md"
            />
          }
        />
      }
    >

      {/* 최근 활동 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">최근 활동</h3>
        <MyPageEmptyState description="최근 활동이 없습니다." />
      </div>

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

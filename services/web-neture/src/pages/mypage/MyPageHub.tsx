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

import { Link, useNavigate } from 'react-router-dom';
import { User, UserCog, MessageSquare, Building2, Settings } from 'lucide-react';
import { useAuth, getNetureDashboardRoute, getNetureRoleLabel } from '../../contexts';
import { useLoginModal } from '../../contexts/LoginModalContext';
import { MyPageLayout, QuickActionsSection, RoleBadgeGroup, MyPageHubCard, MyPageEmptyState } from '@o4o/account-ui';

export default function MyPageHub() {
  const { user, isAuthenticated, logout } = useAuth();
  const { openLoginModal } = useLoginModal();
  const navigate = useNavigate();

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center max-w-sm w-full">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">로그인이 필요합니다</h1>
          <p className="text-sm text-gray-500 mb-6">마이페이지를 이용하려면 로그인해주세요.</p>
          <button
            onClick={() => openLoginModal('/mypage')}
            className="w-full py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            로그인
          </button>
        </div>
      </div>
    );
  }

  const dashboardPath = getNetureDashboardRoute(user.roles);
  const roleLabel = getNetureRoleLabel(user.roles);
  const hasDashboard = dashboardPath !== '/';
  const isSupplier = user.roles.some(
    (r: string) => r === 'neture:supplier' || r === 'supplier',
  );

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <MyPageLayout
      title="마이페이지"
      breadcrumb={[{ label: '홈', href: '/' }, { label: '마이페이지' }]}
      width="wide"
    >
      {/* 프로필 요약 카드 — KPA-Society 정렬 (서비스 색은 배지 포인트 컬러로만 유지, 아바타는 중립 회색) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-4xl">
            👤
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900 truncate">{user.name}</h2>
            <p className="text-sm text-gray-500 mt-1 truncate">{user.email}</p>
            <div className="mt-2">
              <RoleBadgeGroup
                badges={[
                  { key: 'role', label: roleLabel, tone: 'primary', variant: 'solid' },
                  ...(isSupplier
                    ? [{ key: 'supplier', label: '공급자', tone: 'slate' as const, variant: 'soft' as const }]
                    : []),
                ]}
                size="md"
              />
            </div>
          </div>
          <Link
            to="/mypage/profile"
            className="flex-shrink-0 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
          >
            프로필 수정
          </Link>
        </div>
      </div>

      {/* 최근 활동 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">최근 활동</h3>
        <MyPageEmptyState description="최근 활동이 없습니다." />
      </div>

      {/* 하단 바로가기 (WO-O4O-MYPAGE-HUB-CARD-CANONICAL-ALIGNMENT-V1) */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <MyPageHubCard
          title="프로필"
          href="/mypage/profile"
          icon={<UserCog className="w-5 h-5" />}
        />
        <MyPageHubCard
          title="포럼"
          href="/forum"
          icon={<MessageSquare className="w-5 h-5" />}
        />
        {isSupplier && (
          <MyPageHubCard
            title="사업자 정보"
            href="/mypage/business-profile"
            icon={<Building2 className="w-5 h-5" />}
          />
        )}
        <MyPageHubCard
          title="설정"
          href="/mypage/settings"
          icon={<Settings className="w-5 h-5" />}
        />
      </div>

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

/**
 * MyPageHub - 마이페이지 (계정 중심 허브)
 *
 * WO-O4O-NETURE-MYPAGE-SPLIT-V1
 * WO-MYPAGE-IA-RESTRUCTURE-V1
 * WO-O4O-NETURE-MYPAGE-KPA-CANONICAL-REALIGNMENT-V1
 *
 * O4O 기본 MyPage 구조(KPA-Society 기준)에 맞게 정렬.
 * 공급자 업무 메뉴(상품/주문/정산 등)는 /supplier 대시보드에서 접근.
 * 마이페이지는 개인 프로필·사업자 정보·설정 등 계정 중심 항목만 유지.
 */

import { useNavigate } from 'react-router-dom';
import {
  User,
  UserCog,
  Settings,
  ChevronRight,
  Building2,
  MessageSquare,
} from 'lucide-react';
import { useAuth, getNetureDashboardRoute, getNetureRoleLabel } from '../../contexts';
import { useLoginModal } from '../../contexts/LoginModalContext';
import { MyPageLayout, QuickActionsSection } from '@o4o/account-ui';
import { Link } from 'react-router-dom';

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

  const handleLogout = async () => {
    await logout();
    navigate('/workspace');
  };

  return (
    <MyPageLayout
      title="마이페이지"
      subtitle="내 계정을 관리합니다"
    >
      {/* Compact Greeting Bar */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <span className="text-base font-bold text-primary-700">
                {user.name?.charAt(0) || '?'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user.name}님, 안녕하세요
              </p>
              <span className="inline-block mt-0.5 px-2 py-0.5 bg-primary-50 text-primary-700 rounded text-xs font-medium">
                {roleLabel}
              </span>
            </div>
          </div>
          <Link
            to="/mypage/profile"
            className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium whitespace-nowrap flex-shrink-0"
          >
            프로필 보기
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Navigation Cards — 계정 중심 항목만 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <Link
          to="/mypage/profile"
          className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm hover:bg-gray-50 transition-colors"
        >
          <UserCog className="w-5 h-5 text-primary-500" />
          <span className="text-sm font-medium text-gray-700 flex-1">프로필 편집</span>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </Link>
        {/* WO-O4O-SUPPLIER-MYPAGE-CANONICAL-PROFILE-ALIGNMENT-V1 */}
        {isSupplier && (
          <Link
            to="/mypage/business-profile"
            className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm hover:bg-gray-50 transition-colors"
          >
            <Building2 className="w-5 h-5 text-primary-500" />
            <span className="text-sm font-medium text-gray-700 flex-1">사업자 정보</span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </Link>
        )}
        <Link
          to="/forum"
          className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm hover:bg-gray-50 transition-colors"
        >
          <MessageSquare className="w-5 h-5 text-primary-500" />
          <span className="text-sm font-medium text-gray-700 flex-1">포럼</span>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </Link>
        <Link
          to="/mypage/settings"
          className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm hover:bg-gray-50 transition-colors"
        >
          <Settings className="w-5 h-5 text-primary-500" />
          <span className="text-sm font-medium text-gray-700 flex-1">설정</span>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </Link>
      </div>

      {/* Dashboard shortcut + Logout */}
      <QuickActionsSection
        dashboardPath={dashboardPath}
        dashboardLabel={`${roleLabel} 대시보드`}
        showDashboard={hasDashboard}
        onLogout={handleLogout}
      />
    </MyPageLayout>
  );
}

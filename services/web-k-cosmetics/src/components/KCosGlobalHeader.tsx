/**
 * KCosGlobalHeader — K-Cosmetics 서비스의 GlobalHeader 브릿지
 *
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1
 *
 * 역할:
 *   - K-Cosmetics AuthContext → GlobalHeader props 변환
 *   - 역할 기반 메뉴 필터링
 *   - K-Cosmetics 브랜드 정보 주입
 *   - ServiceSwitcher 연결
 *   - 사용자 드롭다운 메뉴 구성
 */

import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, UserCircle, Settings, GraduationCap, Shield } from 'lucide-react';
import { GlobalHeader, GlobalHeaderMenuItem } from '@o4o/ui';
import { isStoreOwnerDual } from '@o4o/auth-utils';
import { useAuth, getKCosmeticsDashboardRoute } from '@/contexts/AuthContext';
import { useLoginModal } from '@/contexts/LoginModalContext';
import {
  KCOS_PUBLIC_NAV,
  KCOS_CONTEXTUAL_NAV,
  filterContextualNav,
} from '@/config/navigation';
// ─── Helpers ─────────────────────────────────────────────────────────────────

function getUserDisplayName(user: any): string {
  if (!user) return '사용자';
  if (user.displayName) return user.displayName;
  if (user.lastName || user.firstName) {
    const full = `${user.lastName || ''}${user.firstName || ''}`.trim();
    if (full) return full;
  }
  if (user.name && user.name !== user.email) return user.name;
  if (user.email) return user.email.split('@')[0];
  return '사용자';
}

// ─── Component ───────────────────────────────────────────────────────────────

export function KCosGlobalHeader() {
  const { user, isAuthenticated, logout } = useAuth();
  const { openLoginModal } = useLoginModal();
  const navigate = useNavigate();

  const isAdmin = isAuthenticated && user?.roles?.some(
    (r: string) => r === 'k-cosmetics:admin' || r === 'platform:super_admin',
  );
  const isOperator = isAuthenticated && user?.roles?.some(
    (r: string) => r === 'k-cosmetics:operator' || r === 'k-cosmetics:admin' || r === 'platform:super_admin',
  );
  // WO-KCOS-LMS-INSTRUCTOR-BOOTSTRAP-V1: lms:instructor 또는 admin 진입 허용
  const isInstructor = isAuthenticated && user?.roles?.some(
    (r: string) => r === 'lms:instructor',
  );
  const showInstructor = isInstructor || isAdmin;

  // WO-O4O-AUTH-UTILS-STORE-OWNER-DUAL-V1: cosmetics:store_owner 부분 helper 적용
  // isStoreManager = 매장 경영자 OR 관리/운영 역할 (광의)
  const isStoreManager = isAuthenticated && (
    isStoreOwnerDual(user?.roles ?? [], 'cosmetics:store_owner') ||
    user?.roles?.some(
      (r: string) =>
        r === 'cosmetics:operator' ||
        r === 'cosmetics:admin' ||
        r === 'k-cosmetics:admin' ||
        r === 'platform:admin' ||
        r === 'platform:super_admin',
    )
  );

  // WO-O4O-COMMON-MENU-VISIBILITY-POLICY-IMPL-V1: operator/admin은 모든 메뉴를 본다
  // WO-KCOS-HEADER-ROLE-NAV-FIX-V1: storeManager는 역할 기반 판정 (cosmetics:store_owner 이상)
  const contextualNav = filterContextualNav(KCOS_CONTEXTUAL_NAV, {
    isAdminOrOperator: !!(isAdmin || isOperator),
    isStoreManager: !!isStoreManager,
  });

  // WO-O4O-KCOS-MENU-CANONICAL-ALIGN-V1: 비로그인 시 Contact 헤더 노출
  const publicNav = isAuthenticated
    ? KCOS_PUBLIC_NAV
    : [...KCOS_PUBLIC_NAV, { label: 'Contact', href: '/contact' }];

  const headerUser = user
    ? { displayName: getUserDisplayName(user), email: user.email }
    : null;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const dashboardPath = user?.roles ? getKCosmeticsDashboardRoute(user.roles) : '/';

  return (
    <GlobalHeader
      brand={{
        icon: '💄',
        name: 'K-Cosmetics',
        subtitle: 'K-Beauty 전문 플랫폼',
        primaryColor: '#db2777',
      }}
      publicNav={publicNav}
      contextualNav={contextualNav}
      user={headerUser}
      onLogin={openLoginModal}
      onRegister={() => navigate('/register')}
      onLogout={handleLogout}
      utilitySlot={undefined}
      userMenuItems={
        <>
          {/* 강의 대시보드 — 최상단 (WO-KCOS-LMS-INSTRUCTOR-BOOTSTRAP-V1) */}
          {showInstructor && (
            <GlobalHeaderMenuItem to="/instructor" icon={<GraduationCap className="w-4 h-4" />}>
              강의 대시보드
            </GlobalHeaderMenuItem>
          )}
          {/* WO-O4O-OPERATOR-MENU-COMMONIZATION-V1: 운영자 이상은 전용 라벨 표시 */}
          {isOperator ? (
            <GlobalHeaderMenuItem to={dashboardPath} icon={<Shield className="w-4 h-4" />}>
              운영 대시보드
            </GlobalHeaderMenuItem>
          ) : (
            <GlobalHeaderMenuItem to={dashboardPath} icon={<LayoutDashboard className="w-4 h-4" />}>
              대시보드
            </GlobalHeaderMenuItem>
          )}
          <GlobalHeaderMenuItem to="/mypage" icon={<UserCircle className="w-4 h-4" />}>
            마이페이지
          </GlobalHeaderMenuItem>
          <GlobalHeaderMenuItem to="/mypage/settings" icon={<Settings className="w-4 h-4" />}>
            설정
          </GlobalHeaderMenuItem>
        </>
      }
    />
  );
}

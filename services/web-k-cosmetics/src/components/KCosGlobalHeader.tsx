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
import { LayoutDashboard, UserCircle, Settings, Shield } from 'lucide-react';
import { GlobalHeader, GlobalHeaderMenuItem } from '@o4o/ui';
import { useAuth, getKCosmeticsDashboardRoute } from '@/contexts/AuthContext';
import { useLoginModal } from '@/contexts/LoginModalContext';
import {
  KCOS_PUBLIC_NAV,
  KCOS_CONTEXTUAL_NAV,
  filterContextualNav,
} from '@/config/navigation';
import ServiceSwitcher from './ServiceSwitcher';

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
  const isPartner = isAuthenticated && user?.roles?.some(
    (r: string) => r === 'k-cosmetics:partner',
  );

  const contextualNav = filterContextualNav(KCOS_CONTEXTUAL_NAV, {
    isAdmin: !!isAdmin,
    isOperator: !!isOperator,
    isStoreManager: !!isAuthenticated,
    isPartner: !!isPartner,
  });

  const headerUser = user
    ? { displayName: getUserDisplayName(user), email: user.email }
    : null;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const dashboardPath = user?.roles ? getKCosmeticsDashboardRoute(user.roles) : '/';
  const operatorPath = isAdmin ? '/admin' : '/operator';
  const operatorLabel = isAdmin ? '관리자 콘솔' : '운영 대시보드';

  return (
    <GlobalHeader
      brand={{
        icon: '💄',
        name: 'K-Cosmetics',
        subtitle: 'K-Beauty 전문 플랫폼',
        primaryColor: '#db2777',
      }}
      publicNav={KCOS_PUBLIC_NAV}
      contextualNav={contextualNav}
      user={headerUser}
      onLogin={openLoginModal}
      onRegister={() => navigate('/register')}
      onLogout={handleLogout}
      utilitySlot={<ServiceSwitcher currentServiceKey="k-cosmetics" />}
      userMenuItems={
        <>
          <GlobalHeaderMenuItem to={dashboardPath} icon={<LayoutDashboard className="w-4 h-4" />}>
            대시보드
          </GlobalHeaderMenuItem>
          <GlobalHeaderMenuItem to="/mypage" icon={<UserCircle className="w-4 h-4" />}>
            마이페이지
          </GlobalHeaderMenuItem>
          <GlobalHeaderMenuItem to="/mypage/settings" icon={<Settings className="w-4 h-4" />}>
            설정
          </GlobalHeaderMenuItem>
          {(isAdmin || isOperator) && (
            <GlobalHeaderMenuItem to={operatorPath} icon={<Shield className="w-4 h-4" />}>
              {operatorLabel}
            </GlobalHeaderMenuItem>
          )}
        </>
      }
    />
  );
}

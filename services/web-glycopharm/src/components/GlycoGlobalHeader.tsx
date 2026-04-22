/**
 * GlycoGlobalHeader — GlycoPharm 서비스의 GlobalHeader 브릿지
 *
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1
 *
 * 역할:
 *   - GlycoPharm AuthContext → GlobalHeader props 변환
 *   - 역할 기반 메뉴 필터링
 *   - GlycoPharm 브랜드 정보 주입
 *   - ServiceSwitcher 연결
 *   - 사용자 드롭다운 메뉴 구성
 */

import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, UserCircle, Settings, Shield } from 'lucide-react';
import { GlobalHeader, GlobalHeaderMenuItem } from '@o4o/ui';
import { useAuth } from '@/contexts/AuthContext';
import { isPharmacistRole } from '@/lib/role-constants';
import { useLoginModal } from '@/contexts/LoginModalContext';
import {
  GLYCO_PUBLIC_NAV,
  GLYCO_CONTEXTUAL_NAV,
  filterContextualNav,
} from '@/config/navigation';
import ServiceSwitcher from './ServiceSwitcher';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * WO-O4O-NAME-NORMALIZATION-V1: 사용자 표시 이름
 * 우선순위: displayName > lastName+firstName > name > email prefix > '사용자'
 */
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

export function GlycoGlobalHeader() {
  const { user, isAuthenticated, logout } = useAuth();
  const { openLoginModal } = useLoginModal();
  const navigate = useNavigate();

  // 역할 판정
  const isAdmin = isAuthenticated && user?.roles?.some(
    (r: string) => r === 'glycopharm:admin' || r === 'platform:super_admin',
  );
  const isOperator = isAuthenticated && user?.roles?.some(
    (r: string) => r === 'glycopharm:operator' || r === 'glycopharm:admin' || r === 'platform:super_admin',
  );
  const isPharmacy = isAuthenticated && user?.roles?.some((r: string) => isPharmacistRole(r));

  // contextualNav 필터링
  const contextualNav = filterContextualNav(GLYCO_CONTEXTUAL_NAV, {
    isAdmin: !!isAdmin,
    isOperator: !!isOperator,
    isStoreOwner: !!isPharmacy,
    isPharmacyRelated: !!isPharmacy,
  });

  // User 정보 변환
  const headerUser = user
    ? {
        displayName: getUserDisplayName(user),
        email: user.email,
      }
    : null;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // 운영/관리 진입 경로
  const operatorPath = isAdmin ? '/admin' : '/operator';
  const operatorLabel = isAdmin ? '관리자 콘솔' : '운영 대시보드';

  return (
    <GlobalHeader
      brand={{
        icon: '💉',
        name: 'GlycoPharm',
        subtitle: '혈당관리 전문 플랫폼',
        primaryColor: '#059669',
      }}
      publicNav={GLYCO_PUBLIC_NAV}
      contextualNav={contextualNav}
      user={headerUser}
      onLogin={openLoginModal}
      onRegister={() => navigate('/register')}
      onLogout={handleLogout}
      utilitySlot={<ServiceSwitcher currentServiceKey="glycopharm" />}
      userMenuItems={
        <>
          <GlobalHeaderMenuItem to="/mypage" icon={<LayoutDashboard className="w-4 h-4" />}>
            마이페이지
          </GlobalHeaderMenuItem>
          <GlobalHeaderMenuItem to="/mypage/profile" icon={<UserCircle className="w-4 h-4" />}>
            프로필
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

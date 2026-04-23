/**
 * NetureGlobalHeader — Neture 서비스의 GlobalHeader 브릿지
 *
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1
 *
 * 역할:
 *   - Neture AuthContext → GlobalHeader props 변환
 *   - 역할 기반 메뉴 필터링
 *   - Neture 브랜드 정보 주입
 *   - ServiceSwitcher 연결
 *   - 사용자 드롭다운 메뉴 구성
 */

import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Settings } from 'lucide-react';
import { GlobalHeader, GlobalHeaderMenuItem } from '@o4o/ui';
import { useAuth } from '../contexts/AuthContext';
import { useLoginModal } from '../contexts/LoginModalContext';
import {
  NETURE_PUBLIC_NAV,
  NETURE_CONTEXTUAL_NAV,
  filterContextualNav,
} from '../config/navigation';
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

export function NetureGlobalHeader() {
  const { user, isAuthenticated, logout } = useAuth();
  const { openLoginModal, openRegisterModal } = useLoginModal();
  const navigate = useNavigate();

  const isAdmin = isAuthenticated && user?.roles?.some(
    (r: string) => r === 'neture:admin' || r === 'platform:super_admin',
  );
  const isOperator = isAuthenticated && user?.roles?.some(
    (r: string) => r === 'neture:operator' || r === 'neture:admin' || r === 'platform:super_admin',
  );
  const isSupplier = isAuthenticated && user?.roles?.some(
    (r: string) => r === 'neture:supplier' || r === 'supplier',
  );
  const isPartner = isAuthenticated && user?.roles?.some(
    (r: string) => r === 'neture:partner' || r === 'partner',
  );

  const contextualNav = filterContextualNav(NETURE_CONTEXTUAL_NAV, {
    isAdmin: !!isAdmin,
    isOperator: !!isOperator,
    isSupplier: !!isSupplier,
    isPartner: !!isPartner,
  });

  const headerUser = user
    ? { displayName: getUserDisplayName(user), email: user.email }
    : null;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <GlobalHeader
      brand={{
        icon: '🌿',
        name: 'Neture',
        subtitle: '공급자·파트너 협업 플랫폼',
        primaryColor: '#059669',
      }}
      publicNav={NETURE_PUBLIC_NAV}
      contextualNav={contextualNav}
      user={headerUser}
      onLogin={openLoginModal}
      onRegister={openRegisterModal}
      onLogout={handleLogout}
      utilitySlot={<ServiceSwitcher currentServiceKey="neture" />}
      userMenuItems={
        <>
          <GlobalHeaderMenuItem to="/mypage" icon={<LayoutDashboard className="w-4 h-4" />}>
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

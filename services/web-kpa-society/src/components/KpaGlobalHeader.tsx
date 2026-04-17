/**
 * KpaGlobalHeader — KPA Society 서비스의 GlobalHeader 브릿지
 *
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1
 *
 * 역할:
 *   - KPA AuthContext → GlobalHeader props 변환
 *   - 역할 기반 메뉴 필터링
 *   - KPA 브랜드 정보 주입
 *   - ServiceSwitcher 연결
 *   - 사용자 드롭다운 메뉴 구성
 */

import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, UserCircle, Settings, Shield } from 'lucide-react';
import { GlobalHeader, GlobalHeaderMenuItem } from '@o4o/ui';
import { useAuth, type User as UserType } from '../contexts';
import { useAuthModal } from '../contexts/LoginModalContext';
import {
  KPA_PUBLIC_NAV,
  KPA_CONTEXTUAL_NAV,
  filterContextualNav,
} from '../config/navigation';
import ServiceSwitcher from './ServiceSwitcher';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * WO-O4O-NAME-NORMALIZATION-V1: 사용자 표시 이름
 * 우선순위: displayName > lastName+firstName > name > email prefix > '사용자'
 */
function getUserDisplayName(user: UserType | null): string {
  if (!user) return '사용자';
  const ext = user as any;
  if (ext.displayName) return ext.displayName;
  if (ext.lastName || ext.firstName) {
    const full = `${ext.lastName || ''}${ext.firstName || ''}`.trim();
    if (full) return full;
  }
  if (user.name && user.name !== user.email) return user.name;
  if (user.email) return user.email.split('@')[0];
  return '사용자';
}

// ─── Component ───────────────────────────────────────────────────────────────

export function KpaGlobalHeader() {
  const { user, logout } = useAuth();
  const { openLoginModal, openRegisterModal } = useAuthModal();
  const navigate = useNavigate();

  // 역할 판정
  const isAdmin = user ? user.roles.includes('kpa:admin') : false;
  const isOperator = user ? user.roles.includes('kpa:operator') : false;
  const isStoreOwner = user?.isStoreOwner === true;
  const isPharmacyRelated = isStoreOwner || (user as any)?.activityType === 'pharmacy_owner';

  // contextualNav 필터링
  const contextualNav = filterContextualNav(KPA_CONTEXTUAL_NAV, {
    isAdmin,
    isOperator,
    isStoreOwner,
    isPharmacyRelated,
  });

  // User 정보 변환
  const headerUser = user
    ? {
        displayName: getUserDisplayName(user),
        email: user.email,
      }
    : null;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // 운영/관리 진입 경로
  const operatorPath = isAdmin ? '/admin' : '/operator';
  const operatorLabel = isAdmin ? '관리자 콘솔' : '운영 대시보드';

  return (
    <GlobalHeader
      brand={{
        icon: '💊',
        name: 'KPA-Society',
        subtitle: '약사 전문 플랫폼',
        primaryColor: '#2563eb',
      }}
      publicNav={KPA_PUBLIC_NAV}
      contextualNav={contextualNav}
      user={headerUser}
      onLogin={openLoginModal}
      onRegister={openRegisterModal}
      onLogout={handleLogout}
      utilitySlot={<ServiceSwitcher currentServiceKey="kpa-society" />}
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

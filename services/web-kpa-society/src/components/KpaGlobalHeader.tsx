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

import { useNavigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { LayoutDashboard, Settings, Shield } from 'lucide-react';
import { GlobalHeader, GlobalHeaderMenuItem } from '@o4o/ui';
import { useAuth, type User as UserType } from '../contexts';
import { useAuthModal } from '../contexts/LoginModalContext';
import {
  KPA_PUBLIC_NAV,
  KPA_CONTEXTUAL_NAV,
  filterContextualNav,
} from '../config/navigation';
import ServiceSwitcher from './ServiceSwitcher';
import { creditApi } from '../api/credit';

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
  const [creditBalance, setCreditBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!user) { setCreditBalance(null); return; }
    creditApi.getMyBalance()
      .then((res: any) => {
        const bal = res?.data?.data?.balance ?? res?.data?.balance ?? null;
        if (typeof bal === 'number') setCreditBalance(bal);
      })
      .catch(() => { /* 실패 시 뱃지 숨김 */ });
  }, [user]);

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
      utilitySlot={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {user && creditBalance !== null && (
            <Link
              to="/mypage/credits"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: 999,
                background: '#fef9c3', color: '#854d0e',
                fontSize: 13, fontWeight: 600, textDecoration: 'none',
                border: '1px solid #fde047',
              }}
              title="크레딧 잔액 — 클릭하면 이력을 확인할 수 있습니다"
            >
              ⭐ {creditBalance.toLocaleString()} C
            </Link>
          )}
          <ServiceSwitcher currentServiceKey="kpa-society" />
        </div>
      }
      userMenuItems={
        <>
          {(isOperator || isAdmin) && (
            <GlobalHeaderMenuItem to="/operator" icon={<Shield className="w-4 h-4" />}>
              운영 대시보드
            </GlobalHeaderMenuItem>
          )}
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

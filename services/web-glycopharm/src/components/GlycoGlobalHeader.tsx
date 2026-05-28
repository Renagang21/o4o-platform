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
import { GraduationCap, LayoutDashboard, Settings, Shield } from 'lucide-react';
import { GlobalHeader, GlobalHeaderMenuItem } from '@o4o/ui';
import { isStoreOwnerDual } from '@o4o/auth-utils';
import { useAuth } from '@/contexts/AuthContext';
import { isPharmacistRole } from '@/lib/role-constants';
import { useLoginModal } from '@/contexts/LoginModalContext';
// WO-O4O-GLYCOPHARM-REGISTER-MODAL-ENTRY-FIX-V1
import { useRegisterModal } from '@/contexts/RegisterModalContext';
import {
  GLYCO_PUBLIC_NAV,
  GLYCO_CONTEXTUAL_NAV,
  filterContextualNav,
} from '@/config/navigation';
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
  const { openRegisterModal } = useRegisterModal();
  const navigate = useNavigate();

  // 역할 판정
  const isAdmin = isAuthenticated && user?.roles?.some(
    (r: string) => r === 'glycopharm:admin' || r === 'platform:super_admin',
  );
  const isOperator = isAuthenticated && user?.roles?.some(
    (r: string) => r === 'glycopharm:operator' || r === 'glycopharm:admin' || r === 'platform:super_admin',
  );
  // WO-O4O-INSTRUCTOR-ENTRY-FIX-V3
  const isInstructor = isAuthenticated && user?.roles?.some(
    (r: string) => r === 'lms:instructor',
  );
  const isPharmacy = isAuthenticated && user?.roles?.some((r: string) => isPharmacistRole(r));
  // WO-O4O-AUTH-UTILS-STORE-OWNER-DUAL-V1: glycopharm:store_owner 명시적 체크 추가
  // pharmacist(기존) OR store_owner(신규) 둘 다 매장 접근 가능
  const isStoreOwner = isAuthenticated && (
    !!isPharmacy || isStoreOwnerDual(user?.roles ?? [], 'glycopharm:store_owner')
  );

  // contextualNav 필터링
  // WO-O4O-COMMON-MENU-VISIBILITY-POLICY-IMPL-V1: operator/admin은 모든 메뉴를 본다
  const contextualNav = filterContextualNav(GLYCO_CONTEXTUAL_NAV, {
    isAdminOrOperator: !!(isAdmin || isOperator),
    isStoreOwner: !!isStoreOwner,
    isPharmacyRelated: !!isStoreOwner,
  });

  // WO-O4O-GLYCOPHARM-MENU-CANONICAL-ALIGN-V1: 비로그인 시 Contact 헤더 노출
  const publicNav = isAuthenticated
    ? GLYCO_PUBLIC_NAV
    : [...GLYCO_PUBLIC_NAV, { label: 'Contact', href: '/contact' }];

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

  return (
    <GlobalHeader
      brand={{
        icon: '💉',
        name: 'GlycoPharm',
        subtitle: '혈당관리 전문 플랫폼',
        primaryColor: '#059669',
      }}
      publicNav={publicNav}
      contextualNav={contextualNav}
      user={headerUser}
      onLogin={openLoginModal}
      onRegister={openRegisterModal}
      onLogout={handleLogout}
      utilitySlot={undefined}
      userMenuItems={
        <>
          {(isInstructor || isAdmin) && (
            <GlobalHeaderMenuItem to="/instructor" icon={<GraduationCap className="w-4 h-4" />}>
              강의 대시보드
            </GlobalHeaderMenuItem>
          )}
          {isAdmin && (
            <GlobalHeaderMenuItem to="/admin" icon={<Shield className="w-4 h-4" />}>
              관리 대시보드
            </GlobalHeaderMenuItem>
          )}
          {isOperator && (
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

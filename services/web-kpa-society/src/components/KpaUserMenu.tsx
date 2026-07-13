/**
 * KpaUserMenu — KPA 사용자 프로필 메뉴 SSOT
 *
 * WO-O4O-KPA-MOBILE-NAV-AND-PROFILE-MENU-SEPARATION-V1
 *
 * 역할별 대시보드 진입점 + 계정 메뉴(마이페이지/설정)를 단일 소스로 제공한다.
 * 데스크톱 프로필 드롭다운(KpaGlobalHeader.userMenuItems)과 모바일 프로필 시트
 * (MobileBottomNav '내정보')가 동일 데이터를 재사용하도록 하기 위한 공용 컴포넌트.
 *
 * 역할 판정은 기존 SSOT(@o4o/auth-utils + lms:instructor)만 사용 — 새 권한 로직 없음.
 */

import { GraduationCap, LayoutDashboard, Settings, Shield, Store } from 'lucide-react';
import { GlobalHeaderMenuItem } from '@o4o/ui';
import { isOperatorOrAbove, isAdminOrAbove, isStoreOwnerDual } from '@o4o/auth-utils';
import type { User as UserType } from '../contexts';

export interface KpaUserRoles {
  isInstructor: boolean;
  isAdmin: boolean;
  isOperator: boolean;
  isStoreOwner: boolean;
}

/** 기존 KpaGlobalHeader 와 동일한 역할 판정 SSOT */
export function useKpaUserRoles(user: UserType | null): KpaUserRoles {
  return {
    isInstructor: user ? user.roles.includes('lms:instructor') : false,
    isAdmin: user ? isAdminOrAbove(user.roles, 'kpa') : false,
    isOperator: user ? isOperatorOrAbove(user.roles, 'kpa') : false,
    isStoreOwner: isStoreOwnerDual(user?.roles ?? [], 'kpa:store_owner', user?.isStoreOwner),
  };
}

/** 사용자 표시 이름 — displayName > 성+이름 > name > email prefix > '사용자' */
export function getKpaUserDisplayName(user: UserType | null): string {
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

/**
 * 역할별 대시보드 + 계정 메뉴 항목 (로그아웃 제외 — 소비처가 각자 렌더).
 * WO-O4O-ROLE-BASED-PROFILE-MENU-CANONICALIZATION-V1 규칙 유지:
 *   강의 대시보드=lms:instructor / 관리자·운영은 역할별 독립 표시 / 내 매장=store_owner.
 */
export function KpaUserMenuItems({
  user,
  onItemClick,
}: {
  user: UserType | null;
  onItemClick?: () => void;
}) {
  const { isInstructor, isAdmin, isOperator, isStoreOwner } = useKpaUserRoles(user);
  return (
    <>
      {isInstructor && (
        <GlobalHeaderMenuItem to="/instructor" icon={<GraduationCap className="w-4 h-4" />} onClick={onItemClick}>
          강의 대시보드
        </GlobalHeaderMenuItem>
      )}
      {isAdmin && (
        <GlobalHeaderMenuItem to="/admin" icon={<Shield className="w-4 h-4" />} onClick={onItemClick}>
          관리자 대시보드
        </GlobalHeaderMenuItem>
      )}
      {isOperator && (
        <GlobalHeaderMenuItem to="/operator" icon={<Shield className="w-4 h-4" />} onClick={onItemClick}>
          운영 대시보드
        </GlobalHeaderMenuItem>
      )}
      {isStoreOwner && (
        <GlobalHeaderMenuItem to="/store" icon={<Store className="w-4 h-4" />} onClick={onItemClick}>
          내 매장
        </GlobalHeaderMenuItem>
      )}
      <GlobalHeaderMenuItem to="/mypage" icon={<LayoutDashboard className="w-4 h-4" />} onClick={onItemClick}>
        마이페이지
      </GlobalHeaderMenuItem>
      <GlobalHeaderMenuItem to="/mypage/settings" icon={<Settings className="w-4 h-4" />} onClick={onItemClick}>
        설정
      </GlobalHeaderMenuItem>
    </>
  );
}

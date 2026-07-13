/**
 * NetureUserMenu — Neture 사용자 프로필 메뉴 SSOT
 *
 * WO-O4O-NETURE-MOBILE-NAV-PROFILE-UTILITY-AND-WORKSPACE-ACCESS-STANDARDIZE-V1
 *
 * 역할별 업무 공간 진입점 + 계정 메뉴(마이페이지/설정)를 단일 소스로 제공한다.
 * 데스크톱 프로필 드롭다운(NetureGlobalHeader.userMenuItems)과 모바일 프로필 시트
 * (NetureBottomNav '내정보')가 동일 데이터·동일 역할 판정을 재사용한다.
 *
 * 역할 판정은 기존 role-constants SSOT 만 사용 — 새 권한 로직 없음.
 */

import { LayoutDashboard, Settings, Shield } from 'lucide-react';
import { GlobalHeaderMenuItem } from '@o4o/ui';
import {
  ADMIN_ROLES,
  OPERATOR_OR_ABOVE_ROLES,
  SUPPLIER_ONLY_ROLES,
  PARTNER_ONLY_ROLES,
} from '../lib/role-constants';

export interface NetureUserRoles {
  isAdmin: boolean;
  isOperator: boolean;
  isSupplier: boolean;
  isPartner: boolean;
}

/** 기존 NetureGlobalHeader 와 동일한 역할 판정 SSOT */
export function useNetureUserRoles(user: any, isAuthenticated: boolean): NetureUserRoles {
  const roles: string[] = (isAuthenticated && user?.roles) || [];
  const has = (set: string[]) => roles.some((r) => set.includes(r));
  return {
    isAdmin: has(ADMIN_ROLES),
    isOperator: has(OPERATOR_OR_ABOVE_ROLES),
    isSupplier: has(SUPPLIER_ONLY_ROLES),
    isPartner: has(PARTNER_ONLY_ROLES),
  };
}

/** 사용자 표시 이름 — displayName > 성+이름 > name > email prefix > '사용자' */
export function getNetureUserDisplayName(user: any): string {
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

/**
 * 역할별 업무 공간 + 계정 메뉴 항목 (로그아웃 제외 — 소비처가 각자 렌더).
 * 보유 역할만 표시. NetureGlobalHeader userMenuItems 와 동일 route·라벨.
 */
export function NetureUserMenuItems({
  user,
  isAuthenticated,
  onItemClick,
}: {
  user: any;
  isAuthenticated: boolean;
  onItemClick?: () => void;
}) {
  const { isAdmin, isOperator, isSupplier, isPartner } = useNetureUserRoles(user, isAuthenticated);
  return (
    <>
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
      {isSupplier && (
        <GlobalHeaderMenuItem to="/supplier/dashboard" icon={<LayoutDashboard className="w-4 h-4" />} onClick={onItemClick}>
          공급자 대시보드
        </GlobalHeaderMenuItem>
      )}
      {isPartner && (
        <GlobalHeaderMenuItem to="/partner/dashboard" icon={<LayoutDashboard className="w-4 h-4" />} onClick={onItemClick}>
          파트너 대시보드
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

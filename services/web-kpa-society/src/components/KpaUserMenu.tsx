/**
 * KpaUserMenu — 약국 협력사업 사이트 사용자 프로필 메뉴 SSOT
 *
 * WO-O4O-KPA-MOBILE-NAV-AND-PROFILE-MENU-SEPARATION-V1
 *
 * 데스크톱 프로필 드롭다운(KpaGlobalHeader)과 모바일 프로필 시트(MobileBottomNav '내정보')가
 * 동일 항목을 재사용하도록 하기 위한 공용 컴포넌트.
 *
 * WO-O4O-PHARMACY-BUSINESS-INDEPENDENCE-V1 D7 · D8:
 *   옛 KPA 관리자 · 운영 대시보드와 마이페이지는 삭제했다. 매장 소유 판정(/kpa/me-context)도 읽지 않으므로
 *   '내 매장' 은 로그인 사용자 모두에게 보이고, 접근 판정은 store.neture.co.kr handoff 목적지가 한다.
 */

import { Store } from 'lucide-react';
import { GlobalHeaderMenuItem } from '@o4o/ui';
import { getUserDisplayName } from '@o4o/account-ui';
import type { User as UserType } from '../contexts';

/**
 * 사용자 표시 이름 — displayName > 성+이름 > name > email prefix > '사용자'
 *
 * WO-O4O-SERVICE-USER-DISPLAY-NAME-COMMONIZATION-G1-V1:
 *   계산 본체는 `@o4o/account-ui` 의 `getUserDisplayName` 정본 하나뿐이다.
 */
export function getKpaUserDisplayName(user: UserType | null): string {
  return getUserDisplayName(user);
}

/** 플랫폼 최고 관리자만 역할을 명시한다. 사업별 역할은 사업 화면이 표시한다. */
export function getKpaServiceRoleLabel(user: UserType | null): string | undefined {
  return user?.roles?.includes('platform:super_admin') ? '플랫폼 최고 관리자 (platform:super_admin)' : undefined;
}

/** 프로필 메뉴 항목 (로그아웃 제외 — 소비처가 각자 렌더). */
export function KpaUserMenuItems({
  user,
  onItemClick,
}: {
  user: UserType | null;
  onItemClick?: () => void;
}) {
  if (!user) return null;
  return (
    <GlobalHeaderMenuItem to="/store" icon={<Store className="w-4 h-4" />} onClick={onItemClick}>
      내 매장
    </GlobalHeaderMenuItem>
  );
}

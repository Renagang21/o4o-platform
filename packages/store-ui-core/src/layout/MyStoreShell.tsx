/**
 * MyStoreShell — "내 매장" 화면 골격 공통 Shell
 * WO-O4O-MY-STORE-UNIFIED-SCREEN-ARCHITECTURE-AND-ADOPTION-V1 §6 / §12
 *
 * 문제:
 *   KPA / K-Cosmetics / GlycoPharm 이 App.tsx 안에서 동일한 골격 배선을
 *   각자 복사해 갖고 있었다 —
 *     `div.min-h-screen.flex.flex-col` + GlobalHeader + capability fetch +
 *     `resolveStoreMenu(SERVICE_CONFIG, caps)` + `StoreDashboardLayout hideTopBar`
 *     + `StoreFacingFooter`.
 *   서비스 차이는 실제로 **slot(header/footer/banner/below) + config** 뿐이었다.
 *
 * 계약:
 *   - 골격(외곽 div · header 배치 · capability 해석 · Layout 배선)은 여기 한 곳.
 *   - 서비스 차이는 props 로만 주입한다. Shell 안에 `if (serviceKey === ...)` 를 두지 않는다.
 *   - `hideTopBar` 는 별도 prop 이 아니라 `header` slot 주입 여부에서 파생한다
 *     (외부 GlobalHeader 를 쓰는 서비스 = TopBar 미표시).
 *   - `fetchCapabilities` 미주입 시 capability 호출을 하지 않고 config 를 그대로 쓴다
 *     (Pharmacy-Hub 등 capability 축을 쓰지 않는 서비스의 기존 동작 보존).
 *   - 나머지 표시 props 는 StoreDashboardLayout 계약을 그대로 위임한다(계약 확장 없음).
 */

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { StoreDashboardConfig } from '../config/storeMenuConfig';
import type { StoreNavItem } from '../components/StoreTopBar';
import { resolveStoreMenu } from '../config/menuCapabilityMap';
import { StoreDashboardLayout } from './StoreDashboardLayout';

/** capability 응답 최소 계약 — 서비스별 api client 를 공통 패키지가 알 필요는 없다. */
export interface StoreCapabilityFlag {
  key: string;
  enabled: boolean;
}

/**
 * useStoreCapabilities — 활성 capability key Set
 * WO-O4O-CAPABILITY-MENU-INTEGRATION-V1 의 서비스별 동일 hook 3개를 여기로 통합.
 * 실패/미주입 시 null → resolveStoreMenu 가 전체 메뉴 노출(graceful degradation).
 */
export function useStoreCapabilities(
  fetchCapabilities?: () => Promise<StoreCapabilityFlag[]>,
): Set<string> | null {
  const [enabledCaps, setEnabledCaps] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (!fetchCapabilities) return;
    let cancelled = false;
    fetchCapabilities()
      .then((caps) => {
        if (cancelled) return;
        setEnabledCaps(new Set(caps.filter((c) => c.enabled).map((c) => c.key)));
      })
      .catch(() => {
        if (cancelled) return;
        setEnabledCaps(null);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchCapabilities]);

  return enabledCaps;
}

export interface MyStoreShellProps {
  /** 서비스 메뉴 config (storeMenuConfig 의 서비스별 상수) */
  config: StoreDashboardConfig;
  /** capability 조회 함수 (미주입 시 capability 필터링 없음) */
  fetchCapabilities?: () => Promise<StoreCapabilityFlag[]>;
  /** 서비스 GlobalHeader slot — 주입 시 StoreTopBar 는 표시하지 않는다 */
  header?: ReactNode;
  /** 하단 footer slot (StoreFacingFooter 권장) */
  footer?: ReactNode;
  /** 본문 상단 배너 slot */
  banner?: ReactNode;
  /** Shell 바깥 하단 slot (mobile bottom nav 등) */
  below?: ReactNode;

  userName?: string;
  userInitial?: string;
  orgName?: string;
  homeLink?: string;
  onLogout?: () => void;
  navItems?: StoreNavItem[];
  serviceLabel?: string;
  serviceBadge?: string;
  topBarRight?: ReactNode;
}

export function MyStoreShell({
  config,
  fetchCapabilities,
  header,
  footer,
  banner,
  below,
  userName = '',
  userInitial,
  orgName,
  homeLink = '/',
  onLogout,
  navItems,
  serviceLabel,
  serviceBadge,
  topBarRight,
}: MyStoreShellProps) {
  const enabledCaps = useStoreCapabilities(fetchCapabilities);
  const resolvedConfig = resolveStoreMenu(config, enabledCaps);

  const layout = (
    <StoreDashboardLayout
      config={resolvedConfig}
      userName={userName}
      userInitial={userInitial}
      homeLink={homeLink}
      orgName={orgName}
      onLogout={onLogout}
      banner={banner}
      navItems={navItems}
      serviceLabel={serviceLabel}
      serviceBadge={serviceBadge}
      topBarRight={topBarRight}
      hideTopBar={Boolean(header)}
      footer={footer}
    />
  );

  // header/below slot 이 없으면 외곽 div 를 만들지 않는다 —
  // StoreDashboardLayout 자체가 `min-h-screen flex flex-col` 루트다(기존 DOM 보존).
  if (!header && !below) return layout;

  return (
    <div className="min-h-screen flex flex-col">
      {header}
      {layout}
      {below}
    </div>
  );
}

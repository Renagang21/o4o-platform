/**
 * HubSubNav — 약국 HUB 서브페이지 간 공유 내비게이션
 *
 * WO-KPA-PHARMACY-HUB-MENU-AND-ROUTING-REALIGNMENT-V1
 * WO-O4O-PHARMACY-HUB-LAYOUT-MOBILE-V1: mobile 가로 스크롤 + active 자동 노출
 * WO-O4O-RESPONSIVE-TABBAR-PRIMITIVE-V1: @o4o/ui ResponsiveTabBar 적용 (thin wrapper).
 *   pathname → activeKey 매핑은 기존 isActive(matchExact / startsWith) 로직을
 *   그대로 사용. 라우팅 / 메뉴 항목 / active 판단 동일.
 *
 * 약국 HUB 내부 6개 영역을 가로 탭 형태로 연결:
 *   HUB 마켓 | 콘텐츠 | 상품 카탈로그 | 사이니지 | 이벤트/특가 | 서비스
 *
 * 가드 처리는 라우트 레벨(App.tsx)에서 수행하므로 여기서는 링크만 제공.
 */

import { useLocation } from 'react-router-dom';
import { ResponsiveTabBar } from '@o4o/ui';

interface HubNavItem {
  label: string;
  path: string;
  /** pathname이 이 조건에 매칭되면 active */
  matchExact?: boolean;
}

const HUB_NAV_ITEMS: HubNavItem[] = [
  { label: 'HUB 마켓', path: '/store-hub', matchExact: true },
  { label: '콘텐츠', path: '/store-hub/content' },
  { label: '상품 카탈로그', path: '/store-hub/b2b' },
  { label: '사이니지', path: '/store-hub/signage' },
  { label: '이벤트/특가', path: '/store-hub/event-offers' },
  { label: '서비스', path: '/services/pharmacy' },
];

function isActive(pathname: string, item: HubNavItem): boolean {
  if (item.matchExact) return pathname === item.path;
  return pathname.startsWith(item.path);
}

export function HubSubNav() {
  const { pathname } = useLocation();

  // pathname 기반 active 판정 — 기존 isActive 로직 그대로 사용.
  // ResponsiveTabBar 의 activeKey 비교(equality)와 호환되도록 매칭된 path 를
  // activeKey 로 사용한다. 매칭 없으면 첫 항목 (fallback).
  const matched = HUB_NAV_ITEMS.find((item) => isActive(pathname, item));
  const activeKey = matched ? matched.path : HUB_NAV_ITEMS[0].path;

  const tabsForBar = HUB_NAV_ITEMS.map((item) => ({
    key: item.path,
    label: item.label,
    to: item.path,
  }));

  return (
    <ResponsiveTabBar
      tabs={tabsForBar}
      activeKey={activeKey}
      aria-label="약국 HUB 서브 내비게이션"
      style={styles.nav}
      tabStyle={styles.tab}
      activeTabStyle={styles.tabActive}
    />
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    gap: '4px',
    padding: '4px',
    backgroundColor: '#f1f5f9',
    borderRadius: '10px',
    marginBottom: '20px',
    // display / overflowX / WebkitOverflowScrolling 는 ResponsiveTabBar 가 강제.
  },
  tab: {
    padding: '10px 18px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#64748b',
    textDecoration: 'none',
    transition: 'all 0.15s ease',
    cursor: 'pointer',
    // flexShrink / whiteSpace 는 ResponsiveTabBar 가 강제.
  },
  tabActive: {
    backgroundColor: '#ffffff',
    color: '#1e40af',
    fontWeight: 600,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
};

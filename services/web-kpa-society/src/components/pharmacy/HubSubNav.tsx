/**
 * HubSubNav — 약국 HUB 서브페이지 간 공유 내비게이션
 *
 * WO-KPA-PHARMACY-HUB-MENU-AND-ROUTING-REALIGNMENT-V1
 * WO-O4O-PHARMACY-HUB-LAYOUT-MOBILE-V1:
 *   EducationTabs/EventsTabs 에서 검증한 canonical 탭 패턴 적용.
 *   - tab.flexShrink: 0 (좁은 폭에서 탭 압축 방지) — overflowX/whiteSpace 는 기존부터 적용됨
 *   - pathname 변경 시 active 탭 자동 center scrollIntoView
 *   라우팅 / 메뉴 항목 변경 없음.
 *
 * 약국 HUB 내부 6개 영역을 가로 탭 형태로 연결:
 *   HUB 마켓 | 콘텐츠 | 상품 카탈로그 | 사이니지 | 공동구매 | 서비스
 *
 * 현재 경로 기반 active 탭 하이라이트.
 * 가드 처리는 라우트 레벨(App.tsx)에서 수행하므로 여기서는 링크만 제공.
 */

import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';

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
  const navRef = useRef<HTMLElement>(null);

  // 좁은 viewport에서 active 탭이 가로 스크롤 영역 바깥에 가려지지 않도록 center 자동 노출.
  // pathname 변경 시에만 동작 — 사용자 인터랙션과 충돌 없음.
  useEffect(() => {
    const active = navRef.current?.querySelector(
      '[data-active="true"]',
    ) as HTMLElement | null;
    if (active && typeof active.scrollIntoView === 'function') {
      active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [pathname]);

  return (
    <nav ref={navRef} style={styles.nav}>
      {HUB_NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.path}
            to={item.path}
            data-active={active ? 'true' : 'false'}
            style={{
              ...styles.tab,
              ...(active ? styles.tabActive : {}),
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    display: 'flex',
    gap: '4px',
    padding: '4px',
    backgroundColor: '#f1f5f9',
    borderRadius: '10px',
    marginBottom: '20px',
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
  tab: {
    padding: '10px 18px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#64748b',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    // WO-O4O-PHARMACY-HUB-LAYOUT-MOBILE-V1: 좁은 폭에서 탭 압축 방지
    flexShrink: 0,
    transition: 'all 0.15s ease',
    cursor: 'pointer',
  },
  tabActive: {
    backgroundColor: '#ffffff',
    color: '#1e40af',
    fontWeight: 600,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
};

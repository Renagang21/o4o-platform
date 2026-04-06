/**
 * HubSubNav — 약국 HUB 서브페이지 간 공유 내비게이션
 *
 * WO-KPA-PHARMACY-HUB-MENU-AND-ROUTING-REALIGNMENT-V1
 *
 * 약국 HUB 내부 6개 영역을 가로 탭 형태로 연결:
 *   HUB 마켓 | 콘텐츠 | 상품 카탈로그 | 사이니지 | 공동구매 | 서비스
 *
 * 현재 경로 기반 active 탭 하이라이트.
 * 가드 처리는 라우트 레벨(App.tsx)에서 수행하므로 여기서는 링크만 제공.
 */

import { Link, useLocation } from 'react-router-dom';

interface HubNavItem {
  label: string;
  path: string;
  /** pathname이 이 조건에 매칭되면 active */
  matchExact?: boolean;
}

const HUB_NAV_ITEMS: HubNavItem[] = [
  { label: 'HUB 마켓', path: '/hub', matchExact: true },
  { label: '콘텐츠', path: '/hub/content' },
  { label: '상품 카탈로그', path: '/hub/b2b' },
  { label: '사이니지', path: '/hub/signage' },
  { label: '이벤트', path: '/hub/event-offers' },
  { label: '서비스', path: '/services/pharmacy' },
];

function isActive(pathname: string, item: HubNavItem): boolean {
  if (item.matchExact) return pathname === item.path;
  return pathname.startsWith(item.path);
}

export function HubSubNav() {
  const { pathname } = useLocation();

  return (
    <nav style={styles.nav}>
      {HUB_NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.path}
            to={item.path}
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

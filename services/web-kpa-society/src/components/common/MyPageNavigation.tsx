/**
 * MyPageNavigation - 마이페이지 내부 탭 네비게이션
 *
 * WO-KPA-A-MYPAGE-HUB-NAVIGATION-AND-CTA-ENHANCEMENT-V1
 *
 * /mypage 하위 서브 페이지 간 이동을 위한 수평 탭 바.
 * 모든 /mypage/* 페이지에서 공통으로 렌더링.
 */

import { Link, useLocation } from 'react-router-dom';
import { colors, typography } from '../../styles/theme';

interface NavItem {
  label: string;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: '홈', path: '/mypage' },
  { label: '프로필', path: '/mypage/profile' },
  { label: '내 포럼', path: '/mypage/my-forums' },
  { label: '이수현황', path: '/mypage/certificates' },
  { label: '설정', path: '/mypage/settings' },
];

/**
 * 현재 URL 경로에서 서비스 컨텍스트 prefix를 추출
 */
function getServicePrefix(pathname: string): string {
  const branchServicesMatch = pathname.match(/^(\/branch-services\/[^/]+)/);
  if (branchServicesMatch) return branchServicesMatch[1];
  return '';
}

export function MyPageNavigation() {
  const location = useLocation();
  const servicePrefix = getServicePrefix(location.pathname);

  // servicePrefix를 제거한 순수 경로로 active 판별
  const purePath = servicePrefix
    ? location.pathname.replace(servicePrefix, '')
    : location.pathname;

  return (
    <nav style={navStyles.container}>
      <div style={navStyles.inner}>
        {NAV_ITEMS.map(item => {
          const isActive = item.path === '/mypage'
            ? purePath === '/mypage'
            : purePath.startsWith(item.path);

          return (
            <Link
              key={item.path}
              to={`${servicePrefix}${item.path}`}
              style={{
                ...navStyles.tab,
                ...(isActive ? navStyles.tabActive : {}),
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

const navStyles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: '24px',
    borderBottom: `1px solid ${colors.neutral200}`,
    overflowX: 'auto',
  },
  inner: {
    display: 'flex',
    gap: '0',
    minWidth: 'max-content',
  },
  tab: {
    padding: '12px 20px',
    ...typography.bodyM,
    fontWeight: 500,
    color: colors.neutral500,
    textDecoration: 'none',
    borderBottom: '2px solid transparent',
    marginBottom: '-1px',
    whiteSpace: 'nowrap',
    transition: 'color 0.15s, border-color 0.15s',
  },
  tabActive: {
    color: colors.primary,
    fontWeight: 600,
    borderBottomColor: colors.primary,
  },
};

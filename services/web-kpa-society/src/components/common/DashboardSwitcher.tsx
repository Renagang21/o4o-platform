/**
 * DashboardSwitcher - Context 기반 대시보드 전환 UI
 * WO-DASHBOARD-SWITCHER-UI-GUIDE-V1
 *
 * Role Changer가 아님. 사용자는 "무엇을 관리할지"만 선택.
 * 접근 가능한 대시보드가 2개 이상일 때만 표시.
 */

import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts';
import { colors } from '../../styles/theme';

interface DashboardItem {
  label: string;
  icon: string;
  path: string;
}

/**
 * 사용자의 role/context를 기반으로 접근 가능한 대시보드 목록 반환
 *
 * WO-KPA-A-TOP-NAV-SERVICE-ENTRY-RESTRUCTURE-V1:
 * - 약국 HUB / 내 약국은 상단 네비게이션으로 이동 → 프로필 드롭다운은 개인 영역만
 * - 서비스 진입점은 상단 nav에서, 개인 메뉴는 드롭다운에서 분리
 */
export function useAccessibleDashboards(): DashboardItem[] {
  const { user } = useAuth();

  if (!user) return [];

  const items: DashboardItem[] = [];

  // WO-KPA-SOCIETY-DASHBOARD-TO-MYPAGE-CONSOLIDATION-V1: /dashboard → /mypage
  items.push({ label: '마이페이지', icon: '🏠', path: '/mypage' });

  return items;
}

/**
 * DashboardSwitcher - user dropdown 내부에 렌더링되는 대시보드 목록
 * 접근 가능 대시보드 2개 이상일 때만 사용
 */
export function DashboardSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const dashboards = useAccessibleDashboards();
  const location = useLocation();

  if (dashboards.length < 2) return null;

  return (
    <div>
      <div style={styles.sectionHeader}>바로가기</div>
      {dashboards.map((item) => {
        const isActive = location.pathname === item.path
          || (item.path !== '/' && location.pathname.startsWith(item.path));

        return (
          <Link
            key={item.path}
            to={item.path}
            style={{
              ...styles.item,
              ...(isActive ? styles.itemActive : {}),
            }}
            onClick={onNavigate}
          >
            <span style={styles.icon}>{item.icon}</span>
            <span style={isActive ? styles.labelActive : undefined}>{item.label}</span>
            {isActive && <span style={styles.currentBadge}>현재</span>}
          </Link>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sectionHeader: {
    padding: '8px 16px 4px',
    fontSize: '11px',
    fontWeight: 600,
    color: colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '9px 16px',
    color: colors.gray700,
    textDecoration: 'none',
    fontSize: '14px',
    transition: 'background-color 0.15s',
  },
  itemActive: {
    backgroundColor: `${colors.primary}08`,
  },
  icon: {
    fontSize: '16px',
    width: '20px',
    textAlign: 'center',
  },
  labelActive: {
    fontWeight: 600,
    color: colors.primary,
  },
  currentBadge: {
    marginLeft: 'auto',
    fontSize: '11px',
    fontWeight: 500,
    color: colors.primary,
    backgroundColor: `${colors.primary}12`,
    padding: '1px 6px',
    borderRadius: '4px',
  },
};

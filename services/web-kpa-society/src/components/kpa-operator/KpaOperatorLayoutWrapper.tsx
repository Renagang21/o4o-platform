/**
 * KPA Society OperatorLayoutWrapper
 *
 * WO-O4O-OPERATOR-UI-STANDARDIZATION-V1
 * WO-O4O-RBAC-GLOBAL-STANDARD-ROLL-OUT-V1: filterMenuByRole 적용
 * WO-KPA-A-OPERATOR-HEADER-ALIGN-WITH-BUSINESS-USER-V1: 공통 브랜드형 헤더 적용
 *
 * 공유 OperatorShell을 서비스 AuthContext에 연결하는 래퍼.
 * admin 역할에 따라 메뉴를 필터링하여 전달.
 * renderHeader를 통해 KPA-Society 공통 브랜드 헤더 톤을 적용.
 */

import { useMemo, useState, useCallback } from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { OperatorShell } from '@o4o/ui';
import { useAuth } from '../../contexts/AuthContext';
import { ENABLED_CAPABILITIES } from '../../config/operatorCapabilities';
import { UNIFIED_MENU, filterMenuByRole } from '../../config/operatorMenuGroups';

/**
 * WO-O4O-NAME-NORMALIZATION-V1: 사용자 표시 이름 헬퍼
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

export default function KpaOperatorLayoutWrapper() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  const isAdmin = user?.roles?.some(
    (r: string) => r === 'kpa-society:admin' || r === 'platform:super_admin',
  ) ?? false;

  const menuItems = useMemo(
    () => filterMenuByRole(UNIFIED_MENU, isAdmin),
    [isAdmin],
  );

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/');
  }, [logout, navigate]);

  const renderHeader = useCallback(({ dashboardLink, homeLink, onLogout }: {
    serviceName: string;
    user: { name: string; email?: string } | null;
    onLogout: () => void;
    homeLink: string;
    dashboardLink: string;
  }) => {
    const displayName = getUserDisplayName(user);
    return (
      <header style={headerStyles.header}>
        <div style={headerStyles.container}>
          {/* Left — Brand */}
          <div style={headerStyles.leftSection}>
            <Link to={dashboardLink} style={headerStyles.logo}>
              <span style={headerStyles.logoIcon}>💊</span>
              <span style={headerStyles.logoText}>약사회</span>
            </Link>
            <span style={headerStyles.roleBadge}>운영</span>
            <Link to={homeLink} style={headerStyles.homeLink}>
              서비스 홈
            </Link>
          </div>

          {/* Right — Account */}
          <div style={headerStyles.rightSection}>
            <div
              style={headerStyles.accountArea}
              onMouseEnter={() => setShowDropdown(true)}
              onMouseLeave={() => setShowDropdown(false)}
            >
              <button style={headerStyles.avatarButton} aria-label="사용자 메뉴">
                <div style={headerStyles.avatar}>
                  <span style={headerStyles.avatarText}>
                    {displayName.charAt(0) || '?'}
                  </span>
                </div>
                <span style={headerStyles.userName}>{displayName}</span>
              </button>

              {showDropdown && (
                <div style={headerStyles.dropdown}>
                  <div style={headerStyles.dropdownInner}>
                    <div style={headerStyles.dropdownHeader}>
                      <span style={headerStyles.dropdownName}>{displayName}님</span>
                      {user?.email && (
                        <span style={headerStyles.dropdownEmail}>{user.email}</span>
                      )}
                      <span style={headerStyles.dropdownRole}>
                        {isAdmin ? '관리자' : '운영자'}
                      </span>
                    </div>
                    <div style={headerStyles.dropdownDivider} />
                    <Link
                      to="/mypage/profile"
                      style={headerStyles.dropdownItem}
                      onClick={() => setShowDropdown(false)}
                    >
                      프로필
                    </Link>
                    <Link
                      to="/mypage/settings"
                      style={headerStyles.dropdownItem}
                      onClick={() => setShowDropdown(false)}
                    >
                      설정
                    </Link>
                    <div style={headerStyles.dropdownDivider} />
                    <button
                      style={headerStyles.dropdownLogout}
                      onClick={() => {
                        setShowDropdown(false);
                        onLogout();
                      }}
                    >
                      로그아웃
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    );
  }, [user, isAdmin, showDropdown]);

  return (
    <OperatorShell
      serviceName="KPA Society"
      menuItems={menuItems}
      capabilities={ENABLED_CAPABILITIES}
      user={user ? { name: user.name || '', email: user.email } : null}
      onLogout={handleLogout}
      renderHeader={renderHeader}
    >
      <Outlet />
    </OperatorShell>
  );
}

/* ── Styles matching Header.tsx brand tone ── */

const PRIMARY = '#2563EB';
const GRAY100 = '#F1F5F9';
const GRAY400 = '#94A3B8';
const GRAY500 = '#64748B';
const GRAY600 = '#475569';
const GRAY800 = '#1E293B';
const WHITE = '#FFFFFF';

const headerStyles: Record<string, React.CSSProperties> = {
  header: {
    backgroundColor: WHITE,
    borderBottom: '1px solid #E2E8F0',
    boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
  },
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '64px',
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    textDecoration: 'none',
  },
  logoIcon: {
    fontSize: '24px',
  },
  logoText: {
    fontSize: '20px',
    fontWeight: 700,
    color: PRIMARY,
  },
  roleBadge: {
    fontSize: '11px',
    fontWeight: 600,
    color: PRIMARY,
    backgroundColor: '#EFF6FF',
    padding: '3px 8px',
    borderRadius: '10px',
    letterSpacing: '0.02em',
  },
  homeLink: {
    fontSize: '13px',
    color: GRAY400,
    textDecoration: 'none',
    marginLeft: '4px',
    transition: 'color 0.2s',
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
  },
  accountArea: {
    position: 'relative' as const,
  },
  avatarButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '8px',
    transition: 'background-color 0.2s',
  },
  avatar: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    backgroundColor: GRAY100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `2px solid ${PRIMARY}`,
  },
  avatarText: {
    fontSize: '14px',
    fontWeight: 600,
    color: PRIMARY,
  },
  userName: {
    fontSize: '14px',
    fontWeight: 500,
    color: GRAY800,
  },
  dropdown: {
    position: 'absolute' as const,
    top: '100%',
    right: 0,
    marginTop: '4px',
    zIndex: 1000,
  },
  dropdownInner: {
    backgroundColor: WHITE,
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
    border: '1px solid #E2E8F0',
    minWidth: '200px',
    overflow: 'hidden',
  },
  dropdownHeader: {
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  dropdownName: {
    fontSize: '14px',
    fontWeight: 600,
    color: GRAY800,
  },
  dropdownEmail: {
    fontSize: '12px',
    color: GRAY500,
  },
  dropdownRole: {
    fontSize: '11px',
    fontWeight: 500,
    color: PRIMARY,
    marginTop: '4px',
  },
  dropdownDivider: {
    height: '1px',
    backgroundColor: '#F1F5F9',
  },
  dropdownItem: {
    display: 'block',
    padding: '10px 16px',
    fontSize: '13px',
    color: GRAY600,
    textDecoration: 'none',
    transition: 'background-color 0.15s',
  },
  dropdownLogout: {
    display: 'block',
    width: '100%',
    padding: '10px 16px',
    fontSize: '13px',
    color: '#DC2626',
    textAlign: 'left' as const,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
};

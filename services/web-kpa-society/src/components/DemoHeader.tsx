/**
 * DemoHeader - SVC-B: 지부/분회 데모 서비스 전용 헤더
 *
 * SVC-B: 지부/분회 데모 서비스
 * WO-KPA-DEMO-HEADER-SEPARATION-V1
 * WO-KPA-SOCIETY-PHASE6-SVC-B-DEMO-UX-REFINE-V1
 *
 * - 실제 운영 서비스 아님
 * - 지부/분회 서비스가 독립 도메인으로 제공되면 전체 삭제 대상
 *
 * /demo/* 경로에서 사용되는 독립된 헤더.
 * 커뮤니티 Header와 시각적으로 명확히 분리되어
 * "데모 서비스"임을 항상 인식할 수 있도록 함.
 *
 * 금지 사항:
 * - /forum (커뮤니티 포럼) 직접 링크 금지
 * - 커뮤니티 서비스와의 자동 연결 UX 금지
 * - 커뮤니티(/) 이동은 보조 CTA 형태로만 제공
 */

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User, LayoutDashboard, UserCircle, Settings, LogOut, Home } from 'lucide-react';
import { useAuth } from '../contexts';
import { useAuthModal } from '../contexts/LoginModalContext';

interface MenuItem {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
}

/**
 * 사용자 표시 이름 헬퍼
 * 우선순위: lastName+firstName > name > '운영자'
 * name이 이메일과 동일한 경우 '운영자' 표시
 */
function getUserDisplayName(user: any): string {
  if (!user) return '사용자';

  // 1. lastName + firstName 조합 시도
  if (user.lastName || user.firstName) {
    const fullName = `${user.lastName || ''}${user.firstName || ''}`.trim();
    if (fullName) return fullName;
  }

  // 2. name 필드 사용 (이메일과 다른 경우에만)
  if (user.name && user.name !== user.email) {
    return user.name;
  }

  // 3. 기본값
  return '운영자';
}

// Demo 전용 메뉴 구조 (커뮤니티 메뉴 제외)
const demoMenuItems: MenuItem[] = [
  { label: '홈', href: '/' },
  {
    label: '공지/업무',
    href: '/news',
    children: [
      { label: '공지사항', href: '/news' },
      { label: '소식', href: '/news/branch-news' },
      { label: '자료실', href: '/docs' },
    ],
  },
  {
    label: '조직/운영',
    href: '/organization',
    children: [
      { label: '조직 소개', href: '/organization' },
      { label: '지부/분회', href: '/organization/branches' },
      { label: '임원 현황', href: '/organization/officers' },
    ],
  },
  {
    label: '서비스',
    href: '/lms',
    children: [
      { label: '교육 (LMS)', href: '/lms' },
      { label: '공동구매', href: '/groupbuy' },
      { label: '참여 (설문)', href: '/participation' },
      { label: '이벤트', href: '/events' },
    ],
  },
];

// Demo 전용 색상 (커뮤니티와 차별화)
const demoColors = {
  primary: '#1e40af', // Darker blue for demo
  primaryLight: '#3b82f6',
  headerBg: '#1e293b', // Dark slate background
  headerText: '#f1f5f9',
  headerTextMuted: '#94a3b8',
  white: '#ffffff',
  gray100: '#f1f5f9',
  gray200: '#e2e8f0',
  gray300: '#cbd5e1',
  gray500: '#64748b',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1e293b',
  gray900: '#0f172a',
  error: '#ef4444',
};

export function DemoHeader({ serviceName }: { serviceName: string }) {
  const { user, logout, isLoading } = useAuth();
  const { openLoginModal } = useAuthModal();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <>
      <header style={styles.header}>
        <div style={styles.container}>
          {/* Logo + Service Badge */}
          <div style={styles.logoArea}>
            <Link to="/" style={styles.logo}>
              <span style={styles.logoIcon}>💊</span>
              <span style={styles.logoText}>{serviceName || 'KPA'}</span>
            </Link>
            <span style={styles.separator}>|</span>
            <span style={styles.serviceBadge}>약사회 서비스 데모</span>
          </div>

          {/* Desktop Navigation */}
          <nav style={styles.nav}>
            <ul style={styles.navList}>
              {demoMenuItems.map((item) => (
                <li
                  key={item.label}
                  style={styles.navItem}
                  onMouseEnter={() => setActiveMenu(item.label)}
                  onMouseLeave={() => setActiveMenu(null)}
                >
                  <Link
                    to={item.href}
                    style={{
                      ...styles.navLink,
                      ...(location.pathname === item.href ||
                        (item.children && item.children.some(c => location.pathname.startsWith(c.href)))
                        ? styles.navLinkActive
                        : {}),
                    }}
                  >
                    {item.label}
                  </Link>
                  {/* Dropdown */}
                  {item.children && activeMenu === item.label && (
                    <div style={styles.dropdown}>
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          to={child.href}
                          style={styles.dropdownItem}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          {/* Right Area: Auth + Community Link */}
          <div style={styles.rightArea}>
            {/* Community Return Link */}
            <Link to="/" style={styles.communityLink}>
              <Home style={{ width: 16, height: 16 }} />
              <span>커뮤니티로 돌아가기</span>
            </Link>

            {/* Auth */}
            {user ? (
              <div
                style={styles.userIconWrapper}
                onMouseEnter={() => setShowUserDropdown(true)}
                onMouseLeave={() => setShowUserDropdown(false)}
              >
                <button style={styles.userIconButton} aria-label="사용자 메뉴">
                  <User style={{ width: 18, height: 18, color: demoColors.headerText }} />
                </button>
                {showUserDropdown && (
                  <div style={styles.userDropdown}>
                    <div style={styles.userDropdownInner}>
                      <div style={styles.userDropdownHeader}>
                        <span style={styles.userDropdownName}>{getUserDisplayName(user)}님</span>
                        <span style={styles.userDropdownEmail}>{user.email}</span>
                      </div>
                      <div style={styles.userDropdownDivider} />
                      <Link
                        to="/mypage"
                        style={styles.userDropdownItem}
                        onClick={() => setShowUserDropdown(false)}
                      >
                        <LayoutDashboard style={{ width: 16, height: 16, color: demoColors.gray500 }} />
                        대시보드
                      </Link>
                      <Link
                        to="/mypage/profile"
                        style={styles.userDropdownItem}
                        onClick={() => setShowUserDropdown(false)}
                      >
                        <UserCircle style={{ width: 16, height: 16, color: demoColors.gray500 }} />
                        프로필
                      </Link>
                      <Link
                        to="/mypage/settings"
                        style={styles.userDropdownItem}
                        onClick={() => setShowUserDropdown(false)}
                      >
                        <Settings style={{ width: 16, height: 16, color: demoColors.gray500 }} />
                        설정
                      </Link>
                      <div style={styles.userDropdownDivider} />
                      <button
                        style={styles.userDropdownLogout}
                        onClick={() => {
                          setShowUserDropdown(false);
                          handleLogout();
                        }}
                      >
                        <LogOut style={{ width: 16, height: 16, color: demoColors.error }} />
                        로그아웃
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                style={styles.authButton}
                onClick={openLoginModal}
                disabled={isLoading}
              >
                로그인
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            style={styles.mobileMenuBtn}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            ☰
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div style={styles.mobileMenu}>
            <Link
              to="/"
              style={styles.mobileMenuCommunityLink}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Home style={{ width: 16, height: 16 }} />
              커뮤니티로 돌아가기
            </Link>
            <div style={styles.mobileMenuDivider} />
            {demoMenuItems.map((item) => (
              <div key={item.label}>
                <Link
                  to={item.href}
                  style={styles.mobileMenuItem}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
                {item.children && (
                  <div style={styles.mobileSubMenu}>
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        to={child.href}
                        style={styles.mobileSubMenuItem}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </header>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    position: 'sticky',
    top: 0,
    backgroundColor: demoColors.headerBg,
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    zIndex: 1000,
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '60px',
  },
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    textDecoration: 'none',
    gap: '6px',
  },
  logoIcon: {
    fontSize: '22px',
  },
  logoText: {
    fontSize: '18px',
    fontWeight: 700,
    color: demoColors.headerText,
  },
  separator: {
    color: demoColors.headerTextMuted,
    fontSize: '18px',
  },
  serviceBadge: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#fbbf24',
    padding: '4px 12px',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderRadius: '4px',
    border: '1px solid rgba(251, 191, 36, 0.3)',
    letterSpacing: '0.02em',
  },
  nav: {
    display: 'flex',
  },
  navList: {
    display: 'flex',
    listStyle: 'none',
    margin: 0,
    padding: 0,
    gap: '4px',
  },
  navItem: {
    position: 'relative',
  },
  navLink: {
    display: 'block',
    padding: '20px 14px',
    color: demoColors.headerTextMuted,
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'color 0.2s',
  },
  navLinkActive: {
    color: demoColors.white,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: demoColors.white,
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    minWidth: '160px',
    padding: '8px 0',
    zIndex: 100,
  },
  dropdownItem: {
    display: 'block',
    padding: '10px 20px',
    color: demoColors.gray700,
    textDecoration: 'none',
    fontSize: '14px',
    transition: 'background-color 0.2s, color 0.2s',
  },
  rightArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  communityLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    color: demoColors.headerTextMuted,
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: 500,
    border: `1px solid ${demoColors.gray600}`,
    borderRadius: '6px',
    transition: 'all 0.2s',
  },
  userIconWrapper: {
    position: 'relative',
  },
  userIconButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: demoColors.gray700,
    border: `1px solid ${demoColors.gray600}`,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  userDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    paddingTop: '8px',
    backgroundColor: 'transparent',
    zIndex: 100,
  },
  userDropdownInner: {
    backgroundColor: demoColors.white,
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    minWidth: '200px',
    padding: '8px 0',
  },
  userDropdownHeader: {
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  userDropdownName: {
    fontSize: '15px',
    fontWeight: 600,
    color: demoColors.gray900,
  },
  userDropdownEmail: {
    fontSize: '12px',
    color: demoColors.gray500,
    wordBreak: 'break-all',
  },
  userDropdownDivider: {
    height: '1px',
    backgroundColor: demoColors.gray200,
    margin: '4px 0',
  },
  userDropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 16px',
    color: demoColors.gray700,
    textDecoration: 'none',
    fontSize: '14px',
    transition: 'background-color 0.2s',
  },
  userDropdownLogout: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '10px 16px',
    color: demoColors.error,
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '14px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background-color 0.2s',
  },
  authButton: {
    padding: '8px 16px',
    backgroundColor: demoColors.primaryLight,
    color: demoColors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  mobileMenuBtn: {
    display: 'none',
    padding: '8px 12px',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: demoColors.headerText,
  },
  mobileMenu: {
    display: 'none',
    backgroundColor: demoColors.headerBg,
    borderTop: `1px solid ${demoColors.gray700}`,
    padding: '16px 20px',
  },
  mobileMenuCommunityLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 0',
    color: demoColors.primaryLight,
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
  },
  mobileMenuDivider: {
    height: '1px',
    backgroundColor: demoColors.gray700,
    margin: '8px 0',
  },
  mobileMenuItem: {
    display: 'block',
    padding: '12px 0',
    color: demoColors.headerText,
    textDecoration: 'none',
    fontSize: '15px',
    fontWeight: 500,
    borderBottom: `1px solid ${demoColors.gray700}`,
  },
  mobileSubMenu: {
    paddingLeft: '16px',
  },
  mobileSubMenuItem: {
    display: 'block',
    padding: '10px 0',
    color: demoColors.headerTextMuted,
    textDecoration: 'none',
    fontSize: '14px',
  },
};

export default DemoHeader;

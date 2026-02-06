/**
 * BranchHeader - 분회 전용 헤더
 *
 * SVC-C: 분회 서비스 헤더
 * WO-KPA-SOCIETY-PHASE6-BRANCH-UX-STANDARD-V1
 *
 * 메뉴 구조 (T6-2 표준): 홈 | 소식 | 자료 | 커뮤니티 | 소개
 * NOTE: /demo/* 링크 금지. basePath는 BranchContext에서 가져옴.
 */

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User, UserCircle, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts';
import { useBranchContext } from '../../contexts/BranchContext';
import { colors } from '../../styles/theme';

interface MenuItem {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
}

/**
 * 사용자 표시 이름 헬퍼
 * 우선순위: lastName+firstName > name(이메일 아닌 경우) > '운영자'
 */
function getUserDisplayName(user: any): string {
  if (!user) return '사용자';

  // Priority 1: lastName + firstName (한국어 이름)
  if (user.lastName || user.firstName) {
    const fullName = `${user.lastName || ''}${user.firstName || ''}`.trim();
    if (fullName) return fullName;
  }

  // Priority 2: name (이메일/아이디가 아닌 경우)
  if (user.name && user.name !== user.email) {
    return user.name;
  }

  // Priority 3: 운영자용 기본값
  return '운영자';
}

// 분회용 메뉴 구조 (T6-2 표준: 홈, 소식, 자료, 커뮤니티, 소개)
const getBranchMenuItems = (basePath: string): MenuItem[] => [
  {
    label: '홈',
    href: basePath,
  },
  {
    label: '소식',
    href: `${basePath}/news`,
    children: [
      { label: '공지사항', href: `${basePath}/news/notice` },
      { label: '분회 소식', href: `${basePath}/news/branch-news` },
      { label: '갤러리', href: `${basePath}/news/gallery` },
    ],
  },
  {
    label: '자료',
    href: `${basePath}/docs`,
  },
  {
    label: '커뮤니티',
    href: `${basePath}/forum`,
    children: [
      { label: '전체 글', href: `${basePath}/forum` },
      { label: '글쓰기', href: `${basePath}/forum/write` },
    ],
  },
  {
    label: '소개',
    href: `${basePath}/about`,
    children: [
      { label: '분회 소개', href: `${basePath}/about` },
      { label: '임원 안내', href: `${basePath}/about/officers` },
      { label: '연락처', href: `${basePath}/about/contact` },
    ],
  },
];

interface BranchHeaderProps {
  branchId: string;
  branchName: string;
}

export function BranchHeader({ branchName }: BranchHeaderProps) {
  const { user, logout } = useAuth();
  const { basePath } = useBranchContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const menuItems = getBranchMenuItems(basePath);

  const handleLogout = async () => {
    await logout();
    setShowUserDropdown(false);
    navigate('/');
  };

  return (
    <header style={styles.header}>
      {/* 상단 바 - 지부로 이동 링크 */}
      <div style={styles.topBar}>
        <div style={styles.topBarContent}>
          <Link to="/" style={styles.backToMain}>
            ← KPA-Society 본부로 이동
          </Link>
          <span style={styles.branchBadge}>커뮤니티 소속 분회</span>
        </div>
      </div>

      {/* 메인 헤더 */}
      <div style={styles.mainHeader}>
        <div style={styles.container}>
          {/* Logo */}
          <Link to={basePath} style={styles.logo}>
            <span style={styles.logoIcon}>💊</span>
            <div style={styles.logoTextContainer}>
              <span style={styles.logoText}>{branchName}</span>
              <span style={styles.logoSubtext}>분회</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav style={styles.nav}>
            <ul style={styles.navList}>
              {menuItems.map((item) => (
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
                      ...(location.pathname.startsWith(item.href) ? styles.navLinkActive : {}),
                    }}
                  >
                    {item.label}
                  </Link>
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

          {/* Auth Area */}
          <div style={styles.authArea}>
            {user ? (
              <div style={styles.userDropdownWrapper}>
                <button
                  style={styles.userButton}
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  onBlur={() => setTimeout(() => setShowUserDropdown(false), 150)}
                >
                  <User style={{ width: 20, height: 20 }} />
                </button>
                {showUserDropdown && (
                  <div style={styles.userDropdown}>
                    <div style={styles.userDropdownHeader}>
                      <span style={styles.userDropdownName}>{getUserDisplayName(user)}님</span>
                      <span style={styles.userDropdownEmail}>{user.email}</span>
                    </div>
                    <div style={styles.userDropdownDivider} />
                    <Link to="/mypage/profile" style={styles.userDropdownItem}>
                      <UserCircle style={{ width: 16, height: 16 }} />
                      마이페이지
                    </Link>
                    <Link to="/mypage/settings" style={styles.userDropdownItem}>
                      <Settings style={{ width: 16, height: 16 }} />
                      설정
                    </Link>
                    <div style={styles.userDropdownDivider} />
                    <button style={styles.userDropdownLogout} onClick={handleLogout}>
                      <LogOut style={{ width: 16, height: 16 }} />
                      로그아웃
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/" style={styles.authButton}>
                본부 로그인
              </Link>
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
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div style={styles.mobileMenu}>
          <Link
            to="/"
            style={styles.mobileBackLink}
            onClick={() => setMobileMenuOpen(false)}
          >
            ← 본부로 이동
          </Link>
          {menuItems.map((item) => (
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
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    position: 'sticky',
    top: 0,
    backgroundColor: colors.white,
    boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
    zIndex: 1000,
  },
  topBar: {
    backgroundColor: colors.neutral100,
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  topBarContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '8px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backToMain: {
    fontSize: '13px',
    color: colors.neutral600,
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  branchBadge: {
    fontSize: '11px',
    fontWeight: 600,
    color: colors.white,
    backgroundColor: colors.accentGreen,
    padding: '4px 10px',
    borderRadius: '12px',
  },
  mainHeader: {
    backgroundColor: colors.white,
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '64px',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    textDecoration: 'none',
    gap: '10px',
  },
  logoIcon: {
    fontSize: '26px',
  },
  logoTextContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  logoText: {
    fontSize: '18px',
    fontWeight: 700,
    color: colors.primary,
    lineHeight: 1.2,
  },
  logoSubtext: {
    fontSize: '12px',
    color: colors.neutral500,
    fontWeight: 500,
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
    padding: '20px 16px',
    color: colors.neutral700,
    textDecoration: 'none',
    fontSize: '15px',
    fontWeight: 500,
    transition: 'color 0.2s',
  },
  navLinkActive: {
    color: colors.primary,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: colors.white,
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    minWidth: '150px',
    padding: '8px 0',
    zIndex: 100,
  },
  dropdownItem: {
    display: 'block',
    padding: '10px 18px',
    color: colors.neutral700,
    textDecoration: 'none',
    fontSize: '14px',
    transition: 'background-color 0.2s',
  },
  authArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  userName: {
    fontSize: '14px',
    color: colors.neutral700,
    fontWeight: 500,
  },
  authButton: {
    padding: '8px 16px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    textDecoration: 'none',
  },
  authButtonOutline: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: colors.primary,
    border: `1px solid ${colors.primary}`,
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  userDropdownWrapper: {
    position: 'relative',
  },
  userButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: colors.neutral100,
    border: 'none',
    cursor: 'pointer',
    color: colors.neutral700,
    transition: 'background-color 0.2s',
  },
  userDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '8px',
    backgroundColor: colors.white,
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    minWidth: '200px',
    zIndex: 1001,
    overflow: 'hidden',
  },
  userDropdownHeader: {
    padding: '16px',
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  userDropdownName: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 600,
    color: colors.neutral900,
  },
  userDropdownEmail: {
    display: 'block',
    fontSize: '12px',
    color: colors.neutral500,
    marginTop: '2px',
  },
  userDropdownDivider: {
    height: '1px',
    backgroundColor: colors.neutral200,
    margin: '4px 0',
  },
  userDropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    color: colors.neutral700,
    textDecoration: 'none',
    fontSize: '14px',
    transition: 'background-color 0.2s',
  },
  userDropdownLogout: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '10px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#dc2626',
    fontSize: '14px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background-color 0.2s',
  },
  mobileMenuBtn: {
    display: 'none',
    padding: '8px 12px',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '22px',
    cursor: 'pointer',
    color: colors.neutral700,
  },
  mobileMenu: {
    display: 'none',
    backgroundColor: colors.white,
    borderTop: `1px solid ${colors.neutral200}`,
    padding: '12px 20px',
  },
  mobileBackLink: {
    display: 'block',
    padding: '10px 0',
    color: colors.primary,
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
    borderBottom: `1px solid ${colors.neutral200}`,
    marginBottom: '8px',
  },
  mobileMenuItem: {
    display: 'block',
    padding: '12px 0',
    color: colors.neutral800,
    textDecoration: 'none',
    fontSize: '15px',
    fontWeight: 500,
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  mobileSubMenu: {
    paddingLeft: '16px',
  },
  mobileSubMenuItem: {
    display: 'block',
    padding: '10px 0',
    color: colors.neutral600,
    textDecoration: 'none',
    fontSize: '14px',
  },
};

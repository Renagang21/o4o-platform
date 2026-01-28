/**
 * BranchHeader - 분회 전용 헤더
 * 지부로 돌아가기 링크 포함
 */

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts';
import { colors } from '../../styles/theme';

interface MenuItem {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
}

// 분회용 메뉴 구조
const getBranchMenuItems = (branchId: string): MenuItem[] => [
  {
    label: '공지',
    href: `/branch/${branchId}/news`,
    children: [
      { label: '공지사항', href: `/branch/${branchId}/news/notice` },
      { label: '분회 소식', href: `/branch/${branchId}/news/branch-news` },
      { label: '갤러리', href: `/branch/${branchId}/news/gallery` },
    ],
  },
  {
    label: '포럼',
    href: `/branch/${branchId}/forum`,
    children: [
      { label: '전체 글', href: `/branch/${branchId}/forum` },
      { label: '글쓰기', href: `/branch/${branchId}/forum/write` },
    ],
  },
  {
    label: '공동구매',
    href: `/branch/${branchId}/groupbuy`,
    children: [
      { label: '진행중', href: `/branch/${branchId}/groupbuy` },
      { label: '참여 내역', href: `/branch/${branchId}/groupbuy/history` },
    ],
  },
  {
    label: '자료실',
    href: `/branch/${branchId}/docs`,
  },
  {
    label: '분회소개',
    href: `/branch/${branchId}/about`,
    children: [
      { label: '분회 소개', href: `/branch/${branchId}/about` },
      { label: '임원 안내', href: `/branch/${branchId}/about/officers` },
      { label: '연락처', href: `/branch/${branchId}/about/contact` },
    ],
  },
];

interface BranchHeaderProps {
  branchId: string;
  branchName: string;
}

export function BranchHeader({ branchId, branchName }: BranchHeaderProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = getBranchMenuItems(branchId);

  return (
    <header style={styles.header}>
      {/* 상단 바 - 지부로 이동 링크 */}
      <div style={styles.topBar}>
        <div style={styles.topBarContent}>
          <Link to="/" style={styles.backToMain}>
            ← KPA-Society 본부로 이동
          </Link>
          <span style={styles.branchBadge}>분회 사이트</span>
        </div>
      </div>

      {/* 메인 헤더 */}
      <div style={styles.mainHeader}>
        <div style={styles.container}>
          {/* Logo */}
          <Link to={`/branch/${branchId}`} style={styles.logo}>
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
              <div style={styles.userInfo}>
                <span style={styles.userName}>{user.name}님</span>
                <button style={styles.authButtonOutline} onClick={logout}>
                  로그아웃
                </button>
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

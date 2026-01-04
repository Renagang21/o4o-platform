/**
 * AdminHeader - 분회 관리자 헤더
 */

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts';
import { colors } from '../../styles/theme';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
}

export function AdminHeader({ title, subtitle }: AdminHeaderProps) {
  const { user, logout } = useAuth();
  const { branchId } = useParams();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header style={styles.header}>
      <div style={styles.titleSection}>
        <h1 style={styles.title}>{title}</h1>
        {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
      </div>

      <div style={styles.actions}>
        {/* 알림 버튼 */}
        <button style={styles.iconButton}>
          <span style={styles.notificationIcon}>🔔</span>
          <span style={styles.notificationBadge}>3</span>
        </button>

        {/* 사용자 메뉴 */}
        <div style={styles.userMenuWrapper}>
          <button
            style={styles.userButton}
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div style={styles.avatar}>
              {user?.name?.charAt(0) || '관'}
            </div>
            <span style={styles.userName}>{user?.name || '관리자'}</span>
            <span style={styles.dropdownIcon}>▼</span>
          </button>

          {showUserMenu && (
            <div style={styles.dropdown}>
              <Link to={`/branch/${branchId}/admin/settings`} style={styles.dropdownItem}>
                ⚙️ 설정
              </Link>
              <Link to="/mypage/profile" style={styles.dropdownItem}>
                👤 내 프로필
              </Link>
              <button
                style={{ ...styles.dropdownItem, ...styles.logoutButton }}
                onClick={() => logout()}
              >
                🚪 로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 32px',
    backgroundColor: colors.white,
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  titleSection: {},
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: colors.neutral500,
    margin: '4px 0 0 0',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  iconButton: {
    position: 'relative',
    padding: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    borderRadius: '8px',
  },
  notificationIcon: {
    fontSize: '20px',
  },
  notificationBadge: {
    position: 'absolute',
    top: '2px',
    right: '2px',
    backgroundColor: colors.accentRed,
    color: colors.white,
    fontSize: '10px',
    fontWeight: 600,
    padding: '2px 5px',
    borderRadius: '10px',
    minWidth: '16px',
    textAlign: 'center',
  },
  userMenuWrapper: {
    position: 'relative',
  },
  userButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '6px 12px',
    backgroundColor: colors.neutral100,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  avatar: {
    width: '32px',
    height: '32px',
    backgroundColor: colors.primary,
    color: colors.white,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
  },
  userName: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral700,
  },
  dropdownIcon: {
    fontSize: '10px',
    color: colors.neutral500,
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    backgroundColor: colors.white,
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    minWidth: '180px',
    padding: '8px 0',
    zIndex: 100,
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 16px',
    color: colors.neutral700,
    textDecoration: 'none',
    fontSize: '14px',
    width: '100%',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    textAlign: 'left',
  },
  logoutButton: {
    color: colors.accentRed,
    borderTop: `1px solid ${colors.neutral200}`,
    marginTop: '4px',
    paddingTop: '14px',
  },
};

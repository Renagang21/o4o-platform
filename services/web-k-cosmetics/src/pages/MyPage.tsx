/**
 * MyPage - 내 정보 페이지
 * 역할별 대시보드로 안내
 */

import { Link } from 'react-router-dom';
import { useAuth, ROLE_LABELS, ROLE_DASHBOARDS } from '@/contexts/AuthContext';

export default function MyPage() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>로그인이 필요합니다</h1>
          <Link to="/login" style={styles.primaryButton}>로그인</Link>
        </div>
      </div>
    );
  }

  const dashboardPath = ROLE_DASHBOARDS[user.currentRole];
  const roleLabel = ROLE_LABELS[user.currentRole];

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.avatarLarge}>
          {user.name?.charAt(0) || '?'}
        </div>
        <h1 style={styles.name}>{user.name}</h1>
        <p style={styles.email}>{user.email}</p>
        <span style={styles.roleBadge}>{roleLabel}</span>

        <div style={styles.actions}>
          <Link to={dashboardPath} style={styles.primaryButton}>
            대시보드로 이동
          </Link>
          <button onClick={logout} style={styles.logoutButton}>
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '60vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 16px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '24px',
    padding: '48px',
    textAlign: 'center',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
    maxWidth: '400px',
    width: '100%',
  },
  avatarLarge: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #f48fb1, #e91e63)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '32px',
    fontWeight: 700,
    margin: '0 auto 16px',
    boxShadow: '0 4px 16px rgba(233, 30, 99, 0.3)',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1e293b',
    marginBottom: '16px',
  },
  name: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1e293b',
    margin: '0 0 8px',
  },
  email: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 12px',
  },
  roleBadge: {
    display: 'inline-block',
    padding: '6px 16px',
    backgroundColor: '#fce4ec',
    color: '#c2185b',
    fontSize: '13px',
    fontWeight: 600,
    borderRadius: '20px',
  },
  actions: {
    marginTop: '32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  primaryButton: {
    display: 'block',
    padding: '14px 24px',
    backgroundColor: '#e91e63',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 600,
    borderRadius: '12px',
    textDecoration: 'none',
    boxShadow: '0 4px 12px rgba(233, 30, 99, 0.25)',
  },
  logoutButton: {
    padding: '14px 24px',
    backgroundColor: 'transparent',
    color: '#64748b',
    fontSize: '15px',
    fontWeight: 500,
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    cursor: 'pointer',
  },
};

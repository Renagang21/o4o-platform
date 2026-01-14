/**
 * SupplierDashboardLayout - 공급자 대시보드 레이아웃
 *
 * Work Order: WO-NETURE-SUPPLIER-DASHBOARD-P0
 *
 * 핵심 원칙:
 * - 공급자(supplier/partner) 역할만 접근 가능
 * - 판매자 신청 승인/거절의 단일 운영 공간
 * - Neture 책임 선언 준수
 *
 * 금지사항:
 * - 주문/배송/반품 처리 (P1 이후)
 * - 거래 통계 (P2 이후)
 * - 자동 승인 로직 (정책 미확정)
 */

import { Navigate, Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, FileCheck, Package, Settings, LogOut } from 'lucide-react';

export default function SupplierDashboardLayout() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <p>Loading...</p>
      </div>
    );
  }

  // 인증 확인
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // 역할 확인 (supplier 또는 partner만 접근)
  const allowedRoles = ['supplier', 'partner'];
  if (!allowedRoles.includes(user.currentRole)) {
    return (
      <div style={styles.accessDenied}>
        <h1>접근 권한 없음</h1>
        <p>이 페이지는 공급자/파트너 전용입니다.</p>
        <a href="/" style={styles.backLink}>홈으로 돌아가기</a>
      </div>
    );
  }

  const navItems = [
    { to: '/supplier/dashboard', icon: LayoutDashboard, label: '대시보드' },
    { to: '/supplier/requests', icon: FileCheck, label: '판매자 신청' },
    { to: '/supplier/products', icon: Package, label: '내 제품', disabled: true },
    { to: '/supplier/settings', icon: Settings, label: '설정', disabled: true },
  ];

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h2 style={styles.sidebarTitle}>Neture</h2>
          <span style={styles.roleTag}>공급자</span>
        </div>

        <nav style={styles.nav}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.disabled ? '#' : item.to}
              style={({ isActive }) => ({
                ...styles.navItem,
                ...(isActive && !item.disabled ? styles.navItemActive : {}),
                ...(item.disabled ? styles.navItemDisabled : {}),
              })}
              onClick={(e) => item.disabled && e.preventDefault()}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.disabled && <span style={styles.comingSoon}>예정</span>}
            </NavLink>
          ))}
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.userInfo}>
            <span style={styles.userName}>{user.name}</span>
            <span style={styles.userEmail}>{user.email}</span>
          </div>
          <button onClick={() => logout()} style={styles.logoutButton}>
            <LogOut size={16} />
            로그아웃
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    fontSize: '16px',
    color: '#64748b',
  },
  accessDenied: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    textAlign: 'center',
    padding: '20px',
  },
  backLink: {
    marginTop: '20px',
    color: '#3b82f6',
    textDecoration: 'none',
  },
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
  },
  sidebar: {
    width: '260px',
    backgroundColor: '#1e293b',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  sidebarHeader: {
    padding: '24px 20px',
    borderBottom: '1px solid #334155',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  sidebarTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 700,
    color: '#fff',
  },
  roleTag: {
    fontSize: '11px',
    fontWeight: 500,
    backgroundColor: '#3b82f6',
    color: '#fff',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  nav: {
    flex: 1,
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '8px',
    color: '#94a3b8',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.15s',
  },
  navItemActive: {
    backgroundColor: '#334155',
    color: '#fff',
  },
  navItemDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  comingSoon: {
    marginLeft: 'auto',
    fontSize: '10px',
    backgroundColor: '#475569',
    color: '#94a3b8',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  sidebarFooter: {
    padding: '16px 20px',
    borderTop: '1px solid #334155',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    marginBottom: '12px',
  },
  userName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#fff',
  },
  userEmail: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  logoutButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '10px 12px',
    backgroundColor: 'transparent',
    border: '1px solid #475569',
    borderRadius: '6px',
    color: '#94a3b8',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  main: {
    flex: 1,
    padding: '32px',
    overflowY: 'auto',
  },
};

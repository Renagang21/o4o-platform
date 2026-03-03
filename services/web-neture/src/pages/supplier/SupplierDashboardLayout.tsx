/**
 * SupplierDashboardLayout - 공급자 대시보드 레이아웃
 *
 * Work Order: WO-NETURE-SUPPLIER-DASHBOARD-P0
 * WO-NETURE-HUB-ARCHITECTURE-RESTRUCTURE-V1: 상단 메뉴 재정렬 (홈/상품/콘텐츠/정산/허브)
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

import { Navigate, Outlet, NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, FileCheck, Package, PackageCheck, ShoppingBag, Monitor, User, LogOut, Home } from 'lucide-react';
import AccountMenu from '../../components/AccountMenu';

/**
 * 사용자 표시 이름 헬퍼
 * DB에 기본값 '운영자'가 설정되어 있으므로 name은 항상 존재
 */
function getUserDisplayName(user: any): string {
  if (!user) return '사용자';
  return user.name || '사용자';
}

export default function SupplierDashboardLayout() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const location = useLocation();

  const isNavActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <p>Loading...</p>
      </div>
    );
  }

  // 인증 확인 - 현재 페이지를 returnUrl로 전달
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }

  // 역할 확인 (supplier 또는 partner만 접근)
  const allowedRoles = ['supplier', 'partner'];
  if (!user.roles.some(r => allowedRoles.includes(r))) {
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
    { to: '/workspace/supplier/supply-requests', icon: PackageCheck, label: '공급 요청' },
    { to: '/supplier/products', icon: Package, label: '내 제품' },
    { to: '/supplier/orders', icon: ShoppingBag, label: '주문 현황' },
    { to: '/supplier/signage/content', icon: Monitor, label: '사이니지 콘텐츠' },
    { to: '/workspace/supplier/profile', icon: User, label: '연락처 관리' },
  ];

  return (
    <div style={styles.wrapper}>
      {/* Top Header - SupplierOpsLayout 동일 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-[100]">
        <div className="max-w-full mx-auto px-6 flex justify-between items-center h-14">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <Link to="/workspace" className="flex items-center gap-2">
              <span className="text-xl font-bold text-primary-600">Neture</span>
              <span className="text-sm font-medium text-slate-500 border-l border-slate-300 pl-2">
                공급자 연결
              </span>
            </Link>
            <Link
              to="/"
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-primary-500 transition-colors ml-2"
              title="메인 사이트로 이동"
            >
              <Home className="w-3.5 h-3.5" />
              <span>메인</span>
            </Link>
          </div>

          {/* Navigation — WO-NETURE-HUB-ARCHITECTURE-RESTRUCTURE-V1: 홈/상품/콘텐츠/정산/허브 */}
          <nav className="flex items-center space-x-4">
            <Link
              to="/workspace"
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                location.pathname === '/workspace'
                  ? 'text-primary-600'
                  : 'text-gray-700 hover:text-primary-600'
              }`}
            >
              홈
            </Link>
            <Link
              to="/workspace/supplier/products"
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                isNavActive('/workspace/supplier/products')
                  ? 'text-primary-600'
                  : 'text-gray-700 hover:text-primary-600'
              }`}
            >
              상품
            </Link>
            <Link
              to="/workspace/partner/settlements"
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                isNavActive('/workspace/partner/settlements')
                  ? 'text-primary-600'
                  : 'text-gray-700 hover:text-primary-600'
              }`}
            >
              정산
            </Link>
            <Link
              to="/workspace/hub"
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                isNavActive('/workspace/hub')
                  ? 'text-primary-600'
                  : 'text-gray-700 hover:text-primary-600'
              }`}
            >
              허브
            </Link>
            <AccountMenu />
          </nav>
        </div>
      </header>

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
              to={item.to}
              style={({ isActive }) => ({
                ...styles.navItem,
                ...(isActive ? styles.navItemActive : {}),
              })}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.userInfo}>
            <span style={styles.userName}>{getUserDisplayName(user)}</span>
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

      {/* Footer - SupplierOpsLayout 동일 */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <div className="text-center sm:text-left">
              <p>&copy; 2026 Neture. 공급자 중심 운영·연결 서비스</p>
              <p className="mt-1 text-xs text-gray-400">
                <Link to="/o4o" className="hover:text-primary-600">
                  o4o 플랫폼 소개
                </Link>
                {' · '}
                <Link to="/" className="hover:text-primary-600">
                  메인으로
                </Link>
              </p>
            </div>
            <Link to="/forum/test-feedback" className="text-xs text-green-600 hover:text-green-700 transition-colors">
              🧪 테스트 센터
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
  },
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
    flex: 1,
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

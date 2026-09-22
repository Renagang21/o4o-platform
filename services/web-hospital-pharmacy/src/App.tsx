import { BrowserRouter, Routes, Route, Link, NavLink, useLocation } from 'react-router-dom';
import { detectBasename } from './lib/basename';
import { BRAND } from './config/service';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import HomePage from './pages/HomePage';
import WardPage from './pages/WardPage';
import PharmacyDeptPage from './pages/PharmacyDeptPage';
import LoginPage from './pages/LoginPage';

/**
 * 헤더 계정 영역 — 로그인 상태만 보여준다. 로그인 자체는 공통 Google 진입(LoginPanel)이 한다.
 * 로그인 전에도 홈 · 원내 파일 연결 · 원내 보유 조회는 그대로 쓸 수 있으므로 route guard 는 두지 않는다.
 */
function AccountArea() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const location = useLocation();
  if (isLoading) return <span className="muted">확인 중…</span>;
  if (!isAuthenticated) {
    return (
      <Link to="/login" state={{ from: location.pathname }} className="login-link">
        로그인
      </Link>
    );
  }
  return (
    <span className="account">
      <span className="muted">{user?.name || user?.email}</span>
      <button type="button" className="linklike" onClick={logout}>
        로그아웃
      </button>
    </span>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="site">
      <header className="header">
        <Link to="/" className="brand">{BRAND.name} <span className="muted">| Neture</span></Link>
        <nav className="nav">
          <NavLink to="/ward" className={({ isActive }) => (isActive ? 'active' : '')}>병동</NavLink>
          <NavLink to="/pharmacy" className={({ isActive }) => (isActive ? 'active' : '')}>약제부</NavLink>
          <AccountArea />
        </nav>
      </header>
      <main className="content">{children}</main>
      <footer className="footer">© {new Date().getFullYear()} Neture · {BRAND.name} — 원내 자료는 이 브라우저에만 저장됩니다. 환자 정보는 다루지 않습니다.</footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={detectBasename()}>
      <AuthProvider>
        <Shell>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/ward" element={<WardPage />} />
            <Route path="/pharmacy" element={<PharmacyDeptPage />} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </Shell>
      </AuthProvider>
    </BrowserRouter>
  );
}

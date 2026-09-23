import { BrowserRouter, Routes, Route, Link, NavLink } from 'react-router-dom';
import { detectBasename } from './lib/basename';
import { BRAND } from './config/service';
import { AuthProvider } from './contexts/AuthContext';
import { DeviceProvider, useDevice } from './contexts/DeviceContext';
import EnrollmentGate from './components/EnrollmentGate';
import HomePage from './pages/HomePage';
import WardPage from './pages/WardPage';
import PharmacyDeptPage from './pages/PharmacyDeptPage';
import ManagePage from './pages/ManagePage';

/**
 * 헤더 연결 영역 — 개인 로그인이 아니라 **이 PC 의 연결 상태**만 보여준다(로그인리스 §1·§12).
 * device 쿠키는 httpOnly 라 여기서 값을 읽지 않는다 — DeviceContext(/session)가 판정한 상태만 쓴다.
 */
function DeviceStatusArea() {
  const { status, device } = useDevice();
  if (status === 'enrolled') {
    return <span className="muted">이 PC: 연결됨{device?.label ? ` · ${device.label}` : ''}</span>;
  }
  if (status === 'unenrolled') return <span className="muted">이 PC: 미연결</span>;
  return <span className="muted">확인 중…</span>;
}

/** 일반 사용자 셸(홈·병동·약제부) — device 게이트 안에서만 내용이 보인다. */
function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="site">
      <header className="header">
        <Link to="/" className="brand">{BRAND.name} <span className="muted">| Neture</span></Link>
        <nav className="nav">
          <NavLink to="/ward" className={({ isActive }) => (isActive ? 'active' : '')}>병동</NavLink>
          <NavLink to="/pharmacy" className={({ isActive }) => (isActive ? 'active' : '')}>약제부</NavLink>
          <DeviceStatusArea />
        </nav>
      </header>
      <main className="content">{children}</main>
      <footer className="footer">© {new Date().getFullYear()} Neture · {BRAND.name} — 원내 자료는 이 브라우저에만 저장됩니다. 환자 정보는 다루지 않습니다.</footer>
    </div>
  );
}

/** 로그인리스 일반 앱 — DeviceProvider 로 연결 상태를 관리하고 EnrollmentGate 로 진입을 통제한다. */
function GeneralApp() {
  return (
    <DeviceProvider>
      <AppShell>
        <EnrollmentGate>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/ward" element={<WardPage />} />
            <Route path="/pharmacy" element={<PharmacyDeptPage />} />
          </Routes>
        </EnrollmentGate>
      </AppShell>
    </DeviceProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={detectBasename()}>
      <Routes>
        {/* 관리자 콘솔만 개인 로그인(별도 역할 §2) — device 게이트 밖의 독립 경로. */}
        <Route path="/manage" element={<AuthProvider><ManagePage /></AuthProvider>} />
        {/* 그 외 전부 로그인리스 일반 앱(§1·§12). */}
        <Route path="/*" element={<GeneralApp />} />
      </Routes>
    </BrowserRouter>
  );
}

import { BrowserRouter, Routes, Route, Link, NavLink } from 'react-router-dom';
import { BRAND } from './config/service';
import HomePage from './pages/HomePage';
import WardPage from './pages/WardPage';
import PharmacyDeptPage from './pages/PharmacyDeptPage';

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="site">
      <header className="header">
        <Link to="/" className="brand">{BRAND.name} <span className="muted">| Neture</span></Link>
        <nav className="nav">
          <NavLink to="/ward" className={({ isActive }) => (isActive ? 'active' : '')}>병동</NavLink>
          <NavLink to="/pharmacy" className={({ isActive }) => (isActive ? 'active' : '')}>약제부</NavLink>
        </nav>
      </header>
      <main className="content">{children}</main>
      <footer className="footer">© {new Date().getFullYear()} Neture · {BRAND.name} — 원내 자료는 이 브라우저에만 저장됩니다. 환자 정보는 다루지 않습니다.</footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/ward" element={<WardPage />} />
          <Route path="/pharmacy" element={<PharmacyDeptPage />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  );
}

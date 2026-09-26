import { BrowserRouter, Routes, Route, Link, NavLink, Navigate } from 'react-router-dom';
import { detectBasename } from './lib/basename';
import { detectBrowserSupport, SUPPORTED_BROWSER_NOTICE } from './lib/browserSupport';
import { HOSPITAL_DRUG_FILE_NAME } from './lib/localDrugFile';
import { BRAND } from './config/service';
import { LocalDrugProvider, useLocalDrugs } from './contexts/LocalDrugContext';
import FolderGate from './components/FolderGate';
import HomePage from './pages/HomePage';
import WardPage from './pages/WardPage';
import PharmacyDeptPage from './pages/PharmacyDeptPage';

/** 헤더 — 개인 로그인이 아니라 **원내 약품 파일 연결 상태**만 보여준다(§1·§14). */
function FileStatusArea() {
  const { status, file } = useLocalDrugs();
  if (status === 'ready' && file) {
    return <span className="muted">원내 약품 파일: {file.rows.length}건</span>;
  }
  if (status === 'unsupported') return <span className="muted">지원 브라우저 아님</span>;
  if (status === 'checking' || status === 'loading') return <span className="muted">확인 중…</span>;
  return <span className="muted">{HOSPITAL_DRUG_FILE_NAME} 미연결</span>;
}

function AppShell({ children }: { children: React.ReactNode }) {
  const { hasFileSystemAccess, officiallySupported } = detectBrowserSupport();
  return (
    <div className="site">
      <header className="header">
        <Link to="/" className="brand">{BRAND.name} <span className="muted">| Neture</span></Link>
        <nav className="nav">
          <NavLink to="/ward" className={({ isActive }) => (isActive ? 'active' : '')}>병동</NavLink>
          <NavLink to="/pharmacy" className={({ isActive }) => (isActive ? 'active' : '')}>원내 약품 파일</NavLink>
          <FileStatusArea />
        </nav>
      </header>
      {/* 동작은 하지만 공식 지원 대상이 아닌 브라우저(Whale·Opera 등) — 안내만(§17). */}
      {hasFileSystemAccess && !officiallySupported && (
        <div className="tool" style={{ paddingBottom: 0 }}>
          <div className="notice" style={{ marginTop: 0 }}>{SUPPORTED_BROWSER_NOTICE} 지금 브라우저는 공식 지원 대상이 아닙니다.</div>
        </div>
      )}
      <main className="content">{children}</main>
      <footer className="footer">
        © {new Date().getFullYear()} Neture · {BRAND.name} — 원내 약품 파일은 이 PC 에서만 읽고 서버에 올리지 않습니다. 환자 정보는 다루지 않습니다.
      </footer>
    </div>
  );
}

/**
 * 무로그인 공용 업무 앱(WO-O4O-HOSPITAL-PHARMACY-V1-FIXED-LOCAL-FILE-AND-LOGINLESS-SIMPLIFICATION).
 * 개인 로그인 · device enrollment · /manage 는 없다. 진입 통제는 원내 약품 폴더 연결(FolderGate)뿐이다.
 */
export default function App() {
  return (
    <BrowserRouter basename={detectBasename()}>
      <LocalDrugProvider>
        <AppShell>
          <FolderGate>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/ward" element={<WardPage />} />
              <Route path="/pharmacy" element={<PharmacyDeptPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </FolderGate>
        </AppShell>
      </LocalDrugProvider>
    </BrowserRouter>
  );
}

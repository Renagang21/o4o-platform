/**
 * App - K-Cosmetics
 * WO-KCOS-HOME-UI-V1
 *
 * 라우팅 설정:
 * - / : 홈 (한국어 고정)
 * - /stores : 매장 디렉토리 (영어 기본, 다국어)
 * - /stores/:storeSlug : 개별 매장 (한국어 기본, 다국어)
 * - /tourists : 관광객 안내
 * - /partners : 파트너 안내
 * - /suppliers : 공급사 참여 안내 (B2B)
 * - /about : 플랫폼 소개
 * - /contact : 문의
 * - /admin, /supplier, /seller, /partner : 역할별 대시보드
 */

import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Layout } from './components';
import { RoleSwitcher } from './components/RoleSwitcher';
import { AuthProvider, useAuth } from './contexts';
import {
  HomePage,
  LoginPage,
  StoresPage,
  StoreDetailPage,
  TouristsPage,
  PartnersPage,
  SuppliersPage,
  AboutPage,
  ContactPage,
  AdminDashboardPage,
  SupplierDashboardPage,
  SellerDashboardPage,
  PartnerDashboardPage,
} from './pages';

const SERVICE_NAME = 'K-Cosmetics';

function AppContent() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <Layout serviceName={SERVICE_NAME}>
      <nav style={navStyle}>
        <div style={navLeftStyle}>
          <Link to="/" style={linkStyle}>홈</Link>
          <Link to="/stores" style={linkStyle}>매장</Link>
          <Link to="/tourists" style={linkStyle}>관광객</Link>
          <Link to="/about" style={linkStyle}>소개</Link>
        </div>
        <div style={navRightStyle}>
          {isAuthenticated ? (
            <>
              <RoleSwitcher />
              <span style={userInfoStyle}>{user?.name}</span>
              <button onClick={logout} style={logoutButtonStyle}>로그아웃</button>
            </>
          ) : (
            <Link to="/login" style={linkStyle}>로그인</Link>
          )}
        </div>
      </nav>
      <Routes>
        {/* 메인 홈 */}
        <Route path="/" element={<HomePage />} />

        {/* 로그인 */}
        <Route path="/login" element={<LoginPage />} />

        {/* 매장 디렉토리 */}
        <Route path="/stores" element={<StoresPage />} />
        <Route path="/stores/:storeSlug" element={<StoreDetailPage />} />

        {/* 관광객 안내 */}
        <Route path="/tourists" element={<TouristsPage />} />

        {/* 파트너 안내 */}
        <Route path="/partners" element={<PartnersPage />} />

        {/* 공급사 참여 안내 (B2B) */}
        <Route path="/suppliers" element={<SuppliersPage />} />

        {/* 플랫폼 소개 */}
        <Route path="/about" element={<AboutPage />} />

        {/* 문의 */}
        <Route path="/contact" element={<ContactPage />} />

        {/* 대시보드 */}
        <Route path="/admin/*" element={<AdminDashboardPage />} />
        <Route path="/supplier/*" element={<SupplierDashboardPage />} />
        <Route path="/seller/*" element={<SellerDashboardPage />} />
        <Route path="/partner/*" element={<PartnerDashboardPage />} />

        {/* 404 - 홈으로 리다이렉트 */}
        <Route path="*" element={<HomePage />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

const navStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px 20px',
  borderBottom: '1px solid #fce4ec',
  marginBottom: '20px',
};

const navLeftStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '15px',
};

const navRightStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
};

const linkStyle: React.CSSProperties = {
  color: '#FF6B9D',
  textDecoration: 'none',
};

const userInfoStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#333',
};

const logoutButtonStyle: React.CSSProperties = {
  padding: '6px 12px',
  backgroundColor: '#FFF0F5',
  border: '1px solid #fce4ec',
  borderRadius: '6px',
  fontSize: '13px',
  color: '#FF6B9D',
  cursor: 'pointer',
};

export default App;

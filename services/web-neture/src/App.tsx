import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Layout, RoleSwitcher } from './components';
import { AuthProvider, useAuth } from './contexts';
import {
  HomePage,
  LoginPage,
  TrialListPage,
  TrialDetailPage,
  ShippingAddressPage,
  FulfillmentStatusPage,
  AdminDashboardPage,
  SupplierDashboardPage,
  SellerDashboardPage,
  PartnerDashboardPage,
  StoreHomePage,
  StoreProductPage,
} from './pages';

/**
 * Neture - 전자상거래 판매자 지원 서비스
 * Phase H8-FE: Trial Observation Frontend
 */

const SERVICE_NAME = 'Neture';

function AppContent() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <Layout serviceName={SERVICE_NAME}>
      <nav style={navStyle}>
        <div style={navLeftStyle}>
          <Link to="/" style={linkStyle}>홈</Link>
          <Link to="/trials" style={linkStyle}>Trial 목록</Link>
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
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/trials" element={<TrialListPage />} />
        <Route path="/trial/:trialId" element={<TrialDetailPage />} />
        <Route path="/shipping/:participationId" element={<ShippingAddressPage />} />
        <Route path="/fulfillment/:participationId" element={<FulfillmentStatusPage />} />

        {/* 대시보드 */}
        <Route path="/admin/*" element={<AdminDashboardPage />} />
        <Route path="/supplier/*" element={<SupplierDashboardPage />} />
        <Route path="/seller/*" element={<SellerDashboardPage />} />
        <Route path="/partner/*" element={<PartnerDashboardPage />} />

        {/* 판매자 매장 */}
        <Route path="/store/:storeId" element={<StoreHomePage />} />
        <Route path="/store/:storeId/product/:productId" element={<StoreProductPage />} />
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
  borderBottom: '1px solid #ddd',
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
  color: '#0066cc',
  textDecoration: 'none',
};

const userInfoStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#333',
};

const logoutButtonStyle: React.CSSProperties = {
  padding: '6px 12px',
  backgroundColor: '#f1f5f9',
  border: '1px solid #e2e8f0',
  borderRadius: '6px',
  fontSize: '13px',
  color: '#64748B',
  cursor: 'pointer',
};

export default App;

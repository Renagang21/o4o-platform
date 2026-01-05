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
  PartnerDashboardPage,
  SupplierOverviewPage,
  PartnerOverviewPage,
  ProcurementHomePage,
  CategoryListPage,
  ProductDetailPage,
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
      {/* 인증 상태 표시 - Layout의 Navigation과 별도로 역할 전환/로그인 기능 제공 */}
      <div style={authBarStyle}>
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
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/trials" element={<TrialListPage />} />
        <Route path="/trial/:trialId" element={<TrialDetailPage />} />
        <Route path="/shipping/:participationId" element={<ShippingAddressPage />} />
        <Route path="/fulfillment/:participationId" element={<FulfillmentStatusPage />} />

        {/* 대시보드 */}
        <Route path="/admin/*" element={<AdminDashboardPage />} />

        {/* Supplier 라우트 - Overview가 첫 진입점 */}
        <Route path="/supplier" element={<SupplierOverviewPage />} />
        <Route path="/supplier/overview" element={<SupplierOverviewPage />} />
        <Route path="/supplier/*" element={<SupplierDashboardPage />} />

        {/* Partner 라우트 - Overview가 첫 진입점 */}
        <Route path="/partner" element={<PartnerOverviewPage />} />
        <Route path="/partner/overview" element={<PartnerOverviewPage />} />
        <Route path="/partner/*" element={<PartnerDashboardPage />} />

        {/* B2B 조달 */}
        <Route path="/procurement" element={<ProcurementHomePage />} />
        <Route path="/procurement/category/:categoryId" element={<CategoryListPage />} />
        <Route path="/procurement/product/:productId" element={<ProductDetailPage />} />
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

const authBarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',
  gap: '12px',
  padding: '10px 20px',
  borderBottom: '1px solid #e2e8f0',
  backgroundColor: '#f8fafc',
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

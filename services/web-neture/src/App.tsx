import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Layout } from './components';
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

function App() {
  return (
    <BrowserRouter>
      <Layout serviceName={SERVICE_NAME}>
        <nav style={navStyle}>
          <Link to="/" style={linkStyle}>홈</Link>
          <Link to="/trials" style={linkStyle}>Trial 목록</Link>
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
    </BrowserRouter>
  );
}

const navStyle: React.CSSProperties = {
  padding: '10px 20px',
  borderBottom: '1px solid #ddd',
  marginBottom: '20px',
};

const linkStyle: React.CSSProperties = {
  marginRight: '15px',
  color: '#0066cc',
  textDecoration: 'none',
};

export default App;

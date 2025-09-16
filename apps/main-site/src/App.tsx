import { FC, useEffect  } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import PostDetail from './pages/PostDetail';
import { useAuthStore } from './stores/authStore';
import { DevAuthProvider } from './lib/DevAuthProvider';
import { initializeAuthInterceptor } from './services/authInterceptor';

// Auth Pages
import Login from './pages/auth/Login';
import AuthCallbackV2 from './pages/auth/AuthCallbackV2';
import { OAuthCallback } from './pages/auth/OAuthCallback';
import { EmailVerificationPending } from './pages/auth/EmailVerificationPending';
import { EmailVerificationSuccess } from './pages/auth/EmailVerificationSuccess';
import { EmailVerificationError } from './pages/auth/EmailVerificationError';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// User Type Dashboards (non-shared components)
import AdminDashboard from './pages/admin/Dashboard';
import SupplierDashboard from './pages/supplier/Dashboard';
import SupplierProductList from './pages/supplier/ProductList';
import SupplierProductForm from './pages/supplier/ProductForm';
import SupplierProductDetail from './pages/supplier/ProductDetail';
import RetailerDashboard from './pages/retailer/Dashboard';
import CustomerShop from './pages/customer/Shop';

// Digital Signage Pages
import DigitalSignageDashboard from './pages/signage/DigitalSignageDashboard';

// Temporarily disabled: import TheDANGStyleEditorPage from './pages/TheDANGStyleEditorPage';

// Test Dashboard
import { TestDashboard } from './features/test-dashboard';
import SessionSyncTest from './pages/test/SessionSyncTest';

// Demo Pages
import SpectraBlocksDemo from './pages/SpectraBlocksDemo';

// Components
import PrivateRoute from './components/auth/PrivateRoute';
import { ErrorBoundary } from './components/ErrorBoundary';

// Temporary placeholder for disabled features
const DisabledFeaturePage: FC = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Feature Temporarily Disabled</h1>
      <p className="text-gray-600">This feature is temporarily disabled during production build conversion.</p>
    </div>
  </div>
);

const App: FC = () => {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    // Initialize auth interceptor
    initializeAuthInterceptor();
    
    // 앱 시작 시 인증 상태 확인
    checkAuth();
  }, []);

  return (
    <ErrorBoundary>
      <DevAuthProvider>
        <Router>
          <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/posts/:slugOrId" element={
            <Layout>
              <PostDetail />
            </Layout>
          } />
          <Route path="/login" element={
            <Layout>
              <Login />
            </Layout>
          } />
          <Route path="/auth/callback" element={<AuthCallbackV2 />} />
          <Route path="/auth/callback/:provider" element={<OAuthCallback />} />
          <Route path="/auth/verify-email/pending" element={
            <Layout>
              <EmailVerificationPending />
            </Layout>
          } />
          <Route path="/auth/verify-email/success" element={
            <Layout>
              <EmailVerificationSuccess />
            </Layout>
          } />
          <Route path="/auth/verify-email/error" element={
            <Layout>
              <EmailVerificationError />
            </Layout>
          } />
          <Route path="/auth/forgot-password" element={
            <Layout>
              <ForgotPassword />
            </Layout>
          } />
          <Route path="/auth/reset-password" element={
            <Layout>
              <ResetPassword />
            </Layout>
          } />
          
          {/* Protected Admin Routes */}
          <Route path="/admin" element={
            <PrivateRoute allowedRoles={['admin']}>
              <Layout>
                <AdminDashboard />
              </Layout>
            </PrivateRoute>
          } />
          
          {/* Protected Supplier Routes */}
          <Route path="/supplier" element={
            <PrivateRoute allowedRoles={['supplier']}>
              <Layout>
                <SupplierDashboard />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/supplier/products" element={
            <PrivateRoute allowedRoles={['supplier']}>
              <Layout>
                <SupplierProductList />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/supplier/products/new" element={
            <PrivateRoute allowedRoles={['supplier']}>
              <Layout>
                <SupplierProductForm />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/supplier/products/:id" element={
            <PrivateRoute allowedRoles={['supplier']}>
              <Layout>
                <SupplierProductDetail />
              </Layout>
            </PrivateRoute>
          } />
          
          {/* Protected Retailer Routes */}
          <Route path="/retailer" element={
            <PrivateRoute allowedRoles={['retailer']}>
              <Layout>
                <RetailerDashboard />
              </Layout>
            </PrivateRoute>
          } />
          
          {/* Customer Routes */}
          <Route path="/shop" element={
            <Layout>
              <CustomerShop />
            </Layout>
          } />
          
          {/* Digital Signage Routes */}
          <Route
            path="/signage"
            element={
                <PrivateRoute allowedUserTypes={['admin', 'manager']}>
                  <Layout>
                    <DigitalSignageDashboard />
                  </Layout>
                </PrivateRoute>
            }
          />
          <Route
            path="/signage/*"
            element={
                <PrivateRoute allowedUserTypes={['admin', 'manager']}>
                  <Layout>
                    <DigitalSignageDashboard />
                  </Layout>
                </PrivateRoute>
            }
          />

          {/* Test Dashboard */}
          <Route path="/test-dashboard" element={
            <Layout>
              <TestDashboard />
            </Layout>
          } />
          <Route path="/test/session-sync" element={
            <Layout>
              <SessionSyncTest />
            </Layout>
          } />
          
          {/* Demo Pages */}
          <Route path="/spectra-blocks-demo" element={
            <Layout>
              <SpectraBlocksDemo />
            </Layout>
          } />
          
          {/* Temporarily Disabled Features - will be restored after shared components are fixed */}
          <Route path="/editor" element={
            <Layout>
              <DisabledFeaturePage />
            </Layout>
          } />
          <Route path="/editor-demo" element={
            <Layout>
              <DisabledFeaturePage />
            </Layout>
          } />
          <Route path="/thedang-editor" element={
            <Layout>
              <DisabledFeaturePage />
            </Layout>
          } />
          <Route path="/fullscreen-editor" element={
            <Layout>
              <DisabledFeaturePage />
            </Layout>
          } />
          <Route path="/admin-test" element={
            <Layout>
              <DisabledFeaturePage />
            </Layout>
          } />
          <Route path="/dropshipping" element={
            <Layout>
              <DisabledFeaturePage />
            </Layout>
          } />
          <Route path="/healthcare" element={
            <Layout>
              <DisabledFeaturePage />
            </Layout>
          } />
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </DevAuthProvider>
    </ErrorBoundary>
  );
};

export default App;

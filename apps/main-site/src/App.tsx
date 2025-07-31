import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { DevAuthProvider } from './lib/DevAuthProvider';

// Auth Pages
import Login from './pages/auth/Login';
import AuthCallback from './pages/auth/AuthCallback';

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

// TheDANG Style Home (without editor)
import TheDANGStyleHome from './pages/TheDANGStyleHome';
import HomeDynamic from './pages/HomeDynamic';
import HomeWithSettings from './pages/HomeWithSettings';
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
const DisabledFeaturePage: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Feature Temporarily Disabled</h1>
      <p className="text-gray-600">This feature is temporarily disabled during production build conversion.</p>
    </div>
  </div>
);

const App: React.FC = () => {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    // 앱 시작 시 인증 상태 확인
    checkAuth();
  }, []);

  return (
    <ErrorBoundary>
      <DevAuthProvider>
        <Router>
          <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomeWithSettings />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          
          {/* Protected Admin Routes */}
          <Route path="/admin" element={
            <PrivateRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </PrivateRoute>
          } />
          
          {/* Protected Supplier Routes */}
          <Route path="/supplier" element={
            <PrivateRoute allowedRoles={['supplier']}>
              <SupplierDashboard />
            </PrivateRoute>
          } />
          <Route path="/supplier/products" element={
            <PrivateRoute allowedRoles={['supplier']}>
              <SupplierProductList />
            </PrivateRoute>
          } />
          <Route path="/supplier/products/new" element={
            <PrivateRoute allowedRoles={['supplier']}>
              <SupplierProductForm />
            </PrivateRoute>
          } />
          <Route path="/supplier/products/:id" element={
            <PrivateRoute allowedRoles={['supplier']}>
              <SupplierProductDetail />
            </PrivateRoute>
          } />
          
          {/* Protected Retailer Routes */}
          <Route path="/retailer" element={
            <PrivateRoute allowedRoles={['retailer']}>
              <RetailerDashboard />
            </PrivateRoute>
          } />
          
          {/* Customer Routes */}
          <Route path="/shop" element={<CustomerShop />} />
          
          {/* Digital Signage Routes */}
          <Route
            path="/signage"
            element={
                <PrivateRoute allowedUserTypes={['admin', 'manager']}>
                  <DigitalSignageDashboard />
                </PrivateRoute>
            }
          />
          <Route
            path="/signage/*"
            element={
                <PrivateRoute allowedUserTypes={['admin', 'manager']}>
                  <DigitalSignageDashboard />
                </PrivateRoute>
            }
          />

          {/* Test Dashboard */}
          <Route path="/test-dashboard" element={<TestDashboard />} />
          <Route path="/test/session-sync" element={<SessionSyncTest />} />
          
          {/* Demo Pages */}
          <Route path="/spectra-blocks-demo" element={<SpectraBlocksDemo />} />
          
          {/* Temporarily Disabled Features - will be restored after shared components are fixed */}
          <Route path="/editor" element={<DisabledFeaturePage />} />
          <Route path="/editor-demo" element={<DisabledFeaturePage />} />
          <Route path="/thedang-editor" element={<DisabledFeaturePage />} />
          <Route path="/fullscreen-editor" element={<DisabledFeaturePage />} />
          <Route path="/admin-test" element={<DisabledFeaturePage />} />
          <Route path="/dropshipping" element={<DisabledFeaturePage />} />
          <Route path="/healthcare" element={<DisabledFeaturePage />} />
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </DevAuthProvider>
    </ErrorBoundary>
  );
};

export default App;
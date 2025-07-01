import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';

// Auth Pages
import Login from './pages/auth/Login';
import AuthCallback from './pages/auth/AuthCallback';

// User Type Dashboards
import AdminDashboard from './pages/admin/Dashboard';
import SupplierDashboard from './pages/supplier/Dashboard';
import SupplierProductList from './pages/supplier/ProductList';
import SupplierProductForm from './pages/supplier/ProductForm';
import SupplierProductDetail from './pages/supplier/ProductDetail';
import RetailerDashboard from './pages/retailer/Dashboard';
import CustomerShop from './pages/customer/Shop';

// Digital Signage Pages
import DigitalSignageDashboard from './pages/signage/DigitalSignageDashboard';

// TheDANG Style Home
import TheDANGStyleHome from './pages/TheDANGStyleHome';
import TheDANGStyleEditorPage from './pages/TheDANGStyleEditorPage';

// Fullscreen Editor Test
import { FullScreenEditorSimpleTest } from './pages/FullScreenEditorSimpleTest';

// Admin Dashboard Test
import { AdminDashboardTest } from './pages/AdminDashboardTest';

// Dropshipping
import { DropshippingPage } from './pages/DropshippingPage';

// Healthcare
import { HealthcarePage } from './pages/healthcare';
import HealthcareDemo from './components/healthcare/HealthcareDemo';

// Components
import PrivateRoute from './components/auth/PrivateRoute';
import { ErrorBoundary } from './components/ErrorBoundary';

const App: React.FC = () => {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    // 앱 시작 시 인증 상태 확인
    checkAuth();
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Toast 컴포넌트 임시 제거 - 504 에러 해결 후 복구 예정 */}
        
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<TheDANGStyleHome />} />
          <Route path="/home" element={<TheDANGStyleHome />} />
          <Route path="/editor/home" element={
            <ErrorBoundary fallback={
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">에디터 홈 페이지 오류</h2>
                  <p className="text-gray-600 mb-4">에디터 홈 페이지에 일시적인 문제가 있습니다.</p>
                  <a href="/healthcare" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    헬스케어 페이지로 이동
                  </a>
                </div>
              </div>
            }>
              <TheDANGStyleEditorPage />
            </ErrorBoundary>
          } />
          <Route path="/editor-fullscreen" element={
            <ErrorBoundary fallback={
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">편집기 페이지 오류</h2>
                  <p className="text-gray-600 mb-4">편집기 페이지에 일시적인 문제가 있습니다.</p>
                  <a href="/healthcare" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    헬스케어 페이지로 이동
                  </a>
                </div>
              </div>
            }>
              <FullScreenEditorSimpleTest />
            </ErrorBoundary>
          } />
          <Route path="/admin-test/*" element={
            <ErrorBoundary fallback={
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">관리자 테스트 페이지 오류</h2>
                  <p className="text-gray-600 mb-4">관리자 테스트 페이지에 일시적인 문제가 있습니다.</p>
                  <a href="/healthcare" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    헬스케어 페이지로 이동
                  </a>
                </div>
              </div>
            }>
              <AdminDashboardTest />
            </ErrorBoundary>
          } />
          <Route path="/dropshipping/*" element={
            <ErrorBoundary fallback={
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">드랍쉬핑 페이지 오류</h2>
                  <p className="text-gray-600 mb-4">드랍쉬핑 페이지에 일시적인 문제가 있습니다.</p>
                  <a href="/healthcare" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    헬스케어 페이지로 이동
                  </a>
                </div>
              </div>
            }>
              <DropshippingPage />
            </ErrorBoundary>
          } />
          <Route path="/healthcare" element={<HealthcarePage />} />
          <Route path="/healthcare/demo" element={<HealthcareDemo />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          
          {/* Protected Routes - Admin */}
          <Route
            path="/admin/dashboard"
            element={
              <PrivateRoute allowedUserTypes={['admin']}>
                <AdminDashboard />
              </PrivateRoute>
            }
          />
          
          {/* Protected Routes - Supplier */}
          <Route
            path="/supplier/dashboard"
            element={
              <PrivateRoute allowedUserTypes={['supplier']}>
                <SupplierDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/supplier/products"
            element={
              <PrivateRoute allowedUserTypes={['supplier']}>
                <SupplierProductList />
              </PrivateRoute>
            }
          />
          <Route
            path="/supplier/products/new"
            element={
              <PrivateRoute allowedUserTypes={['supplier']}>
                <SupplierProductForm />
              </PrivateRoute>
            }
          />
          <Route
            path="/supplier/products/:id"
            element={
              <PrivateRoute allowedUserTypes={['supplier']}>
                <SupplierProductDetail />
              </PrivateRoute>
            }
          />
          <Route
            path="/supplier/products/:id/edit"
            element={
              <PrivateRoute allowedUserTypes={['supplier']}>
                <SupplierProductForm />
              </PrivateRoute>
            }
          />
          
          {/* Protected Routes - Retailer */}
          <Route
            path="/retailer/dashboard"
            element={
              <PrivateRoute allowedUserTypes={['retailer']}>
                <RetailerDashboard />
              </PrivateRoute>
            }
          />
          
          {/* Protected Routes - Customer */}
          <Route
            path="/shop"
            element={
              <PrivateRoute allowedUserTypes={['customer']}>
                <CustomerShop />
              </PrivateRoute>
            }
          />

          {/* Digital Signage Routes */}
          <Route
            path="/signage"
            element={
              <ErrorBoundary fallback={
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">디지털 사이니지 페이지 오류</h2>
                    <p className="text-gray-600 mb-4">디지털 사이니지 페이지에 일시적인 문제가 있습니다.</p>
                    <a href="/healthcare" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      헬스케어 페이지로 이동
                    </a>
                  </div>
                </div>
              }>
                <PrivateRoute allowedUserTypes={['admin', 'manager']}>
                  <DigitalSignageDashboard />
                </PrivateRoute>
              </ErrorBoundary>
            }
          />
          <Route
            path="/signage/*"
            element={
              <ErrorBoundary fallback={
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">디지털 사이니지 페이지 오류</h2>
                    <p className="text-gray-600 mb-4">디지털 사이니지 페이지에 일시적인 문제가 있습니다.</p>
                    <a href="/healthcare" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      헬스케어 페이지로 이동
                    </a>
                  </div>
                </div>
              }>
                <PrivateRoute allowedUserTypes={['admin', 'manager']}>
                  <DigitalSignageDashboard />
                </PrivateRoute>
              </ErrorBoundary>
            }
          />

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/auth/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
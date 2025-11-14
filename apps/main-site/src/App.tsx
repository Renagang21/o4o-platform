import { FC, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import PostDetail from './pages/PostDetail';
import { useAuth } from './contexts/AuthContext';
import { initializeAuthInterceptor } from './services/authInterceptor';

// Auth Pages
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import Logout from './pages/auth/Logout';
import FindId from './pages/auth/FindId';
import FindPassword from './pages/auth/FindPassword';
import { OAuthCallback } from './pages/auth/OAuthCallback';
import { EmailVerificationPending } from './pages/auth/EmailVerificationPending';
import { EmailVerificationSuccess } from './pages/auth/EmailVerificationSuccess';
import { EmailVerificationError } from './pages/auth/EmailVerificationError';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Archive Pages
import CPTArchive from './pages/archive/CPTArchive';
import BlogArchivePage from './pages/BlogArchive';

// Components
import PrivateRoute from './components/auth/PrivateRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GlobalStyleInjector } from './components/GlobalStyleInjector';

// P0 RBAC: Role-based components
import RoleGuard from './components/auth/RoleGuard';

// P0 RBAC: Application pages
import ApplySupplier from './pages/apply/ApplySupplier';
import ApplySeller from './pages/apply/ApplySeller';
import ApplyPartner from './pages/apply/ApplyPartner';
import ApplyStatus from './pages/apply/ApplyStatus';

// P0 RBAC: Dashboard layouts and pages
import { SupplierLayout } from './components/dashboard/supplier/SupplierLayout';
import { SellerLayout } from './components/dashboard/seller/SellerLayout';
import { PartnerLayout } from './components/dashboard/partner/PartnerLayout';
import { SupplierDashboardPage } from './pages/dashboard/SupplierDashboardPage';
import { SupplierProductsPage } from './pages/dashboard/SupplierProductsPage';
import { SupplierProductCreatePage } from './pages/dashboard/SupplierProductCreatePage';
import { SupplierProductEditPage } from './pages/dashboard/SupplierProductEditPage';
import { SupplierOrdersPage } from './pages/dashboard/SupplierOrdersPage';
import { SellerDashboardPage } from './pages/dashboard/SellerDashboardPage';
import { SellerProductsPage } from './pages/dashboard/SellerProductsPage';
import { PartnerDashboardPage } from './pages/dashboard/PartnerDashboardPage';
import { PartnerLinksPage } from './pages/dashboard/PartnerLinksPage';

// Lazy load pages
import { lazy, Suspense } from 'react';
const PageEditor = lazy(() => import('./pages/PageEditor'));
const PageViewer = lazy(() => import('./pages/PageViewer'));
const PublicPage = lazy(() => import('./pages/PublicPage'));

// Loading component
const PageLoader: FC = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
);

// Admin redirect component
const RedirectToAdmin: FC = () => {
  useEffect(() => {
    const adminUrl = import.meta.env.VITE_ADMIN_URL || 'https://admin.neture.co.kr';
    window.location.href = adminUrl;
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">관리자 페이지로 이동 중...</p>
      </div>
    </div>
  );
};

const App: FC = () => {
  useEffect(() => {
    // Initialize auth interceptor
    initializeAuthInterceptor();

    // Note: Auth status check is handled by AuthContext on mount
    // No need to call checkAuthStatus here to avoid duplicate API calls
  }, []);

  return (
    <ErrorBoundary>
      <GlobalStyleInjector />
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          
          {/* Post/Page Routes */}
          <Route path="/posts/:slugOrId" element={
            <Layout>
              <PostDetail />
            </Layout>
          } />
          <Route path="/pages/:slug" element={
            <Layout>
              <PageViewer />
            </Layout>
          } />
          
          {/* Archive Routes */}
          <Route path="/blog" element={<BlogArchivePage />} />
          <Route path="/blog/:slugOrId" element={
            <Layout>
              <PostDetail />
            </Layout>
          } />
          <Route path="/archive/:postType" element={
            <Layout>
              <CPTArchive />
            </Layout>
          } />
          
          {/* Auth Routes */}
          {/* Signup - Hardcoded */}
          <Route path="/signup" element={<Signup />} />
          <Route path="/register" element={<Signup />} />
          <Route path="/auth/signup" element={<Signup />} />
          <Route path="/auth/register" element={<Signup />} />

          {/* Logout - Hardcoded (auto-processing page, no customization needed) */}
          <Route path="/logout" element={<Logout />} />

          {/* OAuth Callbacks - Hardcoded (redirect-only, no layout needed) */}
          <Route path="/auth/callback" element={<OAuthCallback />} />
          <Route path="/auth/callback/:provider" element={<OAuthCallback />} />

          {/* Note: /login, /find-id, /find-password are handled by PublicPage (/:slug pattern)
               This allows content editors to customize these pages via page editor with shortcodes:
               - [login_form] or [social_login]
               - [find_id]
               - [find_password] */}
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

          {/* P0 RBAC: Application Routes */}
          <Route path="/apply/supplier" element={
            <PrivateRoute>
              <ApplySupplier />
            </PrivateRoute>
          } />
          <Route path="/apply/seller" element={
            <PrivateRoute>
              <ApplySeller />
            </PrivateRoute>
          } />
          <Route path="/apply/partner" element={
            <PrivateRoute>
              <ApplyPartner />
            </PrivateRoute>
          } />
          <Route path="/apply/:role/status" element={
            <PrivateRoute>
              <ApplyStatus />
            </PrivateRoute>
          } />

          {/* P0 RBAC: Dashboard Routes (Role-Protected) with Nested Routes */}
          <Route path="/dashboard/supplier/*" element={
            <PrivateRoute>
              <RoleGuard role="supplier">
                <SupplierLayout />
              </RoleGuard>
            </PrivateRoute>
          }>
            <Route index element={<SupplierDashboardPage />} />
            <Route path="products" element={<SupplierProductsPage />} />
            <Route path="products/new" element={<SupplierProductCreatePage />} />
            <Route path="products/:id/edit" element={<SupplierProductEditPage />} />
            <Route path="orders" element={<SupplierOrdersPage />} />
          </Route>

          <Route path="/dashboard/seller/*" element={
            <PrivateRoute>
              <RoleGuard role="seller">
                <SellerLayout />
              </RoleGuard>
            </PrivateRoute>
          }>
            <Route index element={<SellerDashboardPage />} />
            <Route path="products" element={<SellerProductsPage />} />
          </Route>

          <Route path="/dashboard/partner/*" element={
            <PrivateRoute>
              <RoleGuard role="partner">
                <PartnerLayout />
              </RoleGuard>
            </PrivateRoute>
          }>
            <Route index element={<PartnerDashboardPage />} />
            <Route path="links" element={<PartnerLinksPage />} />
          </Route>

          {/* Editor Routes (Protected) */}
          <Route path="/editor/page/:id?" element={
            <PrivateRoute>
              <Suspense fallback={<PageLoader />}>
                <PageEditor />
              </Suspense>
            </PrivateRoute>
          } />

          {/* Admin Redirect (must be before /:slug catch-all) */}
          <Route path="/admin" element={
            <RedirectToAdmin />
          } />
          <Route path="/admin/*" element={
            <RedirectToAdmin />
          } />

          {/* WordPress-style: Direct page slug access (must be before 404) */}
          {/* Multi-level page routing: /section/subsection */}
          <Route path="/:section/:subsection" element={
            <Suspense fallback={<PageLoader />}>
              <PublicPage />
            </Suspense>
          } />
          {/* Single-level page routing: /slug */}
          <Route path="/:slug" element={
            <Suspense fallback={<PageLoader />}>
              <PublicPage />
            </Suspense>
          } />

          {/* 404 Fallback */}
          <Route path="*" element={
            <Layout>
              <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                  <p className="text-gray-600 mb-4">페이지를 찾을 수 없습니다.</p>
                  <a href="/" className="text-blue-600 hover:underline">홈으로 돌아가기</a>
                </div>
              </div>
            </Layout>
          } />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
};

export default App;
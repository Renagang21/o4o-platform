import { FC, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import PostDetail from './pages/PostDetail';
import { useAuth } from './contexts/AuthContext';
import { initializeAuthInterceptor } from './services/authInterceptor';

// Auth Pages
import Login from './pages/auth/Login';
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

const App: FC = () => {
  const { checkAuthStatus } = useAuth();

  useEffect(() => {
    // Initialize auth interceptor
    initializeAuthInterceptor();

    // Check auth status on app start
    checkAuthStatus();
  }, [checkAuthStatus]);

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
          
          {/* Editor Routes (Protected) */}
          <Route path="/editor/page/:id?" element={
            <PrivateRoute>
              <Suspense fallback={<PageLoader />}>
                <PageEditor />
              </Suspense>
            </PrivateRoute>
          } />

          {/* WordPress-style: Direct page slug access (must be before 404) */}
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
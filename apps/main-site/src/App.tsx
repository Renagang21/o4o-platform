import { FC, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import PostDetail from './pages/PostDetail';
import { useAuthStore } from './stores/authStore';
import { initializeAuthInterceptor } from './services/authInterceptor';

// Auth Pages
import { OAuthCallback } from './pages/auth/OAuthCallback';
import { EmailVerificationPending } from './pages/auth/EmailVerificationPending';
import { EmailVerificationSuccess } from './pages/auth/EmailVerificationSuccess';
import { EmailVerificationError } from './pages/auth/EmailVerificationError';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Archive Pages
import CPTArchive from './pages/archive/CPTArchive';

// Components
import PrivateRoute from './components/auth/PrivateRoute';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy load admin pages
import { lazy, Suspense } from 'react';
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const PageEditor = lazy(() => import('./pages/PageEditor'));
const PageViewer = lazy(() => import('./pages/PageViewer'));

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
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    // Initialize auth interceptor
    initializeAuthInterceptor();
    
    // Check auth status on app start
    checkAuth();
  }, []);

  return (
    <ErrorBoundary>
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
          <Route path="/archive/:postType" element={
            <Layout>
              <CPTArchive />
            </Layout>
          } />
          
          {/* Auth Routes */}
          <Route path="/auth/callback" element={<OAuthCallback />} />
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
          <Route path="/admin/*" element={
            <PrivateRoute>
              <Suspense fallback={<PageLoader />}>
                <AdminDashboard />
              </Suspense>
            </PrivateRoute>
          } />
          
          {/* Editor Routes (Protected) */}
          <Route path="/editor/page/:id?" element={
            <PrivateRoute>
              <Suspense fallback={<PageLoader />}>
                <PageEditor />
              </Suspense>
            </PrivateRoute>
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
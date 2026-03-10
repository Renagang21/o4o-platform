import { Route, Routes } from 'react-router-dom';
import { AdminProtectedRoute } from '@o4o/auth-context';
import { Suspense, lazy } from 'react';
import EditorLayout from '@/layouts/EditorLayout';
import InitialRedirect from '@/components/InitialRedirect';

// Import EditorRouteWrapper to handle route-based remounting
import EditorRouteWrapper from '@/pages/editor/EditorRouteWrapper';

const Login = lazy(() => import('@/pages/auth/Login'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'));
const PostPreview = lazy(() => import('@/pages/preview/PostPreview'));
const ViewPreview = lazy(() => import('@/pages/preview/ViewPreview'));
const StorefrontRouter = lazy(() => import('@/pages/storefront/StorefrontRouter'));

// Debug Pages
const AuthBootstrapDebug = lazy(() => import('@/pages/__debug__/AuthBootstrapDebug'));
const AuthStateJsonDebug = lazy(() => import('@/pages/__debug__/AuthStateJsonDebug'));
const LoginDiagnostic = lazy(() => import('@/pages/__debug__/LoginDiagnostic'));
const NeureTier1TestPage = lazy(() => import('@/pages/neture/Tier1TestPage'));
const AuthInspector = lazy(() => import('@/pages/test/AuthInspector'));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-blue"></div>
  </div>
);

/**
 * Public routes — outside AdminLayout
 * Login, password reset, preview, editor, storefront, debug pages
 */
export function PublicRoutes() {
  return [
    // 공개 라우트 - 로그인 페이지
    <Route key="/login" path="/login" element={
      <Suspense fallback={<PageLoader />}>
        <Login />
      </Suspense>
    } />,

    // 비밀번호 재설정 페이지
    <Route key="/forgot-password" path="/forgot-password" element={
      <Suspense fallback={<PageLoader />}>
        <ForgotPassword />
      </Suspense>
    } />,

    <Route key="/reset-password" path="/reset-password" element={
      <Suspense fallback={<PageLoader />}>
        <ResetPassword />
      </Suspense>
    } />,

    // Auth Inspector - Public test page for debugging auth issues
    <Route key="/auth-inspector" path="/auth-inspector" element={
      <Suspense fallback={<PageLoader />}>
        <AuthInspector />
      </Suspense>
    } />,

    // Auth Bootstrap Debug - WO-DEBUG-ADMIN-AUTH-BOOTSTRAP-001
    <Route key="/__debug__/auth-bootstrap" path="/__debug__/auth-bootstrap" element={
      <Suspense fallback={<PageLoader />}>
        <AuthBootstrapDebug />
      </Suspense>
    } />,

    // Auth State JSON Debug - WO-DEBUG-ADMIN-AUTH-STATE-JSON-001
    <Route key="/debug/auth" path="/debug/auth" element={
      <Suspense fallback={<PageLoader />}>
        <AuthStateJsonDebug />
      </Suspense>
    } />,

    // Login Diagnostic - CORS/API connectivity debug
    <Route key="/__debug__/login" path="/__debug__/login" element={
      <Suspense fallback={<PageLoader />}>
        <LoginDiagnostic />
      </Suspense>
    } />,

    // Neture Tier1 JSON Test Center - WO-NETURE-TIER1-PUBLIC-JSON-TEST-CENTER-V1
    <Route key="/__debug__/neture-tier1" path="/__debug__/neture-tier1" element={
      <Suspense fallback={<PageLoader />}>
        <NeureTier1TestPage />
      </Suspense>
    } />,

    // 루트 경로 - 인증 상태에 따라 리다이렉트
    <Route key="/" path="/" element={<InitialRedirect />} />,

    // 미리보기 페이지 - 인증 불필요 (sessionStorage 기반)
    <Route key="/admin/preview" path="/admin/preview" element={
      <Suspense fallback={<PageLoader />}>
        <PostPreview />
      </Suspense>
    } />,

    // 독립형 편집기 라우트 - 관리자 레이아웃 밖에서 실행
    <Route key="/editor/*" path="/editor/*" element={
      <AdminProtectedRoute
        requiredRoles={['admin']}
        requiredPermissions={['content:write']}
      >
        <EditorLayout>
          <Routes>
            <Route path="posts/new" element={
              <Suspense fallback={<PageLoader />}>
                <EditorRouteWrapper mode="post" />
              </Suspense>
            } />
            <Route path="posts/:id" element={
              <Suspense fallback={<PageLoader />}>
                <EditorRouteWrapper mode="post" />
              </Suspense>
            } />
            <Route path="pages/new" element={
              <Suspense fallback={<PageLoader />}>
                <EditorRouteWrapper mode="page" />
              </Suspense>
            } />
            <Route path="pages/:id" element={
              <Suspense fallback={<PageLoader />}>
                <EditorRouteWrapper mode="page" />
              </Suspense>
            } />
            <Route path="templates/:id" element={
              <Suspense fallback={<PageLoader />}>
                <EditorRouteWrapper mode="template" />
              </Suspense>
            } />
            <Route path="patterns/:id" element={
              <Suspense fallback={<PageLoader />}>
                <EditorRouteWrapper mode="pattern" />
              </Suspense>
            } />
          </Routes>
        </EditorLayout>
      </AdminProtectedRoute>
    } />,

    // Preview Routes
    <Route key="/preview/posts/:id" path="/preview/posts/:id" element={
      <Suspense fallback={<PageLoader />}>
        <PostPreview />
      </Suspense>
    } />,
    <Route key="/preview/pages/:id" path="/preview/pages/:id" element={
      <Suspense fallback={<PageLoader />}>
        <PostPreview />
      </Suspense>
    } />,
    <Route key="/preview/:slug" path="/preview/:slug" element={
      <Suspense fallback={<PageLoader />}>
        <ViewPreview />
      </Suspense>
    } />,

    // Storefront Routes (Phase 7-I) - Consumer-facing, no auth required
    <Route key="/storefront/*" path="/storefront/*" element={
      <Suspense fallback={<PageLoader />}>
        <StorefrontRouter />
      </Suspense>
    } />,
  ];
}

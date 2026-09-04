import { Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import InitialRedirect from '@/components/InitialRedirect';

/**
 * WO-O4O-LEGACY-WORDPRESS-BLOCK-EDITOR-DOMAIN-RETIREMENT-V1
 *
 * legacy WordPress(Gutenberg) block editor 축을 은퇴했다.
 * - `/editor/*` 6 route (posts/pages/templates/patterns) + `EditorLayout` + `EditorRouteWrapper`
 * - `/admin/preview` · `/preview/posts/:id` · `/preview/pages/:id` + `PostPreview`
 *
 * 근거: docs/checks/WO-O4O-LEGACY-WORDPRESS-BLOCK-EDITOR-DOMAIN-CENSUS-V1-CHECK.md
 * (백엔드 Post/Page 엔티티는 `6354e8755` 에서 제거돼 관련 endpoint 가 전부 404,
 *  저장 데이터 0, 메뉴 진입점 0, 외부 소비처 0)
 *
 * canonical 편집 축은 `RichTextEditor`(@o4o/content-editor) + `cms_contents` 이며,
 * CMS V2 미리보기 축인 `/preview/:slug` + `ViewPreview` 는 그대로 보존한다.
 */
const Login = lazy(() => import('@/pages/auth/Login'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'));
const ViewPreview = lazy(() => import('@/pages/preview/ViewPreview'));
const StorefrontRouter = lazy(() => import('@/pages/storefront/StorefrontRouter'));

// Debug Pages
const AuthBootstrapDebug = lazy(() => import('@/pages/__debug__/AuthBootstrapDebug'));
const AuthStateJsonDebug = lazy(() => import('@/pages/__debug__/AuthStateJsonDebug'));
const LoginDiagnostic = lazy(() => import('@/pages/__debug__/LoginDiagnostic'));
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

    // (제거됨) /__debug__/neture-tier1 — WO-O4O-TIER1-TEST-SURFACE-FINAL-LIFECYCLE-V1
    // 공개 라우트로 프로덕션 admin-dashboard 에 배포돼 있던 JSON 테스트 콘솔.
    // 백엔드 /__test__/tier1/* 와 함께 제거했다(프로덕션 호출 30일간 0건).

    // 루트 경로 - 인증 상태에 따라 리다이렉트
    <Route key="/" path="/" element={<InitialRedirect />} />,

    // Preview Routes — CMS V2 축만 유지한다.
    // (제거됨) /admin/preview · /preview/posts/:id · /preview/pages/:id — legacy PostPreview
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

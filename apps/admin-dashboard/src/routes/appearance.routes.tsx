import { Navigate, Route } from 'react-router-dom';
import { AdminProtectedRoute } from '@o4o/auth-context';
import { Suspense, lazy } from 'react';

// Appearance Pages
const SiteThemeSettings = lazy(() => import('@/pages/appearance/SiteThemeSettings'));
const GeneralSettings = lazy(() => import('@/pages/settings/GeneralSettings'));
const HeaderBuilder = lazy(() => import('@/pages/appearance/header-builder/HeaderBuilderPage'));

// WO-O4O-ADMIN-DASHBOARD-LEGACY-ROUTE-API-AND-NAVIGATION-CLOSURE-V1 (§8 · §9 · §10) — 제거 목록
//   판정 REMOVE_BROKEN_UI (backend 부재 · 메뉴 노출 0 · 프로덕션 30일 호출 0):
//     · `/appearance/menus/*`        pages/menus/** + api/menuApi  → backend `/api/v1/menus*` 부재
//     · `/appearance/template-parts` pages/appearance/TemplateParts → `/api/v1/template-parts*` 부재
//     · `/tools` · `/tools/media-replace` pages/ToolsPage(핸들러 없는 버튼) · tools/MediaFileReplace
//                                    → `/api/v1/media/:id/replace` 부재
//     · `/reusable-blocks`           inline "Coming Soon" placeholder (404 를 가리는 화면 금지, §9)
//   판정 REMOVE_FAKE_DATA:
//     · `/mail/templates` · `/mail/logs` pages/mail/{EmailTemplates,EmailLogs} → 하드코딩 sample
//       배열(`sampleLogs` · `defaultTemplates`)만 렌더. `/mail/smtp` 는 `/settings/email` 과
//       동일 컴포넌트(EmailSettings · backend `/api/v1/settings/:type` 실재)라 그쪽으로 redirect.
const LEGACY_MAIL_REDIRECT = '/settings/email';

// Settings
const Settings = lazy(() => import('@/pages/settings/Settings'));

// App Store
const AppStorePage = lazy(() => import('@/pages/apps/AppStorePage'));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-blue"></div>
  </div>
);

/**
 * Appearance routes — theme, settings, header builder, app store
 */
export function AppearanceRoutes() {
  return [
    // 외모 관리 (WordPress Style)
    <Route key="/appearance/theme" path="/appearance/theme" element={
      <AdminProtectedRoute requiredPermissions={['settings:read']}>
        <Suspense fallback={<PageLoader />}>
          <SiteThemeSettings />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/appearance/settings" path="/appearance/settings" element={
      <AdminProtectedRoute requiredPermissions={['settings:read']}>
        <Suspense fallback={<PageLoader />}>
          <GeneralSettings />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/appearance/header-builder" path="/appearance/header-builder" element={
      <AdminProtectedRoute requiredPermissions={['templates:write']}>
        <Suspense fallback={<PageLoader />}>
          <HeaderBuilder />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    // 레거시 메일 관리 → 설정/이메일
    <Route key="/mail/*" path="/mail/*" element={<Navigate to={LEGACY_MAIL_REDIRECT} replace />} />,

    // 앱 장터
    // WO-O4O-ADMIN-INFORMATION-ARCHITECTURE-AND-MENU-ROLE-REFACTOR-V1 — 백엔드 경계로 정렬
    //   AppStore 화면은 `/api/v1/admin/apps*` 를 소비하고 그 경계는 `requireAdmin`
    //   (= `platform:super_admin` 전용) 이다. `['admin']` 선언은 서비스 접두 역할까지
    //   통과시켜(adminRouteAccess.matchesRequiredRole) 진입 후 403 을 받게 했다.
    <Route key="/apps/store" path="/apps/store" element={
      <AdminProtectedRoute requiredRoles={['platform:super_admin']}>
        <Suspense fallback={<PageLoader />}>
          <AppStorePage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    // 설치된 앱
    <Route key="/admin/appstore/installed" path="/admin/appstore/installed" element={
      <AdminProtectedRoute requiredRoles={['platform:super_admin']}>
        <Suspense fallback={<PageLoader />}>
          <AppStorePage defaultTab="installed" />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // 설정
    <Route key="/settings/*" path="/settings/*" element={
      <AdminProtectedRoute requiredPermissions={['settings:read']}>
        <Suspense fallback={<PageLoader />}>
          <Settings />
        </Suspense>
      </AdminProtectedRoute>
    } />,
  ];
}

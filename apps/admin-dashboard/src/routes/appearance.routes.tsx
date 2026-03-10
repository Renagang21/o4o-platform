import { Route } from 'react-router-dom';
import { AdminProtectedRoute } from '@o4o/auth-context';
import { Suspense, lazy } from 'react';

// Appearance Pages
const SiteThemeSettings = lazy(() => import('@/pages/appearance/SiteThemeSettings'));
const GeneralSettings = lazy(() => import('@/pages/settings/GeneralSettings'));
const HeaderBuilder = lazy(() => import('@/pages/appearance/header-builder/HeaderBuilderPage'));
const NavigationMenus = lazy(() => import('@/pages/menus/Menus'));
const TemplateParts = lazy(() => import('@/pages/appearance/TemplateParts'));
const TemplatePartEditor = lazy(() => import(/* webpackChunkName: "template-editor" */ '@/pages/appearance/TemplatePartEditor'));

// Settings
const Settings = lazy(() => import('@/pages/settings/Settings'));
const EmailSettings = lazy(() => import('@/pages/mail/MailManagement'));

// Tools
const ToolsPage = lazy(() => import('@/pages/ToolsPage'));
const FileReplaceTools = lazy(() => import('@/pages/tools/MediaFileReplace'));

// App Store
const AppStorePage = lazy(() => import('@/pages/apps/AppStorePage'));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-blue"></div>
  </div>
);

/**
 * Appearance routes — theme, settings, menus, template parts, tools, app store
 */
export function AppearanceRoutes() {
  return [
    // 재사용 블록 관리
    <Route key="/reusable-blocks" path="/reusable-blocks" element={
      <AdminProtectedRoute requiredPermissions={['content:read']}>
        <Suspense fallback={<PageLoader />}>
          <div>Reusable Blocks - Coming Soon</div>
        </Suspense>
      </AdminProtectedRoute>
    } />,

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
    <Route key="/appearance/menus/*" path="/appearance/menus/*" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <NavigationMenus />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // Appearance - Template Parts
    <Route key="/appearance/template-parts" path="/appearance/template-parts" element={
      <AdminProtectedRoute requiredPermissions={['templates:read']}>
        <Suspense fallback={<PageLoader />}>
          <TemplateParts />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/appearance/template-parts/new" path="/appearance/template-parts/new" element={
      <AdminProtectedRoute requiredPermissions={['templates:write']}>
        <Suspense fallback={<PageLoader />}>
          <TemplatePartEditor />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/appearance/template-parts/:id/edit" path="/appearance/template-parts/:id/edit" element={
      <AdminProtectedRoute requiredPermissions={['templates:write']}>
        <Suspense fallback={<PageLoader />}>
          <TemplatePartEditor />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // 메일 관리
    <Route key="/mail/*" path="/mail/*" element={
      <AdminProtectedRoute requiredPermissions={['settings:read']}>
        <Suspense fallback={<PageLoader />}>
          <EmailSettings />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // 도구
    <Route key="/tools" path="/tools" element={
      <AdminProtectedRoute requiredPermissions={['tools:read']}>
        <Suspense fallback={<PageLoader />}>
          <ToolsPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/tools/media-replace" path="/tools/media-replace" element={
      <AdminProtectedRoute requiredPermissions={['tools:read']}>
        <Suspense fallback={<PageLoader />}>
          <FileReplaceTools />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // 앱 장터
    <Route key="/apps/store" path="/apps/store" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <AppStorePage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    // 설치된 앱
    <Route key="/admin/appstore/installed" path="/admin/appstore/installed" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
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

import { Route } from 'react-router-dom';
import { AdminProtectedRoute } from '@o4o/auth-context';
import { Suspense, lazy } from 'react';

// Import EditorRouteWrapper to handle route-based remounting
import EditorRouteWrapper from '@/pages/editor/EditorRouteWrapper';

// UI Showcase
const UIShowcase = lazy(() => import('@/pages/UIShowcase'));

// Test Pages
const EditorTest = lazy(() => import('@/pages/test/MinimalEditor'));
const AIPageGeneratorTest = lazy(() => import('@/pages/test/AIPageGeneratorTest'));
const FocusRestorationTest = lazy(() => import('@/pages/test/FocusRestorationTest'));
const AIBlockDebug = lazy(() => import('@/pages/test/AIBlockDebug'));
const SeedPresets = lazy(() => import('@/pages/test/SeedPresets'));
const PresetIntegrationTest = lazy(() => import('@/pages/test/PresetIntegrationTest'));
const DeleteCustomizerTest = lazy(() => import('@/pages/test/DeleteCustomizerTest'));
const AuthDebug = lazy(() => import('@/pages/test/AuthDebug'));
const DropshippingUsersTest = lazy(() => import('@/pages/test/DropshippingUsersTest'));
const UserEditTest = lazy(() => import('@/pages/test/UserEditTest'));
const ApiResponseChecker = lazy(() => import('@/pages/test/ApiResponseChecker'));
const MenuDebug = lazy(() => import('@/pages/test/MenuDebug'));
const CMSFieldsDebug = lazy(() => import('@/pages/test/CMSFieldsDebug'));
const CMSViewCreateTest = lazy(() => import('@/pages/test/CMSViewCreateTest'));
const CMSViewListDebug = lazy(() => import('@/pages/test/CMSViewListDebug'));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-blue"></div>
  </div>
);

/**
 * Test & debug routes — UI showcase, test pages, gutenberg editor
 */
export function TestRoutes() {
  return [
    // Gutenberg Editor - Using Standalone Full Screen Editor
    <Route key="/gutenberg" path="/gutenberg" element={
      <AdminProtectedRoute requiredPermissions={['content:write']}>
        <Suspense fallback={<PageLoader />}>
          <EditorRouteWrapper mode="post" />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // UI Showcase
    <Route key="/ui-showcase" path="/ui-showcase" element={
      <AdminProtectedRoute requiredPermissions={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <UIShowcase />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // Test - Minimal Editor (inside AdminLayout, requires login)
    <Route key="/admin/test/minimal-editor" path="/admin/test/minimal-editor" element={
      <Suspense fallback={<PageLoader />}>
        <EditorTest />
      </Suspense>
    } />,
    // Test - AI Page Generator
    <Route key="/admin/test/ai-page-generator-test" path="/admin/test/ai-page-generator-test" element={
      <Suspense fallback={<PageLoader />}>
        <AIPageGeneratorTest />
      </Suspense>
    } />,
    // Test - Focus Restoration
    <Route key="/admin/test/focus-restoration" path="/admin/test/focus-restoration" element={
      <Suspense fallback={<PageLoader />}>
        <FocusRestorationTest />
      </Suspense>
    } />,
    // Test - AI Block Debug
    <Route key="/admin/test/ai-block-debug" path="/admin/test/ai-block-debug" element={
      <Suspense fallback={<PageLoader />}>
        <AIBlockDebug />
      </Suspense>
    } />,
    // Test - Seed Presets
    <Route key="/admin/test/seed-presets" path="/admin/test/seed-presets" element={
      <Suspense fallback={<PageLoader />}>
        <SeedPresets />
      </Suspense>
    } />,
    // Test - Preset Integration
    <Route key="/admin/test/preset-integration" path="/admin/test/preset-integration" element={
      <Suspense fallback={<PageLoader />}>
        <PresetIntegrationTest />
      </Suspense>
    } />,
    // Test - Delete Customizer
    <Route key="/admin/test/delete-customizer" path="/admin/test/delete-customizer" element={
      <Suspense fallback={<PageLoader />}>
        <DeleteCustomizerTest />
      </Suspense>
    } />,
    // Test - Auth Debug
    <Route key="/admin/test/auth-debug" path="/admin/test/auth-debug" element={
      <Suspense fallback={<PageLoader />}>
        <AuthDebug />
      </Suspense>
    } />,
    // Test - Dropshipping Users
    <Route key="/admin/test/dropshipping-users" path="/admin/test/dropshipping-users" element={
      <Suspense fallback={<PageLoader />}>
        <DropshippingUsersTest />
      </Suspense>
    } />,
    // Test - User Edit
    <Route key="/admin/test/user-edit" path="/admin/test/user-edit" element={
      <Suspense fallback={<PageLoader />}>
        <UserEditTest />
      </Suspense>
    } />,
    // Test - API Response Checker
    <Route key="/test/api-response-checker" path="/test/api-response-checker" element={
      <Suspense fallback={<PageLoader />}>
        <ApiResponseChecker />
      </Suspense>
    } />,
    <Route key="/test/menu-debug" path="/test/menu-debug" element={
      <Suspense fallback={<PageLoader />}>
        <MenuDebug />
      </Suspense>
    } />,
    // Test - CMS Fields Debug
    <Route key="/admin/test/cms-fields" path="/admin/test/cms-fields" element={
      <Suspense fallback={<PageLoader />}>
        <CMSFieldsDebug />
      </Suspense>
    } />,
    // Test - CMS View Create
    <Route key="/admin/test/cms-view-test" path="/admin/test/cms-view-test" element={
      <Suspense fallback={<PageLoader />}>
        <CMSViewCreateTest />
      </Suspense>
    } />,
    // Test - CMS View List Debug
    <Route key="/admin/test/cms-view-list-debug" path="/admin/test/cms-view-list-debug" element={
      <Suspense fallback={<PageLoader />}>
        <CMSViewListDebug />
      </Suspense>
    } />,
  ];
}

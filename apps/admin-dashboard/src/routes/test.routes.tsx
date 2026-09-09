import { Route } from 'react-router-dom';
import { AdminProtectedRoute } from '@o4o/auth-context';
import { Suspense, lazy } from 'react';

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
const UserEditTest = lazy(() => import('@/pages/test/UserEditTest'));
const ApiResponseChecker = lazy(() => import('@/pages/test/ApiResponseChecker'));
const MenuDebug = lazy(() => import('@/pages/test/MenuDebug'));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-blue"></div>
  </div>
);

/**
 * Test & debug routes — UI showcase, test pages
 *
 * (제거됨) /gutenberg — WO-O4O-LEGACY-WORDPRESS-BLOCK-EDITOR-DOMAIN-RETIREMENT-V1
 * legacy WordPress block editor 의 7번째 진입점이었고, `/editor/*` 보다 약한 가드로
 * 프로덕션에 노출돼 있었다. legacy editor 축 전체와 함께 은퇴했다.
 */
export function TestRoutes() {
  // WO-O4O-ADMIN-INFORMATION-ARCHITECTURE-AND-MENU-ROLE-REFACTOR-V1 — 프로덕션 미등록
  //
  //   CLAUDE.md §8 「진단·seed·복구 경로 규칙」 3: **debug / test 성격 route 는
  //   프로덕션에 등록하지 않는다.** 기존에는 `AdminProtectedRoute` 가드는 있었지만
  //   프로덕션 번들에 그대로 등록돼 있었다(테스트 화면 12건 + UI showcase).
  //
  //   가드가 있다는 사실이 등록의 근거가 되지 않는다 — 진단 화면은 공격 표면이자
  //   운영 화면과 혼동되는 잔재다. 빌드 시점에 제외한다.
  //
  //   또한 CMS V2 디버그 화면 3건(cms-fields / cms-view-test / cms-view-list-debug)은
  //   백엔드가 없는 `/api/v1/cms/{fields,views}` 를 호출하던 화면이라 함께 제거했다.
  if (import.meta.env.PROD) {
    return [];
  }

  return [
    // UI Showcase
    <Route key="/ui-showcase" path="/ui-showcase" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
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
    // Test - CMS View Create
    // Test - CMS View List Debug
  ];
}

import { Route } from 'react-router-dom';
import { AdminProtectedRoute } from '@o4o/auth-context';
import { Suspense, lazy } from 'react';

// LMS-Instructor Pages (WO-LMS-INSTRUCTOR-DASHBOARD-UX-REFINEMENT-V1)
const LmsInstructorRouter = lazy(() => import('@/pages/lms-instructor/LmsInstructorRouter'));

// LMS-Marketing Pages (Phase R10 & R11)
const MarketingPublisherRouter = lazy(() => import('@/pages/marketing/publisher/MarketingPublisherRouter'));
const OnboardingHome = lazy(() => import('@/pages/marketing/onboarding/OnboardingHome'));
const SupplierProfileForm = lazy(() => import('@/pages/marketing/onboarding/SupplierProfileForm'));
const AutomationSettings = lazy(() => import('@/pages/marketing/automation/AutomationSettings'));

// LMS-Marketing Engagement Dashboard (Phase R12)
const SupplierEngagementDashboard = lazy(() => import('@/pages/marketing/supplier-engagement'));
const OperatorConsole = lazy(() => import('@/pages/marketing/operator-console'));

// Digital Signage Management (Phase 6)
const DigitalSignageRouter = lazy(() => import('@/pages/digital-signage/DigitalSignageRouter'));

// Store Content Pages (WO-O4O-STORE-CONTENT-UI)
const StoreContentListPage = lazy(() => import('@/pages/store-content'));
const TemplateLibraryPage = lazy(() => import('@/pages/store-content/templates'));
const StoreContentEditorPage = lazy(() => import('@/pages/store-content/[id]'));

// Store POP Pages (WO-STORE-POP-CREATION-RESTRUCTURE-V1)
const PopListPage = lazy(() => import('@/pages/store/pop/PopListPage'));
const PopCreatePage = lazy(() => import('@/pages/store/pop/PopCreatePage'));

/**
 * Store QR — 안내 화면 (WO-O4O-ADMIN-STORE-QR-LEGACY-UI-GUIDE-V1)
 *
 * 기존 `QrListPage` · `QrCreatePage` (WO-STORE-QR-PRODUCT-DIRECT-LINK-V1) 는
 * `/api/v1/pharmacy/qr/*` 를 호출했으나 그 경로는 마운트된 적이 없어 생성 시점부터 404 였다.
 * QR 생성·적용은 매장 경영자 기능이므로 운영자 콘솔에서는 안내만 제공한다.
 * 판정: docs/investigations/IR-O4O-ADMIN-QR-SOURCE-PRODUCTS-LEGACY-ROUTE-AUDIT-V1.md (REPLACE)
 *
 * 두 컴포넌트 파일은 삭제하지 않았다 (후속 cleanup WO 범위). 라우팅되지 않으므로
 * 화면 진입만으로 `qrApi` 가 실행되지 않는다.
 */
const StoreQrGuidePage = lazy(() => import('@/pages/store/qr/StoreQrGuidePage'));

// Store Tablet Settings (WO-TABLET-OPERATOR-UI-V1)
const TabletChannelSettingsPage = lazy(() => import('@/pages/store/tablet/TabletChannelSettingsPage'));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-blue"></div>
  </div>
);

/**
 * LMS & Marketing routes — LMS yaksa, LMS instructor, marketing, digital signage
 */
export function LmsMarketingRoutes() {
  return [
    // LMS-Instructor Dashboard (WO-LMS-INSTRUCTOR-DASHBOARD-UX-REFINEMENT-V1)
    <Route key="/admin/lms-instructor/*" path="/admin/lms-instructor/*" element={
      <Suspense fallback={<PageLoader />}>
        <LmsInstructorRouter />
      </Suspense>
    } />,

    // LMS-Marketing - Publisher (Phase R10)
    <Route key="/admin/marketing/publisher/*" path="/admin/marketing/publisher/*" element={
      <AdminProtectedRoute requiredPermissions={['marketing.write']}>
        <Suspense fallback={<PageLoader />}>
          <MarketingPublisherRouter />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // LMS-Marketing - Onboarding & Automation (Phase R11)
    <Route key="/admin/marketing/onboarding" path="/admin/marketing/onboarding" element={
      <AdminProtectedRoute requiredPermissions={['marketing.read']}>
        <Suspense fallback={<PageLoader />}>
          <OnboardingHome />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/marketing/onboarding/profile" path="/admin/marketing/onboarding/profile" element={
      <AdminProtectedRoute requiredPermissions={['marketing.write']}>
        <Suspense fallback={<PageLoader />}>
          <SupplierProfileForm />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/marketing/automation" path="/admin/marketing/automation" element={
      <AdminProtectedRoute requiredPermissions={['marketing.manage']}>
        <Suspense fallback={<PageLoader />}>
          <AutomationSettings />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // LMS-Marketing Engagement Dashboard (Phase R12)
    <Route key="/admin/marketing/supplier/engagement" path="/admin/marketing/supplier/engagement" element={
      <AdminProtectedRoute requiredPermissions={['marketing.read']}>
        <Suspense fallback={<PageLoader />}>
          <SupplierEngagementDashboard />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/marketing/operator/console" path="/admin/marketing/operator/console" element={
      <AdminProtectedRoute requiredPermissions={['marketing.manage']}>
        <Suspense fallback={<PageLoader />}>
          <OperatorConsole />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // Digital Signage Management (Phase 6)
    <Route key="/admin/digital-signage/*" path="/admin/digital-signage/*" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <DigitalSignageRouter />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // Store Content (WO-O4O-STORE-CONTENT-UI)
    <Route key="/store-content/templates" path="/store-content/templates" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <TemplateLibraryPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/store-content/:id" path="/store-content/:id" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <StoreContentEditorPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/store-content" path="/store-content" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <StoreContentListPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // Store POP (WO-STORE-POP-CREATION-RESTRUCTURE-V1)
    <Route key="/store/pop/create" path="/store/pop/create" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <PopCreatePage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/store/pop" path="/store/pop" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <PopListPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // Store QR — 두 경로 모두 안내 화면 (WO-O4O-ADMIN-STORE-QR-LEGACY-UI-GUIDE-V1)
    //   redirect 가 아니라 안내 화면이다. 기능적으로 다른 화면으로 보내지 않는다.
    <Route key="/store/qr/create" path="/store/qr/create" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <StoreQrGuidePage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/store/qr" path="/store/qr" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <StoreQrGuidePage />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // Store Tablet Settings (WO-TABLET-OPERATOR-UI-V1)
    <Route key="/store/tablet/settings" path="/store/tablet/settings" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <TabletChannelSettingsPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
  ];
}

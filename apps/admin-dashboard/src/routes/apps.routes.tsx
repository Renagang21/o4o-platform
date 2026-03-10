import { Route } from 'react-router-dom';
import { AdminProtectedRoute } from '@o4o/auth-context';
import { Suspense, lazy } from 'react';
import { AppRouteGuard } from '@/components/AppRouteGuard';

// Forum Pages (from @o4o/forum-core package - source imports)
const ForumDashboard = lazy(() => import('@/pages/forum'));
const ForumBoardList = lazy(() => import('@o4o/forum-core/src/admin-ui/pages/ForumBoardList'));
const ForumCategories = lazy(() => import('@o4o/forum-core/src/admin-ui/pages/ForumCategories'));
const ForumPostDetail = lazy(() => import('@o4o/forum-core/src/admin-ui/pages/ForumPostDetail'));
const ForumPostForm = lazy(() => import('@o4o/forum-core/src/admin-ui/pages/ForumPostForm'));

// Yaksa Community Pages (from @o4o/forum-core-yaksa package - source imports)
const YaksaCommunityList = lazy(() =>
  // @ts-expect-error Package not yet implemented
  import('@o4o/forum-core-yaksa/src/admin-ui/pages/YaksaCommunityList').catch(() => ({
    default: () => <div className="p-6">Yaksa Community List - Coming Soon</div>,
  }))
);
const YaksaCommunityDetail = lazy(() =>
  // @ts-expect-error Package not yet implemented
  import('@o4o/forum-core-yaksa/src/admin-ui/pages/YaksaCommunityDetail').catch(() => ({
    default: () => <div className="p-6">Yaksa Community Detail - Coming Soon</div>,
  }))
);
const YaksaCommunityFeed = lazy(() =>
  // @ts-expect-error Package not yet implemented
  import('@o4o/forum-core-yaksa/src/admin-ui/pages/YaksaCommunityFeed').catch(() => ({
    default: () => <div className="p-6">Yaksa Community Feed - Coming Soon</div>,
  }))
);

// Pharmacy AI Insight (Phase 5 - Active)
const PharmacyAiInsightSummary = lazy(() => import('@o4o/pharmacy-ai-insight').then(m => ({ default: m.SummaryPage })));

// CGM Pharmacist App (Phase 1 - Development)
const CGMPatientListPage = lazy(() =>
  import('@o4o/cgm-pharmacist-app')
    .then((m: any) => ({ default: m.PatientListPage }))
    .catch(() => ({ default: () => <div className="p-6">CGM Patient List - Coming Soon</div> }))
);
const CGMPatientDetailPage = lazy(() =>
  import('@o4o/cgm-pharmacist-app')
    .then((m: any) => ({ default: m.PatientDetailPage }))
    .catch(() => ({ default: () => <div className="p-6">CGM Patient Detail - Coming Soon</div> }))
);
const CGMCoachingPage = lazy(() =>
  import('@o4o/cgm-pharmacist-app')
    .then((m: any) => ({ default: m.CoachingPage }))
    .catch(() => ({ default: () => <div className="p-6">CGM Coaching - Coming Soon</div> }))
);
const CGMAlertsPage = lazy(() =>
  import('@o4o/cgm-pharmacist-app')
    .then((m: any) => ({ default: m.AlertsPage }))
    .catch(() => ({ default: () => <div className="p-6">CGM Alerts - Coming Soon</div> }))
);

// SellerOps Pages
const SellerOpsRouter = lazy(() => import('@/pages/sellerops/SellerOpsRouter'));

// SupplierOps Pages
const SupplierOpsRouter = lazy(() => import('@/pages/supplierops/SupplierOpsRouter'));

// PartnerOps Pages
const PartnerOpsRouter = lazy(() => import('@/pages/partnerops/PartnerOpsRouter'));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-blue"></div>
  </div>
);

/**
 * App routes — forum, pharmacy AI, CGM, sellerops, supplierops, partnerops
 */
export function AppRoutes() {
  return [
    // 포럼 - App-based routes with AppRouteGuard
    <Route key="/forum" path="/forum" element={
      <AdminProtectedRoute requiredPermissions={['forum:read']}>
        <AppRouteGuard appId="forum">
          <Suspense fallback={<PageLoader />}>
            <ForumDashboard />
          </Suspense>
        </AppRouteGuard>
      </AdminProtectedRoute>
    } />,
    <Route key="/forum/boards" path="/forum/boards" element={
      <AdminProtectedRoute requiredPermissions={['forum:read']}>
        <AppRouteGuard appId="forum">
          <Suspense fallback={<PageLoader />}>
            <ForumBoardList />
          </Suspense>
        </AppRouteGuard>
      </AdminProtectedRoute>
    } />,
    <Route key="/forum/categories" path="/forum/categories" element={
      <AdminProtectedRoute requiredPermissions={['forum:read']}>
        <AppRouteGuard appId="forum">
          <Suspense fallback={<PageLoader />}>
            <ForumCategories />
          </Suspense>
        </AppRouteGuard>
      </AdminProtectedRoute>
    } />,
    <Route key="/forum/posts/:id" path="/forum/posts/:id" element={
      <AdminProtectedRoute requiredPermissions={['forum:read']}>
        <AppRouteGuard appId="forum">
          <Suspense fallback={<PageLoader />}>
            <ForumPostDetail />
          </Suspense>
        </AppRouteGuard>
      </AdminProtectedRoute>
    } />,
    <Route key="/forum/posts/new" path="/forum/posts/new" element={
      <AdminProtectedRoute requiredPermissions={['forum:write']}>
        <AppRouteGuard appId="forum">
          <Suspense fallback={<PageLoader />}>
            <ForumPostForm />
          </Suspense>
        </AppRouteGuard>
      </AdminProtectedRoute>
    } />,
    <Route key="/forum/posts/:id/edit" path="/forum/posts/:id/edit" element={
      <AdminProtectedRoute requiredPermissions={['forum:write']}>
        <AppRouteGuard appId="forum">
          <Suspense fallback={<PageLoader />}>
            <ForumPostForm />
          </Suspense>
        </AppRouteGuard>
      </AdminProtectedRoute>
    } />,

    // Yaksa Community - App-based routes with AppRouteGuard
    <Route key="/yaksa/communities" path="/yaksa/communities" element={
      <AdminProtectedRoute requiredPermissions={['forum:read']}>
        <AppRouteGuard appId="forum-yaksa">
          <Suspense fallback={<PageLoader />}>
            <YaksaCommunityList />
          </Suspense>
        </AppRouteGuard>
      </AdminProtectedRoute>
    } />,
    <Route key="/yaksa/communities/:id" path="/yaksa/communities/:id" element={
      <AdminProtectedRoute requiredPermissions={['forum:read']}>
        <AppRouteGuard appId="forum-yaksa">
          <Suspense fallback={<PageLoader />}>
            <YaksaCommunityDetail />
          </Suspense>
        </AppRouteGuard>
      </AdminProtectedRoute>
    } />,
    <Route key="/yaksa/communities/:id/feed" path="/yaksa/communities/:id/feed" element={
      <AdminProtectedRoute requiredPermissions={['forum:read']}>
        <AppRouteGuard appId="forum-yaksa">
          <Suspense fallback={<PageLoader />}>
            <YaksaCommunityFeed />
          </Suspense>
        </AppRouteGuard>
      </AdminProtectedRoute>
    } />,

    // Pharmacy AI Insight - 약사 전용 AI 인사이트 (Phase 5)
    <Route key="/pharmacy-ai-insight" path="/pharmacy-ai-insight" element={
      <AdminProtectedRoute requiredPermissions={['pharmacy-ai-insight.read']}>
        <AppRouteGuard appId="pharmacy-ai-insight">
          <Suspense fallback={<PageLoader />}>
            <PharmacyAiInsightSummary />
          </Suspense>
        </AppRouteGuard>
      </AdminProtectedRoute>
    } />,
    <Route key="/pharmacy-ai-insight/summary" path="/pharmacy-ai-insight/summary" element={
      <AdminProtectedRoute requiredPermissions={['pharmacy-ai-insight.read']}>
        <AppRouteGuard appId="pharmacy-ai-insight">
          <Suspense fallback={<PageLoader />}>
            <PharmacyAiInsightSummary />
          </Suspense>
        </AppRouteGuard>
      </AdminProtectedRoute>
    } />,

    // CGM Pharmacist App - 약사용 CGM 환자 관리 (Phase 1 - Development)
    <Route key="/cgm-pharmacist" path="/cgm-pharmacist" element={
      <AdminProtectedRoute requiredPermissions={['cgm-pharmacist.patients.read']}>
        <AppRouteGuard appId="cgm-pharmacist-app">
          <Suspense fallback={<PageLoader />}>
            <CGMPatientListPage />
          </Suspense>
        </AppRouteGuard>
      </AdminProtectedRoute>
    } />,
    <Route key="/cgm-pharmacist/patients" path="/cgm-pharmacist/patients" element={
      <AdminProtectedRoute requiredPermissions={['cgm-pharmacist.patients.read']}>
        <AppRouteGuard appId="cgm-pharmacist-app">
          <Suspense fallback={<PageLoader />}>
            <CGMPatientListPage />
          </Suspense>
        </AppRouteGuard>
      </AdminProtectedRoute>
    } />,
    <Route key="/cgm-pharmacist/patients/:patientId" path="/cgm-pharmacist/patients/:patientId" element={
      <AdminProtectedRoute requiredPermissions={['cgm-pharmacist.patients.read']}>
        <AppRouteGuard appId="cgm-pharmacist-app">
          <Suspense fallback={<PageLoader />}>
            <CGMPatientDetailPage />
          </Suspense>
        </AppRouteGuard>
      </AdminProtectedRoute>
    } />,
    <Route key="/cgm-pharmacist/patients/:patientId/coaching" path="/cgm-pharmacist/patients/:patientId/coaching" element={
      <AdminProtectedRoute requiredPermissions={['cgm-pharmacist.coaching.write']}>
        <AppRouteGuard appId="cgm-pharmacist-app">
          <Suspense fallback={<PageLoader />}>
            <CGMCoachingPage />
          </Suspense>
        </AppRouteGuard>
      </AdminProtectedRoute>
    } />,
    <Route key="/cgm-pharmacist/alerts" path="/cgm-pharmacist/alerts" element={
      <AdminProtectedRoute requiredPermissions={['cgm-pharmacist.alerts.read']}>
        <AppRouteGuard appId="cgm-pharmacist-app">
          <Suspense fallback={<PageLoader />}>
            <CGMAlertsPage />
          </Suspense>
        </AppRouteGuard>
      </AdminProtectedRoute>
    } />,

    // SellerOps - Seller Operations App
    <Route key="/sellerops/*" path="/sellerops/*" element={
      <AdminProtectedRoute requiredRoles={['seller', 'admin']}>
        <AppRouteGuard appId="sellerops">
          <Suspense fallback={<PageLoader />}>
            <SellerOpsRouter />
          </Suspense>
        </AppRouteGuard>
      </AdminProtectedRoute>
    } />,

    // SupplierOps - Supplier Operations App
    <Route key="/supplierops/*" path="/supplierops/*" element={
      <AdminProtectedRoute requiredRoles={['supplier', 'admin']}>
        <AppRouteGuard appId="supplierops">
          <Suspense fallback={<PageLoader />}>
            <SupplierOpsRouter />
          </Suspense>
        </AppRouteGuard>
      </AdminProtectedRoute>
    } />,

    // PartnerOps - Partner/Affiliate Operations App
    <Route key="/partnerops/*" path="/partnerops/*" element={
      <AdminProtectedRoute requiredRoles={['partner', 'admin']}>
        <AppRouteGuard appId="partnerops">
          <Suspense fallback={<PageLoader />}>
            <PartnerOpsRouter />
          </Suspense>
        </AppRouteGuard>
      </AdminProtectedRoute>
    } />,
  ];
}

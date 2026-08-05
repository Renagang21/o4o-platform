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
 * App routes — forum, pharmacy AI, sellerops, supplierops, partnerops
 */
export function AppRoutes() {
  return [
    // 포럼 — 플랫폼 기본 커뮤니티 기능 (설치형 앱 아님)
    //
    // WO-O4O-ADMIN-FORUM-BASE-FEATURE-GUARD-ALIGNMENT-V1:
    //   기존에는 <AppRouteGuard appId="forum"> 로 앱 availability 게이팅을 했으나,
    //   평문 appId 'forum' 은 app_registry / seed / appsCatalog 어디에도 존재하지 않는다
    //   (카탈로그의 forum 계열은 forum-core / organization-forum / forum-yaksa 등 별도 확장 앱).
    //   그 결과 availability 조회가 정상이어도 항상 비활성으로 판정되어
    //   모든 사용자가 /error/app-disabled 로 튕겼다.
    //   Forum 은 전 서비스 공통 기본 기능이므로 설치형 앱 게이팅 대상이 아니다 → 게이팅만 제거.
    //
    //   접근 통제는 그대로 유지된다:
    //     - 프론트: AdminProtectedRoute (forum:read / forum:write)
    //     - 백엔드: /api/v1/forum 목록·조회 optionalAuth, 작성·수정·삭제 authenticate,
    //               운영자 관리(admin-forum.routes) router.use(authenticate)
    //   앱 availability 는 권한 검사를 대신하지 않는다.
    //
    //   forum-yaksa 등 서비스별 확장 앱의 가드는 그대로 둔다(아래 Yaksa Community 블록).
    <Route key="/forum" path="/forum" element={
      <AdminProtectedRoute requiredPermissions={['forum:read']}>
        <Suspense fallback={<PageLoader />}>
          <ForumDashboard />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/forum/boards" path="/forum/boards" element={
      <AdminProtectedRoute requiredPermissions={['forum:read']}>
        <Suspense fallback={<PageLoader />}>
          <ForumBoardList />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/forum/categories" path="/forum/categories" element={
      <AdminProtectedRoute requiredPermissions={['forum:read']}>
        <Suspense fallback={<PageLoader />}>
          <ForumCategories />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/forum/posts/:id" path="/forum/posts/:id" element={
      <AdminProtectedRoute requiredPermissions={['forum:read']}>
        <Suspense fallback={<PageLoader />}>
          <ForumPostDetail />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/forum/posts/new" path="/forum/posts/new" element={
      <AdminProtectedRoute requiredPermissions={['forum:write']}>
        <Suspense fallback={<PageLoader />}>
          <ForumPostForm />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/forum/posts/:id/edit" path="/forum/posts/:id/edit" element={
      <AdminProtectedRoute requiredPermissions={['forum:write']}>
        <Suspense fallback={<PageLoader />}>
          <ForumPostForm />
        </Suspense>
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

    // WO-O4O-CGM-PHARMACIST-APP-RETIREMENT-V1:
    //   /cgm-pharmacist 계열 5개 라우트 제거.
    //   `cgm-pharmacist-app` 은 app_registry 에 등록된 적이 없어 AppRouteGuard 가
    //   항상 /error/app-disabled 로 리다이렉트하던 도달 불가 라우트였다.

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

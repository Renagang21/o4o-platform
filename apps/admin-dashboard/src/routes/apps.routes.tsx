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

// WO-O4O-FORUM-YAKSA-DEAD-PACKAGE-ROUTE-AND-ALIAS-LOCKSTEP-REMOVAL-V1:
//   Yaksa Community 화면 3건(`@o4o/forum-core-yaksa/src/admin-ui/pages/*`) 의 동적 import 제거.
//   `@o4o/forum-core-yaksa` Vite alias 와 `packages/forum-yaksa` 패키지를 함께 제거했다.

// Pharmacy AI Insight (Phase 5 - Active)
const PharmacyAiInsightSummary = lazy(() => import('@o4o/pharmacy-ai-insight').then(m => ({ default: m.SummaryPage })));

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
 * App routes — forum, pharmacy AI, supplierops, partnerops
 */
export function AppRoutes() {
  return [
    // 포럼 — 플랫폼 기본 커뮤니티 기능 (설치형 앱 아님)
    //
    // WO-O4O-ADMIN-FORUM-BASE-FEATURE-GUARD-ALIGNMENT-V1:
    //   기존에는 <AppRouteGuard appId="forum"> 로 앱 availability 게이팅을 했으나,
    //   평문 appId 'forum' 은 app_registry / seed / appsCatalog 어디에도 존재하지 않는다
    //   (카탈로그의 forum 계열은 forum-core / organization-forum 등 별도 확장 앱).
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
    //   서비스별 확장 앱(pharmacy-ai-insight / supplierops 등)의 가드는 그대로 둔다.
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

    // WO-O4O-FORUM-YAKSA-DEAD-PACKAGE-ROUTE-AND-ALIAS-LOCKSTEP-REMOVAL-V1:
    //   /yaksa/communities 계열 3개 라우트 제거.
    //   `forum-yaksa` 는 app_registry 에 등록된 적이 없어 AppRouteGuard 가 항상
    //   /error/app-disabled 로 리다이렉트했고, admin 메뉴 진입점도 0건이었다.
    //   백엔드 라우트(`createRoutes`)와 호출 대상 API(`/yaksa/forum/communities/*`) 도
    //   구현이 존재하지 않았다 — 상세 근거는
    //   docs/checks/WO-O4O-FORUM-YAKSA-AND-LEGACY-BUILD-TEST-RESIDUE-BOUNDARY-AUDIT-V1-CHECK.md
    //   현재 운영 중인 공용 포럼(/forum 계열, /api/v1/forum · /api/v1/kpa/forum)은 영향 없음.

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

    // WO-O4O-LEGACY-FOLLOWUP-AUTH-NOTIFICATION-CATALOG-AND-DB-FINAL-CLOSURE-V1 (C축):
    //   /sellerops/* 라우트와 admin 로컬 pages/sellerops (10파일) 을 제거했다.
    //   근거:
    //     - appId 'sellerops' 는 app_registry 에 등록된 적이 없어(프로덕션 6행 실측)
    //       AppRouteGuard 가 항상 /error/app-disabled 로 리다이렉트하던 도달 불가 라우트다.
    //     - 9개 화면 중 8개가 setTimeout 데모 데이터였고, 유일한 write 인
    //       ListingCreatePage 의 POST /sellerops/listings 는 api-server 에 존재하지 않았다.
    //     - 진입 네비게이션 0건 · appsCatalog appId 등록 0건
    //       (WO-O4O-DROPSHIPPING-LEGACY-REMOVAL-V1 에서 이미 제거됨).
    //     - 판매자(플랫폼 직접판매) 축은 PLATFORM_DIRECT_SALE_BUSINESS_CONTRACT = NONE.
    //   serviceGroup id 'sellerops' 는 살아 있는 카탈로그 항목
    //   ('cosmetics-seller-extension' · 'market-trial') 이 소비하므로 유지한다.

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

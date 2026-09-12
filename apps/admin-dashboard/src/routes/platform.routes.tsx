import { Route } from 'react-router-dom';
import { AdminProtectedRoute } from '@o4o/auth-context';
import { Suspense, lazy } from 'react';

// Store Network Dashboard (WO-O4O-STORE-NETWORK-DASHBOARD-V1)

// Physical Stores (WO-O4O-CROSS-SERVICE-STORE-LINKING-V1)

// Platform Hub — Global Operations (WO-PLATFORM-GLOBAL-HUB-V1)
const PlatformHubPage = lazy(() => import('@/pages/platform/PlatformHubPage'));

// 자동화 › 동영상 제작 작업공간 (WO-O4O-AUTOMATION-VIDEO-JOB-P0-ADMIN-WORKSPACE-V1)
//   backend /api/v1/platform/automation-jobs — platform admin 전용(Media V2 관리 API 와 같은 guard).
const VideoJobsPage = lazy(() => import('@/pages/automation/VideoJobsPage'));
const VideoJobDetailPage = lazy(() => import('@/pages/automation/VideoJobDetailPage'));

// WO-O4O-ADMIN-DASHBOARD-LEGACY-ROUTE-API-AND-NAVIGATION-CLOSURE-V1:
//   /admin/dashboard/operations (pages/dashboard/phase2.4) 는 하드코딩 통계·가짜 알림만
//   렌더하던 중복 dashboard 라 MERGE_DUPLICATED_DASHBOARD → 제거. canonical home = /admin.


// Auth Analytics (WO-O4O-AUTH-ANALYTICS-UI-V1)
const AuthAnalyticsPage = lazy(() => import('@/pages/operator/AuthAnalyticsPage'));

// Content Approvals (WO-O4O-OPERATOR-CONTENT-APPROVAL-PHASE1-V1)

// Point Spend (WO-O4O-POINT-OPERATOR-UI-V1)
const PointSpendPage = lazy(() => import('@/pages/operator/PointSpendPage'));

// Point Budget (WO-O4O-SERVICE-OPERATOR-POINT-BUDGET-PHASE1-V1)
const PointBudgetPage = lazy(() => import('@/pages/operator/PointBudgetPage'));

// KPA HUB & Store Content (WO-O4O-STORE-CONTENT-HUB-SHARE-UI-PHASE2-V1)
const HubContentsPage = lazy(() => import('@/pages/kpa/HubContentsPage'));
const MyStoreContentsPage = lazy(() => import('@/pages/kpa/MyStoreContentsPage'));

// KPA Store Content Workspace (WO-O4O-STORE-CONTENT-WORKSPACE-V1)
const StoreContentWorkspacePage = lazy(() => import('@/pages/kpa/StoreContentWorkspacePage'));

// KPA HUB Notice (WO-O4O-HUB-NOTICE-SYSTEM-V1)
const HubNoticeListPage = lazy(() => import('@/pages/kpa/HubNoticeListPage'));

// KPA Force Asset Console (WO-O4O-ADMIN-FORCE-ASSET-CONSOLE-V1)
const AdminForceAssetPage = lazy(() => import('@/pages/kpa/AdminForceAssetPage'));

// KPA Snapshot Browser (WO-O4O-KPA-ADMIN-SNAPSHOT-BROWSE-V1)
const AdminSnapshotBrowserPage = lazy(() => import('@/pages/kpa/AdminSnapshotBrowserPage'));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-blue"></div>
  </div>
);

/**
 * Platform routes — store network, monitoring, services overview, platform hub
 */
export function PlatformRoutes() {
  return [
    // WO-O4O-ADMIN-INFORMATION-ARCHITECTURE-AND-MENU-ROLE-REFACTOR-V1 — 제거 내역
    //
    //   조사 정본: docs/investigations/IR-O4O-ADMIN-INFORMATION-ARCHITECTURE-AND-MENU-ROLE-CENSUS-V1.md
    //
    //   [1] `/admin/store-network` · `/admin/physical-stores` (+ 두 화면 파일)
    //       이름은 플랫폼 전체 매장망이지만 실제로는 **Cosmetics 단일 서비스** 집계였다:
    //         · store-network.service.ts → `getCosmeticsServiceStats` 하나만 호출,
    //           `serviceBreakdown` 에 `'cosmetics'` 만 넣는다
    //         · physical-store.service.ts → **cosmetics 매장만 스캔**해 `physical_stores` 를 채운다
    //       KPA·PharmacyHub·Neture 매장은 두 화면 모두에 나타나지 않는다.
    //       또한 '월 매출 / 월 주문 / 상위 매장' 표현은 O4O 가 매장의 소비자 판매를 관리하는
    //       것처럼 읽히는데, `checkout_orders` 는 **공급자→매장 B2B 주문 축**이다
    //       (CLAUDE.md Priority Chain 3 · 3-A). 단일 서비스 운영 현황은 해당 서비스
    //       operator 영역이 적절하며, K-Cosmetics operator 에 이미 `매장 관리`·`주문 현황`이 있다.
    //       ⚠ 백엔드(`/api/v1/admin/store-network` · `/api/v1/admin/physical-stores`),
    //         `physical_stores`·`physical_store_links` 테이블, `checkout_orders` 는
    //         **삭제하지 않았다** — 소비처·데이터 관계 조사 후 별도 판정.
    //
    //   [2] `/monitoring` · `/monitoring/performance` · `/monitoring/security` (+ pages/monitoring)
    //       `/api/v1/monitoring/*` 는 `register-routes.ts` 에 마운트된 적이 없다 →
    //       프로덕션 실측 404. 995줄이 한 번도 동작하지 않았고 메뉴 진입점도 0건이었다.
    //
    //   [3] `/operator/approvals` (+ pages/operator/ContentApprovalsPage)
    //       KPA Society operator 콘솔의 `공급자 콘텐츠 승인`(`/operator/approvals`)과
    //       **같은 경로·같은 백엔드**(`/api/v1/kpa/operator/approvals`)를 쓰는 중복 진입점이었다.
    //       그 백엔드는 `requireKpaScope('kpa:operator')` 이고 `KPA_SCOPE_CONFIG` 는
    //       `platformBypass: false` + `blockedServicePrefixes:['platform',…]` 이므로
    //       **플랫폼 관리자는 구조적으로 403** 이다. 정본은 서비스 operator 콘솔이다.
    //
    //   ⓘ 아래 KPA 화면 3건(`/operator/hub-contents` · `/operator/kpa/snapshots` ·
    //     `/operator/kpa/force-assets`)은 **메뉴에서만 제거하고 라우트·화면은 보존**한다.
    //     KPA operator 콘솔에 대응 화면이 없고, 이번 WO 는 신규 operator 화면을 만들지 않는다.
    //     (Force Asset 관리는 `kpa:admin` 보유자가 실제로 사용할 수 있는 기능이다.)
    //     이관은 별도 WO 로 판정한다 — 기능을 삭제하지 않기 위한 의도적 보존이다.
    // Store Network Dashboard (WO-O4O-STORE-NETWORK-DASHBOARD-V1)

    // Physical Stores (WO-O4O-CROSS-SERVICE-STORE-LINKING-V1)

    // Platform Hub — Global Operations (WO-PLATFORM-GLOBAL-HUB-V1)
    // WO-O4O-ADMIN-INFORMATION-ARCHITECTURE-AND-MENU-ROLE-REFACTOR-V1 — 백엔드 경계로 정렬
    //   `/api/v1/platform/hub/*` 는 `requireAuth + requirePlatformAdmin`(= `isPlatformAdmin`,
    //   `platform:super_admin` 전용) 이다. `['admin']` 선언은 서비스 접두 역할까지 통과시켜
    //   (adminRouteAccess.matchesRequiredRole) 진입 후 403 을 받게 했다.
    // 자동화 › 동영상 제작 (WO-O4O-AUTOMATION-VIDEO-JOB-P0-ADMIN-WORKSPACE-V1)
    <Route key="/automation/video-jobs" path="/automation/video-jobs" element={
      <AdminProtectedRoute requiredRoles={['platform:super_admin']}>
        <Suspense fallback={<PageLoader />}>
          <VideoJobsPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/automation/video-jobs/:id" path="/automation/video-jobs/:id" element={
      <AdminProtectedRoute requiredRoles={['platform:super_admin']}>
        <Suspense fallback={<PageLoader />}>
          <VideoJobDetailPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    <Route key="/admin/platform/hub" path="/admin/platform/hub" element={
      <AdminProtectedRoute requiredRoles={['platform:super_admin']}>
        <Suspense fallback={<PageLoader />}>
          <PlatformHubPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // WO-O4O-SERVICE-MONITOR-SITES-TABLE-DEPENDENCY-AUDIT-AND-CLOSURE-V1:
    //   /admin/services · /admin/services/overview (ServiceOverview) 는 backend
    //   /api/v1/service/monitor/* 전용 화면이었고, 그 API 가 legacy retire 되어 함께 제거한다.
    //   (nav 메뉴 진입점 0 · 30일 로그 organic 호출 0 · summary/report 는 항상 500)

    // Auth Analytics (WO-O4O-AUTH-ANALYTICS-UI-V1)
    <Route key="/operator/analytics/auth" path="/operator/analytics/auth" element={
      <AdminProtectedRoute requiredRoles={['admin', 'super_admin', 'operator']}>
        <Suspense fallback={<PageLoader />}>
          <AuthAnalyticsPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // Content Approvals (WO-O4O-OPERATOR-CONTENT-APPROVAL-PHASE1-V1)

    // Point Spend (WO-O4O-POINT-OPERATOR-UI-V1)
    // 백엔드 /api/v1/points/admin/spend 가 requireAdmin 가드이므로 admin/super_admin만 허용
    // WO-O4O-ADMIN-INFORMATION-ARCHITECTURE-AND-MENU-ROLE-REFACTOR-V1 — 백엔드 경계로 정렬
    //   `/api/v1/points/admin/{grant,spend,transactions}` 는 `requireAuth + requireAdmin` 이고,
    //   `requireAdmin` 은 WO-O4O-REQUIREADMIN-PREFIXED-ONLY-V1 이후 `platform:super_admin` 전용이다.
    //   legacy `admin`·`super_admin` 을 통과시키면 금액성 화면에 진입한 뒤 전 API 가 403 이 된다.
    <Route key="/operator/points" path="/operator/points" element={
      <AdminProtectedRoute requiredRoles={['platform:super_admin']}>
        <Suspense fallback={<PageLoader />}>
          <PointSpendPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // Point Budget (WO-O4O-SERVICE-OPERATOR-POINT-BUDGET-PHASE1-V1)
    <Route key="/operator/points/budget" path="/operator/points/budget" element={
      <AdminProtectedRoute requiredRoles={['platform:super_admin']}>
        <Suspense fallback={<PageLoader />}>
          <PointBudgetPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // HUB 콘텐츠 목록 (WO-O4O-STORE-CONTENT-HUB-SHARE-UI-PHASE2-V1)
    <Route key="/operator/hub-contents" path="/operator/hub-contents" element={
      <AdminProtectedRoute requiredRoles={['admin', 'super_admin', 'operator']}>
        <Suspense fallback={<PageLoader />}>
          <HubContentsPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // 내 매장 콘텐츠 (WO-O4O-STORE-CONTENT-HUB-SHARE-UI-PHASE2-V1)
    <Route key="/kpa/my-store-contents" path="/kpa/my-store-contents" element={
      <AdminProtectedRoute requiredRoles={['admin', 'super_admin', 'operator', 'supplier']}>
        <Suspense fallback={<PageLoader />}>
          <MyStoreContentsPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // 매장 콘텐츠 작업 공간 (WO-O4O-STORE-CONTENT-WORKSPACE-V1)
    <Route key="/kpa/content-workspace" path="/kpa/content-workspace" element={
      <AdminProtectedRoute requiredRoles={['admin', 'super_admin', 'operator', 'supplier']}>
        <Suspense fallback={<PageLoader />}>
          <StoreContentWorkspacePage />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // HUB 공지 관리 (WO-O4O-HUB-NOTICE-SYSTEM-V1)
    <Route key="/operator/hub-notices" path="/operator/hub-notices" element={
      <AdminProtectedRoute requiredRoles={['admin', 'super_admin', 'operator']}>
        <Suspense fallback={<PageLoader />}>
          <HubNoticeListPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // Force Asset Console (WO-O4O-ADMIN-FORCE-ASSET-CONSOLE-V1)
    <Route key="/operator/kpa/force-assets" path="/operator/kpa/force-assets" element={
      <AdminProtectedRoute requiredRoles={['admin', 'super_admin']}>
        <Suspense fallback={<PageLoader />}>
          <AdminForceAssetPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // Snapshot Browser (WO-O4O-KPA-ADMIN-SNAPSHOT-BROWSE-V1)
    <Route key="/operator/kpa/snapshots" path="/operator/kpa/snapshots" element={
      <AdminProtectedRoute requiredRoles={['admin', 'super_admin']}>
        <Suspense fallback={<PageLoader />}>
          <AdminSnapshotBrowserPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
  ];
}

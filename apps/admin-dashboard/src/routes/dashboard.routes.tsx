import { Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';

const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const AppDisabled = lazy(() => import('@/pages/error/AppDisabled'));

/**
 * WO-O4O-ADMIN-DASHBOARD-LEGACY-ROUTE-API-AND-NAVIGATION-CLOSURE-V1 (§4 · §11):
 *   `CANONICAL_ADMIN_HOME = /admin`.
 *
 *   대시보드 3중(`/admin` · `/home` · `/dashboard`)을 하나로 수렴했다.
 *     · `/home`      (pages/AdminHome.tsx 348줄) — 전부 하드코딩(₩12,345,000 / 배포 배너 /
 *                     dead link 20여 건). 제거 → `/admin` redirect.
 *     · `/dashboard` (pages/dashboard/unified/** 15파일) — CARD_REGISTRY 의 모든 데이터
 *                     소스가 "현재 기능 미구현 - 빈 데이터 반환" stub(0 고정) 이었고
 *                     backend(`/dashboard/overview` · `/executive/*` · `/{seller,supplier,
 *                     partner,operator}/stats`)가 존재하지 않았다. 제거 → `/admin` redirect.
 *     · `/admin/dashboard/operations` (pages/dashboard/phase2.4/** · hooks/api/useDashboard)
 *                     — backend `/admin/dashboard/operations*` 없음 · 프로덕션 30일 호출 0.
 *                     제거 (platform.routes 에서 함께 제거).
 *   같은 기능의 대시보드를 새로 만들지 않는다. 남는 것은 `/admin` 하나뿐이다.
 *
 * WO-O4O-LEGACY-RESIDUAL-RUNTIME-AND-DEFERRED-FINAL-CLOSURE-V1 (Axis D):
 *   PD-3/PD-4/PD-5 seller·supplier 대시보드 6화면 은퇴 (`/api/v2/seller/*` 등 backend 부재).
 *   canonical: 공급자 정산 = web-neture `/supplier/settlements`.
 * WO-O4O-ADMIN-INFORMATION-ARCHITECTURE-AND-MENU-ROLE-REFACTOR-V1:
 *   `/admin/service-content-manager` 제거 (API 호출 0 · 하드코딩 샘플). 정본 = `/admin/cms/slots`.
 * WO-O4O-ADMIN-AUTHORIZATION-REGISTRY-AND-DEAD-SURFACE-FINAL-CLOSURE-V1 (§6):
 *   `/dashboard/business` 제거 (도달 가능한 사용자 0). 정본 = `content-assets` · `content-analytics`.
 */

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-blue"></div>
  </div>
);

export const CANONICAL_ADMIN_HOME = '/admin';

/**
 * Dashboard routes — canonical admin home + legacy home redirects
 */
export function DashboardRoutes() {
  return [
    // Error Pages - No permission required
    <Route key="/error/app-disabled" path="/error/app-disabled" element={
      <Suspense fallback={<PageLoader />}>
        <AppDisabled />
      </Suspense>
    } />,

    // 관리자 canonical home
    <Route key="/admin" path="/admin" element={
      <Suspense fallback={<PageLoader />}>
        <AdminDashboard />
      </Suspense>
    } />,

    // legacy home 진입점 → canonical
    <Route key="/home" path="/home" element={<Navigate to={CANONICAL_ADMIN_HOME} replace />} />,
    <Route key="/dashboard" path="/dashboard" element={<Navigate to={CANONICAL_ADMIN_HOME} replace />} />,
  ];
}

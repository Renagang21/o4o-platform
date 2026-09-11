import { Route } from 'react-router-dom';
import { AdminProtectedRoute } from '@o4o/auth-context';
import { Suspense, lazy } from 'react';
import { PLATFORM_ADMIN_ROLES } from '@/config/rolePermissions';

const UsersPage = lazy(() => import('@/pages/users'));
const UserForm = lazy(() => import('@/pages/users/UserForm'));
const UserDetail = lazy(() => import('@/pages/users/UserDetail'));
const ActiveUsers = lazy(() => import('@/pages/users/ActiveUsers'));
// Operators Management (admin.neture.co.kr)
const OperatorsPage = lazy(() => import('@/pages/operators'));
// WO-O4O-ADMIN-DASHBOARD-LEGACY-ROUTE-API-AND-NAVIGATION-CLOSURE-V1 (§8 · §9):
//   `/enrollments` · `/admin/enrollments` (pages/enrollments/EnrollmentManagement) 와
//   `/admin/role-applications` (pages/RoleApplicationsAdminPage + PendingApplicationsWidget +
//   useRoleApplicationsCount) 제거 — 판정 REMOVE_BROKEN_UI.
//     · backend `/api/v1/admin/enrollments*` · `/api/v1/admin/roles/applications*` 부재
//       (backend 에 있는 것은 `/api/v2/roles/applications/my` 뿐 — 신청자 본인 조회).
//     · 메뉴 노출 0 · 프로덕션 30일 호출 0 · 위젯 hook 은 `count: 0` 영구 stub.
//   역할 신청 승인의 살아 있는 정본은 서비스별 admin 화면
//   (`/admin/kpa-branch/service-members` 등)이다.
// WO-O4O-KPA-BRANCH-SERVICE-MEMBER-APPROVAL-UI-V1: kpa-branch 서비스 가입 승인
const BranchServiceMembersPage = lazy(() => import('@/pages/kpa/BranchServiceMembersPage'));
// WO-KPA-OPERATOR-SCOPE-ASSIGNMENT-OPS-V1: Operator Policy
const MyPolicyPage = lazy(() => import('@/pages/operator/MyPolicyPage'));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-blue"></div>
  </div>
);

/**
 * User management routes — users, operators, kpa-branch service members, operator policy
 */
export function UserRoutes() {
  return [
    // 현재 접속자
    <Route key="/active-users" path="/active-users" element={
      <AdminProtectedRoute requiredRoles={['admin', 'super_admin']}>
        <Suspense fallback={<PageLoader />}>
          <ActiveUsers />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // 운영자 관리 (관리자/서비스 운영자)
    //
    // WO-O4O-ADMIN-INFORMATION-ARCHITECTURE-AND-MENU-ROLE-REFACTOR-V1 — 백엔드 경계로 정렬
    //   이 화면도 `/users` 와 **같은 endpoint** `/api/v1/admin/users` 를 소비한다
    //   (OperatorsPage.tsx — 목록 조회 + role-assignments grant/revoke).
    //   그 guard 는 `ADMIN_ROLES = ['platform:super_admin']` 이다(routes/admin/users.routes.ts:34).
    //
    //   기존 선언 `['admin','super_admin','platform:super_admin']` 은 백엔드가 거부하는
    //   legacy 역할을 통과시켜, 해당 사용자가 **화면에 진입한 뒤 모든 API 가 403** 이 됐다.
    //   선행 WO-O4O-ADMIN-MENU-ROUTE-BACKEND-ACCESS-ALIGNMENT-V1 이 `/users` 와
    //   `menuPermissions['core-users']` 만 정렬하고 이 route 를 남긴 누락이다.
    //
    //   `admin-menu-route-backend-alignment.test.ts` 의 `PLATFORM_SCOPED_SCREENS` 에
    //   `core-operators` 를 등재해 세 계층을 함께 고정한다.
    <Route key="/operators" path="/operators" element={
      <AdminProtectedRoute requiredRoles={[...PLATFORM_ADMIN_ROLES]}>
        <Suspense fallback={<PageLoader />}>
          <OperatorsPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // 사용자 관리
    //
    // WO-O4O-ADMIN-MENU-ROUTE-BACKEND-ACCESS-ALIGNMENT-V1
    //   이 화면들은 `/api/v1/admin/users` 를 소비하며(UsersListClean.tsx:72),
    //   그 guard 는 `ADMIN_ROLES = ['platform:super_admin']` 이다.
    //   메뉴(core-users)·route·백엔드가 같은 경계를 쓰도록 실제 역할을 선언한다.
    //   `requiredPermissions` 는 유지한다 — permission 공급 시 자동으로 AND 조건이 된다.
    <Route key="/users" path="/users" element={
      <AdminProtectedRoute requiredRoles={[...PLATFORM_ADMIN_ROLES]} requiredPermissions={['users:read']}>
        <Suspense fallback={<PageLoader />}>
          <UsersPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/users/add" path="/users/add" element={
      <AdminProtectedRoute requiredRoles={[...PLATFORM_ADMIN_ROLES]} requiredPermissions={['users:create']}>
        <Suspense fallback={<PageLoader />}>
          <UserForm />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/users/new" path="/users/new" element={
      <AdminProtectedRoute requiredRoles={[...PLATFORM_ADMIN_ROLES]} requiredPermissions={['users:create']}>
        <Suspense fallback={<PageLoader />}>
          <UserForm />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/users/:id" path="/users/:id" element={
      <AdminProtectedRoute requiredRoles={[...PLATFORM_ADMIN_ROLES]} requiredPermissions={['users:read']}>
        <Suspense fallback={<PageLoader />}>
          <UserDetail />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/users/:id/edit" path="/users/:id/edit" element={
      <AdminProtectedRoute requiredRoles={[...PLATFORM_ADMIN_ROLES]} requiredPermissions={['users:update']}>
        <Suspense fallback={<PageLoader />}>
          <UserForm />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // WO-O4O-KPA-BRANCH-SERVICE-MEMBER-APPROVAL-UI-V1: kpa-branch 서비스 가입 승인/반려
    //   백엔드 `/api/v1/kpa-branch/admin/service-members*` = adminGuards(kpa-branch:admin · platformBypass).
    //   이 사이트의 진입 floor 가 platform:super_admin 이므로 같은 경계를 route 에도 선언한다.
    //   kpa-branch member/operator 는 floor 에서 이미 막히고, 백엔드도 403 이다 (UI 숨김 ≠ 보안).
    <Route key="/admin/kpa-branch/service-members" path="/admin/kpa-branch/service-members" element={
      <AdminProtectedRoute requiredRoles={[...PLATFORM_ADMIN_ROLES]}>
        <Suspense fallback={<PageLoader />}>
          <BranchServiceMembersPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // WO-KPA-OPERATOR-SCOPE-ASSIGNMENT-OPS-V1: Operator Policy
    <Route key="/admin/operator/my-policy" path="/admin/operator/my-policy" element={
      <AdminProtectedRoute>
        <Suspense fallback={<PageLoader />}>
          <MyPolicyPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
  ];
}

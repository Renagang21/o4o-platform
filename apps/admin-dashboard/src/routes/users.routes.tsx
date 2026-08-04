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
// P0 RBAC: Enrollment Management
const EnrollmentManagement = lazy(() => import('@/pages/enrollments/EnrollmentManagement'));
// P4-Admin: Role Applications Management
const RoleApplicationsAdminPage = lazy(() => import('@/pages/RoleApplicationsAdminPage'));
// WO-KPA-OPERATOR-SCOPE-ASSIGNMENT-OPS-V1: Operator Policy
const MyPolicyPage = lazy(() => import('@/pages/operator/MyPolicyPage'));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-blue"></div>
  </div>
);

/**
 * User management routes — users, operators, enrollments, role applications
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
    <Route key="/operators" path="/operators" element={
      <AdminProtectedRoute requiredRoles={['admin', 'super_admin', 'platform:super_admin', 'platform:admin']}>
        <Suspense fallback={<PageLoader />}>
          <OperatorsPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // 사용자 관리
    //
    // WO-O4O-ADMIN-MENU-ROUTE-BACKEND-ACCESS-ALIGNMENT-V1
    //   이 화면들은 `/api/v1/admin/users` 를 소비하며(UsersListClean.tsx:72),
    //   그 guard 는 `ADMIN_ROLES = ['platform:admin','platform:super_admin']` 이다.
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

    // P0 RBAC: 역할 신청 관리
    <Route key="/enrollments" path="/enrollments" element={
      <AdminProtectedRoute requiredPermissions={['users:update']}>
        <Suspense fallback={<PageLoader />}>
          <EnrollmentManagement />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/enrollments" path="/admin/enrollments" element={
      <AdminProtectedRoute requiredPermissions={['users:update']}>
        <Suspense fallback={<PageLoader />}>
          <EnrollmentManagement />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // P4-Admin: 역할 신청 관리
    <Route key="/admin/role-applications" path="/admin/role-applications" element={
      <AdminProtectedRoute requiredPermissions={['users:update']}>
        <Suspense fallback={<PageLoader />}>
          <RoleApplicationsAdminPage />
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

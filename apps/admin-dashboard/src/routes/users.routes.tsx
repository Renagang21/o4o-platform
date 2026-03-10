import { Route } from 'react-router-dom';
import { AdminProtectedRoute } from '@o4o/auth-context';
import { Suspense, lazy } from 'react';

const UsersPage = lazy(() => import('@/pages/users'));
const UserForm = lazy(() => import('@/pages/users/UserForm'));
const UserDetail = lazy(() => import('@/pages/users/UserDetail'));
const RoleManagement = lazy(() => import('@/pages/users/RoleManagement'));
const UserStatistics = lazy(() => import('@/pages/users/UserStatistics'));
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
    <Route key="/users" path="/users" element={
      <AdminProtectedRoute requiredPermissions={['users:read']}>
        <Suspense fallback={<PageLoader />}>
          <UsersPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/users/add" path="/users/add" element={
      <AdminProtectedRoute requiredPermissions={['users:create']}>
        <Suspense fallback={<PageLoader />}>
          <UserForm />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/users/new" path="/users/new" element={
      <AdminProtectedRoute requiredPermissions={['users:create']}>
        <Suspense fallback={<PageLoader />}>
          <UserForm />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/users/roles" path="/users/roles" element={
      <AdminProtectedRoute requiredPermissions={['users:update']}>
        <Suspense fallback={<PageLoader />}>
          <RoleManagement />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/users/statistics" path="/users/statistics" element={
      <AdminProtectedRoute requiredPermissions={['users:read']}>
        <Suspense fallback={<PageLoader />}>
          <UserStatistics />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/users/:id" path="/users/:id" element={
      <AdminProtectedRoute requiredPermissions={['users:read']}>
        <Suspense fallback={<PageLoader />}>
          <UserDetail />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/users/:id/edit" path="/users/:id/edit" element={
      <AdminProtectedRoute requiredPermissions={['users:update']}>
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

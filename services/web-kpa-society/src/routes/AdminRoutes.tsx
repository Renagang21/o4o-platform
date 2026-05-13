/**
 * AdminRoutes - KPA 관리자 라우트 설정
 *
 * WO-O4O-KPA-ADMIN-ORG-MANAGEMENT-DEADCODE-REMOVE-V1:
 * 약사회 조직관리 성격의 잔존 라우트(committee-requests, stewards, annual-report,
 * fee, officers, settings, members) 및 관련 fallback redirect 제거.
 * 현재 구현 라우트: kpa-dashboard (관리자 홈)
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout, AdminAuthGuard } from '../components/admin';
import { KpaAdminDashboardPage } from '../pages/admin/KpaAdminDashboardPage';
// WO-O4O-KPA-ADMIN-MEMBER-MANAGEMENT-SEPARATION-V1
import AdminMemberManagementPage from '../pages/admin/AdminMemberManagementPage';

export function AdminRoutes() {
  return (
    <AdminAuthGuard>
      <Routes>
        <Route element={<AdminLayout />}>
          {/* 기본 경로 → 관리자 홈 */}
          <Route index element={<Navigate to="kpa-dashboard" replace />} />

          {/* 레거시 /dashboard → kpa-dashboard */}
          <Route path="dashboard" element={<Navigate to="kpa-dashboard" replace />} />

          {/* 관리자 홈 */}
          <Route path="kpa-dashboard" element={<KpaAdminDashboardPage />} />

          {/* WO-O4O-KPA-ADMIN-MEMBER-MANAGEMENT-SEPARATION-V1: admin 회원관리 (완전삭제) */}
          <Route path="members" element={<AdminMemberManagementPage />} />

          {/* 알 수 없는 경로 → 관리자 홈 */}
          <Route path="*" element={<Navigate to="kpa-dashboard" replace />} />
        </Route>
      </Routes>
    </AdminAuthGuard>
  );
}

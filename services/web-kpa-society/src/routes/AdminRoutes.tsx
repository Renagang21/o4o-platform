/**
 * AdminRoutes - 지부 관리자 라우트 설정 (구조 관리 전용)
 *
 * WO-KPA-ADMIN-OPERATOR-MENU-REALIGNMENT-V1:
 * - 콘텐츠 CRUD (news, docs, signage, forum) → OperatorRoutes 이동
 * - 요청 관리 (organization-requests, service-enrollments) → OperatorRoutes 이동
 * - Admin은 구조 관리만 담당: 분회, 회원, 위원회, 임원, 설정
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout, AdminAuthGuard } from '../components/admin';
import {
  DashboardPage,
  DivisionsPage,
  DivisionDetailPage,
  MembersPage,
  AnnualReportPage,
  MembershipFeePage,
  OfficersPage,
  SettingsPage,
} from '../pages/admin-branch';
import { CommitteeRequestsPage } from '../pages/admin/CommitteeRequestsPage';
import { KpaOperatorDashboardPage } from '../pages/admin/KpaOperatorDashboardPage';
import { StewardManagementPage } from '../pages/admin/StewardManagementPage';

export function AdminRoutes() {
  return (
    <AdminAuthGuard>
      <Routes>
        <Route element={<AdminLayout />}>
          {/* 기본 경로 → 대시보드로 리다이렉트 */}
          <Route index element={<Navigate to="dashboard" replace />} />

          {/* 대시보드 */}
          <Route path="dashboard" element={<DashboardPage />} />

          {/* 플랫폼 운영 대시보드 (WO-KPA-SOCIETY-OPERATOR-DASHBOARD-FRAME-V1) */}
          <Route path="kpa-dashboard" element={<KpaOperatorDashboardPage />} />

          {/* 분회 관리 */}
          <Route path="divisions" element={<DivisionsPage />} />
          <Route path="divisions/:divisionId" element={<DivisionDetailPage />} />

          {/* 회원 관리 */}
          <Route path="members" element={<MembersPage />} />

          {/* 위원회 관리 (요청 기반) */}
          <Route path="committee-requests" element={<CommitteeRequestsPage />} />

          {/* Steward 관리 (WO-KPA-STEWARDSHIP-AND-ORGANIZATION-UI-IMPLEMENTATION-V1) */}
          <Route path="stewards" element={<StewardManagementPage />} />

          {/* 신상신고 */}
          <Route path="annual-report" element={<AnnualReportPage />} />

          {/* 연회비 */}
          <Route path="fee" element={<MembershipFeePage />} />

          {/* 임원 관리 */}
          <Route path="officers" element={<OfficersPage />} />

          {/* 설정 */}
          <Route path="settings" element={<SettingsPage />} />

          {/* 404 - 알 수 없는 경로 */}
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>
      </Routes>
    </AdminAuthGuard>
  );
}

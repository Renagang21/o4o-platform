/**
 * AdminRoutes - KPA 관리자 라우트 설정
 *
 * WO-KPA-A-BRANCH-CHAPTER-REMOVAL-PHASE4-DEAD-CODE-AND-DROP-V1:
 * 분회/지부 관련 admin-branch 페이지 제거 완료.
 * 분회 관련 경로는 kpa-dashboard로 리다이렉트.
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout, AdminAuthGuard } from '../components/admin';
import { CommitteeRequestsPage } from '../pages/admin/CommitteeRequestsPage';
import { KpaOperatorDashboardPage } from '../pages/admin/KpaOperatorDashboardPage';
import { StewardManagementPage } from '../pages/admin/StewardManagementPage';

export function AdminRoutes() {
  return (
    <AdminAuthGuard>
      <Routes>
        <Route element={<AdminLayout />}>
          {/* 기본 경로 → KPA 대시보드로 리다이렉트 */}
          <Route index element={<Navigate to="kpa-dashboard" replace />} />

          {/* 대시보드 (레거시 /dashboard → kpa-dashboard) */}
          <Route path="dashboard" element={<Navigate to="kpa-dashboard" replace />} />

          {/* 플랫폼 운영 대시보드 */}
          <Route path="kpa-dashboard" element={<KpaOperatorDashboardPage />} />

          {/* 위원회 관리 */}
          <Route path="committee-requests" element={<CommitteeRequestsPage />} />

          {/* Steward 관리 */}
          <Route path="stewards" element={<StewardManagementPage />} />

          {/* 분회/지부 관련 경로 → kpa-dashboard 리다이렉트 */}
          <Route path="divisions" element={<Navigate to="kpa-dashboard" replace />} />
          <Route path="divisions/:divisionId" element={<Navigate to="kpa-dashboard" replace />} />
          <Route path="members" element={<Navigate to="kpa-dashboard" replace />} />
          <Route path="annual-report" element={<Navigate to="kpa-dashboard" replace />} />
          <Route path="fee" element={<Navigate to="kpa-dashboard" replace />} />
          <Route path="officers" element={<Navigate to="kpa-dashboard" replace />} />
          <Route path="settings" element={<Navigate to="kpa-dashboard" replace />} />

          {/* 404 - 알 수 없는 경로 */}
          <Route path="*" element={<Navigate to="kpa-dashboard" replace />} />
        </Route>
      </Routes>
    </AdminAuthGuard>
  );
}

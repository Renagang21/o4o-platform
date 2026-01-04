/**
 * AdminRoutes - 지부 관리자 라우트 설정
 * WO-KPA-COMMITTEE-GOVERNANCE-V1: 위원회 관리 라우트 추가
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
  NewsPage,
  DocsPage,
  ForumPage,
  OfficersPage,
  SettingsPage,
} from '../pages/admin-branch';
import { CommitteeRequestsPage } from '../pages/admin/CommitteeRequestsPage';

export function AdminRoutes() {
  return (
    <AdminAuthGuard>
      <Routes>
        <Route element={<AdminLayout />}>
          {/* 기본 경로 → 대시보드로 리다이렉트 */}
          <Route index element={<Navigate to="dashboard" replace />} />

          {/* 대시보드 */}
          <Route path="dashboard" element={<DashboardPage />} />

          {/* 분회 관리 */}
          <Route path="divisions" element={<DivisionsPage />} />
          <Route path="divisions/:divisionId" element={<DivisionDetailPage />} />

          {/* 회원 관리 */}
          <Route path="members" element={<MembersPage />} />

          {/* 위원회 관리 (요청 기반) */}
          <Route path="committee-requests" element={<CommitteeRequestsPage />} />

          {/* 신상신고 */}
          <Route path="annual-report" element={<AnnualReportPage />} />

          {/* 연회비 */}
          <Route path="fee" element={<MembershipFeePage />} />

          {/* 공지사항 */}
          <Route path="news" element={<NewsPage />} />

          {/* 자료실 */}
          <Route path="docs" element={<DocsPage />} />

          {/* 게시판 */}
          <Route path="forum" element={<ForumPage />} />

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

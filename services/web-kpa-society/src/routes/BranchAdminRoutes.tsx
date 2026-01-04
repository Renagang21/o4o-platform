/**
 * BranchAdminRoutes - 분회 관리자 라우팅
 * 경로: /branch/:branchId/admin/*
 *
 * 권한 체크: BranchAdminAuthGuard가 분회 관리자 권한을 확인합니다.
 * - 로그인 필수
 * - 해당 분회의 관리자 권한 필요 (membership_branch_admin 또는 상위 권한)
 */

import { Routes, Route } from 'react-router-dom';
import { AdminLayout, BranchAdminAuthGuard } from '../components/branch-admin';
import {
  DashboardPage,
  MembersPage,
  AnnualReportPage,
  MembershipFeePage,
  NewsManagementPage,
  ForumManagementPage,
  DocsManagementPage,
  OfficersPage,
  SettingsPage,
} from '../pages/branch-admin';

export function BranchAdminRoutes() {
  return (
    <BranchAdminAuthGuard>
      <Routes>
        <Route element={<AdminLayout />}>
        {/* 대시보드 */}
        <Route index element={<DashboardPage />} />

        {/* 회원 관리 */}
        <Route path="members" element={<MembersPage />} />
        <Route path="members/:memberId" element={<MembersPage />} />

        {/* 신상신고 */}
        <Route path="annual-report" element={<AnnualReportPage />} />
        <Route path="annual-report/:reportId" element={<AnnualReportPage />} />

        {/* 연회비 */}
        <Route path="membership-fee" element={<MembershipFeePage />} />

        {/* 공지사항 */}
        <Route path="news" element={<NewsManagementPage />} />
        <Route path="news/new" element={<NewsManagementPage />} />
        <Route path="news/:newsId" element={<NewsManagementPage />} />
        <Route path="news/:newsId/edit" element={<NewsManagementPage />} />

        {/* 게시판 */}
        <Route path="forum" element={<ForumManagementPage />} />
        <Route path="forum/:postId" element={<ForumManagementPage />} />

        {/* 자료실 */}
        <Route path="docs" element={<DocsManagementPage />} />

        {/* 임원 관리 */}
        <Route path="officers" element={<OfficersPage />} />

        {/* 분회 설정 */}
        <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BranchAdminAuthGuard>
  );
}

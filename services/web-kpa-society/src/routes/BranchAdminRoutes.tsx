/**
 * BranchAdminRoutes - 분회 관리자 라우팅
 *
 * SVC-C: 분회 관리자 대시보드
 * WO-KPA-C-BRANCH-ADMIN-IMPLEMENTATION-V1
 *
 * 분회 관리자 6개 기능:
 * - 대시보드, 공지사항, 게시판 관리, 자료실, 임원 관리, 분회 설정
 *
 * 권한 체크: BranchAdminAuthGuard (kpa-c:branch_admin + 상위 역할)
 */

import { Routes, Route } from 'react-router-dom';
import { AdminLayout, BranchAdminAuthGuard } from '../components/branch-admin';
import {
  DashboardPage,
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

        {/* 공지사항 */}
        <Route path="news" element={<NewsManagementPage />} />
        <Route path="news/new" element={<NewsManagementPage />} />
        <Route path="news/:newsId" element={<NewsManagementPage />} />
        <Route path="news/:newsId/edit" element={<NewsManagementPage />} />

        {/* 게시판 관리 */}
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

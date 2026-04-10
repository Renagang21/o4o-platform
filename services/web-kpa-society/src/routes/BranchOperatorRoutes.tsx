/**
 * BranchOperatorRoutes - 분회 운영자 라우팅 (상태 관리 + 콘텐츠 CRUD)
 *
 * WO-KPA-C-BRANCH-OPERATOR-IMPLEMENTATION-V1
 * SVC-C: 분회 운영자 대시보드
 *
 * WO-KPA-ADMIN-OPERATOR-MENU-REALIGNMENT-V1:
 * - 콘텐츠 CRUD (공지사항, 게시판, 자료실) BranchAdminRoutes에서 이동
 *
 * 경로: /branch-services/:branchId/operator/*
 * - (index)          → BranchOperatorDashboard
 * - forum-management → ForumManagementPage (KPA-a 재사용)
 * - signage/content  → ContentHubPage
 * - operators        → /operator/users 리다이렉트 (WO-KPA-OPERATOR-MANAGEMENT-MIGRATION-V1)
 * - news/*           → NewsManagementPage (BranchAdmin에서 이동)
 * - forum/*          → ForumManagementPage (BranchAdmin에서 이동)
 * - docs             → DocsManagementPage (BranchAdmin에서 이동)
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { BranchOperatorAuthGuard, BranchOperatorLayout } from '../components/branch-operator';
import { BranchOperatorDashboard } from '../pages/branch-operator/BranchOperatorDashboard';
import { ForumManagementPage } from '../pages/operator';
import { NewsManagementPage, ForumManagementPage as BranchForumManagementPage, DocsManagementPage } from '../pages/branch-admin';
import ContentHubPage from '../pages/signage/ContentHubPage';

export function BranchOperatorRoutes() {
  return (
    <BranchOperatorAuthGuard>
      <Routes>
        <Route element={<BranchOperatorLayout />}>
          <Route index element={<BranchOperatorDashboard />} />
          <Route path="forum-management" element={<ForumManagementPage />} />
          <Route path="signage/content" element={<ContentHubPage operatorMode />} />
          {/* 레거시 리다이렉트 (WO-KPA-OPERATOR-MANAGEMENT-MIGRATION-V1) */}
          <Route path="operators" element={<Navigate to="/operator/users" replace />} />

          {/* 콘텐츠 CRUD (WO-KPA-ADMIN-OPERATOR-MENU-REALIGNMENT-V1: BranchAdmin에서 이동) */}
          <Route path="news" element={<NewsManagementPage />} />
          <Route path="news/new" element={<NewsManagementPage />} />
          <Route path="news/:newsId" element={<NewsManagementPage />} />
          <Route path="news/:newsId/edit" element={<NewsManagementPage />} />
          <Route path="forum" element={<BranchForumManagementPage />} />
          <Route path="forum/:postId" element={<BranchForumManagementPage />} />
          <Route path="docs" element={<DocsManagementPage />} />
        </Route>
      </Routes>
    </BranchOperatorAuthGuard>
  );
}

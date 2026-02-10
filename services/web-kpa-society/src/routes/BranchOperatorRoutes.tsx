/**
 * BranchOperatorRoutes - 분회 운영자 라우팅
 *
 * WO-KPA-C-BRANCH-OPERATOR-IMPLEMENTATION-V1
 * SVC-C: 분회 운영자 대시보드 (4개 페이지)
 *
 * 경로: /branch-services/:branchId/operator/*
 * - (index)          → OperatorDashboard
 * - forum-management → ForumManagementPage
 * - signage/content  → ContentHubPage
 * - operators        → OperatorManagementPage
 *
 * 기존 KPA-b 페이지를 재사용, 경로·스코프만 조정
 */

import { Routes, Route } from 'react-router-dom';
import { BranchOperatorAuthGuard, BranchOperatorLayout } from '../components/branch-operator';
import { OperatorDashboard, ForumManagementPage, OperatorManagementPage } from '../pages/operator';
import ContentHubPage from '../pages/signage/ContentHubPage';

export function BranchOperatorRoutes() {
  return (
    <BranchOperatorAuthGuard>
      <Routes>
        <Route element={<BranchOperatorLayout />}>
          <Route index element={<OperatorDashboard />} />
          <Route path="forum-management" element={<ForumManagementPage />} />
          <Route path="signage/content" element={<ContentHubPage />} />
          <Route path="operators" element={<OperatorManagementPage />} />
        </Route>
      </Routes>
    </BranchOperatorAuthGuard>
  );
}

/**
 * BranchOperatorRoutes - 분회 운영자 라우팅
 *
 * WO-KPA-C-BRANCH-OPERATOR-IMPLEMENTATION-V1
 * SVC-C: 분회 운영자 대시보드 (4개 페이지)
 *
 * 경로: /branch-services/:branchId/operator/*
 * - (index)          → BranchOperatorDashboard (UX 재구성)
 * - forum-management → ForumManagementPage
 * - signage/content  → ContentHubPage
 * - operators        → OperatorManagementPage
 *
 * Dashboard: KPA-c 전용 (WO-KPA-C-BRANCH-OPERATOR-DASHBOARD-UX-V1)
 * 나머지: 기존 KPA-b 페이지 재사용
 */

import { Routes, Route } from 'react-router-dom';
import { BranchOperatorAuthGuard, BranchOperatorLayout } from '../components/branch-operator';
import { BranchOperatorDashboard } from '../pages/branch-operator/BranchOperatorDashboard';
import { ForumManagementPage, OperatorManagementPage } from '../pages/operator';
import ContentHubPage from '../pages/signage/ContentHubPage';

export function BranchOperatorRoutes() {
  return (
    <BranchOperatorAuthGuard>
      <Routes>
        <Route element={<BranchOperatorLayout />}>
          <Route index element={<BranchOperatorDashboard />} />
          <Route path="forum-management" element={<ForumManagementPage />} />
          <Route path="signage/content" element={<ContentHubPage />} />
          <Route path="operators" element={<OperatorManagementPage />} />
        </Route>
      </Routes>
    </BranchOperatorAuthGuard>
  );
}

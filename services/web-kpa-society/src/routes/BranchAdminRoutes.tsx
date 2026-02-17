/**
 * BranchAdminRoutes - 분회 관리자 라우팅 (구조 관리 전용)
 *
 * SVC-C: 분회 관리자 대시보드
 * WO-KPA-C-BRANCH-ADMIN-IMPLEMENTATION-V1
 *
 * WO-KPA-ADMIN-OPERATOR-MENU-REALIGNMENT-V1:
 * - 콘텐츠 CRUD (공지사항, 게시판, 자료실) → BranchOperatorRoutes 이동
 * - Admin은 구조 관리만: 대시보드, 임원 관리, 분회 설정
 *
 * 권한 체크: BranchAdminAuthGuard (kpa-c:branch_admin + 상위 역할)
 */

import { Routes, Route } from 'react-router-dom';
import { AdminLayout, BranchAdminAuthGuard } from '../components/branch-admin';
import {
  DashboardPage,
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

        {/* 임원 관리 */}
        <Route path="officers" element={<OfficersPage />} />

        {/* 분회 설정 */}
        <Route path="settings" element={<SettingsPage />} />

        </Route>
      </Routes>
    </BranchAdminAuthGuard>
  );
}

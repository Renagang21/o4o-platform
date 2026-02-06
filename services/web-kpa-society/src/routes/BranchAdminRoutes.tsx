/**
 * BranchAdminRoutes - 분회 관리자 라우팅
 *
 * SVC-C: 분회 관리자 콘텐츠 관리
 * WO-KPA-SOCIETY-PHASE6-BRANCH-UX-STANDARD-V1 (T6-4)
 *
 * 분회 관리자 역할: "콘텐츠 관리자" (content-only)
 * - 공지사항(news), 자료실(docs), 임원(officers), 게시판(forum) 관리만 허용
 * - 회원 관리, 신상신고, 연회비, 회원 현황, 설정은 본부/지부 관리자 전용
 *
 * 권한 체크: BranchAdminAuthGuard가 분회 관리자 권한을 확인합니다.
 * - 로그인 필수
 * - 해당 분회의 관리자 권한 필요 (membership_branch_admin 또는 상위 권한)
 */

import { Routes, Route } from 'react-router-dom';
import { AdminLayout, BranchAdminAuthGuard } from '../components/branch-admin';
import {
  DashboardPage,
  NewsManagementPage,
  ForumManagementPage,
  DocsManagementPage,
  OfficersPage,
} from '../pages/branch-admin';

export function BranchAdminRoutes() {
  return (
    <BranchAdminAuthGuard>
      <Routes>
        <Route element={<AdminLayout />}>
        {/* 대시보드 */}
        <Route index element={<DashboardPage />} />

        {/* ─── 콘텐츠 관리 (T6-4 허용 범위) ─── */}

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

        {/* ─── 본부/지부 전용 (분회 관리자 접근 제한) ─── */}
        {/* T6-4: 아래 기능은 분회 관리자 범위 밖 — 본부/지부에서 관리 */}
        {/* members, annual-report, membership-fee, member-status, settings */}

        </Route>
      </Routes>
    </BranchAdminAuthGuard>
  );
}

/**
 * IntranetRoutes - 인트라넷 라우트 설정
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { IntranetLayout, IntranetAuthGuard } from '../components/intranet';
import {
  DashboardPage,
  NoticeListPage,
  NoticeDetailPage,
  NoticeWritePage,
  MeetingListPage,
  MeetingDetailPage,
  DocumentListPage,
  SchedulePage,
  SettingsPage,
} from '../pages/intranet';

// WO-KPA-TEST-FEEDBACK-BOARD-V1: 피드백 게시판
import {
  FeedbackListPage,
  FeedbackNewPage,
  FeedbackDetailPage,
} from '../pages/feedback';

export function IntranetRoutes() {
  return (
    <IntranetAuthGuard>
      <Routes>
        <Route element={<IntranetLayout />}>
          {/* 기본 경로 → 대시보드 */}
          <Route index element={<DashboardPage />} />

          {/* 공지 */}
          <Route path="notice" element={<NoticeListPage />} />
          <Route path="notice/write" element={<NoticeWritePage />} />
          <Route path="notice/:id" element={<NoticeDetailPage />} />
          <Route path="notice/:id/edit" element={<NoticeWritePage />} />

          {/* 회의 */}
          <Route path="meetings" element={<MeetingListPage />} />
          <Route path="meetings/new" element={<MeetingDetailPage />} />
          <Route path="meetings/:id" element={<MeetingDetailPage />} />

          {/* 문서 */}
          <Route path="documents" element={<DocumentListPage />} />
          <Route path="documents/:id" element={<DocumentListPage />} />

          {/* 일정 */}
          <Route path="schedule" element={<SchedulePage />} />

          {/* 조직 설정 (관리자) */}
          <Route path="settings" element={<SettingsPage />} />

          {/* WO-KPA-TEST-FEEDBACK-BOARD-V1: 피드백 게시판 */}
          <Route path="feedback" element={<FeedbackListPage />} />
          <Route path="feedback/new" element={<FeedbackNewPage />} />
          <Route path="feedback/:id" element={<FeedbackDetailPage />} />

          {/* 404 */}
          <Route path="*" element={<Navigate to="" replace />} />
        </Route>
      </Routes>
    </IntranetAuthGuard>
  );
}

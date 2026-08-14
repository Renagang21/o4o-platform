/**
 * CourseDetailPage — GlycoPharm 강의 상세
 *
 * WO-O4O-COMMUNITY-LMS-COURSE-DETAIL-AND-LESSON-PLAYER-COMMONIZATION-V1:
 * 화면 구현은 공통 `CourseDetailView` 로 이관하고, 본 파일은 GlycoPharm 어댑터
 * (port / config / 서비스 고유 slot)만 담당한다.
 *
 * GlycoPharm 유지 정책:
 *  - 레슨 재생은 인라인이 아니라 canonical 경로 `/lms/course/:id/lesson/:lessonId` (KPA/KCos 와 동일 축)
 *  - 수료증은 별도 화면 없이 사이드바에서 PDF 다운로드
 *  - 비로그인 수강신청 → LoginModal
 */

import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { AppreciationPanel } from '@o4o/shared-space-ui';
import { CourseDetailView, type LmsViewConfig } from '@o4o/lms-ui';
import { appreciationPanelApi } from '@/api/appreciation';
import { useAuth } from '@/contexts/AuthContext';
import { useLoginModal } from '@/contexts/LoginModalContext';
import { GP_LMS_ACCENT, GP_LMS_HUB_PATH, gpLmsLabels, gpLmsPort } from './lmsViewAdapter';
import { CourseCertificateCard } from './CourseCertificateCard';

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { openLoginModal } = useLoginModal();

  // WO-O4O-APPRECIATION-GLYCO-KCOS-MIGRATION-V1: AppreciationPanel onError 핸들러
  const handleAppreciationError = (err: any) => {
    const msg = String(err?.response?.data?.error || err?.message || '');
    if (msg.includes('INSUFFICIENT_BALANCE') || msg.includes('부족')) toast.error('포인트가 부족합니다');
    else if (msg.includes('SELF')) toast.error('자신의 강의에는 감사 포인트를 보낼 수 없습니다');
    else toast.error('감사 포인트 전송에 실패했습니다');
  };

  const config: LmsViewConfig = useMemo(
    () => ({
      accent: GP_LMS_ACCENT,
      hubPath: GP_LMS_HUB_PATH,
      // 수료증 전용 화면 없음 — 사이드바 다운로드 카드로 대체
      onCertificateUnavailable: () => toast.info('수료증은 아래 다운로드 카드에서 받을 수 있습니다.'),
      isAuthenticated,
      onRequireLogin: () => openLoginModal(),
      navigate: (path: string) => navigate(path),
      notify: { success: (m) => toast.success(m), error: (m) => toast.error(m) },
      labels: gpLmsLabels,
    }),
    [isAuthenticated, navigate, openLoginModal],
  );

  if (!id) return null;

  return (
    <CourseDetailView
      courseId={id}
      port={gpLmsPort}
      config={config}
      renderAfterCourseCard={({ course }) => (
        <AppreciationPanel
          targetType="lms_course"
          targetId={course.id}
          api={appreciationPanelApi}
          currentUserId={user?.id ?? null}
          theme="emerald"
          variant="inline"
          buttonLabel="🎁 강사에게 감사하기"
          onSent={({ amount }) => toast.success(`${amount}P 감사 포인트를 전달했습니다 🎁`)}
          onError={handleAppreciationError}
        />
      )}
      renderSidebarExtra={({ course, enrollment }) => (
        <CourseCertificateCard courseId={course.id} enrollment={enrollment} />
      )}
    />
  );
}

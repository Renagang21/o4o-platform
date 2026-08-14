/**
 * LmsLessonPage — GlycoPharm 레슨 플레이어
 *
 * WO-O4O-COMMUNITY-LMS-COURSE-DETAIL-AND-LESSON-PLAYER-COMMONIZATION-V1:
 * 플레이어 구현(본문·퀴즈·과제·AI·진도/완료·이전·다음)은 공통 `LessonPlayerView` 로 이관하고,
 * 본 파일은 GlycoPharm 어댑터(port / config / 본문 렌더러)만 담당한다.
 */

import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { ContentRenderer } from '@o4o/content-editor';
import { LessonPlayerView, type LmsViewConfig } from '@o4o/lms-ui';
import { GP_LMS_ACCENT, GP_LMS_HUB_PATH, gpLmsLabels, gpLmsPort } from './lmsViewAdapter';

export default function LmsLessonPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();

  const config: LmsViewConfig = useMemo(
    () => ({
      accent: GP_LMS_ACCENT,
      hubPath: GP_LMS_HUB_PATH,
      // 수료증 전용 화면 없음 — 상세 사이드바 다운로드 카드로 안내
      onCertificateUnavailable: () => toast.info('수료증은 강의 상세 화면에서 받을 수 있습니다.'),
      isAuthenticated: true,
      navigate: (path: string) => navigate(path),
      notify: { success: (m) => toast.success(m), error: (m) => toast.error(m) },
      labels: gpLmsLabels,
    }),
    [navigate],
  );

  if (!courseId || !lessonId) return null;

  return (
    <LessonPlayerView
      courseId={courseId}
      lessonId={lessonId}
      port={gpLmsPort}
      config={config}
      // 플랫폼 표준 sanitized 렌더러 유지
      renderHtml={(html) => <ContentRenderer html={html} />}
    />
  );
}

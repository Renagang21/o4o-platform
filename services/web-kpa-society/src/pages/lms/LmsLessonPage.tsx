/**
 * LmsLessonPage - 단계 보기 페이지
 *
 * WO-O4O-COMMUNITY-LMS-COURSE-DETAIL-AND-LESSON-PLAYER-COMMONIZATION-V1:
 * 플레이어 구현(본문·퀴즈·과제·AI·진도/완료·이전·다음)은 공통 `LessonPlayerView` 로 이관하고,
 * 본 파일은 KPA 어댑터(port / config / 본문 렌더러)만 담당한다.
 */

import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { ContentRenderer } from '@o4o/content-editor';
import { LessonPlayerView, type LmsViewConfig } from '@o4o/lms-ui';
import {
  KPA_LMS_ACCENT,
  KPA_LMS_CERTIFICATES_PATH,
  KPA_LMS_HUB_PATH,
  kpaLmsLabels,
  kpaLmsPort,
} from './lmsViewAdapter';

export function LmsLessonPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();

  const config: LmsViewConfig = useMemo(
    () => ({
      accent: KPA_LMS_ACCENT,
      hubPath: KPA_LMS_HUB_PATH,
      certificatesPath: KPA_LMS_CERTIFICATES_PATH,
      isAuthenticated: true,
      navigate: (path: string) => navigate(path),
      notify: { success: (m) => toast.success(m), error: (m) => toast.error(m) },
      labels: kpaLmsLabels,
    }),
    [navigate],
  );

  if (!courseId || !lessonId) return null;

  return (
    <LessonPlayerView
      courseId={courseId}
      lessonId={lessonId}
      port={kpaLmsPort}
      config={config}
      // 플랫폼 표준 sanitized 렌더러 유지
      renderHtml={(html) => <ContentRenderer html={html} />}
    />
  );
}

/**
 * LmsLessonPage — Pharmacy-Hub 레슨 플레이어
 *
 * WO-O4O-COMMUNITY-PHARMACYHUB-BASELINE-AND-CROSSSERVICE-MYPOSTS-ADOPTION-V1 §7·§8
 * 화면은 공통 `LessonPlayerView`. 본 파일은 PH 어댑터(port/config/본문 렌더러)만 담당한다.
 */

import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { ContentRenderer } from '@o4o/content-editor';
import { LessonPlayerView, type LmsViewConfig } from '@o4o/lms-ui';
import { PH_LMS_ACCENT, PH_LMS_HUB_PATH, phLmsLabels, phLmsPort } from './lmsViewAdapter';

export default function LmsLessonPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();

  const config: LmsViewConfig = useMemo(
    () => ({
      accent: PH_LMS_ACCENT,
      hubPath: PH_LMS_HUB_PATH,
      certificatesPath: null,
      isAuthenticated: true,
      navigate: (path: string) => navigate(path),
      notify: { success: (m) => toast.success(m), error: (m) => toast.error(m) },
      labels: phLmsLabels,
      enrollmentEnabled: false,
    }),
    [navigate],
  );

  if (!courseId || !lessonId) return null;

  return (
    <LessonPlayerView
      courseId={courseId}
      lessonId={lessonId}
      port={phLmsPort}
      config={config}
      renderHtml={(html) => <ContentRenderer html={html} />}
    />
  );
}

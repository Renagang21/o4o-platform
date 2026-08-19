/**
 * LmsCourseDetailPage — Pharmacy-Hub 강의 상세
 *
 * WO-O4O-COMMUNITY-PHARMACYHUB-BASELINE-AND-CROSSSERVICE-MYPOSTS-ADOPTION-V1 §7·§8
 * 화면은 공통 `CourseDetailView`. 본 파일은 PH 어댑터(port/config)만 담당한다.
 */

import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { CourseDetailView, type LmsViewConfig } from '@o4o/lms-ui';
import { PH_LMS_ACCENT, PH_LMS_HUB_PATH, phLmsLabels, phLmsPort } from './lmsViewAdapter';

export default function LmsCourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const config: LmsViewConfig = useMemo(
    () => ({
      accent: PH_LMS_ACCENT,
      hubPath: PH_LMS_HUB_PATH,
      // 수료증 미제공 — 링크를 만들지 않는다(dead link 금지).
      certificatesPath: null,
      isAuthenticated: true,
      navigate: (path: string) => navigate(path),
      notify: { success: (m) => toast.success(m), error: (m) => toast.error(m) },
      labels: phLmsLabels,
      // §8: 수강신청·진도 범위 밖
      enrollmentEnabled: false,
    }),
    [navigate],
  );

  if (!id) return null;

  return <CourseDetailView courseId={id} port={phLmsPort} config={config} />;
}

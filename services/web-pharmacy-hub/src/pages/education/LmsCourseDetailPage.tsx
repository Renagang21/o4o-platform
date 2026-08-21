/**
 * LmsCourseDetailPage — Pharmacy-Hub 강의 상세
 *
 * WO-O4O-COMMUNITY-PHARMACYHUB-BASELINE-AND-CROSSSERVICE-MYPOSTS-ADOPTION-V1 §7
 * 화면은 공통 `CourseDetailView`. 본 파일은 PH 어댑터(port/config)만 담당한다.
 *
 * WO-O4O-PHARMACYHUB-LMS-LEARNER-FULL-ADOPTION-V1 §5·§6·§10:
 *   enrollment 활성화 + 수료증 경로 연결 + 실제 로그인 상태 주입.
 */

import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { CourseDetailView, type LmsViewConfig } from '@o4o/lms-ui';
import { useAuth } from '../../contexts/AuthContext';
import {
  PH_LMS_ACCENT,
  PH_LMS_CERTIFICATES_PATH,
  PH_LMS_HUB_PATH,
  phLmsLabels,
  phLmsPort,
} from './lmsViewAdapter';

export default function LmsCourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const config: LmsViewConfig = useMemo(
    () => ({
      accent: PH_LMS_ACCENT,
      hubPath: PH_LMS_HUB_PATH,
      certificatesPath: PH_LMS_CERTIFICATES_PATH,
      isAuthenticated,
      onRequireLogin: () => navigate('/login'),
      navigate: (path: string) => navigate(path),
      notify: { success: (m) => toast.success(m), error: (m) => toast.error(m) },
      labels: phLmsLabels,
    }),
    [navigate, isAuthenticated],
  );

  if (!id) return null;

  return <CourseDetailView courseId={id} port={phLmsPort} config={config} />;
}

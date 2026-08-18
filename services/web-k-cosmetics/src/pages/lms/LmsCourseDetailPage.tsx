/**
 * LmsCourseDetailPage — K-Cosmetics 강의 상세 페이지
 *
 * WO-O4O-COMMUNITY-LMS-COURSE-DETAIL-AND-LESSON-PLAYER-COMMONIZATION-V1:
 * 화면 구현은 공통 `CourseDetailView` 로 이관하고, 본 파일은 K-Cosmetics 어댑터
 * (port / config / 서비스 고유 slot)만 담당한다.
 *
 * K-Cosmetics 정책 유지:
 *  - accent = 브랜드 pink
 *  - 수료증 화면 미제공 → '준비 중' 안내
 *  - AppreciationPanel theme="pink"
 */

import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { AppreciationPanel } from '@o4o/shared-space-ui';
import { CourseDetailView, type LmsViewConfig } from '@o4o/lms-ui';
import { appreciationPanelApi } from '@/api/appreciation';
import { useAuth } from '../../contexts/AuthContext';
import {
  KCOS_LMS_ACCENT,
  KCOS_LMS_HUB_PATH,
  kcosLmsLabels,
  kcosLmsPort,
} from './lmsViewAdapter';

export default function LmsCourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // K-Cosmetics axios 래퍼 err.response.data.error 패턴 (KPA err.message 와 다름)
  const handleAppreciationError = (err: any) => {
    const msg = String(err?.response?.data?.error || err?.message || '');
    if (msg.includes('INSUFFICIENT_BALANCE') || msg.includes('부족')) toast.error('포인트가 부족합니다');
    else if (msg.includes('SELF')) toast.error('자신의 강의에는 감사 포인트를 보낼 수 없습니다');
    else toast.error('감사 포인트 전송에 실패했습니다');
  };

  const config: LmsViewConfig = useMemo(
    () => ({
      accent: KCOS_LMS_ACCENT,
      hubPath: KCOS_LMS_HUB_PATH,
      // 수료증 화면 미제공 — 링크 대신 안내
      onCertificateUnavailable: () => toast.info('수료증 기능은 준비 중입니다.'),
      isAuthenticated: !!user,
      onRequireLogin: () => navigate('/login'),
      navigate: (path: string) => navigate(path),
      notify: { success: (m) => toast.success(m), error: (m) => toast.error(m) },
      labels: kcosLmsLabels,
    }),
    [navigate, user],
  );

  if (!id) return null;

  return (
    <CourseDetailView
      courseId={id}
      port={kcosLmsPort}
      config={config}
      renderAfterCourseCard={({ course }) => (
        // WO-O4O-APPRECIATION-GLYCO-KCOS-MIGRATION-V1: 공통 AppreciationPanel
        <AppreciationPanel
          targetType="lms_course"
          targetId={course.id}
          api={appreciationPanelApi}
          currentUserId={user?.id ?? null}
          theme="pink"
          variant="inline"
          buttonLabel="🎁 강사에게 감사하기"
          onSent={({ amount }) => toast.success(`${amount}P 감사 포인트를 전달했습니다 🎁`)}
          onError={handleAppreciationError}
        />
      )}
    />
  );
}

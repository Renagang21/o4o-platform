/**
 * LmsCourseDetailPage - 안내 흐름 상세 페이지
 *
 * WO-O4O-COMMUNITY-LMS-COURSE-DETAIL-AND-LESSON-PLAYER-COMMONIZATION-V1:
 * 화면 구현은 공통 `CourseDetailView` 로 이관하고, 본 파일은 KPA 어댑터
 * (port / config / 서비스 고유 slot)만 담당한다.
 *
 * 핵심 원칙:
 * - 이 기능은 교육이나 평가를 위한 것이 아닙니다
 * - 콘텐츠를 순서대로 안내하기 위한 도구입니다
 */

import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { AppreciationPanel } from '@o4o/shared-space-ui';
import { CourseDetailView, type LmsViewConfig } from '@o4o/lms-ui';
import { appreciationPanelApi } from '../../api/appreciation';
import { useAuth } from '../../contexts';
import {
  KPA_LMS_ACCENT,
  KPA_LMS_CERTIFICATES_PATH,
  KPA_LMS_HUB_PATH,
  kpaLmsLabels,
  kpaLmsPort,
} from './lmsViewAdapter';

export function LmsCourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // WO-O4O-KPA-APPRECIATION-LMS-CONTENT-EXPANSION-V1: AppreciationPanel onError 핸들러
  // KPA apiClient err.message 패턴 (Glyco/K-Cos 의 err.response.data.error 와 다름)
  const handleAppreciationError = (err: any) => {
    const msg = err?.message || '';
    if (msg.includes('INSUFFICIENT_BALANCE') || msg.includes('부족')) toast.error('포인트가 부족합니다');
    else if (msg.includes('SELF')) toast.error('자신의 강의에는 감사 포인트를 보낼 수 없습니다');
    else if (msg.includes('INVALID')) toast.error('금액은 1P 이상이어야 합니다');
    else toast.error('감사 포인트 전송에 실패했습니다');
  };

  const config: LmsViewConfig = useMemo(
    () => ({
      accent: KPA_LMS_ACCENT,
      hubPath: KPA_LMS_HUB_PATH,
      certificatesPath: KPA_LMS_CERTIFICATES_PATH,
      isAuthenticated: !!user,
      // WO-KPA-LMS-COURSE-VISIBILITY-ACCESS-POLICY-V1: 회원제 강의 + 비로그인 → 원래 위치 보존 로그인
      onRequireLogin: () => navigate('/login', { state: { from: `/lms/course/${id}` } }),
      navigate: (path: string) => navigate(path),
      notify: { success: (m) => toast.success(m), error: (m) => toast.error(m) },
      labels: kpaLmsLabels,
    }),
    [id, navigate, user],
  );

  if (!id) return null;

  return (
    <CourseDetailView
      courseId={id}
      port={kpaLmsPort}
      config={config}
      renderAfterCourseCard={({ course }) => (
        // WO-O4O-KPA-APPRECIATION-LMS-CONTENT-EXPANSION-V1: 공통 AppreciationPanel
        <AppreciationPanel
          targetType="lms_course"
          targetId={course.id}
          api={appreciationPanelApi}
          currentUserId={user?.id ?? null}
          theme="blue"
          variant="inline"
          buttonLabel="🎁 강사에게 감사하기"
          onSent={({ amount }) => toast.success(`${amount}P 감사 포인트를 전달했습니다 🎁`)}
          onError={handleAppreciationError}
        />
      )}
    />
  );
}

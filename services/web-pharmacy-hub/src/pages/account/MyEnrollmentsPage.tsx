/**
 * MyEnrollmentsPage — 내 수강 목록 (Pharmacy-Hub wrapper)
 *
 * WO-O4O-PHARMACYHUB-LMS-LEARNER-FULL-ADOPTION-V1 §7
 * View 는 공통 `@o4o/account-ui` MyEnrollmentsView 를 그대로 채택한다 (§20).
 * 이 파일은 데이터 로딩 + navigation 만 담당한다 — PH 전용 대형 JSX 금지.
 * API: GET /lms/enrollments/me (serviceKey 는 @o4o/lms-client 가 부착)
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MyPageShell, MyPageAuthRequired, MyEnrollmentsView } from '@o4o/account-ui';
import { PHARMACY_HUB_ACCOUNT_NAV_ITEMS } from './navItems';
import { lmsApi } from '../../api/lms';
import { useAuth } from '../../contexts/AuthContext';

export default function MyEnrollmentsPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await lmsApi.getMyEnrollments();
      const raw = res?.data ?? res;
      setEnrollments(Array.isArray(raw) ? raw : []);
    } catch {
      // 실패를 빈 목록으로 삼키지 않는다 — 오류 상태로 표시한다.
      setError('수강 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    void load();
  }, [isLoading, isAuthenticated, load]);

  const frame = (children: React.ReactNode) => (
    <MyPageShell
      title="내 수강 목록"
      subtitle="신청하거나 진행 중인 교육을 확인하세요"
      width="wide"
      basePath="/account"
      navItems={PHARMACY_HUB_ACCOUNT_NAV_ITEMS}
    >
      {children}
    </MyPageShell>
  );

  if (!isLoading && !isAuthenticated) {
    return frame(
      <MyPageAuthRequired
        description="내 수강 목록은 로그인 후 이용할 수 있습니다."
        actionLabel="로그인"
        onAction={() => navigate('/login')}
      />,
    );
  }

  return frame(
    <MyEnrollmentsView
      enrollments={enrollments}
      loading={loading || isLoading}
      error={error}
      onBrowseCourses={() => navigate('/education')}
      onOpenCourse={(courseId) => navigate(`/education/course/${courseId}`)}
      onOpenCertificates={() => navigate('/account/certificates')}
    />,
  );
}

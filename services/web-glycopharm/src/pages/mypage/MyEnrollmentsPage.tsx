/**
 * MyEnrollmentsPage — 내 수강 목록 (GlycoPharm wrapper)
 *
 * WO-O4O-COMMUNITY-CROSSSERVICE-FINAL-RECENSUS-AND-RESIDUAL-COMMONIZATION-AUDIT-V1 §8
 * View 는 @o4o/account-ui MyEnrollmentsView 로 공통화. 본 파일은 데이터 로딩 + navigation 만 담당.
 * WO-O4O-CROSS-SERVICE-MYPAGE-SHELL-FINAL-CLOSURE-V1 §4:
 *   공통 My Page navigation(navItems) adoption 누락분 교정.
 * API: GET /lms/enrollments/me
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MyPageLayout, MyPageAuthRequired, MyEnrollmentsView } from '@o4o/account-ui';
import { lmsApi } from '@/api/lms';
import { useAuth } from '@/contexts/AuthContext';
import { GLYCOPHARM_MYPAGE_NAV_ITEMS } from './navItems';

export default function MyEnrollmentsPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await lmsApi.getMyEnrollments();
      const raw = res?.data ?? res;
      setEnrollments(Array.isArray(raw) ? raw : []);
    } catch {
      setError('수강 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated || !user) {
    // 로그인 안내도 Shell 안에서 렌더한다 (헤더·네비게이션 유실 금지).
    return (
      <MyPageLayout title="내 수강 목록" width="wide" navItems={GLYCOPHARM_MYPAGE_NAV_ITEMS}>
        <MyPageAuthRequired />
      </MyPageLayout>
    );
  }

  return (
    <MyPageLayout
      title="내 수강 목록"
      subtitle="신청하거나 진행 중인 강의를 확인하세요"
      width="wide"
      navItems={GLYCOPHARM_MYPAGE_NAV_ITEMS}
    >
      <MyEnrollmentsView
        enrollments={enrollments}
        loading={loading}
        error={error}
        onBrowseCourses={() => navigate('/lms')}
        onOpenCourse={(courseId) => navigate(`/lms/course/${courseId}`)}
        onOpenCertificates={() => navigate('/mypage/certificates')}
      />
    </MyPageLayout>
  );
}

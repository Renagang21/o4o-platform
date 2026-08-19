/**
 * MyCertificatesPage — 학습 결과 (GlycoPharm wrapper)
 *
 * WO-O4O-COMMUNITY-CROSSSERVICE-FINAL-RECENSUS-AND-RESIDUAL-COMMONIZATION-AUDIT-V1 §8
 * View 는 @o4o/account-ui MyCertificatesView 로 공통화. 본 파일은 데이터 로딩 + 다운로드만 담당.
 * WO-O4O-CROSS-SERVICE-MYPAGE-SHELL-FINAL-CLOSURE-V1 §4:
 *   공통 My Page navigation(navItems) adoption 누락분 교정.
 * API: GET /lms/certificates, GET /lms/certificates/:id/pdf
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MyPageLayout, MyPageAuthRequired, MyCertificatesView } from '@o4o/account-ui';
import { lmsApi } from '@/api/lms';
import { api } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { GLYCOPHARM_MYPAGE_NAV_ITEMS } from './navItems';

export default function MyCertificatesPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (user) loadData();
  }, [user, currentPage]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await lmsApi.getMyCertificates({ page: currentPage, limit: 12 });
      const body = res.data?.data ?? res.data ?? {};
      setCertificates(body.data ?? body.certificates ?? (Array.isArray(body) ? body : []));
      setTotalPages(body.totalPages ?? body.pagination?.totalPages ?? 1);
    } catch {
      setError('수료증을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (cert: any) => {
    try {
      const res = await api.get(`/lms/certificates/${cert.id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${cert.certificateNumber ?? cert.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('수료증 다운로드에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  if (!isAuthenticated || !user) {
    // 로그인 안내도 Shell 안에서 렌더한다 (헤더·네비게이션 유실 금지).
    return (
      <MyPageLayout title="학습 결과" width="wide" navItems={GLYCOPHARM_MYPAGE_NAV_ITEMS}>
        <MyPageAuthRequired />
      </MyPageLayout>
    );
  }

  return (
    <MyPageLayout
      title="학습 결과"
      subtitle="수료한 교육 과정의 수료증을 확인하세요"
      width="wide"
      navItems={GLYCOPHARM_MYPAGE_NAV_ITEMS}
    >
      <MyCertificatesView
        certificates={certificates}
        loading={loading}
        error={error}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onBrowseCourses={() => navigate('/lms')}
        onDownload={handleDownload}
      />
    </MyPageLayout>
  );
}

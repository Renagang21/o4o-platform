/**
 * MyCertificatesPage — 내 수료증 (Pharmacy-Hub wrapper)
 *
 * WO-O4O-PHARMACYHUB-LMS-LEARNER-FULL-ADOPTION-V1 §11
 * View 는 공통 `@o4o/account-ui` MyCertificatesView 채택 (§20).
 * API: GET /lms/certificates (본인 것만 — 서버가 토큰의 userId 로 강제),
 *      GET /lms/certificates/:id/pdf (타인 수료증은 백엔드가 404 비노출)
 * 소유권·서비스 경계 계약은 변경하지 않고 그대로 소비한다 (§10·§19).
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MyPageShell, MyPageAuthRequired, MyCertificatesView } from '@o4o/account-ui';
import { PHARMACY_HUB_ACCOUNT_NAV_ITEMS } from './navItems';
import { lmsApi } from '../../api/lms';
import { useAuth } from '../../contexts/AuthContext';

export default function MyCertificatesPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async (page: number) => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await lmsApi.getMyCertificates({ page, limit: 12 });
      const body = res?.data ?? res ?? {};
      const list = Array.isArray(body) ? body : (body.data ?? body.certificates ?? []);
      setCertificates(Array.isArray(list) ? list : []);
      setTotalPages(res?.pagination?.totalPages ?? body?.pagination?.totalPages ?? body?.totalPages ?? 1);
    } catch {
      setError('수료증을 불러오지 못했습니다.');
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
    void load(currentPage);
  }, [isLoading, isAuthenticated, currentPage, load]);

  const handleDownload = async (cert: any) => {
    try {
      const res = await lmsApi.downloadCertificatePdf(cert.id);
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${cert.certificateNumber ?? cert.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.alert('수료증 다운로드에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  const frame = (children: React.ReactNode) => (
    <MyPageShell
      title="내 수료증"
      subtitle="수료한 교육 과정의 수료증을 확인하세요"
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
        description="내 수료증은 로그인 후 이용할 수 있습니다."
        actionLabel="로그인"
        onAction={() => navigate('/login')}
      />,
    );
  }

  return frame(
    <MyCertificatesView
      certificates={certificates}
      loading={loading || isLoading}
      error={error}
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={setCurrentPage}
      onBrowseCourses={() => navigate('/education')}
      onDownload={handleDownload}
    />,
  );
}

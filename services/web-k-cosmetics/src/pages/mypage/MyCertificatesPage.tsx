/**
 * MyCertificatesPage — 학습 결과 (수료증)
 *
 * WO-O4O-KCOS-LMS-MYPAGE-CANONICAL-ALIGNMENT-V1
 * KPA Canonical 기준 정렬. API: GET /lms/certificates, GET /lms/certificates/:id/pdf
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MyPageLayout, MyPageLoadingState, MyPageEmptyState } from '@o4o/account-ui';
import { KCOS_MYPAGE_NAV_ITEMS } from './navItems';
import { lmsApi } from '@/api/lms';
import { api } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';

export default function MyCertificatesPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [copyFeedback, setCopyFeedback] = useState<Record<string, 'success' | 'fail'>>({});

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
      a.download = `certificate-${cert.certificateNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('수료증 다운로드에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  const handleCopyLink = async (cert: any) => {
    const url = `${window.location.origin}/certificate/verify/${cert.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyFeedback((p) => ({ ...p, [cert.id]: 'success' }));
    } catch {
      setCopyFeedback((p) => ({ ...p, [cert.id]: 'fail' }));
    } finally {
      setTimeout(() => setCopyFeedback((p) => { const n = { ...p }; delete n[cert.id]; return n; }), 2500);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center max-w-sm w-full">
          <p className="text-gray-700 mb-4">로그인이 필요합니다.</p>
        </div>
      </div>
    );
  }

  return (
    <MyPageLayout
      title="학습 결과"
      subtitle="수료한 교육 과정의 수료증을 확인하세요"
      navItems={KCOS_MYPAGE_NAV_ITEMS}
    >
      {loading && <MyPageLoadingState />}

      {!loading && error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      {!loading && !error && certificates.length === 0 && (
        <MyPageEmptyState
          description="완료한 강의가 없습니다."
          actionLabel="강의 둘러보기"
          onAction={() => navigate('/lms')}
        />
      )}

      {!loading && !error && certificates.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {certificates.map((cert: any) => (
              <div key={cert.id} className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center text-center">
                <span className="text-5xl mb-4">🎓</span>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 line-clamp-2">
                  {cert.courseName ?? cert.course?.title ?? '수료증'}
                </h3>
                <div className="w-full bg-gray-50 rounded-xl p-4 mb-4 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">발급일</span>
                    <span className="text-gray-700 font-medium">
                      {new Date(cert.issuedAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">인증번호</span>
                    <span className="text-gray-700 font-medium text-right truncate max-w-[140px]">
                      {cert.certificateNumber}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => handleDownload(cert)}
                    className="flex-1 py-2 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    📥 다운로드
                  </button>
                  <button
                    onClick={() => handleCopyLink(cert)}
                    className="flex-1 py-2 text-xs font-medium bg-white text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors"
                  >
                    🔗 검증 링크
                  </button>
                </div>
                {copyFeedback[cert.id] && (
                  <p className={`mt-2 text-xs ${copyFeedback[cert.id] === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                    {copyFeedback[cert.id] === 'success' ? '링크가 복사되었습니다.' : '복사에 실패했습니다.'}
                  </p>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-3 py-1 text-sm rounded-lg border border-gray-200 disabled:opacity-40"
              >
                이전
              </button>
              <span className="px-3 py-1 text-sm text-gray-500">{currentPage} / {totalPages}</span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-3 py-1 text-sm rounded-lg border border-gray-200 disabled:opacity-40"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </MyPageLayout>
  );
}

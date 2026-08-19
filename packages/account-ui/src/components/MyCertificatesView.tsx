/**
 * MyCertificatesView — 학습 결과(수료증) 공통 View
 *
 * WO-O4O-COMMUNITY-CROSSSERVICE-FINAL-RECENSUS-AND-RESIDUAL-COMMONIZATION-AUDIT-V1 §8
 * K-Cosmetics / GlycoPharm 동일 View 중복 공통화.
 * PDF 다운로드(blob) · 검증 링크 origin 은 서비스 wrapper 가 주입한다.
 */

import { useState } from 'react';
import { MyPageLoadingState } from './MyPageLoadingState.js';
import { MyPageEmptyState } from './MyPageEmptyState.js';

export interface MyCertificatesViewProps {
  certificates: any[];
  loading?: boolean;
  error?: string | null;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** 강의 둘러보기 이동 */
  onBrowseCourses: () => void;
  /** 수료증 PDF 다운로드 */
  onDownload: (cert: any) => void | Promise<void>;
  /** 검증 링크 생성 (기본: {origin}/certificate/verify/{id}) */
  buildVerifyUrl?: (cert: any) => string;
}

export function MyCertificatesView({
  certificates,
  loading = false,
  error = null,
  currentPage,
  totalPages,
  onPageChange,
  onBrowseCourses,
  onDownload,
  buildVerifyUrl,
}: MyCertificatesViewProps) {
  const [copyFeedback, setCopyFeedback] = useState<Record<string, 'success' | 'fail'>>({});

  const handleCopyLink = async (cert: any) => {
    const url = buildVerifyUrl
      ? buildVerifyUrl(cert)
      : `${window.location.origin}/certificate/verify/${cert.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyFeedback((p) => ({ ...p, [cert.id]: 'success' }));
    } catch {
      setCopyFeedback((p) => ({ ...p, [cert.id]: 'fail' }));
    } finally {
      setTimeout(() => setCopyFeedback((p) => { const n = { ...p }; delete n[cert.id]; return n; }), 2500);
    }
  };

  return (
    <>
      {loading && <MyPageLoadingState />}

      {!loading && error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      {!loading && !error && certificates.length === 0 && (
        <MyPageEmptyState
          description="완료한 강의가 없습니다."
          actionLabel="강의 둘러보기"
          onAction={onBrowseCourses}
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
                  {cert.certificateNumber && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">인증번호</span>
                      <span className="text-gray-700 font-medium text-right truncate max-w-[140px]">
                        {cert.certificateNumber}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => onDownload(cert)}
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
                onClick={() => onPageChange(currentPage - 1)}
                className="px-3 py-1 text-sm rounded-lg border border-gray-200 disabled:opacity-40"
              >
                이전
              </button>
              <span className="px-3 py-1 text-sm text-gray-500">{currentPage} / {totalPages}</span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                className="px-3 py-1 text-sm rounded-lg border border-gray-200 disabled:opacity-40"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

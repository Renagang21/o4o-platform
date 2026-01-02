/**
 * GlucoseView Operator Application Detail Page
 *
 * Phase C-4: 운영자용 신청 상세 + 승인/반려 페이지
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import type { AdminApplication, GlucoseViewPharmacy, ApplicationStatus } from '../../services/api';

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; bgColor: string; textColor: string }> = {
  submitted: { label: '심사 대기', bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
  approved: { label: '승인됨', bgColor: 'bg-green-100', textColor: 'text-green-700' },
  rejected: { label: '반려됨', bgColor: 'bg-red-100', textColor: 'text-red-700' },
};

export default function OperatorApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [application, setApplication] = useState<AdminApplication | null>(null);
  const [pharmacy, setPharmacy] = useState<GlucoseViewPharmacy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Review state
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadApplication();
    }
  }, [id]);

  const loadApplication = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.getAdminApplicationDetail(id!);
      setApplication(response.application);
      setPharmacy(response.pharmacy);
    } catch (err: any) {
      if (err.message?.includes('403')) {
        setError('접근 권한이 없습니다.');
      } else if (err.message?.includes('404')) {
        setError('신청을 찾을 수 없습니다.');
      } else {
        setError(err.message || '신청 정보를 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm('이 신청을 승인하시겠습니까?')) return;

    setIsProcessing(true);
    setReviewError(null);

    try {
      await api.reviewApplication(id!, { status: 'approved' });
      navigate('/operator/glucoseview/applications', { replace: true });
    } catch (err: any) {
      setReviewError(err.message || '승인 처리에 실패했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setReviewError('반려 사유를 입력하세요.');
      return;
    }

    setIsProcessing(true);
    setReviewError(null);

    try {
      await api.reviewApplication(id!, {
        status: 'rejected',
        rejectionReason: rejectionReason.trim(),
      });
      navigate('/operator/glucoseview/applications', { replace: true });
    } catch (err: any) {
      setReviewError(err.message || '반려 처리에 실패했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm p-8 text-center max-w-md">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-red-600 mb-4">{error}</p>
          <Link
            to="/operator/glucoseview/applications"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← 목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  if (!application) return null;

  const statusConfig = STATUS_CONFIG[application.status];
  const canProcess = application.status === 'submitted';

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <Link
          to="/operator/glucoseview/applications"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          목록으로
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{application.pharmacyName}</h1>
            <p className="text-gray-500">GlucoseView 서비스 신청</p>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}>
            {statusConfig.label}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Applicant Info */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">신청자 정보</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">이름</p>
                  <p className="font-medium text-gray-800">{application.userName || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">이메일</p>
                  <p className="font-medium text-gray-800">{application.userEmail || '-'}</p>
                </div>
                {application.userPhone && (
                  <div>
                    <p className="text-sm text-gray-500">전화번호</p>
                    <p className="font-medium text-gray-800">{application.userPhone}</p>
                  </div>
                )}
                {application.businessNumber && (
                  <div>
                    <p className="text-sm text-gray-500">사업자번호</p>
                    <p className="font-medium text-gray-800">{application.businessNumber}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Services */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">신청 서비스</h2>
              <div className="flex flex-wrap gap-3">
                {application.serviceTypes.map((service) => (
                  <div
                    key={service}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="font-medium">{service === 'cgm_view' ? 'CGM View' : service}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Note */}
            {application.note && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">추가 메모</h2>
                <p className="text-gray-600 whitespace-pre-wrap">{application.note}</p>
              </div>
            )}

            {/* Rejection Reason */}
            {application.status === 'rejected' && application.rejectionReason && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-red-800 mb-2">반려 사유</h2>
                <p className="text-red-700">{application.rejectionReason}</p>
              </div>
            )}

            {/* Pharmacy Info (if approved) */}
            {pharmacy && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-green-800 mb-4">생성된 약국 정보</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-green-600">약국명</p>
                    <p className="font-medium text-green-800">{pharmacy.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-green-600">상태</p>
                    <p className="font-medium text-green-800">{pharmacy.status}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-green-600">활성화된 서비스</p>
                    <div className="flex gap-2 mt-1">
                      {pharmacy.enabledServices.map((s) => (
                        <span key={s} className="px-2 py-0.5 bg-green-100 text-green-700 text-sm rounded">
                          {s === 'cgm_view' ? 'CGM View' : s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Timeline */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">처리 이력</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">신청 접수</p>
                    <p className="text-xs text-gray-500">
                      {new Date(application.submittedAt).toLocaleString('ko-KR')}
                    </p>
                  </div>
                </div>
                {application.decidedAt && (
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      application.status === 'approved' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {application.status === 'approved' ? (
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {application.status === 'approved' ? '승인 완료' : '반려 처리'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(application.decidedAt).toLocaleString('ko-KR')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            {canProcess && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">처리</h2>

                {reviewError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {reviewError}
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    onClick={handleApprove}
                    disabled={isProcessing}
                    className="w-full py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    승인
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={isProcessing}
                    className="w-full py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    반려
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">반려 사유 입력</h3>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="반려 사유를 입력하세요..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={4}
            />
            {reviewError && (
              <p className="mt-2 text-sm text-red-600">{reviewError}</p>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setReviewError(null);
                }}
                disabled={isProcessing}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleReject}
                disabled={isProcessing}
                className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isProcessing ? '처리 중...' : '반려 확정'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

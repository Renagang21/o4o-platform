import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  Building2,
  Truck,
  Monitor,
  User,
  Mail,
  Phone,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { glycopharmApi } from '@/api/glycopharm';
import type { AdminApplication, ServiceType, ApplicationStatus } from '@/api/glycopharm';

/**
 * Operator Application Detail Page
 * 운영자용 신청 상세 + 승인/반려 처리 화면
 */

const SERVICE_LABELS: Record<ServiceType, { label: string; icon: typeof Building2 }> = {
  dropshipping: { label: '무재고 판매', icon: Truck },
  sample_sales: { label: '샘플 판매', icon: Building2 },
  digital_signage: { label: '디지털 사이니지', icon: Monitor },
};

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; icon: typeof Clock; bgColor: string; textColor: string }> = {
  submitted: { label: '심사 대기', icon: Clock, bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
  approved: { label: '승인됨', icon: CheckCircle, bgColor: 'bg-green-100', textColor: 'text-green-700' },
  rejected: { label: '반려됨', icon: XCircle, bgColor: 'bg-red-100', textColor: 'text-red-700' },
};

interface PharmacyInfo {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  ownerName?: string;
  businessNumber?: string;
  status: string;
  createdAt: string;
}

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [application, setApplication] = useState<AdminApplication | null>(null);
  const [pharmacy, setPharmacy] = useState<PharmacyInfo | null>(null);
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
      const response = await glycopharmApi.getAdminApplicationDetail(id!);
      setApplication(response.application);
      setPharmacy(response.pharmacy);
    } catch (err: any) {
      if (err.status === 403) {
        setError('접근 권한이 없습니다.');
      } else if (err.status === 404) {
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
      await glycopharmApi.reviewApplication(id!, { status: 'approved' });
      navigate('/operator/applications', { replace: true });
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
      await glycopharmApi.reviewApplication(id!, {
        status: 'rejected',
        rejectionReason: rejectionReason.trim(),
      });
      navigate('/operator/applications', { replace: true });
    } catch (err: any) {
      setReviewError(err.message || '반려 처리에 실패했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-slate-500">불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <Link
            to="/operator/applications"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700"
          >
            <ArrowLeft className="w-4 h-4" />
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  if (!application) return null;

  const statusConfig = STATUS_CONFIG[application.status];
  const StatusIcon = statusConfig.icon;
  const canProcess = application.status === 'submitted';

  return (
    <div className="p-6">
      {/* Back Button */}
      <Link
        to="/operator/applications"
        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        목록으로
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">{application.organizationName}</h1>
          <p className="text-slate-500">
            {application.organizationType === 'pharmacy' ? '개인 약국' : '약국 체인'}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${statusConfig.bgColor} ${statusConfig.textColor}`}>
          <StatusIcon className="w-4 h-4" />
          <span className="font-medium">{statusConfig.label}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Applicant Info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">신청자 정보</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">이름</p>
                  <p className="text-sm font-medium text-slate-800">{application.userName || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">이메일</p>
                  <p className="text-sm font-medium text-slate-800">{application.userEmail || '-'}</p>
                </div>
              </div>
              {application.userPhone && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Phone className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">전화번호</p>
                    <p className="text-sm font-medium text-slate-800">{application.userPhone}</p>
                  </div>
                </div>
              )}
              {application.businessNumber && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">사업자번호</p>
                    <p className="text-sm font-medium text-slate-800">{application.businessNumber}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Services */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">신청 서비스</h2>
            <div className="flex flex-wrap gap-3">
              {application.serviceTypes.map((serviceType) => {
                const service = SERVICE_LABELS[serviceType];
                const Icon = service.icon;
                return (
                  <div
                    key={serviceType}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg"
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{service.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Note */}
          {application.note && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">추가 메모</h2>
              <p className="text-slate-600 whitespace-pre-wrap">{application.note}</p>
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
                  <p className="text-xs text-green-600">약국명</p>
                  <p className="text-sm font-medium text-green-800">{pharmacy.name}</p>
                </div>
                <div>
                  <p className="text-xs text-green-600">약국 코드</p>
                  <p className="text-sm font-medium text-green-800">{pharmacy.code}</p>
                </div>
                <div>
                  <p className="text-xs text-green-600">상태</p>
                  <p className="text-sm font-medium text-green-800">{pharmacy.status}</p>
                </div>
                <div>
                  <p className="text-xs text-green-600">생성일</p>
                  <p className="text-sm font-medium text-green-800">
                    {new Date(pharmacy.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Timeline */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">처리 이력</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">신청 접수</p>
                  <p className="text-xs text-slate-500">
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
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {application.status === 'approved' ? '승인 완료' : '반려 처리'}
                    </p>
                    <p className="text-xs text-slate-500">
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
              <h2 className="text-lg font-semibold text-slate-800 mb-4">처리</h2>

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
                  <CheckCircle className="w-5 h-5" />
                  승인
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={isProcessing}
                  className="w-full py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  반려
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">반려 사유 입력</h3>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="반려 사유를 입력하세요..."
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
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
                className="flex-1 py-3 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
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

/**
 * StoreApprovalDetailPage - 운영자용 스토어 판매 참여 신청 상세
 *
 * Phase 2: 운영자 승인 UI
 * - 신청 상세 정보 표시 (법적 고지 정보 포함)
 * - 심사 체크포인트 UI
 * - 승인/반려/보완요청 처리
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Store,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileEdit,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
  AlertCircle,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { storeApi } from '@/api/store';
import type { StoreApplication, StoreApplicationStatus, ReviewCheckpoint } from '@/types/store';

// 상태별 설정
const STATUS_CONFIG: Record<
  StoreApplicationStatus,
  {
    label: string;
    icon: typeof Clock;
    bgColor: string;
    textColor: string;
  }
> = {
  draft: {
    label: '작성 중',
    icon: FileEdit,
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-600',
  },
  submitted: {
    label: '심사 대기',
    icon: Clock,
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
  },
  reviewing: {
    label: '심사 중',
    icon: Clock,
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
  },
  supplementing: {
    label: '보완 요청',
    icon: AlertTriangle,
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-700',
  },
  approved: {
    label: '승인됨',
    icon: CheckCircle,
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
  },
  rejected: {
    label: '반려됨',
    icon: XCircle,
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
  },
};

// 기본 심사 체크포인트
const DEFAULT_CHECKPOINTS: ReviewCheckpoint[] = [
  { id: 'business_number', label: '사업자등록번호 확인', checked: false },
  { id: 'online_sales', label: '통신판매업 신고번호 확인', checked: false },
  { id: 'pharmacist_license', label: '약사 면허 확인', checked: false },
  { id: 'bank_account', label: '정산 계좌 정보 확인', checked: false },
  { id: 'terms_agreed', label: '필수 약관 동의 확인', checked: false },
];

export default function StoreApprovalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [application, setApplication] = useState<StoreApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 체크포인트 상태
  const [checkpoints, setCheckpoints] = useState<ReviewCheckpoint[]>(DEFAULT_CHECKPOINTS);

  // 처리 관련 상태
  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);

  // 모달 상태
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showSupplementModal, setShowSupplementModal] = useState(false);

  // 입력 상태
  const [storeSlug, setStoreSlug] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [supplementRequest, setSupplementRequest] = useState('');

  useEffect(() => {
    if (id) {
      loadApplication();
    }
  }, [id]);

  const loadApplication = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await storeApi.getStoreApplicationDetail(id!);

      if (response.success && response.data) {
        setApplication(response.data);
        // 기존 체크포인트가 있으면 사용, 없으면 기본값
        if (response.data.reviewCheckpoints?.length) {
          setCheckpoints(response.data.reviewCheckpoints);
        }
      } else {
        throw new Error('신청 정보를 불러올 수 없습니다.');
      }
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

  const toggleCheckpoint = (checkpointId: string) => {
    setCheckpoints((prev) =>
      prev.map((cp) => (cp.id === checkpointId ? { ...cp, checked: !cp.checked } : cp))
    );
  };

  const allCheckpointsChecked = checkpoints.every((cp) => cp.checked);

  // 약국명에서 slug 생성 (간단한 버전)
  const generateSlugFromName = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  useEffect(() => {
    if (application?.form.pharmacyName && !storeSlug) {
      setStoreSlug(generateSlugFromName(application.form.pharmacyName));
    }
  }, [application]);

  const handleApprove = async () => {
    if (!storeSlug.trim()) {
      setProcessError('스토어 URL slug를 입력하세요.');
      return;
    }

    if (!allCheckpointsChecked) {
      setProcessError('모든 체크포인트를 확인해주세요.');
      return;
    }

    setIsProcessing(true);
    setProcessError(null);

    try {
      await storeApi.approveStoreApplication(id!, storeSlug.trim());
      navigate('/operator/store-approvals', { replace: true });
    } catch (err: any) {
      setProcessError(err.message || '승인 처리에 실패했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setProcessError('반려 사유를 입력하세요.');
      return;
    }

    setIsProcessing(true);
    setProcessError(null);

    try {
      await storeApi.rejectStoreApplication(id!, rejectionReason.trim());
      navigate('/operator/store-approvals', { replace: true });
    } catch (err: any) {
      setProcessError(err.message || '반려 처리에 실패했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSupplement = async () => {
    if (!supplementRequest.trim()) {
      setProcessError('보완 요청 내용을 입력하세요.');
      return;
    }

    setIsProcessing(true);
    setProcessError(null);

    try {
      await storeApi.requestSupplement(id!, supplementRequest.trim());
      navigate('/operator/store-approvals', { replace: true });
    } catch (err: any) {
      setProcessError(err.message || '보완 요청에 실패했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-16">
          <Loader2 className="w-10 h-10 text-primary-600 animate-spin mx-auto mb-4" />
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
            to="/operator/store-approvals"
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

  const { form } = application;
  const statusConfig = STATUS_CONFIG[application.status];
  const StatusIcon = statusConfig.icon;
  const canProcess = ['submitted', 'reviewing', 'supplementing'].includes(application.status);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Back Button */}
      <Link
        to="/operator/store-approvals"
        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        목록으로
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Store className="w-7 h-7 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{form.pharmacyName}</h1>
            <p className="text-slate-500">{form.businessName}</p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full ${statusConfig.bgColor} ${statusConfig.textColor}`}
        >
          <StatusIcon className="w-4 h-4" />
          <span className="font-medium">{statusConfig.label}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* 사업자 정보 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-slate-400" />
              사업자 정보
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoItem icon={Building2} label="상호명" value={form.businessName} />
              <InfoItem icon={FileText} label="사업자등록번호" value={form.businessNumber} />
              <InfoItem icon={User} label="대표자명" value={form.representativeName} />
              <InfoItem icon={MapPin} label="사업장 주소" value={form.businessAddress} />
              <InfoItem icon={Phone} label="사업장 연락처" value={form.businessPhone} />
              <InfoItem icon={Mail} label="사업장 이메일" value={form.businessEmail} />
            </div>
          </div>

          {/* 통신판매업 정보 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-400" />
              통신판매업 정보
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoItem
                icon={FileText}
                label="통신판매업 신고번호"
                value={form.onlineSalesNumber}
              />
              <InfoItem
                icon={Clock}
                label="신고일자"
                value={form.onlineSalesRegisteredAt || '-'}
              />
            </div>
          </div>

          {/* 약국/약사 정보 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Store className="w-5 h-5 text-slate-400" />
              약국/약사 정보
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoItem icon={Store} label="약국명" value={form.pharmacyName} />
              <InfoItem icon={User} label="관리약사" value={form.pharmacistName} />
              <InfoItem icon={FileText} label="약사면허번호" value={form.pharmacistLicense} />
              <InfoItem icon={Phone} label="약국 연락처" value={form.pharmacyPhone} />
              <InfoItem icon={MapPin} label="약국 주소" value={form.pharmacyAddress} />
            </div>
          </div>

          {/* 정산 정보 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-slate-400" />
              정산 계좌 정보
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InfoItem icon={CreditCard} label="은행" value={form.bankName} />
              <InfoItem icon={CreditCard} label="계좌번호" value={form.bankAccountNumber} />
              <InfoItem icon={User} label="예금주" value={form.bankAccountHolder} />
            </div>
          </div>

          {/* 동의 항목 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-slate-400" />
              동의 항목
            </h2>
            <div className="space-y-2">
              <AgreementItem label="이용약관 동의" agreed={form.agreedTerms} />
              <AgreementItem label="개인정보 처리방침 동의" agreed={form.agreedPrivacy} />
              <AgreementItem label="마케팅 정보 수신 동의 (선택)" agreed={form.agreedMarketing} />
            </div>
          </div>

          {/* 반려 사유 */}
          {application.status === 'rejected' && application.rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-red-800 mb-2 flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                반려 사유
              </h2>
              <p className="text-red-700 whitespace-pre-wrap">{application.rejectionReason}</p>
            </div>
          )}

          {/* 보완 요청 */}
          {application.status === 'supplementing' && application.supplementRequest && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-orange-800 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                보완 요청 사항
              </h2>
              <p className="text-orange-700 whitespace-pre-wrap">{application.supplementRequest}</p>
            </div>
          )}

          {/* 추가 메모 */}
          {form.note && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">신청자 메모</h2>
              <p className="text-slate-600 whitespace-pre-wrap">{form.note}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* 처리 이력 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">처리 이력</h2>
            <div className="space-y-4">
              <TimelineItem
                icon={<Clock className="w-4 h-4 text-slate-500" />}
                bgColor="bg-slate-100"
                label="신청 접수"
                date={application.submittedAt || application.createdAt}
              />
              {application.reviewedAt && (
                <TimelineItem
                  icon={
                    application.status === 'approved' ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : application.status === 'rejected' ? (
                      <XCircle className="w-4 h-4 text-red-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                    )
                  }
                  bgColor={
                    application.status === 'approved'
                      ? 'bg-green-100'
                      : application.status === 'rejected'
                        ? 'bg-red-100'
                        : 'bg-orange-100'
                  }
                  label={
                    application.status === 'approved'
                      ? '승인 완료'
                      : application.status === 'rejected'
                        ? '반려 처리'
                        : '보완 요청'
                  }
                  date={application.reviewedAt}
                />
              )}
            </div>
          </div>

          {/* 심사 체크포인트 */}
          {canProcess && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">심사 체크포인트</h2>
              <p className="text-sm text-slate-500 mb-4">
                승인 전 모든 항목을 확인해주세요.
              </p>
              <div className="space-y-3">
                {checkpoints.map((checkpoint) => (
                  <label
                    key={checkpoint.id}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={checkpoint.checked}
                      onChange={() => toggleCheckpoint(checkpoint.id)}
                      className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span
                      className={`text-sm ${checkpoint.checked ? 'text-slate-800' : 'text-slate-600'}`}
                    >
                      {checkpoint.label}
                    </span>
                  </label>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-sm">
                  {allCheckpointsChecked ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-green-700">모든 항목 확인 완료</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span className="text-amber-700">
                        {checkpoints.filter((cp) => !cp.checked).length}개 항목 확인 필요
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          {canProcess && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">처리</h2>

              <div className="space-y-3">
                <button
                  onClick={() => setShowApproveModal(true)}
                  disabled={!allCheckpointsChecked}
                  className="w-full py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  승인
                </button>
                <button
                  onClick={() => setShowSupplementModal(true)}
                  className="w-full py-3 bg-orange-600 text-white font-semibold rounded-xl hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
                >
                  <AlertTriangle className="w-5 h-5" />
                  보완 요청
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  className="w-full py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  반려
                </button>
              </div>

              {!allCheckpointsChecked && (
                <p className="mt-3 text-xs text-slate-500 text-center">
                  승인하려면 모든 체크포인트를 확인해야 합니다.
                </p>
              )}
            </div>
          )}

          {/* 승인됨 안내 */}
          {application.status === 'approved' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-800">승인 완료</h3>
                  <p className="text-sm text-green-600">스토어가 활성화되었습니다.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Approve Modal */}
      {showApproveModal && (
        <Modal
          title="스토어 승인"
          onClose={() => {
            setShowApproveModal(false);
            setProcessError(null);
          }}
        >
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                승인 시 해당 약국의 B2C 스토어가 즉시 활성화됩니다.
                <br />
                소비자에게 스토어가 공개되며, 법적 고지 정보가 표시됩니다.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                스토어 URL slug
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">
                  glycopharm.neture.co.kr/store/
                </span>
                <input
                  type="text"
                  value={storeSlug}
                  onChange={(e) =>
                    setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                  }
                  placeholder="pharmacy-name"
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                영문 소문자, 숫자, 하이픈만 사용 가능합니다.
              </p>
            </div>

            {processError && (
              <p className="text-sm text-red-600">{processError}</p>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setProcessError(null);
                }}
                disabled={isProcessing}
                className="flex-1 py-3 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleApprove}
                disabled={isProcessing || !storeSlug.trim()}
                className="flex-1 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isProcessing ? '처리 중...' : '승인 확정'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <Modal
          title="스토어 신청 반려"
          onClose={() => {
            setShowRejectModal(false);
            setRejectionReason('');
            setProcessError(null);
          }}
        >
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                반려 시 신청자에게 반려 사유가 전달됩니다.
                <br />
                신청자는 반려 사유를 확인하고 재신청할 수 있습니다.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                반려 사유 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="반려 사유를 입력하세요..."
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                rows={4}
              />
            </div>

            {processError && (
              <p className="text-sm text-red-600">{processError}</p>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setProcessError(null);
                }}
                disabled={isProcessing}
                className="flex-1 py-3 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleReject}
                disabled={isProcessing || !rejectionReason.trim()}
                className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isProcessing ? '처리 중...' : '반려 확정'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Supplement Modal */}
      {showSupplementModal && (
        <Modal
          title="보완 요청"
          onClose={() => {
            setShowSupplementModal(false);
            setSupplementRequest('');
            setProcessError(null);
          }}
        >
          <div className="space-y-4">
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-800">
                보완 요청 시 신청자에게 요청 내용이 전달됩니다.
                <br />
                신청자는 정보를 수정 후 재제출할 수 있습니다.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                보완 요청 내용 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={supplementRequest}
                onChange={(e) => setSupplementRequest(e.target.value)}
                placeholder="보완이 필요한 내용을 입력하세요..."
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                rows={4}
              />
            </div>

            {processError && (
              <p className="text-sm text-red-600">{processError}</p>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setShowSupplementModal(false);
                  setSupplementRequest('');
                  setProcessError(null);
                }}
                disabled={isProcessing}
                className="flex-1 py-3 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSupplement}
                disabled={isProcessing || !supplementRequest.trim()}
                className="flex-1 py-3 bg-orange-600 text-white font-semibold rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {isProcessing ? '처리 중...' : '보완 요청'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Helper Components
function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-slate-500" />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-800">{value || '-'}</p>
      </div>
    </div>
  );
}

function AgreementItem({ label, agreed }: { label: string; agreed?: boolean }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
      {agreed ? (
        <Check className="w-5 h-5 text-green-600" />
      ) : (
        <X className="w-5 h-5 text-slate-400" />
      )}
      <span className={`text-sm ${agreed ? 'text-slate-800' : 'text-slate-500'}`}>{label}</span>
    </div>
  );
}

function TimelineItem({
  icon,
  bgColor,
  label,
  date,
}: {
  icon: React.ReactNode;
  bgColor: string;
  label: string;
  date: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-8 h-8 ${bgColor} rounded-full flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-slate-500">
          {new Date(date).toLocaleString('ko-KR')}
        </p>
      </div>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}

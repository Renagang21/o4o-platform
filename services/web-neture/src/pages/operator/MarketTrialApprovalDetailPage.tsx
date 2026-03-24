/**
 * Market Trial Approval Detail Page (Neture Operator)
 *
 * WO-O4O-MARKET-TRIAL-PHASE1-V1
 * 1차 승인 상세 — Trial 정보 확인 + 승인/반려 액션
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOperatorTrialDetail, approveTrialFirst, rejectTrialFirst } from '../../api/trial';
import type { OperatorTrial } from '../../api/trial';

const STATUS_LABELS: Record<string, string> = {
  draft: '작성 중',
  submitted: '심사 대기',
  approved: '승인됨',
  recruiting: '모집 중',
  development: '준비 중',
  outcome_confirming: '결과 확정 중',
  fulfilled: '이행 완료',
  closed: '종료',
};

const SERVICE_APPROVAL_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: '대기', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: '승인', color: 'bg-green-100 text-green-800' },
  rejected: { label: '반려', color: 'bg-red-100 text-red-700' },
};

export default function MarketTrialApprovalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [trial, setTrial] = useState<OperatorTrial | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (id) loadTrial();
  }, [id]);

  const loadTrial = async () => {
    setLoading(true);
    try {
      const data = await getOperatorTrialDetail(id!);
      setTrial(data);
    } catch (err: any) {
      setError(err.message || 'Trial을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await approveTrialFirst(id);
      await loadTrial();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '승인에 실패했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await rejectTrialFirst(id, rejectReason);
      setShowRejectModal(false);
      await loadTrial();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '반려에 실패했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">불러오는 중...</div>;
  }

  if (!trial) {
    return (
      <div className="p-6 text-center text-gray-500">
        {error || 'Trial을 찾을 수 없습니다.'}
      </div>
    );
  }

  const isSubmitted = trial.status === 'submitted';

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/workspace/operator/market-trial')}
          className="text-gray-400 hover:text-gray-600"
        >
          ← 목록
        </button>
        <h1 className="text-xl font-bold text-gray-900">{trial.title}</h1>
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          {STATUS_LABELS[trial.status] || trial.status}
        </span>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Trial Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 mb-6">
        <InfoRow label="공급자" value={trial.supplierName || trial.supplierId} />
        {trial.description && <InfoRow label="설명" value={trial.description} />}
        {trial.outcomeSnapshot && (
          <InfoRow
            label="결과 약속"
            value={`${trial.outcomeSnapshot.expectedType === 'product' ? '제품' : '현금'}: ${trial.outcomeSnapshot.description}`}
          />
        )}
        <InfoRow label="모집 기간" value={`${fmtDate(trial.startDate)} ~ ${fmtDate(trial.endDate)}`} />
        <InfoRow label="Trial 기간" value={trial.trialPeriodDays ? `${trial.trialPeriodDays}일` : '-'} />
        <InfoRow
          label="참여 현황"
          value={`${trial.currentParticipants}명${trial.maxParticipants ? ` / ${trial.maxParticipants}명` : ''}`}
        />
        {trial.visibleServiceKeys && trial.visibleServiceKeys.length > 0 && (
          <div>
            <span className="text-sm text-gray-500">대상 서비스</span>
            <div className="flex gap-1 mt-1">
              {trial.visibleServiceKeys.map((key) => (
                <span key={key} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                  {key}
                </span>
              ))}
            </div>
          </div>
        )}
        <InfoRow label="등록일" value={new Date(trial.createdAt).toLocaleString('ko-KR')} />
      </div>

      {/* Service Approvals (if any) */}
      {trial.serviceApprovals && trial.serviceApprovals.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">서비스별 2차 승인 현황</h2>
          <div className="space-y-2">
            {trial.serviceApprovals.map((sa) => {
              const cfg = SERVICE_APPROVAL_LABELS[sa.status] || { label: sa.status, color: 'bg-gray-100 text-gray-700' };
              return (
                <div key={sa.id} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-gray-700">{sa.serviceKey}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {isSubmitted && (
        <div className="flex gap-3">
          <button
            onClick={handleApprove}
            disabled={actionLoading}
            className="px-5 py-2.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {actionLoading ? '처리 중...' : '승인'}
          </button>
          <button
            onClick={() => setShowRejectModal(true)}
            disabled={actionLoading}
            className="px-5 py-2.5 text-sm text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50"
          >
            반려
          </button>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Trial 반려</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="반려 사유를 입력해주세요."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? '처리 중...' : '반려하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-sm text-gray-500">{label}</span>
      <p className="text-sm text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}

function fmtDate(d?: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('ko-KR');
}

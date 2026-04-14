/**
 * Market Trial Approval Detail Page (Neture Operator)
 *
 * WO-O4O-MARKET-TRIAL-PHASE1-V1
 * WO-MARKET-TRIAL-OPERATOR-CONSOLIDATED-REFINE-V1: 모바일 반응형 + 모집률 + 보상 분류
 * WO-MARKET-TRIAL-OPERATION-READINESS-V1: 참여자 인라인 리스트 + 보상 요약 + 포럼 링크 + 운영 지표 완성
 * 운영자 승인 상세 — Trial 정보 확인 + 승인/반려 + 참여자 관리
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getOperatorTrialDetail,
  getOperatorTrialParticipants,
  approveTrialFirst,
  rejectTrialFirst,
  exportParticipantsCSV,
} from '../../api/trial';
import type { OperatorTrial, TrialParticipant, ParticipantListResponse } from '../../api/trial';

const STATUS_LABELS: Record<string, string> = {
  draft: '작성 중',
  submitted: '심사 대기',
  approved: '승인됨',
  recruiting: '모집 중',
  development: '준비 중',
  outcome_confirming: '결과 확정',
  fulfilled: '이행 완료',
  closed: '종료',
};

export default function MarketTrialApprovalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [trial, setTrial] = useState<OperatorTrial | null>(null);
  const [participantData, setParticipantData] = useState<ParticipantListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    if (id) loadAll();
  }, [id]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [trialData, pData] = await Promise.all([
        getOperatorTrialDetail(id!),
        getOperatorTrialParticipants(id!).catch(() => null),
      ]);
      setTrial(trialData);
      setParticipantData(pData);
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
      await loadAll();
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
      await loadAll();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '반려에 실패했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = async () => {
    if (!id) return;
    setExportLoading(true);
    try {
      await exportParticipantsCSV(id);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'CSV 다운로드에 실패했습니다.');
    } finally {
      setExportLoading(false);
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
  const recruitRate =
    trial.maxParticipants && trial.maxParticipants > 0
      ? Math.round((trial.currentParticipants / trial.maxParticipants) * 100)
      : null;
  const summary = participantData?.summary;
  const participants = participantData?.participants ?? [];

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-6">
        <button
          onClick={() => navigate('/operator/market-trial')}
          className="text-gray-400 hover:text-gray-600 text-sm"
        >
          ← 목록
        </button>
        <h1 className="text-lg sm:text-xl font-bold text-gray-900 break-words min-w-0">{trial.title}</h1>
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 whitespace-nowrap">
          {STATUS_LABELS[trial.status] || trial.status}
        </span>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Summary Metrics Card */}
      <SummaryMetrics trial={trial} recruitRate={recruitRate} summary={summary} />

      {/* Trial Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 space-y-4 mb-4">
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

        {/* Reward Options */}
        {trial.rewardOptions && trial.rewardOptions.length > 0 && (
          <div>
            <span className="text-sm text-gray-500">보상 방식</span>
            <div className="flex gap-2 mt-1">
              {trial.rewardOptions.map((opt) => (
                <span key={opt} className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-md text-xs font-medium">
                  {opt === 'cash' ? '현금 보상' : opt === 'product' ? '제품 보상' : opt}
                </span>
              ))}
            </div>
          </div>
        )}

        {trial.visibleServiceKeys && trial.visibleServiceKeys.length > 0 && (
          <div>
            <span className="text-sm text-gray-500">대상 서비스</span>
            <div className="flex gap-1 mt-1 flex-wrap">
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

      {/* Forum Link — slug null-safe */}
      {trial.forumLink && trial.forumLink.slug && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 flex items-center justify-between">
          <div>
            <span className="text-sm text-gray-500">연결된 포럼 게시글</span>
            <p className="text-sm text-gray-900 mt-0.5">{trial.forumLink.slug}</p>
          </div>
          <a
            href={trial.forumLink.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
          >
            포럼 보기
          </a>
        </div>
      )}

      {/* Participant List Section */}
      <ParticipantSection
        participants={participants}
        totalCount={trial.currentParticipants}
        onExport={handleExport}
        exportLoading={exportLoading}
      />

      {/* Action Buttons */}
      {isSubmitted && (
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            onClick={handleApprove}
            disabled={actionLoading}
            className="flex-1 sm:flex-none px-5 py-2.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {actionLoading ? '처리 중...' : '승인'}
          </button>
          <button
            onClick={() => setShowRejectModal(true)}
            disabled={actionLoading}
            className="flex-1 sm:flex-none px-5 py-2.5 text-sm text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50"
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

// ── Summary Metrics ──

function SummaryMetrics({
  trial,
  recruitRate,
  summary,
}: {
  trial: OperatorTrial;
  recruitRate: number | null;
  summary?: ParticipantListResponse['summary'] | null;
}) {
  const barColor =
    recruitRate === null
      ? 'bg-gray-300'
      : recruitRate >= 80
        ? 'bg-red-500'
        : recruitRate >= 50
          ? 'bg-yellow-500'
          : 'bg-blue-500';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 mb-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <MetricCell value={trial.currentParticipants} label="참여자" />
        <MetricCell value={trial.maxParticipants ?? '∞'} label="정원" />
        <MetricCell
          value={recruitRate !== null ? `${recruitRate}%` : '-'}
          label="모집률"
          highlight={recruitRate !== null && recruitRate >= 80}
        />
        <MetricCell value={summary?.productCount ?? '-'} label="제품 보상" />
        <MetricCell value={summary?.cashCount ?? '-'} label="현금 보상" />
      </div>
      {/* Progress bar */}
      {recruitRate !== null && (
        <div className="mt-3">
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${Math.min(recruitRate, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1 text-right">
            {trial.currentParticipants} / {trial.maxParticipants}명
          </p>
        </div>
      )}
    </div>
  );
}

function MetricCell({ value, label, highlight }: { value: string | number; label: string; highlight?: boolean }) {
  return (
    <div className="text-center">
      <p className={`text-xl sm:text-2xl font-bold ${highlight ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

// ── Participant Section ──

function ParticipantSection({
  participants,
  totalCount,
  onExport,
  exportLoading,
}: {
  participants: TrialParticipant[];
  totalCount: number;
  onExport: () => void;
  exportLoading: boolean;
}) {
  if (totalCount === 0 && participants.length === 0) return null;

  const typeLabel = (t: string) => (t === 'seller' ? '판매자' : t === 'partner' ? '파트너' : t);
  const rewardLabel = (r: string | null) => {
    if (r === 'product') return '제품';
    if (r === 'cash') return '현금';
    return '-';
  };
  const statusLabel = (s: string) => {
    if (s === 'pending') return '대기';
    if (s === 'fulfilled') return '완료';
    return s;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">
          참여자 ({participants.length}명)
        </h2>
        <button
          onClick={onExport}
          disabled={exportLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition"
        >
          {exportLoading ? '...' : 'CSV 내보내기'}
        </button>
      </div>

      {participants.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">참여자 데이터를 불러오지 못했습니다.</p>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:-mx-5">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 px-4 text-xs font-medium text-gray-500">이름</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">유형</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">보상</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">상태</th>
                <th className="text-left py-2 px-4 text-xs font-medium text-gray-500">참여일</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2.5 px-4 text-gray-900 font-medium">{p.name}</td>
                  <td className="py-2.5 px-2 text-gray-600">{typeLabel(p.type)}</td>
                  <td className="py-2.5 px-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      p.rewardType === 'product'
                        ? 'bg-green-50 text-green-700'
                        : p.rewardType === 'cash'
                          ? 'bg-yellow-50 text-yellow-700'
                          : 'bg-gray-50 text-gray-500'
                    }`}>
                      {rewardLabel(p.rewardType)}
                    </span>
                  </td>
                  <td className="py-2.5 px-2">
                    <span className={`text-xs ${p.rewardStatus === 'fulfilled' ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                      {statusLabel(p.rewardStatus)}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-gray-500 text-xs">
                    {new Date(p.joinedAt).toLocaleDateString('ko-KR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Helpers ──

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

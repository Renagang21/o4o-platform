/**
 * Market Trial Approval Detail Page (Neture Operator)
 *
 * WO-O4O-MARKET-TRIAL-PHASE1-V1
 * WO-MARKET-TRIAL-OPERATOR-CONSOLIDATED-REFINE-V1: 모바일 반응형 + 모집률 + 보상 분류
 * WO-MARKET-TRIAL-OPERATION-READINESS-V1: 참여자 인라인 리스트 + 보상 요약 + 포럼 링크 + 운영 지표 완성
 * WO-MARKET-TRIAL-SETTLEMENT-AND-FULFILLMENT-MANAGEMENT-V1: 이행/정산 관리 추가
 * 운영자 상세 — Trial 정보 확인 + 승인/반려 + 참여자 이행 상태 관리
 */

import { useState, useEffect, useCallback, Fragment } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getOperatorTrialDetail,
  getOperatorTrialParticipants,
  approveTrialFirst,
  rejectTrialFirst,
  exportParticipantsCSV,
  updateParticipantRewardStatus,
  updateParticipantSettlementStatus,
  updateParticipantPaymentStatus,
  updateTrialStatus,
  getOperatorTrialKpi,
} from '../../api/trial';
import type {
  OperatorTrial,
  TrialParticipant,
  ParticipantListResponse,
  TrialStatus,
  SettlementStatus,
  PaymentStatus,
  MarketTrialDetailKpi,
} from '../../api/trial';
import { PAYMENT_STATUS_LABELS } from '../../api/trial';

// WO-O4O-MARKET-TRIAL-UI-COMMERCE-LABEL-CLEANUP-V1:
// content-only 정책 — 제품 전환 / 매장 진열 / 정산 / 매장 랜딩 단계 등
// 커머스 퍼널 UI 는 노출하지 않는다. (신규 mutation 은 backend + api client 에서 이미 차단됨.)
const SHOW_MARKET_TRIAL_COMMERCE_UI = false;

// WO-O4O-MARKET-TRIAL-OFFLINE-PAYMENT-REACTIVATION-V1:
// 오프라인 입금(payment) 확인은 content-only 운영 모델의 핵심(운영자 수령·명단 공유)이므로
// 커머스 퍼널 플래그와 분리해 별도로 노출한다. 정산(settlement)·매장 랜딩은 위 플래그(off)에 묶여 계속 비노출.
const SHOW_OFFLINE_PAYMENT_UI = true;

type ParticipantFilter =
  | 'all' | 'product' | 'cash' | 'pending' | 'fulfilled';

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

// Operator-allowed status transitions
const NEXT_STATUS: Partial<Record<string, { status: TrialStatus; label: string }>> = {
  recruiting: { status: 'development', label: '준비 중으로 전환' },
  development: { status: 'outcome_confirming', label: '결과 확정으로 전환' },
  outcome_confirming: { status: 'fulfilled', label: '이행 완료 처리' },
  fulfilled: { status: 'closed', label: '종료 처리' },
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
  const [filter, setFilter] = useState<ParticipantFilter>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  // WO-MARKET-TRIAL-PHASE3-SETTLEMENT-OPERATOR-TRANSITION-V1
  const [updatingSettlementId, setUpdatingSettlementId] = useState<string | null>(null);
  // WO-NETURE-MARKET-TRIAL-PAYMENT-READINESS-V1
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  // WO-NETURE-MARKET-TRIAL-ANALYTICS-AND-KPI-V1
  const [trialKpi, setTrialKpi] = useState<MarketTrialDetailKpi | null>(null);

  const loadParticipants = useCallback(async (trialId: string, f: ParticipantFilter) => {
    const filters: {
      rewardType?: 'product' | 'cash';
      rewardStatus?: 'pending' | 'fulfilled';
    } = {};
    if (f === 'product') filters.rewardType = 'product';
    else if (f === 'cash') filters.rewardType = 'cash';
    else if (f === 'pending') filters.rewardStatus = 'pending';
    else if (f === 'fulfilled') filters.rewardStatus = 'fulfilled';
    const pData = await getOperatorTrialParticipants(trialId, filters).catch(() => null);
    setParticipantData(pData);
  }, []);

  const loadAll = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const trialData = await getOperatorTrialDetail(id);
      setTrial(trialData);
      // KPI is best-effort — never blocks the page
      getOperatorTrialKpi(id).then(setTrialKpi).catch(() => null);
      await loadParticipants(id, filter);
    } catch (err: any) {
      setError(err.message || '유통참여형 펀딩을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [id, filter, loadParticipants]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleFilterChange = async (f: ParticipantFilter) => {
    setFilter(f);
    if (id) await loadParticipants(id, f);
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

  const handleToggleRewardStatus = async (participant: TrialParticipant) => {
    if (!id) return;
    const newStatus = participant.rewardStatus === 'fulfilled' ? 'pending' : 'fulfilled';
    setUpdatingId(participant.id);
    try {
      await updateParticipantRewardStatus(id, participant.id, newStatus);
      // Reload with current filter
      await loadParticipants(id, filter);
      // Also refresh summary (reload all)
      await loadAll();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '상태 변경에 실패했습니다.');
    } finally {
      setUpdatingId(null);
    }
  };

  // WO-MARKET-TRIAL-PHASE3-SETTLEMENT-OPERATOR-TRANSITION-V1
  const handleSettlementStatusChange = async (
    participant: TrialParticipant,
    newStatus: SettlementStatus,
    note?: string,
  ) => {
    if (!id) return;
    setUpdatingSettlementId(participant.id);
    try {
      await updateParticipantSettlementStatus(id, participant.id, newStatus, note);
      await loadParticipants(id, filter);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '펀딩 처리 상태 변경에 실패했습니다.');
    } finally {
      setUpdatingSettlementId(null);
    }
  };

  // WO-NETURE-MARKET-TRIAL-PAYMENT-READINESS-V1: 운영자 결제 상태 갱신 (수기 송금 확인 / 환불 등).
  // 추가 필드(reference/amount/note 등)는 caller가 input으로 넘김. 이 함수는 비즈니스 로직 없이 패스스루.
  const handlePaymentStatusChange = async (
    participant: TrialParticipant,
    newStatus: PaymentStatus,
    extra?: {
      paymentMethod?: string | null;
      paymentProvider?: string | null;
      paymentReference?: string | null;
      paidAmount?: number | null;
      paidAt?: string | null;
      paymentNote?: string | null;
    },
  ) => {
    if (!id) return;
    setUpdatingPaymentId(participant.id);
    try {
      await updateParticipantPaymentStatus(id, participant.id, {
        paymentStatus: newStatus,
        ...extra,
      });
      await loadParticipants(id, filter);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '입금 확인 상태 변경에 실패했습니다.');
    } finally {
      setUpdatingPaymentId(null);
    }
  };

  const handleTrialStatusChange = async (newStatus: TrialStatus) => {
    if (!id) return;
    setActionLoading(true);
    try {
      await updateTrialStatus(id, newStatus);
      setShowStatusModal(false);
      await loadAll();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '유통참여형 펀딩 상태 변경에 실패했습니다.');
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
        {error || '유통참여형 펀딩을 찾을 수 없습니다.'}
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
  const nextTransition = NEXT_STATUS[trial.status];

  // Show fulfillment hint if all participants are fulfilled
  const allFulfilled =
    summary && summary.totalCount > 0 && summary.fulfilledCount === summary.totalCount;

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
          <button className="ml-2 underline text-xs" onClick={() => setError('')}>닫기</button>
        </div>
      )}

      {/* Summary Metrics Card */}
      <SummaryMetrics trial={trial} recruitRate={recruitRate} summary={summary} />

      {/* WO-O4O-MARKET-TRIAL-PARTICIPATION-REPORT-CLEANUP-V1: content-only 참여 리포트 (오프라인 입금 기준) */}
      {trialKpi && <ParticipationReport kpi={trialKpi} summary={summary} />}

      {/* KPI Bar — WO-NETURE-MARKET-TRIAL-ANALYTICS-AND-KPI-V1 */}
      {trialKpi && <TrialKpiBar kpi={trialKpi} />}

      {/* Fulfillment Summary Card */}
      {summary && summary.totalCount > 0 && (
        <FulfillmentSummary summary={summary} allFulfilled={allFulfilled ?? false} />
      )}

      {/* WO-O4O-MARKET-TRIAL-CONVERSION-READ-WIRING-CLEANUP-V1: content-only — 매장 랜딩 전환 퍼널 섹션 제거 */}

      {/* Trial Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 space-y-4 mb-4">
        <InfoRow label="공급자" value={trial.supplierName || trial.supplierId} />
        {/* WO-O4O-NETURE-MARKET-TRIAL-PRODUCT-REFERENCE-DISPLAY-V2: 연결 제품 표시 */}
        {trial.product && (
          <InfoRow
            label="연결 제품"
            value={`${trial.product.name}${trial.product.manufacturerName ? ` (${trial.product.manufacturerName})` : ''}`}
          />
        )}
        {trial.description && <InfoRow label="설명" value={trial.description} />}
        {trial.outcomeSnapshot && (
          <InfoRow
            label="결과 약속"
            value={`${trial.outcomeSnapshot.expectedType === 'product' ? '제품' : '현금'}: ${trial.outcomeSnapshot.description}`}
          />
        )}
        <InfoRow label="모집 기간" value={`${fmtDate(trial.startDate)} ~ ${fmtDate(trial.endDate)}`} />
        <InfoRow label="진행 기간" value={trial.trialPeriodDays ? `${trial.trialPeriodDays}일` : '-'} />

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

        <InfoRow label="등록일" value={new Date(trial.createdAt).toLocaleString('ko-KR')} />
      </div>

      {/* Forum Link */}
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
        filter={filter}
        onFilterChange={handleFilterChange}
        onExport={handleExport}
        exportLoading={exportLoading}
        onToggleRewardStatus={handleToggleRewardStatus}
        updatingId={updatingId}
        onSettlementStatusChange={handleSettlementStatusChange}
        updatingSettlementId={updatingSettlementId}
        onPaymentStatusChange={handlePaymentStatusChange}
        updatingPaymentId={updatingPaymentId}
        trialStatus={trial.status}
      />

      {/* Trial Status Control (non-submitted states) */}
      {nextTransition && !isSubmitted && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">유통참여형 펀딩 진행 관리</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowStatusModal(true)}
              disabled={actionLoading}
              className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {nextTransition.label}
            </button>
          </div>
          {allFulfilled && trial.status !== 'fulfilled' && trial.status !== 'closed' && (
            <p className="mt-2 text-xs text-green-600">
              모든 참여자 이행이 완료되었습니다. 유통참여형 펀딩 상태 전환을 검토해주세요.
            </p>
          )}
        </div>
      )}

      {/* Approve/Reject buttons + 승인 전 확인사항 — WO-O4O-NETURE-DISTRIBUTION-FUNDING-OPERATOR-PREAPPROVAL-CHECKLIST-V1 */}
      {isSubmitted && (
        <>
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h3 className="text-sm font-semibold text-amber-900 mb-1">승인 전 확인사항</h3>
            <p className="text-xs text-amber-800 leading-relaxed mb-2">
              유통참여형 펀딩은 Neture가 송금 흐름을 관리하는 참여형 유통 프로그램이며, <strong>운영자 승인 후에만 공개·모집</strong>됩니다. 제품 성공 가능성을 보증하는 심사가 아니라, 투자형 오해 방지·송금 흐름·보상 방식 선택·포럼 운영 가능성·제품 제공 위험을 확인하는 최소 운영 심사입니다.
            </p>
            <ul className="text-xs text-amber-900 space-y-1">
              <li>☐ 투자형 펀딩으로 오해될 표현(지분·배당·이자·원금 보장·확정 수익)이 없는가</li>
              <li>☐ 송금은 Neture 운영자가 받는 구조와 맞는가 (제품 개발자 직접 수령으로 안내하지 않는가)</li>
              <li>☐ 참여자의 제품/수익 보상 방식 선택과 충돌하지 않는가 (제품 보상 선택자만 매장 랜딩 추적)</li>
              <li>☐ 제품 보상 조건·보상 제품 구성·기준 가격이 설명되어 있는가</li>
              <li>☐ 포럼 운영 방식·송금 기한·미송금자 처리 기준이 설명되어 있는가</li>
              <li>☐ 제품 제공 지연 또는 불가 시 안내 기준이 있는가</li>
              <li>☐ 표시·광고·인증상 위험(의약품·건기식·화장품·의료기기 등 규제 품목)이 커 보이지 않는가</li>
            </ul>
            <p className="text-xs text-amber-700 mt-2">승인하면 이 유통참여형 펀딩은 공개·모집 상태로 전환됩니다.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
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
        </>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">유통참여형 펀딩 반려</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="반려 사유를 입력해주세요."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 mb-1"
            />
            {/* WO-O4O-NETURE-DISTRIBUTION-FUNDING-OPERATOR-PREAPPROVAL-CHECKLIST-V1 */}
            <p className="text-xs text-gray-500 mb-4">투자형 오해·송금 흐름·보상 조건·포럼 운영 기준 중 보완이 필요한 부분을 구체적으로 작성해 주세요.</p>
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

      {/* Trial Status Transition Modal */}
      {showStatusModal && nextTransition && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{nextTransition.label}</h3>
            <p className="text-sm text-gray-600 mb-4">
              유통참여형 펀딩 상태를 <strong>{STATUS_LABELS[trial.status]}</strong>에서{' '}
              <strong>{STATUS_LABELS[nextTransition.status]}</strong>으로 전환합니다.
              <br />이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={() => handleTrialStatusChange(nextTransition.status)}
                disabled={actionLoading}
                className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {actionLoading ? '처리 중...' : '확인'}
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

// ── Participation Report (content-only) ──

// WO-O4O-MARKET-TRIAL-PARTICIPATION-REPORT-CLEANUP-V1:
// 오프라인 입금 확인 기준 참여 요약. 전환/매장진열/주문/배송/상품정산 지표는 포함하지 않는다.
// payment 집계는 trialKpi(/:id/kpi)에서, 펀딩 처리(settlementStatus 기반 read-only)는 summary 에서 가져온다.
function ParticipationReport({
  kpi,
  summary,
}: {
  kpi: MarketTrialDetailKpi;
  summary?: ParticipantListResponse['summary'] | null;
}) {
  const won = (n: number) => `${(n ?? 0).toLocaleString()}원`;
  // 펀딩 처리 대기 = 전체 - 펀딩 처리 완료(offline_settled). settlementStatus 기반이나 사용자-facing 표기는 '펀딩 처리'.
  const total = summary?.totalCount ?? kpi.participantCount;
  const processedDone = summary?.offlineSettledCount ?? 0;
  const processingPending = Math.max(0, total - processedDone);
  return (
    <div className="mb-5 bg-white border border-gray-200 rounded-lg p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <p className="text-xs font-medium text-gray-500">참여 리포트</p>
        <span className="text-xs text-gray-400">오프라인 입금 확인 기준 · 온라인 결제 아님</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <MetricCell value={kpi.participantCount} label="총 참여자" />
        <MetricCell value={kpi.paidParticipantCount} label="입금 확인" highlight={kpi.paidParticipantCount > 0} />
        <MetricCell value={kpi.unpaidParticipantCount} label="입금 미확인" />
        <MetricCell value={won(kpi.totalPaidAmount)} label="입금 확인 금액 합계" highlight={kpi.totalPaidAmount > 0} />
        <MetricCell value={processingPending} label="펀딩 처리 대기" />
      </div>
      {kpi.refundCount > 0 && (
        <p className="text-xs text-gray-400 mt-2">환불 처리 {kpi.refundCount}명</p>
      )}
    </div>
  );
}

// ── Fulfillment Summary ──

function FulfillmentSummary({
  summary,
  allFulfilled,
}: {
  summary: ParticipantListResponse['summary'];
  allFulfilled: boolean;
}) {
  const rate = summary.fulfillmentRate;
  const barColor = rate >= 100 ? 'bg-green-500' : rate >= 50 ? 'bg-blue-500' : 'bg-gray-300';

  return (
    <div className={`border rounded-lg p-4 sm:p-5 mb-4 ${allFulfilled ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">이행 현황</h3>
        {allFulfilled && (
          <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
            전체 이행 완료
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-4 mb-3">
        <MetricCell value={`${rate}%`} label="이행률" highlight={rate >= 100} />
        <MetricCell value={summary.fulfilledCount} label="이행 완료" />
        <MetricCell value={summary.pendingCount} label="대기 중" />
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(rate, 100)}%` }}
        />
      </div>
      <p className="text-xs text-gray-400 mt-1 text-right">
        {summary.fulfilledCount} / {summary.totalCount}명 완료
      </p>
    </div>
  );
}

function MetricCell({ value, label, highlight }: { value: string | number; label: string; highlight?: boolean }) {
  return (
    <div className="text-center">
      <p className={`text-xl sm:text-2xl font-bold ${highlight ? 'text-green-600' : 'text-gray-900'}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

// ── Participant Section ──

const FILTER_OPTIONS: { value: ParticipantFilter; label: string; group?: string }[] = [
  { value: 'all',       label: '전체' },
  { value: 'product',   label: '제품 보상' },
  { value: 'cash',      label: '현금 보상' },
  { value: 'pending',   label: '이행 대기' },
  { value: 'fulfilled', label: '이행 완료' },
  // WO-O4O-MARKET-TRIAL-UI-COMMERCE-LABEL-CLEANUP-V1: content-only — 전환 퍼널(관심/취급/매장 도입/첫 주문) 필터 제거.
];

// WO-O4O-MARKET-TRIAL-CONVERSION-COLUMNS-DROP-V1: 매장 랜딩 단계(전환) 라벨/색상/옵션 제거 (content-only).

// WO-MARKET-TRIAL-PHASE3-SETTLEMENT-OPERATOR-TRANSITION-V1
// WO-O4O-MARKET-TRIAL-PROCESSING-TERMINOLOGY-CLEANUP-V1: 사용자-facing 표기 '정산'→'펀딩 처리'(enum 키/필드명은 유지)
const SETTLEMENT_STATUS_LABELS: Record<SettlementStatus, string> = {
  pending: '처리 대기',
  choice_pending: '선택 대기',
  choice_completed: '선택 완료',
  offline_review: '운영 확인 중',
  offline_settled: '펀딩 처리 완료',
};

const SETTLEMENT_STATUS_COLORS: Record<SettlementStatus, string> = {
  pending: 'bg-gray-100 text-gray-600',
  choice_pending: 'bg-amber-100 text-amber-700',
  choice_completed: 'bg-blue-100 text-blue-700',
  offline_review: 'bg-purple-100 text-purple-700',
  offline_settled: 'bg-green-100 text-green-700',
};

// 운영자 허용 전이 (pending→choice_pending은 cascade 우선, 개별 수동도 허용)
const OPERATOR_SETTLEMENT_NEXT: Partial<Record<SettlementStatus, { to: SettlementStatus; label: string }>> = {
  pending: { to: 'choice_pending', label: '선택 개방' },
  choice_completed: { to: 'offline_review', label: '운영 확인 시작' },
  offline_review: { to: 'offline_settled', label: '펀딩 처리 완료' },
};

// Trial 상태 기준 정산 섹션 표시 여부
const SETTLEMENT_VISIBLE_STATUSES: TrialStatus[] = ['development', 'outcome_confirming', 'fulfilled', 'closed'];

// WO-NETURE-MARKET-TRIAL-PAYMENT-READINESS-V1
// 결제는 모집 시작 이후 어떤 단계에서도 수기 송금이 들어올 수 있어 정산보다 넓은 범위에서 노출.
const PAYMENT_VISIBLE_STATUSES: TrialStatus[] = ['recruiting', 'development', 'outcome_confirming', 'fulfilled', 'closed'];

const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  unpaid:   'bg-gray-100 text-gray-600',
  pending:  'bg-amber-100 text-amber-700',
  paid:     'bg-green-100 text-green-700',
  failed:   'bg-red-100 text-red-700',
  canceled: 'bg-gray-200 text-gray-700',
  refunded: 'bg-purple-100 text-purple-700',
};

function ParticipantSection({
  participants,
  totalCount,
  filter,
  onFilterChange,
  onExport,
  exportLoading,
  onToggleRewardStatus,
  updatingId,
  onSettlementStatusChange,
  updatingSettlementId,
  onPaymentStatusChange,
  updatingPaymentId,
  trialStatus,
}: {
  participants: TrialParticipant[];
  totalCount: number;
  filter: ParticipantFilter;
  onFilterChange: (f: ParticipantFilter) => void;
  onExport: () => void;
  exportLoading: boolean;
  onToggleRewardStatus: (p: TrialParticipant) => void;
  updatingId: string | null;
  // WO-MARKET-TRIAL-PHASE3-SETTLEMENT-OPERATOR-TRANSITION-V1
  onSettlementStatusChange: (p: TrialParticipant, s: SettlementStatus, note?: string) => void;
  updatingSettlementId: string | null;
  // WO-NETURE-MARKET-TRIAL-PAYMENT-READINESS-V1
  onPaymentStatusChange: (
    p: TrialParticipant,
    s: PaymentStatus,
    extra?: {
      paymentMethod?: string | null;
      paymentProvider?: string | null;
      paymentReference?: string | null;
      paidAmount?: number | null;
      paidAt?: string | null;
      paymentNote?: string | null;
    },
  ) => void;
  updatingPaymentId: string | null;
  trialStatus: TrialStatus;
}) {
  const typeLabel = (t: string) => (t === 'seller' ? '판매자' : t === 'partner' ? '파트너' : t);
  const rewardLabel = (r: string | null) => {
    if (r === 'product') return '제품';
    if (r === 'cash') return '현금';
    return '-';
  };

  // WO-O4O-MARKET-TRIAL-OFFLINE-PAYMENT-REACTIVATION-V1: 오프라인 입금 확인 인라인 폼 (window.prompt 제거)
  const [payForm, setPayForm] = useState<{
    id: string;
    action: 'confirm' | 'refund';
    amount: string;
    reference: string;
    note: string;
  } | null>(null);
  const openConfirm = (p: TrialParticipant) =>
    setPayForm({
      id: p.id,
      action: 'confirm',
      amount: p.paidAmount != null ? String(p.paidAmount) : '',
      reference: p.paymentReference || '',
      note: p.paymentNote || '',
    });
  const openRefund = (p: TrialParticipant) =>
    setPayForm({ id: p.id, action: 'refund', amount: '', reference: '', note: '' });
  const closeForm = () => setPayForm(null);
  const amountInvalid = (v: string) =>
    v.trim() !== '' && !(Number.isFinite(Number(v)) && Number(v) >= 0);
  const submitConfirm = (p: TrialParticipant, f: { amount: string; reference: string; note: string }) => {
    const amt = f.amount.trim() !== '' ? Number(f.amount) : undefined;
    onPaymentStatusChange(p, 'paid', {
      paymentMethod: 'manual_transfer',
      paymentProvider: 'internal',
      paymentReference: f.reference.trim() !== '' ? f.reference.trim() : undefined,
      paidAmount: amt != null && Number.isFinite(amt) ? amt : undefined,
      paidAt: new Date().toISOString(),
      paymentNote: f.note.trim() !== '' ? f.note.trim() : undefined,
    });
    closeForm();
  };
  const submitRefund = (p: TrialParticipant, f: { note: string }) => {
    onPaymentStatusChange(p, 'refunded', {
      paymentNote: f.note.trim() !== '' ? f.note.trim() : undefined,
    });
    closeForm();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">
          참여자 ({totalCount}명)
        </h2>
        <button
          onClick={onExport}
          disabled={exportLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition"
        >
          {exportLoading ? '...' : 'CSV 내보내기'}
        </button>
      </div>

      {/* Filter tabs */}
      {totalCount > 0 && (
        <div className="flex gap-1.5 flex-wrap items-center mb-3">
          {FILTER_OPTIONS.map((opt, idx) => {
            const isFirstConv = opt.group === 'conv' && FILTER_OPTIONS[idx - 1]?.group !== 'conv';
            return (
              <span key={opt.value} className="inline-flex items-center gap-1.5">
                {isFirstConv && (
                  <span className="w-px h-4 bg-gray-300 mx-0.5" />
                )}
                <button
                  onClick={() => onFilterChange(opt.value)}
                  className={`px-2.5 py-1 text-xs rounded-full transition ${
                    filter === opt.value
                      ? opt.group === 'conv'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* WO-O4O-NETURE-DISTRIBUTION-FUNDING-STORE-LANDING-TRACKING-V1: 매장 랜딩 파이프라인 요약 + 안내 */}
      {SHOW_MARKET_TRIAL_COMMERCE_UI && totalCount > 0 && filter === 'all' && (
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
            입금 확인 완료 {participants.filter((p) => (p.paymentStatus ?? 'unpaid') === 'paid').length}명
          </span>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
            펀딩 처리 완료 {participants.filter((p) => p.settlementStatus === 'offline_settled').length}명
          </span>
        </div>
      )}
      {SHOW_MARKET_TRIAL_COMMERCE_UI && totalCount > 0 && (
        <p className="text-xs text-gray-500 mb-3">
          입금 확인 완료자는 보상 방식(제품/수익)을 선택합니다. <strong>제품 보상을 선택한 참여자만 제품 제공·매장 랜딩 추적 대상</strong>이며, 수익·현금성 보상 선택자는 랜딩 대상으로 분류하지 않습니다. <strong>매장 랜딩은 자동 확정되지 않으며</strong> 운영자가 보상·활용 상품 연결 상태를 참고해 확인하고, 필요하면 제품 개발자와 함께 확정합니다.
        </p>
      )}

      {totalCount === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">
          아직 이행 관리 대상 참여자가 없습니다.
        </p>
      ) : participants.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">
          해당 조건의 참여자가 없습니다.
        </p>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:-mx-5">
          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 px-4 text-xs font-medium text-gray-500">이름</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">유형</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">보상</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">이행</th>
                <th className="text-left py-2 px-4 text-xs font-medium text-gray-500">참여일</th>
                <th className="text-right py-2 px-4 text-xs font-medium text-gray-500">이행</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((p) => {
                const isUpdating = updatingId === p.id;
                const isFulfilled = p.rewardStatus === 'fulfilled';
                return (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 px-4 text-gray-900 font-medium">{p.name}</td>
                    <td className="py-2.5 px-2 text-gray-600 text-xs">{typeLabel(p.type)}</td>
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
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        isFulfilled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {isFulfilled ? '완료' : '대기'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-gray-500 text-xs">
                      {new Date(p.joinedAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => onToggleRewardStatus(p)}
                        disabled={isUpdating}
                        className={`px-2.5 py-1 text-xs rounded transition ${
                          isFulfilled
                            ? 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                            : 'text-white bg-green-600 hover:bg-green-700'
                        } disabled:opacity-50`}
                      >
                        {isUpdating ? '...' : isFulfilled ? '대기로' : '이행 완료'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* WO-NETURE-MARKET-TRIAL-PAYMENT-READINESS-V1 / OFFLINE-PAYMENT-REACTIVATION-V1: 오프라인 입금 확인 섹션 (커머스 퍼널과 분리) */}
      {SHOW_OFFLINE_PAYMENT_UI && PAYMENT_VISIBLE_STATUSES.includes(trialStatus) && totalCount > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <div className="flex items-center flex-wrap gap-2 mb-3">
            <h3 className="text-sm font-semibold text-gray-700">오프라인 입금 관리</h3>
            <span className="text-xs text-gray-500">PG 미연동 — 운영자 오프라인 입금 확인</span>
            {/* WO-O4O-NETURE-DISTRIBUTION-FUNDING-OFFLINE-PAYMENT-LEDGER-V1: 송금 완료자 요약 */}
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
              입금 확인 완료 {participants.filter((p) => (p.paymentStatus ?? 'unpaid') === 'paid').length}명 / {totalCount}명
            </span>
          </div>
          {/* WO-O4O-NETURE-DISTRIBUTION-FUNDING-OFFLINE-OPERATION-SAFETY-V1 / OFFLINE-PAYMENT-LEDGER-V1: 오프라인 운영 + 송금 통제 기준 */}
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-3">
            초기 유통참여형 펀딩은 온라인 결제 없이 운영자가 오프라인 입금 확인과 제품 보상 상태를 관리합니다. 송금은 Neture가 수령하며, 입금 확인 완료자 명단은 제품 개발자에게 공유됩니다. 아래 상태 변경은 온라인 결제가 아니라 오프라인 입금 확인 기록이며, 잘못 처리한 경우 되돌릴 수 있습니다.
          </p>
          <div className="overflow-x-auto -mx-4 sm:-mx-5">
            <table className="w-full text-sm min-w-[820px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-4 text-xs font-medium text-gray-500">이름</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">입금 상태</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">방법</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">금액</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">입금일</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">확인일</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">메모</th>
                  <th className="text-right py-2 px-4 text-xs font-medium text-gray-500">액션</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => {
                  const ps = (p.paymentStatus ?? 'unpaid') as PaymentStatus;
                  const isUpdating = updatingPaymentId === p.id;
                  const fmtDate = (iso: string | null) =>
                    iso ? new Date(iso).toLocaleDateString('ko-KR') : '-';
                  const isOpen = payForm?.id === p.id;
                  return (
                    <Fragment key={p.id}>
                    <tr className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2.5 px-4 text-gray-900 font-medium">{p.name}</td>
                      <td className="py-2.5 px-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_STATUS_COLORS[ps]}`}>
                          {PAYMENT_STATUS_LABELS[ps]}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-gray-700 text-xs">
                        {p.paymentMethod === 'manual_transfer' ? '수기 송금' : (p.paymentMethod || '-')}
                      </td>
                      <td className="py-2.5 px-2 text-gray-700 text-xs">
                        {p.paidAmount != null ? `${p.paidAmount.toLocaleString()}원` : '-'}
                      </td>
                      <td className="py-2.5 px-2 text-gray-700 text-xs">{fmtDate(p.paidAt)}</td>
                      <td className="py-2.5 px-2 text-gray-700 text-xs">{fmtDate(p.confirmedAt)}</td>
                      <td className="py-2.5 px-2 text-gray-600 text-xs max-w-[180px] truncate" title={p.paymentNote || ''}>
                        {p.paymentNote || '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right space-x-1">
                        {ps === 'unpaid' || ps === 'pending' || ps === 'failed' ? (
                          <button
                            onClick={() => (isOpen ? closeForm() : openConfirm(p))}
                            disabled={isUpdating}
                            className="px-2.5 py-1 text-xs text-white bg-emerald-600 rounded hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {isUpdating ? '...' : isOpen ? '닫기' : '수기 송금 확인'}
                          </button>
                        ) : ps === 'paid' ? (
                          <>
                            <button
                              onClick={() => (isOpen ? closeForm() : openRefund(p))}
                              disabled={isUpdating}
                              className="px-2.5 py-1 text-xs text-purple-700 border border-purple-200 rounded hover:bg-purple-50 disabled:opacity-50"
                            >
                              {isUpdating ? '...' : isOpen ? '닫기' : '환불'}
                            </button>
                            <button
                              onClick={() => onPaymentStatusChange(p, 'unpaid')}
                              disabled={isUpdating}
                              className="px-2.5 py-1 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
                              title="확인 취소 (운영자 실수 정정용)"
                            >
                              미결제로 되돌리기
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-gray-300">{PAYMENT_STATUS_LABELS[ps]}</span>
                        )}
                      </td>
                    </tr>
                    {isOpen && payForm && (
                      <tr className="bg-gray-50/70">
                        <td colSpan={8} className="px-4 py-3">
                          {payForm.action === 'confirm' ? (
                            <div className="flex flex-wrap items-end gap-3">
                              <label className="flex flex-col text-xs text-gray-600">
                                입금 확인 금액 (원)
                                <input
                                  type="number"
                                  min="0"
                                  inputMode="numeric"
                                  value={payForm.amount}
                                  onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                                  placeholder="예: 30000"
                                  className={`mt-1 w-36 px-2 py-1 text-sm border rounded ${amountInvalid(payForm.amount) ? 'border-red-400' : 'border-gray-300'}`}
                                />
                              </label>
                              <label className="flex flex-col text-xs text-gray-600">
                                송금 참조 (선택)
                                <input
                                  type="text"
                                  value={payForm.reference}
                                  onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })}
                                  placeholder="예: 은행 입금번호"
                                  className="mt-1 w-44 px-2 py-1 text-sm border border-gray-300 rounded"
                                />
                              </label>
                              <label className="flex flex-col text-xs text-gray-600">
                                운영자 메모 (선택)
                                <input
                                  type="text"
                                  value={payForm.note}
                                  onChange={(e) => setPayForm({ ...payForm, note: e.target.value })}
                                  className="mt-1 w-48 px-2 py-1 text-sm border border-gray-300 rounded"
                                />
                              </label>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => submitConfirm(p, payForm)}
                                  disabled={isUpdating || amountInvalid(payForm.amount)}
                                  className="px-3 py-1.5 text-xs text-white bg-emerald-600 rounded hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  {isUpdating ? '처리 중...' : '입금 확인'}
                                </button>
                                <button
                                  onClick={closeForm}
                                  className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50"
                                >
                                  취소
                                </button>
                              </div>
                              {amountInvalid(payForm.amount) && (
                                <span className="w-full text-xs text-red-500">금액은 0 이상의 숫자만 입력하세요.</span>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-end gap-3">
                              <label className="flex flex-col text-xs text-gray-600">
                                환불 사유 (선택)
                                <input
                                  type="text"
                                  value={payForm.note}
                                  onChange={(e) => setPayForm({ ...payForm, note: e.target.value })}
                                  className="mt-1 w-64 px-2 py-1 text-sm border border-gray-300 rounded"
                                />
                              </label>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => submitRefund(p, payForm)}
                                  disabled={isUpdating}
                                  className="px-3 py-1.5 text-xs text-white bg-purple-600 rounded hover:bg-purple-700 disabled:opacity-50"
                                >
                                  {isUpdating ? '처리 중...' : '환불 처리'}
                                </button>
                                <button
                                  onClick={closeForm}
                                  className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50"
                                >
                                  취소
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* WO-MARKET-TRIAL-PHASE3-SETTLEMENT-OPERATOR-TRANSITION-V1: 정산 상태 관리 섹션 */}
      {SHOW_MARKET_TRIAL_COMMERCE_UI && SETTLEMENT_VISIBLE_STATUSES.includes(trialStatus) && totalCount > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">정산 상태 관리</h3>
          <div className="overflow-x-auto -mx-4 sm:-mx-5">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-4 text-xs font-medium text-gray-500">이름</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">참여금</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">리워드%</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">총 정산 금액</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">예상 수량</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">잔액</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">선택</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">정산 상태</th>
                  <th className="text-right py-2 px-4 text-xs font-medium text-gray-500">액션</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => {
                  const ss = (p.settlementStatus ?? 'pending') as SettlementStatus;
                  const nextAction = OPERATOR_SETTLEMENT_NEXT[ss];
                  const isUpdating = updatingSettlementId === p.id;
                  return (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2.5 px-4 text-gray-900 font-medium">{p.name}</td>
                      <td className="py-2.5 px-2 text-gray-700 text-xs">
                        {p.contributionAmount > 0 ? `${p.contributionAmount.toLocaleString()}원` : '-'}
                      </td>
                      <td className="py-2.5 px-2 text-gray-700 text-xs">
                        {p.rewardRate > 0 ? `+${p.rewardRate}%` : '-'}
                      </td>
                      <td className="py-2.5 px-2 text-gray-700 text-xs font-medium">
                        {p.totalSettlementAmount > 0 ? `${p.totalSettlementAmount.toLocaleString()}원` : '-'}
                      </td>
                      <td className="py-2.5 px-2 text-gray-700 text-xs">
                        {p.estimatedProductQty != null ? `${p.estimatedProductQty}개` : '-'}
                      </td>
                      <td className="py-2.5 px-2 text-gray-700 text-xs">
                        {p.estimatedRemainder != null ? `${p.estimatedRemainder.toLocaleString()}원` : '-'}
                      </td>
                      <td className="py-2.5 px-2">
                        {p.settlementChoice ? (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            p.settlementChoice === 'product'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-yellow-50 text-yellow-700'
                          }`}>
                            {p.settlementChoice === 'product' ? '제품' : '현금'}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">미선택</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SETTLEMENT_STATUS_COLORS[ss]}`}>
                          {SETTLEMENT_STATUS_LABELS[ss]}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {nextAction ? (
                          <button
                            onClick={() => onSettlementStatusChange(p, nextAction.to)}
                            disabled={isUpdating}
                            className="px-2.5 py-1 text-xs text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {isUpdating ? '...' : nextAction.label}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300">
                            {ss === 'offline_settled' ? '완료' : ss === 'choice_pending' ? '참여자 선택 대기' : '-'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Trial KPI Bar (WO-NETURE-MARKET-TRIAL-ANALYTICS-AND-KPI-V1) ──

function TrialKpiBar({ kpi }: { kpi: MarketTrialDetailKpi }) {
  const fmtRate = (r: number | null) => (r == null ? '-' : `${r}%`);
  const fmtDays = (d: number | null) => (d == null ? '-' : d <= 0 ? '마감' : `${d}일`);

  return (
    <div className="mb-5 bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-xs font-medium text-gray-500 mb-3">운영 지표 (KPI)</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="text-center">
          <p className="text-base font-bold text-blue-700">{fmtRate(kpi.achievementRate)}</p>
          <p className="text-xs text-gray-500 mt-0.5">목표 달성률</p>
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-green-700">{fmtRate(kpi.participationRate)}</p>
          <p className="text-xs text-gray-500 mt-0.5">참여율</p>
          <p className="text-xs text-gray-400 mt-0.5">{kpi.participantCount}명 참여</p>
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-purple-700">{fmtRate(kpi.paymentCompletionRate)}</p>
          <p className="text-xs text-gray-500 mt-0.5">입금 확인 완료율</p>
          <p className="text-xs text-gray-400 mt-0.5">
            완료 {kpi.paidParticipantCount} · 환불 {kpi.refundCount}
          </p>
        </div>
        <div className="text-center">
          <p className={`text-base font-bold ${
            kpi.recruitingRemainingDays != null && kpi.recruitingRemainingDays <= 3
              ? 'text-red-600'
              : 'text-gray-700'
          }`}>
            {fmtDays(kpi.recruitingRemainingDays)}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">모집 잔여</p>
          {kpi.recruitingProgressPercent != null && (
            <div className="mt-1 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 rounded-full"
                style={{ width: `${Math.min(100, kpi.recruitingProgressPercent)}%` }}
              />
            </div>
          )}
        </div>
      </div>
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

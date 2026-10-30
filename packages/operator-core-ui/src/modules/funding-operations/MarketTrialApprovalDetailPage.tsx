import FundingOfflineOperations from './FundingOfflineOperations';
/**
 * Market Trial Approval Detail Page (Neture Operator)
 *
 * WO-O4O-MARKET-TRIAL-PHASE1-V1
 * WO-MARKET-TRIAL-OPERATOR-CONSOLIDATED-REFINE-V1: 모바일 반응형 + 모집률 + 보상 분류
 * WO-MARKET-TRIAL-OPERATION-READINESS-V1: 참여자 인라인 리스트 + 보상 요약 + 포럼 링크 + 운영 지표 완성
 * WO-MARKET-TRIAL-SETTLEMENT-AND-FULFILLMENT-MANAGEMENT-V1: 이행/정산 관리 추가
 * 운영자 상세 — Trial 정보 확인 + 승인/반려 + 참여자 이행 상태 관리
 */

import FundingParticipantHistory from './FundingParticipantHistory';
import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useOperationNavigate as useNavigate } from './runtime';
import type { OperatorTrial, ParticipantListResponse, TrialStatus, MarketTrialDetailKpi } from './types';
import FundingParticipantsSection from './FundingParticipantsSection';
import { fundingStageTasks } from './fundingStageTasks';
import { STATUS_LABELS, NEXT_STATUS } from './fundingOperatorModel';
import { useFundingOperatorWorkflow } from './useFundingOperatorWorkflow';

export default function MarketTrialApprovalDetailPage() {
  const { id } = useParams<{ id: string }>();
  return id ? <FundingOperatorWorkspace key={id} id={id} /> : <p>유통참여형 펀딩을 찾을 수 없습니다.</p>;
}

function FundingOperatorWorkspace({ id }: { id: string }) {
  const navigate = useNavigate();
  const [offlineBusy,setOfflineBusy]=useState(false);
  const [query, setQuery] = useSearchParams();
  const focusId = query.get('participantId');
  const {
    trial, participantData, trialKpi, loading, error, setError,
    actionLoading, pending, refreshing, refreshRequired, savedBeforeRefresh, kpiError,
    filter, setFilter, paymentFilter, setPaymentFilter,
    participantsLoading, participantsError, updatingId, updatingPaymentId, exportLoading,
    loadParticipants, refresh, handleExport, handleToggleRewardStatus, handlePaymentStatusChange,
    approve, reject, changeStatus, retryForum,
  } = useFundingOperatorWorkflow(id);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const handleReject = async () => { if (await reject(rejectReason)) setShowRejectModal(false); };
  const handleTrialStatusChange = async (status: TrialStatus) => { if (await changeStatus(status)) setShowStatusModal(false); };

  if (loading) return <div className="p-6 text-center text-gray-500">불러오는 중...</div>;
  if (!trial) return <div className="p-6 text-center text-gray-500"><p role="alert">{error || '유통참여형 펀딩을 찾을 수 없습니다.'}</p><button onClick={() => void refresh()}>다시 시도</button></div>;

  const isSubmitted = trial.status === 'submitted' && !trial.forumPending;
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
        <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
          <button className="ml-2 underline text-xs" onClick={() => setError('')}>닫기</button>
        </div>
      )}

      {refreshRequired && <div role="status" className="mb-4 rounded border border-amber-300 bg-amber-50 p-4 text-sm">
        {savedBeforeRefresh ? '처리는 완료됐지만 최신 운영 현황을 확인하지 못했습니다. 다시 저장하지 말고 운영 현황을 새로고침해 주세요.' : '최신 운영 현황을 확인하지 못했습니다. 추가 처리 전에 운영 현황을 새로고침해 주세요.'}
      </div>}
      {kpiError && <div role="alert" className="mb-4 rounded border border-amber-300 p-4 text-sm">
        운영 지표: {kpiError} <button disabled={offlineBusy || pending || refreshing} onClick={() => void refresh()} className="underline">운영 지표 다시 조회</button>
      </div>}

      {/* Summary Metrics Card */}
      <section className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h2 className="text-sm font-semibold text-blue-900">현재 단계의 운영 업무</h2>
        <p className="mt-2 text-sm text-blue-900">{fundingStageTasks[trial.status]?.operator}</p>
        <p className="mt-2 text-xs text-blue-800">개설자: {fundingStageTasks[trial.status]?.creator}</p>
        <p className="mt-2 text-xs text-gray-600">단계 변경·입금 확인·참여자별 이행 기록·포럼 회원 승인은 별도 업무이며 자동으로 함께 처리되지 않습니다.</p>
        <button onClick={() => void refresh()} disabled={offlineBusy || pending || refreshing || participantsLoading} className="mt-3 min-h-11 rounded border border-blue-200 bg-white px-3 text-sm disabled:opacity-50">운영 현황 새로고침</button>
      </section>

      <FundingOfflineOperations key={id} id={id} disabled={actionLoading} onBusyChange={setOfflineBusy} onSaved={()=>{void refresh();}} />
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

      {(trial.forumPending || !trial.forumReady && ['recruiting', 'development', 'outcome_confirming', 'fulfilled'].includes(trial.status)) && (
        <div className="mb-4 rounded border border-amber-300 bg-amber-50 p-4">
          <p>승인된 펀딩의 전용 포럼을 개설합니다. 준비 완료 후 모집을 시작합니다.</p>
          <button disabled={offlineBusy || actionLoading} className="mt-2 min-h-11 rounded border px-4 disabled:opacity-50" onClick={() => void retryForum()}>포럼 개설 재처리</button>
        </div>
      )}
      {/* Forum Link */}
      {trial.forumLink && trial.forumLink.slug && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 flex items-center justify-between">
          <div>
            <span className="text-sm text-gray-500">연결된 펀딩 포럼</span>
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

      {focusId && <div className="my-4 rounded bg-sky-50 p-3 text-sm"><p>예외 목록에서 선택한 참여자의 기록을 표시합니다.</p><button className="min-h-11 underline" onClick={() => { const next = new URLSearchParams(query); next.delete('participantId'); setQuery(next); }}>전체 참여자 보기</button></div>}
      {focusId && <FundingParticipantHistory key={`${id}:${focusId}`} trialId={id} participantId={focusId} refreshKey={participants.find(p => p.id === focusId)?.updatedAt} />}
      {/* Participant List Section */}
      <FundingParticipantsSection
        disabled={offlineBusy || actionLoading}
        participants={focusId ? participants.filter(p => p.id === focusId) : participants}
        totalCount={summary?.totalCount ?? trial.currentParticipants}
        filter={filter}
        onFilterChange={setFilter}
        paymentFilter={paymentFilter}
        onPaymentFilterChange={setPaymentFilter}
        loading={participantsLoading}
        error={participantsError}
        onRetry={() => void (refreshRequired ? refresh() : loadParticipants())}
        onExport={handleExport}
        exportLoading={exportLoading}
        onToggleRewardStatus={handleToggleRewardStatus}
        updatingId={updatingId}
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
              disabled={offlineBusy || actionLoading}
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
              onClick={() => void approve()}
              disabled={offlineBusy || actionLoading}
              className="flex-1 sm:flex-none px-5 py-2.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {pending ? '처리 중...' : '승인'}
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={offlineBusy || actionLoading}
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
              disabled={offlineBusy || pending}
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
                disabled={offlineBusy || pending}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleReject}
                disabled={offlineBusy || actionLoading}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {pending ? '처리 중...' : '반려하기'}
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
                disabled={offlineBusy || pending}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={() => handleTrialStatusChange(nextTransition.status)}
                disabled={offlineBusy || actionLoading}
                className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {pending ? '처리 중...' : '확인'}
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
// 입금 집계는 trialKpi(/:id/kpi), 이행 대기는 현재 참여자 summary에서 가져온다.
function ParticipationReport({
  kpi,
  summary,
}: {
  kpi: MarketTrialDetailKpi;
  summary?: ParticipantListResponse['summary'] | null;
}) {
  const won = (n: number) => `${(n ?? 0).toLocaleString()}원`;
  const processingPending = summary?.pendingCount ?? '-';
  return (
    <div className="mb-5 bg-white border border-gray-200 rounded-lg p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <p className="text-xs font-medium text-gray-500">참여 리포트</p>
        <span className="text-xs text-gray-400">오프라인 입금 확인 이력 기준 · 철회 기록 포함</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <MetricCell value={kpi.participantCount} label="참여 기록" />
        <MetricCell value={kpi.paidParticipantCount} label="입금 확인" highlight={kpi.paidParticipantCount > 0} />
        <MetricCell value={kpi.unpaidParticipantCount} label="입금 미확인" />
        <MetricCell value={won(kpi.totalPaidAmount)} label="입금 확인 금액 합계" highlight={kpi.totalPaidAmount > 0} />
        <MetricCell value={processingPending} label="이행 대기" />
      </div>
      {kpi.refundCount > 0 && (
        <p className="text-xs text-gray-400 mt-2">환불 완료 기록 {kpi.refundCount}명</p>
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

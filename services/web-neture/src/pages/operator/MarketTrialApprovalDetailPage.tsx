/**
 * Market Trial Approval Detail Page (Neture Operator)
 *
 * WO-O4O-MARKET-TRIAL-PHASE1-V1
 * WO-MARKET-TRIAL-OPERATOR-CONSOLIDATED-REFINE-V1: 모바일 반응형 + 모집률 + 보상 분류
 * WO-MARKET-TRIAL-OPERATION-READINESS-V1: 참여자 인라인 리스트 + 보상 요약 + 포럼 링크 + 운영 지표 완성
 * WO-MARKET-TRIAL-SETTLEMENT-AND-FULFILLMENT-MANAGEMENT-V1: 이행/정산 관리 추가
 * 운영자 상세 — Trial 정보 확인 + 승인/반려 + 참여자 이행 상태 관리
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getOperatorTrialDetail,
  getOperatorTrialParticipants,
  getTrialFunnel,
  approveTrialFirst,
  rejectTrialFirst,
  exportParticipantsCSV,
  updateParticipantRewardStatus,
  updateParticipantConversionStatus,
  updateParticipantSettlementStatus,
  createListingFromTrialParticipant,
  updateTrialStatus,
  convertTrialToProduct,
  searchProductsForConversion,
} from '../../api/trial';
import type {
  OperatorTrial,
  TrialParticipant,
  TrialFunnel,
  ParticipantListResponse,
  TrialStatus,
  ProductSearchItem,
  CustomerConversionStatus,
  SettlementStatus,
} from '../../api/trial';
import { BaseTable } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';

type ParticipantFilter =
  | 'all' | 'product' | 'cash' | 'pending' | 'fulfilled'
  | 'conv_interested' | 'conv_considering' | 'conv_adopted' | 'conv_first_order';

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
  const [funnel, setFunnel] = useState<TrialFunnel | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updatingConversionId, setUpdatingConversionId] = useState<string | null>(null);
  const [creatingListingId, setCreatingListingId] = useState<string | null>(null);
  // WO-MARKET-TRIAL-PHASE3-SETTLEMENT-OPERATOR-TRANSITION-V1
  const [updatingSettlementId, setUpdatingSettlementId] = useState<string | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  // WO-MARKET-TRIAL-PRODUCT-LINK-SEARCH-UI-V1
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertNote, setConvertNote] = useState('');
  const [convertLoading, setConvertLoading] = useState(false);
  const [productSearchKeyword, setProductSearchKeyword] = useState('');
  const [productSearchResults, setProductSearchResults] = useState<ProductSearchItem[]>([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [selectedProductKey, setSelectedProductKey] = useState<Set<string>>(new Set());
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadParticipants = useCallback(async (trialId: string, f: ParticipantFilter) => {
    const filters: {
      rewardType?: 'product' | 'cash';
      rewardStatus?: 'pending' | 'fulfilled';
      customerConversionStatus?: CustomerConversionStatus;
    } = {};
    if (f === 'product') filters.rewardType = 'product';
    else if (f === 'cash') filters.rewardType = 'cash';
    else if (f === 'pending') filters.rewardStatus = 'pending';
    else if (f === 'fulfilled') filters.rewardStatus = 'fulfilled';
    else if (f === 'conv_interested') filters.customerConversionStatus = 'interested';
    else if (f === 'conv_considering') filters.customerConversionStatus = 'considering';
    else if (f === 'conv_adopted') filters.customerConversionStatus = 'adopted';
    else if (f === 'conv_first_order') filters.customerConversionStatus = 'first_order';
    const pData = await getOperatorTrialParticipants(trialId, filters).catch(() => null);
    setParticipantData(pData);
  }, []);

  const loadAll = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [trialData, funnelData] = await Promise.all([
        getOperatorTrialDetail(id),
        getTrialFunnel(id).catch(() => null),
      ]);
      setTrial(trialData);
      setFunnel(funnelData);
      await loadParticipants(id, filter);
    } catch (err: any) {
      setError(err.message || 'Trial을 불러오는데 실패했습니다.');
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

  const handleCreateListing = async (participant: TrialParticipant) => {
    if (!id) return;
    setCreatingListingId(participant.id);
    try {
      await createListingFromTrialParticipant(id, participant.id);
      await loadParticipants(id, filter);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '매장 진열 등록에 실패했습니다.');
    } finally {
      setCreatingListingId(null);
    }
  };

  const handleConversionStatusChange = async (participant: TrialParticipant, newStatus: CustomerConversionStatus) => {
    if (!id) return;
    setUpdatingConversionId(participant.id);
    try {
      await updateParticipantConversionStatus(id, participant.id, newStatus);
      await loadParticipants(id, filter);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '전환 상태 변경에 실패했습니다.');
    } finally {
      setUpdatingConversionId(null);
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
      setError(err.response?.data?.message || err.message || '정산 상태 변경에 실패했습니다.');
    } finally {
      setUpdatingSettlementId(null);
    }
  };

  const handleProductSearch = useCallback(async (keyword: string, supplierUserId?: string) => {
    setProductSearchLoading(true);
    try {
      const result = await searchProductsForConversion(keyword, { supplierUserId, limit: 20 });
      setProductSearchResults(result.data);
    } catch {
      setProductSearchResults([]);
    } finally {
      setProductSearchLoading(false);
    }
  }, []);

  const handleSearchKeywordChange = (kw: string) => {
    setProductSearchKeyword(kw);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      handleProductSearch(kw, trial?.supplierId);
    }, 300);
  };

  const openConvertModal = () => {
    setSelectedProductKey(new Set());
    setProductSearchKeyword('');
    setConvertNote('');
    setShowConvertModal(true);
    // Load initial list (filtered by trial supplier if available)
    handleProductSearch('', trial?.supplierId);
  };

  const handleConvert = async () => {
    if (!id) return;
    const selectedId = [...selectedProductKey][0];
    if (!selectedId) {
      setError('연결할 상품을 선택해주세요.');
      return;
    }

    setConvertLoading(true);
    try {
      await convertTrialToProduct(id, {
        productId: selectedId,
        conversionNote: convertNote.trim() || undefined,
      });
      setShowConvertModal(false);
      await loadAll();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '상품 전환에 실패했습니다.');
    } finally {
      setConvertLoading(false);
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
      setError(err.response?.data?.message || err.message || 'Trial 상태 변경에 실패했습니다.');
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

      {/* Fulfillment Summary Card */}
      {summary && summary.totalCount > 0 && (
        <FulfillmentSummary summary={summary} allFulfilled={allFulfilled ?? false} />
      )}

      {/* Funnel Section — WO-MARKET-TRIAL-OPERATIONS-CONSOLIDATION-V1 */}
      {funnel && funnel.participantCount > 0 && (
        <FunnelSection funnel={funnel} />
      )}

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
        onConversionStatusChange={handleConversionStatusChange}
        updatingConversionId={updatingConversionId}
        onCreateListing={handleCreateListing}
        creatingListingId={creatingListingId}
        trialConverted={!!trial.convertedProductId}
        onSettlementStatusChange={handleSettlementStatusChange}
        updatingSettlementId={updatingSettlementId}
        trialStatus={trial.status}
      />

      {/* Trial Status Control (non-submitted states) */}
      {nextTransition && !isSubmitted && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Trial 진행 관리</h3>
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
              모든 참여자 이행이 완료되었습니다. Trial 상태 전환을 검토해주세요.
            </p>
          )}
        </div>
      )}

      {/* Product Conversion Section — WO-MARKET-TRIAL-TO-PRODUCT-CONVERSION-FLOW-V1 */}
      <ProductConversionSection
        trial={trial}
        productRewardCount={summary?.productCount ?? 0}
        onConvertClick={openConvertModal}
      />

      {/* Approve/Reject buttons */}
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

      {/* Product Conversion Modal — WO-MARKET-TRIAL-PRODUCT-LINK-SEARCH-UI-V1 */}
      {showConvertModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">기존 상품으로 연결</h3>
              <button
                onClick={() => setShowConvertModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Search input */}
            <div className="px-6 py-3 border-b border-gray-100">
              <input
                type="text"
                value={productSearchKeyword}
                onChange={(e) => handleSearchKeywordChange(e.target.value)}
                placeholder="상품명으로 검색..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            {/* Product table */}
            <div className="flex-1 overflow-auto px-6 py-3">
              {productSearchLoading ? (
                <p className="text-sm text-gray-400 text-center py-8">검색 중...</p>
              ) : (
                <ProductSearchTable
                  products={productSearchResults}
                  selectedKeys={selectedProductKey}
                  onSelectionChange={setSelectedProductKey}
                />
              )}
            </div>

            {/* Selected product display */}
            {selectedProductKey.size > 0 && (() => {
              const sel = productSearchResults.find((p) => selectedProductKey.has(p.id));
              return sel ? (
                <div className="px-6 py-2 bg-blue-50 border-t border-blue-100 text-sm">
                  <span className="text-gray-500">선택된 상품: </span>
                  <span className="font-medium text-blue-800">{sel.name}</span>
                  {sel.supplierName && (
                    <span className="text-gray-500 ml-1">/ {sel.supplierName}</span>
                  )}
                </div>
              ) : null;
            })()}

            {/* Note + actions */}
            <div className="px-6 py-4 border-t border-gray-200 space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">운영자 메모 (선택)</label>
                <input
                  type="text"
                  value={convertNote}
                  onChange={(e) => setConvertNote(e.target.value)}
                  placeholder="전환 사유 또는 메모"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowConvertModal(false)}
                  className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={handleConvert}
                  disabled={convertLoading || selectedProductKey.size === 0}
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {convertLoading ? '처리 중...' : '기존 상품으로 연결'}
                </button>
              </div>
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
              Trial 상태를 <strong>{STATUS_LABELS[trial.status]}</strong>에서{' '}
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
  { value: 'conv_interested',  label: '관심', group: 'conv' },
  { value: 'conv_considering', label: '취급 검토', group: 'conv' },
  { value: 'conv_adopted',     label: '취급 시작', group: 'conv' },
  { value: 'conv_first_order', label: '첫 주문', group: 'conv' },
];

const CONVERSION_STATUS_LABELS: Record<CustomerConversionStatus, string> = {
  none: '참여만',
  interested: '관심 있음',
  considering: '취급 검토',
  adopted: '취급 시작',
  first_order: '첫 주문',
};

const CONVERSION_STATUS_COLORS: Record<CustomerConversionStatus, string> = {
  none: 'bg-gray-100 text-gray-500',
  interested: 'bg-blue-50 text-blue-700',
  considering: 'bg-yellow-50 text-yellow-700',
  adopted: 'bg-green-50 text-green-700',
  first_order: 'bg-green-100 text-green-800',
};

const CONVERSION_STATUS_OPTIONS: CustomerConversionStatus[] = ['none', 'interested', 'considering', 'adopted', 'first_order'];

// WO-MARKET-TRIAL-PHASE3-SETTLEMENT-OPERATOR-TRANSITION-V1
const SETTLEMENT_STATUS_LABELS: Record<SettlementStatus, string> = {
  pending: '정산 대기',
  choice_pending: '선택 대기',
  choice_completed: '선택 완료',
  offline_review: '운영 확인 중',
  offline_settled: '정산 완료',
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
  offline_review: { to: 'offline_settled', label: '정산 완료 처리' },
};

// Trial 상태 기준 정산 섹션 표시 여부
const SETTLEMENT_VISIBLE_STATUSES: TrialStatus[] = ['development', 'outcome_confirming', 'fulfilled', 'closed'];

function ParticipantSection({
  participants,
  totalCount,
  filter,
  onFilterChange,
  onExport,
  exportLoading,
  onToggleRewardStatus,
  updatingId,
  onConversionStatusChange,
  updatingConversionId,
  onCreateListing,
  creatingListingId,
  trialConverted,
  onSettlementStatusChange,
  updatingSettlementId,
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
  onConversionStatusChange: (p: TrialParticipant, s: CustomerConversionStatus) => void;
  updatingConversionId: string | null;
  onCreateListing: (p: TrialParticipant) => void;
  creatingListingId: string | null;
  trialConverted: boolean;
  // WO-MARKET-TRIAL-PHASE3-SETTLEMENT-OPERATOR-TRANSITION-V1
  onSettlementStatusChange: (p: TrialParticipant, s: SettlementStatus, note?: string) => void;
  updatingSettlementId: string | null;
  trialStatus: TrialStatus;
}) {
  const typeLabel = (t: string) => (t === 'seller' ? '판매자' : t === 'partner' ? '파트너' : t);
  const rewardLabel = (r: string | null) => {
    if (r === 'product') return '제품';
    if (r === 'cash') return '현금';
    return '-';
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
                <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">거래선 단계</th>
                {trialConverted && (
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">진열 상태</th>
                )}
                <th className="text-left py-2 px-4 text-xs font-medium text-gray-500">참여일</th>
                <th className="text-right py-2 px-4 text-xs font-medium text-gray-500">이행</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((p) => {
                const isUpdating = updatingId === p.id;
                const isUpdatingConv = updatingConversionId === p.id;
                const isCreatingListing = creatingListingId === p.id;
                const isFulfilled = p.rewardStatus === 'fulfilled';
                const convStatus = (p.customerConversionStatus ?? 'none') as CustomerConversionStatus;
                const listingEligible = trialConverted && (convStatus === 'adopted' || convStatus === 'first_order');
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
                    <td className="py-2.5 px-2">
                      {isUpdatingConv ? (
                        <span className="text-xs text-gray-400">...</span>
                      ) : (
                        <select
                          value={convStatus}
                          onChange={(e) => onConversionStatusChange(p, e.target.value as CustomerConversionStatus)}
                          className={`text-xs rounded px-1.5 py-1 border border-transparent cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 ${CONVERSION_STATUS_COLORS[convStatus]}`}
                        >
                          {CONVERSION_STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>{CONVERSION_STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    {trialConverted && (
                      <td className="py-2.5 px-2">
                        {p.listingId ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                            진열 완료
                          </span>
                        ) : listingEligible ? (
                          <button
                            onClick={() => onCreateListing(p)}
                            disabled={isCreatingListing}
                            className="px-2 py-0.5 text-xs text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {isCreatingListing ? '...' : '진열 등록'}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300">-</span>
                        )}
                      </td>
                    )}
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

      {/* WO-MARKET-TRIAL-PHASE3-SETTLEMENT-OPERATOR-TRANSITION-V1: 정산 상태 관리 섹션 */}
      {SETTLEMENT_VISIBLE_STATUSES.includes(trialStatus) && totalCount > 0 && (
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

// ── Product Search Table ── WO-MARKET-TRIAL-PRODUCT-LINK-SEARCH-UI-V1

const PRODUCT_SEARCH_COLUMNS: O4OColumn<ProductSearchItem>[] = [
  {
    key: 'name',
    header: '상품명',
    accessor: (r) => r.name,
    render: (v) => <span className="font-medium text-gray-900 text-sm">{v}</span>,
  },
  {
    key: 'supplierName',
    header: '공급자',
    accessor: (r) => r.supplierName,
    render: (v) => <span className="text-sm text-gray-600">{v || '-'}</span>,
  },
  {
    key: 'categoryName',
    header: '카테고리',
    accessor: (r) => r.categoryName,
    render: (v) => <span className="text-sm text-gray-600">{v || '-'}</span>,
  },
  {
    key: 'regulatoryType',
    header: '규제 유형',
    accessor: (r) => r.regulatoryType,
    render: (v) => v ? (
      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{v}</span>
    ) : <span className="text-gray-400 text-xs">-</span>,
  },
  {
    key: 'isActive',
    header: '상태',
    accessor: (r) => r.isActive,
    render: (v) => (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${v ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
        {v ? '활성' : '비활성'}
      </span>
    ),
    width: 70,
  },
  {
    key: 'createdAt',
    header: '등록일',
    accessor: (r) => r.createdAt,
    render: (v) => <span className="text-xs text-gray-400">{v ? new Date(v).toLocaleDateString('ko-KR') : '-'}</span>,
    width: 90,
  },
];

function ProductSearchTable({
  products,
  selectedKeys,
  onSelectionChange,
}: {
  products: ProductSearchItem[];
  selectedKeys: Set<string>;
  onSelectionChange: (keys: Set<string>) => void;
}) {
  return (
    <BaseTable<ProductSearchItem>
      tableId="marketTrialProductSearchTable"
      columns={PRODUCT_SEARCH_COLUMNS}
      data={products}
      rowKey={(r) => r.id}
      selectable
      selectedKeys={selectedKeys}
      onSelectionChange={(keys) => {
        // Single selection: keep only the most recently clicked key
        if (keys.size > 1) {
          const prev = [...selectedKeys][0];
          const newKeys = [...keys].filter((k) => k !== prev);
          onSelectionChange(new Set([newKeys[0]]));
        } else {
          onSelectionChange(keys);
        }
      }}
      onRowClick={(row) => onSelectionChange(new Set([row.id]))}
      emptyMessage={
        <p className="text-sm text-gray-400 text-center py-6">검색 결과가 없습니다.</p>
      }
    />
  );
}

// ── Product Conversion Section ── WO-MARKET-TRIAL-TO-PRODUCT-CONVERSION-FLOW-V1

const CONVERSION_ELIGIBLE = new Set(['fulfilled', 'closed']);

function ProductConversionSection({
  trial,
  productRewardCount,
  onConvertClick,
}: {
  trial: OperatorTrial;
  productRewardCount: number;
  onConvertClick: () => void;
}) {
  const isConverted = !!trial.convertedProductId;
  const isEligible = CONVERSION_ELIGIBLE.has(trial.status);

  // Not eligible and not converted → show nothing (not ready)
  if (!isEligible && !isConverted) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 text-sm text-gray-400">
        상품 전환은 이행 완료(fulfilled) 또는 종료(closed) 상태에서 가능합니다.
      </div>
    );
  }

  return (
    <div className={`border rounded-lg p-4 sm:p-5 mb-4 ${isConverted ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">상품 전환</h3>
        {isConverted && (
          <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
            전환 완료
          </span>
        )}
        {!isConverted && isEligible && (
          <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
            전환 가능
          </span>
        )}
      </div>

      {/* Participant stats relevant to conversion */}
      <div className="flex gap-4 mb-3 text-sm">
        <div>
          <span className="text-gray-500">제품 보상 참여자</span>
          <span className="ml-2 font-semibold text-gray-900">{productRewardCount}명</span>
          {productRewardCount > 0 && (
            <span className="ml-1 text-xs text-blue-600">→ 후속 공급 검토 대상</span>
          )}
        </div>
      </div>

      {isConverted ? (
        <div className="space-y-1 text-sm">
          <div>
            <span className="text-gray-500">연결된 상품:</span>
            <span className="ml-2 font-medium text-gray-900">{trial.convertedProductName}</span>
          </div>
          <div>
            <span className="text-gray-500">상품 ID:</span>
            <span className="ml-2 text-xs text-gray-500 font-mono break-all">{trial.convertedProductId}</span>
          </div>
          {trial.conversionNote && (
            <div>
              <span className="text-gray-500">메모:</span>
              <span className="ml-2 text-gray-700">{trial.conversionNote}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onConvertClick}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            상품 전환 실행
          </button>
          <p className="self-center text-xs text-gray-400">
            기존 상품 연결 또는 새 상품(DRAFT) 생성
          </p>
        </div>
      )}
    </div>
  );
}

// ── Funnel Section ── WO-MARKET-TRIAL-OPERATIONS-CONSOLIDATION-V1

function FunnelSection({ funnel }: { funnel: TrialFunnel }) {
  const dist = funnel.conversionDistribution;
  const total = funnel.participantCount;

  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  const steps = [
    { key: 'none',        label: '참여만',    count: dist.none,        color: 'bg-gray-200 text-gray-600' },
    { key: 'interested',  label: '관심',      count: dist.interested,  color: 'bg-blue-100 text-blue-700' },
    { key: 'considering', label: '취급 검토',  count: dist.considering, color: 'bg-yellow-100 text-yellow-700' },
    { key: 'adopted',     label: '취급 시작',  count: dist.adopted,     color: 'bg-green-100 text-green-700' },
    { key: 'first_order', label: '첫 주문',   count: dist.first_order, color: 'bg-green-200 text-green-800' },
  ];

  const adoptedRate = pct(dist.adopted + dist.first_order);
  const firstOrderRate = pct(dist.first_order);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">거래선 전환 퍼널</h3>
        <div className="flex gap-3 text-xs text-gray-500">
          <span>취급률 <strong className="text-green-600">{adoptedRate}%</strong></span>
          <span>첫주문률 <strong className="text-green-700">{firstOrderRate}%</strong></span>
          {funnel.listingCount > 0 && (
            <span>진열 <strong className="text-indigo-600">{funnel.listingCount}건</strong></span>
          )}
        </div>
      </div>

      {/* Flow bars */}
      <div className="flex items-end gap-1 mb-3 overflow-x-auto pb-1">
        {steps.map((step, idx) => (
          <div key={step.key} className="flex items-center gap-1 flex-shrink-0">
            {idx > 0 && <span className="text-gray-300 text-xs">›</span>}
            <div className="flex flex-col items-center min-w-[56px]">
              <span className="text-base font-bold text-gray-800 mb-0.5">{step.count}</span>
              <div
                className={`w-12 rounded-t transition-all ${step.color}`}
                style={{ height: `${Math.max(4, Math.round((step.count / (total || 1)) * 60))}px` }}
              />
              <span className="text-[10px] text-gray-500 mt-1 text-center leading-tight">{step.label}</span>
              <span className="text-[10px] text-gray-400">{pct(step.count)}%</span>
            </div>
          </div>
        ))}

        {/* Listing */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-gray-300 text-xs">›</span>
          <div className="flex flex-col items-center min-w-[56px]">
            <span className="text-base font-bold text-indigo-700 mb-0.5">{funnel.listingCount}</span>
            <div
              className="w-12 rounded-t bg-indigo-100 transition-all"
              style={{ height: `${Math.max(4, Math.round((funnel.listingCount / (total || 1)) * 60))}px` }}
            />
            <span className="text-[10px] text-gray-500 mt-1 text-center leading-tight">매장 진열</span>
            <span className="text-[10px] text-gray-400">{pct(funnel.listingCount)}%</span>
          </div>
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

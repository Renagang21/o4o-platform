/**
 * ProductServiceApprovalPage — 서비스별 상품 승인
 *
 * WO-NETURE-PRODUCT-APPROVAL-FLOW-V1
 * WO-NETURE-OPERATOR-APPROVAL-QUEUE-UX-V1
 *
 * Operator: 서비스 레벨 상품 승인 관리.
 * - KPI 바 (전체/승인대기/승인됨/거절됨/오늘신규)
 * - 필터: 상태 탭 + 서비스 + 검색 + 기간
 * - 카드 리스트 (이미지 + 상품정보 + 뱃지 + 액션)
 * - 체크박스 일괄 승인/거절
 * - 상세 Drawer (우측 슬라이드)
 * - 거절 시 사유 입력 모달
 */

import { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import {
  operatorServiceApprovalApi,
  type ServiceApprovalItem,
  type ServiceApprovalStats,
  type ApprovalAnalytics,
} from '../../lib/api/serviceApproval';
import { productCleanupApi } from '../../lib/api/operatorProductCleanup';
import { getSupplyPolicyBadges, getServiceDisplay } from '../../lib/productConstants';
import { useAuth } from '../../contexts/AuthContext';
import { buildServiceApprovalListParams, getSelectedPendingServiceApprovalIds } from './productServiceApprovalModel';
import { getServiceApprovalDecisionOutcome, type ServiceApprovalDecision, type ServiceApprovalDecisionOutcome } from './serviceApprovalDecisionResult';
import { ProductServiceApprovalDrawer } from './ProductServiceApprovalDrawer';
import { ProductServiceApprovalDecisionModal } from './ProductServiceApprovalDecisionModal';
import { STATUS_BADGE, getRegulatoryBadge, getCompletenessBadge, hasPermitRisk, formatPrice, getQualityFlags, getRecommendation } from './productServiceApprovalPresentation';
import { useLatestRequest } from '../../hooks/useLatestRequest';

// ==================== Constants ====================

const STATUS_TABS = [
  { key: 'all', label: '전체' },
  { key: 'pending', label: '승인대기' },
  { key: 'approved', label: '승인됨' },
  { key: 'rejected', label: '거절됨' },
] as const;

const SERVICE_OPTIONS = [
  { key: '', label: '전체 서비스' },
  { key: 'k-cosmetics', label: 'K-Cosmetics' },
  { key: 'kpa-society', label: 'KPA Society' },
];

// ==================== Component ====================

export default function ProductServiceApprovalPage() {
  const { user } = useAuth();
  const canManage = user?.roles?.some(
    (r: string) => r === 'neture:admin' || r === 'neture:operator' || r === 'platform:super_admin',
  ) ?? false;

  // Data
  const [items, setItems] = useState<ServiceApprovalItem[]>([]);
  const [stats, setStats] = useState<ServiceApprovalStats>({ pending: 0, approved: 0, rejected: 0, total: 0, todayPending: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 30, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [analyticsResult, setAnalyticsResult] = useState<{ scope: string; data: ApprovalAnalytics | null } | null>(null);
  const analytics = analyticsResult?.data ?? null;
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'all' | '7d' | '30d'>('all');

  // Filters — URL param으로 초기 상태 결정 (Dashboard 링크 연동)
  const [statusFilter, setStatusFilter] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('status');
    return s && ['pending', 'approved', 'rejected'].includes(s) ? s : 'all';
  });
  const [serviceFilter, setServiceFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  // WO-O4O-NETURE-OPERATOR-APPROVAL-UX-ADVANCED-V1: quality filters
  const [scoreRange, setScoreRange] = useState<'' | 'low' | 'mid' | 'high'>('');
  const [filterHasIssues, setFilterHasIssues] = useState(false);
  // WO-O4O-NETURE-APPROVAL-UI-INSIGHT-INTEGRATION-V1: priority filter
  const [priorityFilter, setPriorityFilter] = useState<'' | 'HIGH' | 'MEDIUM' | 'LOW'>('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Actions
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [decisionNotice, setDecisionNotice] = useState<ServiceApprovalDecisionOutcome | null>(null);
  const decisionWriting = useRef(false);
  const decisionMounted = useRef(true);
  const decisionBusy = batchLoading || actionLoading !== null;
  useEffect(() => {
    decisionMounted.current = true;
    return () => { decisionMounted.current = false; };
  }, []);

  // Reject modal
  const [rejectTarget, setRejectTarget] = useState<string | null>(null); // single ID or 'batch'
  const [rejectReason, setRejectReason] = useState('');

  // Approve modal (WO-NETURE-APPROVAL-ACTION-UX-V1)
  const [approveTarget, setApproveTarget] = useState<string | null>(null); // single ID or 'batch'
  const [approveMemo, setApproveMemo] = useState('');

  // Delete (WO-NETURE-OPERATOR-PENDING-PRODUCT-HARD-DELETE-V1)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Detail drawer
  const [drawerItem, setDrawerItem] = useState<ServiceApprovalItem | null>(null);

  // 목록과 분석의 요청 채널을 분리해 각 응답 순서를 관리한다.
  const listScope = JSON.stringify([user?.id ?? null, statusFilter, serviceFilter, searchQuery, dateFrom, dateTo, scoreRange, filterHasIssues, priorityFilter]);
  const analyticsScope = JSON.stringify([user?.id ?? null, analyticsPeriod]);
  const beginListRequest = useLatestRequest(listScope);
  const beginAnalyticsRequest = useLatestRequest(analyticsScope);
  const activeList = useRef<{ scope: string; page: number; fetch: ((page?: number) => Promise<void>) | null }>({ scope: listScope, page: 1, fetch: null });

  // ==================== Data Fetching ====================

  const fetchData = useCallback(async (page = 1) => {
    // 이전 조건을 캡처한 callback은 새 조건의 유효 요청도 무효화하지 않는다.
    if (activeList.current.scope !== listScope) return;
    const isCurrent = beginListRequest();
    if (!isCurrent()) return;
    activeList.current.page = page;
    setLoading(true);
    setPermissionError(null);
    try {
      const [listResult, statsResult] = await Promise.all([
        operatorServiceApprovalApi.list(buildServiceApprovalListParams({
          statusFilter, serviceFilter, searchQuery, dateFrom, dateTo,
          scoreRange, filterHasIssues, priorityFilter,
        }, page)),
        operatorServiceApprovalApi.stats(),
      ]);
      if (!isCurrent()) return;
      activeList.current.page = listResult.pagination.page;
      setItems(listResult.data);
      setPagination(listResult.pagination);
      setStats(statsResult);
      setSelectedIds(new Set());
    } catch (err: any) {
      if (isCurrent()) setPermissionError(err?.message || '데이터를 불러올 수 없습니다');
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [listScope, beginListRequest, statusFilter, serviceFilter, searchQuery, dateFrom, dateTo, scoreRange, filterHasIssues, priorityFilter]);

  useLayoutEffect(() => {
    const current = activeList.current;
    if (current.scope !== listScope) {
      current.scope = listScope;
      current.page = 1;
    }
    current.fetch = fetchData;
  }, [listScope, fetchData]);

  const refreshData = useCallback((page?: number) => {
    const current = activeList.current;
    return current.fetch?.(page ?? current.page);
  }, []);

  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  // 분석은 목록과 독립적인 최신 기간의 결과만 반영한다.
  useEffect(() => {
    const isCurrent = beginAnalyticsRequest();
    operatorServiceApprovalApi.analytics(analyticsPeriod)
      .then(data => {
        if (!isCurrent()) return;
        setAnalyticsResult({ scope: analyticsScope, data });
        setShowAnalytics(!!data);
      })
      .catch(() => {
        if (!isCurrent()) return;
        setAnalyticsResult({ scope: analyticsScope, data: null });
        setShowAnalytics(false);
      });
  }, [analyticsPeriod, analyticsScope, beginAnalyticsRequest]);

  const cancelSearchTimer = useCallback(() => {
    if (searchTimer.current !== null) {
      clearTimeout(searchTimer.current);
      searchTimer.current = null;
    }
  }, []);

  useEffect(() => cancelSearchTimer, [cancelSearchTimer]);

  const applySearch = (value: string) => {
    cancelSearchTimer();
    setSearchInput(value);
    setSearchQuery(value);
  };

  // Search debounce
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    cancelSearchTimer();
    searchTimer.current = setTimeout(() => {
      searchTimer.current = null;
      setSearchQuery(value);
    }, 300);
  };

  // ==================== Selection ====================

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  // Only pending items can be batch-acted on
  const selectedPendingIds = getSelectedPendingServiceApprovalIds(items, selectedIds);

  // ==================== Actions ====================

  const openDecision = (decision: ServiceApprovalDecision, target: string) => {
    if (decisionWriting.current) return;
    setDecisionError(null);
    setDecisionNotice(null);
    if (decision === 'approve') {
      setRejectTarget(null);
      setApproveTarget(target);
      setApproveMemo('');
    } else {
      setApproveTarget(null);
      setRejectTarget(target);
      setRejectReason('');
    }
  };

  const handleApprove = (id: string) => openDecision('approve', id);

  const handleDecisionConfirm = async (decision: ServiceApprovalDecision) => {
    const target = decision === 'approve' ? approveTarget : rejectTarget;
    if (!target || !canManage || decisionWriting.current) return;
    const isBatch = target === 'batch';
    const ids = [...selectedPendingIds];
    if (isBatch && ids.length === 0) return;
    const reason = (decision === 'approve' ? approveMemo : rejectReason) || undefined;
    decisionWriting.current = true;
    setDecisionError(null);
    setDecisionNotice(null);
    if (isBatch) setBatchLoading(true);
    else setActionLoading(target);
    try {
      const result = isBatch
        ? await (decision === 'approve'
          ? operatorServiceApprovalApi.batchApprove(ids, reason)
          : operatorServiceApprovalApi.batchReject(ids, reason))
        : await (decision === 'approve'
          ? operatorServiceApprovalApi.approve(target, reason)
          : operatorServiceApprovalApi.reject(target, reason));
      if (!decisionMounted.current) return;
      const outcome = getServiceApprovalDecisionOutcome(decision, result, isBatch);
      if (outcome.kind === 'failure') {
        setDecisionError(outcome.message);
        return;
      }
      setDecisionNotice(outcome);
      if (decision === 'approve') {
        setApproveTarget(null);
        setApproveMemo('');
      } else {
        setRejectTarget(null);
        setRejectReason('');
      }
      if (isBatch) {
        // 실패한 ID는 API에 없으므로 갱신된 목록에서 다시 선택한다. 성공 건 재전송 방지.
        setSelectedIds(new Set());
        setDrawerItem(null);
      } else if (drawerItem?.id === target) {
        setDrawerItem(null);
      }
      await refreshData();
    } catch {
      if (decisionMounted.current) {
        setDecisionError(getServiceApprovalDecisionOutcome(decision, { success: false }, isBatch).message);
      }
    } finally {
      decisionWriting.current = false;
      if (decisionMounted.current) {
        setBatchLoading(false);
        setActionLoading(null);
      }
    }

  };

  const handleBatchApprove = () => {
    if (selectedPendingIds.length === 0) return;
    openDecision('approve', 'batch');
  };

  const handleBatchReject = () => {
    if (selectedPendingIds.length === 0) return;
    openDecision('reject', 'batch');
  };

  // WO-NETURE-OPERATOR-PENDING-PRODUCT-HARD-DELETE-V1
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const result = await operatorServiceApprovalApi.deletePendingOffer(deleteTarget);
    setDeleteLoading(false);
    setDeleteTarget(null);
    if (result.success) {
      if (drawerItem?.offerId === deleteTarget) setDrawerItem(null);
      await refreshData();
    }
  };

  // ==================== Render ====================

  return (
    <div className="relative">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">서비스별 상품 승인</h1>
        <p className="text-sm text-slate-500 mt-1">
          공급자가 선택한 서비스별 상품 승인을 관리합니다.
        </p>
      </div>

      {decisionNotice && (
        <div role="status" className={`mb-4 rounded-lg border p-3 text-sm ${decisionNotice.kind === 'partial' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-green-200 bg-green-50 text-green-800'}`}>
          {decisionNotice.message}
        </div>
      )}

      {/* KPI Bar */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { label: '전체', value: stats.total, color: 'bg-slate-50 text-slate-700 border-slate-200' },
          { label: '승인대기', value: stats.pending, color: 'bg-amber-50 text-amber-700 border-amber-200' },
          { label: '승인됨', value: stats.approved, color: 'bg-green-50 text-green-700 border-green-200' },
          { label: '거절됨', value: stats.rejected, color: 'bg-red-50 text-red-700 border-red-200' },
          { label: '오늘 신규', value: stats.todayPending, color: 'bg-blue-50 text-blue-700 border-blue-200' },
        ].map((s) => (
          <div key={s.label} className={`rounded-lg p-4 border ${s.color}`}>
            <div className="text-xs font-medium opacity-70">{s.label}</div>
            <div className="text-2xl font-bold mt-0.5">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Analytics Card (WO-NETURE-APPROVAL-ANALYTICS-ENHANCEMENT-V1) */}
      {analytics && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => setShowAnalytics((v) => !v)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              <span>{showAnalytics ? '▼' : '▶'}</span>
              승인 분석
            </button>
            {showAnalytics && (
              <div className="flex gap-1">
                {([['all', '전체'], ['7d', '7일'], ['30d', '30일']] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setAnalyticsPeriod(key)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      analyticsPeriod === key
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {showAnalytics && (
            <>
              {analyticsResult?.scope !== analyticsScope ? (
                <p role="status" className="py-4 text-sm text-slate-500">선택한 기간의 분석을 불러오는 중...</p>
              ) : (
                <>
              {/* Actionable Alerts (WO-NETURE-APPROVAL-ACTIONABLE-INSIGHTS-V1) */}
              {analytics.alerts && (analytics.alerts.lowQualitySuppliers.length > 0 || analytics.alerts.stalePendingCount > 0) && (
                <div className="flex flex-wrap gap-3 mb-4">
                  {analytics.alerts.stalePendingCount > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                      <span className="text-amber-600 font-medium">48h+ 대기 상품 {analytics.alerts.stalePendingCount}건</span>
                      <button
                        onClick={() => { setStatusFilter('pending'); setDateTo(new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10)); }}
                        className="text-amber-700 underline text-xs hover:text-amber-900"
                      >
                        보러가기
                      </button>
                    </div>
                  )}
                  {analytics.alerts.lowQualitySuppliers.length > 0 && (
                    <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm">
                      <span className="text-red-600 font-medium">승인율 낮은 공급자: </span>
                      {analytics.alerts.lowQualitySuppliers.map((lq, i) => (
                        <button
                          key={lq.supplierId}
                          onClick={() => applySearch(lq.supplierName)}
                          className="text-red-700 underline hover:text-red-900"
                        >
                          {i > 0 && ', '}{lq.supplierName} ({lq.approvalRate}%)
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 mb-4">
                {/* Approval Rate */}
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <div className="text-xs text-slate-400 mb-1">승인율</div>
                  <div className="text-3xl font-bold text-blue-700">{analytics.summary.approvalRate}%</div>
                  <div className="flex gap-3 mt-2 text-xs text-slate-500">
                    <span>승인 {analytics.summary.approved}</span>
                    <span>거절 {analytics.summary.rejected}</span>
                    <span>대기 {analytics.summary.pending}</span>
                  </div>
                </div>

                {/* Avg Processing Time */}
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <div className="text-xs text-slate-400 mb-1">평균 처리 시간</div>
                  <div className="text-3xl font-bold text-slate-800">
                    {analytics.avgProcessingTimeHours > 0
                      ? `${analytics.avgProcessingTimeHours}h`
                      : '-'}
                  </div>
                  <div className="text-xs text-slate-400 mt-2">승인/거절 결정까지 소요</div>
                </div>

                {/* Top Rejection Reasons */}
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <div className="text-xs text-slate-400 mb-2">반려 사유 TOP</div>
                  {analytics.topRejectionReasons.length > 0 ? (
                    <ul className="space-y-1">
                      {analytics.topRejectionReasons.map((r, i) => (
                        <li key={i} className="flex items-center justify-between text-sm">
                          <span className="text-slate-600 truncate mr-2">{r.reason}</span>
                          <span className="text-slate-400 text-xs shrink-0">{r.count}건</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-sm text-slate-400">반려 내역 없음</div>
                  )}
                </div>
              </div>

              {/* Supplier Approval Rates */}
              {analytics.supplierApprovalRates.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <div className="text-xs text-slate-400 mb-2">공급자별 승인율</div>
                  <div className="space-y-1.5">
                    {analytics.supplierApprovalRates.map((s) => (
                      <div key={s.supplierId} className="flex items-center justify-between text-sm">
                        <span className="text-slate-700 truncate mr-3">{s.supplierName}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`font-medium ${s.approvalRate >= 80 ? 'text-green-600' : s.approvalRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                            {s.approvalRate}%
                          </span>
                          <span className="text-slate-400 text-xs">({s.total}건)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Status tabs */}
        <div className="flex gap-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Service filter */}
        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
        >
          {SERVICE_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>{opt.label}</option>
          ))}
        </select>

        {/* Search */}
        <input
          type="text"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="상품명 / 바코드 / 공급사 검색"
          className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Date range */}
        <div className="flex items-center gap-1 text-sm">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm"
          />
          <span className="text-slate-400">~</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm"
          />
        </div>

        {/* WO-O4O-NETURE-APPROVAL-UI-INSIGHT-INTEGRATION-V1: Priority Filters */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPriorityFilter(priorityFilter === 'HIGH' ? '' : 'HIGH')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              priorityFilter === 'HIGH'
                ? 'bg-red-600 text-white'
                : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            긴급 처리
          </button>
          {(['', 'HIGH', 'MEDIUM', 'LOW'] as const).map((p) => {
            const labels: Record<string, string> = { '': '우선순위 전체', HIGH: 'HIGH', MEDIUM: 'MEDIUM', LOW: 'LOW' };
            return (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  priorityFilter === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {labels[p]}
              </button>
            );
          })}
        </div>

        {/* WO-O4O-NETURE-OPERATOR-APPROVAL-UX-ADVANCED-V1: Quality Filters */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterHasIssues((v) => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterHasIssues
                ? 'bg-red-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            문제 있음만
          </button>
          {(['', 'low', 'mid', 'high'] as const).map((range) => {
            const labels: Record<string, string> = { '': '점수 전체', low: '0-59', mid: '60-79', high: '80+' };
            return (
              <button
                key={range}
                onClick={() => setScoreRange(range)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  scoreRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {labels[range]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Batch Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm font-medium text-blue-700">{selectedIds.size}건 선택됨</span>
          {selectedPendingIds.length > 0 && (
            <>
              <button
                onClick={handleBatchApprove}
                disabled={!canManage || decisionBusy}
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                일괄 승인 ({selectedPendingIds.length})
              </button>
              <button
                onClick={handleBatchReject}
                disabled={!canManage || decisionBusy}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                일괄 거절 ({selectedPendingIds.length})
              </button>
            </>
          )}
          <button
            onClick={() => setSelectedIds(new Set())}
            className="px-3 py-1.5 bg-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-300"
          >
            선택 해제
          </button>
        </div>
      )}

      {/* Select All + Count */}
      <div className="flex items-center justify-between mb-3">
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={items.length > 0 && selectedIds.size === items.length}
            onChange={toggleSelectAll}
            className="rounded border-slate-300"
          />
          전체 선택
        </label>
        <span className="text-xs text-slate-400">
          총 {pagination.total}건
        </span>
      </div>

      {/* Card List */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-16 text-slate-400">로딩 중...</div>
        ) : permissionError ? (
          <div className="text-center py-16">
            <div className="text-red-500 font-medium text-lg mb-2">{permissionError}</div>
            <p className="text-slate-400 text-sm">이 페이지에 접근할 권한이 없습니다. 관리자에게 문의하세요.</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-slate-400">데이터가 없습니다</div>
        ) : (
          items.map((item) => {
            const badge = STATUS_BADGE[item.approvalStatus] || { label: item.approvalStatus, bg: 'bg-slate-50', text: 'text-slate-600' };
            const regBadge = getRegulatoryBadge(item);
            const compBadge = getCompletenessBadge(item);
            const qualityFlags = getQualityFlags(item);
            const recommendation = getRecommendation(item.completenessScore || 0);
            const score = item.completenessScore || 0;

            // WO-O4O-NETURE-APPROVAL-UI-INSIGHT-INTEGRATION-V1: priority border
            const borderClass = selectedIds.has(item.id)
              ? 'border-blue-400 bg-blue-50/30'
              : item.priority === 'HIGH'
                ? 'border-red-400 bg-red-50/20'
                : item.priority === 'MEDIUM'
                  ? 'border-amber-400 bg-amber-50/20'
                  : 'border-slate-200';

            return (
              <div
                key={item.id}
                className={`p-4 bg-white border rounded-lg hover:border-blue-300 transition-colors cursor-pointer ${borderClass}`}
              >
                <div className="flex flex-wrap items-start gap-3 xl:flex-nowrap">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 rounded border-slate-300 shrink-0"
                  />

                  {/* Image */}
                  <div
                    className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center"
                    onClick={() => setDrawerItem(item)}
                  >
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 basis-[calc(100%-6rem)] xl:basis-auto" onClick={() => setDrawerItem(item)}>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                      <span className="font-medium text-slate-900 truncate max-w-full">{item.productName || '(이름 없음)'}</span>
                      {item.brandName && (
                        <span className="text-xs text-slate-400 shrink-0">({item.brandName})</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span className="font-mono">{item.barcode || '-'}</span>
                      <span>·</span>
                      <span>{item.supplierName || '-'}</span>
                      <span>·</span>
                      <span>{formatPrice(item.priceGeneral)}</span>
                    </div>
                  </div>

                  {/* Badges + Recommendation */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 w-full xl:w-auto">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${recommendation.bg} ${recommendation.text}`}>
                      {recommendation.icon} {recommendation.label}
                    </span>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${regBadge.bg} ${regBadge.text}`}>
                      {regBadge.label}
                    </span>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${compBadge.bg} ${compBadge.text}`}>
                      {compBadge.label}
                    </span>
                    {/* WO-NETURE-OPERATOR-APPROVAL-LIST-STRUCTURE-ALIGN-V1: 유통 + 서비스 + 승인 */}
                    {getSupplyPolicyBadges(item).map((b) => (
                      <span key={b.label} className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${b.bg} ${b.text}`}>
                        {b.label}
                      </span>
                    ))}
                    {(() => {
                      const svcDisplay = getServiceDisplay(item.serviceKeys) || item.serviceKey;
                      return (
                        <span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium">
                          {svcDisplay}
                        </span>
                      );
                    })()}
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Date */}
                  <div className="text-xs text-slate-400 shrink-0 w-20 text-right">
                    {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                  </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {item.approvalStatus === 'pending' ? (
                    <>
                      {hasPermitRisk(item) && (
                        <span className="text-red-500 text-sm" title="규제 상품 — 허가번호 없음">⚠</span>
                      )}
                      <button
                        onClick={() => handleApprove(item.id)}
                        disabled={!canManage || decisionBusy}
                        title={!canManage ? '권한이 없습니다' : undefined}
                        className="px-2.5 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        승인
                      </button>
                      <button
                        onClick={() => openDecision('reject', item.id)}
                        disabled={!canManage || decisionBusy}
                        title={!canManage ? '권한이 없습니다' : undefined}
                        className="px-2.5 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        거절
                      </button>
                      <button
                        onClick={() => setDeleteTarget(item.offerId)}
                        disabled={!canManage || actionLoading === item.id}
                        title="이 상품을 완전히 삭제합니다"
                        className="px-2 py-1 bg-slate-200 text-slate-600 rounded text-xs font-medium hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        삭제
                      </button>
                    </>
                  ) : item.approvalStatus === 'approved' ? (
                    <button
                      onClick={async () => {
                        if (!confirm(`"${item.productName}"을 삭제(휴지통 이동)하시겠습니까?`)) return;
                        setActionLoading(item.id);
                        const res = await productCleanupApi.softDelete(item.offerId);
                        setActionLoading(null);
                        if (res.success) refreshData(1);
                      }}
                      disabled={!canManage || actionLoading === item.id}
                      className="p-1.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600 disabled:opacity-50"
                      title="삭제 (휴지통으로 이동)"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  ) : item.reason ? (
                    <span className="text-xs text-slate-500 max-w-[120px] truncate" title={item.reason}>
                      {item.approvalStatus === 'rejected' ? '사유' : '메모'}: {item.reason}
                    </span>
                  ) : null}
                </div>
                </div>

                {/* Priority badges + Quality flags + Progress bar */}
                {(item.isStale || item.isLowQualitySupplier || qualityFlags.length > 0 || score < 100) && (
                  <div className="mt-2 ml-[68px] flex items-center gap-3" onClick={() => setDrawerItem(item)}>
                    <div className="flex flex-wrap gap-1">
                      {item.isStale && (
                        <span className="text-[11px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded font-medium" title="48시간 이상 승인 대기">
                          48h+ 대기
                        </span>
                      )}
                      {item.isLowQualitySupplier && (
                        <span className="text-[11px] text-red-700 bg-red-100 px-1.5 py-0.5 rounded font-medium" title="이 공급자의 승인율이 낮습니다">
                          저품질 공급자
                        </span>
                      )}
                      {qualityFlags.map((flag) => (
                        <span key={flag} className="text-[11px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                          ⚠ {flag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 ml-auto shrink-0">
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-400' : 'bg-red-400'
                          }`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-slate-400">{score}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-slate-500">
            총 {pagination.total}건 (페이지 {pagination.page}/{pagination.totalPages})
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => fetchData(Math.max(1, pagination.page - 1))}
              disabled={pagination.page <= 1}
              className="px-3 py-1 rounded text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40"
            >
              이전
            </button>
            {(() => {
              const pages: number[] = [];
              const start = Math.max(1, pagination.page - 4);
              const end = Math.min(pagination.totalPages, start + 9);
              for (let i = start; i <= end; i++) pages.push(i);
              return pages.map((p) => (
                <button
                  key={p}
                  onClick={() => fetchData(p)}
                  className={`px-3 py-1 rounded text-sm ${
                    p === pagination.page ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p}
                </button>
              ));
            })()}
            <button
              onClick={() => fetchData(Math.min(pagination.totalPages, pagination.page + 1))}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1 rounded text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40"
            >
              다음
            </button>
          </div>
        </div>
      )}

      {rejectTarget && (
        <ProductServiceApprovalDecisionModal decision="reject" batch={rejectTarget === 'batch'} count={selectedPendingIds.length}
          value={rejectReason} error={decisionError} busy={decisionBusy} canManage={canManage}
          onChange={setRejectReason} onCancel={() => { if (!decisionWriting.current) setRejectTarget(null); }}
          onConfirm={() => void handleDecisionConfirm('reject')} />
      )}
      {approveTarget && (
        <ProductServiceApprovalDecisionModal decision="approve" batch={approveTarget === 'batch'} count={selectedPendingIds.length}
          value={approveMemo} error={decisionError} busy={decisionBusy} canManage={canManage}
          onChange={setApproveMemo} onCancel={() => { if (!decisionWriting.current) setApproveTarget(null); }}
          onConfirm={() => void handleDecisionConfirm('approve')} />
      )}

      {/* Delete Confirm Modal (WO-NETURE-OPERATOR-PENDING-PRODUCT-HARD-DELETE-V1) */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-slate-900 mb-2">상품 삭제</h3>
            <p className="text-sm text-slate-500 mb-4">
              이 상품을 완전히 삭제합니다. 삭제된 데이터는 복구할 수 없습니다.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200"
              >
                취소
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {deleteLoading ? '삭제 중...' : '삭제 확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      {drawerItem && (
        <ProductServiceApprovalDrawer item={drawerItem} canManage={canManage} decisionBusy={decisionBusy}
          onClose={() => setDrawerItem(null)} onApprove={handleApprove}
          onReject={(id) => openDecision('reject', id)} />
      )}
    </div>
  );
}

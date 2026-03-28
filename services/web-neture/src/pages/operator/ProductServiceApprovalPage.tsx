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

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  operatorServiceApprovalApi,
  type ServiceApprovalItem,
  type ServiceApprovalStats,
  type ApprovalAnalytics,
} from '../../lib/api/serviceApproval';
import { useAuth } from '../../contexts/AuthContext';

// ==================== Constants ====================

const STATUS_TABS = [
  { key: 'all', label: '전체' },
  { key: 'pending', label: '승인대기' },
  { key: 'approved', label: '승인됨' },
  { key: 'rejected', label: '거절됨' },
] as const;

const SERVICE_OPTIONS = [
  { key: '', label: '전체 서비스' },
  { key: 'neture', label: 'Neture' },
  { key: 'glycopharm', label: 'GlycoPharm' },
  { key: 'glucoseview', label: 'GlucoseView' },
  { key: 'k-cosmetics', label: 'K-Cosmetics' },
  { key: 'kpa-society', label: 'KPA Society' },
];

const STATUS_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: '승인대기', bg: 'bg-amber-50', text: 'text-amber-700' },
  approved: { label: '승인됨', bg: 'bg-green-50', text: 'text-green-700' },
  rejected: { label: '거절됨', bg: 'bg-red-50', text: 'text-red-700' },
};

// ==================== Helpers ====================

function getRegulatoryBadge(item: ServiceApprovalItem): { label: string; bg: string; text: string } {
  const rt = item.regulatoryType;
  if (!rt || rt === 'GENERAL') return { label: '일반', bg: 'bg-slate-50', text: 'text-slate-500' };
  if (!item.mfdsPermitNumber) return { label: '⚠ 허가없음', bg: 'bg-red-50', text: 'text-red-700' };
  if (item.isMfdsVerified) return { label: '검증됨', bg: 'bg-green-50', text: 'text-green-700' };
  return { label: '미검증', bg: 'bg-amber-50', text: 'text-amber-700' };
}

function getCompletenessBadge(item: ServiceApprovalItem): { label: string; bg: string; text: string } {
  if (item.offerApprovalStatus === 'approved') return { label: 'APPROVED', bg: 'bg-green-50', text: 'text-green-700' };
  const score = item.completenessScore || 0;
  if (score >= 60) return { label: 'READY', bg: 'bg-blue-50', text: 'text-blue-700' };
  if (score > 0) return { label: 'INCOMPLETE', bg: 'bg-amber-50', text: 'text-amber-700' };
  return { label: 'DRAFT', bg: 'bg-slate-50', text: 'text-slate-500' };
}

function hasPermitRisk(item: ServiceApprovalItem): boolean {
  const rt = item.regulatoryType;
  return !!rt && rt !== 'GENERAL' && !item.mfdsPermitNumber;
}

function formatPrice(price: number | null): string {
  if (price == null) return '-';
  return `₩${price.toLocaleString('ko-KR')}`;
}

// WO-O4O-NETURE-OPERATOR-APPROVAL-UX-ADVANCED-V1: 품질 판단 헬퍼

function getQualityFlags(item: ServiceApprovalItem): string[] {
  const flags: string[] = [];
  if (!item.imageUrl) flags.push('이미지 없음');
  if (!item.priceGeneral || item.priceGeneral <= 0) flags.push('가격 미설정');
  if (!item.hasShortDescription) flags.push('간단 설명 없음');
  if (!item.hasDetailDescription) flags.push('상세 설명 없음');
  if (!item.distributionType) flags.push('유통 타입 미설정');
  return flags;
}

function getRecommendation(score: number): { label: string; bg: string; text: string; icon: string } {
  if (score >= 80) return { label: '승인 추천', bg: 'bg-green-50', text: 'text-green-700', icon: '✓' };
  if (score >= 60) return { label: '검토 필요', bg: 'bg-amber-50', text: 'text-amber-700', icon: '!' };
  return { label: '보완 필요', bg: 'bg-red-50', text: 'text-red-700', icon: '✕' };
}

const REJECT_TEMPLATES = [
  '상품 이미지가 없습니다. 이미지를 추가한 후 다시 요청해 주세요.',
  '상품 설명이 부족합니다. 간단 소개와 상세 설명을 작성해 주세요.',
  '가격 정보가 누락되었습니다. 공급가를 설정해 주세요.',
  '상품 정보가 불완전합니다. 완성도를 높인 후 재요청 바랍니다.',
  '규제 정보 확인이 필요합니다. MFDS 허가번호를 입력해 주세요.',
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
  const [analytics, setAnalytics] = useState<ApprovalAnalytics | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'all' | '7d' | '30d'>('all');

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  // WO-O4O-NETURE-OPERATOR-APPROVAL-UX-ADVANCED-V1: quality filters
  const [scoreRange, setScoreRange] = useState<'' | 'low' | 'mid' | 'high'>('');
  const [filterHasIssues, setFilterHasIssues] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Actions
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);

  // Reject modal
  const [rejectTarget, setRejectTarget] = useState<string | null>(null); // single ID or 'batch'
  const [rejectReason, setRejectReason] = useState('');

  // Approve modal (WO-NETURE-APPROVAL-ACTION-UX-V1)
  const [approveTarget, setApproveTarget] = useState<string | null>(null); // single ID or 'batch'
  const [approveMemo, setApproveMemo] = useState('');

  // Detail drawer
  const [drawerItem, setDrawerItem] = useState<ServiceApprovalItem | null>(null);

  // ==================== Data Fetching ====================

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    setPermissionError(null);
    try {
      const scoreParams: { minScore?: number; maxScore?: number } =
        scoreRange === 'low' ? { minScore: 0, maxScore: 59 }
        : scoreRange === 'mid' ? { minScore: 60, maxScore: 79 }
        : scoreRange === 'high' ? { minScore: 80 }
        : {};
      const [listResult, statsResult] = await Promise.all([
        operatorServiceApprovalApi.list({
          status: statusFilter !== 'all' ? statusFilter : undefined,
          serviceKey: serviceFilter || undefined,
          search: searchQuery || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          page,
          limit: 30,
          ...scoreParams,
          hasIssues: filterHasIssues ? 'true' : undefined,
        }),
        operatorServiceApprovalApi.stats(),
      ]);
      setItems(listResult.data);
      setPagination(listResult.pagination);
      setStats(statsResult);
      setSelectedIds(new Set());
    } catch (err: any) {
      setPermissionError(err?.message || '데이터를 불러올 수 없습니다');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, serviceFilter, searchQuery, dateFrom, dateTo, scoreRange, filterHasIssues]);

  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  // Fetch analytics (re-fetch on period change)
  useEffect(() => {
    operatorServiceApprovalApi.analytics(analyticsPeriod).then((data) => {
      if (data) {
        setAnalytics(data);
        setShowAnalytics(true);
      }
    });
  }, [analyticsPeriod]);

  // Search debounce
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearchQuery(value), 300);
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
  const selectedPendingIds = [...selectedIds].filter(
    (id) => items.find((i) => i.id === id)?.approvalStatus === 'pending',
  );

  // ==================== Actions ====================

  const handleApprove = (id: string) => {
    setApproveTarget(id);
    setApproveMemo('');
  };

  const handleApproveConfirm = async () => {
    if (!approveTarget) return;

    if (approveTarget === 'batch') {
      setBatchLoading(true);
      await operatorServiceApprovalApi.batchApprove(selectedPendingIds, approveMemo || undefined);
      setBatchLoading(false);
    } else {
      setActionLoading(approveTarget);
      await operatorServiceApprovalApi.approve(approveTarget, approveMemo || undefined);
      setActionLoading(null);
      if (drawerItem?.id === approveTarget) setDrawerItem(null);
    }

    setApproveTarget(null);
    setApproveMemo('');
    await fetchData(pagination.page);
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;

    if (rejectTarget === 'batch') {
      setBatchLoading(true);
      await operatorServiceApprovalApi.batchReject(selectedPendingIds, rejectReason || undefined);
      setBatchLoading(false);
    } else {
      setActionLoading(rejectTarget);
      await operatorServiceApprovalApi.reject(rejectTarget, rejectReason || undefined);
      setActionLoading(null);
      if (drawerItem?.id === rejectTarget) setDrawerItem(null);
    }

    setRejectTarget(null);
    setRejectReason('');
    await fetchData(pagination.page);
  };

  const handleBatchApprove = () => {
    if (selectedPendingIds.length === 0) return;
    setApproveTarget('batch');
    setApproveMemo('');
  };

  const handleBatchReject = () => {
    if (selectedPendingIds.length === 0) return;
    setRejectTarget('batch');
    setRejectReason('');
  };

  // ==================== Render ====================

  return (
    <div className="relative">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">서비스별 상품 승인</h1>
        <p className="text-sm text-slate-500 mt-1">
          공급자가 선���한 서비스별 상품 승인을 관리합니다.
        </p>
      </div>

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
                        <span key={lq.supplierId} className="text-red-700">
                          {i > 0 && ', '}{lq.supplierName} ({lq.approvalRate}%)
                        </span>
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
                disabled={!canManage || batchLoading}
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                일괄 승인 ({selectedPendingIds.length})
              </button>
              <button
                onClick={handleBatchReject}
                disabled={!canManage || batchLoading}
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

            return (
              <div
                key={item.id}
                className={`flex items-start gap-3 p-4 bg-white border rounded-lg hover:border-blue-300 transition-colors cursor-pointer ${
                  selectedIds.has(item.id) ? 'border-blue-400 bg-blue-50/30' : 'border-slate-200'
                }`}
              >
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
                <div className="flex-1 min-w-0" onClick={() => setDrawerItem(item)}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-slate-900 truncate">{item.productName || '(이름 없음)'}</span>
                    {item.brandName && (
                      <span className="text-xs text-slate-400 shrink-0">({item.brandName})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="font-mono">{item.barcode || '-'}</span>
                    <span>·</span>
                    <span>{item.supplierName || '-'}</span>
                    <span>·</span>
                    <span>{formatPrice(item.priceGeneral)}</span>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${regBadge.bg} ${regBadge.text}`}>
                    {regBadge.label}
                  </span>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${compBadge.bg} ${compBadge.text}`}>
                    {compBadge.label}
                  </span>
                  <span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium">
                    {item.serviceKey}
                  </span>
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
                        disabled={!canManage || actionLoading === item.id}
                        title={!canManage ? '권한이 없습니다' : undefined}
                        className="px-2.5 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        승인
                      </button>
                      <button
                        onClick={() => { setRejectTarget(item.id); setRejectReason(''); }}
                        disabled={!canManage || actionLoading === item.id}
                        title={!canManage ? '권한이 없습니다' : undefined}
                        className="px-2.5 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        거절
                      </button>
                    </>
                  ) : item.reason ? (
                    <span className="text-xs text-slate-500 max-w-[120px] truncate" title={item.reason}>
                      {item.approvalStatus === 'rejected' ? '사유' : '메모'}: {item.reason}
                    </span>
                  ) : null}
                </div>
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

      {/* Reject Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {rejectTarget === 'batch' ? `일괄 거절 (${selectedPendingIds.length}건)` : '승인 거절'}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              {rejectTarget === 'batch'
                ? '선택한 승인대기 상품을 일괄 거절합니다.'
                : '이 상품의 서비스 승인을 거절합니다.'}
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="거절 사유를 입력하세요 (선택)"
              className="w-full border border-slate-300 rounded-lg p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setRejectTarget(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200"
              >
                취소
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={batchLoading || (rejectTarget !== 'batch' && actionLoading === rejectTarget)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                거절 확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal (WO-NETURE-APPROVAL-ACTION-UX-V1) */}
      {approveTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {approveTarget === 'batch' ? `일괄 승인 (${selectedPendingIds.length}건)` : '상품 승인'}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              {approveTarget === 'batch'
                ? '선택한 승인대기 상품을 일괄 승인합니다.'
                : '이 상품의 서비스 승인을 처리합니다.'}
            </p>
            <textarea
              value={approveMemo}
              onChange={(e) => setApproveMemo(e.target.value)}
              placeholder="승인 메모를 입력하세요 (선택)"
              className="w-full border border-slate-300 rounded-lg p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setApproveTarget(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200"
              >
                취소
              </button>
              <button
                onClick={handleApproveConfirm}
                disabled={batchLoading || (approveTarget !== 'batch' && actionLoading === approveTarget)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                승인 확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {drawerItem && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setDrawerItem(null)} />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-xl z-50 overflow-y-auto">
            <div className="p-6">
              {/* Drawer header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-900">상품 상세</h2>
                <button
                  onClick={() => setDrawerItem(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Image */}
              <div className="w-full h-48 rounded-lg overflow-hidden bg-slate-100 mb-6 flex items-center justify-center">
                {drawerItem.imageUrl ? (
                  <img src={drawerItem.imageUrl} alt="" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-slate-300 text-sm">이미지 없음</div>
                )}
              </div>

              {/* Info grid */}
              <div className="space-y-4 mb-6">
                <div>
                  <div className="text-xs text-slate-400 mb-1">상품명</div>
                  <div className="font-medium text-slate-900">{drawerItem.productName || '-'}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-slate-400 mb-1">바코드</div>
                    <div className="font-mono text-sm text-slate-700">{drawerItem.barcode || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-1">브랜드</div>
                    <div className="text-sm text-slate-700">{drawerItem.brandName || '-'}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-slate-400 mb-1">공급사</div>
                    <div className="text-sm text-slate-700">{drawerItem.supplierName || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-1">공급가</div>
                    <div className="text-sm font-medium text-slate-700">{formatPrice(drawerItem.priceGeneral)}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-slate-400 mb-1">서비스</div>
                    <span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium">
                      {drawerItem.serviceKey}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-1">유통 타입</div>
                    <div className="text-sm text-slate-700">{drawerItem.distributionType || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Status badges */}
              <div className="flex flex-wrap gap-2 mb-6">
                {(() => {
                  const badge = STATUS_BADGE[drawerItem.approvalStatus] || { label: drawerItem.approvalStatus, bg: 'bg-slate-50', text: 'text-slate-600' };
                  return (
                    <span className={`px-3 py-1 rounded-lg text-sm font-medium ${badge.bg} ${badge.text}`}>
                      상태: {badge.label}
                    </span>
                  );
                })()}
                {(() => {
                  const rb = getRegulatoryBadge(drawerItem);
                  return (
                    <span className={`px-3 py-1 rounded-lg text-sm font-medium ${rb.bg} ${rb.text}`}>
                      규제: {rb.label}
                    </span>
                  );
                })()}
                {(() => {
                  const cb = getCompletenessBadge(drawerItem);
                  return (
                    <span className={`px-3 py-1 rounded-lg text-sm font-medium ${cb.bg} ${cb.text}`}>
                      완성도: {cb.label} ({drawerItem.completenessScore}/100)
                    </span>
                  );
                })()}
              </div>

              {/* Completeness detail */}
              <div className="bg-slate-50 rounded-lg p-4 mb-6">
                <div className="text-xs font-medium text-slate-500 mb-3">완성도 상세 (각 20점)</div>
                <div className="space-y-2">
                  {[
                    { label: '공급가 설정', ok: drawerItem.priceGeneral != null && drawerItem.priceGeneral > 0 },
                    { label: '상품 이미지', ok: !!drawerItem.imageUrl },
                    { label: '유통 타입', ok: !!drawerItem.distributionType },
                  ].map((c) => (
                    <div key={c.label} className="flex items-center gap-2 text-sm">
                      <span className={c.ok ? 'text-green-600' : 'text-slate-300'}>{c.ok ? '✓' : '✗'}</span>
                      <span className={c.ok ? 'text-slate-700' : 'text-slate-400'}>{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Decision reason */}
              {drawerItem.reason && (
                <div className={`border rounded-lg p-4 mb-6 ${
                  drawerItem.approvalStatus === 'rejected'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-green-50 border-green-200'
                }`}>
                  <div className={`text-xs font-medium mb-1 ${
                    drawerItem.approvalStatus === 'rejected' ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {drawerItem.approvalStatus === 'rejected' ? '거절 사유' : '승인 메모'}
                  </div>
                  <div className={`text-sm ${
                    drawerItem.approvalStatus === 'rejected' ? 'text-red-800' : 'text-green-800'
                  }`}>{drawerItem.reason}</div>
                </div>
              )}

              {/* Date info */}
              <div className="text-xs text-slate-400 mb-6">
                등록일: {new Date(drawerItem.createdAt).toLocaleString('ko-KR')}
                {drawerItem.decidedAt && (
                  <span className="ml-3">처리일: {new Date(drawerItem.decidedAt).toLocaleString('ko-KR')}</span>
                )}
              </div>

              {/* Drawer actions */}
              {drawerItem.approvalStatus === 'pending' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(drawerItem.id)}
                    disabled={!canManage || actionLoading === drawerItem.id}
                    className="flex-1 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    승인
                  </button>
                  <button
                    onClick={() => { setRejectTarget(drawerItem.id); setRejectReason(''); }}
                    disabled={!canManage || actionLoading === drawerItem.id}
                    className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    거절
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

import { useNetureProductOperations } from './runtime';
import { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { ServiceApprovalItem, ServiceApprovalStats, ApprovalAnalytics } from './serviceApproval';
import { buildServiceApprovalListParams, getSelectedPendingServiceApprovalIds } from './productServiceApprovalModel';
import { useLatestRequest } from '../../common/operation-support';

// 목록/분석의 독립된 요청 수명과 필터·선택을 소유한다. 심사/삭제 mutation은 Page가 소유한다.
export function useProductServiceApprovalQuery(userId?: string, bindings?: ReturnType<typeof useNetureProductOperations>) {
  const context = bindings ?? useNetureProductOperations();
  const { operatorServiceApprovalApi } = context.api;
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

  // 목록과 분석의 요청 채널을 분리해 각 응답 순서를 관리한다.
  const listScope = JSON.stringify([userId ?? null, statusFilter, serviceFilter, searchQuery, dateFrom, dateTo, scoreRange, filterHasIssues, priorityFilter]);
  const analyticsScope = JSON.stringify([userId ?? null, analyticsPeriod]);
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

  return {
    items, stats, pagination, loading, permissionError,
    analyticsResult, analytics, showAnalytics, setShowAnalytics, analyticsPeriod,
    setAnalyticsPeriod, analyticsScope, statusFilter, setStatusFilter, serviceFilter,
    setServiceFilter, searchInput, dateFrom, setDateFrom, dateTo,
    setDateTo, scoreRange, setScoreRange, filterHasIssues, setFilterHasIssues,
    priorityFilter, setPriorityFilter, selectedIds, setSelectedIds, selectedPendingIds,
    fetchData, refreshData, applySearch, handleSearchChange, toggleSelect,
    toggleSelectAll,
  };
}

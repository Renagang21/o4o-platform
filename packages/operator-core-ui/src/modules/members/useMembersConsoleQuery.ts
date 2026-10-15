import { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react';
import type {
  MembersConsoleListParams,
  OperatorMembersConsolePageProps,
  PaginationData,
  UserData,
} from './types';

type MembersQueryOptions = Pick<OperatorMembersConsolePageProps,
  'client' | 'roleTabs' | 'statusTabs'> & {
  scopeKey?: string;
  onPageChange?: (page: number) => void;
  activeTab: string;
  page: number;
  searchQuery: string;
  serverSort: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  getPrimaryRole: (user: UserData) => string;
};

/** 목록·통계의 읽기 상태만 담당한다. 권한과 회원 변경 업무는 화면에 남긴다. */
export function useMembersConsoleQuery({
  client, roleTabs, statusTabs, activeTab, page, searchQuery,
  serverSort, sortBy, sortOrder, getPrimaryRole, scopeKey, onPageChange,
}: MembersQueryOptions) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    rejected: 0,
    roleCounts: {} as Record<string, number>,
    statusCounts: {} as Record<string, number>,
  });

  const [statsError, setStatsError] = useState('');
  const state = useRef({ mounted: false, list: 0, stats: 0 });
  useLayoutEffect(() => {
    const scope = { mounted: true, list: 0, stats: 0 }; state.current = scope;
    setUsers([]); setError(''); setStatsError('');
    setStats({ total: 0, active: 0, pending: 0, rejected: 0, roleCounts: {}, statusCounts: {} });
    return () => { scope.mounted = false; scope.list++; scope.stats++; };
  }, [client, scopeKey]);
  useLayoutEffect(() => { state.current.list++; }, [page, activeTab, searchQuery, serverSort, sortBy, sortOrder]);

  // ─── Fetch ──────────────────────────────────────────────────

  // page 는 state 기반(URL sync/복원 대응). 별도 인자 없이 현재 page 를 조회.
  const fetchUsers = useCallback(
    async () => {
      const scope = state.current;
      if (!scope.mounted) return false;
      const sequence = ++scope.list;
      const current = () => scope.mounted && sequence === scope.list;
      setLoading(true);
      setError('');
      try {
        const activeStatusTab = (statusTabs ?? []).find((t) => t.key === activeTab);
        const params: MembersConsoleListParams = {
          page,
          limit: 20,
          ...(activeTab === 'pending' ? { status: 'pending' } : {}),
          ...(activeStatusTab ? { status: activeStatusTab.status } : {}),
          ...(searchQuery ? { search: searchQuery } : {}),
          ...(serverSort ? { sortBy, sortOrder: sortOrder.toUpperCase() as 'ASC' | 'DESC' } : {}),
        };
        const data = await client.list(params);
        if (!current()) return false;
        if (data.pagination && page > Math.max(1, data.pagination.totalPages) && onPageChange) {
          onPageChange(Math.max(1, data.pagination.totalPages)); return true;
        }
        setUsers(data.users || []);
        setPagination(data.pagination || { page, limit: 20, total: 0, totalPages: 0 });
        return true;
      } catch (err: any) {
        if (current()) setError(err?.response?.data?.error || err?.message || '회원 목록을 불러오지 못했습니다.');
        return false;
      } finally {
        if (current()) setLoading(false);
      }
    },
    [client, page, activeTab, searchQuery, statusTabs, serverSort, sortBy, sortOrder, onPageChange],
  );

  const fetchStats = useCallback(async () => {
    // client.stats / listAll 은 선택 계약이다. 미제공 서비스(가입 승인 전용 콘솔)는
    // 통계·탭 count 없이 동작한다 — 없는 endpoint 를 호출하지 않는다.
    if (!client.stats) return true;
    const scope = state.current;
    if (!scope.mounted) return false;
    const sequence = ++scope.stats;
    const current = () => scope.mounted && sequence === scope.stats;
    try {
      const statsRes = await client.stats();
      if (!current()) return false;
      const byStatus = statsRes.statistics?.byStatus || [];
      const getCount = (s: string) => byStatus.find((b) => b.status === s)?.count || 0;

      const allData = client.listAll ? await client.listAll() : { users: [] as UserData[] };
      if (!current()) return false;
      const allUsers: UserData[] = allData.users || [];
      const roleCounts: Record<string, number> = {};
      roleTabs.forEach((tab) => {
        roleCounts[tab.key] = allUsers.filter((u) => tab.roleFilter.includes(getPrimaryRole(u))).length;
      });

      const statusCounts: Record<string, number> = {};
      (statusTabs ?? []).forEach((st) => {
        statusCounts[st.key] = getCount(st.status);
      });

      setStatsError('');
      setStats({
        total: statsRes.statistics?.total || 0,
        active: getCount('active') + getCount('approved'),
        pending: getCount('pending'),
        rejected: getCount('rejected'),
        roleCounts,
        statusCounts,
      });
      return true;
    } catch {
      if (current()) setStatsError('통계를 불러오지 못했습니다. 마지막 조회 값일 수 있습니다.');
      return false;
    }
  }, [client, roleTabs, statusTabs, getPrimaryRole]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { users, pagination, loading, error, stats, statsError, fetchUsers, fetchStats };
}

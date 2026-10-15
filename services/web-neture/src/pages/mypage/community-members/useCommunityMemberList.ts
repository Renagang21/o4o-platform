import { useCallback, useEffect, useState } from 'react';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import {
  communityOperatorErrorMessage,
  listJoinRequests,
  type JoinRequestRow,
  type JoinRequestStatus,
} from '../../../lib/api/communityOperator';
import type { CommunityMemberPagination } from '../../../lib/api/communityMemberList';

export function useCommunityMemberList(slug: string) {
  const [filter, setFilter] = useState({
    q: '',
    status: 'pending' as JoinRequestStatus,
    pageSize: 20,
  });
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<JoinRequestRow[] | null>(null);
  const [pagination, setPagination] =
    useState<CommunityMemberPagination | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scope = JSON.stringify([
    slug,
    filter.status,
    filter.q,
    page,
    filter.pageSize,
  ]);
  const begin = useLatestRequest(scope);
  const reload = useCallback(async () => {
    const current = begin();
    setRows(null);
    setPagination(null);
    setError(null);
    try {
      const result = await listJoinRequests(slug, filter.status, {
        q: filter.q,
        page,
        pageSize: filter.pageSize,
      });
      if (!current()) return false;
      setRows(result.rows);
      setPagination(result.pagination);
      setPage(result.pagination.page);
      return true;
    } catch (e) {
      if (current())
        setError(
          communityOperatorErrorMessage(e, '회원 목록을 불러오지 못했습니다.'),
        );
      return false;
    }
  }, [slug, filter, page, begin]);
  useEffect(() => {
    void reload();
  }, [reload]);

  const changeFilter = (next: {
    q: string;
    status: string;
    pageSize: number;
  }) => {
    if (
      next.q === filter.q &&
      next.status === filter.status &&
      next.pageSize === filter.pageSize &&
      page === 1
    ) {
      void reload();
    } else {
      setRows(null);
      setPagination(null);
      setFilter({ ...next, status: next.status as JoinRequestStatus });
      setPage(1);
    }
  };
  const changePage = (next: number) => {
    setRows(null);
    setPagination(null);
    setPage(next);
  };
  return {
    ...filter,
    scope,
    rows,
    pagination,
    error,
    reload,
    changeFilter,
    changePage,
  };
}

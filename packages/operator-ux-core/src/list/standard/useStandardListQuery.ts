/**
 * useStandardListQuery — 표준 리스트 상태 훅
 *
 * WO-O4O-STANDARD-LIST-CORE-V1
 *
 * page/limit/search/sortBy/sortOrder/filters 상태 + URL query 동기화 +
 * page=1 reset(검색/필터/정렬/limit 변경) + fetcher 호출 + 응답 정규화.
 * 기존 DataTable/Pagination/SearchBar 와 결합해서 사용한다.
 *
 * URL sync 는 react-router-dom 의 useSearchParams 사용(이미 peerDependency).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { normalizePaginatedResponse } from './normalizePaginatedResponse';
import type {
  StandardFilterValue,
  StandardListQueryState,
  StandardPaginationState,
  StandardSortOrder,
  UseStandardListQueryOptions,
  UseStandardListQueryResult,
} from './standard-types';

const FILTER_PREFIX = 'f_';

function emptyPagination(page: number, limit: number): StandardPaginationState {
  return { page, limit, total: 0, totalPages: 1, hasNextPage: false, hasPreviousPage: false };
}

export function useStandardListQuery<TItem, TRawResponse = unknown>(
  options: UseStandardListQueryOptions<TItem, TRawResponse>,
): UseStandardListQueryResult<TItem> {
  const {
    defaultPage = 1,
    defaultLimit = 20,
    defaultSearch = '',
    defaultSortBy,
    defaultSortOrder,
    defaultFilters = {},
    fetcher,
    normalize,
    syncUrl = true,
    urlKeyPrefix = '',
  } = options;

  const [searchParams, setSearchParams] = useSearchParams();
  const k = useCallback((key: string) => `${urlKeyPrefix}${key}`, [urlKeyPrefix]);

  // fetcher/normalize 는 ref 로 보관(렌더마다 새 함수여도 effect 재실행 방지)
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const normalizeRef = useRef(normalize);
  normalizeRef.current = normalize;

  // 초기 상태: syncUrl 이면 URL 에서, 아니면 default 에서 (최초 1회)
  const [query, setQuery] = useState<StandardListQueryState>(() => {
    if (!syncUrl) {
      return {
        page: defaultPage,
        limit: defaultLimit,
        search: defaultSearch || undefined,
        sortBy: defaultSortBy,
        sortOrder: defaultSortOrder,
        filters: { ...defaultFilters },
      };
    }
    const num = (key: string, d: number) => {
      const v = searchParams.get(k(key));
      const n = v ? parseInt(v, 10) : NaN;
      return Number.isFinite(n) && n > 0 ? n : d;
    };
    const order = searchParams.get(k('sortOrder'));
    const filters: Record<string, StandardFilterValue> = { ...defaultFilters };
    searchParams.forEach((value, key) => {
      if (key.startsWith(k(FILTER_PREFIX))) {
        filters[key.slice(k(FILTER_PREFIX).length)] = value;
      }
    });
    return {
      page: num('page', defaultPage),
      limit: num('limit', defaultLimit),
      search: searchParams.get(k('search')) ?? (defaultSearch || undefined),
      sortBy: searchParams.get(k('sortBy')) ?? defaultSortBy,
      sortOrder: order === 'asc' || order === 'desc' ? order : defaultSortOrder,
      filters,
    };
    // 최초 1회만 — searchParams 변동은 setter 가 주도
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  const writeUrl = useCallback(
    (next: StandardListQueryState) => {
      if (!syncUrl) return;
      setSearchParams(
        (prev) => {
          const sp = new URLSearchParams(prev);
          const put = (key: string, v: string | undefined) => {
            if (v === undefined || v === '') sp.delete(k(key));
            else sp.set(k(key), v);
          };
          put('page', String(next.page));
          put('limit', String(next.limit));
          put('search', next.search || undefined);
          put('sortBy', next.sortBy);
          put('sortOrder', next.sortOrder);
          // 기존 필터 param 제거 후 재설정
          Array.from(sp.keys())
            .filter((key) => key.startsWith(k(FILTER_PREFIX)))
            .forEach((key) => sp.delete(key));
          Object.entries(next.filters).forEach(([fk, fv]) => {
            if (fv !== undefined && fv !== '') sp.set(k(FILTER_PREFIX + fk), String(fv));
          });
          return sp;
        },
        { replace: true },
      );
    },
    [syncUrl, setSearchParams, k],
  );

  const update = useCallback(
    (next: StandardListQueryState) => {
      setQuery(next);
      writeUrl(next);
    },
    [writeUrl],
  );

  const setPage = useCallback((page: number) => update({ ...query, page }), [query, update]);
  const setLimit = useCallback((limit: number) => update({ ...query, limit, page: 1 }), [query, update]);
  const setSearch = useCallback(
    (search: string) => update({ ...query, search: search || undefined, page: 1 }),
    [query, update],
  );
  const setSort = useCallback(
    (sortBy: string, sortOrder: StandardSortOrder) => update({ ...query, sortBy, sortOrder, page: 1 }),
    [query, update],
  );
  const setFilter = useCallback(
    (key: string, value: StandardFilterValue) =>
      update({ ...query, filters: { ...query.filters, [key]: value }, page: 1 }),
    [query, update],
  );
  const setFilters = useCallback(
    (filters: Record<string, StandardFilterValue>) => update({ ...query, filters: { ...filters }, page: 1 }),
    [query, update],
  );
  const resetFilters = useCallback(
    () => update({ ...query, filters: { ...defaultFilters }, page: 1 }),
    [query, update, defaultFilters],
  );

  // ─── fetch ───
  const [items, setItems] = useState<TItem[]>([]);
  const [pagination, setPagination] = useState<StandardPaginationState>(() =>
    emptyPagination(query.page, query.limit),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [refetchTick, setRefetchTick] = useState(0);
  const reqId = useRef(0);

  useEffect(() => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    Promise.resolve(fetcherRef.current(query))
      .then((raw) => {
        if (id !== reqId.current) return;
        const norm = normalizeRef.current
          ? normalizeRef.current(raw)
          : normalizePaginatedResponse<TItem>(raw, { page: query.page, limit: query.limit });
        setItems(norm.data);
        setPagination(norm.pagination);
      })
      .catch((e) => {
        if (id !== reqId.current) return;
        setError(e);
        setItems([]);
        setPagination(emptyPagination(query.page, query.limit));
      })
      .finally(() => {
        if (id === reqId.current) setLoading(false);
      });
  }, [query, refetchTick]);

  const refetch = useCallback(() => setRefetchTick((t) => t + 1), []);

  return {
    items,
    pagination,
    query,
    loading,
    error,
    setPage,
    setLimit,
    setSearch,
    setSort,
    setFilter,
    setFilters,
    resetFilters,
    refetch,
  };
}

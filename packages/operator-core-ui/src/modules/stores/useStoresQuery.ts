/**
 * useStoresQuery — Stores 데이터 페칭 hook
 *
 * WO-O4O-OPERATOR-STORES-CORE-EXTRACTION-V1
 *
 * StoresApi 어댑터를 받아 page/search/sort 변경 시 자동 refetch.
 * 서비스에 데이터 페칭 로직이 흩어지지 않도록 Core 모듈이 캡슐화한다.
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  OperatorStoreBase,
  StoresApi,
  StoresListPagination,
  StoresListStats,
} from './types';

const DEFAULT_STATS: StoresListStats = {
  totalStores: 0,
  activeStores: 0,
  withChannel: 0,
  withProducts: 0,
};

const DEFAULT_PAGINATION: StoresListPagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
};

export interface UseStoresQueryArgs<T extends OperatorStoreBase> {
  api: StoresApi<T>;
  page: number;
  search: string;
  pageSize: number;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
}

export interface UseStoresQueryResult<T extends OperatorStoreBase> {
  stores: T[];
  stats: StoresListStats;
  pagination: StoresListPagination;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useStoresQuery<T extends OperatorStoreBase>({
  api,
  page,
  search,
  pageSize,
  sortBy,
  sortOrder,
}: UseStoresQueryArgs<T>): UseStoresQueryResult<T> {
  const [stores, setStores] = useState<T[]>([]);
  const [stats, setStats] = useState<StoresListStats>(DEFAULT_STATS);
  const [pagination, setPagination] = useState<StoresListPagination>(DEFAULT_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listStores({
        page,
        limit: pageSize,
        sortBy,
        sortOrder,
        ...(search ? { search } : {}),
      });
      if (res.success) {
        setStores(res.stores);
        setStats(res.stats);
        setPagination(res.pagination);
      }
    } catch (err: any) {
      const msg = err?.message || '매장 데이터를 불러올 수 없습니다';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [api, page, search, pageSize, sortBy, sortOrder]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  return { stores, stats, pagination, loading, error, refetch: fetchStores };
}

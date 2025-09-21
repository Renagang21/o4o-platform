import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listCpt, deleteCpt } from '../services/cpt.api';
import * as KEYS from './keys.cpt';

export type CptSort = 'createdAt' | 'name';
export type CptOrder = 'ASC' | 'DESC';

export interface CptListFilters {
  q?: string;
  limit?: number;
  offset?: number;
  sort?: CptSort;
  order?: CptOrder;
  activeOnly?: boolean;
}

export function useCptList(initial: CptListFilters = {}) {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<CptListFilters>({
    q: initial.q ?? '',
    limit: initial.limit,
    offset: initial.offset,
    sort: initial.sort ?? 'createdAt',
    order: initial.order ?? 'DESC',
    activeOnly: initial.activeOnly ?? true,
  });

  const queryParams = useMemo(() => {
    // Only include server-accepted params; if server ignores them, filtering will be client-side
    const params: Record<string, string | number | boolean> = {};
    if (filters.limit) params.limit = filters.limit;
    if (filters.offset) params.offset = filters.offset;
    if (filters.sort) params.sort = filters.sort;
    if (filters.order) params.order = filters.order;
    if (typeof filters.activeOnly !== 'undefined') params.activeOnly = filters.activeOnly;
    if (filters.q) params.q = filters.q;
    return params;
  }, [filters]);

  const { data = [], isLoading, isFetching, error, refetch } = useQuery({
    queryKey: [ ...KEYS.LIST, queryParams ],
    queryFn: () => listCpt(queryParams),
    keepPreviousData: true,
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    if (!filters.q) return data;
    const q = (filters.q || '').toLowerCase();
    return (data as any[]).filter((t) =>
      String(t.slug || '').toLowerCase().includes(q) ||
      String(t.name || '').toLowerCase().includes(q)
    );
  }, [data, filters.q]);

  const deleteMutation = useMutation({
    mutationFn: (slug: string) => deleteCpt(slug),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.LIST }),
  });

  return {
    data: filtered,
    raw: data,
    isLoading,
    isFetching,
    error,
    refetch,
    filters,
    setFilters,
    deleteCpt: deleteMutation.mutate,
    deleteStatus: deleteMutation.status,
  } as const;
}


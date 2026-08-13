/**
 * useSupplyProductList — 공급 상품 탐색 목록 상태/조회 Core (headless)
 *
 * WO-O4O-STORE-HUB-SUPPLY-PRODUCT-EXPLORER-COMMONIZATION-V1
 *
 * 3 서비스(KPA / K-Cosmetics · GlycoPharm / Pharmacy-Hub)의 "공급 상품 탐색" 화면에서
 * 실제로 동일한 부분만 담는다.
 *   목록 조회 · 페이지네이션 · 탭/셀렉트 필터 · 검색어 · loading · empty · error
 *
 * 담지 않는 것(서비스 고유 업무):
 *   신청(ProductApproval) · 제외 · 장바구니 · 주문 · 상세 진입.
 *   → 소비처가 items/setItems 와 액션 slot 으로 직접 구현한다.
 *
 * 페이지 축은 **1-indexed page** 로 통일한다. offset 기반 API 는 adapter(fetchPage)에서
 * `(page - 1) * limit` 로 환산한다 — backend/API contract 는 변경하지 않는다.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface SupplyProductListQuery {
  /** 1-indexed */
  page: number;
  limit: number;
  /** 탭 필터 키 (탭 미사용 시 '') */
  tab: string;
  /** 제출된 검색어 (검색 미사용 시 '') */
  search: string;
  /** 셀렉트류 필터 (key → value, 빈 문자열은 '전체') */
  filters: Record<string, string>;
}

export interface SupplyProductListPage<T> {
  items: T[];
  total: number;
}

export interface UseSupplyProductListOptions<T> {
  /** 서비스별 API 를 공통 query 로 감싸는 adapter. */
  fetchPage: (query: SupplyProductListQuery) => Promise<SupplyProductListPage<T>>;
  limit?: number;
  initialTab?: string;
  initialFilters?: Record<string, string>;
  /** 에러 메시지 변환 (예: 403 → 권한 안내). 미지정 시 기본 문구. */
  resolveErrorMessage?: (err: unknown) => string;
  /** 매 조회 직전 호출 (예: 선택 상태 초기화). */
  onBeforeLoad?: () => void;
}

export interface UseSupplyProductListResult<T> {
  items: T[];
  /** 신청/제외 후 로컬 즉시 반영용 (재조회 없이 행 상태 갱신). */
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  tab: string;
  setTab: (tab: string) => void;
  filters: Record<string, string>;
  setFilter: (key: string, value: string) => void;
  /** 입력 중인 검색어 */
  searchInput: string;
  setSearchInput: (value: string) => void;
  /** 제출된 검색어 */
  search: string;
  submitSearch: () => void;
  setPage: (page: number) => void;
  reload: () => void;
  /** 필터/검색이 하나라도 적용된 상태인지 (empty 문구 분기용) */
  hasActiveFilter: boolean;
}

const DEFAULT_ERROR = '상품 목록을 불러오지 못했습니다.';

export function useSupplyProductList<T>(
  options: UseSupplyProductListOptions<T>,
): UseSupplyProductListResult<T> {
  const {
    fetchPage,
    limit = 20,
    initialTab = '',
    initialFilters,
    resolveErrorMessage,
    onBeforeLoad,
  } = options;

  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPageState] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTabState] = useState(initialTab);
  const [filters, setFilters] = useState<Record<string, string>>(initialFilters ?? {});
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  // 콜백 identity 변화로 재조회 루프가 생기지 않도록 ref 로 고정한다.
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;
  const resolveErrorRef = useRef(resolveErrorMessage);
  resolveErrorRef.current = resolveErrorMessage;
  const beforeLoadRef = useRef(onBeforeLoad);
  beforeLoadRef.current = onBeforeLoad;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    beforeLoadRef.current?.();

    fetchRef
      .current({ page, limit, tab, search, filters })
      .then((res) => {
        if (cancelled) return;
        setItems(res.items ?? []);
        setTotal(res.total ?? 0);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const resolved = resolveErrorRef.current?.(err);
        setError(resolved || (err as { message?: string })?.message || DEFAULT_ERROR);
        setItems([]);
        setTotal(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // filters 는 객체이므로 직렬화 키로 비교한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, tab, search, JSON.stringify(filters), reloadToken]);

  const setTab = useCallback((next: string) => {
    setTabState(next);
    setPageState(1);
  }, []);

  const setFilter = useCallback((key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPageState(1);
  }, []);

  const submitSearch = useCallback(() => {
    setSearch(searchInput);
    setPageState(1);
  }, [searchInput]);

  const setPage = useCallback((next: number) => {
    setPageState(next < 1 ? 1 : next);
  }, []);

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const hasActiveFilter =
    !!search || Object.values(filters).some((v) => !!v) || tab !== initialTab;

  return {
    items,
    setItems,
    total,
    page,
    limit,
    totalPages,
    loading,
    error,
    tab,
    setTab,
    filters,
    setFilter,
    searchInput,
    setSearchInput,
    search,
    submitSearch,
    setPage,
    reload,
    hasActiveFilter,
  };
}

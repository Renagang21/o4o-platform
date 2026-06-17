/**
 * Standard List Core — Types
 *
 * WO-O4O-STANDARD-LIST-CORE-V1
 *
 * 외부 벤치마크/내부 감사 IR 에서 확정한 "표준 리스트 운영 환경"의 상태·계약 계층.
 * 기존 DataTable / Pagination / SearchBar(UI)는 재사용하고, 그 위에 상태(query)·
 * URL sync·page=1 reset·응답 정규화 계약만 표준화한다.
 */

export type StandardSortOrder = 'asc' | 'desc';

export type StandardFilterValue = string | number | boolean | undefined;

/** 리스트 상태 단일 소스. fetcher 에 그대로 전달 가능. */
export interface StandardListQueryState {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: StandardSortOrder;
  filters: Record<string, StandardFilterValue>;
}

/** 정규화된 페이지네이션 상태(외부 응답 shape 혼재를 흡수한 결과). */
export interface StandardPaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface StandardPaginatedResponse<T> {
  data: T[];
  pagination: StandardPaginationState;
}

export interface UseStandardListQueryOptions<TItem, TRawResponse = unknown> {
  defaultPage?: number;
  defaultLimit?: number;
  defaultSearch?: string;
  defaultSortBy?: string;
  defaultSortOrder?: StandardSortOrder;
  defaultFilters?: Record<string, StandardFilterValue>;
  /** 표준 query 를 받아 raw 응답을 반환. (서버 페이지네이션/정렬/필터와 결합) */
  fetcher: (query: StandardListQueryState) => Promise<TRawResponse>;
  /** 미지정 시 normalizePaginatedResponse 로 자동 흡수. */
  normalize?: (response: TRawResponse) => StandardPaginatedResponse<TItem>;
  /** URL query 동기화 (기본 true). */
  syncUrl?: boolean;
  /** 한 페이지에 여러 리스트가 있을 때 URL param 충돌 방지 prefix. */
  urlKeyPrefix?: string;
}

export interface UseStandardListQueryResult<TItem> {
  items: TItem[];
  pagination: StandardPaginationState;
  query: StandardListQueryState;
  loading: boolean;
  error: unknown;
  /** 단순 페이지 이동 — 검색/필터/정렬 유지. */
  setPage: (page: number) => void;
  /** limit 변경 — page=1 reset. */
  setLimit: (limit: number) => void;
  /** 검색 변경 — page=1 reset. */
  setSearch: (search: string) => void;
  /** 정렬 변경 — page=1 reset. */
  setSort: (sortBy: string, sortOrder: StandardSortOrder) => void;
  /** 단일 필터 변경 — page=1 reset. */
  setFilter: (key: string, value: StandardFilterValue) => void;
  /** 전체 필터 교체 — page=1 reset. */
  setFilters: (filters: Record<string, StandardFilterValue>) => void;
  /** 기본 필터로 초기화 — page=1 reset. */
  resetFilters: () => void;
  refetch: () => void;
}

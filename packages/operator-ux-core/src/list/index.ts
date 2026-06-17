/**
 * List Module — Public API
 *
 * WO-O4O-LIST-BASE-MODULE-V1
 */

// Types
export type {
  PaginatedResponse,
  ListColumnDef,
  DataTableProps,
  PaginationProps,
  SearchBarProps,
  EditableDataTableProps,
} from './types';

// Batch Types (V3)
export type { BatchResultItem, BatchResult } from './batch-types';

// Delete Policy (V4)
export type { DeleteLevel, DeletePolicy } from './delete-policy';
export { DELETE_POLICIES, DOMAIN_DELETE_POLICIES, getAvailableDeleteLevels } from './delete-policy';

// Action Policy (V4)
export type { ActionConfirmConfig, ActionRule, ActionPolicy, BuiltAction } from './action-policy';
export { defineActionPolicy, buildRowActions } from './action-policy';

// Components
export { DataTable } from './DataTable';
export { Pagination } from './Pagination';
export { SearchBar } from './SearchBar';
export { EditableDataTable } from './EditableDataTable';

// Hooks (V3)
export { useBatchAction } from './useBatchAction';

// ─── Standard List Core (WO-O4O-STANDARD-LIST-CORE-V1) ───
// 기존 DataTable/Pagination/SearchBar(UI) 위의 상태·계약·정규화 계층(additive).
export type {
  StandardSortOrder,
  StandardFilterValue,
  StandardListQueryState,
  StandardPaginationState,
  StandardPaginatedResponse,
  UseStandardListQueryOptions,
  UseStandardListQueryResult,
} from './standard/standard-types';
export { normalizePaginatedResponse } from './standard/normalizePaginatedResponse';
export { useStandardListQuery } from './standard/useStandardListQuery';
export { StandardListToolbar } from './standard/StandardListToolbar';
export type { StandardListToolbarProps } from './standard/StandardListToolbar';

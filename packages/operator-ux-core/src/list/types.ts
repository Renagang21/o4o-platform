/**
 * List Module — Type Definitions
 *
 * WO-O4O-LIST-BASE-MODULE-V1
 *
 * 모든 서비스에서 재사용 가능한 리스트 UI 공통 타입.
 * Backend 응답 표준(PaginatedResponse)과 컬럼 정의(ListColumnDef)를 통일한다.
 */

import type { ReactNode } from 'react';

// ─── Backend 응답 표준 ───

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── 컬럼 정의 ───

export interface ListColumnDef<T> {
  /** 고유 식별자 + dataIndex (T의 키 또는 커스텀 문자열) */
  key: string;
  /** 테이블 헤더 텍스트 */
  header: string;
  /** 컬럼 너비 (CSS value, e.g. '120px', '20%') */
  width?: string;
  /** 최소 너비 */
  minWidth?: number | string;
  /** 최대 너비 */
  maxWidth?: number | string;
  /** 컬럼 폭 드래그 리사이즈 허용 */
  resizable?: boolean;
  /** 텍스트 정렬 */
  align?: 'left' | 'center' | 'right';
  /** 정렬 가능 여부 */
  sortable?: boolean;
  /** 커스텀 셀 렌더러 */
  render?: (value: any, row: T, index: number) => ReactNode;
  /** 인라인 편집 가능 여부 (EditableDataTable 전용) */
  editable?: boolean;
  /** 인라인 편집 시 커스텀 에디터 렌더러 (EditableDataTable 전용) */
  editRender?: (value: any, row: T, onChange: (newValue: any) => void) => ReactNode;
}

// ─── DataTable Props ───

export interface DataTableProps<T extends Record<string, any>> {
  /** 컬럼 정의 배열 */
  columns: ListColumnDef<T>[];
  /** 테이블 데이터 */
  data: T[];
  /** 각 행의 고유 키를 추출하는 필드명 또는 함수 */
  rowKey: keyof T | ((row: T) => string);
  /** 로딩 상태 */
  loading?: boolean;
  /** 데이터 없을 때 메시지 */
  emptyMessage?: string;
  /** 행 클릭 핸들러 */
  onRowClick?: (row: T) => void;
  /** 추가 CSS 클래스 */
  className?: string;
}

// ─── Pagination Props ───

export interface PaginationProps {
  /** 현재 페이지 (1-indexed) */
  page: number;
  /** 전체 페이지 수 */
  totalPages: number;
  /** 페이지 변경 핸들러 */
  onPageChange: (page: number) => void;
  /** 전체 건수 (선택, 표시용) */
  total?: number;
}

// ─── SearchBar Props ───

export interface SearchBarProps {
  /** 현재 입력값 */
  value: string;
  /** 입력값 변경 핸들러 */
  onChange: (value: string) => void;
  /** 검색 실행 핸들러 (debounce 후 호출) */
  onSearch: (value: string) => void;
  /** 플레이스홀더 */
  placeholder?: string;
  /** 디바운스 딜레이 (ms, 기본 300) */
  debounceMs?: number;
}

// ─── EditableDataTable Props ───

export interface EditableDataTableProps<T extends Record<string, any>>
  extends Omit<DataTableProps<T>, 'onRowClick'> {
  /** 변경된 행 저장 핸들러 */
  onSave?: (changedRows: T[]) => void | Promise<void>;
  /** 저장 중 상태 */
  saving?: boolean;
  // WO-O4O-BASETABLE-COLUMN-REORDER-AND-PERSISTENCE-V1
  /** 테이블 고유 ID — 상태 저장에 사용 */
  tableId?: string;
  /** 컬럼 드래그 순서 변경 허용 */
  reorderable?: boolean;
  /** localStorage에 컬럼 상태 저장 (순서 + 폭) */
  persistState?: boolean;
  /** 컬럼 표시/숨김 토글 UI 표시 */
  columnVisibility?: boolean;
}

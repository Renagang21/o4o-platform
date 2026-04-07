/**
 * O4O Table Type Definitions
 *
 * WO-O4O-TABLE-COLUMN-TYPE-UNIFICATION-V1
 *
 * O4OColumn — 모든 테이블의 단일 Column 모델.
 * DataTable(Column), EditableDataTable(ListColumnDef)은
 * 내부에서 O4OColumn으로 변환하여 BaseTable에 전달.
 */

import type { ReactNode } from 'react';

// ─── Column ─────────────────────────────────────

export interface O4OColumn<T> {
  key: string;
  header: ReactNode;

  /** 행에서 값 추출. 없으면 row[key] 사용. */
  accessor?: (row: T, index: number) => any;

  /** 셀 렌더러. value는 accessor 또는 row[key]로 추출된 값. */
  render?: (value: any, row: T, index: number) => ReactNode;

  // ─── Style ───
  width?: number | string;
  minWidth?: number | string;
  maxWidth?: number | string;
  align?: 'left' | 'center' | 'right';
  className?: string;

  /** 컬럼 폭 드래그 리사이즈 허용 */
  resizable?: boolean;

  /** 시스템 컬럼 — reorder/visibility 대상 제외, sticky 적용 가능 */
  system?: boolean;
  /** sticky 고정 (left: 0) */
  sticky?: boolean;

  // ─── Editable (선택) ───
  editable?: boolean;
  editor?: (value: any, row: T, onChange: (v: any) => void) => ReactNode;

  // ─── Rendering hooks (BaseTable 내부) ───
  /** 행별 동적 td 클래스 */
  cellClassName?: (row: T, rowIndex: number) => string;
  /** 셀 클릭 핸들러 */
  onCellClick?: (row: T, rowIndex: number) => void;
  /** th 클릭 핸들러 (정렬 등) */
  onHeaderClick?: () => void;
  /** th에 추가할 클래스 */
  headerClassName?: string;

  // ─── Sorting (WO-O4O-BASETABLE-FRONTEND-SORTING-V1) ───
  /**
   * 정렬 가능 여부.
   * - true: BaseTable이 헤더 클릭으로 3-state 정렬 (none → asc → desc → none)
   * - 시스템 컬럼(system: true)은 sortable로 지정해도 무시됨
   */
  sortable?: boolean;
  /**
   * 정렬 기준 값 추출 함수.
   * 지정하지 않으면 accessor → row[key] 순으로 값을 사용한다.
   * render 결과(JSX)를 정렬에 사용하지 않으므로 복합 컬럼은 반드시 지정할 것.
   */
  sortAccessor?: (row: T) => string | number | Date | null | undefined;
}

// ─── Sort State (WO-O4O-BASETABLE-FRONTEND-SORTING-V1) ───

export type SortDirection = 'asc' | 'desc' | null;

export interface SortState {
  key: string | null;
  direction: SortDirection;
}

/** @deprecated O4OColumn 사용 권장 */
export type BaseColumn<T> = O4OColumn<T>;

// ─── Table Props ────────────────────────────────

export interface BaseTableProps<T> {
  columns: O4OColumn<T>[];
  data: T[];
  rowKey?: (row: T, index: number) => string;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  thClassName?: string;
  tdClassName?: string;
  rowClassName?: (row: T, index: number) => string;
  onRowClick?: (row: T, index: number) => void;
  renderAfterRow?: (row: T, index: number) => ReactNode;
  emptyMessage?: ReactNode;

  // WO-O4O-BASETABLE-COLUMN-REORDER-AND-PERSISTENCE-V1
  /** 테이블 고유 ID — 상태 저장에 사용 */
  tableId?: string;
  /** 컬럼 드래그 순서 변경 허용 */
  reorderable?: boolean;
  /** localStorage에 컬럼 상태 저장 (순서 + 폭) */
  persistState?: boolean;
  /** 컬럼 표시/숨김 토글 UI 표시 */
  columnVisibility?: boolean;

  // WO-O4O-BASETABLE-SELECTION-COLUMN-STICKY-AND-SELECT-ALL-V1
  /** 행 선택 활성화 — 맨 왼쪽 체크박스 컬럼 자동 생성 */
  selectable?: boolean;
  /** 선택된 행 키 목록 */
  selectedKeys?: Set<string>;
  /** 선택 변경 콜백 */
  onSelectionChange?: (keys: Set<string>) => void;
}

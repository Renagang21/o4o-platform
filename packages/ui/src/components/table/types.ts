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
  align?: 'left' | 'center' | 'right';
  className?: string;

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
}

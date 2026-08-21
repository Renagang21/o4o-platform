/**
 * DataTable — Base List Table Component
 *
 * WO-O4O-LIST-BASE-MODULE-V1
 * WO-O4O-BASETABLE-FRONTEND-SORTING-V1 — BaseTable에 정렬 위임
 *
 * BaseTable thin wrapper. 컬럼 정의(ListColumnDef)를 O4OColumn으로 변환하고,
 * 정렬/렌더링/empty/loading은 BaseTable에 일임한다.
 */

import { useEffect, useState } from 'react';
import { BaseTable } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';
import type { DataTableProps } from './types';

/**
 * 모바일 폭 감지 — `stickyOnMobile` 컬럼을 좁은 화면에서만 고정하기 위해 사용한다.
 * WO-O4O-OPERATOR-GP-VIEW-DEDUP-AND-CROSSSERVICE-TABLE-UX-ALIGN-V1
 *
 * SSR / matchMedia 미지원 환경에서는 항상 false → desktop 렌더와 동일하다.
 */
const MOBILE_QUERY = '(max-width: 640px)';

function useIsMobileWidth(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(MOBILE_QUERY);
    const apply = () => setIsMobile(mql.matches);
    apply();
    // Safari < 14 는 addEventListener 미지원 → addListener fallback
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', apply);
      return () => mql.removeEventListener('change', apply);
    }
    mql.addListener(apply);
    return () => mql.removeListener(apply);
  }, []);
  return isMobile;
}

function getRowKeyValue<T extends Record<string, any>>(
  row: T,
  rowKey: keyof T | ((row: T) => string),
  index: number,
): string {
  if (typeof rowKey === 'function') return rowKey(row);
  return String(row[rowKey]) || `row-${index}`;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  rowKey,
  loading = false,
  emptyMessage = '데이터가 없습니다',
  onRowClick,
  className = '',
  tableId,
  reorderable,
  persistState,
  columnVisibility,
  selectable,
  selectedKeys,
  onSelectionChange,
  // WO-O4O-DATATABLE-ONSORT-CONTROLLED-SORT-V1
  manualSort,
  sortBy,
  sortOrder,
  onSort,
  // WO-O4O-DATATABLE-EXPANDABLE-ROW-AND-NETURE-LISTS-STANDARDIZATION-V1
  expandable,
  expandedRowKeys,
  onExpandedRowKeysChange,
  renderExpandedRow,
  isRowExpandable,
}: DataTableProps<T>) {
  // 확장 상태 — controlled(expandedRowKeys 제공) / uncontrolled(내부 state) 모두 지원.
  // 선택(selectedKeys)과 **별도 집합**으로 관리한다.
  const [internalExpanded, setInternalExpanded] = useState<Set<string>>(new Set());
  const isControlledExpand = expandedRowKeys !== undefined;
  const effectiveExpanded = isControlledExpand ? expandedRowKeys : internalExpanded;

  const toggleExpanded = (key: string) => {
    const next = new Set(effectiveExpanded);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    if (isControlledExpand) onExpandedRowKeysChange?.(next);
    else setInternalExpanded(next);
  };

  const expandEnabled = !!expandable && !!renderExpandedRow;
  const isMobile = useIsMobileWidth();
  // Loading skeleton
  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm overflow-hidden ${className}`}>
        <div className="animate-pulse">
          <div className="h-10 bg-slate-100 border-b border-slate-200" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-50 border-b border-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  // ListColumnDef → O4OColumn 매핑 (sortable / sortAccessor 포함)
  const o4oColumns: O4OColumn<T>[] = columns.map((col) => ({
    key: col.key,
    header: col.header,
    width: col.width,
    minWidth: col.minWidth,
    maxWidth: col.maxWidth,
    resizable: col.resizable,
    system: col.system,
    align: col.align,
    sortable: col.sortable,
    sortAccessor: col.sortAccessor,
    render: col.render,
    accessor: col.accessor,
    onCellClick: col.onCellClick,
    // 모바일에서만 고정되는 신원 컬럼 (desktop 은 col.sticky 그대로)
    sticky: col.sticky || (isMobile && col.stickyOnMobile),
  }));

  // selectable → _select 체크박스 컬럼 자동 생성
  // BaseTable은 col.key === '_select' 인 컬럼에 select-all 헤더를 자동 생성한다.
  // body 체크박스는 이 래퍼에서 render로 제공한다.
  if (selectable) {
    o4oColumns.unshift({
      key: '_select',
      header: '',
      system: true,
      // sticky: 가로 스크롤과 무관하게 선택 체크박스 컬럼을 좌측 고정
      sticky: true,
      width: '40px',
      align: 'center',
      render: (_value, row, index) => {
        const key = getRowKeyValue(row, rowKey, index);
        const checked = selectedKeys?.has(key) ?? false;
        return (
          <input
            type="checkbox"
            checked={checked}
            onChange={() => {
              if (!onSelectionChange) return;
              const next = new Set(selectedKeys);
              if (checked) next.delete(key);
              else next.add(key);
              onSelectionChange(next);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        );
      },
      onCellClick: () => {},
    });
  }

  // 확장 토글 컬럼 — 우측 끝에 자동 추가. 행 전체 클릭을 강제하지 않고 명시적 버튼을 제공한다.
  if (expandEnabled) {
    o4oColumns.push({
      key: '_expand',
      header: '',
      system: true,
      width: '44px',
      align: 'center',
      render: (_value, row, index) => {
        if (isRowExpandable && !isRowExpandable(row)) return null;
        const key = getRowKeyValue(row, rowKey, index);
        const isOpen = effectiveExpanded.has(key);
        return (
          <button
            type="button"
            aria-expanded={isOpen}
            aria-label={isOpen ? '상세 접기' : '상세 펼치기'}
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(key);
            }}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            <span aria-hidden="true" className="inline-block text-xs leading-none">{isOpen ? '▲' : '▼'}</span>
          </button>
        );
      },
      onCellClick: () => {},
    });
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm overflow-hidden ${className}`}>
      <BaseTable
        columns={o4oColumns}
        renderAfterRow={
          expandEnabled
            ? (row, index) => {
                const key = getRowKeyValue(row, rowKey, index);
                if (!effectiveExpanded.has(key)) return null;
                if (isRowExpandable && !isRowExpandable(row)) return null;
                return (
                  <tr className="bg-slate-50">
                    {/* colSpan 은 실제 표시 컬럼 수와 일치시킨다(_select/_expand 포함) */}
                    <td colSpan={o4oColumns.length} className="px-4 py-3">
                      {renderExpandedRow!(row)}
                    </td>
                  </tr>
                );
              }
            : undefined
        }
        data={data}
        rowKey={(row, index) => getRowKeyValue(row, rowKey, index)}
        headerClassName="bg-slate-50 border-b border-slate-200"
        bodyClassName="divide-y divide-slate-100"
        thClassName="px-4 py-3 text-xs font-medium text-slate-500 uppercase"
        tdClassName="px-4 py-3 text-sm text-slate-700"
        onRowClick={onRowClick ? (row) => onRowClick(row) : undefined}
        emptyMessage={emptyMessage}
        tableId={tableId}
        reorderable={reorderable}
        persistState={persistState}
        columnVisibility={columnVisibility}
        selectable={selectable}
        selectedKeys={selectedKeys}
        onSelectionChange={onSelectionChange}
        manualSort={manualSort}
        sortKey={sortBy}
        sortDirection={sortOrder}
        onSortChange={onSort}
      />
    </div>
  );
}

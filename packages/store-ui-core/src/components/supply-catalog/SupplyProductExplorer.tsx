/**
 * SupplyProductExplorer — 공급 상품 탐색 공통 View
 *
 * WO-O4O-STORE-HUB-SUPPLY-PRODUCT-EXPLORER-COMMONIZATION-V1
 *
 * 공통(본 컴포넌트): 헤더 · 탭 필터 · 셀렉트 필터 · 검색 · DataTable · Pagination
 *                    · loading / empty / error(재시도)
 * 서비스 고유(주입): 데이터 adapter(useSupplyProductList) · 컬럼 · 액션(toolbar/컬럼 render)
 *                    · 안내문(notice/footer)
 *
 * 업무 의미는 본 컴포넌트가 결정하지 않는다.
 *   - 신청(ProductApproval PENDING) / 제외 = KPA · K-Cosmetics · GlycoPharm 측 액션
 *   - 장바구니 / 주문 = Pharmacy-Hub 측 액션
 *   두 축을 섞지 않는다. 여기에는 어떤 액션 로직도 넣지 않는다.
 */

import type { ReactNode } from 'react';
import { DataTable, Pagination } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import type { UseSupplyProductListResult } from './useSupplyProductList';

/** 컬럼 정의 alias — 소비 서비스가 @o4o/operator-ux-core 를 직접 의존하지 않도록 재노출. */
export type SupplyProductExplorerColumn<T> = ListColumnDef<T>;

export interface SupplyProductExplorerTab {
  key: string;
  label: string;
}

export interface SupplyProductExplorerOption {
  value: string;
  label: string;
}

export interface SupplyProductExplorerSelectFilter<T> {
  /** useSupplyProductList 의 filters key */
  key: string;
  /** '전체' 항목 라벨 */
  allLabel: string;
  /** 고정 옵션 또는 현재 목록에서 파생하는 옵션 */
  options: SupplyProductExplorerOption[] | ((items: T[]) => SupplyProductExplorerOption[]);
}

export interface SupplyProductExplorerProps<T extends Record<string, any>> {
  list: UseSupplyProductListResult<T>;
  columns: ListColumnDef<T>[];
  rowKey: keyof T | ((row: T) => string);
  title?: ReactNode;
  description?: ReactNode;
  /** 탭 필터. 미지정 시 미표시. */
  tabs?: SupplyProductExplorerTab[];
  /** 셀렉트 필터. 미지정 시 미표시. */
  selectFilters?: SupplyProductExplorerSelectFilter<T>[];
  /** 검색 placeholder. 미지정 시 검색창 미표시. */
  searchPlaceholder?: string;
  /** 표 위 액션 영역 (예: ActionBar) */
  toolbar?: ReactNode;
  /** 필터 바로 아래 안내 영역 */
  notice?: ReactNode;
  /** 표/페이지네이션 아래 안내 영역 */
  footer?: ReactNode;
  tableId?: string;
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  onRowClick?: (row: T) => void;
  /** 조건 없이 0건일 때 문구 */
  emptyMessage?: ReactNode;
  /** 필터/검색이 적용된 상태에서 0건일 때 문구 */
  emptyFilteredMessage?: ReactNode;
}

export function SupplyProductExplorer<T extends Record<string, any>>({
  list,
  columns,
  rowKey,
  title,
  description,
  tabs,
  selectFilters,
  searchPlaceholder,
  toolbar,
  notice,
  footer,
  tableId,
  selectable,
  selectedKeys,
  onSelectionChange,
  onRowClick,
  emptyMessage = '표시할 상품이 없습니다.',
  emptyFilteredMessage = '조건에 맞는 상품이 없습니다.',
}: SupplyProductExplorerProps<T>) {
  const showFilterBar = !!tabs?.length || !!selectFilters?.length || !!searchPlaceholder;

  return (
    <div className="px-1 py-2">
      {(title || description) && (
        <div className="mb-5 pb-4 border-b border-slate-200">
          {title && <h1 className="text-xl font-bold text-slate-900">{title}</h1>}
          {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
        </div>
      )}

      {showFilterBar && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {tabs?.map((tab) => (
            <button
              key={tab.key || 'all'}
              type="button"
              onClick={() => list.setTab(tab.key)}
              className={`px-3.5 py-1.5 text-[0.8125rem] font-medium rounded-full transition-colors ${
                list.tab === tab.key
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}

          <form
            className="ml-auto flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              list.submitSearch();
            }}
          >
            {selectFilters?.map((f) => {
              const options =
                typeof f.options === 'function' ? f.options(list.items) : f.options;
              return (
                <select
                  key={f.key}
                  value={list.filters[f.key] ?? ''}
                  onChange={(e) => list.setFilter(f.key, e.target.value)}
                  className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                >
                  <option value="">{f.allLabel}</option>
                  {options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              );
            })}
            {searchPlaceholder && (
              <>
                <input
                  value={list.searchInput}
                  onChange={(e) => list.setSearchInput(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="rounded border border-slate-300 px-3 py-1.5 text-sm"
                />
                <button
                  type="submit"
                  className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
                >
                  검색
                </button>
              </>
            )}
          </form>
        </div>
      )}

      {notice}

      {list.error ? (
        <div className="text-center py-16">
          <p className="text-sm text-red-500 mb-3">{list.error}</p>
          <button
            type="button"
            onClick={list.reload}
            className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            다시 시도
          </button>
        </div>
      ) : (
        <>
          {toolbar}

          <DataTable<T>
            columns={columns}
            data={list.items}
            rowKey={rowKey}
            loading={list.loading}
            emptyMessage={list.hasActiveFilter ? emptyFilteredMessage : emptyMessage}
            tableId={tableId}
            selectable={selectable}
            selectedKeys={selectedKeys}
            onSelectionChange={onSelectionChange}
            onRowClick={onRowClick}
          />

          {list.totalPages > 1 && (
            <div className="mt-4">
              <Pagination
                page={list.page}
                totalPages={list.totalPages}
                onPageChange={list.setPage}
                total={list.total}
              />
            </div>
          )}
        </>
      )}

      {footer}
    </div>
  );
}

export default SupplyProductExplorer;

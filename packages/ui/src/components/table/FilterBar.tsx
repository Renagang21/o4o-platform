/**
 * FilterBar — O4O Table 표준 필터/검색 바
 *
 * WO-O4O-TABLE-STANDARD-ALIGNMENT-V1
 *
 * 모든 관리 테이블 상단에 사용하는 공통 필터 컴포넌트.
 * - 키워드 검색 input
 * - 상태·유형 등 선택형 필터 (select)
 * - 추가 버튼 슬롯 (children)
 *
 * 사용:
 *   <FilterBar
 *     searchPlaceholder="상품명, 공급사 검색..."
 *     onSearchChange={setSearch}
 *     filters={[
 *       { key: 'status', placeholder: '모든 상태', options: [
 *         { value: 'PENDING', label: '대기 중' },
 *         { value: 'APPROVED', label: '승인됨' },
 *       ]},
 *     ]}
 *     onFilterChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
 *   >
 *     <button>추가 액션</button>
 *   </FilterBar>
 */

import type { ReactNode, ChangeEvent } from 'react';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterFieldConfig {
  key: string;
  /** select placeholder (= 전체 옵션) */
  placeholder?: string;
  options: FilterOption[];
}

export interface FilterBarProps {
  /** 검색 input placeholder */
  searchPlaceholder?: string;
  /** 검색 값 (controlled) */
  searchValue?: string;
  /** 검색 값 변경 콜백 */
  onSearchChange?: (value: string) => void;

  /** 필터 select 목록 */
  filters?: FilterFieldConfig[];
  /** 필터 값 map (controlled) — { [key]: value } */
  filterValues?: Record<string, string>;
  /** 특정 필터 값 변경 콜백 */
  onFilterChange?: (key: string, value: string) => void;

  /** 오른쪽 추가 액션 영역 */
  children?: ReactNode;
  className?: string;
}

/** 돋보기 아이콘 (인라인 SVG) */
function SearchIcon() {
  return (
    <svg
      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export function FilterBar({
  searchPlaceholder = '검색...',
  searchValue,
  onSearchChange,
  filters,
  filterValues,
  onFilterChange,
  children,
  className = '',
}: FilterBarProps) {
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {/* 검색 input */}
      {onSearchChange !== undefined && (
        <div className="relative flex-1 min-w-[180px]">
          <SearchIcon />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue ?? ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}

      {/* 필터 select 목록 */}
      {filters?.map((filter) => (
        <select
          key={filter.key}
          value={filterValues?.[filter.key] ?? ''}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => onFilterChange?.(filter.key, e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        >
          <option value="">{filter.placeholder ?? '전체'}</option>
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ))}

      {/* 추가 슬롯 */}
      {children}
    </div>
  );
}

/**
 * StandardListToolbar — 표준 리스트 도구막대
 *
 * WO-O4O-STANDARD-LIST-CORE-V1
 *
 * 검색 + 필터 slot + 액션 slot + summary slot 의 배치만 표준화한다.
 * 검색 입력은 기존 SearchBar(디바운스 + Enter)를 재사용한다. 필터 UI 자체는
 * 화면이 slot 으로 구성한다(status/serviceKey/category/date 등 고정하지 않음).
 */

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { SearchBar } from '../SearchBar';

export interface StandardListToolbarProps {
  /** 현재 검색값(query.search). 미지정/onSearchChange 미지정 시 검색창 미표시. */
  searchValue?: string;
  searchPlaceholder?: string;
  /** 디바운스/Enter 후 호출(= setSearch, page=1 reset). */
  onSearchChange?: (value: string) => void;
  searchDebounceMs?: number;
  /** 필터 UI slot (status/serviceKey/category/date 등 화면 구성). */
  filters?: ReactNode;
  /** 우측 액션 slot (생성/내보내기/일괄작업 등). */
  actions?: ReactNode;
  /** 하단 요약 slot (총 n건 등). */
  summary?: ReactNode;
  className?: string;
}

export function StandardListToolbar({
  searchValue,
  searchPlaceholder = '검색어를 입력하세요',
  onSearchChange,
  searchDebounceMs = 300,
  filters,
  actions,
  summary,
  className = '',
}: StandardListToolbarProps) {
  // SearchBar 는 controlled — 입력값은 로컬, 디바운스 결과만 onSearchChange 로 전달.
  const [local, setLocal] = useState(searchValue ?? '');
  useEffect(() => {
    setLocal(searchValue ?? '');
  }, [searchValue]);

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {onSearchChange && (
            <SearchBar
              value={local}
              onChange={setLocal}
              onSearch={onSearchChange}
              placeholder={searchPlaceholder}
              debounceMs={searchDebounceMs}
            />
          )}
          {filters}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {summary && <div className="text-xs text-slate-500">{summary}</div>}
    </div>
  );
}

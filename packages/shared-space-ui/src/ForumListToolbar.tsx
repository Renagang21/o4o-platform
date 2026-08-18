/**
 * ForumListToolbar / ForumListInfoBar — forum 목록 상단 공통 부품 (presentational)
 *
 * WO-O4O-COMMUNITY-FORUM-KPA-NETURE-VIEW-CONVERGENCE-V1
 *
 * KPA / Neture 포럼 목록이 각각 복제하던
 *   검색 form · 활성 필터 표시 + 전체 초기화 · 건수/페이지 info bar
 * 를 수렴한다. **목록 본체(표/카드)는 이 부품이 소유하지 않는다** —
 * KPA 의 BaseTable(선택·bulk·감사 포인트 컬럼)과 Neture 의 ForumListTemplate 은
 * 실제 업무 표현 차이이므로 억지로 통일하지 않는다.
 *
 * 서비스 고유 필터(KPA 포럼 Combobox · Neture 카테고리/유형/정렬 select)는 `filterSlot` 으로 받는다.
 * router / API client 의존 0 — 이동·조회는 전부 호출측 소유.
 */

import type { CSSProperties, FormEvent, ReactNode } from 'react';

export interface ForumListFilterChip {
  /** 화면 표시 문구 (예: `"검색어"` · `#태그` · 카테고리명) */
  label: string;
  /** 지정 시 칩에 제거 버튼을 노출한다. */
  onRemove?: () => void;
}

export interface ForumListToolbarProps {
  /** 검색 입력값 (호출측 state) */
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  searchPlaceholder?: string;
  searchButtonLabel?: string;

  /** 서비스 고유 필터 컨트롤 (검색창 옆 또는 아래 행) */
  filterSlot?: ReactNode;
  /** filterSlot 을 검색 form 안(좌측)에 넣을지 여부. 기본 false = 별도 행 */
  filterInline?: boolean;
  /** 검색 form 우측 등에 붙는 서비스 고유 요소 (정렬 select 등) */
  filterRightSlot?: ReactNode;

  /** 활성 필터 칩. 비어 있으면 필터 행을 렌더하지 않는다. */
  chips?: ForumListFilterChip[];
  onClearAll?: () => void;
  clearAllLabel?: string;
  chipsLabel?: string;

  /** 검색 form 하단 액션(글쓰기 CTA 등) */
  actionSlot?: ReactNode;

  accentColor?: string;
  className?: string;
  style?: CSSProperties;
}

export function ForumListToolbar({
  searchValue,
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder = '제목 또는 내용 검색',
  searchButtonLabel = '검색',
  filterSlot,
  filterInline = false,
  filterRightSlot,
  chips,
  onClearAll,
  clearAllLabel = '전체 초기화',
  chipsLabel = '필터:',
  actionSlot,
  accentColor = '#2563EB',
  className,
  style,
}: ForumListToolbarProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearchSubmit();
  };
  const activeChips = chips?.filter(Boolean) ?? [];

  return (
    <div className={className} style={{ ...styles.wrap, ...style }}>
      <form style={styles.searchForm} onSubmit={handleSubmit}>
        {filterInline && filterSlot}
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          style={styles.searchInput}
        />
        <button type="submit" style={{ ...styles.searchBtn, backgroundColor: accentColor }}>
          {searchButtonLabel}
        </button>
      </form>

      {(!filterInline && filterSlot) || filterRightSlot ? (
        <div style={styles.filterRow}>
          <div style={styles.filterGroup}>{!filterInline ? filterSlot : null}</div>
          {filterRightSlot}
        </div>
      ) : null}

      {actionSlot && <div style={styles.actionRow}>{actionSlot}</div>}

      {activeChips.length > 0 && (
        <div style={styles.chipRow}>
          <span style={{ ...styles.chipsLabel, color: accentColor }}>{chipsLabel}</span>
          {activeChips.map((chip) => (
            <span key={chip.label} style={styles.chip}>
              {chip.label}
              {chip.onRemove && (
                <button
                  type="button"
                  onClick={chip.onRemove}
                  aria-label={`${chip.label} 필터 제거`}
                  style={styles.chipRemove}
                >
                  ×
                </button>
              )}
            </span>
          ))}
          {onClearAll && (
            <button type="button" onClick={onClearAll} style={{ ...styles.clearBtn, color: accentColor }}>
              {clearAllLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export interface ForumListInfoBarProps {
  /** 전체/검색 결과 건수 */
  totalCount: number;
  /** true 면 "검색 결과 N건", false 면 "총 N개의 게시글" */
  filtered?: boolean;
  currentPage?: number;
  totalPages?: number;
  className?: string;
  style?: CSSProperties;
}

export function ForumListInfoBar({
  totalCount,
  filtered = false,
  currentPage,
  totalPages,
  className,
  style,
}: ForumListInfoBarProps) {
  return (
    <div className={className} style={{ ...styles.infoBar, ...style }}>
      <span style={styles.totalCount}>
        {filtered ? `검색 결과 ${totalCount}건` : `총 ${totalCount}개의 게시글`}
      </span>
      {!!totalPages && totalPages > 1 && !!currentPage && (
        <span style={styles.pageInfo}>
          {currentPage} / {totalPages} 페이지
        </span>
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    marginBottom: 16,
  },
  searchForm: {
    display: 'flex',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  searchInput: {
    flex: 1,
    minWidth: 160,
    padding: '8px 14px',
    fontSize: 14,
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    outline: 'none',
    backgroundColor: '#fff',
    boxSizing: 'border-box',
  },
  searchBtn: {
    padding: '8px 18px',
    fontSize: 14,
    fontWeight: 500,
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  filterRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  chipRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    padding: '6px 12px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
  },
  chipsLabel: {
    fontSize: 12,
    fontWeight: 600,
    flexShrink: 0,
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 8px',
    fontSize: 12,
    color: '#334155',
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 999,
  },
  chipRemove: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 14,
    height: 14,
    padding: 0,
    fontSize: 12,
    lineHeight: 1,
    color: '#94a3b8',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  clearBtn: {
    marginLeft: 'auto',
    fontSize: 12,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: '2px 4px',
  },
  infoBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    marginBottom: 4,
  },
  totalCount: {
    fontSize: 13,
    color: '#64748b',
  },
  pageInfo: {
    fontSize: 13,
    color: '#94a3b8',
  },
};

/**
 * ContentHubTemplate — /content HUB 공통 템플릿
 *
 * WO-O4O-CONTENT-HUB-TEMPLATE-FOUNDATION-V1
 *
 * KPA-Society HubContentLibraryPage를 canonical 기준으로 추출.
 * 서비스별 차이(API fetch, 복사 방식, 필터, 문구)는 ContentHubConfig + adapter로 주입.
 *
 * 5-block 구조:
 *   1. Hero/Intro        — 공간 설명 + 이용 목적
 *   2. Search/Filter     — 검색창 + 탭 필터
 *   3. Content List      — fetchItems adapter 호출, 기본 table or renderItems 오버라이드
 *   4. Usage/CTA         — 활용 안내 + 다음 행동 링크 (optional)
 *   5. Info/Guidance     — 하단 안내 + 바로가기 (optional)
 *
 * 핵심 경계:
 *   template  — 블록 순서, 레이아웃, 상태 관리(search/filter/page/copy), 기본 table 렌더링
 *   adapter   — fetchItems(), loadCopiedIds(), onCopy() — 서비스별 API + 응답 변환
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';

// ─── Data Types ───────────────────────────────────────────────────────────────

export interface ContentHubItem {
  id: string;
  title: string;
  summary?: string | null;
  thumbnail?: string | null;
  /** 외부 링크 (있으면 제목 클릭 시 새 탭 오픈) */
  href?: string | null;
  /** display badge label (서비스에서 이미 변환해 전달) */
  type?: string | null;
  /** badge 색상 (없으면 기본 회색) */
  typeColor?: { bg: string; text: string };
  date?: string | null;
  isPinned?: boolean;
  isNew?: boolean;
}

export interface ContentHubFilter {
  key: string;
  label: string;
}

export interface ContentHubFetchParams {
  filter: string;
  search: string;
  page: number;
  limit: number;
}

export interface ContentHubFetchResult {
  items: ContentHubItem[];
  total: number;
}

/** renderItems 오버라이드에 전달되는 복사 컨텍스트 */
export interface ContentHubItemContext {
  copiedIds: Set<string>;
  copyingId: string | null;
  justCopiedId: string | null;
  onCopy: (item: ContentHubItem) => void;
  copyLabel: string;
  copiedLabel: string;
  copyingLabel: string;
  afterCopyAction?: { label: string; href: string };
}

// ─── Config Interface ─────────────────────────────────────────────────────────

export interface ContentHubConfig {
  serviceKey: string;

  /** Block 1: Hero */
  heroTitle: string;
  heroDesc: string;
  /** Hero 우측 액션 버튼 슬롯 */
  headerAction?: React.ReactNode;

  /** Block 2: Search/Filter */
  showSearch?: boolean;
  searchPlaceholder?: string;
  /** 필터 배열 — 첫 번째 key가 "전체" 역할 */
  filters?: ContentHubFilter[];

  /** Block 3: Content List */
  pageLimit?: number;
  /** 서비스별 fetch adapter — API 호출 + 응답 → ContentHubItem[] 변환 */
  fetchItems: (params: ContentHubFetchParams) => Promise<ContentHubFetchResult>;

  /** 복사 adapter */
  loadCopiedIds?: () => Promise<Set<string>>;
  onCopy?: (item: ContentHubItem) => Promise<void>;
  copyLabel?: string;
  copiedLabel?: string;
  copyingLabel?: string;
  /** 복사 직후 action 버튼 (e.g. "작업하러 가기") */
  afterCopyAction?: { label: string; href: string };

  /** Block 4: Usage/CTA (optional) */
  showUsageBlock?: boolean;
  usageCta?: {
    title: string;
    desc: string;
    links: { label: string; href: string }[];
  };

  /** Block 5: Info/Guidance (optional) */
  showInfoBlock?: boolean;
  infoText?: string;
  infoLinks?: { label: string; href: string }[];

  /** Empty state messages */
  emptyMessage?: string;
  emptyFilteredMessage?: string;

  /** 리스트 섹션 전체 오버라이드 — card grid 등 서비스별 레이아웃 */
  renderItems?: (items: ContentHubItem[], ctx: ContentHubItemContext) => React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ContentHubTemplate({ config }: { config: ContentHubConfig }) {
  const PAGE_LIMIT = config.pageLimit ?? 20;
  const firstFilterKey = config.filters?.[0]?.key ?? 'all';

  const [items, setItems] = useState<ContentHubItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState(firstFilterKey);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [justCopiedId, setJustCopiedId] = useState<string | null>(null);

  // Initial copied IDs (service-specific adapter)
  useEffect(() => {
    config.loadCopiedIds?.()
      .then(ids => setCopiedIds(ids))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch items
  const doFetch = useCallback(async (p: number, filter: string, search: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await config.fetchItems({ filter, search, page: p, limit: PAGE_LIMIT });
      setItems(result.items);
      setTotal(result.total);
    } catch (e: any) {
      setError(e.message || '콘텐츠 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [PAGE_LIMIT]);

  useEffect(() => {
    doFetch(page, activeFilter, searchQuery);
  }, [doFetch, page, activeFilter, searchQuery]);

  const handleFilterChange = (key: string) => {
    setActiveFilter(key);
    setPage(1);
    setJustCopiedId(null);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
    setPage(1);
    setJustCopiedId(null);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setPage(1);
  };

  const resetFilters = () => {
    handleClearSearch();
    setActiveFilter(firstFilterKey);
  };

  const handleCopy = useCallback(async (item: ContentHubItem) => {
    if (!config.onCopy || copyingId) return;
    setCopyingId(item.id);
    try {
      await config.onCopy(item);
      setCopiedIds(prev => new Set(prev).add(item.id));
      setJustCopiedId(item.id);
    } catch {
      // copy errors handled by adapter (toast etc.)
    } finally {
      setCopyingId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copyingId]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const hasFilters = !!searchQuery || activeFilter !== firstFilterKey;

  const itemCtx: ContentHubItemContext = useMemo(() => ({
    copiedIds,
    copyingId,
    justCopiedId,
    onCopy: handleCopy,
    copyLabel: config.copyLabel ?? '내 매장에 복사',
    copiedLabel: config.copiedLabel ?? '복사 완료',
    copyingLabel: config.copyingLabel ?? '복사 중...',
    afterCopyAction: config.afterCopyAction,
  }), [copiedIds, copyingId, justCopiedId, handleCopy, config.copyLabel, config.copiedLabel, config.copyingLabel, config.afterCopyAction]);

  return (
    <div style={st.container}>

      {/* ── Block 1: Hero ─────────────────────────────────────────────────── */}
      <header style={st.hero}>
        <div>
          <h1 style={st.heroTitle}>{config.heroTitle}</h1>
          <p style={st.heroDesc}>{config.heroDesc}</p>
        </div>
        {config.headerAction}
      </header>

      {/* ── Block 2: Search + Filter ──────────────────────────────────────── */}
      {config.showSearch !== false && (
        <form style={st.searchForm} onSubmit={handleSearch}>
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder={config.searchPlaceholder ?? '콘텐츠 검색'}
            style={st.searchInput}
          />
          <button type="submit" style={st.searchBtn}>검색</button>
        </form>
      )}

      {config.filters && config.filters.length > 1 && (
        <div style={st.filterBar}>
          {config.filters.map(f => (
            <button
              key={f.key}
              onClick={() => handleFilterChange(f.key)}
              style={{ ...st.filterBtn, ...(activeFilter === f.key ? st.filterBtnActive : {}) }}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {hasFilters && (
        <div style={st.activeFiltersRow}>
          <div style={st.chips}>
            {activeFilter !== firstFilterKey && (
              <span style={st.chip}>
                {config.filters?.find(f => f.key === activeFilter)?.label}
                <button onClick={() => setActiveFilter(firstFilterKey)} style={st.chipX}>&times;</button>
              </span>
            )}
            {searchQuery && (
              <span style={st.chip}>
                검색어: {searchQuery}
                <button onClick={handleClearSearch} style={st.chipX}>&times;</button>
              </span>
            )}
          </div>
          <button onClick={resetFilters} style={st.resetBtn}>초기화</button>
        </div>
      )}

      {/* ── Block 3: Content List ─────────────────────────────────────────── */}
      {!loading && !error && (
        <div style={st.infoBar}>
          <span style={st.totalText}>
            {hasFilters ? `검색 결과 ${total}건` : `총 ${total}개의 콘텐츠`}
          </span>
          {totalPages > 1 && (
            <span style={st.pageInfo}>{page} / {totalPages} 페이지</span>
          )}
        </div>
      )}

      {loading ? (
        <SkeletonTable />
      ) : error ? (
        <ErrorView error={error} onRetry={() => doFetch(page, activeFilter, searchQuery)} />
      ) : items.length === 0 ? (
        <EmptyView
          hasFilters={hasFilters}
          emptyMessage={config.emptyMessage}
          emptyFilteredMessage={config.emptyFilteredMessage}
          activeFilterLabel={config.filters?.find(f => f.key === activeFilter)?.label}
          searchQuery={searchQuery}
          onReset={resetFilters}
        />
      ) : config.renderItems ? (
        config.renderItems(items, itemCtx)
      ) : (
        <DefaultTableView items={items} ctx={itemCtx} showCopyCol={!!config.onCopy} />
      )}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div style={st.pagination}>
          <PageButton onClick={() => setPage(1)} disabled={page === 1}>&laquo;</PageButton>
          <PageButton onClick={() => setPage(p => p - 1)} disabled={page === 1}>&lsaquo;</PageButton>
          {buildPageNumbers(page, totalPages).map(p => (
            <PageButton key={p} onClick={() => setPage(p)} active={p === page}>{p}</PageButton>
          ))}
          <PageButton onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>&rsaquo;</PageButton>
          <PageButton onClick={() => setPage(totalPages)} disabled={page === totalPages}>&raquo;</PageButton>
        </div>
      )}

      {/* ── Block 4: Usage/CTA ────────────────────────────────────────────── */}
      {config.showUsageBlock !== false && config.usageCta && (
        <div style={st.usageBlock}>
          <h3 style={st.usageTitle}>{config.usageCta.title}</h3>
          <p style={st.usageDesc}>{config.usageCta.desc}</p>
          <div style={st.usageLinks}>
            {config.usageCta.links.map(link => (
              <Link key={link.href} to={link.href} style={st.usageLink}>{link.label} →</Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Block 5: Info/Guidance ────────────────────────────────────────── */}
      {config.showInfoBlock !== false && (config.infoText || (config.infoLinks?.length ?? 0) > 0) && (
        <div style={st.infoBlock}>
          <span style={st.infoIcon}>💡</span>
          <span style={st.infoBodyText}>
            {config.infoText}
            {config.infoLinks?.map(link => (
              <span key={link.href}>
                {' '}<Link to={link.href} style={st.infoLink}>{link.label}</Link>
              </span>
            ))}
          </span>
        </div>
      )}

    </div>
  );
}

export default ContentHubTemplate;

// ─── Default Table View ───────────────────────────────────────────────────────

function DefaultTableView({ items, ctx, showCopyCol }: { items: ContentHubItem[]; ctx: ContentHubItemContext; showCopyCol: boolean }) {
  return (
    <div style={st.tableWrapper}>
      <table style={st.table}>
        <thead>
          <tr>
            <th style={{ ...st.th, width: '100px' }}>유형</th>
            <th style={st.th}>제목</th>
            <th style={{ ...st.th, width: '200px' }}>요약</th>
            {showCopyCol && <th style={{ ...st.th, width: '70px' }}>상태</th>}
            <th style={{ ...st.th, width: '90px' }}>작성일</th>
            {showCopyCol && <th style={{ ...st.th, width: '130px' }}></th>}
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <DefaultTableRow key={item.id} item={item} ctx={ctx} showCopyCol={showCopyCol} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DefaultTableRow({ item, ctx, showCopyCol }: { item: ContentHubItem; ctx: ContentHubItemContext; showCopyCol: boolean }) {
  const badgeColor = item.typeColor ?? { bg: '#f1f5f9', text: '#475569' };
  const isCopying = ctx.copyingId === item.id;
  const alreadyCopied = ctx.copiedIds.has(item.id);
  const wasJustCopied = ctx.justCopiedId === item.id;

  return (
    <tr style={item.isPinned ? st.rowPinned : st.row}>
      {/* 유형 */}
      <td style={{ ...st.td, width: '100px', textAlign: 'center' }}>
        {item.type ? (
          <span style={{ ...st.typeBadge, backgroundColor: badgeColor.bg, color: badgeColor.text }}>
            {item.type}
          </span>
        ) : null}
      </td>

      {/* 제목 */}
      <td style={st.td}>
        <div style={st.titleCell}>
          {item.href ? (
            <a href={item.href} target="_blank" rel="noopener noreferrer" style={st.titleLink}>
              {item.title}
            </a>
          ) : (
            <span style={st.titleText}>{item.title}</span>
          )}
          {item.isNew && <span style={st.newBadge}>신규</span>}
          {item.isPinned && <span style={st.pinnedBadge}>추천</span>}
        </div>
      </td>

      {/* 요약 */}
      <td style={{ ...st.td, width: '200px', color: NEUTRAL500, fontSize: '13px' }}>
        <span style={st.summaryText}>{item.summary || '-'}</span>
      </td>

      {/* 상태 (복사 기능이 있을 때만) */}
      {showCopyCol && (
        <td style={{ ...st.td, width: '70px', textAlign: 'center' }}>
          {alreadyCopied ? (
            <span style={st.statusCopied}>복사됨</span>
          ) : (
            <span style={st.statusAvailable}>미복사</span>
          )}
        </td>
      )}

      {/* 작성일 */}
      <td style={{ ...st.td, width: '90px', color: NEUTRAL400, fontSize: '13px' }}>
        {item.date ?? '-'}
      </td>

      {/* 액션 (복사 기능이 있을 때만) */}
      {showCopyCol && (
        <td style={{ ...st.td, width: '130px', textAlign: 'center' }}>
          {alreadyCopied ? (
            wasJustCopied && ctx.afterCopyAction ? (
              <Link to={ctx.afterCopyAction.href} style={st.afterCopyBtn}>
                {ctx.afterCopyAction.label}
              </Link>
            ) : (
              <span style={st.copiedLabel}>{ctx.copiedLabel}</span>
            )
          ) : (
            <button
              onClick={() => ctx.onCopy(item)}
              disabled={isCopying}
              style={{ ...st.copyBtn, opacity: isCopying ? 0.6 : 1, cursor: isCopying ? 'not-allowed' : 'pointer' }}
            >
              {isCopying ? ctx.copyingLabel : ctx.copyLabel}
            </button>
          )}
        </td>
      )}
    </tr>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonTable() {
  return (
    <div style={st.tableWrapper}>
      <table style={st.table}>
        <tbody>
          {[1, 2, 3, 4, 5].map(i => (
            <tr key={i}>
              <td colSpan={6} style={st.td}>
                <div style={{ height: '14px', backgroundColor: NEUTRAL200, borderRadius: '4px', width: `${50 + i * 8}%` }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ErrorView({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div style={st.emptyState}>
      <p style={{ color: '#dc2626' }}>{error}</p>
      <button onClick={onRetry} style={st.retryBtn}>다시 시도</button>
    </div>
  );
}

interface EmptyViewProps {
  hasFilters: boolean;
  emptyMessage?: string;
  emptyFilteredMessage?: string;
  activeFilterLabel?: string;
  searchQuery: string;
  onReset: () => void;
}

function EmptyView({ hasFilters, emptyMessage, emptyFilteredMessage, activeFilterLabel, searchQuery, onReset }: EmptyViewProps) {
  return (
    <div style={st.emptyStateCenter}>
      <div style={st.emptyIcon}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={NEUTRAL300} strokeWidth="1.5">
          <path d="M9 12h6M12 9v6M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      {hasFilters ? (
        <>
          <p style={st.emptyTitle}>{emptyFilteredMessage ?? '조건에 맞는 콘텐츠가 없습니다'}</p>
          <p style={st.emptyDesc}>
            {searchQuery && `"${searchQuery}" `}
            {activeFilterLabel && `[${activeFilterLabel}] `}
            필터에 해당하는 결과가 없습니다.
          </p>
          <button onClick={onReset} style={st.emptyBtn}>필터 초기화</button>
        </>
      ) : (
        <>
          <p style={st.emptyTitle}>{emptyMessage ?? '현재 제공되는 콘텐츠가 없습니다'}</p>
          <p style={st.emptyDesc}>콘텐츠가 등록되면 이곳에 표시됩니다.</p>
        </>
      )}
    </div>
  );
}

function PageButton({ onClick, disabled, active, children }: {
  onClick: () => void; disabled?: boolean; active?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ ...st.pageBtn, ...(active ? st.pageBtnActive : {}), ...(disabled ? st.pageBtnDisabled : {}) }}
    >
      {children}
    </button>
  );
}

function buildPageNumbers(current: number, total: number): number[] {
  const maxVisible = 5;
  let start = Math.max(1, current - Math.floor(maxVisible / 2));
  const end = Math.min(total, start + maxVisible - 1);
  if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
  const pages: number[] = [];
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
}

// ─── Style Constants ──────────────────────────────────────────────────────────

const PRIMARY = '#2563EB';
const WHITE = '#FFFFFF';
const NEUTRAL50 = '#F8FAFC';
const NEUTRAL100 = '#F1F5F9';
const NEUTRAL200 = '#E2E8F0';
const NEUTRAL300 = '#CBD5E1';
const NEUTRAL400 = '#94A3B8';
const NEUTRAL500 = '#64748B';
const NEUTRAL700 = '#334155';
const NEUTRAL900 = '#0F172A';

const st: Record<string, React.CSSProperties> = {
  container: { maxWidth: '1100px', margin: '0 auto', padding: '24px' },

  // Hero
  hero: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', paddingBottom: '16px', borderBottom: `2px solid ${NEUTRAL200}` },
  heroTitle: { margin: 0, fontSize: '1.5rem', fontWeight: 700, color: NEUTRAL900 },
  heroDesc: { margin: '6px 0 0', fontSize: '0.875rem', color: NEUTRAL500 },

  // Search
  searchForm: { display: 'flex', gap: '8px', marginBottom: '12px' },
  searchInput: {
    flex: 1, padding: '8px 14px', fontSize: '14px',
    border: `1px solid ${NEUTRAL200}`, borderRadius: '6px',
    outline: 'none', backgroundColor: WHITE, boxSizing: 'border-box',
  } as React.CSSProperties,
  searchBtn: {
    padding: '8px 18px', fontSize: '14px', fontWeight: 500,
    color: WHITE, backgroundColor: PRIMARY,
    border: 'none', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap',
  } as React.CSSProperties,

  // Filter
  filterBar: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' } as React.CSSProperties,
  filterBtn: {
    padding: '6px 14px', fontSize: '13px', fontWeight: 500,
    border: `1px solid ${NEUTRAL300}`, borderRadius: '20px',
    backgroundColor: WHITE, color: NEUTRAL700, cursor: 'pointer',
  } as React.CSSProperties,
  filterBtnActive: { backgroundColor: PRIMARY, borderColor: PRIMARY, color: WHITE },

  // Active filter chips
  activeFiltersRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 12px', backgroundColor: '#eff6ff',
    borderRadius: '6px', border: '1px solid #bfdbfe', marginBottom: '8px',
  },
  chips: { display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' } as React.CSSProperties,
  chip: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '3px 10px', fontSize: '12px', fontWeight: 500,
    backgroundColor: '#dbeafe', color: '#1e40af', borderRadius: '12px',
  },
  chipX: {
    background: 'none', border: 'none', color: '#1e40af',
    cursor: 'pointer', fontSize: '14px', fontWeight: 700, padding: '0 0 0 2px', lineHeight: 1,
  } as React.CSSProperties,
  resetBtn: {
    fontSize: '12px', color: '#1d4ed8', background: 'none',
    border: 'none', cursor: 'pointer', textDecoration: 'underline',
    padding: '2px 4px', whiteSpace: 'nowrap',
  } as React.CSSProperties,

  // Info bar
  infoBar: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', padding: '8px 0', marginBottom: '4px',
  },
  totalText: { fontSize: '13px', color: NEUTRAL500 },
  pageInfo: { fontSize: '13px', color: NEUTRAL400 },

  // Table
  tableWrapper: {
    backgroundColor: WHITE, borderRadius: '8px',
    border: `1px solid ${NEUTRAL200}`, overflow: 'hidden', marginBottom: '8px',
  },
  table: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' } as React.CSSProperties,
  th: {
    padding: '10px 12px', fontSize: '12px', fontWeight: 600,
    color: NEUTRAL500, backgroundColor: NEUTRAL50,
    borderBottom: `1px solid ${NEUTRAL200}`, textAlign: 'left',
  } as React.CSSProperties,
  td: {
    padding: '12px', fontSize: '14px', color: NEUTRAL900,
    borderBottom: `1px solid ${NEUTRAL100}`,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  } as React.CSSProperties,
  row: { transition: 'background-color 0.1s' },
  rowPinned: { backgroundColor: '#fffbeb', transition: 'background-color 0.1s' },

  // Badges
  typeBadge: {
    display: 'inline-block', padding: '2px 8px',
    fontSize: '11px', fontWeight: 600, borderRadius: '4px',
  },
  titleCell: { display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' },
  titleText: {
    fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis',
    whiteSpace: 'nowrap', minWidth: 0, flex: 1,
  } as React.CSSProperties,
  titleLink: {
    fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis',
    whiteSpace: 'nowrap', minWidth: 0, flex: 1,
    color: PRIMARY, textDecoration: 'none',
  } as React.CSSProperties,
  summaryText: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as React.CSSProperties,
  newBadge: {
    display: 'inline-block', padding: '1px 6px', fontSize: '10px',
    fontWeight: 600, color: '#059669', backgroundColor: '#d1fae5',
    borderRadius: '3px', flexShrink: 0,
  },
  pinnedBadge: {
    display: 'inline-block', padding: '1px 6px', fontSize: '10px',
    fontWeight: 600, color: '#b45309', backgroundColor: '#fef3c7',
    borderRadius: '3px', flexShrink: 0,
  },
  statusCopied: {
    display: 'inline-block', padding: '2px 8px', fontSize: '11px',
    fontWeight: 600, color: '#059669', backgroundColor: '#d1fae5', borderRadius: '4px',
  },
  statusAvailable: {
    display: 'inline-block', padding: '2px 8px', fontSize: '11px',
    fontWeight: 500, color: NEUTRAL400, backgroundColor: NEUTRAL100, borderRadius: '4px',
  },

  // Copy actions
  copyBtn: {
    padding: '5px 12px', fontSize: '12px', fontWeight: 600,
    color: WHITE, backgroundColor: PRIMARY,
    border: 'none', borderRadius: '6px', transition: 'opacity 0.15s',
  } as React.CSSProperties,
  afterCopyBtn: {
    padding: '5px 12px', fontSize: '12px', fontWeight: 600,
    color: PRIMARY, backgroundColor: `${PRIMARY}10`,
    border: `1px solid ${PRIMARY}40`, borderRadius: '6px',
    textDecoration: 'none', display: 'inline-block',
  },
  copiedLabel: { fontSize: '12px', fontWeight: 500, color: '#059669' },

  // Pagination
  pagination: {
    display: 'flex', justifyContent: 'center',
    alignItems: 'center', gap: '4px', padding: '24px 0',
  },
  pageBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: '36px', height: '36px', padding: '0 8px',
    fontSize: '14px', fontWeight: 500, color: '#475569',
    backgroundColor: WHITE, border: `1px solid ${NEUTRAL200}`,
    borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s',
  } as React.CSSProperties,
  pageBtnActive: { backgroundColor: PRIMARY, color: WHITE, borderColor: PRIMARY },
  pageBtnDisabled: { color: NEUTRAL300, cursor: 'default', opacity: 0.5 },

  // Usage/CTA
  usageBlock: {
    marginTop: '24px', padding: '20px 24px',
    backgroundColor: `${PRIMARY}08`, borderRadius: '10px',
    border: `1px solid ${PRIMARY}20`,
  },
  usageTitle: { margin: '0 0 6px', fontSize: '0.9375rem', fontWeight: 700, color: NEUTRAL900 },
  usageDesc: { margin: '0 0 12px', fontSize: '0.8125rem', color: NEUTRAL500, lineHeight: 1.5 },
  usageLinks: { display: 'flex', gap: '12px', flexWrap: 'wrap' } as React.CSSProperties,
  usageLink: {
    fontSize: '0.8125rem', fontWeight: 600,
    color: PRIMARY, textDecoration: 'none',
  },

  // Info/Guidance
  infoBlock: {
    display: 'flex', alignItems: 'flex-start', gap: '12px',
    padding: '18px 22px', marginTop: '16px',
    backgroundColor: `${PRIMARY}08`, borderRadius: '10px',
    border: `1px solid ${PRIMARY}20`,
    fontSize: '0.875rem', color: '#475569', lineHeight: 1.5,
  },
  infoIcon: { fontSize: '18px', flexShrink: 0 },
  infoBodyText: {},
  infoLink: { color: PRIMARY },

  // Empty / Error
  emptyState: { textAlign: 'center' as const, padding: '60px 20px', fontSize: '0.9rem', color: NEUTRAL400 },
  emptyStateCenter: { padding: '60px 20px', textAlign: 'center' as const },
  emptyIcon: { marginBottom: '12px' },
  emptyTitle: { fontSize: '15px', fontWeight: 600, color: '#475569', margin: '0 0 6px 0' },
  emptyDesc: { fontSize: '13px', color: NEUTRAL400, margin: '0 0 16px 0' },
  emptyBtn: {
    display: 'inline-flex', alignItems: 'center',
    padding: '8px 18px', fontSize: '13px', fontWeight: 600,
    color: WHITE, backgroundColor: PRIMARY,
    textDecoration: 'none', borderRadius: '6px', border: 'none', cursor: 'pointer',
  } as React.CSSProperties,
  retryBtn: {
    marginTop: '12px', padding: '6px 16px', fontSize: '0.8125rem',
    color: PRIMARY, backgroundColor: 'transparent',
    border: `1px solid ${PRIMARY}`, borderRadius: '6px', cursor: 'pointer',
  },
};

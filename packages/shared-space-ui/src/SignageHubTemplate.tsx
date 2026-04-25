/**
 * SignageHubTemplate — /signage HUB 공통 템플릿
 *
 * WO-O4O-SIGNAGE-HUB-TEMPLATE-FOUNDATION-V1
 *
 * KPA-Society ContentHubPage를 canonical 기준으로 추출.
 * 서비스별 차이(API fetch, 뱃지 매핑, 필터, 문구)는 SignageHubConfig + adapter로 주입.
 *
 * 5-block 구조:
 *   1. Hero/Header    — 타이틀 + 설명 + headerAction 슬롯
 *   2. Search/Filter  — 키워드 검색(350ms debounce) + 필터 탭 + 태그 칩
 *   3. Content Table  — 기본 테이블 (출처·유형 뱃지 + 액션) + 페이지네이션
 *   4. Info Block     — 하단 안내 (optional)
 *
 * 핵심 경계:
 *   template  — 블록 순서, 레이아웃, 상태 관리, 기본 테이블 렌더링
 *   adapter   — fetchItems(), onCopy(), onDelete(), 뱃지 매핑, 알림(toast)
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { HubPagination } from './HubPagination';

// ─── Data Types ───────────────────────────────────────────────────────────────

export interface SignageHubItem {
  id: string;
  name: string;
  description?: string | null;
  mediaType?: string | null;
  source?: string | null;
  tags?: string[];
  creatorName?: string | null;
  createdAt?: string | null;
  /** 외부 링크 (있으면 제목 클릭 시 새 탭 오픈) */
  url?: string | null;
  /** 삭제 가능 여부 (서비스에서 판단해 전달) */
  canDelete?: boolean;
}

export interface SignageHubFilter {
  key: string;
  label: string;
}

export interface SignageHubFetchParams {
  page: number;
  limit: number;
  search: string;
  filter?: string;
}

export interface SignageHubFetchResult {
  items: SignageHubItem[];
  total: number;
}

/** renderItems 오버라이드에 전달되는 컨텍스트 */
export interface SignageHubRenderContext {
  onCopy?: (item: SignageHubItem) => void;
  onDelete?: (item: SignageHubItem) => void;
  sourceLabels: Record<string, { label: string; bg: string; text: string }>;
  mediaTypeLabels: Record<string, { label: string; bg: string; text: string }>;
}

// ─── Config Interface ─────────────────────────────────────────────────────────

export interface SignageHubConfig {
  serviceKey: string;

  /** Block 1: Hero */
  heroTitle: string;
  heroDesc: string;
  /** Hero 우측 액션 버튼 슬롯 (콘텐츠 등록 버튼 등 — 서비스가 React 노드 전달) */
  headerAction?: React.ReactNode;

  /** Block 2: Search/Filter */
  searchPlaceholder?: string;
  /** 고정 필터 탭 (출처별 등) — 있으면 탭 UI 표시. 첫 번째 key가 "전체" 역할 */
  filters?: SignageHubFilter[];
  /** 아이템 tags에서 동적으로 태그 칩 추출 — true면 태그 필터 표시 */
  showTagFilter?: boolean;

  /** Block 3: Content List */
  pageLimit?: number;
  /** 서비스별 fetch adapter — API 호출 + 응답 → SignageHubItem[] 변환 */
  fetchItems: (params: SignageHubFetchParams) => Promise<SignageHubFetchResult>;

  /** 아이템 액션 */
  onCopy?: (item: SignageHubItem) => Promise<void>;
  onDelete?: (item: SignageHubItem) => void;

  /** 출처 뱃지 라벨·색상 매핑 */
  sourceLabels?: Record<string, { label: string; bg: string; text: string }>;
  /** 미디어 유형 뱃지 라벨·색상 매핑 */
  mediaTypeLabels?: Record<string, { label: string; bg: string; text: string }>;

  /** Block 4: Info (optional) */
  showInfoBlock?: boolean;
  infoTitle?: string;
  infoDesc?: string;

  /** Empty state */
  emptyMessage?: string;
  emptyFilteredMessage?: string;

  /** 리스트 전체 오버라이드 */
  renderItems?: (items: SignageHubItem[], ctx: SignageHubRenderContext) => React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SignageHubTemplate({ config }: { config: SignageHubConfig }) {
  const PAGE_LIMIT = config.pageLimit ?? 20;
  const firstFilterKey = config.filters?.[0]?.key ?? 'all';
  const srcLabels = config.sourceLabels ?? {};
  const typeLabels = config.mediaTypeLabels ?? {};

  // Search state
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filter state
  const [activeFilter, setActiveFilter] = useState(firstFilterKey);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Data
  const [items, setItems] = useState<SignageHubItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keyword debounce
  const handleKeywordChange = useCallback((v: string) => {
    setKeyword(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedKeyword(v);
      setPage(1);
    }, 350);
  }, []);

  const handleKeywordKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setDebouncedKeyword(keyword);
      setPage(1);
    }
  }, [keyword]);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  // Fetch
  const doFetch = useCallback(async (p: number, filter: string, search: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await config.fetchItems({
        page: p, limit: PAGE_LIMIT, search, filter: filter !== firstFilterKey ? filter : undefined,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (e: any) {
      setError(e?.message || '콘텐츠를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [PAGE_LIMIT, firstFilterKey]);

  useEffect(() => {
    doFetch(page, activeFilter, debouncedKeyword);
  }, [doFetch, page, activeFilter, debouncedKeyword]);

  // Filter actions
  const handleFilterChange = (key: string) => {
    setActiveFilter(key);
    setPage(1);
  };

  // Tag filter
  const availableTags = useMemo(() => {
    if (!config.showTagFilter) return [];
    const all = items.flatMap((item) => item.tags ?? []);
    return [...new Set(all)].sort();
  }, [items, config.showTagFilter]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const displayedItems = useMemo(() => {
    if (selectedTags.length === 0) return items;
    return items.filter((item) => selectedTags.some((tag) => (item.tags ?? []).includes(tag)));
  }, [items, selectedTags]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const hasFilters = !!debouncedKeyword || activeFilter !== firstFilterKey || selectedTags.length > 0;

  const renderCtx: SignageHubRenderContext = useMemo(() => ({
    onCopy: config.onCopy,
    onDelete: config.onDelete,
    sourceLabels: srcLabels,
    mediaTypeLabels: typeLabels,
  }), [config.onCopy, config.onDelete, srcLabels, typeLabels]);

  return (
    <div style={st.container}>

      {/* ── Block 1: Hero ─────────────────────────────────────────────────── */}
      <header style={st.hero}>
        <div style={st.heroLeft}>
          <h1 style={st.heroTitle}>{config.heroTitle}</h1>
          <p style={st.heroDesc}>{config.heroDesc}</p>
        </div>
        {config.headerAction && (
          <div style={st.heroRight}>{config.headerAction}</div>
        )}
      </header>

      {/* ── Block 2: Search + Filter ──────────────────────────────────────── */}
      <div style={st.filterCard}>
        {/* Keyword search */}
        <div style={st.searchRow}>
          <input
            type="text"
            value={keyword}
            onChange={(e) => handleKeywordChange(e.target.value)}
            onKeyDown={handleKeywordKeyDown}
            placeholder={config.searchPlaceholder ?? '제목, 설명, 태그로 검색'}
            style={st.searchInput}
          />
        </div>

        {/* Filter tabs */}
        {config.filters && config.filters.length > 1 && (
          <div style={st.filterRow}>
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

        {/* Tag chips */}
        {availableTags.length > 0 && (
          <div style={st.tagRow}>
            {availableTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                style={{
                  ...st.tagBtn,
                  ...(selectedTags.includes(tag) ? st.tagBtnActive : {}),
                }}
              >
                #{tag}
              </button>
            ))}
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                style={st.tagClearBtn}
              >
                초기화
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Block 3: Content Table ─────────────────────────────────────────── */}
      <div style={st.tableCard}>
        <div style={st.tableHeader}>
          <span style={st.tableTitle}>콘텐츠 목록</span>
          <span style={st.tableTotalText}>총 {total.toLocaleString()}건</span>
        </div>

        {loading ? (
          <SkeletonTable />
        ) : error ? (
          <ErrorView error={error} onRetry={() => doFetch(page, activeFilter, debouncedKeyword)} />
        ) : displayedItems.length === 0 ? (
          <EmptyView
            hasFilters={hasFilters}
            emptyMessage={config.emptyMessage}
            emptyFilteredMessage={config.emptyFilteredMessage}
          />
        ) : config.renderItems ? (
          config.renderItems(displayedItems, renderCtx)
        ) : (
          <DefaultTable
            items={displayedItems}
            srcLabels={srcLabels}
            typeLabels={typeLabels}
            onCopy={config.onCopy}
            onDelete={config.onDelete}
          />
        )}

        {/* Pagination */}
        {!loading && !error && (
          <HubPagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* ── Block 4: Info ──────────────────────────────────────────────────── */}
      {config.showInfoBlock && config.infoTitle && (
        <div style={st.infoBlock}>
          <span style={st.infoIcon}>💡</span>
          <div>
            <p style={st.infoTitle}>{config.infoTitle}</p>
            {config.infoDesc && <p style={st.infoDesc}>{config.infoDesc}</p>}
          </div>
        </div>
      )}

    </div>
  );
}

export default SignageHubTemplate;

// ─── Default Table ────────────────────────────────────────────────────────────

interface DefaultTableProps {
  items: SignageHubItem[];
  srcLabels: Record<string, { label: string; bg: string; text: string }>;
  typeLabels: Record<string, { label: string; bg: string; text: string }>;
  onCopy?: (item: SignageHubItem) => void;
  onDelete?: (item: SignageHubItem) => void;
}

function DefaultTable({ items, srcLabels, typeLabels, onCopy, onDelete }: DefaultTableProps) {
  return (
    <div style={st.tableBody}>
      <table style={st.table}>
        <thead>
          <tr>
            <th style={st.th}>제목</th>
            <th style={{ ...st.th, width: '80px' }}>유형</th>
            <th style={{ ...st.th, width: '80px' }}>출처</th>
            <th style={{ ...st.th, width: '140px' }}>태그</th>
            <th style={{ ...st.th, width: '100px' }}>등록자</th>
            <th style={{ ...st.th, width: '90px' }}>등록일</th>
            {(onCopy || onDelete) && <th style={{ ...st.th, width: '100px', textAlign: 'right' as const }}>액션</th>}
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <DefaultRow
              key={item.id}
              item={item}
              srcLabels={srcLabels}
              typeLabels={typeLabels}
              onCopy={onCopy}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface DefaultRowProps {
  item: SignageHubItem;
  srcLabels: Record<string, { label: string; bg: string; text: string }>;
  typeLabels: Record<string, { label: string; bg: string; text: string }>;
  onCopy?: (item: SignageHubItem) => void;
  onDelete?: (item: SignageHubItem) => void;
}

function DefaultRow({ item, srcLabels, typeLabels, onCopy, onDelete }: DefaultRowProps) {
  const srcCfg = item.source ? srcLabels[item.source] : undefined;
  const typeCfg = item.mediaType ? typeLabels[item.mediaType] : undefined;

  return (
    <tr style={st.row}>
      {/* 제목 */}
      <td style={st.td}>
        <div style={st.titleCell}>
          {item.url ? (
            <a href={item.url} target="_blank" rel="noopener noreferrer" style={st.titleLink}>
              {item.name}
            </a>
          ) : (
            <span style={st.titleText}>{item.name}</span>
          )}
        </div>
        {item.description && (
          <p style={st.descText}>{item.description}</p>
        )}
      </td>

      {/* 유형 */}
      <td style={{ ...st.td, width: '80px' }}>
        {typeCfg ? (
          <span style={{ ...st.badge, backgroundColor: typeCfg.bg, color: typeCfg.text }}>
            {typeCfg.label}
          </span>
        ) : item.mediaType ? (
          <span style={{ ...st.badge, backgroundColor: NEUTRAL100, color: NEUTRAL500 }}>
            {item.mediaType}
          </span>
        ) : null}
      </td>

      {/* 출처 */}
      <td style={{ ...st.td, width: '80px' }}>
        {srcCfg ? (
          <span style={{ ...st.badge, backgroundColor: srcCfg.bg, color: srcCfg.text }}>
            {srcCfg.label}
          </span>
        ) : item.source ? (
          <span style={{ ...st.badge, backgroundColor: NEUTRAL100, color: NEUTRAL500 }}>
            {item.source}
          </span>
        ) : null}
      </td>

      {/* 태그 */}
      <td style={{ ...st.td, width: '140px' }}>
        <div style={st.tagCellWrap}>
          {(item.tags ?? []).slice(0, 2).map(tag => (
            <span key={tag} style={st.tagChipSmall}>{tag}</span>
          ))}
          {(item.tags ?? []).length > 2 && (
            <span style={st.tagMore}>+{(item.tags ?? []).length - 2}</span>
          )}
        </div>
      </td>

      {/* 등록자 */}
      <td style={{ ...st.td, width: '100px', color: NEUTRAL500, fontSize: '13px' }}>
        <span style={st.ellipsis}>{item.creatorName || '-'}</span>
      </td>

      {/* 등록일 */}
      <td style={{ ...st.td, width: '90px', color: NEUTRAL400, fontSize: '13px' }}>
        {item.createdAt ? new Date(item.createdAt).toLocaleDateString('ko-KR') : '-'}
      </td>

      {/* 액션 */}
      {(onCopy || onDelete) && (
        <td style={{ ...st.td, width: '100px' }}>
          <div style={st.actionCell}>
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                style={st.actionBtn}
                title="새 창에서 보기"
              >
                ↗
              </a>
            )}
            {onCopy && (
              <button
                onClick={() => onCopy(item)}
                style={st.actionBtn}
                title="가져가기"
              >
                ↓
              </button>
            )}
            {item.canDelete && onDelete && (
              <button
                onClick={() => onDelete(item)}
                style={{ ...st.actionBtn, color: '#dc2626' }}
                title="삭제"
              >
                ✕
              </button>
            )}
          </div>
        </td>
      )}
    </tr>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonTable() {
  return (
    <div style={st.tableBody}>
      <div style={st.skeletonWrap}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{ ...st.skeletonRow, width: `${50 + i * 8}%` }} />
        ))}
      </div>
    </div>
  );
}

function ErrorView({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div style={st.emptyState}>
      <p style={{ color: '#dc2626', margin: '0 0 12px' }}>{error}</p>
      <button onClick={onRetry} style={st.retryBtn}>다시 시도</button>
    </div>
  );
}

function EmptyView({ hasFilters, emptyMessage, emptyFilteredMessage }: {
  hasFilters: boolean; emptyMessage?: string; emptyFilteredMessage?: string;
}) {
  return (
    <div style={st.emptyState}>
      <div style={st.emptyIcon}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={NEUTRAL300} strokeWidth="1.5">
          <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </div>
      <p style={st.emptyTitle}>
        {hasFilters
          ? (emptyFilteredMessage ?? '조건에 맞는 콘텐츠가 없습니다')
          : (emptyMessage ?? '등록된 콘텐츠가 없습니다')}
      </p>
      <p style={st.emptyDesc}>
        {hasFilters
          ? '검색어를 변경하거나 필터를 초기화해 보세요.'
          : '콘텐츠가 등록되면 이곳에 표시됩니다.'}
      </p>
    </div>
  );
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
  container: { maxWidth: '1100px', margin: '0 auto', padding: '32px 16px' },

  // Hero
  hero: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    gap: '16px', marginBottom: '24px',
  },
  heroLeft: { minWidth: 0 },
  heroRight: { flexShrink: 0 },
  heroTitle: { margin: 0, fontSize: '1.5rem', fontWeight: 700, color: NEUTRAL900 },
  heroDesc: { margin: '4px 0 0', fontSize: '0.875rem', color: NEUTRAL500 },

  // Filter card
  filterCard: {
    backgroundColor: WHITE, borderRadius: '12px',
    border: `1px solid ${NEUTRAL200}`, padding: '16px', marginBottom: '16px',
  },

  // Search
  searchRow: { maxWidth: '400px' },
  searchInput: {
    width: '100%', padding: '8px 12px 8px 12px',
    fontSize: '14px', border: `1px solid ${NEUTRAL200}`,
    borderRadius: '8px', outline: 'none', backgroundColor: WHITE,
    boxSizing: 'border-box',
  } as React.CSSProperties,

  // Filter tabs
  filterRow: {
    display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px',
  } as React.CSSProperties,
  filterBtn: {
    padding: '6px 14px', fontSize: '13px', fontWeight: 500,
    border: `1px solid ${NEUTRAL300}`, borderRadius: '20px',
    backgroundColor: WHITE, color: NEUTRAL700, cursor: 'pointer',
  } as React.CSSProperties,
  filterBtnActive: {
    backgroundColor: PRIMARY, borderColor: PRIMARY, color: WHITE,
  },

  // Tag chips
  tagRow: {
    display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginTop: '12px',
  } as React.CSSProperties,
  tagBtn: {
    padding: '4px 12px', fontSize: '12px', fontWeight: 500,
    borderRadius: '16px', border: `1px solid ${NEUTRAL200}`,
    backgroundColor: WHITE, color: NEUTRAL500, cursor: 'pointer',
  } as React.CSSProperties,
  tagBtnActive: {
    backgroundColor: PRIMARY, borderColor: PRIMARY, color: WHITE,
  },
  tagClearBtn: {
    padding: '4px 8px', fontSize: '12px', color: NEUTRAL400,
    background: 'none', border: 'none', cursor: 'pointer',
    textDecoration: 'underline',
  } as React.CSSProperties,

  // Table card
  tableCard: {
    backgroundColor: WHITE, borderRadius: '12px',
    border: `1px solid ${NEUTRAL200}`, overflow: 'hidden', marginBottom: '16px',
  },
  tableHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 20px', borderBottom: `1px solid ${NEUTRAL100}`,
  },
  tableTitle: { fontWeight: 600, fontSize: '14px', color: NEUTRAL900 },
  tableTotalText: { fontSize: '12px', color: NEUTRAL400 },

  // Table
  tableBody: { overflowX: 'auto' } as React.CSSProperties,
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

  // Title cell
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
  descText: {
    margin: '2px 0 0', fontSize: '12px', color: NEUTRAL400,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  } as React.CSSProperties,
  ellipsis: {
    display: 'block', overflow: 'hidden', textOverflow: 'ellipsis',
    whiteSpace: 'nowrap', maxWidth: '100px',
  } as React.CSSProperties,

  // Badges
  badge: {
    display: 'inline-block', padding: '2px 8px',
    fontSize: '11px', fontWeight: 600, borderRadius: '4px',
  },

  // Tag in cell
  tagCellWrap: { display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '140px' } as React.CSSProperties,
  tagChipSmall: {
    fontSize: '10px', backgroundColor: NEUTRAL100, color: NEUTRAL500,
    padding: '2px 6px', borderRadius: '4px',
  },
  tagMore: { fontSize: '10px', color: NEUTRAL400 },

  // Actions
  actionCell: {
    display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px',
  },
  actionBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: '28px', height: '28px', padding: 0,
    fontSize: '14px', fontWeight: 500, color: NEUTRAL400,
    backgroundColor: 'transparent', border: 'none', borderRadius: '6px',
    cursor: 'pointer', transition: 'background-color 0.15s',
  } as React.CSSProperties,

  // Info block
  infoBlock: {
    display: 'flex', alignItems: 'flex-start', gap: '12px',
    padding: '16px 20px', backgroundColor: '#eff6ff',
    borderRadius: '12px', border: '1px solid #bfdbfe',
  },
  infoIcon: { fontSize: '18px', flexShrink: 0, marginTop: '2px' },
  infoTitle: { margin: '0 0 4px', fontSize: '14px', fontWeight: 600, color: '#1e40af' },
  infoDesc: { margin: 0, fontSize: '13px', color: '#2563eb', lineHeight: 1.5 },

  // Empty / Error / Skeleton
  emptyState: { textAlign: 'center' as const, padding: '60px 20px' },
  emptyIcon: { marginBottom: '12px' },
  emptyTitle: { fontSize: '15px', fontWeight: 600, color: '#475569', margin: '0 0 6px 0' },
  emptyDesc: { fontSize: '13px', color: NEUTRAL400, margin: 0 },
  retryBtn: {
    padding: '6px 16px', fontSize: '13px',
    color: PRIMARY, backgroundColor: 'transparent',
    border: `1px solid ${PRIMARY}`, borderRadius: '6px', cursor: 'pointer',
  },
  skeletonWrap: { padding: '20px' },
  skeletonRow: {
    height: '14px', backgroundColor: NEUTRAL200, borderRadius: '4px', marginBottom: '12px',
  },
};

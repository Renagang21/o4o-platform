/**
 * CommunityContentListView / CommunityContentListTemplate
 *   — 커뮤니티 콘텐츠·자료실 목록 공통 View
 *
 * WO-O4O-COMMUNITY-CONTENT-RESOURCE-FRONTEND-VIEW-COMMONIZATION-V1
 *
 * K-Cosmetics / GlycoPharm 의 `/content` 목록이 주석 한 줄만 다른 완전 중복이었다.
 * 표시 구조를 service-neutral View 로 추출하고, 서비스는 fetch adapter + config 만 준다.
 *
 * 구조: service API adapter → CommunityContentListItem(정규화) → 공통 View
 *
 * 공통 View 순수성: fetch/axios 직접 호출 없음, 서비스별 API import 없음,
 *   `service === '...'` 분기 없음, `switch (serviceType)` 없음.
 *   라우터도 직접 결합하지 않는다 — 링크는 `renderLink` 로 서비스가 주입한다.
 *
 * Load-Error 계약: 조회 실패는 오류 상태 + 재시도로 표면화한다. 빈 목록으로 삼키지 않는다.
 */

import { useCallback, useEffect, useState, type ReactNode, type CSSProperties } from 'react';
import { CommunityContentSearchBar } from './CommunityContentSearchBar';
import {
  CommunityContentEmptyState,
  CommunityContentErrorState,
  CommunityContentLoadingState,
} from './CommunityContentStates';
import type { CommunityContentBadge, CommunityContentBadgeTone } from './CommunityContentDetailView';

/** 서비스 응답을 adapter 가 정규화한 목록 표시 모델. */
export interface CommunityContentListItem {
  id: string;
  title: string;
  summary?: string | null;
  authorName?: string | null;
  /** adapter 가 포맷한 날짜 라벨 */
  dateLabel?: string;
  viewCount?: number;
  /** 상태/유형/카테고리 등 표시용 배지 */
  badges?: CommunityContentBadge[];
  /** 첨부/다운로드 표시 라벨 (없으면 미표시) */
  attachmentLabel?: string | null;
  /** 추천 수 (showRecommendation 일 때만 표시) */
  recommendCount?: number;
}

export type CommunityContentRenderLink = (href: string, children: ReactNode) => ReactNode;

export interface CommunityContentListViewProps {
  title: string;
  description?: string;
  /** 서비스 브랜드 색 */
  accent?: string;
  /** 글쓰기 등 헤더 우측 액션 */
  headerActionSlot?: ReactNode;

  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };

  items: CommunityContentListItem[];
  loading?: boolean;
  error?: boolean;
  errorMessage?: string;
  onRetry?: () => void;

  emptyMessage?: string;
  emptyFilteredMessage?: string;
  isFiltered?: boolean;

  hrefFor?: (item: CommunityContentListItem) => string;
  renderLink?: CommunityContentRenderLink;

  hasMore?: boolean;
  onLoadMore?: () => void;
  loadMoreLabel?: string;

  showRecommendation?: boolean;
  showAttachment?: boolean;
}

const BADGE_TONE: Record<CommunityContentBadgeTone, CSSProperties> = {
  primary: { backgroundColor: '#dbeafe', color: '#1d4ed8' },
  muted: { backgroundColor: '#f1f5f9', color: '#64748b' },
  warning: { backgroundColor: '#fef3c7', color: '#92400e' },
};

const defaultRenderLink: CommunityContentRenderLink = (href, children) => (
  <a href={href} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>{children}</a>
);

export function CommunityContentListView({
  title,
  description,
  accent = '#2563eb',
  headerActionSlot,
  search,
  items,
  loading = false,
  error = false,
  errorMessage,
  onRetry,
  emptyMessage = '아직 등록된 콘텐츠가 없습니다.',
  emptyFilteredMessage = '검색 결과가 없습니다.',
  isFiltered = false,
  hrefFor,
  renderLink = defaultRenderLink,
  hasMore = false,
  onLoadMore,
  loadMoreLabel = '더 보기',
  showRecommendation = false,
  showAttachment = false,
}: CommunityContentListViewProps) {
  const body = (item: CommunityContentListItem) => (
    <div style={styles.cardInner}>
      <div style={styles.cardTitleRow}>
        <span style={styles.cardTitle}>{item.title}</span>
        {(item.badges ?? []).map((b, i) => (
          <span key={`${b.text}-${i}`} style={{ ...styles.badge, ...BADGE_TONE[b.tone ?? 'warning'] }}>
            {b.text}
          </span>
        ))}
      </div>
      {item.summary && <p style={styles.cardSummary}>{item.summary}</p>}
      <div style={styles.cardMeta}>
        <span>{item.authorName || '익명'}</span>
        {item.dateLabel && (<><span style={styles.dot}>·</span><span>{item.dateLabel}</span></>)}
        {typeof item.viewCount === 'number' && (<><span style={styles.dot}>·</span><span>조회 {item.viewCount}</span></>)}
        {showRecommendation && typeof item.recommendCount === 'number' && (
          <><span style={styles.dot}>·</span><span>추천 {item.recommendCount}</span></>
        )}
        {showAttachment && item.attachmentLabel && (
          <><span style={styles.dot}>·</span><span>첨부 {item.attachmentLabel}</span></>
        )}
      </div>
    </div>
  );

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={{ ...styles.pageTitle, borderLeft: `3px solid ${accent}`, paddingLeft: 10 }}>{title}</h1>
          {description && <p style={styles.pageDesc}>{description}</p>}
        </div>
        {headerActionSlot && <div style={styles.headerAction}>{headerActionSlot}</div>}
      </div>

      {search && (
        <div style={styles.searchRow}>
          <CommunityContentSearchBar
            value={search.value}
            onChange={search.onChange}
            onClear={() => search.onChange('')}
            placeholder={search.placeholder}
          />
        </div>
      )}

      {error ? (
        <CommunityContentErrorState message={errorMessage} onRetry={onRetry} />
      ) : loading && items.length === 0 ? (
        <CommunityContentLoadingState />
      ) : items.length === 0 ? (
        <CommunityContentEmptyState message={isFiltered ? emptyFilteredMessage : emptyMessage} />
      ) : (
        <ul style={styles.list}>
          {items.map((item) => (
            <li key={item.id} style={styles.card}>
              {hrefFor ? renderLink(hrefFor(item), body(item)) : body(item)}
            </li>
          ))}
        </ul>
      )}

      {!error && hasMore && onLoadMore && (
        <div style={styles.moreRow}>
          <button type="button" style={styles.moreBtn} disabled={loading} onClick={onLoadMore}>
            {loading ? '불러오는 중...' : loadMoreLabel}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Template: adapter 주입형 컨테이너 ───────────────────────────────────────
 * 서비스 wrapper 가 fetch adapter + config 만 주면 검색 디바운스 / 페이지 누적 /
 * loading·error·empty 상태를 공통으로 처리한다.
 * (ResourcesHubTemplate · ContentHubTemplate 과 동일한 저장소 관례) */

export interface CommunityContentListFetchParams {
  page: number;
  limit: number;
  search?: string;
}

export interface CommunityContentListFetchResult {
  items: CommunityContentListItem[];
  total: number;
}

export interface CommunityContentListConfig {
  title: string;
  description?: string;
  accent?: string;
  searchPlaceholder?: string;
  /** 검색 UI 비활성화 */
  disableSearch?: boolean;
  pageSize?: number;
  detailPathFor?: (item: CommunityContentListItem) => string;
  emptyMessage?: string;
  emptyFilteredMessage?: string;
  errorMessage?: string;
  showRecommendation?: boolean;
  showAttachment?: boolean;
  /** 실패 시 반드시 throw 한다 — 빈 목록으로 삼키지 않는다. */
  fetchItems: (params: CommunityContentListFetchParams) => Promise<CommunityContentListFetchResult>;
}

export interface CommunityContentListTemplateProps {
  config: CommunityContentListConfig;
  headerActionSlot?: ReactNode;
  renderLink?: CommunityContentRenderLink;
}

export function CommunityContentListTemplate({
  config,
  headerActionSlot,
  renderLink,
}: CommunityContentListTemplateProps) {
  const limit = config.pageSize ?? 20;
  const { fetchItems } = config;

  const [items, setItems] = useState<CommunityContentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    fetchItems({ page, limit, search: debouncedSearch || undefined })
      .then((res) => {
        if (cancelled) return;
        setItems((prev) => (page === 1 ? res.items : [...prev, ...res.items]));
        setTotal(res.total);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError(true);
        if (page === 1) setItems([]);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fetchItems, page, limit, debouncedSearch]);

  useEffect(() => load(), [load, reloadKey]);

  return (
    <CommunityContentListView
      title={config.title}
      description={config.description}
      accent={config.accent}
      headerActionSlot={headerActionSlot}
      search={config.disableSearch ? undefined : {
        value: search,
        onChange: setSearch,
        placeholder: config.searchPlaceholder,
      }}
      items={items}
      loading={loading}
      error={loadError}
      errorMessage={config.errorMessage}
      onRetry={() => setReloadKey((k) => k + 1)}
      emptyMessage={config.emptyMessage}
      emptyFilteredMessage={config.emptyFilteredMessage}
      isFiltered={Boolean(debouncedSearch)}
      hrefFor={config.detailPathFor}
      renderLink={renderLink}
      hasMore={items.length < total}
      onLoadMore={() => setPage((p) => p + 1)}
      showRecommendation={config.showRecommendation}
      showAttachment={config.showAttachment}
    />
  );
}

const styles: Record<string, CSSProperties> = {
  page: { maxWidth: 780, margin: '0 auto', padding: '24px 16px 60px' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 },
  pageTitle: { fontSize: '1.375rem', fontWeight: 700, color: '#0f172a', margin: 0 },
  pageDesc: { fontSize: '0.875rem', color: '#64748b', margin: '6px 0 0 13px' },
  headerAction: { flexShrink: 0 },
  searchRow: { marginBottom: 20 },
  list: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 },
  card: {
    backgroundColor: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  cardInner: { padding: '16px 20px' },
  cardTitleRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' },
  cardTitle: { fontSize: '1rem', fontWeight: 600, color: '#0f172a' },
  badge: { fontSize: '0.6875rem', fontWeight: 600, padding: '2px 8px', borderRadius: 4 },
  cardSummary: {
    fontSize: '0.875rem', color: '#475569', margin: '0 0 8px', lineHeight: 1.5,
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
  },
  cardMeta: { display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: '#94a3b8', flexWrap: 'wrap' },
  dot: { color: '#cbd5e1' },
  moreRow: { textAlign: 'center', marginTop: 20 },
  moreBtn: {
    padding: '10px 24px', fontSize: '0.875rem', fontWeight: 500, color: '#475569',
    backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer',
  },
};

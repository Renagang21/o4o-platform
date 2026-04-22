/**
 * ContentListPage — 콘텐츠 허브 목록
 *
 * WO-KPA-CONTENT-HUB-FOUNDATION-V1
 *
 * 탭(전체/참여 프로그램/정보 콘텐츠) + 검색 + sub_type 필터 + 정렬
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { contentApi, type ContentItem, type ContentListParams } from '../../api/content';
import { useAuth } from '../../contexts/AuthContext';

// ─── Constants ───────────────────────────────────────────────────────────────

const TABS = [
  { key: '', label: '전체' },
  { key: 'participation', label: '참여 프로그램' },
  { key: 'information', label: '정보 콘텐츠' },
] as const;

const SUB_TYPES: Record<string, string[]> = {
  participation: ['설문', '퀴즈', '이벤트', '캠페인'],
  information: ['건강정보', '약물학정보', '복약정보', '실무정보', '자유 콘텐츠'],
};

const SORT_OPTIONS = [
  { key: 'latest', label: '최신순' },
  { key: 'popular', label: '인기순' },
  { key: 'views', label: '조회순' },
] as const;

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  published: { label: '공개', bg: '#dcfce7', color: '#166534' },
  draft: { label: '초안', bg: '#fef3c7', color: '#92400e' },
  private: { label: '비공개', bg: '#f1f5f9', color: '#475569' },
};

const CONTENT_TYPE_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  participation: { label: '참여', bg: '#ede9fe', color: '#6d28d9' },
  information: { label: '정보', bg: '#dbeafe', color: '#1d4ed8' },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function ContentListPage() {
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = searchParams.get('type') || '';
  const initialSort = (searchParams.get('sort') || 'latest') as 'latest' | 'popular' | 'views';

  const [items, setItems] = useState<ContentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState(initialTab);
  const [subTypeFilter, setSubTypeFilter] = useState('');
  const [sort, setSort] = useState(initialSort);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params: ContentListParams = { page, limit: 20, sort };
      if (activeTab) params.content_type = activeTab;
      if (subTypeFilter) params.sub_type = subTypeFilter;
      if (searchTerm) params.search = searchTerm;

      const res = await contentApi.list(params);
      if (res.success) {
        setItems(res.data.items);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, sort, activeTab, subTypeFilter, searchTerm]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // Sync URL params
  useEffect(() => {
    const p = new URLSearchParams();
    if (activeTab) p.set('type', activeTab);
    if (sort !== 'latest') p.set('sort', sort);
    setSearchParams(p, { replace: true });
  }, [activeTab, sort, setSearchParams]);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setSubTypeFilter('');
    setPage(1);
  };

  const handleSearch = () => {
    setSearchTerm(searchInput);
    setPage(1);
  };

  const availableSubTypes = activeTab ? (SUB_TYPES[activeTab] || []) : [];

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('ko-KR'); } catch { return '-'; }
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>콘텐츠</h1>
          <p style={styles.subtitle}>커뮤니티 콘텐츠를 탐색하고 참여하세요</p>
        </div>
        {isAuthenticated && (
          <Link to="/content/new" style={styles.writeButton}>
            + 글쓰기
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div style={styles.tabRow}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            style={{
              ...styles.tab,
              ...(activeTab === tab.key ? styles.tabActive : {}),
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters Row */}
      <div style={styles.filterRow}>
        {/* Sub-type filter */}
        {availableSubTypes.length > 0 && (
          <select
            value={subTypeFilter}
            onChange={(e) => { setSubTypeFilter(e.target.value); setPage(1); }}
            style={styles.select}
          >
            <option value="">전체 유형</option>
            {availableSubTypes.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        )}

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => { setSort(e.target.value as any); setPage(1); }}
          style={styles.select}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>{opt.label}</option>
          ))}
        </select>

        {/* Search */}
        <div style={styles.searchWrap}>
          <input
            type="text"
            placeholder="검색..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={styles.searchInput}
          />
          <button onClick={handleSearch} style={styles.searchBtn}>검색</button>
        </div>
      </div>

      {/* Content List */}
      <div style={styles.listWrap}>
        {loading && items.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>불러오는 중...</p>
          </div>
        ) : items.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>등록된 콘텐츠가 없습니다</p>
            {isAuthenticated && (
              <Link to="/content/new" style={styles.emptyLink}>첫 콘텐츠 작성하기</Link>
            )}
          </div>
        ) : (
          <>
            {items.map((item) => {
              const statusBadge = STATUS_BADGE[item.status] || STATUS_BADGE.draft;
              const typeBadge = CONTENT_TYPE_BADGE[item.content_type] || CONTENT_TYPE_BADGE.information;

              return (
                <Link
                  key={item.id}
                  to={`/content/${item.id}`}
                  style={styles.card}
                  className="content-card"
                >
                  <div style={styles.cardTop}>
                    <div style={styles.badges}>
                      <span style={{ ...styles.badge, backgroundColor: typeBadge.bg, color: typeBadge.color }}>
                        {typeBadge.label}
                      </span>
                      {item.sub_type && (
                        <span style={styles.subTypeBadge}>{item.sub_type}</span>
                      )}
                      {item.status !== 'published' && (
                        <span style={{ ...styles.badge, backgroundColor: statusBadge.bg, color: statusBadge.color }}>
                          {statusBadge.label}
                        </span>
                      )}
                    </div>
                    <span style={styles.cardDate}>{formatDate(item.created_at)}</span>
                  </div>

                  <h3 style={styles.cardTitle}>{item.title}</h3>
                  {item.summary && (
                    <p style={styles.cardSummary}>{item.summary}</p>
                  )}

                  <div style={styles.cardBottom}>
                    <span style={styles.cardAuthor}>{item.author_name || '익명'}</span>
                    <div style={styles.cardStats}>
                      <span style={styles.stat}>♥ {item.like_count}</span>
                      <span style={styles.stat}>조회 {item.view_count}</span>
                    </div>
                  </div>
                </Link>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={styles.pagination}>
                <span style={styles.pageInfo}>총 {total}개</span>
                <div style={styles.pageButtons}>
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    style={styles.pageBtn}
                  >
                    ‹
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                    return start + i;
                  }).filter(p => p <= totalPages).map(p => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      style={{
                        ...styles.pageBtn,
                        ...(page === p ? styles.pageBtnActive : {}),
                      }}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    style={styles.pageBtn}
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 960,
    margin: '0 auto',
    padding: '24px 16px 60px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: '4px 0 0',
  },
  writeButton: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '10px 20px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: '0.875rem',
    fontWeight: 600,
    borderRadius: 8,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  },
  tabRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  tab: {
    padding: '8px 16px',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#475569',
    backgroundColor: 'transparent',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  tabActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
    color: '#ffffff',
    fontWeight: 600,
  },
  filterRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 20,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  select: {
    padding: '8px 12px',
    fontSize: '0.8125rem',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    color: '#334155',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
  },
  searchWrap: {
    display: 'flex',
    flex: 1,
    minWidth: 200,
    gap: 4,
  },
  searchInput: {
    flex: 1,
    padding: '8px 12px',
    fontSize: '0.8125rem',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    outline: 'none',
  },
  searchBtn: {
    padding: '8px 16px',
    fontSize: '0.8125rem',
    fontWeight: 600,
    backgroundColor: '#334155',
    color: '#ffffff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  listWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  card: {
    display: 'block',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    padding: '16px 20px',
    textDecoration: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badges: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '0.6875rem',
    fontWeight: 600,
    borderRadius: 4,
  },
  subTypeBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '0.6875rem',
    fontWeight: 500,
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    borderRadius: 4,
  },
  cardDate: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 4px',
    lineHeight: 1.4,
  },
  cardSummary: {
    fontSize: '0.8125rem',
    color: '#64748b',
    margin: '0 0 12px',
    lineHeight: 1.5,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  cardBottom: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardAuthor: {
    fontSize: '0.75rem',
    color: '#64748b',
  },
  cardStats: {
    display: 'flex',
    gap: 12,
  },
  stat: {
    fontSize: '0.75rem',
    color: '#94a3b8',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
  },
  emptyText: {
    fontSize: '0.9375rem',
    color: '#64748b',
    margin: 0,
  },
  emptyLink: {
    display: 'inline-block',
    marginTop: 12,
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#2563eb',
    textDecoration: 'none',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
  },
  pageInfo: {
    fontSize: '0.8125rem',
    color: '#64748b',
  },
  pageButtons: {
    display: 'flex',
    gap: 4,
  },
  pageBtn: {
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#475569',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    cursor: 'pointer',
  },
  pageBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
    color: '#ffffff',
    fontWeight: 600,
  },
};

export default ContentListPage;
